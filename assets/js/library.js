const {
  createBookCard,
  createEmptyState,
  escapeHtml,
  getAllAuthors,
  getAllCategories,
  getAllTags,
  getQueryParam,
  getStats,
  loadBooks,
  queryMatches,
  setQueryParam,
} = window.ReadQuiet;

async function initLibrary() {
  const books = await loadBooks();
  const state = {
    q: getQueryParam('q'),
    category: getQueryParam('category'),
    author: getQueryParam('author'),
    tag: getQueryParam('tag'),
    featured: getQueryParam('featured'),
    view: getQueryParam('view') || 'grid',
    sort: getQueryParam('sort') || 'title',
  };

  const stats = getStats(books);
  const summaryEl = document.querySelector('[data-library-summary]');
  if (summaryEl) {
    summaryEl.textContent = `共 ${stats.works} 部作品 · ${window.ReadQuiet.formatCount(stats.words)} 收录字数 · ${stats.chapters} 个节选章节`;
  }

  const categoryWrap = document.querySelector('[data-category-chips]');
  if (categoryWrap) {
    categoryWrap.innerHTML = ['全部', ...getAllCategories(books).map((item) => item.name)].map((name) => {
      const active = (name === '全部' && !state.category) || name === state.category;
      const href = name === '全部' ? './library.html' : `./library.html?category=${encodeURIComponent(name)}`;
      return `<a class="filter-chip ${active ? 'active' : ''}" href="${href}">${escapeHtml(name)}</a>`;
    }).join('');
  }

  const authorSelect = document.querySelector('[data-filter-author]');
  const categorySelect = document.querySelector('[data-filter-category]');
  const sortSelect = document.querySelector('[data-filter-sort]');
  const searchInput = document.querySelector('[data-filter-search]');
  const featuredCheckbox = document.querySelector('[data-filter-featured]');
  const tagsWrap = document.querySelector('[data-tag-chips]');

  if (authorSelect) {
    authorSelect.innerHTML = `<option value="">全部作者</option>` + getAllAuthors(books).map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)} (${item.count})</option>`).join('');
    authorSelect.value = state.author;
  }
  if (categorySelect) {
    categorySelect.innerHTML = `<option value="">全部分类</option>` + getAllCategories(books).map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)} (${item.count})</option>`).join('');
    categorySelect.value = state.category;
  }
  if (sortSelect) sortSelect.value = state.sort;
  if (searchInput) searchInput.value = state.q;
  if (featuredCheckbox) featuredCheckbox.checked = state.featured === '1';
  if (tagsWrap) {
    tagsWrap.innerHTML = getAllTags(books).map((tag) => `
      <button class="filter-chip ${state.tag === tag.name ? 'active' : ''}" data-tag="${escapeHtml(tag.name)}"># ${escapeHtml(tag.name)} <span class="muted">${tag.count}</span></button>
    `).join('');
  }

  function applyFilters() {
    let filtered = [...books];
    if (state.q) {
      filtered = filtered.filter((book) => queryMatches(`${book.title} ${book.author} ${book.category} ${(book.tags || []).join(' ')} ${book.summary} ${book.description}`, state.q));
    }
    if (state.category) filtered = filtered.filter((book) => book.category === state.category);
    if (state.author) filtered = filtered.filter((book) => book.author === state.author);
    if (state.tag) filtered = filtered.filter((book) => (book.tags || []).includes(state.tag));
    if (state.featured === '1') filtered = filtered.filter((book) => book.featured);

    const sorters = {
      title: (a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'),
      words: (a, b) => b.wordCount - a.wordCount,
      author: (a, b) => a.author.localeCompare(b.author, 'zh-Hans-CN'),
      chapters: (a, b) => b.chapters.length - a.chapters.length,
    };
    filtered.sort(sorters[state.sort] || sorters.title);

    const resultsEl = document.querySelector('[data-library-results]');
    const countEl = document.querySelector('[data-library-count]');
    const container = document.querySelector('[data-library-container]');
    if (countEl) countEl.textContent = `当前展示 ${filtered.length} / ${books.length} 部作品`;
    if (container) container.classList.toggle('list-view', state.view === 'list');
    if (resultsEl) {
      resultsEl.innerHTML = filtered.length
        ? filtered.map((book) => createBookCard(book)).join('')
        : createEmptyState('没有符合条件的作品', '你可以清空搜索词或切换分类、标签后再试一次。');
    }
    setQueryParam(state, true);
  }

  searchInput?.addEventListener('input', (event) => { state.q = event.target.value.trim(); applyFilters(); });
  authorSelect?.addEventListener('change', (event) => { state.author = event.target.value; applyFilters(); });
  categorySelect?.addEventListener('change', (event) => { state.category = event.target.value; applyFilters(); });
  sortSelect?.addEventListener('change', (event) => { state.sort = event.target.value; applyFilters(); });
  featuredCheckbox?.addEventListener('change', (event) => { state.featured = event.target.checked ? '1' : ''; applyFilters(); });
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.view;
      document.querySelectorAll('[data-view]').forEach((node) => node.classList.toggle('active', node.dataset.view === state.view));
      applyFilters();
    });
    button.classList.toggle('active', button.dataset.view === state.view);
  });
  document.querySelectorAll('[data-tag]').forEach((button) => {
    button.addEventListener('click', () => {
      state.tag = state.tag === button.dataset.tag ? '' : button.dataset.tag;
      applyFilters();
      document.querySelectorAll('[data-tag]').forEach((node) => node.classList.toggle('active', node.dataset.tag === state.tag));
    });
  });
  document.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
    state.q = '';
    state.category = '';
    state.author = '';
    state.tag = '';
    state.featured = '';
    state.sort = 'title';
    state.view = 'grid';
    if (searchInput) searchInput.value = '';
    if (authorSelect) authorSelect.value = '';
    if (categorySelect) categorySelect.value = '';
    if (sortSelect) sortSelect.value = 'title';
    if (featuredCheckbox) featuredCheckbox.checked = false;
    document.querySelectorAll('[data-view]').forEach((node) => node.classList.toggle('active', node.dataset.view === 'grid'));
    document.querySelectorAll('[data-tag]').forEach((node) => node.classList.remove('active'));
    applyFilters();
  });

  applyFilters();
}

document.addEventListener('DOMContentLoaded', () => {
  initLibrary().catch((error) => console.error(error));
});
