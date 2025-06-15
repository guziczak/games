/**
 * @module UI
 * @description UI rendering and DOM manipulation functions
 */

import { escapeHtml, formatTime, getRandomMessage } from './utils.js';

/**
 * UI configuration and messages
 */
export const UI_CONFIG = {
    correctMessages: [
        '✓ Świetnie! Dobra odpowiedź!',
        '✓ Brawo! Dokładnie tak!',
        '✓ Super! Masz rację!',
        '✓ Doskonale! Poprawna odpowiedź!',
        '✓ Bardzo dobrze! Tak trzymaj!'
    ],
    incorrectMessages: [
        '✗ Niestety, to nie jest poprawna odpowiedź.',
        '✗ Ups! Spróbuj zapamiętać poprawną odpowiedź.',
        '✗ Nie tym razem. Zobacz wyjaśnienie poniżej.',
        '✗ Błędna odpowiedź. Przeczytaj wyjaśnienie.',
        '✗ Niestety nie. Sprawdź poprawną odpowiedź.'
    ],
    timeoutMessage: '⏱️ Czas minął! Zobacz poprawną odpowiedź.'
};

/**
 * Updates theme icon based on dark mode state
 * @param {boolean} isDarkMode - Dark mode state
 */
export function updateThemeIcon(isDarkMode) {
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.textContent = isDarkMode ? '☀️' : '🌙';
    }
}

/**
 * Updates statistics display
 * @param {Object} stats - Statistics object
 */
export function updateStatsDisplay(stats) {
    const elements = {
        totalQuestions: document.getElementById('totalQuestions'),
        correctAnswers: document.getElementById('correctAnswers'),
        accuracy: document.getElementById('accuracy')
    };

    if (elements.totalQuestions) {
        elements.totalQuestions.textContent = stats.totalQuestions;
    }
    
    if (elements.correctAnswers) {
        elements.correctAnswers.textContent = stats.correctAnswers;
    }
    
    if (elements.accuracy) {
        const accuracy = stats.totalQuestions > 0 
            ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
            : 0;
        elements.accuracy.textContent = accuracy + '%';
    }
}

/**
 * Updates timer display
 * @param {number} remaining - Remaining seconds
 * @param {number} total - Total seconds
 */
export function updateTimerDisplay(remaining, total) {
    const timerContainer = document.getElementById('timerContainer');
    const timerElement = document.getElementById('timer');
    
    if (!timerContainer || !timerElement) return;
    
    timerContainer.style.display = 'block';
    timerElement.textContent = formatTime(remaining);
    
    // Change color based on remaining time
    timerElement.classList.remove('warning', 'danger');
    if (remaining <= 5) {
        timerElement.classList.add('danger');
    } else if (remaining <= 10) {
        timerElement.classList.add('warning');
    }
}

/**
 * Hides timer display
 */
export function hideTimerDisplay() {
    const timerContainer = document.getElementById('timerContainer');
    if (timerContainer) {
        timerContainer.style.display = 'none';
    }
}

/**
 * Shows feedback message
 * @param {boolean} isCorrect - Whether answer was correct
 * @param {boolean} isTimeout - Whether it was a timeout
 * @returns {string} HTML for feedback message
 */
export function createFeedbackMessage(isCorrect, isTimeout = false) {
    let message;
    
    if (isTimeout) {
        message = UI_CONFIG.timeoutMessage;
    } else if (isCorrect) {
        message = getRandomMessage(UI_CONFIG.correctMessages);
    } else {
        message = getRandomMessage(UI_CONFIG.incorrectMessages);
    }
    
    const className = isCorrect ? 'feedback-correct' : 'feedback-incorrect';
    return `<div class="feedback-message ${className}">${message}</div>`;
}

/**
 * Provides haptic feedback if supported
 * @param {boolean} isCorrect - Whether answer was correct
 */
export function provideHapticFeedback(isCorrect) {
    if ('vibrate' in navigator) {
        if (isCorrect) {
            navigator.vibrate(200);
        } else {
            navigator.vibrate([100, 50, 100]);
        }
    }
}

/**
 * Creates progress bar HTML
 * @param {number} current - Current question index
 * @param {number} total - Total questions
 * @returns {string} HTML for progress bar
 */
export function createProgressBar(current, total) {
    const percentage = ((current + 1) / total) * 100;
    return `
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
    `;
}

/**
 * Creates category badge HTML
 * @param {string} category - Category name
 * @returns {string} HTML for category badge
 */
export function createCategoryBadge(category) {
    return `<span style="color: var(--primary); font-weight: 600; font-size: 0.9rem;">${escapeHtml(category)}</span>`;
}

/**
 * Creates answer HTML
 * @param {Object} item - Answer item with answer and originalIndex
 * @param {number} index - Display index
 * @returns {string} HTML for answer
 */
export function createAnswerHTML(item, index) {
    return `
        <div class="answer" 
             data-index="${index}"
             data-original-index="${item.originalIndex}"
             tabindex="0"
             role="button"
             aria-label="Odpowiedź ${index + 1}">
            <div class="answer-text">${escapeHtml(item.answer)}</div>
            <div class="answer-feedback">${escapeHtml(item.explanation || '')}</div>
        </div>
    `;
}

/**
 * Creates menu option HTML
 * @param {Object} option - Menu option configuration
 * @returns {string} HTML for menu option
 */
export function createMenuOption(option) {
    const { title, description, onClick, extra = '' } = option;
    return `
        <div class="menu-option" tabindex="0" role="button" aria-label="${title}">
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(description)}</p>
            ${extra}
        </div>
    `;
}

/**
 * Creates category stat HTML
 * @param {string} category - Category name
 * @param {Object} stats - Category statistics
 * @param {number} questionCount - Total questions in category
 * @returns {string} HTML for category stat
 */
export function createCategoryStat(category, stats, questionCount) {
    const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    
    return `
        <div class="category-stat category-option" 
             style="cursor: pointer; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; background: var(--bg-primary); border: 2px solid var(--border-color);" 
             data-category="${escapeHtml(category)}"
             tabindex="0"
             role="button"
             aria-label="${escapeHtml(category)}">
            <div>
                <div class="category-name">${escapeHtml(category)}</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem">
                    ${questionCount} pytań • ${stats.total > 0 ? `Odpowiedzi: ${stats.correct}/${stats.total}` : 'Jeszcze nie odpowiadałeś'}
                </div>
            </div>
            <div class="category-score" style="display: flex; align-items: center; gap: 0.5rem;">
                ${percentage}%
                ${percentage === 100 && stats.total > 0 ? '<span style="color: var(--success);">✓</span>' : ''}
            </div>
        </div>
    `;
}

/**
 * Shows loading spinner
 * @param {HTMLElement} container - Container element
 */
export function showLoading(container) {
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
        </div>
    `;
}

/**
 * Shows error message
 * @param {HTMLElement} container - Container element
 * @param {string} message - Error message
 */
export function showError(container, message) {
    container.innerHTML = `
        <div class="quiz-card" style="text-align: center;">
            <h2 style="color: var(--danger);">Błąd</h2>
            <p>${escapeHtml(message)}</p>
            <button class="btn btn-primary" onclick="location.reload()">
                Odśwież stronę
            </button>
        </div>
    `;
}

/**
 * Applies hover effects to elements
 * @param {NodeList} elements - Elements to apply hover to
 */
export function applyHoverEffects(elements) {
    elements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            element.style.borderColor = 'var(--primary)';
        });
        element.addEventListener('mouseleave', () => {
            element.style.borderColor = 'var(--border-color)';
        });
    });
}