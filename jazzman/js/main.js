/**
 * Super Jazzman 3.0 - Main Application
 * Główny plik, który integruje wszystkie moduły systemu.
 *
 * Muzykę komponuje moduł jazzBrain (pełny występ: intro, temat, sola, koda),
 * a main.js jedynie planuje gotowe zdarzenia w sekwencerze i gra je
 * na instrumentach silnika audio - zawsze z czasem podanym przez sekwencer,
 * żeby cały zespół trzymał wspólny groove.
 */

import {
    NOTE_FREQUENCIES,
    CHORD_COLORS
} from './modules/musicTheory.js';

import {
    createAudioEngine
} from './modules/audioSynthesis.js';

import {
    createDynamicMixingSystem
} from './modules/dynamicMixer.js';

import {
    JazzSequencer,
    Sequence
} from './modules/sequencer.js';

import {
    createAutoJazz,
    PREDEFINED_MOODS
} from './modules/autoJazz.js';

import {
    generatePerformance
} from './modules/jazzBrain.js';

// Import funkcji z wspólnego modułu core.js
import {
    initializeAudioContext,
    displayError,
    updateStatus,
    createJazzEffect,
    getTempoForStyle,
    getRandomItem,
    DEFAULT_TEMPO,
    DEFAULT_STYLE
} from './modules/core.js';

// Globalne zmienne
let audioContext;
let audioEngine;
let sequencer;
let autoJazz;
let dynamicMixingSystem;

// Stan aplikacji
const state = {
    audioInitialized: false,
    audioInitializing: false,
    isPlaying: false,
    tempo: DEFAULT_TEMPO,
    currentChord: null,
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

// Stan planowania występów (łańcuch: po kodzie zaczyna się kolejny utwór)
const performanceState = {
    current: null,        // meta bieżącego występu
    currentSeqId: null,   // id sekwencji bieżącego występu
    previousSeqId: null,  // id poprzedniej (do posprzątania)
    nextOffset: 0,        // offset startu kolejnego występu (sekundy od startu sekwencera)
    gapBetween: 1.2       // oddech między utworami
};

// Czytelne nazwy form dla paska statusu
const FORM_LABELS = {
    blues: 'blues 12-taktowy',
    bebopBlues: 'bebop blues',
    rhythm: 'rhythm changes (AABA)',
    soWhat: 'forma modalna (AABA)',
    fusionVamp: 'vamp fusion'
};

/**
 * Inicjalizacja aplikacji po załadowaniu strony
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    setupEventListeners();
    initializeVisualizer();
    updateStatus("Kliknij AKTYWUJ JAZZOWE AUDIO, aby rozpocząć...");
});

/**
 * Inicjalizacja interfejsu użytkownika
 */
function initializeUI() {
    document.getElementById('tempoValue').textContent = `${state.tempo} BPM`;
    document.getElementById('tempo').value = state.tempo;

    document.getElementById('startButton').style.animation = 'pulse 1.5s infinite';

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
    const chordDisplayElement = document.getElementById('chordDisplay');
    const moodDisplayElement = document.getElementById('moodDisplay');

    if (chordDisplayElement && moodDisplayElement) {
        chordDisplayElement.textContent = '-';
        moodDisplayElement.textContent = state.currentMood;
    }
}

/**
 * Obsługa zdarzeń
 */
function setupEventListeners() {
    document.getElementById('startButton').addEventListener('click', handleMainButtonClick);

    document.getElementById('pianoToggle').addEventListener('click', () => toggleInstrument('piano'));
    document.getElementById('bassToggle').addEventListener('click', () => toggleInstrument('bass'));
    document.getElementById('drumsToggle').addEventListener('click', () => toggleInstrument('drums'));
    document.getElementById('trumpetToggle').addEventListener('click', () => toggleInstrument('trumpet'));

    document.getElementById('styleSwing').addEventListener('click', () => setStyle('swing'));
    document.getElementById('styleBebop').addEventListener('click', () => setStyle('bebop'));
    document.getElementById('styleFusion').addEventListener('click', () => setStyle('fusion'));
    document.getElementById('styleModal').addEventListener('click', () => setStyle('modal'));

    document.getElementById('tempo').addEventListener('input', updateTempo);

    document.getElementById('autoJazzButton').addEventListener('click', toggleAutoJazz);
}

/**
 * Obsługa głównego przycisku
 */
function handleMainButtonClick() {
    if (!state.audioInitialized) {
        initializeAudio();
    } else {
        togglePlayJazz();
    }
}

/**
 * Inicjalizacja audio
 */
async function initializeAudio() {
    // Ochrona przed podwójnym kliknięciem w trakcie asynchronicznej inicjalizacji
    if (state.audioInitializing) return;
    state.audioInitializing = true;

    try {
        updateStatus("Inicjalizacja audio...");

        audioContext = initializeAudioContext();

        if (!audioContext) {
            displayError('Twoja przeglądarka nie obsługuje Web Audio API. Wypróbuj Chrome, Firefox lub Safari.');
            return;
        }

        // Inicjalizacja silnika audio - czekamy na asynchroniczną inicjalizację
        audioEngine = await createAudioEngine(audioContext);

        // Okresowe sprawdzanie dostępności AudioWorklet
        setInterval(() => {
            if (audioEngine && audioEngine.checkWorkletTransition) {
                audioEngine.checkWorkletTransition();
            }
        }, 10000);

        // System miksowania dynamicznego (nastroje sterują gainami miksera)
        dynamicMixingSystem = createDynamicMixingSystem(audioEngine);

        // Sekwencer
        sequencer = new JazzSequencer(audioContext);
        sequencer.setTempo(state.tempo);

        // Auto-Jazz (steruje nastrojem i miksem w tle)
        autoJazz = createAutoJazz(audioEngine, dynamicMixingSystem, sequencer);
        autoJazz.init(
            document.getElementById('autoJazzProgress'),
            document.getElementById('autoJazzContainer'),
            document.getElementById('autoJazzButton')
        );

        dynamicMixingSystem.setMood(state.currentMood);
        dynamicMixingSystem.setStyle(state.style);

        state.audioInitialized = true;

        document.getElementById('startButton').textContent = "START JAZZU";
        document.getElementById('startButton').style.animation = '';
        updateStatus("Audio zainicjalizowane! Kliknij START, aby rozpocząć jazzowanie!");

        playTestSound();

    } catch (error) {
        console.error("Błąd inicjalizacji audio:", error);
        displayError("Nie udało się zainicjalizować audio: " + error.message);
        state.audioInitializing = false;
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

    document.getElementById('startButton').textContent = "STOP JAZZU";
    document.getElementById('startButton').classList.add('active');

    state.isPlaying = true;

    // Czysty start: nowy występ od zera
    sequencer.clear();
    performanceState.nextOffset = 0;
    performanceState.currentSeqId = null;
    performanceState.previousSeqId = null;

    schedulePerformance();
    sequencer.start();

    showJazzEffect();
}

/**
 * Zatrzymanie odtwarzania
 */
function stopJazz() {
    document.getElementById('startButton').textContent = "START JAZZU";
    document.getElementById('startButton').classList.remove('active');

    if (sequencer) {
        sequencer.clear();
    }

    state.isPlaying = false;
    clearVisualizer();
    updateStatus("Zatrzymano. Kliknij START, aby kontynuować...");
}

/**
 * Buduje sekwencję z pre-posortowanej listy zdarzeń występu.
 * Omijamy Sequence.addEvent, bo sortuje listę po każdym dodaniu,
 * a występ ma kilka tysięcy zdarzeń.
 */
function buildPerformanceSequence(events) {
    const sequence = new Sequence([], { loop: false });
    sequence.events = events.map(ev => ({
        time: ev.t,
        callback: handlePerformanceEvent,
        data: ev,
        executed: false
    }));
    return sequence;
}

/**
 * Generuje i planuje kolejny występ w łańcuchu.
 */
function schedulePerformance() {
    const perf = generatePerformance({
        style: state.style,
        tempo: state.tempo
    });

    performanceState.current = perf.meta;

    const sequence = buildPerformanceSequence(perf.events);
    const seqId = sequencer.addSequence(sequence, performanceState.nextOffset);

    performanceState.previousSeqId = performanceState.currentSeqId;
    performanceState.currentSeqId = seqId;
    performanceState.nextOffset += perf.totalSeconds + performanceState.gapBetween;

    console.log(
        `Jazzman: nowy występ - ${FORM_LABELS[perf.meta.form] || perf.meta.form}, ` +
        `tonacja ${perf.meta.key}, ${perf.meta.tempo} BPM, ${perf.meta.totalBars} taktów`
    );
}

/**
 * Wykonuje pojedyncze zdarzenie występu.
 * KLUCZOWE: gramy z czasem podanym przez sekwencer (time), nigdy
 * z audioContext.currentTime - inaczej zespół rozjeżdża się z perkusją.
 */
function handlePerformanceEvent(time, ev) {
    if (!audioEngine) return;
    const inst = audioEngine.instruments;

    switch (ev.kind) {
        // --- Sekcja rytmiczna i solisci ---
        case 'piano':
            if (state.instruments.piano) inst.piano.playChord(ev.freqs, time, ev.dur, ev.vel);
            break;
        case 'pianoNote':
            if (state.instruments.piano) inst.piano.play(ev.freq, time, ev.dur, ev.vel);
            break;
        case 'bass':
            if (state.instruments.bass) inst.bass.play(ev.freq, time, ev.dur, ev.vel);
            break;
        case 'trumpet':
            if (state.instruments.trumpet) inst.trumpet.play(ev.freq, time, ev.dur, ev.vel, ev.opts || {});
            break;

        // --- Perkusja ---
        case 'ride':
            if (state.instruments.drums) inst.drums.playHiHat(time, ev.vel, true, { decay: 0.38, tone: 1.0 });
            break;
        case 'rideOpen':
            if (state.instruments.drums) inst.drums.playHiHat(time, ev.vel, true, { decay: 0.55, tone: 0.7 });
            break;
        case 'hat':
            if (state.instruments.drums) inst.drums.playHiHat(time, ev.vel, false, { decay: 0.04 });
            break;
        case 'kick':
            if (state.instruments.drums) inst.drums.playKick(time, ev.vel, {});
            break;
        case 'snare':
            if (state.instruments.drums) inst.drums.playSnare(time, ev.vel, {});
            break;
        case 'crash':
            if (state.instruments.drums) inst.drums.playCrash(time, ev.vel, {});
            break;
        case 'tom':
            if (state.instruments.drums) inst.drums.playTom(time, ev.freq, ev.vel, {});
            break;

        // --- Zdarzenia UI / sterujące ---
        case 'chordDisplay':
            updateCurrentChord(ev.name);
            break;
        case 'section':
            updateSectionDisplay(ev.name);
            break;
        case 'end':
            onPerformanceEnd();
            break;
    }
}

/**
 * Po zakończonym występie planujemy kolejny (nowa forma/tonacja/temat).
 */
function onPerformanceEnd() {
    if (!state.isPlaying) return;

    // Sprzątamy sekwencję sprzed dwóch występów
    if (performanceState.previousSeqId !== null) {
        sequencer.removeSequence(performanceState.previousSeqId);
    }

    schedulePerformance();
}

/**
 * Aktualizuje pasek statusu o bieżącą sekcję utworu
 * @param {string} sectionName - Nazwa sekcji (Intro, Temat, Solo trąbki...)
 */
function updateSectionDisplay(sectionName) {
    const meta = performanceState.current;
    if (!meta) return;
    const formLabel = FORM_LABELS[meta.form] || meta.form;
    updateStatus(`▶ ${sectionName} — ${formLabel}, tonacja ${meta.key}, ${meta.tempo} BPM`);
    showJazzEffect();
}

/**
 * Aktualizuje bieżący akord (wyświetlacz + AutoJazz)
 * @param {string} chord - Nazwa akordu
 */
function updateCurrentChord(chord) {
    state.currentChord = chord;
    updateChordDisplay(chord);

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

    let chordType = '';

    if (chordName.includes('maj9')) {
        chordType = 'maj9';
    } else if (chordName.includes('maj7')) {
        chordType = 'maj7';
    } else if (chordName.includes('m7b5')) {
        chordType = 'm7b5';
    } else if (chordName.includes('dim')) {
        chordType = 'dim7';
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
    } else if (chordName.includes('sus')) {
        chordType = 'sus4';
    } else if (chordName.includes('7')) {
        chordType = '7';
    } else if (chordName.includes('m6')) {
        chordType = 'm6';
    } else if (chordName.includes('6')) {
        chordType = '6';
    }

    const color = CHORD_COLORS[chordType];
    if (color) {
        return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
    }

    return 'hsl(60, 80%, 60%)';
}

/**
 * Ustawia styl muzyczny
 * @param {string} style - Styl muzyczny
 */
function setStyle(style) {
    state.style = style;

    document.getElementById('styleSwing').classList.toggle('active', style === 'swing');
    document.getElementById('styleBebop').classList.toggle('active', style === 'bebop');
    document.getElementById('styleFusion').classList.toggle('active', style === 'fusion');
    document.getElementById('styleModal').classList.toggle('active', style === 'modal');

    // Dostosuj tempo do stylu
    const newTempo = getTempoForStyle(style);
    document.getElementById('tempo').value = newTempo;
    state.tempo = newTempo;
    document.getElementById('tempoValue').textContent = `${state.tempo} BPM`;
    if (sequencer) sequencer.setTempo(state.tempo);

    if (dynamicMixingSystem) {
        dynamicMixingSystem.setStyle(style);
    }

    if (autoJazz) {
        autoJazz.updateStyle(style);
    }

    // Nowy styl = nowy występ
    restartIfPlaying();
}

// Restart z opóźnieniem, żeby przeciąganie suwaka tempa nie odpalało
// dziesiątek restartów na sekundę
let restartTimer = null;
function restartIfPlaying() {
    if (!state.isPlaying) return;
    clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
        if (state.isPlaying) {
            stopJazz();
            startJazz();
        }
    }, 250);
}

/**
 * Aktualizacja tempa
 */
function updateTempo() {
    state.tempo = parseInt(document.getElementById('tempo').value);
    document.getElementById('tempoValue').textContent = `${state.tempo} BPM`;

    if (sequencer) {
        sequencer.setTempo(state.tempo);
    }

    if (autoJazz) {
        autoJazz.updateTempo(state.tempo);
    }

    restartIfPlaying();
}

/**
 * Przełączanie instrumentu
 * @param {string} instrument - Nazwa instrumentu
 */
function toggleInstrument(instrument) {
    state.instruments[instrument] = !state.instruments[instrument];

    const button = document.getElementById(`${instrument}Toggle`);
    button.classList.toggle('active', state.instruments[instrument]);

    const label = instrument.charAt(0).toUpperCase() + instrument.slice(1);
    button.textContent = `${label}: ${state.instruments[instrument] ? 'ON' : 'OFF'}`;

    if (audioEngine && audioEngine.mixer) {
        audioEngine.mixer.setMute(instrument, !state.instruments[instrument]);
    }

    showJazzEffect();
}

/**
 * Przełączanie trybu Auto-Jazz
 */
function toggleAutoJazz() {
    state.autoJazzActive = !state.autoJazzActive;

    if (state.autoJazzActive) {
        if (autoJazz) {
            autoJazz.start();

            if (!state.isPlaying && state.audioInitialized) {
                startJazz();
            }
        }

        updateStatus(`Auto-Jazz WŁĄCZONY! Nastrój: ${state.currentMood}`);
    } else {
        if (autoJazz) {
            autoJazz.stop();
        }

        updateStatus(`Auto-Jazz wyłączony. Nastrój: ${state.currentMood}`);
    }
}

/**
 * Efekt wizualny dla akcji jazzowych
 */
function showJazzEffect() {
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

    const time = audioContext.currentTime;

    if (audioEngine.instruments.piano) {
        audioEngine.instruments.piano.playChord([
            NOTE_FREQUENCIES.C * 2,
            NOTE_FREQUENCIES.E * 2,
            NOTE_FREQUENCIES.G * 2
        ], time, 1.0, 0.5);
    }

    showJazzEffect();
}

/**
 * Zmiana nastroju muzycznego
 * @param {string} mood - Nowy nastrój
 */
function changeMood(mood) {
    state.currentMood = mood;

    const moodDisplay = document.getElementById('moodDisplay');
    if (moodDisplay) {
        moodDisplay.textContent = mood;
    }

    if (dynamicMixingSystem) {
        dynamicMixingSystem.setMood(mood);
    }

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

/**
 * Warianty zmian dla AutoJazz: bez restartu w środku utworu.
 * Nowe tempo/styl wchodzi w życie od następnego występu (onPerformanceEnd
 * czyta state.* przy generowaniu), dzięki czemu forma utworu się nie łamie.
 */
function requestTempoChangeFromAutoJazz() {
    state.tempo = parseInt(document.getElementById('tempo').value);
    document.getElementById('tempoValue').textContent = `${state.tempo} BPM`;
    if (sequencer) {
        sequencer.setTempo(state.tempo);
    }
}

function requestStyleChangeFromAutoJazz(style) {
    // AutoJazz zna style spoza UI - mapujemy je na najbliższy odpowiednik
    const styleMap = { bossaNova: 'fusion', coolJazz: 'swing' };
    const mapped = styleMap[style] || style;
    if (!['swing', 'bebop', 'fusion', 'modal'].includes(mapped)) return;

    state.style = mapped;
    document.getElementById('styleSwing').classList.toggle('active', mapped === 'swing');
    document.getElementById('styleBebop').classList.toggle('active', mapped === 'bebop');
    document.getElementById('styleFusion').classList.toggle('active', mapped === 'fusion');
    document.getElementById('styleModal').classList.toggle('active', mapped === 'modal');

    if (dynamicMixingSystem) {
        dynamicMixingSystem.setStyle(mapped);
    }
}

// Eksport funkcji dla wywołania z innych modułów (AutoJazz używa tych hooków)
window.setStyle = requestStyleChangeFromAutoJazz;
window.updateTempo = requestTempoChangeFromAutoJazz;
window.createJazzEffect = createJazzEffect;
window.changeRandomMood = changeRandomMood;
