document.addEventListener('DOMContentLoaded', function() {
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
    
    let gameRunning = false;
    let pipes = [];
    let coins = [];
    let storks = []; // Tablica bocianów
    let score = 0;
    let coinScore = 0;
    let purpleCoinScore = 0;
    let frogCoinScore = 0; // Nowa zmienna dla monet żabich
    let normalCoinCount = 0;
    let purpleCoinCount = 0;
    let frogCoinCount = 0; // Licznik monet żabich
    let gravity = 0.25;
    let velocityLimit = 7;
    let velocity = 0;
    let jump = -7;
    let birdPosition;
    let birdHorizontalPosition = 15; // Pozycja pozioma ptaka jako % szerokości ekranu
    let pipeWidth = 80;
    let pipeGap = 220;
    let pipeSpeed = 2;
    let currentPipeSpeed = 2; // Do zmiany prędkości rur w trybach specjalnych
    let pipeInterval = 2500;
    let coinInterval = 1500;
    let purpleCoinChance = 0.15; // 15% szansa na fioletową monetę
    let lastPipeTime = 0;
    let lastCoinTime = 0;
    let lastStorkTime = 0; // Czas ostatniego bociana
    let storkInterval = 2000; // Interwał spawnu bocianów (skrócony z 3000)
    let storkChance = 0.80; // 80% szansa na pojawienie się bociana w trybie froga (zwiększona z 25%)
    let animationId;
    let lastTime = 0;
    let deltaTime = 0;
    let coinValue = 10;
    let purpleCoinValue = 50;
    let frogCoinValue = 100; // Wartość monety żabiej
    let safePadding = 40; // Minimalna odległość monety od przeszkód
    
    // TRYB FROGA - zmienne
    let frogModeActive = false;
    let frogModeTime = 0;
    let frogModeDuration = 8; // w sekundach
    let frogModeCooldown = 0;
    let frogModeCooldownTime = 5; // w sekundach
    let normalFrogModeCost = 3; // koszt normalnych monet
    let purpleFrogModeCost = 1; // koszt fioletowych monet
    let normalJump = -7;
    let frogJump = -11; // Mocniejszy skok w trybie żaby
    let normalGravity = 0.25;
    let frogGravity = 0.20; // Mniejsza grawitacja w trybie żaby
    let frogSpeedMultiplier = 2; // Mnożnik prędkości dla trybu żaby
    let invincible = false; // Flaga nieśmiertelności dla trybu żaby
    
    // Nowe zmienne dla realistycznego skoku żaby
    let frogIsCharging = false; // Czy żaba ładuje skok
    let frogChargeStart = 0; // Czas rozpoczęcia ładowania skoku
    let frogChargeMax = 1500; // Maksymalny czas ładowania skoku (ms)
    let frogJumpMinPower = -8; // Minimalna siła skoku żaby
    let frogJumpMaxPower = -15; // Maksymalna siła skoku żaby
    let frogIsOnGround = false; // Czy żaba jest na ziemi
    let frogChargeIndicator = null; // Element wskaźnika naładowania
    
    // TRYB DUCHA - zmienne
    let ghostModeActive = false;
    let ghostModeTime = 0;
    let ghostModeDuration = 5; // w sekundach
    let ghostModeCooldown = 0;
    let ghostModeCooldownTime = 7; // w sekundach
    let normalGhostModeCost = 2; // koszt normalnych monet - dwie
    let purpleGhostModeCost = 0; // koszt fioletowych monet - zero
    let ghostMode = false; // Flaga trybu ducha
    
    // TRYB BOCIANA - zmienne
    let storkModeActive = false;
    let storkModeTime = 0;
    let storkModeDuration = 6; // w sekundach
    let storkModeCooldown = 0;
    let storkModeCooldownTime = 10; // w sekundach
    let normalStorkModeCost = 1; // koszt normalnych monet
    let purpleStorkModeCost = 1; // koszt fioletowych monet
    let frogStorkModeCost = 1; // koszt żabich monet
    let storkCoinWindInterval = 400; // Interwał wiatru monet
    let lastStorkCoinWindTime = 0; // Ostatni czas wiatru monet
    let storkCoinChance = 0.7; // 70% szansa na monetę w wietrze

function setupGame() {
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
        frogChargeIndicator = document.getElementById('frogJumpChargeIndicator');
        const frogChargeBar = document.getElementById('frogJumpChargeBar');
        if (frogChargeIndicator) {
            frogChargeIndicator.style.display = 'none';
        }
        if (frogChargeBar) {
            frogChargeBar.style.width = '0%';
        }
        
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
    
    function startGame() {
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
    
    function endGame() {
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
    
    function update(timestamp) {
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
            // Sprawdź, czy skok był z góry (zabicie bociana)
            if (velocity > 0 && birdPosition < stork.y) {
                defeatStork(stork);
                velocity = jump * 0.7; // Odbicie w górę po pokonaniu bociana
            } else if (!invincible) {
                // Przegrana, gdy dotknięcie z boku lub dołu i nie jest nieśmiertelny
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

function createPipe() {
    const gameAreaHeight = gameArea.clientHeight;
    const groundHeight = ground.clientHeight;
    const maxPipeHeight = gameAreaHeight - groundHeight - pipeGap - 80;
    const minHeight = 50;

    if (maxPipeHeight < minHeight) {
        console.error("Nie można utworzyć rur: niewystarczająca wysokość.");
        return;
    }

    const randomHeight = Math.floor(Math.random() * (maxPipeHeight - minHeight)) + minHeight;
    
    const upPipe = document.createElement('div');
    if (!upPipe) {
        console.error("Nie udało się utworzyć górnej rury.");
        return;
    }
    upPipe.className = 'pipe pipeUp';
    upPipe.style.height = gameAreaHeight - randomHeight - groundHeight - pipeGap + 'px';
    upPipe.style.left = gameArea.clientWidth + 'px';
    
    const downPipe = document.createElement('div');
    if (!downPipe) {
        console.error("Nie udało się utworzyć dolnej rury.");
        return;
    }
    downPipe.className = 'pipe pipeDown';
    downPipe.style.height = randomHeight + 'px';
    downPipe.style.left = gameArea.clientWidth + 'px';
    
    gameArea.appendChild(upPipe);
    gameArea.appendChild(downPipe);
    
    pipes.push({
        x: gameArea.clientWidth,
        upPipe: upPipe,
        downPipe: downPipe,
        passed: false
    });
}

function createCoin() {
    const gameAreaHeight = gameArea.clientHeight;
    const groundHeight = ground.clientHeight;
    const safeArea = gameAreaHeight - groundHeight - 60;
    const minHeight = 80;
    const maxHeight = safeArea - 80;

    if (maxHeight < minHeight) {
        console.error("Nie można utworzyć monety: niewystarczająca wysokość.");
        return;
    }

    const randomY = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
    const randomX = gameArea.clientWidth + Math.floor(Math.random() * 100); // Zawsze poza ekranem
    
    const coin = document.createElement('div');
    if (!coin) {
        console.error("Nie udało się utworzyć monety.");
        return;
    }
    
    // Losowo tworzymy fioletową monetę
    const isPurpleCoin = Math.random() < purpleCoinChance;
    
    if (isPurpleCoin) {
        coin.className = 'coin purpleCoin';
    } else {
        coin.className = 'coin';
    }
    
    coin.style.left = randomX + 'px';
    coin.style.top = randomY + 'px';
    
    gameArea.appendChild(coin);
    
    coins.push({
        x: randomX,
        y: randomY,
        element: coin,
        collected: false,
        removeTime: null
    });
}

function checkCoinCollision(coin) {
    const birdRect = bird.getBoundingClientRect();
    const coinRect = coin.element.getBoundingClientRect();
    
    return (
        birdRect.right >= coinRect.left &&
        birdRect.left <= coinRect.right &&
        birdRect.bottom >= coinRect.top &&
        birdRect.top <= coinRect.bottom
    );
}

function checkStorkCollision(stork) {
    if (stork.defeated) return false;
    
    const birdRect = bird.getBoundingClientRect();
    const storkRect = stork.element.getBoundingClientRect();
    
    return (
        birdRect.right >= storkRect.left &&
        birdRect.left <= storkRect.right &&
        birdRect.bottom >= storkRect.top &&
        birdRect.top <= storkRect.bottom
    );
}

function createStork() {
    const gameAreaHeight = gameArea.clientHeight;
    const groundHeight = ground.clientHeight;
    const safeArea = gameAreaHeight - groundHeight - 60;
    const minHeight = 80;
    const maxHeight = safeArea - 80;

    if (maxHeight < minHeight) {
        console.error("Nie można utworzyć bociana: niewystarczająca wysokość.");
        return;
    }

    // Zwiększone wymiary bociana - teraz jest większy (bardziej jak boss)
    const storkWidth = 100; // Zwiększone z 90
    const storkHeight = 110; // Zwiększone ze 100
    
    const randomY = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
    // Ustaw dokładnie na prawej krawędzi ekranu
    const storkX = gameArea.clientWidth;
    
    const stork = document.createElement('div');
    if (!stork) {
        console.error("Nie udało się utworzyć bociana.");
        return;
    }
    
    stork.className = 'stork';
    stork.style.left = storkX + 'px';
    stork.style.top = randomY + 'px';
    
    // Dodajemy klasę boss dla efektu
    stork.classList.add('boss-stork');
    
    // Dodanie elementu skrzydeł
    const wings = document.createElement('div');
    wings.className = 'wings';
    stork.appendChild(wings);
    
    // Dodanie czerwonego czepka dla bossa
    const cap = document.createElement('div');
    cap.className = 'cap';
    stork.appendChild(cap);
    
    gameArea.appendChild(stork);
    
    storks.push({
        x: storkX,
        y: randomY,
        width: storkWidth,
        height: storkHeight,
        element: stork,
        defeated: false,
        removeTime: null
    });
    
    // Efekt pojawienia się bociana
    const bossAlert = document.createElement('div');
    bossAlert.className = 'coinPop purpleCoinPop';
    bossAlert.style.color = '#FF4500';
    bossAlert.textContent = 'UWAGA! BOCIAN BOSS!';
    bossAlert.style.left = '50%';
    bossAlert.style.top = '50%';
    bossAlert.style.transform = 'translate(-50%, -50%) scale(2)';
    bossAlert.style.fontSize = '30px';
    gameArea.appendChild(bossAlert);
    
    setTimeout(() => {
        if (bossAlert.parentNode) {
            gameArea.removeChild(bossAlert);
        }
    }, 1500);
    
    // Efekt dźwiękowy pojawienia się bossa
    playSound('storkMode');
}

function defeatStork(stork) {
    if (stork.defeated) return;
    
    stork.defeated = true;
    stork.element.classList.add('storkDefeated');
    stork.removeTime = performance.now() + 1000;
    
    // Efekt dźwiękowy
    playSound('storkDefeat');
    
    // Dodaj efekt pokonania
    const defeatEffect = document.createElement('div');
    defeatEffect.className = 'coinPop';
    defeatEffect.textContent = 'Pokonany!';
    defeatEffect.style.left = stork.x + 'px';
    defeatEffect.style.top = (stork.y - 20) + 'px';
    defeatEffect.style.color = '#FF4500';
    gameArea.appendChild(defeatEffect);
    
    setTimeout(() => {
        if (defeatEffect.parentNode) {
            gameArea.removeChild(defeatEffect);
        }
    }, 1000);
    
    // Stwórz monetę żabią po pokonaniu bociana
    createFrogCoin(stork.x, stork.y);
}

function createFrogCoin(x, y) {
    const coin = document.createElement('div');
    if (!coin) {
        console.error("Nie udało się utworzyć monety żabiej.");
        return;
    }
    
    coin.className = 'coin frogCoin';
    coin.style.left = x + 'px';
    coin.style.top = y + 'px';
    
    gameArea.appendChild(coin);
    
    coins.push({
        x: x,
        y: y,
        element: coin,
        collected: false,
        removeTime: null
    });
}

function createWindCoin() {
    // Tworzenie monety wiatrem w trybie bociana
    const gameAreaHeight = gameArea.clientHeight;
    const groundHeight = ground.clientHeight;
    const safeArea = gameAreaHeight - groundHeight - 60;
    const minHeight = 80;
    const maxHeight = safeArea - 80;

    if (maxHeight < minHeight) {
        console.error("Nie można utworzyć monety wiatrem: niewystarczająca wysokość.");
        return;
    }

    const randomY = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
    const startX = gameArea.clientWidth + 20; // Poza prawą krawędzią
    
    const coin = document.createElement('div');
    if (!coin) {
        console.error("Nie udało się utworzyć monety wiatrem.");
        return;
    }
    
    // 20% szansa na fioletową monetę w wietrze
    const isPurpleCoin = Math.random() < 0.2;
    
    if (isPurpleCoin) {
        coin.className = 'coin purpleCoin windCoin';
    } else {
        coin.className = 'coin windCoin';
    }
    
    coin.style.left = startX + 'px';
    coin.style.top = randomY + 'px';
    
    gameArea.appendChild(coin);
    
    coins.push({
        x: startX,
        y: randomY,
        element: coin,
        collected: false,
        removeTime: null,
        isWindCoin: true
    });
}

function collectCoin(coin) {
    coin.collected = true;
    coin.element.classList.add('coinCollected');
    coin.removeTime = performance.now() + 300;
    
    // Sprawdź typ monety
    const isPurpleCoin = coin.element.classList.contains('purpleCoin');
    const isFrogCoin = coin.element.classList.contains('frogCoin');
    
    if (isPurpleCoin) {
        purpleCoinScore += purpleCoinValue;
        purpleCoinScoreElement.textContent = `Super monety: ${purpleCoinScore / purpleCoinValue}`;
        purpleCoinCount++;
        
        playSound('purpleCoin');
        
        const coinPop = document.createElement('div');
        if (!coinPop) {
            console.error("Nie udało się utworzyć efektu wizualnego dla monety.");
            return;
        }
        coinPop.className = 'coinPop purpleCoinPop';
        coinPop.textContent = `+${purpleCoinValue}`;
        coinPop.style.left = coin.x + 'px';
        coinPop.style.top = coin.y + 'px';
        gameArea.appendChild(coinPop);
        
        setTimeout(() => {
            if (coinPop && coinPop.parentNode) {
                gameArea.removeChild(coinPop);
            }
        }, 1200);
    } else if (isFrogCoin) {
        frogCoinScore += frogCoinValue;
        const frogCoinElement = document.getElementById('frogCoinScore');
        if (frogCoinElement) {
            frogCoinElement.textContent = `Monety żabie: ${frogCoinScore / frogCoinValue}`;
        }
        frogCoinCount++;
        
        playSound('frogCoin');
        
        const coinPop = document.createElement('div');
        if (!coinPop) {
            console.error("Nie udało się utworzyć efektu wizualnego dla monety.");
            return;
        }
        coinPop.className = 'coinPop frogCoinPop';
        coinPop.textContent = `+${frogCoinValue}`;
        coinPop.style.left = coin.x + 'px';
        coinPop.style.top = coin.y + 'px';
        gameArea.appendChild(coinPop);
        
        setTimeout(() => {
            if (coinPop && coinPop.parentNode) {
                gameArea.removeChild(coinPop);
            }
        }, 1200);
        
        // Sprawdź, czy pokazać przycisk trybu bociana
        if (frogModeActive && 
            frogCoinScore >= frogStorkModeCost * frogCoinValue && 
            coinScore >= normalStorkModeCost * coinValue && 
            purpleCoinScore >= purpleStorkModeCost * purpleCoinValue) {
            storkModeButton.style.display = 'flex';
            updateStorkModeButton();
        }
    } else {
        coinScore += coinValue;
        bonusScoreElement.textContent = `Monety: ${coinScore / coinValue}`;
        normalCoinCount++;
        
        playSound('coin');
        
        const coinPop = document.createElement('div');
        if (!coinPop) {
            console.error("Nie udało się utworzyć efektu wizualnego dla monety.");
            return;
        }
        coinPop.className = 'coinPop';
        coinPop.textContent = `+${coinValue}`;
        coinPop.style.left = coin.x + 'px';
        coinPop.style.top = coin.y + 'px';
        gameArea.appendChild(coinPop);
        
        setTimeout(() => {
            if (coinPop && coinPop.parentNode) {
                gameArea.removeChild(coinPop);
            }
        }, 1000);
    }
}

function checkCollision() {
    const birdRect = bird.getBoundingClientRect();
    const gameAreaRect = gameArea.getBoundingClientRect();
    const groundRect = ground.getBoundingClientRect();
    
    // Sprawdzanie, czy żaba jest na ziemi
    if (frogModeActive) {
        if (birdRect.bottom >= groundRect.top - 2) {
            frogIsOnGround = true;
        } else {
            frogIsOnGround = false;
        }
    }
    
    // Jeśli jest nieśmiertelny dzięki trybowi froga, pozwól na przenikanie przez wszystko
    if (invincible) {
        // Tylko nie pozwól wylecieć poza ekran gry
        if (birdRect.bottom >= groundRect.top) {
            // Ustaw pozycję tuż nad ziemią ale nie resetuj velocity do 0
            // dzięki czemu kurczak będzie mógł nadal skakać
            birdPosition = groundRect.top - birdRect.height;
            bird.style.top = birdPosition + 'px';
            // Nie ustawiamy velocity = 0, pozwalając na dalsze skoki
        } else if (birdRect.top <= gameAreaRect.top) {
            birdPosition = gameAreaRect.top + 5; // Trochę luzu od górnej krawędzi
            bird.style.top = birdPosition + 'px';
            velocity = 1; // Delikatny spadek w dół
        }
        return false; // Brak kolizji w trybie nieśmiertelności
    }
    
    // Standardowe sprawdzanie kolizji z górą i dołem ekranu
    if (birdRect.bottom >= groundRect.top || birdRect.top <= gameAreaRect.top) {
        return true;
    }
    
    // W trybie żaby, jeśli dotyka góry rury, przyklej się
    if (frogModeActive) {
        for (let pipe of pipes) {
            if (!pipe.upPipe || !pipe.downPipe) continue;

            const upPipeRect = pipe.upPipe.getBoundingClientRect();
            const downPipeRect = pipe.downPipe.getBoundingClientRect();
            
            // Krokodyl może przyczepić się do górnej części rury
            if (
                birdRect.right >= upPipeRect.left && 
                birdRect.left <= upPipeRect.right && 
                birdRect.bottom >= upPipeRect.top && 
                birdRect.bottom <= upPipeRect.top + 20 // tylko górna część rury
            ) {
                // Ustaw pozycję na górze rury
                birdPosition = upPipeRect.top - birdRect.height / 2;
                bird.style.top = birdPosition + 'px';
                velocity = 0; // Zatrzymaj spadanie
                return false; // Nie ma kolizji
            }
            
            // Zwykłe kolizje
            if (
                birdRect.right >= upPipeRect.left && 
                birdRect.left <= upPipeRect.right && 
                birdRect.bottom >= upPipeRect.top + 20
            ) {
                return true;
            }
            
            if (
                birdRect.right >= downPipeRect.left && 
                birdRect.left <= downPipeRect.right && 
                birdRect.top <= downPipeRect.bottom
            ) {
                return true;
            }
        }
    } else if (ghostModeActive || storkModeActive) {
        // W trybie ducha lub bociana nie ma kolizji z rurami
        return false;
    } else {
        // Normalne sprawdzanie kolizji
        for (let pipe of pipes) {
            if (!pipe.upPipe || !pipe.downPipe) continue;

            const upPipeRect = pipe.upPipe.getBoundingClientRect();
            const downPipeRect = pipe.downPipe.getBoundingClientRect();
            
            if (
                birdRect.right >= upPipeRect.left && 
                birdRect.left <= upPipeRect.right && 
                birdRect.bottom >= upPipeRect.top
            ) {
                return true;
            }
            
            if (
                birdRect.right >= downPipeRect.left && 
                birdRect.left <= downPipeRect.right && 
                birdRect.top <= downPipeRect.bottom
            ) {
                return true;
            }
        }
    }
    
    return false;
}

function startFrogCharging() {
    if (gameRunning && frogModeActive && frogIsOnGround && !frogIsCharging) {
        frogIsCharging = true;
        frogChargeStart = performance.now();
        
        // Pokaż wskaźnik ładowania
        if (frogChargeIndicator) {
            frogChargeIndicator.style.display = 'block';
        }
        
        // Subtelna animacja przygotowania do skoku
        bird.classList.add('charging');
        
        // Efekt dźwiękowy ładowania
        playSound('jump'); // Możesz stworzyć nowy dźwięk ładowania
    }
}

function stopFrogCharging() {
    if (gameRunning && frogModeActive && frogIsCharging) {
        // Oblicz czas ładowania i odpowiednią siłę skoku
        const chargeTime = Math.min(performance.now() - frogChargeStart, frogChargeMax);
        const chargePercent = chargeTime / frogChargeMax;
        
        // Zastosuj siłę skoku proporcjonalną do czasu ładowania
        const jumpPower = frogJumpMinPower + (frogJumpMaxPower - frogJumpMinPower) * chargePercent;
        velocity = jumpPower;
        
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

function makeJump() {
    if (gameRunning) {
        if (frogModeActive) {
            // W trybie żaby zaczynamy ładować skok
            if (frogIsOnGround) {
                startFrogCharging();
            }
            // Faktyczne wykonanie skoku obsługuje funkcja stopFrogCharging
        } else {
            // Standardowy skok z jetpackiem dla normalnego trybu
            velocity = jump;
            playSound('jump');
            
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

// Funkcje TRYB FROGA
function activateFrogMode(event) {
    if (event) {
        event.preventDefault(); // Zapobiega propagacji zdarzeń dotyku
        event.stopPropagation();
    }
    
    if (!gameRunning || frogModeActive || frogModeCooldown > 0) return;
    
    // Sprawdź czy gracz ma wystarczającą ilość monet
    const normalCoins = coinScore / coinValue;
    const purpleCoins = purpleCoinScore / purpleCoinValue;
    
    if (normalCoins >= normalFrogModeCost && purpleCoins >= purpleFrogModeCost) {
        // Odejmij koszt
        coinScore -= normalFrogModeCost * coinValue;
        purpleCoinScore -= purpleFrogModeCost * purpleCoinValue;
        
        // Aktualizuj wyświetlanie monet
        bonusScoreElement.textContent = `Monety: ${coinScore / coinValue}`;
        purpleCoinScoreElement.textContent = `Super monety: ${purpleCoinScore / purpleCoinValue}`;
        
        // Aktywuj TRYB FROGA
        frogModeActive = true;
        frogModeTime = frogModeDuration;
        
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
        jump = frogJump;
        gravity = frogGravity;
        invincible = true; // Włącz nieśmiertelność
        currentPipeSpeed = pipeSpeed * frogSpeedMultiplier; // Podwójna prędkość w trybie żaby
        
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
    }
}

function deactivateFrogMode() {
    if (!frogModeActive) return;
    
    frogModeActive = false;
    frogModeTime = 0;
    
    // Dodaj przejściową klasę dla efektu transformacji z powrotem
    bird.classList.add('transforming-back');
    
    // Usuń klasę frog-mode-active po krótkim opóźnieniu aby animacja przejścia zadziałała
    setTimeout(() => {
        // Usuwamy wszystkie elementy żaby - anatomicznie poprawne usuwanie
        const frogElements = bird.querySelectorAll('.frog-head, .frog-belly, .frog-eye, .frog-front-leg, .frog-back-thigh');
        frogElements.forEach(element => {
            if (element.parentNode === bird) {
                // Usuwamy najpierw wszystkie dzieci elementu
                const children = element.querySelectorAll('*');
                children.forEach(child => {
                    if (child.parentNode === element) {
                        // Rekurencyjnie usuwamy dzieci dzieci (np. stopa w łydce)
                        const grandchildren = child.querySelectorAll('*');
                        grandchildren.forEach(grandchild => {
                            if (grandchild.parentNode === child) {
                                child.removeChild(grandchild);
                            }
                        });
                        element.removeChild(child);
                    }
                });
                // Potem usuwamy sam element
                bird.removeChild(element);
            }
        });
        
        // Usuń klasy
        gameArea.classList.remove('frog-mode-active');
        bird.classList.remove('jumping', 'transforming-back');
        
        // Przywróć widoczność jetpacka
        const jetpackFlames = bird.querySelector('.jetpack-flames');
        if (jetpackFlames) {
            jetpackFlames.style.display = '';
        }
        
        // Przywracamy normalny wygląd ptaka - resetujemy do kaczorka
        bird.style.animation = 'crazyDuck 2s infinite alternate';
        bird.style.background = 'linear-gradient(135deg, #FFFF00, #FFA500, #FFD700)';
        bird.style.borderRadius = '50% 50% 30% 30%';
        bird.style.boxShadow = '0 2px 10px rgba(255, 215, 0, 0.7)';
        bird.style.filter = 'none';
        bird.style.transform = 'rotate(0deg)';
    }, 300);
    
    frogModeTimer.style.display = 'none';
    
    // Przywróć normalne parametry
    jump = normalJump;
    gravity = normalGravity;
    invincible = false; // Wyłącz nieśmiertelność
    currentPipeSpeed = pipeSpeed; // Normalna prędkość
    
    // Usuń rurki wokół kurczaka, aby dać graczowi czas na reakcję
    // po zakończeniu nieśmiertelności
    const birdRect = bird.getBoundingClientRect();
    let pipesToRemoveIndices = [];
    let pipesBeforeCount = 0;
    let pipesAfterCount = 0;
    
    // Znajdź indeksy 2 rurek przed i 1 za kurczakiem
    for (let i = 0; i < pipes.length; i++) {
        if (!pipes[i].upPipe) continue;
        
        const pipeRect = pipes[i].upPipe.getBoundingClientRect();
        
        if (pipeRect.left > birdRect.right) {
            // Rury przed kurczakiem (na prawo od niego)
            if (pipesBeforeCount < 2) {
                pipesToRemoveIndices.push(i);
                pipesBeforeCount++;
            }
        } else if (pipeRect.right < birdRect.left) {
            // Rury za kurczakiem (na lewo od niego)
            if (pipesAfterCount < 1 && pipeRect.right > birdRect.left - 300) {
                // Tylko jeśli rura jest blisko (w odległości 300px)
                pipesToRemoveIndices.push(i);
                pipesAfterCount++;
            }
        }
    }
    
    // Usuń rury w kolejności malejącej, aby indeksy się nie zmieniały podczas usuwania
    pipesToRemoveIndices.sort((a, b) => b - a);
    
    // Pokaż efekt usuwania rurek
    for (let index of pipesToRemoveIndices) {
        if (index >= 0 && index < pipes.length) {
            const pipe = pipes[index];
            if (pipe.upPipe) {
                // Animacja usuwania rury
                pipe.upPipe.style.transition = 'opacity 0.5s';
                pipe.upPipe.style.opacity = '0';
                pipe.downPipe.style.transition = 'opacity 0.5s';
                pipe.downPipe.style.opacity = '0';
                
                // Usuń po zakończeniu animacji
                setTimeout(() => {
                    if (pipe.upPipe && pipe.upPipe.parentNode) {
                        gameArea.removeChild(pipe.upPipe);
                    }
                    if (pipe.downPipe && pipe.downPipe.parentNode) {
                        gameArea.removeChild(pipe.downPipe);
                    }
                }, 500);
            }
            // Usuń z tablicy pipes
            pipes.splice(index, 1);
        }
    }
    
    // Pokaż komunikat o końcu trybu żaby
    const endModeMsg = document.createElement('div');
    endModeMsg.className = 'coinPop';
    endModeMsg.textContent = 'Koniec trybu froga!';
    endModeMsg.style.left = '50%';
    endModeMsg.style.top = '50%';
    endModeMsg.style.transform = 'translate(-50%, -50%)';
    endModeMsg.style.color = 'red';
    endModeMsg.style.fontSize = '24px';
    gameArea.appendChild(endModeMsg);
    
    setTimeout(() => {
        if (endModeMsg.parentNode) {
            gameArea.removeChild(endModeMsg);
        }
    }, 1500);
    
    // Ustaw cooldown
    frogModeCooldown = frogModeCooldownTime;
    frogModeButton.disabled = true;
    
    setTimeout(() => {
        updateFrogModeButton();
    }, 500);
    
    // Automatycznie aktywuj tryb ducha za darmo
    if (!ghostModeActive) {
        // Wywołaj aktywację trybu ducha z pominięciem sprawdzania monet
        activateGhostMode(null, true);
    }
}

function updateFrogModeButton() {
    if (!gameRunning) return;
    
    const normalCoins = coinScore / coinValue;
    const purpleCoins = purpleCoinScore / purpleCoinValue;
    const hasEnoughCoins = normalCoins >= normalFrogModeCost && purpleCoins >= purpleFrogModeCost;
    
    if (frogModeActive) {
        frogModeButton.disabled = true;
        frogModeButton.querySelector('.mode-button-cost').textContent = 'AKTYWNY!';
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

function updateStorkModeButton() {
    if (!gameRunning || !frogModeActive) return;
    
    const normalCoins = coinScore / coinValue;
    const purpleCoins = purpleCoinScore / purpleCoinValue;
    const frogCoins = frogCoinScore / frogCoinValue;
    const hasEnoughCoins = normalCoins >= normalStorkModeCost && 
                          purpleCoins >= purpleStorkModeCost && 
                          frogCoins >= frogStorkModeCost;
    
    if (storkModeActive) {
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

// Funkcje TRYB DUCHA
function activateGhostMode(event, freeActivation = false) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Jeśli aktywacja jest darmowa, pomijamy sprawdzenie cooldown
    if (!gameRunning || ghostModeActive || (ghostModeCooldown > 0 && !freeActivation)) return;
    
    // Sprawdź czy gracz ma wystarczającą ilość monet lub czy to darmowa aktywacja
    const normalCoins = coinScore / coinValue;
    const purpleCoins = purpleCoinScore / purpleCoinValue;
    
    if (freeActivation || (normalCoins >= normalGhostModeCost && purpleCoins >= purpleGhostModeCost)) {
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
    }
}

function deactivateGhostMode() {
    if (!ghostModeActive) return;
    
    ghostModeActive = false;
    ghostModeTime = 0;
    gameArea.classList.remove('ghost-mode-active');
    ghostModeTimer.style.display = 'none';
    ghostMode = false;
    
    // Przywracamy normalny wygląd ptaka - resetujemy do kaczorka
    bird.style.animation = 'crazyDuck 2s infinite alternate';
    bird.style.background = 'linear-gradient(135deg, #FFFF00, #FFA500, #FFD700)';
    bird.style.borderRadius = '50% 50% 30% 30%';
    bird.style.boxShadow = '0 2px 10px rgba(255, 215, 0, 0.7)';
    bird.style.filter = 'none';
    bird.style.transform = 'rotate(0deg)';
    bird.style.opacity = '1';
    
    // Przywróć widoczność jetpacka
    const jetpackFlames = bird.querySelector('.jetpack-flames');
    if (jetpackFlames) {
        jetpackFlames.style.display = '';
    }
    
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
}

// Funkcje TRYB BOCIANA
function activateStorkMode(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Można aktywować tylko podczas trybu żaby i gdy nie jest aktywny
    if (!gameRunning || !frogModeActive || storkModeActive || storkModeCooldown > 0) return;
    
    // Sprawdź czy gracz ma wystarczającą ilość monet
    const normalCoins = coinScore / coinValue;
    const purpleCoins = purpleCoinScore / purpleCoinValue;
    const frogCoins = frogCoinScore / frogCoinValue;
    
    if (normalCoins >= normalStorkModeCost && 
        purpleCoins >= purpleStorkModeCost && 
        frogCoins >= frogStorkModeCost) {
        
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
        
        // Dezaktywuj tryb żaby przed aktywacją trybu bociana
        frogModeActive = false;
        frogModeTime = 0;
        gameArea.classList.remove('frog-mode-active');
        frogModeTimer.style.display = 'none';
        
        // Usuń elementy żaby
        const frogElements = bird.querySelectorAll('.frog-head, .frog-belly, .frog-eye, .frog-front-leg, .frog-back-thigh');
        frogElements.forEach(element => {
            if (element.parentNode === bird) {
                // Usuwamy najpierw wszystkie dzieci elementu
                const children = element.querySelectorAll('*');
                children.forEach(child => {
                    if (child.parentNode === element) {
                        // Rekurencyjnie usuwamy dzieci dzieci (np. stopa w łydce)
                        const grandchildren = child.querySelectorAll('*');
                        grandchildren.forEach(grandchild => {
                            if (grandchild.parentNode === child) {
                                child.removeChild(grandchild);
                            }
                        });
                        element.removeChild(child);
                    }
                });
                // Potem usuwamy sam element
                bird.removeChild(element);
            }
        });
        
        // Aktywuj TRYB BOCIANA
        storkModeActive = true;
        storkModeTime = storkModeDuration;
        gameArea.classList.add('stork-mode-active');
        storkModeTimer.style.display = 'block';
        storkModeTimer.textContent = `TRYB BOCIANA: ${storkModeDuration}s`;
        storkModeButton.disabled = true;
        
        // Przywróć widoczność jetpacka
        const jetpackFlames = bird.querySelector('.jetpack-flames');
        if (jetpackFlames) {
            jetpackFlames.style.display = '';
        }
        
        // Efekt dźwiękowy
        playSound('storkMode');
        
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
    }
}

function deactivateStorkMode() {
    if (!storkModeActive) return;
    
    storkModeActive = false;
    storkModeTime = 0;
    gameArea.classList.remove('stork-mode-active');
    storkModeTimer.style.display = 'none';
    
    // Przywracamy normalny wygląd ptaka - resetujemy do kaczorka
    bird.style.animation = 'crazyDuck 2s infinite alternate';
    bird.style.background = 'linear-gradient(135deg, #FFFF00, #FFA500, #FFD700)';
    bird.style.borderRadius = '50% 50% 30% 30%';
    bird.style.boxShadow = '0 2px 10px rgba(255, 215, 0, 0.7)';
    bird.style.filter = 'none';
    bird.style.transform = 'rotate(0deg)';
    
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
    
    setTimeout(() => {
        updateStorkModeButton();
    }, 500);
    
    // Automatycznie aktywuj tryb ducha za darmo
    if (!ghostModeActive) {
        activateGhostMode(null, true);
    }
}

function updateGhostModeButton() {
    if (!gameRunning) return;
    
    const normalCoins = coinScore / coinValue;
    const purpleCoins = purpleCoinScore / purpleCoinValue;
    const hasEnoughCoins = normalCoins >= normalGhostModeCost && purpleCoins >= purpleGhostModeCost;
    
    if (ghostModeActive) {
        ghostModeButton.disabled = true;
        ghostModeButton.querySelector('.mode-button-cost').textContent = 'AKTYWNY!';
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