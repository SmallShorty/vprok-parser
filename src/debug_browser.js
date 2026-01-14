const puppeteer = require('puppeteer');

async function explore() {
  const url = process.argv[2] || 'https://www.vprok.ru/';

  console.log('🚀 Запуск браузера в режиме исследования...');

  const browser = await puppeteer.launch({
    headless: false, // Обязательно видимый режим
    defaultViewport: null, // Позволяет менять размер окна вручную
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled', // Скрывает флаг робота
    ],
  });

  const page = await browser.newPage();

  // Маскировка под обычного пользователя
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  console.log(`📡 Переход на: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log('✅ Страница загружена. Теперь ты можешь исследовать элементы!');
    console.log(
      '💡 Совет: Нажми F12 в открывшемся браузере, чтобы открыть инструменты разработчика.'
    );
    console.log('🛑 Чтобы закрыть браузер и выйти, нажми Ctrl+C в этом терминале.');

    // Этот кусок кода не дает скрипту завершиться и закрыть браузер
    await new Promise(() => {});
  } catch (err) {
    console.error('❌ Ошибка при загрузке:', err.message);
  }
}

explore();
