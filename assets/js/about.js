const RQ = window.ReadQuiet;

async function initAbout() {
  const books = await RQ.loadBooks();
  const stats = RQ.getStats(books);
  RQ.renderStats(stats, {
    works: '[data-about-stat="works"]',
    words: '[data-about-stat="words"]',
    chapters: '[data-about-stat="chapters"]',
    tags: '[data-about-stat="tags"]',
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAbout().catch((error) => console.error(error));
});
