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
    const finalTotalScoreElement = document.getElementById('finalTotalScore');
    const ground = document.getElementById('ground');
    const frogModeButton = document.getElementById('frogModeButton');
    const frogModeTimer = document.getElementById('frogModeTimer');
    const ghostModeButton = document.getElementById('ghostModeButton');
    const ghostModeTimer = document.getElementById('ghostModeTimer');
    const storkModeButton = document.getElementById('storkModeButton');
    const storkModeTimer = document.getElementById('storkModeTimer');
    
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
    window.frogRubberModeChance = 0.10; // 10% szansa na tryb kauczuka (zwiększona)
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
    window.storkCoinWindInterval = 400; // Interwał wiatru monet
    window.lastStorkCoinWindTime = 0; // Ostatni czas wiatru monet
    window.storkCoinChance = 0.7; // 70% szansa na monetę w wietrze
    
    window.setupGame = function() {
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
        // Zatrzymaj wszystkie dźwięki przy restarcie gry
        stopAllSounds();
        
        setupGame();
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameRunning = true;
        lastTime = performance.now();
        animationId = requestAnimationFrame(update);
        
        // Pokaż przyciski trybu specjalnego gdy gra się rozpocznie
        frogModeButton.style.display = 'flex';
        ghostModeButton.style.display = 'flex';
        storkModeButton.style.display = 'none'; // Tryb bociana początkowo ukryty
        updateFrogModeButton();
        updateGhostModeButton();
    }
    
    window.endGame = function() {
        gameRunning = false;
        cancelAnimationFrame(animationId);
        finalScoreElement.textContent = score;
        finalCoinsElement.textContent = normalCoinCount;
        finalPurpleCoinsElement.textContent = purpleCoinCount;
        // Add frog coins to total score
        finalTotalScoreElement.textContent = score + coinScore + purpleCoinScore + frogCoinScore;
        gameOverScreen.style.display = 'flex';
        playSound('gameOver');
    }
    
    window.update = function(timestamp) {
        if (!gameRunning) return;
        
        if (!lastTime) lastTime = timestamp;
        deltaTime = (timestamp - lastTime) / 16.67;
        lastTime = timestamp;
        
        if (deltaTime > 5) deltaTime = 5;
        
        // Zarządzanie TRYBEM FROGA
        if (frogModeActive) {
            frogModeTime -= deltaTime / 60; // Odliczanie w sekundach
            frogModeTimer.textContent = `TRYB FROGA: ${Math.ceil(frogModeTime)}s`;
            
            // Aktualizuj wskaźnik ładowania skoku żaby
            if (frogIsCharging) {
                const chargeTime = Math.min(timestamp - frogChargeStart, frogChargeMax);
                const chargePercent = (chargeTime / frogChargeMax) * 100;
                
                const frogChargeBar = document.getElementById('frogJumpChargeBar');
                if (frogChargeBar) {
                    frogChargeBar.style.width = `${chargePercent}%`;
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
            if (timestamp - lastStorkTime > storkInterval && Math.random() < storkChance) {
                createStork();
                lastStorkTime = timestamp;
            }
            
            if (frogModeTime <= 0) {
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
            if (Math.random() < 0.02) {
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
            
            if (storkModeCooldown <= 0 && frogModeActive) {
                storkModeCooldown = 0;
                updateStorkModeButton();
            }
        }
        
        // Zarządzanie TRYBEM STALI
        if (steelModeActive) {
            // Dodaj błyszczące efekty dla stalowego ptaka
            if (Math.random() < 0.05) { // 5% szansa na błysk na każdej klatce
                const steelFlash = document.createElement('div');
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
        bird.style.top = birdPosition + 'px';
        
        let rotation = velocity * 2;
        if (rotation > 30) rotation = 30;
        if (rotation < -30) rotation = -30;
        bird.style.transform = `rotate(${rotation}deg)`;
        
        // W trybie froga zachowujemy ten sam odstęp między rurami, ale z podwojoną prędkością
        const effectivePipeInterval = frogModeActive ? pipeInterval / frogSpeedMultiplier : pipeInterval;
        
        if (timestamp - lastPipeTime > effectivePipeInterval) {
            createPipe();
            lastPipeTime = timestamp;
        }
        
        if (timestamp - lastCoinTime > coinInterval) {
            createCoin();
            lastCoinTime = timestamp;
        }
        
        pipes.forEach((pipe, index) => {
            pipe.x -= currentPipeSpeed * deltaTime;
            
            if (pipe.upPipe && pipe.downPipe) {
                pipe.upPipe.style.left = pipe.x + 'px';
                pipe.downPipe.style.left = pipe.x + 'px';
                
                if (!pipe.passed && pipe.x + pipeWidth < gameArea.clientWidth * (birdHorizontalPosition / 100)) {
                    pipe.passed = true;
                    score++;
                    scoreElement.textContent = score;
                }
                
                if (pipe.x + pipeWidth < 0) {
                    if (pipe.upPipe.parentNode) gameArea.removeChild(pipe.upPipe);
                    if (pipe.downPipe.parentNode) gameArea.removeChild(pipe.downPipe);
                    pipes.splice(index, 1);
                }
            }
        });
        
        // Obsługa bocianów
        for (let i = storks.length - 1; i >= 0; i--) {
            let stork = storks[i];
            stork.x -= currentPipeSpeed * deltaTime;
            
            if (stork.element) {
                stork.element.style.left = stork.x + 'px';
                
                // Sprawdź kolizję z bocianem
                if (!stork.defeated && checkStorkCollision(stork)) {
                    // Sprawdź, czy skok był z góry (zabicie bociana) lub czy w trybie stali
                    if ((velocity > 0 && birdPosition < stork.y) || steelModeActive) {
                        // W trybie stali kurczak rozpieprzaj bociany z dowolnej strony!
                        defeatStork(stork);
                        
                        // W trybie stali efekty specjalne są już obsługiwane w funkcji defeatStork
                        if (!steelModeActive) {
                            // Normalne odbicie przy pokonaniu bociana z góry
                            velocity = jump * 0.7; // Odbicie w górę po pokonaniu bociana
                        }
                    } else if (!invincible && !steelModeActive) {
                        // Przegrana, gdy dotknięcie z boku lub dołu i nie jest nieśmiertelny ani w trybie stali
                        endGame();
                        return;
                    }
                }
                
                // Usuń bociana, gdy wyleci poza ekran
                if (stork.x + stork.width < 0 || stork.defeated) {
                    if (stork.removeTime && timestamp > stork.removeTime) {
                        if (stork.element.parentNode) gameArea.removeChild(stork.element);
                        storks.splice(i, 1);
                    }
                }
            }
        }
        
        for (let i = coins.length - 1; i >= 0; i--) {
            let coin = coins[i];
            coin.x -= currentPipeSpeed * deltaTime;
            if (coin.element) {
                coin.element.style.left = coin.x + 'px';
                
                if (!coin.collected && checkCoinCollision(coin)) {
                    collectCoin(coin);
                    updateFrogModeButton();
                    updateGhostModeButton();
                    if (frogModeActive) {
                        updateStorkModeButton();
                    }
                }
                
                if (coin.x + 30 < 0 || coin.collected) {
                    if (coin.removeTime && timestamp > coin.removeTime) {
                        if (coin.element.parentNode) gameArea.removeChild(coin.element);
                        coins.splice(i, 1);
                    }
                }
            }
        }
        
        if (checkCollision()) {
            endGame();
            return;
        }
        
        animationId = requestAnimationFrame(update);
    }
    
    // Event listeners
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    
    // Dodajemy obsługę dotykowego ekranu dla przycisków trybów specjalnych
    frogModeButton.addEventListener('click', activateFrogMode);
    frogModeButton.addEventListener('touchstart', activateFrogMode, { passive: false });
    
    ghostModeButton.addEventListener('click', activateGhostMode);
    ghostModeButton.addEventListener('touchstart', activateGhostMode, { passive: false });
    
    storkModeButton.addEventListener('click', activateStorkMode);
    storkModeButton.addEventListener('touchstart', activateStorkMode, { passive: false });
    
    gameArea.addEventListener('touchstart', function(event) {
        event.preventDefault();
        if (gameRunning) {
            makeJump();
        }
    });
    
    gameArea.addEventListener('touchend', function(event) {
        event.preventDefault();
        if (gameRunning && frogModeActive && frogIsCharging) {
            stopFrogCharging();
        }
    });
    
    document.addEventListener('keydown', function(event) {
        if ((event.code === 'Space' || event.code === 'ArrowUp') && gameRunning) {
            event.preventDefault();
            makeJump();
        }
    });
    
    document.addEventListener('keyup', function(event) {
        if ((event.code === 'Space' || event.code === 'ArrowUp') && gameRunning && frogModeActive && frogIsCharging) {
            event.preventDefault();
            stopFrogCharging();
        }
    });
    
    gameArea.addEventListener('mousedown', function(event) {
        if (gameRunning) {
            makeJump();
        }
    });
    
    gameArea.addEventListener('mouseup', function(event) {
        if (gameRunning && frogModeActive && frogIsCharging) {
            stopFrogCharging();
        }
    });
    
    document.addEventListener('touchmove', function(event) {
        event.preventDefault();
    }, { passive: false });
    
    window.addEventListener('resize', function() {
        if (gameRunning) {
            bird.style.left = birdHorizontalPosition + '%';
        }
    });
    
    startScreen.addEventListener('touchstart', function(event) {
        event.preventDefault();
        startGame();
    });
    
    function delayedStart() {
        setTimeout(function() {
            startGame();
        }, 100);
    }
    
    startButton.addEventListener('click', delayedStart);
    restartButton.addEventListener('click', delayedStart);
});