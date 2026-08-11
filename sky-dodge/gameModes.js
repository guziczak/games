// Game Modes and Special Abilities
document.addEventListener('DOMContentLoaded', function() {
    const modeTimers = new Map();
    const modeTimeouts = new Set();
    const frogPipeReleaseGrace = 650;
    const STORK_GRAB_MIN_ENERGY = 18;
    const STORK_GRAB_START_COST = 8;
    const STORK_GRAB_MIN_PIPE_HEIGHT = 50;
    const STORK_GRAB_POINTER_SLOP = 24;
    const STORK_GRAB_KEYBOARD_SPEED = 240;
    const storkGrabKeys = { up: false, down: false };
    let storkGrabPointerOffsetY = 0;
    let storkGrabTravelDistance = 0;
    let storkGrabInputKind = '';
    let lastStorkGrabDeniedAt = -Infinity;
    let lastStorkGrabUiSignature = '';

    // Every delayed mode effect belongs to the session that created it. This
    // local wrapper intentionally shadows window.setTimeout for this module.
    function setTimeout(callback, delay, ...args) {
        const generation = window.SkyDodge && window.SkyDodge.state
            ? window.SkyDodge.state.session.generation
            : null;
        let handle = null;
        handle = window.setTimeout(() => {
            modeTimeouts.delete(handle);
            const currentGeneration = window.SkyDodge && window.SkyDodge.state
                ? window.SkyDodge.state.session.generation
                : null;
            if (generation !== null && generation !== currentGeneration) return;
            callback(...args);
        }, delay);
        modeTimeouts.add(handle);
        return handle;
    }

    function machineCanEnter(mode, options = {}) {
        const machine = window.SkyDodge && window.SkyDodge.modeMachine;
        return !machine || typeof machine.canActivate !== 'function' || machine.canActivate(mode, options);
    }

    function machineEnter(mode, options = {}) {
        const machine = window.SkyDodge && window.SkyDodge.modeMachine;
        if (!machine || typeof machine.activate !== 'function') return true;
        return machine.activate(mode, options) !== false;
    }

    function machineLeave(mode) {
        const machine = window.SkyDodge && window.SkyDodge.modeMachine;
        if (machine && typeof machine.deactivate === 'function') machine.deactivate(mode);
    }

    function releaseStorkPipeIfHeld(pipe, reason) {
        if (pipe && pipe === window.storkGrabbedPipe
            && typeof window.releaseStorkPipeGrab === 'function') {
            window.releaseStorkPipeGrab(reason || 'pipe-removed');
        }
    }

    function scheduleModeTimer(key, callback, delay) {
        if (modeTimers.has(key)) clearTimeout(modeTimers.get(key));
        const generation = window.SkyDodge && window.SkyDodge.state
            ? window.SkyDodge.state.session.generation
            : null;
        const handle = setTimeout(() => {
            modeTimers.delete(key);
            const currentGeneration = window.SkyDodge && window.SkyDodge.state
                ? window.SkyDodge.state.session.generation
                : null;
            if (!gameRunning || (generation !== null && generation !== currentGeneration)) return;
            callback();
        }, delay);
        modeTimers.set(key, handle);
        return handle;
    }

    window.clearModeTimers = function() {
        modeTimers.forEach(handle => clearTimeout(handle));
        modeTimers.clear();
        modeTimeouts.forEach(handle => window.clearTimeout(handle));
        modeTimeouts.clear();
    };

    window.resetModePresentation = function() {
        window.clearModeTimers();

        if (typeof window.resetStorkPipeGrab === 'function') {
            window.resetStorkPipeGrab({ reason: 'presentation-reset', silent: true });
        }

        gameArea.removeEventListener('mousedown', window.startRubberDrag);
        gameArea.removeEventListener('touchstart', window.startRubberDrag);
        gameArea.removeEventListener('mousemove', window.moveRubberDrag);
        gameArea.removeEventListener('touchmove', window.moveRubberDrag);
        gameArea.removeEventListener('mouseup', window.endRubberDrag);
        gameArea.removeEventListener('touchend', window.endRubberDrag);
        gameArea.removeEventListener('mouseleave', window.endRubberDrag);
        gameArea.removeEventListener('touchcancel', window.endRubberDrag);

        if (frogComplaintTimeout) {
            clearTimeout(frogComplaintTimeout);
            frogComplaintTimeout = null;
        }

        bird.querySelectorAll(
            '.frog-head, .frog-belly, .frog-eye, .frog-front-leg, .frog-back-thigh, .wings, .cap'
        ).forEach(element => element.remove());
        bird.classList.remove(
            'charging', 'jumping', 'overloaded', 'rubber-mode', 'rubber-stretching',
            'rubber-launched', 'rubber-extreme-stretch', 'rubber-phasing',
            'frog-clinging', 'ghost-mode', 'ghost-floating', 'ghost-transparent',
            'steel-mode', 'metal-sheen', 'impervious', 'stork-mode', 'stork-flying',
            'transforming-back'
        );
        bird.style.animation = '';
        bird.style.background = '';
        bird.style.borderRadius = '';
        bird.style.boxShadow = '';
        bird.style.filter = '';
        bird.style.border = '';
        bird.style.opacity = '';
        bird.style.transition = '';
        bird.style.transform = '';
        if (bird.dataset) {
            delete bird.dataset.clingingSurface;
            delete bird.dataset.clingingNormalX;
            delete bird.dataset.clingingNormalY;
            delete bird.dataset.clingingPipeId;
            delete bird.dataset.releasedPipeId;
            delete bird.dataset.clingReleaseUntil;
        }

        const jetpackFlames = bird.querySelector('.jetpack-flames');
        if (jetpackFlames) {
            jetpackFlames.style.display = '';
            jetpackFlames.classList.remove('active');
        }

        gameArea.classList.remove(
            'frog-mode-active', 'ghost-mode-active', 'stork-mode-active',
            'frog-scroll-locked', 'screen-shake', 'ghost-filter', 'rubber-filter',
            'stork-grab-ready', 'stork-grab-active', 'stork-grab-cooldown'
        );
        gameArea.querySelectorAll(
            '.coinPop, .frog-complaint-bubble, .frog-midair-notice, .rubber-effect, '
            + '.bounce-effect, .rubber-energy-burst, .rubber-bounce-effect, '
            + '.rubber-phase-particle, .rubber-stretch-particle, .steel-flash, '
            + '.steel-sparkle, .steel-debris, .steel-explosion, #rubber-drag-line, '
            + '#max-stretch-notice'
        ).forEach(element => element.remove());

        for (const id of [
            'frogJumpChargeIndicator', 'frogOverloadIndicator', 'rubberModeIndicator',
            'frogModeTimer', 'ghostModeTimer', 'storkModeTimer'
        ]) {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        }

        const machine = window.SkyDodge && window.SkyDodge.modeMachine;
        if (machine) machine.reset({ reason: 'presentation-reset' });
        if (typeof window.applyModePhysics === 'function') window.applyModePhysics();
    };

    window.applyModePhysics = function() {
        gravity = normalGravity;
        jump = normalJump;
        currentPipeSpeed = pipeSpeed;
        invincible = false;

        if (frogModeActive) {
            gravity = frogGravity;
            jump = frogJump;
            currentPipeSpeed = pipeSpeed * frogSpeedMultiplier;
            invincible = true;
        }
        if (storkModeActive) {
            gravity = normalGravity * 0.78;
            jump = normalJump * 1.05;
            currentPipeSpeed = pipeSpeed * 1.25;
            invincible = true;
        }
        if (ghostModeActive) invincible = true;
        if (steelModeActive) {
            gravity = normalGravity * 1.1;
            jump = normalJump * 1.2;
            invincible = true;
        }
        if (rubberModeActive) {
            gravity = 0.4;
            jump = normalJump * 1.2;
            invincible = true;
        }
    };

    function launchFrogFromSurface(power) {
        const surface = bird.dataset ? bird.dataset.clingingSurface : '';
        const normalX = bird.dataset ? Number(bird.dataset.clingingNormalX || 0) : 0;
        const clingingPipeId = bird.dataset ? bird.dataset.clingingPipeId : '';
        let launchVelocity = Number(power);
        if (!Number.isFinite(launchVelocity)) launchVelocity = frogJumpMinPower;

        // A frog attached underneath a pipe or to the ceiling must launch
        // downwards; otherwise the next collision frame would glue it back.
        if (surface === 'ceiling' || surface === 'pipe-bottom') {
            launchVelocity = Math.abs(launchVelocity);
        } else {
            launchVelocity = -Math.abs(launchVelocity);
        }

        // The game has no permanent horizontal velocity outside rubber mode.
        // Give side jumps a small positional kick away from the contacted pipe,
        // then let the usual vertical arc take over.
        if (normalX && gameArea.clientWidth > 0) {
            const birdRect = bird.getBoundingClientRect();
            const areaRect = gameArea.getBoundingClientRect();
            const kick = Math.max(16, Math.min(34, gameArea.clientWidth * 0.035));
            const safeInset = 4;
            const maxLeft = Math.max(safeInset, gameArea.clientWidth - birdRect.width - safeInset);
            const localLeft = Math.max(
                safeInset,
                Math.min(maxLeft, birdRect.left - areaRect.left + normalX * kick)
            );
            birdHorizontalPosition = (localLeft / gameArea.clientWidth) * 100;
            bird.style.left = `${birdHorizontalPosition}%`;
            launchVelocity *= 0.8;
        }

        velocity = launchVelocity;
        frogIsOnGround = false;
        bird.classList.remove('frog-clinging');
        if (bird.dataset) {
            if (clingingPipeId) {
                bird.dataset.releasedPipeId = clingingPipeId;
                bird.dataset.clingReleaseUntil = String(performance.now() + frogPipeReleaseGrace);
            }
            delete bird.dataset.clingingSurface;
            delete bird.dataset.clingingNormalX;
            delete bird.dataset.clingingNormalY;
            delete bird.dataset.clingingPipeId;
        }
    }

    // Funkcje TRYB FROGA
    window.activateFrogMode = function(event, freeActivation = false) {
        if (event) {
            event.preventDefault(); // Zapobiega propagacji zdarzeń dotyku
            event.stopPropagation();
        }
        
        if (!gameRunning || frogModeActive || (frogModeCooldown > 0 && !freeActivation)) return false;
        if (!machineCanEnter('frog', { freeActivation })) return false;
        
        // Sprawdź czy gracz ma wystarczającą ilość monet
        const normalCoins = coinScore / coinValue;
        const purpleCoins = purpleCoinScore / purpleCoinValue;
        
        if (freeActivation || (normalCoins >= normalFrogModeCost && purpleCoins >= purpleFrogModeCost)) {
            if (!machineEnter('frog', { freeActivation })) return false;
            // Odejmij koszt
            if (!freeActivation) {
                coinScore -= normalFrogModeCost * coinValue;
                purpleCoinScore -= purpleFrogModeCost * purpleCoinValue;
            }
            
            // Aktualizuj wyświetlanie monet
            bonusScoreElement.textContent = `Monety: ${coinScore / coinValue}`;
            purpleCoinScoreElement.textContent = `Super monety: ${purpleCoinScore / purpleCoinValue}`;
            
            // Aktywuj TRYB FROGA
            frogModeActive = true;
            frogModeTime = frogModeDuration;
            
            // Zresetuj zmienne skoku żaby
            frogIsCharging = false;
            frogChargeStart = 0;
            const activationBirdRect = bird.getBoundingClientRect();
            const activationGroundRect = ground.getBoundingClientRect();
            frogIsOnGround = activationBirdRect.bottom >= activationGroundRect.top - 6;
            
            // Inicjalizuj wskaźnik ładowania skoku
            frogChargeIndicator = document.getElementById('frogJumpChargeIndicator');
            
            // Zastosuj klasę CSS na gameArea dla transformacji wizualnej
            gameArea.classList.add('frog-mode-active');
            
            // ====== ANATOMICZNIE POPRAWNA ŻABA Z PRAWIDŁOWĄ STRUKTURĄ KOŃCZYN ======
            const existingElements = document.querySelector('.frog-head');
            if (!existingElements) {
                // Dodajemy głowę żaby
                const frogHead = document.createElement('div');
                frogHead.className = 'frog-head';
                bird.appendChild(frogHead);
                
                // Dodajemy brzuszek
                const frogBelly = document.createElement('div');
                frogBelly.className = 'frog-belly';
                bird.appendChild(frogBelly);
                
                // Dodajemy oko
                const frogEye = document.createElement('div');
                frogEye.className = 'frog-eye';
                bird.appendChild(frogEye);
                
                // Dodajemy źrenicę
                const frogPupil = document.createElement('div');
                frogPupil.className = 'frog-pupil';
                frogEye.appendChild(frogPupil);
                
                // Przednia noga - anatomicznie poprawna
                const frontLeg = document.createElement('div');
                frontLeg.className = 'frog-front-leg';
                bird.appendChild(frontLeg);
                
                // Stopa przedniej nogi
                const frontFoot = document.createElement('div');
                frontFoot.className = 'frog-front-foot';
                frontLeg.appendChild(frontFoot);
                
                // Tylna noga (udo) - pierwsza część Z-kształtu
                const backThigh = document.createElement('div');
                backThigh.className = 'frog-back-thigh';
                bird.appendChild(backThigh);
                
                // Tylna łydka - druga część Z-kształtu
                const backShin = document.createElement('div');
                backShin.className = 'frog-back-shin';
                backThigh.appendChild(backShin);
                
                // Tylna stopa
                const backFoot = document.createElement('div');
                backFoot.className = 'frog-back-foot';
                backShin.appendChild(backFoot);
            }
            
            // Reset animacji i ukrycie jetpacka
            bird.style.animation = 'none';
            void bird.offsetWidth; 
            bird.style.animation = '';
            
            // Upewniamy się, że jetpack jest ukryty
            const jetpackFlames = bird.querySelector('.jetpack-flames');
            if (jetpackFlames) {
                jetpackFlames.style.display = 'none';
            }
            
            frogModeTimer.style.display = 'block';
            frogModeTimer.textContent = `TRYB FROGA: ${frogModeDuration}s`;
            frogModeButton.disabled = true;
            
            // Sprawdź, czy pokazać przycisk trybu bociana
            if (frogCoinScore >= frogStorkModeCost * frogCoinValue && 
                coinScore >= normalStorkModeCost * coinValue && 
                purpleCoinScore >= purpleStorkModeCost * purpleCoinValue) {
                storkModeButton.style.display = 'flex';
                updateStorkModeButton();
            }
            
            // Zmień parametry gry i dodaj nieśmiertelność
            applyModePhysics();
            
            // Efekt dźwiękowy
            playSound('frogMode');
            
            // Pokaż efekt aktywacji
            const frogActivation = document.createElement('div');
            frogActivation.className = 'coinPop purpleCoinPop';
            frogActivation.textContent = 'TRYB FROGA!\nNIEŚMIERTELNOŚĆ!';
            frogActivation.style.left = '50%';
            frogActivation.style.top = '50%';
            frogActivation.style.transform = 'translate(-50%, -50%) scale(2)';
            frogActivation.style.whiteSpace = 'pre';
            frogActivation.style.textAlign = 'center';
            gameArea.appendChild(frogActivation);
            
            setTimeout(() => {
                if (frogActivation && frogActivation.parentNode) {
                    gameArea.removeChild(frogActivation);
                }
            }, 1500);
            return true;
        }
        return false;
    }
    
    window.deactivateFrogMode = function(options = {}) {
        if (!frogModeActive) return;
        
        console.log("Deaktywacja trybu żaby - rozpoczęcie czyszczenia");
        
        frogModeActive = false;
        frogModeTime = 0;
        machineLeave('frog');
        
        // Resetuj stan przeładowania
        frogIsOverloaded = false;
        frogOverloadBounceCount = 0;
        frogIsCharging = false;
        
        // Upewnij się, że wskaźnik ładowania i przeładowania są ukryte
        const chargeBar = document.getElementById('frogJumpChargeBar');
        if (chargeBar) {
            chargeBar.style.width = '0%';
        }
        
        // Zatrzymaj wszelkie trwające animacje
        if (bird.frogJumpAnimation) {
            cancelAnimationFrame(bird.frogJumpAnimation);
            bird.frogJumpAnimation = null;
        }
        
        // Ukryj wskaźnik przeładowania
        const overloadIndicator = document.getElementById('frogOverloadIndicator');
        if (overloadIndicator) {
            overloadIndicator.style.display = 'none';
        }
        
        // Ukryj wskaźnik ładowania skoku
        if (frogChargeIndicator) {
            frogChargeIndicator.style.display = 'none';
            const frogChargeBar = document.getElementById('frogJumpChargeBar');
            if (frogChargeBar) {
                frogChargeBar.style.width = '0%';
                // Zatrzymaj wszystkie animacje na pasku ładowania
                frogChargeBar.style.animation = 'none';
            }
        }
        
        // Resetuj stan wskaźnika ładowania
        frogChargeIndicator = null;
        
        // Wyczyść timeout narzekań
        if (frogComplaintTimeout) {
            clearTimeout(frogComplaintTimeout);
            frogComplaintTimeout = null;
        }
        
        // Dodaj przejściową klasę dla efektu transformacji
        bird.classList.add('transforming-back');
        
        // Usuń klasę frog-mode-active
        gameArea.classList.remove('frog-mode-active');
        
        frogModeTimer.style.display = 'none';
        
        applyModePhysics();
        
        // Usuń wszystkie dymki z narzekaniami, które mogły zostać
        const complaintBubbles = document.querySelectorAll('.frog-complaint-bubble');
        complaintBubbles.forEach(bubble => {
            if (bubble && bubble.parentNode) {
                bubble.parentNode.removeChild(bubble);
            }
        });
        
        // Dokładnie usuń wszystkie elementy żaby - teraz jeszcze dokładniej
        const frogElements = bird.querySelectorAll('.frog-head, .frog-belly, .frog-eye, .frog-front-leg, .frog-back-thigh');
        console.log(`Znaleziono ${frogElements.length} elementów żaby do usunięcia`);
        
        frogElements.forEach(element => {
            if (element && element.parentNode === bird) {
                try {
                    // Zatrzymaj wszystkie animacje na tym elemencie
                    element.style.animation = 'none';
                    
                    // Usuwamy najpierw wszystkie dzieci elementu
                    const children = element.querySelectorAll('*');
                    children.forEach(child => {
                        if (child && child.parentNode === element) {
                            try {
                                // Zatrzymaj animacje na dziecku
                                child.style.animation = 'none';
                                
                                // Rekurencyjnie usuwamy dzieci dzieci (np. stopa w łydce)
                                const grandchildren = child.querySelectorAll('*');
                                grandchildren.forEach(grandchild => {
                                    if (grandchild && grandchild.parentNode === child) {
                                        // Zatrzymaj animacje na wnuku
                                        grandchild.style.animation = 'none';
                                        try {
                                            child.removeChild(grandchild);
                                        } catch (e) {
                                            console.error("Błąd podczas usuwania wnuka elementu żaby:", e);
                                        }
                                    }
                                });
                                element.removeChild(child);
                            } catch (e) {
                                console.error("Błąd podczas usuwania dziecka elementu żaby:", e);
                            }
                        }
                    });
                    
                    // Potem usuwamy sam element
                    bird.removeChild(element);
                } catch (e) {
                    console.error("Błąd podczas usuwania elementu żaby:", e);
                }
            }
        });
        
        // Usuń dodatkowe klasy
        bird.classList.remove('charging', 'jumping', 'overloaded', 'rubber-mode', 'frog-clinging');
        if (bird.dataset) {
            delete bird.dataset.clingingSurface;
            delete bird.dataset.clingingNormalX;
            delete bird.dataset.clingingNormalY;
            delete bird.dataset.clingingPipeId;
            delete bird.dataset.releasedPipeId;
            delete bird.dataset.clingReleaseUntil;
        }
        
        // Przywróć widoczność jetpacka
        const jetpackFlames = bird.querySelector('.jetpack-flames');
        if (jetpackFlames) {
            jetpackFlames.style.display = '';
        }
        
        // Upewnij się, że wszystkie klasy są usunięte także z elementu gameArea
        gameArea.classList.remove('frog-mode-active', 'frog-scroll-locked', 'screen-shake');
        storkModeButton.style.display = 'none';
        storkModeButton.disabled = true;
        
        // Pokaż komunikat o końcu trybu żaby i przejściu do trybu stali
        if (!options.silent) {
            const endModeMsg = document.createElement('div');
            endModeMsg.className = 'coinPop';
            endModeMsg.textContent = 'Koniec trybu froga!';
            endModeMsg.style.left = '50%';
            endModeMsg.style.top = '40%';
            endModeMsg.style.transform = 'translate(-50%, -50%)';
            endModeMsg.style.color = 'red';
            endModeMsg.style.fontSize = '24px';
            gameArea.appendChild(endModeMsg);
            
            setTimeout(() => {
                if (endModeMsg.parentNode) gameArea.removeChild(endModeMsg);
            }, 1500);
        }
        
        // Ustaw cooldown
        frogModeCooldown = frogModeCooldownTime;
        frogModeButton.disabled = true;
        
        setTimeout(() => {
            updateFrogModeButton();
        }, 500);
        
        console.log("Deaktywacja trybu żaby - zakończono czyszczenie");
        
        // Aktywuj tryb stali jako przejściowy między żabą a duchem
        if (!options.skipNext) activateSteelMode({ source: 'frog-chain', force: true });
    }
    
    window.updateFrogModeButton = function() {
        if (!gameRunning) return;
        
        const normalCoins = coinScore / coinValue;
        const purpleCoins = purpleCoinScore / purpleCoinValue;
        const hasEnoughCoins = normalCoins >= normalFrogModeCost && purpleCoins >= purpleFrogModeCost;
        
        if (frogModeActive) {
            frogModeButton.disabled = true;
            frogModeButton.querySelector('.mode-button-cost').textContent = 'AKTYWNY!';
        } else if (!machineCanEnter('frog')) {
            frogModeButton.disabled = true;
            frogModeButton.querySelector('.mode-button-cost').textContent = 'ZAJĘTY';
        } else if (frogModeCooldown > 0) {
            frogModeButton.disabled = true;
            frogModeButton.querySelector('.mode-button-cost').textContent = `${Math.ceil(frogModeCooldown)}s`;
        } else if (hasEnoughCoins) {
            frogModeButton.disabled = false;
            frogModeButton.querySelector('.mode-button-cost').textContent = `${normalFrogModeCost}🟡 ${purpleFrogModeCost}🟣`;
        } else {
            frogModeButton.disabled = true;
            frogModeButton.querySelector('.mode-button-cost').textContent = `${normalFrogModeCost}🟡 ${purpleFrogModeCost}🟣`;
        }
    }
    
    window.startFrogCharging = function() {
        console.log("Próba ładowania skoku żaby:", {
            gameRunning,
            frogModeActive,
            frogIsOnGround,
            frogIsCharging,
            frogChargeIndicator: Boolean(frogChargeIndicator)
        });
    
        // Zawsze inicjalizuj wskaźnik ładowania, na wszelki wypadek
        if (!frogChargeIndicator) {
            frogChargeIndicator = document.getElementById('frogJumpChargeIndicator');
        }
    
        if (gameRunning && frogModeActive && frogIsOnGround && !frogIsCharging) {
            frogIsCharging = true;
            frogChargeStart = performance.now();
            
            console.log("Ładowanie skoku rozpoczęte!");
            
            // Pokaż wskaźnik ładowania
            if (frogChargeIndicator) {
                frogChargeIndicator.style.display = 'block';
                
                // Załaduj pasek ładowania
                const frogChargeBar = document.getElementById('frogJumpChargeBar');
                if (frogChargeBar) {
                    frogChargeBar.style.width = '0%'; // Zaczynamy od zera
                }
            } else {
                console.error("Brak wskaźnika ładowania skoku!");
            }
            
            // Subtelna animacja przygotowania do skoku
            bird.classList.add('charging');
            
            // Efekt dźwiękowy ładowania
            playSound('jump'); // Możesz stworzyć nowy dźwięk ładowania
        }
    }
    
    window.stopFrogCharging = function() {
        console.log("Próba zatrzymania ładowania skoku:", {
            gameRunning,
            frogModeActive,
            frogIsCharging,
            frogIsOnGround,
            chargeTime: frogChargeStart ? performance.now() - frogChargeStart : 0
        });
        
        // Bardziej liberalne warunki
        if (gameRunning && frogModeActive) {
            if (!frogIsCharging) {
                console.log("Ładowanie nie było aktywne");
                // Jeśli ładowanie nie było aktywne, sprawdź czy żaba jest na ziemi
                if (frogIsOnGround) {
                    launchFrogFromSurface(frogJumpMinPower);
                    playSound('jump');
                }
                return;
            }
            
            // Oblicz czas ładowania
            const chargeTime = performance.now() - frogChargeStart;
            console.log("Czas ładowania:", chargeTime, "ms, próg:", frogOverloadThreshold);
            
            // Sprawdź czy przekroczono próg przeładowania
            const isOverloaded = chargeTime > frogOverloadThreshold;
            
            // Tutaj sprawdzamy czy żaba jest na ziemi lub blisko ziemi - dla lepszego UX
            // Dodajemy mały bufor tolerancji, aby skok działał nawet gdy żaba jest lekko nad ziemią
            const birdRect = bird.getBoundingClientRect();
            const groundRect = ground.getBoundingClientRect();
            const distanceToGround = groundRect.top - birdRect.bottom;
            
            // Pozwól na skok, jeśli żaba jest na ziemi lub do 10px nad ziemią
            const canJump = frogIsOnGround || distanceToGround < 10;
            
            // Debug info
            console.log("Możliwość skoku:", {canJump, frogIsOnGround, distanceToGround});
            
            if (canJump) {
                let launchPower;
                if (isOverloaded) {
                    console.log("Przeładowanie!!!");
                    // Jest przeładowanie!
                    frogIsOverloaded = true;
                    
                    // Pokaż wskaźnik przeładowania
                    const overloadIndicator = document.getElementById('frogOverloadIndicator');
                    if (overloadIndicator) {
                        overloadIndicator.style.display = 'flex';
                    }
                    
                    // Dodaj klasę przeładowania żaby
                    bird.classList.add('overloaded');
                    
                    // Pokaż narzekanie żaby
                    showFrogComplaint();
                    
                    // Jeszcze większa szansa na aktywację trybu kauczuka przy przeładowaniu (50% zamiast wcześniejszych wartości)
                    if (Math.random() < frogRubberModeChance) {
                        console.log("TRYB KAUCZUKA AKTYWOWANY!");
                        activateRubberMode();
                    }
                    
                    // Nadaj ekstremalną siłę skoku
                    launchPower = frogJumpMaxPower * 1.5;
                    
                    // Ustaw liczbę odbić
                    frogOverloadBounceCount = frogMaxBounces;
                } else {
                    // Normalne ładowanie - zastosuj proporcjonalną siłę skoku
                    const chargePercent = Math.min(chargeTime / frogChargeMax, 1.0);
                    const jumpPower = frogJumpMinPower + (frogJumpMaxPower - frogJumpMinPower) * chargePercent;
                    launchPower = jumpPower;
                    console.log("Normalny skok z mocą:", jumpPower, "(", chargePercent * 100, "%)");
                }
                launchFrogFromSurface(launchPower);
                if (window.SkyDodge && window.SkyDodge.mutations) {
                    window.SkyDodge.mutations.record('jump', isOverloaded ? 10 : 3);
                }
            } else {
                console.log("Żaba nie jest na ziemi - nie może skoczyć!");
                
                // Dodaj wizualne powiadomienie gdy żaba próbuje skoczyć w powietrzu
                const midairJumpIndicator = document.createElement('div');
                midairJumpIndicator.className = 'frog-midair-notice';
                midairJumpIndicator.textContent = 'Nie mogę skakać w powietrzu!';
                
                // Pozycjonowanie względem żaby
                const birdRect = bird.getBoundingClientRect();
                midairJumpIndicator.style.left = (birdRect.left + birdRect.width / 2) + 'px';
                midairJumpIndicator.style.top = (birdRect.top - 30) + 'px';
                
                // Dodaj do gry
                gameArea.appendChild(midairJumpIndicator);
                
                // Dodaj subtelny efekt "drżenia" żaby by pokazać nieudaną próbę
                bird.classList.add('frog-midair-attempt');
                setTimeout(() => {
                    bird.classList.remove('frog-midair-attempt');
                }, 400);
                
                // Usuń powiadomienie po krótkim czasie
                setTimeout(() => {
                    if (midairJumpIndicator.parentNode) {
                        midairJumpIndicator.style.opacity = '0';
                        setTimeout(() => {
                            if (midairJumpIndicator.parentNode) {
                                gameArea.removeChild(midairJumpIndicator);
                            }
                        }, 300);
                    }
                }, 1500);
            }
            
            // Ukryj wskaźnik ładowania
            if (frogChargeIndicator) {
                frogChargeIndicator.style.display = 'none';
                const frogChargeBar = document.getElementById('frogJumpChargeBar');
                if (frogChargeBar) {
                    frogChargeBar.style.width = '0%';
                }
            }
            
            // Przestań ładować
            frogIsCharging = false;
            
            // Dźwięk skoku dla żaby
            playSound('jump');
            
            // ====== ANATOMICZNIE POPRAWNA ANIMACJA SKOKU ŻABY ======
            bird.classList.remove('charging');
            bird.classList.add('jumping');
            
            // Resetujemy i uruchamiamy animacje wszystkich części anatomicznych
            const frontLeg = bird.querySelector('.frog-front-leg');
            const frontFoot = frontLeg ? frontLeg.querySelector('.frog-front-foot') : null;
            const backThigh = bird.querySelector('.frog-back-thigh');
            const backShin = backThigh ? backThigh.querySelector('.frog-back-shin') : null;
            const backFoot = backShin ? backShin.querySelector('.frog-back-foot') : null;
            
            // Reset wszystkich animacji dla płynnego efektu
            if (frontLeg) {
                frontLeg.style.animation = 'none';
                void frontLeg.offsetWidth; // Trigger reflow
                frontLeg.style.animation = 'anatomicalFrontLegJump 0.65s ease-in-out';
            }
            
            if (frontFoot) {
                frontFoot.style.animation = 'none';
                void frontFoot.offsetWidth;
                frontFoot.style.animation = 'anatomicalFrontFootJump 0.65s ease-in-out';
            }
            
            if (backThigh) {
                backThigh.style.animation = 'none';
                void backThigh.offsetWidth;
                backThigh.style.animation = 'anatomicalBackThighJump 0.65s ease-in-out';
            }
            
            if (backShin) {
                backShin.style.animation = 'none';
                void backShin.offsetWidth;
                backShin.style.animation = 'anatomicalBackShinJump 0.65s ease-in-out';
            }
            
            if (backFoot) {
                backFoot.style.animation = 'none';
                void backFoot.offsetWidth;
                backFoot.style.animation = 'anatomicalBackFootJump 0.65s ease-in-out';
            }
            
            // Usuń klasę po zakończeniu animacji
            setTimeout(() => {
                bird.classList.remove('jumping');
            }, 600);
        }
    }
    
    // Funkcja aktywująca tryb stali
    window.activateSteelMode = function(options = {}) {
        if (steelModeActive || frogModeActive || rubberModeActive || ghostModeActive || storkModeActive) return false;
        if (!machineCanEnter('steel', options) || !machineEnter('steel', options)) return false;
        
        steelModeActive = true;
        applyModePhysics();
        
        // Usuń wszystkie elementy żaby podobnie jak w deactivateFrogMode
        // ale zamiast zmieniać na kaczorka, zmieniamy na stalowego ptaka
        const frogElements = bird.querySelectorAll('.frog-head, .frog-belly, .frog-eye, .frog-front-leg, .frog-back-thigh');
        frogElements.forEach(element => {
            if (element.parentNode === bird) {
                const children = element.querySelectorAll('*');
                children.forEach(child => {
                    if (child.parentNode === element) {
                        const grandchildren = child.querySelectorAll('*');
                        grandchildren.forEach(grandchild => {
                            if (grandchild.parentNode === child) {
                                child.removeChild(grandchild);
                            }
                        });
                        element.removeChild(child);
                    }
                });
                bird.removeChild(element);
            }
        });
        
        // Usuń klasy związane z żabą
        gameArea.classList.remove('frog-mode-active');
        bird.classList.remove('jumping', 'overloaded', 'charging');
        
        // Przywróć widoczność jetpacka
        const jetpackFlames = bird.querySelector('.jetpack-flames');
        if (jetpackFlames) {
            jetpackFlames.style.display = '';
        }
        
        // Zmień wygląd na stalowego ptaka - bardziej metaliczny wygląd
        bird.style.animation = 'none';
        bird.style.background = 'linear-gradient(135deg, #A9A9A9, #414549, #C0C0C0)';
        bird.style.borderRadius = '50% 50% 30% 30%';
        bird.style.boxShadow = '0 0 20px rgba(192, 192, 192, 0.9), inset 0 0 10px rgba(255, 255, 255, 0.8)';
        bird.style.filter = 'brightness(1.3) contrast(1.3)';
        bird.style.border = '1px solid #FFF';
        
        // Efekt odbicia od ziemi przy transformacji
        if (frogIsOnGround) {
            velocity = -12; // Jeszcze silniejszy impuls do góry
            playSound('jump'); // Efekt dźwiękowy
        }
        
        // WULGARNY KOMUNIKAT O TRYBIE STALI - EPICKIE OGŁOSZENIE
        
        // Najpierw błysk metaliczny na całym ekranie
        const flashEffect = document.createElement('div');
        flashEffect.className = 'steel-flash';
        flashEffect.style.position = 'absolute';
        flashEffect.style.width = '100%';
        flashEffect.style.height = '100%';
        flashEffect.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        flashEffect.style.zIndex = '1000';
        flashEffect.style.pointerEvents = 'none';
        gameArea.appendChild(flashEffect);
        
        // Mocny efekt wibracji ekranu
        gameArea.classList.add('screen-shake');
        
        // Odtwórz kilka dźwięków dla większego efektu
        playSound('storkDefeat');
        setTimeout(() => {
            playSound('jump');
        }, 100);
        
        // Usuń błysk po chwili
        setTimeout(() => {
            if (flashEffect.parentNode) {
                gameArea.removeChild(flashEffect);
            }
            gameArea.classList.remove('screen-shake');
            
            // Pokaż komunikat o trybie stali (mniejszy tekst)
            const steelMsg = document.createElement('div');
            steelMsg.className = 'coinPop purpleCoinPop';
            steelMsg.innerHTML = '<span style="font-size: 24px; font-weight: bold; color: #FF0000;">TRYB STALI</span><br><span style="font-size: 16px; color: #DDDDDD;">MIAŻDŻ RURY I ZABIJAJ BOCIANY!</span>';
            steelMsg.style.position = 'absolute';
            steelMsg.style.left = '50%';
            steelMsg.style.top = '50%';
            steelMsg.style.transform = 'translate(-50%, -50%) scale(0)';
            steelMsg.style.transition = 'transform 0.3s';
            steelMsg.style.textShadow = '0 0 10px #FF0000, 0 0 20px #FF0000';
            steelMsg.style.textAlign = 'center';
            steelMsg.style.zIndex = '1001';
            steelMsg.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            steelMsg.style.padding = '20px';
            steelMsg.style.borderRadius = '10px';
            steelMsg.style.border = '3px solid #C0C0C0';
            gameArea.appendChild(steelMsg);
            
            // Animuj tekst od małego do dużego
            setTimeout(() => {
                steelMsg.style.transform = 'translate(-50%, -50%) scale(1.2)';
                
                // Drugi silny efekt wibracji ekranu
                gameArea.classList.add('screen-shake');
                setTimeout(() => {
                    gameArea.classList.remove('screen-shake');
                    steelMsg.style.transform = 'translate(-50%, -50%) scale(1)';
                }, 200);
                
                // Dodaj metaliczne błyski wokół kaczki
                for (let i = 0; i < 8; i++) {
                    setTimeout(() => {
                        const sparkle = document.createElement('div');
                        sparkle.className = 'steel-sparkle';
                        sparkle.style.position = 'absolute';
                        sparkle.style.width = '20px';
                        sparkle.style.height = '20px';
                        sparkle.style.borderRadius = '50%';
                        sparkle.style.backgroundColor = '#FFFFFF';
                        sparkle.style.boxShadow = '0 0 20px #FFFFFF, 0 0 40px #FFFF00';
                        
                        // Randomowa pozycja wokół kaczki
                        const birdRect = bird.getBoundingClientRect();
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 40 + Math.random() * 30;
                        const x = birdRect.left + birdRect.width/2 + Math.cos(angle) * distance;
                        const y = birdRect.top + birdRect.height/2 + Math.sin(angle) * distance;
                        
                        sparkle.style.left = x + 'px';
                        sparkle.style.top = y + 'px';
                        sparkle.style.transform = 'scale(0)';
                        sparkle.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
                        gameArea.appendChild(sparkle);
                        
                        // Animuj iskrę
                        setTimeout(() => {
                            sparkle.style.transform = 'scale(1)';
                            setTimeout(() => {
                                sparkle.style.opacity = '0';
                                setTimeout(() => {
                                    if (sparkle.parentNode) {
                                        gameArea.removeChild(sparkle);
                                    }
                                }, 300);
                            }, 200);
                        }, 10);
                    }, i * 150); // Rozłóż w czasie
                }
            }, 10);
            
            // Usuń komunikat po dłuższym czasie aby był bardziej widoczny
            setTimeout(() => {
                if (steelMsg.parentNode) {
                    steelMsg.style.transform = 'translate(-50%, -50%) scale(0)';
                    setTimeout(() => {
                        if (steelMsg.parentNode) {
                            gameArea.removeChild(steelMsg);
                        }
                    }, 300);
                }
            }, 2500);
            
        }, 300);
        
        // Po określonym czasie przejdź do trybu ducha
        scheduleModeTimer('steel-transition', () => {
            deactivateSteelMode();
            if (!ghostModeActive) {
                activateGhostMode(null, true);
            }
        }, steelModeDuration * 1000);
        return true;
    }
    
    // Funkcja deaktywująca tryb stali
    window.deactivateSteelMode = function() {
        if (!steelModeActive) return;
        
        console.log("Deaktywacja trybu stali - rozpoczęcie czyszczenia");
        
        steelModeActive = false;
        machineLeave('steel');
        
        // Zatrzymaj wszelkie animacje związane z trybem stali
        if (bird.steelAnimation) {
            cancelAnimationFrame(bird.steelAnimation);
            bird.steelAnimation = null;
        }
        
        // Usuń wszystkie efekty błysków i iskier
        const steelEffects = document.querySelectorAll('.steel-flash, .steel-sparkle, .steel-debris, .steel-explosion');
        steelEffects.forEach(effect => {
            if (effect && effect.parentNode && effect !== bird) {
                effect.style.animation = 'none';
                effect.parentNode.removeChild(effect);
            }
        });
        
        // Przywróć wygląd kaczorka - ale nie odtwarzaj pełnej funkcji deactivateFrogMode
        // bo to już zostało zrobione wcześniej
        bird.style.animation = 'crazyDuck 2s infinite alternate';
        bird.style.background = 'linear-gradient(135deg, #FFFF00, #FFA500, #FFD700)';
        bird.style.borderRadius = '50% 50% 30% 30%';
        bird.style.boxShadow = '0 2px 10px rgba(255, 215, 0, 0.7)';
        bird.style.filter = 'none';
        bird.style.border = 'none'; // Usuwamy obramowanie stalowe
        
        // Usuń wszystkie klasy związane z trybem stali
        bird.classList.remove('steel-mode', 'metal-sheen', 'impervious');
        
        // Usuń efekty wibracji i inne efekty wizualne
        gameArea.classList.remove('screen-shake');
        
        applyModePhysics();
        
        // Usuń wszystkie efekty zniszczenia rur, które mogły pozostać
        const destructionEffects = document.querySelectorAll('.steel-debris, .steel-explosion');
        destructionEffects.forEach(effect => {
            if (effect && effect.parentNode) {
                effect.style.animation = 'none';
                effect.parentNode.removeChild(effect);
            }
        });
        
        // Usuń rury o destroyed=true i te, które utknęły (mogą być w nieprawidłowym stanie)
        console.log(`Sprawdzanie ${pipes.length} rur pod kątem uszkodzeń z powodu trybu stali`);
        
        for (let i = pipes.length - 1; i >= 0; i--) {
            const pipe = pipes[i];
            
            // Sprawdź, czy rura jest zniszczona lub uszkodzona
            if (pipe.destroyed || pipe.scheduledForRemoval || 
                !pipe.upPipe || !pipe.downPipe || 
                !pipe.upPipe.parentNode || !pipe.downPipe.parentNode) {
                releaseStorkPipeIfHeld(pipe, 'pipe-removed');
                
                try {
                    // Usuń elementy DOM rury, jeśli jeszcze istnieją
                    if (pipe.upPipe && pipe.upPipe.parentNode) {
                        // Zatrzymaj wszystkie animacje
                        pipe.upPipe.style.animation = 'none';
                        pipe.upPipe.style.transition = 'none';
                        gameArea.removeChild(pipe.upPipe);
                    }
                    if (pipe.downPipe && pipe.downPipe.parentNode) {
                        // Zatrzymaj wszystkie animacje
                        pipe.downPipe.style.animation = 'none';
                        pipe.downPipe.style.transition = 'none';
                        gameArea.removeChild(pipe.downPipe);
                    }
                    
                    // Usuń rurę z tablicy
                    pipes.splice(i, 1);
                    console.log("Usunięto uszkodzoną rurę");
                } catch (e) {
                    console.error("Błąd podczas usuwania uszkodzonej rury:", e);
                }
            } else {
                try {
                    // Upewnij się, że rura ma prawidłową pozycję i stylowanie
                    // (to powinno naprawić rury, które mogłyby być w nieprawidłowym stanie)
                    if (pipe.upPipe && pipe.downPipe) {
                        // Resetuj style
                        pipe.upPipe.style.left = pipe.x + 'px';
                        pipe.downPipe.style.left = pipe.x + 'px';
                        
                        // Upewnij się, że rura ma normalne stylowanie (bez efektów animacji)
                        pipe.upPipe.style.transition = '';
                        pipe.upPipe.style.transform = '';
                        pipe.upPipe.style.opacity = '1';
                        pipe.upPipe.style.animation = '';
                        
                        pipe.downPipe.style.transition = '';
                        pipe.downPipe.style.transform = '';
                        pipe.downPipe.style.opacity = '1';
                        pipe.downPipe.style.animation = '';
                    }
                } catch (e) {
                    console.error("Błąd podczas naprawiania rur:", e);
                }
            }
        }
        
        // Dodatkowe sprawdzenie po krótkim czasie, aby upewnić się, że nie ma problemów
        setTimeout(() => {
            for (let i = pipes.length - 1; i >= 0; i--) {
                try {
                    const pipe = pipes[i];
                    if (pipe.destroyed || !pipe.upPipe || !pipe.downPipe || 
                        !pipe.upPipe.parentNode || !pipe.downPipe.parentNode) {
                        releaseStorkPipeIfHeld(pipe, 'pipe-removed');
                        
                        if (pipe.upPipe && pipe.upPipe.parentNode) {
                            gameArea.removeChild(pipe.upPipe);
                        }
                        if (pipe.downPipe && pipe.downPipe.parentNode) {
                            gameArea.removeChild(pipe.downPipe);
                        }
                        pipes.splice(i, 1);
                        console.log("Usunięto dodatkową uszkodzoną rurę");
                    }
                } catch (e) {
                    console.error("Błąd podczas drugiego sprawdzenia rur:", e);
                    // W przypadku wyjątku, bezpiecznie usuń rurę
                    try {
                        releaseStorkPipeIfHeld(pipes[i], 'pipe-removal-error');
                        pipes.splice(i, 1);
                    } catch (err) {
                        console.error("Nie udało się usunąć rury z listy:", err);
                    }
                }
            }
        }, 50);
        
        // Komunikat o końcu trybu stali
        const endSteelMsg = document.createElement('div');
        endSteelMsg.className = 'coinPop';
        endSteelMsg.textContent = 'Koniec trybu stali!';
        endSteelMsg.style.left = '50%';
        endSteelMsg.style.top = '50%';
        endSteelMsg.style.transform = 'translate(-50%, -50%)';
        endSteelMsg.style.color = '#C0C0C0';
        endSteelMsg.style.fontSize = '24px';
        gameArea.appendChild(endSteelMsg);
        
        setTimeout(() => {
            if (endSteelMsg.parentNode) {
                gameArea.removeChild(endSteelMsg);
            }
        }, 1000);
        
        console.log("Deaktywacja trybu stali - zakończono czyszczenie");
    }
    
    // Funkcja aktywująca Tryb Kauczuka - z dodatkowymi ulepszeniami
    window.activateRubberMode = function(options = {}) {
        if (rubberModeActive) return false;
        if (!machineCanEnter('rubber', options) || !machineEnter('rubber', options)) return false;
        
        rubberModeActive = true;
        // Zwiększamy czas trwania dla lepszego doświadczenia
        rubberModeTime = 20; // 20 sekund to odpowiednio długo by nacieszyć się trybem
        // Ustawmy globalną dla innych części kodu
        rubberModeDuration = 20;
        
        // Dodaj klasę dla wizualnego efektu
        bird.classList.add('rubber-mode');
        
        // Inicjalizuj parametry trybu kauczuka
        window.rubberDragActive = false;
        window.rubberVelocityModifier = 0;
        window.rubberMaxVelocity = 40; // Zwiększona maksymalna prędkość dla bardziej spektakularnych efektów
        window.rubberDamping = 0.99; // Ulepszony współczynnik wytłumienia - wolniejsza utrata energii
        window.rubberBounciness = 1.3; // Zwiększony współczynnik odbicia dla bardziej spektakularnych skoków
        window.rubberStretchFactor = 1.5; // Współczynnik rozciągania wizualnego
        window.lastRubberBounceTime = 0; // Czas ostatniego odbicia
        window.rubberElasticityEffect = true; // Efekt elastyczności po odbiciu
        
        // Dodaj nasłuchiwanie zdarzeń myszy/dotyku dla efektu przeciągania
        gameArea.addEventListener('mousedown', startRubberDrag);
        gameArea.addEventListener('touchstart', startRubberDrag, { passive: false });
        gameArea.addEventListener('mousemove', moveRubberDrag);
        gameArea.addEventListener('touchmove', moveRubberDrag, { passive: false });
        gameArea.addEventListener('mouseup', endRubberDrag);
        gameArea.addEventListener('touchend', endRubberDrag);
        gameArea.addEventListener('mouseleave', endRubberDrag);
        gameArea.addEventListener('touchcancel', endRubberDrag);
        
        applyModePhysics();
        
        // Pokaż wskaźnik trybu kauczuka
        const rubberModeIndicator = document.getElementById('rubberModeIndicator');
        if (rubberModeIndicator) {
            rubberModeIndicator.style.display = 'flex';
        }
        
        // Aktualizuj timer
        const rubberModeTimer = document.getElementById('rubberModeTimer');
        if (rubberModeTimer) {
            rubberModeTimer.textContent = `${rubberModeDuration}s`;
        }
        
        // Pokaż efekt aktywacji - BARDZIEJ DRAMATYCZNY i instruktażowy
        const activationEffect = document.createElement('div');
        activationEffect.className = 'coinPop purpleCoinPop';
        activationEffect.style.color = '#FF00FF';
        activationEffect.style.fontSize = '40px';
        activationEffect.style.fontWeight = 'bold';
        activationEffect.style.textShadow = '0 0 10px #FF00FF, 0 0 20px #FF00FF';
        activationEffect.style.padding = '15px';
        activationEffect.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        activationEffect.style.borderRadius = '15px';
        activationEffect.style.border = '3px solid #FF00FF';
        activationEffect.innerHTML = 'TRYB KAUCZUKA!!!<br>🧪🧪🧪<br>' + 
            '<span style="font-size: 16px; color: #FFCCFF;">' +
            '✨ Przeciągnij, aby rozpędzić kaczora<br>' +
            '✨ Jesteś niezniszczalny!<br>' + 
            '✨ Przenikasz przez przeszkody<br>' +
            '✨ Odbijasz się od ścian i sufitu<br>' +
            '</span>';
        activationEffect.style.left = '50%';
        activationEffect.style.top = '50%';
        activationEffect.style.transform = 'translate(-50%, -50%) scale(2)';
        gameArea.appendChild(activationEffect);
        
        // Dodaj efekt wibracji do całego obszaru gry
        gameArea.classList.add('screen-shake');
        setTimeout(() => {
            gameArea.classList.remove('screen-shake');
        }, 1000);
        
        // Efekt dźwiękowy
        playSound('jump');
        
        setTimeout(() => {
            if (activationEffect.parentNode) {
                gameArea.removeChild(activationEffect);
            }
        }, 3000);
        return true;
    }
    
    // Funkcje obsługujące przeciąganie w trybie kauczuka
    window.startRubberDrag = function(event) {
        if (!rubberModeActive || rubberDragActive || event.target.closest('button, a')) return;
        if (event.touches && event.touches.length !== 1) return;
        
        // Zapobiegaj domyślnemu zachowaniu (przewijanie)
        if (event.preventDefault) event.preventDefault();
        
        console.log("Rozpoczęcie przeciągania w trybie kauczuka");
        rubberDragActive = true;
        
        // Zapisz początkowy punkt
        if (event.type === 'touchstart') {
            window.rubberDragStartY = event.touches[0].clientY;
            window.rubberDragStartX = event.touches[0].clientX;
        } else {
            window.rubberDragStartY = event.clientY;
            window.rubberDragStartX = event.clientX;
        }
        
        // Wizualny efekt rozpoczęcia przeciągania
        bird.classList.add('rubber-stretching');
        
        // Dodaj linię "gumową" pokazującą naciąg
        const existingLine = document.getElementById('rubber-drag-line');
        if (existingLine) existingLine.remove();
        const rubberLine = document.createElement('div');
        rubberLine.id = 'rubber-drag-line';
        rubberLine.style.position = 'absolute';
        rubberLine.style.width = '3px';
        rubberLine.style.height = '0px';
        rubberLine.style.backgroundColor = 'rgba(255, 0, 255, 0.7)';
        rubberLine.style.zIndex = '100';
        rubberLine.style.pointerEvents = 'none';
        
        // Pozycjonowanie linii względem ptaka
        const birdRect = bird.getBoundingClientRect();
        const gameAreaRect = gameArea.getBoundingClientRect();
        
        rubberLine.style.left = (birdRect.left + birdRect.width/2 - gameAreaRect.left) + 'px';
        rubberLine.style.top = (birdRect.top + birdRect.height/2 - gameAreaRect.top) + 'px';
        rubberLine.style.transformOrigin = 'top center';
        
        gameArea.appendChild(rubberLine);
    };
    
    window.moveRubberDrag = function(event) {
        if (!rubberModeActive || !rubberDragActive) return;
        
        // Zapobiegaj domyślnemu zachowaniu (przewijanie)
        if (event.preventDefault) event.preventDefault();
        
        // Oblicz różnicę przeciągnięcia
        let currentY, currentX;
        if (event.type === 'touchmove') {
            currentY = event.touches[0].clientY;
            currentX = event.touches[0].clientX;
        } else {
            currentY = event.clientY;
            currentX = event.clientX;
        }
        
        const dragDiffY = currentY - window.rubberDragStartY;
        
        // Dodajmy też przeciąganie poziome dla większej kontroli
        if (window.rubberDragStartX == null) {
            if (event.type === 'touchmove') {
                window.rubberDragStartX = event.touches[0].clientX;
            } else {
                window.rubberDragStartX = event.clientX;
            }
        }
        
        const dragDiffX = currentX - window.rubberDragStartX;
        
        // Aktualizuj modyfikator prędkości pionowej - im większe przeciągnięcie, tym większa prędkość
        // Maksymalnie do rubberMaxVelocity
        window.rubberVelocityModifier = Math.min(Math.max(dragDiffY * 0.4, -rubberMaxVelocity), rubberMaxVelocity);
        
        // Dodajemy modyfikator prędkości poziomej (użyjemy go przy wystrzeleniu)
        window.rubberHorizontalModifier = Math.max(-24, Math.min(24, -dragDiffX * 0.2));
        
        // Oblicz całkowitą siłę przeciągnięcia
        const totalDragForce = Math.sqrt(dragDiffY * dragDiffY + dragDiffX * dragDiffX);
        
        // Efekt wizualny odchylenia kaczorka podczas przeciągania
        let rotateAngle = 0;
        if (Math.abs(dragDiffX) > 20) {
            // Pochylenie w kierunku przeciągania w poziomie
            rotateAngle = Math.min(Math.max(-dragDiffX * 0.1, -15), 15); // Ograniczenie do +/- 15 stopni
        }
        
        // Rozciągnij wizualnie ptaka odpowiednio do przeciągnięcia
        // Używamy lepszego algorytmu rozciągania z faktorem wzmocnienia
        const stretchFactor = 1 + Math.abs(dragDiffY) * 0.012 * rubberStretchFactor;
        
        if (dragDiffY > 0) {
            // Ciągniemy w dół - rozciągamy w pionie
            bird.style.transform = `scaleY(${stretchFactor}) scaleX(${1/Math.cbrt(stretchFactor)}) rotate(${rotateAngle}deg)`;
        } else {
            // Ciągniemy w górę - rozciągamy w pionie odwrotnie
            bird.style.transform = `scaleY(${1/stretchFactor}) scaleX(${Math.cbrt(stretchFactor)}) rotate(${rotateAngle}deg)`;
        }
        
        // Dodajmy efekt "jelly" przy dużym rozciągnięciu - lekkie trzęsienie
        if (stretchFactor > 1.4) {
            bird.classList.add('rubber-extreme-stretch');
        } else {
            bird.classList.remove('rubber-extreme-stretch');
        }
        
        // Aktualizuj linię gumy - teraz linia wskazuje w kierunku wektora przeciągnięcia
        const rubberLine = document.getElementById('rubber-drag-line');
        if (rubberLine) {
            const birdRect = bird.getBoundingClientRect();
            const gameAreaRect = gameArea.getBoundingClientRect();
            
            // Długość linii bazująca na całkowitej sile
            const lineLength = Math.min(Math.sqrt(dragDiffY * dragDiffY + dragDiffX * dragDiffX), 250);
            rubberLine.style.height = lineLength + 'px';
            
            // Kąt linii - obliczamy na podstawie wektora przeciągnięcia
            let angle = Math.atan2(dragDiffY, dragDiffX) * (180 / Math.PI);
            // Dodajemy 90 stopni, bo linia rośnie naturalnie w dół (rotacja 0)
            angle = angle + 90;
            
            // Ustawiamy rotację
            rubberLine.style.transform = `rotate(${angle}deg)`;
            
            // Dodajmy efekt zakrzywionej linii za pomocą pseudoelementów
            // Użyjemy cieniowania dla efektu naprężenia
            
            // Kolor linii zależny od siły naciągu
            const totalForcePercentage = Math.min(lineLength / 200, 1);
            const r = Math.floor(255 * totalForcePercentage);
            const g = Math.floor(100 - 100 * totalForcePercentage);
            const b = Math.floor(255 - 100 * totalForcePercentage);
            
            // Bardziej spektakularny efekt linii z gradientem i cieniami
            rubberLine.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.7)`;
            rubberLine.style.backgroundImage = `linear-gradient(to bottom, rgba(255,255,255,0.7), rgba(${r},${g},${b},0.8), rgba(${r},${g},${b},0.9))`;
            rubberLine.style.width = (3 + totalForcePercentage * 8) + 'px'; // Linia staje się grubsza
            
            // Dodaj efekt błyszczenia
            if (totalForcePercentage > 0.5) {
                rubberLine.style.boxShadow = `0 0 ${5 + totalForcePercentage * 15}px rgba(${r}, ${g}, ${b}, 0.6)`;
            } else {
                rubberLine.style.boxShadow = 'none';
            }
            
            // Dodaj pulsowanie i efekty wizualne przy dużym naciągu
            if (totalForcePercentage > 0.7) {
                // Szybsze pulsowanie przy większym naciągu
                const pulseSpeed = 0.3 - (totalForcePercentage - 0.7) * 0.2; // Od 0.3s do 0.1s
                rubberLine.style.animation = `rubberLinePulse ${pulseSpeed}s infinite alternate`;
                
                // Dodaj cząsteczki przy dużym naciągu
                if (Math.random() < 0.1) { // Co jakiś czas dodajemy cząsteczki
                    const particle = document.createElement('div');
                    particle.className = 'rubber-stretch-particle';
                    particle.style.position = 'absolute';
                    particle.style.width = '4px';
                    particle.style.height = '4px';
                    particle.style.borderRadius = '50%';
                    particle.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
                    particle.style.boxShadow = `0 0 3px rgba(${r}, ${g}, ${b}, 0.6)`;
                    
                    // Pozycjonowanie - losowo wzdłuż linii
                    const particleOffset = Math.random() * lineLength;
                    const particleX = birdRect.left + birdRect.width/2 - gameAreaRect.left + Math.cos((angle - 90) * Math.PI / 180) * particleOffset;
                    const particleY = birdRect.top + birdRect.height/2 - gameAreaRect.top + Math.sin((angle - 90) * Math.PI / 180) * particleOffset;
                    
                    particle.style.left = particleX + 'px';
                    particle.style.top = particleY + 'px';
                    particle.style.zIndex = '99';
                    gameArea.appendChild(particle);
                    
                    // Animacja cząsteczki
                    const randomAngle = Math.random() * Math.PI * 2;
                    const speed = 1 + Math.random() * 3;
                    const lifetime = 300 + Math.random() * 700;
                    
                    particle.style.transition = `transform ${lifetime/1000}s linear, opacity ${lifetime/1000}s linear`;
                    
                    // Animuj cząsteczkę
                    setTimeout(() => {
                        particle.style.transform = `translate(${Math.cos(randomAngle) * speed * 20}px, ${Math.sin(randomAngle) * speed * 20}px)`;
                        particle.style.opacity = '0';
                        
                        // Usuń po zakończeniu animacji
                        setTimeout(() => {
                            if (particle.parentNode) {
                                gameArea.removeChild(particle);
                            }
                        }, lifetime);
                    }, 10);
                }
            } else {
                rubberLine.style.animation = 'none';
            }
            
            // Komunikat przy maksymalnym naciągu
            if (totalForcePercentage > 0.9) {
                if (!document.getElementById('max-stretch-notice')) {
                    const maxStretchNotice = document.createElement('div');
                    maxStretchNotice.id = 'max-stretch-notice';
                    maxStretchNotice.innerHTML = 'MAKSYMALNY<br>NACIĄG!';
                    maxStretchNotice.style.position = 'absolute';
                    maxStretchNotice.style.color = '#FF00FF';
                    maxStretchNotice.style.fontWeight = 'bold';
                    maxStretchNotice.style.fontSize = '18px';
                    maxStretchNotice.style.textShadow = '0 0 8px white, 0 0 15px rgba(255, 0, 255, 0.7)';
                    maxStretchNotice.style.textAlign = 'center';
                    
                    // Pozycjonowanie w kierunku naciągu
                    const noticeDistance = lineLength * 0.7;
                    const noticeX = birdRect.left + birdRect.width/2 - gameAreaRect.left + Math.cos((angle - 90) * Math.PI / 180) * noticeDistance;
                    const noticeY = birdRect.top + birdRect.height/2 - gameAreaRect.top + Math.sin((angle - 90) * Math.PI / 180) * noticeDistance;
                    
                    maxStretchNotice.style.left = noticeX + 'px';
                    maxStretchNotice.style.top = noticeY + 'px';
                    maxStretchNotice.style.transform = 'translate(-50%, -50%)';
                    maxStretchNotice.style.zIndex = '101';
                    maxStretchNotice.style.animation = 'rubberMaxStretchPulse 0.2s infinite alternate';
                    gameArea.appendChild(maxStretchNotice);
                } else {
                    // Aktualizuj pozycję komunikatu
                    const maxStretchNotice = document.getElementById('max-stretch-notice');
                    const noticeDistance = lineLength * 0.7;
                    const noticeX = birdRect.left + birdRect.width/2 - gameAreaRect.left + Math.cos((angle - 90) * Math.PI / 180) * noticeDistance;
                    const noticeY = birdRect.top + birdRect.height/2 - gameAreaRect.top + Math.sin((angle - 90) * Math.PI / 180) * noticeDistance;
                    
                    maxStretchNotice.style.left = noticeX + 'px';
                    maxStretchNotice.style.top = noticeY + 'px';
                }
            } else {
                const maxStretchNotice = document.getElementById('max-stretch-notice');
                if (maxStretchNotice) {
                    maxStretchNotice.parentNode.removeChild(maxStretchNotice);
                }
            }
        }
    };
    
    window.endRubberDrag = function(event) {
        if (!rubberModeActive || !rubberDragActive) return;
        
        console.log("Zakończenie przeciągania w trybie kauczuka, prędkość:", window.rubberVelocityModifier);
        rubberDragActive = false;
        
        // Przypisz nową prędkość pionową na podstawie przeciągnięcia
        velocity = Math.max(-22, Math.min(22, -window.rubberVelocityModifier * rubberBounciness));
        
        // Dodajmy efekt poziomej siły z przeciągania poziomego
        if (window.rubberHorizontalModifier) {
            // Symulacja siły poziomej przez manipulację pozycją X kaczorka
            // Uwaga: Rejestrujemy tylko intencję - faktyczne przesunięcie poziome
            // powinno być obsługiwane w głównej pętli gry, ale tam nie mamy dostępu
            
            // Dodaj animację poziomego przesunięcia
            const horizontalForce = window.rubberHorizontalModifier;
            
            // Zapisz wartość prędkości poziomej do użycia w głównej pętli gry
            window.rubberMoveX = horizontalForce;
            
            // Efekt wizualny - pochylenie w kierunku ruchu poziomego
            const tiltAngle = -horizontalForce * 2; // Pochylenie przeciwne do kierunku siły
            bird.style.transitionProperty = 'transform';
            bird.style.transitionDuration = '0.3s';
            bird.style.transform = `rotate(${tiltAngle}deg)`;
            
            // Reset transformacji po krótkim czasie
            setTimeout(() => {
                bird.style.transitionDuration = '0.5s';
                bird.style.transform = '';
            }, 300);
        }
        
        // Resetujemy drag-related wartości
        window.rubberDragStartX = null;
        window.rubberDragStartY = null;
        
        // Resetuj transformację ale dodaj klasę dla animacji wystrzelenia
        bird.classList.remove('rubber-stretching');
        bird.classList.add('rubber-launched');
        
        // Efekt dźwiękowy zależny od siły
        if (Math.abs(window.rubberVelocityModifier) > rubberMaxVelocity * 0.7) {
            playSound('storkDefeat'); // Mocny efekt dla dużej prędkości
        } else {
            playSound('jump'); // Standardowy dla mniejszej
        }
        
        // Dodaj efekt wizualny przy wystrzeleniu
        const powerLevel = Math.min(Math.abs(window.rubberVelocityModifier) / rubberMaxVelocity, 1);
        if (powerLevel > 0.3) {
            // Dodaj efekt "rozbłysku energii"
            const energyBurst = document.createElement('div');
            energyBurst.className = 'rubber-energy-burst';
            
            const birdRect = bird.getBoundingClientRect();
            const gameAreaRect = gameArea.getBoundingClientRect();
            
            energyBurst.style.position = 'absolute';
            energyBurst.style.width = (50 + powerLevel * 50) + 'px';
            energyBurst.style.height = (50 + powerLevel * 50) + 'px';
            energyBurst.style.borderRadius = '50%';
            energyBurst.style.backgroundColor = `rgba(255, 0, 255, ${0.3 + powerLevel * 0.4})`;
            energyBurst.style.boxShadow = `0 0 ${20 + powerLevel * 30}px rgba(255, 0, 255, 0.8)`;
            energyBurst.style.left = (birdRect.left + birdRect.width/2 - gameAreaRect.left - (25 + powerLevel * 25)) + 'px';
            energyBurst.style.top = (birdRect.top + birdRect.height/2 - gameAreaRect.top - (25 + powerLevel * 25)) + 'px';
            energyBurst.style.transform = 'scale(0)';
            energyBurst.style.transition = 'transform 0.3s, opacity 0.5s';
            energyBurst.style.zIndex = '90';
            gameArea.appendChild(energyBurst);
            
            // Animuj efekt
            setTimeout(() => {
                energyBurst.style.transform = 'scale(1)';
                setTimeout(() => {
                    energyBurst.style.opacity = '0';
                    setTimeout(() => {
                        if (energyBurst.parentNode) {
                            gameArea.removeChild(energyBurst);
                        }
                    }, 500);
                }, 200);
            }, 10);
            
            // Dodaj efekt wibracji przy dużej mocy
            if (powerLevel > 0.7) {
                gameArea.classList.add('screen-shake');
                setTimeout(() => {
                    gameArea.classList.remove('screen-shake');
                }, 300);
            }
        }
        
        // Usuń linię gumy
        const rubberLine = document.getElementById('rubber-drag-line');
        if (rubberLine) {
            rubberLine.parentNode.removeChild(rubberLine);
        }
        
        // Usuń komunikat o maksymalnym naciągu jeśli istnieje
        const maxStretchNotice = document.getElementById('max-stretch-notice');
        if (maxStretchNotice) {
            maxStretchNotice.parentNode.removeChild(maxStretchNotice);
        }
    };

    // Funkcja deaktywująca Tryb Kauczuka
    window.deactivateRubberMode = function() {
        if (!rubberModeActive) return;
        
        console.log("Deaktywacja trybu kauczuka - rozpoczęcie czyszczenia");
        
        rubberModeActive = false;
        machineLeave('rubber');
        rubberModeTime = 0;
        rubberDragActive = false;
        
        // Usuń nasłuchiwanie zdarzeń
        gameArea.removeEventListener('mousedown', startRubberDrag);
        gameArea.removeEventListener('touchstart', startRubberDrag);
        gameArea.removeEventListener('mousemove', moveRubberDrag);
        gameArea.removeEventListener('touchmove', moveRubberDrag);
        gameArea.removeEventListener('mouseup', endRubberDrag);
        gameArea.removeEventListener('touchend', endRubberDrag);
        gameArea.removeEventListener('mouseleave', endRubberDrag);
        gameArea.removeEventListener('touchcancel', endRubberDrag);
        
        window.rubberMoveX = 0;
        window.rubberHorizontalModifier = 0;
        window.rubberVelocityModifier = 0;
        window.rubberDragStartX = null;
        window.rubberDragStartY = null;
        // Zatrzymaj wszelkie animacje związane z kauczukiem
        if (bird.rubberAnimation) {
            cancelAnimationFrame(bird.rubberAnimation);
            bird.rubberAnimation = null;
        }
        
        // Usuń klasę efektu wizualnego
        bird.classList.remove('rubber-mode', 'rubber-stretching', 'rubber-launched', 'rubber-extreme-stretch', 'rubber-phasing');
        
        // Resetuj transformację i inne style
        bird.style.transform = '';
        bird.style.filter = '';
        
        // Ukryj wskaźnik trybu kauczuka
        const rubberModeIndicator = document.getElementById('rubberModeIndicator');
        if (rubberModeIndicator) {
            rubberModeIndicator.style.display = 'none';
            rubberModeIndicator.style.animation = 'none';
        }
        
        // Resetuj wskaźnik czasu trybu kauczuka
        const rubberModeTimer = document.getElementById('rubberModeTimer');
        if (rubberModeTimer) {
            rubberModeTimer.textContent = '0s';
        }
        
        // Usuń wszystkie efekty wizualne związane z kauczukiem
        const rubberEffects = document.querySelectorAll('.rubber-effect, .bounce-effect, .rubber-energy-burst, .rubber-bounce-effect, .rubber-phase-particle, .rubber-stretch-particle');
        rubberEffects.forEach(effect => {
            if (effect && effect.parentNode) {
                effect.style.animation = 'none';
                effect.parentNode.removeChild(effect);
            }
        });
        
        // Usuń linię przeciągania jeśli istnieje
        const rubberLine = document.getElementById('rubber-drag-line');
        if (rubberLine) {
            rubberLine.parentNode.removeChild(rubberLine);
        }
        
        // Usuń komunikat o maksymalnym naciągu jeśli istnieje
        const maxStretchNotice = document.getElementById('max-stretch-notice');
        if (maxStretchNotice) {
            maxStretchNotice.parentNode.removeChild(maxStretchNotice);
        }
        
        // Usuń klasy wizualnych efektów
        gameArea.classList.remove('screen-shake', 'rubber-filter');
        
        // Pokaż komunikat o końcu trybu kauczuka
        const endModeMsg = document.createElement('div');
        endModeMsg.className = 'coinPop';
        endModeMsg.textContent = 'Koniec trybu kauczuka!';
        endModeMsg.style.left = '50%';
        endModeMsg.style.top = '50%';
        endModeMsg.style.transform = 'translate(-50%, -50%)';
        endModeMsg.style.color = '#FF00FF';
        endModeMsg.style.fontSize = '24px';
        gameArea.appendChild(endModeMsg);
        
        setTimeout(() => {
            if (endModeMsg.parentNode) {
                gameArea.removeChild(endModeMsg);
            }
        }, 1500);
        
        // Efekt dźwiękowy
        playSound('jump');
        
        console.log("Deaktywacja trybu kauczuka - zakończono czyszczenie");

        if (frogModeActive) {
            deactivateFrogMode({ skipNext: true, silent: true });
        }
        applyModePhysics();
        
        // Aktywuj tryb stali jako przejściowy między kauczukiem a duchem
        scheduleModeTimer('rubber-to-steel', () => {
            if (!frogModeActive && !ghostModeActive && !storkModeActive) {
                activateSteelMode({ source: 'rubber-chain', force: true });
            }
        }, 300);
    }
    
    // Funkcje TRYB DUCHA
    window.activateGhostMode = function(event, freeActivation = false) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        // Jeśli aktywacja jest darmowa, pomijamy sprawdzenie cooldown
        if (!gameRunning || ghostModeActive || rubberModeActive || (ghostModeCooldown > 0 && !freeActivation)) return false;
        if (!machineCanEnter('ghost', { freeActivation })) return false;
        
        // Sprawdź czy gracz ma wystarczającą ilość monet lub czy to darmowa aktywacja
        const normalCoins = coinScore / coinValue;
        const purpleCoins = purpleCoinScore / purpleCoinValue;
        
        if (freeActivation || (normalCoins >= normalGhostModeCost && purpleCoins >= purpleGhostModeCost)) {
            if (!machineEnter('ghost', { freeActivation })) return false;
            // Odejmij koszt tylko jeśli to nie jest darmowa aktywacja
            if (!freeActivation) {
                coinScore -= normalGhostModeCost * coinValue;
                purpleCoinScore -= purpleGhostModeCost * purpleCoinValue;
                
                // Aktualizuj wyświetlanie monet
                bonusScoreElement.textContent = `Monety: ${coinScore / coinValue}`;
                purpleCoinScoreElement.textContent = `Super monety: ${purpleCoinScore / purpleCoinValue}`;
            }
            
            // Aktywuj TRYB DUCHA
            ghostModeActive = true;
            ghostModeTime = ghostModeDuration;
            gameArea.classList.add('ghost-mode-active');
            ghostModeTimer.style.display = 'block';
            ghostModeTimer.textContent = `TRYB DUCHA: ${ghostModeDuration}s`;
            ghostModeButton.disabled = true;
            
            // Włącz tryb ducha
            ghostMode = true;
            applyModePhysics();
            
            // Efekt dźwiękowy
            playSound('ghostMode');
            
            // Pokaż efekt aktywacji
            const ghostActivation = document.createElement('div');
            ghostActivation.className = 'coinPop purpleCoinPop';
            ghostActivation.style.color = '#7B68EE';
            ghostActivation.textContent = freeActivation ? 
                'DARMOWY TRYB DUCHA!\nPRZENIKANIE PRZEZ RURY!' : 
                'TRYB DUCHA!\nPRZENIKANIE PRZEZ RURY!';
            ghostActivation.style.left = '50%';
            ghostActivation.style.top = '50%';
            ghostActivation.style.transform = 'translate(-50%, -50%) scale(2)';
            ghostActivation.style.whiteSpace = 'pre';
            ghostActivation.style.textAlign = 'center';
            gameArea.appendChild(ghostActivation);
            
            setTimeout(() => {
                if (ghostActivation && ghostActivation.parentNode) {
                    gameArea.removeChild(ghostActivation);
                }
            }, 1500);
            return true;
        }
        return false;
    }
    
    window.deactivateGhostMode = function() {
        if (!ghostModeActive) return;
        
        console.log("Deaktywacja trybu ducha - rozpoczęcie czyszczenia");
        
        ghostModeActive = false;
        machineLeave('ghost');
        ghostModeTime = 0;
        gameArea.classList.remove('ghost-mode-active');
        ghostModeTimer.style.display = 'none';
        ghostMode = false;
        applyModePhysics();
        
        // Zatrzymaj wszelkie animacje związane z duchem
        if (bird.ghostAnimation) {
            cancelAnimationFrame(bird.ghostAnimation);
            bird.ghostAnimation = null;
        }
        
        // Usuń wszystkie efekty ektoplazmy lub innych zjawisk duchowych
        const ghostEffects = document.querySelectorAll('.ghost-effect, .ghost-trail');
        ghostEffects.forEach(effect => {
            if (effect && effect.parentNode) {
                effect.style.animation = 'none';
                effect.parentNode.removeChild(effect);
            }
        });
        
        // Przywracamy normalny wygląd ptaka - resetujemy do kaczorka
        bird.style.animation = 'crazyDuck 2s infinite alternate';
        bird.style.background = 'linear-gradient(135deg, #FFFF00, #FFA500, #FFD700)';
        bird.style.borderRadius = '50% 50% 30% 30%';
        bird.style.boxShadow = '0 2px 10px rgba(255, 215, 0, 0.7)';
        bird.style.filter = 'none';
        bird.style.transform = 'rotate(0deg)';
        bird.style.opacity = '1';
        
        // Usuń wszystkie klasy związane z duchem
        bird.classList.remove('ghost-mode', 'ghost-floating', 'ghost-transparent');
        
        // Przywróć widoczność jetpacka
        const jetpackFlames = bird.querySelector('.jetpack-flames');
        if (jetpackFlames) {
            jetpackFlames.style.display = '';
        }
        
        // Usuń wszystkie efekty poświaty
        const glowEffects = document.querySelectorAll('.ghost-glow');
        glowEffects.forEach(effect => {
            if (effect && effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        });
        
        // Usuń klasy wizualnych efektów
        gameArea.classList.remove('screen-shake', 'ghost-filter');
        
        // Pokaż komunikat o końcu trybu ducha
        const endModeMsg = document.createElement('div');
        endModeMsg.className = 'coinPop';
        endModeMsg.textContent = 'Koniec trybu ducha!';
        endModeMsg.style.left = '50%';
        endModeMsg.style.top = '50%';
        endModeMsg.style.transform = 'translate(-50%, -50%)';
        endModeMsg.style.color = '#7B68EE';
        endModeMsg.style.fontSize = '24px';
        gameArea.appendChild(endModeMsg);
        
        setTimeout(() => {
            if (endModeMsg.parentNode) {
                gameArea.removeChild(endModeMsg);
            }
        }, 1500);
        
        // Ustaw cooldown
        ghostModeCooldown = ghostModeCooldownTime;
        ghostModeButton.disabled = true;
        
        setTimeout(() => {
            updateGhostModeButton();
        }, 500);
        
        console.log("Deaktywacja trybu ducha - zakończono czyszczenie");
    }
    
    window.updateGhostModeButton = function() {
        if (!gameRunning) return;
        
        const normalCoins = coinScore / coinValue;
        const purpleCoins = purpleCoinScore / purpleCoinValue;
        const hasEnoughCoins = normalCoins >= normalGhostModeCost && purpleCoins >= purpleGhostModeCost;
        
        if (ghostModeActive) {
            ghostModeButton.disabled = true;
            ghostModeButton.querySelector('.mode-button-cost').textContent = 'AKTYWNY!';
        } else if (rubberModeActive || !machineCanEnter('ghost')) {
            ghostModeButton.disabled = true;
            ghostModeButton.querySelector('.mode-button-cost').textContent = 'ZAJĘTY';
        } else if (ghostModeCooldown > 0) {
            ghostModeButton.disabled = true;
            ghostModeButton.querySelector('.mode-button-cost').textContent = `${Math.ceil(ghostModeCooldown)}s`;
        } else if (hasEnoughCoins) {
            ghostModeButton.disabled = false;
            ghostModeButton.querySelector('.mode-button-cost').textContent = `${normalGhostModeCost}🟡 ${purpleGhostModeCost}🟣`;
        } else {
            ghostModeButton.disabled = true;
            ghostModeButton.querySelector('.mode-button-cost').textContent = `${normalGhostModeCost}🟡 ${purpleGhostModeCost}🟣`;
        }
    }
    
    function finiteStorkValue(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function playStorkGrabSound(name) {
        if (typeof window.playSound === 'function') window.playSound(name);
    }

    function storkPipeElements(pipe) {
        if (!pipe) return [];
        return [pipe.downPipe, pipe.upPipe].filter(Boolean);
    }

    function setStorkPipeClass(pipe, className, active) {
        storkPipeElements(pipe).forEach(element => element.classList.toggle(className, active));
    }

    function isStorkPipeUsable(pipe) {
        return Boolean(
            pipe
            && !pipe.destroyed
            && !pipe.scheduledForRemoval
            && pipe.downPipe
            && pipe.upPipe
            && pipe.downPipe.parentNode === gameArea
            && pipe.upPipe.parentNode === gameArea
        );
    }

    function currentStorkPipeCenter(pipe) {
        if (!pipe) return null;
        const storedCenter = finiteStorkValue(pipe.gapCenterY, NaN);
        if (Number.isFinite(storedCenter)) return storedCenter;

        const topHeight = parseFloat(pipe.downPipe && pipe.downPipe.style.height);
        const gap = finiteStorkValue(pipe.gap, pipeGap);
        if (Number.isFinite(topHeight) && Number.isFinite(gap)) {
            return topHeight + gap / 2;
        }

        if (pipe.downPipe && pipe.upPipe) {
            const areaRect = gameArea.getBoundingClientRect();
            const upperRect = pipe.downPipe.getBoundingClientRect();
            const lowerRect = pipe.upPipe.getBoundingClientRect();
            if (upperRect && lowerRect) {
                return ((upperRect.bottom + lowerRect.top) / 2) - areaRect.top;
            }
        }
        return null;
    }

    function calculateStorkPipeLayout(pipe, desiredCenter) {
        const gameHeight = gameArea.clientHeight;
        const groundHeight = ground.clientHeight;
        const gap = finiteStorkValue(pipe && pipe.gap, pipeGap);
        const layoutHelper = window.SkyDodgeLogic
            && window.SkyDodgeLogic.calculateDraggedPipeLayout;

        if (typeof layoutHelper === 'function') {
            return layoutHelper({
                gameHeight,
                groundHeight,
                pipeGap: gap,
                minPipeHeight: STORK_GRAB_MIN_PIPE_HEIGHT,
                desiredCenter
            });
        }

        const playableHeight = gameHeight - groundHeight;
        const halfGap = gap / 2;
        const minCenter = STORK_GRAB_MIN_PIPE_HEIGHT + halfGap;
        const maxCenter = playableHeight - STORK_GRAB_MIN_PIPE_HEIGHT - halfGap;
        if (maxCenter < minCenter) return null;
        const center = Math.max(minCenter, Math.min(maxCenter, desiredCenter));
        const gapTop = center - halfGap;
        const gapBottom = center + halfGap;
        return {
            center,
            topHeight: gapTop,
            bottomVisibleHeight: playableHeight - gapBottom,
            gapTop,
            gapBottom,
            pipeGap: gap
        };
    }

    function applyStorkPipeLayout(pipe, desiredCenter) {
        if (!isStorkPipeUsable(pipe)) return null;
        const layout = calculateStorkPipeLayout(pipe, desiredCenter);
        if (!layout) return null;

        const previousCenter = currentStorkPipeCenter(pipe);
        pipe.downPipe.style.height = layout.topHeight + 'px';
        pipe.upPipe.style.height = layout.bottomVisibleHeight + 'px';
        pipe.upPipe.style.bottom = ground.clientHeight + 'px';
        pipe.gap = layout.pipeGap;
        pipe.gapCenterY = layout.center;
        pipe.gapTop = layout.gapTop;
        pipe.gapBottom = layout.gapBottom;
        window.storkGrabTargetY = layout.center;

        if (Number.isFinite(previousCenter)) {
            storkGrabTravelDistance += Math.abs(layout.center - previousCenter);
        }
        return layout;
    }

    function effectiveStorkGrabRange() {
        const configured = finiteStorkValue(window.storkGrabRange, 260);
        const responsiveFloor = Math.max(130, gameArea.clientWidth * 0.45);
        return Math.min(configured, responsiveFloor);
    }

    function storkPipeCandidateInfo(pipe) {
        if (!isStorkPipeUsable(pipe) || pipe.passed || (pipe.grabbed && pipe !== window.storkGrabbedPipe)) {
            return null;
        }

        const pipeX = finiteStorkValue(pipe.x, NaN);
        if (!Number.isFinite(pipeX)) return null;
        const areaRect = gameArea.getBoundingClientRect();
        const birdRect = bird.getBoundingClientRect();
        const birdRight = birdRect.right - areaRect.left;
        const width = finiteStorkValue(pipe.width, pipeWidth);
        const pipeCenter = pipeX + width / 2;

        // A pipe already beside/behind the bird is not a safe editing target:
        // changing its gap there could visually swallow the player.
        if (pipeX < birdRight + 12) return null;
        const distance = pipeX - birdRight;
        if (distance > effectiveStorkGrabRange()) return null;

        const center = currentStorkPipeCenter(pipe);
        if (!Number.isFinite(center) || !calculateStorkPipeLayout(pipe, center)) return null;
        return { pipe, distance, pipeX, pipeCenter, width };
    }

    function storkGrabCandidates(pointerX) {
        const hasPointerX = Number.isFinite(pointerX);
        return (Array.isArray(window.pipes) ? window.pipes : [])
            .map(storkPipeCandidateInfo)
            .filter(Boolean)
            .filter(info => !hasPointerX
                || (pointerX >= info.pipeX - STORK_GRAB_POINTER_SLOP
                    && pointerX <= info.pipeX + info.width + STORK_GRAB_POINTER_SLOP))
            .sort((left, right) => left.distance - right.distance);
    }

    function storkEventPoint(event) {
        if (!event) return null;
        const source = (event.touches && event.touches[0])
            || (event.changedTouches && event.changedTouches[0])
            || event;
        const clientX = finiteStorkValue(source.clientX, NaN);
        const clientY = finiteStorkValue(source.clientY, NaN);
        return Number.isFinite(clientX) && Number.isFinite(clientY)
            ? { clientX, clientY }
            : null;
    }

    function storkPointerTargetsPipe(event, pointerX) {
        if (event && event.target && typeof event.target.closest === 'function'
            && event.target.closest('.pipe')) return true;
        if (!Number.isFinite(pointerX)) return false;
        return (Array.isArray(window.pipes) ? window.pipes : []).some(pipe => {
            if (!isStorkPipeUsable(pipe)) return false;
            const x = finiteStorkValue(pipe.x, NaN);
            const width = finiteStorkValue(pipe.width, pipeWidth);
            return Number.isFinite(x)
                && pointerX >= x - STORK_GRAB_POINTER_SLOP
                && pointerX <= x + width + STORK_GRAB_POINTER_SLOP;
        });
    }

    function storkGrabReady() {
        return Boolean(
            storkModeActive
            && !window.storkGrabActive
            && finiteStorkValue(window.storkGrabCooldown, 0) <= 0
            && finiteStorkValue(window.storkGrabEnergy, 0) >= STORK_GRAB_MIN_ENERGY
        );
    }

    function updateStorkPipeRangeClasses(ready) {
        (Array.isArray(window.pipes) ? window.pipes : []).forEach(pipe => {
            setStorkPipeClass(pipe, 'pipe-in-range', false);
        });
        if (!ready) return;
        storkGrabCandidates().forEach(info => setStorkPipeClass(info.pipe, 'pipe-in-range', true));
    }

    function updateStorkGrabActionButton(ready, hasCandidate) {
        if (!storkModeButton || !storkModeActive) return;
        const costElement = storkModeButton.querySelector('.mode-button-cost');
        const active = Boolean(window.storkGrabActive);
        const cooldown = Math.max(0, finiteStorkValue(window.storkGrabCooldown, 0));
        const energy = Math.max(0, finiteStorkValue(window.storkGrabEnergy, 0));

        storkModeButton.style.display = 'flex';
        storkModeButton.setAttribute('aria-pressed', String(active));
        if (active) {
            storkModeButton.disabled = false;
            storkModeButton.setAttribute('aria-label', 'Puść trzymaną parę rur');
            storkModeButton.title = 'Puść rurę (E)';
            if (costElement) costElement.textContent = 'PUŚĆ • E';
        } else if (cooldown > 0) {
            storkModeButton.disabled = true;
            storkModeButton.setAttribute('aria-label', `Szpony odpoczywają jeszcze ${cooldown.toFixed(1)} sekundy`);
            storkModeButton.title = 'Szpony na cooldownie';
            if (costElement) costElement.textContent = `SZPONY ${cooldown.toFixed(1)}s`;
        } else if (energy < STORK_GRAB_MIN_ENERGY) {
            storkModeButton.disabled = true;
            storkModeButton.setAttribute('aria-label', 'Za mało energii szponów');
            storkModeButton.title = 'Poczekaj na energię';
            if (costElement) costElement.textContent = `ENERGIA ${Math.round(energy)}%`;
        } else {
            storkModeButton.disabled = !ready || !hasCandidate;
            storkModeButton.setAttribute('aria-label', hasCandidate
                ? 'Chwyć najbliższą parę rur'
                : 'Brak bezpiecznej rury w zasięgu');
            storkModeButton.title = hasCandidate ? 'Chwyć rurę (E)' : 'Zbliż się do rury';
            if (costElement) costElement.textContent = hasCandidate ? 'CHWYĆ • E' : 'BRAK RURY';
        }
    }

    function syncStorkGrabUi(reason) {
        const maxEnergy = Math.max(1, finiteStorkValue(window.storkGrabMaxEnergy, 100));
        const energy = Math.max(0, Math.min(maxEnergy, finiteStorkValue(window.storkGrabEnergy, maxEnergy)));
        const cooldown = Math.max(0, finiteStorkValue(window.storkGrabCooldown, 0));
        const active = Boolean(storkModeActive && window.storkGrabActive);
        const ready = storkGrabReady();
        const hasCandidate = ready && storkGrabCandidates().length > 0;
        const energyPercent = (energy / maxEnergy) * 100;

        const indicator = document.getElementById('storkGrabIndicator');
        const label = document.getElementById('storkGrabLabel');
        const bar = document.getElementById('storkGrabEnergyBar');
        const hint = document.getElementById('storkGrabHint');
        if (indicator) {
            indicator.style.display = storkModeActive ? '' : 'none';
            indicator.setAttribute('aria-hidden', String(!storkModeActive));
            indicator.classList.toggle('is-active', Boolean(storkModeActive));
            indicator.classList.toggle('is-grabbing', active);
            indicator.classList.toggle('is-exhausted', storkModeActive
                && energy < STORK_GRAB_MIN_ENERGY);
        }
        if (bar) {
            bar.style.width = energyPercent.toFixed(1) + '%';
            const progressbar = bar.closest('[role="progressbar"]') || bar;
            progressbar.setAttribute('aria-valuenow', String(Math.round(energyPercent)));
        }
        if (label) {
            label.textContent = active
                ? `SZPONY: RURA W CHWYCIE • ${Math.ceil(energyPercent)}%`
                : (cooldown > 0
                    ? `SZPONY ODPOCZYWAJĄ • ${cooldown.toFixed(1)}s`
                    : `ENERGIA SZPONÓW • ${Math.ceil(energyPercent)}%`);
        }
        if (hint) {
            hint.textContent = active
                ? (storkGrabInputKind === 'keyboard'
                    ? 'W/S lub ↑/↓: przesuń • E: puść'
                    : (storkGrabInputKind === 'button'
                        ? 'Dotknij trzymanej rury, aby ją przeciągnąć • przycisk: puść'
                        : 'Przeciągnij pionowo • puść, aby ustawić'))
                : (hasCandidate ? 'Kliknij rurę albo E, aby ją chwycić' : 'Zbliż się do bezpiecznej rury');
        }

        gameArea.classList.toggle('stork-grab-active', active);
        gameArea.classList.toggle('stork-grab-ready', ready && hasCandidate);
        gameArea.classList.toggle('stork-grab-cooldown', storkModeActive && cooldown > 0);
        bird.classList.toggle('stork-grabbing', active);
        updateStorkPipeRangeClasses(ready);
        if (active) setStorkPipeClass(window.storkGrabbedPipe, 'pipe-grabbed', true);
        updateStorkGrabActionButton(ready, hasCandidate);

        const signature = [
            storkModeActive ? 1 : 0,
            active ? 1 : 0,
            Math.round(energy),
            Math.ceil(cooldown * 10),
            hasCandidate ? 1 : 0,
            reason || ''
        ].join(':');
        if (signature !== lastStorkGrabUiSignature) {
            lastStorkGrabUiSignature = signature;
            document.dispatchEvent(new CustomEvent('sky-dodge:stork-grab-state', {
                detail: Object.freeze({
                    active,
                    energy,
                    maxEnergy,
                    energyPercent,
                    cooldown,
                    ready: ready && hasCandidate,
                    reason: reason || 'update'
                })
            }));
        }
    }

    function denyStorkGrab(reason) {
        const now = performance.now();
        if (now - lastStorkGrabDeniedAt > 350) {
            playStorkGrabSound('storkGrabDenied');
            lastStorkGrabDeniedAt = now;
        }
        syncStorkGrabUi(reason || 'denied');
    }

    window.tryStartStorkPipeGrab = function(event, options = {}) {
        if (!gameRunning || !storkModeActive) return false;
        if (window.storkGrabActive) {
            if (storkGrabInputKind !== 'pointer' && event && window.storkGrabbedPipe) {
                const point = storkEventPoint(event);
                const areaRect = gameArea.getBoundingClientRect();
                const pointerX = point ? point.clientX - areaRect.left : NaN;
                const pipeX = finiteStorkValue(window.storkGrabbedPipe.x, NaN);
                const width = finiteStorkValue(window.storkGrabbedPipe.width, pipeWidth);
                if (point && Number.isFinite(pipeX)
                    && pointerX >= pipeX - STORK_GRAB_POINTER_SLOP
                    && pointerX <= pipeX + width + STORK_GRAB_POINTER_SLOP) {
                    const center = currentStorkPipeCenter(window.storkGrabbedPipe);
                    if (Number.isFinite(center)) {
                        storkGrabPointerOffsetY = center - (point.clientY - areaRect.top);
                        storkGrabInputKind = 'pointer';
                        syncStorkGrabUi('pointer-adopted');
                        return true;
                    }
                }
            }
            return storkGrabInputKind === 'pointer';
        }
        if (event && event.button !== undefined && event.button !== 0) return false;

        const point = storkEventPoint(event);
        const areaRect = gameArea.getBoundingClientRect();
        const pointerX = point ? point.clientX - areaRect.left : NaN;
        const pointerIntent = Boolean(options.keyboard || options.button
            || storkPointerTargetsPipe(event, pointerX));

        if (!storkGrabReady()) {
            if (pointerIntent) denyStorkGrab('unavailable');
            return pointerIntent;
        }

        const candidates = storkGrabCandidates(options.keyboard || options.button ? undefined : pointerX);
        if (!candidates.length) {
            if (pointerIntent) denyStorkGrab('no-target');
            return pointerIntent;
        }

        const pipe = candidates[0].pipe;
        const center = currentStorkPipeCenter(pipe);
        if (!Number.isFinite(center)) {
            denyStorkGrab('invalid-layout');
            return true;
        }

        window.storkGrabActive = true;
        window.storkGrabbedPipe = pipe;
        window.storkGrabTargetY = center;
        window.storkGrabEnergy = Math.max(
            0,
            finiteStorkValue(window.storkGrabEnergy, 0) - STORK_GRAB_START_COST
        );
        pipe.grabbed = true;
        storkGrabPointerOffsetY = point ? center - (point.clientY - areaRect.top) : 0;
        storkGrabTravelDistance = 0;
        storkGrabInputKind = options.keyboard ? 'keyboard' : (options.button ? 'button' : 'pointer');
        setStorkPipeClass(pipe, 'pipe-in-range', false);
        setStorkPipeClass(pipe, 'pipe-grabbed', true);
        playStorkGrabSound('storkGrab');
        syncStorkGrabUi('grab');
        return true;
    };

    window.moveStorkPipeGrab = function(event) {
        if (!window.storkGrabActive || !window.storkGrabbedPipe
            || storkGrabInputKind !== 'pointer') return false;
        const point = storkEventPoint(event);
        if (!point) return false;
        const areaRect = gameArea.getBoundingClientRect();
        window.storkGrabTargetY = point.clientY - areaRect.top + storkGrabPointerOffsetY;
        return true;
    };

    window.isPointerStorkPipeGrab = function() {
        return Boolean(window.storkGrabActive && storkGrabInputKind === 'pointer');
    };

    window.releaseStorkPipeGrab = function(reason = 'drop', options = {}) {
        const pipe = window.storkGrabbedPipe;
        const wasActive = Boolean(window.storkGrabActive || pipe);
        if (!wasActive) return false;

        if (pipe) {
            pipe.grabbed = false;
            setStorkPipeClass(pipe, 'pipe-grabbed', false);
            setStorkPipeClass(pipe, 'pipe-in-range', false);
        }
        window.storkGrabActive = false;
        window.storkGrabbedPipe = null;
        window.storkGrabTargetY = null;
        storkGrabKeys.up = false;
        storkGrabKeys.down = false;
        storkGrabPointerOffsetY = 0;
        storkGrabInputKind = '';

        if (!options.skipCooldown && gameRunning && storkModeActive) {
            window.storkGrabCooldown = Math.max(
                finiteStorkValue(window.storkGrabCooldown, 0),
                finiteStorkValue(window.storkGrabCooldownTime, 1.25)
            );
        }

        if (!options.skipStrain && gameRunning && storkGrabTravelDistance >= 0) {
            const mutationSystem = window.SkyDodge && window.SkyDodge.mutations;
            if (mutationSystem && typeof mutationSystem.strain === 'function') {
                const distance = Math.round(storkGrabTravelDistance);
                const amount = 8 + Math.min(distance / 20, 12) + (reason === 'energy' ? 5 : 0);
                mutationSystem.strain(amount, 'pipeImpact', {
                    source: 'stork-grab',
                    reason,
                    distance
                });
            }
        }

        if (!options.silent) {
            playStorkGrabSound(reason === 'energy' ? 'storkGrabExhausted' : 'storkDrop');
        }
        storkGrabTravelDistance = 0;
        syncStorkGrabUi(reason);
        return true;
    };

    window.resetStorkPipeGrab = function(options = {}) {
        window.releaseStorkPipeGrab(options.reason || 'reset', {
            silent: true,
            skipCooldown: true,
            skipStrain: true
        });
        (Array.isArray(window.pipes) ? window.pipes : []).forEach(pipe => {
            pipe.grabbed = false;
            setStorkPipeClass(pipe, 'pipe-grabbed', false);
            setStorkPipeClass(pipe, 'pipe-in-range', false);
        });
        window.storkGrabActive = false;
        window.storkGrabbedPipe = null;
        window.storkGrabMaxEnergy = Math.max(1, finiteStorkValue(window.storkGrabMaxEnergy, 100));
        window.storkGrabEnergy = window.storkGrabMaxEnergy;
        window.storkGrabCooldown = 0;
        window.storkGrabTargetY = null;
        storkGrabKeys.up = false;
        storkGrabKeys.down = false;
        storkGrabPointerOffsetY = 0;
        storkGrabTravelDistance = 0;
        storkGrabInputKind = '';
        lastStorkGrabUiSignature = '';
        syncStorkGrabUi(options.reason || 'reset');
    };

    window.updateStorkPipeGrab = function(timestamp, elapsedSeconds) {
        const seconds = Math.max(0, Math.min(0.1, finiteStorkValue(elapsedSeconds, 0)));
        if (!storkModeActive) {
            if (window.storkGrabActive || window.storkGrabbedPipe) {
                window.releaseStorkPipeGrab('mode-ended', {
                    silent: true,
                    skipCooldown: true
                });
            }
            syncStorkGrabUi('inactive');
            return;
        }

        const wasReady = storkGrabReady();
        if (finiteStorkValue(window.storkGrabCooldown, 0) > 0) {
            window.storkGrabCooldown = Math.max(0, window.storkGrabCooldown - seconds);
        }

        if (window.storkGrabActive) {
            const pipe = window.storkGrabbedPipe;
            if (!isStorkPipeUsable(pipe)) {
                window.releaseStorkPipeGrab('pipe-invalid');
                return;
            }

            const direction = Number(storkGrabKeys.down) - Number(storkGrabKeys.up);
            if (direction !== 0) {
                const currentTarget = finiteStorkValue(
                    window.storkGrabTargetY,
                    currentStorkPipeCenter(pipe)
                );
                window.storkGrabTargetY = currentTarget
                    + direction * STORK_GRAB_KEYBOARD_SPEED * seconds;
            }

            const layout = applyStorkPipeLayout(
                pipe,
                finiteStorkValue(window.storkGrabTargetY, currentStorkPipeCenter(pipe))
            );
            if (!layout) {
                window.releaseStorkPipeGrab('pipe-invalid');
                return;
            }

            window.storkGrabEnergy = Math.max(
                0,
                finiteStorkValue(window.storkGrabEnergy, 0)
                    - finiteStorkValue(window.storkGrabDrainRate, 34) * seconds
            );
            if (window.storkGrabEnergy <= 0) {
                window.releaseStorkPipeGrab('energy');
                return;
            }
        } else {
            window.storkGrabEnergy = Math.min(
                finiteStorkValue(window.storkGrabMaxEnergy, 100),
                finiteStorkValue(window.storkGrabEnergy, 0)
                    + finiteStorkValue(window.storkGrabRechargeRate, 22) * seconds
            );
        }

        const isReady = storkGrabReady();
        if (!wasReady && isReady) playStorkGrabSound('storkGrabReady');
        syncStorkGrabUi('update');
    };

    window.handleStorkGrabKeyDown = function(event) {
        if (!event || !gameRunning || !storkModeActive) return false;
        if (event.code === 'KeyE') {
            if (event.repeat) return true;
            if (window.storkGrabActive) window.releaseStorkPipeGrab('drop');
            else window.tryStartStorkPipeGrab(null, { keyboard: true });
            return true;
        }
        if (!window.storkGrabActive) return false;
        if (event.code === 'KeyW' || event.code === 'ArrowUp') {
            storkGrabKeys.up = true;
            storkGrabInputKind = 'keyboard';
            return true;
        }
        if (event.code === 'KeyS' || event.code === 'ArrowDown') {
            storkGrabKeys.down = true;
            storkGrabInputKind = 'keyboard';
            return true;
        }
        return false;
    };

    window.handleStorkGrabKeyUp = function(event) {
        if (!event) return false;
        let handled = false;
        if (event.code === 'KeyW' || event.code === 'ArrowUp') {
            handled = Boolean(storkModeActive && window.storkGrabActive);
            storkGrabKeys.up = false;
        }
        if (event.code === 'KeyS' || event.code === 'ArrowDown') {
            handled = Boolean(storkModeActive && window.storkGrabActive) || handled;
            storkGrabKeys.down = false;
        }
        return handled;
    };

    // Funkcje TRYB BOCIANA
    window.activateStorkMode = function(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        // During the transformation this same accessible button controls the
        // claws, so it remains useful to touch and assistive-technology users.
        if (gameRunning && storkModeActive) {
            if (window.storkGrabActive) window.releaseStorkPipeGrab('drop');
            else window.tryStartStorkPipeGrab(null, { button: true });
            return true;
        }
        
        // Można aktywować tylko podczas trybu żaby i gdy nie jest aktywny
        if (!gameRunning || !frogModeActive || rubberModeActive || storkModeActive || storkModeCooldown > 0) return false;
        if (!machineCanEnter('stork', { from: 'frog' })) return false;
        
        // Sprawdź czy gracz ma wystarczającą ilość monet
        const normalCoins = coinScore / coinValue;
        const purpleCoins = purpleCoinScore / purpleCoinValue;
        const frogCoins = frogCoinScore / frogCoinValue;
        
        if (normalCoins >= normalStorkModeCost && 
            purpleCoins >= purpleStorkModeCost && 
            frogCoins >= frogStorkModeCost) {
            // Najpierw posprzątaj poprzedni stan, potem wykonaj kontrolowane przejście.
            deactivateFrogMode({ skipNext: true, silent: true });
            if (!machineEnter('stork', { from: 'frog', force: true })) return false;
            
            // Odejmij koszt
            coinScore -= normalStorkModeCost * coinValue;
            purpleCoinScore -= purpleStorkModeCost * purpleCoinValue;
            frogCoinScore -= frogStorkModeCost * frogCoinValue;
            
            // Aktualizuj wyświetlanie monet
            bonusScoreElement.textContent = `Monety: ${coinScore / coinValue}`;
            purpleCoinScoreElement.textContent = `Super monety: ${purpleCoinScore / purpleCoinValue}`;
            const frogCoinElement = document.getElementById('frogCoinScore');
            if (frogCoinElement) {
                frogCoinElement.textContent = `Monety żabie: ${frogCoinScore / frogCoinValue}`;
            }
            
            // Aktywuj TRYB BOCIANA
            storkModeActive = true;
            storkModeTime = storkModeDuration;
            window.resetStorkPipeGrab({ reason: 'mode-activated', silent: true });
            gameArea.classList.add('stork-mode-active');
            storkModeTimer.style.display = 'block';
            storkModeTimer.textContent = `TRYB BOCIANA: ${storkModeDuration}s`;
            storkModeButton.style.display = 'flex';
            storkModeButton.disabled = true;
            applyModePhysics();
            
            // Przywróć widoczność jetpacka
            const jetpackFlames = bird.querySelector('.jetpack-flames');
            if (jetpackFlames) {
                jetpackFlames.style.display = '';
            }
            
            // Efekt dźwiękowy
            playSound('storkMode');
            const mutationSystem = window.SkyDodge && window.SkyDodge.mutations;
            if (mutationSystem && typeof mutationSystem.strain === 'function') {
                mutationSystem.strain(12, 'pipeImpact', { source: 'stork-activation' });
            }
            syncStorkGrabUi('mode-activated');
            
            // Pokaż efekt aktywacji
            const storkActivation = document.createElement('div');
            storkActivation.className = 'coinPop purpleCoinPop';
            storkActivation.style.color = '#FF4500';
            storkActivation.textContent = 'TRYB BOCIANA!\nWIATR MONET!';
            storkActivation.style.left = '50%';
            storkActivation.style.top = '50%';
            storkActivation.style.transform = 'translate(-50%, -50%) scale(2)';
            storkActivation.style.whiteSpace = 'pre';
            storkActivation.style.textAlign = 'center';
            gameArea.appendChild(storkActivation);
            
            setTimeout(() => {
                if (storkActivation && storkActivation.parentNode) {
                    gameArea.removeChild(storkActivation);
                }
            }, 1500);
            return true;
        }
        return false;
    }
    
    window.deactivateStorkMode = function() {
        if (!storkModeActive) return;
        
        console.log("Deaktywacja trybu bociana - rozpoczęcie czyszczenia");
        
        window.releaseStorkPipeGrab('mode-ended', {
            silent: true,
            skipCooldown: true
        });
        storkModeActive = false;
        machineLeave('stork');
        storkModeTime = 0;
        gameArea.classList.remove('stork-mode-active');
        storkModeTimer.style.display = 'none';
        window.resetStorkPipeGrab({ reason: 'mode-ended', silent: true });
        
        // Wyczyść wszystkie dodatkowe elementy związane z trybem bociana
        const windCoins = document.querySelectorAll('.windCoin');
        windCoins.forEach(coin => {
            if (coin && coin.parentNode) {
                coin.parentNode.removeChild(coin);
            }
        });
        coins = coins.filter(coin => !(coin.element && coin.element.classList.contains('windCoin')));
        
        // Zatrzymaj wszelkie animacje związane z bocianem
        if (bird.storkAnimation) {
            cancelAnimationFrame(bird.storkAnimation);
            bird.storkAnimation = null;
        }
        
        // Usuń wszystkie elementy bociana, które mogły pozostać
        const storkElements = bird.querySelectorAll('.wings, .cap');
        storkElements.forEach(element => {
            if (element && element.parentNode) {
                element.style.animation = 'none';
                element.parentNode.removeChild(element);
            }
        });
        
        // Przywracamy normalny wygląd ptaka - resetujemy do kaczorka
        bird.style.animation = 'crazyDuck 2s infinite alternate';
        bird.style.background = 'linear-gradient(135deg, #FFFF00, #FFA500, #FFD700)';
        bird.style.borderRadius = '50% 50% 30% 30%';
        bird.style.boxShadow = '0 2px 10px rgba(255, 215, 0, 0.7)';
        bird.style.filter = 'none';
        bird.style.transform = 'rotate(0deg)';
        
        // Usuń wszystkie klasy i style z animacji bociana
        bird.classList.remove('stork-mode', 'stork-flying');
        
        // Usuń wszystkie efekty rozbłysku, które mogły zostać
        const flashEffects = document.querySelectorAll('.stork-flash');
        flashEffects.forEach(effect => {
            if (effect && effect.parentNode && effect !== bird) {
                effect.parentNode.removeChild(effect);
            }
        });
        
        // Usuń klasy wizualnych efektów
        gameArea.classList.remove('screen-shake');
        
        applyModePhysics();
        
        // Pokaż komunikat o końcu trybu bociana
        const endModeMsg = document.createElement('div');
        endModeMsg.className = 'coinPop';
        endModeMsg.textContent = 'Koniec trybu bociana!';
        endModeMsg.style.left = '50%';
        endModeMsg.style.top = '50%';
        endModeMsg.style.transform = 'translate(-50%, -50%)';
        endModeMsg.style.color = '#FF4500';
        endModeMsg.style.fontSize = '24px';
        gameArea.appendChild(endModeMsg);
        
        setTimeout(() => {
            if (endModeMsg.parentNode) {
                gameArea.removeChild(endModeMsg);
            }
        }, 1500);
        
        // Ustaw cooldown
        storkModeCooldown = storkModeCooldownTime;
        storkModeButton.disabled = true;
        storkModeButton.style.display = 'none';
        
        setTimeout(() => {
            updateStorkModeButton();
        }, 500);
        
        console.log("Deaktywacja trybu bociana - zakończono czyszczenie");
        
        // Automatycznie aktywuj tryb ducha za darmo
        const pendingMutation = window.SkyDodge
            && window.SkyDodge.state
            && window.SkyDodge.state.mutation
            && window.SkyDodge.state.mutation.pending;
        if (!ghostModeActive && !pendingMutation) {
            activateGhostMode(null, true);
        }
    }
    
    window.updateStorkModeButton = function() {
        if (!gameRunning) return;

        if (storkModeActive) {
            syncStorkGrabUi('button-update');
            return;
        }
        if (!frogModeActive) return;
        
        const normalCoins = coinScore / coinValue;
        const purpleCoins = purpleCoinScore / purpleCoinValue;
        const frogCoins = frogCoinScore / frogCoinValue;
        const hasEnoughCoins = normalCoins >= normalStorkModeCost && 
                              purpleCoins >= purpleStorkModeCost && 
                              frogCoins >= frogStorkModeCost;
        storkModeButton.setAttribute('aria-pressed', 'false');
        storkModeButton.setAttribute('aria-label', 'Aktywuj tryb bociana');
        
        if (rubberModeActive) {
            storkModeButton.disabled = true;
            storkModeButton.querySelector('.mode-button-cost').textContent = 'ZAJĘTY';
        } else if (storkModeActive) {
            storkModeButton.disabled = true;
            storkModeButton.querySelector('.mode-button-cost').textContent = 'AKTYWNY!';
        } else if (storkModeCooldown > 0) {
            storkModeButton.disabled = true;
            storkModeButton.querySelector('.mode-button-cost').textContent = `${Math.ceil(storkModeCooldown)}s`;
        } else if (hasEnoughCoins) {
            storkModeButton.disabled = false;
            storkModeButton.querySelector('.mode-button-cost').textContent = `${normalStorkModeCost}🟡 ${purpleStorkModeCost}🟣 ${frogStorkModeCost}🐸`;
        } else {
            storkModeButton.disabled = true;
            storkModeButton.querySelector('.mode-button-cost').textContent = `${normalStorkModeCost}🟡 ${purpleStorkModeCost}🟣 ${frogStorkModeCost}🐸`;
        }
    }
    
    window.makeJump = function() {
        console.log("makeJump wywołane:", {
            gameRunning,
            frogModeActive,
            frogIsOnGround,
            velocity,
            steelModeActive,
            rubberModeActive
        });
        
        if (gameRunning) {
            if (frogModeActive) {
                // W trybie żaby zawsze pokazujemy pasek ładowania niezależnie czy żaba jest na ziemi
                // Faktyczny skok wykona się tylko gdy żaba jest na ziemi - sprawdzane w stopFrogCharging
                startFrogCharging();
                // Faktyczne wykonanie skoku obsługuje funkcja stopFrogCharging
            } else if (steelModeActive) {
                // W trybie stali mocniejszy skok
                velocity = jump * 1.2;
                playSound('jump');
                if (window.SkyDodge && window.SkyDodge.mutations) {
                    window.SkyDodge.mutations.record('jump', 2);
                }
                
                // Dodaj efekt błysku metalicznego
                const steelFlash = document.createElement('div');
                steelFlash.className = 'steel-flash';
                steelFlash.style.position = 'absolute';
                steelFlash.style.width = '100%';
                steelFlash.style.height = '100%';
                steelFlash.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                steelFlash.style.zIndex = '999';
                steelFlash.style.pointerEvents = 'none';
                gameArea.appendChild(steelFlash);
                
                setTimeout(() => {
                    if (steelFlash.parentNode) {
                        gameArea.removeChild(steelFlash);
                    }
                }, 100);
            } else {
                // Standardowy skok z jetpackiem dla normalnego trybu
                velocity = jump;
                playSound('jump');
                if (window.SkyDodge && window.SkyDodge.mutations) {
                    window.SkyDodge.mutations.record('jump', 2);
                }
                
                // Aktywuj efekt jetpacka
                const jetpackFlames = document.querySelector('.jetpack-flames');
                if (jetpackFlames) {
                    jetpackFlames.classList.add('active');
                    
                    // Deaktywuj efekt po 300ms
                    setTimeout(() => {
                        jetpackFlames.classList.remove('active');
                    }, 300);
                }
            }
        }
    }
});
