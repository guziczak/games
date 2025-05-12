/**
 * Moduł bazowy dla Jazzman - eliminuje duplikację kodu między main.js i jazzman.js
 * Zawiera podstawowe funkcje współdzielone przez oba podejścia
 */

// Eksportujemy stałe używane w obu plikach
export const DEFAULT_TEMPO = 120;
export const DEFAULT_STYLE = 'swing';

/**
 * Inicjalizuje kontekst audio z obsługą wielu przeglądarek
 * @returns {AudioContext|null} Kontekst audio lub null w przypadku błędu
 */
export function initializeAudioContext() {
    try {
        // Tworzenie kontekstu audio z obsługą różnych prefixów przeglądarek
        const audioContext = new (window.AudioContext || window.webkitAudioContext || 
                                window.mozAudioContext || window.msAudioContext)();
        
        // Dodatkowa obsługa dla starszych przeglądarek Safari
        if (!audioContext.createGain) {
            audioContext.createGain = audioContext.createGainNode;
        }
        if (!audioContext.createDelay) {
            audioContext.createDelay = audioContext.createDelayNode;
        }
        if (!audioContext.createScriptProcessor) {
            audioContext.createScriptProcessor = audioContext.createJavaScriptNode;
        }
        
        // Odblokowanie audio context na iOS
        if (audioContext.state === 'suspended' && 'ontouchstart' in window) {
            const unlock = function() {
                audioContext.resume().then(() => {
                    document.body.removeEventListener('touchstart', unlock);
                    document.body.removeEventListener('touchend', unlock);
                });
            };
            document.body.addEventListener('touchstart', unlock, false);
            document.body.addEventListener('touchend', unlock, false);
        }
        
        return audioContext;
    } catch (e) {
        console.error('Web Audio API nie jest obsługiwana w tej przeglądarce:', e);
        return null;
    }
}

/**
 * Wyświetla komunikat o błędzie w interfejsie
 * @param {string} message - Komunikat błędu
 */
export function displayError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Ukryj po 5 sekundach
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        // Fallback, jeśli element errorMessage nie istnieje
        alert('Błąd: ' + message);
    }
}

/**
 * Aktualizacja statusu aplikacji
 * @param {string} message - Komunikat statusu
 */
export function updateStatus(message) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

/**
 * Tworzy efekt wizualny unoszących się nut
 * @param {string} containerId - ID kontenera dla animacji 
 * @param {number} count - Liczba elementów do wygenerowania
 */
export function createJazzEffect(containerId = 'notesAnimation', count = 10) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const symbols = ['♪', '♫', '♬', '🎵', '🎶', '🎷', '🎺', '🎹', '𝄞'];
    
    for (let i = 0; i < count; i++) {
        // Stwórz element nuty
        const note = document.createElement('div');
        note.className = 'note';
        note.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        
        // Losowa pozycja i styl
        note.style.left = `${Math.random() * 100}%`;
        note.style.top = `${Math.random() * 100}%`;
        
        // Losowy kolor
        const hue = Math.random() * 360;
        note.style.color = `hsl(${hue}, 80%, 60%)`;
        
        // Losowe opóźnienie i czas animacji
        note.style.animationDuration = `${2 + Math.random() * 3}s`;
        note.style.animationDelay = `${Math.random() * 0.5}s`;
        
        // Dodaj do kontenera
        container.appendChild(note);
        
        // Usuń po zakończeniu animacji
        setTimeout(() => {
            if (container.contains(note)) {
                container.removeChild(note);
            }
        }, 5000);
    }
}

/**
 * Pobiera tempo odpowiednie dla danego stylu
 * @param {string} style - Styl muzyczny
 * @returns {number} Tempo w BPM
 */
export function getTempoForStyle(style) {
    switch (style) {
        case 'swing':
            return 120 + Math.floor(Math.random() * 20);
        case 'bebop':
            return 160 + Math.floor(Math.random() * 40);
        case 'fusion':
            return 95 + Math.floor(Math.random() * 25);
        case 'modal':
            return 80 + Math.floor(Math.random() * 40);
        default:
            return 120;
    }
}

/**
 * Przełącza widoczność i aktywność przycisku
 * @param {string} buttonId - ID przycisku
 * @param {boolean} active - Czy przycisk ma być aktywny
 * @param {string} labelOn - Etykieta dla stanu aktywnego
 * @param {string} labelOff - Etykieta dla stanu nieaktywnego
 */
export function updateButtonState(buttonId, active, labelOn, labelOff) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.classList.toggle('active', active);
        
        if (labelOn && labelOff) {
            button.textContent = active ? labelOn : labelOff;
        }
    }
}

/**
 * Wykrywa czy aplikacja jest uruchomiona na urządzeniu mobilnym
 * @returns {boolean} true jeśli jest to urządzenie mobilne
 */
export function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Wykrywa możliwości przeglądarki
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @returns {Object} Obiekt z informacjami o możliwościach
 */
export function detectBrowserCapabilities(audioContext) {
    const capabilities = {
        fullSupport: true,
        wavetableSupport: true,
        convolutionSupport: true,
        scriptProcessorSupport: true,
        audioWorkletSupport: false,
        lowLatencySupport: false,
        mobileDevice: isMobileDevice()
    };
    
    // Sprawdzamy podstawowe wsparcie
    if (!audioContext) {
        capabilities.fullSupport = false;
        return capabilities;
    }
    
    // Sprawdzamy wsparcie dla typów oscylatorów
    try {
        const osc = audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.type = 'square';
        osc.type = 'triangle';
    } catch (e) {
        capabilities.wavetableSupport = false;
    }
    
    // Sprawdzamy wsparcie dla ConvolverNode
    try {
        audioContext.createConvolver();
    } catch (e) {
        capabilities.convolutionSupport = false;
    }
    
    // Sprawdzamy wsparcie dla przetwarzania dźwięku
    if ('audioWorklet' in audioContext) {
        capabilities.audioWorkletSupport = true;
        // Preferujemy AudioWorklet zamiast ScriptProcessor
        console.log("Wykryto wsparcie dla AudioWorkletNode (nowoczesna metoda przetwarzania dźwięku)");
    } else {
        // Sprawdzamy wsparcie dla przestarzałego ScriptProcessor
        try {
            audioContext.createScriptProcessor(1024, 1, 1);
            capabilities.scriptProcessorSupport = true;
            console.log("Używanie przestarzałego ScriptProcessorNode - rozważ aktualizację przeglądarki");
        } catch (e) {
            capabilities.scriptProcessorSupport = false;
        }
    }
    
    // Sprawdzamy wsparcie dla niskiego opóźnienia
    capabilities.lowLatencySupport = 'baseLatency' in audioContext && audioContext.baseLatency < 0.01;
    
    return capabilities;
}

/**
 * Pobiera losowy element z tablicy
 * @param {Array} array - Tablica
 * @returns {*} Losowy element
 */
export function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}