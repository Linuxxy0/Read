const RQ = window.ReadQuiet;

const READER_SETTINGS_KEY = 'read-quiet-reader-settings';
const SIDEBAR_SETTINGS_KEY = 'read-quiet-sidebar-settings';
const READER_DEFAULTS = {
  fontFamily: 'serif',
  fontSize: 18,
  lineHeight: 2,
  paragraphGap: 1.1,
  sideGap: 44,
};
const SIDEBAR_DEFAULTS = {
  leftCollapsed: false,
  rightCollapsed: false,
};

const READER_FONT_MAP = {
  serif: {
    label: '宋体阅读',
    family: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", serif',
  },
  sans: {
    label: '无衬线',
    family: '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  kai: {
    label: '楷体风格',
    family: '"Kaiti SC", "STKaiti", "KaiTi", serif',
  },
};

function renderBookContent(book, query = '') {
  const chaptersEl = document.querySelector('[data-book-chapters]');
  if (!chaptersEl) return;
  chaptersEl.innerHTML = (book.chapters || []).map((chapter, chapterIndex) => `
    <article class="chapter-card" id="chapter-${chapterIndex + 1}">
      <h2 class="chapter-title">${RQ.escapeHtml(chapter.title)}</h2>
      <div class="chapter-content">
        ${(chapter.content || []).map((paragraph) => `<p>${RQ.highlightText(paragraph, query)}</p>`).join('')}
      </div>
    </article>
  `).join('');
}

function loadReaderSettings() {
  try {
    const raw = localStorage.getItem(READER_SETTINGS_KEY);
    if (!raw) return { ...READER_DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      ...READER_DEFAULTS,
      ...parsed,
    };
  } catch (error) {
    return { ...READER_DEFAULTS };
  }
}

function saveReaderSettings(settings) {
  localStorage.setItem(READER_SETTINGS_KEY, JSON.stringify(settings));
}

function applyReaderSettings(settings) {
  const root = document.documentElement;
  const font = READER_FONT_MAP[settings.fontFamily] || READER_FONT_MAP.serif;
  root.style.setProperty('--reader-font-family', font.family);
  root.style.setProperty('--reader-font-size', `${settings.fontSize}px`);
  root.style.setProperty('--reader-line-height', String(settings.lineHeight));
  root.style.setProperty('--reader-paragraph-gap', `${settings.paragraphGap}em`);
  root.style.setProperty('--reader-side-gap', `${settings.sideGap}px`);
}

function bindReaderControls() {
  const controls = {
    fontFamily: document.querySelector('[data-reader-font-family]'),
    fontSize: document.querySelector('[data-reader-font-size]'),
    lineHeight: document.querySelector('[data-reader-line-height]'),
    paragraphGap: document.querySelector('[data-reader-paragraph-gap]'),
    sideGap: document.querySelector('[data-reader-side-gap]'),
    reset: document.querySelector('[data-reader-reset]'),
    fontFamilyLabel: document.querySelector('[data-reader-font-family-label]'),
    fontSizeValue: document.querySelector('[data-reader-font-size-value]'),
    lineHeightValue: document.querySelector('[data-reader-line-height-value]'),
    paragraphGapValue: document.querySelector('[data-reader-paragraph-gap-value]'),
    sideGapValue: document.querySelector('[data-reader-side-gap-value]'),
  };

  let settings = loadReaderSettings();

  function syncControls() {
    const font = READER_FONT_MAP[settings.fontFamily] || READER_FONT_MAP.serif;
    if (controls.fontFamily) controls.fontFamily.value = settings.fontFamily;
    if (controls.fontSize) controls.fontSize.value = String(settings.fontSize);
    if (controls.lineHeight) controls.lineHeight.value = String(settings.lineHeight);
    if (controls.paragraphGap) controls.paragraphGap.value = String(settings.paragraphGap);
    if (controls.sideGap) controls.sideGap.value = String(settings.sideGap);
    if (controls.fontFamilyLabel) controls.fontFamilyLabel.textContent = font.label;
    if (controls.fontSizeValue) controls.fontSizeValue.textContent = `${settings.fontSize}px`;
    if (controls.lineHeightValue) controls.lineHeightValue.textContent = settings.lineHeight.toFixed(2).replace(/0$/, '').replace(/\.$/, '');
    if (controls.paragraphGapValue) controls.paragraphGapValue.textContent = `${settings.paragraphGap.toFixed(1).replace(/\.0$/, '')}em`;
    if (controls.sideGapValue) controls.sideGapValue.textContent = `${settings.sideGap}px`;
  }

  function updateSettings(patch) {
    settings = { ...settings, ...patch };
    applyReaderSettings(settings);
    saveReaderSettings(settings);
    syncControls();
  }

  applyReaderSettings(settings);
  syncControls();

  controls.fontFamily?.addEventListener('change', (event) => {
    updateSettings({ fontFamily: event.target.value });
  });

  controls.fontSize?.addEventListener('input', (event) => {
    updateSettings({ fontSize: Number(event.target.value) });
  });

  controls.lineHeight?.addEventListener('input', (event) => {
    updateSettings({ lineHeight: Number(event.target.value) });
  });

  controls.paragraphGap?.addEventListener('input', (event) => {
    updateSettings({ paragraphGap: Number(event.target.value) });
  });

  controls.sideGap?.addEventListener('input', (event) => {
    updateSettings({ sideGap: Number(event.target.value) });
  });

  controls.reset?.addEventListener('click', () => {
    settings = { ...READER_DEFAULTS };
    applyReaderSettings(settings);
    saveReaderSettings(settings);
    syncControls();
  });
}

function loadSidebarSettings() {
  try {
    const raw = localStorage.getItem(SIDEBAR_SETTINGS_KEY);
    if (!raw) return { ...SIDEBAR_DEFAULTS };
    return {
      ...SIDEBAR_DEFAULTS,
      ...JSON.parse(raw),
    };
  } catch (error) {
    return { ...SIDEBAR_DEFAULTS };
  }
}

function saveSidebarSettings(settings) {
  localStorage.setItem(SIDEBAR_SETTINGS_KEY, JSON.stringify(settings));
}

function bindSidebarToggles() {
  const layout = document.querySelector('[data-reading-layout]');
  if (!layout) return;

  const leftSidebar = layout.querySelector('[data-reading-sidebar="left"]');
  const rightSidebar = layout.querySelector('[data-reading-sidebar="right"]');
  const leftButton = layout.querySelector('[data-sidebar-toggle="left"]');
  const rightButton = layout.querySelector('[data-sidebar-toggle="right"]');

  let settings = loadSidebarSettings();

  function setSidebarState(side, collapsed) {
    const sidebar = side === 'left' ? leftSidebar : rightSidebar;
    const button = side === 'left' ? leftButton : rightButton;
    if (!sidebar || !button) return;

    sidebar.classList.toggle('is-collapsed', collapsed);
    layout.classList.toggle(`has-${side}-collapsed`, collapsed);
    button.setAttribute('aria-expanded', String(!collapsed));
    const label = button.querySelector('[data-sidebar-toggle-label]');
    if (label) {
      label.textContent = collapsed ? '展开' : '收起';
    }
    button.setAttribute('title', collapsed ? '展开侧栏' : '收起侧栏');
  }

  function applySidebarState() {
    setSidebarState('left', settings.leftCollapsed);
    setSidebarState('right', settings.rightCollapsed);
  }

  leftButton?.addEventListener('click', () => {
    settings.leftCollapsed = !settings.leftCollapsed;
    saveSidebarSettings(settings);
    applySidebarState();
  });

  rightButton?.addEventListener('click', () => {
    settings.rightCollapsed = !settings.rightCollapsed;
    saveSidebarSettings(settings);
    applySidebarState();
  });

  applySidebarState();
}

async function initBookPage() {
  const books = await RQ.loadBooks();
  const slug = RQ.getQueryParam('slug');
  const query = RQ.getQueryParam('q');
  const book = RQ.getBookBySlug(books, slug) || books[0];
  if (!book) return;

  bindReaderControls();
  bindSidebarToggles();

  document.title = `${book.title} · 静读`;
  document.querySelector('[data-book-title]').textContent = book.title;
  document.querySelector('[data-book-author]').textContent = `${book.author} · ${book.era}`;
  document.querySelector('[data-book-summary]').textContent = book.summary;
  document.querySelector('[data-book-description]').textContent = book.description;
  document.querySelector('[data-book-words]').textContent = `${RQ.formatCount(RQ.getBookWordCount(book))} 收录字数`;
  document.querySelector('[data-book-chapter-count]').textContent = `${RQ.getBookChapterCount(book)} 个节选章节`;
  document.querySelector('[data-book-category]').textContent = book.category;
  document.querySelector('[data-book-search-input]').value = query;

  const tagsEl = document.querySelector('[data-book-tags]');
  if (tagsEl) {
    tagsEl.innerHTML = (book.tags || []).map((tag) => `<a class="tag-pill" href="./library.html?tag=${encodeURIComponent(tag)}"># ${RQ.escapeHtml(tag)}</a>`).join('');
  }

  const tocEl = document.querySelector('[data-book-toc]');
  if (tocEl) {
    tocEl.innerHTML = (book.chapters || []).map((chapter, chapterIndex) => `
      <a href="#chapter-${chapterIndex + 1}">${chapterIndex + 1}. ${RQ.escapeHtml(chapter.title)}</a>
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

  function setNavDisabled(disabled) {
    if (prevBtn) prevBtn.disabled = disabled;
    if (nextBtn) nextBtn.disabled = disabled;
  }

  function renderSearchState() {
    const q = searchInput.value.trim();
    const results = RQ.searchWithinBook(book, q);
    renderBookContent(book, q);

    if (resultCount) {
      resultCount.textContent = q
        ? `当前书内找到 ${results.length} 条命中`
        : '输入关键词后，可在当前作品内检索并高亮。';
    }

    if (!q) {
      setNavDisabled(true);
      if (resultWrap) {
        resultWrap.innerHTML = RQ.createEmptyState('从当前作品开始检索', '搜索会在本书的章节与正文中查找关键词，并把命中片段高亮显示。');
      }
      return;
    }

    if (!results.length) {
      setNavDisabled(true);
      if (resultWrap) {
        resultWrap.innerHTML = RQ.createEmptyState('没有书内命中', '试试更短的关键词，或改搜章节标题中的术语。');
      }
      return;
    }

    cursor = Math.min(cursor, results.length - 1);

    if (resultWrap) {
      resultWrap.innerHTML = results.map((item, index) => `
        <div class="book-search-result ${index === cursor ? 'active' : ''}">
          <button type="button" data-result-index="${index}">
            <strong>${RQ.escapeHtml(item.chapterTitle)}</strong>
            <div class="muted" style="margin-top:6px;">第 ${item.chapterIndex + 1} 节 · 片段 ${item.paragraphIndex + 1}</div>
            <div class="muted" style="margin-top:8px;">${RQ.highlightText(item.snippet, q)}</div>
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
    }

    setNavDisabled(results.length <= 1);

    if (prevBtn) {
      prevBtn.onclick = () => {
        cursor = (cursor - 1 + results.length) % results.length;
        focusResult(cursor, results);
        renderSearchState();
      };
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        cursor = (cursor + 1) % results.length;
        focusResult(cursor, results);
        renderSearchState();
      };
    }
  }

  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const url = new URL(window.location.href);
    const value = searchInput.value.trim();
    if (value) url.searchParams.set('q', value);
    else url.searchParams.delete('q');
    window.history.replaceState({}, '', url);
    cursor = 0;
    renderSearchState();
  });

  renderSearchState();

  const tocLinks = document.querySelectorAll('[data-book-toc] a');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        tocLinks.forEach((link) => {
          link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      }
    });
  }, { rootMargin: '-25% 0px -60% 0px' });

  document.querySelectorAll('[data-book-chapters] .chapter-card').forEach((section) => observer.observe(section));
}

document.addEventListener('DOMContentLoaded', () => {
  initBookPage().catch((error) => console.error(error));
});
