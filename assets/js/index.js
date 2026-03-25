const {
  createBookCard,
  escapeHtml,
  formatCount,
  getAllTags,
  getStats,
  highlightText,
  loadBooks,
  renderStats,
  searchBooks,
} = window.ReadQuiet;

function renderSearchPreview(results, query) {
  const panel = document.querySelector('[data-search-preview]');
  if (!panel) return;
  if (!query.trim()) {
    panel.innerHTML = '';
    panel.classList.add('hidden');
    return;
  }
  if (!results.length) {
    panel.innerHTML = '<div class="preview-item"><strong>没有找到匹配内容</strong><div class="muted" style="margin-top:8px;">试试作者、标签或章节名。</div></div>';
    panel.classList.remove('hidden');
    return;
  }
  panel.innerHTML = results.slice(0, 5).map((item) => `
    <div class="preview-item">
      <a href="${item.href}">
        <strong>${highlightText(item.title, query)}</strong>
        <div class="muted" style="margin-top:6px;">${escapeHtml(item.subtitle)}</div>
        <div class="muted" style="margin-top:6px;">${highlightText(item.snippet, query)}</div>
      </a>
    </div>
  `).join('');
  panel.classList.remove('hidden');
}

async function initHome() {
  const books = await loadBooks();
  const stats = getStats(books);
  renderStats(stats, {
    works: '[data-stat="works"]',
    words: '[data-stat="words"]',
    chapters: '[data-stat="chapters"]',
    tags: '[data-stat="tags"]',
  });

  const featured = books.filter((book) => book.featured).slice(0, 3);
  const featuredLead = featured[0] || books[0];
  const featuredSide = featured.slice(1, 3);
  const featuredMainEl = document.querySelector('[data-featured-main]');
  const featuredSideEl = document.querySelector('[data-featured-side]');
  if (featuredMainEl && featuredLead) {
    featuredMainEl.innerHTML = `
      <div class="tag-list">
        <span class="meta-pill">Featured Reading</span>
        <span class="meta-pill">${escapeHtml(featuredLead.category)}</span>
      </div>
      <h3 class="section-title" style="margin-top:18px;">${escapeHtml(featuredLead.title)}</h3>
      <p class="page-intro" style="margin-top:12px;">${escapeHtml(featuredLead.summary)}</p>
      <p class="section-copy">${escapeHtml(featuredLead.description)}</p>
      <div class="section-actions">
        <a class="inline-button primary-button" href="./book.html?slug=${encodeURIComponent(featuredLead.slug)}">进入阅读</a>
        <a class="inline-button" href="./library.html?featured=1">查看更多精选</a>
      </div>
    `;
  }
  if (featuredSideEl) {
    featuredSideEl.innerHTML = featuredSide.map((book) => `
      <article class="mini-feature">
        <div class="muted">${escapeHtml(book.author)} · ${escapeHtml(book.category)}</div>
        <h4 style="margin:8px 0 0; font-size:1.22rem;">${escapeHtml(book.title)}</h4>
        <p class="section-copy" style="margin:10px 0 0;">${escapeHtml(book.summary)}</p>
        <div class="section-actions" style="margin-top:12px;">
          <a class="inline-button" href="./book.html?slug=${encodeURIComponent(book.slug)}">阅读节选</a>
        </div>
      </article>
    `).join('');
  }

  const tagsEl = document.querySelector('[data-tags]');
  if (tagsEl) {
    tagsEl.innerHTML = getAllTags(books).slice(0, 10).map((tag) => `
      <a class="tag-pill" href="./library.html?tag=${encodeURIComponent(tag.name)}"># ${escapeHtml(tag.name)} <span class="muted">${tag.count}</span></a>
    `).join('');
  }

  const latestEl = document.querySelector('[data-latest-books]');
  if (latestEl) {
    latestEl.innerHTML = books.slice(0, 6).map((book) => createBookCard(book, { compact: true })).join('');
  }

  const input = document.querySelector('[data-home-search-input]');
  const form = document.querySelector('[data-home-search-form]');
  if (input && form) {
    input.addEventListener('input', () => {
      renderSearchPreview(searchBooks(books, input.value), input.value);
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = input.value.trim();
      window.location.href = `./search.html?q=${encodeURIComponent(query)}`;
    });
    document.addEventListener('click', (event) => {
      const panel = document.querySelector('[data-search-preview]');
      if (!panel) return;
      if (!form.contains(event.target)) panel.classList.add('hidden');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initHome().catch((error) => {
    console.error(error);
  });
});
