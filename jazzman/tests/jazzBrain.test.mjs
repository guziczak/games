/**
 * Testy strukturalne generatora występów (jazzBrain).
 * Uruchamianie: node --test tests/  (z katalogu jazzman)
 *
 * Nie testujemy "czy ładnie brzmi" (tego nie da się zasercować), tylko
 * muzyczne niezmienniki: siatkę rytmiczną, prowadzenie basu do następnego
 * akordu, voice leading fortepianu, frazowanie z pauzami, powtórkę tematu.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePerformance } from '../js/modules/jazzBrain.js';

const STYLES = ['swing', 'bebop', 'modal', 'fusion'];
const SEEDS = [1, 7, 42, 1337, 20260822];

const PITCHED = new Set(['piano', 'pianoNote', 'bass', 'trumpet']);
const WALKING_FORMS = new Set(['blues', 'bebopBlues', 'rhythm']);

function freqToMidi(freq) {
    return Math.round(69 + 12 * Math.log2(freq / 440));
}

/**
 * Zwraca [start, koniec) sekcji o podanej etykiecie (prefiksowo).
 * Okno przesunięte o 30 ms w lewo, żeby humanizacyjny jitter pierwszej nuty
 * sekcji nie wypychał jej do sąsiedniego okna.
 */
function sectionSpan(meta, labelPrefix, totalSeconds) {
    const idx = meta.sections.findIndex(s => s.name.startsWith(labelPrefix));
    if (idx === -1) return null;
    const start = meta.sections[idx].t - 0.03;
    const end = (idx + 1 < meta.sections.length ? meta.sections[idx + 1].t : totalSeconds) - 0.03;
    return [start, end];
}

for (const style of STYLES) {
    for (const seed of SEEDS) {
        const perf = generatePerformance({ style, tempo: 132, seed });
        const { events, totalSeconds, meta } = perf;
        const label = `${style}/seed=${seed}/forma=${meta.form}`;
        const beatDur = 60 / meta.tempo;

        test(`${label}: podstawowe niezmienniki zdarzeń`, () => {
            assert.ok(events.length > 300, `za mało zdarzeń: ${events.length}`);
            assert.ok(events.length < 20000, `za dużo zdarzeń: ${events.length}`);
            assert.ok(totalSeconds > 60, `występ za krótki: ${totalSeconds}s`);
            assert.ok(totalSeconds < 900, `występ za długi: ${totalSeconds}s`);

            let prevT = -Infinity;
            for (const ev of events) {
                assert.ok(Number.isFinite(ev.t) && ev.t >= 0, `złe t: ${ev.t} (${ev.kind})`);
                assert.ok(ev.t >= prevT, 'zdarzenia nieposortowane');
                prevT = ev.t;
                if (ev.vel !== undefined) {
                    assert.ok(ev.vel > 0 && ev.vel <= 1.001, `vel poza zakresem: ${ev.vel} (${ev.kind})`);
                }
                if (PITCHED.has(ev.kind)) {
                    const freqs = ev.freqs || [ev.freq];
                    for (const f of freqs) {
                        assert.ok(Number.isFinite(f) && f > 20 && f < 5000, `freq poza zakresem: ${f} (${ev.kind})`);
                    }
                    assert.ok(Number.isFinite(ev.dur) && ev.dur > 0, `dur: ${ev.dur}`);
                }
            }
            assert.equal(events.filter(e => e.kind === 'end').length, 1, 'dokładnie jedno zdarzenie końca');
        });

        test(`${label}: struktura utworu (sekcje w kolejności)`, () => {
            const names = meta.sections.map(s => s.name);
            assert.equal(names[0], 'Intro');
            assert.ok(names.includes('Temat'), 'brak tematu');
            assert.ok(names.some(n => n.startsWith('Solo trąbki')), 'brak solo trąbki');
            assert.ok(names.some(n => n.startsWith('Solo fortepianu')), 'brak solo fortepianu');
            assert.ok(names.includes('Temat (finał)'), 'brak head out');
            assert.equal(names[names.length - 1], 'Koda');

            for (let i = 1; i < meta.sections.length; i++) {
                assert.ok(meta.sections[i].t > meta.sections[i - 1].t, 'sekcje muszą rosnąć w czasie');
            }
        });

        test(`${label}: determinizm (ten sam seed = ten sam występ)`, () => {
            const again = generatePerformance({ style, tempo: 132, seed });
            assert.equal(JSON.stringify(again.events), JSON.stringify(events));
        });

        test(`${label}: ride trzyma siatkę (ćwierćnuty + swingowy skip)`, () => {
            const rides = events.filter(e => e.kind === 'ride');
            if (rides.length === 0) return; // fusion gra hat/rideOpen
            let offGrid = 0;
            for (const ev of rides) {
                const beatPos = ev.t / beatDur;
                const frac = beatPos - Math.floor(beatPos);
                // Odległość cykliczna (jitter może przerzucić nutę tuż przed beat,
                // czyli frac ~0.997 to wciąż "na beacie")
                const near = x => {
                    const d = Math.abs(frac - x);
                    return Math.min(d, 1 - d) < 0.06;
                };
                if (!(near(0) || near(meta.swing))) offGrid++;
            }
            assert.ok(offGrid / rides.length < 0.02,
                `ride poza siatką: ${offGrid}/${rides.length}`);
        });

        if (WALKING_FORMS.has(meta.form)) {
            test(`${label}: walking bass - ćwierćnuty na siatce`, () => {
                const mains = events.filter(e => e.kind === 'bass' && e.vel > 0.45);
                assert.ok(mains.length > 100, `za mało nut basu: ${mains.length}`);
                let offGrid = 0;
                for (const ev of mains) {
                    const beatPos = ev.t / beatDur;
                    const dist = Math.abs(beatPos - Math.round(beatPos));
                    if (dist > 0.05) offGrid++;
                }
                assert.ok(offGrid / mains.length < 0.02,
                    `bas poza ćwierćnutami: ${offGrid}/${mains.length}`);
            });

            test(`${label}: walking bass prowadzi do następnego taktu`, () => {
                const mains = events
                    .filter(e => e.kind === 'bass' && e.vel > 0.45)
                    .map(e => ({ bar: Math.floor(e.t / (4 * beatDur) + 0.02), t: e.t, midi: freqToMidi(e.freq) }));

                const byBar = new Map();
                for (const n of mains) {
                    if (!byBar.has(n.bar)) byBar.set(n.bar, []);
                    byBar.get(n.bar).push(n);
                }

                let transitions = 0, smooth = 0, sumAbs = 0;
                for (const [bar, notes] of byBar) {
                    const next = byBar.get(bar + 1);
                    if (!next || notes.length < 4 || next.length < 1) continue;
                    const lastNote = notes[notes.length - 1];
                    const firstNext = next[0];
                    const delta = Math.abs(firstNext.midi - lastNote.midi);
                    transitions++;
                    sumAbs += delta;
                    if (delta <= 2) smooth++;
                }
                assert.ok(transitions > 20, `za mało przejść taktowych: ${transitions}`);
                assert.ok(smooth / transitions >= 0.5,
                    `nuty podejściowe zbyt rzadko prowadzą do celu: ${smooth}/${transitions}`);
                assert.ok(sumAbs / transitions <= 4,
                    `średni skok na granicy taktu za duży: ${(sumAbs / transitions).toFixed(2)}`);
            });
        }

        test(`${label}: comping fortepianu - zakres i voice leading`, () => {
            const comps = events.filter(e => e.kind === 'piano' && e.freqs);
            assert.ok(comps.length > 10, `za mało akordów fortepianu: ${comps.length}`);

            const avgs = [];
            for (const ev of comps) {
                assert.ok(ev.freqs.length >= 2 && ev.freqs.length <= 5,
                    `dziwna liczba głosów: ${ev.freqs.length}`);
                const midis = ev.freqs.map(freqToMidi);
                for (const m of midis) {
                    assert.ok(m >= 42 && m <= 84, `głos poza rejestrem: ${m}`);
                }
                if (midis.length === 4) {
                    avgs.push(midis.reduce((s, x) => s + x, 0) / midis.length);
                }
            }
            // Voice leading: średni ruch między kolejnymi voicingami jest mały
            if (avgs.length > 10) {
                let sum = 0;
                for (let i = 1; i < avgs.length; i++) sum += Math.abs(avgs[i] - avgs[i - 1]);
                const meanMove = sum / (avgs.length - 1);
                assert.ok(meanMove <= 5, `voicingi skaczą: średni ruch ${meanMove.toFixed(2)} półtonu`);
            }
        });

        test(`${label}: solo trąbki - frazy z oddechami, rejestr instrumentu`, () => {
            const span = sectionSpan(meta, 'Solo trąbki', totalSeconds);
            assert.ok(span, 'brak sekcji solo trąbki');
            const notes = events.filter(e =>
                e.kind === 'trumpet' && e.t >= span[0] && e.t < span[1]);
            assert.ok(notes.length >= 15, `za mało nut w solo: ${notes.length}`);

            for (const n of notes) {
                const m = freqToMidi(n.freq);
                assert.ok(m >= 56 && m <= 84, `trąbka poza rejestrem: ${m}`);
            }

            // Muszą istnieć pauzy między frazami (cisza to część jazzu)
            let gaps = 0;
            for (let i = 1; i < notes.length; i++) {
                if (notes[i].t - notes[i - 1].t >= 1.5 * beatDur) gaps++;
            }
            assert.ok(gaps >= 2, `solo bez oddechów: ${gaps} przerw`);
        });

        test(`${label}: temat wraca w finale (ta sama melodia)`, () => {
            const headSpan = sectionSpan(meta, 'Temat', totalSeconds);
            const outSpan = sectionSpan(meta, 'Temat (finał)', totalSeconds);
            assert.ok(headSpan && outSpan);

            const headPitches = events
                .filter(e => e.kind === 'trumpet' && e.t >= headSpan[0] && e.t < headSpan[1])
                .map(e => freqToMidi(e.freq));
            const outPitches = events
                .filter(e => e.kind === 'trumpet' && e.t >= outSpan[0] && e.t < outSpan[1])
                .map(e => freqToMidi(e.freq));

            assert.ok(headPitches.length >= 10, `temat za krótki: ${headPitches.length} nut`);
            assert.deepEqual(outPitches, headPitches,
                'temat w finale musi być tą samą melodią co na początku');
        });

        if (style === 'fusion') {
            test(`${label}: fusion gra prosto (bez swingu)`, () => {
                assert.equal(meta.swing, 0.5);
            });
        }
    }
}

test('różne seedy dają różne występy', () => {
    const a = generatePerformance({ style: 'swing', tempo: 132, seed: 1 });
    const b = generatePerformance({ style: 'swing', tempo: 132, seed: 2 });
    assert.notEqual(JSON.stringify(a.events), JSON.stringify(b.events));
});

test('tempo skaluje czas trwania występu', () => {
    const slow = generatePerformance({ style: 'swing', tempo: 100, seed: 5 });
    const fast = generatePerformance({ style: 'swing', tempo: 200, seed: 5 });
    // Ten sam seed = ta sama forma i liczba taktów, więc czasy skalują się ~2x
    assert.equal(slow.meta.totalBars, fast.meta.totalBars);
    const ratio = slow.totalSeconds / fast.totalSeconds;
    assert.ok(ratio > 1.6 && ratio < 2.1, `zły stosunek czasów: ${ratio.toFixed(2)}`);
});
