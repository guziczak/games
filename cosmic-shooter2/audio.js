// Audio Context for better sound processing
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let masterVolume = 0.3; // Lower global volume

// Simplified setup without trying to load base64 audio
function setupAudio() {
    try {
        audioCtx = new AudioContext();
        console.log("Audio context initialized successfully");
    } catch (e) {
        console.error('Web Audio API not supported:', e);
    }
}

// Play a synthesized sound instead of loading audio files
function playSound(name, options = {}) {
    if (!audioCtx) return;
    
    try {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        // Configure based on sound type
        switch(name) {
            case 'laser':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.2);
                gainNode.gain.setValueAtTime((options.volume || 0.5) * masterVolume, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                break;
                
            case 'explosion':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(100, audioCtx.currentTime);
                gainNode.gain.setValueAtTime((options.volume || 0.5) * masterVolume, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                
                // Add a noise burst for explosion
                const noise = createNoiseBuffer();
                const noiseGain = audioCtx.createGain();
                noiseGain.gain.setValueAtTime((options.volume || 0.5) * masterVolume * 0.5, audioCtx.currentTime);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                noise.connect(noiseGain).connect(audioCtx.destination);
                break;
                
            case 'powerup':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(330, audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
                gainNode.gain.setValueAtTime((options.volume || 0.5) * masterVolume, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                break;
                
            case 'hit':
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.1);
                gainNode.gain.setValueAtTime((options.volume || 0.3) * masterVolume, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                break;
        }
        
        // Create stereo panner for spatial audio
        const panNode = audioCtx.createStereoPanner();
        panNode.pan.value = options.pan || 0;
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(panNode);
        panNode.connect(audioCtx.destination);
        
        // Start and stop
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + (name === 'explosion' ? 0.5 : 0.3));
        
    } catch (e) {
        console.error('Error playing sound:', e);
    }
}

// Create a short burst of noise for explosions
function createNoiseBuffer() {
    const bufferSize = audioCtx.sampleRate * 0.5; // 0.5 seconds of noise
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    return noise;
}