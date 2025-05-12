/**
 * Music Theory Module
 * Zawiera definicje, stałe i funkcje związane z teorią muzyczną
 */

// Eksport list możliwych nastrojów muzycznych
export const MOODS = [
    'spokojny', 'energiczny', 'nastrojowy', 'melancholijny', 
    'radosny', 'zaskakujący', 'eksperymentalny', 'minimalistyczny', 
    'intensywny', 'kontemplacyjny',
    // Rozszerzone nastroje
    'tajemniczy', 'nostalgiczny', 'triumfalny', 'niepokojący',
    'refleksyjny', 'wzniosły', 'liryczny', 'przejmujący'
];

// Skale muzyczne dla improwizacji
export const SCALES = {
    majorScale: [0, 2, 4, 5, 7, 9, 11], // Skala durowa (jońska)
    minorScale: [0, 2, 3, 5, 7, 8, 10], // Skala molowa naturalna (eolska)
    dorianScale: [0, 2, 3, 5, 7, 9, 10], // Skala dorycka
    phrygianScale: [0, 1, 3, 5, 7, 8, 10], // Skala frygijska
    lydianScale: [0, 2, 4, 6, 7, 9, 11], // Skala lidyjska
    mixolydianScale: [0, 2, 4, 5, 7, 9, 10], // Skala miksolidyjska
    locrianScale: [0, 1, 3, 5, 6, 8, 10], // Skala lokrycka
    bluesScale: [0, 3, 5, 6, 7, 10], // Skala bluesowa
    pentatonicMajor: [0, 2, 4, 7, 9], // Pentatonika durowa
    pentatonicMinor: [0, 3, 5, 7, 10], // Pentatonika molowa
    melodicMinor: [0, 2, 3, 5, 7, 9, 11], // Skala molowa melodyczna (w górę)
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11], // Skala molowa harmoniczna
    // Dodatkowe skale jazzowe
    bebopDominant: [0, 2, 4, 5, 7, 9, 10, 11], // Skala bebop dominantowa
    bebopDorian: [0, 2, 3, 4, 5, 7, 9, 10], // Skala bebop dorycka
    bebopMajor: [0, 2, 4, 5, 7, 8, 9, 11], // Skala bebop majorowa
    alteredScale: [0, 1, 3, 4, 6, 8, 10], // Skala alterowana (superlocrian)
    diminishedScale: [0, 2, 3, 5, 6, 8, 9, 11], // Skala zmniejszona
    wholeTone: [0, 2, 4, 6, 8, 10] // Skala całotonowa
};

// Rozszerzona lista akordów jazzowych
export const JAZZ_CHORDS = {
    major7: ['Cmaj7', 'Dbmaj7', 'Dmaj7', 'Ebmaj7', 'Emaj7', 'Fmaj7', 'Gbmaj7', 'Gmaj7', 'Abmaj7', 'Amaj7', 'Bbmaj7', 'Bmaj7'],
    minor7: ['Cm7', 'Dbm7', 'Dm7', 'Ebm7', 'Em7', 'Fm7', 'Gbm7', 'Gm7', 'Abm7', 'Am7', 'Bbm7', 'Bm7'],
    dominant7: ['C7', 'Db7', 'D7', 'Eb7', 'E7', 'F7', 'Gb7', 'G7', 'Ab7', 'A7', 'Bb7', 'B7'],
    half_diminished: ['Cm7b5', 'Dbm7b5', 'Dm7b5', 'Ebm7b5', 'Em7b5', 'Fm7b5', 'Gbm7b5', 'Gm7b5', 'Abm7b5', 'Am7b5', 'Bbm7b5', 'Bm7b5'],
    diminished: ['Cdim7', 'Dbdim7', 'Ddim7', 'Ebdim7', 'Edim7', 'Fdim7', 'Gbdim7', 'Gdim7', 'Abdim7', 'Adim7', 'Bbdim7', 'Bdim7'],
    augmented: ['Caug', 'Dbaug', 'Daug', 'Ebaug', 'Eaug', 'Faug', 'Gbaug', 'Gaug', 'Abaug', 'Aaug', 'Bbaug', 'Baug'],
    altered: ['C7b9', 'Db7b9', 'D7b9', 'Eb7b9', 'E7b9', 'F7b9', 'Gb7b9', 'G7b9', 'Ab7b9', 'A7b9', 'Bb7b9', 'B7b9',
              'C7#9', 'Db7#9', 'D7#9', 'Eb7#9', 'E7#9', 'F7#9', 'Gb7#9', 'G7#9', 'Ab7#9', 'A7#9', 'Bb7#9', 'B7#9',
              'C7b5', 'Db7b5', 'D7b5', 'Eb7b5', 'E7b5', 'F7b5', 'Gb7b5', 'G7b5', 'Ab7b5', 'A7b5', 'Bb7b5', 'B7b5'],
    extended: ['C9', 'Db9', 'D9', 'Eb9', 'E9', 'F9', 'Gb9', 'G9', 'Ab9', 'A9', 'Bb9', 'B9', 
               'C11', 'Db11', 'D11', 'Eb11', 'E11', 'F11', 'Gb11', 'G11', 'Ab11', 'A11', 'Bb11', 'B11',
               'C13', 'Db13', 'D13', 'Eb13', 'E13', 'F13', 'Gb13', 'G13', 'Ab13', 'A13', 'Bb13', 'B13'],
    suspended: ['Csus4', 'Dbsus4', 'Dsus4', 'Ebsus4', 'Esus4', 'Fsus4', 'Gbsus4', 'Gsus4', 'Absus4', 'Asus4', 'Bbsus4', 'Bsus4',
                'C7sus4', 'Db7sus4', 'D7sus4', 'Eb7sus4', 'E7sus4', 'F7sus4', 'Gb7sus4', 'G7sus4', 'Ab7sus4', 'A7sus4', 'Bb7sus4', 'B7sus4'],
    sixth: ['C6', 'Db6', 'D6', 'Eb6', 'E6', 'F6', 'Gb6', 'G6', 'Ab6', 'A6', 'Bb6', 'B6',
            'Cm6', 'Dbm6', 'Dm6', 'Ebm6', 'Em6', 'Fm6', 'Gbm6', 'Gm6', 'Abm6', 'Am6', 'Bbm6', 'Bm6'],
    ninth: ['Cmaj9', 'Dbmaj9', 'Dmaj9', 'Ebmaj9', 'Emaj9', 'Fmaj9', 'Gbmaj9', 'Gmaj9', 'Abmaj9', 'Amaj9', 'Bbmaj9', 'Bmaj9',
            'Cm9', 'Dbm9', 'Dm9', 'Ebm9', 'Em9', 'Fm9', 'Gbm9', 'Gm9', 'Abm9', 'Am9', 'Bbm9', 'Bm9']
};

// Rozszerzone progresje akordów jazzowych
export const JAZZ_PROGRESSIONS = {
    swing: [
        ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'], // ii-V-I
        ['Cmaj7', 'Am7', 'Dm7', 'G7'],   // I-vi-ii-V
        ['Dm7', 'G7', 'Em7', 'A7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'], // ii-V-iii-VI-ii-V-I
        // Dodatkowe progresje swing
        ['Cmaj7', 'Cmaj7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7', 'D7', 'G7'],
        ['Cmaj7', 'Fmaj7', 'Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Em7', 'A7'],
        ['Dm7', 'G7', 'Cmaj7', 'A7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7']
    ],
    bebop: [
        ['Cmaj7', 'Cm7', 'F7', 'Bbmaj7', 'Bbm7', 'Eb7', 'Abmaj7', 'G7'], // Coltrane changes
        ['Dm7', 'G7', 'Cmaj7', 'A7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'],     // ii-V-I z alteracjami
        ['Cmaj7', 'E7', 'Am7', 'D7', 'Dmaj7', 'F7', 'Bbmaj7', 'G7'],     // Pattern z modulacjami
        // Dodatkowe progresje bebop
        ['Dm7', 'G7b9', 'Cmaj7', 'Ebdim7', 'Dm7', 'G7b9', 'Cmaj7', 'C7'],
        ['F7', 'E7', 'Eb7', 'D7', 'G7', 'C7', 'F7', 'Bb7'],
        ['C7', 'F7', 'Bb7', 'Eb7', 'Ab7', 'Db7', 'Gb7', 'B7'],
        ['Dm7', 'G7', 'Cmaj7', 'F7', 'Bm7b5', 'E7alt', 'Am7', 'D7b9']
    ],
    fusion: [
        ['Cmaj7', 'Dbmaj7', 'Dmaj7', 'Ebmaj7'],     // Modulacje chromatyczne
        ['Em7', 'A7', 'Dmaj7', 'Gmaj7', 'Cmaj7'],   // Sekwencje kwintowe
        ['Csus4', 'Fsus4', 'Gsus4', 'Ebmaj7', 'Dm7'], // Brzmienia modalne
        // Dodatkowe progresje fusion
        ['Cm11', 'Fm11', 'Bbm11', 'Ebm11'],
        ['Cmaj7#11', 'Abmaj7', 'Dbmaj7#11', 'Gmaj7sus4'],
        ['E7sus4', 'D7sus4', 'A7sus4', 'Gmaj7', 'Bbmaj7', 'Amaj7'],
        ['Cm9', 'Fm9', 'Bb13', 'Eb13', 'Abmaj9', 'G13sus4', 'C6/9']
    ],
    modal: [
        ['Dm7', 'Dm7', 'Dm7', 'Dm7', 'Dm7', 'Dm7', 'Dm7', 'Dm7'],        // Dorian
        ['Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7', 'Fmaj7', 'Fmaj7', 'Cmaj7', 'Cmaj7'], // Ionian
        ['Em7', 'Em7', 'Em7', 'Em7', 'Em7', 'Em7', 'Em7', 'Em7'],         // Phrygian
        // Dodatkowe progresje modalne
        ['Gmaj7', 'Am7', 'Bm7', 'Cmaj7', 'D7', 'Em7', 'F#m7b5', 'Gmaj7'], // Ascendant Ionian
        ['F#m7b5', 'F#m7b5', 'Bm7', 'Bm7', 'Em7', 'Em7', 'A7', 'A7'],     // Locrian to Dorian
        ['Dmaj7#11', 'Dmaj7#11', 'Dmaj7#11', 'Dmaj7#11', 'Ebmaj7#11', 'Ebmaj7#11', 'Dmaj7#11', 'Dmaj7#11'] // Lydian shifts
    ],
    bossaNova: [
        ['Fmaj7', 'G7', 'Em7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
        ['Am7', 'D7', 'Gmaj7', 'Cmaj7', 'F#m7b5', 'B7b9', 'Em7', 'E7'],
        ['Am7', 'D7', 'Gmaj7', 'Cmaj7', 'Fm7', 'Bb7', 'Ebmaj7', 'Ebmaj7'],
        ['Cm7', 'Fm7', 'Dm7b5', 'G7b9', 'Cm6', 'Fm7', 'D7b9', 'G7']
    ],
    coolJazz: [
        ['Cmaj7', 'Am7', 'Fm7', 'Bb7', 'Gmaj7', 'Em7', 'Ebmaj7', 'D7'],
        ['Fmaj7', 'Em7', 'Ebmaj7', 'Dm7', 'Dbmaj7', 'C7', 'Fmaj7', 'Bbmaj7'],
        ['Gmaj7', 'Bb7', 'Ebmaj7', 'F#7', 'Bmaj7', 'D7', 'Gmaj7', 'Cmaj7']
    ]
};

// Częstotliwości dla podstawowych nut (oktawa 4)
export const NOTE_FREQUENCIES = {
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

// Interwały muzyczne
export const INTERVALS = {
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
    octave: 2,
    minor9th: 2.1189,
    major9th: 2.2449,
    minor10th: 2.3784,
    major10th: 2.5198,
    perfect11th: 2.6696,
    tritone9: 2.8284,
    perfect12th: 2.9966,
    minor13th: 3.1748,
    major13th: 3.3636,
    minor14th: 3.5636,
    major14th: 3.7755,
    doubleOctave: 4
};

// Główne kolory dla typów akordów
export const CHORD_COLORS = {
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
    'm6': { h: 200, s: 70, l: 60 },    // niebieskozielony
    'aug': { h: 20, s: 90, l: 55 },    // pomarańczowo-czerwony
    'maj7#11': { h: 135, s: 80, l: 60 }, // zielono-niebieski
    'dim': { h: 290, s: 70, l: 60 },   // fiolet
    'mMaj7': { h: 265, s: 70, l: 60 }, // niebieskofioletowy
    '7#5': { h: 15, s: 80, l: 60 },    // czerwono-pomarańczowy
    '7sus4': { h: 190, s: 70, l: 60 }  // niebieskozielony
};

/**
 * Pobiera częstotliwość dla danej nuty i oktawy
 * @param {string} noteName - Nazwa nuty (np. "C", "Db")
 * @param {number} octave - Numer oktawy (domyślnie 4)
 * @returns {number} Częstotliwość w Hz
 */
export function getNoteFrequency(noteName, octave = 4) {
    // Pobierz częstotliwość bazową dla C4
    const baseFreq = NOTE_FREQUENCIES[noteName];
    if (!baseFreq) return null;
    
    // Dostosuj oktawę
    const octaveDiff = octave - 4;
    return baseFreq * Math.pow(2, octaveDiff);
}

/**
 * Rozkłada nazwę akordu na składniki (root note, typ akordu)
 * @param {string} chordName - Nazwa akordu (np. "Cmaj7", "Dm7b5")
 * @returns {Object} Obiekt zawierający rootNote i chordType
 */
export function parseChordName(chordName) {
    if (!chordName) return { rootNote: null, chordType: null };
    
    // Znajdź pierwszy znak, który nie jest literą nuty lub bemol/krzyżyk
    const rootEndIndex = chordName.search(/maj|m|dim|sus|aug|[0-9]/);
    if (rootEndIndex === -1) return { rootNote: chordName, chordType: '' };
    
    const rootNote = chordName.slice(0, rootEndIndex);
    const chordType = chordName.slice(rootEndIndex);
    
    return { rootNote, chordType };
}

/**
 * Generuje częstotliwości dźwięków składowych akordu
 * @param {string} chordName - Nazwa akordu (np. "Cmaj7", "Dm7b5")
 * @param {number} octave - Bazowa oktawa dla akordu (domyślnie 4)
 * @returns {Array} Tablica częstotliwości dźwięków składowych akordu
 */
export function getChordFrequencies(chordName, octave = 4) {
    const { rootNote, chordType } = parseChordName(chordName);
    if (!rootNote) return [];
    
    // Pobierz częstotliwość bazową
    let baseFreq = getNoteFrequency(rootNote, octave);
    if (!baseFreq) return [];
    
    // Określ typ akordu i odpowiednie interwały
    let intervals = [];
    
    // Ustal interwały w zależności od typu akordu
    const isMinor = chordType.includes('m') && !chordType.includes('maj');
    
    // Przebudowana logika określania interwałów
    if (chordType.includes('maj7#11')) {
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.major7th, INTERVALS.perfect11th * 1.02];
    } else if (chordType.includes('maj13')) {
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.major7th, INTERVALS.major9th, INTERVALS.major13th];
    } else if (chordType.includes('maj11')) {
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.major7th, INTERVALS.perfect11th];
    } else if (chordType.includes('maj9')) {
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.major7th, INTERVALS.major9th];
    } else if (chordType.includes('maj7')) {
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.major7th];
    } else if (chordType.includes('m13')) {
        intervals = [INTERVALS.unison, INTERVALS.minor3rd, INTERVALS.perfect5th, INTERVALS.minor7th, INTERVALS.major9th, INTERVALS.major13th];
    } else if (chordType.includes('m11')) {
        intervals = [INTERVALS.unison, INTERVALS.minor3rd, INTERVALS.perfect5th, INTERVALS.minor7th, INTERVALS.perfect11th];
    } else if (chordType.includes('m9')) {
        intervals = [INTERVALS.unison, INTERVALS.minor3rd, INTERVALS.perfect5th, INTERVALS.minor7th, INTERVALS.major9th];
    } else if (chordType.includes('m7b5')) {
        intervals = [INTERVALS.unison, INTERVALS.minor3rd, INTERVALS.tritone, INTERVALS.minor7th];
    } else if (chordType.includes('m7')) {
        intervals = [INTERVALS.unison, INTERVALS.minor3rd, INTERVALS.perfect5th, INTERVALS.minor7th];
    } else if (chordType.includes('mMaj7')) {
        intervals = [INTERVALS.unison, INTERVALS.minor3rd, INTERVALS.perfect5th, INTERVALS.major7th];
    } else if (chordType.includes('7#11')) {
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.minor7th, INTERVALS.tritone * 2];
    } else if (chordType.includes('7#9')) {
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.minor7th, INTERVALS.minor3rd * 2];
    } else if (chordType.includes('7b9')) {
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.minor7th, INTERVALS.minor9th];
    } else if (chordType.includes('7#5')) {
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.minor6th, INTERVALS.minor7th];
    } else if (chordType.includes('7b5')) {
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.tritone, INTERVALS.minor7th];
    } else if (chordType.includes('13')) {
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.minor7th, INTERVALS.major9th, INTERVALS.major13th];
    } else if (chordType.includes('11')) {
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.minor7th, INTERVALS.perfect11th];
    } else if (chordType.includes('9')) {
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.minor7th, INTERVALS.major9th];
    } else if (chordType.includes('7sus4')) {
        intervals = [INTERVALS.unison, INTERVALS.perfect4th, INTERVALS.perfect5th, INTERVALS.minor7th];
    } else if (chordType.includes('7')) {
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.minor7th];
    } else if (chordType.includes('dim7')) {
        intervals = [INTERVALS.unison, INTERVALS.minor3rd, INTERVALS.tritone, INTERVALS.major6th];
    } else if (chordType.includes('dim')) {
        intervals = [INTERVALS.unison, INTERVALS.minor3rd, INTERVALS.tritone];
    } else if (chordType.includes('aug')) {
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.minor6th];
    } else if (chordType.includes('sus4')) {
        intervals = [INTERVALS.unison, INTERVALS.perfect4th, INTERVALS.perfect5th];
    } else if (chordType.includes('sus2')) {
        intervals = [INTERVALS.unison, INTERVALS.major2nd, INTERVALS.perfect5th];
    } else if (chordType.includes('6/9')) {
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.major6th, INTERVALS.major9th];
    } else if (chordType.includes('6')) {
        if (isMinor) {
            intervals = [INTERVALS.unison, INTERVALS.minor3rd, INTERVALS.perfect5th, INTERVALS.major6th];
        } else {
            intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.perfect5th, INTERVALS.major6th];
        }
    } else if (isMinor) {
        intervals = [INTERVALS.unison, INTERVALS.minor3rd, INTERVALS.perfect5th];
    } else {
        // Domyślnie major
        intervals = [INTERVALS.unison, INTERVALS.major3rd, INTERVALS.perfect5th];
    }
    
    // Oblicz częstotliwości dla składowych akordu
    return intervals.map(interval => baseFreq * interval);
}

/**
 * Pobiera skalę muzyczną odpowiednią dla danego akordu
 * @param {string} chordName - Nazwa akordu (np. "Cmaj7", "Dm7b5")
 * @returns {Array} Tablica offsetów półtonów dla danej skali
 */
export function getScaleForChord(chordName) {
    const { rootNote, chordType } = parseChordName(chordName);
    
    // Domyślna skala
    let scale = SCALES.majorScale;
    
    // Wybór skali na podstawie typu akordu
    if (chordType.includes('maj7#11')) {
        scale = SCALES.lydianScale;
    } else if (chordType.includes('maj7') || chordType.includes('maj9') || chordType.includes('6')) {
        scale = SCALES.majorScale; // Jońska
    } else if (chordType.includes('m7') && !chordType.includes('m7b5')) {
        scale = SCALES.dorianScale;
    } else if (chordType.includes('7')) {
        scale = SCALES.mixolydianScale;
    } else if (chordType.includes('m7b5')) {
        scale = SCALES.locrianScale;
    } else if (chordType.includes('dim')) {
        scale = SCALES.diminishedScale;
    } else if (chordType.includes('aug')) {
        scale = SCALES.wholeTone;
    } else if (chordType.includes('sus4')) {
        scale = SCALES.mixolydianScale;
    } else if (chordType.includes('7alt') || chordType.includes('7b9') || chordType.includes('7#9')) {
        scale = SCALES.alteredScale;
    } else if (chordType.includes('m')) {
        scale = SCALES.minorScale; // Eolska
    }
    
    return scale;
}

/**
 * Generuje melodyczną frazę na podstawie akordu
 * @param {string} chordName - Nazwa akordu
 * @param {number} numNotes - Liczba nut w frazie (domyślnie 4)
 * @param {number} baseOctave - Bazowa oktawa (domyślnie 5)
 * @returns {Array} Tablica obiektów {frequency, duration, time}
 */
export function generateMelodicPhrase(chordName, numNotes = 4, baseOctave = 5) {
    const { rootNote, chordType } = parseChordName(chordName);
    if (!rootNote) return [];
    
    // Pobierz skalę dla akordu
    const scale = getScaleForChord(chordName);
    
    // Pobierz podstawową częstotliwość dla nuty podstawowej w danej oktawie
    const rootFreq = getNoteFrequency(rootNote, baseOctave);
    if (!rootFreq) return [];
    
    // Generacja frazy melodycznej
    let phrase = [];
    let lastIndex = -1;
    
    // Wygeneruj pierwszy dźwięk (często z akordu)
    const startingNote = Math.floor(Math.random() * 3);
    if (startingNote === 0) {
        // Zacznij od nuty podstawowej
        phrase.push({
            frequency: rootFreq,
            duration: 0.25 + Math.random() * 0.5, // Zmienna długość
            velocity: 0.6 + Math.random() * 0.3
        });
        lastIndex = 0;
    } else {
        // Zacznij od innej nuty ze skali
        const scaleIndex = Math.floor(Math.random() * scale.length);
        const freq = rootFreq * Math.pow(2, scale[scaleIndex] / 12);
        phrase.push({
            frequency: freq,
            duration: 0.25 + Math.random() * 0.5,
            velocity: 0.6 + Math.random() * 0.3
        });
        lastIndex = scaleIndex;
    }
    
    // Dodaj pozostałe nuty
    for (let i = 1; i < numNotes; i++) {
        // Określ przeskok interwałowy (preferuj małe skoki)
        let intervalJump;
        const jumpType = Math.random();
        
        if (jumpType < 0.6) {
            // Mały skok (sekunda lub tercja)
            intervalJump = Math.floor(Math.random() * 3) - 1; // -1, 0, lub 1
        } else if (jumpType < 0.9) {
            // Średni skok (kwarta lub kwinta)
            intervalJump = (Math.floor(Math.random() * 3) + 2) * (Math.random() < 0.5 ? -1 : 1); // -3, -2, 2, lub 3
        } else {
            // Duży skok (seksta lub więcej)
            intervalJump = (Math.floor(Math.random() * 3) + 4) * (Math.random() < 0.5 ? -1 : 1); // -6, -5, -4, 4, 5, lub 6
        }
        
        // Oblicz nowy indeks skali
        let newIndex = lastIndex + intervalJump;
        
        // Upewnij się, że indeks jest w zakresie skali (z możliwym przeskokiem oktawy)
        while (newIndex < 0) newIndex += 7; // Przeskocz oktawę w dół
        while (newIndex >= scale.length) newIndex -= 7; // Przeskocz oktawę w górę
        
        // Oblicz częstotliwość dla nowej nuty
        let octaveShift = 0;
        if (newIndex < 0) octaveShift = -1;
        if (newIndex >= scale.length) octaveShift = 1;
        
        const actualIndex = ((newIndex % scale.length) + scale.length) % scale.length;
        const octaveFactor = Math.pow(2, octaveShift);
        const freq = rootFreq * octaveFactor * Math.pow(2, scale[actualIndex] / 12);
        
        // Określ długość nuty (bardziej zróżnicowana)
        let duration;
        const rhythmType = Math.random();
        
        if (rhythmType < 0.3) {
            // Krótka nuta
            duration = 0.125 + Math.random() * 0.125;
        } else if (rhythmType < 0.7) {
            // Średnia nuta
            duration = 0.25 + Math.random() * 0.25;
        } else if (rhythmType < 0.9) {
            // Długa nuta
            duration = 0.5 + Math.random() * 0.25;
        } else {
            // Bardzo długa nuta
            duration = 0.75 + Math.random() * 0.5;
        }
        
        // Dodaj nutę do frazy
        phrase.push({
            frequency: freq,
            duration: duration,
            velocity: 0.4 + Math.random() * 0.5 // Zmienna głośność
        });
        
        lastIndex = newIndex;
    }
    
    // Dodaj startTime dla każdej nuty
    let currentTime = 0;
    phrase = phrase.map(note => {
        const noteWithTime = { ...note, time: currentTime };
        currentTime += note.duration;
        return noteWithTime;
    });
    
    return phrase;
}

/**
 * Generuje wzór walking basu dla danego akordu
 * @param {string} chordName - Nazwa akordu
 * @param {number} beatsPerBar - Liczba ćwierćnut w takcie (domyślnie 4)
 * @param {string} style - Styl jazzu
 * @returns {Array} Tablica obiektów {frequency, duration, time}
 */
export function generateWalkingBass(chordName, beatsPerBar = 4, style = 'swing') {
    const { rootNote, chordType } = parseChordName(chordName);
    if (!rootNote) return [];
    
    // Pobierz podstawową częstotliwość dla nuty podstawowej
    const rootFreq = getNoteFrequency(rootNote, 3); // Bas gra oktawę niżej
    if (!rootFreq) return [];
    
    // Pobierz skalę dla akordu
    const scale = getScaleForChord(chordName);
    
    // Utwórz wzór walking basu
    const pattern = [];
    
    // Różne wzory w zależności od stylu
    switch(style) {
        case 'swing': {
            // Klasyczny walking bass: root-5-3-approach
            const fifth = rootFreq * INTERVALS.perfect5th;
            const third = rootFreq * (chordType.includes('m') ? INTERVALS.minor3rd : INTERVALS.major3rd);
            
            // Nuta podejściowa - półton powyżej lub poniżej następnego roota
            const approachUp = rootFreq * INTERVALS.major7th;
            const approachDown = rootFreq * INTERVALS.minor7th;
            const approach = Math.random() < 0.5 ? approachUp : approachDown;
            
            pattern.push(
                { frequency: rootFreq, duration: 1/beatsPerBar, time: 0, velocity: 0.9 },
                { frequency: fifth, duration: 1/beatsPerBar, time: 1/beatsPerBar, velocity: 0.8 },
                { frequency: third, duration: 1/beatsPerBar, time: 2/beatsPerBar, velocity: 0.8 },
                { frequency: approach, duration: 1/beatsPerBar, time: 3/beatsPerBar, velocity: 0.85 }
            );
            break;
        }
        
        case 'bebop': {
            // Bardziej złożony walking z chromatyką
            const scaleNotes = scale.map(note => rootFreq * Math.pow(2, note/12));
            
            // Wybierz losowo nuty ze skali z dodatkową chromatyką
            const chromatic1 = rootFreq * Math.pow(2, (scale[1]-1)/12); // Nuta chromatyczna
            const chromatic2 = rootFreq * Math.pow(2, (scale[3]+1)/12); // Nuta chromatyczna
            
            pattern.push(
                { frequency: rootFreq, duration: 1/beatsPerBar, time: 0, velocity: 0.9 },
                { frequency: chromatic1, duration: 1/beatsPerBar, time: 1/beatsPerBar, velocity: 0.75 },
                { frequency: scaleNotes[2], duration: 1/beatsPerBar, time: 2/beatsPerBar, velocity: 0.8 },
                { frequency: chromatic2, duration: 1/beatsPerBar, time: 3/beatsPerBar, velocity: 0.85 }
            );
            break;
        }
        
        case 'fusion': {
            // Bardziej synkopowany groove
            const fifth = rootFreq * INTERVALS.perfect5th;
            const octave = rootFreq * 2;
            
            pattern.push(
                { frequency: rootFreq, duration: 3/8, time: 0, velocity: 0.9 },
                { frequency: rootFreq, duration: 1/8, time: 3/8, velocity: 0.7 },
                { frequency: fifth, duration: 1/4, time: 1/2, velocity: 0.8 },
                { frequency: octave, duration: 1/4, time: 3/4, velocity: 0.85 }
            );
            break;
        }
        
        case 'modal': {
            // Minimalistyczny, długo trzymane nuty
            const fifth = rootFreq * INTERVALS.perfect5th;
            
            pattern.push(
                { frequency: rootFreq, duration: 1/2, time: 0, velocity: 0.9 },
                { frequency: fifth, duration: 1/2, time: 1/2, velocity: 0.8 }
            );
            break;
        }
        
        case 'bossaNova': {
            // Synkopowany wzór bossa nova
            const fifth = rootFreq * INTERVALS.perfect5th;
            const octave = rootFreq * 2;
            
            pattern.push(
                { frequency: rootFreq, duration: 1/4, time: 0, velocity: 0.9 },
                { frequency: fifth, duration: 1/8, time: 1/4, velocity: 0.7 },
                { frequency: rootFreq, duration: 1/8, time: 3/8, velocity: 0.8 },
                { frequency: octave, duration: 1/4, time: 1/2, velocity: 0.85 },
                { frequency: fifth, duration: 1/4, time: 3/4, velocity: 0.8 }
            );
            break;
        }
        
        default: {
            // Standardowy walking bass
            const fifth = rootFreq * INTERVALS.perfect5th;
            const third = rootFreq * (chordType.includes('m') ? INTERVALS.minor3rd : INTERVALS.major3rd);
            const seventh = rootFreq * (chordType.includes('maj7') ? INTERVALS.major7th : INTERVALS.minor7th);
            
            pattern.push(
                { frequency: rootFreq, duration: 1/beatsPerBar, time: 0, velocity: 0.9 },
                { frequency: fifth, duration: 1/beatsPerBar, time: 1/beatsPerBar, velocity: 0.8 },
                { frequency: third, duration: 1/beatsPerBar, time: 2/beatsPerBar, velocity: 0.8 },
                { frequency: seventh, duration: 1/beatsPerBar, time: 3/beatsPerBar, velocity: 0.85 }
            );
        }
    }
    
    return pattern;
}

/**
 * Konwertuje nuty z MIDI na częstotliwość
 * @param {number} midiNote - Numer nuty MIDI (np. 60 dla C4)
 * @returns {number} Częstotliwość w Hz
 */
export function midiToFrequency(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Określa skalę kolorów dla podanego akordu
 * @param {string} chordName - Nazwa akordu
 * @returns {string} Kolor w formacie HSL
 */
export function getChordColor(chordName) {
    if (!chordName) return 'hsl(60, 80%, 60%)'; // Domyślny złoty
    
    // Znajdź typ akordu
    let chordType = '';
    
    if (chordName.includes('maj9')) {
        chordType = 'maj9';
    } else if (chordName.includes('maj7#11')) {
        chordType = 'maj7#11';
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
    } else if (chordName.includes('7#5')) {
        chordType = '7#5';
    } else if (chordName.includes('13')) {
        chordType = '13';
    } else if (chordName.includes('9')) {
        chordType = '9';
    } else if (chordName.includes('7sus4')) {
        chordType = '7sus4';
    } else if (chordName.includes('7')) {
        chordType = '7';
    } else if (chordName.includes('dim7')) {
        chordType = 'dim7';
    } else if (chordName.includes('dim')) {
        chordType = 'dim';
    } else if (chordName.includes('aug')) {
        chordType = 'aug';
    } else if (chordName.includes('sus')) {
        chordType = 'sus4';
    } else if (chordName.includes('m6')) {
        chordType = 'm6';
    } else if (chordName.includes('6')) {
        chordType = '6';
    } else if (chordName.includes('m')) {
        chordType = 'm';
    }
    
    const color = CHORD_COLORS[chordType];
    if (color) {
        return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
    }
    
    return 'hsl(60, 80%, 60%)'; // Domyślny złoty
}