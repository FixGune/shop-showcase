'use strict';

/* =========================================
   Глобальное состояние сайта
   ========================================= */

let products = [];
let saleProducts = [];

let currentPage = 1;
let itemsPerPage = 8;

let carouselIndex = 0;
let currentLanguage = 'ru';

let backgroundImages = [];
let currentBackgroundIndex = 0;
let backgroundCarouselInterval = null;


/* =========================================
   Безопасная работа с текстом
   ========================================= */

/*
  Защищает HTML от случайных символов в названии товара.
  Например: <, >, &, ", '.
*/
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


/* =========================================
   Товары: цены и форматирование
   ========================================= */

/*
  Возвращает окончательную цену товара.

  Правила:
  1. Если discount = 0, используем обычную price.
  2. Если discount > 0 и salePrice > 0, используем salePrice поставщика.
  3. Если discount > 0 и salePrice = 0, считаем цену по скидке.
*/
function getProductPrice(product) {
    const price = Number(product.price) || 0;
    const salePrice = Number(product.salePrice) || 0;
    const discount = Number(product.discount) || 0;

    if (discount <= 0) {
        return price;
    }

    if (salePrice > 0) {
        return salePrice;
    }

    return Math.floor(price * (1 - discount / 100));
}


/*
  Возвращает язык для форматирования цены.
  Для Казахстана обычно используется русский формат пробелов между тысячами.
*/
function getPriceLocale() {
    const locales = {
        ru: 'ru-RU',
        kk: 'kk-KZ',
        en: 'en-US'
    };

    return locales[currentLanguage] || 'ru-RU';
}


/*
  Форматирует цену: 12500 превратится в "12 500 ₸".
*/
function formatPrice(value) {
    const safeValue = Number(value) || 0;

    return `${new Intl.NumberFormat(getPriceLocale(), {
        maximumFractionDigits: 0
    }).format(safeValue)} ₸`;
}


/* =========================================
   Теги товара
   ========================================= */

/*
  Возвращает CSS-класс для тега.
  Названия классов соответствуют новому styles.css.
*/
function getTagClass(color) {
    const tagClasses = {
        green: 'product-tag--green',
        new: 'product-tag--new',
        red: 'product-tag--red',
        sale: 'product-tag--sale',
        pink: 'product-tag--pink',
        primary: 'product-tag--primary',
        black: 'product-tag--dark',
        dark: 'product-tag--dark'
    };

    return tagClasses[String(color || '').toLowerCase()] || 'product-tag--dark';
}


/*
  Создаёт HTML максимум для трёх тегов товара.
*/
function renderProductTags(product) {
    const tags = Array.isArray(product.tags)
        ? product.tags.slice(0, 3)
        : [];

    return tags.map((tag) => {
        const text = escapeHtml(tag.text || '');
        const colorClass = getTagClass(tag.color);

        return `
            <span class="product-tag ${colorClass}">
                ${text}
            </span>
        `;
    }).join('');
}


/* =========================================
   Карточка товара
   ========================================= */

/*
  Создаёт одну товарную карточку.

  Эта разметка использует классы из новой дизайн-системы:
  product-card, product-card__image, product-card__price и т. д.
*/
function renderProductCard(product) {
    const productId = escapeHtml(product.id);
    const productName = escapeHtml(product.name);
    const productImage = escapeHtml(product.image);
    const regularPrice = Number(product.price) || 0;
    const discount = Math.max(0, Number(product.discount) || 0);
    const finalPrice = getProductPrice(product);
    const hasDiscount = discount > 0;

    const priceMarkup = hasDiscount
        ? `
            <div class="product-card__price-row">
                <div>
                    <span class="product-card__old-price">
                        ${formatPrice(regularPrice)}
                    </span>

                    <span class="product-card__discount">
                        -${discount}%
                    </span>
                </div>

                <strong class="product-card__price product-card__price--sale">
                    ${formatPrice(finalPrice)}
                </strong>
            </div>
        `
        : `
            <div class="product-card__price-row">
                <strong class="product-card__price">
                    ${formatPrice(finalPrice)}
                </strong>
            </div>
        `;

    return `
        <article class="product-card">
            <div class="product-card__image-wrapper">
                <img
                    class="product-card__image"
                    src="${productImage}"
                    alt="${productName}"
                    loading="lazy"
                >

                <div class="product-card__tags">
                    ${renderProductTags(product)}
                </div>

                <button
                    class="product-card__favorite"
                    type="button"
                    aria-label="Добавить товар ${productName} в избранное"
                    title="Добавить в избранное"
                >
                    ♡
                </button>
            </div>

            <div class="product-card__content">
                <p class="product-card__article">
                    Арт: ${productId}
                </p>

                <h3 class="product-card__name">
                    ${productName}
                </h3>

                ${priceMarkup}

                <button
                    class="product-card__button"
                    type="button"
                >
                    🛒 В корзину
                </button>
            </div>
        </article>
    `;
}


/* =========================================
   Загрузка товаров
   ========================================= */

/*
  Одна общая функция загрузки products.json.
  Благодаря ей файл загружается один раз, а не отдельно
  для каталога, карусели и фоновой карусели.
*/
async function loadProductsData() {
    if (products.length > 0) {
        return products;
    }

    const response = await fetch('data/products.json');

    if (!response.ok) {
        throw new Error(`Не удалось загрузить товары. HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
        throw new Error('Файл products.json должен содержать массив товаров.');
    }

    products = data;

    return products;
}


/* =========================================
   Каталог и пагинация
   ========================================= */

/*
  Показывает товары текущей страницы.
  Функция не выполняет действий, если пользователь находится
  не на catalog.html, потому что products-grid там отсутствует.
*/
function renderProducts() {
    const grid = document.getElementById('products-grid');

    if (!grid) {
        return;
    }

    const totalPages = Math.max(1, Math.ceil(products.length / itemsPerPage));

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageProducts = products.slice(start, end);

    if (pageProducts.length === 0) {
        grid.innerHTML = `
            <p class="catalog-empty-message">
                Товары пока не добавлены.
            </p>
        `;
        return;
    }

    grid.innerHTML = pageProducts
        .map((product) => renderProductCard(product))
        .join('');
}


/*
  Создаёт кнопки пагинации: 1, 2, 3 и так далее.
*/
function renderPagination() {
    const pagination = document.getElementById('pagination');

    if (!pagination) {
        return;
    }

    const totalPages = Math.ceil(products.length / itemsPerPage);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    pagination.innerHTML = '';

    for (let page = 1; page <= totalPages; page += 1) {
        const button = document.createElement('button');

        button.type = 'button';
        button.textContent = page;
        button.className = page === currentPage ? 'is-active' : '';
        button.setAttribute(
            'aria-label',
            `Перейти на страницу ${page}`
        );

        if (page === currentPage) {
            button.setAttribute('aria-current', 'page');
        }

        button.addEventListener('click', () => {
            currentPage = page;

            renderProducts();
            renderPagination();

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        pagination.appendChild(button);
    }
}


/*
  Настраивает кнопки выбора количества товаров:
  8 / 16 / 32.
*/
function setupItemsPerPageButtons() {
    const buttons = document.querySelectorAll('.pagination-btn');

    if (buttons.length === 0) {
        return;
    }

    buttons.forEach((button) => {
        const limit = Number(button.dataset.limit);

        if (limit === itemsPerPage) {
            button.classList.add('is-active');
        }

        button.addEventListener('click', () => {
            const selectedLimit = Number(button.dataset.limit);

            if (!selectedLimit || selectedLimit < 1) {
                return;
            }

            itemsPerPage = selectedLimit;
            currentPage = 1;

            buttons.forEach((item) => {
                item.classList.remove('is-active');
            });

            button.classList.add('is-active');

            renderProducts();
            renderPagination();
        });
    });
}


/*
  Запускает каталог только на странице catalog.html.
*/
async function initializeCatalog() {
    const grid = document.getElementById('products-grid');

    if (!grid) {
        return;
    }

    try {
        await loadProductsData();

        setupItemsPerPageButtons();
        renderProducts();
        renderPagination();
    } catch (error) {
        console.error('Ошибка каталога:', error);

        grid.innerHTML = `
            <p class="catalog-empty-message">
                Не удалось загрузить товары. Попробуйте обновить страницу.
            </p>
        `;
    }
}


/* =========================================
   Карусель акционных товаров на главной
   ========================================= */

/*
  Считает, сколько карточек видно в карусели
  в зависимости от ширины окна.
*/
function getVisibleCarouselCards() {
    if (window.innerWidth <= 640) {
        return 1;
    }

    if (window.innerWidth <= 900) {
        return 2;
    }

    return 4;
}


/*
  Отрисовывает товары со скидкой в главной карусели.
  Акционные товары: discount > 0.
*/
function renderCarousel() {
    const track = document.getElementById('carousel-track');

    if (!track) {
        return;
    }

    if (saleProducts.length === 0) {
        track.innerHTML = `
            <p class="catalog-empty-message">
                Акционные товары пока не добавлены.
            </p>
        `;
        return;
    }

    track.innerHTML = saleProducts
        .map((product) => `
            <div class="carousel-card">
                ${renderProductCard(product)}
            </div>
        `)
        .join('');

    const maxCarouselIndex = Math.max(
        0,
        saleProducts.length - getVisibleCarouselCards()
    );

    if (carouselIndex > maxCarouselIndex) {
        carouselIndex = maxCarouselIndex;
    }

    updateCarousel();
}


/*
  Сдвигает карусель на ширину одной карточки.
*/
function updateCarousel() {
    const track = document.getElementById('carousel-track');
    const firstCard = track?.querySelector('.carousel-card');

    if (!track || !firstCard) {
        return;
    }

    const cardWidth = firstCard.getBoundingClientRect().width;
    const offset = carouselIndex * cardWidth;

    track.style.transform = `translateX(-${offset}px)`;

    updateCarouselControls();
}


/*
  Отключает стрелки, если карусель достигла начала или конца.
*/
function updateCarouselControls() {
    const previousButton = document.getElementById('carousel-prev');
    const nextButton = document.getElementById('carousel-next');

    if (!previousButton || !nextButton) {
        return;
    }

    const visibleCards = getVisibleCarouselCards();
    const maxCarouselIndex = Math.max(
        0,
        saleProducts.length - visibleCards
    );

    previousButton.disabled = carouselIndex <= 0;
    nextButton.disabled = carouselIndex >= maxCarouselIndex;

    previousButton.style.opacity = previousButton.disabled ? '0.45' : '1';
    nextButton.style.opacity = nextButton.disabled ? '0.45' : '1';

    previousButton.style.cursor = previousButton.disabled
        ? 'not-allowed'
        : 'pointer';

    nextButton.style.cursor = nextButton.disabled
        ? 'not-allowed'
        : 'pointer';
}


/*
  Настраивает левую и правую стрелки карусели.
*/
function setupCarouselControls() {
    const previousButton = document.getElementById('carousel-prev');
    const nextButton = document.getElementById('carousel-next');

    if (!previousButton || !nextButton) {
        return;
    }

    previousButton.addEventListener('click', () => {
        if (carouselIndex <= 0) {
            return;
        }

        carouselIndex -= 1;
        updateCarousel();
    });

    nextButton.addEventListener('click', () => {
        const maxCarouselIndex = Math.max(
            0,
            saleProducts.length - getVisibleCarouselCards()
        );

        if (carouselIndex >= maxCarouselIndex) {
            return;
        }

        carouselIndex += 1;
        updateCarousel();
    });
}


/*
  Запускает карусель только на index.html.
*/
async function initializeSaleCarousel() {
    const track = document.getElementById('carousel-track');

    if (!track) {
        return;
    }

    try {
        const allProducts = await loadProductsData();

        saleProducts = allProducts.filter((product) => {
            return Number(product.discount) > 0;
        });

        setupCarouselControls();
        renderCarousel();
    } catch (error) {
        console.error('Ошибка карусели акций:', error);

        track.innerHTML = `
            <p class="catalog-empty-message">
                Не удалось загрузить акционные товары.
            </p>
        `;
    }
}


/* =========================================
   Фоновая карусель вступительного блока
   ========================================= */

/*
  Берёт до пяти фотографий товаров с корректно заполненным image.
*/
function setBackgroundImages(allProducts) {
    backgroundImages = allProducts
        .filter((product) => product.image)
        .slice(0, 5)
        .map((product) => product.image);
}


/*
  Создаёт слои фоновых изображений.
*/
function renderBackgroundCarousel() {
    const carousel = document.getElementById('background-carousel');

    if (!carousel || backgroundImages.length === 0) {
        return;
    }

    carousel.innerHTML = backgroundImages
        .map((imagePath, index) => `
            <div
                class="background-image ${index === 0 ? 'active' : ''}"
                style="background-image: url('${escapeHtml(imagePath)}')"
            ></div>
        `)
        .join('');
}


/*
  Каждые пять секунд показывает следующий фон.
*/
function startBackgroundCarousel() {
    const images = document.querySelectorAll('.background-image');

    if (images.length <= 1) {
        return;
    }

    if (backgroundCarouselInterval) {
        clearInterval(backgroundCarouselInterval);
    }

    backgroundCarouselInterval = setInterval(() => {
        images[currentBackgroundIndex].classList.remove('active');

        currentBackgroundIndex = (
            currentBackgroundIndex + 1
        ) % images.length;

        images[currentBackgroundIndex].classList.add('active');
    }, 5000);
}


/*
  Вставляет фото товаров в блоки «Доставка» и «Премиальное бельё».

  Если в HTML уже указан реальный путь:
  assets/images/delivery.png
  assets/images/premium.png
  то этот код НЕ перезаписывает их.

  Если src пустой, отсутствует или равен "#",
  берёт изображения из products.json.
*/
function setStoreFactImages() {
    const deliveryImage = document.getElementById('delivery-image');
    const premiumImage = document.getElementById('premium-image');

    if (backgroundImages.length === 0) {
        return;
    }

    const shouldSetImage = (imageElement) => {
        if (!imageElement) {
            return false;
        }

        const source = imageElement.getAttribute('src');

        return !source || source === '#' || source.trim() === '';
    };

    if (shouldSetImage(deliveryImage)) {
        deliveryImage.src = backgroundImages[1] || backgroundImages[0];
    }

    if (shouldSetImage(premiumImage)) {
        premiumImage.src = backgroundImages[2] || backgroundImages[0];
    }
}


/*
  Запускает фоновую карусель только на главной странице.
*/
async function initializeBackgroundCarousel() {
    const carousel = document.getElementById('background-carousel');

    if (!carousel) {
        return;
    }

    try {
        const allProducts = await loadProductsData();

        setBackgroundImages(allProducts);
        renderBackgroundCarousel();
        setStoreFactImages();
        startBackgroundCarousel();
    } catch (error) {
        console.error('Ошибка фоновой карусели:', error);
    }
}


/* =========================================
   Мультиязычность
   ========================================= */

/*
  Загружает текущий JSON-файл переводов:
  data/translations/ru.json
  data/translations/kk.json
  data/translations/en.json
*/
async function loadTranslations(language) {
    const response = await fetch(
        `data/translations/${language}.json`
    );

    if (!response.ok) {
        throw new Error(
            `Не удалось загрузить переводы для языка: ${language}`
        );
    }

    const translations = await response.json();

    /*
      Меняет обычный текст элементов:
      <h1 data-i18n="hero.title">...</h1>
    */
    document.querySelectorAll('[data-i18n]').forEach((element) => {
        const key = element.dataset.i18n;

        if (translations[key]) {
            element.textContent = translations[key];
        }
    });

    /*
      Меняет placeholder у полей:
      <input data-i18n-placeholder="contact.name">
    */
    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
        const key = element.dataset.i18nPlaceholder;

        if (translations[key]) {
            element.placeholder = translations[key];
        }
    });

    /*
      Меняет lang у корневого HTML-элемента.
      Это полезно для браузера, SEO и экранных дикторов.
    */
    document.documentElement.lang = language;
}


/*
  Настраивает select выбора языка и сохраняет выбор.
*/
async function initializeLanguageSwitcher() {
    const languageSwitcher = document.getElementById('language-switcher');

    currentLanguage = localStorage.getItem('language') || 'ru';

    if (languageSwitcher) {
        languageSwitcher.value = currentLanguage;
    }

    try {
        await loadTranslations(currentLanguage);
    } catch (error) {
        console.error('Ошибка начальной загрузки переводов:', error);
    }

    if (!languageSwitcher) {
        return;
    }

    languageSwitcher.addEventListener('change', async (event) => {
        const selectedLanguage = event.target.value;

        currentLanguage = selectedLanguage;
        localStorage.setItem('language', currentLanguage);

        try {
            await loadTranslations(currentLanguage);

            /*
              После смены языка обновляем только цены,
              потому что Intl.NumberFormat зависит от языка.
            */
            if (document.getElementById('products-grid')) {
                renderProducts();
                renderPagination();
            }

            if (document.getElementById('carousel-track')) {
                renderCarousel();
            }
        } catch (error) {
            console.error('Ошибка смены языка:', error);
        }
    });
}


/* =========================================
   Форма обратной связи
   ========================================= */

/*
  Отправляет форму в Formspree без перезагрузки страницы.
  После успешной отправки:
  - скрывает форму;
  - показывает thank-you-message.
*/
function setupContactForm() {
    const contactForm = document.getElementById('contact-form');
    const thankYouMessage = document.getElementById('thank-you-message');

    if (!contactForm || !thankYouMessage) {
        return;
    }

    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const actionUrl = contactForm.getAttribute('action');

        /*
          Защита от случая, когда пользователь не заменил ТВОЙ_ID
          на реальный идентификатор Formspree.
        */
        if (!actionUrl || actionUrl.includes('ТВОЙ_ID')) {
            alert(
                'Сначала укажите настоящий адрес формы Formspree в about.html.'
            );
            return;
        }

        const submitButton = contactForm.querySelector(
            'button[type="submit"]'
        );

        const initialButtonText = submitButton
            ? submitButton.textContent
            : '';

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Отправка...';
        }

        try {
            const response = await fetch(actionUrl, {
                method: 'POST',
                body: new FormData(contactForm),
                headers: {
                    Accept: 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Ошибка отправки: ${response.status}`);
            }

            contactForm.reset();
            contactForm.classList.add('hidden');
            thankYouMessage.classList.remove('hidden');
        } catch (error) {
            console.error('Ошибка формы обратной связи:', error);

            alert(
                'Не удалось отправить сообщение. Проверьте интернет и попробуйте ещё раз.'
            );

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = initialButtonText;
            }
        }
    });
}


/* =========================================
   Общие события окна
   ========================================= */

/*
  При изменении размера окна:
  - пересчитываем, сколько карточек видно в карусели;
  - корректируем положение карусели.
*/
function setupWindowEvents() {
    let resizeTimer;

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);

        resizeTimer = setTimeout(() => {
            if (document.getElementById('carousel-track')) {
                const maxCarouselIndex = Math.max(
                    0,
                    saleProducts.length - getVisibleCarouselCards()
                );

                if (carouselIndex > maxCarouselIndex) {
                    carouselIndex = maxCarouselIndex;
                }

                updateCarousel();
            }
        }, 150);
    });
}


/* =========================================
   Запуск сайта
   ========================================= */

/*
  DOMContentLoaded означает:
  HTML-страница уже загружена, поэтому JavaScript
  может безопасно искать элементы по id и class.
*/
document.addEventListener('DOMContentLoaded', async () => {
    await initializeLanguageSwitcher();

    setupContactForm();
    setupWindowEvents();

    /*
      Эти функции сами проверяют, есть ли нужный блок на странице.
      Поэтому один main.js работает на index.html, catalog.html,
      about.html и sizing.html.
    */
    initializeCatalog();
    initializeSaleCarousel();
    initializeBackgroundCarousel();
});