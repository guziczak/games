/**
 * Testy stroju kontrabasu (Karplus-Strong renderowany do bufora).
 *
 * Mierzymy autokorelacją rzeczywisty okres wyrenderowanej struny i sprawdzamy:
 * 1) że bufor drga z okresem N + 0.5 próbki (uśrednianie dodaje pół próbki),
 * 2) że po kompensacji playbackRate dźwięk trafia w cel z dokładnością
 *    kilku centów - bas NIE MOŻE grać fałszywie względem zespołu.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPluckedString } from '../js/modules/audioSynthesis.js';

/** Deterministyczny generator do powtarzalnych testów. */
function seededRand(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Znajduje okres sygnału autokorelacją z paraboliczną interpolacją szczytu.
 * @returns {number} Okres w próbkach (ułamkowy)
 */
function measurePeriod(data, start, windowLen, minLag, maxLag) {
    const corr = new Float64Array(maxLag + 1);
    for (let lag = minLag; lag <= maxLag; lag++) {
        let sum = 0;
        for (let i = start; i < start + windowLen; i++) {
            sum += data[i] * data[i + lag];
        }
        corr[lag] = sum;
    }
    let best = minLag;
    for (let lag = minLag + 1; lag <= maxLag; lag++) {
        if (corr[lag] > corr[best]) best = lag;
    }
    // Interpolacja paraboliczna wokół szczytu (dokładność podpróbkowa)
    if (best > minLag && best < maxLag) {
        const y1 = corr[best - 1], y2 = corr[best], y3 = corr[best + 1];
        const denom = y1 - 2 * y2 + y3;
        if (Math.abs(denom) > 1e-12) {
            best += 0.5 * (y1 - y3) / denom;
        }
    }
    return best;
}

const centsBetween = (fA, fB) => 1200 * Math.log2(fA / fB);

// Zakres walking bassu: E1..G3, dwie częstotliwości próbkowania
const FREQS = [41.2, 55, 73.4, 98, 110, 146.8, 196];
const SAMPLE_RATES = [44100, 48000];

for (const sr of SAMPLE_RATES) {
    for (const freq of FREQS) {
        test(`kontrabas ${freq} Hz @ ${sr} Hz: strój w granicach kilku centów`, () => {
            const rand = seededRand(Math.floor(freq * 1000 + sr));
            const { data, N } = renderPluckedString(sr, freq, 1.2, 0.75, rand);

            // Sygnał musi być zdrowy: bez NaN, z zanikiem energii
            let rmsStart = 0, rmsEnd = 0;
            const seg = Math.floor(sr * 0.1);
            for (let i = 0; i < seg; i++) {
                assert.ok(Number.isFinite(data[i]), 'NaN w sygnale');
                rmsStart += data[i] * data[i];
                rmsEnd += data[data.length - seg + i] * data[data.length - seg + i];
            }
            assert.ok(rmsEnd < rmsStart * 0.5, 'struna nie zanika');

            // Pomiar okresu w ustabilizowanej części sygnału
            const start = Math.min(Math.floor(sr * 0.05), data.length - 4 * N - 10);
            const windowLen = Math.min(Math.floor(sr * 0.12), data.length - start - 2 * N - 2);
            const measured = measurePeriod(data, start, windowLen,
                Math.max(2, Math.floor(N * 0.8)), Math.ceil(N * 1.2) + 2);

            // 1) Bufor drga z okresem N + 0.5 próbki
            const bufferFreq = sr / measured;
            const expectedBufferFreq = sr / (N + 0.5);
            const bufferErr = Math.abs(centsBetween(bufferFreq, expectedBufferFreq));
            assert.ok(bufferErr < 6,
                `okres bufora: zmierzono ${measured.toFixed(2)}, oczekiwano ${(N + 0.5).toFixed(1)} ` +
                `(błąd ${bufferErr.toFixed(1)} centów)`);

            // 2) Po kompensacji playbackRate trafiamy w docelową częstotliwość
            const playbackRate = (freq * (N + 0.5)) / sr;
            const finalFreq = bufferFreq * playbackRate;
            const finalErr = Math.abs(centsBetween(finalFreq, freq));
            assert.ok(finalErr < 6,
                `strój po kompensacji: ${finalFreq.toFixed(2)} Hz vs cel ${freq} Hz ` +
                `(błąd ${finalErr.toFixed(1)} centów)`);
        });
    }
}

test('kontrabas: jaśniejsze szarpnięcie przy wyższej dynamice', () => {
    const sr = 44100;
    // Ta sama losowość, różne velocity - porównujemy zawartość wysokich
    // częstotliwości w ataku (suma |różnic| kolejnych próbek wzbudzenia)
    const soft = renderPluckedString(sr, 110, 0.5, 0.2, seededRand(7));
    const hard = renderPluckedString(sr, 110, 0.5, 0.95, seededRand(7));
    const roughness = d => {
        let sum = 0;
        for (let i = 1; i < 400; i++) sum += Math.abs(d.data[i] - d.data[i - 1]);
        return sum;
    };
    assert.ok(roughness(hard) > roughness(soft) * 1.3,
        'mocniejsze szarpnięcie powinno mieć jaśniejszy atak');
});
