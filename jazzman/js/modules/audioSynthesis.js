/**
 * Audio Synthesis Module
 * Zawiera funkcje do zaawansowanej syntezy dźwięku dla różnych instrumentów
 */

// --------- UPROSZCZONE SYNTEZATORY DLA URZĄDZEŃ MOBILNYCH ---------

/**
 * Tworzy maksymalnie uproszczony syntezator fortepianu dla urządzeń mobilnych
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @returns {Object} Obiekt syntezatora fortepianu
 */
function createSimplifiedPianoSynthesizer(audioContext) {
    const piano = {
        output: audioContext.createGain(),

        play: function(frequency, time, duration, velocity = 0.7) {
            try {
                const startTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);
                const oscillators = [];

                // Tylko jeden oscylator
                const osc = audioContext.createOscillator();
                osc.type = 'triangle';
                osc.frequency.value = frequency;

                // Prosty gain node
                const gainNode = audioContext.createGain();

                // Uproszczona obwiednia
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(velocity, startTime + 0.01);
                gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

                // Połączenia
                osc.connect(gainNode);
                gainNode.connect(this.output);

                // Start i stop
                osc.start(startTime);
                osc.stop(startTime + duration);

                oscillators.push(osc);

                return {
                    oscillators,
                    gainNode,
                    stop: function(fadeTime = 0.05) {
                        gainNode.gain.cancelScheduledValues(audioContext.currentTime);
                        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeTime);

                        setTimeout(() => {
                            try { osc.stop(); } catch(e) {}
                        }, fadeTime * 1000);
                    }
                };
            } catch (error) {
                console.error("Błąd fortepianu:", error);
                return null;
            }
        },

        playChord: function(frequencies, time, duration, velocity = 0.7) {
            const notes = [];
            const safeTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);

            // Maksymalnie 3 nuty dla oszczędności
            const limitedFrequencies = frequencies.slice(0, 3);

            limitedFrequencies.forEach((freq, index) => {
                const note = this.play(freq, safeTime + (index * 0.01), duration, velocity - (index * 0.05));
                if (note) notes.push(note);
            });

            return {
                notes,
                stop: function(fadeTime = 0.05) {
                    notes.forEach(note => {
                        if (note && note.stop) note.stop(fadeTime);
                    });
                }
            };
        }
    };

    return piano;
}

/**
 * Tworzy maksymalnie uproszczony syntezator basu dla urządzeń mobilnych
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @returns {Object} Obiekt syntezatora basu
 */
function createSimplifiedBassSynthesizer(audioContext) {
    const bass = {
        output: audioContext.createGain(),

        play: function(frequency, time, duration, velocity = 0.8) {
            try {
                const startTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);
                const oscillators = [];

                // Prosty oscylator bez dodatkowych funkcji
                const osc = audioContext.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.value = frequency;

                // Główny gain node
                const gainNode = audioContext.createGain();

                // Uproszczona obwiednia
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(velocity, startTime + 0.05);
                gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

                // Prosty filtr
                const filter = audioContext.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 500;

                // Połączenia
                osc.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(this.output);

                // Start i stop
                osc.start(startTime);
                osc.stop(startTime + duration);

                oscillators.push(osc);

                return {
                    oscillators,
                    gainNode,
                    stop: function(fadeTime = 0.05) {
                        gainNode.gain.cancelScheduledValues(audioContext.currentTime);
                        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeTime);

                        setTimeout(() => {
                            try { osc.stop(); } catch(e) {}
                        }, fadeTime * 1000);
                    }
                };
            } catch (error) {
                console.error("Błąd basu:", error);
                return null;
            }
        }
    };

    return bass;
}

/**
 * Tworzy maksymalnie uproszczony syntezator perkusji dla urządzeń mobilnych
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @returns {Object} Obiekt syntezatora perkusji
 */
function createSimplifiedDrumSynthesizer(audioContext) {
    // Prekompiluj bufory dla perkusji
    const kickBuffer = (() => {
        const bufferSize = audioContext.sampleRate * 0.5;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        // Kreowanie kształtu stopy perkusyjnej
        for (let i = 0; i < bufferSize; i++) {
            const t = i / audioContext.sampleRate;
            const amplitude = Math.exp(-10 * t);
            output[i] = amplitude * Math.sin(2 * Math.PI * 60 * Math.exp(-5 * t) * t);
        }

        return buffer;
    })();

    const snareBuffer = (() => {
        const bufferSize = audioContext.sampleRate * 0.3;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        // Mieszanka szumu i tonu dla werbla
        for (let i = 0; i < bufferSize; i++) {
            const t = i / audioContext.sampleRate;
            const amplitude = Math.exp(-20 * t);
            output[i] = (0.5 * Math.sin(2 * Math.PI * 200 * t) +
                        0.5 * (Math.random() * 2 - 1)) * amplitude;
        }

        return buffer;
    })();

    const hihatBuffer = (() => {
        const bufferSize = audioContext.sampleRate * 0.1;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        // Biały szum filtrowany dla hi-hatu
        for (let i = 0; i < bufferSize; i++) {
            const t = i / audioContext.sampleRate;
            const amplitude = Math.exp(-50 * t);
            output[i] = (Math.random() * 2 - 1) * amplitude;
        }

        return buffer;
    })();

    const drums = {
        output: audioContext.createGain(),

        playKick: function(time, velocity = 0.8) {
            try {
                const startTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);

                const source = audioContext.createBufferSource();
                source.buffer = kickBuffer;

                const gainNode = audioContext.createGain();
                gainNode.gain.value = velocity;

                source.connect(gainNode);
                gainNode.connect(this.output);

                source.start(startTime);

                return { source, gainNode };
            } catch (error) {
                console.error("Błąd stopy perkusyjnej:", error);
                return null;
            }
        },

        playSnare: function(time, velocity = 0.7) {
            try {
                const startTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);

                const source = audioContext.createBufferSource();
                source.buffer = snareBuffer;

                const gainNode = audioContext.createGain();
                gainNode.gain.value = velocity;

                source.connect(gainNode);
                gainNode.connect(this.output);

                source.start(startTime);

                return { source, gainNode };
            } catch (error) {
                console.error("Błąd werbla:", error);
                return null;
            }
        },

        playHiHat: function(time, velocity = 0.6, open = false) {
            try {
                const startTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);

                const source = audioContext.createBufferSource();
                source.buffer = hihatBuffer;
                source.playbackRate.value = open ? 0.8 : 1.5;

                const gainNode = audioContext.createGain();
                gainNode.gain.value = velocity * 0.6;

                const highpass = audioContext.createBiquadFilter();
                highpass.type = 'highpass';
                highpass.frequency.value = 5000;

                source.connect(highpass);
                highpass.connect(gainNode);
                gainNode.connect(this.output);

                source.start(startTime);

                return { source, gainNode };
            } catch (error) {
                console.error("Błąd hi-hatu:", error);
                return null;
            }
        },

        playCrash: function(time, velocity = 0.7) {
            try {
                const startTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);

                // Kreujemy crash za pomocą filtrowanego szumu
                const bufferSize = audioContext.sampleRate * 1.0;
                const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
                const output = buffer.getChannelData(0);

                for (let i = 0; i < bufferSize; i++) {
                    const t = i / audioContext.sampleRate;
                    const amplitude = Math.exp(-5 * t);
                    output[i] = (Math.random() * 2 - 1) * amplitude;
                }

                const source = audioContext.createBufferSource();
                source.buffer = buffer;

                const gainNode = audioContext.createGain();
                gainNode.gain.value = velocity * 0.5;

                const highpass = audioContext.createBiquadFilter();
                highpass.type = 'highpass';
                highpass.frequency.value = 6000;

                source.connect(highpass);
                highpass.connect(gainNode);
                gainNode.connect(this.output);

                source.start(startTime);

                return { source, gainNode };
            } catch (error) {
                console.error("Błąd crash:", error);
                return null;
            }
        },

        playTom: function(time, frequency = 100, velocity = 0.7) {
            try {
                const startTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);

                // Prosty tom na bazie oscylatora
                const osc = audioContext.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(frequency * 1.2, startTime);
                osc.frequency.exponentialRampToValueAtTime(frequency * 0.8, startTime + 0.3);

                const gainNode = audioContext.createGain();
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(velocity, startTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

                osc.connect(gainNode);
                gainNode.connect(this.output);

                osc.start(startTime);
                osc.stop(startTime + 0.3);

                return { osc, gainNode };
            } catch (error) {
                console.error("Błąd toma:", error);
                return null;
            }
        }
    };

    return drums;
}

/**
 * Tworzy maksymalnie uproszczony syntezator trąbki dla urządzeń mobilnych
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @returns {Object} Obiekt syntezatora trąbki
 */
function createSimplifiedTrumpetSynthesizer(audioContext) {
    const trumpet = {
        output: audioContext.createGain(),

        play: function(frequency, time, duration, velocity = 0.6, options = {}) {
            try {
                const startTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);

                // Pojedynczy oscylator
                const osc = audioContext.createOscillator();
                osc.type = 'square';
                osc.frequency.value = frequency;

                // Prosty gain node
                const gainNode = audioContext.createGain();

                // Uproszczona obwiednia
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(velocity, startTime + 0.05);
                gainNode.gain.setValueAtTime(velocity * 0.7, startTime + 0.1);
                gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

                // Filtr dla symulacji trąbki
                const filter = audioContext.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = frequency * 2;
                filter.Q.value = 1;

                // Połączenia
                osc.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(this.output);

                // Start i stop
                osc.start(startTime);
                osc.stop(startTime + duration);

                return {
                    oscillators: [osc],
                    mainGain: gainNode,
                    stop: function(fadeTime = 0.05) {
                        gainNode.gain.cancelScheduledValues(audioContext.currentTime);
                        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeTime);

                        setTimeout(() => {
                            try { osc.stop(); } catch(e) {}
                        }, fadeTime * 1000);
                    }
                };
            } catch (error) {
                console.error("Błąd trąbki:", error);
                return null;
            }
        }
    };

    return trumpet;
}

// Cache dla buforów szumu dla fortepianu
const pianoNoiseCache = new Map();

/**
 * Tworzy zoptymalizowany syntezator fortepianu
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @returns {Object} Obiekt syntezatora fortepianu
 */
export function createPianoSynthesizer(audioContext) {
    // Pre-tworzymy bufor szumu, który będzie używany wielokrotnie
    if (!pianoNoiseCache.has('hammer')) {
        pianoNoiseCache.set('hammer', createNoiseBuffer(audioContext, 0.1));
    }

    // Obiekt syntezatora
    const piano = {
        output: audioContext.createGain(),

        /**
         * Odtwarza pojedynczą nutę fortepianu (zoptymalizowana wersja)
         * @param {number} frequency - Częstotliwość dźwięku w Hz
         * @param {number} time - Czas rozpoczęcia (audioContext.currentTime)
         * @param {number} duration - Czas trwania w sekundach
         * @param {number} velocity - Dynamika (0-1)
         */
        play: function(frequency, time, duration, velocity = 0.7) {
            try {
                // Zapewnienie, że czas nigdy nie jest ujemny
                const startTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);

                // Ograniczamy liczbę oscylatorów dla lepszej wydajności
                const oscillators = [];

                // Główny oscylator
                const osc1 = audioContext.createOscillator();
                osc1.type = 'triangle';
                osc1.frequency.value = frequency;

                // Drugi oscylator (oktawa wyżej, cichszy) - używamy tylko jeśli velocity jest wysoka
                let osc2, gain2;
                if (velocity > 0.4) {
                    osc2 = audioContext.createOscillator();
                    osc2.type = 'sine';
                    osc2.frequency.value = frequency * 2;

                    gain2 = audioContext.createGain();
                    gain2.gain.value = velocity * 0.3;
                }

                // Szum dla ataku (hammer noise) - tylko dla nut z wysoką dynamiką
                let noise, noiseGain, noiseFilter;
                if (velocity > 0.5) {
                    noise = audioContext.createBufferSource();
                    noise.buffer = pianoNoiseCache.get('hammer');

                    noiseGain = audioContext.createGain();
                    noiseGain.gain.setValueAtTime(velocity * 0.15, startTime);
                    noiseGain.gain.linearRampToValueAtTime(0, startTime + 0.05);

                    noiseFilter = audioContext.createBiquadFilter();
                    noiseFilter.type = 'bandpass';
                    noiseFilter.frequency.value = 3000;
                    noiseFilter.Q.value = 1;
                }

                // Główny gain node
                const gainNode = audioContext.createGain();

                // Uproszczone parametry obwiedni
                const attack = 0.01 + (velocity * 0.01);
                const decay = 0.1 + (1 - velocity) * 0.15;
                const sustain = 0.5 * velocity;
                const release = Math.min(0.4 + (1 - velocity) * 0.3, duration * 0.7);

                // Ustaw obwiednię amplitudy (ADSR) - uproszczona wersja
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(velocity, startTime + attack);

                if (duration > (attack + decay + 0.05)) {
                    gainNode.gain.linearRampToValueAtTime(velocity * sustain, startTime + attack + decay);
                    const releaseStartTime = Math.max(startTime + attack + decay, startTime + duration - release);
                    gainNode.gain.setValueAtTime(velocity * sustain, releaseStartTime);
                    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
                } else {
                    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
                }

                // Uproszczony filtr
                const filter = audioContext.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 2000 + (velocity * 6000);

                // Prostsza obwiednia filtra - tylko jedno przejście
                filter.frequency.setValueAtTime(4000 + (velocity * 4000), startTime);
                filter.frequency.linearRampToValueAtTime(1000 + (velocity * 3000), startTime + duration);

                // Połączenia
                osc1.connect(filter);
                filter.connect(gainNode);

                if (osc2 && gain2) {
                    osc2.connect(gain2);
                    gain2.connect(filter);
                }

                if (noise && noiseFilter && noiseGain) {
                    noise.connect(noiseFilter);
                    noiseFilter.connect(noiseGain);
                    noiseGain.connect(gainNode);
                }

                gainNode.connect(this.output);

                // Start i stop
                osc1.start(startTime);
                if (osc2) osc2.start(startTime);
                if (noise) noise.start(startTime);

                osc1.stop(startTime + duration);
                if (osc2) osc2.stop(startTime + duration);
                if (noise) noise.stop(startTime + 0.1); // Krótszy czas dla szumu

                // Zapisz oscylatory do tablicy
                oscillators.push(osc1);
                if (osc2) oscillators.push(osc2);
                if (noise) oscillators.push(noise);

                // Zwróć obiekt do ewentualnego anulowania
                return {
                    oscillators,
                    gainNode,
                    filter,
                    stop: function(fadeTime = 0.05) {
                        const stopTime = audioContext.currentTime;
                        gainNode.gain.cancelScheduledValues(stopTime);
                        gainNode.gain.setValueAtTime(gainNode.gain.value, stopTime);
                        gainNode.gain.linearRampToValueAtTime(0, stopTime + fadeTime);

                        setTimeout(() => {
                            oscillators.forEach(osc => {
                                try {
                                    osc.stop();
                                } catch (e) {
                                    // Oscylator mógł już zostać zatrzymany
                                }
                            });
                        }, fadeTime * 1000);
                    }
                };

            } catch (error) {
                console.error("Błąd fortepianu:", error);
                return null;
            }
        },

        /**
         * Odtwarza akord na fortepianie
         * @param {Array} frequencies - Tablica częstotliwości składających się na akord
         * @param {number} time - Czas rozpoczęcia
         * @param {number} duration - Czas trwania
         * @param {number} velocity - Dynamika (0-1)
         */
        playChord: function(frequencies, time, duration, velocity = 0.7) {
            const notes = [];
            // Zapewnienie, że czas nigdy nie jest ujemny
            const safeTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);

            // Ograniczenie liczby nut w akordzie do maksymalnie 4 dla lepszej wydajności
            const limitedFrequencies = frequencies.slice(0, 4);

            limitedFrequencies.forEach((freq, index) => {
                // Lekkie przesunięcia czasowe dla naturalności
                const offset = index * 0.01;
                // Stopniowe zmniejszanie głośności dla wyższych dźwięków
                const noteVelocity = velocity - (index * 0.05);
                const note = this.play(freq, safeTime + offset, duration, noteVelocity);
                if (note) notes.push(note);
            });

            return {
                notes,
                stop: function(fadeTime = 0.05) {
                    notes.forEach(note => {
                        if (note && note.stop) note.stop(fadeTime);
                    });
                }
            };
        }
    };

    return piano;
}

/**
 * Tworzy zaawansowany syntezator basu
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @returns {Object} Obiekt syntezatora basu
 */
export function createBassSynthesizer(audioContext) {
    const bass = {
        output: audioContext.createGain(),
        
        /**
         * Odtwarza pojedynczą nutę basu
         * @param {number} frequency - Częstotliwość dźwięku w Hz
         * @param {number} time - Czas rozpoczęcia
         * @param {number} duration - Czas trwania
         * @param {number} velocity - Dynamika (0-1)
         */
        play: function(frequency, time, duration, velocity = 0.8) {
            try {
                // Zapewnienie, że czas nigdy nie jest ujemny
                const startTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);
                
                // Wiele oscylatorów dla bogatszego brzmienia
                const oscillators = [];
                
                // Główny oscylator (sawtooth dla basowego brzmienia)
                const osc1 = audioContext.createOscillator();
                osc1.type = 'sawtooth';
                osc1.frequency.value = frequency;
                
                // Drugi oscylator (square dla ataku)
                const osc2 = audioContext.createOscillator();
                osc2.type = 'square';
                osc2.frequency.value = frequency;
                
                // Główny gain node
                const gainNode = audioContext.createGain();
                
                // Gain dla drugiego oscylatora (krótki atak)
                const gain2 = audioContext.createGain();
                gain2.gain.setValueAtTime(velocity * 0.3, startTime);
                gain2.gain.linearRampToValueAtTime(0, startTime + 0.2);
                
                // Parametry obwiedni
                const attack = 0.03;
                const decay = 0.15;
                const sustain = 0.7;

                // Sprawdź czy czas trwania jest wystarczająco długi
                const minDuration = attack + decay + 0.05;

                // Dostosuj release do czasu trwania
                const release = Math.min(0.3, duration * 0.7);

                // Ustaw obwiednię
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(velocity, startTime + attack);

                if (duration <= minDuration) {
                    // Dla krótkich dźwięków używamy prostszej obwiedni
                    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
                } else {
                    // Standardowa obwiednia ADSR dla dłuższych dźwięków
                    gainNode.gain.linearRampToValueAtTime(velocity * sustain, startTime + attack + decay);
                    // Upewniamy się, że czas release'u nie powoduje ujemnego timestampu
                    const releaseStartTime = Math.max(startTime + attack + decay, startTime + duration - release);
                    gainNode.gain.setValueAtTime(velocity * sustain, releaseStartTime);
                    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
                }
                
                // Filtr dolnoprzepustowy
                const filter = audioContext.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 500;
                filter.Q.value = 3;
                
                // Filtr dla drugiego oscylatora
                const filter2 = audioContext.createBiquadFilter();
                filter2.type = 'bandpass';
                filter2.frequency.value = 800;
                filter2.Q.value = 2;
                
                // Dynamiczna obwiednia filtra
                filter.frequency.setValueAtTime(1000, startTime);
                filter.frequency.linearRampToValueAtTime(500, startTime + 0.2);
                
                // Compressor dla kontroli dynamiki
                const compressor = audioContext.createDynamicsCompressor();
                compressor.threshold.value = -20;
                compressor.knee.value = 30;
                compressor.ratio.value = 12;
                compressor.attack.value = 0.003;
                compressor.release.value = 0.25;
                
                // Waveeshaper dla lekkiego overdrive
                const waveShaper = audioContext.createWaveShaper();
                waveShaper.curve = createTubeDistortionCurve(2);
                waveShaper.oversample = '4x';
                
                // Połączenia
                osc1.connect(filter);
                filter.connect(waveShaper);
                waveShaper.connect(gainNode);
                
                osc2.connect(filter2);
                filter2.connect(gain2);
                gain2.connect(gainNode);
                
                gainNode.connect(compressor);
                compressor.connect(this.output);
                
                // Start i stop
                osc1.start(startTime);
                osc2.start(startTime);
                
                osc1.stop(startTime + duration);
                osc2.stop(startTime + duration);
                
                // Zapisz oscylatory do tablicy
                oscillators.push(osc1, osc2);
                
                // Zwróć obiekt do ewentualnego anulowania
                return { 
                    oscillators,
                    gainNode,
                    filter,
                    stop: function(fadeTime = 0.05) {
                        const stopTime = audioContext.currentTime;
                        gainNode.gain.cancelScheduledValues(stopTime);
                        gainNode.gain.setValueAtTime(gainNode.gain.value, stopTime);
                        gainNode.gain.linearRampToValueAtTime(0, stopTime + fadeTime);
                        
                        setTimeout(() => {
                            oscillators.forEach(osc => {
                                try {
                                    osc.stop();
                                } catch (e) {
                                    // Oscylator mógł już zostać zatrzymany
                                }
                            });
                        }, fadeTime * 1000);
                    }
                };
                
            } catch (error) {
                console.error("Błąd basu:", error);
                return null;
            }
        }
    };
    
    return bass;
}

/**
 * Tworzy zaawansowany syntezator perkusji
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @returns {Object} Obiekt syntezatora perkusji
 */
export function createDrumSynthesizer(audioContext) {
    const drums = {
        output: audioContext.createGain(),
        
        /**
         * Odtwarza stopa perkusyjna (kick)
         * @param {number} time - Czas rozpoczęcia
         * @param {number} velocity - Głośność (0-1)
         * @param {Object} options - Dodatkowe opcje
         */
        playKick: function(time, velocity = 0.8, options = {}) {
            try {
                // Zapewnienie, że czas nigdy nie jest ujemny
                const startTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);
                
                // Domyślne opcje
                const freq = options.freq || 60;
                const decay = options.decay || 0.4;
                const tone = options.tone || 0.7;
                
                // Oscylator dla stopy
                const osc = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                // Obwiednia częstotliwości (opadająca)
                osc.frequency.setValueAtTime(freq * 2, startTime);
                osc.frequency.exponentialRampToValueAtTime(freq, startTime + decay * 0.5);
                
                // Obwiednia głośności
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(velocity, startTime + 0.005);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + decay);
                
                // Drugi oscylator dla kliknięcia (click)
                const clickOsc = audioContext.createOscillator();
                const clickGain = audioContext.createGain();
                
                clickOsc.frequency.value = 1000;
                clickGain.gain.setValueAtTime(velocity * 0.5, startTime);
                clickGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);
                
                // Filtr dolnoprzepustowy dla kontroli tonu
                const filter = audioContext.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 400 + (tone * 5000);
                
                // Compressor dla kontroli dynamiki
                const compressor = audioContext.createDynamicsCompressor();
                compressor.threshold.value = -24;
                compressor.knee.value = 30;
                compressor.ratio.value = 6;
                compressor.attack.value = 0.005;
                compressor.release.value = 0.1;
                
                // Połączenia
                osc.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(compressor);
                
                clickOsc.connect(clickGain);
                clickGain.connect(compressor);
                
                compressor.connect(this.output);
                
                // Start i stop
                osc.start(startTime);
                clickOsc.start(startTime);
                
                osc.stop(startTime + decay);
                clickOsc.stop(startTime + 0.05);
                
                return { osc, clickOsc, gainNode };
                
            } catch (error) {
                console.error("Błąd stopy perkusyjnej:", error);
                return null;
            }
        },
        
        /**
         * Odtwarza werbel (snare)
         * @param {number} time - Czas rozpoczęcia
         * @param {number} velocity - Głośność (0-1)
         * @param {Object} options - Dodatkowe opcje
         */
        playSnare: function(time, velocity = 0.7, options = {}) {
            try {
                // Zapewnienie, że czas nigdy nie jest ujemny
                const startTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);
                
                // Domyślne opcje
                const tone = options.tone || 0.5;
                const decay = options.decay || 0.2;
                const snappy = options.snappy || 0.7;
                
                // Tworzenie bufora szumu
                const noiseBuffer = createNoiseBuffer(audioContext, 1.0);
                
                // Szum dla werbla
                const noise = audioContext.createBufferSource();
                noise.buffer = noiseBuffer;
                
                // Filtr dla szumu
                const noiseFilter = audioContext.createBiquadFilter();
                noiseFilter.type = 'bandpass';
                noiseFilter.frequency.value = 3000 + (tone * 2000);
                noiseFilter.Q.value = 1.5 - (tone * 0.5);
                
                // Gain dla szumu
                const noiseGain = audioContext.createGain();
                noiseGain.gain.setValueAtTime(0, startTime);
                noiseGain.gain.linearRampToValueAtTime(velocity * snappy, startTime + 0.005);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + decay);
                
                // Oscylator dla tonu werbla
                const osc = audioContext.createOscillator();
                osc.type = 'triangle';
                osc.frequency.value = 150 + (tone * 100);
                
                // Gain dla oscylatora
                const oscGain = audioContext.createGain();
                oscGain.gain.setValueAtTime(0, startTime);
                oscGain.gain.linearRampToValueAtTime(velocity * (1 - snappy * 0.5), startTime + 0.005);
                oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + decay * 0.6);
                
                // Compressor dla lepszej dynamiki
                const compressor = audioContext.createDynamicsCompressor();
                compressor.threshold.value = -24;
                compressor.knee.value = 30;
                compressor.ratio.value = 10;
                compressor.attack.value = 0.003;
                compressor.release.value = 0.1;
                
                // Połączenia
                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(compressor);
                
                osc.connect(oscGain);
                oscGain.connect(compressor);
                
                compressor.connect(this.output);
                
                // Start i stop
                noise.start(startTime);
                osc.start(startTime);
                
                noise.stop(startTime + decay);
                osc.stop(startTime + decay * 0.6);
                
                return { noise, osc, noiseGain, oscGain };
                
            } catch (error) {
                console.error("Błąd werbla:", error);
                return null;
            }
        },
        
        /**
         * Odtwarza hi-hat
         * @param {number} time - Czas rozpoczęcia
         * @param {number} velocity - Głośność (0-1)
         * @param {boolean} open - Czy hi-hat otwarty
         * @param {Object} options - Dodatkowe opcje
         */
        playHiHat: function(time, velocity = 0.6, open = false, options = {}) {
            try {
                // Zapewnienie, że czas nigdy nie jest ujemny
                const startTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);
                
                // Domyślne opcje
                const tone = options.tone || 0.5;
                const decay = open ? (options.decay || 0.3) : (options.decay || 0.05);
                
                // Tworzenie bufora szumu
                const noiseBuffer = createNoiseBuffer(audioContext, 1.0);
                
                // Szum dla hi-hatu
                const noise = audioContext.createBufferSource();
                noise.buffer = noiseBuffer;
                
                // Filtr dla szumu
                const highpass = audioContext.createBiquadFilter();
                highpass.type = 'highpass';
                highpass.frequency.value = 7000 + (tone * 2000);
                
                // Drugi filtr dla kształtowania brzmienia
                const bandpass = audioContext.createBiquadFilter();
                bandpass.type = 'bandpass';
                bandpass.frequency.value = 10000;
                bandpass.Q.value = open ? 1 : 8;
                
                // Gain node
                const noiseGain = audioContext.createGain();
                noiseGain.gain.setValueAtTime(0, startTime);
                noiseGain.gain.linearRampToValueAtTime(velocity * 0.5, startTime + 0.001);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + decay);
                
                // Dodatkowy oscylator dla metaliczności
                const osc1 = audioContext.createOscillator();
                osc1.type = 'square';
                osc1.frequency.value = 220;
                
                const osc2 = audioContext.createOscillator();
                osc2.type = 'square';
                osc2.frequency.value = 440;
                
                const oscGain = audioContext.createGain();
                oscGain.gain.setValueAtTime(0, startTime);
                oscGain.gain.linearRampToValueAtTime(velocity * 0.1, startTime + 0.001);
                oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + decay * 0.5);
                
                // Połączenia
                noise.connect(highpass);
                highpass.connect(bandpass);
                bandpass.connect(noiseGain);
                
                osc1.connect(oscGain);
                osc2.connect(oscGain);
                oscGain.connect(bandpass);
                
                noiseGain.connect(this.output);
                
                // Start i stop
                noise.start(startTime);
                osc1.start(startTime);
                osc2.start(startTime);
                
                noise.stop(startTime + decay);
                osc1.stop(startTime + decay * 0.5);
                osc2.stop(startTime + decay * 0.5);
                
                return { 
                    oscillators: [noise, osc1, osc2],
                    gainNode: noiseGain
                };
                
            } catch (error) {
                console.error("Błąd hi-hatu:", error);
                return null;
            }
        },
        
        /**
         * Odtwarza tomy 
         * @param {number} time - Czas rozpoczęcia
         * @param {number} frequency - Częstotliwość tonu (niska dla floor tom, wysoka dla high tom)
         * @param {number} velocity - Głośność (0-1)
         * @param {Object} options - Dodatkowe opcje
         */
        playTom: function(time, frequency = 100, velocity = 0.7, options = {}) {
            try {
                // Zapewnienie, że czas nigdy nie jest ujemny
                const startTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);
                
                // Domyślne opcje
                const decay = options.decay || 0.4;
                const tone = options.tone || 0.5;
                
                // Oscylator dla toma
                const osc = audioContext.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(frequency * 1.5, startTime);
                osc.frequency.exponentialRampToValueAtTime(frequency, startTime + decay * 0.8);
                
                // Gain node
                const gainNode = audioContext.createGain();
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(velocity, startTime + 0.005);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + decay);
                
                // Filtr dla tonu
                const filter = audioContext.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 900 + (tone * 5000);
                filter.Q.value = 1.5;
                
                // Łączenie
                osc.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(this.output);
                
                // Start i stop
                osc.start(startTime);
                osc.stop(startTime + decay);
                
                return { osc, gainNode };
                
            } catch (error) {
                console.error("Błąd toma:", error);
                return null;
            }
        },
        
        /**
         * Odtwarza crash
         * @param {number} time - Czas rozpoczęcia
         * @param {number} velocity - Głośność (0-1)
         * @param {Object} options - Dodatkowe opcje
         */
        playCrash: function(time, velocity = 0.7, options = {}) {
            try {
                // Zapewnienie, że czas nigdy nie jest ujemny
                const startTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);
                
                // Domyślne opcje
                const tone = options.tone || 0.5;
                const decay = options.decay || 1.5;
                
                // Szum dla crash
                const noiseBuffer = createNoiseBuffer(audioContext, 2.0);
                const noise = audioContext.createBufferSource();
                noise.buffer = noiseBuffer;
                
                // Filtry dla ukształtowania brzmienia
                const highpass = audioContext.createBiquadFilter();
                highpass.type = 'highpass';
                highpass.frequency.value = 5000 + (tone * 2000);
                
                const bandpass = audioContext.createBiquadFilter();
                bandpass.type = 'bandpass';
                bandpass.frequency.value = 8000 + (tone * 3000);
                bandpass.Q.value = 1;
                
                // Obwiednia amplitudy
                const gainNode = audioContext.createGain();
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(velocity * 0.7, startTime + 0.005);
                gainNode.gain.exponentialRampToValueAtTime(velocity * 0.2, startTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + decay);
                
                // Oscylatory dla metalicznego brzmienia
                const osc1 = audioContext.createOscillator();
                osc1.type = 'square';
                osc1.frequency.value = 300;
                
                const osc2 = audioContext.createOscillator();
                osc2.type = 'square';
                osc2.frequency.value = 600;
                
                // Gain dla oscylatorów
                const oscGain = audioContext.createGain();
                oscGain.gain.setValueAtTime(0, startTime);
                oscGain.gain.linearRampToValueAtTime(velocity * 0.2, startTime + 0.001);
                oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
                
                // Połączenia
                noise.connect(highpass);
                highpass.connect(bandpass);
                bandpass.connect(gainNode);
                
                osc1.connect(oscGain);
                osc2.connect(oscGain);
                oscGain.connect(bandpass);
                
                gainNode.connect(this.output);
                
                // Start i stop
                noise.start(startTime);
                osc1.start(startTime);
                osc2.start(startTime);
                
                noise.stop(startTime + decay);
                osc1.stop(startTime + 0.1);
                osc2.stop(startTime + 0.1);
                
                return { 
                    noise,
                    gainNode
                };
                
            } catch (error) {
                console.error("Błąd crash:", error);
                return null;
            }
        }
    };
    
    return drums;
}

// Cache dla krzywych trąbki
const trumpetCurveCache = new Map();

/**
 * Tworzy zaawansowany syntezator trąbki (zoptymalizowana wersja)
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @returns {Object} Obiekt syntezatora trąbki
 */
export function createTrumpetSynthesizer(audioContext) {
    // Pre-tworzenie krzywej dla waveshapera, zamiast generować ją za każdym razem
    if (!trumpetCurveCache.has('default')) {
        trumpetCurveCache.set('default', createTrumpetCurve(50));
    }

    const trumpet = {
        output: audioContext.createGain(),

        /**
         * Odtwarza dźwięk trąbki - zoptymalizowana wersja
         * @param {number} frequency - Częstotliwość dźwięku w Hz
         * @param {number} time - Czas rozpoczęcia
         * @param {number} duration - Czas trwania
         * @param {number} velocity - Dynamika (0-1)
         * @param {Object} options - Dodatkowe opcje
         */
        play: function(frequency, time, duration, velocity = 0.6, options = {}) {
            try {
                // Zapewnienie, że czas nigdy nie jest ujemny
                const startTime = Math.max(time || audioContext.currentTime, audioContext.currentTime);

                // Zredukujemy liczbę oscylatorów dla lepszej wydajności

                // Tablica oscylatorów
                const oscillators = [];

                // Oscylator podstawowy (square wave z modulacją)
                const osc1 = audioContext.createOscillator();
                osc1.type = 'square';
                osc1.frequency.value = frequency;

                // Oscylator dla składowych wyższych harmonicznych
                const osc2 = audioContext.createOscillator();
                osc2.type = 'sawtooth';
                osc2.frequency.value = frequency * 1.01; // Lekkie rozstrojenie

                // Wavefather dla tonu trąbkowego - używamy z cache
                const waveShaperBrass = audioContext.createWaveShaper();
                waveShaperBrass.curve = trumpetCurveCache.get('default');
                waveShaperBrass.oversample = '2x'; // Zmniejszony oversample z 4x na 2x dla wydajności

                // Gain nodes dla oscylatorów
                const gain1 = audioContext.createGain();
                gain1.gain.value = velocity * 0.6;

                const gain2 = audioContext.createGain();
                gain2.gain.value = velocity * 0.3;

                // Główny gain node
                const mainGain = audioContext.createGain();

                // Uproszczona obwiednia - parametry
                const attack = options.attack || 0.06;
                const decay = options.decay || 0.1;
                const sustain = options.sustain || 0.6;
                const release = Math.min(options.release || 0.3, duration * 0.7);

                // Ustawienie obwiedni - uproszczona wersja
                mainGain.gain.setValueAtTime(0, startTime);
                mainGain.gain.linearRampToValueAtTime(velocity, startTime + attack);

                if (duration > (attack + decay + 0.05)) {
                    mainGain.gain.linearRampToValueAtTime(velocity * sustain, startTime + attack + decay);
                    const releaseStartTime = Math.max(startTime + attack + decay, startTime + duration - release);
                    mainGain.gain.setValueAtTime(velocity * sustain, releaseStartTime);
                    mainGain.gain.linearRampToValueAtTime(0, startTime + duration);
                } else {
                    mainGain.gain.linearRampToValueAtTime(0, startTime + duration);
                }

                // Zredukowane filtry - tylko jeden główny filtr formantowy
                const formantFilter = audioContext.createBiquadFilter();
                formantFilter.type = 'bandpass';
                formantFilter.frequency.value = frequency * 3; // Średnia wartość
                formantFilter.Q.value = 2;

                // Szum dla oddechu tylko jeśli velocity jest wysoka (> 0.5)
                let breathNoise, breathFilter, breathGain;
                if (velocity > 0.5 && duration > 0.3) {
                    breathNoise = audioContext.createBufferSource();
                    breathNoise.buffer = createNoiseBuffer(audioContext, 0.5); // Zmniejszony czas

                    breathFilter = audioContext.createBiquadFilter();
                    breathFilter.type = 'bandpass';
                    breathFilter.frequency.value = 2000;
                    breathFilter.Q.value = 0.5;

                    breathGain = audioContext.createGain();
                    breathGain.gain.setValueAtTime(velocity * 0.1, startTime);
                    breathGain.gain.linearRampToValueAtTime(0.001, startTime + attack + 0.1);
                }

                // Vibrato tylko dla dłuższych nut
                if (options.vibrato && duration > 0.8) {
                    const vibratoDepth = options.vibratoDepth || 5;
                    const vibratoRate = options.vibratoRate || 5;
                    const vibratoDelay = options.vibratoDelay || 0.2;

                    const vibratoStart = startTime + vibratoDelay;
                    const vibratoLength = duration - vibratoDelay;

                    // Ograniczamy liczbę punktów w krzywej dla lepszej wydajności
                    const vibratoCurve = createVibratoCurve(frequency, vibratoDepth, vibratoRate, vibratoLength, 30);

                    osc1.frequency.setValueCurveAtTime(vibratoCurve, vibratoStart, vibratoLength);
                }

                // Połączenia oscylatorów
                osc1.connect(gain1);
                gain1.connect(formantFilter);

                osc2.connect(gain2);
                gain2.connect(formantFilter);

                // Połączenia filtrów do głównego gain
                formantFilter.connect(mainGain);

                // Połączenia szumu (opcjonalnie)
                if (breathNoise) {
                    breathNoise.connect(breathFilter);
                    breathFilter.connect(breathGain);
                    breathGain.connect(mainGain);
                }

                // Główny output
                mainGain.connect(this.output);

                // Start i stop
                osc1.start(startTime);
                osc2.start(startTime);
                if (breathNoise) breathNoise.start(startTime);

                osc1.stop(startTime + duration);
                osc2.stop(startTime + duration);
                if (breathNoise) breathNoise.stop(startTime + attack + 0.2);

                // Dodaj oscylatory do listy
                oscillators.push(osc1, osc2);
                if (breathNoise) oscillators.push(breathNoise);

                // Zwróć referencje do obiektów do ewentualnego anulowania
                return {
                    oscillators,
                    mainGain,
                    stop: function(fadeTime = 0.05) {
                        const stopTime = audioContext.currentTime;
                        mainGain.gain.cancelScheduledValues(stopTime);
                        mainGain.gain.setValueAtTime(mainGain.gain.value, stopTime);
                        mainGain.gain.linearRampToValueAtTime(0, stopTime + fadeTime);

                        setTimeout(() => {
                            oscillators.forEach(osc => {
                                try {
                                    osc.stop();
                                } catch (e) {
                                    // Oscylator mógł już zostać zatrzymany
                                }
                            });
                        }, fadeTime * 1000);
                    }
                };

            } catch (error) {
                console.error("Błąd trąbki:", error);
                return null;
            }
        }
    };

    return trumpet;
}

/**
 * Tworzy krzywe dla waveshapera, symulujący nasycenie lampowe (overdrive)
 * @param {number} amount - Intensywność nasycenia (1-100)
 * @returns {Float32Array} Krzywa dla waveshapera
 */
function createTubeDistortionCurve(amount) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    
    return curve;
}

/**
 * Tworzy krzywe dla waveshapera symulującego brzmienie trąbki
 * @param {number} amount - Intensywność (1-100)
 * @returns {Float32Array} Krzywa dla waveshapera
 */
function createTrumpetCurve(amount) {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    
    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        // Nieliniowe przekształcenie charakterystyczne dla instrumentów dętych blaszanych
        curve[i] = Math.tanh(amount * x) / Math.tanh(amount);
    }
    
    return curve;
}

// Cache dla buforów szumu, aby nie tworzyć ich wielokrotnie
const noiseBufferCache = new Map();

/**
 * Tworzy bufor szumu
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @param {number} duration - Czas trwania szumu w sekundach
 * @returns {AudioBuffer} Bufor szumu
 */
function createNoiseBuffer(audioContext, duration) {
    // Zaokrąglamy czas trwania do 2 miejsc po przecinku dla efektywniejszego cache'owania
    const roundedDuration = Math.round(duration * 100) / 100;
    const cacheKey = `noise_${roundedDuration}`;

    // Sprawdzamy, czy mamy już utworzony bufor szumu o tym czasie trwania
    if (noiseBufferCache.has(cacheKey)) {
        return noiseBufferCache.get(cacheKey);
    }

    // Tworzymy nowy bufor, jeśli nie ma go w cache
    const sampleRate = audioContext.sampleRate;
    // Ograniczamy maksymalną wielkość bufora dla lepszej wydajności
    const maxBufferSize = Math.min(sampleRate * roundedDuration, sampleRate * 2);
    const buffer = audioContext.createBuffer(1, maxBufferSize, sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < maxBufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    // Zapisujemy bufor w cache
    noiseBufferCache.set(cacheKey, buffer);

    return buffer;
}

// Cache dla krzywych wibracji
const vibratoCurveCache = new Map();

/**
 * Tworzy krzywą wibracji do modulacji częstotliwości
 * @param {number} baseFreq - Częstotliwość bazowa
 * @param {number} depth - Głębokość wibracji w Hz
 * @param {number} rate - Częstotliwość wibracji w Hz
 * @param {number} duration - Czas trwania w sekundach
 * @param {number} maxPoints - Maksymalna liczba punktów (dla optymalizacji)
 * @returns {Float32Array} Krzywa częstotliwości
 */
function createVibratoCurve(baseFreq, depth, rate, duration, maxPoints = 100) {
    // Zaokrąglamy do 1 miejsca po przecinku dla efektywniejszego cache'owania
    const roundedFreq = Math.round(baseFreq * 10) / 10;
    const roundedDepth = Math.round(depth * 10) / 10;
    const roundedRate = Math.round(rate * 10) / 10;
    const roundedDuration = Math.round(duration * 10) / 10;

    // Klucz cache'a
    const cacheKey = `vibrato_${roundedFreq}_${roundedDepth}_${roundedRate}_${roundedDuration}`;

    // Sprawdzamy cache
    if (vibratoCurveCache.has(cacheKey)) {
        return vibratoCurveCache.get(cacheKey);
    }

    // Liczba punktów próbkowania (ograniczona dla wydajności)
    // Używamy mniej punktów dla krótszych dźwięków
    const points = Math.min(Math.max(2, Math.floor(duration * 50)), maxPoints);
    const curve = new Float32Array(points);

    for (let i = 0; i < points; i++) {
        const t = i / points * duration;
        // Sinusoidalna modulacja częstotliwości
        curve[i] = roundedFreq + roundedDepth * Math.sin(2 * Math.PI * roundedRate * t);
    }

    // Zapisujemy w cache tylko jeśli nie jest za duży (> 2s)
    if (duration <= 2) {
        vibratoCurveCache.set(cacheKey, curve);
    }

    return curve;
}

/**
 * Tworzy efekt reverb z możliwością dostosowania czasu pogłosu
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @param {number} time - Czas pogłosu (sekundy)
 * @param {number} decay - Intensywność pogłosu (0-1)
 * @returns {Object} Obiekty z wejściem (input) i wyjściem (output)
 */
export function createReverbEffect(audioContext, time = 2.0, decay = 0.5) {
    // Tworzymy nody
    const input = audioContext.createGain();
    const output = audioContext.createGain();
    const wet = audioContext.createGain();
    const dry = audioContext.createGain();
    const convolver = audioContext.createConvolver();
    
    // Ustawiamy poziomy dry/wet
    dry.gain.value = 1 - decay * 0.5;
    wet.gain.value = decay;
    
    // Tworzymy bufor impulsu
    const sampleRate = audioContext.sampleRate;
    const bufferLength = sampleRate * time;
    const impulseBuffer = audioContext.createBuffer(2, bufferLength, sampleRate);
    
    // Wypełniamy bufor impulsem pogłosu
    for (let channel = 0; channel < 2; channel++) {
        const channelData = impulseBuffer.getChannelData(channel);
        for (let i = 0; i < bufferLength; i++) {
            // Eksponencjalne zanikanie
            const t = i / sampleRate;
            const amplitude = Math.pow(1 - t / time, decay * 2) * (Math.random() * 2 - 1);
            channelData[i] = amplitude * (1 - i / bufferLength);
        }
    }
    
    // Ustawiamy bufor
    convolver.buffer = impulseBuffer;
    
    // Łączymy nody
    input.connect(dry);
    dry.connect(output);
    
    input.connect(convolver);
    convolver.connect(wet);
    wet.connect(output);
    
    // Zwracamy interfejs efektu
    return {
        input,
        output,
        wet,
        dry,
        
        // Metoda do ustawiania poziomu efektu
        setDecay: function(value) {
            dry.gain.value = 1 - value * 0.5;
            wet.gain.value = value;
        },
        
        // Metoda do podłączania do efektu
        connect: function(destination) {
            output.connect(destination);
        }
    };
}

/**
 * Tworzy efekt delay z możliwością ustawienia czasu i feedbacku
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @param {number} delayTime - Czas opóźnienia (sekundy)
 * @param {number} feedback - Intensywność sprzężenia (0-1)
 * @returns {Object} Obiekt z wejściem (input) i wyjściem (output)
 */
export function createDelayEffect(audioContext, delayTime = 0.3, feedback = 0.4) {
    // Tworzymy nody
    const input = audioContext.createGain();
    const output = audioContext.createGain();
    const wet = audioContext.createGain();
    const dry = audioContext.createGain();
    const delayNode = audioContext.createDelay();
    const feedbackNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    // Ustawiamy parametry
    delayNode.delayTime.value = delayTime;
    feedbackNode.gain.value = feedback;
    filter.type = 'lowpass';
    filter.frequency.value = 2000; // Filtrowanie wysokich częstotliwości w sprzężeniu
    
    // Ustawiamy poziomy dry/wet
    dry.gain.value = 1;
    wet.gain.value = 0.5;
    
    // Łączymy nody
    input.connect(dry);
    dry.connect(output);
    
    input.connect(delayNode);
    delayNode.connect(filter);
    filter.connect(wet);
    wet.connect(output);
    
    // Pętla sprzężenia
    filter.connect(feedbackNode);
    feedbackNode.connect(delayNode);
    
    // Zwracamy interfejs efektu
    return {
        input,
        output,
        delayNode,
        feedbackNode,
        wet,
        dry,
        
        // Metoda do ustawiania czasu opóźnienia
        setDelayTime: function(time) {
            delayNode.delayTime.value = time;
        },
        
        // Metoda do ustawiania feedbacku
        setFeedback: function(value) {
            feedbackNode.gain.value = value;
        },
        
        // Metoda do ustawiania poziomu efektu
        setMix: function(value) {
            wet.gain.value = value;
        },
        
        // Metoda do podłączania do efektu
        connect: function(destination) {
            output.connect(destination);
        }
    };
}

/**
 * Tworzy efekt kompresora z zaawansowanymi ustawieniami
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @param {Object} options - Opcje kompresora
 * @returns {Object} Obiekt kompresora
 */
export function createCompressorEffect(audioContext, options = {}) {
    const compressor = audioContext.createDynamicsCompressor();
    
    // Ustawiamy parametry z domyślnymi wartościami
    compressor.threshold.value = options.threshold || -24;
    compressor.knee.value = options.knee || 30;
    compressor.ratio.value = options.ratio || 12;
    compressor.attack.value = options.attack || 0.003;
    compressor.release.value = options.release || 0.25;
    
    // Zwracamy obiekt z metodami do sterowania
    return {
        node: compressor,
        
        // Metoda do ustawiania progu
        setThreshold: function(value) {
            compressor.threshold.value = value;
        },
        
        // Metoda do ustawiania stosunku kompresji
        setRatio: function(value) {
            compressor.ratio.value = value;
        },
        
        // Metoda do podłączania do efektu
        connect: function(destination) {
            compressor.connect(destination);
        }
    };
}

/**
 * Tworzy efekt eqalizera (3-pasmowego)
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @returns {Object} Obiekt eqalizera
 */
export function createEQEffect(audioContext) {
    // Tworzymy filtry dla każdego pasma
    const lowShelf = audioContext.createBiquadFilter();
    const mid = audioContext.createBiquadFilter();
    const highShelf = audioContext.createBiquadFilter();
    
    // Ustawiamy typy filtrów
    lowShelf.type = 'lowshelf';
    mid.type = 'peaking';
    highShelf.type = 'highshelf';
    
    // Ustawiamy częstotliwości
    lowShelf.frequency.value = 320;
    mid.frequency.value = 1000;
    highShelf.frequency.value = 3200;
    
    // Ustawiamy Q (szerokość pasma)
    mid.Q.value = 1.0;
    
    // Ustawiamy początkowe wzmocnienie (0 dB)
    lowShelf.gain.value = 0;
    mid.gain.value = 0;
    highShelf.gain.value = 0;
    
    // Łączymy filtry szeregowo
    lowShelf.connect(mid);
    mid.connect(highShelf);
    
    // Zwracamy obiekt z metodami do sterowania
    return {
        input: lowShelf,
        output: highShelf,
        
        // Metoda do ustawiania wzmocnienia niskich częstotliwości
        setLow: function(gain) {
            lowShelf.gain.value = gain;
        },
        
        // Metoda do ustawiania wzmocnienia średnich częstotliwości
        setMid: function(gain) {
            mid.gain.value = gain;
        },
        
        // Metoda do ustawiania wzmocnienia wysokich częstotliwości
        setHigh: function(gain) {
            highShelf.gain.value = gain;
        },
        
        // Metoda do podłączania do efektu
        connect: function(destination) {
            highShelf.connect(destination);
        }
    };
}

/**
 * Tworzy łańcuch efektów dla instrumentu
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @param {Object} options - Opcje efektów
 * @returns {Object} Obiekt łańcucha efektów
 */
export function createEffectsChain(audioContext, options = {}) {
    // Tworzymy wejście i wyjście
    const input = audioContext.createGain();
    const output = audioContext.createGain();
    
    // Tworzymy efekty
    const eq = createEQEffect(audioContext);
    const compressor = createCompressorEffect(audioContext);
    const reverb = createReverbEffect(audioContext, options.reverbTime || 2.0, options.reverbDecay || 0.5);
    const delay = createDelayEffect(audioContext, options.delayTime || 0.3, options.delayFeedback || 0.4);
    
    // Tworzymy węzły dry/wet dla delay i reverb
    const delayMixDry = audioContext.createGain();
    const delayMixWet = audioContext.createGain();
    const reverbMixDry = audioContext.createGain();
    const reverbMixWet = audioContext.createGain();
    
    // Ustawiamy początkowe poziomy dry/wet
    delayMixDry.gain.value = 1 - (options.delayMix || 0.2);
    delayMixWet.gain.value = options.delayMix || 0.2;
    reverbMixDry.gain.value = 1 - (options.reverbMix || 0.3);
    reverbMixWet.gain.value = options.reverbMix || 0.3;
    
    // Łańcuch efektów: input -> eq -> compressor -> (delay + reverb) -> output
    input.connect(eq.input);
    eq.connect(compressor.node);
    
    // Parallel routing dla delay i reverb
    compressor.node.connect(delayMixDry);
    delayMixDry.connect(reverbMixDry);
    reverbMixDry.connect(output);
    
    compressor.node.connect(delay.input);
    delay.output.connect(delayMixWet);
    delayMixWet.connect(reverbMixDry);
    
    compressor.node.connect(reverb.input);
    reverb.output.connect(reverbMixWet);
    reverbMixWet.connect(output);
    
    // Zwracamy interfejs łańcucha efektów
    return {
        input,
        output,
        eq,
        compressor,
        reverb,
        delay,
        
        // Metoda do ustawiania poziomu delay
        setDelayMix: function(value) {
            delayMixDry.gain.value = 1 - value;
            delayMixWet.gain.value = value;
        },
        
        // Metoda do ustawiania poziomu reverb
        setReverbMix: function(value) {
            reverbMixDry.gain.value = 1 - value;
            reverbMixWet.gain.value = value;
        },
        
        // Metoda do podłączania do łańcucha efektów
        connect: function(destination) {
            output.connect(destination);
        }
    };
}

/**
 * Tworzy mikser dla wszystkich instrumentów
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @returns {Object} Obiekt miksera
 */
export function createMixer(audioContext) {
    // Tworzymy wyjście main
    const masterOutput = audioContext.createGain();
    masterOutput.gain.value = 0.7;
    masterOutput.connect(audioContext.destination);
    
    // Tworzymy kanały dla każdego instrumentu
    const channels = {
        piano: audioContext.createGain(),
        bass: audioContext.createGain(),
        drums: audioContext.createGain(),
        trumpet: audioContext.createGain()
    };
    
    // Ustawiamy początkowe poziomy głośności
    channels.piano.gain.value = 0.7;
    channels.bass.gain.value = 0.5;
    channels.drums.gain.value = 0.6;
    channels.trumpet.gain.value = 0.5;
    
    // Podłączamy wszystkie kanały do mastera
    for (const channel in channels) {
        channels[channel].connect(masterOutput);
    }
    
    // Zwracamy interfejs miksera
    return {
        master: masterOutput,
        channels,
        
        // Metoda do ustawiania głośności instrumentu
        setVolume: function(instrument, value) {
            if (channels[instrument]) {
                channels[instrument].gain.value = value;
            }
        },
        
        // Metoda do ustawiania głośności głównej
        setMasterVolume: function(value) {
            masterOutput.gain.value = value;
        },
        
        // Metoda do wyciszania/włączania instrumentu
        setMute: function(instrument, muted) {
            if (channels[instrument]) {
                channels[instrument].gain.value = muted ? 0 : (instrument === 'piano' ? 0.7 : 
                                                             instrument === 'bass' ? 0.5 : 
                                                             instrument === 'drums' ? 0.6 : 0.5);
            }
        }
    };
}

/**
 * Sprawdza możliwości przeglądarki i zwraca obiekt z informacjami
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @returns {Object} Obiekt z informacjami o możliwościach przeglądarki
 */
function detectBrowserCapabilities(audioContext) {
    const capabilities = {
        fullSupport: true,
        wavetableSupport: true,
        convolutionSupport: true,
        scriptProcessorSupport: true,
        audioWorkletSupport: false,
        lowLatencySupport: false,
        mobileDevice: false
    };

    // Sprawdzamy podstawowe wsparcie
    if (!audioContext) {
        capabilities.fullSupport = false;
        return capabilities;
    }

    // Wykrywanie urządzenia mobilnego
    capabilities.mobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Sprawdzamy wsparcie dla typów oscylatorów
    try {
        const osc = audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.type = 'square';
        osc.type = 'triangle';
    } catch (e) {
        capabilities.wavetableSupport = false;
    }

    // Sprawdzamy wsparcie dla ConvolverNode
    try {
        audioContext.createConvolver();
    } catch (e) {
        capabilities.convolutionSupport = false;
    }

    // Sprawdzamy wsparcie dla ScriptProcessor
    try {
        audioContext.createScriptProcessor(1024, 1, 1);
    } catch (e) {
        capabilities.scriptProcessorSupport = false;
    }

    // Sprawdzamy wsparcie dla AudioWorklet (nowsze przeglądarki)
    capabilities.audioWorkletSupport = 'audioWorklet' in audioContext;

    // Sprawdzamy wsparcie dla niskiego opóźnienia
    capabilities.lowLatencySupport = 'baseLatency' in audioContext && audioContext.baseLatency < 0.01;

    return capabilities;
}

/**
 * Inicjalizuje AudioWorklet jeśli jest dostępny
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @returns {Promise} Promise, który rozwiązuje się po załadowaniu AudioWorklet
 */
async function initAudioWorkletIfAvailable(audioContext) {
    if (!('audioWorklet' in audioContext)) {
        console.log('AudioWorklet nie jest dostępny w tej przeglądarce');
        return Promise.resolve(false);
    }

    try {
        // Próbujemy załadować moduł AudioWorklet
        await audioContext.audioWorklet.addModule('./js/modules/worklets/basicProcessor.js');
        console.log('AudioWorklet załadowany pomyślnie');
        return true;
    } catch (error) {
        console.error('Błąd podczas ładowania AudioWorklet:', error);
        return false;
    }
}

/**
 * Tworzy zaawansowany procesor audio w zależności od możliwości przeglądarki
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @param {boolean} useWorklet - Czy używać AudioWorklet
 * @returns {Object} Obiekt procesora audio
 */
function createAudioProcessor(audioContext, useWorklet = false) {
    if (useWorklet && 'audioWorklet' in audioContext) {
        try {
            // Używamy AudioWorkletNode (nowoczesne przeglądarki)
            console.log('Tworzenie AudioWorkletNode...');

            // Zamiast ScriptProcessorNode używamy AudioWorkletNode
            const workletNode = new AudioWorkletNode(audioContext, 'basic-processor');

            // Obsługa komunikacji z procesorem AudioWorklet
            workletNode.port.onmessage = (event) => {
                if (event.data.type === 'ready') {
                    console.log('AudioWorkletProcessor jest gotowy');
                }
            };

            // Podłączamy node do wyjścia
            workletNode.connect(audioContext.destination);

            return {
                type: 'worklet',
                node: workletNode,
                connect: (destination) => workletNode.connect(destination),
                stop: () => {
                    // Wysyłamy wiadomość do procesora, aby się zatrzymał
                    workletNode.port.postMessage({ type: 'stop' });
                }
            };
        } catch (e) {
            console.error('Błąd przy tworzeniu AudioWorkletNode:', e);
        }
    }

    // Fallback do przestarzałego ScriptProcessorNode
    console.warn('Używanie przestarzałego ScriptProcessorNode - rozważ aktualizację przeglądarki');
    const scriptProcessor = audioContext.createScriptProcessor(1024, 1, 1);

    // Potrzebujemy podłączyć go do czegoś, żeby działał
    scriptProcessor.connect(audioContext.destination);

    // Obsługa przetwarzania audio
    scriptProcessor.onaudioprocess = function(audioProcessingEvent) {
        // No op - możemy dodać przetwarzanie audio jeśli potrzebne
    };

    return {
        type: 'scriptProcessor',
        node: scriptProcessor,
        connect: (destination) => scriptProcessor.connect(destination),
        stop: () => {
            try {
                scriptProcessor.disconnect();
            } catch (e) {
                console.warn('Błąd przy rozłączaniu ScriptProcessor:', e);
            }
        }
    };
}

/**
 * Tworzy kompletny engine audio z instrumentami i efektami
 * @param {AudioContext} audioContext - Kontekst Web Audio API
 * @returns {Object} Obiekt engine audio
 */
export async function createAudioEngine(audioContext) {
    // Sprawdzamy i wznawiamy kontekst audio jeśli jest zawieszony
    if (audioContext.state === 'suspended') {
        try {
            await audioContext.resume();
        } catch (err) {
            console.error('Błąd przy wznawianiu kontekstu audio:', err);
        }
    }

    // Wykrywamy możliwości przeglądarki
    const browserCapabilities = detectBrowserCapabilities(audioContext);
    console.log('Możliwości przeglądarki:', browserCapabilities);

    // Inicjalizacja AudioWorklet jeśli jest dostępny - teraz czekamy na załadowanie
    let audioProcessor = null;
    let workletLoaded = false;

    if (browserCapabilities.audioWorkletSupport) {
        // Ładujemy AudioWorklet asynchronicznie i czekamy na wynik
        workletLoaded = await initAudioWorkletIfAvailable(audioContext);

        if (workletLoaded) {
            console.log('AudioWorklet będzie używany zamiast ScriptProcessor');
            audioProcessor = createAudioProcessor(audioContext, true);
        } else {
            console.log('Spadek do używania ScriptProcessor');
            audioProcessor = createAudioProcessor(audioContext, false);
        }
    } else {
        // Używamy ScriptProcessor jako fallback
        audioProcessor = createAudioProcessor(audioContext, false);
    }

    // Dostosowujemy engine audio do możliwości przeglądarki
    const optimizationLevel = browserCapabilities.mobileDevice ? 'high' :
                             (browserCapabilities.fullSupport ? 'normal' : 'minimal');

    // System śledzenia aktywnych nut dla zarządzania zasobami
    const activeNotes = {
        piano: new Map(),
        bass: new Map(),
        trumpet: new Map(),
        drums: new Set()
    };

    // Tworzymy mikser
    const mixer = createMixer(audioContext);

    // Tworzymy łańcuchy efektów dla każdego instrumentu
    const pianoEffects = createEffectsChain(audioContext, { reverbMix: 0.3, delayMix: 0.1 });
    const bassEffects = createEffectsChain(audioContext, { reverbMix: 0.1, delayMix: 0.05 });
    const drumsEffects = createEffectsChain(audioContext, { reverbMix: 0.2, delayMix: 0.0 });
    const trumpetEffects = createEffectsChain(audioContext, { reverbMix: 0.4, delayMix: 0.2 });

    // Podłączamy łańcuchy efektów do miksera
    pianoEffects.connect(mixer.channels.piano);
    bassEffects.connect(mixer.channels.bass);
    drumsEffects.connect(mixer.channels.drums);
    trumpetEffects.connect(mixer.channels.trumpet);

    // Dostosowujemy EQ dla każdego instrumentu
    pianoEffects.eq.setLow(2);
    pianoEffects.eq.setMid(0);
    pianoEffects.eq.setHigh(1);

    bassEffects.eq.setLow(3);
    bassEffects.eq.setMid(-1);
    bassEffects.eq.setHigh(-3);

    drumsEffects.eq.setLow(2);
    drumsEffects.eq.setMid(0);
    drumsEffects.eq.setHigh(1);

    trumpetEffects.eq.setLow(-2);
    trumpetEffects.eq.setMid(2);
    trumpetEffects.eq.setHigh(1);

    // Tworzymy syntezatory z uwzględnieniem możliwości przeglądarki
    let piano, bass, drums, trumpet;

    // Dostosowane tworzenie syntezatorów w zależności od poziomu optymalizacji
    if (optimizationLevel === 'high') {
        // Najprostsze syntezatory dla urządzeń mobilnych lub słabych przeglądarek
        piano = createSimplifiedPianoSynthesizer(audioContext);
        bass = createSimplifiedBassSynthesizer(audioContext);
        drums = createSimplifiedDrumSynthesizer(audioContext);
        trumpet = createSimplifiedTrumpetSynthesizer(audioContext);
    } else {
        // Standardowe syntezatory dla nowoczesnych przeglądarek
        piano = createPianoSynthesizer(audioContext);
        bass = createBassSynthesizer(audioContext);
        drums = createDrumSynthesizer(audioContext);
        trumpet = createTrumpetSynthesizer(audioContext);
    }

    // Podłączamy syntezatory do ich łańcuchów efektów
    piano.output.connect(pianoEffects.input);
    bass.output.connect(bassEffects.input);
    drums.output.connect(drumsEffects.input);
    trumpet.output.connect(trumpetEffects.input);

    // Tworzymy analizatory dla wizualizacji
    const pianoAnalyser = audioContext.createAnalyser();
    const bassAnalyser = audioContext.createAnalyser();
    const drumsAnalyser = audioContext.createAnalyser();
    const trumpetAnalyser = audioContext.createAnalyser();
    const masterAnalyser = audioContext.createAnalyser();

    // Ustawiamy parametry analizatorów - jeszcze mniejszy fftSize dla lepszej wydajności
    [pianoAnalyser, bassAnalyser, drumsAnalyser, trumpetAnalyser, masterAnalyser].forEach(analyser => {
        analyser.fftSize = 512; // Zmniejszono z 1024 dla jeszcze lepszej wydajności
        analyser.smoothingTimeConstant = 0.7; // Mniejsza stała wygładzania dla lepszej responsywności
    });

    // Podłączamy analizatory
    mixer.channels.piano.connect(pianoAnalyser);
    mixer.channels.bass.connect(bassAnalyser);
    mixer.channels.drums.connect(drumsAnalyser);
    mixer.channels.trumpet.connect(trumpetAnalyser);
    mixer.master.connect(masterAnalyser);

    // Rozszerzamy funkcje instrumentów o śledzenie aktywnych nut

    // Oryginalna metoda gry fortepianu
    const originalPianoPlay = piano.play;
    piano.play = function(frequency, time, duration, velocity) {
        const note = originalPianoPlay.call(this, frequency, time, duration, velocity);
        if (note) {
            // Dodajemy notę do aktywnych nut (klucz = częstotliwość + czas)
            const noteKey = `${frequency}-${time}`;
            activeNotes.piano.set(noteKey, note);

            // Automatyczne usuwanie po zakończeniu
            setTimeout(() => {
                activeNotes.piano.delete(noteKey);
            }, (duration * 1000) + 100); // 100ms dodatkowego bufora
        }
        return note;
    };

    // Oryginalna metoda gry basu
    const originalBassPlay = bass.play;
    bass.play = function(frequency, time, duration, velocity) {
        const note = originalBassPlay.call(this, frequency, time, duration, velocity);
        if (note) {
            const noteKey = `${frequency}-${time}`;
            activeNotes.bass.set(noteKey, note);

            setTimeout(() => {
                activeNotes.bass.delete(noteKey);
            }, (duration * 1000) + 100);
        }
        return note;
    };

    // Oryginalna metoda gry trąbki
    const originalTrumpetPlay = trumpet.play;
    trumpet.play = function(frequency, time, duration, velocity, options) {
        const note = originalTrumpetPlay.call(this, frequency, time, duration, velocity, options);
        if (note) {
            const noteKey = `${frequency}-${time}`;
            activeNotes.trumpet.set(noteKey, note);

            setTimeout(() => {
                activeNotes.trumpet.delete(noteKey);
            }, (duration * 1000) + 100);
        }
        return note;
    };

    // Monitorowanie stanu AudioWorklet i możliwość płynnego przełączania
    const startWorkletTransitionCheck = async () => {
        // Jeśli przeglądarka wspiera AudioWorklet ale nie był jeszcze załadowany,
        // próbujemy go załadować w tle
        if (browserCapabilities.audioWorkletSupport && !workletLoaded) {
            console.log('Próba załadowania AudioWorklet w tle...');
            const success = await initAudioWorkletIfAvailable(audioContext);

            if (success && audioProcessor && audioProcessor.type === 'scriptProcessor') {
                console.log('AudioWorklet załadowany pomyślnie, przełączamy się z ScriptProcessor');

                // Tworzymy nowy procesor z AudioWorklet
                const newProcessor = createAudioProcessor(audioContext, true);

                // Zatrzymujemy stary procesor
                if (audioProcessor.stop) {
                    audioProcessor.stop();
                }

                // Zastępujemy procesor
                audioProcessor = newProcessor;
                console.log('Płynne przejście na AudioWorklet zakończone');

                // Aktualizacja obiektu engine
                return true;
            }
        }
        return false;
    };

    // Wykonujemy pierwszy check po 3 sekundach
    setTimeout(() => {
        startWorkletTransitionCheck();
    }, 3000);

    // Zwracamy kompletny engine audio z dodatkowymi metodami zarządzania zasobami
    return {
        context: audioContext,
        mixer,
        effects: {
            piano: pianoEffects,
            bass: bassEffects,
            drums: drumsEffects,
            trumpet: trumpetEffects
        },
        instruments: {
            piano,
            bass,
            drums,
            trumpet
        },
        analysers: {
            piano: pianoAnalyser,
            bass: bassAnalyser,
            drums: drumsAnalyser,
            trumpet: trumpetAnalyser,
            master: masterAnalyser
        },

        // Procesor audio - może być AudioWorkletNode lub ScriptProcessorNode
        audioProcessor,

        // Funkcja sprawdzająca i przełączająca na AudioWorklet jeśli stał się dostępny
        checkWorkletTransition: startWorkletTransitionCheck,

        // System śledzenia aktywnych nut
        activeNotes,

        // Metoda do czyszczenia wszystkich aktywnych nut
        stopAllNotes: function() {
            // Zatrzymaj wszystkie aktywne nuty fortepianu
            activeNotes.piano.forEach(note => {
                if (note && note.stop) note.stop(0.05);
            });
            activeNotes.piano.clear();

            // Zatrzymaj wszystkie aktywne nuty basu
            activeNotes.bass.forEach(note => {
                if (note && note.stop) note.stop(0.05);
            });
            activeNotes.bass.clear();

            // Zatrzymaj wszystkie aktywne nuty trąbki
            activeNotes.trumpet.forEach(note => {
                if (note && note.stop) note.stop(0.05);
            });
            activeNotes.trumpet.clear();

            // Wyczyść też inne aktywne efekty dźwiękowe
            activeNotes.drums.clear();
        },

        // Metoda do sprawdzenia stanu audio context i wznowienia go w razie potrzeby
        resumeAudioContext: async function() {
            if (audioContext.state === 'suspended') {
                try {
                    await audioContext.resume();
                    console.log('Kontekst audio wznowiony pomyślnie');
                    return true;
                } catch (err) {
                    console.error('Błąd przy wznawianiu kontekstu audio:', err);
                    return false;
                }
            }
            return true; // Kontekst już działa
        },

        // Metoda do czyszczenia zasobów
        dispose: function() {
            // Zatrzymaj wszystkie aktywne nuty
            this.stopAllNotes();

            // Rozłączamy wszystko
            for (const channel in mixer.channels) {
                mixer.channels[channel].disconnect();
            }
            mixer.master.disconnect();

            // Rozłącz procesor audio, jeśli istnieje
            if (audioProcessor) {
                // Używamy metody stop (która została dodana do obu typów procesorów)
                if (audioProcessor.stop) {
                    audioProcessor.stop();
                } else if (audioProcessor.node) {
                    try {
                        audioProcessor.node.disconnect();
                    } catch (e) {
                        console.warn('Nie udało się rozłączyć procesora audio', e);
                    }
                }
            }

            // Zatrzymujemy kontekst audio jeśli jest aktywny
            if (audioContext.state !== 'closed') {
                audioContext.close();
            }
        }
    };
}

// Usunięto niepotrzebną implementację createDynamicMixingSystem
// Funkcja ta jest już zdefiniowana w module dynamicMixer.js