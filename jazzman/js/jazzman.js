// Import funkcji z wspólnego modułu core.js
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

// CZĘŚĆ 1: DEFINICJE I STAŁE

// Lista możliwych nastrojów muzycznych
const MOODS = [
    'spokojny', 'energiczny', 'nastrojowy', 'melancholijny',
    'radosny', 'zaskakujący', 'eksperymentalny', 'minimalistyczny',
    'intensywny', 'kontemplacyjny'
];

// Lista akordów jazzowych
const JAZZ_CHORDS = {
    major7: ['Cmaj7', 'Dbmaj7', 'Dmaj7', 'Ebmaj7', 'Emaj7', 'Fmaj7', 'Gbmaj7', 'Gmaj7', 'Abmaj7', 'Amaj7', 'Bbmaj7', 'Bmaj7'],
    minor7: ['Cm7', 'Dbm7', 'Dm7', 'Ebm7', 'Em7', 'Fm7', 'Gbm7', 'Gm7', 'Abm7', 'Am7', 'Bbm7', 'Bm7'],
    dominant7: ['C7', 'Db7', 'D7', 'Eb7', 'E7', 'F7', 'Gb7', 'G7', 'Ab7', 'A7', 'Bb7', 'B7'],
    half_diminished: ['Cm7b5', 'Dbm7b5', 'Dm7b5', 'Ebm7b5', 'Em7b5', 'Fm7b5', 'Gbm7b5', 'Gm7b5', 'Abm7b5', 'Am7b5', 'Bbm7b5', 'Bm7b5'],
    altered: ['C7b9', 'Db7b9', 'D7b9', 'Eb7b9', 'E7b9', 'F7b9', 'Gb7b9', 'G7b9', 'Ab7b9', 'A7b9', 'Bb7b9', 'B7b9'],
    extended: ['C9', 'Db9', 'D9', 'Eb9', 'E9', 'F9', 'Gb9', 'G9', 'Ab9', 'A9', 'Bb9', 'B9', 'C13', 'G13', 'D13'],
    misc: ['Cmaj9', 'Fmaj9', 'Dm9', 'Gm9', 'Csus4', 'Fsus4', 'C6', 'F6', 'Am6', 'Dm6']
};

// Progresje akordów jazzowych wg stylu
const JAZZ_PROGRESSIONS = {
    swing: [
        ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'], // ii-V-I
        ['Cmaj7', 'Am7', 'Dm7', 'G7'],   // I-vi-ii-V
        ['Dm7', 'G7', 'Em7', 'A7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'] // ii-V-iii-VI-ii-V-I
    ],
    bebop: [
        ['Cmaj7', 'Cm7', 'F7', 'Bbmaj7', 'Bbm7', 'Eb7', 'Abmaj7', 'G7'], // Coltrane changes
        ['Dm7', 'G7', 'Cmaj7', 'A7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'],     // ii-V-I z alteracjami
        ['Cmaj7', 'E7', 'Am7', 'D7', 'Dmaj7', 'F7', 'Bbmaj7', 'G7']      // Pattern z modulacjami
    ],
    fusion: [
        ['Cmaj7', 'Dbmaj7', 'Dmaj7', 'Ebmaj7'],     // Modulacje chromatyczne
        ['Em7', 'A7', 'Dmaj7', 'Gmaj7', 'Cmaj7'],   // Sekwencje kwintowe
        ['Csus4', 'Fsus4', 'Gsus4', 'Ebmaj7', 'Dm7'] // Brzmienia modalne
    ],
    modal: [
        ['Dm7', 'Dm7', 'Dm7', 'Dm7', 'Dm7', 'Dm7', 'Dm7', 'Dm7'],        // Dorian
        ['Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7', 'Fmaj7', 'Fmaj7', 'Cmaj7', 'Cmaj7'], // Ionian
        ['Em7', 'Em7', 'Em7', 'Em7', 'Em7', 'Em7', 'Em7', 'Em7']          // Phrygian
    ]
};

// Częstotliwości dla podstawowych nut (C4, C3, etc.)
const NOTE_FREQUENCIES = {
    'C': 261.63,
    'Db': 277.18,
    'D': 293.66,
    'Eb': 311.13,
    'E': 329.63,
    'F': 349.23,
    'Gb': 369.99,
    'G': 392.00,
    'Ab': 415.30,
    'A': 440.00,
    'Bb': 466.16,
    'B': 493.88
};

// Interwały muzyczne dla akordów (współczynniki dla harmonii)
const INTERVALS = {
    unison: 1,
    minor2nd: 1.0595,
    major2nd: 1.1225,
    minor3rd: 1.1892,
    major3rd: 1.2599,
    perfect4th: 1.3348,
    tritone: 1.4142,
    perfect5th: 1.4983,
    minor6th: 1.5874,
    major6th: 1.6818,
    minor7th: 1.7818,
    major7th: 1.8877,
    octave: 2
};

// Główne kolory dla typów akordów
const CHORD_COLORS = {
    'maj7': { h: 60, s: 80, l: 60 },   // złoty
    'maj9': { h: 40, s: 80, l: 60 },   // pomarańczowy
    'm7': { h: 240, s: 70, l: 60 },    // niebieski
    'm9': { h: 260, s: 70, l: 60 },    // fioletowy
    '7': { h: 0, s: 70, l: 60 },       // czerwony
    '9': { h: 330, s: 70, l: 60 },     // różowy
    'dim7': { h: 300, s: 70, l: 60 },  // purpurowy
    'm7b5': { h: 280, s: 70, l: 60 },  // fioletowo-purpurowy
    'sus4': { h: 180, s: 70, l: 60 },  // turkusowy
    '13': { h: 30, s: 70, l: 60 },     // jasnopomarańczowy
    '7b9': { h: 345, s: 80, l: 50 },   // bordowy
    '6': { h: 70, s: 70, l: 60 },      // żółto-zielony
    'm6': { h: 200, s: 70, l: 60 }     // niebieskozielony
};

// CZĘŚĆ 2: STAN APLIKACJI I GŁÓWNE KOMPONENTY

// Stan aplikacji
const state = {
    audioInitialized: false,
    audioContext: null,
    isPlaying: false,
    tempo: 120,
    complexity: 0.5,
    currentChord: null,
    currentProgression: [],
    progressionIndex: 0,
    currentMood: 'spokojny',
    style: 'swing',
    autoJazz: false,
    autoJazzTimer: null,
    chordTimer: null,
    piano: true,
    bass: true,
    drums: true,
    trumpet: true,
    instruments: {},
    effects: {}
};

// Obiekt wizualizatora
const visualizer = {
    element: null,
    chordDisplay: null,
    moodDisplay: null,
    keys: [],
    
    init: function() {
        this.element = document.getElementById('visualizer');
        this.chordDisplay = document.getElementById('chordDisplay');
        this.moodDisplay = document.getElementById('moodDisplay');
        this.updateMoodDisplay(state.currentMood);
    },
    
    updateChordDisplay: function(chord) {
        if (!chord) return;
        
        this.chordDisplay.textContent = chord;
        this.chordDisplay.style.color = this.getChordColor(chord);
        
        // Dodaj efekt pulsu
        this.chordDisplay.classList.add('pulse');
        setTimeout(() => this.chordDisplay.classList.remove('pulse'), 300);
    },
    
    updateMoodDisplay: function(mood) {
        this.moodDisplay.textContent = mood;
    },
    
    getChordColor: function(chord) {
        // Znajdź odpowiedni kolor dla akordu
        let chordType = '';
        
        if (chord.includes('maj9')) {
            chordType = 'maj9';
        } else if (chord.includes('maj7')) {
            chordType = 'maj7';
        } else if (chord.includes('m7b5')) {
            chordType = 'm7b5';
        } else if (chord.includes('m9')) {
            chordType = 'm9';
        } else if (chord.includes('m7')) {
            chordType = 'm7';
        } else if (chord.includes('7b9')) {
            chordType = '7b9';
        } else if (chord.includes('13')) {
            chordType = '13';
        } else if (chord.includes('9')) {
            chordType = '9';
        } else if (chord.includes('7')) {
            chordType = '7';
        } else if (chord.includes('dim')) {
            chordType = 'dim7';
        } else if (chord.includes('sus')) {
            chordType = 'sus4';
        } else if (chord.includes('m6')) {
            chordType = 'm6';
        } else if (chord.includes('6')) {
            chordType = '6';
        }
        
        const color = CHORD_COLORS[chordType];
        if (color) {
            return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
        }
        return '#f5c542'; // Domyślny złoty
    },
    
    clearNotes: function() {
        for (let key of this.keys) {
            try {
                if (this.element.contains(key)) {
                    this.element.removeChild(key);
                }
            } catch (e) {
                console.error("Błąd podczas usuwania klawisza:", e);
            }
        }
        this.keys = [];
    },
    
    createNote: function(x, color, duration = 1500) {
        if (!this.element) return;
        
        const key = document.createElement('div');
        key.className = 'key';
        key.style.left = `${x % (this.element.clientWidth - 20)}px`;
        key.style.width = '20px';
        key.style.height = '0px';
        key.style.backgroundColor = color || `hsl(${Math.random() * 360}, 80%, 60%)`;
        
        this.element.appendChild(key);
        this.keys.push(key);
        
        // Animacja pojawienia się
        setTimeout(() => {
            key.style.height = '80px';
            key.style.opacity = '0.8';
        }, 0);
        
        // Animacja zniknięcia
        setTimeout(() => {
            key.style.opacity = '0';
            setTimeout(() => {
                if (this.element.contains(key)) {
                    this.element.removeChild(key);
                }
                const index = this.keys.indexOf(key);
                if (index > -1) {
                    this.keys.splice(index, 1);
                }
            }, 500);
        }, duration);
        
        // Ogranicz liczbę nut
        while (this.keys.length > 50) {
            const oldKey = this.keys.shift();
            if (this.element.contains(oldKey)) {
                this.element.removeChild(oldKey);
            }
        }
        
        return key;
    }
};

// Obiekt Auto-Jazz (sterownik automatycznej improwizacji)
const autoJazz = {
    active: false,
    progress: 0,
    direction: 1,
    maxValue: 100,
    progressBar: null,
    container: null,
    button: null,
    
    init: function() {
        this.progressBar = document.getElementById('autoJazzProgress');
        this.container = document.getElementById('autoJazzContainer');
        this.button = document.getElementById('autoJazzButton');
        this.updateVisuals();
    },
    
    updateVisuals: function() {
        if (this.active) {
            this.container.classList.add('auto-jazz-active');
            this.button.textContent = 'AUTO-JAZZ AKTYWNY!';
            this.button.classList.add('improvising');
        } else {
            this.container.classList.remove('auto-jazz-active');
            this.button.textContent = 'TRYB AUTO-JAZZ';
            this.button.classList.remove('improvising');
            this.progress = 0;
        }
        
        this.progressBar.style.width = `${this.progress}%`;
    },
    
    start: function() {
        this.active = true;
        this.progress = 0;
        this.direction = 1;
        this.updateVisuals();
        
        // Uruchom timer
        if (state.autoJazzTimer) {
            clearInterval(state.autoJazzTimer);
        }
        
        state.autoJazzTimer = setInterval(() => this.update(), 400);
    },
    
    stop: function() {
        this.active = false;
        
        // Zatrzymaj timer
        if (state.autoJazzTimer) {
            clearInterval(state.autoJazzTimer);
            state.autoJazzTimer = null;
        }
        
        this.updateVisuals();
    },
    
    update: function() {
        // Aktualizuj progres
        this.progress += this.direction * (5 + Math.random() * 10);
        
        // Ogranicz progres do zakresu 0-100
        if (this.progress >= this.maxValue) {
            this.progress = this.maxValue;
            this.direction = -1;
            this.takeAction(); // Wykonaj akcję po osiągnięciu maksimum
        } else if (this.progress <= 0) {
            this.progress = 0;
            this.direction = 1;
        }
        
        // Aktualizuj wizualizację
        this.progressBar.style.width = `${this.progress}%`;
    },
    
    takeAction: function() {
        if (!state.isPlaying) {
            // Jeśli nie odtwarzamy, uruchom odtwarzanie
            if (state.audioInitialized) {
                togglePlayJazz();
            }
            return;
        }
        
        // Wybierz losową akcję
        const action = Math.random();
        
        if (action < 0.3) {
            // Zmień nastrój
            changeRandomMood();
        } else if (action < 0.5) {
            // Zmień styl
            changeRandomStyle();
        } else if (action < 0.8) {
            // Zmień progresję akordów
            generateNewProgression();
        } else {
            // Zmień tempo
            changeRandomTempo();
        }
        
        // Efekt wizualny
        createJazzEffect();
    }
};

// CZĘŚĆ 3: INICJALIZACJA APLIKACJI

// Funkcja inicjalizująca aplikację
function initializeApp() {
    // Inicjalizuj wizualizator
    visualizer.init();
    
    // Inicjalizuj Auto-Jazz
    autoJazz.init();
    
    // Ustaw domyślny nastrój
    state.currentMood = MOODS[Math.floor(Math.random() * MOODS.length)];
    visualizer.updateMoodDisplay(state.currentMood);
    
    // Przypisz obsługę zdarzeń
    setupEventListeners();
    
    // Zaaktualizuj status
    updateStatus("Kliknij AKTYWUJ JAZZOWE AUDIO, aby rozpocząć...");
    
    // Animuj przycisk
    document.getElementById('startButton').style.animation = 'pulse 1.5s infinite';
}

// Obsługa zdarzeń
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

// Obsługa głównego przycisku
function handleMainButtonClick() {
    if (!state.audioInitialized) {
        // Inicjalizacja audio
        initializeAudio();
    } else {
        // Przełączenie odtwarzania
        togglePlayJazz();
    }
}

// CZĘŚĆ 4: INICJALIZACJA AUDIO I INSTRUMENTÓW

// Inicjalizacja kontekstu audio
function initializeAudio() {
    try {
        // Aktualizuj status
        updateStatus("Inicjalizacja audio...");

        // Tworzenie kontekstu audio przy użyciu funkcji z core.js
        state.audioContext = initializeAudioContext();

        if (!state.audioContext) {
            displayError('Twoja przeglądarka nie obsługuje Web Audio API. Wypróbuj Chrome, Firefox lub Safari.');
            return;
        }
        
        // Inicjalizacja instrumentów
        initializeInstruments();
        
        // Ustawienie stanu
        state.audioInitialized = true;
        
        // Aktualizacja UI
        document.getElementById('startButton').textContent = "START JAZZU";
        updateStatus("Audio zainicjalizowane! Kliknij START, aby rozpocząć jazzowanie!");
        
        console.log("Audio successfully initialized!");
        
        // Odtwórz krótki dźwięk, aby przetestować audio
        playTestSound();
        
    } catch (error) {
        console.error("Błąd inicjalizacji audio:", error);
        displayError("Nie udało się zainicjalizować audio: " + error.message);
    }
}

// Inicjalizacja instrumentów
function initializeInstruments() {
    // Master gain node - główne sterowanie głośnością
    state.masterGain = state.audioContext.createGain();
    state.masterGain.gain.value = 0.7;
    state.masterGain.connect(state.audioContext.destination);
    
    // Reverb (pogłos) - wspólny efekt
    createReverbEffect();
    
    // Inicjalizacja instrumentów
    initPiano();
    initBass();
    initDrums();
    initTrumpet();
}

// Stworzenie efektu reverb
function createReverbEffect() {
    // Tworzymy konwolucyjny reverb
    state.effects.reverb = state.audioContext.createConvolver();
    
    // Tworzymy bufor impulsu reverbu
    const reverbTime = 2; // czas reverbu w sekundach
    const sampleRate = state.audioContext.sampleRate;
    const bufferLength = sampleRate * reverbTime;
    const buffer = state.audioContext.createBuffer(2, bufferLength, sampleRate);
    
    // Wypełniamy lewy kanał
    const leftChannel = buffer.getChannelData(0);
    // Wypełniamy prawy kanał
    const rightChannel = buffer.getChannelData(1);
    
    // Generujemy prosty impuls reverbu
    for (let i = 0; i < bufferLength; i++) {
        // Decreasing exponential
        const amplitude = Math.pow(1 - i / bufferLength, 1.5);
        leftChannel[i] = (Math.random() * 2 - 1) * amplitude;
        rightChannel[i] = (Math.random() * 2 - 1) * amplitude;
    }
    
    // Przypisujemy bufor
    state.effects.reverb.buffer = buffer;
    
    // Tworzymy dry/wet mix
    state.effects.reverbDry = state.audioContext.createGain();
    state.effects.reverbWet = state.audioContext.createGain();
    
    state.effects.reverbDry.gain.value = 0.7;
    state.effects.reverbWet.gain.value = 0.3;
    
    // Podłączamy
    state.effects.reverbDry.connect(state.masterGain);
    state.effects.reverb.connect(state.effects.reverbWet);
    state.effects.reverbWet.connect(state.masterGain);
}

// Inicjalizacja fortepianu
function initPiano() {
    state.instruments.piano = {
        output: state.audioContext.createGain(),
        
        play: function(frequency, time, duration, velocity = 0.7) {
            try {
                // Oscylator (główny dźwięk)
                const osc = state.audioContext.createOscillator();
                osc.type = 'triangle';
                osc.frequency.value = frequency;
                
                // Obwiednia amplitudy (ADSR)
                const gainNode = state.audioContext.createGain();
                
                // Parametry obwiedni
                const now = state.audioContext.currentTime;
                const startTime = time || now;
                const attack = 0.02;
                const decay = 0.2;
                const sustain = 0.6;
                const release = 0.8;
                
                // Ustaw obwiednię
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(velocity, startTime + attack);
                gainNode.gain.linearRampToValueAtTime(velocity * sustain, startTime + attack + decay);
                gainNode.gain.setValueAtTime(velocity * sustain, startTime + duration - release);
                gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
                
                // Filtry dla bogatszego brzmienia
                const filter = state.audioContext.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 2000 + (velocity * 2000);
                
                // Dodatkowy oscylator dla harmonicznych
                const osc2 = state.audioContext.createOscillator();
                osc2.type = 'sine';
                osc2.frequency.value = frequency * 2; // Oktawa wyżej
                
                const gainNode2 = state.audioContext.createGain();
                gainNode2.gain.value = velocity * 0.2; // Cichszy
                
                // Połączenia
                osc.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(this.output);
                
                osc2.connect(gainNode2);
                gainNode2.connect(this.output);
                
                // Start i stop
                osc.start(startTime);
                osc2.start(startTime);
                
                osc.stop(startTime + duration);
                osc2.stop(startTime + duration);
                
                // Wizualizacja
                const xPos = Math.random() * visualizer.element.clientWidth;
                const color = `hsl(${(frequency % 200) + 30}, 80%, 60%)`;
                const noteVisual = visualizer.createNote(xPos, color);
                
                // Dodanie animacji dla zagranych nut
                if (noteVisual) {
                    noteVisual.classList.add('active');
                    setTimeout(() => {
                        noteVisual.classList.remove('active');
                    }, duration * 1000);
                }
                
                return { osc, gainNode, filter };
                
            } catch (error) {
                console.error("Błąd fortepianu:", error);
            }
        },
        
        playChord: function(frequencies, time, duration, velocity = 0.7) {
            frequencies.forEach((freq, index) => {
                // Lekkie przesunięcia czasowe dla naturalności
                const offset = index * 0.02;
                this.play(freq, time + offset, duration, velocity - (index * 0.1));
            });
        }
    };
    
    // Podłącz do efektów
    state.instruments.piano.output.connect(state.effects.reverbDry);
    state.instruments.piano.output.connect(state.effects.reverb);
    
    // Ustaw głośność
    state.instruments.piano.output.gain.value = 0.7;
}

// Inicjalizacja basu
function initBass() {
    state.instruments.bass = {
        output: state.audioContext.createGain(),
        
        play: function(frequency, time, duration, velocity = 0.8) {
            try {
                // Oscylator basu (podstawowy dźwięk)
                const osc = state.audioContext.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.value = frequency;
                
                // Obwiednia amplitudy
                const gainNode = state.audioContext.createGain();
                
                // Parametry obwiedni
                const now = state.audioContext.currentTime;
                const startTime = time || now;
                const attack = 0.05;
                const decay = 0.1;
                const sustain = 0.8;
                const release = 0.5;
                
                // Ustaw obwiednię
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(velocity, startTime + attack);
                gainNode.gain.linearRampToValueAtTime(velocity * sustain, startTime + attack + decay);
                gainNode.gain.setValueAtTime(velocity * sustain, startTime + duration - release);
                gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
                
                // Filtr dolnoprzepustowy
                const filter = state.audioContext.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 500;
                filter.Q.value = 1;
                
                // Compressor dla kontroli dynamiki
                const compressor = state.audioContext.createDynamicsCompressor();
                compressor.threshold.value = -24;
                compressor.knee.value = 30;
                compressor.ratio.value = 12;
                compressor.attack.value = 0.003;
                compressor.release.value = 0.25;
                
                // Połączenia
                osc.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(compressor);
                compressor.connect(this.output);
                
                // Start i stop
                osc.start(startTime);
                osc.stop(startTime + duration);
                
                // Wizualizacja
                const color = 'hsl(240, 70%, 50%)'; // Niebieski
                visualizer.createNote(Math.random() * 100, color, duration * 1000);
                
                return { osc, gainNode, filter };
                
            } catch (error) {
                console.error("Błąd basu:", error);
            }
        }
    };
    
    // Podłącz do wyjścia
    state.instruments.bass.output.connect(state.effects.reverbDry);
    
    // Ustaw głośność
    state.instruments.bass.output.gain.value = 0.5;
}

// Inicjalizacja perkusji
function initDrums() {
    state.instruments.drums = {
        output: state.audioContext.createGain(),
        
        playKick: function(time, velocity = 0.8) {
            try {
                const now = state.audioContext.currentTime;
                const startTime = time || now;
                
                // Oscylator dla stopy
                const osc = state.audioContext.createOscillator();
                const gainNode = state.audioContext.createGain();
                
                // Obwiednia częstotliwości (opadająca)
                osc.frequency.setValueAtTime(150, startTime);
                osc.frequency.exponentialRampToValueAtTime(50, startTime + 0.3);
                
                // Obwiednia głośności
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(velocity, startTime + 0.005);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
                
                // Połączenia
                osc.connect(gainNode);
                gainNode.connect(this.output);
                
                // Start i stop
                osc.start(startTime);
                osc.stop(startTime + 0.3);
                
                // Wizualizacja
                const color = 'hsl(0, 70%, 50%)'; // Czerwony
                visualizer.createNote(Math.random() * 60, color, 300);
                
            } catch (error) {
                console.error("Błąd stopy perkusyjnej:", error);
            }
        },
        
        playSnare: function(time, velocity = 0.7) {
            try {
                const now = state.audioContext.currentTime;
                const startTime = time || now;
                
                // Szum dla werbla
                const noise = state.audioContext.createBufferSource();
                const noiseFilter = state.audioContext.createBiquadFilter();
                const noiseGain = state.audioContext.createGain();
                
                // Tworzenie bufora szumu
                const bufferSize = state.audioContext.sampleRate * 0.5;
                const buffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
                const data = buffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                
                // Ustawienia filtra
                noiseFilter.type = 'bandpass';
                noiseFilter.frequency.value = 3000;
                noiseFilter.Q.value = 0.9;
                
                // Obwiednia głośności
                noiseGain.gain.setValueAtTime(0, startTime);
                noiseGain.gain.linearRampToValueAtTime(velocity * 0.6, startTime + 0.005);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
                
                // Dodanie oscylatora dla "bodu" werbla
                const osc = state.audioContext.createOscillator();
                const oscGain = state.audioContext.createGain();
                
                osc.type = 'triangle';
                osc.frequency.value = 180;
                
                oscGain.gain.setValueAtTime(0, startTime);
                oscGain.gain.linearRampToValueAtTime(velocity * 0.5, startTime + 0.005);
                oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
                
                // Połączenia
                noise.buffer = buffer;
                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(this.output);
                
                osc.connect(oscGain);
                oscGain.connect(this.output);
                
                // Start i stop
                noise.start(startTime);
                osc.start(startTime);
                
                noise.stop(startTime + 0.2);
                osc.stop(startTime + 0.1);
                
                // Wizualizacja
                const color = 'hsl(30, 70%, 50%)'; // Pomarańczowy
                visualizer.createNote(60 + Math.random() * 60, color, 200);
                
            } catch (error) {
                console.error("Błąd werbla:", error);
            }
        },
        
        playHiHat: function(time, velocity = 0.6, open = false) {
            try {
                const now = state.audioContext.currentTime;
                const startTime = time || now;
                
                // Czas trwania dźwięku
                const duration = open ? 0.2 : 0.05;
                
                // Szum dla hi-hatu
                const noise = state.audioContext.createBufferSource();
                const noiseFilter = state.audioContext.createBiquadFilter();
                const noiseGain = state.audioContext.createGain();
                
                // Tworzenie bufora szumu
                const bufferSize = state.audioContext.sampleRate * 0.5;
                const buffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
                const data = buffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                
                // Ustawienia filtra
                noiseFilter.type = 'highpass';
                noiseFilter.frequency.value = 8000;
                
                // Obwiednia głośności
                noiseGain.gain.setValueAtTime(0, startTime);
                noiseGain.gain.linearRampToValueAtTime(velocity * 0.3, startTime + 0.001);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                
                // Połączenia
                noise.buffer = buffer;
                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(this.output);
                
                // Start i stop
                noise.start(startTime);
                noise.stop(startTime + duration);
                
                // Wizualizacja
                const color = 'hsl(60, 70%, 50%)'; // Żółty
                visualizer.createNote(120 + Math.random() * 60, color, duration * 1000);
                
            } catch (error) {
                console.error("Błąd hi-hatu:", error);
            }
        }
    };
    
    // Podłącz do wyjścia
    state.instruments.drums.output.connect(state.masterGain);
    
    // Ustaw głośność
    state.instruments.drums.output.gain.value = 0.6;
}

// Inicjalizacja trąbki
function initTrumpet() {
    state.instruments.trumpet = {
        output: state.audioContext.createGain(),
        
        play: function(frequency, time, duration, velocity = 0.6) {
            try {
                const now = state.audioContext.currentTime;
                const startTime = time || now;
                
                // Oscylator dla trąbki
                const osc = state.audioContext.createOscillator();
                osc.type = 'square';
                osc.frequency.value = frequency;
                
                // Filtr dla charakterystycznego brzmienia
                const filter = state.audioContext.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = frequency * 1.5;
                filter.Q.value = 2;
                
                // Obwiednia głośności
                const gainNode = state.audioContext.createGain();
                
                // Parametry
                const attack = 0.05;
                const decay = 0.1;
                const sustain = 0.7;
                const release = 0.2;
                
                // Ustaw obwiednię głośności
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(velocity, startTime + attack);
                gainNode.gain.linearRampToValueAtTime(velocity * sustain, startTime + attack + decay);
                gainNode.gain.setValueAtTime(velocity * sustain, startTime + duration - release);
                gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
                
                // Dodatkowy oscylator dla wzbogacenia brzmienia
                const osc2 = state.audioContext.createOscillator();
                osc2.type = 'sawtooth';
                osc2.frequency.value = frequency * 0.999; // Nieznaczne rozstrojenie
                
                const gain2 = state.audioContext.createGain();
                gain2.gain.value = velocity * 0.3;
                
                // Połączenia
                osc.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(this.output);
                
                osc2.connect(gain2);
                gain2.connect(filter);
                
                // Start i stop
                osc.start(startTime);
                osc2.start(startTime);
                
                osc.stop(startTime + duration);
                osc2.stop(startTime + duration);
                
                // Wizualizacja
                const color = 'hsl(0, 80%, 60%)'; // Czerwony
                visualizer.createNote(180 + Math.random() * 60, color, duration * 1000);
                
            } catch (error) {
                console.error("Błąd trąbki:", error);
            }
        }
    };
    
    // Podłącz do efektów
    state.instruments.trumpet.output.connect(state.effects.reverbDry);
    state.instruments.trumpet.output.connect(state.effects.reverb);
    
    // Ustaw głośność
    state.instruments.trumpet.output.gain.value = 0.5;
}

// Odtwarzanie krótkiego dźwięku testowego
function playTestSound() {
    if (!state.audioContext) return;
    
    // Odtwórz krótki akord testowy
    const time = state.audioContext.currentTime;
    
    // Prosta sekwencja C Major
    if (state.instruments.piano) {
        state.instruments.piano.playChord([
            NOTE_FREQUENCIES.C * 2, 
            NOTE_FREQUENCIES.E * 2,
            NOTE_FREQUENCIES.G * 2
        ], time, 0.5, 0.5);
    }
    
    // Efekt wizualny
    showJazzEffect();
}

// CZĘŚĆ 5: FUNKCJE STERUJĄCE ODTWARZANIEM

// Przełączanie odtwarzania
function togglePlayJazz() {
    if (state.isPlaying) {
        stopJazz();
    } else {
        startJazz();
    }
}

// Rozpoczęcie odtwarzania
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
    
    // Uruchom sekwencję akordów
    playChordSequence();
    
    // Aktualizuj status
    updateStatus(`Gra: ${state.currentChord || 'ładowanie...'}; Nastrój: ${state.currentMood}`);
    
    // Efekt wizualny
    showJazzEffect();
}

// Zatrzymanie odtwarzania
function stopJazz() {
    // Aktualizacja UI
    document.getElementById('startButton').textContent = "START JAZZU";
    document.getElementById('startButton').classList.remove('active');
    
    // Zatrzymaj timery
    if (state.chordTimer) {
        clearTimeout(state.chordTimer);
        state.chordTimer = null;
    }
    
    // Ustaw stan
    state.isPlaying = false;
    
    // Wyczyść wizualizację
    visualizer.clearNotes();
    
    // Aktualizuj status
    updateStatus("Zatrzymano. Kliknij START, aby kontynuować...");
}

// Generowanie nowej progresji akordów
function generateNewProgression() {
    // Wybierz progresję odpowiednią dla stylu
    const progressions = JAZZ_PROGRESSIONS[state.style] || JAZZ_PROGRESSIONS.swing;
    
    // Wybierz losową progresję z listy
    const randomIndex = Math.floor(Math.random() * progressions.length);
    state.currentProgression = [...progressions[randomIndex]];
    
    console.log(`Nowa progresja (${state.style}):`, state.currentProgression);
    
    // Resetuj indeks
    state.progressionIndex = 0;
}

// Zmiana losowego nastroju
function changeRandomMood() {
    const newMood = MOODS[Math.floor(Math.random() * MOODS.length)];
    state.currentMood = newMood;
    visualizer.updateMoodDisplay(newMood);
}

// Zmiana losowego stylu
function changeRandomStyle() {
    const styles = ['swing', 'bebop', 'fusion', 'modal'];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    setStyle(randomStyle);
}

// Zmiana losowego tempa
function changeRandomTempo() {
    // Losowa zmiana tempa +/- 20 BPM
    const tempoChange = Math.floor(Math.random() * 40) - 20;
    const newTempo = Math.max(60, Math.min(240, state.tempo + tempoChange));
    
    // Aktualizuj suwak
    document.getElementById('tempo').value = newTempo;
    updateTempo();
}

// Odtwarzanie sekwencji akordów
function playChordSequence() {
    if (!state.isPlaying) return;
    
    // Oblicz czas między akordami
    const beatDuration = 60 / state.tempo; // czas jednego uderzenia w sekundach
    const chordDuration = beatDuration * 4; // zakładamy 4/4
    
    // Pobierz aktualny akord
    const chord = state.currentProgression[state.progressionIndex];
    
    // Odtwórz akord
    playJazzChord(chord, chordDuration);
    
    // Przygotuj następny akord
    state.progressionIndex = (state.progressionIndex + 1) % state.currentProgression.length;
    
    // Ustaw timer dla następnego akordu
    state.chordTimer = setTimeout(() => {
        playChordSequence();
    }, chordDuration * 1000);
}

// Odtwarzanie pojedynczego akordu jazzowego
function playJazzChord(chordName, duration) {
    if (!state.audioContext || !chordName) return;
    
    // Aktualizuj bieżący akord
    state.currentChord = chordName;
    visualizer.updateChordDisplay(chordName);
    
    // Dekodowanie nazwy akordu
    const rootNote = chordName.slice(0, chordName.search(/maj|m|dim|sus|aug|[0-9]/));
    
    // Pobierz częstotliwość podstawową
    let baseFreq = NOTE_FREQUENCIES[rootNote] || 261.63; // C4 jako domyślna
    
    // Ustal, czy mamy akord durowy czy molowy
    const isMinor = chordName.includes('m') && !chordName.includes('maj');
    
    // Ustal interwały w zależności od typu akordu
    let intervals = [];
    
    if (chordName.includes('maj7')) {
        intervals = [1, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.major7th];
    } else if (chordName.includes('maj9')) {
        intervals = [1, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.major7th, INTERVALS.major9th];
    } else if (chordName.includes('m7b5')) {
        intervals = [1, INTERVALS.minor3rd, INTERVALS.tritone, INTERVALS.minor7th];
    } else if (chordName.includes('m7')) {
        intervals = [1, INTERVALS.minor3rd, INTERVALS.perfect5th, INTERVALS.minor7th];
    } else if (chordName.includes('m9')) {
        intervals = [1, INTERVALS.minor3rd, INTERVALS.perfect5th, INTERVALS.minor7th, INTERVALS.major9th];
    } else if (chordName.includes('7b9')) {
        intervals = [1, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.minor7th, INTERVALS.minor9th];
    } else if (chordName.includes('9')) {
        intervals = [1, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.minor7th, INTERVALS.major9th];
    } else if (chordName.includes('13')) {
        intervals = [1, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.minor7th, INTERVALS.major9th, INTERVALS.major13th];
    } else if (chordName.includes('7')) {
        intervals = [1, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.minor7th];
    } else if (chordName.includes('dim')) {
        intervals = [1, INTERVALS.minor3rd, INTERVALS.tritone, INTERVALS.major6th];
    } else if (chordName.includes('sus4')) {
        intervals = [1, INTERVALS.perfect4th, INTERVALS.perfect5th];
    } else if (chordName.includes('6')) {
        if (isMinor) {
            intervals = [1, INTERVALS.minor3rd, INTERVALS.perfect5th, INTERVALS.major6th];
        } else {
            intervals = [1, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.major6th];
        }
    } else if (isMinor) {
        intervals = [1, INTERVALS.minor3rd, INTERVALS.perfect5th];
    } else {
        // Domyślnie major
        intervals = [1, INTERVALS.major3rd, INTERVALS.perfect5th];
    }
    
    // Oblicz częstotliwości dla akordu
    const frequencies = intervals.map(interval => baseFreq * interval);
    
    // Czas aktualny
    const now = state.audioContext.currentTime;
    
    // Odtwórz wszystkie instrumenty
    if (state.piano) {
        state.instruments.piano.playChord(frequencies, now, duration);
    }
    
    if (state.bass) {
        playBassLine(chordName, now, duration);
    }
    
    if (state.drums) {
        playDrumPattern(now, duration);
    }
    
    if (state.trumpet && Math.random() < 0.3) {
        // Trąbka gra rzadziej - tylko z 30% prawdopodobieństwem
        playTrumpetLine(chordName, now, duration);
    }
}

// Odtwarzanie linii basowej
function playBassLine(chordName, time, duration) {
    if (!state.instruments.bass) return;
    
    // Dekodowanie nazwy akordu
    const rootNote = chordName.slice(0, chordName.search(/maj|m|dim|sus|aug|[0-9]/));
    
    // Pobierz częstotliwość podstawową
    let baseFreq = NOTE_FREQUENCIES[rootNote] || 261.63; // C4 jako domyślna
    baseFreq = baseFreq / 2; // Oktawa niżej dla basu
    
    // Czas aktualny
    const now = time || state.audioContext.currentTime;
    
    // Wybierz wzorzec basowy zależnie od stylu
    let pattern;
    
    switch(state.style) {
        case 'swing':
            // Walking bass - 4 nuty na akord
            pattern = [
                { time: 0, note: baseFreq },
                { time: duration / 4, note: baseFreq * INTERVALS.perfect5th },
                { time: duration / 2, note: baseFreq * INTERVALS.major3rd },
                { time: duration * 0.75, note: baseFreq * INTERVALS.perfect5th * 0.75 }
            ];
            break;
            
        case 'bebop':
            // Szybszy walking bass z przejściami chromatycznymi
            pattern = [
                { time: 0, note: baseFreq },
                { time: duration / 4, note: baseFreq * INTERVALS.major2nd },
                { time: duration / 2, note: baseFreq * INTERVALS.major3rd },
                { time: duration * 0.75, note: baseFreq * INTERVALS.perfect4th }
            ];
            break;
            
        case 'fusion':
            // Bardziej synkopowany groove
            pattern = [
                { time: 0, note: baseFreq },
                { time: duration * 0.375, note: baseFreq },
                { time: duration / 2, note: baseFreq * INTERVALS.perfect5th },
                { time: duration * 0.875, note: baseFreq * INTERVALS.perfect4th }
            ];
            break;
            
        case 'modal':
            // Minimalistyczny, długo trzymane nuty
            pattern = [
                { time: 0, note: baseFreq },
                { time: duration / 2, note: baseFreq * INTERVALS.perfect5th }
            ];
            break;
            
        default:
            // Standardowy walking bass
            pattern = [
                { time: 0, note: baseFreq },
                { time: duration / 4, note: baseFreq * INTERVALS.perfect5th },
                { time: duration / 2, note: baseFreq * INTERVALS.major3rd },
                { time: duration * 0.75, note: baseFreq * INTERVALS.perfect5th * 0.75 }
            ];
    }
    
    // Zagraj wzorzec
    pattern.forEach(note => {
        state.instruments.bass.play(note.note, now + note.time, duration / 4);
    });
}

// Odtwarzanie wzorca perkusyjnego
function playDrumPattern(time, duration) {
    if (!state.instruments.drums) return;
    
    // Czas aktualny
    const now = time || state.audioContext.currentTime;
    
    // Wybierz wzorzec perkusyjny zależnie od stylu
    let kickPattern, snarePattern, hihatPattern;
    
    switch(state.style) {
        case 'swing':
            // Klasyczny swing
            kickPattern = [0, duration / 2];
            snarePattern = [duration / 4, duration * 0.75];
            hihatPattern = [0, duration / 4, duration / 2, duration * 0.75];
            break;
            
        case 'bebop':
            // Szybszy, bardziej złożony rytm
            kickPattern = [0, duration * 0.6];
            snarePattern = [duration / 4, duration * 0.75];
            hihatPattern = [0, duration / 8, duration / 4, duration * 3/8, duration / 2, duration * 5/8, duration * 0.75, duration * 7/8];
            break;
            
        case 'fusion':
            // Synkopowany, funkowy rytm
            kickPattern = [0, duration * 0.375, duration * 0.75];
            snarePattern = [duration / 4, duration * 0.75];
            hihatPattern = [0, duration / 8, duration / 4, duration * 3/8, duration / 2, duration * 5/8, duration * 0.75, duration * 7/8];
            break;
            
        case 'modal':
            // Minimalistyczny, przestrzenny
            kickPattern = [0];
            snarePattern = [duration / 2];
            hihatPattern = [duration / 4, duration * 0.75];
            break;
            
        default:
            // Standardowy jazz
            kickPattern = [0, duration / 2];
            snarePattern = [duration / 4, duration * 0.75];
            hihatPattern = [0, duration / 4, duration / 2, duration * 0.75];
    }
    
    // Zagraj wzorce
    kickPattern.forEach(time => {
        state.instruments.drums.playKick(now + time);
    });
    
    snarePattern.forEach(time => {
        state.instruments.drums.playSnare(now + time);
    });
    
    hihatPattern.forEach(time => {
        // Sprawdź czy ma być otwarty hi-hat
        const isOpen = time === duration / 2; // Otwarty na "3"
        state.instruments.drums.playHiHat(now + time, 0.6, isOpen);
    });
}

// Odtwarzanie linii trąbki
function playTrumpetLine(chordName, time, duration) {
    if (!state.instruments.trumpet) return;
    
    // Dekodowanie nazwy akordu
    const rootNote = chordName.slice(0, chordName.search(/maj|m|dim|sus|aug|[0-9]/));
    
    // Pobierz częstotliwość podstawową
    let baseFreq = NOTE_FREQUENCIES[rootNote] || 261.63; // C4 jako domyślna
    baseFreq = baseFreq * 2; // Oktawa wyżej dla trąbki
    
    // Czas aktualny
    const now = time || state.audioContext.currentTime;
    
    // Wybierz losową frazę trąbki
    const patternType = Math.floor(Math.random() * 4);
    
    switch(patternType) {
        case 0:
            // Pojedyncza długa nuta
            state.instruments.trumpet.play(baseFreq, now + duration * 0.25, duration * 0.5);
            break;
            
        case 1:
            // Dwie nuty
            state.instruments.trumpet.play(baseFreq, now + duration * 0.25, duration * 0.25);
            state.instruments.trumpet.play(baseFreq * INTERVALS.perfect5th, now + duration * 0.6, duration * 0.3);
            break;
            
        case 2:
            // Triola
            state.instruments.trumpet.play(baseFreq, now + duration * 0.25, duration * 0.15);
            state.instruments.trumpet.play(baseFreq * INTERVALS.major3rd, now + duration * 0.45, duration * 0.15);
            state.instruments.trumpet.play(baseFreq * INTERVALS.perfect5th, now + duration * 0.65, duration * 0.25);
            break;
            
        case 3:
            // Fraza kadencyjna
            state.instruments.trumpet.play(baseFreq * INTERVALS.major7th, now + duration * 0.1, duration * 0.2);
            state.instruments.trumpet.play(baseFreq * INTERVALS.perfect5th, now + duration * 0.4, duration * 0.2);
            state.instruments.trumpet.play(baseFreq, now + duration * 0.7, duration * 0.3);
            break;
    }
}

// CZĘŚĆ 6: FUNKCJE UI I STEROWANIA

// Przełączanie trybu Auto-Jazz
function toggleAutoJazz() {
    state.autoJazz = !state.autoJazz;
    
    if (state.autoJazz) {
        autoJazz.start();
        
        // Jeśli nie odtwarzamy, uruchom odtwarzanie
        if (!state.isPlaying && state.audioInitialized) {
            startJazz();
        }
        
        updateStatus(`Auto-Jazz WŁĄCZONY! Nastrój: ${state.currentMood}`);
    } else {
        autoJazz.stop();
        updateStatus(`Auto-Jazz wyłączony. Nastrój: ${state.currentMood}`);
    }
}

// Aktualizacja tempa
function updateTempo() {
    state.tempo = parseInt(document.getElementById('tempo').value);
    document.getElementById('tempoValue').textContent = `${state.tempo} BPM`;
    
    // Jeśli odtwarzamy, zatrzymaj i uruchom ponownie sekwencję
    if (state.isPlaying) {
        // Zatrzymaj bieżącą sekwencję
        if (state.chordTimer) {
            clearTimeout(state.chordTimer);
        }
        
        // Uruchom ponownie
        playChordSequence();
    }
}

// Ustawienie stylu muzycznego
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
    
    // Generuj nową progresję akordów dopasowaną do stylu
    generateNewProgression();
    
    // Jeśli odtwarzamy, zaktualizuj sekwencję
    if (state.isPlaying) {
        // Zatrzymaj bieżącą sekwencję
        if (state.chordTimer) {
            clearTimeout(state.chordTimer);
        }
        
        // Uruchom ponownie
        playChordSequence();
    }
}

// Przełączanie instrumentu
function toggleInstrument(instrument) {
    // Aktualizuj stan
    state[instrument] = !state[instrument];
    
    // Aktualizuj przycisk
    const button = document.getElementById(`${instrument}Toggle`);
    button.classList.toggle('active', state[instrument]);
    
    const label = instrument.charAt(0).toUpperCase() + instrument.slice(1);
    button.textContent = `${label}: ${state[instrument] ? 'ON' : 'OFF'}`;
    
    // Efekt wizualny
    showJazzEffect();
}

// Efekt wizualny dla akcji jazzowych
function showJazzEffect() {
    // Używamy funkcji z modułu core.js
    createJazzEffect('notesAnimation', 10);
}

// Funkcje updateStatus i displayError są już zaimportowane z core.js

// Inicjalizacja aplikacji po załadowaniu strony
document.addEventListener('DOMContentLoaded', initializeApp);