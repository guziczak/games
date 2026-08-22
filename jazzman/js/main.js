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
    NOTE_FREQUENCIES
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
    currentOffset: 0,     // offset startu bieżącego występu
    currentTotal: 0,      // długość bieżącego występu w sekundach
    gapBetween: 1.2       // oddech między utworami
};

// Wizualizacja: analizator widma i oś struktury utworu
const viz = {
    analyser: null,
    freqData: null,
    canvas: null,
    cctx: null,
    rafStarted: false
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
    updateStatus('Kliknij „Aktywuj audio”, aby rozpocząć.');
});

/**
 * Inicjalizacja interfejsu użytkownika
 */
function initializeUI() {
    document.getElementById('tempoValue').textContent = `${state.tempo} BPM`;
    document.getElementById('tempo').value = state.tempo;

    state.currentMood = getRandomItem(Object.keys(PREDEFINED_MOODS));
    const moodDisplay = document.getElementById('moodDisplay');
    if (moodDisplay) {
        moodDisplay.textContent = state.currentMood;
    }
}

/**
 * Inicjalizacja wizualizatora (canvas analizatora widma)
 */
function initializeVisualizer() {
    const chordDisplayElement = document.getElementById('chordDisplay');
    if (chordDisplayElement) {
        chordDisplayElement.textContent = '—';
    }

    viz.canvas = document.getElementById('vizCanvas');
    if (viz.canvas) {
        viz.cctx = viz.canvas.getContext('2d');
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            viz.canvas.width = Math.max(1, Math.floor(viz.canvas.clientWidth * dpr));
            viz.canvas.height = Math.max(1, Math.floor(viz.canvas.clientHeight * dpr));
        };
        resize();
        window.addEventListener('resize', resize);
    }
}

/**
 * Pętla animacji: słupki widma + postęp na osi utworu
 */
function startVizLoop() {
    if (viz.rafStarted) return;
    viz.rafStarted = true;

    const draw = () => {
        drawSpectrum();
        updateTimelineProgress();
        requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
}

function drawSpectrum() {
    if (!viz.cctx || !viz.canvas) return;
    const w = viz.canvas.width;
    const h = viz.canvas.height;
    const cctx = viz.cctx;
    cctx.clearRect(0, 0, w, h);

    if (!viz.analyser || !state.isPlaying) {
        // W spoczynku: cienka linia bazowa
        cctx.fillStyle = 'rgba(236, 233, 226, 0.12)';
        cctx.fillRect(0, h - 2, w, 1);
        return;
    }

    viz.analyser.getByteFrequencyData(viz.freqData);
    const bars = 56;
    const usable = Math.floor(viz.freqData.length * 0.72); // ucinamy martwy szczyt pasma
    const step = usable / bars;
    const barW = w / bars;
    for (let i = 0; i < bars; i++) {
        const v = viz.freqData[Math.floor(i * step)] / 255;
        const barH = Math.max(2, v * v * h * 0.95);
        cctx.fillStyle = `rgba(200, 164, 92, ${0.18 + v * 0.62})`;
        cctx.fillRect(i * barW + 1, h - barH, Math.max(1, barW - 2), barH);
    }
}

/**
 * Buduje oś struktury utworu: segment na sekcję, szerokość ~ czas trwania
 */
function renderTimeline(meta, totalSeconds) {
    const el = document.getElementById('timeline');
    if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < meta.sections.length; i++) {
        const start = meta.sections[i].t;
        const end = i + 1 < meta.sections.length ? meta.sections[i + 1].t : totalSeconds;
        const seg = document.createElement('div');
        seg.className = 'timeline__seg';
        seg.style.flexGrow = String(Math.max(0.001, end - start));
        seg.dataset.start = String(start);
        seg.dataset.end = String(end);
        seg.title = meta.sections[i].name;
        const fill = document.createElement('div');
        fill.className = 'timeline__fill';
        seg.appendChild(fill);
        el.appendChild(seg);
    }
}

function updateTimelineProgress() {
    const el = document.getElementById('timeline');
    if (!el || !el.children.length) return;

    let pos = -1;
    if (state.isPlaying && sequencer && performanceState.currentTotal > 0) {
        pos = audioContext.currentTime - sequencer.startTime - sequencer.totalPausedTime
            - performanceState.currentOffset;
    }

    for (const seg of el.children) {
        const start = parseFloat(seg.dataset.start);
        const end = parseFloat(seg.dataset.end);
        const fill = seg.firstChild;
        if (pos <= start) {
            seg.classList.remove('done', 'current');
            fill.style.width = '0%';
        } else if (pos >= end) {
            seg.classList.add('done');
            seg.classList.remove('current');
            fill.style.width = '100%';
        } else {
            seg.classList.add('current');
            seg.classList.remove('done');
            fill.style.width = `${((pos - start) / (end - start)) * 100}%`;
        }
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

        // Analizator widma podpięty pod sumę miksu (tap równoległy)
        try {
            viz.analyser = audioContext.createAnalyser();
            viz.analyser.fftSize = 256;
            viz.analyser.smoothingTimeConstant = 0.82;
            viz.freqData = new Uint8Array(viz.analyser.frequencyBinCount);
            audioEngine.mixer.master.connect(viz.analyser);
        } catch (e) {
            viz.analyser = null;
        }
        startVizLoop();

        state.audioInitialized = true;

        document.getElementById('startButton').textContent = "Start";
        updateStatus("Audio gotowe. Kliknij Start.");

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

    document.getElementById('startButton').textContent = "Stop";
    document.getElementById('startButton').classList.add('active');
    const led = document.getElementById('playLed');
    if (led) led.classList.add('on');

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
    document.getElementById('startButton').textContent = "Start";
    document.getElementById('startButton').classList.remove('active');
    const led = document.getElementById('playLed');
    if (led) led.classList.remove('on');

    if (sequencer) {
        sequencer.clear();
    }

    state.isPlaying = false;

    const sectionLabel = document.getElementById('sectionLabel');
    if (sectionLabel) sectionLabel.textContent = 'zatrzymany';
    updateStatus("Zatrzymano. Kliknij Start, aby kontynuować.");
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
    performanceState.currentOffset = performanceState.nextOffset;
    performanceState.currentTotal = perf.totalSeconds;
    performanceState.nextOffset += perf.totalSeconds + performanceState.gapBetween;

    // Oś struktury utworu + linia metadanych
    renderTimeline(perf.meta, perf.totalSeconds);
    const metaLine = document.getElementById('metaLine');
    if (metaLine) {
        metaLine.textContent =
            `${FORM_LABELS[perf.meta.form] || perf.meta.form} · ${formatChordSym(perf.meta.key)} · ${perf.meta.tempo} BPM`;
    }

    console.log(
        `Jazzman: nowy występ - ${FORM_LABELS[perf.meta.form] || perf.meta.form}, ` +
        `tonacja ${perf.meta.key}, ${perf.meta.tempo} BPM, ${perf.meta.totalBars} taktów`
    );
}

/** Typograficzne bemole i krzyżyki: Bb7b9 -> B♭7♭9 */
function formatChordSym(sym) {
    return String(sym).replace(/b/g, '♭').replace(/#/g, '♯');
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
 * Aktualizuje etykietę bieżącej sekcji utworu
 * @param {string} sectionName - Nazwa sekcji (Intro, Temat, Solo trąbki...)
 */
function updateSectionDisplay(sectionName) {
    const sectionLabel = document.getElementById('sectionLabel');
    if (sectionLabel) {
        sectionLabel.textContent = sectionName;
    }
    updateStatus('Gra na żywo.');
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
        chordDisplay.textContent = formatChordSym(chord);
        chordDisplay.classList.add('pulse');
        setTimeout(() => chordDisplay.classList.remove('pulse'), 140);
    }
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

    // Stan pokazuje kropka chipa (CSS .active), etykieta zostaje bez zmian
    const button = document.getElementById(`${instrument}Toggle`);
    button.classList.toggle('active', state.instruments[instrument]);

    if (audioEngine && audioEngine.mixer) {
        audioEngine.mixer.setMute(instrument, !state.instruments[instrument]);
    }
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
 * Dawny efekt spadających emotek - celowo wyłączony.
 * Nowy interfejs komunikuje ruch analizatorem widma i osią utworu.
 */
function showJazzEffect() { /* no-op */ }

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

// Eksport funkcji dla wywołania z innych modułów (AutoJazz używa tych hooków).
// createJazzEffect to no-op: dawny deszcz emotek nie pasuje do interfejsu.
window.setStyle = requestStyleChangeFromAutoJazz;
window.updateTempo = requestTempoChangeFromAutoJazz;
window.createJazzEffect = function () {};
window.changeRandomMood = changeRandomMood;
