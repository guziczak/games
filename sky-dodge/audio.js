// ULTRA KREJZI SOUND SYSTEM for Sky Dodge
// Dynamically generates FUN (not scary) cartoon game sounds using Web Audio API

// Global variables for audio system
let audioContext;
let masterGainNode;
let crazyModeEnabled = true; // Always enable crazy mode!
let lastPlayedTime = {};

// Initialize audio system with MAXIMUM CRAZINESS
function initAudioSystem() {
    try {
        // Create audio context
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        
        // Create master volume control - ze stałą głośnością
        masterGainNode = audioContext.createGain();
        masterGainNode.gain.value = 0.6; // Mniejsza głośność domyślna
        
        // Dodanie kompresora dla zapobiegania ściszaniu
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        
        // Połączenie: masterGain -> compressor -> destination
        masterGainNode.connect(compressor);
        compressor.connect(audioContext.destination);
        
        console.log("🦆 KREJZI AUDIO SYSTEM INITIALIZED WITH COMPRESSOR! 🦆");
        return true;
    } catch(e) {
        console.error("Web Audio API not supported in this browser", e);
        return false;
    }
}

// Crazy utility functions for generating random values
function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function coinFlip() {
    return Math.random() > 0.5;
}

function pickRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Add crazy filters to any audio node - but make sure they're FUN not scary
function addCrazyEffects(audioNode, intensity = 1) {
    // Create fun effects chain
    const filter = audioContext.createBiquadFilter();
    const delay = audioContext.createDelay();
    
    // Configure filter - fun cartoon sounds typically use bandpass and lowpass filters
    filter.type = pickRandom(['lowpass', 'bandpass', 'highpass']);
    filter.frequency.value = randomBetween(600, 5000); // More fun frequency range
    filter.Q.value = randomBetween(1, 8); // Not too resonant
    
    // Configure delay for cartoon bounciness
    delay.delayTime.value = randomBetween(0.01, 0.15) * intensity;
    
    // Connect effects - simpler chain for cleaner sounds
    if (coinFlip() && intensity > 0.5) {
        audioNode.connect(filter);
        if (coinFlip()) {
            filter.connect(delay);
            delay.connect(masterGainNode);
        } else {
            filter.connect(masterGainNode);
        }
    } else {
        if (coinFlip()) {
            audioNode.connect(filter);
            filter.connect(masterGainNode);
        } else {
            audioNode.connect(masterGainNode);
        }
    }
    
    return { filter, delay };
}

// ULTRA KREJZI sound generators - fun and silly version!
const soundGenerators = {
    // KACZOREK JETPACK JUMP - Happy cartoon "BOINGGG-WHEEEE" effect
    jump: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Prevent sound spam by enforcing a minimum interval between sounds
        const now = Date.now();
        if (lastPlayedTime.jump && now - lastPlayedTime.jump < 80) return;
        lastPlayedTime.jump = now;
        
        // Create jetpack-like swoosh sound
        const jetpackOsc = audioContext.createOscillator();
        const jetpackGain = audioContext.createGain();
        const jetpackFilter = audioContext.createBiquadFilter();
        
        jetpackOsc.connect(jetpackGain);
        jetpackGain.connect(jetpackFilter);
        
        // Configure for rocket/jetpack sound
        jetpackOsc.type = 'sawtooth';
        jetpackOsc.frequency.setValueAtTime(randomBetween(120, 180), audioContext.currentTime);
        jetpackOsc.frequency.exponentialRampToValueAtTime(
            randomBetween(200, 300), 
            audioContext.currentTime + randomBetween(0.1, 0.2)
        );
        
        // Jetpack filter for 'whoosh' effect
        jetpackFilter.type = 'bandpass';
        jetpackFilter.frequency.setValueAtTime(800, audioContext.currentTime);
        jetpackFilter.frequency.linearRampToValueAtTime(1200, audioContext.currentTime + 0.2);
        jetpackFilter.Q.value = 2;
        
        // Jetpack envelope
        jetpackGain.gain.setValueAtTime(0, audioContext.currentTime);
        jetpackGain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
        jetpackGain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.15);
        jetpackGain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.2);
        jetpackGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        
        // Add jetpack effects
        jetpackFilter.connect(masterGainNode);
        
        // Add fun 'boing' sound on top
        const boingOsc = audioContext.createOscillator();
        const boingGain = audioContext.createGain();
        
        boingOsc.connect(boingGain);
        
        // Configure for cartoonish boing
        boingOsc.type = 'sine';
        boingOsc.frequency.setValueAtTime(randomBetween(400, 500), audioContext.currentTime);
        boingOsc.frequency.exponentialRampToValueAtTime(
            randomBetween(250, 300), 
            audioContext.currentTime + 0.15
        );
        
        // Cartoon boing envelope
        boingGain.gain.setValueAtTime(0, audioContext.currentTime);
        boingGain.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.01);
        boingGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
        
        // Add fun effects
        addCrazyEffects(boingGain, 0.6);
        
        // Add cartoon 'zip up' sound for jetpack blast
        const zipOsc = audioContext.createOscillator();
        const zipGain = audioContext.createGain();
        
        zipOsc.connect(zipGain);
        
        // Cartoon zip sound config
        zipOsc.type = 'sine';
        zipOsc.frequency.setValueAtTime(300, audioContext.currentTime);
        zipOsc.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
        
        // Zip envelope
        zipGain.gain.setValueAtTime(0, audioContext.currentTime);
        zipGain.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.02);
        zipGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        
        // Add zip effects
        addCrazyEffects(zipGain, 0.4);
        
        // Create fun noise blast for jetpack
        const noiseNode = createNoiseNode(0.3);
        const noiseGain = audioContext.createGain();
        const noiseFilter = audioContext.createBiquadFilter();
        
        noiseNode.connect(noiseGain);
        noiseGain.connect(noiseFilter);
        
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 800;
        noiseFilter.Q.value = 2;
        
        // Noise pattern for jetpack
        noiseGain.gain.setValueAtTime(0, audioContext.currentTime);
        noiseGain.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.02);
        noiseGain.gain.linearRampToValueAtTime(0.05, audioContext.currentTime + 0.1);
        noiseGain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.15);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.25);
        
        noiseFilter.connect(masterGainNode);
        
        // Start all sounds
        jetpackOsc.start();
        boingOsc.start();
        zipOsc.start();
        
        // Stop everything
        const stopTime = audioContext.currentTime + 0.4;
        jetpackOsc.stop(stopTime);
        boingOsc.stop(stopTime);
        zipOsc.stop(stopTime);
        
        // Close noise node
        setTimeout(() => {
            if (noiseNode.stop) noiseNode.stop();
        }, 300);
    },
    
    // Regular coin collection - HAPPY COIN SOUND
    coin: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Prevent sound spam
        const now = Date.now();
        if (lastPlayedTime.coin && now - lastPlayedTime.coin < 50) return;
        lastPlayedTime.coin = now;
        
        // Create layered coin sounds
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        
        const gain1 = audioContext.createGain();
        const gain2 = audioContext.createGain();
        
        // Connect oscillators to gains
        oscillator1.connect(gain1);
        oscillator2.connect(gain2);
        
        // Configure oscillators for happy coin sound
        oscillator1.type = 'sine';
        oscillator1.frequency.setValueAtTime(randomBetween(800, 1000), audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(
            randomBetween(1200, 1500), 
            audioContext.currentTime + randomBetween(0.05, 0.1)
        );
        
        oscillator2.type = 'triangle';
        oscillator2.frequency.setValueAtTime(oscillator1.frequency.value * 1.5, audioContext.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(
            oscillator1.frequency.value * 2, 
            audioContext.currentTime + randomBetween(0.07, 0.12)
        );
        
        // Configure happy envelopes
        gain1.gain.setValueAtTime(0, audioContext.currentTime);
        gain1.gain.linearRampToValueAtTime(randomBetween(0.3, 0.4), audioContext.currentTime + 0.01);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
        
        gain2.gain.setValueAtTime(0, audioContext.currentTime);
        gain2.gain.linearRampToValueAtTime(randomBetween(0.2, 0.3), audioContext.currentTime + 0.02);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
        
        // Add fun effects
        addCrazyEffects(gain1, randomBetween(0.2, 0.4));
        addCrazyEffects(gain2, randomBetween(0.2, 0.4));
        
        // Start and stop all sounds
        oscillator1.start();
        oscillator2.start();
        
        const stopTime = audioContext.currentTime + 0.3;
        oscillator1.stop(stopTime);
        oscillator2.stop(stopTime);
        
        // Add fun cartoon click for extra punchiness
        setTimeout(() => {
            const clickOsc = audioContext.createOscillator();
            const clickGain = audioContext.createGain();
            
            clickOsc.connect(clickGain);
            clickGain.connect(masterGainNode);
            
            clickOsc.type = 'sine'; 
            clickOsc.frequency.value = 1800;
            
            clickGain.gain.setValueAtTime(0, audioContext.currentTime);
            clickGain.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.005);
            clickGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.03);
            
            clickOsc.start();
            clickOsc.stop(audioContext.currentTime + 0.03);
        }, 20);
    },
    
    // Purple coin - MAGICAL SPARKLE FUN
    purpleCoin: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Prevent sound spam
        const now = Date.now();
        if (lastPlayedTime.purpleCoin && now - lastPlayedTime.purpleCoin < 100) return;
        lastPlayedTime.purpleCoin = now;
        
        // Create happy magical scale effect
        const notes = [];
        // Use a happy pentatonic scale for magical effect
        const scaleFrequencies = [523.25, 587.33, 659.25, 783.99, 880.00];
        
        // Create ascending magical scale
        for (let i = 0; i < 4; i++) {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            
            const freq = scaleFrequencies[i % scaleFrequencies.length];
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            // Staggered entry for magical arpeggio
            const startTime = audioContext.currentTime + i * 0.05;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
            
            // Add fun magical effects
            addCrazyEffects(gain, 0.4);
            
            notes.push({ osc, gain, startTime });
        }
        
        // Add special magical twinkle on top
        const twinkleOsc = audioContext.createOscillator();
        const twinkleGain = audioContext.createGain();
        
        twinkleOsc.connect(twinkleGain);
        
        twinkleOsc.type = 'triangle';
        twinkleOsc.frequency.setValueAtTime(1200, audioContext.currentTime + 0.15);
        twinkleOsc.frequency.exponentialRampToValueAtTime(1800, audioContext.currentTime + 0.25);
        
        twinkleGain.gain.setValueAtTime(0, audioContext.currentTime + 0.15);
        twinkleGain.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.17);
        twinkleGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);
        
        // Add special sparkle effects
        const twinkleFilter = audioContext.createBiquadFilter();
        twinkleFilter.type = 'bandpass';
        twinkleFilter.frequency.value = 1500;
        twinkleFilter.Q.value = 5;
        
        twinkleGain.connect(twinkleFilter);
        twinkleFilter.connect(masterGainNode);
        
        // Start all oscillators
        notes.forEach(note => {
            note.osc.start(note.startTime);
            note.osc.stop(note.startTime + 0.2);
        });
        
        twinkleOsc.start(audioContext.currentTime + 0.15);
        twinkleOsc.stop(audioContext.currentTime + 0.35);
    },
    
    // Game over - KACZKI KWACZĄ GRACZA NA ŚMIERĆ
    gameOver: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Ustaw flagę aktywności i utwórz metodę zatrzymującą dźwięk
        this.active = true;
        
        // Metoda zatrzymująca dźwięk końca gry
        this.stop = function() {
            this.active = false;
            stopAllSounds();
        };
        
        // Wyczyść wszystkie istniejące dźwięki
        stopAllSounds();
        
        // Główny regulator głośności efektu końca gry - zwiększona głośność
        const gameOverMasterGain = audioContext.createGain();
        gameOverMasterGain.gain.value = 0.8; // Zwiększona głośność
        gameOverMasterGain.connect(masterGainNode);
        
        // =========== FUNKCJA TWORZĄCA REALISTYCZNE KWAKANIE KACZKI ===========
        
        // Funkcja generująca bardzo realistyczne kacze kwakanie
        const createQuack = (startTime, pitch = 1.0, duration = 0.2, volume = 0.5, mockLevel = 1) => {
            // Sprawdź czy dźwięk można odtworzyć
            if (!this.active) return startTime;
            
            // Trzy główne oscylatory dla realistycznego kaczego głosu
            const quackOsc = audioContext.createOscillator();  // Główny ton krtaniowy
            const nasalOsc = audioContext.createOscillator();  // Nosowy rezonans
            const throatOsc = audioContext.createOscillator(); // Gardłowy rezonans
            
            const quackGain = audioContext.createGain();
            const nasalGain = audioContext.createGain();
            const throatGain = audioContext.createGain();
            
            // Śledzenie oscylatorów do późniejszego zatrzymania
            trackOscillator(quackOsc);
            trackOscillator(nasalOsc);
            trackOscillator(throatOsc);
            
            // Typy fal dla każdego oscylatora - dopasowane do rzeczywistego spektrum kaczego kwakania
            quackOsc.type = 'sawtooth';   // Główna tonacja kaczego kwaku
            nasalOsc.type = 'triangle';   // Nosowe tony
            throatOsc.type = 'square';    // Chrapliwe tony gardłowe
            
            // Filtry do realistycznego ukształtowania dźwięku
            // Rzeczywiste kacze kwakanie ma charakterystyczne pasma częstotliwości
            
            // Główny filtr formantowy dla kaczego "kwaa"
            const mainFilter = audioContext.createBiquadFilter();
            mainFilter.type = 'bandpass';
            mainFilter.Q.value = 3.5; // Ostrzejsza krzywa dla wyraźniejszego kwakania
            
            // Filtr nosowy dla charakterystycznego kaczego brzmienia
            const nasalFilter = audioContext.createBiquadFilter();
            nasalFilter.type = 'bandpass';
            nasalFilter.Q.value = 4.0;
            
            // Filtr gardłowy dla dolnych tonów
            const throatFilter = audioContext.createBiquadFilter();
            throatFilter.type = 'lowpass';
            throatFilter.Q.value = 2.0;
            
            // Bazowa częstotliwość - kacze kwakanie oparte na rzeczywistym spektrum częstotliwości
            const baseFreq = 250 * pitch;
            
            // ===== TYPOWY WZORZEC KACZEGO KWAKU =====
            // Rzeczywiste kaczki mają charakterystyczną obwiednię częstotliwości "kwaa-kwaa"
            
            // 1. Główny ton krtaniowy - typowe "kwaa"
            quackOsc.frequency.setValueAtTime(baseFreq * 1.3, startTime); // Wyższy ton na początku
            quackOsc.frequency.linearRampToValueAtTime(baseFreq * 1.1, startTime + 0.02); // Szybki spadek
            
            // Charakterystyczny spadek w środku kwaku (chwilowa przerwa głosowa)
            if (duration > 0.15) {
                quackOsc.frequency.linearRampToValueAtTime(baseFreq * 0.9, startTime + duration * 0.3);
                quackOsc.frequency.linearRampToValueAtTime(baseFreq * 1.1, startTime + duration * 0.4); // Ponowny wzrost
                quackOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, startTime + duration * 0.8); // Finalne obniżenie
            } else {
                quackOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, startTime + duration * 0.7);
            }
            
            // 2. Nosowy rezonans - wyższe częstotliwości dla charakterystycznej "kwakowości"
            nasalOsc.frequency.setValueAtTime(baseFreq * 2.8, startTime);
            nasalOsc.frequency.exponentialRampToValueAtTime(baseFreq * 2.0, startTime + duration * 0.6);
            
            // 3. Gardłowy rezonans - niskotonowe gardłowe dźwięki
            throatOsc.frequency.setValueAtTime(baseFreq * 0.7, startTime);
            throatOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, startTime + duration * 0.7);
            
            // Filtry formantowe - ustawione na charakterystyczne pasma kaczego głosu
            mainFilter.frequency.value = baseFreq * 2.0;  // Główny formant około 500Hz
            nasalFilter.frequency.value = baseFreq * 3.5; // Nosowy formant około 800-900Hz
            throatFilter.frequency.value = baseFreq * 1.0; // Gardłowy formant około 250Hz
            
            // ===== OBWIEDNIE GŁOŚNOŚCI =====
            // Typowe kacze kwakanie ma szybki atak i charakterystyczny zanik
            
            // 1. Główny ton - najgłośniejszy element
            quackGain.gain.setValueAtTime(0, startTime);
            quackGain.gain.linearRampToValueAtTime(volume * 1.2, startTime + 0.01); // Szybki, głośny atak
            
            if (duration > 0.15) {
                // Charakterystyczny wzorzec dwusylabowego "kwaa-kwaa"
                quackGain.gain.linearRampToValueAtTime(volume * 0.6, startTime + duration * 0.25); // Spadek między sylabami
                quackGain.gain.linearRampToValueAtTime(volume * 1.1, startTime + duration * 0.35); // Druga sylaba
                quackGain.gain.linearRampToValueAtTime(volume * 0.5, startTime + duration * 0.7); // Stopniowy zanik
            } else {
                quackGain.gain.linearRampToValueAtTime(volume * 0.6, startTime + duration * 0.5);
            }
            
            quackGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            
            // 2. Nosowy element - dodaje charakterystyczne "ę" w kwaku
            nasalGain.gain.setValueAtTime(0, startTime + 0.01); // Lekko opóźniony względem głównego
            nasalGain.gain.linearRampToValueAtTime(volume * 0.7, startTime + 0.03);
            nasalGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.9);
            
            // 3. Gardłowy element - dodaje głębi i realizmu
            throatGain.gain.setValueAtTime(0, startTime);
            throatGain.gain.linearRampToValueAtTime(volume * 0.6, startTime + 0.02);
            throatGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.8);
            
            // ===== WIBRATO I DRŻENIE GŁOSU =====
            // Prawdziwe kaczki mają lekkie wibracje w głosie
            
            const vibrato = audioContext.createOscillator();
            const vibratoGain = audioContext.createGain();
            
            vibrato.frequency.value = 15 * mockLevel; // Szybsze wibracje dla bardziej natarczywego kwakania
            vibratoGain.gain.value = baseFreq * 0.2 * mockLevel; // Silniejsze wibracje
            
            vibrato.connect(vibratoGain);
            vibratoGain.connect(quackOsc.frequency); // Modulacja głównego tonu
            trackOscillator(vibrato);
            
            // Dodanie lekkiego wibracji do nosowego tonu dla większego realizmu
            const nasalVibrato = audioContext.createOscillator();
            const nasalVibratoGain = audioContext.createGain();
            
            nasalVibrato.frequency.value = 20 * mockLevel; // Szybsze wibracje dla nosowego
            nasalVibratoGain.gain.value = baseFreq * 0.1 * mockLevel;
            
            nasalVibrato.connect(nasalVibratoGain);
            nasalVibratoGain.connect(nasalOsc.frequency);
            trackOscillator(nasalVibrato);
            
            // ===== EFEKT STEREO I KOMPRESJA =====
            
            // Stereo panner dla efektu przestrzennego
            const panner = audioContext.createStereoPanner();
            panner.pan.value = randomBetween(-0.7, 0.7); // Szersze rozłożenie stereo
            
            // Kompresor dla uwydatnienia kwaku
            const quackCompressor = audioContext.createDynamicsCompressor();
            quackCompressor.threshold.value = -18;
            quackCompressor.knee.value = 10;
            quackCompressor.ratio.value = 4;
            quackCompressor.attack.value = 0.002;
            quackCompressor.release.value = 0.1;
            
            // ===== POŁĄCZENIA AUDIO =====
            
            quackOsc.connect(quackGain);
            nasalOsc.connect(nasalGain);
            throatOsc.connect(throatGain);
            
            quackGain.connect(mainFilter);
            nasalGain.connect(nasalFilter);
            throatGain.connect(throatFilter);
            
            mainFilter.connect(quackCompressor);
            nasalFilter.connect(quackCompressor);
            throatFilter.connect(quackCompressor);
            
            quackCompressor.connect(panner);
            panner.connect(gameOverMasterGain);
            
            // ===== URUCHOMIENIE I ZATRZYMANIE =====
            
            quackOsc.start(startTime);
            nasalOsc.start(startTime);
            throatOsc.start(startTime);
            vibrato.start(startTime);
            nasalVibrato.start(startTime);
            
            const stopTime = startTime + duration + 0.1;
            
            quackOsc.stop(stopTime);
            nasalOsc.stop(stopTime);
            throatOsc.stop(stopTime);
            vibrato.stop(stopTime);
            nasalVibrato.stop(stopTime);
            
            return stopTime;
        };
        
        // Funkcja tworząca sekwencję kwakania - szereg dźwięków kaczek
        const createDuckDialog = (startTime, type, numQuacks, mockLevel = 1) => {
            // Sprawdź, czy dźwięk można odtworzyć
            if (!this.active) return startTime;
            
            let currentTime = startTime;
            
            // Proste ustawienia dla różnych typów kaczek
            let pitchRange, volumeRange, pauseRange;
            
            if (type === 'high') {
                // Wysoki głos kaczki
                pitchRange = [1.2, 1.5];
                volumeRange = [0.3, 0.4];
                pauseRange = [0.08, 0.15];
            } else if (type === 'low') {
                // Niski głos kaczki
                pitchRange = [0.7, 0.9];
                volumeRange = [0.4, 0.6];
                pauseRange = [0.12, 0.2];
            } else {
                // Standardowy głos kaczki
                pitchRange = [0.9, 1.1];
                volumeRange = [0.3, 0.5];
                pauseRange = [0.1, 0.18];
            }
            
            // Generuj sekwencję kwakań
            for (let i = 0; i < numQuacks; i++) {
                if (!this.active) return currentTime;
                
                // Losowe wartości z zakresu dla naturalności
                const pitch = randomBetween(pitchRange[0], pitchRange[1]);
                const volume = randomBetween(volumeRange[0], volumeRange[1]);
                const duration = randomBetween(0.15, 0.25);
                
                // Utwórz kwakanie
                currentTime = createQuack(
                    currentTime,
                    pitch,
                    duration,
                    volume,
                    mockLevel
                );
                
                // Dodaj pauzę między kwakaniami
                if (i < numQuacks - 1) {
                    currentTime += randomBetween(pauseRange[0], pauseRange[1]);
                }
            }
            
            return currentTime;
        };
        
        // Funkcja tworząca realistyczny efekt trzepotu kaczych skrzydeł
        const createWingFlaps = (startTime, endTime, intensity = 1) => {
            // Sprawdź, czy dźwięk można odtworzyć
            if (!this.active) return;
            
            const flapDuration = endTime - startTime;
            const numFlaps = Math.min(12, Math.floor(flapDuration / 0.15) * intensity); // Więcej trzepotów
            
            // Kontrola głośności dla wszystkich trzepotów
            const flapsGainNode = audioContext.createGain();
            flapsGainNode.gain.value = 0.4 * intensity; // Głośniejsze trzepoty
            flapsGainNode.connect(gameOverMasterGain);
            
            // Generowanie trzepotu skrzydeł
            for (let i = 0; i < numFlaps; i++) {
                if (!this.active) return;
                
                // Tempo trzepotu zwiększa się z czasem dla dramatycznego efektu
                const flapSpacing = 0.2 - ((i / numFlaps) * 0.1);
                const flapTime = startTime + (i * flapSpacing);
                
                // === RUCH SKRZYDŁA W DÓŁ ===
                // Ruch skrzydła w dół generuje charakterystyczne "fwoop"
                
                const downFlapOsc = audioContext.createOscillator();
                const downFlapGain = audioContext.createGain();
                trackOscillator(downFlapOsc);
                
                // Filtr dla przepływu powietrza przy ruchu w dół
                const downFlapFilter = audioContext.createBiquadFilter();
                downFlapFilter.type = 'lowpass';
                downFlapFilter.frequency.value = 1200;
                downFlapFilter.Q.value = 1.0;
                
                // Naturalny dźwięk uderzenia skrzydła - kombinacja fal
                downFlapOsc.type = i % 2 === 0 ? 'triangle' : 'sawtooth';
                
                // Częstotliwość dźwięku trzepotu - charakterystyczny spadek
                downFlapOsc.frequency.setValueAtTime(randomBetween(450, 650), flapTime);
                downFlapOsc.frequency.exponentialRampToValueAtTime(randomBetween(300, 400), flapTime + 0.06);
                
                // Obwiednia głośności - szybki atak, średni zanik
                downFlapGain.gain.setValueAtTime(0, flapTime);
                downFlapGain.gain.linearRampToValueAtTime(0.25 * intensity, flapTime + 0.01);
                downFlapGain.gain.exponentialRampToValueAtTime(0.001, flapTime + 0.08);
                
                // Efekt stereo dla naturalnego rozproszenia stada
                const downPanner = audioContext.createStereoPanner();
                downPanner.pan.value = randomBetween(-0.9, 0.9);
                
                // Połączenia
                downFlapOsc.connect(downFlapGain);
                downFlapGain.connect(downFlapFilter);
                downFlapFilter.connect(downPanner);
                downPanner.connect(flapsGainNode);
                
                // Uruchomienie i zatrzymanie
                downFlapOsc.start(flapTime);
                downFlapOsc.stop(flapTime + 0.1);
                
                // === RUCH SKRZYDŁA W GÓRĘ ===
                // Ruch skrzydła w górę brzmi inaczej - szybszy "whoosh"
                
                if (!this.active) return; // Sprawdzenie czy należy kontynuować
                
                const upFlapTime = flapTime + 0.07; // Krótkie opóźnienie po ruchu w dół
                
                const upFlapOsc = audioContext.createOscillator();
                const upFlapGain = audioContext.createGain();
                trackOscillator(upFlapOsc);
                
                // Filtr dla przepływu powietrza przy ruchu w górę
                const upFlapFilter = audioContext.createBiquadFilter();
                upFlapFilter.type = 'bandpass';
                upFlapFilter.frequency.value = 2000;
                upFlapFilter.Q.value = 2.0;
                
                // Dźwięk ruchu w górę jest bardziej świszczący
                upFlapOsc.type = 'sine';
                
                // Wyższe częstotliwości dla ruchu w górę
                upFlapOsc.frequency.setValueAtTime(randomBetween(600, 800), upFlapTime);
                upFlapOsc.frequency.linearRampToValueAtTime(randomBetween(800, 1000), upFlapTime + 0.04);
                
                // Obwiednia głośności - mniejsza głośność, szybszy zanik
                upFlapGain.gain.setValueAtTime(0, upFlapTime);
                upFlapGain.gain.linearRampToValueAtTime(0.15 * intensity, upFlapTime + 0.01);
                upFlapGain.gain.exponentialRampToValueAtTime(0.001, upFlapTime + 0.05);
                
                // Ten sam efekt stereo co poprzednio dla spójności przestrzennej
                const upPanner = audioContext.createStereoPanner();
                upPanner.pan.value = downPanner.pan.value; // Ta sama kaczka, więc ten sam panning
                
                // Połączenia
                upFlapOsc.connect(upFlapGain);
                upFlapGain.connect(upFlapFilter);
                upFlapFilter.connect(upPanner);
                upPanner.connect(flapsGainNode);
                
                // Uruchomienie i zatrzymanie
                upFlapOsc.start(upFlapTime);
                upFlapOsc.stop(upFlapTime + 0.07);
                
                // === EFEKT POWIETRZA - DODATKOWY REALISTYCZNY ELEMENT ===
                if (Math.random() < 0.3 && this.active) {
                    const airTime = flapTime + randomBetween(0, 0.05);
                    
                    const airOsc = audioContext.createOscillator();
                    const airGain = audioContext.createGain();
                    trackOscillator(airOsc);
                    
                    // Filtr powietrza
                    const airFilter = audioContext.createBiquadFilter();
                    airFilter.type = 'highpass';
                    airFilter.frequency.value = 3000;
                    
                    // Szum powietrza jest delikatny
                    airOsc.type = 'triangle';
                    airOsc.frequency.value = randomBetween(2000, 3000);
                    
                    airGain.gain.setValueAtTime(0, airTime);
                    airGain.gain.linearRampToValueAtTime(0.05 * intensity, airTime + 0.01);
                    airGain.gain.exponentialRampToValueAtTime(0.001, airTime + 0.04);
                    
                    // Połączenia
                    airOsc.connect(airGain);
                    airGain.connect(airFilter);
                    airFilter.connect(upPanner); // Używamy tego samego pannera dla spójności
                    
                    airOsc.start(airTime);
                    airOsc.stop(airTime + 0.05);
                }
            }
        };
        
        // =========== SEKWENCJA ZAKWAKANIA GRACZA NA ŚMIERĆ ===========
        let currentTime = audioContext.currentTime;
        let finalTime = currentTime;
        
        // 1. Złowrogie, pierwsze ostrzegawcze kwakanie lidera stada
        currentTime = createQuack(currentTime, 0.7, 0.5, 0.8, 3);  // Niski, długi, głośny kwak
        currentTime += 0.4; // Dłuższa pauza dla dramatycznego efektu
        if (!this.active) return;
        
        // 2. Seria kwakań z lewej strony - komunikacja w stadzie
        const leftPanner = audioContext.createStereoPanner();
        leftPanner.pan.value = -0.8; // Bardziej wyrazisty efekt lewo-prawo
        leftPanner.connect(gameOverMasterGain);
        
        currentTime = createDuckDialog(currentTime, 'high', 4, 3); // Więcej kwakań, intensywniejsze
        currentTime += 0.2;
        if (!this.active) return;
        
        // 3. Odpowiedź z prawej strony - stado otacza gracza
        const rightPanner = audioContext.createStereoPanner();
        rightPanner.pan.value = 0.8;
        rightPanner.connect(gameOverMasterGain);
        
        currentTime = createDuckDialog(currentTime, 'low', 3, 3);
        currentTime += 0.3;
        if (!this.active) return;
        
        // 4. Atak kaczek ze wszystkich stron - narastający
        for (let i = 0; i < 6; i++) { // Więcej kaczek
            if (!this.active) return;
            
            const pan = randomBetween(-0.8, 0.8);
            const pitch = 0.8 + (i * 0.1);
            const volume = 0.5 + (i * 0.08); // Wyższa głośność narastająca
            
            // Przyspieszające tempo ataku - kaczki kwaczą coraz szybciej
            currentTime = createQuack(
                currentTime + (0.15 / (i + 1)), // Malejące odstępy
                pitch,
                0.2,
                volume,
                2 + (i * 0.3) // Narastające mockLevel
            );
        }
        
        // Krótka pauza przed kulminacją ataku
        currentTime += 0.1;
        if (!this.active) return;
        
        // 5. Finałowy chaos kaczego stada - prawdziwy atak
        // Symulacja wielu kaczek kwaczących jednocześnie z różnych pozycji
        
        // Przygotowanie bardziej chaotycznego finału
        const numFinalDucks = 8; // Więcej kaczek w finale
        const maxOverlap = 0.05; // Więcej nakładających się dźwięków
        
        // Głośniejszy efekt kompresji dla finału
        const finalCompressor = audioContext.createDynamicsCompressor();
        finalCompressor.threshold.value = -15;
        finalCompressor.knee.value = 5;
        finalCompressor.ratio.value = 5;
        finalCompressor.attack.value = 0.001;
        finalCompressor.release.value = 0.1;
        finalCompressor.connect(gameOverMasterGain);
        
        for (let i = 0; i < numFinalDucks; i++) {
            if (!this.active) return;
            
            // Zróżnicowane czasy dla realizmu
            const duckTime = currentTime + (i * maxOverlap);
            
            // Większa wariacja parametrów dla naturalnego chaosu
            const duckPitch = randomBetween(0.6, 1.6);
            const duckVolume = randomBetween(0.5, 0.9); // Głośniejszy finał
            const duckDuration = randomBetween(0.2, 0.4); // Dłuższe kwaki
            
            const end = createQuack(duckTime, duckPitch, duckDuration, duckVolume, 4);
            finalTime = Math.max(finalTime, end);
        }
        
        // 6. Ostatnie triumfalne kwakanie - zwycięstwo stada
        if (this.active) {
            const finalQuack = createQuack(
                finalTime + 0.2, // Dłuższa pauza przed ostatecznym kwakaniem
                0.6,            // Bardzo niski ton - dominujący kwak
                0.6,            // Najdłuższe kwakanie
                1.0,            // Maksymalna głośność
                5               // Najwyższy poziom intensywności
            );
            finalTime = finalQuack + 0.2;
        }
        
        // Dodaj intensywny trzepot skrzydeł w tle przez całą sekwencję
        if (this.active) {
            createWingFlaps(audioContext.currentTime + 0.2, finalTime, 2.5);
        }
        
        // Końcowe echo i reverb
        const convolver = audioContext.createConvolver();
        const reverbGain = audioContext.createGain();
        reverbGain.gain.value = 0.2;
        
        // Symulacja pogłosu dla atmosferycznego zakończenia
        if (this.active) {
            const finalDelay = audioContext.createDelay();
            finalDelay.delayTime.value = 0.3;
            
            const feedback = audioContext.createGain();
            feedback.gain.value = 0.2;
            
            finalDelay.connect(feedback);
            feedback.connect(finalDelay);
            finalDelay.connect(gameOverMasterGain);
        }
        
        return finalTime;
    },
    
    // Frog mode - FUN CARTOON FROG TRANSFORMATION
    frogMode: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Create fun cartoon "boing" hopping sound
        const boingOsc = audioContext.createOscillator();
        const boingGain = audioContext.createGain();
        
        boingOsc.connect(boingGain);
        
        // Configure for springy boing
        boingOsc.type = 'sine';
        boingOsc.frequency.setValueAtTime(500, audioContext.currentTime);
        boingOsc.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
        boingOsc.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3);
        boingOsc.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.5);
        
        // Envelope for springy boing
        boingGain.gain.setValueAtTime(0, audioContext.currentTime);
        boingGain.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.03);
        boingGain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.15);
        boingGain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.3);
        boingGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        
        // Add cartoon effects
        addCrazyEffects(boingGain, 0.7);
        
        // Create cartoon ribbit sounds
        const ribbitOsc = audioContext.createOscillator();
        const ribbitGain = audioContext.createGain();
        const ribbitFilter = audioContext.createBiquadFilter();
        
        ribbitOsc.connect(ribbitGain);
        ribbitGain.connect(ribbitFilter);
        
        // Configure for cartoon ribbit
        ribbitOsc.type = 'sawtooth';
        ribbitOsc.frequency.setValueAtTime(120, audioContext.currentTime + 0.1);
        ribbitOsc.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.2);
        
        // Add second ribbit
        ribbitOsc.frequency.setValueAtTime(150, audioContext.currentTime + 0.4);
        ribbitOsc.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.5);
        
        // Ribbit filter
        ribbitFilter.type = 'lowpass';
        ribbitFilter.frequency.value = 600;
        
        // Ribbit envelope
        ribbitGain.gain.setValueAtTime(0, audioContext.currentTime + 0.1);
        ribbitGain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.12);
        ribbitGain.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.25);
        
        // Second ribbit
        ribbitGain.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.42);
        ribbitGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.6);
        
        // Add ribbit effects
        addCrazyEffects(ribbitFilter, 0.5);
        
        // Start all sounds
        boingOsc.start();
        ribbitOsc.start();
        
        // Stop everything
        const maxTime = 0.7;
        boingOsc.stop(audioContext.currentTime + maxTime);
        ribbitOsc.stop(audioContext.currentTime + maxTime);
    },
    
    // Ghost mode - CARTOON SPOOKY (BUT FUN) GHOST SOUND
    ghostMode: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Create cartoon ghost "woooOOOoooo" sound
        const ghostOsc = audioContext.createOscillator();
        const ghostGain = audioContext.createGain();
        const ghostFilter = audioContext.createBiquadFilter();
        
        ghostOsc.connect(ghostGain);
        ghostGain.connect(ghostFilter);
        
        // Configure for cartoon ghost
        ghostOsc.type = 'sine';
        
        // Create ghost "woo" pattern
        ghostOsc.frequency.setValueAtTime(400, audioContext.currentTime);
        ghostOsc.frequency.linearRampToValueAtTime(600, audioContext.currentTime + 0.2);
        ghostOsc.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 0.4);
        
        // Ghost filter settings
        ghostFilter.type = 'bandpass';
        ghostFilter.frequency.value = 500;
        ghostFilter.Q.value = 3;
        
        // Ghost envelope with tremolo effect
        ghostGain.gain.setValueAtTime(0, audioContext.currentTime);
        ghostGain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
        
        // Create tremolo for spooky wobble
        for (let i = 0; i < 8; i++) {
            const tremoloTime = audioContext.currentTime + 0.05 + (i * 0.05);
            ghostGain.gain.linearRampToValueAtTime(
                i % 2 === 0 ? 0.3 : 0.1, 
                tremoloTime
            );
        }
        
        ghostGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        
        // Add ghost effects
        addCrazyEffects(ghostFilter, 0.6);
        
        // Add cartoon ghost chatter/giggle
        const giggleOsc = audioContext.createOscillator();
        const giggleGain = audioContext.createGain();
        
        giggleOsc.connect(giggleGain);
        
        giggleOsc.type = 'triangle';
        
        // Create giggle pattern
        const giggleTimes = [0.1, 0.15, 0.2, 0.25, 0.3];
        giggleTimes.forEach((time, i) => {
            giggleOsc.frequency.setValueAtTime(
                randomBetween(500, 700), 
                audioContext.currentTime + time
            );
        });
        
        // Giggle envelope
        giggleGain.gain.setValueAtTime(0, audioContext.currentTime + 0.1);
        giggleTimes.forEach((time, i) => {
            giggleGain.gain.setValueAtTime(0, audioContext.currentTime + time);
            giggleGain.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + time + 0.01);
            giggleGain.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + time + 0.04);
        });
        giggleGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);
        
        // Add giggle effects
        addCrazyEffects(giggleGain, 0.4);
        
        // Start all sounds
        ghostOsc.start();
        giggleOsc.start();
        
        // Stop everything
        const maxTime = 0.6;
        ghostOsc.stop(audioContext.currentTime + maxTime);
        giggleOsc.stop(audioContext.currentTime + maxTime);
    },
    
    // Stork mode - CARTOON BIRD CRAZY CALL
    storkMode: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Create cartoon bird sound
        const birdOsc = audioContext.createOscillator();
        const birdGain = audioContext.createGain();
        
        birdOsc.connect(birdGain);
        
        // Configure for cartoon bird call
        birdOsc.type = 'triangle';
        
        // Create funny bird call pattern
        for (let i = 0; i < 3; i++) {
            const callTime = audioContext.currentTime + (i * 0.15);
            birdOsc.frequency.setValueAtTime(600, callTime);
            birdOsc.frequency.exponentialRampToValueAtTime(1200, callTime + 0.05);
            birdOsc.frequency.exponentialRampToValueAtTime(600, callTime + 0.1);
        }
        
        // Bird call envelope
        birdGain.gain.setValueAtTime(0, audioContext.currentTime);
        
        // Create pattern of bird calls
        for (let i = 0; i < 3; i++) {
            const callTime = audioContext.currentTime + (i * 0.15);
            birdGain.gain.setValueAtTime(0, callTime);
            birdGain.gain.linearRampToValueAtTime(0.25, callTime + 0.02);
            birdGain.gain.exponentialRampToValueAtTime(0.05, callTime + 0.1);
        }
        
        birdGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        
        // Add bird effects
        addCrazyEffects(birdGain, 0.6);
        
        // Add bill clacking sound
        const clackOsc = audioContext.createOscillator();
        const clackGain = audioContext.createGain();
        
        clackOsc.connect(clackGain);
        
        clackOsc.type = 'square';
        
        // Create bill clack pattern
        for (let i = 0; i < 4; i++) {
            const clackTime = audioContext.currentTime + 0.05 + (i * 0.1);
            clackOsc.frequency.setValueAtTime(1200, clackTime);
            clackOsc.frequency.setValueAtTime(800, clackTime + 0.02);
        }
        
        // Clack envelope
        clackGain.gain.setValueAtTime(0, audioContext.currentTime);
        
        for (let i = 0; i < 4; i++) {
            const clackTime = audioContext.currentTime + 0.05 + (i * 0.1);
            clackGain.gain.setValueAtTime(0, clackTime);
            clackGain.gain.linearRampToValueAtTime(0.15, clackTime + 0.01);
            clackGain.gain.exponentialRampToValueAtTime(0.01, clackTime + 0.03);
        }
        
        clackGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        
        // Add clack effects
        addCrazyEffects(clackGain, 0.3);
        
        // Start all sounds
        birdOsc.start();
        clackOsc.start();
        
        // Stop everything
        const maxTime = 0.6;
        birdOsc.stop(audioContext.currentTime + maxTime);
        clackOsc.stop(audioContext.currentTime + maxTime);
    },
    
    // Stork defeat - FUNNY CARTOON FALL AND BONK
    storkDefeat: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Create cartoon slide whistle falling
        const fallOsc = audioContext.createOscillator();
        const fallGain = audioContext.createGain();
        
        fallOsc.connect(fallGain);
        
        // Configure for cartoon slide fall
        fallOsc.type = 'sine';
        fallOsc.frequency.setValueAtTime(800, audioContext.currentTime);
        fallOsc.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.4);
        
        // Add comedy wobble
        for (let i = 1; i <= 3; i++) {
            const wobbleTime = audioContext.currentTime + (i * 0.1);
            fallOsc.frequency.setValueAtTime(
                700 - (i * 100) + randomBetween(-50, 50), 
                wobbleTime
            );
        }
        
        // Fall envelope
        fallGain.gain.setValueAtTime(0, audioContext.currentTime);
        fallGain.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.05);
        fallGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        
        // Add fall effects
        addCrazyEffects(fallGain, 0.5);
        
        // Add cartoon impact "BONK"
        const bonkOsc = audioContext.createOscillator();
        const bonkGain = audioContext.createGain();
        
        bonkOsc.connect(bonkGain);
        
        bonkOsc.type = 'triangle';
        bonkOsc.frequency.setValueAtTime(150, audioContext.currentTime + 0.4);
        bonkOsc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
        
        // Bonk envelope for punch
        bonkGain.gain.setValueAtTime(0, audioContext.currentTime + 0.4);
        bonkGain.gain.linearRampToValueAtTime(0.6, audioContext.currentTime + 0.41);
        bonkGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.6);
        
        // Add bonk effects
        addCrazyEffects(bonkGain, 0.6);
        
        // Add cartoon stars sound
        const numStars = 3;
        const stars = [];
        
        for (let i = 0; i < numStars; i++) {
            const starOsc = audioContext.createOscillator();
            const starGain = audioContext.createGain();
            
            starOsc.connect(starGain);
            
            starOsc.type = 'sine';
            
            // Stars twinkle pattern
            const baseTime = audioContext.currentTime + 0.5 + (i * 0.08);
            starOsc.frequency.setValueAtTime(
                randomBetween(1000, 1800), 
                baseTime
            );
            
            starGain.gain.setValueAtTime(0, baseTime);
            starGain.gain.linearRampToValueAtTime(0.15, baseTime + 0.01);
            starGain.gain.exponentialRampToValueAtTime(0.001, baseTime + 0.1);
            
            // Add star effects
            addCrazyEffects(starGain, 0.3);
            
            stars.push({ osc: starOsc, gain: starGain });
        }
        
        // Add funny cartoon springy sound for extra comedy
        const springOsc = audioContext.createOscillator();
        const springGain = audioContext.createGain();
        
        springOsc.connect(springGain);
        
        springOsc.type = 'sine';
        springOsc.frequency.setValueAtTime(200, audioContext.currentTime + 0.45);
        springOsc.frequency.setValueAtTime(400, audioContext.currentTime + 0.5);
        springOsc.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.6);
        
        springGain.gain.setValueAtTime(0, audioContext.currentTime + 0.45);
        springGain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.46);
        springGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.65);
        
        // Add spring effects
        addCrazyEffects(springGain, 0.4);
        
        // Start all sounds
        fallOsc.start();
        bonkOsc.start();
        springOsc.start();
        stars.forEach(star => star.osc.start());
        
        // Stop everything
        const maxTime = 0.8;
        fallOsc.stop(audioContext.currentTime + maxTime);
        bonkOsc.stop(audioContext.currentTime + maxTime);
        springOsc.stop(audioContext.currentTime + maxTime);
        stars.forEach(star => star.osc.stop(audioContext.currentTime + maxTime));
    },
    
    // Frog coin - BUBBLY FROG CARTOON SOUND
    frogCoin: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Prevent sound spam
        const now = Date.now();
        if (lastPlayedTime.frogCoin && now - lastPlayedTime.frogCoin < 100) return;
        lastPlayedTime.frogCoin = now;
        
        // Create frog boing sound
        const boingOsc = audioContext.createOscillator();
        const boingGain = audioContext.createGain();
        
        boingOsc.connect(boingGain);
        
        // Configure for frog boing
        boingOsc.type = 'triangle';
        boingOsc.frequency.setValueAtTime(400, audioContext.currentTime);
        boingOsc.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
        boingOsc.frequency.linearRampToValueAtTime(300, audioContext.currentTime + 0.2);
        
        // Boing envelope
        boingGain.gain.setValueAtTime(0, audioContext.currentTime);
        boingGain.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.02);
        boingGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        
        // Add boing effects
        addCrazyEffects(boingGain, 0.5);
        
        // Create bubbling sounds
        const numBubbles = 4;
        const bubbles = [];
        
        for (let i = 0; i < numBubbles; i++) {
            const bubbleOsc = audioContext.createOscillator();
            const bubbleGain = audioContext.createGain();
            
            bubbleOsc.connect(bubbleGain);
            
            bubbleOsc.type = 'sine';
            
            // Bubble pop pattern
            const bubbleTime = audioContext.currentTime + randomBetween(0.05, 0.25);
            bubbleOsc.frequency.setValueAtTime(
                randomBetween(800, 1500), 
                bubbleTime
            );
            bubbleOsc.frequency.exponentialRampToValueAtTime(
                randomBetween(1200, 2000), 
                bubbleTime + 0.05
            );
            
            bubbleGain.gain.setValueAtTime(0, bubbleTime);
            bubbleGain.gain.linearRampToValueAtTime(0.1, bubbleTime + 0.01);
            bubbleGain.gain.exponentialRampToValueAtTime(0.001, bubbleTime + 0.08);
            
            // Add bubble effects
            addCrazyEffects(bubbleGain, 0.3);
            
            bubbles.push({ osc: bubbleOsc, gain: bubbleGain });
        }
        
        // Add small ribbit sound
        const ribbitOsc = audioContext.createOscillator();
        const ribbitGain = audioContext.createGain();
        
        ribbitOsc.connect(ribbitGain);
        
        ribbitOsc.type = 'sawtooth';
        ribbitOsc.frequency.setValueAtTime(180, audioContext.currentTime + 0.1);
        ribbitOsc.frequency.exponentialRampToValueAtTime(120, audioContext.currentTime + 0.2);
        
        ribbitGain.gain.setValueAtTime(0, audioContext.currentTime + 0.1);
        ribbitGain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.11);
        ribbitGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.25);
        
        // Add ribbit effects
        addCrazyEffects(ribbitGain, 0.4);
        
        // Start all sounds
        boingOsc.start();
        ribbitOsc.start();
        bubbles.forEach(bubble => bubble.osc.start());
        
        // Stop everything
        const maxTime = 0.5;
        boingOsc.stop(audioContext.currentTime + maxTime);
        ribbitOsc.stop(audioContext.currentTime + maxTime);
        bubbles.forEach(bubble => bubble.osc.stop(audioContext.currentTime + maxTime));
    }
};

// Noise generator for fun cartoon sounds
function createNoiseNode(duration) {
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Generate white noise for cartoon effects
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    
    // Create audio source
    const noiseNode = audioContext.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;
    noiseNode.start();
    
    return noiseNode;
}

// Lista aktywnych oscylatorów dla całego systemu dźwiękowego
let activeOscillators = [];

// Funkcja zatrzymująca wszystkie aktywne oscylatory
function stopAllSounds() {
    if (activeOscillators && activeOscillators.length > 0) {
        activeOscillators.forEach(osc => {
            try {
                if (osc && osc.stop) osc.stop();
            } catch (e) {
                // Ignoruj błędy przy zatrzymywaniu
            }
        });
        // Wyczyść listę oscylatorów
        activeOscillators = [];
    }
    
    // Ustaw wszystkie flagi active na false dla wszystkich generatorów dźwięku
    if (soundGenerators && soundGenerators.gameOver) {
        soundGenerators.gameOver.active = false;
    }
}

// Funkcja do dodania oscylatorów do globalnej listy
function trackOscillator(oscillator) {
    if (oscillator) {
        activeOscillators.push(oscillator);
    }
}

// Main function to play a sound
function playSound(soundName) {
    // Gdy gramy dźwięk końca gry, nie przerywamy istniejących dźwięków
    if (soundName !== 'gameOver') {
        // Dla innych dźwięków, zatrzymaj istniejący dźwięk końca gry
        if (soundGenerators.gameOver && soundGenerators.gameOver.active) {
            soundGenerators.gameOver.stop();
        }
    } else if (soundName === 'gameOver') {
        // Dla dźwięku końca gry, zatrzymaj wszystkie inne dźwięki
        stopAllSounds();
    }
    
    // Check if the sound exists in our generator collection
    if (soundGenerators[soundName]) {
        try {
            // Resume audio context if it was suspended (browser policy)
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            // Odtwórz dźwięk
            soundGenerators[soundName]();
            
        } catch (err) {
            console.error("Error playing sound:", soundName, err);
            
            // Try to recover by resetting audio context
            try {
                if (audioContext) {
                    audioContext.close();
                    audioContext = null;
                }
                initAudioSystem();
            } catch (e) {
                console.error("Failed to reset audio system", e);
            }
        }
    } else {
        console.error(`Sound "${soundName}" not found in our sound generators!`);
    }
}

// Initialize the audio system when the script loads
window.addEventListener('DOMContentLoaded', initAudioSystem);

// Add user interaction handler to resume audio context (needed for some browsers)
window.addEventListener('click', function() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}, { once: true });

console.log("🦆 KREJZI CprzeARTOON AUDIO SYSTEM LOADED! 🦆");