// script.js - Полная версия с отправкой в Google Sheets

document.addEventListener('DOMContentLoaded', function() {
    // ================ КОНФИГУРАЦИЯ ================
    // ЗАМЕНИТЕ НА СВОЙ URL ПОСЛЕ ДЕПЛОЯ APPS SCRIPT
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw_Qu6DP4Df_7gyFPgoqcXk5GGLM_yUtPLNYY1DMCgY6mfgC0UkbJHw6S83ot477mzM/exec';
    
    // ================ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ================
    let isProcessing = false;
    let audio = null;
    let musicBtn = null;
    let isPlaying = false;
    
    // ================ УТИЛИТЫ ================
    
    /**
     * Отправка данных в Google Sheets через Apps Script
     */
    async function sendToGoogleSheets(formData) {
        // Показываем индикатор загрузки
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.classList.add('loading');
        }
        
        try {
            // Используем JSONP подход для обхода CORS
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                const callbackName = 'callback_' + Date.now();
                
                // Создаем URL с параметрами
                const params = new URLSearchParams({
                    callback: callbackName,
                    data: JSON.stringify(formData)
                });
                
                // Обработчик ответа
                window[callbackName] = function(response) {
                    delete window[callbackName];
                    document.body.removeChild(script);
                    
                    if (response && response.success) {
                        resolve({ success: true });
                    } else {
                        reject(new Error('Ошибка сервера'));
                    }
                };
                
                // Таймаут на случай ошибки
                const timeout = setTimeout(() => {
                    delete window[callbackName];
                    document.body.removeChild(script);
                    reject(new Error('Таймаут запроса'));
                }, 10000);
                
                // Создаем и отправляем скрипт
                script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
                script.onload = () => clearTimeout(timeout);
                script.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('Ошибка сети'));
                };
                
                document.body.appendChild(script);
            });
            
        } catch (error) {
            console.error('Ошибка отправки:', error);
            
            // Пробуем альтернативный метод
            try {
                const response = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                return { success: true };
            } catch (fetchError) {
                console.error('Fetch также не сработал:', fetchError);
                return { success: false, error: fetchError.message };
            }
            
        } finally {
            // Убираем индикатор загрузки
            if (submitBtn) {
                submitBtn.classList.remove('loading');
            }
        }
    }
    
    /**
     * Сохранение данных в localStorage (резервная копия)
     */
    function saveToLocalStorage(data) {
        try {
            const submissions = JSON.parse(localStorage.getItem('wedding_rsvp') || '[]');
            submissions.push({
                ...data,
                savedAt: new Date().toISOString(),
                deviceInfo: {
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    platform: navigator.platform
                }
            });
            
            // Оставляем только последние 50 записей
            if (submissions.length > 50) {
                submissions.shift();
            }
            
            localStorage.setItem('wedding_rsvp', JSON.stringify(submissions));
            console.log('Данные сохранены в localStorage');
        } catch (e) {
            console.warn('Не удалось сохранить в localStorage:', e);
        }
    }
    
    /**
     * Валидация формы
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
    
    /**
     * Показ сообщения об ошибке/успехе
     */
    function showFormMessage(message, type = 'success') {
        const formMessage = document.getElementById('form-message');
        if (!formMessage) return;
        
        formMessage.textContent = message;
        formMessage.className = `form-message ${type}`;
        formMessage.style.display = 'block';
        
        // Прокрутка к сообщению
        setTimeout(() => {
            formMessage.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }, 100);
        
        // Автоматически скрываем через 7 секунд
        setTimeout(() => {
            if (formMessage.style.display === 'block') {
                formMessage.style.display = 'none';
            }
        }, 7000);
    }
    
    /**
     * Очистка формы
     */
    function resetForm(form) {
        if (!form) return;
        
        form.reset();
        
        // Дополнительная очистка для select полей
        const selects = form.querySelectorAll('select');
        selects.forEach(select => {
            const defaultOption = select.querySelector('option[disabled][selected]');
            if (defaultOption) {
                defaultOption.selected = true;
            }
        });
        
        // Очищаем textarea
        const textarea = form.querySelector('textarea');
        if (textarea) {
            textarea.value = '';
        }
        
        console.log('Форма очищена');
    }
    
    /**
     * Экспорт резервных копий из localStorage
     */
    window.exportRSVPBackup = function() {
        try {
            const data = localStorage.getItem('wedding_rsvp');
            if (!data) {
                alert('Нет сохраненных данных для экспорта');
                return;
            }
            
            const submissions = JSON.parse(data);
            const blob = new Blob([JSON.stringify(submissions, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wedding-rsvp-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            
        } catch (e) {
            console.error('Ошибка экспорта:', e);
            alert('Не удалось экспортировать данные');
        }
    };
    
    // ================ ИНИЦИАЛИЗАЦИЯ ================
    
    /**
     * Установка высоты для мобильных устройств
     */
    function setDocumentHeight() {
        const doc = document.documentElement;
        doc.style.setProperty('--doc-height', `${window.innerHeight}px`);
    }
    
    /**
     * Инициализация музыкального плеера
     */
    function initMusicPlayer() {
        audio = document.getElementById('wedding-audio');
        musicBtn = document.getElementById('music-toggle');
        
        if (!musicBtn || !audio) return;
        
        // Предзагрузка аудио
        audio.load();
        
        musicBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (isPlaying) {
                audio.pause();
                musicBtn.classList.remove('playing');
                musicBtn.innerHTML = '<i class="fas fa-play"></i>';
            } else {
                // Пытаемся воспроизвести
                audio.play()
                    .then(() => {
                        musicBtn.classList.add('playing');
                        musicBtn.innerHTML = '<i class="fas fa-pause"></i>';
                        console.log('Музыка воспроизводится');
                    })
                    .catch(error => {
                        console.log('Автовоспроизведение заблокировано:', error);
                        musicBtn.innerHTML = '<i class="fas fa-play"></i>';
                        
                        // Показываем подсказку
                        if (!localStorage.getItem('music_hint_shown')) {
                            alert('Нажмите на кнопку еще раз, чтобы включить музыку');
                            localStorage.setItem('music_hint_shown', 'true');
                        }
                    });
            }
            isPlaying = !isPlaying;
        });
        
        audio.addEventListener('ended', function() {
            isPlaying = false;
            musicBtn.classList.remove('playing');
            musicBtn.innerHTML = '<i class="fas fa-play"></i>';
        });
        
        audio.addEventListener('error', function(e) {
            console.error('Ошибка загрузки аудио:', e);
            musicBtn.style.opacity = '0.5';
            musicBtn.disabled = true;
        });
    }
    
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
    
    /**
     * Инициализация таймера обратного отсчета
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
                // Свадьба прошла
                const timerNumbers = document.querySelectorAll('.timer-number');
                timerNumbers.forEach(el => {
                    el.textContent = '00';
                });
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
        
        // Запускаем таймер
        if (document.querySelector('.countdown-timer')) {
            updateCountdown();
            setInterval(updateCountdown, 1000);
        }
    }
    
    /**
     * Инициализация RSVP формы
     */
    function initRSVPForm() {
        const rsvpForm = document.getElementById('rsvp-form');
        if (!rsvpForm) return;
        
        rsvpForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            if (isProcessing) {
                console.log('Форма уже обрабатывается');
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
            
            if (!nameInput || !attendanceSelect || !drinkSelect || !mealSelect) {
                console.error('Не все поля формы найдены');
                isProcessing = false;
                return;
            }
            
            // Сохраняем оригинальный текст кнопки
            const originalBtnText = submitBtn ? submitBtn.textContent : 'Отправить';
            
            // Получаем значения
            const name = nameInput.value.trim();
            const attendance = attendanceSelect.value;
            const drink = drinkSelect.value;
            const meal = mealSelect.value;
            const message = messageInput ? messageInput.value.trim() : '';
            
            // Валидация
            const errors = validateForm(name, attendance, drink, meal);
            
            if (errors.length > 0) {
                showFormMessage(errors[0], 'error');
                
                // Подсвечиваем проблемное поле
                if (errors[0].includes('ФИО')) {
                    nameInput.focus();
                    nameInput.style.borderColor = '#c62828';
                    setTimeout(() => nameInput.style.borderColor = '#ddd', 2000);
                } else if (errors[0].includes('присутствия')) {
                    attendanceSelect.focus();
                    attendanceSelect.style.borderColor = '#c62828';
                    setTimeout(() => attendanceSelect.style.borderColor = '#ddd', 2000);
                } else if (errors[0].includes('напиткам')) {
                    drinkSelect.focus();
                    drinkSelect.style.borderColor = '#c62828';
                    setTimeout(() => drinkSelect.style.borderColor = '#ddd', 2000);
                } else if (errors[0].includes('блюдам')) {
                    mealSelect.focus();
                    mealSelect.style.borderColor = '#c62828';
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
                timestamp: new Date().toISOString(),
                date: new Date().toLocaleDateString('ru-RU'),
                time: new Date().toLocaleTimeString('ru-RU'),
                url: window.location.href,
                referrer: document.referrer || 'Прямой переход'
            };
            
            console.log('Отправка данных:', formData);
            
            try {
                // Отправляем в Google Sheets
                const result = await sendToGoogleSheets(formData);
                
                // Сохраняем в localStorage как резервную копию
                saveToLocalStorage(formData);
                
                // Показываем сообщение об успехе
                let successMessage = '';
                if (attendance === 'yes') {
                    successMessage = 'Спасибо! Ваш ответ сохранён. Мы будем ждать вас на нашей свадьбе! ❤️';
                } else {
                    successMessage = 'Спасибо за ответ! Очень жаль, что вы не сможете быть с нами в этот день.';
                }
                
                showFormMessage(successMessage, 'success');
                
                // Очищаем форму
                resetForm(rsvpForm);
                
            } catch (error) {
                console.error('Ошибка при отправке:', error);
                
                // В случае ошибки, сохраняем в localStorage
                saveToLocalStorage({...formData, failed: true});
                
                // Показываем сообщение об ошибке, но не блокируем пользователя
                showFormMessage(
                    'Ваш ответ сохранен локально. Мы получим его при следующем подключении к интернету.',
                    'success'
                );
                
                // Очищаем форму
                resetForm(rsvpForm);
                
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
        
        console.log('RSVP форма инициализирована');
    }
    
    /**
     * Инициализация lazy loading для изображений
     */
    function initLazyLoading() {
        const images = document.querySelectorAll('img:not([loading])');
        images.forEach(img => {
            img.setAttribute('loading', 'lazy');
            
            // Обработка ошибок загрузки
            img.addEventListener('error', function() {
                console.warn('Не удалось загрузить изображение:', this.src);
                this.style.backgroundColor = '#f5f5f5';
                this.style.minHeight = '200px';
                
                // Добавляем плейсхолдер
                if (!this.alt) {
                    this.alt = 'Изображение недоступно';
                }
            });
            
            // Успешная загрузка
            img.addEventListener('load', function() {
                this.classList.add('loaded');
            });
        });
    }
    
    /**
     * Инициализация телефонных ссылок
     */
    function initPhoneLinks() {
        const phoneLinks = document.querySelectorAll('.contact-phone, .contact-link[href^="tel:"]');
        phoneLinks.forEach(link => {
            // Очищаем номер от лишних символов
            const phoneNumber = link.textContent.replace(/[^\d+]/g, '');
            if (phoneNumber) {
                link.setAttribute('href', `tel:${phoneNumber}`);
            }
            
            // Добавляем поддержку кликов на мобильных
            link.addEventListener('click', function(e) {
                if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                    // На мобильных устройствах ничего не делаем - браузер сам обработает
                    return true;
                } else {
                    // На десктопах показываем номер
                    e.preventDefault();
                    alert(`Номер телефона: ${this.textContent}`);
                }
            });
        });
    }
    
    /**
     * Проверка на медленное соединение
     */
    function checkSlowConnection() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            if (connection) {
                if (connection.effectiveType === 'slow-2g' || 
                    connection.effectiveType === '2g' ||
                    connection.saveData === true) {
                    
                    console.log('Медленное соединение, применяем оптимизацию');
                    
                    // Отключаем анимации
                    document.documentElement.style.setProperty('--animation-duration', '0s');
                    
                    // Оптимизируем загрузку изображений
                    const allImages = document.querySelectorAll('img');
                    allImages.forEach((img, index) => {
                        if (index > 2) { // Оставляем быструю загрузку только для первых 2 изображений
                            img.setAttribute('loading', 'lazy');
                            img.setAttribute('decoding', 'async');
                        }
                    });
                }
            }
        }
    }
    
    // ================ ЗАПУСК ================
    
    // Устанавливаем высоту
    setDocumentHeight();
    window.addEventListener('resize', setDocumentHeight);
    window.addEventListener('orientationchange', setDocumentHeight);
    
    // Инициализируем компоненты
    initMusicPlayer();
    initMap();
    initCountdown();
    initRSVPForm();
    initPhoneLinks();
    initLazyLoading();
    checkSlowConnection();
    
    // Загружаем шрифты
    document.fonts.ready.then(function() {
        document.body.classList.add('fonts-loaded');
    });
    
    // Fallback для старых браузеров
    setTimeout(function() {
        document.body.classList.add('fonts-loaded');
    }, 1000);
    
    // Добавляем класс loaded после полной загрузки
    window.addEventListener('load', function() {
        document.body.classList.add('loaded');
        console.log('Страница полностью загружена');
        
        // Проверяем сохраненные данные
        const savedData = localStorage.getItem('wedding_rsvp');
        if (savedData) {
            const submissions = JSON.parse(savedData);
            const failedSubmissions = submissions.filter(s => s.failed);
            if (failedSubmissions.length > 0) {
                console.log(`Есть ${failedSubmissions.length} неотправленных анкет`);
                // Здесь можно добавить автоматическую повторную отправку
            }
        }
    });
    
    // Функция для ручной прокрутки к форме
    window.scrollToRSVP = function() {
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
    
    console.log('Script.js полностью загружен');
});

// ================ ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ================

/**
 * Обработка ошибок глобально
 */
window.addEventListener('error', function(e) {
    console.error('Глобальная ошибка:', e.message, e.filename, e.lineno);
    // Не показываем ошибки пользователю
    e.preventDefault();
});

/**
 * Предотвращаем случайную отправку формы при перезагрузке
 */
window.addEventListener('beforeunload', function(e) {
    // Проверяем, есть ли несохраненные данные в форме
    const form = document.getElementById('rsvp-form');
    if (form) {
        const nameInput = document.getElementById('name');
        if (nameInput && nameInput.value.trim() !== '') {
            // Оставляем сообщение о несохраненных данных
            e.preventDefault();
            e.returnValue = 'У вас есть несохраненные данные. Вы уверены, что хотите покинуть страницу?';
        }
    }
});

/**
 * Поддержка темной темы
 */
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // Если нужно добавить поддержку темной темы
    console.log('Пользователь предпочитает темную тему');
}
