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

  const summaryEl = document.querySelector('[data-library-summary]');
  const categoryWrap = document.querySelector('[data-category-chips]');
  const authorSelect = document.querySelector('[data-filter-author]');
  const categorySelect = document.querySelector('[data-filter-category]');
  const sortSelect = document.querySelector('[data-filter-sort]');
  const searchInput = document.querySelector('[data-filter-search]');
  const featuredCheckbox = document.querySelector('[data-filter-featured]');
  const tagsWrap = document.querySelector('[data-tag-chips]');
  const filterPanel = document.querySelector('[data-filter-panel]');
  const filterPanelToggle = document.querySelector('[data-filter-panel-toggle]');
  const commandWrap = document.querySelector('[data-library-command]');


  function buildLibraryHref(overrides = {}) {
    const params = new URLSearchParams();
    const next = { ...state, ...overrides };
    Object.entries(next).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, value);
    });
    const query = params.toString();
    return `./library.html${query ? `?${query}` : ''}`;
  }

  function renderSummary(filteredCount = books.length) {
    if (!summaryEl) return;
    const stats = getStats(books);
    summaryEl.textContent = `共 ${stats.works} 部作品 · ${window.ReadQuiet.formatCount(stats.words)} 收录字数 · ${stats.chapters} 个节选章节 · 当前结果 ${filteredCount} 部`;
  }

  function renderCategoryChips() {
    if (!categoryWrap) return;
    categoryWrap.innerHTML = ['全部', ...getAllCategories(books).map((item) => item.name)].map((name) => {
      const active = (name === '全部' && !state.category) || name === state.category;
      const href = name === '全部' ? buildLibraryHref({ category: '' }) : buildLibraryHref({ category: name });
      return `<a class="filter-chip ${active ? 'active' : ''}" href="${href}">${escapeHtml(name)}</a>`;
    }).join('');
  }

  function renderTagChips() {
    if (!tagsWrap) return;
    tagsWrap.innerHTML = getAllTags(books).map((tag) => `
      <button class="filter-chip ${state.tag === tag.name ? 'active' : ''}" type="button" data-tag="${escapeHtml(tag.name)}"># ${escapeHtml(tag.name)} <span class="muted">${tag.count}</span></button>
    `).join('');

    document.querySelectorAll('[data-tag]').forEach((button) => {
      button.addEventListener('click', () => {
        state.tag = state.tag === button.dataset.tag ? '' : button.dataset.tag;
        applyFilters();
      });
    });
  }

  function syncControls() {
    if (authorSelect) authorSelect.value = state.author;
    if (categorySelect) categorySelect.value = state.category;
    if (sortSelect) sortSelect.value = state.sort;
    if (searchInput) searchInput.value = state.q;
    if (featuredCheckbox) featuredCheckbox.checked = state.featured === '1';

    document.querySelectorAll('[data-view]').forEach((node) => {
      node.classList.toggle('active', node.dataset.view === state.view);
    });
  }

  if (authorSelect) {
    authorSelect.innerHTML = `<option value="">全部作者</option>` + getAllAuthors(books).map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)} (${item.count})</option>`).join('');
  }
  if (categorySelect) {
    categorySelect.innerHTML = `<option value="">全部分类</option>` + getAllCategories(books).map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)} (${item.count})</option>`).join('');
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

    renderSummary(filtered.length);
    renderCategoryChips();
    renderTagChips();
    syncControls();
    setQueryParam(state, true);
  }

  searchInput?.addEventListener('input', (event) => {
    state.q = event.target.value.trim();
    applyFilters();
  });
  authorSelect?.addEventListener('change', (event) => {
    state.author = event.target.value;
    applyFilters();
  });
  categorySelect?.addEventListener('change', (event) => {
    state.category = event.target.value;
    applyFilters();
  });
  sortSelect?.addEventListener('change', (event) => {
    state.sort = event.target.value;
    applyFilters();
  });
  featuredCheckbox?.addEventListener('change', (event) => {
    state.featured = event.target.checked ? '1' : '';
    applyFilters();
  });

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.view;
      applyFilters();
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
    applyFilters();
  });

  filterPanelToggle?.addEventListener('click', () => {
    const expanded = filterPanelToggle.getAttribute('aria-expanded') === 'true';
    filterPanelToggle.setAttribute('aria-expanded', String(!expanded));
    filterPanel?.classList.toggle('hidden', expanded);
  });

  document.addEventListener('click', (event) => {
    if (!commandWrap?.contains(event.target)) {
      filterPanelToggle?.setAttribute('aria-expanded', 'false');
      filterPanel?.classList.add('hidden');
    }
  });

  renderSummary();
  renderCategoryChips();
  renderTagChips();
  syncControls();
  applyFilters();
}

document.addEventListener('DOMContentLoaded', () => {
  initLibrary().catch((error) => console.error(error));
});
