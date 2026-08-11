// Game Entities and Objects
document.addEventListener('DOMContentLoaded', function() {
    const entityTimeouts = new Set();

    // Entity callbacks (including delayed loot) are scoped to one run, so a
    // restart cannot spawn rewards or effects from the previous session.
    function setTimeout(callback, delay, ...args) {
        const generation = window.SkyDodge && window.SkyDodge.state
            ? window.SkyDodge.state.session.generation
            : null;
        let handle = null;
        handle = window.setTimeout(() => {
            entityTimeouts.delete(handle);
            const currentGeneration = window.SkyDodge && window.SkyDodge.state
                ? window.SkyDodge.state.session.generation
                : null;
            if (generation !== null && generation !== currentGeneration) return;
            callback(...args);
        }, delay);
        entityTimeouts.add(handle);
        return handle;
    }

    window.clearEntityTimers = function() {
        entityTimeouts.forEach(handle => window.clearTimeout(handle));
        entityTimeouts.clear();
    };

    window.createPipe = function() {
        const gameAreaHeight = gameArea.clientHeight;
        const groundHeight = ground.clientHeight;
        const playableHeight = gameAreaHeight - groundHeight;
        const effectiveGap = Math.min(pipeGap, Math.max(120, playableHeight * 0.38));
        const minHeight = Math.min(50, Math.max(32, playableHeight * 0.12));
        const layoutHelper = window.SkyDodgeLogic && window.SkyDodgeLogic.calculatePipeLayout;
        const layout = typeof layoutHelper === 'function'
            ? layoutHelper({
                gameHeight: gameAreaHeight,
                groundHeight,
                pipeGap: effectiveGap,
                minPipeHeight: minHeight,
                random: Math.random
            })
            : null;

        if (!layout) {
            console.error("Nie można utworzyć rur: niewystarczająca wysokość.");
            return;
        }
        
        const upPipe = document.createElement('div');
        if (!upPipe) {
            console.error("Nie udało się utworzyć górnej rury.");
            return;
        }
        upPipe.className = 'pipe pipeUp';
        upPipe.style.height = layout.bottomVisibleHeight + 'px';
        upPipe.style.bottom = groundHeight + 'px';
        upPipe.style.left = gameArea.clientWidth + 'px';
        
        const downPipe = document.createElement('div');
        if (!downPipe) {
            console.error("Nie udało się utworzyć dolnej rury.");
            return;
        }
        downPipe.className = 'pipe pipeDown';
        downPipe.style.height = layout.topHeight + 'px';
        downPipe.style.left = gameArea.clientWidth + 'px';
        
        gameArea.appendChild(upPipe);
        gameArea.appendChild(downPipe);
        
        pipes.push({
            x: gameArea.clientWidth,
            upPipe: upPipe,
            downPipe: downPipe,
            passed: false,
            destroyed: false,
            gap: effectiveGap,
            gapCenterY: layout.topHeight + effectiveGap / 2,
            gapTop: layout.topHeight,
            gapBottom: layout.topHeight + effectiveGap,
            grabbed: false
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
        
        // A warning should stay distinct from the playable stork transformation.
        playSound('storkAlert');
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
            explosion.className = 'steel-explosion';
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
                debris.className = 'steel-debris';
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
    
    // Compatibility entry point: all gameplay uses the single pipeline loaded
    // from collisionPipeline.js.
    window.checkCollision = function(timestamp = performance.now()) {
        return typeof window.processCollisions === 'function'
            ? window.processCollisions(timestamp)
            : false;
    };

});
