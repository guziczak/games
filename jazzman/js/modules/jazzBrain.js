/**
 * Jazz Brain - kompozytor i aranżer
 *
 * Generuje kompletny, ustrukturyzowany występ jazzowy jako listę zdarzeń
 * (czas w sekundach, wysokości w Hz), którą main.js planuje w sekwencerze.
 *
 * Struktura utworu: Intro -> Temat -> Solo trąbki -> Solo fortepianu -> Temat -> Koda.
 * Wszystkie instrumenty grają na wspólnej siatce beatów z jednym wspólnym swingiem.
 * Moduł jest czysty (bez DOM i Web Audio), dzięki czemu da się go testować w Node.
 */

// ---------------------------------------------------------------------------
// Deterministyczny generator losowy (mulberry32) - jeden seed = jeden występ
// ---------------------------------------------------------------------------

function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

class Rng {
    constructor(seed) {
        this.next = mulberry32(seed);
    }
    float(min = 0, max = 1) {
        return min + this.next() * (max - min);
    }
    int(min, max) { // włącznie z obu stron
        return min + Math.floor(this.next() * (max - min + 1));
    }
    chance(p) {
        return this.next() < p;
    }
    pick(arr) {
        return arr[Math.floor(this.next() * arr.length)];
    }
    /** Wybór ważony z tablicy par [waga, wartość] */
    weighted(pairs) {
        const total = pairs.reduce((s, p) => s + p[0], 0);
        let r = this.next() * total;
        for (const [w, v] of pairs) {
            r -= w;
            if (r <= 0) return v;
        }
        return pairs[pairs.length - 1][1];
    }
}

// ---------------------------------------------------------------------------
// Teoria: wysokości w numerach MIDI, akordy jako (klasa dźwięku, typ)
// ---------------------------------------------------------------------------

export function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOTE_TO_PC = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
    'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

const SCALES = {
    ionian: [0, 2, 4, 5, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
    altered: [0, 1, 3, 4, 6, 8, 10],
    halfWhole: [0, 1, 3, 4, 6, 7, 9, 10],
    wholeHalf: [0, 2, 3, 5, 6, 8, 9, 11],
    blues: [0, 3, 5, 6, 7, 10]
};

/**
 * Typy akordów: składniki (tones), skala do improwizacji oraz dwa
 * bezkorzeniowe voicingi fortepianowe (interwały od prymy) do voice leadingu.
 */
const CHORD_TYPES = {
    'maj7': { tones: [0, 4, 7, 11], scale: SCALES.ionian, voicings: [[4, 7, 11, 14], [11, 14, 16, 19]] },
    '6': { tones: [0, 4, 7, 9], scale: SCALES.ionian, voicings: [[4, 7, 9, 14], [9, 14, 16, 19]] },
    'm7': { tones: [0, 3, 7, 10], scale: SCALES.dorian, voicings: [[3, 7, 10, 14], [10, 14, 15, 19]] },
    'm6': { tones: [0, 3, 7, 9], scale: SCALES.dorian, voicings: [[3, 7, 9, 14], [9, 14, 15, 19]] },
    'm11': { tones: [0, 3, 7, 10], scale: SCALES.dorian, voicings: [[3, 10, 14, 17], [10, 14, 17, 22]] },
    '7': { tones: [0, 4, 7, 10], scale: SCALES.mixolydian, voicings: [[4, 9, 10, 14], [10, 14, 16, 21]] },
    '7b9': { tones: [0, 4, 7, 10], scale: SCALES.halfWhole, voicings: [[4, 9, 10, 13], [10, 13, 16, 21]] },
    '7#9': { tones: [0, 4, 7, 10], scale: SCALES.altered, voicings: [[4, 10, 15, 20], [10, 15, 16, 20]] },
    '7sus4': { tones: [0, 5, 7, 10], scale: SCALES.mixolydian, voicings: [[5, 10, 14, 19], [10, 14, 17, 19]] },
    'm7b5': { tones: [0, 3, 6, 10], scale: SCALES.locrian, voicings: [[3, 6, 10, 17], [6, 10, 15, 18]] },
    'dim7': { tones: [0, 3, 6, 9], scale: SCALES.wholeHalf, voicings: [[3, 6, 9, 14], [6, 9, 12, 15]] }
};

// Aliasy zapisu -> typ kanoniczny (np. C9 gra się jak C7 z dziewiątką w voicingu)
const TYPE_ALIASES = {
    'maj9': 'maj7', '69': '6', 'm9': 'm7', '9': '7', '13': '7', '7alt': '7#9'
};

/** Parsuje symbol akordu ("Bb7", "Am7b5") do obiektu roboczego. */
function parseChord(sym) {
    const m = /^([A-G])(b|#)?(.*)$/.exec(sym);
    if (!m) throw new Error(`Nieznany akord: ${sym}`);
    const root = NOTE_TO_PC[m[1] + (m[2] || '')];
    let typeStr = m[3] === '' ? 'maj7' : m[3];
    typeStr = TYPE_ALIASES[typeStr] || typeStr;
    const type = CHORD_TYPES[typeStr];
    if (!type) throw new Error(`Nieznany typ akordu: ${sym}`);
    return { root, typeName: typeStr, sym, ...type };
}

function transposeChord(chord, semitones) {
    const root = ((chord.root + semitones) % 12 + 12) % 12;
    // Zachowujemy oryginalny sufiks symbolu (np. "m7b5"), zmieniamy tylko prymę
    const suffix = chord.sym.replace(/^[A-G](b|#)?/, '');
    return { ...chord, root, sym: PC_NAMES[root] + suffix };
}

/** Najbliższa wysokość o zadanej klasie dźwięku względem podanej wysokości. */
function nearestPitch(pc, reference) {
    let candidate = pc + 12 * Math.round((reference - pc) / 12);
    if (Math.abs(candidate - reference) > 6) {
        candidate += candidate > reference ? -12 : 12;
    }
    return candidate;
}

/** Najbliższy referencji dźwięk ze zbioru klas (offsety od prymy). */
function nearestFromSet(root, offsets, reference) {
    let best = null;
    for (const off of offsets) {
        const candidate = nearestPitch((root + off) % 12, reference);
        if (best === null || Math.abs(candidate - reference) < Math.abs(best - reference)) {
            best = candidate;
        }
    }
    return best;
}

/** Krok po skali: najbliższy dźwięk skali powyżej/poniżej danej wysokości. */
function scaleStep(pitch, chord, direction) {
    for (let d = 1; d <= 3; d++) {
        const candidate = pitch + direction * d;
        if (chord.scale.includes(((candidate - chord.root) % 12 + 12) % 12)) {
            return candidate;
        }
    }
    return pitch + direction * 2;
}

function clampPitch(pitch, lo, hi) {
    while (pitch < lo) pitch += 12;
    while (pitch > hi) pitch -= 12;
    return pitch;
}

// ---------------------------------------------------------------------------
// Formy (progresje z prawdziwą harmoniką funkcyjną i turnaroundami)
// ---------------------------------------------------------------------------

/** Zamienia zapis "F7 | Cm7 F7 | ..." na tablicę taktów z akordami i beatami. */
function parseForm(text) {
    return text.split('|').map(barText => {
        const syms = barText.trim().split(/\s+/).filter(Boolean);
        const beatsPer = 4 / syms.length;
        return syms.map(sym => ({ chord: parseChord(sym), beats: beatsPer }));
    });
}

const FORMS = {
    // 12-taktowy blues jazzowy (F) z ii-V i turnaroundem
    blues: {
        text: 'F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bdim7 | F7 | Am7b5 D7b9 | Gm7 | C7 | F7 D7b9 | Gm7 C7',
        keys: [0, 5, 7], // F, Bb, C
        tonic: 'F6', feel: 'swing', phraseBars: 4
    },
    // Bluesowy bebop (Bb), szybszy, z chromatyką
    bebopBlues: {
        text: 'Bb7 | Eb7 | Bb7 | Fm7 Bb7 | Eb7 | Edim7 | Bb7 | Dm7b5 G7b9 | Cm7 | F7 | Bb7 G7b9 | Cm7 F7',
        keys: [0, 5], // Bb, Eb
        tonic: 'Bb6', feel: 'swing', phraseBars: 4
    },
    // Rhythm changes (AABA, 32 takty, Bb)
    rhythm: {
        text: 'Bb6 Gm7 | Cm7 F7 | Bb6 Gm7 | Cm7 F7 | Fm7 Bb7 | Eb6 Ebm6 | Dm7 G7b9 | Cm7 F7 |' +
              'Bb6 Gm7 | Cm7 F7 | Bb6 Gm7 | Cm7 F7 | Fm7 Bb7 | Eb6 Ebm6 | Cm7 F7 | Bb6 |' +
              'D7 | D7 | G7 | G7 | C7 | C7 | F7 | F7 |' +
              'Bb6 Gm7 | Cm7 F7 | Bb6 Gm7 | Cm7 F7 | Fm7 Bb7 | Eb6 Ebm6 | Cm7 F7 | Bb6',
        keys: [0], tonic: 'Bb6', feel: 'swing', phraseBars: 8
    },
    // Forma modalna w stylu "So What" (AABA, 32 takty)
    soWhat: {
        text: 'Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 |' +
              'Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 |' +
              'Ebm7 | Ebm7 | Ebm7 | Ebm7 | Ebm7 | Ebm7 | Ebm7 | Ebm7 |' +
              'Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7',
        keys: [0], tonic: 'Dm7', feel: 'modal', phraseBars: 8
    },
    // Vamp fusion (8 taktów, feel prosty, szesnastkowy)
    fusionVamp: {
        text: 'Cm11 | Cm11 | Abmaj7 | Bb7sus4 | Cm11 | Cm11 | Abmaj7 | G7#9',
        keys: [0, 2, 7], tonic: 'Cm11', feel: 'fusion', phraseBars: 4
    }
};

const STYLE_FORMS = {
    swing: ['blues', 'rhythm'],
    bebop: ['bebopBlues', 'rhythm'],
    modal: ['soWhat'],
    fusion: ['fusionVamp']
};

// ---------------------------------------------------------------------------
// Kontekst występu i pomocnicze odwzorowanie beat -> sekundy (swing!)
// ---------------------------------------------------------------------------

function makeContext(options) {
    const style = options.style || 'swing';
    const tempo = options.tempo || 130;
    const rng = new Rng(options.seed != null ? options.seed : Math.floor(Math.random() * 2 ** 31));

    const formName = rng.pick(STYLE_FORMS[style] || STYLE_FORMS.swing);
    const formDef = FORMS[formName];
    const transpose = rng.pick(formDef.keys);

    const bars = parseForm(formDef.text).map(bar =>
        bar.map(slot => ({ ...slot, chord: transposeChord(slot.chord, transpose) }))
    );
    const tonic = transposeChord(parseChord(formDef.tonic), transpose);

    // Jeden wspólny swing dla całego zespołu; im szybciej, tym płycej
    let swing;
    if (formDef.feel === 'fusion') swing = 0.5;
    else if (tempo < 100) swing = 0.68;
    else if (tempo < 150) swing = 0.66;
    else if (tempo < 190) swing = 0.62;
    else swing = 0.58;

    const beatDur = 60 / tempo;

    return {
        style, tempo, rng, formName, formDef, bars, tonic,
        swing, beatDur,
        feel: formDef.feel,
        barsPerChorus: bars.length,
        keyPc: tonic.root,
        events: []
    };
}

/**
 * Zamienia pozycję muzyczną (takt globalny + beat w takcie, ósemkowe "i" jako .5)
 * na sekundy, aplikując swing do offbeatów ósemkowych.
 */
function beatToSeconds(ctx, globalBar, beat) {
    const whole = Math.floor(beat);
    const frac = beat - whole;
    // Swingujemy tylko ósemkowe "i" (x.5); szesnastki/triole zostają proste
    const swungFrac = Math.abs(frac - 0.5) < 1e-6 ? ctx.swing : frac;
    return (globalBar * 4 + whole + swungFrac) * ctx.beatDur;
}

/** Dodaje zdarzenie; pos = {bar, beat}, jitter w sekundach (humanizacja). */
function pushEvent(ctx, kind, bar, beat, payload, jitter = 0) {
    const t = Math.max(0, beatToSeconds(ctx, bar, beat) + (jitter ? ctx.rng.float(-jitter, jitter) : 0));
    ctx.events.push({ t, kind, ...payload });
}

/** Akord obowiązujący w danym takcie (lokalnym dla przekazanej formy) i beacie. */
function chordAt(bars, barIdx, beat) {
    const bar = bars[((barIdx % bars.length) + bars.length) % bars.length];
    let acc = 0;
    for (const slot of bar) {
        acc += slot.beats;
        if (beat < acc - 1e-6) return slot.chord;
    }
    return bar[bar.length - 1].chord;
}

// ---------------------------------------------------------------------------
// Sekcja rytmiczna: BAS
// ---------------------------------------------------------------------------

const BASS_LO = 30, BASS_HI = 53; // Gb1..F3

/**
 * Walking bass: ćwierćnuty prowadzące liniowo do prymy NASTĘPNEGO akordu
 * (nuta podejściowa chromatyczna lub diatoniczna na ostatnim beacie).
 */
function buildWalkingBar(ctx, section, barIdx, localBars, out) {
    const rng = ctx.rng;
    const bar = localBars[barIdx % localBars.length];
    const slots = [];
    // Rozpisujemy takt na 4 ćwierćnuty z przypisanym akordem
    let beat = 0;
    for (const slot of bar) {
        for (let b = 0; b < slot.beats; b++) slots.push({ beat: beat + b, chord: slot.chord });
        beat += slot.beats;
    }

    const nextChord = chordAt(localBars, barIdx + 1, 0);
    const prev = out.lastPitch != null ? out.lastPitch : nearestPitch(slots[0].chord.root, 40);

    const pitches = new Array(4);
    // Beat 1: pryma (czasem tercja/kwinta, gdy akord się nie zmienił)
    const sameAsPrev = out.lastChordSym === slots[0].chord.sym;
    if (sameAsPrev && rng.chance(0.4)) {
        pitches[0] = nearestFromSet(slots[0].chord.root, [slots[0].chord.tones[1], 7], prev);
    } else {
        pitches[0] = nearestPitch(slots[0].chord.root, prev);
    }
    pitches[0] = clampPitch(pitches[0], BASS_LO, BASS_HI);

    // Beat 4: podejście do prymy następnego akordu
    const target = clampPitch(nearestPitch(nextChord.root, pitches[0]), BASS_LO, BASS_HI);
    const approaches = [target - 1, target + 1, target - 2, target + 2];
    pitches[3] = clampPitch(rng.weighted([[4, approaches[0]], [3, approaches[1]], [1.5, approaches[2]], [1.5, approaches[3]]]), BASS_LO, BASS_HI);

    // Beaty 2-3: droga między beatem 1 a 4 (nuty skali/akordu, małe kroki)
    for (const i of [1, 2]) {
        const chord = slots[i].chord;
        const ideal = pitches[0] + ((pitches[3] - pitches[0]) * i) / 3;
        let candidate = rng.chance(0.75)
            ? nearestFromSet(chord.root, chord.scale, ideal)
            : nearestFromSet(chord.root, chord.tones, ideal);
        // Unikamy powtórzenia poprzedniej nuty
        if (candidate === pitches[i - 1]) {
            candidate = scaleStep(candidate, chord, pitches[3] >= pitches[0] ? 1 : -1);
        }
        pitches[i] = clampPitch(candidate, BASS_LO, BASS_HI);
    }

    const baseVel = section.bassVel;
    const velPattern = [1.0, 0.85, 0.93, 0.88];
    for (let i = 0; i < 4; i++) {
        pushEvent(ctx, 'bass', section.startBar + barIdx, i, {
            freq: midiToFreq(pitches[i]),
            dur: ctx.beatDur * 0.96,
            vel: Math.min(1, baseVel * velPattern[i] * rng.float(0.95, 1.05))
        }, 0.004);
        // Skip note - krótki duszek na "i" przed kolejnym beatem
        if (i < 3 && rng.chance(0.1)) {
            pushEvent(ctx, 'bass', section.startBar + barIdx, i + 0.5, {
                freq: midiToFreq(pitches[i + 1]),
                dur: ctx.beatDur * 0.14,
                vel: baseVel * 0.35
            }, 0.004);
        }
    }
    out.lastPitch = pitches[3];
    out.lastChordSym = slots[3].chord.sym;
}

/**
 * Bas "w dwójce" (two-feel): półnuty pryma-kwinta. Klasyczny sposób grania
 * pierwszego tematu - przejście na walking w solach daje słyszalny "lift".
 */
function buildTwoFeelBassBar(ctx, section, barIdx, localBars, out) {
    const rng = ctx.rng;
    const globalBar = section.startBar + barIdx;
    const chord1 = chordAt(localBars, barIdx, 0);
    const chord2 = chordAt(localBars, barIdx, 2);
    const nextChord = chordAt(localBars, barIdx + 1, 0);
    const prev = out.lastPitch != null ? out.lastPitch : 40;

    const root1 = clampPitch(nearestPitch(chord1.root, prev), BASS_LO, BASS_HI);
    // Na 3: pryma drugiego akordu w takcie, kwinta, albo podejście dalej
    let mid;
    if (chord2.sym !== chord1.sym) {
        mid = clampPitch(nearestPitch(chord2.root, root1), BASS_LO, BASS_HI);
    } else {
        mid = clampPitch(root1 + (rng.chance(0.7) ? 7 : -5), BASS_LO, BASS_HI);
    }

    const pickup = rng.chance(0.3);
    pushEvent(ctx, 'bass', globalBar, 0, {
        freq: midiToFreq(root1), dur: ctx.beatDur * 1.9, vel: section.bassVel
    }, 0.005);
    pushEvent(ctx, 'bass', globalBar, 2, {
        freq: midiToFreq(mid), dur: ctx.beatDur * (pickup ? 0.95 : 1.9), vel: section.bassVel * 0.88
    }, 0.005);
    if (pickup) {
        // Ćwierćnutowe podejście na 4 prowadzące do następnego taktu
        const app = clampPitch(nearestPitch(nextChord.root, mid) + rng.pick([-1, 1, -2]), BASS_LO, BASS_HI);
        pushEvent(ctx, 'bass', globalBar, 3, {
            freq: midiToFreq(app), dur: ctx.beatDur * 0.9, vel: section.bassVel * 0.72
        }, 0.005);
        out.lastPitch = app;
    } else {
        out.lastPitch = mid;
    }
    out.lastChordSym = chordAt(localBars, barIdx, 3.9).sym;
}

/** Bas modalny: pedał prymy z kwintą, długie wartości. */
function buildModalBassBar(ctx, section, barIdx, localBars, out) {
    const rng = ctx.rng;
    const chord = chordAt(localBars, barIdx, 0);
    const root = clampPitch(nearestPitch(chord.root, 38), BASS_LO, BASS_HI);
    const fifth = clampPitch(root + 7, BASS_LO, BASS_HI);
    const bar = section.startBar + barIdx;

    pushEvent(ctx, 'bass', bar, 0, { freq: midiToFreq(root), dur: ctx.beatDur * 1.9, vel: section.bassVel }, 0.005);
    if (rng.chance(0.7)) {
        pushEvent(ctx, 'bass', bar, 2, { freq: midiToFreq(rng.chance(0.6) ? fifth : root), dur: ctx.beatDur * 1.9, vel: section.bassVel * 0.85 }, 0.005);
    }
    if (rng.chance(0.25)) {
        pushEvent(ctx, 'bass', bar, 3.5, { freq: midiToFreq(root), dur: ctx.beatDur * 0.4, vel: section.bassVel * 0.5 }, 0.005);
    }
    out.lastPitch = root;
    out.lastChordSym = chord.sym;
}

/** Bas fusion: synkopowany riff ósemkowo-szesnastkowy. */
function buildFusionBassBar(ctx, section, barIdx, localBars, out) {
    const rng = ctx.rng;
    const chord = chordAt(localBars, barIdx, 0);
    const nextChord = chordAt(localBars, barIdx + 1, 0);
    const root = clampPitch(nearestPitch(chord.root, 38), BASS_LO, BASS_HI);
    const b7 = clampPitch(root + 10, BASS_LO, BASS_HI);
    const fifth = clampPitch(root + 7, BASS_LO, BASS_HI);
    const bar = section.startBar + barIdx;

    const riff = [
        { beat: 0, pitch: root, dur: 1.2, vel: 1.0 },
        { beat: 1.5, pitch: root, dur: 0.4, vel: 0.75 },
        { beat: 2, pitch: rng.chance(0.5) ? fifth : b7, dur: 0.7, vel: 0.85 },
        { beat: 2.75, pitch: root, dur: 0.2, vel: 0.55 },
        { beat: 3.5, pitch: clampPitch(nearestPitch(nextChord.root, root) + (rng.chance(0.5) ? -1 : 2), BASS_LO, BASS_HI), dur: 0.45, vel: 0.8 }
    ];
    for (const n of riff) {
        pushEvent(ctx, 'bass', bar, n.beat, {
            freq: midiToFreq(n.pitch), dur: ctx.beatDur * n.dur, vel: section.bassVel * n.vel
        }, 0.004);
    }
    out.lastPitch = root;
    out.lastChordSym = chord.sym;
}

// ---------------------------------------------------------------------------
// Sekcja rytmiczna: FORTEPIAN (comping z voice leadingiem)
// ---------------------------------------------------------------------------

/** Substytut trytonowy: dominanta o tryton od prymy danego akordu. */
function tritoneSub(chord) {
    const root = (chord.root + 6) % 12;
    return { root, typeName: '7', sym: PC_NAMES[root] + '7', ...CHORD_TYPES['7'] };
}

/** Wybiera voicing akordu najbliższy poprzedniemu (minimalny ruch głosów). */
function pickVoicing(chord, prevVoicing) {
    const base = chord.root + 48;
    const prevAvg = prevVoicing
        ? prevVoicing.reduce((s, n) => s + n, 0) / prevVoicing.length
        : 64;
    let best = null, bestCost = Infinity;
    for (const form of chord.voicings) {
        for (const oct of [-12, 0, 12]) {
            const notes = form.map(i => base + i + oct);
            const top = Math.max(...notes), bottom = Math.min(...notes);
            const avg = notes.reduce((s, n) => s + n, 0) / notes.length;
            let cost = Math.abs(avg - prevAvg);
            if (top > 79) cost += (top - 79) * 2;
            if (bottom < 50) cost += (50 - bottom) * 2;
            if (cost < bestCost) { bestCost = cost; best = notes; }
        }
    }
    return best;
}

/**
 * Komórki rytmiczne compingu (beaty w takcie; push = zagraj akord z NASTĘPNEGO
 * taktu jako antycypację na "i" czwartego beatu).
 */
const COMP_CELLS = {
    rest: [],
    sustained: [{ beat: 0, dur: 2.6 }],
    charleston: [{ beat: 0, dur: 0.5 }, { beat: 1.5, dur: 1.0 }],
    offbeats: [{ beat: 1.5, dur: 0.5 }, { beat: 3.5, dur: 0.9, push: true }],
    pushOnly: [{ beat: 3.5, dur: 1.1, push: true }],
    midbar: [{ beat: 2, dur: 1.3 }],
    upbeat: [{ beat: 0.5, dur: 0.5 }, { beat: 2.5, dur: 0.6 }],
    redChord: [{ beat: 0, dur: 0.4 }, { beat: 2.5, dur: 0.5 }]
};

/** Wagi komórek w zależności od gęstości compingu (0 = tło, 2 = aktywnie). */
function compCellFor(rng, density) {
    if (density === 0) {
        return rng.weighted([[3, 'rest'], [4, 'sustained'], [2, 'midbar'], [1, 'charleston']]);
    }
    if (density === 1) {
        return rng.weighted([[2, 'rest'], [2, 'sustained'], [3, 'charleston'], [2, 'midbar'], [2, 'redChord'], [1.5, 'pushOnly']]);
    }
    return rng.weighted([[1, 'rest'], [3, 'charleston'], [2.5, 'offbeats'], [2, 'upbeat'], [2, 'redChord'], [2, 'pushOnly'], [1, 'midbar']]);
}

/** Zamienia zwykłą dominantę na alterowaną (7#9) - kulminacja harmoniczna. */
function alterIfDominant(chord) {
    if (chord.typeName !== '7') return chord;
    return { ...chord, ...CHORD_TYPES['7#9'], root: chord.root, sym: chord.sym, typeName: '7#9' };
}

function buildCompingBar(ctx, section, barIdx, localBars, out, density, compOpts = {}) {
    const rng = ctx.rng;
    const bar = localBars[barIdx % localBars.length];
    const globalBar = section.startBar + barIdx;
    const twoChords = bar.length > 1;
    const spice = chord => (compOpts.altDominants ? alterIfDominant(chord) : chord);

    if (twoChords) {
        // Dwa akordy w takcie: krótkie zagrania przy każdej zmianie
        let beat = 0;
        for (const slot of bar) {
            const voicing = pickVoicing(spice(slot.chord), out.lastVoicing);
            out.lastVoicing = voicing;
            const hitBeat = beat + (rng.chance(0.25) && beat === 0 ? 0.5 : 0);
            if (!rng.chance(density === 0 ? 0.35 : 0.1)) {
                pushEvent(ctx, 'piano', globalBar, hitBeat, {
                    freqs: voicing.map(midiToFreq),
                    dur: ctx.beatDur * rng.float(0.5, 1.1),
                    vel: section.pianoVel * rng.float(0.85, 1.05)
                }, 0.006);
            }
            beat += slot.beats;
        }
        return;
    }

    const cellName = compCellFor(rng, density);
    const cell = COMP_CELLS[cellName];
    for (const hit of cell) {
        let chord = hit.push ? chordAt(localBars, barIdx + 1, 0) : bar[0].chord;
        // Antycypacja czasem przez substytut trytonowy - dominanta pół tonu
        // nad celem, klasyczna przyprawa reharmonizacyjna
        if (hit.push && rng.chance(0.22)) {
            chord = tritoneSub(chord);
        }
        const voicing = pickVoicing(spice(chord), out.lastVoicing);
        out.lastVoicing = voicing;
        pushEvent(ctx, 'piano', globalBar, hit.beat, {
            freqs: voicing.map(midiToFreq),
            dur: ctx.beatDur * hit.dur,
            vel: section.pianoVel * (hit.beat % 1 !== 0 ? 1.08 : 0.95) * ctx.rng.float(0.92, 1.05)
        }, 0.006);
    }
}

/** Lewa ręka podczas solo fortepianu: oszczędne shelle (tercja+septyma). */
function buildShellBar(ctx, section, barIdx, localBars, out) {
    const rng = ctx.rng;
    const bar = localBars[barIdx % localBars.length];
    const globalBar = section.startBar + barIdx;
    let beat = 0;
    for (const slot of bar) {
        if (rng.chance(0.75)) {
            const c = slot.chord;
            const third = c.tones[1], seventh = c.tones[3] != null ? c.tones[3] : c.tones[2];
            let notes = [c.root + 48 + third, c.root + 48 + seventh];
            notes = notes.map(n => clampPitch(n, 46, 62));
            const hitBeat = beat + rng.weighted([[3, 0], [2, 0.5], [1.5, 1.5]]);
            if (hitBeat < beat + slot.beats) {
                pushEvent(ctx, 'piano', globalBar, hitBeat, {
                    freqs: notes.map(midiToFreq),
                    dur: ctx.beatDur * rng.float(0.8, 1.6),
                    vel: section.pianoVel * 0.62
                }, 0.006);
            }
        }
        beat += slot.beats;
    }
}

// ---------------------------------------------------------------------------
// Sekcja rytmiczna: PERKUSJA
// ---------------------------------------------------------------------------

/** Perkusja jazzowa: ride z synkopą, hi-hat nogą na 2 i 4, oszczędna stopa. */
function buildSwingDrumsBar(ctx, section, barIdx, opts) {
    const rng = ctx.rng;
    const bar = section.startBar + barIdx;
    const v = section.drumVel;
    const phraseBars = ctx.formDef.phraseBars;
    const lastOfPhrase = (barIdx + 1) % phraseBars === 0;
    const lastOfSection = barIdx === section.bars - 1;

    // Ride: "ding ding-ga-ding" z wariantami taktu, żeby czas oddychał
    const rideVariants = {
        full: [
            { beat: 0, vel: 0.5 }, { beat: 1, vel: 0.62 }, { beat: 1.5, vel: 0.36 },
            { beat: 2, vel: 0.5 }, { beat: 3, vel: 0.62 }, { beat: 3.5, vel: 0.36 }
        ],
        lite: [
            { beat: 0, vel: 0.5 }, { beat: 1, vel: 0.62 },
            { beat: 2, vel: 0.5 }, { beat: 3, vel: 0.62 }, { beat: 3.5, vel: 0.36 }
        ],
        busy: [
            { beat: 0, vel: 0.5 }, { beat: 0.5, vel: 0.3 }, { beat: 1, vel: 0.62 },
            { beat: 1.5, vel: 0.36 }, { beat: 2, vel: 0.5 }, { beat: 3, vel: 0.62 },
            { beat: 3.5, vel: 0.36 }
        ]
    };
    const variant = rng.weighted([[5, 'full'], [2, 'lite'], [opts.heat ? 2 : 0.7, 'busy']]);
    for (const hit of rideVariants[variant]) {
        if (opts.sparse && hit.beat % 1 !== 0 && rng.chance(0.5)) continue;
        pushEvent(ctx, 'ride', bar, hit.beat, { vel: v * hit.vel * rng.float(0.92, 1.08) }, 0.003);
    }

    // Hi-hat nogą na 2 i 4 (fundament swingu)
    for (const beat of [1, 3]) {
        pushEvent(ctx, 'hat', bar, beat, { vel: v * 0.3 }, 0.003);
    }

    // Feathering stopy - ledwo słyszalny puls (tylko w wolniejszym swingu)
    if (ctx.tempo < 165 && !opts.sparse) {
        for (let beat = 0; beat < 4; beat++) {
            pushEvent(ctx, 'kick', bar, beat, { vel: v * 0.11 }, 0.004);
        }
    }

    // Comping werbla: duszki w dialogu z solistą, gęstsze w gorących chorusach
    if (!opts.quietSnare) {
        const heat = opts.heat || 0;
        const snareHits = rng.weighted([[2.5 - heat, 0], [4, 1], [2.5 + heat, 2]]);
        const spots = [0.5, 1.5, 2, 2.5, 3.5];
        for (let i = 0; i < snareHits; i++) {
            const beat = rng.pick(spots);
            pushEvent(ctx, 'snare', bar, beat, { vel: v * rng.float(0.16, 0.26 + heat * 0.05) }, 0.005);
        }
        // Mocniejszy akcent stopą w synkopie
        if (rng.chance(0.15 + heat * 0.1)) {
            pushEvent(ctx, 'kick', bar, rng.pick([1.5, 2.5, 3.5]), { vel: v * 0.34 }, 0.004);
        }
    }

    // Fill na końcu frazy / sekcji
    if (lastOfSection || (lastOfPhrase && rng.chance(0.6))) {
        const big = lastOfSection || rng.chance(0.3);
        if (big) {
            pushEvent(ctx, 'snare', bar, 3, { vel: v * 0.4 }, 0.004);
            pushEvent(ctx, 'snare', bar, 3.33, { vel: v * 0.34 }, 0.004);
            pushEvent(ctx, 'tom', bar, 3.67, { freq: 170, vel: v * 0.42 }, 0.004);
        } else {
            pushEvent(ctx, 'snare', bar, 3.5, { vel: v * 0.32 }, 0.004);
        }
    }

    // PERKUSJA SŁUCHA SOLISTY: akcent dzwonu ride'u tam, gdzie kończy się
    // fraza, i "setup" (rozbieg werbla) tuż przed wejściem następnej
    if (opts.soloPhrases) {
        const barStart = barIdx * 4;
        for (const phrase of opts.soloPhrases) {
            // Koniec frazy w tym takcie -> akcent (bell + stopa)
            if (phrase.end >= barStart && phrase.end < barStart + 4 && rng.chance(0.65)) {
                const beat = Math.min(3.5, Math.round((phrase.end - barStart) * 2) / 2);
                pushEvent(ctx, 'bell', bar, beat, { vel: v * 0.45 }, 0.004);
                if (rng.chance(0.5)) {
                    pushEvent(ctx, 'kick', bar, beat, { vel: v * 0.35 }, 0.004);
                }
            }
            // Fraza wchodzi na początku następnego taktu -> setup pod koniec tego
            if (phrase.start >= barStart + 4 && phrase.start < barStart + 5.5 && rng.chance(0.55)) {
                pushEvent(ctx, 'snare', bar, 3, { vel: v * 0.2 }, 0.004);
                pushEvent(ctx, 'snare', bar, 3.33, { vel: v * 0.26 }, 0.004);
                pushEvent(ctx, 'snare', bar, 3.67, { vel: v * 0.32 }, 0.004);
            }
        }
    }
}

function buildModalDrumsBar(ctx, section, barIdx, opts) {
    const rng = ctx.rng;
    const bar = section.startBar + barIdx;
    const v = section.drumVel;
    const ridePattern = [
        { beat: 0, vel: 0.42 }, { beat: 1, vel: 0.55 }, { beat: 2, vel: 0.42 },
        { beat: 3, vel: 0.55 }, { beat: 3.5, vel: 0.28 }
    ];
    for (const hit of ridePattern) {
        pushEvent(ctx, 'ride', bar, hit.beat, { vel: v * hit.vel * rng.float(0.9, 1.1) }, 0.003);
    }
    for (const beat of [1, 3]) pushEvent(ctx, 'hat', bar, beat, { vel: v * 0.26 }, 0.003);
    if (rng.chance(0.4)) pushEvent(ctx, 'kick', bar, 0, { vel: v * 0.18 }, 0.004);
    if (rng.chance(0.25)) pushEvent(ctx, 'snare', bar, rng.pick([2.5, 3.5]), { vel: v * 0.15 }, 0.005);
    if (barIdx === section.bars - 1) {
        pushEvent(ctx, 'tom', bar, 3, { freq: 120, vel: v * 0.35 }, 0.004);
        pushEvent(ctx, 'tom', bar, 3.5, { freq: 90, vel: v * 0.3 }, 0.004);
    }
}

function buildFusionDrumsBar(ctx, section, barIdx, opts) {
    const rng = ctx.rng;
    const bar = section.startBar + barIdx;
    const v = section.drumVel;
    // Hi-hat ósemkami, otwarcia na "i" 2 i 4
    for (let e = 0; e < 8; e++) {
        const beat = e / 2;
        const open = (beat === 1.5 || beat === 3.5) && rng.chance(0.5);
        pushEvent(ctx, open ? 'rideOpen' : 'hat', bar, beat, {
            vel: v * (beat % 1 === 0 ? 0.4 : 0.26)
        }, 0.003);
    }
    // Stopa funkowa + backbeat (w fusion backbeat jest u siebie)
    pushEvent(ctx, 'kick', bar, 0, { vel: v * 0.6 }, 0.003);
    if (rng.chance(0.8)) pushEvent(ctx, 'kick', bar, 1.75, { vel: v * 0.45 }, 0.003);
    pushEvent(ctx, 'kick', bar, 2.5, { vel: v * 0.5 }, 0.003);
    pushEvent(ctx, 'snare', bar, 1, { vel: v * 0.5 }, 0.003);
    pushEvent(ctx, 'snare', bar, 3, { vel: v * 0.52 }, 0.003);
    for (const g of [0.75, 2.25, 3.25]) {
        if (rng.chance(0.4)) pushEvent(ctx, 'snare', bar, g, { vel: v * 0.13 }, 0.004);
    }
    if (barIdx === section.bars - 1) {
        pushEvent(ctx, 'tom', bar, 3.5, { freq: 160, vel: v * 0.4 }, 0.004);
        pushEvent(ctx, 'tom', bar, 3.75, { freq: 110, vel: v * 0.42 }, 0.004);
    }
}

/**
 * Takt solowy perkusji (czwórki): frazy na werblu i tomach, hi-hat nogą
 * trzyma puls. Zespół milczy - to odpowiedź perkusisty na frazę trąbki.
 */
function buildDrumSoloBar(ctx, section, barIdx, opts) {
    const rng = ctx.rng;
    const bar = section.startBar + barIdx;
    const v = section.drumVel;

    for (const beat of [1, 3]) {
        pushEvent(ctx, 'hat', bar, beat, { vel: v * 0.32 }, 0.003);
    }

    for (let beat = 0; beat < 4; beat++) {
        const cell = rng.weighted([[3, 'eighths'], [2.2, 'triplet'], [2, 'accent'], [2, 'rest'], [1.5, 'toms']]);
        switch (cell) {
            case 'eighths':
                pushEvent(ctx, 'snare', bar, beat, { vel: v * rng.float(0.3, 0.4) }, 0.004);
                pushEvent(ctx, 'snare', bar, beat + 0.5, { vel: v * rng.float(0.18, 0.26) }, 0.004);
                break;
            case 'triplet':
                for (let k = 0; k < 3; k++) {
                    pushEvent(ctx, 'snare', bar, beat + k / 3, { vel: v * (0.34 - k * 0.05) }, 0.004);
                }
                break;
            case 'accent':
                if (rng.chance(0.5)) {
                    pushEvent(ctx, 'kick', bar, beat, { vel: v * 0.5 }, 0.004);
                    pushEvent(ctx, 'snare', bar, beat + 0.5, { vel: v * 0.35 }, 0.004);
                } else {
                    pushEvent(ctx, 'snare', bar, beat, { vel: v * 0.46 }, 0.004);
                }
                break;
            case 'toms':
                pushEvent(ctx, 'tom', bar, beat, { freq: 180, vel: v * 0.42 }, 0.004);
                pushEvent(ctx, 'tom', bar, beat + 0.5, { freq: 120, vel: v * 0.38 }, 0.004);
                break;
        }
    }

    // Korona czwórki: mocniejsze domknięcie ostatniego taktu segmentu
    if (opts.lastOfSegment) {
        pushEvent(ctx, 'snare', bar, 3, { vel: v * 0.46 }, 0.004);
        pushEvent(ctx, 'snare', bar, 3.33, { vel: v * 0.4 }, 0.004);
        pushEvent(ctx, 'tom', bar, 3.67, { freq: 110, vel: v * 0.48 }, 0.004);
    }
}

/**
 * Czwórki: trąbka i perkusja wymieniają się 4-taktowymi frazami.
 * W czwórkach perkusji zespół milczy (klasyczny "trading fours").
 */
function buildTradingSection(ctx, section, localBars, states, soloRegister) {
    const rng = ctx.rng;
    const segments = Math.floor(section.bars / 4);
    const soloState = { lastPitch: null };
    const bluesForm = ctx.formName.toLowerCase().includes('lues');

    for (let seg = 0; seg < segments; seg++) {
        const segStart = seg * 4;
        const trumpetTurn = seg % 2 === 0;

        for (let b = 0; b < 4; b++) {
            const barIdx = segStart + b;
            // Wyświetlacz akordów działa niezależnie od tego, kto gra
            const formBar = localBars[barIdx % localBars.length];
            let beat = 0;
            for (const slot of formBar) {
                pushEvent(ctx, 'chordDisplay', section.startBar + barIdx, beat, { name: slot.chord.sym });
                beat += slot.beats;
            }
            if (trumpetTurn) {
                buildWalkingBar(ctx, section, barIdx, localBars, states.bass);
                buildCompingBar(ctx, section, barIdx, localBars, states.piano, 1);
                buildSwingDrumsBar(ctx, section, barIdx, { heat: 1 });
            } else {
                buildDrumSoloBar(ctx, section, barIdx, { lastOfSegment: b === 3 });
            }
        }

        if (trumpetTurn) {
            const rhythm = generatePhraseRhythm(rng, rng.pick([10, 12, 13]), 0.78);
            const startBeat = rng.pick([0.5, 1]);
            let notes = pitchPhrase(ctx, rhythm, segStart, startBeat, localBars,
                soloRegister, soloState, bluesForm && rng.chance(0.5));
            notes = licksifyNotes(ctx, notes, segStart, startBeat, localBars);
            emitSoloNotes(ctx, section.startBar, segStart, startBeat, notes,
                { kind: 'trumpet', vel: 0.56 }, rhythm[rhythm.length - 1].off + 1);
        } else {
            // Zespołowy strzał na "1" otwierający czwórkę perkusji
            pushEvent(ctx, 'kick', section.startBar + segStart, 0, { vel: 0.5 });
            pushEvent(ctx, 'crash', section.startBar + segStart, 0, { vel: 0.4 });
        }
    }
}

/**
 * Tła trąbki za solem fortepianu: długie dźwięki prowadzące (tercja/septyma)
 * co dwa takty - tekstura sekcji dętej z big-bandowych aranżacji.
 */
function buildBackgroundPads(ctx, section, localBars) {
    const rng = ctx.rng;
    for (let barIdx = 0; barIdx < section.bars; barIdx += 2) {
        if (!rng.chance(0.75)) continue;
        const chord = chordAt(localBars, barIdx, 0);
        const guide = rng.chance(0.5)
            ? chord.tones[1]
            : (chord.tones[3] != null ? chord.tones[3] : chord.tones[2]);
        const pitch = clampPitch(nearestPitch((chord.root + guide) % 12, 63), 57, 71);
        pushEvent(ctx, 'trumpet', section.startBar + barIdx, 0.5, {
            freq: midiToFreq(pitch), dur: ctx.beatDur * 3, vel: 0.26,
            opts: { scoop: false, vibrato: true, vibratoDepth: 2.5, vibratoRate: 4.5, vibratoDelay: 0.6 }
        }, 0.008);
    }
}

// ---------------------------------------------------------------------------
// SOLISTA: frazy z pauzami, celowanie w dźwięki akordowe, motywy
// ---------------------------------------------------------------------------

/**
 * Generuje rytm frazy jako listę {off (w beatach od startu frazy), dur}.
 * Ósemkowa siatka swingowa z dłuższymi wartościami i nutą finałową.
 */
function generatePhraseRhythm(rng, lengthBeats, density) {
    const cells = [];
    let pos = 0;
    while (pos < lengthBeats - 1.5) {
        if (!rng.chance(density)) { pos += 0.5; continue; }
        if (rng.chance(0.07)) {
            // Triola na jednym beacie
            const start = Math.floor(pos * 2) / 2;
            for (let k = 0; k < 3; k++) cells.push({ off: start + k / 3, dur: 1 / 3 });
            pos = start + 1;
            continue;
        }
        const dur = rng.weighted([[6, 0.5], [2, 1], [1, 1.5]]);
        cells.push({ off: pos, dur });
        pos += dur;
    }
    // Nuta finałowa - dłuższa, wybrzmiewająca
    const finalDur = Math.max(1, lengthBeats - pos);
    cells.push({ off: pos, dur: Math.min(finalDur, 3), final: true });
    return cells;
}

/**
 * Nadaje rytmowi wysokości: kroki po skali z bezwładnością kierunku,
 * chromatyczne podejścia pod zmiany akordów, celowanie w tercje/septymy.
 *
 * phraseOpts:
 *  - contour: tablica interwałów motywu do odtworzenia (rozwój motywiczny)
 *  - finalMode: 'tension' (fraza-pytanie kończy na 9/b7) albo 'resolve'
 *    (odpowiedź kończy na 3/1/5) - klasyczna dramaturgia pytanie-odpowiedź
 */
function pitchPhrase(ctx, rhythm, phraseStartBar, phraseStartBeat, localBars, register, state, bluesy, phraseOpts = {}) {
    const rng = ctx.rng;
    const notes = [];
    let pitch = state.lastPitch != null
        ? state.lastPitch
        : nearestFromSet(chordAt(localBars, phraseStartBar, phraseStartBeat).root,
            chordAt(localBars, phraseStartBar, phraseStartBeat).tones, register.center);
    let direction = rng.chance(0.5) ? 1 : -1;
    const contour = phraseOpts.contour || null;

    for (let i = 0; i < rhythm.length; i++) {
        const cell = rhythm[i];
        const absBeat = phraseStartBeat + cell.off;
        const barIdx = phraseStartBar + Math.floor(absBeat / 4);
        const beatInBar = absBeat % 4;
        const chord = chordAt(localBars, barIdx, beatInBar);
        // Tryb bluesowy: skala bluesowa tonacji zamiast skali akordu
        const effChord = bluesy
            ? { root: ctx.keyPc, scale: SCALES.blues, tones: chord.tones }
            : chord;

        // Czy następna nuta wypada już na nowym akordzie? -> podejście chromatyczne
        const next = rhythm[i + 1];
        let approachTarget = null;
        if (next) {
            const nAbs = phraseStartBeat + next.off;
            const nChord = chordAt(localBars, phraseStartBar + Math.floor(nAbs / 4), nAbs % 4);
            if (nChord.sym !== chord.sym) {
                const targets = [nChord.tones[1], nChord.tones[3] != null ? nChord.tones[3] : nChord.tones[2], 0];
                approachTarget = nearestFromSet(nChord.root, targets, pitch);
            }
        }

        if (i === 0) {
            // Start frazy: dźwięk akordowy blisko rejestru
            pitch = nearestFromSet(chord.root, chord.tones, clampPitch(pitch, register.lo, register.hi));
        } else if (cell.final) {
            // Finał frazy: pytanie zawiesza na napięciu, odpowiedź rozwiązuje
            let strong;
            if (phraseOpts.finalMode === 'tension') {
                strong = [2, 10, 9]; // 9, b7, 13 - dźwięki "zawieszające"
            } else if (phraseOpts.finalMode === 'resolve') {
                strong = [chord.tones[1], 0, chord.tones[2]];
            } else {
                strong = [chord.tones[1], chord.tones[2], chord.tones[3] != null ? chord.tones[3] : chord.tones[0]];
            }
            pitch = nearestFromSet(chord.root, strong, pitch + direction * 2);
        } else if (contour && i - 1 < contour.length) {
            // Rozwój motywu: odtwarzamy kontur interwałowy, dociągając do
            // skali/akordu bieżącej harmonii (transpozycja harmoniczna motywu)
            const raw = pitch + contour[i - 1];
            pitch = beatInBar % 2 === 0
                ? nearestFromSet(chord.root, chord.tones, raw)
                : nearestFromSet(effChord.root, effChord.scale, raw);
        } else if (approachTarget != null) {
            // Podejście półtonem pod cel na nowym akordzie
            pitch = approachTarget + (rng.chance(0.5) ? -1 : 1);
        } else {
            const move = rng.weighted([[5.5, 'step'], [1.6, 'leap'], [1.2, 'chroma'], [1, 'repeat']]);
            if (move === 'step') {
                if (rng.chance(0.25)) direction = -direction;
                pitch = scaleStep(pitch, effChord, direction);
            } else if (move === 'leap') {
                pitch = nearestFromSet(chord.root, chord.tones, pitch + direction * rng.pick([3, 4, 5]));
                if (rng.chance(0.5)) direction = -direction;
            } else if (move === 'chroma') {
                pitch = pitch + direction;
            } // repeat: zostaje
        }

        // Odbijamy się od granic rejestru
        if (pitch >= register.hi) { pitch = register.hi; direction = -1; }
        if (pitch <= register.lo) { pitch = register.lo; direction = 1; }

        notes.push({ off: cell.off, dur: cell.dur, pitch, final: !!cell.final });
    }
    state.lastPitch = notes.length ? notes[notes.length - 1].pitch : pitch;
    return notes;
}

/**
 * Bebopowe obiegniki: po zbudowaniu frazy nuty tuż przed zmianą akordu
 * zostają przepisane na chromatyczne okrążenie celu (góra-dół-cel itd.).
 * To generatywny odpowiednik słownika licków - wzorce względne wobec celu.
 */
const ENCLOSURES = [
    [1, -1], [-1, 1], [2, 1, -1], [-2, -1, 1], [3, 1, -1]
];

function licksifyNotes(ctx, notes, phraseStartBar, phraseStartBeat, localBars) {
    const rng = ctx.rng;
    for (let i = 2; i < notes.length - 1; i++) {
        const abs = phraseStartBeat + notes[i].off;
        const nextAbs = phraseStartBeat + notes[i + 1].off;
        const chord = chordAt(localBars, phraseStartBar + Math.floor(abs / 4), abs % 4);
        const nextChord = chordAt(localBars, phraseStartBar + Math.floor(nextAbs / 4), nextAbs % 4);
        if (chord.sym === nextChord.sym || notes[i + 1].final) continue;
        if (!rng.chance(0.5)) continue;

        const target = notes[i + 1].pitch;
        const pattern = rng.pick(ENCLOSURES);
        // Przepisujemy do 3 nut przed celem (pomijając pierwszą nutę frazy)
        const count = Math.min(pattern.length, i);
        for (let k = 0; k < count; k++) {
            const noteIdx = i - count + 1 + k;
            if (noteIdx <= 0 || notes[noteIdx].final || notes[noteIdx].dur > 1) continue;
            notes[noteIdx].pitch = target + pattern[pattern.length - count + k];
        }
    }
    return notes;
}

/**
 * Wstawki double-time: jedna nuta (z zapasem miejsca) zamienia się
 * w prosty szesnastkowy bieg chromatyczny do następnej nuty.
 */
function addDoubleTimeBursts(ctx, notes, probability) {
    const rng = ctx.rng;
    if (!rng.chance(probability)) return notes;
    const candidates = [];
    for (let i = 1; i < notes.length - 1; i++) {
        const gap = notes[i + 1].off - notes[i].off;
        if (gap >= 1 && !notes[i].final) candidates.push(i);
    }
    if (!candidates.length) return notes;
    const idx = rng.pick(candidates);
    const from = notes[idx];
    const to = notes[idx + 1];
    const burst = [];
    for (let k = 0; k < 4; k++) {
        const t = k / 4;
        burst.push({
            off: from.off + k * 0.25,
            dur: 0.25,
            pitch: Math.round(from.pitch + (to.pitch - from.pitch) * t),
            burst: true
        });
    }
    return [...notes.slice(0, idx), ...burst, ...notes.slice(idx + 1)];
}

/** Emituje nuty frazy solowej z łukiem dynamicznym i akcentami offbeatów. */
function emitSoloNotes(ctx, sectionStartBar, phraseBar, phraseBeat, notes, opts, phraseLen) {
    const rng = ctx.rng;
    for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        const arc = Math.sin(Math.PI * Math.min(1, n.off / phraseLen));
        const offbeatAccent = (n.off % 1) !== 0 ? 0.06 : 0;
        const ghost = n.burst ? -0.1 : 0;
        const vel = Math.min(1, Math.max(0.12,
            opts.vel * (0.82 + 0.3 * arc) + offbeatAccent + ghost + rng.float(-0.03, 0.03)));
        const absBeat = phraseBeat + n.off;
        const evt = {
            freq: midiToFreq(n.pitch),
            dur: ctx.beatDur * (n.final ? n.dur * 1.05 : Math.max(0.14, n.dur * 0.88)),
            vel
        };
        if (opts.kind === 'trumpet') {
            if (n.final && n.dur >= 1.2) {
                evt.opts = { vibrato: true, vibratoDepth: 4, vibratoRate: 5.2, vibratoDelay: 0.25 };
            } else if (n.final && rng.chance(0.4)) {
                evt.opts = { fall: true }; // opadnięcie na końcu krótszej frazy
            } else if (n.burst || n.dur < 0.4) {
                evt.opts = { scoop: false }; // szybkie przebiegi bez podjazdów
            }
        }
        pushEvent(ctx, opts.kind, sectionStartBar + phraseBar, absBeat, evt, 0.007);
    }
}

/** Skraca rytm motywu do pierwszej połowy (fragmentacja). */
function fragmentRhythm(rhythm) {
    const half = Math.max(2, Math.ceil(rhythm.length / 2));
    const cells = rhythm.slice(0, half).map(c => ({ ...c, final: false }));
    cells[cells.length - 1] = { ...cells[cells.length - 1], final: true, dur: Math.max(1, cells[cells.length - 1].dur) };
    return cells;
}

/**
 * Buduje pełny chorus solo dla wskazanego instrumentu.
 *
 * Dramaturgia: pierwsza fraza staje się MOTYWEM (rytm + kontur interwałowy).
 * Kolejne frazy z dużym prawdopodobieństwem rozwijają go klasycznymi
 * technikami: powtórzenie w nowej harmonii, inwersja konturu, fragmentacja,
 * przesunięcie rytmiczne. Frazy naprzemiennie pytają (finał na napięciu)
 * i odpowiadają (finał na rozwiązaniu).
 *
 * @returns {{memory: Object, phrases: Array<{start: number, end: number}>}}
 *   phrases - granice fraz w beatach sekcji (perkusja na nie odpowiada)
 */
function buildSoloChorus(ctx, section, localBars, opts) {
    const rng = ctx.rng;
    const totalBeats = section.bars * 4;
    const state = { lastPitch: null };
    const memory = opts.memory || { rhythm: null, contour: null };
    const phrases = [];
    let phraseIndex = 0;
    let pos = opts.leadIn ? 0 : rng.weighted([[2, 1], [3, 2], [2, 4]]);

    while (pos < totalBeats - 4) {
        // Wybór materiału frazy: świeży albo rozwinięcie motywu
        let rhythm = null;
        let contour = null;
        const maxLen = Math.min(16, totalBeats - pos - 1);
        const motifFits = memory.rhythm
            && memory.rhythm[memory.rhythm.length - 1].off + 2 <= maxLen;

        if (motifFits && rng.chance(0.55)) {
            const development = rng.weighted([
                [3, 'repeat'], [2, 'invert'], [2, 'fragment'], [2, 'displace']
            ]);
            switch (development) {
                case 'repeat':
                    rhythm = memory.rhythm;
                    contour = memory.contour;
                    break;
                case 'invert':
                    rhythm = memory.rhythm;
                    contour = memory.contour ? memory.contour.map(x => -x) : null;
                    break;
                case 'fragment':
                    rhythm = fragmentRhythm(memory.rhythm);
                    contour = memory.contour ? memory.contour.slice(0, rhythm.length - 1) : null;
                    break;
                case 'displace':
                    // Przesunięcie rytmiczne: ten sam motyw, wejście o pół
                    // beatu/beat później - napięcie metryczne
                    rhythm = memory.rhythm;
                    contour = memory.contour;
                    pos = Math.min(totalBeats - maxLen, pos + rng.pick([0.5, 1]));
                    break;
            }
        } else {
            const len = Math.min(maxLen, rng.weighted([[2, 6], [3, 8], [2.5, 12], [1.5, 16]]));
            rhythm = generatePhraseRhythm(rng, len, opts.density);
        }

        const phraseBar = Math.floor(pos / 4);
        const phraseBeat = pos % 4;
        const bluesy = opts.allowBlues && rng.chance(0.35);
        const finalMode = phraseIndex % 2 === 0 ? 'tension' : 'resolve';
        let notes = pitchPhrase(ctx, rhythm, phraseBar, phraseBeat, localBars,
            opts.register, state, bluesy, { contour, finalMode });

        // Pierwsza fraza chorusu zostaje motywem (rytm + kontur interwałów)
        if (!memory.rhythm && notes.length >= 3) {
            memory.rhythm = rhythm;
            memory.contour = [];
            for (let i = 1; i < notes.length; i++) {
                memory.contour.push(notes[i].pitch - notes[i - 1].pitch);
            }
        }

        notes = licksifyNotes(ctx, notes, phraseBar, phraseBeat, localBars);
        notes = addDoubleTimeBursts(ctx, notes, opts.heat ? 0.25 : 0.1);

        const phraseLen = rhythm[rhythm.length - 1].off + 1;
        emitSoloNotes(ctx, section.startBar, phraseBar, phraseBeat, notes, opts, phraseLen);
        phrases.push({ start: pos, end: pos + phraseLen });
        phraseIndex++;

        pos += phraseLen;
        // Oddech między frazami - cisza jest częścią muzyki
        pos += rng.weighted([[2, 1.5], [3, 2.5], [2.5, 4], [1, 6]]);
        // Wyrównanie do siatki ósemkowej
        pos = Math.round(pos * 2) / 2;
    }
    return { memory, phrases };
}

// ---------------------------------------------------------------------------
// TEMAT (head): riffowa melodia zapamiętywana i powtarzana w "head out"
// ---------------------------------------------------------------------------

/**
 * Sprawdzone synkopowane haki rytmiczne tematu (b = beat, d = długość).
 * Chwytliwość bierze się z powtarzania JEDNEGO rytmu - cały temat trzyma
 * ten sam hak, zmienia się tylko odpowiedź melodyczna.
 */
const HOOK_RHYTHMS = [
    [{ b: 0, d: 0.5 }, { b: 0.5, d: 0.5 }, { b: 1.5, d: 1 }, { b: 3, d: 1.5, final: true }],
    [{ b: 0, d: 1 }, { b: 1.5, d: 0.5 }, { b: 2, d: 0.5 }, { b: 2.5, d: 2, final: true }],
    [{ b: 0.5, d: 0.5 }, { b: 1, d: 0.5 }, { b: 1.5, d: 1 }, { b: 3, d: 1.5, final: true }],
    [{ b: 0, d: 0.5 }, { b: 1, d: 0.5 }, { b: 2, d: 0.5 }, { b: 2.5, d: 0.5 }, { b: 3, d: 1.5, final: true }],
    [{ b: 1.5, d: 0.5 }, { b: 2, d: 0.5 }, { b: 2.5, d: 0.5 }, { b: 3.5, d: 2, final: true }],
    [{ b: 0, d: 0.5 }, { b: 0.5, d: 0.5 }, { b: 1, d: 0.5 }, { b: 2.5, d: 0.5 }, { b: 3, d: 2, final: true }]
];

/**
 * Kontury melodyczne haka: kroki po skali względem dźwięku startowego.
 * Powtarzanie tego samego dźwięku (0,0,...) to najstarszy trik na
 * chwytliwość - patrz "C Jam Blues", który ma dwa dźwięki.
 */
const HOOK_CONTOURS = [
    [0, 0, 0, -1, 0],
    [0, 0, 2, 0, -1],
    [0, -1, -2, 0, 1],
    [0, 2, 1, -1, 0],
    [0, 1, 0, -2, -1],
    [0, -2, 0, 2, 0],
    [0, 0, -1, -1, 0]
];

/**
 * Dopasowuje wysokości riffu do akordów: mocne beaty i finały -> dźwięki
 * akordowe, słabe -> skala (w bluesie: bluesowa skala tonacji dla koloru).
 */
function snapRiffToChords(riff, ctx, sectionStartBeat, localBars) {
    const bluesForm = ctx.formName.toLowerCase().includes('lues');
    return riff.map(n => {
        const absBeat = sectionStartBeat + n.off;
        const barIdx = Math.floor(absBeat / 4);
        const beatInBar = absBeat % 4;
        const chord = chordAt(localBars, barIdx, beatInBar);
        const strongBeat = beatInBar % 2 === 0;
        let snapped;
        if (strongBeat || n.final) {
            snapped = nearestFromSet(chord.root, chord.tones, n.pitch);
        } else if (bluesForm) {
            snapped = nearestFromSet(ctx.keyPc, SCALES.blues, n.pitch);
        } else {
            snapped = nearestFromSet(chord.root, chord.scale, n.pitch);
        }
        return { ...n, pitch: snapped };
    });
}

/**
 * Buduje riff tematu z haka rytmicznego i konturu.
 * @param {number} endBias - przesunięcie ostatniego dźwięku (call kończy
 *   w górze/pytająco, response w dole/twierdząco - klasyczne pytanie-odpowiedź)
 */
function generateThemeRiff(ctx, register, rhythm, contour, endBias = 0) {
    const rng = ctx.rng;
    const start = register.center + rng.int(-2, 3);
    return rhythm.map((cell, i) => {
        const step = contour[Math.min(i, contour.length - 1)];
        let pitch = start + step * 2; // ~2 półtony na krok skali, snap poprawi
        if (cell.final) pitch += endBias;
        pitch = clampPitch(pitch, register.lo, register.hi);
        return { off: cell.b, dur: cell.d, pitch, final: !!cell.final };
    });
}

/**
 * Temat: dla form 12-taktowych klasyczne AAB (riff x2 + odpowiedź),
 * dla dłuższych form fraza A powtarzana w sekcjach A i osobna fraza B.
 */
function buildTheme(ctx, section, localBars, register) {
    const rng = ctx.rng;
    // Jeden hak rytmiczny na cały temat + dwa kontury: pytanie i odpowiedź.
    // Wspólny rytm robi z tematu rozpoznawalny riff zamiast losowej melodii.
    const hookRhythm = rng.pick(HOOK_RHYTHMS);
    const callContour = rng.pick(HOOK_CONTOURS);
    let responseContour = rng.pick(HOOK_CONTOURS);
    if (responseContour === callContour) {
        responseContour = HOOK_CONTOURS[(HOOK_CONTOURS.indexOf(callContour) + 3) % HOOK_CONTOURS.length];
    }
    const call = generateThemeRiff(ctx, register, hookRhythm, callContour, +2);
    const response = generateThemeRiff(ctx, register, hookRhythm, responseContour, -2);
    const phraseBars = ctx.formDef.phraseBars;
    const placements = [];

    if (section.bars === 12 || phraseBars < 8) {
        // Blues i krótkie vampy: hak co 2 takty, naprzemiennie call/response.
        // Muzyka riffowa żyje powtórzeniem - riff wraca przez cały chorus.
        for (let p = 0; p < section.bars / 2; p++) {
            placements.push({ startBeat: p * 8, riff: p % 2 === 0 ? call : response });
        }
    } else {
        // AABA i vamp: fraza na początku każdej frazy formalnej
        const phrases = section.bars / phraseBars;
        for (let p = 0; p < phrases; p++) {
            const isBridge = section.bars === 32 && p === 2;
            placements.push({ startBeat: p * phraseBars * 4, riff: isBridge ? response : call });
            if (phraseBars >= 8) {
                placements.push({ startBeat: (p * phraseBars + 4) * 4, riff: isBridge ? call : response });
            }
        }
    }

    const theme = [];
    for (const place of placements) {
        const snapped = snapRiffToChords(place.riff, ctx, place.startBeat, localBars);
        for (const n of snapped) {
            theme.push({ ...n, absBeat: place.startBeat + n.off });
        }
    }

    for (const n of theme) {
        const vel = Math.min(1, 0.58 + ((n.absBeat % 1) !== 0 ? 0.07 : 0) + rng.float(-0.03, 0.03));
        const evt = {
            freq: midiToFreq(n.pitch),
            dur: ctx.beatDur * (n.final ? n.dur * 1.1 : Math.max(0.18, n.dur * 0.9)),
            vel
        };
        if (n.final && n.dur >= 1) {
            evt.opts = { vibrato: true, vibratoDepth: 4, vibratoRate: 5, vibratoDelay: 0.3 };
        }
        pushEvent(ctx, 'trumpet', section.startBar + Math.floor(n.absBeat / 4), n.absBeat % 4, evt, 0.006);
    }
    return theme;
}

/** Odtwarza zapamiętany temat w sekcji head-out. */
function replayTheme(ctx, section, theme) {
    for (const n of theme) {
        const evt = {
            freq: midiToFreq(n.pitch),
            dur: ctx.beatDur * (n.final ? n.dur * 1.1 : Math.max(0.18, n.dur * 0.9)),
            vel: Math.min(1, 0.6 + ((n.absBeat % 1) !== 0 ? 0.07 : 0) + ctx.rng.float(-0.03, 0.03))
        };
        if (n.final && n.dur >= 1) {
            evt.opts = { vibrato: true, vibratoDepth: 4.5, vibratoRate: 5, vibratoDelay: 0.25 };
        }
        pushEvent(ctx, 'trumpet', section.startBar + Math.floor(n.absBeat / 4), n.absBeat % 4, evt, 0.006);
    }
}

// ---------------------------------------------------------------------------
// ARANŻACJA: sekcje utworu
// ---------------------------------------------------------------------------

const REGISTERS = {
    trumpetTheme: { lo: 60, hi: 79, center: 69 },
    trumpetSolo: { lo: 58, hi: 82, center: 70 },
    pianoSolo: { lo: 62, hi: 86, center: 73 }
};

function buildRhythmSection(ctx, section, localBars, states, opts) {
    for (let barIdx = 0; barIdx < section.bars; barIdx++) {
        // Bas
        if (ctx.feel === 'modal') buildModalBassBar(ctx, section, barIdx, localBars, states.bass);
        else if (ctx.feel === 'fusion') buildFusionBassBar(ctx, section, barIdx, localBars, states.bass);
        else if (opts.bassMode === 'two') buildTwoFeelBassBar(ctx, section, barIdx, localBars, states.bass);
        else buildWalkingBar(ctx, section, barIdx, localBars, states.bass);

        // Fortepian
        if (opts.pianoMode === 'shell') buildShellBar(ctx, section, barIdx, localBars, states.piano);
        else if (opts.pianoMode !== 'off') buildCompingBar(ctx, section, barIdx, localBars, states.piano, opts.compDensity, opts.compOpts || {});

        // Perkusja
        if (ctx.feel === 'modal') buildModalDrumsBar(ctx, section, barIdx, opts.drumOpts || {});
        else if (ctx.feel === 'fusion') buildFusionDrumsBar(ctx, section, barIdx, opts.drumOpts || {});
        else buildSwingDrumsBar(ctx, section, barIdx, opts.drumOpts || {});
    }

    // Zdarzenia zmian akordów (wyświetlacz w UI)
    for (let barIdx = 0; barIdx < section.bars; barIdx++) {
        const bar = localBars[barIdx % localBars.length];
        let beat = 0;
        for (const slot of bar) {
            pushEvent(ctx, 'chordDisplay', section.startBar + barIdx, beat, { name: slot.chord.sym });
            beat += slot.beats;
        }
    }
}

/** Crash + stopa na pierwszej mierze sekcji (początek chorusa). */
function sectionDownbeat(ctx, section, strength = 0.5) {
    pushEvent(ctx, 'crash', section.startBar, 0, { vel: strength });
    pushEvent(ctx, 'kick', section.startBar, 0, { vel: strength * 0.85 });
}

/** Koda: przerwa zespołowa i finałowy akord z fermatą. */
function buildCoda(ctx, section, states) {
    const bar = section.startBar;
    const tonic = ctx.tonic;
    const rng = ctx.rng;

    // Takt 1: zespół gra normalnie pierwsze dwa beaty, potem "break"
    const voicing1 = pickVoicing(chordAt(ctx.bars, 0, 0), states.piano.lastVoicing);
    pushEvent(ctx, 'piano', bar, 0, { freqs: voicing1.map(midiToFreq), dur: ctx.beatDur * 0.5, vel: 0.62 });
    pushEvent(ctx, 'bass', bar, 0, { freq: midiToFreq(clampPitch(nearestPitch(tonic.root, 38), BASS_LO, BASS_HI)), dur: ctx.beatDur * 0.5, vel: 0.8 });
    pushEvent(ctx, 'kick', bar, 0, { vel: 0.5 });
    pushEvent(ctx, 'snare', bar, 1.5, { vel: 0.4 });

    // Takt 2: finałowy akord (tonika z seksta/dziewiątką) z fermatą
    const finalVoicing = pickVoicing(tonic, states.piano.lastVoicing);
    const holdSec = 3.2;
    pushEvent(ctx, 'piano', bar + 1, 0, { freqs: finalVoicing.map(midiToFreq), dur: holdSec, vel: 0.66 });
    pushEvent(ctx, 'bass', bar + 1, 0, { freq: midiToFreq(clampPitch(nearestPitch(tonic.root, 36), BASS_LO, BASS_HI)), dur: holdSec * 0.9, vel: 0.85 });
    pushEvent(ctx, 'crash', bar + 1, 0, { vel: 0.55 });
    pushEvent(ctx, 'kick', bar + 1, 0, { vel: 0.55 });
    // Trąbka: długa nona nad akordem finałowym
    const ninth = nearestPitch((tonic.root + 2) % 12, 74);
    pushEvent(ctx, 'trumpet', bar + 1, 0.02, {
        freq: midiToFreq(ninth), dur: holdSec * 0.85, vel: 0.5,
        opts: { vibrato: true, vibratoDepth: 5, vibratoRate: 5, vibratoDelay: 0.5 }
    });
    return holdSec;
}

// ---------------------------------------------------------------------------
// GŁÓWNY GENERATOR WYSTĘPU
// ---------------------------------------------------------------------------

/**
 * Generuje kompletny występ.
 * @param {Object} options - {style, tempo, seed}
 * @returns {{events: Array, totalSeconds: number, meta: Object}}
 */
export function generatePerformance(options = {}) {
    const ctx = makeContext(options);
    const rng = ctx.rng;
    const N = ctx.barsPerChorus;

    // Ile chorusów solo - krótkie formy dostają więcej przebiegów
    const soloChoruses = N <= 12 ? 2 : 1;

    // Plan sekcji
    const plan = [];
    const introBars = ctx.bars.slice(Math.max(0, N - 4)); // ostatnie 4 takty formy jako intro
    // Wariant intro: sekcja rytmiczna na turnaroundzie albo sama perkusja
    // (klasyczne "Philly Joe" - cztery takty bębnów przed tematem)
    const introStyle = ctx.feel === 'swing' && rng.chance(0.3) ? 'drums' : 'rhythm';
    plan.push({ name: 'intro', label: 'Intro', bars: introBars.length, localBars: introBars, introStyle });
    plan.push({ name: 'head', label: 'Temat', bars: N, localBars: ctx.bars });
    for (let c = 0; c < soloChoruses; c++) {
        plan.push({ name: 'trumpetSolo', label: `Solo trąbki${soloChoruses > 1 ? ` (${c + 1}/${soloChoruses})` : ''}`, bars: N, localBars: ctx.bars, chorusIdx: c });
    }
    for (let c = 0; c < soloChoruses; c++) {
        plan.push({ name: 'pianoSolo', label: `Solo fortepianu${soloChoruses > 1 ? ` (${c + 1}/${soloChoruses})` : ''}`, bars: N, localBars: ctx.bars, chorusIdx: c });
    }
    // Czwórki z perkusją - tylko w feelu swingowym (blues/bebop/rhythm changes)
    if (ctx.feel === 'swing') {
        const tradingBars = N <= 12 ? N * 2 : N;
        plan.push({ name: 'trading', label: 'Czwórki: trąbka i perkusja', bars: tradingBars, localBars: ctx.bars });
    }
    plan.push({ name: 'headOut', label: 'Temat (finał)', bars: N, localBars: ctx.bars });
    // Tag: powtórzony turnaround przed kodą (klasyczne rozciągnięcie finału)
    if (ctx.feel === 'swing' && rng.chance(0.5)) {
        plan.push({ name: 'tag', label: 'Tag', bars: 2, localBars: ctx.bars.slice(N - 2) });
    }
    plan.push({ name: 'coda', label: 'Koda', bars: 2, localBars: [[{ chord: ctx.tonic, beats: 4 }]] });

    // Stany voice leadingu / linii basu przenoszone między sekcjami
    const states = {
        bass: { lastPitch: null, lastChordSym: null },
        piano: { lastVoicing: null }
    };

    let cursor = 0;
    let theme = null;
    const trumpetMemory = { rhythm: null };
    const pianoMemory = { rhythm: null };
    const sections = [];
    let codaHold = 0;

    for (const sec of plan) {
        const section = {
            startBar: cursor, bars: sec.bars,
            bassVel: 0.72, pianoVel: 0.5, drumVel: 1.0
        };
        sections.push({ name: sec.label, t: beatToSeconds(ctx, cursor, 0) });
        pushEvent(ctx, 'section', cursor, 0, { name: sec.label });

        switch (sec.name) {
            case 'intro':
                section.drumVel = 0.8;
                section.pianoVel = 0.42;
                if (sec.introStyle === 'drums') {
                    // Intro perkusyjne: cztery takty samych bębnów budujące puls
                    section.drumVel = 0.95;
                    for (let b = 0; b < section.bars; b++) {
                        buildSwingDrumsBar(ctx, section, b, { heat: b >= section.bars - 2 ? 1 : 0 });
                    }
                } else {
                    buildRhythmSection(ctx, section, sec.localBars, states, {
                        pianoMode: 'comp', compDensity: 0, bassMode: 'two',
                        drumOpts: { sparse: true, quietSnare: true }
                    });
                }
                break;

            case 'head':
                // Temat "w dwójce" - przejście na walking w solach daje lift
                sectionDownbeat(ctx, section, 0.45);
                buildRhythmSection(ctx, section, sec.localBars, states, {
                    pianoMode: 'comp', compDensity: 1, bassMode: 'two',
                    drumOpts: { quietSnare: true }
                });
                theme = buildTheme(ctx, section, sec.localBars, REGISTERS.trumpetTheme);
                break;

            case 'trumpetSolo': {
                sectionDownbeat(ctx, section, sec.chorusIdx === 0 ? 0.5 : 0.42);
                const heat = sec.chorusIdx; // drugi chorus intensywniejszy
                section.drumVel = 1.0 + heat * 0.08;
                // Najpierw solista, potem sekcja - perkusja zna granice fraz
                // i odpowiada na nie akcentami (interakcja zespołu)
                const solo = buildSoloChorus(ctx, section, sec.localBars, {
                    kind: 'trumpet',
                    register: { ...REGISTERS.trumpetSolo, center: REGISTERS.trumpetSolo.center + heat * 2 },
                    density: 0.72 + heat * 0.08, vel: 0.5 + heat * 0.06, heat,
                    allowBlues: ctx.formName.includes('lues'),
                    memory: trumpetMemory, leadIn: heat > 0
                });
                buildRhythmSection(ctx, section, sec.localBars, states, {
                    pianoMode: 'comp', compDensity: heat > 0 ? 2 : 1,
                    compOpts: { altDominants: heat > 0 },
                    drumOpts: { heat, soloPhrases: solo.phrases }
                });
                break;
            }

            case 'pianoSolo': {
                sectionDownbeat(ctx, section, 0.4);
                const heat = sec.chorusIdx;
                // Za solo fortepianu perkusja schodzi ciszej, bas zostaje
                section.drumVel = 0.82 + heat * 0.1;
                const solo = buildSoloChorus(ctx, section, sec.localBars, {
                    kind: 'pianoNote',
                    register: { ...REGISTERS.pianoSolo, center: REGISTERS.pianoSolo.center + heat * 2 },
                    density: 0.68 + heat * 0.1, vel: 0.48 + heat * 0.05, heat,
                    allowBlues: ctx.formName.includes('lues'),
                    memory: pianoMemory, leadIn: heat > 0
                });
                buildRhythmSection(ctx, section, sec.localBars, states, {
                    pianoMode: 'shell',
                    drumOpts: { sparse: heat === 0, quietSnare: heat === 0, heat, soloPhrases: solo.phrases }
                });
                // Tła sekcji dętej w gorętszym chorusie (krótkie formy)
                if (heat > 0 && N <= 12) {
                    buildBackgroundPads(ctx, section, sec.localBars);
                }
                break;
            }

            case 'trading':
                sectionDownbeat(ctx, section, 0.5);
                section.drumVel = 1.05;
                buildTradingSection(ctx, section, sec.localBars, states, REGISTERS.trumpetSolo);
                break;

            case 'headOut':
                sectionDownbeat(ctx, section, 0.55);
                buildRhythmSection(ctx, section, sec.localBars, states, {
                    pianoMode: 'comp', compDensity: 1, drumOpts: { quietSnare: true }
                });
                if (theme) replayTheme(ctx, section, theme);
                break;

            case 'tag':
                // Rozciągnięcie finału: sekcja rytmiczna raz jeszcze przez
                // turnaround, z aktywniejszym compingiem
                buildRhythmSection(ctx, section, sec.localBars, states, {
                    pianoMode: 'comp', compDensity: 2, drumOpts: { heat: 1 }
                });
                break;

            case 'coda':
                codaHold = buildCoda(ctx, section, states);
                break;
        }
        cursor += sec.bars;
    }

    ctx.events.sort((a, b) => a.t - b.t);
    const totalSeconds = beatToSeconds(ctx, cursor, 0) + codaHold + 0.5;
    ctx.events.push({ t: totalSeconds - 0.05, kind: 'end' });

    return {
        events: ctx.events,
        totalSeconds,
        meta: {
            style: ctx.style,
            form: ctx.formName,
            key: PC_NAMES[ctx.keyPc],
            tempo: ctx.tempo,
            swing: ctx.swing,
            totalBars: cursor,
            sections
        }
    };
}
