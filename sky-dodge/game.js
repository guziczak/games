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
    
    let gameRunning = false;
    let pipes = [];
    let coins = [];
    let score = 0;
    let coinScore = 0;
    let purpleCoinScore = 0;
    let normalCoinCount = 0;
    let purpleCoinCount = 0;
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
    let animationId;
    let lastTime = 0;
    let deltaTime = 0;
    let coinValue = 10;
    let purpleCoinValue = 50;
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
    
    // TRYB DUCHA - zmienne
    let ghostModeActive = false;
    let ghostModeTime = 0;
    let ghostModeDuration = 5; // w sekundach
    let ghostModeCooldown = 0;
    let ghostModeCooldownTime = 7; // w sekundach
    let normalGhostModeCost = 2; // koszt normalnych monet - dwie
    let purpleGhostModeCost = 0; // koszt fioletowych monet - zero
    let ghostMode = false; // Flaga trybu ducha

    function setupGame() {
        score = 0;
        coinScore = 0;
        purpleCoinScore = 0;
        normalCoinCount = 0;
        purpleCoinCount = 0;
        scoreElement.textContent = score;
        bonusScoreElement.textContent = "Monety: 0";
        purpleCoinScoreElement.textContent = "Super monety: 0";
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
        
        // Reset TRYB DUCHA
        ghostModeActive = false;
        ghostModeTime = 0;
        ghostModeCooldown = 0;
        ghostMode = false;
        ghostModeButton.style.display = 'flex';
        ghostModeTimer.style.display = 'none';
        gameArea.classList.remove('ghost-mode-active');
        
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
        
        lastPipeTime = 0;
        lastCoinTime = 0;
        lastTime = 0;
    }
    
    function startGame() {
        setupGame();
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameRunning = true;
        lastTime = performance.now();
        animationId = requestAnimationFrame(update);
        
        // Pokaż przyciski trybu specjalnego gdy gra się rozpocznie
        frogModeButton.style.display = 'flex';
        ghostModeButton.style.display = 'flex';
        updateFrogModeButton();
        updateGhostModeButton();
    }
    
    function endGame() {
        gameRunning = false;
        cancelAnimationFrame(animationId);
        finalScoreElement.textContent = score;
        finalCoinsElement.textContent = normalCoinCount;
        finalPurpleCoinsElement.textContent = purpleCoinCount;
        finalTotalScoreElement.textContent = score + coinScore + purpleCoinScore;
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
        
        velocity += gravity * deltaTime;
        
        if (velocity > velocityLimit) velocity = velocityLimit;
        
        birdPosition += velocity * deltaTime;
        bird.style.top = birdPosition + 'px';
        
        let rotation = velocity * 2;
        if (rotation > 30) rotation = 30;
        if (rotation < -30) rotation = -30;
        bird.style.transform = `rotate(${rotation}deg)`;
        
        if (timestamp - lastPipeTime > pipeInterval) {
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

