/**
 * Super Jazzman 3.0 - Main Application
 * Główny plik, który integruje wszystkie moduły systemu
 */

import {
    JAZZ_PROGRESSIONS,
    JAZZ_CHORDS,
    NOTE_FREQUENCIES,
    INTERVALS,
    CHORD_COLORS,
    getChordFrequencies,
    generateMelodicPhrase,
    generateWalkingBass,
    parseChordName
} from './modules/musicTheory.js';

import {
    createAudioEngine
} from './modules/audioSynthesis.js';

import {
    createDynamicMixingSystem
} from './modules/dynamicMixer.js';

import {
    JazzSequencer,
    ConductorSequencer,
    createDrumPatternForStyle,
    createDrumDynamicVariant,
    mixDrumPatterns
} from './modules/sequencer.js';

import {
    DynamicMixer,
    MusicalDynamics
} from './modules/dynamicMixer.js';

import {
    AutoJazz,
    createAutoJazz,
    ImprovisationManager,
    PREDEFINED_MOODS
} from './modules/autoJazz.js';

// Import funkcji z nowego wspólnego modułu core.js
import {
    initializeAudioContext,
    displayError,
    updateStatus,
    createJazzEffect,
    getTempoForStyle,
    updateButtonState,
    detectBrowserCapabilities,
    getRandomItem,
    DEFAULT_TEMPO,
    DEFAULT_STYLE
} from './modules/core.js';

// Globalne zmienne
let audioContext;
let audioEngine;
let sequencer;
let conductor;
let mixer;
let autoJazz;
let dynamicMixingSystem;

// Stan aplikacji
const state = {
    audioInitialized: false,
    isPlaying: false,
    tempo: DEFAULT_TEMPO,
    complexity: 0.5,
    currentChord: null,
    currentProgression: [],
    progressionIndex: 0,
    currentMood: 'spokojny',
    style: DEFAULT_STYLE,
    autoJazzActive: false,
    instruments: {
        piano: true,
        bass: true,
        drums: true,
        trumpet: true
    }
};

/**
 * Inicjalizacja aplikacji po załadowaniu strony
 */
document.addEventListener('DOMContentLoaded', () => {
    // Inicjalizacja UI
    initializeUI();
    
    // Przypisanie obsługi zdarzeń
    setupEventListeners();
    
    // Inicjalizacja wizualizatora
    initializeVisualizer();
    
    // Aktualizacja statusu
    updateStatus("Kliknij AKTYWUJ JAZZOWE AUDIO, aby rozpocząć...");
});

/**
 * Inicjalizacja interfejsu użytkownika
 */
function initializeUI() {
    // Inicjalizacja sliderów i przycisków
    document.getElementById('tempoValue').textContent = `${state.tempo} BPM`;
    document.getElementById('tempo').value = state.tempo;
    
    // Animacja przycisku start
    document.getElementById('startButton').style.animation = 'pulse 1.5s infinite';
    
    // Ustaw domyślny nastrój
    state.currentMood = getRandomItem(Object.keys(PREDEFINED_MOODS));
    const moodDisplay = document.getElementById('moodDisplay');
    if (moodDisplay) {
        moodDisplay.textContent = state.currentMood;
    }
}

/**
 * Inicjalizacja wizualizatora
 */
function initializeVisualizer() {
    const visualizerElement = document.getElementById('visualizer');
    const chordDisplayElement = document.getElementById('chordDisplay');
    const moodDisplayElement = document.getElementById('moodDisplay');
    
    if (visualizerElement && chordDisplayElement && moodDisplayElement) {
        // Ustawienie początkowych wartości
        chordDisplayElement.textContent = '-';
        moodDisplayElement.textContent = state.currentMood;
    }
}

/**
 * Obsługa zdarzeń
 */
function setupEventListeners() {
    // Główny przycisk
    document.getElementById('startButton').addEventListener('click', handleMainButtonClick);
    
    // Przyciski instrumentów
    document.getElementById('pianoToggle').addEventListener('click', () => toggleInstrument('piano'));
    document.getElementById('bassToggle').addEventListener('click', () => toggleInstrument('bass'));
    document.getElementById('drumsToggle').addEventListener('click', () => toggleInstrument('drums'));
    document.getElementById('trumpetToggle').addEventListener('click', () => toggleInstrument('trumpet'));
    
    // Przyciski stylu
    document.getElementById('styleSwing').addEventListener('click', () => setStyle('swing'));
    document.getElementById('styleBebop').addEventListener('click', () => setStyle('bebop'));
    document.getElementById('styleFusion').addEventListener('click', () => setStyle('fusion'));
    document.getElementById('styleModal').addEventListener('click', () => setStyle('modal'));
    
    // Suwak tempa
    document.getElementById('tempo').addEventListener('input', updateTempo);
    
    // Przycisk Auto-Jazz
    document.getElementById('autoJazzButton').addEventListener('click', toggleAutoJazz);
}

/**
 * Obsługa głównego przycisku
 */
function handleMainButtonClick() {
    if (!state.audioInitialized) {
        // Inicjalizacja audio
        initializeAudio();
    } else {
        // Przełączenie odtwarzania
        togglePlayJazz();
    }
}

/**
 * Inicjalizacja audio
 */
async function initializeAudio() {
    try {
        // Aktualizacja statusu
        updateStatus("Inicjalizacja audio...");

        // Tworzenie kontekstu audio przy użyciu funkcji z core.js
        audioContext = initializeAudioContext();

        if (!audioContext) {
            displayError('Twoja przeglądarka nie obsługuje Web Audio API. Wypróbuj Chrome, Firefox lub Safari.');
            return;
        }

        // Inicjalizacja silnika audio - czekamy na asynchroniczną inicjalizację
        audioEngine = await createAudioEngine(audioContext);

        // Uruchamiamy okresowe sprawdzanie dostępności AudioWorklet
        setInterval(() => {
            if (audioEngine && audioEngine.checkWorkletTransition) {
                audioEngine.checkWorkletTransition();
            }
        }, 10000); // Co 10 sekund sprawdzamy czy możemy płynnie przejść na AudioWorklet

        // Inicjalizacja systemu miksowania dynamicznego
        dynamicMixingSystem = createDynamicMixingSystem(audioEngine);

        // Inicjalizacja sekwencera
        sequencer = new JazzSequencer(audioContext);
        sequencer.setTempo(state.tempo);

        // Inicjalizacja dyrygenta
        conductor = new ConductorSequencer(audioContext);
        conductor.setTempo(state.tempo);

        // Inicjalizacja Auto-Jazz
        autoJazz = createAutoJazz(audioEngine, dynamicMixingSystem, sequencer);
        autoJazz.init(
            document.getElementById('autoJazzProgress'),
            document.getElementById('autoJazzContainer'),
            document.getElementById('autoJazzButton')
        );

        // Ustaw początkowy nastrój i styl
        dynamicMixingSystem.setMood(state.currentMood);
        dynamicMixingSystem.setStyle(state.style);

        // Ustawienie stanu
        state.audioInitialized = true;

        // Aktualizacja UI
        document.getElementById('startButton').textContent = "START JAZZU";
        document.getElementById('startButton').style.animation = '';
        updateStatus("Audio zainicjalizowane! Kliknij START, aby rozpocząć jazzowanie!");

        console.log("Audio successfully initialized!");

        // Odtwórz krótki dźwięk, aby przetestować audio
        playTestSound();

    } catch (error) {
        console.error("Błąd inicjalizacji audio:", error);
        displayError("Nie udało się zainicjalizować audio: " + error.message);
    }
}

/**
 * Przełączanie odtwarzania
 */
function togglePlayJazz() {
    if (state.isPlaying) {
        stopJazz();
    } else {
        startJazz();
    }
}

/**
 * Rozpoczęcie odtwarzania
 */
function startJazz() {
    if (!state.audioInitialized) {
        updateStatus("Najpierw zainicjalizuj audio!");
        return;
    }
    
    // Aktualizacja UI
    document.getElementById('startButton').textContent = "STOP JAZZU";
    document.getElementById('startButton').classList.add('active');
    
    // Generuj nową progresję akordów
    generateNewProgression();
    
    // Ustaw stan odtwarzania
    state.isPlaying = true;
    state.progressionIndex = 0;
    
    // Uruchom sekwencer z zaplanowaną muzyką
    scheduleMusic();
    sequencer.start();
    
    // Aktualizuj status
    updateStatus(`Gra: ${state.currentChord || 'ładowanie...'}; Nastrój: ${state.currentMood}`);
    
    // Efekt wizualny
    showJazzEffect();
}

/**
 * Zatrzymanie odtwarzania
 */
function stopJazz() {
    // Aktualizacja UI
    document.getElementById('startButton').textContent = "START JAZZU";
    document.getElementById('startButton').classList.remove('active');
    
    // Zatrzymaj sekwencer
    if (sequencer) {
        sequencer.stop();
    }
    
    // Ustaw stan
    state.isPlaying = false;
    
    // Wyczyść wizualizację
    clearVisualizer();
    
    // Aktualizuj status
    updateStatus("Zatrzymano. Kliknij START, aby kontynuować...");
}

/**
 * Planowanie sekwencji muzycznej
 */
function scheduleMusic() {
    if (!sequencer || state.currentProgression.length === 0) return;
    
    // Resetuj sekwencer
    sequencer.reset();
    
    // Oblicz czas trwania taktu w sekundach
    const beatsPerBar = 4; // Metrum 4/4
    const secondsPerBeat = 60 / state.tempo;
    const barDuration = beatsPerBar * secondsPerBeat;
    
    // Utwórz sekwencję akordów
    const chordSequence = sequencer.createChordProgression(
        state.currentProgression, 
        1, // 1 takt na akord
        (time, data) => {
            // Callback dla każdego akordu
            playJazzChord(data.chord, barDuration);
            updateCurrentChord(data.chord);
        }
    );
    
    // Utwórz sekwencję perkusyjną
    const drumPattern = createDrumPatternForStyle(state.style, 2); // 2-taktowy wzór
    const dynamicVariant = createDrumDynamicVariant(drumPattern, 'medium');
    
    const drumSequence = sequencer.createDrumPattern(
        dynamicVariant,
        2, // 2 takty wzorca
        (time, data) => {
            // Callback dla każdego uderzenia perkusji
            if (state.instruments.drums) {
                switch (data.type) {
                    case 'kick':
                        dynamicMixingSystem.player.playKick(time, data.velocity, data.options);
                        break;
                    case 'snare':
                        dynamicMixingSystem.player.playSnare(time, data.velocity, data.options);
                        break;
                    case 'hihat':
                        dynamicMixingSystem.player.playHiHat(time, data.velocity, data.options.open, data.options);
                        break;
                    case 'crash':
                        audioEngine.instruments.drums.playCrash(time, data.velocity, data.options);
                        break;
                    case 'tom':
                        audioEngine.instruments.drums.playTom(time, data.options.frequency, data.velocity, data.options);
                        break;
                }
            }
        }
    );
    
    // Dodaj sekwencje do sekwencera
    sequencer.addSequence(chordSequence);
    sequencer.addSequence(drumSequence);
    
    // Jeśli autoJazz jest aktywny, zaktualizuj jego stan
    if (state.autoJazzActive && autoJazz) {
        autoJazz.updateCurrentProgression(state.currentProgression);
    }
}

/**
 * Odtwarzanie akordu jazzowego
 * @param {string} chordName - Nazwa akordu
 * @param {number} duration - Czas trwania w sekundach
 */
function playJazzChord(chordName, duration) {
    if (!audioEngine || !chordName) return;
    
    // Aktualizuj bieżący akord
    state.currentChord = chordName;
    updateChordDisplay(chordName);
    
    // Pobierz częstotliwości dla akordu
    const frequencies = getChordFrequencies(chordName);
    
    // Czas aktualny
    const now = audioContext.currentTime;
    
    // Odtwórz wszystkie instrumenty
    if (state.instruments.piano) {
        dynamicMixingSystem.player.playPianoChord(frequencies, now, duration);
    }
    
    if (state.instruments.bass) {
        // Odtwórz linię basową
        const bassPattern = generateWalkingBass(chordName, 4, state.style);
        
        bassPattern.forEach(note => {
            const noteTime = now + note.time * duration;
            const noteDuration = note.duration * duration;
            dynamicMixingSystem.player.playBass(note.frequency, noteTime, noteDuration, note.velocity);
        });
    }
    
    if (state.instruments.trumpet && Math.random() < 0.3) {
        // Trąbka gra rzadziej - tylko z 30% prawdopodobieństwem
        if (state.autoJazzActive && autoJazz) {
            // Użyj Auto-Jazz do improwizacji
            const trumpetImprov = autoJazz.generateTrumpetImprovisation(4, 5);
            
            if (trumpetImprov && trumpetImprov.length > 0) {
                trumpetImprov.forEach(note => {
                    const noteTime = now + note.time * duration;
                    const noteDuration = note.duration * duration;
                    dynamicMixingSystem.player.playTrumpet(
                        note.frequency, 
                        noteTime, 
                        noteDuration, 
                        note.velocity
                    );
                });
            }
        } else {
            // Prosta improwizacja bez Auto-Jazz
            const simpleImprov = generateMelodicPhrase(chordName, 3, 5);
            
            simpleImprov.forEach(note => {
                const noteTime = now + note.time * duration;
                const noteDuration = note.duration * duration;
                dynamicMixingSystem.player.playTrumpet(
                    note.frequency, 
                    noteTime, 
                    noteDuration, 
                    note.velocity
                );
            });
        }
    }
}

/**
 * Aktualizuje wyświetlanie aktualnego akordu
 * @param {string} chord - Nazwa akordu
 */
function updateCurrentChord(chord) {
    state.currentChord = chord;
    updateChordDisplay(chord);
    
    // Aktualizuj AutoJazz
    if (state.autoJazzActive && autoJazz) {
        autoJazz.updateCurrentChord(chord);
    }
}

/**
 * Aktualizuje wyświetlanie akordu
 * @param {string} chord - Nazwa akordu
 */
function updateChordDisplay(chord) {
    if (!chord) return;
    
    const chordDisplay = document.getElementById('chordDisplay');
    if (chordDisplay) {
        chordDisplay.textContent = chord;
        chordDisplay.style.color = getChordColor(chord);
        
        // Dodaj efekt pulsu
        chordDisplay.classList.add('pulse');
        setTimeout(() => chordDisplay.classList.remove('pulse'), 300);
    }
}

/**
 * Pobiera kolor dla akordu
 * @param {string} chordName - Nazwa akordu
 * @returns {string} Kolor w formacie HSL
 */
function getChordColor(chordName) {
    if (!chordName) return 'hsl(60, 80%, 60%)'; // Domyślny złoty
    
    // Znajdź typ akordu
    let chordType = '';
    
    if (chordName.includes('maj9')) {
        chordType = 'maj9';
    } else if (chordName.includes('maj7')) {
        chordType = 'maj7';
    } else if (chordName.includes('m7b5')) {
        chordType = 'm7b5';
    } else if (chordName.includes('m9')) {
        chordType = 'm9';
    } else if (chordName.includes('m7')) {
        chordType = 'm7';
    } else if (chordName.includes('7b9')) {
        chordType = '7b9';
    } else if (chordName.includes('13')) {
        chordType = '13';
    } else if (chordName.includes('9')) {
        chordType = '9';
    } else if (chordName.includes('7')) {
        chordType = '7';
    } else if (chordName.includes('dim')) {
        chordType = 'dim7';
    } else if (chordName.includes('sus')) {
        chordType = 'sus4';
    } else if (chordName.includes('m6')) {
        chordType = 'm6';
    } else if (chordName.includes('6')) {
        chordType = '6';
    }
    
    const color = CHORD_COLORS[chordType];
    if (color) {
        return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
    }
    
    return 'hsl(60, 80%, 60%)'; // Domyślny złoty
}

/**
 * Ustawia styl muzyczny
 * @param {string} style - Styl muzyczny
 */
function setStyle(style) {
    // Aktualizuj stan
    state.style = style;
    
    // Aktualizuj przyciski
    document.getElementById('styleSwing').classList.toggle('active', style === 'swing');
    document.getElementById('styleBebop').classList.toggle('active', style === 'bebop');
    document.getElementById('styleFusion').classList.toggle('active', style === 'fusion');
    document.getElementById('styleModal').classList.toggle('active', style === 'modal');
    
    // Dostosuj tempo do stylu używając funkcji z core.js
    const newTempo = getTempoForStyle(style);
    
    // Aktualizuj tempo
    document.getElementById('tempo').value = newTempo;
    updateTempo();
    
    // Aktualizuj system dynamicznego miksowania
    if (dynamicMixingSystem) {
        dynamicMixingSystem.setStyle(style);
    }
    
    // Aktualizuj Auto-Jazz
    if (autoJazz) {
        autoJazz.updateStyle(style);
    }
    
    // Generuj nową progresję akordów dopasowaną do stylu
    generateNewProgression();
    
    // Jeśli odtwarzamy, zaktualizuj sekwencję
    if (state.isPlaying) {
        stopJazz();
        startJazz();
    }
}

/**
 * Aktualizacja tempa
 */
function updateTempo() {
    state.tempo = parseInt(document.getElementById('tempo').value);
    document.getElementById('tempoValue').textContent = `${state.tempo} BPM`;
    
    // Aktualizuj sekwencer
    if (sequencer) {
        sequencer.setTempo(state.tempo);
    }
    
    // Aktualizuj dyrygenta
    if (conductor) {
        conductor.setTempo(state.tempo);
    }
    
    // Aktualizuj Auto-Jazz
    if (autoJazz) {
        autoJazz.updateTempo(state.tempo);
    }
    
    // Jeśli odtwarzamy, uruchom ponownie
    if (state.isPlaying) {
        stopJazz();
        startJazz();
    }
}

/**
 * Przełączanie instrumentu
 * @param {string} instrument - Nazwa instrumentu
 */
function toggleInstrument(instrument) {
    // Aktualizuj stan
    state.instruments[instrument] = !state.instruments[instrument];
    
    // Aktualizuj przycisk
    const button = document.getElementById(`${instrument}Toggle`);
    button.classList.toggle('active', state.instruments[instrument]);
    
    const label = instrument.charAt(0).toUpperCase() + instrument.slice(1);
    button.textContent = `${label}: ${state.instruments[instrument] ? 'ON' : 'OFF'}`;
    
    // Aktualizuj mikser
    if (audioEngine && audioEngine.mixer) {
        audioEngine.mixer.setMute(instrument, !state.instruments[instrument]);
    }
    
    // Efekt wizualny
    showJazzEffect();
}

/**
 * Przełączanie trybu Auto-Jazz
 */
function toggleAutoJazz() {
    state.autoJazzActive = !state.autoJazzActive;
    
    if (state.autoJazzActive) {
        // Uruchom Auto-Jazz
        if (autoJazz) {
            autoJazz.start();
            
            // Jeśli nie odtwarzamy, uruchom odtwarzanie
            if (!state.isPlaying && state.audioInitialized) {
                startJazz();
            }
        }
        
        updateStatus(`Auto-Jazz WŁĄCZONY! Nastrój: ${state.currentMood}`);
    } else {
        // Zatrzymaj Auto-Jazz
        if (autoJazz) {
            autoJazz.stop();
        }
        
        updateStatus(`Auto-Jazz wyłączony. Nastrój: ${state.currentMood}`);
    }
}

/**
 * Generowanie nowej progresji akordów
 */
function generateNewProgression() {
    // Wybierz progresję odpowiednią dla stylu
    const progressions = JAZZ_PROGRESSIONS[state.style] || JAZZ_PROGRESSIONS.swing;
    
    // Wybierz losową progresję z listy
    const randomIndex = Math.floor(Math.random() * progressions.length);
    state.currentProgression = [...progressions[randomIndex]];
    
    console.log(`Nowa progresja (${state.style}):`, state.currentProgression);
    
    // Resetuj indeks
    state.progressionIndex = 0;
    
    // Jeśli odtwarzamy, zaktualizuj sekwencję
    if (state.isPlaying && sequencer) {
        stopJazz();
        startJazz();
    }
}

/**
 * Efekt wizualny dla akcji jazzowych
 */
function showJazzEffect() {
    // Używamy funkcji z modułu core.js
    createJazzEffect('notesAnimation', 10);
}

/**
 * Wyczyszczenie wizualizatora
 */
function clearVisualizer() {
    const visualizer = document.getElementById('visualizer');
    if (visualizer) {
        visualizer.innerHTML = '';
    }
}

/**
 * Odtwarzanie dźwięku testowego
 */
function playTestSound() {
    if (!audioEngine || !audioContext) return;
    
    // Odtwórz krótki akord testowy
    const time = audioContext.currentTime;
    
    // Prosta sekwencja C Major
    if (audioEngine.instruments.piano) {
        audioEngine.instruments.piano.playChord([
            NOTE_FREQUENCIES.C * 2,
            NOTE_FREQUENCIES.E * 2,
            NOTE_FREQUENCIES.G * 2
        ], time, 1.0, 0.5);
    }
    
    // Efekt wizualny
    showJazzEffect();
}

// updateStatus, displayError i getRandomItem są importowane z core.js

/**
 * Zmiana nastroju muzycznego
 * @param {string} mood - Nowy nastrój
 */
function changeMood(mood) {
    state.currentMood = mood;
    
    // Aktualizuj wyświetlanie
    const moodDisplay = document.getElementById('moodDisplay');
    if (moodDisplay) {
        moodDisplay.textContent = mood;
    }
    
    // Aktualizuj system dynamicznego miksowania
    if (dynamicMixingSystem) {
        dynamicMixingSystem.setMood(mood);
    }
    
    // Aktualizuj Auto-Jazz
    if (autoJazz) {
        autoJazz.updateMood(mood);
    }
}

/**
 * Losowa zmiana nastroju
 */
function changeRandomMood() {
    const moods = Object.keys(PREDEFINED_MOODS);
    const newMood = moods[Math.floor(Math.random() * moods.length)];
    changeMood(newMood);
}

// Eksport funkcji dla wywołania z innych modułów
window.setStyle = setStyle;
window.updateTempo = updateTempo;
window.generateNewProgression = generateNewProgression;
window.createJazzEffect = createJazzEffect;
window.changeRandomMood = changeRandomMood;