/**
 * Auto-Jazz Module
 * Moduł zawierający zaawansowane algorytmy do automatycznej improwizacji i aranżacji
 */

import { generateMelodicPhrase, getScaleForChord, parseChordName } from './musicTheory.js';

/**
 * Klasa reprezentująca muzyczny nastrój (mood)
 */
class MusicalMood {
    /**
     * Konstruktor nastroju muzycznego
     * @param {string} name - Nazwa nastroju
     * @param {Object} params - Parametry nastroju
     */
    constructor(name, params = {}) {
        this.name = name;
        this.tension = params.tension || 0.5;
        this.energy = params.energy || 0.5;
        this.complexity = params.complexity || 0.5;
        this.brightness = params.brightness || 0.5;
        this.depth = params.depth || 0.5;
        this.coherence = params.coherence || 0.5;
        this.stability = params.stability || 0.5;
        this.variation = params.variation || 0.5;
    }
    
    /**
     * Zwraca wartość parametru nastroju
     * @param {string} paramName - Nazwa parametru
     * @returns {number} Wartość parametru
     */
    getParameter(paramName) {
        if (this.hasOwnProperty(paramName)) {
            return this[paramName];
        }
        return 0.5; // Wartość domyślna
    }
    
    /**
     * Oblicza odległość między nastrojami
     * @param {MusicalMood} otherMood - Inny nastrój
     * @returns {number} Wartość odległości (0-1)
     */
    distanceTo(otherMood) {
        const parameters = [
            'tension', 'energy', 'complexity', 
            'brightness', 'depth', 'coherence',
            'stability', 'variation'
        ];
        
        let sumSquaredDiff = 0;
        for (const param of parameters) {
            const diff = this.getParameter(param) - otherMood.getParameter(param);
            sumSquaredDiff += diff * diff;
        }
        
        return Math.sqrt(sumSquaredDiff / parameters.length);
    }
    
    /**
     * Tworzy nastrój pośredni między dwoma nastrojami
     * @param {MusicalMood} targetMood - Docelowy nastrój
     * @param {number} ratio - Współczynnik interpolacji (0-1)
     * @returns {MusicalMood} Nowy nastrój będący interpolacją
     */
    interpolate(targetMood, ratio) {
        const interpolatedParams = {};
        const parameters = [
            'tension', 'energy', 'complexity', 
            'brightness', 'depth', 'coherence',
            'stability', 'variation'
        ];
        
        for (const param of parameters) {
            const startValue = this.getParameter(param);
            const endValue = targetMood.getParameter(param);
            interpolatedParams[param] = startValue + (endValue - startValue) * ratio;
        }
        
        return new MusicalMood(`${this.name}-${targetMood.name}-mix`, interpolatedParams);
    }
}

/**
 * Predefiniowane nastroje muzyczne
 */
export const PREDEFINED_MOODS = {
    spokojny: new MusicalMood('spokojny', {
        tension: 0.2, energy: 0.3, complexity: 0.4,
        brightness: 0.6, depth: 0.7, coherence: 0.8,
        stability: 0.9, variation: 0.3
    }),
    energiczny: new MusicalMood('energiczny', {
        tension: 0.6, energy: 0.9, complexity: 0.7,
        brightness: 0.8, depth: 0.4, coherence: 0.6,
        stability: 0.5, variation: 0.7
    }),
    nastrojowy: new MusicalMood('nastrojowy', {
        tension: 0.5, energy: 0.4, complexity: 0.6,
        brightness: 0.3, depth: 0.8, coherence: 0.7,
        stability: 0.6, variation: 0.5
    }),
    melancholijny: new MusicalMood('melancholijny', {
        tension: 0.4, energy: 0.2, complexity: 0.5,
        brightness: 0.2, depth: 0.8, coherence: 0.6,
        stability: 0.7, variation: 0.4
    }),
    radosny: new MusicalMood('radosny', {
        tension: 0.3, energy: 0.8, complexity: 0.5,
        brightness: 0.9, depth: 0.5, coherence: 0.7,
        stability: 0.6, variation: 0.7
    }),
    zaskakujący: new MusicalMood('zaskakujący', {
        tension: 0.8, energy: 0.7, complexity: 0.9,
        brightness: 0.6, depth: 0.4, coherence: 0.3,
        stability: 0.2, variation: 0.9
    }),
    eksperymentalny: new MusicalMood('eksperymentalny', {
        tension: 0.7, energy: 0.6, complexity: 0.9,
        brightness: 0.5, depth: 0.6, coherence: 0.3,
        stability: 0.2, variation: 0.9
    }),
    intensywny: new MusicalMood('intensywny', {
        tension: 0.9, energy: 0.9, complexity: 0.7,
        brightness: 0.7, depth: 0.5, coherence: 0.5,
        stability: 0.4, variation: 0.7
    }),
    tajemniczy: new MusicalMood('tajemniczy', {
        tension: 0.6, energy: 0.4, complexity: 0.7,
        brightness: 0.3, depth: 0.8, coherence: 0.5,
        stability: 0.5, variation: 0.7
    }),
    triumfalny: new MusicalMood('triumfalny', {
        tension: 0.6, energy: 0.9, complexity: 0.6,
        brightness: 0.8, depth: 0.7, coherence: 0.8,
        stability: 0.7, variation: 0.5
    })
};

/**
 * Klasa reprezentująca muzyczną narrację
 */
class MusicNarrative {
    /**
     * Konstruktor narracji muzycznej
     */
    constructor() {
        this.narrativeArc = [];
        this.currentPosition = 0;
        this.totalLength = 0;
    }
    
    /**
     * Dodaje punkt narracji
     * @param {MusicalMood} mood - Nastrój muzyczny
     * @param {number} duration - Czas trwania w taktach
     * @param {string} description - Opis punktu narracji
     */
    addNarrativePoint(mood, duration, description = '') {
        this.narrativeArc.push({
            mood,
            duration,
            description,
            startPosition: this.totalLength
        });
        this.totalLength += duration;
    }
    
    /**
     * Pobiera nastrój dla aktualnej pozycji
     * @param {number} position - Pozycja w narracji (w taktach)
     * @returns {MusicalMood} Nastrój dla danej pozycji
     */
    getMoodAtPosition(position) {
        // Znajdujemy odpowiedni segment narracji
        let currentPoint = this.narrativeArc[0].mood;
        let nextPoint = null;
        
        for (let i = 0; i < this.narrativeArc.length; i++) {
            const point = this.narrativeArc[i];
            if (position >= point.startPosition) {
                currentPoint = point.mood;
                
                // Sprawdzamy, czy jest następny punkt
                if (i < this.narrativeArc.length - 1) {
                    nextPoint = this.narrativeArc[i + 1];
                } else {
                    nextPoint = null;
                }
            } else {
                break;
            }
        }
        
        // Jeśli nie ma następnego punktu, zwracamy aktualny nastrój
        if (!nextPoint) {
            return currentPoint;
        }
        
        // Obliczamy, jak daleko jesteśmy między punktami
        const currentStart = this.narrativeArc.find(p => p.mood === currentPoint).startPosition;
        const nextStart = nextPoint.startPosition;
        const segmentDuration = nextStart - currentStart;
        const positionInSegment = position - currentStart;
        
        // Obliczamy współczynnik interpolacji
        const ratio = positionInSegment / segmentDuration;
        
        // Interpolujemy nastroje
        return currentPoint.interpolate(nextPoint.mood, ratio);
    }
    
    /**
     * Ustawia aktualną pozycję w narracji
     * @param {number} position - Nowa pozycja (w taktach)
     */
    setPosition(position) {
        this.currentPosition = Math.max(0, Math.min(position, this.totalLength));
    }
    
    /**
     * Przesuwa pozycję w narracji
     * @param {number} amount - Wartość przesunięcia (w taktach)
     */
    advancePosition(amount) {
        this.currentPosition = Math.max(0, Math.min(this.currentPosition + amount, this.totalLength));
    }
    
    /**
     * Pobiera aktualny nastrój
     * @returns {MusicalMood} Aktualny nastrój
     */
    getCurrentMood() {
        return this.getMoodAtPosition(this.currentPosition);
    }
    
    /**
     * Tworzy typową narrację jazzową
     * @returns {MusicNarrative} Narracja jazzowa
     */
    static createJazzNarrative() {
        const narrative = new MusicNarrative();
        
        // Typowa narracja AABA dla standardu jazzowego
        narrative.addNarrativePoint(PREDEFINED_MOODS.spokojny, 8, 'Ekspozycja A');
        narrative.addNarrativePoint(PREDEFINED_MOODS.energiczny, 8, 'Rozwój A');
        narrative.addNarrativePoint(PREDEFINED_MOODS.zaskakujący, 8, 'Kontrast B');
        narrative.addNarrativePoint(PREDEFINED_MOODS.radosny, 8, 'Powrót A\'');
        
        return narrative;
    }
    
    /**
     * Tworzy narrację z klimaksem
     * @returns {MusicNarrative} Narracja z klimaksem
     */
    static createClimaxNarrative() {
        const narrative = new MusicNarrative();
        
        // Narracja z budowaniem napięcia i klimaksem
        narrative.addNarrativePoint(PREDEFINED_MOODS.spokojny, 4, 'Wprowadzenie');
        narrative.addNarrativePoint(PREDEFINED_MOODS.nastrojowy, 4, 'Ekspozycja');
        narrative.addNarrativePoint(PREDEFINED_MOODS.energiczny, 4, 'Rozwój tematu');
        narrative.addNarrativePoint(PREDEFINED_MOODS.tajemniczy, 4, 'Budowanie napięcia');
        narrative.addNarrativePoint(PREDEFINED_MOODS.intensywny, 4, 'Klimaks');
        narrative.addNarrativePoint(PREDEFINED_MOODS.melancholijny, 4, 'Wyciszenie');
        narrative.addNarrativePoint(PREDEFINED_MOODS.spokojny, 4, 'Zakończenie');
        
        return narrative;
    }
    
    /**
     * Tworzy narrację eksperymentalną
     * @returns {MusicNarrative} Narracja eksperymentalna
     */
    static createExperimentalNarrative() {
        const narrative = new MusicNarrative();
        
        // Narracja z nieoczekiwanymi zmianami
        narrative.addNarrativePoint(PREDEFINED_MOODS.tajemniczy, 4, 'Wprowadzenie');
        narrative.addNarrativePoint(PREDEFINED_MOODS.energiczny, 2, 'Nagła zmiana');
        narrative.addNarrativePoint(PREDEFINED_MOODS.melancholijny, 6, 'Kontrast');
        narrative.addNarrativePoint(PREDEFINED_MOODS.zaskakujący, 4, 'Nieoczekiwany zwrot');
        narrative.addNarrativePoint(PREDEFINED_MOODS.eksperymentalny, 8, 'Sekcja eksperymentalna');
        narrative.addNarrativePoint(PREDEFINED_MOODS.nastrojowy, 4, 'Uspokojenie');
        narrative.addNarrativePoint(PREDEFINED_MOODS.energiczny, 2, 'Finałowa energia');
        
        return narrative;
    }
}

/**
 * Klasa zarządzająca muzyczną improwizacją
 */
export class ImprovisationManager {
    /**
     * Konstruktor menedżera improwizacji
     * @param {Object} options - Opcje menedżera
     */
    constructor(options = {}) {
        this.style = options.style || 'swing';
        this.mood = options.mood ? PREDEFINED_MOODS[options.mood] : PREDEFINED_MOODS.spokojny;
        this.improvisingEnabled = options.improvisingEnabled || true;
        this.narrative = options.narrative || MusicNarrative.createJazzNarrative();
        this.currentChord = null;
        this.currentScale = null;
        this.prevMelodies = [];  // Historia melodii dla kontynuacji motywów
        this.motifDatabase = []; // Baza motywów muzycznych
        this.currentBar = 0;
        this.phraseLength = 4;   // Domyślna długość frazy w taktach
    }
    
    /**
     * Ustawia styl muzyczny
     * @param {string} style - Styl muzyczny
     */
    setStyle(style) {
        this.style = style;
    }
    
    /**
     * Ustawia nastrój muzyczny
     * @param {string} mood - Nastrój muzyczny
     */
    setMood(mood) {
        if (PREDEFINED_MOODS[mood]) {
            this.mood = PREDEFINED_MOODS[mood];
        } else {
            console.warn(`Nastrój ${mood} nie jest zdefiniowany. Używam domyślnego.`);
            this.mood = PREDEFINED_MOODS.spokojny;
        }
    }
    
    /**
     * Aktywuje lub dezaktywuje improwizację
     * @param {boolean} enabled - Czy improwizacja aktywna
     */
    setImprovising(enabled) {
        this.improvisingEnabled = enabled;
    }
    
    /**
     * Ustawia narrację muzyczną
     * @param {string} narrativeType - Typ narracji ('standard', 'climax', 'experimental')
     */
    setNarrative(narrativeType) {
        switch(narrativeType) {
            case 'climax':
                this.narrative = MusicNarrative.createClimaxNarrative();
                break;
            case 'experimental':
                this.narrative = MusicNarrative.createExperimentalNarrative();
                break;
            case 'standard':
            default:
                this.narrative = MusicNarrative.createJazzNarrative();
                break;
        }
        
        this.narrative.setPosition(0);
    }
    
    /**
     * Aktualizuje aktualny akord
     * @param {string} chordName - Nazwa akordu
     */
    updateCurrentChord(chordName) {
        this.currentChord = chordName;
        this.currentScale = getScaleForChord(chordName);
        
        // Zapisuje motyw związany z akordem, jeśli mamy jakieś melodie
        if (this.prevMelodies.length > 0 && this.motifDatabase.length < 20) {
            const latestMelody = this.prevMelodies[this.prevMelodies.length - 1];
            this.motifDatabase.push({
                chord: chordName,
                melody: latestMelody.slice(0, Math.min(4, latestMelody.length)) // Zapisujemy pierwsze 4 nuty
            });
        }
    }
    
    /**
     * Przesuwa pozycję w narracji muzycznej
     * @param {number} bars - Liczba taktów do przesunięcia
     */
    advanceNarrative(bars) {
        this.currentBar += bars;
        this.narrative.setPosition(this.currentBar);
        this.mood = this.narrative.getCurrentMood();
    }
    
    /**
     * Generuje melodyczną improwizację na podstawie aktualnego stanu
     * @param {number} numNotes - Liczba nut do wygenerowania
     * @param {number} baseOctave - Bazowa oktawa
     * @returns {Array} Tablica obiektów nut
     */
    generateImprovisation(numNotes = 8, baseOctave = 5) {
        if (!this.improvisingEnabled || !this.currentChord) {
            return [];
        }
        
        // Dostosuj parametry improwizacji na podstawie nastroju
        const complexity = this.mood.complexity;
        const tension = this.mood.tension;
        const energy = this.mood.energy;
        const variation = this.mood.variation;
        const coherence = this.mood.coherence;
        
        // Dostosuj parametry w zależności od nastroju
        const adjustedNumNotes = Math.floor(numNotes * (1 + (complexity - 0.5)));
        const adjustedOctave = baseOctave + (energy > 0.7 ? 1 : 0);
        
        // Decydujemy, czy kontynuować motyw czy tworzyć nowy
        const continuePrevious = this.prevMelodies.length > 0 && Math.random() < coherence;
        
        let melody;
        if (continuePrevious) {
            // Kontynuuj poprzednią melodię
            const prevMelody = this.prevMelodies[this.prevMelodies.length - 1];
            melody = this.generateContinuation(prevMelody, adjustedNumNotes, adjustedOctave);
        } else {
            // Sprawdź, czy możemy wykorzystać motyw z bazy
            const reuseMotif = this.motifDatabase.length > 0 && Math.random() < 0.3;
            
            if (reuseMotif) {
                // Znajdź pasujący motyw lub wybierz losowy
                const matchingMotifs = this.motifDatabase.filter(m => {
                    const chordRoot = parseChordName(m.chord).rootNote;
                    const currentRoot = parseChordName(this.currentChord).rootNote;
                    return chordRoot === currentRoot;
                });
                
                const motifToUse = matchingMotifs.length > 0 ? 
                    matchingMotifs[Math.floor(Math.random() * matchingMotifs.length)] : 
                    this.motifDatabase[Math.floor(Math.random() * this.motifDatabase.length)];
                
                melody = this.generateVariation(motifToUse.melody, adjustedNumNotes, adjustedOctave, variation);
            } else {
                // Generuj nową melodię
                melody = generateMelodicPhrase(this.currentChord, adjustedNumNotes, adjustedOctave);
                
                // Dodaj synkopację i rytmiczne niuanse w zależności od stylu
                this.applyStyleRhythm(melody);
            }
        }
        
        // Zapisz melodię do historii
        if (melody && melody.length > 0) {
            this.prevMelodies.push(melody);
            
            // Ogranicz historię do ostatnich 5 melodii
            if (this.prevMelodies.length > 5) {
                this.prevMelodies.shift();
            }
        }
        
        return melody;
    }
    
    /**
     * Generuje kontynuację istniejącej melodii
     * @param {Array} previousMelody - Poprzednia melodia
     * @param {number} numNotes - Liczba nut do wygenerowania
     * @param {number} baseOctave - Bazowa oktawa
     * @returns {Array} Tablica obiektów nut
     */
    generateContinuation(previousMelody, numNotes, baseOctave) {
        if (!previousMelody || previousMelody.length === 0) {
            return generateMelodicPhrase(this.currentChord, numNotes, baseOctave);
        }
        
        // Weź ostatnią nutę poprzedniej melodii jako punkt startowy
        const lastNote = previousMelody[previousMelody.length - 1];
        const continuation = [];
        
        // Dodaj pierwszą nutę kontynuacji - podobną do ostatniej nuty poprzedniej melodii
        const startingNote = {
            frequency: lastNote.frequency * (0.9 + Math.random() * 0.2), // Lekkie odchylenie
            duration: lastNote.duration * (0.8 + Math.random() * 0.4),
            velocity: lastNote.velocity * (0.9 + Math.random() * 0.2),
            time: 0
        };
        
        continuation.push(startingNote);
        
        // Wygeneruj pozostałe nuty
        let currentTime = startingNote.duration;
        for (let i = 1; i < numNotes; i++) {
            // Wybierz losową nutę z poprzedniej melodii jako model
            const modelIdx = Math.floor(Math.random() * previousMelody.length);
            const modelNote = previousMelody[modelIdx];
            
            // Stwórz wariację na podstawie modelu
            const newNote = {
                frequency: modelNote.frequency * (0.8 + Math.random() * 0.4), // Większe odchylenie
                duration: modelNote.duration * (0.7 + Math.random() * 0.6),
                velocity: modelNote.velocity * (0.9 + Math.random() * 0.2),
                time: currentTime
            };
            
            continuation.push(newNote);
            currentTime += newNote.duration;
        }
        
        return continuation;
    }
    
    /**
     * Generuje wariację istniejącej melodii
     * @param {Array} sourceMelody - Źródłowa melodia
     * @param {number} numNotes - Liczba nut do wygenerowania
     * @param {number} baseOctave - Bazowa oktawa
     * @param {number} variationAmount - Wartość wariacji (0-1)
     * @returns {Array} Tablica obiektów nut
     */
    generateVariation(sourceMelody, numNotes, baseOctave, variationAmount = 0.5) {
        if (!sourceMelody || sourceMelody.length === 0) {
            return generateMelodicPhrase(this.currentChord, numNotes, baseOctave);
        }
        
        const variation = [];
        let totalDuration = 0;
        
        // Określ liczbę nut z oryginalnej melodii do użycia
        const notesToUse = Math.min(sourceMelody.length, Math.max(2, Math.floor(sourceMelody.length * (1 - variationAmount))));
        
        // Najpierw dodaj część oryginalnej melodii
        for (let i = 0; i < notesToUse; i++) {
            const originalNote = sourceMelody[i];
            const newNote = {
                frequency: originalNote.frequency, 
                duration: originalNote.duration,
                velocity: originalNote.velocity,
                time: totalDuration
            };
            
            variation.push(newNote);
            totalDuration += newNote.duration;
        }
        
        // Uzupełnij resztę nowymi nutami
        while (variation.length < numNotes) {
            const newPhrase = generateMelodicPhrase(this.currentChord, 1, baseOctave);
            if (newPhrase && newPhrase.length > 0) {
                const newNote = {
                    frequency: newPhrase[0].frequency,
                    duration: newPhrase[0].duration,
                    velocity: newPhrase[0].velocity,
                    time: totalDuration
                };
                
                variation.push(newNote);
                totalDuration += newNote.duration;
            }
        }
        
        // Zastosuj rytmiczne niuanse zależne od stylu
        this.applyStyleRhythm(variation);
        
        return variation;
    }
    
    /**
     * Stosuje rytmiczne niuanse zależne od stylu muzycznego
     * @param {Array} melody - Melodia do przekształcenia
     */
    applyStyleRhythm(melody) {
        if (!melody || melody.length === 0) return;
        
        switch(this.style) {
            case 'swing':
                // Swing polega na triolowym feelingu - pierwsza nuta dłuższa, druga krótsza
                melody.forEach((note, index) => {
                    if (index % 2 === 0) {
                        // Parzyste nuty (0, 2, 4...) są dłuższe
                        note.duration *= 1.25;
                    } else {
                        // Nieparzyste nuty (1, 3, 5...) są krótsze
                        note.duration *= 0.75;
                    }
                });
                break;
                
            case 'bebop':
                // Bebop ma szybkie tempo z akcentami na niestandardowych miejscach
                melody.forEach((note, index) => {
                    // Dodaj akcenty (głośniejsze nuty) na niektórych miejscach
                    if (index % 3 === 0) {
                        note.velocity *= 1.2;
                    }
                    
                    // Losowo skróć niektóre nuty dla bardziej staccato efektu
                    if (Math.random() < 0.3) {
                        note.duration *= 0.8;
                    }
                });
                break;
                
            case 'fusion':
                // Fusion łączy elementy jazzu i rocka, więcej synkop i zmiennych rytmów
                melody.forEach((note, index) => {
                    if (index % 4 === 0) {
                        // Dodaj akcentowane synkopy
                        note.velocity *= 1.3;
                    }
                    
                    // Wprowadź nieregularne podziały
                    if (index % 3 === 1) {
                        note.duration *= 1.1;
                    } else if (index % 5 === 0) {
                        note.duration *= 0.9;
                    }
                });
                break;
                
            case 'modal':
                // Modal jazz - dłuższe nuty, mniej zmian harmonicznych
                melody.forEach((note, index) => {
                    // Wydłuż co drugą nutę
                    if (index % 2 === 0) {
                        note.duration *= 1.4;
                    }
                    
                    // Dodaj delikatne vibrato (poprzez niewielkie zmiany głośności)
                    note.velocity *= 0.9 + (Math.random() * 0.2);
                });
                break;
                
            case 'bossaNova':
                // Bossa nova ma charakterystyczny synkopowany rytm
                melody.forEach((note, index) => {
                    if (index % 4 === 1 || index % 4 === 3) {
                        // Akcentuj synkopy
                        note.velocity *= 1.2;
                    }
                    
                    // Typowe dla bossa nova skrócenia nut
                    if (index % 2 === 0) {
                        note.duration *= 0.9;
                    }
                });
                break;
                
            case 'coolJazz':
                // Cool jazz - bardziej stonowany, płynniejszy
                melody.forEach((note, index) => {
                    // Płynniejsze przejścia między nutami
                    if (index > 0) {
                        note.duration *= 1.1;
                    }
                    
                    // Delikatniejsza dynamika
                    note.velocity *= 0.95;
                });
                break;
        }
        
        // Aktualizuj czasy rozpoczęcia nut po modyfikacji długości
        let currentTime = 0;
        melody.forEach(note => {
            note.time = currentTime;
            currentTime += note.duration;
        });
    }
    
    /**
     * Generuje parametry dla dynamicznego miksera na podstawie nastroju
     * @returns {Object} Parametry dla miksera
     */
    generateMixParams() {
        return {
            tension: this.mood.tension,
            intensity: this.mood.energy,
            complexity: this.mood.complexity,
            brightness: this.mood.brightness,
            depth: this.mood.depth
        };
    }
    
    /**
     * Generuje sugestie zmian dla Auto-Jazz
     * @returns {Object} Sugestie zmian
     */
    generateAutomationSuggestions() {
        // Obliczamy sugestie na podstawie aktualnego nastroju i pozycji w narracji
        const energyLevel = this.mood.energy;
        const tensionLevel = this.mood.tension;
        const complexityLevel = this.mood.complexity;
        
        // Bazowe prawdopodobieństwa dla różnych akcji
        let tempoChangeProbability = 0.2;
        let chordChangeProbability = 0.3;
        let styleChangeProbability = 0.1;
        let moodChangeProbability = 0.2;
        let instrumentChangeProbability = 0.1;
        
        // Modyfikacje prawdopodobieństw na podstawie nastroju
        tempoChangeProbability += (energyLevel - 0.5) * 0.2;
        chordChangeProbability += (complexityLevel - 0.5) * 0.3;
        styleChangeProbability += (tensionLevel - 0.5) * 0.2;
        moodChangeProbability += (this.mood.variation - 0.5) * 0.3;
        
        // Sugestie tempa - więcej energii, szybsze tempo
        const tempoSuggestion = energyLevel < 0.3 ? 'decrease' :
                               energyLevel > 0.7 ? 'increase' : 'maintain';
        
        // Sugestie zmian akordu - większa złożoność, częstsze zmiany
        const chordSuggestion = complexityLevel < 0.3 ? 'simplify' :
                               complexityLevel > 0.7 ? 'complexify' : 'maintain';
        
        // Sugestie stylu - większe napięcie, bardziej intensywny styl
        let styleSuggestion = this.style;
        if (tensionLevel > 0.7) {
            styleSuggestion = ['bebop', 'fusion'][Math.floor(Math.random() * 2)];
        } else if (tensionLevel < 0.3) {
            styleSuggestion = ['modal', 'coolJazz'][Math.floor(Math.random() * 2)];
        }
        
        // Sugestie nastroju - szukamy nastroju pasującego do narracji
        const futureNarrativePosition = this.narrative.getMoodAtPosition(this.currentBar + 4);
        const moodOptions = Object.values(PREDEFINED_MOODS);
        
        // Znajdź nastrój najbliższy do przyszłej pozycji narracji
        let closestMood = moodOptions[0];
        let minDistance = futureNarrativePosition.distanceTo(closestMood);
        
        for (const mood of moodOptions) {
            const distance = futureNarrativePosition.distanceTo(mood);
            if (distance < minDistance) {
                minDistance = distance;
                closestMood = mood;
            }
        }
        
        return {
            tempo: {
                suggestion: tempoSuggestion,
                probability: tempoChangeProbability
            },
            chord: {
                suggestion: chordSuggestion,
                probability: chordChangeProbability
            },
            style: {
                suggestion: styleSuggestion,
                probability: styleChangeProbability
            },
            mood: {
                suggestion: closestMood.name,
                probability: moodChangeProbability
            },
            instruments: {
                probability: instrumentChangeProbability
            }
        };
    }
}

/**
 * Klasa Auto-Jazz - zaawansowany kontroler automatycznej improwizacji
 */
export class AutoJazz {
    /**
     * Konstruktor kontrolera Auto-Jazz
     * @param {Object} engine - Obiekt silnika audio
     * @param {Object} mixingSystem - System miksowania dynamicznego
     * @param {Object} sequencer - Sekwencer muzyczny
     */
    constructor(engine, mixingSystem, sequencer) {
        this.audioEngine = engine;
        this.mixingSystem = mixingSystem;
        this.sequencer = sequencer;
        this.improvisationManager = new ImprovisationManager();
        
        this.active = false;
        this.progress = 0;
        this.direction = 1;
        this.maxValue = 100;
        
        this.updateInterval = null;
        this.decisionInterval = null;
        
        this.lastActionTime = 0;
        this.actionCooldown = 5; // Sekundy między akcjami
        
        // Stan obecnej muzyki
        this.currentState = {
            style: 'swing',
            mood: 'spokojny',
            tempo: 120,
            currentChord: null,
            currentProgression: [],
            narrativeType: 'standard',
            barCount: 0
        };
        
        this.narrativeProgress = 0;
        this.phrasePosition = 0;
        
        // UI elements
        this.progressBar = null;
        this.container = null;
        this.button = null;
    }
    
    /**
     * Inicjalizuje kontroler Auto-Jazz
     * @param {HTMLElement} progressBar - Element paska postępu
     * @param {HTMLElement} container - Element kontenera
     * @param {HTMLElement} button - Element przycisku
     */
    init(progressBar, container, button) {
        this.progressBar = progressBar;
        this.container = container;
        this.button = button;
        this.updateVisuals();
    }
    
    /**
     * Aktualizuje wizualizację
     */
    updateVisuals() {
        if (this.active) {
            this.container.classList.add('auto-jazz-active');
            this.button.textContent = 'AUTO-JAZZ AKTYWNY!';
            this.button.classList.add('improvising');
            this.updateProgressBar();
        } else {
            this.container.classList.remove('auto-jazz-active');
            this.button.textContent = 'TRYB AUTO-JAZZ';
            this.button.classList.remove('improvising');
            this.progress = 0;
            this.updateProgressBar();
        }
    }
    
    /**
     * Aktualizuje pasek postępu
     */
    updateProgressBar() {
        if (this.progressBar) {
            this.progressBar.style.width = `${this.progress}%`;
        }
    }
    
    /**
     * Uruchamia Auto-Jazz
     */
    start() {
        if (this.active) return;
        
        this.active = true;
        this.progress = 0;
        this.direction = 1;
        this.improvisationManager.setStyle(this.currentState.style);
        this.improvisationManager.setMood(this.currentState.mood);
        this.improvisationManager.setNarrative(this.currentState.narrativeType);
        
        this.updateVisuals();
        this.startIntervals();
        
        // Aktywuj system miksu dynamicznego
        if (this.mixingSystem) {
            this.mixingSystem.setMood(this.currentState.mood);
            this.mixingSystem.setStyle(this.currentState.style);
            this.mixingSystem.startAutomation(500);
        }
    }
    
    /**
     * Zatrzymuje Auto-Jazz
     */
    stop() {
        if (!this.active) return;
        
        this.active = false;
        this.stopIntervals();
        this.updateVisuals();
        
        // Zatrzymaj system miksu dynamicznego
        if (this.mixingSystem) {
            this.mixingSystem.stopAutomation();
        }
    }
    
    /**
     * Uruchamia interwały dla automatyzacji
     */
    startIntervals() {
        // Zatrzymaj istniejące interwały
        this.stopIntervals();
        
        // Interwał aktualizacji wizualnej
        this.updateInterval = setInterval(() => this.update(), 400);
        
        // Interwał podejmowania decyzji muzycznych
        this.decisionInterval = setInterval(() => this.makeMusicalDecisions(), 1000);
    }
    
    /**
     * Zatrzymuje interwały
     */
    stopIntervals() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.decisionInterval) {
            clearInterval(this.decisionInterval);
            this.decisionInterval = null;
        }
    }
    
    /**
     * Aktualizuje stan Auto-Jazz
     */
    update() {
        if (!this.active) return;
        
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
        this.updateProgressBar();
    }
    
    /**
     * Aktualizuje aktualny akord
     * @param {string} chordName - Nazwa akordu
     */
    updateCurrentChord(chordName) {
        this.currentState.currentChord = chordName;
        this.improvisationManager.updateCurrentChord(chordName);
    }
    
    /**
     * Aktualizuje aktualną progresję akordów
     * @param {Array} progression - Progresja akordów
     */
    updateCurrentProgression(progression) {
        this.currentState.currentProgression = progression;
    }
    
    /**
     * Aktualizuje aktualny styl
     * @param {string} style - Styl muzyczny
     */
    updateStyle(style) {
        this.currentState.style = style;
        this.improvisationManager.setStyle(style);
        
        if (this.mixingSystem) {
            this.mixingSystem.setStyle(style);
        }
    }
    
    /**
     * Aktualizuje aktualny nastrój
     * @param {string} mood - Nastrój muzyczny
     */
    updateMood(mood) {
        this.currentState.mood = mood;
        this.improvisationManager.setMood(mood);
        
        if (this.mixingSystem) {
            this.mixingSystem.setMood(mood);
        }
    }
    
    /**
     * Aktualizuje aktualne tempo
     * @param {number} tempo - Tempo w BPM
     */
    updateTempo(tempo) {
        this.currentState.tempo = tempo;
    }
    
    /**
     * Generuje improwizację trąbki
     * @param {number} numNotes - Liczba nut
     * @param {number} baseOctave - Bazowa oktawa
     * @returns {Array} Tablica obiektów nut
     */
    generateTrumpetImprovisation(numNotes = 8, baseOctave = 5) {
        return this.improvisationManager.generateImprovisation(numNotes, baseOctave);
    }
    
    /**
     * Podejmuje decyzje muzyczne
     */
    makeMusicalDecisions() {
        if (!this.active) return;
        
        const currentTime = Date.now() / 1000;
        if (currentTime - this.lastActionTime < this.actionCooldown) {
            return; // Jeszcze nie minął czas oczekiwania
        }
        
        // Pobierz sugestie automatyzacji
        const suggestions = this.improvisationManager.generateAutomationSuggestions();
        
        // Podjęcie decyzji na podstawie sugestii
        
        // 1. Decyzja o zmianie tempa
        if (Math.random() < suggestions.tempo.probability) {
            if (suggestions.tempo.suggestion === 'increase') {
                this.changeTempoByPercentage(10); // Zwiększ tempo o 10%
            } else if (suggestions.tempo.suggestion === 'decrease') {
                this.changeTempoByPercentage(-10); // Zmniejsz tempo o 10%
            }
        }
        
        // 2. Decyzja o zmianie stylu
        if (Math.random() < suggestions.style.probability) {
            if (suggestions.style.suggestion !== this.currentState.style) {
                this.changeStyle(suggestions.style.suggestion);
            }
        }
        
        // 3. Decyzja o zmianie nastroju
        if (Math.random() < suggestions.mood.probability) {
            if (suggestions.mood.suggestion !== this.currentState.mood) {
                this.changeMood(suggestions.mood.suggestion);
            }
        }
        
        // 4. Decyzja o zmianie progresji akordów
        if (Math.random() < suggestions.chord.probability) {
            this.generateNewProgression(suggestions.chord.suggestion);
        }
        
        // Aktualizuj czas ostatniej akcji
        this.lastActionTime = currentTime;
        
        // Aktualizuj pozycję w narracji
        this.improvisationManager.advanceNarrative(1);
        this.currentState.barCount++;
    }
    
    /**
     * Wykonuje akcję po osiągnięciu maksimum na pasku postępu
     */
    takeAction() {
        if (!this.active) return;
        
        // Pobierz sugestie
        const suggestions = this.improvisationManager.generateAutomationSuggestions();
        
        // Wybierz akcję z najwyższym prawdopodobieństwem
        const actions = [
            { name: 'tempo', prob: suggestions.tempo.probability },
            { name: 'chord', prob: suggestions.chord.probability },
            { name: 'style', prob: suggestions.style.probability },
            { name: 'mood', prob: suggestions.mood.probability }
        ];
        
        // Sortuj według prawdopodobieństwa
        actions.sort((a, b) => b.prob - a.prob);
        
        // Wykonaj akcję o najwyższym prawdopodobieństwie
        const action = actions[0].name;
        
        switch (action) {
            case 'tempo':
                if (suggestions.tempo.suggestion === 'increase') {
                    this.changeTempoByPercentage(15);
                } else if (suggestions.tempo.suggestion === 'decrease') {
                    this.changeTempoByPercentage(-15);
                }
                break;
                
            case 'chord':
                this.generateNewProgression(suggestions.chord.suggestion);
                break;
                
            case 'style':
                this.changeStyle(suggestions.style.suggestion);
                break;
                
            case 'mood':
                this.changeMood(suggestions.mood.suggestion);
                break;
        }
        
        // Wizualny efekt
        this.createJazzEffect();
    }
    
    /**
     * Zmienia tempo procentowo
     * @param {number} percentage - Procent zmiany
     */
    changeTempoByPercentage(percentage) {
        const newTempo = Math.round(this.currentState.tempo * (1 + percentage / 100));
        // Ogranicz do rozsądnego zakresu
        const limitedTempo = Math.max(60, Math.min(240, newTempo));
        
        // Wywołaj funkcję zmiany tempa
        if (typeof window.updateTempo === 'function') {
            // Ustaw wartość elementu tempo
            document.getElementById('tempo').value = limitedTempo;
            window.updateTempo();
        }
        
        this.updateTempo(limitedTempo);
    }
    
    /**
     * Zmienia styl muzyczny
     * @param {string} style - Nowy styl
     */
    changeStyle(style) {
        // Lista dostępnych stylów
        const availableStyles = ['swing', 'bebop', 'fusion', 'modal', 'bossaNova', 'coolJazz'];
        
        // Sprawdź, czy styl jest dostępny
        if (!availableStyles.includes(style)) {
            style = availableStyles[Math.floor(Math.random() * availableStyles.length)];
        }
        
        // Wywołaj funkcję zmiany stylu
        if (typeof window.setStyle === 'function') {
            window.setStyle(style);
        }
        
        this.updateStyle(style);
    }
    
    /**
     * Zmienia nastrój muzyczny
     * @param {string} mood - Nowy nastrój
     */
    changeMood(mood) {
        // Lista dostępnych nastrojów
        const availableMoods = Object.keys(PREDEFINED_MOODS);
        
        // Sprawdź, czy nastrój jest dostępny
        if (!availableMoods.includes(mood)) {
            mood = availableMoods[Math.floor(Math.random() * availableMoods.length)];
        }
        
        this.updateMood(mood);
        
        // Aktualizuj wyświetlanie nastroju
        const moodDisplay = document.getElementById('moodDisplay');
        if (moodDisplay) {
            moodDisplay.textContent = mood;
        }
    }
    
    /**
     * Generuje nową progresję akordów
     * @param {string} complexity - Złożoność progresji ('simplify', 'maintain', 'complexify')
     */
    generateNewProgression(complexity = 'maintain') {
        // Ta funkcja musi być zaimplementowana w głównym kodzie
        if (typeof window.generateNewProgression === 'function') {
            window.generateNewProgression();
        }
    }
    
    /**
     * Tworzy efekt wizualny
     */
    createJazzEffect() {
        // Ta funkcja musi być zaimplementowana w głównym kodzie
        if (typeof window.createJazzEffect === 'function') {
            window.createJazzEffect();
        }
    }
    
    /**
     * Analizuje utwór i dostarcza wskazówki wykonawcze
     * @returns {Object} Analiza i wskazówki
     */
    analyzeMusic() {
        const mood = this.improvisationManager.mood;
        const currentChord = this.currentState.currentChord;
        const currentChordParsed = parseChordName(currentChord);
        const barPosition = this.currentState.barCount % 4;
        
        // Analiza harmoniczna
        const harmonicAnalysis = {
            tension: currentChordParsed ? (currentChord.includes('7') ? 'high' : 
                                         currentChord.includes('maj') ? 'low' : 'medium') : 'medium',
            function: barPosition === 0 ? 'tonic' : 
                      barPosition === 1 ? 'subdominant' :
                      barPosition === 2 ? 'dominant' : 'preparation'
        };
        
        // Wskazówki wykonawcze
        const performanceGuide = {
            dynamic: mood.energy > 0.7 ? 'forte' : 
                     mood.energy < 0.3 ? 'piano' : 'mezzo',
            articulation: mood.coherence > 0.7 ? 'legato' :
                          mood.coherence < 0.3 ? 'staccato' : 'normal',
            expressiveness: mood.variation > 0.7 ? 'very expressive' :
                            mood.variation < 0.3 ? 'restrained' : 'moderate'
        };
        
        return {
            currentMood: mood.name,
            harmonicAnalysis,
            performanceGuide,
            narrativePosition: this.narrativeProgress,
            phraseTiming: barPosition === 0 ? 'phrase start' :
                          barPosition === 3 ? 'phrase end' : 'phrase middle'
        };
    }
}

/**
 * Tworzy kontroler Auto-Jazz
 * @param {Object} audioEngine - Silnik audio
 * @param {Object} mixingSystem - System miksowania
 * @param {Object} sequencer - Sekwencer
 * @returns {AutoJazz} Kontroler Auto-Jazz
 */
export function createAutoJazz(audioEngine, mixingSystem, sequencer) {
    return new AutoJazz(audioEngine, mixingSystem, sequencer);
}