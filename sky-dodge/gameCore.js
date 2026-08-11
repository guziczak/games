// Main Game Core
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const bird = document.getElementById('bird');
    const gameArea = document.getElementById('gameArea');
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const scoreElement = document.getElementById('score');
    const bonusScoreElement = document.getElementById('bonusScore');
    const purpleCoinScoreElement = document.getElementById('purpleCoinScore');
    const finalScoreElement = document.getElementById('finalScore');
    const finalCoinsElement = document.getElementById('finalCoins');
    const finalPurpleCoinsElement = document.getElementById('finalPurpleCoins');
    const finalFrogCoinsElement = document.getElementById('finalFrogCoins');
    const finalTotalScoreElement = document.getElementById('finalTotalScore');
    const ground = document.getElementById('ground');
    const frogModeButton = document.getElementById('frogModeButton');
    const frogModeTimer = document.getElementById('frogModeTimer');
    const ghostModeButton = document.getElementById('ghostModeButton');
    const ghostModeTimer = document.getElementById('ghostModeTimer');
    const storkModeButton = document.getElementById('storkModeButton');
    const storkModeTimer = document.getElementById('storkModeTimer');
    let renderedModeRevision = -1;
    
    // Make elements available globally
    window.bird = bird;
    window.gameArea = gameArea;
    window.startScreen = startScreen;
    window.gameOverScreen = gameOverScreen;
    window.startButton = startButton;
    window.restartButton = restartButton;
    window.scoreElement = scoreElement;
    window.bonusScoreElement = bonusScoreElement;
    window.purpleCoinScoreElement = purpleCoinScoreElement;
    window.finalScoreElement = finalScoreElement;
    window.finalCoinsElement = finalCoinsElement;
    window.finalPurpleCoinsElement = finalPurpleCoinsElement;
    window.finalFrogCoinsElement = finalFrogCoinsElement;
    window.finalTotalScoreElement = finalTotalScoreElement;
    window.ground = ground;
    window.frogModeButton = frogModeButton;
    window.frogModeTimer = frogModeTimer;
    window.ghostModeButton = ghostModeButton;
    window.ghostModeTimer = ghostModeTimer;
    window.storkModeButton = storkModeButton;
    window.storkModeTimer = storkModeTimer;
    
    // Game variables
    window.gameRunning = false;
    window.pipes = [];
    window.coins = [];
    window.storks = []; // Tablica bocianów
    window.score = 0;
    window.coinScore = 0;
    window.purpleCoinScore = 0;
    window.frogCoinScore = 0; // Nowa zmienna dla monet żabich
    window.normalCoinCount = 0;
    window.purpleCoinCount = 0;
    window.frogCoinCount = 0; // Licznik monet żabich
    window.gravity = 0.25;
    window.velocityLimit = 7;
    window.velocity = 0;
    window.jump = -7;
    window.birdPosition;
    window.birdHorizontalPosition = 15; // Pozycja pozioma ptaka jako % szerokości ekranu
    window.pipeWidth = 80;
    window.pipeGap = 220;
    window.pipeSpeed = 2;
    window.currentPipeSpeed = 2; // Do zmiany prędkości rur w trybach specjalnych
    window.pipeInterval = 2500;
    window.coinInterval = 1500;
    window.purpleCoinChance = 0.15; // 15% szansa na fioletową monetę
    window.lastPipeTime = 0;
    window.lastCoinTime = 0;
    window.lastStorkTime = 0; // Czas ostatniego bociana
    window.storkInterval = 2000; // Interwał spawnu bocianów (skrócony z 3000)
    window.storkChance = 0.80; // 80% szansa na pojawienie się bociana w trybie froga (zwiększona z 25%)
    window.animationId;
    window.lastTime = 0;
    window.deltaTime = 0;
    window.coinValue = 10;
    window.purpleCoinValue = 50;
    window.frogCoinValue = 100; // Wartość monety żabiej
    window.safePadding = 40; // Minimalna odległość monety od przeszkód
    
    // TRYB FROGA - zmienne
    window.frogModeActive = false;
    window.frogModeTime = 0;
    window.frogModeDuration = 8; // w sekundach
    window.frogModeCooldown = 0;
    window.frogModeCooldownTime = 5; // w sekundach
    window.normalFrogModeCost = 3; // koszt normalnych monet
    window.purpleFrogModeCost = 1; // koszt fioletowych monet
    window.normalJump = -7;
    window.frogJump = -11; // Mocniejszy skok w trybie żaby
    window.normalGravity = 0.25;
    window.frogGravity = 0.20; // Mniejsza grawitacja w trybie żaby
    window.frogSpeedMultiplier = 2; // Mnożnik prędkości dla trybu żaby
    window.invincible = false; // Flaga nieśmiertelności dla trybu żaby
    
    // Zmienne dla realistycznego skoku żaby
    window.frogIsCharging = false; // Czy żaba ładuje skok
    window.frogChargeStart = 0; // Czas rozpoczęcia ładowania skoku
    window.frogChargeMax = 1500; // Maksymalny czas ładowania skoku (ms)
    window.frogJumpMinPower = -8; // Minimalna siła skoku żaby
    window.frogJumpMaxPower = -15; // Maksymalna siła skoku żaby
    window.frogIsOnGround = false; // Czy żaba jest na ziemi
    window.frogChargeIndicator = null; // Element wskaźnika naładowania
    
    // Zmienne dla przeładowanego skoku żaby
    window.frogOverloadThreshold = 2000; // Próg czasowy przeładowania (ms)
    window.frogIsOverloaded = false; // Czy żaba jest przeładowana
    window.frogOverloadBounceCount = 0; // Licznik odbić przy przeładowaniu
    window.frogMaxBounces = 5; // Maksymalna liczba odbić
    window.frogRubberModeChance = 0.30; // 30% szansa na tryb kauczuka (znacznie zwiększona)
    window.rubberModeActive = false; // Czy tryb kauczuka jest aktywny
    window.rubberModeDuration = 20; // Czas trwania trybu kauczuka (sekundy) - znacznie dłuższy
    window.rubberModeTime = 0; // Pozostały czas trybu kauczuka
    window.steelModeActive = false; // Tryb stali - przejściowy między żabą a duchem
    window.steelModeDuration = 3; // Czas trwania trybu stali (sekundy)
    window.frogComplaintTimeout = null; // Timeout dla narzekań żaby
    
    // TRYB DUCHA - zmienne
    window.ghostModeActive = false;
    window.ghostModeTime = 0;
    window.ghostModeDuration = 5; // w sekundach
    window.ghostModeCooldown = 0;
    window.ghostModeCooldownTime = 7; // w sekundach
    window.normalGhostModeCost = 2; // koszt normalnych monet - dwie
    window.purpleGhostModeCost = 0; // koszt fioletowych monet - zero
    window.ghostMode = false; // Flaga trybu ducha
    
    // TRYB BOCIANA - zmienne
    window.storkModeActive = false;
    window.storkModeTime = 0;
    window.storkModeDuration = 6; // w sekundach
    window.storkModeCooldown = 0;
    window.storkModeCooldownTime = 10; // w sekundach
    window.normalStorkModeCost = 1; // koszt normalnych monet
    window.purpleStorkModeCost = 1; // koszt fioletowych monet
    window.frogStorkModeCost = 1; // koszt żabich monet
    window.storkCoinWindInterval = 600; // Interwał wiatru monet
    window.lastStorkCoinWindTime = 0; // Ostatni czas wiatru monet
    window.storkCoinChance = 0.5; // 50% szansa na monetę w wietrze

    function runtimeSession() {
        return window.SkyDodge && window.SkyDodge.state
            ? window.SkyDodge.state.session
            : null;
    }

    function scheduleNextFrame(generation) {
        animationId = requestAnimationFrame(timestamp => update(timestamp, generation));
        const session = runtimeSession();
        if (session) session.rafId = animationId;
    }

    function setScreenState(activeScreen) {
        const startActive = activeScreen === 'start';
        const gameOverActive = activeScreen === 'gameover';

        startScreen.style.display = startActive ? 'flex' : 'none';
        startScreen.setAttribute('aria-hidden', String(!startActive));
        startScreen.inert = !startActive;

        gameOverScreen.style.display = gameOverActive ? 'flex' : 'none';
        gameOverScreen.setAttribute('aria-hidden', String(!gameOverActive));
        gameOverScreen.inert = !gameOverActive;

        gameArea.setAttribute('aria-hidden', String(startActive || gameOverActive));
        gameArea.inert = startActive || gameOverActive;
    }

    function announce(message) {
        const status = document.getElementById('gameStatus');
        if (status) status.textContent = message;
    }

    function finalTotalScore() {
        return score
            + normalCoinCount * coinValue
            + purpleCoinCount * purpleCoinValue
            + frogCoinCount * frogCoinValue;
    }

    function isPastLeftEdge(entity, width) {
        const helper = window.SkyDodgeLogic && window.SkyDodgeLogic.isEntityOffscreen;
        if (typeof helper === 'function') {
            return helper(
                { x: entity.x, width: width || entity.width || 0 },
                gameArea.clientWidth,
                { direction: 'left' }
            );
        }
        return entity.x + (width || entity.width || 0) < 0;
    }

    function frogLocksWorldScroll() {
        return frogModeActive
            && bird.classList.contains('frog-clinging')
            && bird.dataset.clingingSurface === 'pipe-side';
    }

    function releaseStorkPipeForLifecycle(pipe, reason, options = {}) {
        if (pipe && pipe === window.storkGrabbedPipe
            && typeof window.releaseStorkPipeGrab === 'function') {
            window.releaseStorkPipeGrab(reason, options);
        }
    }

    function pointerStorkGrabActive() {
        return typeof window.isPointerStorkPipeGrab === 'function'
            ? window.isPointerStorkPipeGrab()
            : Boolean(window.storkGrabActive);
    }

    document.addEventListener('sky-dodge:mutation', function(event) {
        const mutationNames = {
            frog: 'żaba',
            rubber: 'kauczuk',
            steel: 'stal',
            ghost: 'duch'
        };
        const choice = event.detail && event.detail.choice;
        announce(`Mutacja biologiczna: ${mutationNames[choice] || choice || 'nieznana'}`);
    });
    
    window.setupGame = function() {
        if (typeof window.resetModePresentation === 'function') {
            window.resetModePresentation();
        } else if (typeof window.clearModeTimers === 'function') {
            window.clearModeTimers();
        }
        if (typeof window.clearEntityTimers === 'function') window.clearEntityTimers();
        if (window.SkyDodge && window.SkyDodge.modeMachine) {
            window.SkyDodge.modeMachine.reset();
        }
        if (window.SkyDodge && window.SkyDodge.mutations) {
            window.SkyDodge.mutations.reset();
        }

        score = 0;
        coinScore = 0;
        purpleCoinScore = 0;
        frogCoinScore = 0; // Reset frog coin score
        normalCoinCount = 0;
        purpleCoinCount = 0;
        frogCoinCount = 0; // Reset frog coin count
        scoreElement.textContent = score;
        bonusScoreElement.textContent = "Monety: 0";
        purpleCoinScoreElement.textContent = "Super monety: 0";
        const frogCoinScoreElement = document.getElementById('frogCoinScore');
        if (frogCoinScoreElement) {
            frogCoinScoreElement.textContent = "Monety żabie: 0";
        }
        velocity = 0;
        birdPosition = gameArea.clientHeight / 2;
        birdHorizontalPosition = 15;
        bird.style.top = birdPosition + 'px';
        bird.style.left = birdHorizontalPosition + '%';
        currentPipeSpeed = pipeSpeed;
        
        // Reset TRYB FROGA
        frogModeActive = false;
        frogModeTime = 0;
        frogModeCooldown = 0;
        jump = normalJump;
        gravity = normalGravity;
        invincible = false;
        frogModeButton.style.display = 'flex';
        frogModeTimer.style.display = 'none';
        gameArea.classList.remove('frog-mode-active');
        
        // Reset zmiennych realistycznego skoku żaby
        frogIsCharging = false;
        frogChargeStart = 0;
        frogIsOnGround = false;
        
        // Inicjalizacja wszystkich istotnych elementów UI dla skoku żaby
        frogChargeIndicator = document.getElementById('frogJumpChargeIndicator');
        const frogChargeBar = document.getElementById('frogJumpChargeBar');
        
        console.log("Resetowanie systemu skoku żaby:", {
            frogChargeIndicator: Boolean(frogChargeIndicator),
            frogChargeBar: Boolean(frogChargeBar)
        });
        
        // Ukryj wszystkie wskaźniki
        if (frogChargeIndicator) {
            frogChargeIndicator.style.display = 'none';
        }
        if (frogChargeBar) {
            frogChargeBar.style.width = '0%';
        }
        
        // Resetuj wszystkie wskaźniki bez deklarowania nowych zmiennych
        const overloadIndicatorEl = document.getElementById('frogOverloadIndicator');
        if (overloadIndicatorEl) {
            overloadIndicatorEl.style.display = 'none';
        }
        
        const rubberModeIndicatorEl = document.getElementById('rubberModeIndicator');
        if (rubberModeIndicatorEl) {
            rubberModeIndicatorEl.style.display = 'none';
        }
        
        // Reset przeładowania i trybu kauczuka
        frogIsOverloaded = false;
        frogOverloadBounceCount = 0;
        rubberModeActive = false;
        rubberModeTime = 0;
        steelModeActive = false; // Reset trybu stali
        window.rubberMoveX = 0;
        window.rubberHorizontalModifier = 0;
        window.rubberDragActive = false;
        
        // Usuń klasy animacji
        bird.classList.remove('overloaded', 'rubber-mode', 'jumping', 'charging');
        
        // Reset TRYB DUCHA
        ghostModeActive = false;
        ghostModeTime = 0;
        ghostModeCooldown = 0;
        ghostMode = false;
        ghostModeButton.style.display = 'flex';
        ghostModeTimer.style.display = 'none';
        gameArea.classList.remove('ghost-mode-active');
        
        // Reset TRYB BOCIANA
        storkModeActive = false;
        storkModeTime = 0;
        storkModeCooldown = 0;
        storkModeButton.style.display = 'none'; // Początkowo ukryte
        storkModeTimer.style.display = 'none';
        gameArea.classList.remove('stork-mode-active');
        if (typeof window.resetStorkPipeGrab === 'function') {
            window.resetStorkPipeGrab({ reason: 'game-setup', silent: true });
        }
        
        pipes.forEach(pipe => {
            if (pipe.upPipe && pipe.upPipe.parentNode) {
                gameArea.removeChild(pipe.upPipe);
            }
            if (pipe.downPipe && pipe.downPipe.parentNode) {
                gameArea.removeChild(pipe.downPipe);
            }
        });
        pipes = [];
        
        coins.forEach(coin => {
            if (coin.element && coin.element.parentNode) {
                gameArea.removeChild(coin.element);
            }
        });
        coins = [];
        
        // Usuń bocianów
        storks.forEach(stork => {
            if (stork.element && stork.element.parentNode) {
                gameArea.removeChild(stork.element);
            }
        });
        storks = [];
        
        lastPipeTime = 0;
        lastCoinTime = 0;
        lastStorkTime = 0;
        lastStorkCoinWindTime = 0;
        lastTime = 0;
    }
    
    window.startGame = function() {
        const session = runtimeSession();
        if (animationId) cancelAnimationFrame(animationId);
        if (session && session.rafId) cancelAnimationFrame(session.rafId);

        const generation = session ? ++session.generation : Date.now();

        // Zatrzymaj wszystkie dźwięki przy restarcie gry
        stopAllSounds();
        
        setupGame();
        setScreenState('game');
        gameRunning = true;
        lastTime = performance.now();
        scheduleNextFrame(generation);
        announce('Gra rozpoczęta');
        
        // Pokaż przyciski trybu specjalnego gdy gra się rozpocznie
        frogModeButton.style.display = 'flex';
        ghostModeButton.style.display = 'flex';
        storkModeButton.style.display = 'none'; // Tryb bociana początkowo ukryty
        updateFrogModeButton();
        updateGhostModeButton();
    }
    
    window.endGame = function() {
        gameRunning = false;
        if (typeof window.resetStorkPipeGrab === 'function') {
            window.resetStorkPipeGrab({ reason: 'game-ended', silent: true });
        }
        cancelAnimationFrame(animationId);
        const session = runtimeSession();
        if (session) {
            if (session.rafId) cancelAnimationFrame(session.rafId);
            session.rafId = null;
            session.generation++;
        }
        gameArea.classList.remove('frog-scroll-locked');
        finalScoreElement.textContent = score;
        finalCoinsElement.textContent = normalCoinCount;
        finalPurpleCoinsElement.textContent = purpleCoinCount;
        finalFrogCoinsElement.textContent = frogCoinCount;
        // Add frog coins to total score
        finalTotalScoreElement.textContent = finalTotalScore();
        setScreenState('gameover');
        announce(`Koniec gry. Całkowity wynik: ${finalTotalScore()}`);
        playSound('gameOver');
        requestAnimationFrame(() => restartButton.focus());
    }
    
    window.update = function(timestamp, generation) {
        if (!gameRunning) return;
        const session = runtimeSession();
        if (session && generation !== session.generation) return;
        
        if (!lastTime) lastTime = timestamp;
        deltaTime = (timestamp - lastTime) / 16.67;
        lastTime = timestamp;
        
        if (deltaTime > 5) deltaTime = 5;

        const modeMachine = window.SkyDodge && window.SkyDodge.modeMachine;
        if (modeMachine && modeMachine.revision !== renderedModeRevision) {
            renderedModeRevision = modeMachine.revision;
            updateFrogModeButton();
            updateGhostModeButton();
            if (frogModeActive) updateStorkModeButton();
        }

        // A side-clinging frog needs enough real time to charge and release a
        // jump. Keep the mode timer running, but pause horizontal world motion
        // and spawning so a pipe can never carry the player out of frame.
        const worldPausedByFrog = frogLocksWorldScroll();
        gameArea.classList.toggle('frog-scroll-locked', worldPausedByFrog);
        
        // Zarządzanie TRYBEM FROGA
        if (frogModeActive) {
            if (!rubberModeActive) {
                frogModeTime -= deltaTime / 60;
                frogModeTimer.textContent = worldPausedByFrog
                    ? `ŻABA TRZYMA ŚWIAT: ${Math.ceil(frogModeTime)}s`
                    : `TRYB FROGA: ${Math.ceil(frogModeTime)}s`;
            } else {
                frogModeTimer.textContent = 'TRYB FROGA: MUTACJA';
            }
            
            // Aktualizuj wskaźnik ładowania skoku żaby
            if (frogIsCharging) {
                const chargeTime = timestamp - frogChargeStart;
                // Pozwalamy na wizualne przekroczenie 100% gdy żaba się przeładowuje dla efektu humorystycznego
                const chargeMaxVisual = chargeTime > frogOverloadThreshold ? 130 : 100;
                const chargePercent = (chargeTime / frogChargeMax) * 100;
                
                const frogChargeBar = document.getElementById('frogJumpChargeBar');
                if (frogChargeBar) {
                    // Pozwól pasku wyjść za skalę przy przeładowaniu - efekt humorystyczny
                    frogChargeBar.style.width = `${Math.min(chargePercent, chargeMaxVisual)}%`;
                    
                    // Dodajemy efekt pulsowania gdy przekraczamy normalny czas ładowania
                    if (chargeTime > frogChargeMax) {
                        frogChargeBar.style.animation = 'chargeBarPulse 0.2s infinite alternate';
                    } else {
                        frogChargeBar.style.animation = 'chargeBarPulse 0.5s infinite alternate';
                    }
                }
                
                // Subtelna animacja dla żaby podczas ładowania
                const backThigh = bird.querySelector('.frog-back-thigh');
                if (backThigh) {
                    const squatAmount = 5 + (chargePercent / 100) * 15; // Od 5 do 20 stopni
                    backThigh.style.transform = `rotate(${squatAmount}deg)`;
                }
            }
            
            // Sprawdź, czy pokazać przycisk trybu bociana
            if (frogCoinScore >= frogStorkModeCost * frogCoinValue && 
                coinScore >= normalStorkModeCost * coinValue && 
                purpleCoinScore >= purpleStorkModeCost * purpleCoinValue) {
                storkModeButton.style.display = 'flex';
                updateStorkModeButton();
            }
            
            // Losowo twórz bociana w trybie froga
            if (!worldPausedByFrog && timestamp - lastStorkTime > storkInterval) {
                lastStorkTime = timestamp;
                if (Math.random() < storkChance) createStork();
            }
            
            if (frogModeTime <= 0 && !rubberModeActive) {
                deactivateFrogMode();
            }
        }
        
        // Zarządzanie TRYBEM KAUCZUKA
        if (rubberModeActive) {
            rubberModeTime -= deltaTime / 60; // Odliczanie w sekundach
            
            // Aktualizacja wskaźnika trybu kauczuka
            const rubberModeTimer = document.getElementById('rubberModeTimer');
            if (rubberModeTimer) {
                rubberModeTimer.textContent = `${Math.ceil(rubberModeTime)}s`;
            }
            
            // Efekt losowego odbijania podczas trybu kauczuka - 2% szansa na każdą klatkę
            if (Math.random() < 1 - Math.pow(1 - 0.02, deltaTime)) {
                // Losowy "impuls" w dowolnym kierunku
                velocity += randomBetween(-5, 5);
                if (velocity > velocityLimit) velocity = velocityLimit;
                if (velocity < -velocityLimit) velocity = -velocityLimit;
                
                // Efekt dźwiękowy
                playSound('jump');
            }
            
            // Zakończenie trybu kauczuka
            if (rubberModeTime <= 0) {
                deactivateRubberMode();
            }
        }
        
        // Obsługa cooldownu trybu FROGA
        if (frogModeCooldown > 0) {
            frogModeCooldown -= deltaTime / 60;
            updateFrogModeButton();
            
            if (frogModeCooldown <= 0) {
                frogModeCooldown = 0;
                updateFrogModeButton();
            }
        }
        
        // Zarządzanie TRYBEM DUCHA
        if (ghostModeActive) {
            ghostModeTime -= deltaTime / 60; // Odliczanie w sekundach
            ghostModeTimer.textContent = `TRYB DUCHA: ${Math.ceil(ghostModeTime)}s`;
            
            if (ghostModeTime <= 0) {
                deactivateGhostMode();
            }
        }
        
        // Obsługa cooldownu trybu DUCHA
        if (ghostModeCooldown > 0) {
            ghostModeCooldown -= deltaTime / 60;
            updateGhostModeButton();
            
            if (ghostModeCooldown <= 0) {
                ghostModeCooldown = 0;
                updateGhostModeButton();
            }
        }
        
        // Zarządzanie TRYBEM BOCIANA
        if (storkModeActive) {
            storkModeTime -= deltaTime / 60; // Odliczanie w sekundach
            storkModeTimer.textContent = `TRYB BOCIANA: ${Math.ceil(storkModeTime)}s`;
            
            // Generowanie monet w wietrze
            if (timestamp - lastStorkCoinWindTime > storkCoinWindInterval) {
                if (Math.random() < storkCoinChance) {
                    createWindCoin();
                }
                lastStorkCoinWindTime = timestamp;
            }
            
            if (storkModeTime <= 0) {
                deactivateStorkMode();
            }
        }
        
        // Obsługa cooldownu trybu BOCIANA
        if (storkModeCooldown > 0) {
            storkModeCooldown -= deltaTime / 60;
            if (frogModeActive) updateStorkModeButton();
            
            if (storkModeCooldown <= 0 && frogModeActive) {
                storkModeCooldown = 0;
                updateStorkModeButton();
            }
        }
        
        // Zarządzanie TRYBEM STALI
        if (typeof window.updateStorkPipeGrab === 'function') {
            window.updateStorkPipeGrab(timestamp, deltaTime / 60);
        }

        if (steelModeActive) {
            // Dodaj błyszczące efekty dla stalowego ptaka
            if (Math.random() < 1 - Math.pow(1 - 0.05, deltaTime)) {
                const steelFlash = document.createElement('div');
                steelFlash.className = 'steel-flash';
                steelFlash.style.position = 'absolute';
                steelFlash.style.width = '10px';
                steelFlash.style.height = '10px';
                steelFlash.style.borderRadius = '50%';
                steelFlash.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                steelFlash.style.boxShadow = '0 0 5px rgba(255, 255, 255, 0.8)';
                
                // Losowa pozycja na stalowym ptaku
                const birdRect = bird.getBoundingClientRect();
                steelFlash.style.left = (birdRect.left + Math.random() * birdRect.width) + 'px';
                steelFlash.style.top = (birdRect.top + Math.random() * birdRect.height) + 'px';
                
                gameArea.appendChild(steelFlash);
                
                // Usuń błysk po chwili
                setTimeout(() => {
                    if (steelFlash.parentNode) {
                        gameArea.removeChild(steelFlash);
                    }
                }, 300);
            }
        }
        
        velocity += gravity * deltaTime;
        
        if (velocity > velocityLimit) velocity = velocityLimit;
        
        birdPosition += velocity * deltaTime;

        if (rubberModeActive && Number.isFinite(window.rubberMoveX)) {
            birdHorizontalPosition += window.rubberMoveX * 0.035 * deltaTime;
            birdHorizontalPosition = Math.max(4, Math.min(88, birdHorizontalPosition));
            window.rubberMoveX *= Math.pow(window.rubberDamping || 0.96, deltaTime);
            if (Math.abs(window.rubberMoveX) < 0.05) window.rubberMoveX = 0;
            bird.style.left = birdHorizontalPosition + '%';
        }
        
        bird.style.top = birdPosition + 'px';
        
        let rotation = velocity * 2;
        if (rotation > 30) rotation = 30;
        if (rotation < -30) rotation = -30;
        bird.style.transform = `rotate(${rotation}deg)`;
        
        // W trybie froga zachowujemy ten sam odstęp między rurami, ale z podwojoną prędkością
        const effectivePipeInterval = frogModeActive ? pipeInterval / frogSpeedMultiplier : pipeInterval;
        
        if (!worldPausedByFrog && timestamp - lastPipeTime > effectivePipeInterval) {
            createPipe();
            lastPipeTime = timestamp;
        }
        
        if (!worldPausedByFrog && timestamp - lastCoinTime > coinInterval) {
            createCoin();
            lastCoinTime = timestamp;
        }
        
        // Usuń wszystkie zniszczone rury przed aktualizacją
        for (let i = pipes.length - 1; i >= 0; i--) {
            const pipe = pipes[i];
            if (pipe.destroyed || pipe.scheduledForRemoval) {
                releaseStorkPipeForLifecycle(pipe, 'pipe-removed');
                // Usuń zniszczone rury z DOM i z tablicy
                if (pipe.upPipe && pipe.upPipe.parentNode) {
                    gameArea.removeChild(pipe.upPipe);
                }
                if (pipe.downPipe && pipe.downPipe.parentNode) {
                    gameArea.removeChild(pipe.downPipe);
                }
                pipes.splice(i, 1);
            }
        }
        
        // Główna pętla aktualizacji rur - użyj standardowej pętli zamiast forEach
        // Iterujemy od końca, aby bezpiecznie usuwać elementy
        for (let i = pipes.length - 1; i >= 0; i--) {
            const pipe = pipes[i];
            if (!pipe.upPipe || !pipe.downPipe) {
                releaseStorkPipeForLifecycle(pipe, 'pipe-invalid');
            }
            
            pipe.x -= worldPausedByFrog ? 0 : currentPipeSpeed * deltaTime;
            
            if (pipe.upPipe && pipe.downPipe) {
                pipe.upPipe.style.left = pipe.x + 'px';
                pipe.downPipe.style.left = pipe.x + 'px';
                
                if (!pipe.passed && pipe.x + pipeWidth < gameArea.clientWidth * (birdHorizontalPosition / 100)) {
                    pipe.passed = true;
                    score++;
                    scoreElement.textContent = score;

                    const birdPassRect = bird.getBoundingClientRect();
                    const upperRect = pipe.downPipe.getBoundingClientRect();
                    const lowerRect = pipe.upPipe.getBoundingClientRect();
                    const clearance = Math.min(
                        Math.abs(birdPassRect.top - upperRect.bottom),
                        Math.abs(lowerRect.top - birdPassRect.bottom)
                    );
                    if (window.SkyDodge && window.SkyDodge.mutations && clearance < 28) {
                        window.SkyDodge.mutations.record('nearMiss', 14);
                    }
                }
                
                if (isPastLeftEdge(pipe, pipeWidth)) {
                    releaseStorkPipeForLifecycle(pipe, 'pipe-offscreen');
                    if (pipe.upPipe.parentNode) gameArea.removeChild(pipe.upPipe);
                    if (pipe.downPipe.parentNode) gameArea.removeChild(pipe.downPipe);
                    pipes.splice(i, 1);
                }
            } else {
                // Jeśli rura ma brakujące elementy, usuń ją
                releaseStorkPipeForLifecycle(pipe, 'pipe-invalid');
                pipes.splice(i, 1);
            }
        }
        
        // Obsługa bocianów
        for (let i = storks.length - 1; i >= 0; i--) {
            let stork = storks[i];
            if (!stork.element || !stork.element.parentNode) {
                storks.splice(i, 1);
                continue;
            }
            stork.x -= worldPausedByFrog ? 0 : currentPipeSpeed * deltaTime;
            
            if (stork.element) {
                stork.element.style.left = stork.x + 'px';
                
                // Usuń bociana, gdy wyleci poza ekran
                if (isPastLeftEdge(stork, stork.width) || stork.defeated) {
                    if (!stork.defeated || !stork.removeTime || timestamp > stork.removeTime) {
                        if (stork.element.parentNode) gameArea.removeChild(stork.element);
                        storks.splice(i, 1);
                    }
                }
            }
        }
        
        for (let i = coins.length - 1; i >= 0; i--) {
            let coin = coins[i];
            if (!coin.element || !coin.element.parentNode) {
                coins.splice(i, 1);
                continue;
            }
            coin.x -= worldPausedByFrog ? 0 : currentPipeSpeed * deltaTime;
            if (coin.element) {
                coin.element.style.left = coin.x + 'px';
                
                if (isPastLeftEdge(coin, 30) || coin.collected) {
                    if (!coin.collected || !coin.removeTime || timestamp > coin.removeTime) {
                        if (coin.element.parentNode) gameArea.removeChild(coin.element);
                        coins.splice(i, 1);
                    }
                }
            }
        }
        
        if (typeof processCollisions === 'function' && processCollisions(timestamp)) {
            endGame();
            return;
        }
        
        scheduleNextFrame(generation);
    }
    
    // Event listeners
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    
    // A native click covers mouse, touch, keyboard and assistive technology.
    frogModeButton.addEventListener('click', activateFrogMode);
    ghostModeButton.addEventListener('click', activateGhostMode);
    storkModeButton.addEventListener('click', activateStorkMode);

    const gameplayControlSelector = [
        'button', 'a', 'input', 'textarea', 'select', 'option', 'label',
        '[contenteditable="true"]', '[role="button"]'
    ].join(', ');
    let activeGameplayInput = null;
    let ignoreCompatibilityMouseUntil = 0;

    function gameplayInputTargetsControl(event) {
        let target = event && event.target;
        if (target && target.nodeType !== 1) target = target.parentElement;
        return Boolean(target && typeof target.closest === 'function'
            && target.closest(gameplayControlSelector));
    }

    function cancelFrogCharge() {
        if (!frogIsCharging) return;
        frogIsCharging = false;
        frogChargeStart = 0;
        bird.classList.remove('charging');
        if (frogChargeIndicator) frogChargeIndicator.style.display = 'none';
        const chargeBar = document.getElementById('frogJumpChargeBar');
        if (chargeBar) chargeBar.style.width = '0%';
    }

    function beginGameplayInput(event, source, id) {
        if (!gameRunning || rubberModeActive || gameplayInputTargetsControl(event)
            || activeGameplayInput) return false;

        activeGameplayInput = { source, id };
        const storkConsumed = typeof window.tryStartStorkPipeGrab === 'function'
            && window.tryStartStorkPipeGrab(event);
        activeGameplayInput.stork = Boolean(storkConsumed);

        if (!storkConsumed) makeJump();
        return true;
    }

    function moveGameplayInput(event, source, id) {
        if (!activeGameplayInput || activeGameplayInput.source !== source
            || activeGameplayInput.id !== id) return;
        if (pointerStorkGrabActive() && typeof window.moveStorkPipeGrab === 'function') {
            window.moveStorkPipeGrab(event);
        }
    }

    function finishGameplayInput(event, source, id, cancelled = false) {
        if (!activeGameplayInput || activeGameplayInput.source !== source
            || activeGameplayInput.id !== id) return;

        // Clear first: releasing pointer capture can synchronously emit
        // lostpointercapture in some engines.
        activeGameplayInput = null;
        if (pointerStorkGrabActive() && typeof window.releaseStorkPipeGrab === 'function') {
            window.releaseStorkPipeGrab(cancelled ? 'cancel' : 'drop');
        } else if (cancelled) {
            // A browser gesture (for example pinch zoom) must not launch a frog.
            cancelFrogCharge();
        } else if (gameRunning && frogModeActive && frogIsCharging) {
            stopFrogCharging();
        }

        if (source === 'pointer' && event && Number.isFinite(event.pointerId)
            && typeof gameArea.hasPointerCapture === 'function'
            && gameArea.hasPointerCapture(event.pointerId)) {
            try {
                gameArea.releasePointerCapture(event.pointerId);
            } catch (error) {
                // The browser may already have released capture on pointercancel.
            }
        }
    }

    function cancelActiveGameplayInput(reason) {
        if (!activeGameplayInput) return;
        const active = activeGameplayInput;
        finishGameplayInput(null, active.source, active.id, true);
    }

    if ('PointerEvent' in window) {
        gameArea.addEventListener('pointerdown', function(event) {
            if (event.pointerType === 'touch' && activeGameplayInput
                && activeGameplayInput.id !== event.pointerId) {
                // Leave a multi-touch gesture entirely to the browser.
                cancelActiveGameplayInput('multitouch');
                return;
            }
            if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
            if (!beginGameplayInput(event, 'pointer', event.pointerId)) return;

            if (typeof gameArea.setPointerCapture === 'function') {
                try {
                    gameArea.setPointerCapture(event.pointerId);
                } catch (error) {
                    // Global pointerup remains a reliable release fallback.
                }
            }
        });

        document.addEventListener('pointermove', function(event) {
            moveGameplayInput(event, 'pointer', event.pointerId);
        });
        document.addEventListener('pointerup', function(event) {
            finishGameplayInput(event, 'pointer', event.pointerId);
        });
        document.addEventListener('pointercancel', function(event) {
            finishGameplayInput(event, 'pointer', event.pointerId, true);
        });
        gameArea.addEventListener('lostpointercapture', function(event) {
            finishGameplayInput(event, 'pointer', event.pointerId, true);
        });
    } else {
        // Safari before Pointer Events: keep touch and compatibility mouse as a
        // fallback, but never install both paths on modern browsers.
        gameArea.addEventListener('touchstart', function(event) {
            ignoreCompatibilityMouseUntil = Date.now() + 900;
            if (event.touches.length !== 1) {
                cancelActiveGameplayInput('multitouch');
                return;
            }
            const touch = event.changedTouches[0] || event.touches[0];
            beginGameplayInput(event, 'touch', touch.identifier);
        }, { passive: true });

        document.addEventListener('touchmove', function(event) {
            if (!activeGameplayInput || activeGameplayInput.source !== 'touch') return;
            if (event.touches.length !== 1) {
                cancelActiveGameplayInput('multitouch');
                return;
            }
            moveGameplayInput(event, 'touch', activeGameplayInput.id);
        }, { passive: true });
        document.addEventListener('touchend', function(event) {
            if (!activeGameplayInput || activeGameplayInput.source !== 'touch') return;
            const activeId = activeGameplayInput.id;
            const ended = Array.from(event.changedTouches || [])
                .some(touch => touch.identifier === activeId);
            if (ended) finishGameplayInput(event, 'touch', activeId);
        }, { passive: true });
        document.addEventListener('touchcancel', function() {
            cancelActiveGameplayInput('touchcancel');
        }, { passive: true });

        gameArea.addEventListener('mousedown', function(event) {
            if (Date.now() < ignoreCompatibilityMouseUntil || event.button !== 0) return;
            beginGameplayInput(event, 'mouse', 1);
        });
        document.addEventListener('mousemove', function(event) {
            moveGameplayInput(event, 'mouse', 1);
        });
        document.addEventListener('mouseup', function(event) {
            if (event.button === 0) finishGameplayInput(event, 'mouse', 1);
        });
    }
    
    document.addEventListener('keydown', function(event) {
        if (event.target.closest && event.target.closest('button, a, input, textarea, select')) return;
        if (typeof window.handleStorkGrabKeyDown === 'function'
            && window.handleStorkGrabKeyDown(event)) {
            event.preventDefault();
            return;
        }
        if ((event.code === 'Space' || event.code === 'ArrowUp') && gameRunning) {
            event.preventDefault();
            makeJump();
        }
    });
    
    document.addEventListener('keyup', function(event) {
        if (event.target.closest && event.target.closest('button, a, input, textarea, select')) return;
        if (typeof window.handleStorkGrabKeyUp === 'function'
            && window.handleStorkGrabKeyUp(event)) {
            event.preventDefault();
            return;
        }
        if ((event.code === 'Space' || event.code === 'ArrowUp') && gameRunning && frogModeActive && frogIsCharging) {
            event.preventDefault();
            stopFrogCharging();
        }
    });
    
    window.addEventListener('resize', function() {
        if (window.storkGrabActive && typeof window.releaseStorkPipeGrab === 'function') {
            window.releaseStorkPipeGrab('resize', { skipCooldown: true });
        }
        if (gameRunning) {
            bird.style.left = birdHorizontalPosition + '%';
        }
    });
    
    const muteButton = document.getElementById('muteButton');
    if (muteButton) {
        muteButton.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            if (typeof window.toggleMute === 'function') {
                const muted = window.toggleMute();
                muteButton.setAttribute('aria-pressed', String(muted));
                muteButton.textContent = muted ? '🔇' : '🔊';
                muteButton.setAttribute('aria-label', muted ? 'Włącz dźwięk' : 'Wycisz dźwięk');
            }
        });
    }
});
