const autoScroll = async (page) => {
  try {
    await page.evaluate(async () => {
      // Убираем шапку
      const selectors = ['header', '[class*="Header_root"]', '[class*="Sticky"]'];
      selectors.forEach((selector) => {
        const el = document.querySelector(selector);
        if (el) el.style.position = 'absolute';
      });

      await new Promise((resolve) => {
        let totalHeight = 0;
        let distance = 150;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight || totalHeight > 10000) {
            clearInterval(timer);
            resolve();
          }
        }, 150);
      });
    });
  } catch (err) {
    console.warn('[WARN] Scroll process was interrupted, proceeding to screenshot.');
  }
};

module.exports = { autoScroll };
