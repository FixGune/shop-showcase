// === Глобальные переменные ===
let products = [];
let currentPage = 1;
let itemsPerPage = 8;
let currentLang = 'ru';
let saleProducts = [];
let carouselIndex = 0;

// === Загрузка товаров для карусели (только акционные) ===
async function loadCarouselProducts() {
    try {
        const response = await fetch('data/products.json');
        const allProducts = await response.json();
        
        // Фильтруем только товары со скидкой
        saleProducts = allProducts.filter(product => product.sale === true);
        
        renderCarousel();
    } catch (error) {
        console.error('Ошибка загрузки товаров для карусели:', error);
    }
}

// === Отрисовка карусели ===
function renderCarousel() {
    const track = document.getElementById('carousel-track');
    if (!track || saleProducts.length === 0) return;

    track.innerHTML = saleProducts.map(product => `
        <div class="carousel-card">
            <img src="${product.image}" alt="${product.name}">
            <div class="product-info">
                <h3 class="font-bold text-lg">${product.name}</h3>
                <p class="text-pink-500 font-bold">${product.price} ₸</p>
                <span class="bg-red-500 text-white text-xs px-2 py-1 rounded">Акция</span>
            </div>
        </div>
    `).join('');

    updateCarousel();
}

// === Обновление позиции карусели ===
function updateCarousel() {
    const track = document.getElementById('carousel-track');
    if (!track) return;

    const cardWidth = track.querySelector('.carousel-card').offsetWidth;
    const offset = -carouselIndex * cardWidth;
    track.style.transform = `translateX(${offset}px)`;
}

// === Обработчики кнопок ===
document.getElementById('carousel-prev')?.addEventListener('click', () => {
    if (carouselIndex > 0) {
        carouselIndex--;
        updateCarousel();
    }
});

document.getElementById('carousel-next')?.addEventListener('click', () => {
    const track = document.getElementById('carousel-track');
    if (!track) return;

    const cards = track.querySelectorAll('.carousel-card').length;
    const visibleCards = 4; // Показываем 4 карточки

    if (carouselIndex < cards - visibleCards) {
        carouselIndex++;
        updateCarousel();
    }
});

// === Запуск карусели ===
loadCarouselProducts();

// === Загрузка переводов ===
async function loadTranslations(lang) {
    try {
        const response = await fetch(`data/translations/${lang}.json`);
        const translations = await response.json();
        
        // Подстановка текста по data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (translations[key]) {
                el.textContent = translations[key];
            }
        });
    } catch (error) {
        console.error('Ошибка загрузки переводов:', error);
    }
}

// === Переключатель языка ===
document.getElementById('language-switcher')?.addEventListener('change', (e) => {
    currentLang = e.target.value;
    loadTranslations(currentLang);
    // Опционально: сохранить в localStorage
    localStorage.setItem('lang', currentLang);
});

// === При загрузке страницы ===
const savedLang = localStorage.getItem('lang') || 'ru';
currentLang = savedLang;
document.getElementById('language-switcher').value = savedLang;
loadTranslations(savedLang);


// === Загрузка товаров из JSON ===
async function loadProducts() {
    try {
        const response = await fetch('data/products.json');
        products = await response.json();
        renderProducts();
        renderPagination();
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
    }
}


// === Загрузка переводов (обновлённая версия) ===
async function loadTranslations(lang) {
    try {
        const response = await fetch(`data/translations/${lang}.json`);
        const translations = await response.json();
        
        // Подстановка текста по data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (translations[key]) {
                el.textContent = translations[key];
            }
        });
        
        // Подстановка placeholder'ов по data-i18n-placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            if (translations[key]) {
                el.placeholder = translations[key];
            }
        });
    } catch (error) {
        console.error('Ошибка загрузки переводов:', error);
    }
}


// === Обработка формы обратной связи ===
const contactForm = document.getElementById('contact-form');
const thankYouMessage = document.getElementById('thank-you-message');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Останавливаем стандартную отправку
        
        const formData = new FormData(contactForm);
        
        try {
            const response = await fetch(contactForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                // Скрываем форму, показываем сообщение
                contactForm.classList.add('hidden');
                thankYouMessage.classList.remove('hidden');
            } else {
                alert('Ошибка отправки. Попробуйте позже.');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка отправки. Попробуйте позже.');
        }
    });
}


// === Отрисовка товаров ===
function renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageProducts = products.slice(start, end);

    grid.innerHTML = pageProducts.map(product => `
        <div class="bg-white rounded shadow hover:shadow-lg transition">
            <img src="${product.image}" alt="${product.name}" class="w-full h-64 object-cover rounded-t">
            <div class="p-4">
                <h3 class="font-bold text-lg">${product.name}</h3>
                <p class="text-pink-500 font-bold">${product.price} ₸</p>
                ${product.sale ? '<span class="bg-red-500 text-white text-xs px-2 py-1 rounded">Акция</span>' : ''}
            </div>
        </div>
    `).join('');
}

// === Отрисовка пагинации ===
function renderPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    const totalPages = Math.ceil(products.length / itemsPerPage);
    pagination.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = `px-4 py-2 border rounded ${i === currentPage ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`;
        btn.onclick = () => {
            currentPage = i;
            renderProducts();
            renderPagination();
        };
        pagination.appendChild(btn);
    }
}

// === Переключатель количества товаров ===
document.querySelectorAll('.pagination-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        itemsPerPage = parseInt(btn.dataset.limit);
        currentPage = 1; // Сброс на первую страницу
        renderProducts();
        renderPagination();
    });
});

// === Запуск ===
loadProducts();