#!/usr/bin/env python3
"""Convert plain TXT books into the project's structured JSON/JS dataset.

Usage:
  python3 tools_txt_to_books.py --input ./books-txt --json ./assets/data/books.json --js ./assets/js/books-data.js

TXT format (metadata block optional):
  标题: 浮生六记
  作者: 沈复
  年代: 清代
  分类: 散文
  标签: 散文, 生活, 清代
  简介: 首页摘要
  描述: 详情简介
  精选: true
  字数: 216000

  # 第一卷 闲情记趣

  第一段。

  第二段。

If there is no metadata block, the script will infer title from the filename,
use "佚名" as author, "未分类" as category, and compute word count automatically.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

META_MAP = {
    "标题": "title",
    "书名": "title",
    "title": "title",
    "作者": "author",
    "author": "author",
    "年代": "era",
    "时代": "era",
    "era": "era",
    "分类": "category",
    "category": "category",
    "标签": "tags",
    "tag": "tags",
    "tags": "tags",
    "简介": "summary",
    "摘要": "summary",
    "summary": "summary",
    "描述": "description",
    "简介说明": "description",
    "description": "description",
    "精选": "featured",
    "推荐": "featured",
    "featured": "featured",
    "字数": "wordCount",
    "总字数": "wordCount",
    "wordcount": "wordCount",
}

CHAPTER_PATTERNS = [
    re.compile(r"^#{1,6}\s*(.+?)\s*$"),
    re.compile(r"^第[\d一二三四五六七八九十百千〇零两壹贰叁肆伍陆柒捌玖拾佰仟]+[章节回卷部篇集][^\n]*$"),
    re.compile(r"^【([^】]+)】$"),
]


def normalize_newlines(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def smart_slug(stem: str, fallback_index: int) -> str:
    stem = stem.strip()
    stem = re.sub(r"\s+", "-", stem)
    stem = re.sub(r"[^0-9A-Za-z\-\u4e00-\u9fff]+", "-", stem)
    stem = re.sub(r"-+", "-", stem).strip("-")
    return stem.lower() or f"book-{fallback_index}"


def parse_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "y", "是", "推荐", "精选"}


def parse_word_count(value: str) -> int:
    raw = value.strip().replace(",", "")
    match = re.search(r"(\d+(?:\.\d+)?)\s*万", raw)
    if match:
        return int(float(match.group(1)) * 10000)
    digits = re.sub(r"\D", "", raw)
    return int(digits) if digits else 0


def count_chars(text: str) -> int:
    return len(re.sub(r"\s+", "", text))


def split_paragraphs(block: str) -> List[str]:
    parts = [re.sub(r"\s+", " ", item).strip() for item in re.split(r"\n\s*\n+", block)]
    return [item for item in parts if item]


def looks_like_metadata_line(line: str) -> bool:
    if ":" not in line and "：" not in line:
        return False
    key = re.split(r"[:：]", line, maxsplit=1)[0]
    return key.strip().lower() in {k.lower() for k in META_MAP}


def partition(pattern: str, line: str) -> Tuple[str, str, str]:
    match = re.search(pattern, line)
    if not match:
        return line, "", ""
    idx = match.start()
    return line[:idx], line[idx: idx + 1], line[idx + 1 :]


def parse_metadata(lines: List[str], default_title: str, slug: str) -> Tuple[Dict, List[str]]:
    meta: Dict[str, object] = {
        "slug": slug,
        "title": default_title,
        "author": "佚名",
        "era": "未注明",
        "category": "未分类",
        "tags": [],
        "wordCount": 0,
        "featured": False,
        "summary": f"《{default_title}》收录于静读。",
        "description": f"《{default_title}》由 TXT 自动转换为阅读站数据。",
    }

    body_start = 0
    for idx, raw_line in enumerate(lines):
        line = raw_line.strip()
        if not line:
            body_start = idx + 1
            break
        if not looks_like_metadata_line(line):
            body_start = idx
            break
        left, _, right = partition(r"[:：]", line)
        key = META_MAP.get(left.strip().lower(), META_MAP.get(left.strip(), ""))
        if not key:
            body_start = idx
            break
        value = right.strip()
        if key == "tags":
            tags = [item.strip() for item in re.split(r"[,，/、|]", value) if item.strip()]
            meta[key] = tags
        elif key == "featured":
            meta[key] = parse_bool(value)
        elif key == "wordCount":
            meta[key] = parse_word_count(value)
        else:
            meta[key] = value
    else:
        body_start = len(lines)

    return meta, lines[body_start:]


def is_chapter_title(line: str) -> str | None:
    stripped = line.strip()
    for pattern in CHAPTER_PATTERNS:
        match = pattern.match(stripped)
        if not match:
            continue
        if match.groups():
            return match.group(1).strip()
        return stripped
    return None


def parse_chapters(body_text: str) -> List[Dict[str, object]]:
    body_text = normalize_newlines(body_text).strip()
    if not body_text:
        return [{"title": "正文", "content": ["暂无正文内容。"]}]

    lines = body_text.split("\n")
    chapters: List[Dict[str, object]] = []
    current_title = "正文"
    current_lines: List[str] = []

    def flush() -> None:
        nonlocal current_lines, current_title
        block = "\n".join(current_lines).strip()
        if not block and chapters:
            current_lines = []
            return
        paragraphs = split_paragraphs(block) if block else []
        if not paragraphs:
            paragraphs = ["暂无正文内容。"]
        chapters.append({"title": current_title, "content": paragraphs})
        current_lines = []

    seen_heading = False
    for raw_line in lines:
        chapter_title = is_chapter_title(raw_line)
        if chapter_title:
            if current_lines or chapters:
                flush()
            current_title = chapter_title
            current_lines = []
            seen_heading = True
            continue
        current_lines.append(raw_line)

    if current_lines or not chapters:
        flush()

    if not seen_heading and len(chapters) == 1:
        return chapters
    return [chapter for chapter in chapters if chapter.get("content")]


def convert_txt_file(path: Path, index: int) -> Dict[str, object]:
    text = normalize_newlines(path.read_text(encoding="utf-8-sig"))
    lines = text.split("\n")
    slug = smart_slug(path.stem, index)
    metadata, body_lines = parse_metadata(lines, path.stem, slug)
    chapters = parse_chapters("\n".join(body_lines))
    metadata["chapters"] = chapters
    if not metadata.get("tags"):
        metadata["tags"] = [str(metadata.get("category", "未分类"))]
    if not metadata.get("wordCount"):
        joined = "\n".join(
            paragraph
            for chapter in chapters
            for paragraph in chapter.get("content", [])
        )
        metadata["wordCount"] = count_chars(joined)
    return metadata


def convert_folder(input_dir: Path) -> List[Dict[str, object]]:
    txt_files = sorted(input_dir.glob("*.txt"))
    books = [convert_txt_file(path, idx + 1) for idx, path in enumerate(txt_files)]
    return books


def write_outputs(books: List[Dict[str, object]], json_path: Path, js_path: Path) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    js_path.parent.mkdir(parents=True, exist_ok=True)
    json_text = json.dumps(books, ensure_ascii=False, indent=2)
    json_path.write_text(json_text + "\n", encoding="utf-8")
    js_path.write_text("window.READ_QUIET_BOOKS = " + json_text + ";\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert TXT books into read-quiet dataset files.")
    parser.add_argument("--input", default="./books-txt", help="Folder containing .txt books")
    parser.add_argument("--json", default="./assets/data/books.json", help="Output JSON file")
    parser.add_argument("--js", default="./assets/js/books-data.js", help="Output JS file")
    args = parser.parse_args()

    input_dir = Path(args.input)
    if not input_dir.exists() or not input_dir.is_dir():
        raise SystemExit(f"输入目录不存在: {input_dir}")

    books = convert_folder(input_dir)
    if not books:
        raise SystemExit(f"未在 {input_dir} 中找到 .txt 文件")

    write_outputs(books, Path(args.json), Path(args.js))
    total_words = sum(int(book.get("wordCount", 0)) for book in books)
    print(f"[OK] 已转换 {len(books)} 本书，总字数 {total_words}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
