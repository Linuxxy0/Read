const { getStats, loadBooks, renderStats } = window.ReadQuiet;

async function initAbout() {
  const books = await loadBooks();
  const stats = getStats(books);
  renderStats(stats, {
    works: '[data-about-stat="works"]',
    words: '[data-about-stat="words"]',
    chapters: '[data-about-stat="chapters"]',
    tags: '[data-about-stat="tags"]',
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAbout().catch((error) => console.error(error));
});
