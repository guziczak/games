/**
 * Sequencer Module
 * Zawiera implementację precyzyjnego sekwencera opartego o AudioContext.currentTime
 */

/**
 * Klasa reprezentująca pojedynczy event w sekwencerze
 */
class SequencerEvent {
    /**
     * Tworzy nowy event sekwencera
     * @param {number} time - Czas bezwzględny zdarzenia (w sekundach)
     * @param {Function} callback - Funkcja wywoływana w momencie zdarzenia
     * @param {Object} data - Dane przekazywane do callbacka
     */
    constructor(time, callback, data = {}) {
        this.time = time;
        this.callback = callback;
        this.data = data;
        this.executed = false;
    }
    
    /**
     * Wywołuje event jeśli jego czas nadszedł
     * @param {number} currentTime - Aktualny czas kontekstu audio
     * @returns {boolean} Zwraca true jeśli event został wykonany
     */
    execute(currentTime) {
        if (this.executed || this.time > currentTime) {
            return false;
        }
        
        try {
            this.callback(this.time, this.data);
            this.executed = true;
            return true;
        } catch (error) {
            console.error('Błąd podczas wykonywania eventu:', error);
            this.executed = true;
            return true;
        }
    }
}

/**
 * Klasa reprezentująca sekwencę zdarzeń muzycznych
 */
export class Sequence {
    /**
     * Tworzy nową sekwencję
     * @param {Array} events - Tablica eventów do zaplanowania
     * @param {Object} options - Opcje sekwencji
     */
    constructor(events = [], options = {}) {
        this.events = events.slice();
        this.options = Object.assign({
            loop: false,
            loopDuration: 0,
            tempo: 120
        }, options);
    }
    
    /**
     * Dodaje nowy event do sekwencji
     * @param {number} time - Czas zdarzenia (w sekundach)
     * @param {Function} callback - Funkcja wywoływana w momencie zdarzenia
     * @param {Object} data - Dane przekazywane do callbacka
     */
    addEvent(time, callback, data = {}) {
        const event = new SequencerEvent(time, callback, data);
        this.events.push(event);
        this.events.sort((a, b) => a.time - b.time);
    }
    
    /**
     * Resetuje wykonanie wszystkich eventów w sekwencji
     */
    reset() {
        this.events.forEach(event => {
            event.executed = false;
        });
    }
    
    /**
     * Przesuwa wszystkie eventy o określony czas
     * @param {number} offset - Przesunięcie czasu w sekundach
     */
    shiftTime(offset) {
        this.events.forEach(event => {
            event.time += offset;
        });
    }
    
    /**
     * Tworzy kopię sekwencji
     * @returns {Sequence} Nowa sekwencja będąca kopią bieżącej
     */
    clone() {
        const clonedEvents = this.events.map(event => 
            new SequencerEvent(event.time, event.callback, {...event.data})
        );
        return new Sequence(clonedEvents, {...this.options});
    }
}

/**
 * Klasa JazzSequencer - główny sekwencer oparty o AudioContext.currentTime
 */
export class JazzSequencer {
    /**
     * Tworzy nowy sekwencer
     * @param {AudioContext} audioContext - Kontekst audio
     */
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.sequences = [];
        this.activeSequences = [];
        this.isPlaying = false;
        this.lookAheadTime = 0.1; // Patrzymy 100ms w przyszłość
        this.scheduleIntervalTime = 25; // Planujemy co 25ms
        this.timerId = null;
        this.startTime = 0;
        this.totalPausedTime = 0;
        this.pauseStartTime = 0;
        this.tempo = 120;
        this.nextNoteTime = 0;
        this.onTick = null;
        this.onBeat = null;
        this.onBar = null;
    }
    
    /**
     * Ustawia tempo sekwencera
     * @param {number} bpm - Tempo w uderzeniach na minutę (BPM)
     */
    setTempo(bpm) {
        this.tempo = bpm;
    }
    
    /**
     * Dodaje sekwencję do sekwencera
     * @param {Sequence} sequence - Sekwencja do dodania
     * @param {number} startTime - Czas rozpoczęcia sekwencji (w sekundach od startu sekwencera)
     * @returns {number} Indeks dodanej sekwencji
     */
    addSequence(sequence, startTime = 0) {
        const id = this.sequences.length;
        this.sequences.push({
            sequence,
            startTime,
            id
        });
        return id;
    }
    
    /**
     * Usuwa sekwencję z sekwencera
     * @param {number} id - Indeks sekwencji do usunięcia
     */
    removeSequence(id) {
        const index = this.sequences.findIndex(s => s.id === id);
        if (index !== -1) {
            this.sequences.splice(index, 1);
        }
    }
    
    /**
     * Zamienia istniejącą sekwencję na nową
     * @param {number} id - Indeks sekwencji do zamiany
     * @param {Sequence} sequence - Nowa sekwencja
     */
    replaceSequence(id, sequence) {
        const index = this.sequences.findIndex(s => s.id === id);
        if (index !== -1) {
            this.sequences[index].sequence = sequence;
        }
    }
    
    /**
     * Resetuje sekwencer do stanu początkowego
     */
    reset() {
        this.stop();
        this.sequences.forEach(seq => {
            seq.sequence.reset();
        });
        this.startTime = 0;
        this.totalPausedTime = 0;
    }
    
    /**
     * Uruchamia sekwencer
     */
    start() {
        if (this.isPlaying) return;
        
        // Jeśli to pierwszy start, ustawiamy czas początkowy
        if (this.startTime === 0) {
            this.startTime = this.audioContext.currentTime;
        } else if (this.pauseStartTime !== 0) {
            // Jeśli to wznowienie po pauzie, dodajemy czas pauzy
            this.totalPausedTime += (this.audioContext.currentTime - this.pauseStartTime);
            this.pauseStartTime = 0;
        }
        
        this.isPlaying = true;
        this.activeSequences = this.sequences.slice();
        
        // Uruchamiamy planowanie
        this.scheduleEvents();
    }
    
    /**
     * Wstrzymuje działanie sekwencera
     */
    pause() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        this.pauseStartTime = this.audioContext.currentTime;
        
        // Zatrzymujemy planowanie
        clearTimeout(this.timerId);
        this.timerId = null;
    }
    
    /**
     * Zatrzymuje całkowicie sekwencer
     */
    stop() {
        this.isPlaying = false;
        this.pauseStartTime = 0;
        
        // Zatrzymujemy planowanie
        clearTimeout(this.timerId);
        this.timerId = null;
        
        // Resetujemy wszystkie sekwencje
        this.sequences.forEach(seq => {
            seq.sequence.reset();
        });
    }
    
    /**
     * Planuje wydarzenia muzyczne
     * @private
     */
    scheduleEvents() {
        // Obliczamy czas absolutny
        const currentTime = this.audioContext.currentTime;
        const elapsedTime = currentTime - this.startTime - this.totalPausedTime;
        
        // Planujemy wydarzenia do czasu lookAheadTime w przyszłości
        const endTime = currentTime + this.lookAheadTime;
        
        // Przetwarzamy wszystkie aktywne sekwencje
        this.activeSequences.forEach((sequenceData, index) => {
            const { sequence, startTime } = sequenceData;
            const sequenceStartTime = this.startTime + startTime + this.totalPausedTime;
            
            // Sprawdzamy, czy sekwencja powinna się już zacząć
            if (currentTime >= sequenceStartTime) {
                // Obliczamy względny czas sekwencji
                const sequenceElapsedTime = currentTime - sequenceStartTime;
                
                // Jeśli sekwencja jest zapętlona i ma określony czas trwania
                if (sequence.options.loop && sequence.options.loopDuration > 0) {
                    // Obliczamy aktualną pozycję w pętli
                    const loopPosition = sequenceElapsedTime % sequence.options.loopDuration;
                    const loopCount = Math.floor(sequenceElapsedTime / sequence.options.loopDuration);
                    
                    // Resetujemy sekwencję na początku każdej iteracji pętli
                    if (loopCount > 0 && loopPosition < this.lookAheadTime) {
                        sequence.reset();
                    }
                    
                    // Planujemy wydarzenia w bieżącej pętli
                    sequence.events.forEach(event => {
                        if (!event.executed && event.time >= loopPosition && 
                            event.time < loopPosition + this.lookAheadTime) {
                            const absoluteTime = sequenceStartTime + loopCount * sequence.options.loopDuration + event.time;
                            if (absoluteTime <= endTime) {
                                event.callback(absoluteTime, event.data);
                                event.executed = true;
                            }
                        }
                    });
                } else {
                    // Dla sekwencji bez zapętlenia po prostu planujemy wszystkie wydarzenia
                    sequence.events.forEach(event => {
                        if (!event.executed && event.time >= sequenceElapsedTime && 
                            event.time < sequenceElapsedTime + this.lookAheadTime) {
                            const absoluteTime = sequenceStartTime + event.time;
                            if (absoluteTime <= endTime) {
                                event.callback(absoluteTime, event.data);
                                event.executed = true;
                            }
                        }
                    });
                    
                    // Sprawdzamy, czy wszystkie wydarzenia zostały wykonane
                    const allExecuted = sequence.events.every(event => event.executed);
                    if (allExecuted && !sequence.options.loop) {
                        // Jeśli wszystkie wydarzenia zostały wykonane i sekwencja nie jest zapętlona,
                        // usuwamy ją z aktywnych sekwencji
                        this.activeSequences.splice(index, 1);
                    }
                }
            }
        });
        
        // Jeśli nadal odtwarzamy, planujemy kolejną iterację
        if (this.isPlaying) {
            this.timerId = setTimeout(() => this.scheduleEvents(), this.scheduleIntervalTime);
        }
    }
    
    /**
     * Konwertuje czas w mierze muzycznej na czas w sekundach
     * @param {number} bars - Liczba taktów
     * @param {number} beats - Liczba ćwierćnut (1 na uderzenie)
     * @param {number} sixteenths - Liczba szesnastek
     * @returns {number} Czas w sekundach
     */
    musicalTimeToSeconds(bars = 0, beats = 0, sixteenths = 0) {
        const beatsPerMinute = this.tempo;
        const secondsPerBeat = 60 / beatsPerMinute;
        const secondsPerBar = secondsPerBeat * 4; // Zakładamy metrum 4/4
        const secondsPerSixteenth = secondsPerBeat / 4;
        
        return (bars * secondsPerBar) + (beats * secondsPerBeat) + (sixteenths * secondsPerSixteenth);
    }
    
    /**
     * Tworzy sekwencję dla progresji akordów
     * @param {Array} chords - Tablica akordów
     * @param {number} barsPerChord - Liczba taktów na każdy akord
     * @param {Function} chordCallback - Callback wywoływany dla każdego akordu
     * @returns {Sequence} Sekwencja progresji akordów
     */
    createChordProgression(chords, barsPerChord, chordCallback) {
        const sequence = new Sequence([], { 
            loop: true, 
            loopDuration: this.musicalTimeToSeconds(chords.length * barsPerChord)
        });
        
        chords.forEach((chord, index) => {
            const time = this.musicalTimeToSeconds(index * barsPerChord);
            sequence.addEvent(time, chordCallback, { chord, index });
        });
        
        return sequence;
    }
    
    /**
     * Tworzy sekwencję dla wzorca perkusyjnego
     * @param {Array} pattern - Wzorzec perkusyjny (tablica obiektów {type, time})
     * @param {number} bars - Liczba taktów wzorca
     * @param {Function} drumCallback - Callback wywoływany dla każdego uderzenia
     * @returns {Sequence} Sekwencja perkusyjna
     */
    createDrumPattern(pattern, bars, drumCallback) {
        const sequence = new Sequence([], { 
            loop: true, 
            loopDuration: this.musicalTimeToSeconds(bars)
        });
        
        pattern.forEach(hit => {
            const time = this.musicalTimeToSeconds(
                hit.bar || 0, hit.beat || 0, hit.sixteenth || 0
            );
            sequence.addEvent(time, drumCallback, { 
                type: hit.type, 
                velocity: hit.velocity || 0.7,
                options: hit.options || {}
            });
        });
        
        return sequence;
    }
    
    /**
     * Tworzy sekwencję dla linii basowej na podstawie progresji akordów
     * @param {Array} chords - Tablica akordów
     * @param {number} barsPerChord - Liczba taktów na każdy akord
     * @param {Function} bassPatternGenerator - Funkcja generująca wzorzec basowy dla akordu
     * @param {Function} bassCallback - Callback wywoływany dla każdej nuty basu
     * @returns {Sequence} Sekwencja basowa
     */
    createBassLine(chords, barsPerChord, bassPatternGenerator, bassCallback) {
        const sequence = new Sequence([], { 
            loop: true, 
            loopDuration: this.musicalTimeToSeconds(chords.length * barsPerChord)
        });
        
        chords.forEach((chord, chordIndex) => {
            const chordStartTime = this.musicalTimeToSeconds(chordIndex * barsPerChord);
            const bassPattern = bassPatternGenerator(chord);
            
            bassPattern.forEach(note => {
                const noteTime = chordStartTime + note.time;
                sequence.addEvent(noteTime, bassCallback, { 
                    frequency: note.frequency,
                    duration: note.duration,
                    velocity: note.velocity,
                    chord
                });
            });
        });
        
        return sequence;
    }
    
    /**
     * Tworzy sekwencję dla linii melodycznej
     * @param {Array} chords - Tablica akordów
     * @param {number} barsPerChord - Liczba taktów na każdy akord
     * @param {Function} melodyGenerator - Funkcja generująca melodię dla akordu
     * @param {Function} melodyCallback - Callback wywoływany dla każdej nuty melodii
     * @returns {Sequence} Sekwencja melodyczna
     */
    createMelodyLine(chords, barsPerChord, melodyGenerator, melodyCallback) {
        const sequence = new Sequence([], { 
            loop: true, 
            loopDuration: this.musicalTimeToSeconds(chords.length * barsPerChord)
        });
        
        chords.forEach((chord, chordIndex) => {
            const chordStartTime = this.musicalTimeToSeconds(chordIndex * barsPerChord);
            const melodyPhrase = melodyGenerator(chord);
            
            let currentTime = 0;
            melodyPhrase.forEach(note => {
                const noteTime = chordStartTime + currentTime;
                sequence.addEvent(noteTime, melodyCallback, { 
                    frequency: note.frequency,
                    duration: note.duration,
                    velocity: note.velocity,
                    chord
                });
                currentTime += note.duration;
            });
        });
        
        return sequence;
    }
    
    /**
     * Generuje metronom (używany do debugowania timingu)
     * @param {Function} tickCallback - Callback wywoływany na każde uderzenie metronomu
     * @returns {number} ID sekwencji metronomu
     */
    createMetronome(tickCallback) {
        const sequence = new Sequence([], { 
            loop: true, 
            loopDuration: this.musicalTimeToSeconds(1) // 1 takt
        });
        
        // 4 uderzenia na takt (metrum 4/4)
        for (let beat = 0; beat < 4; beat++) {
            const time = this.musicalTimeToSeconds(0, beat);
            const isDownbeat = beat === 0;
            
            sequence.addEvent(time, tickCallback, { 
                beat, 
                isDownbeat,
                velocity: isDownbeat ? 0.9 : 0.6
            });
        }
        
        return this.addSequence(sequence);
    }
}

/**
 * Funkcja pomocnicza do przeliczania czasu muzycznego na sekundy
 * @param {number} bpm - Tempo w uderzeniach na minutę
 * @param {number} bars - Liczba taktów
 * @param {number} beats - Liczba ćwierćnut (1 na uderzenie)
 * @param {number} sixteenths - Liczba szesnastek
 * @returns {number} Czas w sekundach
 */
export function calculateMusicalTime(bpm, bars = 0, beats = 0, sixteenths = 0) {
    const secondsPerBeat = 60 / bpm;
    const secondsPerBar = secondsPerBeat * 4; // Zakładamy metrum 4/4
    const secondsPerSixteenth = secondsPerBeat / 4;
    
    return (bars * secondsPerBar) + (beats * secondsPerBeat) + (sixteenths * secondsPerSixteenth);
}

/**
 * Klasa ConductorSequencer - zaawansowany sekwencer do zarządzania całym utworem
 */
export class ConductorSequencer {
    /**
     * Tworzy nowy sekwencer dyrygenta
     * @param {AudioContext} audioContext - Kontekst audio
     */
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.sequencer = new JazzSequencer(audioContext);
        this.sections = new Map(); // Mapa sekcji muzycznych (np. "A", "B", "Coda", itp.)
        this.currentSection = null;
        this.sectionTransitionTime = 0; // Czas przejścia w sekundach
        this.sectionEndCallbacks = new Map();
        this.nextSectionCallback = null;
    }
    
    /**
     * Dodaje sekcję muzyczną
     * @param {string} name - Nazwa sekcji
     * @param {Array} sequences - Tablica sekwencji w sekcji
     */
    addSection(name, sequences) {
        this.sections.set(name, {
            name,
            sequences: sequences.slice(),
            sequencerIds: []
        });
    }
    
    /**
     * Ustawia callback dla zakończenia sekcji
     * @param {string} sectionName - Nazwa sekcji
     * @param {Function} callback - Funkcja wywoływana po zakończeniu sekcji
     */
    onSectionEnd(sectionName, callback) {
        this.sectionEndCallbacks.set(sectionName, callback);
    }
    
    /**
     * Ustawia callback dla przejścia do następnej sekcji
     * @param {Function} callback - Funkcja wywoływana przy przejściu do nowej sekcji
     */
    onNextSection(callback) {
        this.nextSectionCallback = callback;
    }
    
    /**
     * Przełącza na nową sekcję
     * @param {string} sectionName - Nazwa nowej sekcji
     * @param {number} transitionTime - Czas przejścia w sekundach
     */
    changeSection(sectionName, transitionTime = 0) {
        const section = this.sections.get(sectionName);
        if (!section) {
            console.error(`Sekcja "${sectionName}" nie istnieje`);
            return;
        }
        
        // Jeśli jest aktywna sekcja, usuwamy jej sekwencje
        if (this.currentSection) {
            const currentSection = this.sections.get(this.currentSection);
            if (currentSection) {
                currentSection.sequencerIds.forEach(id => {
                    this.sequencer.removeSequence(id);
                });
                currentSection.sequencerIds = [];
            }
        }
        
        // Dodajemy sekwencje nowej sekcji
        section.sequencerIds = section.sequences.map(sequence => {
            return this.sequencer.addSequence(sequence, transitionTime);
        });
        
        this.currentSection = sectionName;
        this.sectionTransitionTime = transitionTime;
        
        // Wywołujemy callback przejścia
        if (this.nextSectionCallback) {
            this.nextSectionCallback(sectionName, transitionTime);
        }
    }
    
    /**
     * Rozpoczyna odtwarzanie
     */
    start() {
        this.sequencer.start();
    }
    
    /**
     * Wstrzymuje odtwarzanie
     */
    pause() {
        this.sequencer.pause();
    }
    
    /**
     * Zatrzymuje odtwarzanie
     */
    stop() {
        this.sequencer.stop();
    }
    
    /**
     * Ustawia tempo
     * @param {number} bpm - Tempo w uderzeniach na minutę
     */
    setTempo(bpm) {
        this.sequencer.setTempo(bpm);
    }
    
    /**
     * Tworzy automatyczną narrację muzyczną przez przechodzenie między sekcjami
     * @param {Array} sectionSequence - Tablica nazw sekcji w kolejności
     * @param {Array} sectionDurations - Tablica czasów trwania sekcji (w taktach)
     * @param {number} loopCount - Liczba pętli (-1 dla nieskończoności)
     */
    createNarrative(sectionSequence, sectionDurations, loopCount = -1) {
        if (sectionSequence.length !== sectionDurations.length) {
            console.error('Liczba sekcji musi być równa liczbie czasów trwania');
            return;
        }
        
        // Tworzymy sekwencję przejść między sekcjami
        let totalTime = 0;
        const sequence = new Sequence();
        
        for (let i = 0; i < sectionSequence.length; i++) {
            const sectionName = sectionSequence[i];
            const duration = calculateMusicalTime(this.sequencer.tempo, sectionDurations[i]);
            
            // Dodajemy event dla przejścia do sekcji
            sequence.addEvent(totalTime, (time, data) => {
                this.changeSection(data.sectionName);
            }, { sectionName });
            
            // Dodajemy event dla zakończenia sekcji
            const endTime = totalTime + duration;
            sequence.addEvent(endTime, (time, data) => {
                const callback = this.sectionEndCallbacks.get(data.sectionName);
                if (callback) {
                    callback();
                }
            }, { sectionName });
            
            totalTime = endTime;
        }
        
        // Jeśli loopCount !== -1, dodajemy pętlenie
        if (loopCount !== -1) {
            sequence.options.loop = true;
            sequence.options.loopDuration = totalTime;
            sequence.options.loopCount = loopCount;
        }
        
        return this.sequencer.addSequence(sequence);
    }
}

/**
 * Tworzy pattern perkusyjny dla danego stylu jazzu
 * @param {string} style - Styl jazzu ('swing', 'bebop', 'fusion', 'modal', itp.)
 * @param {number} bars - Liczba taktów we wzorcu
 * @returns {Array} Wzorzec perkusyjny
 */
export function createDrumPatternForStyle(style, bars = 1) {
    const pattern = [];
    
    switch (style) {
        case 'swing':
            // Klasyczny swing
            for (let bar = 0; bar < bars; bar++) {
                // Stopa (kick) na 1 i 3
                pattern.push({ type: 'kick', bar, beat: 0, velocity: 0.8 });
                pattern.push({ type: 'kick', bar, beat: 2, velocity: 0.7 });
                
                // Werbel (snare) na 2 i 4
                pattern.push({ type: 'snare', bar, beat: 1, velocity: 0.7 });
                pattern.push({ type: 'snare', bar, beat: 3, velocity: 0.7 });
                
                // Hi-hat (ride cymbal w swingu) na każdą ćwierćnutę i między
                for (let beat = 0; beat < 4; beat++) {
                    pattern.push({ type: 'hihat', bar, beat, velocity: 0.6, options: { open: false } });
                    // Triola na beat 2.5
                    if (beat % 2 === 0) {
                        pattern.push({ type: 'hihat', bar, beat: beat + 0.66, velocity: 0.4, options: { open: false } });
                        pattern.push({ type: 'hihat', bar, beat: beat + 1.33, velocity: 0.5, options: { open: false } });
                    }
                }
            }
            break;
            
        case 'bebop':
            // Szybszy, bardziej złożony rytm
            for (let bar = 0; bar < bars; bar++) {
                // Stopa (kick) na 1 i synkopa na 3.5
                pattern.push({ type: 'kick', bar, beat: 0, velocity: 0.8 });
                pattern.push({ type: 'kick', bar, beat: 2.5, velocity: 0.7 });
                
                // Werbel (snare) na 2 i 4
                pattern.push({ type: 'snare', bar, beat: 1, velocity: 0.7 });
                pattern.push({ type: 'snare', bar, beat: 3, velocity: 0.7 });
                
                // Hi-hat (ride cymbal) na każdą ósemkę
                for (let beat = 0; beat < 4; beat++) {
                    for (let eighth = 0; eighth < 2; eighth++) {
                        const time = beat + (eighth * 0.5);
                        pattern.push({ 
                            type: 'hihat', 
                            bar, 
                            beat: time, 
                            velocity: eighth === 0 ? 0.6 : 0.4,
                            options: { open: false }
                        });
                    }
                }
                
                // Akcenty na crashu
                if (bar === 0 || bar === bars - 1) {
                    pattern.push({ type: 'crash', bar, beat: 0, velocity: 0.7 });
                }
            }
            break;
            
        case 'fusion':
            // Synkopowany, funkowy rytm
            for (let bar = 0; bar < bars; bar++) {
                // Stopa (kick) na 1, 2.5 i 4
                pattern.push({ type: 'kick', bar, beat: 0, velocity: 0.8 });
                pattern.push({ type: 'kick', bar, beat: 1.5, velocity: 0.7 });
                pattern.push({ type: 'kick', bar, beat: 3, velocity: 0.75 });
                
                // Werbel (snare) na 2 i 4
                pattern.push({ type: 'snare', bar, beat: 1, velocity: 0.7 });
                pattern.push({ type: 'snare', bar, beat: 3, velocity: 0.7 });
                
                // Ghost notes na werblu
                pattern.push({ type: 'snare', bar, beat: 0.75, velocity: 0.3, options: { tone: 0.7 } });
                pattern.push({ type: 'snare', bar, beat: 2.5, velocity: 0.3, options: { tone: 0.7 } });
                pattern.push({ type: 'snare', bar, beat: 2.75, velocity: 0.3, options: { tone: 0.7 } });
                
                // Hi-hat z charakterystycznym otwarciem na "a" z "2 i a"
                for (let beat = 0; beat < 4; beat++) {
                    const isOpen = (beat === 1 || beat === 3);
                    pattern.push({ 
                        type: 'hihat', 
                        bar, 
                        beat, 
                        velocity: 0.6,
                        options: { open: isOpen }
                    });
                    pattern.push({ 
                        type: 'hihat', 
                        bar, 
                        beat: beat + 0.5, 
                        velocity: 0.4,
                        options: { open: false }
                    });
                }
                
                // Tom fill co 4 takty
                if (bar % 4 === 3) {
                    pattern.push({ type: 'tom', bar, beat: 3.5, velocity: 0.6, options: { frequency: 200 } });
                    pattern.push({ type: 'tom', bar, beat: 3.75, velocity: 0.6, options: { frequency: 150 } });
                    pattern.push({ type: 'tom', bar, beat: 3.875, velocity: 0.6, options: { frequency: 100 } });
                }
            }
            break;
            
        case 'modal':
            // Minimalistyczny, przestrzenny
            for (let bar = 0; bar < bars; bar++) {
                // Stopa (kick) tylko na 1
                pattern.push({ type: 'kick', bar, beat: 0, velocity: 0.8 });
                
                // Werbel (snare) na 3
                pattern.push({ type: 'snare', bar, beat: 2, velocity: 0.6 });
                
                // Ride cymbal tylko na ćwierćnuty
                for (let beat = 0; beat < 4; beat++) {
                    pattern.push({ 
                        type: 'hihat', 
                        bar, 
                        beat, 
                        velocity: beat === 0 ? 0.6 : 0.4,
                        options: { open: beat === 2 }
                    });
                }
                
                // Tom fill do podkreślenia nastroju
                if (bar % 2 === 1) {
                    pattern.push({ type: 'tom', bar, beat: 3, velocity: 0.5, options: { frequency: 120 } });
                    pattern.push({ type: 'tom', bar, beat: 3.75, velocity: 0.4, options: { frequency: 80 } });
                }
            }
            break;
            
        case 'bossaNova':
            // Charakterystyczny rytm bossa nova
            for (let bar = 0; bar < bars; bar++) {
                // Stopa (kick) na 1 i 3
                pattern.push({ type: 'kick', bar, beat: 0, velocity: 0.7 });
                pattern.push({ type: 'kick', bar, beat: 2, velocity: 0.6 });
                
                // Werbel (snare) jako rim click
                pattern.push({ type: 'snare', bar, beat: 1, velocity: 0.4, options: { snappy: 0.9 } });
                pattern.push({ type: 'snare', bar, beat: 3, velocity: 0.4, options: { snappy: 0.9 } });
                
                // Synkopowany hi-hat
                pattern.push({ type: 'hihat', bar, beat: 0, velocity: 0.5, options: { open: false } });
                pattern.push({ type: 'hihat', bar, beat: 1, velocity: 0.4, options: { open: false } });
                pattern.push({ type: 'hihat', bar, beat: 2, velocity: 0.5, options: { open: false } });
                pattern.push({ type: 'hihat', bar, beat: 3, velocity: 0.4, options: { open: false } });
                
                // Synkopa na "a" z "1 i a"
                pattern.push({ type: 'hihat', bar, beat: 0.75, velocity: 0.6, options: { open: true } });
                pattern.push({ type: 'hihat', bar, beat: 2.75, velocity: 0.6, options: { open: true } });
            }
            break;
            
        case 'coolJazz':
            // Cool jazz - bardziej stonowany niż bebop
            for (let bar = 0; bar < bars; bar++) {
                // Stopa (kick) na 1 i lekki akcent na 3
                pattern.push({ type: 'kick', bar, beat: 0, velocity: 0.6 });
                pattern.push({ type: 'kick', bar, beat: 2, velocity: 0.4 });
                
                // Werbel (snare) lekki na 2 i mocniejszy na 4
                pattern.push({ type: 'snare', bar, beat: 1, velocity: 0.5 });
                pattern.push({ type: 'snare', bar, beat: 3, velocity: 0.6 });
                
                // Ride cymbal z charakterystycznym ding-ding-a-ding
                for (let beat = 0; beat < 4; beat++) {
                    pattern.push({ type: 'hihat', bar, beat, velocity: 0.5, options: { open: false } });
                    if (beat % 2 === 0) {
                        pattern.push({ type: 'hihat', bar, beat: beat + 0.75, velocity: 0.35, options: { open: false } });
                    } else {
                        pattern.push({ type: 'hihat', bar, beat: beat + 0.5, velocity: 0.35, options: { open: false } });
                    }
                }
                
                // Delikatny brush effect
                if (bar % 2 === 1) {
                    for (let sixteenth = 0; sixteenth < 4; sixteenth++) {
                        pattern.push({ 
                            type: 'snare', 
                            bar, 
                            beat: 3, 
                            sixteenth: sixteenth * 0.25, 
                            velocity: 0.2 + (sixteenth * 0.05),
                            options: { snappy: 0.9, tone: 0.8 }
                        });
                    }
                }
            }
            break;
            
        default:
            // Standardowy pattern jazzowy
            for (let bar = 0; bar < bars; bar++) {
                // Stopa (kick) na 1 i 3
                pattern.push({ type: 'kick', bar, beat: 0, velocity: 0.8 });
                pattern.push({ type: 'kick', bar, beat: 2, velocity: 0.7 });
                
                // Werbel (snare) na 2 i 4
                pattern.push({ type: 'snare', bar, beat: 1, velocity: 0.7 });
                pattern.push({ type: 'snare', bar, beat: 3, velocity: 0.7 });
                
                // Hi-hat na każdą ćwierćnutę
                for (let beat = 0; beat < 4; beat++) {
                    pattern.push({ type: 'hihat', bar, beat, velocity: 0.6, options: { open: beat === 0 } });
                }
            }
    }
    
    return pattern;
}

/**
 * Tworzy wariant perkusyjny przy zmianie dynamiki
 * @param {Array} basePattern - Bazowy wzorzec perkusyjny
 * @param {string} dynamicLevel - Poziom dynamiki ('low', 'medium', 'high')
 * @returns {Array} Zmodyfikowany wzorzec perkusyjny
 */
export function createDrumDynamicVariant(basePattern, dynamicLevel) {
    // Tworzymy kopię wzorca
    const pattern = JSON.parse(JSON.stringify(basePattern));
    
    switch (dynamicLevel) {
        case 'low':
            // Cicha dynamika - mniej uderzeń, cichsze
            pattern.forEach(hit => {
                // Redukuj głośność
                hit.velocity = hit.velocity * 0.7;
                
                // Usuń część ghost notes i akcentów
                if (hit.type === 'snare' && hit.velocity < 0.4) {
                    hit.velocity = 0;  // Oznacza, że uderzenie zostanie pominięte
                }
                
                // Mniej hi-hatów
                if (hit.type === 'hihat' && !Number.isInteger(hit.beat)) {
                    hit.velocity = 0;
                }
                
                // Brak crashy
                if (hit.type === 'crash') {
                    hit.velocity = 0;
                }
            });
            break;
            
        case 'medium':
            // Średnia dynamika - bez zmian
            break;
            
        case 'high':
            // Wysoka dynamika - więcej uderzeń, głośniejsze
            pattern.forEach(hit => {
                // Zwiększ głośność
                hit.velocity = Math.min(1.0, hit.velocity * 1.3);
                
                // Więcej akcentów na hi-hatach
                if (hit.type === 'hihat') {
                    if (Number.isInteger(hit.beat)) {
                        hit.velocity = Math.min(1.0, hit.velocity * 1.2);
                    }
                }
            });
            
            // Dodaj dodatkowe akcenty i fills
            const lastBar = Math.max(...pattern.map(hit => hit.bar || 0));
            
            // Dodaj crash na początku
            pattern.push({ type: 'crash', bar: 0, beat: 0, velocity: 0.8 });
            
            // Dodaj tom fill na końcu
            for (let i = 0; i < 4; i++) {
                pattern.push({ 
                    type: 'tom', 
                    bar: lastBar, 
                    beat: 3 + (i * 0.25), 
                    velocity: 0.7 - (i * 0.1),
                    options: { frequency: 200 - (i * 30) }
                });
            }
            break;
    }
    
    // Przefiltruj uderzenia z velocity 0
    return pattern.filter(hit => hit.velocity > 0);
}

/**
 * Funkcja mieszająca dwa wzorce perkusyjne
 * @param {Array} patternA - Pierwszy wzorzec perkusyjny
 * @param {Array} patternB - Drugi wzorzec perkusyjny
 * @param {number} mixRatio - Współczynnik mieszania (0-1, gdzie 0 = tylko A, 1 = tylko B)
 * @returns {Array} Zmieszany wzorzec perkusyjny
 */
export function mixDrumPatterns(patternA, patternB, mixRatio) {
    // Tworzymy kopie wzorców
    const copyA = JSON.parse(JSON.stringify(patternA));
    const copyB = JSON.parse(JSON.stringify(patternB));
    
    // Tworzymy nowy wzorzec
    const mixedPattern = [];
    
    // Dodaj wszystkie uderzenia z A z odpowiednią głośnością
    copyA.forEach(hit => {
        if (Math.random() > mixRatio) {
            hit.velocity *= (1 - mixRatio);
            mixedPattern.push(hit);
        }
    });
    
    // Dodaj wszystkie uderzenia z B z odpowiednią głośnością
    copyB.forEach(hit => {
        if (Math.random() < mixRatio) {
            hit.velocity *= mixRatio;
            mixedPattern.push(hit);
        }
    });
    
    return mixedPattern;
}