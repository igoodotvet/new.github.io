// Упрощенный класс приложения
class FlashcardApp {
    constructor() {
        this.cards = [];
        this.progress = {};
        this.currentCard = null;
        this.currentMode = 'image';
        this.modeCounter = 0;
        
        this.settings = {
            masteryThreshold: 3,
            maxNewCards: 10,
            typoTolerance: 1
        };
        
        this.init();
    }

    async init() {
        console.log('Initializing app...');
        
        try {
            // 1. Загружаем настройки
            this.loadSettings();
            
            // 2. Загружаем карточки
            await this.loadCards();
            
            // 3. Загружаем прогресс
            this.loadProgress();
            
            // 4. Настраиваем интерфейс
            this.setupUI();
            
            // 5. Показываем первую карточку
            this.showNextCard();
            
            console.log('App initialized successfully');
            
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError('Ошибка инициализации: ' + error.message);
        }
    }

    async loadCards() {
        console.log('Loading cards from data.json...');
        
        try {
            const response = await fetch('data.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Raw data from data.json:', data);
            
            // Валидация данных
            if (!Array.isArray(data)) {
                throw new Error('data.json должен содержать массив карточек');
            }
            
            if (data.length === 0) {
                throw new Error('data.json пуст. Добавьте карточки.');
            }
            
            // Обработка карточек
            this.cards = data.map((card, index) => {
                // Проверяем обязательные поля
                if (card.id === undefined) card.id = index + 1;
                if (card.number === undefined) card.number = index;
                if (card.name === undefined) card.name = `Карточка ${index + 1}`;
                
                // Форматируем число
                card.numberFormatted = card.number < 10 ? `0${card.number}` : card.number.toString();
                
                // Формируем URL картинки
                card.imageUrl = `images/${card.numberFormatted}.jpg`;
                
                return card;
            });
            
            console.log(`Loaded ${this.cards.length} cards`);
            
        } catch (error) {
            console.error('Failed to load cards:', error);
            
            // Создаем тестовую карточку для отладки
            this.cards = [{
                id: 1,
                number: 0,
                numberFormatted: '00',
                name: 'Тестовая карточка',
                imageUrl: 'images/00.jpg'
            }];
            
            console.warn('Using test card for debugging');
        }
    }

    loadProgress() {
        const saved = localStorage.getItem('flashcards-progress');
        
        if (saved) {
            try {
                this.progress = JSON.parse(saved);
                console.log('Progress loaded from localStorage');
            } catch (error) {
                console.warn('Failed to parse progress, resetting...');
                this.resetProgress();
            }
        } else {
            this.resetProgress();
        }
    }

    resetProgress() {
        this.progress = {};
        this.cards.forEach(card => {
            this.progress[card.id] = {
                imageToNumber: 0,
                numberToImage: 0
            };
        });
        this.saveProgress();
        console.log('Progress reset');
    }

    saveProgress() {
        localStorage.setItem('flashcards-progress', JSON.stringify(this.progress));
    }

    loadSettings() {
        const saved = localStorage.getItem('flashcards-settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.settings = { ...this.settings, ...parsed };
            } catch (error) {
                console.warn('Failed to load settings');
            }
        }
    }

    saveSettings() {
        localStorage.setItem('flashcards-settings', JSON.stringify(this.settings));
    }

    setupUI() {
        // Кнопка проверки
        document.getElementById('check-btn').addEventListener('click', () => this.checkAnswer());
        
        // Enter в поле ввода
        document.getElementById('answer-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkAnswer();
        });
        
        // Настройки
        document.getElementById('mastery-threshold').addEventListener('change', (e) => {
            this.settings.masteryThreshold = parseInt(e.target.value) || 3;
            this.saveSettings();
            this.updateProgressDisplay();
        });
        
        document.getElementById('max-new-cards').addEventListener('change', (e) => {
            this.settings.maxNewCards = parseInt(e.target.value) || 10;
            this.saveSettings();
        });
        
        document.getElementById('typo-tolerance').addEventListener('change', (e) => {
            this.settings.typoTolerance = parseInt(e.target.value) || 1;
            this.saveSettings();
        });
        
        // Кнопки
        document.getElementById('reset-progress').addEventListener('click', () => {
            if (confirm('Сбросить весь прогресс?')) {
                this.resetProgress();
                this.showNextCard();
            }
        });
        
        document.getElementById('export-progress').addEventListener('click', () => this.exportProgress());
        
        // Импорт
        document.getElementById('import-file').addEventListener('change', (e) => this.importProgress(e));
        
        // Клик на прогресс для импорта
        document.getElementById('progress-text').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        
        // Обновляем значения в полях настроек
        this.updateSettingsDisplay();
    }

    getNextMode() {
        this.modeCounter++;
        return this.modeCounter % 4 < 2 ? 'image' : 'number';
    }

    getNextCard() {
        if (this.cards.length === 0) return null;
        
        // Фильтруем неосвоенные карточки
        const availableCards = this.cards.filter(card => {
            const progress = this.progress[card.id] || { imageToNumber: 0, numberToImage: 0 };
            const mastered = progress.imageToNumber >= this.settings.masteryThreshold && 
                            progress.numberToImage >= this.settings.masteryThreshold;
            return !mastered;
        });
        
        if (availableCards.length === 0) return null;
        
        // Ограничиваем количество
        const limitedCards = availableCards.slice(0, this.settings.maxNewCards);
        
        // Выбираем случайную
        const randomIndex = Math.floor(Math.random() * limitedCards.length);
        return limitedCards[randomIndex];
    }

    showNextCard() {
        this.currentCard = this.getNextCard();
        this.clearFeedback();
        
        const cardContent = document.getElementById('card-content');
        
        if (!this.currentCard) {
            cardContent.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h3 style="color: #28a745;">🎉 Все карточки освоены!</h3>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px;">
                        Начать заново
                    </button>
                </div>
            `;
            document.getElementById('answer-input').disabled = true;
            document.getElementById('check-btn').disabled = true;
            return;
        }
        
        // Устанавливаем режим
        this.currentMode = this.getNextMode();
        
        if (this.currentMode === 'image') {
            cardContent.innerHTML = `
                <img src="${this.currentCard.imageUrl}" 
                     alt="Картинка ${this.currentCard.numberFormatted}"
                     style="max-width: 100%; max-height: 160px; object-fit: contain; border-radius: 8px;">
            `;
            document.getElementById('answer-input').placeholder = "Введите число...";
        } else {
            cardContent.innerHTML = `
                <div class="number-display">${this.currentCard.numberFormatted}</div>
            `;
            document.getElementById('answer-input').placeholder = "Введите название...";
        }
        
        document.getElementById('answer-input').value = '';
        document.getElementById('answer-input').disabled = false;
        document.getElementById('check-btn').disabled = false;
        document.getElementById('answer-input').focus();
        
        this.updateProgressDisplay();
    }

    checkAnswer() {
        const userAnswer = document.getElementById('answer-input').value.trim();
        
        if (!userAnswer) return;
        
        let isCorrect = false;
        let feedbackMessage = '';
        
        if (this.currentMode === 'image') {
            // Проверка числа
            const userNumber = parseInt(userAnswer);
            isCorrect = userNumber === this.currentCard.number;
            feedbackMessage = isCorrect ? '✓ Верно!' : `✗ Правильно: ${this.currentCard.numberFormatted}`;
            
            // Обновляем прогресс
            if (!this.progress[this.currentCard.id]) {
                this.progress[this.currentCard.id] = { imageToNumber: 0, numberToImage: 0 };
            }
            
            if (isCorrect) {
                this.progress[this.currentCard.id].imageToNumber++;
            } else {
                this.progress[this.currentCard.id].imageToNumber = Math.max(0, this.progress[this.currentCard.id].imageToNumber - 1);
            }
            
        } else {
            // Проверка текста
            const correct = this.currentCard.name.toLowerCase();
            const answer = userAnswer.toLowerCase();
            
            isCorrect = answer === correct || 
                       (this.settings.typoTolerance > 0 && 
                        this.levenshteinDistance(answer, correct) <= this.settings.typoTolerance);
            
            feedbackMessage = isCorrect ? '✓ Верно!' : `✗ Правильно: "${this.currentCard.name}"`;
            
            // Обновляем прогресс
            if (!this.progress[this.currentCard.id]) {
                this.progress[this.currentCard.id] = { imageToNumber: 0, numberToImage: 0 };
            }
            
            if (isCorrect) {
                this.progress[this.currentCard.id].numberToImage++;
            } else {
                this.progress[this.currentCard.id].numberToImage = Math.max(0, this.progress[this.currentCard.id].numberToImage - 1);
            }
        }
        
        // Показываем результат
        this.showFeedback(feedbackMessage, isCorrect);
        this.saveProgress();
        
        // Через секунду следующая карточка
        setTimeout(() => {
            this.showNextCard();
        }, 1000);
    }

    levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i-1) === a.charAt(j-1)) {
                    matrix[i][j] = matrix[i-1][j-1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i-1][j-1] + 1,
                        matrix[i][j-1] + 1,
                        matrix[i-1][j] + 1
                    );
                }
            }
        }
        
        return matrix[b.length][a.length];
    }

    showFeedback(message, isCorrect) {
        const feedback = document.createElement('div');
        feedback.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        feedback.textContent = message;
        
        const inputSection = document.querySelector('.input-section');
        const oldFeedback = inputSection.querySelector('.feedback');
        if (oldFeedback) oldFeedback.remove();
        
        inputSection.appendChild(feedback);
    }

    clearFeedback() {
        document.querySelectorAll('.feedback').forEach(el => el.remove());
    }

    updateProgressDisplay() {
        if (this.cards.length === 0) {
            document.getElementById('progress-text').textContent = '0/0';
            return;
        }
        
        const total = this.cards.length;
        let mastered = 0;
        
        for (const card of this.cards) {
            const progress = this.progress[card.id] || { imageToNumber: 0, numberToImage: 0 };
            if (progress.imageToNumber >= this.settings.masteryThreshold && 
                progress.numberToImage >= this.settings.masteryThreshold) {
                mastered++;
            }
        }
        
        document.getElementById('progress-text').textContent = `${mastered}/${total}`;
    }

    updateSettingsDisplay() {
        document.getElementById('mastery-threshold').value = this.settings.masteryThreshold;
        document.getElementById('max-new-cards').value = this.settings.maxNewCards;
        document.getElementById('typo-tolerance').value = this.settings.typoTolerance;
    }

    exportProgress() {
        const data = {
            progress: this.progress,
            settings: this.settings,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `cards-progress-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importProgress(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.progress) {
                    this.progress = data.progress;
                    this.saveProgress();
                }
                
                if (data.settings) {
                    this.settings = { ...this.settings, ...data.settings };
                    this.saveSettings();
                    this.updateSettingsDisplay();
                }
                
                this.showNextCard();
                alert('Прогресс загружен!');
                
            } catch (error) {
                alert('Ошибка загрузки файла');
            }
            
            event.target.value = '';
        };
        
        reader.readAsText(file);
    }

    showError(message) {
        const cardContent = document.getElementById('card-content');
        cardContent.innerHTML = `
            <div style="color: #dc3545; padding: 20px; text-align: center;">
                <h4>Ошибка</h4>
                <p>${message}</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">Проверьте консоль браузера (F12)</p>
            </div>
        `;
    }
}

// Запуск приложения
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting app...');
    window.app = new FlashcardApp();
});