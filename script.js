document.addEventListener('DOMContentLoaded', function() {
    // Оптимизация для мобильных: предотвращаем быстрые множественные клики
    let isProcessing = false;
    
    // Обработка кнопки карты
    const mapButton = document.getElementById('map-btn');
    const mapContainer = document.getElementById('map-container');
    const closeMapButton = document.getElementById('close-map');
    
    if (mapButton && mapContainer) {
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
    }
    
    if (closeMapButton) {
        closeMapButton.addEventListener('click', function(e) {
            if (isProcessing) return;
            isProcessing = true;
            
            e.preventDefault();
            mapContainer.classList.add('hidden');
            
            setTimeout(() => {
                if (mapButton) {
                    mapButton.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
                isProcessing = false;
            }, 300);
        });
    }
    
    // Музыкальный плеер
    const audio = document.getElementById('wedding-audio');
    const musicBtn = document.getElementById('music-toggle');
    let isPlaying = false;
    
    if (musicBtn && audio) {
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
                        console.log('Автовоспроизведение заблокировано браузером');
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
    
    // Таймер обратного отсчета до 25 апреля 2026
    function updateCountdown() {
        const weddingDate = new Date('April 25, 2026 16:00:00').getTime();
        const now = new Date().getTime();
        const distance = weddingDate - now;

        if (distance < 0) {
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

        const daysEl = document.getElementById('days');
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        
        if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
        if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
        if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
        if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
    }

    if (document.querySelector('.countdown-timer')) {
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }
    
    // Обработка формы RSVP
    const rsvpForm = document.getElementById('rsvp-form');
    const formMessage = document.getElementById('form-message');
    const nameInput = document.getElementById('name');
    
    // УБИРАЕМ АВТОМАТИЧЕСКУЮ ПРОКРУТКУ ПРИ ЗАГРУЗКЕ
    // Теперь прокрутка будет только при клике на специальную кнопку или ссылку
    
    if (rsvpForm) {
        rsvpForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            if (isProcessing) return;
            isProcessing = true;
            
            const formData = new FormData(rsvpForm);
            const formDataObj = Object.fromEntries(formData.entries());
            
            let isValid = true;
            const nameInput = document.getElementById('name');
            const attendanceSelect = document.getElementById('attendance');
            const drinkSelect = document.getElementById('drink');
            const mealSelect = document.getElementById('meal');
            
            if (formMessage) {
                formMessage.className = 'form-message';
                formMessage.style.display = 'none';
            }
            
            if (!nameInput.value.trim()) {
                if (formMessage) {
                    formMessage.textContent = 'Пожалуйста, введите ваше ФИО';
                    formMessage.className = 'form-message error';
                    formMessage.style.display = 'block';
                }
                isValid = false;
                nameInput.focus();
            } else if (!attendanceSelect.value) {
                if (formMessage) {
                    formMessage.textContent = 'Пожалуйста, выберите вариант присутствия';
                    formMessage.className = 'form-message error';
                    formMessage.style.display = 'block';
                }
                isValid = false;
                attendanceSelect.focus();
            } else if (!drinkSelect.value) {
                if (formMessage) {
                    formMessage.textContent = 'Пожалуйста, выберите предпочтения по напиткам';
                    formMessage.className = 'form-message error';
                    formMessage.style.display = 'block';
                }
                isValid = false;
                drinkSelect.focus();
            } else if (!mealSelect.value) {
                if (formMessage) {
                    formMessage.textContent = 'Пожалуйста, выберите предпочтения по блюдам';
                    formMessage.className = 'form-message error';
                    formMessage.style.display = 'block';
                }
                isValid = false;
                mealSelect.focus();
            }
            
            if (!isValid) {
                isProcessing = false;
                return;
            }
            
            console.log('Данные анкеты гостя:', formDataObj);
            
            if (formMessage) {
                if (attendanceSelect.value === 'yes') {
                    formMessage.textContent = 'Спасибо! Ваш ответ сохранён. Мы будем ждать вас на нашей свадьбе!';
                } else {
                    formMessage.textContent = 'Спасибо за ответ! Очень жаль, что вы не сможете быть с нами в этот день.';
                }
                formMessage.className = 'form-message success';
                formMessage.style.display = 'block';
            }
            
            document.activeElement.blur();
            
            setTimeout(() => {
                if (formMessage) {
                    formMessage.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            }, 100);
            
            setTimeout(() => {
                isProcessing = false;
            }, 2000);
            
            setTimeout(() => {
                if (formMessage) {
                    formMessage.className = 'form-message';
                    formMessage.style.display = 'none';
                }
            }, 7000);
        });
        
        const formInputs = rsvpForm.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => {
            input.addEventListener('focus', function() {
                this.style.backgroundColor = '#f9f9f9';
            });
            
            input.addEventListener('blur', function() {
                this.style.backgroundColor = 'white';
            });
            
            if (input.tagName === 'SELECT') {
                input.addEventListener('change', function() {
                    if (navigator.vibrate) {
                        navigator.vibrate(10);
                    }
                });
            }
        });
    }
    
    // Функция для ручной прокрутки к форме (можно вызвать из консоли или добавить кнопку)
    window.scrollToForm = function() {
        const rsvpSection = document.getElementById('rsvp-section');
        const nameInput = document.getElementById('name');
        
        if (rsvpSection) {
            rsvpSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'center'
            });
            setTimeout(() => {
                if (nameInput) {
                    nameInput.focus();
                }
            }, 500);
        }
    };
    
    // Оптимизация плавной прокрутки для мобильных
    const smoothScroll = function(targetId) {
        if (isProcessing) return;
        isProcessing = true;
        
        const targetElement = document.querySelector(targetId);
        if (!targetElement) {
            isProcessing = false;
            return;
        }
        
        targetElement.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
        });
        
        setTimeout(() => {
            isProcessing = false;
        }, 800);
    };
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            smoothScroll(targetId);
        });
    });
    
    // Исправление проблемы с 100vh на мобильных устройствах
    function setDocumentHeight() {
        const doc = document.documentElement;
        doc.style.setProperty('--doc-height', `${window.innerHeight}px`);
    }
    
    window.addEventListener('resize', setDocumentHeight);
    window.addEventListener('orientationchange', setDocumentHeight);
    window.addEventListener('load', setDocumentHeight);
    setDocumentHeight();
    
    // Оптимизация загрузки изображений
    const lazyLoadImages = function() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (!img.getAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
            
            img.addEventListener('error', function() {
                this.style.backgroundColor = '#f5f5f5';
                this.style.minHeight = '200px';
                console.warn('Не удалось загрузить изображение:', this.src);
            });
        });
    };
    
    window.addEventListener('load', function() {
        lazyLoadImages();
        
        setTimeout(() => {
            document.body.classList.add('loaded');
        }, 100);
    });
    
    if ('connection' in navigator) {
        const connection = navigator.connection;
        if (connection) {
            if (connection.effectiveType === 'slow-2g' || 
                connection.effectiveType === '2g' ||
                connection.saveData === true) {
                console.log('Медленное соединение, оптимизируем загрузку...');
                
                document.documentElement.style.setProperty('--animation-duration', '0s');
                
                const allImages = document.querySelectorAll('img');
                allImages.forEach((img, index) => {
                    if (index > 2) {
                        img.setAttribute('loading', 'lazy');
                        img.setAttribute('decoding', 'async');
                    }
                });
            }
        }
    }
    
    const phoneLinks = document.querySelectorAll('.contact-phone, .contact-link');
    phoneLinks.forEach(link => {
        const phoneNumber = link.textContent.replace(/[^\d+]/g, '');
        link.setAttribute('href', `tel:${phoneNumber}`);
    });
});