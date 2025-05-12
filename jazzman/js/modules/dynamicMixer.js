/**
 * Dynamic Mixer Module
 * Zawiera implementację dynamicznego miksera, który dostosowuje 
 * parametry dźwięku w zależności od kontekstu muzycznego
 */

/**
 * Klasa zarządzająca dynamicznym miksem
 */
export class DynamicMixer {
    /**
     * Tworzy nowy mikser dynamiczny
     * @param {Object} audioEngine - Obiekt silnika audio (zawiera mikser, efekty, instrumenty)
     */
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.context = audioEngine.context;
        this.dynamicState = {
            tension: 0.5,       // Napięcie harmoniczne (0-1)
            intensity: 0.5,     // Intensywność (0-1)
            complexity: 0.5,    // Złożoność (0-1)
            brightness: 0.5,    // Jasność brzmienia (0-1)
            depth: 0.5          // Głębia przestrzenna (0-1)
        };
        
        // Zapisujemy domyślne ustawienia miksera
        this.defaultSettings = {
            masterVolume: audioEngine.mixer.master.gain.value,
            pianoVolume: audioEngine.mixer.channels.piano.gain.value,
            bassVolume: audioEngine.mixer.channels.bass.gain.value,
            drumsVolume: audioEngine.mixer.channels.drums.gain.value,
            trumpetVolume: audioEngine.mixer.channels.trumpet.gain.value,
            pianoEQ: this.getEQSettings(audioEngine.effects.piano.eq),
            bassEQ: this.getEQSettings(audioEngine.effects.bass.eq),
            drumsEQ: this.getEQSettings(audioEngine.effects.drums.eq),
            trumpetEQ: this.getEQSettings(audioEngine.effects.trumpet.eq),
            pianoReverb: audioEngine.effects.piano.reverb.output.gain.value,
            bassReverb: audioEngine.effects.bass.reverb.output.gain.value,
            drumsReverb: audioEngine.effects.drums.reverb.output.gain.value,
            trumpetReverb: audioEngine.effects.trumpet.reverb.output.gain.value
        };
        
        // Inicjalizacja automatycznych modulacji
        this.modulationInterval = null;
        this.lastUpdateTime = 0;
        this.automationActive = false;
    }
    
    /**
     * Pobiera aktualne ustawienia EQ
     * @param {Object} eq - Obiekt equalizera
     * @returns {Object} Obiekt z ustawieniami low, mid, high
     */
    getEQSettings(eq) {
        // Przykładowa implementacja - dostosuj do faktycznej struktury eq
        return {
            low: 0,
            mid: 0,
            high: 0
        };
    }
    
    /**
     * Ustawia parametr dynamicznego miksu
     * @param {string} parameter - Nazwa parametru ('tension', 'intensity', 'complexity', 'brightness', 'depth')
     * @param {number} value - Wartość parametru (0-1)
     */
    setParameter(parameter, value) {
        // Ograniczamy wartość do zakresu 0-1
        const limitedValue = Math.max(0, Math.min(1, value));
        
        if (this.dynamicState.hasOwnProperty(parameter)) {
            this.dynamicState[parameter] = limitedValue;
            this.updateMixParameters();
        }
    }
    
    /**
     * Ustawia wszystkie parametry na raz
     * @param {Object} parameters - Obiekt z parametrami
     */
    setAllParameters(parameters) {
        for (const [param, value] of Object.entries(parameters)) {
            if (this.dynamicState.hasOwnProperty(param)) {
                this.dynamicState[param] = Math.max(0, Math.min(1, value));
            }
        }
        this.updateMixParameters();
    }
    
    /**
     * Aktualizuje parametry miksu na podstawie stanu dynamicznego
     */
    updateMixParameters() {
        const { tension, intensity, complexity, brightness, depth } = this.dynamicState;
        const mixer = this.audioEngine.mixer;
        const effects = this.audioEngine.effects;
        
        // GŁOŚNOŚĆ GŁÓWNA
        // Większa intensywność = większa głośność
        mixer.setMasterVolume(
            this.defaultSettings.masterVolume * (0.8 + intensity * 0.4)
        );
        
        // BALANS INSTRUMENTÓW
        
        // 1. Piano - głośniejsze przy niskim napięciu, cichsze przy wysokim
        mixer.setVolume('piano',
            this.defaultSettings.pianoVolume * 
            (1.2 - tension * 0.5) * 
            (0.8 + intensity * 0.4)
        );
        
        // 2. Bass - głośniejszy przy wysokiej złożoności
        mixer.setVolume('bass',
            this.defaultSettings.bassVolume * 
            (0.8 + complexity * 0.4) * 
            (0.9 + intensity * 0.2)
        );
        
        // 3. Drums - głośniejsze przy wysokiej intensywności
        mixer.setVolume('drums',
            this.defaultSettings.drumsVolume * 
            (0.7 + intensity * 0.6)
        );
        
        // 4. Trumpet - głośniejsza przy wysokim napięciu
        mixer.setVolume('trumpet',
            this.defaultSettings.trumpetVolume * 
            (0.7 + tension * 0.6) * 
            (0.8 + intensity * 0.4)
        );
        
        // EFEKTY
        
        // 1. Jasność (EQ) - regulacja tonów wysokich
        effects.piano.eq.setHigh(brightness * 4 - 2);  // Zakres od -2 do +2 dB
        effects.bass.eq.setHigh(brightness * 2 - 1);   // Zakres od -1 do +1 dB
        effects.drums.eq.setHigh(brightness * 4 - 2);  // Zakres od -2 do +2 dB
        effects.trumpet.eq.setHigh(brightness * 4 - 2); // Zakres od -2 do +2 dB
        
        // 2. Głębia - regulacja tonów niskich i efektu pogłosu
        effects.piano.eq.setLow(depth * 6 - 2);  // Zakres od -2 do +4 dB
        effects.bass.eq.setLow(depth * 4);       // Zakres od 0 do +4 dB
        effects.drums.eq.setLow(depth * 4 - 1);  // Zakres od -1 do +3 dB
        
        // 3. Reverb (pogłos) w zależności od głębi i napięcia
        const pianoReverbMix = 0.1 + depth * 0.4 - tension * 0.2;
        const bassReverbMix = 0.05 + depth * 0.2 - tension * 0.1;
        const drumsReverbMix = 0.1 + depth * 0.3 - tension * 0.15;
        const trumpetReverbMix = 0.2 + depth * 0.4;
        
        effects.piano.setReverbMix(Math.max(0, Math.min(1, pianoReverbMix)));
        effects.bass.setReverbMix(Math.max(0, Math.min(1, bassReverbMix)));
        effects.drums.setReverbMix(Math.max(0, Math.min(1, drumsReverbMix)));
        effects.trumpet.setReverbMix(Math.max(0, Math.min(1, trumpetReverbMix)));
        
        // 4. Delay (echo) w zależności od głębi i złożoności
        const pianoDelayMix = 0.1 + depth * 0.2 + complexity * 0.1;
        const bassDelayMix = 0.05 + depth * 0.1;
        const drumsDelayMix = 0;  // Brak delay dla perkusji
        const trumpetDelayMix = 0.15 + depth * 0.2 + complexity * 0.15;
        
        effects.piano.setDelayMix(Math.max(0, Math.min(1, pianoDelayMix)));
        effects.bass.setDelayMix(Math.max(0, Math.min(1, bassDelayMix)));
        effects.drums.setDelayMix(Math.max(0, Math.min(1, drumsDelayMix)));
        effects.trumpet.setDelayMix(Math.max(0, Math.min(1, trumpetDelayMix)));
        
        // 5. Kompresja - mocniejsza kompresja przy wysokiej intensywności
        if (effects.piano.compressor && effects.piano.compressor.setRatio) {
            effects.piano.compressor.setRatio(3 + intensity * 9);
            effects.bass.compressor.setRatio(4 + intensity * 8);
            effects.drums.compressor.setRatio(4 + intensity * 6);
            effects.trumpet.compressor.setRatio(3 + intensity * 9);
        }
    }
    
    /**
     * Ustawia dynamikę miksu na podstawie nastroju muzycznego
     * @param {string} mood - Nastrój muzyczny ('spokojny', 'energiczny', 'nastrojowy', itp.)
     */
    setMixForMood(mood) {
        // Predefiniowane parametry dla typowych nastrojów
        const moodPresets = {
            spokojny: { tension: 0.2, intensity: 0.3, complexity: 0.4, brightness: 0.4, depth: 0.7 },
            energiczny: { tension: 0.7, intensity: 0.8, complexity: 0.6, brightness: 0.7, depth: 0.4 },
            nastrojowy: { tension: 0.5, intensity: 0.4, complexity: 0.6, brightness: 0.3, depth: 0.8 },
            melancholijny: { tension: 0.4, intensity: 0.3, complexity: 0.5, brightness: 0.2, depth: 0.6 },
            radosny: { tension: 0.3, intensity: 0.7, complexity: 0.5, brightness: 0.8, depth: 0.5 },
            zaskakujący: { tension: 0.8, intensity: 0.6, complexity: 0.8, brightness: 0.6, depth: 0.4 },
            eksperymentalny: { tension: 0.7, intensity: 0.5, complexity: 0.9, brightness: 0.6, depth: 0.7 },
            minimalistyczny: { tension: 0.2, intensity: 0.3, complexity: 0.2, brightness: 0.5, depth: 0.4 },
            intensywny: { tension: 0.9, intensity: 0.9, complexity: 0.7, brightness: 0.7, depth: 0.5 },
            kontemplacyjny: { tension: 0.3, intensity: 0.2, complexity: 0.6, brightness: 0.3, depth: 0.9 },
            tajemniczy: { tension: 0.6, intensity: 0.4, complexity: 0.7, brightness: 0.3, depth: 0.8 },
            nostalgiczny: { tension: 0.4, intensity: 0.3, complexity: 0.5, brightness: 0.4, depth: 0.7 },
            triumfalny: { tension: 0.7, intensity: 0.9, complexity: 0.6, brightness: 0.8, depth: 0.6 },
            niepokojący: { tension: 0.8, intensity: 0.6, complexity: 0.7, brightness: 0.4, depth: 0.6 },
            refleksyjny: { tension: 0.3, intensity: 0.2, complexity: 0.5, brightness: 0.3, depth: 0.7 },
            wzniosły: { tension: 0.6, intensity: 0.7, complexity: 0.8, brightness: 0.7, depth: 0.9 },
            liryczny: { tension: 0.3, intensity: 0.4, complexity: 0.6, brightness: 0.6, depth: 0.7 },
            przejmujący: { tension: 0.7, intensity: 0.8, complexity: 0.6, brightness: 0.5, depth: 0.8 }
        };
        
        // Jeśli nastrój ma predefiniowane ustawienia, używamy ich
        if (moodPresets[mood]) {
            this.setAllParameters(moodPresets[mood]);
        } else {
            // W przeciwnym razie używamy domyślnych ustawień
            this.setAllParameters({
                tension: 0.5,
                intensity: 0.5,
                complexity: 0.5,
                brightness: 0.5,
                depth: 0.5
            });
        }
    }
    
    /**
     * Ustawia dynamikę miksu na podstawie stylu muzycznego
     * @param {string} style - Styl muzyczny ('swing', 'bebop', 'fusion', 'modal', itp.)
     */
    setMixForStyle(style) {
        // Predefiniowane parametry dla różnych stylów
        const stylePresets = {
            swing: { tension: 0.4, intensity: 0.6, complexity: 0.5, brightness: 0.6, depth: 0.5 },
            bebop: { tension: 0.7, intensity: 0.8, complexity: 0.8, brightness: 0.7, depth: 0.4 },
            fusion: { tension: 0.6, intensity: 0.7, complexity: 0.7, brightness: 0.7, depth: 0.6 },
            modal: { tension: 0.5, intensity: 0.4, complexity: 0.6, brightness: 0.5, depth: 0.8 },
            bossaNova: { tension: 0.3, intensity: 0.5, complexity: 0.6, brightness: 0.6, depth: 0.6 },
            coolJazz: { tension: 0.4, intensity: 0.3, complexity: 0.5, brightness: 0.4, depth: 0.7 }
        };
        
        // Jeśli styl ma predefiniowane ustawienia, używamy ich
        if (stylePresets[style]) {
            this.setAllParameters(stylePresets[style]);
        } else {
            // W przeciwnym razie używamy domyślnych ustawień
            this.setAllParameters({
                tension: 0.5,
                intensity: 0.5,
                complexity: 0.5,
                brightness: 0.5,
                depth: 0.5
            });
        }
    }
    
    /**
     * Dostosowuje miks na podstawie akordu
     * @param {string} chordName - Nazwa akordu (np. 'Cmaj7', 'Dm7b5')
     */
    adjustMixForChord(chordName) {
        // Ustawienia w zależności od typu akordu
        let tensionAdjustment = 0;
        let brightnessAdjustment = 0;
        let depthAdjustment = 0;
        
        // Dostosowanie na podstawie typu akordu
        if (chordName.includes('maj7') || chordName.includes('6')) {
            // Akordy durowe maj7 lub 6 - bardziej spokojne, jasne
            tensionAdjustment = -0.1;
            brightnessAdjustment = 0.1;
        } else if (chordName.includes('m7') && !chordName.includes('m7b5')) {
            // Akordy mollowe m7 - lekko stonowane
            tensionAdjustment = 0;
            brightnessAdjustment = -0.05;
            depthAdjustment = 0.05;
        } else if (chordName.includes('7')) {
            // Akordy dominantowe (septymowe) - napięcie
            tensionAdjustment = 0.1;
            brightnessAdjustment = 0;
        } else if (chordName.includes('dim') || chordName.includes('m7b5')) {
            // Akordy zmniejszone i półzmniejszone - duże napięcie
            tensionAdjustment = 0.2;
            brightnessAdjustment = -0.1;
            depthAdjustment = 0.1;
        } else if (chordName.includes('aug')) {
            // Akordy zwiększone - zaskoczenie
            tensionAdjustment = 0.15;
            brightnessAdjustment = 0.05;
        } else if (chordName.includes('sus')) {
            // Akordy zawieszone (sus4, sus2) - niedookreślone
            tensionAdjustment = -0.05;
            depthAdjustment = 0.1;
        }
        
        // Zastosowanie dostosowań
        this.setParameter('tension', this.dynamicState.tension + tensionAdjustment);
        this.setParameter('brightness', this.dynamicState.brightness + brightnessAdjustment);
        this.setParameter('depth', this.dynamicState.depth + depthAdjustment);
    }
    
    /**
     * Zwiększa napięcie w miksie (przydatne np. przed kulminacją)
     * @param {number} amount - Wartość zwiększenia (0-1)
     */
    increaseTension(amount = 0.1) {
        const newTension = this.dynamicState.tension + amount;
        this.setParameter('tension', newTension);
        this.setParameter('intensity', this.dynamicState.intensity + (amount * 0.5));
    }
    
    /**
     * Zmniejsza napięcie w miksie (przydatne np. po kulminacji)
     * @param {number} amount - Wartość zmniejszenia (0-1)
     */
    decreaseTension(amount = 0.1) {
        const newTension = this.dynamicState.tension - amount;
        this.setParameter('tension', newTension);
        this.setParameter('intensity', this.dynamicState.intensity - (amount * 0.5));
    }
    
    /**
     * Aktywuje automatyczną modulację miksu w czasie
     * @param {number} updateInterval - Interwał aktualizacji w milisekundach
     */
    startAutomation(updateInterval = 500) {
        if (this.automationActive) {
            return;
        }
        
        this.automationActive = true;
        this.lastUpdateTime = this.context.currentTime;
        
        this.modulationInterval = setInterval(() => {
            const currentTime = this.context.currentTime;
            const deltaTime = currentTime - this.lastUpdateTime;
            this.lastUpdateTime = currentTime;
            
            // Powolne pływanie parametrów dla naturalności
            const randomModulation = (Math.random() - 0.5) * 0.05;
            
            // Delikatne fluktuacje dla naturalności
            this.setParameter('intensity', this.dynamicState.intensity + randomModulation);
            this.setParameter('brightness', this.dynamicState.brightness + randomModulation * 0.5);
            this.setParameter('depth', this.dynamicState.depth + randomModulation * 0.3);
        }, updateInterval);
    }
    
    /**
     * Zatrzymuje automatyczną modulację miksu
     */
    stopAutomation() {
        if (this.modulationInterval) {
            clearInterval(this.modulationInterval);
            this.modulationInterval = null;
        }
        this.automationActive = false;
    }
    
    /**
     * Tworzy efekt narastania (buildup)
     * @param {number} duration - Czas trwania narastania w sekundach
     * @param {number} intensity - Intensywność narastania (0-1)
     */
    createBuildUp(duration, intensity = 1.0) {
        // Zapisujemy początkowe ustawienia
        const initialTension = this.dynamicState.tension;
        const initialIntensity = this.dynamicState.intensity;
        const initialBrightness = this.dynamicState.brightness;
        
        // Docelowe wartości
        const targetTension = Math.min(1.0, initialTension + intensity * 0.5);
        const targetIntensity = Math.min(1.0, initialIntensity + intensity * 0.6);
        const targetBrightness = Math.min(1.0, initialBrightness + intensity * 0.3);
        
        // Liczba kroków (1 krok co 50ms)
        const steps = duration * 1000 / 50;
        const tensionStep = (targetTension - initialTension) / steps;
        const intensityStep = (targetIntensity - initialIntensity) / steps;
        const brightnessStep = (targetBrightness - initialBrightness) / steps;
        
        let currentStep = 0;
        
        // Tworzymy interwał dla stopniowej zmiany
        const buildupInterval = setInterval(() => {
            currentStep++;
            this.setParameter('tension', initialTension + tensionStep * currentStep);
            this.setParameter('intensity', initialIntensity + intensityStep * currentStep);
            this.setParameter('brightness', initialBrightness + brightnessStep * currentStep);
            
            // Zatrzymujemy po osiągnięciu liczby kroków
            if (currentStep >= steps) {
                clearInterval(buildupInterval);
            }
        }, 50);
    }
    
    /**
     * Tworzy efekt wyciszenia (drop)
     * @param {number} duration - Czas trwania wyciszenia w sekundach
     * @param {number} intensity - Intensywność wyciszenia (0-1)
     */
    createDrop(duration, intensity = 1.0) {
        // Zapisujemy początkowe ustawienia
        const initialTension = this.dynamicState.tension;
        const initialIntensity = this.dynamicState.intensity;
        const initialBrightness = this.dynamicState.brightness;
        const initialDepth = this.dynamicState.depth;
        
        // Docelowe wartości
        const targetTension = Math.max(0.0, initialTension - intensity * 0.5);
        const targetIntensity = Math.max(0.0, initialIntensity - intensity * 0.6);
        const targetBrightness = Math.max(0.0, initialBrightness - intensity * 0.3);
        const targetDepth = Math.min(1.0, initialDepth + intensity * 0.3);
        
        // Liczba kroków (1 krok co 50ms)
        const steps = duration * 1000 / 50;
        const tensionStep = (targetTension - initialTension) / steps;
        const intensityStep = (targetIntensity - initialIntensity) / steps;
        const brightnessStep = (targetBrightness - initialBrightness) / steps;
        const depthStep = (targetDepth - initialDepth) / steps;
        
        let currentStep = 0;
        
        // Tworzymy interwał dla stopniowej zmiany
        const dropInterval = setInterval(() => {
            currentStep++;
            this.setParameter('tension', initialTension + tensionStep * currentStep);
            this.setParameter('intensity', initialIntensity + intensityStep * currentStep);
            this.setParameter('brightness', initialBrightness + brightnessStep * currentStep);
            this.setParameter('depth', initialDepth + depthStep * currentStep);
            
            // Zatrzymujemy po osiągnięciu liczby kroków
            if (currentStep >= steps) {
                clearInterval(dropInterval);
            }
        }, 50);
    }
    
    /**
     * Resetuje miks do domyślnych ustawień
     */
    resetToDefaults() {
        // Resetujemy stan dynamiczny
        this.dynamicState = {
            tension: 0.5,
            intensity: 0.5,
            complexity: 0.5,
            brightness: 0.5,
            depth: 0.5
        };
        
        // Resetujemy ustawienia miksera
        const mixer = this.audioEngine.mixer;
        const effects = this.audioEngine.effects;
        
        mixer.setMasterVolume(this.defaultSettings.masterVolume);
        mixer.setVolume('piano', this.defaultSettings.pianoVolume);
        mixer.setVolume('bass', this.defaultSettings.bassVolume);
        mixer.setVolume('drums', this.defaultSettings.drumsVolume);
        mixer.setVolume('trumpet', this.defaultSettings.trumpetVolume);
        
        // Reset EQ
        effects.piano.eq.setLow(this.defaultSettings.pianoEQ.low);
        effects.piano.eq.setMid(this.defaultSettings.pianoEQ.mid);
        effects.piano.eq.setHigh(this.defaultSettings.pianoEQ.high);
        
        effects.bass.eq.setLow(this.defaultSettings.bassEQ.low);
        effects.bass.eq.setMid(this.defaultSettings.bassEQ.mid);
        effects.bass.eq.setHigh(this.defaultSettings.bassEQ.high);
        
        effects.drums.eq.setLow(this.defaultSettings.drumsEQ.low);
        effects.drums.eq.setMid(this.defaultSettings.drumsEQ.mid);
        effects.drums.eq.setHigh(this.defaultSettings.drumsEQ.high);
        
        effects.trumpet.eq.setLow(this.defaultSettings.trumpetEQ.low);
        effects.trumpet.eq.setMid(this.defaultSettings.trumpetEQ.mid);
        effects.trumpet.eq.setHigh(this.defaultSettings.trumpetEQ.high);
        
        // Reset efektów
        effects.piano.setReverbMix(0.3);
        effects.bass.setReverbMix(0.1);
        effects.drums.setReverbMix(0.2);
        effects.trumpet.setReverbMix(0.4);
        
        effects.piano.setDelayMix(0.1);
        effects.bass.setDelayMix(0.05);
        effects.drums.setDelayMix(0.0);
        effects.trumpet.setDelayMix(0.2);
    }
}

/**
 * Klasa zarządzająca dynamiką wykonawczą w muzyce
 */
export class MusicalDynamics {
    /**
     * Tworzy nowy obiekt dynamiki muzycznej
     */
    constructor() {
        this.dynamicLevels = {
            pp: 0.1,    // pianissimo (bardzo cicho)
            p: 0.3,     // piano (cicho)
            mp: 0.4,    // mezzo-piano (średnio cicho)
            mf: 0.6,    // mezzo-forte (średnio głośno)
            f: 0.8,     // forte (głośno)
            ff: 0.9     // fortissimo (bardzo głośno)
        };
        
        this.currentDynamic = 'mf';
        this.expressiveness = 0.5; // Dodatkowy parametr ekspresji (0-1)
    }
    
    /**
     * Ustawia poziom dynamiki
     * @param {string} level - Poziom dynamiki (pp, p, mp, mf, f, ff)
     */
    setDynamicLevel(level) {
        if (this.dynamicLevels.hasOwnProperty(level)) {
            this.currentDynamic = level;
        }
    }
    
    /**
     * Ustawia ekspresyjność
     * @param {number} value - Wartość ekspresyjności (0-1)
     */
    setExpressiveness(value) {
        this.expressiveness = Math.max(0, Math.min(1, value));
    }
    
    /**
     * Zwraca obecną wartość dynamiki (0-1)
     * @returns {number} Wartość dynamiki
     */
    getCurrentDynamicValue() {
        return this.dynamicLevels[this.currentDynamic];
    }
    
    /**
     * Przekształca wartość dynamiki bazowej z uwzględnieniem parametrów ekspresji
     * @param {number} baseVelocity - Bazowa wartość dynamiki (velocity)
     * @param {Object} options - Dodatkowe opcje
     * @returns {number} Przekształcona wartość dynamiki
     */
    transformVelocity(baseVelocity, options = {}) {
        const dynamicValue = this.getCurrentDynamicValue();
        
        // Uwzględniamy podstawową dynamikę
        let velocity = baseVelocity * dynamicValue;
        
        // Dodajemy ekspresyjność (losowość)
        const randomFactor = (Math.random() - 0.5) * this.expressiveness * 0.3;
        velocity += randomFactor;
        
        // Uwzględniamy pozycję metryczną (akcenty)
        if (options.isAccented) {
            velocity *= 1.2;
        }
        
        // Limitujemy do zakresu 0-1
        return Math.max(0, Math.min(1, velocity));
    }
    
    /**
     * Tworzy efekt crescendo (stopniowe zwiększanie głośności)
     * @param {number} startDynamic - Początkowa dynamika (0-1)
     * @param {number} endDynamic - Końcowa dynamika (0-1)
     * @param {number} steps - Liczba kroków
     * @returns {Array} Tablica wartości dynamiki
     */
    createCrescendo(startDynamic, endDynamic, steps) {
        const result = [];
        const step = (endDynamic - startDynamic) / (steps - 1);
        
        for (let i = 0; i < steps; i++) {
            const baseValue = startDynamic + (step * i);
            
            // Dodajemy niewielką przypadkowość dla naturalności
            const randomness = (Math.random() - 0.5) * 0.05 * this.expressiveness;
            result.push(Math.max(0, Math.min(1, baseValue + randomness)));
        }
        
        return result;
    }
    
    /**
     * Tworzy efekt diminuendo (stopniowe zmniejszanie głośności)
     * @param {number} startDynamic - Początkowa dynamika (0-1)
     * @param {number} endDynamic - Końcowa dynamika (0-1)
     * @param {number} steps - Liczba kroków
     * @returns {Array} Tablica wartości dynamiki
     */
    createDiminuendo(startDynamic, endDynamic, steps) {
        return this.createCrescendo(startDynamic, endDynamic, steps);
    }
    
    /**
     * Generuje wartości dynamiki dla typowego wzorca 4-taktowego
     * @param {string} pattern - Typ wzorca ('standard', 'climax', 'tension', 'resolve')
     * @returns {Array} Tablica wartości dynamiki dla każdego taktu
     */
    createDynamicPattern(pattern = 'standard') {
        const baseValue = this.getCurrentDynamicValue();
        
        switch (pattern) {
            case 'climax':
                // Wzorzec kulminacji (narasta do taktu 3, potem opada)
                return [
                    baseValue * 0.8,
                    baseValue * 0.9,
                    baseValue * 1.1,
                    baseValue * 0.9
                ];
                
            case 'tension':
                // Wzorzec napięcia (stale narasta)
                return [
                    baseValue * 0.8,
                    baseValue * 0.9,
                    baseValue * 1.0,
                    baseValue * 1.1
                ];
                
            case 'resolve':
                // Wzorzec rozwiązania (opada)
                return [
                    baseValue * 1.1,
                    baseValue * 1.0,
                    baseValue * 0.9,
                    baseValue * 0.8
                ];
                
            case 'standard':
            default:
                // Standardowy wzorzec z akcentem na 1 i 3
                return [
                    baseValue * 1.1,
                    baseValue * 0.9,
                    baseValue * 1.05,
                    baseValue * 0.95
                ];
        }
    }
}

/**
 * Adapter do sterowania odtwarzaniem instrumentów z uwzględnieniem dynamiki muzycznej
 */
export class DynamicPlayer {
    /**
     * Tworzy nowy obiekt dynamicznego odtwarzacza
     * @param {Object} audioEngine - Obiekt silnika audio
     * @param {MusicalDynamics} dynamics - Obiekt dynamiki muzycznej
     */
    constructor(audioEngine, dynamics) {
        this.audioEngine = audioEngine;
        this.dynamics = dynamics;
        this.instruments = audioEngine.instruments;
    }
    
    /**
     * Odtwarza dźwięk fortepianu z dynamiką
     * @param {number} frequency - Częstotliwość dźwięku
     * @param {number} time - Czas rozpoczęcia (w sekundach od audioContext.currentTime)
     * @param {number} duration - Czas trwania dźwięku (w sekundach)
     * @param {number} baseVelocity - Bazowa dynamika (0-1)
     * @param {Object} options - Dodatkowe opcje odtwarzania
     * @returns {Object} Obiekt dźwięku pianina
     */
    playPiano(frequency, time, duration, baseVelocity = 0.7, options = {}) {
        const velocity = this.dynamics.transformVelocity(baseVelocity, options);
        return this.instruments.piano.play(frequency, time, duration, velocity);
    }
    
    /**
     * Odtwarza akord fortepianu z dynamiką
     * @param {Array} frequencies - Tablica częstotliwości dźwięków akordu
     * @param {number} time - Czas rozpoczęcia
     * @param {number} duration - Czas trwania dźwięku
     * @param {number} baseVelocity - Bazowa dynamika (0-1)
     * @param {Object} options - Dodatkowe opcje odtwarzania
     * @returns {Object} Obiekt akordu pianina
     */
    playPianoChord(frequencies, time, duration, baseVelocity = 0.7, options = {}) {
        const velocity = this.dynamics.transformVelocity(baseVelocity, options);
        return this.instruments.piano.playChord(frequencies, time, duration, velocity);
    }
    
    /**
     * Odtwarza dźwięk basu z dynamiką
     * @param {number} frequency - Częstotliwość dźwięku
     * @param {number} time - Czas rozpoczęcia
     * @param {number} duration - Czas trwania dźwięku
     * @param {number} baseVelocity - Bazowa dynamika (0-1)
     * @param {Object} options - Dodatkowe opcje odtwarzania
     * @returns {Object} Obiekt dźwięku basu
     */
    playBass(frequency, time, duration, baseVelocity = 0.8, options = {}) {
        const velocity = this.dynamics.transformVelocity(baseVelocity, options);
        return this.instruments.bass.play(frequency, time, duration, velocity);
    }
    
    /**
     * Odtwarza dźwięk trąbki z dynamiką
     * @param {number} frequency - Częstotliwość dźwięku
     * @param {number} time - Czas rozpoczęcia
     * @param {number} duration - Czas trwania dźwięku
     * @param {number} baseVelocity - Bazowa dynamika (0-1)
     * @param {Object} options - Dodatkowe opcje odtwarzania
     * @returns {Object} Obiekt dźwięku trąbki
     */
    playTrumpet(frequency, time, duration, baseVelocity = 0.6, options = {}) {
        const velocity = this.dynamics.transformVelocity(baseVelocity, options);
        
        // Dodatkowe parametry ekspresji dla trąbki
        const expressiveness = this.dynamics.expressiveness;
        const trumpetOptions = {
            ...options,
            vibrato: true,
            vibratoDepth: 3 + (expressiveness * 5),
            vibratoRate: 4 + (expressiveness * 3),
            vibratoDelay: duration > 1 ? 0.3 : 0.2,
            expressiveness: expressiveness
        };
        
        return this.instruments.trumpet.play(frequency, time, duration, velocity, trumpetOptions);
    }
    
    /**
     * Odtwarza uderzenie stopy perkusyjnej z dynamiką
     * @param {number} time - Czas rozpoczęcia
     * @param {number} baseVelocity - Bazowa dynamika (0-1)
     * @param {Object} options - Dodatkowe opcje odtwarzania
     * @returns {Object} Obiekt dźwięku stopy
     */
    playKick(time, baseVelocity = 0.8, options = {}) {
        const velocity = this.dynamics.transformVelocity(baseVelocity, options);
        return this.instruments.drums.playKick(time, velocity, options);
    }
    
    /**
     * Odtwarza uderzenie werbla z dynamiką
     * @param {number} time - Czas rozpoczęcia
     * @param {number} baseVelocity - Bazowa dynamika (0-1)
     * @param {Object} options - Dodatkowe opcje odtwarzania
     * @returns {Object} Obiekt dźwięku werbla
     */
    playSnare(time, baseVelocity = 0.7, options = {}) {
        const velocity = this.dynamics.transformVelocity(baseVelocity, options);
        return this.instruments.drums.playSnare(time, velocity, options);
    }
    
    /**
     * Odtwarza uderzenie hi-hatu z dynamiką
     * @param {number} time - Czas rozpoczęcia
     * @param {number} baseVelocity - Bazowa dynamika (0-1)
     * @param {boolean} open - Czy hi-hat otwarty
     * @param {Object} options - Dodatkowe opcje odtwarzania
     * @returns {Object} Obiekt dźwięku hi-hatu
     */
    playHiHat(time, baseVelocity = 0.6, open = false, options = {}) {
        const velocity = this.dynamics.transformVelocity(baseVelocity, options);
        return this.instruments.drums.playHiHat(time, velocity, open, options);
    }
}

/**
 * Tworzy kompletny system dynamicznego miksu i odtwarzania
 * @param {Object} audioEngine - Obiekt silnika audio
 * @returns {Object} System dynamicznego miksu
 */
export function createDynamicMixingSystem(audioEngine) {
    // Tworzymy obiekt dynamiki muzycznej
    const dynamics = new MusicalDynamics();
    
    // Tworzymy mikser dynamiczny
    const mixer = new DynamicMixer(audioEngine);
    
    // Tworzymy dynamiczny odtwarzacz
    const player = new DynamicPlayer(audioEngine, dynamics);
    
    return {
        mixer,
        dynamics,
        player,
        
        // Ustawia nastrój muzyczny
        setMood: function(mood) {
            mixer.setMixForMood(mood);
        },
        
        // Ustawia styl muzyczny
        setStyle: function(style) {
            mixer.setMixForStyle(style);
        },
        
        // Ustawia poziom dynamiki
        setDynamicLevel: function(level) {
            dynamics.setDynamicLevel(level);
        },
        
        // Ustawia ekspresyjność
        setExpressiveness: function(value) {
            dynamics.setExpressiveness(value);
        },
        
        // Tworzy efekt narastania
        createBuildUp: function(duration, intensity) {
            mixer.createBuildUp(duration, intensity);
        },
        
        // Tworzy efekt wyciszenia
        createDrop: function(duration, intensity) {
            mixer.createDrop(duration, intensity);
        },
        
        // Aktywuje automatyczną modulację miksu
        startAutomation: function(updateInterval) {
            mixer.startAutomation(updateInterval);
        },
        
        // Zatrzymuje automatyczną modulację miksu
        stopAutomation: function() {
            mixer.stopAutomation();
        }
    };
}