// Procedural audio for Sky Dodge.
// Short, recognisable motifs are mixed through a small voice manager so that
// frantic gameplay stays readable instead of becoming progressively louder.
(function skyDodgeAudio(global) {
    'use strict';

    const DEFAULT_MASTER_VOLUME = 0.48;
    const MAX_ACTIVE_VOICES = 7;
    const SILENCE = 0.0001;

    let audioContext = null;
    let masterGainNode = null;
    let audioMuted = false;
    let noiseBuffer = null;
    let warnedAboutAudio = false;
    let nextVoiceId = 1;
    let activeVoices = [];
    let lastPlayedTime = Object.create(null);

    const policies = Object.freeze({
        jump:         { duration: 0.42, cooldown: 80,  priority: 2, group: 'movement', maxGroup: 2 },
        coin:         { duration: 0.18, cooldown: 45,  priority: 1, group: 'pickup',   maxGroup: 3 },
        purpleCoin:   { duration: 0.38, cooldown: 110, priority: 3, group: 'pickup',   maxGroup: 3 },
        frogCoin:     { duration: 0.28, cooldown: 90,  priority: 2, group: 'pickup',   maxGroup: 3 },
        frogMode:     { duration: 0.55, cooldown: 260, priority: 6, group: 'mode',     maxGroup: 1, replace: true },
        frogCharge:   { duration: 0.23, cooldown: 120, priority: 2, group: 'frog-action', maxGroup: 2 },
        frogLaunch:   { duration: 0.25, cooldown: 75,  priority: 4, group: 'frog-action', maxGroup: 2, replace: true },
        rubberMode:   { duration: 0.48, cooldown: 260, priority: 6, group: 'mode',     maxGroup: 1, replace: true },
        rubberSnap:   { duration: 0.23, cooldown: 90,  priority: 4, group: 'material-impact', maxGroup: 2 },
        steelMode:    { duration: 0.44, cooldown: 260, priority: 7, group: 'mode',     maxGroup: 1, replace: true },
        steelImpact:  { duration: 0.30, cooldown: 105, priority: 5, group: 'material-impact', maxGroup: 2 },
        ghostMode:    { duration: 0.58, cooldown: 260, priority: 6, group: 'mode',     maxGroup: 1, replace: true },
        storkMode:    { duration: 0.54, cooldown: 260, priority: 6, group: 'mode',     maxGroup: 1, replace: true },
        storkAlert:   { duration: 0.31, cooldown: 360, priority: 4, group: 'stork',    maxGroup: 2 },
        storkGrab:    { duration: 0.24, cooldown: 110, priority: 5, group: 'stork',    maxGroup: 2 },
        storkDrag:    { duration: 0.12, cooldown: 105, priority: 1, group: 'stork',    maxGroup: 1 },
        storkDrop:    { duration: 0.38, cooldown: 150, priority: 5, group: 'stork',    maxGroup: 2, replace: true },
        storkDenied:  { duration: 0.25, cooldown: 180, priority: 4, group: 'stork',    maxGroup: 2 },
        storkGrabExhausted: { duration: 0.32, cooldown: 480, priority: 4, group: 'stork', maxGroup: 2 },
        storkGrabReady: { duration: 0.19, cooldown: 650, priority: 2, group: 'stork',   maxGroup: 2 },
        storkDefeat:  { duration: 0.56, cooldown: 180, priority: 6, group: 'impact',   maxGroup: 1, replace: true },
        gameOver:     { duration: 0.96, cooldown: 0,   priority: 100, group: 'terminal', maxGroup: 1, replace: true }
    });

    // Friendly aliases keep older callers working and make mode names forgiving.
    const aliases = Object.freeze({
        frog: 'frogMode',
        rubber: 'rubberMode',
        steel: 'steelMode',
        ghost: 'ghostMode',
        stork: 'storkMode',
        bounce: 'rubberMode',
        storkGrabDenied: 'storkDenied',
        storkExhausted: 'storkGrabExhausted',
        storkReady: 'storkGrabReady'
    });

    function nowMs() {
        return Date.now();
    }

    function timerApi() {
        return global.setTimeout ? global : globalThis;
    }

    function safeDisconnect(node) {
        try {
            if (node && typeof node.disconnect === 'function') node.disconnect();
        } catch (_) {
            // A node may already have been disconnected during a lifecycle reset.
        }
    }

    function initAudioSystem() {
        if (audioContext && audioContext.state !== 'closed' && masterGainNode) return true;

        const AudioContextClass = global.AudioContext || global.webkitAudioContext;
        if (!AudioContextClass) {
            if (!warnedAboutAudio) {
                console.warn('Sky Dodge: Web Audio API is unavailable.');
                warnedAboutAudio = true;
            }
            return false;
        }

        try {
            audioContext = new AudioContextClass();
            masterGainNode = audioContext.createGain();
            masterGainNode.gain.value = audioMuted ? 0 : DEFAULT_MASTER_VOLUME;

            if (typeof audioContext.createDynamicsCompressor === 'function') {
                const compressor = audioContext.createDynamicsCompressor();
                compressor.threshold.value = -18;
                compressor.knee.value = 12;
                compressor.ratio.value = 4;
                compressor.attack.value = 0.004;
                compressor.release.value = 0.16;
                masterGainNode.connect(compressor);
                compressor.connect(audioContext.destination);
            } else {
                masterGainNode.connect(audioContext.destination);
            }

            noiseBuffer = null;
            return true;
        } catch (error) {
            console.error('Sky Dodge: audio initialisation failed.', error);
            audioContext = null;
            masterGainNode = null;
            return false;
        }
    }

    function resumeAudio() {
        if (!audioContext || audioContext.state !== 'suspended' || typeof audioContext.resume !== 'function') return;
        const result = audioContext.resume();
        if (result && typeof result.catch === 'function') result.catch(() => {});
    }

    function removeVoice(voice) {
        if (!voice) return;
        if (voice.cleanupTimer) timerApi().clearTimeout(voice.cleanupTimer);
        activeVoices = activeVoices.filter(candidate => candidate !== voice);
        safeDisconnect(voice.output);
        voice.sources.clear();
    }

    function stopVoice(voice, fadeSeconds = 0.012) {
        if (!voice || voice.stopped) return;
        voice.stopped = true;

        const now = audioContext ? audioContext.currentTime : 0;
        try {
            voice.output.gain.cancelScheduledValues(now);
            voice.output.gain.setValueAtTime(Math.max(SILENCE, voice.output.gain.value || 1), now);
            voice.output.gain.exponentialRampToValueAtTime(SILENCE, now + fadeSeconds);
        } catch (_) {
            voice.output.gain.value = 0;
        }

        voice.sources.forEach(source => {
            try {
                if (source && typeof source.stop === 'function') source.stop(now + fadeSeconds + 0.002);
            } catch (_) {
                // Scheduled nodes can already have ended naturally.
            }
        });

        activeVoices = activeVoices.filter(candidate => candidate !== voice);
        if (voice.cleanupTimer) timerApi().clearTimeout(voice.cleanupTimer);
        voice.cleanupTimer = timerApi().setTimeout(() => removeVoice(voice), Math.ceil((fadeSeconds + 0.025) * 1000));
    }

    function stopAllSounds() {
        activeVoices.slice().forEach(voice => stopVoice(voice, 0.008));
        activeVoices = [];
        lastPlayedTime = Object.create(null);
    }

    function pruneVoices() {
        if (!audioContext) return;
        activeVoices.slice().forEach(voice => {
            if (voice.endsAt + 0.08 < audioContext.currentTime) removeVoice(voice);
        });
    }

    function makeVoice(name, policy) {
        pruneVoices();

        // Any post-game sound means a new run has begun; remove the old finale.
        if (name !== 'gameOver' && activeVoices.some(voice => voice.name === 'gameOver')) {
            stopAllSounds();
        }
        if (name === 'gameOver') stopAllSounds();

        const sameGroup = activeVoices.filter(voice => voice.group === policy.group);
        if (sameGroup.length >= policy.maxGroup) {
            const oldest = sameGroup[0];
            if (policy.replace || policy.priority > oldest.priority) stopVoice(oldest);
            else return null;
        }

        if (activeVoices.length >= MAX_ACTIVE_VOICES) {
            const victim = activeVoices.reduce((lowest, voice) => {
                if (!lowest || voice.priority < lowest.priority) return voice;
                return lowest;
            }, null);
            if (!victim || victim.priority >= policy.priority) return null;
            stopVoice(victim);
        }

        const output = audioContext.createGain();
        output.gain.value = 1;
        output.connect(masterGainNode);

        const voice = {
            id: nextVoiceId++,
            name,
            group: policy.group,
            priority: policy.priority,
            output,
            sources: new Set(),
            stopped: false,
            endsAt: audioContext.currentTime + policy.duration,
            cleanupTimer: null
        };

        activeVoices.push(voice);
        voice.cleanupTimer = timerApi().setTimeout(() => removeVoice(voice), Math.ceil((policy.duration + 0.12) * 1000));
        return voice;
    }

    function connectSource(source, gainNode, voice, filterOptions) {
        if (filterOptions) {
            const filter = audioContext.createBiquadFilter();
            filter.type = filterOptions.type || 'lowpass';
            filter.frequency.value = filterOptions.frequency || 1200;
            filter.Q.value = filterOptions.q || 0.7;
            source.connect(filter);
            filter.connect(gainNode);
        } else {
            source.connect(gainNode);
        }
        gainNode.connect(voice.output);
    }

    function tone(voice, options) {
        const startOffset = options.start || 0;
        const duration = Math.max(0.025, options.duration || 0.12);
        const startAt = audioContext.currentTime + startOffset;
        const endAt = startAt + duration;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = options.type || 'sine';
        const pitches = options.pitches || [[0, options.frequency || 440]];
        pitches.forEach((point, index) => {
            const at = startAt + Math.min(duration, Math.max(0, point[0]));
            const frequency = Math.max(20, point[1]);
            if (index === 0) oscillator.frequency.setValueAtTime(frequency, at);
            else oscillator.frequency.exponentialRampToValueAtTime(frequency, at);
        });
        if (typeof options.detune === 'number') oscillator.detune.value = options.detune;

        const level = Math.max(SILENCE, options.gain || 0.15);
        const attack = Math.min(duration * 0.45, options.attack == null ? 0.008 : options.attack);
        gainNode.gain.setValueAtTime(SILENCE, startAt);
        gainNode.gain.linearRampToValueAtTime(level, startAt + attack);
        gainNode.gain.exponentialRampToValueAtTime(SILENCE, endAt);

        connectSource(oscillator, gainNode, voice, options.filter);
        oscillator.start(startAt);
        oscillator.stop(endAt + 0.015);
        voice.sources.add(oscillator);
    }

    function getNoiseBuffer() {
        if (noiseBuffer) return noiseBuffer;
        const length = Math.max(1, Math.floor(audioContext.sampleRate * 0.6));
        noiseBuffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
        return noiseBuffer;
    }

    function noise(voice, options) {
        const startOffset = options.start || 0;
        const duration = Math.max(0.018, options.duration || 0.08);
        const startAt = audioContext.currentTime + startOffset;
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        source.buffer = getNoiseBuffer();

        gainNode.gain.setValueAtTime(SILENCE, startAt);
        gainNode.gain.linearRampToValueAtTime(options.gain || 0.08, startAt + Math.min(0.006, duration * 0.3));
        gainNode.gain.exponentialRampToValueAtTime(SILENCE, startAt + duration);

        connectSource(source, gainNode, voice, options.filter || { type: 'bandpass', frequency: 1200, q: 1 });
        source.start(startAt, Math.random() * 0.25);
        source.stop(startAt + duration + 0.01);
        voice.sources.add(source);
    }

    const generators = {
        jump(voice) {
            // Preserve the original tap sound from before 5431449: its layered
            // sawtooth thrust, falling "boing", rising zip and short noise puff
            // are what made the jump read as a tiny cartoon quack.
            const now = audioContext.currentTime;
            const jumpBus = audioContext.createGain();
            jumpBus.gain.value = 0.82;
            jumpBus.connect(voice.output);
            const randomBetween = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);
            const coinFlip = () => Math.random() > 0.5;
            const connectCartoonEffect = (node, intensity) => {
                const filter = audioContext.createBiquadFilter();
                filter.type = ['lowpass', 'bandpass', 'highpass'][Math.floor(Math.random() * 3)];
                filter.frequency.value = randomBetween(600, 5000);
                filter.Q.value = randomBetween(1, 8);

                if (coinFlip() && intensity > 0.5) {
                    node.connect(filter);
                    if (coinFlip() && typeof audioContext.createDelay === 'function') {
                        const delay = audioContext.createDelay();
                        delay.delayTime.value = randomBetween(0.01, 0.15) * intensity;
                        filter.connect(delay);
                        delay.connect(jumpBus);
                    } else {
                        filter.connect(jumpBus);
                    }
                } else if (coinFlip()) {
                    node.connect(filter);
                    filter.connect(jumpBus);
                } else {
                    node.connect(jumpBus);
                }
            };

            const jetpackOsc = audioContext.createOscillator();
            const jetpackGain = audioContext.createGain();
            const jetpackFilter = audioContext.createBiquadFilter();
            jetpackOsc.type = 'sawtooth';
            jetpackOsc.frequency.setValueAtTime(randomBetween(120, 180), now);
            jetpackOsc.frequency.exponentialRampToValueAtTime(
                randomBetween(200, 300),
                now + randomBetween(0.1, 0.2)
            );
            jetpackFilter.type = 'bandpass';
            jetpackFilter.frequency.setValueAtTime(800, now);
            jetpackFilter.frequency.linearRampToValueAtTime(1200, now + 0.2);
            jetpackFilter.Q.value = 2;
            jetpackGain.gain.setValueAtTime(SILENCE, now);
            jetpackGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
            jetpackGain.gain.linearRampToValueAtTime(0.1, now + 0.15);
            jetpackGain.gain.linearRampToValueAtTime(0.2, now + 0.2);
            jetpackGain.gain.exponentialRampToValueAtTime(SILENCE, now + 0.3);
            jetpackOsc.connect(jetpackGain);
            jetpackGain.connect(jetpackFilter);
            jetpackFilter.connect(jumpBus);

            const boingOsc = audioContext.createOscillator();
            const boingGain = audioContext.createGain();
            boingOsc.type = 'sine';
            boingOsc.frequency.setValueAtTime(randomBetween(400, 500), now);
            boingOsc.frequency.exponentialRampToValueAtTime(randomBetween(250, 300), now + 0.15);
            boingGain.gain.setValueAtTime(SILENCE, now);
            boingGain.gain.linearRampToValueAtTime(0.4, now + 0.01);
            boingGain.gain.exponentialRampToValueAtTime(SILENCE, now + 0.2);
            boingOsc.connect(boingGain);
            connectCartoonEffect(boingGain, 0.6);

            const zipOsc = audioContext.createOscillator();
            const zipGain = audioContext.createGain();
            zipOsc.type = 'sine';
            zipOsc.frequency.setValueAtTime(300, now);
            zipOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            zipGain.gain.setValueAtTime(SILENCE, now);
            zipGain.gain.linearRampToValueAtTime(0.15, now + 0.02);
            zipGain.gain.exponentialRampToValueAtTime(SILENCE, now + 0.1);
            zipOsc.connect(zipGain);
            connectCartoonEffect(zipGain, 0.4);

            const noiseNode = audioContext.createBufferSource();
            const noiseGain = audioContext.createGain();
            const noiseFilter = audioContext.createBiquadFilter();
            noiseNode.buffer = getNoiseBuffer();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 800;
            noiseFilter.Q.value = 2;
            noiseGain.gain.setValueAtTime(SILENCE, now);
            noiseGain.gain.linearRampToValueAtTime(0.15, now + 0.02);
            noiseGain.gain.linearRampToValueAtTime(0.05, now + 0.1);
            noiseGain.gain.linearRampToValueAtTime(0.1, now + 0.15);
            noiseGain.gain.exponentialRampToValueAtTime(SILENCE, now + 0.25);
            noiseNode.connect(noiseGain);
            noiseGain.connect(noiseFilter);
            noiseFilter.connect(jumpBus);

            for (const oscillator of [jetpackOsc, boingOsc, zipOsc]) {
                oscillator.start(now);
                oscillator.stop(now + 0.4);
                voice.sources.add(oscillator);
            }
            noiseNode.start(now, Math.random() * 0.2);
            noiseNode.stop(now + 0.3);
            voice.sources.add(noiseNode);
        },

        coin(voice) {
            tone(voice, { gain: 0.13, duration: 0.10, frequency: 880 });
            tone(voice, { start: 0.065, gain: 0.11, duration: 0.11, frequency: 1320 });
        },

        purpleCoin(voice) {
            [659, 988, 1319].forEach((frequency, index) => {
                tone(voice, { start: index * 0.075, gain: 0.105, duration: 0.16, frequency });
            });
            tone(voice, { start: 0.22, type: 'triangle', gain: 0.07, duration: 0.15, frequency: 1976 });
        },

        frogCoin(voice) {
            tone(voice, { type: 'triangle', gain: 0.14, duration: 0.16, pitches: [[0, 240], [0.08, 170], [0.16, 300]] });
            tone(voice, { start: 0.095, gain: 0.09, duration: 0.15, frequency: 1047 });
        },

        frogMode(voice) {
            tone(voice, { type: 'sawtooth', gain: 0.12, duration: 0.18, pitches: [[0, 155], [0.18, 92]], filter: { type: 'lowpass', frequency: 620, q: 1.8 } });
            tone(voice, { start: 0.22, type: 'sawtooth', gain: 0.14, duration: 0.22, pitches: [[0, 185], [0.22, 105]], filter: { type: 'lowpass', frequency: 680, q: 2 } });
            tone(voice, { start: 0.34, type: 'triangle', gain: 0.08, duration: 0.18, pitches: [[0, 260], [0.18, 390]] });
        },

        frogCharge(voice) {
            tone(voice, { type: 'sine', gain: 0.075, duration: 0.20, pitches: [[0, 175], [0.20, 315]], filter: { type: 'lowpass', frequency: 720, q: 1.5 } });
            tone(voice, { start: 0.10, type: 'triangle', gain: 0.055, duration: 0.11, pitches: [[0, 260], [0.11, 390]] });
        },

        frogLaunch(voice) {
            noise(voice, { gain: 0.075, duration: 0.045, filter: { type: 'lowpass', frequency: 520, q: 1.1 } });
            tone(voice, { type: 'triangle', gain: 0.16, duration: 0.22, pitches: [[0, 190], [0.07, 145], [0.22, 610]] });
        },

        rubberMode(voice) {
            tone(voice, { type: 'triangle', gain: 0.18, duration: 0.30, pitches: [[0, 430], [0.12, 150], [0.30, 350]] });
            [0.19, 0.28, 0.36].forEach((start, index) => {
                tone(voice, { start, gain: 0.08 - index * 0.014, duration: 0.09, frequency: 520 + index * 90 });
            });
        },

        rubberSnap(voice) {
            noise(voice, { gain: 0.09, duration: 0.025, filter: { type: 'highpass', frequency: 1500, q: 0.7 } });
            tone(voice, { type: 'triangle', gain: 0.15, duration: 0.19, pitches: [[0, 560], [0.08, 135], [0.19, 310]] });
        },

        steelMode(voice) {
            tone(voice, { type: 'triangle', gain: 0.20, duration: 0.25, pitches: [[0, 185], [0.25, 138]] });
            tone(voice, { type: 'sine', gain: 0.09, duration: 0.38, frequency: 1110 });
            tone(voice, { start: 0.012, type: 'sine', gain: 0.065, duration: 0.31, frequency: 1670 });
            noise(voice, { gain: 0.10, duration: 0.075, filter: { type: 'bandpass', frequency: 2500, q: 3.2 } });
        },

        steelImpact(voice) {
            noise(voice, { gain: 0.13, duration: 0.055, filter: { type: 'bandpass', frequency: 2100, q: 2.5 } });
            tone(voice, { type: 'triangle', gain: 0.18, duration: 0.20, pitches: [[0, 165], [0.20, 105]] });
            tone(voice, { type: 'sine', gain: 0.075, duration: 0.27, frequency: 920 });
            tone(voice, { start: 0.008, type: 'sine', gain: 0.045, duration: 0.22, frequency: 1510 });
        },

        ghostMode(voice) {
            tone(voice, { gain: 0.13, duration: 0.52, pitches: [[0, 330], [0.20, 510], [0.52, 370]], filter: { type: 'bandpass', frequency: 620, q: 1.4 } });
            tone(voice, { start: 0.07, gain: 0.055, duration: 0.44, detune: 11, pitches: [[0, 660], [0.44, 520]] });
            noise(voice, { start: 0.05, gain: 0.035, duration: 0.42, filter: { type: 'bandpass', frequency: 1400, q: 0.8 } });
        },

        storkMode(voice) {
            [0, 0.075, 0.15].forEach((start, index) => {
                noise(voice, { start, gain: 0.085, duration: 0.035, filter: { type: 'highpass', frequency: 1700, q: 0.8 } });
                tone(voice, { start, type: 'square', gain: 0.038, duration: 0.045, frequency: 1050 - index * 90 });
            });
            tone(voice, { start: 0.20, type: 'triangle', gain: 0.13, duration: 0.30, pitches: [[0, 520], [0.14, 980], [0.30, 740]] });
        },

        storkAlert(voice) {
            noise(voice, { gain: 0.075, duration: 0.026, filter: { type: 'highpass', frequency: 1900, q: 0.7 } });
            tone(voice, { type: 'triangle', gain: 0.09, duration: 0.12, pitches: [[0, 720], [0.12, 1040]] });
            tone(voice, { start: 0.14, type: 'triangle', gain: 0.11, duration: 0.14, pitches: [[0, 820], [0.14, 1240]] });
        },

        storkGrab(voice) {
            noise(voice, { gain: 0.12, duration: 0.032, filter: { type: 'highpass', frequency: 2100, q: 0.7 } });
            noise(voice, { start: 0.052, gain: 0.09, duration: 0.028, filter: { type: 'highpass', frequency: 1800, q: 0.7 } });
            tone(voice, { start: 0.055, type: 'triangle', gain: 0.10, duration: 0.16, pitches: [[0, 420], [0.16, 690]] });
        },

        storkDrag(voice) {
            noise(voice, { gain: 0.025, duration: 0.095, filter: { type: 'bandpass', frequency: 760, q: 1.4 } });
            tone(voice, { type: 'triangle', gain: 0.025, duration: 0.10, pitches: [[0, 175], [0.10, 205]] });
        },

        storkDrop(voice) {
            tone(voice, { type: 'triangle', gain: 0.105, duration: 0.24, pitches: [[0, 640], [0.24, 210]] });
            noise(voice, { start: 0.22, gain: 0.13, duration: 0.07, filter: { type: 'lowpass', frequency: 720, q: 0.9 } });
            tone(voice, { start: 0.21, type: 'sine', gain: 0.17, duration: 0.15, pitches: [[0, 150], [0.15, 92]] });
        },

        storkDenied(voice) {
            tone(voice, { type: 'square', gain: 0.065, duration: 0.10, pitches: [[0, 330], [0.10, 245]], filter: { type: 'lowpass', frequency: 900, q: 0.8 } });
            tone(voice, { start: 0.12, type: 'square', gain: 0.055, duration: 0.11, pitches: [[0, 260], [0.11, 180]], filter: { type: 'lowpass', frequency: 800, q: 0.8 } });
        },

        storkGrabExhausted(voice) {
            tone(voice, { type: 'triangle', gain: 0.085, duration: 0.27, pitches: [[0, 390], [0.12, 245], [0.27, 125]] });
            noise(voice, { start: 0.08, gain: 0.035, duration: 0.17, filter: { type: 'lowpass', frequency: 520, q: 0.8 } });
        },

        storkGrabReady(voice) {
            tone(voice, { type: 'sine', gain: 0.055, duration: 0.10, frequency: 880 });
            tone(voice, { start: 0.07, type: 'sine', gain: 0.045, duration: 0.10, frequency: 1320 });
        },

        storkDefeat(voice) {
            tone(voice, { type: 'sine', gain: 0.13, duration: 0.37, pitches: [[0, 760], [0.37, 145]] });
            tone(voice, { start: 0.34, type: 'triangle', gain: 0.20, duration: 0.16, pitches: [[0, 145], [0.16, 88]] });
            noise(voice, { start: 0.34, gain: 0.11, duration: 0.075, filter: { type: 'lowpass', frequency: 600, q: 1 } });
        },

        gameOver(voice) {
            [392, 330, 262, 196].forEach((frequency, index) => {
                tone(voice, { start: index * 0.16, type: 'triangle', gain: 0.13, duration: 0.22, frequency });
            });
            tone(voice, { start: 0.56, type: 'sawtooth', gain: 0.09, duration: 0.34, pitches: [[0, 230], [0.17, 165], [0.34, 112]], filter: { type: 'bandpass', frequency: 520, q: 1.7 } });
        }
    };

    function playSound(requestedName) {
        const name = aliases[requestedName] || requestedName;
        const policy = policies[name];
        const generator = generators[name];
        if (!policy || !generator) {
            console.warn(`Sky Dodge: unknown sound "${requestedName}".`);
            return false;
        }
        if (audioMuted || !initAudioSystem()) return false;

        resumeAudio();
        const playedAt = nowMs();
        if (policy.cooldown && playedAt - (lastPlayedTime[name] || 0) < policy.cooldown) return false;

        const voice = makeVoice(name, policy);
        if (!voice) return false;
        lastPlayedTime[name] = playedAt;

        try {
            generator(voice);
            return true;
        } catch (error) {
            stopVoice(voice, 0);
            console.error(`Sky Dodge: failed to play "${name}".`, error);
            return false;
        }
    }

    function updateMuteButton() {
        if (typeof document === 'undefined') return;
        const button = document.getElementById('muteButton');
        if (!button) return;
        button.textContent = audioMuted ? '🔇' : '🔊';
        button.setAttribute('aria-pressed', String(audioMuted));
        button.setAttribute('aria-label', audioMuted ? 'Włącz dźwięk' : 'Wycisz dźwięk');
        button.title = audioMuted ? 'Włącz dźwięk' : 'Wycisz dźwięk';
    }

    function toggleMute(forceMuted) {
        audioMuted = typeof forceMuted === 'boolean' ? forceMuted : !audioMuted;
        if (audioMuted) stopAllSounds();

        if (masterGainNode && audioContext && audioContext.state !== 'closed') {
            const now = audioContext.currentTime;
            masterGainNode.gain.cancelScheduledValues(now);
            masterGainNode.gain.setTargetAtTime(audioMuted ? 0 : DEFAULT_MASTER_VOLUME, now, 0.012);
            if (!audioMuted) resumeAudio();
        }

        updateMuteButton();
        return audioMuted;
    }

    global.playSound = playSound;
    global.stopAllSounds = stopAllSounds;
    global.toggleMute = toggleMute;
    global.isMuted = () => audioMuted;

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateMuteButton, { once: true });
        else updateMuteButton();

        global.addEventListener('pagehide', stopAllSounds);
        global.addEventListener('click', resumeAudio, { once: true });
        global.addEventListener('keydown', resumeAudio, { once: true });
    }
}(typeof window !== 'undefined' ? window : globalThis));
