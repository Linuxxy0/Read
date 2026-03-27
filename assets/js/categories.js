const RQ = window.ReadQuiet;

async function initCategories() {
  const books = await RQ.loadBooks();
  const categoryEl = document.querySelector('[data-category-grid]');
  const tagEl = document.querySelector('[data-tags-grid]');
  categoryEl.innerHTML = RQ.getAllCategories(books).map((item) => `
    <article class="category-card">
      <div class="count-pill">${item.count} 部作品</div>
      <h3 style="margin:16px 0 0; font-size:1.32rem;">${RQ.escapeHtml(item.name)}</h3>
      <p class="category-meta">按分类动态聚合，可直接联动到书架页筛选。</p>
      <div class="category-actions"><a class="inline-button" href="./library.html?category=${encodeURIComponent(item.name)}">查看分类</a></div>
    </article>
  `).join('');
  tagEl.innerHTML = RQ.getAllTags(books).map((item) => `
    <article class="tag-card">
      <div class="count-pill">${item.count} 次出现</div>
      <h3 style="margin:16px 0 0; font-size:1.12rem;"># ${RQ.escapeHtml(item.name)}</h3>
      <div class="category-actions" style="margin-top:16px;"><a class="inline-button" href="./library.html?tag=${encodeURIComponent(item.name)}">按标签浏览</a></div>
    </article>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  initCategories().catch((error) => console.error(error));
});
