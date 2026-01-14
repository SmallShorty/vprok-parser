## Описание проекта
Реализован в рамках тестового задания для автоматизированного сбора данных: имитация действий пользователя (регион, скриншоты) через Puppeteer

## Запуск проекта

Сначала склонируйте репозиторий и установите все необходимые зависимости:

```bash
git clone https://github.com/SmallShorty/vprok-parser.git
cd vprok-parser
npm install

```

## Как использовать

Скрипт открывает браузер, выбирает регион, делает скриншот и извлекает данные о товаре.

```bash
node src/puppeteer.js "URL_ТОВАРА" "РЕГИОН"

```

*Пример:*

```bash
node src/puppeteer.js https://www.vprok.ru/product/domik-v-derevne-dom-v-der-moloko-ster-3-2-950g--309202 "Санкт-Петербург и область"

```


Скрипт получает данные о категории товаров напрямую через API-запросы.

```bash
node src/api-parser.js "URL_КАТЕГОРИИ"

```

*Пример:*

```bash
node src/api-parser.js https://www.vprok.ru/catalog/7382/pomidory-i-ovoschnye-nabory

```

---
