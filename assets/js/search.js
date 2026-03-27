const RQ = window.ReadQuiet;

async function initSearchPage() {
  const books = await RQ.loadBooks();
  const query = RQ.getQueryParam('q');
  const input = document.querySelector('[data-search-page-input]');
  const resultsEl = document.querySelector('[data-search-results]');
  const countEl = document.querySelector('[data-search-count]');
  const tabs = document.querySelectorAll('[data-result-filter]');
  let mode = RQ.getQueryParam('mode') || 'all';
  if (input) input.value = query;

  function render() {
    const results = RQ.searchBooks(books, query).filter((item) => mode === 'all' || item.type === mode);
    if (countEl) countEl.textContent = query ? `“${query}” 共找到 ${results.length} 条结果` : '输入关键词后，即可在全站范围检索作品、章节与正文片段。';
    if (!query) {
      resultsEl.innerHTML = RQ.createEmptyState('从一个词开始', '你可以搜索书名、作者、标签、章节名，或者正文中的关键词。');
      return;
    }
    resultsEl.innerHTML = results.length ? results.map((item) => `
      <article class="result-card">
        <div class="result-meta">
          <span class="meta-pill">${item.type === 'book' ? '著作' : item.type === 'chapter' ? '章节' : '正文'}</span>
          <span class="muted">${RQ.escapeHtml(item.subtitle)}</span>
        </div>
        <h3 class="result-title"><a href="${item.href}">${RQ.highlightText(item.title, query)}</a></h3>
        <p class="result-snippet">${RQ.highlightText(item.snippet, query)}</p>
        <div class="result-actions">
          <a class="inline-button primary-button" href="${item.href}">打开结果</a>
        </div>
      </article>
    `).join('') : RQ.createEmptyState('没有找到结果', '你可以尝试更短的关键词，或者改搜作者、标签与章节名。');
    tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.resultFilter === mode));
  }

  document.querySelector('[data-search-page-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim();
    const url = new URL(window.location.href);
    if (value) url.searchParams.set('q', value); else url.searchParams.delete('q');
    if (mode !== 'all') url.searchParams.set('mode', mode); else url.searchParams.delete('mode');
    window.location.href = url.toString();
  });

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.resultFilter;
      const url = new URL(window.location.href);
      if (mode === 'all') url.searchParams.delete('mode'); else url.searchParams.set('mode', mode);
      window.history.replaceState({}, '', url);
      render();
    });
  });

  render();
}

document.addEventListener('DOMContentLoaded', () => {
  initSearchPage().catch((error) => console.error(error));
});
