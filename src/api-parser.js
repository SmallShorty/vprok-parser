const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function parseVprok(url) {
  if (!url) {
    console.error('[ERROR] No URL provided. Usage: node script.js <URL>');
    return;
  }

  console.log('[INFO] Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  const [page] = await browser.pages();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
    else req.continue();
  });

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  try {
    console.log(`[INFO] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log('[INFO] Waiting for page elements to render...');
    await page.waitForSelector('main, footer', { visible: true, timeout: 45000 });

    console.log('[INFO] Extracting __NEXT_DATA__ script...');
    const data = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      return el ? JSON.parse(el.innerText) : null;
    });

    if (!data) {
      throw new Error('Failed to find __NEXT_DATA__ tag in HTML');
    }

    const pageProps = data.props?.pageProps;
    const products = pageProps?.initialStore?.catalogPage?.products || [];

    console.log(`[INFO] Extraction finished. Products found: ${products.length}`);

    if (products.length === 0) {
      throw new Error('No products found in the data structure');
    }

    const resultsDir = path.join(__dirname, '..', 'results');
    if (!fs.existsSync(resultsDir)) {
      console.log('[INFO] Creating "results" directory...');
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    const filePath = path.join(resultsDir, 'products-api.txt');
    const result = products
      .map((p) => {
        const hasDiscount = p.oldPrice > 0 && p.oldPrice > p.price;
        return [
          `Название товара: ${p.name || 'Без названия'}`,
          `Ссылка на страницу товара: https://www.vprok.ru${p.url}`,
          `Рейтинг: ${p.rating || 0}`,
          `Количество отзывов: ${p.reviews || 0}`,
          `Цена: ${p.price} руб.`,
          `Акционная цена: ${hasDiscount ? p.price + ' руб.' : 'нет'}`,
          `Цена до акции: ${hasDiscount ? p.oldPrice + ' руб.' : 'нет'}`,
          `Размер скидки: ${hasDiscount ? p.discountPercent + '%' : 'нет'}`,
          `---------------------------`,
        ].join('\n');
      })
      .join('\n');

    fs.writeFileSync(filePath, result, 'utf-8');
    console.log(`[SUCCESS] Data successfully written to: ${filePath}`);
  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
  } finally {
    await browser.close();
    console.log('[INFO] Browser closed.');
  }
}

parseVprok(process.argv[2]);
