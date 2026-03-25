const DATA_URL = './assets/data/books.json';
let booksCache = null;

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalize(text = '') {
  return String(text).trim().toLowerCase();
}

function formatCount(num) {
  if (num >= 100000000) return `${(num / 100000000).toFixed(1).replace(/\.0$/, '')}亿`;
  if (num >= 10000) return `${(num / 10000).toFixed(num >= 100000 ? 0 : 1).replace(/\.0$/, '')}万`;
  return String(num);
}

function formatInteger(num) {
  return new Intl.NumberFormat('zh-CN').format(num);
}

function getInitial(title = '') {
  return title.slice(0, 1);
}

async function loadBooks() {
  if (booksCache) return booksCache;
  if (window.READ_QUIET_BOOKS) {
    booksCache = window.READ_QUIET_BOOKS;
    return booksCache;
  }
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error('无法加载书籍数据');
  booksCache = await response.json();
  return booksCache;
}

function getBookWordCount(book) {
  return Number(book.wordCount || 0);
}

function getBookChapterCount(book) {
  return Array.isArray(book.chapters) ? book.chapters.length : 0;
}

function getAllTags(books) {
  const counts = new Map();
  books.forEach((book) => {
    (book.tags || []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'))
    .map(([name, count]) => ({ name, count }));
}

function getAllCategories(books) {
  const counts = new Map();
  books.forEach((book) => counts.set(book.category, (counts.get(book.category) || 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'))
    .map(([name, count]) => ({ name, count }));
}

function getAllAuthors(books) {
  const counts = new Map();
  books.forEach((book) => counts.set(book.author, (counts.get(book.author) || 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'))
    .map(([name, count]) => ({ name, count }));
}

function getStats(books) {
  return {
    works: books.length,
    words: books.reduce((sum, book) => sum + getBookWordCount(book), 0),
    chapters: books.reduce((sum, book) => sum + getBookChapterCount(book), 0),
    tags: getAllTags(books).length,
  };
}

function getBookBySlug(books, slug) {
  return books.find((book) => book.slug === slug);
}

function toSnippet(text = '', query = '', max = 68) {
  const raw = String(text);
  if (!query) return raw.slice(0, max) + (raw.length > max ? '…' : '');
  const index = raw.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return raw.slice(0, max) + (raw.length > max ? '…' : '');
  const start = Math.max(0, index - Math.floor(max / 2));
  const end = Math.min(raw.length, index + query.length + Math.floor(max / 2));
  const prefix = start > 0 ? '…' : '';
  const suffix = end < raw.length ? '…' : '';
  return prefix + raw.slice(start, end) + suffix;
}

function highlightText(text = '', query = '') {
  const safeText = escapeHtml(String(text));
  if (!query) return safeText;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return safeText.replace(regex, '<mark>$1</mark>');
}

function queryMatches(sourceText = '', query = '') {
  if (!query) return false;
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = sourceText.toLowerCase();
  return tokens.every((token) => hay.includes(token));
}

function searchBooks(books, query) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];
  const results = [];
  books.forEach((book) => {
    const bookSource = `${book.title} ${book.author} ${book.category} ${(book.tags || []).join(' ')} ${book.summary} ${book.description}`;
    if (queryMatches(bookSource, cleanQuery)) {
      results.push({
        type: 'book',
        title: book.title,
        subtitle: `${book.author} · ${book.category}`,
        snippet: book.summary,
        href: `./book.html?slug=${encodeURIComponent(book.slug)}`,
        score: 120,
      });
    }
    (book.chapters || []).forEach((chapter, chapterIndex) => {
      const chapterSource = `${chapter.title} ${(chapter.content || []).join(' ')}`;
      if (queryMatches(`${book.title} ${chapterSource}`, cleanQuery)) {
        const exactChapter = queryMatches(chapter.title, cleanQuery);
        results.push({
          type: exactChapter ? 'chapter' : 'content',
          title: chapter.title,
          subtitle: `${book.title} · ${book.author}`,
          snippet: toSnippet(chapterSource, cleanQuery, 92),
          href: `./book.html?slug=${encodeURIComponent(book.slug)}#chapter-${chapterIndex + 1}`,
          score: exactChapter ? 100 : 80,
        });
      }
    });
  });
  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'zh-Hans-CN'));
}

function searchWithinBook(book, query) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];
  const results = [];
  (book.chapters || []).forEach((chapter, chapterIndex) => {
    (chapter.content || []).forEach((paragraph, paragraphIndex) => {
      if (queryMatches(paragraph, cleanQuery) || queryMatches(chapter.title, cleanQuery)) {
        results.push({
          chapterTitle: chapter.title,
          chapterIndex,
          paragraphIndex,
          snippet: toSnippet(paragraph, cleanQuery, 120),
          anchor: `chapter-${chapterIndex + 1}`,
        });
      }
    });
  });
  return results;
}

function renderStats(stats, map) {
  Object.entries(map).forEach(([key, selector]) => {
    const el = document.querySelector(selector);
    if (!el) return;
    if (key === 'words') el.textContent = formatCount(stats.words);
    else el.textContent = formatCount(stats[key]);
  });
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('read-quiet-theme', theme);
  document.querySelectorAll('[data-theme-label]').forEach((node) => {
    node.textContent = theme === 'dark' ? '切换白天' : '切换夜间';
  });
}

function initTheme() {
  const stored = localStorage.getItem('read-quiet-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(stored || (prefersDark ? 'dark' : 'light'));
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  });
}

function activateNav() {
  const page = document.body.dataset.page;
  document.querySelectorAll('[data-nav]').forEach((link) => {
    if (link.dataset.nav === page) link.classList.add('active');
  });
}

function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || '';
}

function setQueryParam(updates, replace = false) {
  const url = new URL(window.location.href);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  });
  if (replace) window.history.replaceState({}, '', url);
  else window.history.pushState({}, '', url);
}

function createBookCard(book, { compact = false } = {}) {
  return `
    <article class="book-card">
      <div class="book-card-head">
        <div style="display:flex; gap:16px; align-items:flex-start;">
          <div class="book-cover">${escapeHtml(getInitial(book.title))}</div>
          <div class="book-meta">
            <div class="tag-list">
              <span class="meta-pill">${escapeHtml(book.category)}</span>
              <span class="meta-pill">${escapeHtml(book.era)}</span>
            </div>
            <h3 class="book-title"><a href="./book.html?slug=${encodeURIComponent(book.slug)}">${escapeHtml(book.title)}</a></h3>
            <div class="book-subtitle">${escapeHtml(book.author)} · ${formatCount(getBookWordCount(book))} 收录字数 · ${getBookChapterCount(book)} 个节选</div>
          </div>
        </div>
        <div class="book-actions">
          <a class="inline-button" href="./book.html?slug=${encodeURIComponent(book.slug)}#toc">查看目录</a>
          <a class="inline-button primary-button" href="./book.html?slug=${encodeURIComponent(book.slug)}">进入阅读</a>
        </div>
      </div>
      <p class="book-description">${escapeHtml(compact ? book.summary : book.description)}</p>
      <div class="tag-list">
        ${(book.tags || []).map((tag) => `<a class="tag-pill" href="./library.html?tag=${encodeURIComponent(tag)}"># ${escapeHtml(tag)}</a>`).join('')}
      </div>
    </article>
  `;
}

function createEmptyState(title, copy) {
  return `<div class="empty-state"><h3>${escapeHtml(title)}</h3><p class="section-copy">${escapeHtml(copy)}</p></div>`;
}

window.ReadQuiet = {
  DATA_URL,
  activateNav,
  createBookCard,
  createEmptyState,
  escapeHtml,
  formatCount,
  formatInteger,
  getAllAuthors,
  getAllCategories,
  getAllTags,
  getBookBySlug,
  getBookChapterCount,
  getBookWordCount,
  getInitial,
  getQueryParam,
  getStats,
  highlightText,
  initTheme,
  loadBooks,
  queryMatches,
  renderStats,
  searchBooks,
  searchWithinBook,
  setQueryParam,
  setTheme,
  toSnippet,
};

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  activateNav();
});
