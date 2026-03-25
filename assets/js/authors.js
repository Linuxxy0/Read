const {
  escapeHtml,
  getAllAuthors,
  getStats,
  loadBooks,
} = window.ReadQuiet;

async function initAuthors() {
  const books = await loadBooks();
  const stats = getStats(books);
  document.querySelector('[data-authors-summary]').textContent = `当前共收录 ${stats.works} 部作品，作者与作品数量均由数据自动统计。`;
  const authors = getAllAuthors(books).map((author) => ({
    ...author,
    books: books.filter((book) => book.author === author.name),
  }));
  const container = document.querySelector('[data-author-grid]');
  container.innerHTML = authors.map((author) => `
    <article class="author-card">
      <div class="tag-list">
        <span class="meta-pill">${author.count} 部作品</span>
      </div>
      <h3 style="margin:14px 0 0; font-size:1.42rem;">${escapeHtml(author.name)}</h3>
      <p class="author-description">${author.books.map((book) => book.title).join('、')}</p>
      <div class="category-actions">
        <a class="inline-button" href="./library.html?author=${encodeURIComponent(author.name)}">查看该作者</a>
      </div>
    </article>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  initAuthors().catch((error) => console.error(error));
});
