const RQ = window.ReadQuiet;

async function initLibrary() {
  const books = await RQ.loadBooks();

  const state = {
    q: RQ.getQueryParam('q'),
    category: RQ.getQueryParam('category'),
    author: RQ.getQueryParam('author'),
    tag: RQ.getQueryParam('tag'),
    featured: RQ.getQueryParam('featured'),
    view: RQ.getQueryParam('view') || 'grid',
    sort: RQ.getQueryParam('sort') || 'title',
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
  const resultsEl = document.querySelector('[data-library-results]');
  const countEl = document.querySelector('[data-library-count]');
  const container = document.querySelector('[data-library-container]');
  const clearButton = document.querySelector('[data-clear-filters]');

  function buildLibraryHref(overrides = {}) {
    const params = new URLSearchParams();
    const next = { ...state, ...overrides };

    Object.entries(next).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value);
      }
    });

    const query = params.toString();
    return `./library.html${query ? `?${query}` : ''}`;
  }

  function renderSummary(filteredCount = books.length) {
    if (!summaryEl) return;

    const stats = RQ.getStats(books);
    summaryEl.textContent =
      `共 ${stats.works} 部作品 · ${RQ.formatCount(stats.words)} 收录字数 · ` +
      `${stats.chapters} 个节选章节 · 当前结果 ${filteredCount} 部`;
  }

  function renderCategoryChips() {
    if (!categoryWrap) return;

    const names = ['全部', ...RQ.getAllCategories(books).map((item) => item.name)];

    categoryWrap.innerHTML = names
      .map((name) => {
        const active = (name === '全部' && !state.category) || name === state.category;
        const href =
          name === '全部'
            ? buildLibraryHref({ category: '' })
            : buildLibraryHref({ category: name });

        return `
          <a class="chip${active ? ' active' : ''}" href="${href}">
            ${RQ.escapeHtml(name)}
          </a>
        `;
      })
      .join('');
  }

  function renderTagChips() {
    if (!tagsWrap) return;

    const tags = RQ.getAllTags(books);

    tagsWrap.innerHTML = tags
      .map((tag) => {
        const active = state.tag === tag.name;
        const encodedName = encodeURIComponent(tag.name);

        return `
          <button
            type="button"
            class="tag-chip${active ? ' active' : ''}"
            data-tag="${encodedName}"
          >
            # ${RQ.escapeHtml(tag.name)} ${tag.count}
          </button>
        `;
      })
      .join('');

    tagsWrap.querySelectorAll('[data-tag]').forEach((button) => {
      button.addEventListener('click', () => {
        const tagName = decodeURIComponent(button.dataset.tag || '');
        state.tag = state.tag === tagName ? '' : tagName;
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

  function renderSelectOptions() {
    if (authorSelect) {
      authorSelect.innerHTML = [
        '<option value="">全部作者</option>',
        ...RQ.getAllAuthors(books).map(
          (item) =>
            `<option value="${RQ.escapeHtml(item.name)}">${RQ.escapeHtml(item.name)} (${item.count})</option>`
        ),
      ].join('');
    }

    if (categorySelect) {
      categorySelect.innerHTML = [
        '<option value="">全部分类</option>',
        ...RQ.getAllCategories(books).map(
          (item) =>
            `<option value="${RQ.escapeHtml(item.name)}">${RQ.escapeHtml(item.name)} (${item.count})</option>`
        ),
      ].join('');
    }
  }

  function applyFilters() {
    let filtered = [...books];

    if (state.q) {
      filtered = filtered.filter((book) =>
        RQ.queryMatches(
          `${book.title} ${book.author} ${book.category} ${(book.tags || []).join(' ')} ${book.summary} ${book.description}`,
          state.q
        )
      );
    }

    if (state.category) {
      filtered = filtered.filter((book) => book.category === state.category);
    }

    if (state.author) {
      filtered = filtered.filter((book) => book.author === state.author);
    }

    if (state.tag) {
      filtered = filtered.filter((book) => (book.tags || []).includes(state.tag));
    }

    if (state.featured === '1') {
      filtered = filtered.filter((book) => book.featured);
    }

    const sorters = {
      title: (a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'),
      words: (a, b) => Number(b.wordCount || 0) - Number(a.wordCount || 0),
      author: (a, b) => a.author.localeCompare(b.author, 'zh-Hans-CN'),
      chapters: (a, b) => (b.chapters?.length || 0) - (a.chapters?.length || 0),
    };

    filtered.sort(sorters[state.sort] || sorters.title);

    if (countEl) {
      countEl.textContent = `当前展示 ${filtered.length} / ${books.length} 部作品`;
    }

    if (container) {
      container.classList.toggle('list-view', state.view === 'list');
    }

    if (resultsEl) {
      resultsEl.innerHTML = filtered.length
        ? filtered.map((book) => RQ.createBookCard(book)).join('')
        : RQ.createEmptyState(
            '没有符合条件的作品',
            '你可以清空搜索词或切换分类、标签后再试一次。'
          );
    }

    renderSummary(filtered.length);
    renderCategoryChips();
    renderTagChips();
    syncControls();
    RQ.setQueryParam(state, true);
  }

  renderSelectOptions();

  searchInput?.addEventListener('input', (event) => {
    state.q = (event.target.value || '').trim();
    applyFilters();
  });

  authorSelect?.addEventListener('change', (event) => {
    state.author = event.target.value || '';
    applyFilters();
  });

  categorySelect?.addEventListener('change', (event) => {
    state.category = event.target.value || '';
    applyFilters();
  });

  sortSelect?.addEventListener('change', (event) => {
    state.sort = event.target.value || 'title';
    applyFilters();
  });

  featuredCheckbox?.addEventListener('change', (event) => {
    state.featured = event.target.checked ? '1' : '';
    applyFilters();
  });

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.view || 'grid';
      applyFilters();
    });
  });

  clearButton?.addEventListener('click', () => {
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
