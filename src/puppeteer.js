const puppeteer = require('puppeteer');
const { parseNumber } = require('#utils/formatter');
const { autoScroll } = require('#utils/browser');
const fs = require('fs');
const path = require('path');

async function run() {
  const [url, regionName] = process.argv.slice(2);

  if (!url || !regionName) {
    console.log('[USAGE] node src/puppeteer.js "URL" "Region Name"');
    return;
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  await page.exposeFunction('parseNumber', parseNumber);
  await page.exposeFunction('autoScroll', autoScroll);

  await page.setViewport({ width: 1440, height: 900 });

  try {
    console.log(`[INFO] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Проверка на завершение подключения
    console.log('[INFO] Waiting for page layout...');
    await page.waitForSelector('main, footer, [class*="Region_region"]', {
      visible: true,
      timeout: 30000,
    });

    // Проверка на пустую страницу
    const emptyPageSelector = '.UiLayoutPageEmpty_root__KYPID';
    const isEmpty = await page.evaluate((sel) => !!document.querySelector(sel), emptyPageSelector);

    if (isEmpty) {
      console.log('[WARNING] Page is empty (404 or No Products). Saving empty results.');
      return;
    }

    // Закрытие всплывающих окон и соглашений
    console.log('[INFO] Cleaning up UI (Popups & Cookies)...');
    await page.keyboard.press('Escape'); // Закрывает модалку на весь экран

    // Селекторы для тултипов и куки
    const tooltipSelector = '[class*="Tooltip_root"]';
    const closeBtnSelector = 'button[class*="Tooltip_closeIcon"]';
    const cookieAgreeBtnSelector = '.CookiesAlert_agreeButton__cJOTA button';
    const cookiePanelSelector = '.CookiesAlert_policy__1ClsP';

    try {
      await page.waitForSelector(`${tooltipSelector}, ${cookiePanelSelector}`, { timeout: 2000 });
    } catch (e) {}

    await page.evaluate(
      (btnSel, rootSel, cookieBtnSel, cookiePanelSel) => {
        const cookieBtn = document.querySelector(cookieBtnSel);
        const cookiePanel = document.querySelector(cookiePanelSel);

        if (cookieBtn) {
          cookieBtn.click();
        }

        // 2. Обработка тултипов
        const btn = document.querySelector(btnSel);
        const root = document.querySelector(rootSel);

        if (btn) {
          btn.click();
        }

        setTimeout(() => {
          if (cookiePanel) cookiePanel.remove();
          if (root) root.remove();
        }, 200);
      },
      closeBtnSelector,
      tooltipSelector,
      cookieAgreeBtnSelector,
      cookiePanelSelector
    );

    // Даем небольшую паузу на завершение анимаций скрытия
    await new Promise((r) => setTimeout(r, 500));
    console.log('[INFO] UI Cleaned.');

    console.log(`[INFO] Changing region to: ${regionName}`);
    const regionBtnSelector = '[class*="Region_region"]';

    await page.waitForSelector(regionBtnSelector);
    await page.click(regionBtnSelector);

    const listSelector = 'ul[class*="UiRegionListBase_list"]';
    await page.waitForSelector(listSelector, { visible: true });

    const isClicked = await page.evaluate((name) => {
      const buttons = Array.from(
        document.querySelectorAll('ul[class*="UiRegionListBase_list"] button')
      );
      const target = buttons.find(
        (btn) => btn.innerText.trim().toLowerCase() === name.toLowerCase()
      );
      if (target) {
        target.click();
        return true;
      }
      return false;
    }, regionName);

    if (!isClicked) throw new Error(`Region "${regionName}" not found.`);

    console.log('[INFO] Waiting for UI update...');
    await Promise.all([
      page.waitForSelector(listSelector, { hidden: true }),
      page.waitForFunction(
        (sel, name) => {
          const el = document.querySelector(sel);
          return el && el.innerText.toLowerCase().includes(name.toLowerCase());
        },
        { timeout: 10000 },
        regionBtnSelector,
        regionName
      ),
    ]);

    // Пауза для пересчета цен после смены DOM
    await new Promise((r) => setTimeout(r, 500));
    console.log(`[SUCCESS] Region updated to ${regionName}`);

    // Собираем информацию о товаре
    console.log('[INFO] Extracting product data...');

    const productData = await page.evaluate(async () => {
      // Имя товара для создания соответствующей папки
      const title = document.querySelector('h1')?.innerText.trim() || 'product';

      // Проверяем наличие товара
      const outOfStock = !!document.querySelector('[class*="OutOfStockInformer_informer"]');

      // Теги цены
      const priceRaw = document.querySelector(
        '[class*="Price_role_discount"], [class*="Price_size_XL"]'
      )?.innerText;
      const oldPriceRaw = document.querySelector('[class*="Price_role_old"]')?.innerText;
      // Теги рейтинга и отзывов
      const ratingRaw = document.querySelector('[class*="ActionsRow_stars"]')?.innerText;
      const reviewsRaw = document.querySelector('[class*="ActionsRow_reviews__"]')?.innerText;

      let price, priceOld;

      if (outOfStock) {
        // Можно написать другие значения в случае отсутствие товара
        price = null;
        priceOld = null;
      } else {
        price = await window.parseNumber(priceRaw);
        priceOld = (await window.parseNumber(oldPriceRaw)) ?? 0; // Можно не добавлять старую цену в принципе, но сохраним ее для целостности данных
      }

      // Если нет рейтинга или отзывов, ставим null
      const rating = (await window.parseNumber(ratingRaw)) ?? null;
      const reviewCount = (await window.parseNumber(reviewsRaw, true)) ?? null;

      return { title, price, priceOld, rating, reviewCount };
    });

    // Сохраняем результаты
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const safeTitle = productData.title
      .toLowerCase()
      .replace(/[^a-zа-я0-9]/gi, '_')
      .slice(0, 25);
    const folderName = `${timestamp}_${safeTitle}`;
    const resultDir = path.join(__dirname, '..', 'results', folderName);

    if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir, { recursive: true });

    // Скриншот страницы
    await autoScroll(page);
    await page.screenshot({ path: path.join(resultDir, 'screenshot.jpg'), fullPage: true });

    // Содержимое txt файла
    const txtContent = [
      `price=${productData.price}`,
      `priceOld=${productData.priceOld}`,
      `rating=${productData.rating}`,
      `reviewCount=${productData.reviewCount}`,
    ].join('\n');

    fs.writeFileSync(path.join(resultDir, 'product.txt'), txtContent, 'utf8');
    console.log(`[SUCCESS] Data saved to results/${folderName}`);
  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
  } finally {
    // await browser.close();
    console.log('[INFO] Browser closed.');
  }
}

run();
