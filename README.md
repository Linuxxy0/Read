# 静读 Read in Quiet

一个可直接部署到 **GitHub Pages** 的静态阅读网站项目。

## 已实现功能

- 首页独立展示，不混入书架页内容
- 著作 / 书架页，支持搜索、分类、作者、标签、精选筛选
- 网格 / 列表双视图切换
- 全站搜索：书名、作者、标签、章节、正文片段
- 作品内搜索：高亮命中、结果列表、上下一个结果切换
- 动态标签、动态分类、动态收录作品数、动态收录字数
- 作者页与分类页自动聚合
- 白天 / 夜间主题切换
- 阅读页字号调节

## 目录结构

```text
read-quiet-project/
├── index.html
├── library.html
├── book.html
├── search.html
├── authors.html
├── categories.html
├── about.html
├── 404.html
└── assets/
    ├── css/styles.css
    ├── data/books.json
    └── js/
        ├── site.js
        ├── index.js
        ├── library.js
        ├── book.js
        ├── search.js
        ├── authors.js
        ├── categories.js
        └── about.js
```

## 本地预览

你可以直接在项目根目录启动一个静态服务器：

```bash
python3 -m http.server 8000
```

然后打开：

```text
http://localhost:8000
```

## GitHub Pages 部署

1. 新建一个 GitHub 仓库
2. 把本项目全部文件上传到仓库根目录
3. 打开仓库 **Settings → Pages**
4. 在 **Build and deployment** 中选择 **Deploy from a branch**
5. 选择 `main` 分支和 `/ (root)`
6. 保存后等待 GitHub Pages 发布完成

## 数据替换说明

作品数据位于：

```text
assets/data/books.json
```

每本书结构示例：

```json
{
  "slug": "fusheng-liuji",
  "title": "浮生六记",
  "author": "沈复",
  "era": "清代",
  "category": "散文",
  "tags": ["散文", "生活", "清代"],
  "wordCount": 216000,
  "featured": true,
  "summary": "简要摘要",
  "description": "详情说明",
  "chapters": [
    {
      "title": "闲情记趣",
      "content": ["段落一", "段落二"]
    }
  ]
}
```

> 注意：当前内容是演示用节选与结构化示例，方便你替换成自己的收录正文。
