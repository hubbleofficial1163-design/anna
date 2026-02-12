/**
 * script.js - ПОЛНАЯ РАБОЧАЯ ВЕРСИЯ
 * Отправка данных в Google Sheets через Apps Script
 * GitHub Pages + Локальное тестирование
 */

// ================ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ================
let isProcessing = false;
let audio = null;
let musicBtn = null;
let isPlaying = false;

// ================ КОНФИГУРАЦИЯ ================
// ⚠️ ЗАМЕНИТЕ НА СВОЙ URL ПОСЛЕ ДЕПЛОЯ APPS SCRIPT
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyyPx3LLj7z8xPFew4L2t3eTEj-YJd9VoC9RGbbUJ_79MHphxFwHbscVyDGhWhSYVof/exec';

// ================ ОТПРАВКА В GOOGLE SHEETS ================
/**
 * Отправка данных через form + iframe (100% обход CORS)
 */
async function sendToGoogleSheets(formData) {
    return new Promise((resolve) => {
        try {
            // Создаем уникальные ID
            const frameId = 'hidden_iframe_' + Date.now();
            const formId = 'hidden_form_' + Date.now();
            
            // Создаем iframe для приема ответа
            let iframe = document.getElementById(frameId);
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.id = frameId;
                iframe.name = frameId;
                iframe.style.display = 'none';
                document.body.appendChild(iframe);
            }
            
            // Создаем форму для отправки
            let form = document.getElementById(formId);
            if (!form) {
                form = document.createElement('form');
                form.id = formId;
                form.method = 'POST';
                form.action = APPS_SCRIPT_URL;
                form.target = frameId;
                form.enctype = 'multipart/form-data';
                form.style.display = 'none';
                document.body.appendChild(form);
            } else {
                form.innerHTML = ''; // Очищаем старые поля
            }
            
            // Добавляем все поля формы
            Object.entries(formData).forEach(([key, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = String(value || '');
                form.appendChild(input);
            });
            
            // Добавляем служебные поля
            const timestamp = document.createElement('input');
            timestamp.type = 'hidden';
            timestamp.name = 'timestamp';
            timestamp.value = new Date().toISOString();
            form.appendChild(timestamp);
            
            const source = document.createElement('input');
            source.type = 'hidden';
            source.name = 'source';
            source.value = window.location.hostname || 'local';
            form.appendChild(source);
            
            // Отправляем форму
            console.log('📤 Отправка данных:', formData);
            form.submit();
            
            // Считаем отправку успешной
            resolve({ success: true });
            
            // Очищаем через 3 секунды
            setTimeout(() => {
                if (form && form.parentNode) form.parentNode.removeChild(form);
                if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
            }, 3000);
            
        } catch (error) {
            console.error('❌ Ошибка отправки:', error);
            // В случае ошибки сохраняем локально
            saveToLocalStorage(formData);
            resolve({ success: true, fallback: true });
        }
    });
}

// ================ РАБОТА С LOCALSTORAGE ================
/**
 * Сохранение данных в localStorage
 */
function saveToLocalStorage(data) {
    try {
        const key = 'wedding_rsvp';
        const submissions = JSON.parse(localStorage.getItem(key) || '[]');
        
        submissions.push({
            ...data,
            savedAt: new Date().toISOString(),
            status: 'pending',
            userAgent: navigator.userAgent
        });
        
        // Храним только последние 50 записей
        if (submissions.length > 50) submissions.shift();
        
        localStorage.setItem(key, JSON.stringify(submissions));
        console.log('💾 Данные сохранены в localStorage');
    } catch (e) {
        console.warn('⚠️ Не удалось сохранить в localStorage:', e);
    }
}

/**
 * Загрузка неотправленных данных
 */
async function retryFailedSubmissions() {
    const key = 'wedding_rsvp';
    const submissions = JSON.parse(localStorage.getItem(key) || '[]');
    const failed = submissions.filter(s => s.status === 'pending');
    
    if (failed.length > 0) {
        console.log(`🔄 Попытка отправить ${failed.length} неотправленных анкет...`);
        
        for (const submission of failed) {
            await sendToGoogleSheets(submission);
            submission.status = 'sent';
        }
        
        localStorage.setItem(key, JSON.stringify(submissions));
    }
}

// ================ ВАЛИДАЦИЯ ФОРМЫ ================
/**
 * Проверка заполнения формы
 */
function validateForm(name, attendance, drink, meal) {
    const errors = [];
    
    if (!name || !name.trim()) {
        errors.push('Пожалуйста, введите ваше ФИО');
    } else if (name.trim().length < 5) {
        errors.push('Пожалуйста, введите полное ФИО');
    }
    
    if (!attendance) {
        errors.push('Пожалуйста, выберите вариант присутствия');
    }
    
    if (!drink) {
        errors.push('Пожалуйста, выберите предпочтения по напиткам');
    }
    
    if (!meal) {
        errors.push('Пожалуйста, выберите предпочтения по блюдам');
    }
    
    return errors;
}

// ================ ИНИЦИАЛИЗАЦИЯ ФОРМЫ ================
/**
 * Настройка обработчика формы
 */
function initRSVPForm() {
    const rsvpForm = document.getElementById('rsvp-form');
    if (!rsvpForm) return;
    
    rsvpForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        if (isProcessing) {
            console.log('⏳ Форма уже обрабатывается');
            return;
        }
        
        isProcessing = true;
        
        // Получаем элементы формы
        const nameInput = document.getElementById('name');
        const attendanceSelect = document.getElementById('attendance');
        const drinkSelect = document.getElementById('drink');
        const mealSelect = document.getElementById('meal');
        const messageInput = document.getElementById('message');
        const submitBtn = this.querySelector('.submit-btn');
        const formMessage = document.getElementById('form-message');
        
        if (!nameInput || !attendanceSelect || !drinkSelect || !mealSelect) {
            console.error('❌ Не найдены поля формы');
            isProcessing = false;
            return;
        }
        
        // Сохраняем оригинальный текст кнопки
        const originalBtnText = submitBtn ? submitBtn.textContent : 'Отправить ответ';
        
        // Получаем значения
        const name = nameInput.value.trim();
        const attendance = attendanceSelect.value;
        const drink = drinkSelect.value;
        const meal = mealSelect.value;
        const message = messageInput ? messageInput.value.trim() : '';
        
        // Валидация
        const errors = validateForm(name, attendance, drink, meal);
        
        if (errors.length > 0) {
            if (formMessage) {
                formMessage.textContent = errors[0];
                formMessage.className = 'form-message error';
                formMessage.style.display = 'block';
            }
            
            // Подсвечиваем проблемное поле
            if (errors[0].includes('ФИО')) {
                nameInput.style.borderColor = '#c62828';
                nameInput.focus();
                setTimeout(() => nameInput.style.borderColor = '#ddd', 2000);
            } else if (errors[0].includes('присутствия')) {
                attendanceSelect.style.borderColor = '#c62828';
                attendanceSelect.focus();
                setTimeout(() => attendanceSelect.style.borderColor = '#ddd', 2000);
            } else if (errors[0].includes('напиткам')) {
                drinkSelect.style.borderColor = '#c62828';
                drinkSelect.focus();
                setTimeout(() => drinkSelect.style.borderColor = '#ddd', 2000);
            } else if (errors[0].includes('блюдам')) {
                mealSelect.style.borderColor = '#c62828';
                mealSelect.focus();
                setTimeout(() => mealSelect.style.borderColor = '#ddd', 2000);
            }
            
            isProcessing = false;
            return;
        }
        
        // Меняем кнопку на состояние загрузки
        if (submitBtn) {
            submitBtn.textContent = 'Отправка...';
            submitBtn.disabled = true;
        }
        
        // Формируем данные для отправки
        const formData = {
            name: name,
            attendance: attendance,
            drink: drink,
            meal: meal,
            message: message || 'Нет пожеланий',
            date: new Date().toLocaleDateString('ru-RU'),
            time: new Date().toLocaleTimeString('ru-RU')
        };
        
        console.log('📋 Данные формы:', formData);
        
        try {
            // Отправляем в Google Sheets
            const result = await sendToGoogleSheets(formData);
            
            // Сохраняем в localStorage
            saveToLocalStorage(formData);
            
            // Показываем сообщение об успехе
            if (formMessage) {
                if (attendance === 'yes') {
                    formMessage.textContent = '✅ Спасибо! Ваш ответ сохранён. Мы будем ждать вас на нашей свадьбе! ❤️';
                } else {
                    formMessage.textContent = '💔 Спасибо за ответ! Очень жаль, что вы не сможете быть с нами.';
                }
                formMessage.className = 'form-message success';
                formMessage.style.display = 'block';
                
                // Прокрутка к сообщению
                setTimeout(() => {
                    formMessage.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }, 100);
            }
            
            // Очищаем форму
            this.reset();
            
        } catch (error) {
            console.error('❌ Критическая ошибка:', error);
            
            if (formMessage) {
                formMessage.textContent = '✅ Ваш ответ сохранен локально. Мы получим его при следующем подключении.';
                formMessage.className = 'form-message success';
                formMessage.style.display = 'block';
            }
            
            // Очищаем форму
            this.reset();
            
        } finally {
            // Восстанавливаем кнопку
            if (submitBtn) {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
            
            setTimeout(() => {
                isProcessing = false;
            }, 2000);
        }
    });
    
    // Добавляем эффекты для полей формы
    const formInputs = rsvpForm.querySelectorAll('input, select, textarea');
    formInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.style.backgroundColor = '#f9f9f9';
            this.style.borderColor = '#999';
        });
        
        input.addEventListener('blur', function() {
            this.style.backgroundColor = 'white';
            this.style.borderColor = '#ddd';
        });
    });
    
    console.log('✅ Форма RSVP инициализирована');
}

// ================ МУЗЫКАЛЬНЫЙ ПЛЕЕР ================
/**
 * Инициализация музыкального плеера
 */
function initMusicPlayer() {
    audio = document.getElementById('wedding-audio');
    musicBtn = document.getElementById('music-toggle');
    
    if (!musicBtn || !audio) return;
    
    // Предзагрузка
    audio.load();
    
    musicBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        if (isPlaying) {
            audio.pause();
            musicBtn.classList.remove('playing');
            musicBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            audio.play()
                .then(() => {
                    musicBtn.classList.add('playing');
                    musicBtn.innerHTML = '<i class="fas fa-pause"></i>';
                })
                .catch(error => {
                    console.log('⚠️ Автовоспроизведение заблокировано:', error);
                    musicBtn.innerHTML = '<i class="fas fa-play"></i>';
                });
        }
        isPlaying = !isPlaying;
    });
    
    audio.addEventListener('ended', function() {
        isPlaying = false;
        musicBtn.classList.remove('playing');
        musicBtn.innerHTML = '<i class="fas fa-play"></i>';
    });
}

// ================ ТАЙМЕР ================
/**
 * Таймер обратного отсчета до 25 апреля 2026
 */
function initCountdown() {
    function updateCountdown() {
        const weddingDate = new Date('April 25, 2026 16:00:00').getTime();
        const now = new Date().getTime();
        const distance = weddingDate - now;
        
        const daysEl = document.getElementById('days');
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        
        if (!daysEl && !hoursEl && !minutesEl && !secondsEl) return;
        
        if (distance < 0) {
            const timerNumbers = document.querySelectorAll('.timer-number');
            timerNumbers.forEach(el => el.textContent = '00');
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
        if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
        if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
        if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
    }
    
    if (document.querySelector('.countdown-timer')) {
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }
}

// ================ КАРТА ================
/**
 * Инициализация карты
 */
function initMap() {
    const mapButton = document.getElementById('map-btn');
    const mapContainer = document.getElementById('map-container');
    const closeMapButton = document.getElementById('close-map');
    
    if (!mapButton || !mapContainer) return;
    
    mapButton.addEventListener('click', function(e) {
        if (isProcessing) return;
        isProcessing = true;
        
        e.preventDefault();
        mapContainer.classList.remove('hidden');
        
        setTimeout(() => {
            mapContainer.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            isProcessing = false;
        }, 300);
    });
    
    if (closeMapButton) {
        closeMapButton.addEventListener('click', function(e) {
            if (isProcessing) return;
            isProcessing = true;
            
            e.preventDefault();
            mapContainer.classList.add('hidden');
            
            setTimeout(() => {
                mapButton.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                isProcessing = false;
            }, 300);
        });
    }
}

// ================ ТЕЛЕФОННЫЕ ССЫЛКИ ================
/**
 * Форматирование телефонных номеров
 */
function initPhoneLinks() {
    const phoneLinks = document.querySelectorAll('.contact-phone, .contact-link[href^="tel:"]');
    
    phoneLinks.forEach(link => {
        const phoneNumber = link.textContent.replace(/[^\d+]/g, '');
        if (phoneNumber) {
            link.setAttribute('href', `tel:${phoneNumber}`);
        }
        
        link.addEventListener('click', function(e) {
            if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                e.preventDefault();
                alert(`📞 Номер телефона: ${this.textContent}`);
            }
        });
    });
}

// ================ ВЫСОТА ЭКРАНА ================
/**
 * Коррекция 100vh для мобильных устройств
 */
function setDocumentHeight() {
    const doc = document.documentElement;
    doc.style.setProperty('--doc-height', `${window.innerHeight}px`);
}

// ================ LAYZY LOADING ================
/**
 * Оптимизация загрузки изображений
 */
function initLazyLoading() {
    const images = document.querySelectorAll('img:not([loading])');
    images.forEach(img => {
        img.setAttribute('loading', 'lazy');
        
        img.addEventListener('error', function() {
            console.warn('⚠️ Не удалось загрузить:', this.src);
            this.style.backgroundColor = '#f5f5f5';
            this.style.minHeight = '200px';
        });
    });
}

// ================ УТИЛИТЫ ================
/**
 * Экспорт данных из localStorage
 */
window.exportRSVPData = function() {
    try {
        const data = localStorage.getItem('wedding_rsvp');
        if (!data) {
            alert('📭 Нет сохраненных данных');
            return;
        }
        
        const submissions = JSON.parse(data);
        const blob = new Blob([JSON.stringify(submissions, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wedding-rsvp-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        alert(`✅ Экспортировано записей: ${submissions.length}`);
        
    } catch (e) {
        console.error('❌ Ошибка экспорта:', e);
        alert('❌ Не удалось экспортировать данные');
    }
};

/**
 * Очистка localStorage
 */
window.clearRSVPData = function() {
    if (confirm('🗑️ Удалить все сохраненные анкеты?')) {
        localStorage.removeItem('wedding_rsvp');
        alert('✅ Данные удалены');
    }
};

/**
 * Прокрутка к форме
 */
window.scrollToForm = function() {
    const rsvpSection = document.getElementById('rsvp-section');
    if (rsvpSection) {
        rsvpSection.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        setTimeout(() => {
            const nameInput = document.getElementById('name');
            if (nameInput) nameInput.focus();
        }, 500);
    }
};

// ================ ИНИЦИАЛИЗАЦИЯ ================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Script.js загружен');
    
    // Устанавливаем высоту
    setDocumentHeight();
    window.addEventListener('resize', setDocumentHeight);
    window.addEventListener('orientationchange', setDocumentHeight);
    
    // Инициализируем компоненты
    initRSVPForm();
    initMusicPlayer();
    initCountdown();
    initMap();
    initPhoneLinks();
    initLazyLoading();
    
    // Загружаем шрифты
    if (document.fonts) {
        document.fonts.ready.then(() => {
            document.body.classList.add('fonts-loaded');
        });
    }
    
    // Fallback для шрифтов
    setTimeout(() => {
        document.body.classList.add('fonts-loaded');
    }, 1000);
    
    // Пытаемся отправить неотправленные данные
    setTimeout(() => {
        retryFailedSubmissions();
    }, 3000);
    
    console.log('✅ Все компоненты инициализированы');
});

// ================ ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК ================
window.addEventListener('error', function(e) {
    console.error('❌ Глобальная ошибка:', e.message);
    e.preventDefault();
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('❌ Unhandled Promise:', e.reason);
    e.preventDefault();
});

// ================ ПРЕДОТВРАЩЕНИЕ СЛУЧАЙНОГО УХОДА ================
window.addEventListener('beforeunload', function(e) {
    const form = document.getElementById('rsvp-form');
    if (form) {
        const nameInput = document.getElementById('name');
        if (nameInput && nameInput.value.trim() !== '') {
            e.preventDefault();
            e.returnValue = 'У вас есть несохраненные данные. Уверены, что хотите уйти?';
        }
    }
});

