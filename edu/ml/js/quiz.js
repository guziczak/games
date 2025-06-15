/**
 * @module Quiz
 * @description Main quiz application logic
 */

import * as Storage from './storage.js';
import * as UI from './ui.js';
import { Timer } from './timer.js';
import { questions, getCategories, getCategoryCounts } from './questions.js';
import { shuffleArray, escapeHtml, formatTime } from './utils.js';

/**
 * Main Quiz application class
 */
export class QuizApp {
    constructor() {
        this.state = {
            currentMode: 'menu',
            currentQuestionIndex: 0,
            selectedAnswer: null,
            answers: [],
            showingFeedback: false,
            stats: {
                totalQuestions: 0,
                correctAnswers: 0,
                categoryStats: {}
            },
            learningMode: {
                incorrectQuestions: [],
                isReviewMode: false
            },
            settings: {
                timerEnabled: false,
                timerDuration: 30,
                darkMode: false
            },
            currentQuestions: [],
            sessionStats: {
                startTime: null,
                questionsAnswered: 0,
                totalTime: 0
            }
        };

        this.domCache = {};
        this.timer = new Timer();
    }

    /**
     * Initializes the application
     */
    init() {
        this.cacheDom();
        this.loadState();
        this.initializeCategories();
        this.attachEventListeners();
        this.applyTheme();
        this.render();
    }

    /**
     * Caches DOM elements
     */
    cacheDom() {
        this.domCache = {
            appContent: document.getElementById('appContent'),
            themeToggle: document.getElementById('themeToggle')
        };
    }

    /**
     * Loads state from storage
     */
    loadState() {
        const savedProgress = Storage.load(Storage.STORAGE_KEYS.PROGRESS);
        const savedSettings = Storage.load(Storage.STORAGE_KEYS.SETTINGS);

        if (savedProgress) {
            this.state.stats = savedProgress.stats || this.state.stats;
            this.state.learningMode = savedProgress.learningMode || this.state.learningMode;
        }

        if (savedSettings) {
            this.state.settings = { ...this.state.settings, ...savedSettings };
        }

        UI.updateStatsDisplay(this.state.stats);
    }

    /**
     * Saves state to storage
     */
    saveState() {
        const progressData = {
            stats: this.state.stats,
            learningMode: this.state.learningMode
        };

        Storage.save(Storage.STORAGE_KEYS.PROGRESS, progressData);
        Storage.save(Storage.STORAGE_KEYS.SETTINGS, this.state.settings);
    }

    /**
     * Initializes categories
     */
    initializeCategories() {
        const categories = getCategories();
        categories.forEach(cat => {
            if (!this.state.stats.categoryStats[cat]) {
                this.state.stats.categoryStats[cat] = {
                    total: 0,
                    correct: 0
                };
            }
        });
    }

    /**
     * Attaches event listeners
     */
    attachEventListeners() {
        // Theme toggle
        this.domCache.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Touch support
        let touchStartX = 0;
        document.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        });

        document.addEventListener('touchend', e => {
            const touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX - touchEndX);
        });

        // Keyboard navigation
        document.addEventListener('keydown', e => this.handleKeyboard(e));

        // Save on unload
        window.addEventListener('beforeunload', () => this.saveState());
    }

    /**
     * Handles keyboard navigation
     */
    handleKeyboard(event) {
        if (this.state.currentMode !== 'quiz') return;

        switch(event.key) {
            case '1':
            case '2':
            case '3':
            case '4':
                const index = parseInt(event.key) - 1;
                if (!this.state.showingFeedback && index < 4) {
                    const answers = document.querySelectorAll('.answer');
                    if (answers[index]) {
                        answers[index].click();
                    }
                }
                break;
            case 'Enter':
                if (!this.state.showingFeedback && this.state.selectedAnswer !== null) {
                    this.checkAnswer();
                } else if (this.state.showingFeedback) {
                    this.nextQuestion();
                }
                break;
            case 'ArrowRight':
                if (this.state.showingFeedback) {
                    this.nextQuestion();
                }
                break;
        }
    }

    /**
     * Handles swipe gestures
     */
    handleSwipe(diff) {
        if (this.state.currentMode !== 'quiz' && Math.abs(diff) > 50 && diff > 0 && this.state.showingFeedback) {
            this.nextQuestion();
        }
    }

    /**
     * Toggles dark mode
     */
    toggleTheme() {
        this.state.settings.darkMode = !this.state.settings.darkMode;
        this.applyTheme();
        this.saveState();
    }

    /**
     * Applies theme
     */
    applyTheme() {
        document.body.classList.toggle('dark-mode', this.state.settings.darkMode);
        UI.updateThemeIcon(this.state.settings.darkMode);
    }

    /**
     * Main render method
     */
    render() {
        switch(this.state.currentMode) {
            case 'menu':
                this.renderMenu();
                break;
            case 'quiz':
                this.renderQuestion();
                break;
            case 'categories':
                this.renderCategories();
                break;
            case 'results':
                this.renderResults();
                break;
        }
    }

    /**
     * Renders main menu
     */
    renderMenu() {
        const incorrectCount = this.state.learningMode.incorrectQuestions.length;
        
        this.domCache.appContent.innerHTML = `
            <div class="quiz-card menu-screen">
                <h2>Wybierz tryb nauki</h2>
                <div class="menu-options">
                    <div class="menu-option" id="allQuestions" tabindex="0" role="button">
                        <h3>Wszystkie pytania</h3>
                        <p>Przejdź przez wszystkie ${questions.length} pytań z teorii ML</p>
                    </div>
                    <div class="menu-option" id="randomQuestions" tabindex="0" role="button">
                        <h3>Losowe pytania</h3>
                        <p>20 losowo wybranych pytań z różnych kategorii</p>
                    </div>
                    <div class="menu-option" id="reviewQuestions" tabindex="0" role="button">
                        <h3>Powtórka błędów</h3>
                        <p>${incorrectCount} pytań, na które odpowiedziałeś błędnie</p>
                        ${incorrectCount > 0 ? 
                            `<div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--danger); color: white; border-radius: 6px; font-size: 0.85rem; text-align: center;">
                                ${incorrectCount} ${incorrectCount === 1 ? 'pytanie' : 'pytań'} do powtórki
                            </div>` : 
                            '<div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--success); color: white; border-radius: 6px; font-size: 0.85rem; text-align: center;">Brak błędów! 🎉</div>'
                        }
                    </div>
                    <div class="menu-option" id="categoryQuestions" tabindex="0" role="button">
                        <h3>Wybierz kategorię</h3>
                        <p>Ucz się pytań z wybranej kategorii</p>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3>Ustawienia</h3>
                    <div class="setting-item">
                        <label for="timerToggle">Timer dla pytań</label>
                        <label class="toggle-switch">
                            <input type="checkbox" id="timerToggle" ${this.state.settings.timerEnabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="setting-item">
                        <label for="timerDuration">Czas na pytanie (sekundy)</label>
                        <input type="number" id="timerDuration" min="10" max="120" value="${this.state.settings.timerDuration}" 
                               style="width: 60px; padding: 0.25rem; border: 1px solid var(--border-color); border-radius: 4px;">
                    </div>
                </div>
                
                <button class="btn btn-secondary" id="resetProgress" style="margin-top: 2rem">
                    Resetuj postępy
                </button>
            </div>
        `;

        // Attach event listeners
        document.getElementById('allQuestions').addEventListener('click', () => this.startQuiz('all'));
        document.getElementById('randomQuestions').addEventListener('click', () => this.startQuiz('random'));
        document.getElementById('reviewQuestions').addEventListener('click', () => this.startQuiz('review'));
        document.getElementById('categoryQuestions').addEventListener('click', () => {
            this.state.currentMode = 'categories';
            this.render();
        });

        document.getElementById('timerToggle').addEventListener('change', (e) => {
            this.state.settings.timerEnabled = e.target.checked;
            this.saveState();
        });

        document.getElementById('timerDuration').addEventListener('change', (e) => {
            this.state.settings.timerDuration = parseInt(e.target.value) || 30;
            this.saveState();
        });

        document.getElementById('resetProgress').addEventListener('click', () => this.resetProgress());
    }

    /**
     * Renders categories
     */
    renderCategories() {
        const categories = getCategories();
        const categoryCounts = getCategoryCounts();
        
        this.domCache.appContent.innerHTML = `
            <div class="quiz-card">
                <h2>Wybierz kategorię</h2>
                <div class="category-stats" style="margin-top: 1rem">
                    ${categories.map(cat => {
                        const stats = this.state.stats.categoryStats[cat] || { total: 0, correct: 0 };
                        return UI.createCategoryStat(cat, stats, categoryCounts[cat]);
                    }).join('')}
                </div>
                <button class="btn btn-secondary" id="backBtn" style="margin-top: 1rem">
                    Powrót
                </button>
            </div>
        `;

        // Event listeners
        const categoryOptions = this.domCache.appContent.querySelectorAll('.category-option');
        categoryOptions.forEach(option => {
            option.addEventListener('click', () => {
                const category = option.dataset.category;
                this.startQuiz('category', category);
            });
        });
        UI.applyHoverEffects(categoryOptions);

        document.getElementById('backBtn').addEventListener('click', () => {
            this.state.currentMode = 'menu';
            this.render();
        });
    }

    /**
     * Starts quiz
     */
    startQuiz(mode, category = null) {
        this.state.currentMode = 'quiz';
        this.state.currentQuestionIndex = 0;
        this.state.selectedAnswer = null;
        this.state.showingFeedback = false;
        this.state.sessionStats.startTime = Date.now();
        this.state.sessionStats.questionsAnswered = 0;
        
        let selectedQuestions = [];
        
        if (mode === 'all') {
            selectedQuestions = shuffleArray(questions);
        } else if (mode === 'random') {
            selectedQuestions = shuffleArray(questions).slice(0, 20);
        } else if (mode === 'review') {
            if (this.state.learningMode.incorrectQuestions.length === 0) {
                alert('Nie masz żadnych błędnych odpowiedzi do powtórki!');
                this.state.currentMode = 'menu';
                this.render();
                return;
            }
            selectedQuestions = this.state.learningMode.incorrectQuestions;
            this.state.learningMode.isReviewMode = true;
        } else if (mode === 'category' && category) {
            selectedQuestions = shuffleArray(questions.filter(q => q.category === category));
        }
        
        this.state.currentQuestions = selectedQuestions;
        this.state.answers = new Array(selectedQuestions.length).fill(null);
        
        this.render();
    }

    /**
     * Renders current question
     */
    renderQuestion() {
        if (this.state.currentQuestionIndex >= this.state.currentQuestions.length) {
            this.showResults();
            return;
        }

        const question = this.state.currentQuestions[this.state.currentQuestionIndex];
        const answersWithIndices = question.answers.map((answer, index) => ({ 
            answer, 
            originalIndex: index,
            explanation: question.explanations?.[index] || question.explanation || ''
        }));
        const shuffledAnswers = shuffleArray(answersWithIndices);
        
        this.domCache.appContent.innerHTML = `
            <div class="quiz-card">
                ${UI.createProgressBar(this.state.currentQuestionIndex, this.state.currentQuestions.length)}
                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                    <span style="color: var(--text-secondary); font-size: 0.9rem;">
                        ${this.state.learningMode.isReviewMode ? 'Powtórka -' : ''} Pytanie ${this.state.currentQuestionIndex + 1} z ${this.state.currentQuestions.length}
                    </span>
                    ${UI.createCategoryBadge(question.category)}
                </div>
                <div class="question">${escapeHtml(question.question)}</div>
                <div id="feedbackMessage"></div>
                <div class="answers">
                    ${shuffledAnswers.map((item, index) => UI.createAnswerHTML(item, index)).join('')}
                </div>
                <div class="controls">
                    <button class="btn btn-primary" id="checkBtn" disabled>
                        Sprawdź odpowiedź
                    </button>
                </div>
            </div>
        `;

        // Attach answer listeners
        const answers = this.domCache.appContent.querySelectorAll('.answer');
        answers.forEach((answer, index) => {
            answer.addEventListener('click', () => {
                const originalIndex = parseInt(answer.dataset.originalIndex);
                this.selectAnswer(index, originalIndex);
            });
        });

        // Check button
        document.getElementById('checkBtn').addEventListener('click', () => {
            if (this.state.showingFeedback) {
                this.nextQuestion();
            } else {
                this.checkAnswer();
            }
        });

        // Start timer if enabled
        if (this.state.settings.timerEnabled) {
            this.timer.start(
                this.state.settings.timerDuration,
                () => {
                    if (!this.state.showingFeedback) {
                        this.checkAnswer();
                    }
                },
                (remaining, total) => UI.updateTimerDisplay(remaining, total)
            );
        }
    }

    /**
     * Selects answer
     */
    selectAnswer(displayIndex, originalIndex) {
        if (this.state.showingFeedback) return;
        
        this.state.selectedAnswer = displayIndex;
        this.state.answers[this.state.currentQuestionIndex] = originalIndex;
        
        // Update UI
        const answers = this.domCache.appContent.querySelectorAll('.answer');
        answers.forEach((el, idx) => {
            el.classList.toggle('selected', idx === displayIndex);
        });
        
        document.getElementById('checkBtn').disabled = false;
    }

    /**
     * Checks answer
     */
    checkAnswer() {
        const question = this.state.currentQuestions[this.state.currentQuestionIndex];
        const selectedEl = this.domCache.appContent.querySelector('.answer.selected');
        
        if (!selectedEl) {
            this.state.answers[this.state.currentQuestionIndex] = -1;
        }
        
        const selectedOriginalIndex = selectedEl ? parseInt(selectedEl.dataset.originalIndex) : -1;
        const isCorrect = selectedOriginalIndex === question.correct;
        
        this.state.showingFeedback = true;
        this.state.sessionStats.questionsAnswered++;
        
        // Stop timer
        this.timer.stop();
        UI.hideTimerDisplay();
        
        // Update statistics
        this.updateStatistics(question, isCorrect);
        
        // Show feedback
        const feedbackDiv = document.getElementById('feedbackMessage');
        feedbackDiv.innerHTML = UI.createFeedbackMessage(isCorrect, !selectedEl);
        
        UI.provideHapticFeedback(isCorrect);
        
        // Show correct/incorrect answers
        const answers = this.domCache.appContent.querySelectorAll('.answer');
        answers.forEach((el) => {
            const origIndex = parseInt(el.dataset.originalIndex);
            if (origIndex === question.correct) {
                el.classList.add('correct', 'show-feedback');
            } else if (el.classList.contains('selected') && !isCorrect) {
                el.classList.add('incorrect', 'show-feedback');
            }
        });
        
        UI.updateStatsDisplay(this.state.stats);
        this.saveState();
        
        // Update button
        const checkBtn = document.getElementById('checkBtn');
        checkBtn.textContent = this.state.currentQuestionIndex < this.state.currentQuestions.length - 1 ? 
            'Następne pytanie' : 'Zobacz wyniki';
    }

    /**
     * Updates statistics
     */
    updateStatistics(question, isCorrect) {
        this.state.stats.totalQuestions++;
        const category = question.category;
        
        if (!this.state.stats.categoryStats[category]) {
            this.state.stats.categoryStats[category] = { total: 0, correct: 0 };
        }
        this.state.stats.categoryStats[category].total++;
        
        if (isCorrect) {
            this.state.stats.correctAnswers++;
            this.state.stats.categoryStats[category].correct++;
            
            // Remove from incorrect
            const incorrectIndex = this.state.learningMode.incorrectQuestions.findIndex(
                q => q.question === question.question
            );
            if (incorrectIndex !== -1) {
                this.state.learningMode.incorrectQuestions.splice(incorrectIndex, 1);
            }
        } else {
            // Add to incorrect
            if (!this.state.learningMode.incorrectQuestions.find(q => q.question === question.question)) {
                this.state.learningMode.incorrectQuestions.push(question);
            }
        }
    }

    /**
     * Next question
     */
    nextQuestion() {
        this.state.currentQuestionIndex++;
        this.state.selectedAnswer = null;
        this.state.showingFeedback = false;
        this.render();
    }

    /**
     * Shows results
     */
    showResults() {
        this.state.currentMode = 'results';
        this.state.sessionStats.totalTime = Date.now() - this.state.sessionStats.startTime;
        this.render();
    }

    /**
     * Renders results
     */
    renderResults() {
        const totalQuestions = this.state.currentQuestions.length;
        const correctAnswers = this.state.answers.filter((answer, index) => 
            answer === this.state.currentQuestions[index].correct
        ).length;
        const percentage = Math.round((correctAnswers / totalQuestions) * 100);
        
        const totalTime = Math.floor(this.state.sessionStats.totalTime / 1000);
        const avgTime = Math.floor(totalTime / totalQuestions);
        
        this.domCache.appContent.innerHTML = `
            <div class="quiz-card results-screen">
                <h2>Wyniki quizu</h2>
                <div class="score-circle">
                    ${percentage}%
                </div>
                <p style="font-size: 1.2rem; margin-bottom: 1rem;">
                    Odpowiedziałeś poprawnie na ${correctAnswers} z ${totalQuestions} pytań
                </p>
                <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 2rem;">
                    Czas: ${formatTime(totalTime)} (średnio ${avgTime}s na pytanie)
                </p>
                
                <div class="category-stats">
                    <h3 style="margin-bottom: 1rem;">Wyniki według kategorii:</h3>
                    ${this.getCategoryResults()}
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button class="btn btn-primary" id="menuBtn">Menu główne</button>
                    ${this.state.learningMode.incorrectQuestions.length > 0 ? 
                        `<button class="btn btn-secondary" id="reviewBtn">
                            Powtórz błędy (${this.state.learningMode.incorrectQuestions.length})
                        </button>` : ''
                    }
                </div>
            </div>
        `;
        
        // Event listeners
        document.getElementById('menuBtn').addEventListener('click', () => {
            this.state.currentMode = 'menu';
            this.state.learningMode.isReviewMode = false;
            this.render();
        });
        
        const reviewBtn = document.getElementById('reviewBtn');
        if (reviewBtn) {
            reviewBtn.addEventListener('click', () => {
                this.startQuiz('review');
            });
        }
    }

    /**
     * Gets category results HTML
     */
    getCategoryResults() {
        return Object.entries(this.state.stats.categoryStats)
            .filter(([cat, _]) => this.state.currentQuestions.some(q => q.category === cat))
            .map(([cat, stats]) => {
                const catQuestions = this.state.currentQuestions.filter(q => q.category === cat).length;
                const catCorrect = this.state.currentQuestions
                    .filter((q, i) => q.category === cat && this.state.answers[i] === q.correct).length;
                const catPercentage = catQuestions > 0 ? Math.round((catCorrect / catQuestions) * 100) : 0;
                return `
                    <div class="category-stat">
                        <span class="category-name">${escapeHtml(cat)}</span>
                        <span class="category-score">${catCorrect}/${catQuestions} (${catPercentage}%)</span>
                    </div>
                `;
            }).join('');
    }

    /**
     * Resets progress
     */
    resetProgress() {
        if (confirm('Czy na pewno chcesz zresetować wszystkie postępy?')) {
            Storage.clear(Storage.STORAGE_KEYS.PROGRESS);
            this.state.stats = {
                totalQuestions: 0,
                correctAnswers: 0,
                categoryStats: {}
            };
            this.state.learningMode = {
                incorrectQuestions: [],
                isReviewMode: false
            };
            this.initializeCategories();
            UI.updateStatsDisplay(this.state.stats);
            this.saveState();
            this.render();
        }
    }
}