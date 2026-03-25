const {
  createEmptyState,
  escapeHtml,
  formatCount,
  getBookBySlug,
  getBookChapterCount,
  getBookWordCount,
  getQueryParam,
  highlightText,
  loadBooks,
  searchWithinBook,
} = window.ReadQuiet;

function renderBookContent(book, query = '') {
  const chaptersEl = document.querySelector('[data-book-chapters]');
  if (!chaptersEl) return;
  chaptersEl.innerHTML = (book.chapters || []).map((chapter, chapterIndex) => `
    <article class="chapter-card" id="chapter-${chapterIndex + 1}">
      <h2 class="chapter-title">${escapeHtml(chapter.title)}</h2>
      <div class="chapter-content">
        ${(chapter.content || []).map((paragraph) => `<p>${highlightText(paragraph, query)}</p>`).join('')}
      </div>
    </article>
  `).join('');
}

async function initBookPage() {
  const books = await loadBooks();
  const slug = getQueryParam('slug');
  const query = getQueryParam('q');
  const book = getBookBySlug(books, slug) || books[0];
  if (!book) return;

  document.title = `${book.title} · 静读`;
  document.querySelector('[data-book-title]').textContent = book.title;
  document.querySelector('[data-book-author]').textContent = `${book.author} · ${book.era}`;
  document.querySelector('[data-book-summary]').textContent = book.summary;
  document.querySelector('[data-book-description]').textContent = book.description;
  document.querySelector('[data-book-words]').textContent = `${formatCount(getBookWordCount(book))} 收录字数`;
  document.querySelector('[data-book-chapter-count]').textContent = `${getBookChapterCount(book)} 个节选章节`;
  document.querySelector('[data-book-category]').textContent = book.category;
  document.querySelector('[data-book-search-input]').value = query;

  const tagsEl = document.querySelector('[data-book-tags]');
  if (tagsEl) tagsEl.innerHTML = (book.tags || []).map((tag) => `<a class="tag-pill" href="./library.html?tag=${encodeURIComponent(tag)}"># ${escapeHtml(tag)}</a>`).join('');

  const tocEl = document.querySelector('[data-book-toc]');
  if (tocEl) {
    tocEl.innerHTML = (book.chapters || []).map((chapter, chapterIndex) => `
      <a href="#chapter-${chapterIndex + 1}">${chapterIndex + 1}. ${escapeHtml(chapter.title)}</a>
    `).join('');
  }

  renderBookContent(book, query);

  const resultWrap = document.querySelector('[data-book-search-results]');
  const resultCount = document.querySelector('[data-book-search-count]');
  const searchForm = document.querySelector('[data-book-search-form]');
  const searchInput = document.querySelector('[data-book-search-input]');
  const prevBtn = document.querySelector('[data-book-search-prev]');
  const nextBtn = document.querySelector('[data-book-search-next]');
  let cursor = 0;

  function focusResult(index, results) {
    const target = results[index];
    if (!target) return;
    const node = document.getElementById(target.anchor);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      node.classList.add('flash-focus');
      setTimeout(() => node.classList.remove('flash-focus'), 1200);
    }
  }

  function renderSearchState() {
    const q = searchInput.value.trim();
    const results = searchWithinBook(book, q);
    renderBookContent(book, q);
    if (resultCount) resultCount.textContent = q ? `当前书内找到 ${results.length} 条命中` : '输入关键词后，可在当前作品内检索并高亮。';
    if (!q) {
      resultWrap.innerHTML = createEmptyState('从当前作品开始检索', '搜索会在本书的章节与正文中查找关键词，并把命中片段高亮显示。');
      return;
    }
    if (!results.length) {
      resultWrap.innerHTML = createEmptyState('没有书内命中', '试试更短的关键词，或改搜章节标题中的术语。');
      return;
    }
    cursor = Math.min(cursor, results.length - 1);
    resultWrap.innerHTML = results.map((item, index) => `
      <div class="book-search-result ${index === cursor ? 'active' : ''}">
        <button type="button" data-result-index="${index}">
          <strong>${escapeHtml(item.chapterTitle)}</strong>
          <div class="muted" style="margin-top:6px;">第 ${item.chapterIndex + 1} 节 · 片段 ${item.paragraphIndex + 1}</div>
          <div class="muted" style="margin-top:8px;">${highlightText(item.snippet, q)}</div>
        </button>
      </div>
    `).join('');
    resultWrap.querySelectorAll('[data-result-index]').forEach((button) => {
      button.addEventListener('click', () => {
        cursor = Number(button.dataset.resultIndex);
        focusResult(cursor, results);
        renderSearchState();
      });
    });
    prevBtn.disabled = results.length <= 1;
    nextBtn.disabled = results.length <= 1;
    prevBtn.onclick = () => {
      cursor = (cursor - 1 + results.length) % results.length;
      focusResult(cursor, results);
      renderSearchState();
    };
    nextBtn.onclick = () => {
      cursor = (cursor + 1) % results.length;
      focusResult(cursor, results);
      renderSearchState();
    };
  }

  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const url = new URL(window.location.href);
    const value = searchInput.value.trim();
    if (value) url.searchParams.set('q', value); else url.searchParams.delete('q');
    window.history.replaceState({}, '', url);
    cursor = 0;
    renderSearchState();
  });

  document.querySelector('[data-font-minus]')?.addEventListener('click', () => {
    const current = Number(document.documentElement.style.getPropertyValue('--font-size-scale') || '1');
    document.documentElement.style.setProperty('--font-size-scale', String(Math.max(0.92, current - 0.06)));
  });
  document.querySelector('[data-font-plus]')?.addEventListener('click', () => {
    const current = Number(document.documentElement.style.getPropertyValue('--font-size-scale') || '1');
    document.documentElement.style.setProperty('--font-size-scale', String(Math.min(1.24, current + 0.06)));
  });

  renderSearchState();

  const tocLinks = document.querySelectorAll('[data-book-toc] a');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        tocLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
      }
    });
  }, { rootMargin: '-25% 0px -60% 0px' });

  document.querySelectorAll('[data-book-chapters] .chapter-card').forEach((section) => observer.observe(section));
}

document.addEventListener('DOMContentLoaded', () => {
  initBookPage().catch((error) => console.error(error));
});
