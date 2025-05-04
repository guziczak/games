// Sky Dodge sound effects system using Web Audio API
// Dynamically generates game sounds instead of using pre-recorded samples

// Initialize audio context
let audioContext;
let masterGainNode;

// Initialize audio system
function initAudioSystem() {
    try {
        // Create audio context
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        
        // Create master volume control
        masterGainNode = audioContext.createGain();
        masterGainNode.gain.value = 0.7; // Set default volume
        masterGainNode.connect(audioContext.destination);
        
        return true;
    } catch(e) {
        console.error("Web Audio API not supported in this browser", e);
        return false;
    }
}

// Sound generation functions
const soundGenerators = {
    // Jump sound - springy "boing" effect
    jump: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(masterGainNode);
        
        // Configure oscillator
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(180, audioContext.currentTime + 0.2);
        
        // Configure envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.6, audioContext.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        
        // Play sound
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    },
    
    // Regular coin collection - bright, cheerful "ding"
    coin: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(masterGainNode);
        
        // Configure oscillator
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1320, audioContext.currentTime + 0.1);
        
        // Configure envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        
        // Play sound
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    },
    
    // Purple coin - magical "sparkly" sound
    purpleCoin: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Create nodes
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const biquadFilter = audioContext.createBiquadFilter();
        
        // Connect nodes
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(biquadFilter);
        biquadFilter.connect(masterGainNode);
        
        // Configure oscillators
        oscillator1.type = 'sine';
        oscillator1.frequency.setValueAtTime(1200, audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(1800, audioContext.currentTime + 0.2);
        
        oscillator2.type = 'triangle';
        oscillator2.frequency.setValueAtTime(900, audioContext.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(1600, audioContext.currentTime + 0.4);
        
        // Configure filter for sparkly effect
        biquadFilter.type = 'lowpass';
        biquadFilter.frequency.setValueAtTime(1000, audioContext.currentTime);
        biquadFilter.frequency.exponentialRampToValueAtTime(4000, audioContext.currentTime + 0.1);
        biquadFilter.Q.value = 5;
        
        // Configure envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        
        // Play sound
        oscillator1.start();
        oscillator2.start();
        oscillator1.stop(audioContext.currentTime + 0.5);
        oscillator2.stop(audioContext.currentTime + 0.5);
    },
    
    // Game over - dramatic descending tone
    gameOver: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Create nodes
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Connect nodes
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(masterGainNode);
        
        // Configure oscillators
        oscillator1.type = 'sawtooth';
        oscillator1.frequency.setValueAtTime(220, audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 0.8);
        
        oscillator2.type = 'sine';
        oscillator2.frequency.setValueAtTime(180, audioContext.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(55, audioContext.currentTime + 1.2);
        
        // Configure envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.7, audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.3);
        
        // Play sound
        oscillator1.start();
        oscillator2.start();
        oscillator1.stop(audioContext.currentTime + 1.3);
        oscillator2.stop(audioContext.currentTime + 1.3);
    },
    
    // Frog mode - ribbit-like sound
    frogMode: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Create nodes
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const biquadFilter = audioContext.createBiquadFilter();
        
        // Connect nodes
        oscillator.connect(biquadFilter);
        biquadFilter.connect(gainNode);
        gainNode.connect(masterGainNode);
        
        // Configure oscillator for frog-like sound
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(60, audioContext.currentTime + 0.1);
        oscillator.frequency.linearRampToValueAtTime(40, audioContext.currentTime + 0.3);
        
        // Configure filter
        biquadFilter.type = 'lowpass';
        biquadFilter.frequency.setValueAtTime(1000, audioContext.currentTime);
        biquadFilter.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.3);
        biquadFilter.Q.value = 3;
        
        // Configure envelope for ribbit effect
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.7, audioContext.currentTime + 0.03);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0.6, audioContext.currentTime + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
        
        // Play sound
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.4);
        
        // Add a second ribbit after a brief pause
        setTimeout(() => {
            const oscillator2 = audioContext.createOscillator();
            const gainNode2 = audioContext.createGain();
            const biquadFilter2 = audioContext.createBiquadFilter();
            
            oscillator2.connect(biquadFilter2);
            biquadFilter2.connect(gainNode2);
            gainNode2.connect(masterGainNode);
            
            oscillator2.type = 'triangle';
            oscillator2.frequency.setValueAtTime(180, audioContext.currentTime);
            oscillator2.frequency.linearRampToValueAtTime(40, audioContext.currentTime + 0.3);
            
            biquadFilter2.type = 'lowpass';
            biquadFilter2.frequency.setValueAtTime(800, audioContext.currentTime);
            biquadFilter2.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
            biquadFilter2.Q.value = 2;
            
            gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode2.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.02);
            gainNode2.gain.linearRampToValueAtTime(0.6, audioContext.currentTime + 0.1);
            gainNode2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
            
            oscillator2.start();
            oscillator2.stop(audioContext.currentTime + 0.3);
        }, 300);
    },
    
    // Ghost mode - ethereal spooky sound
    ghostMode: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Create nodes
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const oscillator3 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const biquadFilter = audioContext.createBiquadFilter();
        
        // Connect nodes
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        oscillator3.connect(gainNode);
        gainNode.connect(biquadFilter);
        biquadFilter.connect(masterGainNode);
        
        // Configure oscillators for ethereal effect
        oscillator1.type = 'sine';
        oscillator1.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator1.frequency.linearRampToValueAtTime(300, audioContext.currentTime + 0.6);
        
        oscillator2.type = 'sine';
        oscillator2.frequency.setValueAtTime(203, audioContext.currentTime);
        oscillator2.frequency.linearRampToValueAtTime(306, audioContext.currentTime + 0.6);
        
        oscillator3.type = 'sine';
        oscillator3.frequency.setValueAtTime(260, audioContext.currentTime);
        oscillator3.frequency.linearRampToValueAtTime(380, audioContext.currentTime + 0.6);
        
        // Configure filter for ghostly effect
        biquadFilter.type = 'bandpass';
        biquadFilter.frequency.setValueAtTime(300, audioContext.currentTime);
        biquadFilter.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.4);
        biquadFilter.Q.value = 1.5;
        
        // Configure envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.7);
        
        // Play sound
        oscillator1.start();
        oscillator2.start();
        oscillator3.start();
        oscillator1.stop(audioContext.currentTime + 0.7);
        oscillator2.stop(audioContext.currentTime + 0.7);
        oscillator3.stop(audioContext.currentTime + 0.7);
    },
    
    // Stork mode - bird-like call
    storkMode: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Create nodes
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const biquadFilter = audioContext.createBiquadFilter();
        
        // Connect nodes
        oscillator.connect(biquadFilter);
        biquadFilter.connect(gainNode);
        gainNode.connect(masterGainNode);
        
        // Configure oscillator for stork call
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 0.1);
        oscillator.frequency.linearRampToValueAtTime(600, audioContext.currentTime + 0.2);
        oscillator.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 0.3);
        
        // Configure filter
        biquadFilter.type = 'bandpass';
        biquadFilter.frequency.setValueAtTime(500, audioContext.currentTime);
        biquadFilter.frequency.linearRampToValueAtTime(900, audioContext.currentTime + 0.1);
        biquadFilter.frequency.linearRampToValueAtTime(500, audioContext.currentTime + 0.3);
        biquadFilter.Q.value = 2;
        
        // Configure envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.6, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        
        // Play sound
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
        
        // Add a second call after a brief pause
        setTimeout(() => {
            const oscillator2 = audioContext.createOscillator();
            const gainNode2 = audioContext.createGain();
            const biquadFilter2 = audioContext.createBiquadFilter();
            
            oscillator2.connect(biquadFilter2);
            biquadFilter2.connect(gainNode2);
            gainNode2.connect(masterGainNode);
            
            oscillator2.type = 'sawtooth';
            oscillator2.frequency.setValueAtTime(650, audioContext.currentTime);
            oscillator2.frequency.linearRampToValueAtTime(450, audioContext.currentTime + 0.15);
            
            biquadFilter2.type = 'bandpass';
            biquadFilter2.frequency.setValueAtTime(550, audioContext.currentTime);
            biquadFilter2.frequency.linearRampToValueAtTime(950, audioContext.currentTime + 0.15);
            biquadFilter2.Q.value = 2;
            
            gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode2.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.03);
            gainNode2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.25);
            
            oscillator2.start();
            oscillator2.stop(audioContext.currentTime + 0.25);
        }, 400);
    },
    
    // Stork defeat - dramatic collapse
    storkDefeat: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Create nodes
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const biquadFilter = audioContext.createBiquadFilter();
        
        // Connect nodes
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(biquadFilter);
        biquadFilter.connect(masterGainNode);
        
        // Configure oscillators
        oscillator1.type = 'sawtooth';
        oscillator1.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.3);
        
        oscillator2.type = 'sine';
        oscillator2.frequency.setValueAtTime(300, audioContext.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.5);
        
        // Configure filter
        biquadFilter.type = 'lowpass';
        biquadFilter.frequency.setValueAtTime(2000, audioContext.currentTime);
        biquadFilter.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.4);
        
        // Configure envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.7, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        
        // Play sound
        oscillator1.start();
        oscillator2.start();
        oscillator1.stop(audioContext.currentTime + 0.5);
        oscillator2.stop(audioContext.currentTime + 0.5);
    },
    
    // Frog coin - unique bubbling sound
    frogCoin: function() {
        if (!audioContext) {
            if (!initAudioSystem()) return;
        }
        
        // Create nodes
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const biquadFilter = audioContext.createBiquadFilter();
        
        // Connect nodes
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(biquadFilter);
        biquadFilter.connect(masterGainNode);
        
        // Configure oscillators
        oscillator1.type = 'sine';
        oscillator1.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(900, audioContext.currentTime + 0.1);
        oscillator1.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
        
        oscillator2.type = 'sine';
        oscillator2.frequency.setValueAtTime(900, audioContext.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.15);
        
        // Configure filter for bubbling effect
        biquadFilter.type = 'bandpass';
        biquadFilter.frequency.setValueAtTime(800, audioContext.currentTime);
        biquadFilter.frequency.linearRampToValueAtTime(1500, audioContext.currentTime + 0.2);
        biquadFilter.Q.value = 4;
        
        // Configure envelope for watery effect
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        
        // Play sound
        oscillator1.start();
        oscillator2.start();
        oscillator1.stop(audioContext.currentTime + 0.3);
        oscillator2.stop(audioContext.currentTime + 0.3);
    }
};

// Main function to play a sound
function playSound(soundName) {
    // Check if the sound exists in our generator collection
    if (soundGenerators[soundName]) {
        try {
            // Resume audio context if it was suspended (browser policy)
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            // Generate and play the sound
            soundGenerators[soundName]();
        } catch (err) {
            console.error("Error playing sound:", soundName, err);
        }
    } else {
        console.error(`Sound "${soundName}" not found in sound generators.`);
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