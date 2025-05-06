// Game Entities and Objects
document.addEventListener('DOMContentLoaded', function() {
    window.createPipe = function() {
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
            passed: false,
            destroyed: false
        });
    }
    
    window.createCoin = function() {
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
    
    window.createWindCoin = function() {
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
    
    window.createFrogCoin = function(x, y) {
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
    
    window.createStork = function() {
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
    
    window.collectCoin = function(coin) {
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
    
    window.defeatStork = function(stork) {
        if (stork.defeated) return;
        
        stork.defeated = true;
        stork.element.classList.add('storkDefeated');
        
        // Efekt dźwiękowy
        playSound('storkDefeat');
        
        // Sprawdź czy pokonujemy ptakiem stalowym
        if (steelModeActive) {
            // Wydłuż czas animacji dla bardziej dramatycznego efektu w trybie stali
            stork.removeTime = performance.now() + 1500;
            
            // Dodaj bardziej spektakularny efekt pokonania w trybie stali
            const storkElement = stork.element;
            
            // Bardziej dramatyczna animacja zniszczenia
            storkElement.style.transition = 'transform 0.5s, opacity 0.7s';
            storkElement.style.transform = 'scale(1.3) rotate(' + (Math.random() > 0.5 ? 90 : -90) + 'deg)';
            storkElement.style.opacity = '0';
            
            // Dodaj eksplozję wokół bociana
            const explosion = document.createElement('div');
            explosion.style.position = 'absolute';
            explosion.style.width = '150px';
            explosion.style.height = '150px';
            explosion.style.borderRadius = '50%';
            explosion.style.backgroundColor = 'rgba(255, 100, 0, 0.7)';
            explosion.style.boxShadow = '0 0 50px rgba(255, 200, 0, 0.8)';
            explosion.style.left = (stork.x + stork.width/2 - 75) + 'px';
            explosion.style.top = (stork.y + stork.height/2 - 75) + 'px';
            explosion.style.transform = 'scale(0)';
            explosion.style.transition = 'transform 0.4s';
            explosion.style.zIndex = '990';
            gameArea.appendChild(explosion);
            
            // Animuj eksplozję
            setTimeout(() => {
                explosion.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    explosion.style.transform = 'scale(0)';
                    setTimeout(() => {
                        if (explosion.parentNode) {
                            gameArea.removeChild(explosion);
                        }
                    }, 400);
                }, 300);
            }, 10);
            
            // Dodaj kawałki rozbitego bociana (odłamki)
            for (let i = 0; i < 10; i++) {
                const debris = document.createElement('div');
                debris.style.position = 'absolute';
                debris.style.width = '8px';
                debris.style.height = '8px';
                debris.style.backgroundColor = i % 2 === 0 ? '#FF4500' : '#FF8C00'; // Czerwone i pomarańczowe odłamki
                debris.style.borderRadius = '50%';
                
                // Losowa pozycja początkowa
                const startX = stork.x + stork.width/2;
                const startY = stork.y + stork.height/2;
                
                // Losowy kąt i dystans
                const angle = Math.random() * Math.PI * 2;
                const distance = 50 + Math.random() * 150;
                
                // Ustaw pozycję początkową
                debris.style.left = startX + 'px';
                debris.style.top = startY + 'px';
                
                // Animacja ruchu
                debris.style.transition = 'all 1s ease-out';
                gameArea.appendChild(debris);
                
                // Animuj odłamek
                setTimeout(() => {
                    const endX = startX + Math.cos(angle) * distance;
                    const endY = startY + Math.sin(angle) * distance;
                    debris.style.left = endX + 'px';
                    debris.style.top = endY + 'px';
                    debris.style.opacity = '0';
                    
                    // Usuń po zakończeniu animacji
                    setTimeout(() => {
                        if (debris.parentNode) {
                            gameArea.removeChild(debris);
                        }
                    }, 1000);
                }, 10);
            }
            
            // Mocniejszy efekt wibracji
            gameArea.classList.add('screen-shake');
            setTimeout(() => {
                gameArea.classList.remove('screen-shake');
                setTimeout(() => {
                    gameArea.classList.add('screen-shake');
                    setTimeout(() => {
                        gameArea.classList.remove('screen-shake');
                    }, 150);
                }, 200);
            }, 150);
            
            // Bardziej dramatyczny efekt tekstowy
            const defeatEffect = document.createElement('div');
            defeatEffect.className = 'coinPop';
            defeatEffect.textContent = 'DEMOLISHED!';
            defeatEffect.style.left = stork.x + 'px';
            defeatEffect.style.top = (stork.y - 20) + 'px';
            defeatEffect.style.color = '#FF0000';
            defeatEffect.style.fontSize = '40px';
            defeatEffect.style.fontWeight = 'bold';
            defeatEffect.style.textShadow = '0 0 10px rgba(255, 200, 0, 0.8)';
            defeatEffect.style.transform = 'scale(0)';
            defeatEffect.style.transition = 'transform 0.3s';
            gameArea.appendChild(defeatEffect);
            
            // Animuj tekst
            setTimeout(() => {
                defeatEffect.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    defeatEffect.style.transform = 'scale(1)';
                }, 150);
            }, 10);
            
            // Ukryj efekt po czasie
            setTimeout(() => {
                defeatEffect.style.transform = 'scale(0)';
                setTimeout(() => {
                    if (defeatEffect.parentNode) {
                        gameArea.removeChild(defeatEffect);
                    }
                }, 300);
            }, 1200);
            
            // Dodaj więcej monet żabich w trybie stali (3 zamiast 1)
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    // Losowa pozycja wokół bociana
                    const offsetX = -20 + Math.random() * 40;
                    const offsetY = -20 + Math.random() * 40;
                    createFrogCoin(stork.x + offsetX, stork.y + offsetY);
                }, i * 200); // Opóźnienie między monetami
            }
            
            // Dodaj punkty za zniszczenie bociana w trybie stali
            score += 10;
            scoreElement.textContent = score;
            
            // Pokaż bonus punktowy
            const pointsEffect = document.createElement('div');
            pointsEffect.className = 'coinPop';
            pointsEffect.textContent = '+10';
            pointsEffect.style.left = (stork.x + stork.width/2) + 'px';
            pointsEffect.style.top = (stork.y - 50) + 'px';
            pointsEffect.style.color = '#FFD700';
            pointsEffect.style.fontSize = '30px';
            pointsEffect.style.fontWeight = 'bold';
            pointsEffect.style.textShadow = '0 0 5px black';
            gameArea.appendChild(pointsEffect);
            
            // Animuj efekt punktowy
            setTimeout(() => {
                pointsEffect.style.transition = 'top 1s, opacity 1s';
                pointsEffect.style.top = (pointsEffect.offsetTop - 70) + 'px';
                pointsEffect.style.opacity = '0';
                
                setTimeout(() => {
                    if (pointsEffect.parentNode) {
                        gameArea.removeChild(pointsEffect);
                    }
                }, 1000);
            }, 10);
            
        } else {
            // Normalny efekt pokonania bociana (nie w trybie stali)
            stork.removeTime = performance.now() + 1000;
            
            // Dodaj standardowy efekt pokonania
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
    }
    
    window.checkCoinCollision = function(coin) {
        const birdRect = bird.getBoundingClientRect();
        const coinRect = coin.element.getBoundingClientRect();
        
        return (
            birdRect.right >= coinRect.left &&
            birdRect.left <= coinRect.right &&
            birdRect.bottom >= coinRect.top &&
            birdRect.top <= coinRect.bottom
        );
    }
    
    window.checkStorkCollision = function(stork) {
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
    
    // Tablica śmiesznych narzekań żaby gdy jest przeładowana
    window.frogComplaints = [
        "KUUURWA ZA DUŻO!",
        "Co ty wyprawiasz?!",
        "Moje nogi nie wytrzymają!",
        "Zaraz będę rzygać...",
        "Przesadzasz człowieku!",
        "Ja pierdolę, za mocno!",
        "Nie naciągaj mnie tak!",
        "Zaraz pęknę!",
        "Aaaaaa! Za dużo energii!",
        "Mówiłem żeby nie przesadzać!",
        "Serio? SERIO?!",
        "Moje stawy tego nie wytrzymają!",
        "Chyba mnie porypało...",
        "Wystarczy, kurde!",
        "Nie jestem z gumy!",
        "To zbyt przegięte!",
        "Doigrasz się zaraz!",
        "Czy tobie na mózg padło?",
        "To boli jak cholera!",
        "Jakiś ty pojebany!"
    ];
    
    window.showFrogComplaint = function() {
        // Wylosuj narzekanie
        const complaint = frogComplaints[Math.floor(Math.random() * frogComplaints.length)];
        
        // Stwórz dymek z narzekaniem
        const complaintBubble = document.createElement('div');
        complaintBubble.className = 'frog-complaint-bubble';
        complaintBubble.textContent = complaint;
        
        // Pozycjonuj dymek nad żabą
        const birdRect = bird.getBoundingClientRect();
        complaintBubble.style.left = (birdRect.left + birdRect.width / 2 - 75) + 'px';
        complaintBubble.style.top = (birdRect.top - 70) + 'px';
        
        // Dodaj do gry
        gameArea.appendChild(complaintBubble);
        
        // Usuń po chwili
        setTimeout(() => {
            if (complaintBubble.parentNode) {
                gameArea.removeChild(complaintBubble);
            }
        }, 2000);
        
        // Wyczyść poprzedni timeout jeśli istnieje
        if (frogComplaintTimeout) {
            clearTimeout(frogComplaintTimeout);
        }
        
        // Ustaw nowy timeout dla kolejnego narzekania
        frogComplaintTimeout = setTimeout(() => {
            if (frogIsOverloaded) {
                showFrogComplaint();
            }
        }, 3000 + Math.random() * 2000);
    }
    
    // Helper function
    window.randomBetween = function(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    window.checkCollision = function() {
        const birdRect = bird.getBoundingClientRect();
        const gameAreaRect = gameArea.getBoundingClientRect();
        const groundRect = ground.getBoundingClientRect();
        
        // Mała funkcja pomocnicza do logowania stanu wykrywania podłoża
        const logGroundState = (reason) => {
            // Możemy używać tej funkcji do debugowania w konsoli
            if (window.debugGroundDetection) {
                console.log(`Żaba na ziemi: ${frogIsOnGround ? 'TAK' : 'NIE'}, powód: ${reason}`, {
                    birdBottomY: birdRect.bottom,
                    groundTopY: groundRect.top,
                    distanceToGround: groundRect.top - birdRect.bottom
                });
            }
        };

        // WAŻNE: Najpierw ograniczamy pozycję ptaka, aby nigdy nie wychodził poza ekran
        // To działa niezależnie od trybu gry
        
        // Ograniczenie dolne (ziemia)
        if (birdRect.bottom >= groundRect.top) {
            // Ustaw pozycję na ziemi
            birdPosition = groundRect.top - birdRect.height;
            bird.style.top = birdPosition + 'px';
            
            // Ustaw flagę, że ptak jest na ziemi
            frogIsOnGround = true;
            logGroundState("Globalne ograniczenie - ziemia");
            
            // Dodaj odbicie w trybie kauczuka lub przeładowanej żaby
            if (rubberModeActive) {
                // Sprężyste odbicie 
                velocity = velocity < 0 ? velocity : -velocity * 0.8;
            } else if (frogModeActive && frogIsOverloaded && frogOverloadBounceCount > 0) {
                // Odbij z siłą proporcjonalną do pozostałych odbić
                velocity = frogJumpMaxPower * (0.7 + (frogOverloadBounceCount / frogMaxBounces) * 0.5);
                
                // Zmniejsz licznik odbić
                frogOverloadBounceCount--;
                
                // Efekt dźwiękowy odbicia
                playSound('jump');
                
                // Animacja odbicia
                bird.classList.add('jumping');
                setTimeout(() => {
                    bird.classList.remove('jumping');
                }, 300);
                
                // Pokaż narzekanie żaby
                showFrogComplaint();
                
                // Jeśli to było ostatnie odbicie, zakończ przeładowanie
                if (frogOverloadBounceCount <= 0) {
                    // Zakończ przeładowanie
                    frogIsOverloaded = false;
                    
                    // Ukryj wskaźnik przeładowania
                    const overloadIndicator = document.getElementById('frogOverloadIndicator');
                    if (overloadIndicator) {
                        overloadIndicator.style.display = 'none';
                    }
                    
                    // Usuń klasę przeładowania
                    bird.classList.remove('overloaded');
                    
                    // Wyczyść timeout narzekań
                    if (frogComplaintTimeout) {
                        clearTimeout(frogComplaintTimeout);
                        frogComplaintTimeout = null;
                    }
                }
            } else if (steelModeActive) {
                // W trybie stali odbijamy się od ziemi
                velocity = -Math.abs(velocity) * 0.9;
                
                // Efekt dźwiękowy odbicia
                playSound('jump');
            }
            
            // Dodaj animację lądowania w trybie żaby
            if (frogModeActive) {
                // Zatrzymaj animacje skoku
                bird.classList.remove('jumping');
                
                // Dodaj delikatną animację lądowania
                bird.classList.add('frog-landing');
                setTimeout(() => {
                    bird.classList.remove('frog-landing');
                }, 200);
            }
            
            // W zwykłym trybie to będzie kolizja kończąca grę
            if (!invincible && !frogModeActive && !ghostModeActive && !storkModeActive && !steelModeActive && !rubberModeActive) {
                console.log("Kolizja z ziemią w normalnym trybie");
                return true;
            }
        } 
        // Ograniczenie górne (sufit)
        else if (birdRect.top <= gameAreaRect.top) {
            // Wyraźnie ograniczamy, aby ptak nie wychodził ponad sufit
            birdPosition = gameAreaRect.top + 2; // Minimalny odstęp
            bird.style.top = birdPosition + 'px';
            
            // W powietrzu ustaw flagę stanu ziemi
            frogIsOnGround = false;
            logGroundState("Globalne ograniczenie - sufit");
            
            // Odbicie od sufitu w różnych trybach
            if (rubberModeActive) {
                // Sprężyste odbicie w trybie kauczuka
                velocity = velocity > 0 ? velocity : -velocity * 0.8;
                
                // Efekt dźwiękowy odbicia
                playSound('jump');
            } else if ((frogModeActive && frogIsOverloaded && frogOverloadBounceCount > 0)) {
                // Odbij w dół
                velocity = Math.abs(velocity) * 0.9;
                
                // Animacja odbicia
                bird.classList.add('jumping');
                setTimeout(() => {
                    bird.classList.remove('jumping');
                }, 300);
                
                // Efekt dźwiękowy odbicia
                playSound('jump');
                
                // Pokaż narzekanie żaby
                showFrogComplaint();
            } else if (steelModeActive) {
                // W trybie stali odbijamy się od sufitu
                velocity = Math.abs(velocity) * 0.9;
                
                // Efekt dźwiękowy odbicia
                playSound('jump');
            } else {
                // W innych trybach delikatny spadek w dół
                velocity = 1;
            }
            
            // W zwykłym trybie to będzie kolizja kończąca grę
            if (!invincible && !frogModeActive && !ghostModeActive && !storkModeActive && !steelModeActive && !rubberModeActive) {
                console.log("Kolizja z sufitem w normalnym trybie");
                return true;
            }
        } else {
            // Główne sprawdzanie, czy żaba jest na ziemi - globalne dla wszystkich trybów
            // Dodajemy 5px buforu dla lepszej detekcji
            const groundProximityBuffer = 5; 
            const isOnGround = birdRect.bottom >= groundRect.top - groundProximityBuffer;
            
            // W innych przypadkach sprawdź normalną detekcję podłoża
            frogIsOnGround = isOnGround;
            logGroundState("Standardowa detekcja");
        }
        
        // Obsługa trybu kauczuka - pozwól odbijać się od wszystkiego z lepszym efektem
        if (rubberModeActive) {
            // Współczynnik odbijania dla trybu kauczuka
            const bounceFactor = window.rubberBounciness || 1.2;
            
            // Współczynnik tłumienia prędkości - im bliżej 1, tym mniejsze tłumienie
            const dampingFactor = window.rubberDamping || 0.98;
            
            // Efekt wizualny odbicia przy dotknięciu ziemi lub sufitu
            if (birdRect.bottom >= groundRect.top || birdRect.top <= gameAreaRect.top) {
                const bounceStrength = Math.min(Math.abs(velocity) / 30, 1);
                if (bounceStrength > 0.3) {
                    // Dodaj efekt "rozbłysku energii"
                    const bounceBurst = document.createElement('div');
                    bounceBurst.className = 'rubber-bounce-effect';
                    
                    const gameAreaRect = gameArea.getBoundingClientRect();
                    
                    bounceBurst.style.position = 'absolute';
                    bounceBurst.style.width = (30 + bounceStrength * 50) + 'px';
                    bounceBurst.style.height = (10 + bounceStrength * 20) + 'px';
                    bounceBurst.style.borderRadius = '50%';
                    bounceBurst.style.backgroundColor = `rgba(255, 0, 255, ${0.2 + bounceStrength * 0.3})`;
                    bounceBurst.style.boxShadow = `0 0 ${10 + bounceStrength * 20}px rgba(255, 0, 255, 0.6)`;
                    
                    // Pozycja efektu jest różna dla odbicia od ziemi i sufitu
                    if (birdRect.bottom >= groundRect.top) {
                        bounceBurst.style.left = (birdRect.left + birdRect.width/2 - gameAreaRect.left - (15 + bounceStrength * 25)) + 'px';
                        bounceBurst.style.top = (groundRect.top - 10 - gameAreaRect.top) + 'px';
                    } else {
                        bounceBurst.style.left = (birdRect.left + birdRect.width/2 - gameAreaRect.left - (15 + bounceStrength * 25)) + 'px';
                        bounceBurst.style.top = (gameAreaRect.top + 10 - gameAreaRect.top) + 'px';
                    }
                    
                    bounceBurst.style.transform = 'scale(0, 0.5)';
                    bounceBurst.style.transition = 'transform 0.2s, opacity 0.4s';
                    bounceBurst.style.zIndex = '80';
                    gameArea.appendChild(bounceBurst);
                    
                    // Animuj efekt
                    setTimeout(() => {
                        bounceBurst.style.transform = 'scale(1, 0.5)';
                        setTimeout(() => {
                            bounceBurst.style.opacity = '0';
                            setTimeout(() => {
                                if (bounceBurst.parentNode) {
                                    gameArea.removeChild(bounceBurst);
                                }
                            }, 400);
                        }, 150);
                    }, 10);
                    
                    // Dodaj efekt wibracji przy dużej sile
                    if (bounceStrength > 0.7) {
                        gameArea.classList.add('screen-shake');
                        setTimeout(() => {
                            gameArea.classList.remove('screen-shake');
                        }, 200);
                    }
                }
            }
            
            // Dodajemy odbijanie od rur w trybie kauczuka
            for (let pipe of pipes) {
                if (!pipe.upPipe || !pipe.downPipe) continue;
                
                const upPipeRect = pipe.upPipe.getBoundingClientRect();
                const downPipeRect = pipe.downPipe.getBoundingClientRect();
                
                // Odbicie od lewej strony rury
                if (birdRect.right >= upPipeRect.left && birdRect.right <= upPipeRect.left + 10 &&
                    ((birdRect.bottom >= upPipeRect.top) || (birdRect.top <= downPipeRect.bottom))) {
                    
                    // Odbicie w lewo
                    velocity = velocity * 0.8; // Zachowaj część prędkości pionowej
                    birdRect.left = upPipeRect.left - birdRect.width - 5;
                    
                    // Efekt dźwiękowy
                    playSound('jump');
                    
                    // Efekt wizualny - podobny jak przy innych odbiciach
                    const bounceBurst = document.createElement('div');
                    bounceBurst.className = 'rubber-bounce-effect';
                    bounceBurst.style.position = 'absolute';
                    bounceBurst.style.width = '20px';
                    bounceBurst.style.height = '40px';
                    bounceBurst.style.borderRadius = '50%';
                    bounceBurst.style.backgroundColor = 'rgba(255, 0, 255, 0.4)';
                    bounceBurst.style.boxShadow = '0 0 15px rgba(255, 0, 255, 0.6)';
                    bounceBurst.style.left = upPipeRect.left + 'px';
                    bounceBurst.style.top = (birdRect.top + birdRect.height/2) + 'px';
                    bounceBurst.style.transform = 'scale(0, 1)';
                    bounceBurst.style.transition = 'transform 0.2s, opacity 0.3s';
                    bounceBurst.style.zIndex = '80';
                    gameArea.appendChild(bounceBurst);
                    
                    // Animuj efekt
                    setTimeout(() => {
                        bounceBurst.style.transform = 'scale(1, 1)';
                        setTimeout(() => {
                            bounceBurst.style.opacity = '0';
                            setTimeout(() => {
                                if (bounceBurst.parentNode) {
                                    gameArea.removeChild(bounceBurst);
                                }
                            }, 300);
                        }, 100);
                    }, 10);
                    
                    return false;
                }
            }
        }
        
        // Jeśli jest nieśmiertelny dzięki trybowi froga lub trybowi kauczuka, pozwól na przenikanie przez wszystko
        if (invincible) {
            // Dodajmy specjalny komunikat dla trybu niezniszczalności przy kolizji
            if (rubberModeActive) {
                // Sprawdź czy jest kolizja z przeszkodą do efektu wizualnego
                let collisionWithObstacle = false;
                for (let pipe of pipes) {
                    if (!pipe.upPipe || !pipe.downPipe) continue;
                    
                    const upPipeRect = pipe.upPipe.getBoundingClientRect();
                    const downPipeRect = pipe.downPipe.getBoundingClientRect();
                    
                    if (
                        (birdRect.right >= upPipeRect.left && 
                        birdRect.left <= upPipeRect.right && 
                        birdRect.bottom >= upPipeRect.top) ||
                        (birdRect.right >= downPipeRect.left && 
                        birdRect.left <= downPipeRect.right && 
                        birdRect.top <= downPipeRect.bottom)
                    ) {
                        collisionWithObstacle = true;
                        
                        // Efekt wizualny przenikania - tylko jeśli nie było niedawno efektu
                        if (!window.lastRubberPhaseEffect || performance.now() - window.lastRubberPhaseEffect > 500) {
                            window.lastRubberPhaseEffect = performance.now();
                            
                            // Efekt przenikania
                            bird.classList.add('rubber-phasing');
                            
                            // Efekt cząsteczek
                            for (let i = 0; i < 8; i++) {
                                const particle = document.createElement('div');
                                particle.className = 'rubber-phase-particle';
                                particle.style.position = 'absolute';
                                particle.style.width = '6px';
                                particle.style.height = '6px';
                                particle.style.borderRadius = '50%';
                                particle.style.backgroundColor = 'rgba(255, 0, 255, 0.7)';
                                particle.style.boxShadow = '0 0 5px rgba(255, 0, 255, 0.5)';
                                
                                const birdCenterX = birdRect.left + birdRect.width / 2;
                                const birdCenterY = birdRect.top + birdRect.height / 2;
                                
                                const angle = Math.random() * Math.PI * 2;
                                const distance = birdRect.width * 0.7;
                                
                                particle.style.left = (birdCenterX + Math.cos(angle) * distance) + 'px';
                                particle.style.top = (birdCenterY + Math.sin(angle) * distance) + 'px';
                                particle.style.transform = 'scale(0)';
                                particle.style.transition = 'transform 0.2s, opacity 0.4s';
                                document.body.appendChild(particle);
                                
                                // Animuj cząsteczkę
                                setTimeout(() => {
                                    particle.style.transform = 'scale(1)';
                                    
                                    setTimeout(() => {
                                        particle.style.opacity = '0';
                                        
                                        setTimeout(() => {
                                            if (particle.parentNode) {
                                                particle.parentNode.removeChild(particle);
                                            }
                                        }, 400);
                                    }, 200);
                                }, 10);
                            }
                            
                            // Usuń efekt po krótkim czasie
                            setTimeout(() => {
                                bird.classList.remove('rubber-phasing');
                            }, 300);
                            
                            // Efekt dźwiękowy
                            playSound('jump');
                        }
                        
                        break;
                    }
                }
            }
            
            return false; // Brak kolizji w trybie nieśmiertelności
        } else if (!frogModeActive && !ghostModeActive && !storkModeActive && !steelModeActive && !rubberModeActive) {
            // W normalnym trybie (po zakończeniu trybu froga, ale nie w innych trybach specjalnych)
            // Sprawdź kolizję z rurami
            for (let pipe of pipes) {
                if (!pipe.upPipe || !pipe.downPipe) continue;
                
                const upPipeRect = pipe.upPipe.getBoundingClientRect();
                const downPipeRect = pipe.downPipe.getBoundingClientRect();
                
                if (
                    birdRect.right >= upPipeRect.left && 
                    birdRect.left <= upPipeRect.right && 
                    birdRect.bottom >= upPipeRect.top
                ) {
                    console.log("Kolizja z górną rurą w normalnym trybie");
                    return true;
                }
                
                if (
                    birdRect.right >= downPipeRect.left && 
                    birdRect.left <= downPipeRect.right && 
                    birdRect.top <= downPipeRect.bottom
                ) {
                    console.log("Kolizja z dolną rurą w normalnym trybie");
                    return true;
                }
            }
        }
        
        // Sprawdzanie kolizji w trybie stali z rurami - niszczenie rur
        if (steelModeActive) {
            for (let i = pipes.length - 1; i >= 0; i--) {
                const pipe = pipes[i];
                if (!pipe.upPipe || !pipe.downPipe) continue;

                const upPipeRect = pipe.upPipe.getBoundingClientRect();
                const downPipeRect = pipe.downPipe.getBoundingClientRect();
                
                if (
                    (birdRect.right >= upPipeRect.left && 
                    birdRect.left <= upPipeRect.right && 
                    birdRect.bottom >= upPipeRect.top) ||
                    (birdRect.right >= downPipeRect.left && 
                    birdRect.left <= downPipeRect.right && 
                    birdRect.top <= downPipeRect.bottom)
                ) {
                    // Zniszcz rurę - bardziej rozbudowany efekt wizualny
                    if (pipe.upPipe && pipe.upPipe.parentNode) {
                        // Animacja zniszczenia
                        pipe.upPipe.style.transition = 'opacity 0.4s, transform 0.4s';
                        pipe.upPipe.style.opacity = '0';
                        pipe.upPipe.style.transform = 'scale(1.5) rotate(20deg) translate(30px, -50px)';
                    }
                    
                    if (pipe.downPipe && pipe.downPipe.parentNode) {
                        pipe.downPipe.style.transition = 'opacity 0.4s, transform 0.4s';
                        pipe.downPipe.style.opacity = '0';
                        pipe.downPipe.style.transform = 'scale(1.5) rotate(-20deg) translate(-30px, 50px)';
                    }
                    
                    // Efekt dźwiękowy
                    playSound('storkDefeat');
                    
                    // Oznacz rurę jako zniszczoną
                    pipe.destroyed = true;
                    
                    // Odbij się od rury
                    velocity = jump * 0.5;
                    
                    // Zamiast usuwać w setTimeout, oznaczamy rurę do usunięcia
                    setTimeout(() => {
                        if (pipe.upPipe && pipe.upPipe.parentNode) {
                            gameArea.removeChild(pipe.upPipe);
                        }
                        if (pipe.downPipe && pipe.downPipe.parentNode) {
                            gameArea.removeChild(pipe.downPipe);
                        }
                    }, 400);
                }
            }
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
                    
                    // Aktualizuj flagę stanu ziemi - pozwalając żabie skakać z rury
                    frogIsOnGround = true;
                    logGroundState("przyczepiona do rury");
                    
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
        } else if (steelModeActive) {
            // W trybie stali niszczymy rury przy kolizji
            for (let i = pipes.length - 1; i >= 0; i--) {
                const pipe = pipes[i];
                if (!pipe.upPipe || !pipe.downPipe) continue;

                const upPipeRect = pipe.upPipe.getBoundingClientRect();
                const downPipeRect = pipe.downPipe.getBoundingClientRect();
                
                if (
                    (birdRect.right >= upPipeRect.left && 
                    birdRect.left <= upPipeRect.right && 
                    birdRect.bottom >= upPipeRect.top) ||
                    (birdRect.right >= downPipeRect.left && 
                    birdRect.left <= downPipeRect.right && 
                    birdRect.top <= downPipeRect.bottom)
                ) {
                    // Zniszcz rurę - bardziej rozbudowany efekt wizualny
                    if (pipe.upPipe && pipe.upPipe.parentNode) {
                        // Animacja zniszczenia
                        pipe.upPipe.style.transition = 'opacity 0.4s, transform 0.4s';
                        pipe.upPipe.style.opacity = '0';
                        pipe.upPipe.style.transform = 'scale(1.5) rotate(20deg) translate(30px, -50px)';
                        
                        // Dodaj efekt rozbłysku
                        const flash = document.createElement('div');
                        flash.style.position = 'absolute';
                        flash.style.width = '100px';
                        flash.style.height = '100px';
                        flash.style.borderRadius = '50%';
                        flash.style.backgroundColor = 'rgba(255, 220, 50, 0.7)';
                        flash.style.boxShadow = '0 0 30px rgba(255, 220, 50, 0.9)';
                        flash.style.left = (upPipeRect.left + upPipeRect.width/2 - 50) + 'px';
                        flash.style.top = (upPipeRect.top - 50) + 'px';
                        flash.style.transform = 'scale(0)';
                        flash.style.transition = 'transform 0.3s';
                        flash.style.zIndex = '990';
                        gameArea.appendChild(flash);
                        
                        setTimeout(() => {
                            flash.style.transform = 'scale(1)';
                            setTimeout(() => {
                                if (flash.parentNode) {
                                    flash.style.transform = 'scale(0)';
                                    setTimeout(() => {
                                        if (flash.parentNode) {
                                            gameArea.removeChild(flash);
                                        }
                                    }, 300);
                                }
                            }, 200);
                        }, 10);
                    }
                    
                    if (pipe.downPipe && pipe.downPipe.parentNode) {
                        pipe.downPipe.style.transition = 'opacity 0.4s, transform 0.4s';
                        pipe.downPipe.style.opacity = '0';
                        pipe.downPipe.style.transform = 'scale(1.5) rotate(-20deg) translate(-30px, 50px)';
                        
                        // Dodaj efekt rozbłysku
                        const flash = document.createElement('div');
                        flash.style.position = 'absolute';
                        flash.style.width = '100px';
                        flash.style.height = '100px';
                        flash.style.borderRadius = '50%';
                        flash.style.backgroundColor = 'rgba(255, 220, 50, 0.7)';
                        flash.style.boxShadow = '0 0 30px rgba(255, 220, 50, 0.9)';
                        flash.style.left = (downPipeRect.left + downPipeRect.width/2 - 50) + 'px';
                        flash.style.top = (downPipeRect.bottom - 50) + 'px';
                        flash.style.transform = 'scale(0)';
                        flash.style.transition = 'transform 0.3s';
                        flash.style.zIndex = '990';
                        gameArea.appendChild(flash);
                        
                        setTimeout(() => {
                            flash.style.transform = 'scale(1)';
                            setTimeout(() => {
                                if (flash.parentNode) {
                                    flash.style.transform = 'scale(0)';
                                    setTimeout(() => {
                                        if (flash.parentNode) {
                                            gameArea.removeChild(flash);
                                        }
                                    }, 300);
                                }
                            }, 200);
                        }, 10);
                    }
                    
                    // Dodaj bardziej epickie efekty wizualne zniszczenia
                    const crashEffect = document.createElement('div');
                    crashEffect.className = 'coinPop';
                    crashEffect.textContent = 'CRUSH!';
                    crashEffect.style.left = upPipeRect.left + 'px';
                    crashEffect.style.top = (upPipeRect.top + downPipeRect.bottom) / 2 + 'px';
                    crashEffect.style.color = '#FF0000';
                    crashEffect.style.fontSize = '40px';
                    crashEffect.style.fontWeight = 'bold';
                    crashEffect.style.textShadow = '0 0 10px rgba(255, 200, 0, 0.8)';
                    crashEffect.style.transform = 'scale(0)';
                    crashEffect.style.transition = 'transform 0.2s';
                    gameArea.appendChild(crashEffect);
                    
                    // Animuj tekst CRUSH!
                    setTimeout(() => {
                        crashEffect.style.transform = 'scale(1.2)';
                        setTimeout(() => {
                            crashEffect.style.transform = 'scale(1)';
                        }, 100);
                    }, 10);
                    
                    // Dodaj kawałki zniszczonych rur (odłamki)
                    for (let j = 0; j < 8; j++) {
                        const debris = document.createElement('div');
                        debris.style.position = 'absolute';
                        debris.style.width = '10px';
                        debris.style.height = '10px';
                        debris.style.backgroundColor = '#4CAF50';
                        debris.style.borderRadius = '2px';
                        
                        // Losowe ustawienie pozycji początkowej
                        const isFromTop = Math.random() > 0.5;
                        const startRect = isFromTop ? upPipeRect : downPipeRect;
                        const startX = startRect.left + Math.random() * startRect.width;
                        const startY = isFromTop ? startRect.bottom - 20 : startRect.top + 20;
                        
                        // Losowy kąt i prędkość
                        const angle = Math.random() * Math.PI * 2;
                        const speed = 2 + Math.random() * 5;
                        const distance = 50 + Math.random() * 100;
                        
                        // Ustaw pozycję początkową
                        debris.style.left = startX + 'px';
                        debris.style.top = startY + 'px';
                        
                        // Animacja ruchu
                        debris.style.transition = 'all 0.8s ease-out';
                        gameArea.appendChild(debris);
                        
                        // Animuj odłamek
                        setTimeout(() => {
                            const endX = startX + Math.cos(angle) * distance;
                            const endY = startY + Math.sin(angle) * distance;
                            debris.style.left = endX + 'px';
                            debris.style.top = endY + 'px';
                            debris.style.opacity = '0';
                            debris.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
                            
                            // Usuń po zakończeniu animacji
                            setTimeout(() => {
                                if (debris.parentNode) {
                                    gameArea.removeChild(debris);
                                }
                            }, 800);
                        }, 10);
                    }
                    
                    // Efekt wibracji - silniejszy
                    gameArea.classList.add('screen-shake');
                    setTimeout(() => {
                        gameArea.classList.remove('screen-shake');
                        // Dodaj jeszcze jedno wibrowanie dla efektu
                        setTimeout(() => {
                            gameArea.classList.add('screen-shake');
                            setTimeout(() => {
                                gameArea.classList.remove('screen-shake');
                            }, 100);
                        }, 100);
                    }, 200);
                    
                    // Usuń efekt po chwili
                    setTimeout(() => {
                        if (crashEffect.parentNode) {
                            crashEffect.style.transform = 'scale(0)';
                            setTimeout(() => {
                                if (crashEffect.parentNode) {
                                    gameArea.removeChild(crashEffect);
                                }
                            }, 200);
                        }
                    }, 800);
                    
                    // Dźwięk zniszczenia - odtwórz dwa razy dla lepszego efektu
                    playSound('storkDefeat');
                    setTimeout(() => {
                        playSound('storkDefeat');
                    }, 100);
                    
                    // Oznacz rurę jako zniszczoną
                    pipe.destroyed = true;
                    
                    // Zamiast usuwać w setTimeout, oznaczamy rurę do usunięcia
                    // i pozwalamy głównej pętli w gameCore.js obsłużyć usuwanie
                    setTimeout(() => {
                        if (pipe.upPipe && pipe.upPipe.parentNode) {
                            gameArea.removeChild(pipe.upPipe);
                        }
                        if (pipe.downPipe && pipe.downPipe.parentNode) {
                            gameArea.removeChild(pipe.downPipe);
                        }
                        // NIE usuwamy bezpośrednio z tablicy, zostanie to obsłużone w głównej pętli
                        // pipe.scheduledForRemoval = true; - usuwanie zostaje obsłużone przez element DOM
                    }, 400);
                    
                    // Dodaj większy bonus punktowy za zniszczenie rury
                    score += 5;
                    scoreElement.textContent = score;
                    
                    // Efekt punktowy
                    const pointsEffect = document.createElement('div');
                    pointsEffect.className = 'coinPop';
                    pointsEffect.textContent = '+5';
                    pointsEffect.style.left = (upPipeRect.left + upPipeRect.width/2) + 'px';
                    pointsEffect.style.top = (upPipeRect.top + downPipeRect.bottom) / 2 - 30 + 'px';
                    pointsEffect.style.color = '#FFD700';
                    pointsEffect.style.fontSize = '25px';
                    pointsEffect.style.fontWeight = 'bold';
                    pointsEffect.style.textShadow = '0 0 5px black';
                    gameArea.appendChild(pointsEffect);
                    
                    // Animuj efekt punktowy
                    setTimeout(() => {
                        pointsEffect.style.transition = 'top 1s, opacity 1s';
                        pointsEffect.style.top = (pointsEffect.offsetTop - 50) + 'px';
                        pointsEffect.style.opacity = '0';
                        
                        setTimeout(() => {
                            if (pointsEffect.parentNode) {
                                gameArea.removeChild(pointsEffect);
                            }
                        }, 1000);
                    }, 10);
                    
                    // Odbij się lekko jak przy zniszczeniu bociana
                    velocity = jump * 0.5;
                    
                    return false; // Nie ma kolizji, bo niszczymy rurę
                }
            }
            return false; // W trybie stali jesteśmy niezniszczalni
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
});