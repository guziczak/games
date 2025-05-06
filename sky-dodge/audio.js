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
    
    // Game over - DUCK SOUNDS
    gameOver: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Set activity flag and create method to stop the sound
        this.active = true;
        
        // Method to stop the game over sound
        this.stop = function() {
            this.active = false;
            stopAllSounds();
        };
        
        // Clear all existing sounds
        stopAllSounds();
        
        // Main volume control for game over effect
        const gameOverMasterGain = audioContext.createGain();
        gameOverMasterGain.gain.value = 0.8; // Lower overall volume
        gameOverMasterGain.connect(masterGainNode);
        
        // Simple function to create a duck quack
        const createQuack = (startTime, pitch = 1.0, duration = 0.2, volume = 0.7) => {
            // Check if sound can be played
            if (!this.active) return startTime;
            
            // Main quack oscillator
            const quackOsc = audioContext.createOscillator();
            const quackGain = audioContext.createGain();
            trackOscillator(quackOsc);
            
            // Filter for duck sound
            const quackFilter = audioContext.createBiquadFilter();
            quackFilter.type = 'bandpass';
            quackFilter.frequency.value = 600 * pitch;
            quackFilter.Q.value = 2.0;
            
            // Configure for duck sound
            quackOsc.type = 'sawtooth';
            
            // Base frequency - ducks typically quack in 200-400 Hz range
            const baseFreq = 280 * pitch;
            
            // Quack frequency envelope - characteristic duck sound
            quackOsc.frequency.setValueAtTime(baseFreq * 1.2, startTime);
            quackOsc.frequency.linearRampToValueAtTime(baseFreq * 0.8, startTime + duration * 0.5);
            quackOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, startTime + duration);
            
            // Amplitude envelope
            quackGain.gain.setValueAtTime(0, startTime);
            quackGain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
            quackGain.gain.linearRampToValueAtTime(volume * 0.7, startTime + duration * 0.3);
            quackGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            
            // Add slight vibrato for realism
            const vibratoOsc = audioContext.createOscillator();
            const vibratoGain = audioContext.createGain();
            trackOscillator(vibratoOsc);
            
            vibratoOsc.frequency.value = 15;
            vibratoGain.gain.value = baseFreq * 0.06;
            
            vibratoOsc.connect(vibratoGain);
            vibratoGain.connect(quackOsc.frequency);
            
            // Sound routing
            quackOsc.connect(quackGain);
            quackGain.connect(quackFilter);
            
            // Create stereo effect
            const panner = audioContext.createStereoPanner();
            panner.pan.value = randomBetween(-0.8, 0.8);
            
            quackFilter.connect(panner);
            panner.connect(gameOverMasterGain);
            
            // Start and stop
            quackOsc.start(startTime);
            vibratoOsc.start(startTime);
            
            const stopTime = startTime + duration + 0.05;
            quackOsc.stop(stopTime);
            vibratoOsc.stop(stopTime);
            
            return stopTime;
        };
        
        // Function to create a sequence of duck quacks
        const createDuckSequence = (startTime, numQuacks, pitchRange, volumeRange, pauseRange) => {
            if (!this.active) return startTime;
            
            let currentTime = startTime;
            
            for (let i = 0; i < numQuacks; i++) {
                if (!this.active) return currentTime;
                
                // Random values for natural variation
                const pitch = randomBetween(pitchRange[0], pitchRange[1]);
                const volume = randomBetween(volumeRange[0], volumeRange[1]);
                const duration = randomBetween(0.15, 0.3);
                
                currentTime = createQuack(currentTime, pitch, duration, volume);
                
                // Add pause between quacks
                if (i < numQuacks - 1) {
                    currentTime += randomBetween(pauseRange[0], pauseRange[1]);
                }
            }
            
            return currentTime;
        };
        
        // Create wing flapping sound
        const createWingFlaps = (startTime, duration, intensity = 1) => {
            if (!this.active) return;
            
            const numFlaps = Math.floor(duration / 0.2) * intensity;
            
            // Create volume control node
            const flapsGain = audioContext.createGain();
            flapsGain.gain.value = 0.3 * intensity;
            flapsGain.connect(gameOverMasterGain);
            
            for (let i = 0; i < numFlaps; i++) {
                if (!this.active) return;
                
                const flapTime = startTime + (i * 0.2);
                
                // Flap sound
                const flapOsc = audioContext.createOscillator();
                const flapGain = audioContext.createGain();
                trackOscillator(flapOsc);
                
                const flapFilter = audioContext.createBiquadFilter();
                flapFilter.type = 'lowpass';
                flapFilter.frequency.value = 1000;
                
                flapOsc.type = 'triangle';
                flapOsc.frequency.setValueAtTime(500, flapTime);
                flapOsc.frequency.exponentialRampToValueAtTime(300, flapTime + 0.1);
                
                flapGain.gain.setValueAtTime(0, flapTime);
                flapGain.gain.linearRampToValueAtTime(0.2, flapTime + 0.01);
                flapGain.gain.exponentialRampToValueAtTime(0.001, flapTime + 0.1);
                
                // Create stereo effect
                const panner = audioContext.createStereoPanner();
                panner.pan.value = randomBetween(-0.6, 0.6);
                
                flapOsc.connect(flapGain);
                flapGain.connect(flapFilter);
                flapFilter.connect(panner);
                panner.connect(flapsGain);
                
                flapOsc.start(flapTime);
                flapOsc.stop(flapTime + 0.15);
            }
        };
        
        // Create game over duck sequence - more dense laughing quacks
        let currentTime = audioContext.currentTime;
        
        // 1. First warning quack
        currentTime = createQuack(currentTime, 0.8, 0.4, 0.6);
        currentTime += 0.2; // Shorter pause
        if (!this.active) return;
        
        // 2. Left side duck sequence - more quacks, shorter pauses
        currentTime = createDuckSequence(
            currentTime,
            5, // more quacks
            [1.0, 1.4], // pitch range
            [0.4, 0.7], // volume range
            [0.05, 0.12] // much shorter pauses
        );
        currentTime += 0.1; // Shorter pause
        if (!this.active) return;
        
        // 3. Overlapping right side duck sequence
        // Start slightly before the previous sequence ends for overlapping effect
        const rightSideTime = currentTime - 0.1;
        setTimeout(() => {
            if (this.active) {
                createDuckSequence(
                    rightSideTime,
                    4, // more quacks
                    [0.7, 1.1], // pitch range
                    [0.5, 0.7], // volume range
                    [0.06, 0.15] // shorter pauses
                );
            }
        }, 10);
        
        // 4. More overlapping duck laughs from center
        setTimeout(() => {
            if (this.active) {
                createDuckSequence(
                    currentTime + 0.15,
                    6, // more quacks
                    [0.9, 1.2], // pitch range
                    [0.4, 0.6], // volume range
                    [0.04, 0.1] // very short pauses for rapid laughing effect
                );
            }
        }, 20);
        
        currentTime += 0.3;
        if (!this.active) return;
        
        // 5. Add wing flapping in the background
        createWingFlaps(audioContext.currentTime + 0.3, 2.5, 2.0);
        
        // 6. High-pitched laughing ducks
        setTimeout(() => {
            if (this.active) {
                createDuckSequence(
                    currentTime + 0.1,
                    7, // many quacks
                    [1.2, 1.6], // higher pitched for laughing effect
                    [0.3, 0.5], // moderate volume
                    [0.03, 0.08] // very short pauses for rapid laughing
                );
            }
        }, 30);
        
        // 7. Low-pitched laughing ducks (overlapping with high-pitched)
        setTimeout(() => {
            if (this.active) {
                createDuckSequence(
                    currentTime + 0.25,
                    5, // several quacks
                    [0.6, 0.8], // lower pitched
                    [0.4, 0.65], // moderate volume
                    [0.05, 0.1] // short pauses
                );
            }
        }, 40);
        
        currentTime += 0.5;
        
        // 8. Chaotic duck laughter finale
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                if (this.active) {
                    // Create overlapping duck sequences with random parameters
                    const startOffset = randomBetween(0, 0.2);
                    createDuckSequence(
                        currentTime + startOffset,
                        randomBetween(3, 6), // random number of quacks
                        [randomBetween(0.7, 1.4), randomBetween(0.9, 1.6)], // random pitch range
                        [0.3, 0.7], // volume range
                        [0.02, 0.07] // very short pauses
                    );
                }
            }, i * 50); // Stagger the start times
        }
        
        currentTime += 0.6;
        
        // 9. Final big quack
        if (this.active) {
            const finalQuack = createQuack(
                currentTime + 0.3,
                0.7, // lower pitch
                0.5, // longer duration
                1.0  // maximum volume
            );
        }
        
        // Add simple reverb effect
        const delay = audioContext.createDelay();
        delay.delayTime.value = 0.2;
        
        const feedback = audioContext.createGain();
        feedback.gain.value = 0.15;
        
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(gameOverMasterGain);
        
        return currentTime + 1.0;
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