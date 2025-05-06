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
        
        console.log("Deaktywacja trybu żaby - rozpoczęcie czyszczenia");
        
        frogModeActive = false;
        frogModeTime = 0;
        
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
        
        // Przywróć normalne parametry
        jump = normalJump;
        gravity = normalGravity;
        invincible = false; // Wyłącz nieśmiertelność
        currentPipeSpeed = pipeSpeed; // Normalna prędkość
        
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
        bird.classList.remove('charging', 'jumping', 'overloaded', 'rubber-mode');
        
        // Przywróć widoczność jetpacka
        const jetpackFlames = bird.querySelector('.jetpack-flames');
        if (jetpackFlames) {
            jetpackFlames.style.display = '';
        }
        
        // Upewnij się, że wszystkie klasy są usunięte także z elementu gameArea
        gameArea.classList.remove('frog-mode-active', 'screen-shake');
        
        // Pokaż komunikat o końcu trybu żaby i przejściu do trybu stali
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
        
        console.log("Deaktywacja trybu żaby - zakończono czyszczenie");
        
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
    
        // Zawsze pozwalamy na rozpoczęcie ładowania (pokazanie paska) niezależnie od tego czy frog jest na ziemi
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
            frogIsOnGround,
            chargeTime: frogChargeStart ? performance.now() - frogChargeStart : 0
        });
        
        // Bardziej liberalne warunki
        if (gameRunning && frogModeActive) {
            if (!frogIsCharging) {
                console.log("Ładowanie nie było aktywne");
                // Jeśli ładowanie nie było aktywne, sprawdź czy żaba jest na ziemi
                if (frogIsOnGround) {
                    velocity = frogJumpMinPower;
                    playSound('jump');
                }
                return;
            }
            
            // Oblicz czas ładowania
            const chargeTime = performance.now() - frogChargeStart;
            console.log("Czas ładowania:", chargeTime, "ms, próg:", frogOverloadThreshold);
            
            // Sprawdź czy przekroczono próg przeładowania
            const isOverloaded = chargeTime > frogOverloadThreshold;
            
            // Tutaj sprawdzamy czy żaba jest na ziemi - tylko wtedy faktycznie skacze
            if (frogIsOnGround) {
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
                    
                    // Zwiększona szansa na aktywację trybu kauczuka przy przeładowaniu (30% zamiast wcześniejszych wartości)
                    if (Math.random() < 0.30) {
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
        setTimeout(() => {
            deactivateSteelMode();
            if (!ghostModeActive) {
                activateGhostMode(null, true);
            }
        }, steelModeDuration * 1000);
    }
    
    // Funkcja deaktywująca tryb stali
    window.deactivateSteelMode = function() {
        if (!steelModeActive) return;
        
        console.log("Deaktywacja trybu stali - rozpoczęcie czyszczenia");
        
        steelModeActive = false;
        
        // Zatrzymaj wszelkie animacje związane z trybem stali
        if (bird.steelAnimation) {
            cancelAnimationFrame(bird.steelAnimation);
            bird.steelAnimation = null;
        }
        
        // Usuń wszystkie efekty błysków i iskier
        const steelEffects = document.querySelectorAll('[style*="steelFlash"], [class*="steelFlash"], [class*="spark"], [class*="debris"]');
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
        
        // Przywróć normalną prędkość rur
        currentPipeSpeed = pipeSpeed;
        
        // Usuń wszystkie efekty zniszczenia rur, które mogły pozostać
        const destructionEffects = document.querySelectorAll('.coinPop[style*="CRUSH"], [class*="flash"], [class*="explosion"]');
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
        
        console.log("Deaktywacja trybu kauczuka - rozpoczęcie czyszczenia");
        
        rubberModeActive = false;
        rubberModeTime = 0;
        
        // Zatrzymaj wszelkie animacje związane z kauczukiem
        if (bird.rubberAnimation) {
            cancelAnimationFrame(bird.rubberAnimation);
            bird.rubberAnimation = null;
        }
        
        // Usuń klasę efektu wizualnego
        bird.classList.remove('rubber-mode');
        
        // Resetuj filter i inne modyfikacje wizualne
        bird.style.filter = '';
        
        // Ukryj wskaźnik trybu kauczuka
        const rubberModeIndicator = document.getElementById('rubberModeIndicator');
        if (rubberModeIndicator) {
            rubberModeIndicator.style.display = 'none';
            
            // Zatrzymaj animacje wskaźnika
            rubberModeIndicator.style.animation = 'none';
        }
        
        // Resetuj wskaźnik czasu trybu kauczuka
        const rubberModeTimer = document.getElementById('rubberModeTimer');
        if (rubberModeTimer) {
            rubberModeTimer.textContent = '0s';
        }
        
        // Usuń wszystkie efekty wizualne związane z kauczukiem
        const rubberEffects = document.querySelectorAll('.rubber-effect, .bounce-effect');
        rubberEffects.forEach(effect => {
            if (effect && effect.parentNode) {
                effect.style.animation = 'none';
                effect.parentNode.removeChild(effect);
            }
        });
        
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
        
        console.log("Deaktywacja trybu ducha - rozpoczęcie czyszczenia");
        
        ghostModeActive = false;
        ghostModeTime = 0;
        gameArea.classList.remove('ghost-mode-active');
        ghostModeTimer.style.display = 'none';
        ghostMode = false;
        
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
            
            // Dokładnie usuń wszystkie elementy żaby
            const frogElements = bird.querySelectorAll('.frog-head, .frog-belly, .frog-eye, .frog-front-leg, .frog-back-thigh');
            frogElements.forEach(element => {
                if (element && element.parentNode === bird) {
                    // Usuwamy najpierw wszystkie dzieci elementu
                    const children = element.querySelectorAll('*');
                    children.forEach(child => {
                        if (child && child.parentNode === element) {
                            // Rekurencyjnie usuwamy dzieci dzieci (np. stopa w łydce)
                            const grandchildren = child.querySelectorAll('*');
                            grandchildren.forEach(grandchild => {
                                if (grandchild && grandchild.parentNode === child) {
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
            
            // Usuń dodatkowe klasy żaby
            bird.classList.remove('charging', 'jumping', 'overloaded', 'rubber-mode');
            
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
        
        console.log("Deaktywacja trybu bociana - rozpoczęcie czyszczenia");
        
        storkModeActive = false;
        storkModeTime = 0;
        gameArea.classList.remove('stork-mode-active');
        storkModeTimer.style.display = 'none';
        
        // Wyczyść wszystkie dodatkowe elementy związane z trybem bociana
        const windCoins = document.querySelectorAll('.windCoin');
        windCoins.forEach(coin => {
            if (coin && coin.parentNode) {
                coin.parentNode.removeChild(coin);
            }
        });
        
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
        const flashEffects = document.querySelectorAll('[class*="flash"]');
        flashEffects.forEach(effect => {
            if (effect && effect.parentNode && effect !== bird) {
                effect.parentNode.removeChild(effect);
            }
        });
        
        // Usuń klasy wizualnych efektów
        gameArea.classList.remove('screen-shake');
        
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
        
        console.log("Deaktywacja trybu bociana - zakończono czyszczenie");
        
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
                // W trybie żaby zawsze pokazujemy pasek ładowania niezależnie czy żaba jest na ziemi
                // Faktyczny skok wykona się tylko gdy żaba jest na ziemi - sprawdzane w stopFrogCharging
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