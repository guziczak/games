// Game Modes and Special Abilities
document.addEventListener('DOMContentLoaded', function() {
    // Funkcje TRYB FROGA
    window.activateFrogMode = function(event) {
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
            
            // Zresetuj zmienne skoku żaby
            frogIsCharging = false;
            frogChargeStart = 0;
            frogIsOnGround = true; // Ustawiamy na true, bo zazwyczaj aktywujemy gdy jesteśmy na ziemi
            
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
    
    window.deactivateFrogMode = function() {
        if (!frogModeActive) return;
        
        frogModeActive = false;
        frogModeTime = 0;
        
        // Dodaj przejściową klasę dla efektu transformacji
        bird.classList.add('transforming-back');
        
        // Usuń klasę frog-mode-active
        gameArea.classList.remove('frog-mode-active');
        
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
        
        // Aktywuj tryb stali jako przejściowy między żabą a duchem
        activateSteelMode();
    }
    
    window.updateFrogModeButton = function() {
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
    
        // Bardziej elastyczne warunki - nawet jeśli nie jest na ziemi, spróbuj załadować
        if (gameRunning && frogModeActive && !frogIsCharging) {
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
            chargeTime: frogChargeStart ? performance.now() - frogChargeStart : 0
        });
        
        // Bardziej liberalne warunki
        if (gameRunning && frogModeActive) {
            if (!frogIsCharging) {
                console.log("Ładowanie nie było aktywne, ale i tak wykonuję skok");
                // Jeśli ładowanie nie było aktywne, wykonaj minimalny skok
                velocity = frogJumpMinPower;
                playSound('jump');
                return;
            }
            
            // Oblicz czas ładowania
            const chargeTime = performance.now() - frogChargeStart;
            console.log("Czas ładowania:", chargeTime, "ms, próg:", frogOverloadThreshold);
            
            // Sprawdź czy przekroczono próg przeładowania
            if (chargeTime > frogOverloadThreshold) {
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
                
                // Rzadka szansa na aktywację trybu kauczuka
                if (Math.random() < frogRubberModeChance) {
                    console.log("TRYB KAUCZUKA AKTYWOWANY!");
                    activateRubberMode();
                }
                
                // Nadaj ekstremalną siłę skoku
                velocity = frogJumpMaxPower * 1.5;
                
                // Ustaw liczbę odbić
                frogOverloadBounceCount = frogMaxBounces;
            } else {
                // Normalne ładowanie - zastosuj proporcjonalną siłę skoku
                const chargePercent = Math.min(chargeTime / frogChargeMax, 1.0);
                const jumpPower = frogJumpMinPower + (frogJumpMaxPower - frogJumpMinPower) * chargePercent;
                velocity = jumpPower;
                console.log("Normalny skok z mocą:", jumpPower, "(", chargePercent * 100, "%)");
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
    window.activateSteelMode = function() {
        if (steelModeActive) return;
        
        steelModeActive = true;
        
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
        
        // Zmień wygląd na stalowego ptaka
        bird.style.animation = 'none';
        bird.style.background = 'linear-gradient(135deg, #A9A9A9, #778899, #C0C0C0)';
        bird.style.borderRadius = '50% 50% 30% 30%';
        bird.style.boxShadow = '0 0 20px rgba(192, 192, 192, 0.9), inset 0 0 10px rgba(255, 255, 255, 0.8)';
        bird.style.filter = 'brightness(1.2) contrast(1.2)';
        
        // Efekt odbicia od ziemi przy transformacji
        if (frogIsOnGround) {
            velocity = -10; // Silny impuls do góry
            playSound('jump'); // Efekt dźwiękowy
        }
        
        // Pokaż komunikat o trybie stali
        const steelMsg = document.createElement('div');
        steelMsg.className = 'coinPop purpleCoinPop';
        steelMsg.textContent = 'TRYB STALI!';
        steelMsg.style.left = '50%';
        steelMsg.style.top = '50%';
        steelMsg.style.transform = 'translate(-50%, -50%)';
        steelMsg.style.color = '#C0C0C0';
        steelMsg.style.fontSize = '30px';
        steelMsg.style.textShadow = '0 0 10px #FFFFFF';
        gameArea.appendChild(steelMsg);
        
        // Efekt wibracji ekranu
        gameArea.classList.add('screen-shake');
        setTimeout(() => {
            gameArea.classList.remove('screen-shake');
        }, 300);
        
        // Błysk metaliczny
        const flashEffect = document.createElement('div');
        flashEffect.style.position = 'absolute';
        flashEffect.style.width = '100%';
        flashEffect.style.height = '100%';
        flashEffect.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        flashEffect.style.zIndex = '1000';
        flashEffect.style.pointerEvents = 'none';
        gameArea.appendChild(flashEffect);
        
        // Usuń błysk po chwili
        setTimeout(() => {
            if (flashEffect.parentNode) {
                gameArea.removeChild(flashEffect);
            }
        }, 100);
        
        setTimeout(() => {
            if (steelMsg.parentNode) {
                gameArea.removeChild(steelMsg);
            }
            
            // Po określonym czasie przejdź do trybu ducha
            setTimeout(() => {
                deactivateSteelMode();
                if (!ghostModeActive) {
                    activateGhostMode(null, true);
                }
            }, steelModeDuration * 1000);
        }, 1500);
    }
    
    // Funkcja deaktywująca tryb stali
    window.deactivateSteelMode = function() {
        if (!steelModeActive) return;
        
        steelModeActive = false;
        
        // Przywróć wygląd kaczorka - ale nie odtwarzaj pełnej funkcji deactivateFrogMode
        // bo to już zostało zrobione wcześniej
        bird.style.animation = 'crazyDuck 2s infinite alternate';
        bird.style.background = 'linear-gradient(135deg, #FFFF00, #FFA500, #FFD700)';
        bird.style.borderRadius = '50% 50% 30% 30%';
        bird.style.boxShadow = '0 2px 10px rgba(255, 215, 0, 0.7)';
        bird.style.filter = 'none';
        
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
    }
    
    // Funkcja aktywująca Tryb Kauczuka
    window.activateRubberMode = function() {
        if (rubberModeActive) return;
        
        rubberModeActive = true;
        rubberModeTime = rubberModeDuration;
        
        // Dodaj klasę dla wizualnego efektu
        bird.classList.add('rubber-mode');
        
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
        
        // Pokaż efekt aktywacji - BARDZIEJ DRAMATYCZNY
        const activationEffect = document.createElement('div');
        activationEffect.className = 'coinPop purpleCoinPop';
        activationEffect.style.color = '#FF00FF';
        activationEffect.style.fontSize = '40px';
        activationEffect.style.fontWeight = 'bold';
        activationEffect.style.textShadow = '0 0 10px #FF00FF, 0 0 20px #FF00FF';
        activationEffect.innerHTML = 'TRYB KAUCZUKA!!!<br>🧪🧪🧪';
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
        }, 2000);
    }
    
    // Funkcja deaktywująca Tryb Kauczuka
    window.deactivateRubberMode = function() {
        if (!rubberModeActive) return;
        
        rubberModeActive = false;
        rubberModeTime = 0;
        
        // Usuń klasę efektu wizualnego
        bird.classList.remove('rubber-mode');
        
        // Ukryj wskaźnik trybu kauczuka
        const rubberModeIndicator = document.getElementById('rubberModeIndicator');
        if (rubberModeIndicator) {
            rubberModeIndicator.style.display = 'none';
        }
        
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
    }
    
    // Funkcje TRYB DUCHA
    window.activateGhostMode = function(event, freeActivation = false) {
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
    
    window.deactivateGhostMode = function() {
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
    
    window.updateGhostModeButton = function() {
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
    
    // Funkcje TRYB BOCIANA
    window.activateStorkMode = function(event) {
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
    
    window.deactivateStorkMode = function() {
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
    
    window.updateStorkModeButton = function() {
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
                // W trybie żaby zaczynamy ładować skok
                // Bardziej elastyczne warunki - zawsze próbuj ładować
                startFrogCharging();
                // Faktyczne wykonanie skoku obsługuje funkcja stopFrogCharging
            } else if (steelModeActive) {
                // W trybie stali mocniejszy skok
                velocity = jump * 1.2;
                playSound('jump');
                
                // Dodaj efekt błysku metalicznego
                const steelFlash = document.createElement('div');
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