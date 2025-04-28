// Funkcje ładujące sceny z wybranej podróży
// --------------------------------------------------------------

// Zaktualizowana funkcja loadScenesFromTravel
async function loadScenesFromTravel(travelId) {
    // Znajdź konfigurację podróży o podanym ID
    const travel = window.travelsConfig.find(t => t.id === travelId);

    if (!travel) {
        console.error(`Podróż o ID ${travelId} nie została znaleziona.`);
        return null;
    }

    try {
        // Obiekt do przechowywania wszystkich załadowanych scen
        let allScenes = {};

        // Ładuj i łącz wszystkie pliki JSON dla wybranej podróży
        for (const file of travel.files) {
            console.log(`Ładowanie pliku: ${travel.path}/${file}`);
            const response = await fetch(`${travel.path}/${file}`);

            if (!response.ok) {
                throw new Error(`Błąd ładowania pliku ${file}: ${response.status}`);
            }

            // Pobierz zawartość jako tekst zamiast bezpośrednio parsować jako JSON
            const text = await response.text();

            // Usuń komentarze (// ...) przed parsowaniem
            const cleanedText = text.replace(/\/\/.*$/gm, '');

            try {
                // Parsuj oczyszczony tekst jako JSON
                const scenesData = JSON.parse(cleanedText);

                // Dodaj prefiks do ID scen, aby były unikalne dla każdej podróży
                // Nie modyfikujemy oryginalnych plików JSON
                const prefixedScenes = {};

                // Dla każdej sceny w pliku, utwórz nowy klucz z prefiksem podróży
                Object.keys(scenesData).forEach(sceneId => {
                    const scene = scenesData[sceneId];

                    // Dodaj prefiks do ID sceny
                    const prefixedSceneId = `travel${travelId}_${sceneId}`;

                    // Skopiuj scenę i zaktualizuj odniesienia do innych scen
                    const updatedScene = { ...scene };

                    // Zaktualizuj odniesienia w wyborach
                    if (updatedScene.choices && updatedScene.choices.length > 0) {
                        updatedScene.choices = updatedScene.choices.map(choice => {
                            return {
                                ...choice,
                                // Dodaj prefiks do ID następnej sceny
                                nextScene: `travel${travelId}_${choice.nextScene}`
                            };
                        });
                    }

                    // Dodaj zaktualizowaną scenę do kolekcji
                    prefixedScenes[prefixedSceneId] = updatedScene;
                });

                // Połącz zaktualizowane sceny z głównym obiektem
                allScenes = { ...allScenes, ...prefixedScenes };
            } catch (parseError) {
                console.error(`Błąd parsowania pliku ${file}:`, parseError);
                throw parseError;
            }
        }

        console.log(`Podróż "${travel.name}" załadowana pomyślnie.`);
        return allScenes;
    } catch (error) {
        console.error(`Nie udało się załadować podróży: ${error}`);
        return null;
    }
}

// Funkcja inicjalizująca grę z wybraną podróżą
async function initGameWithTravel(travelId = 1) {
    try {
        // Załaduj sceny z wybranej podróży
        const scenes = await loadScenesFromTravel(travelId);

        if (scenes) {
            // Ważne: Wyraźnie czyścimy i ustawiamy globalną zmienną scenesData
            window.scenesData = {};
            window.scenesData = scenes;

            // Dodajemy logowanie dla debugowania
            console.log("Ustawiono nowe sceny dla podróży ID:", travelId);
            console.log("Zawartość scenesData:", window.scenesData);

            // Zaktualizuj tytuł i podtytuł gry na podstawie wybranej podróży
            const travel = window.travelsConfig.find(t => t.id === travelId);
            if (travel) {
                const titleElement = document.querySelector('.game-title');
                const subtitleElement = document.querySelector('.subtitle');

                if (titleElement) titleElement.textContent = travel.name;
                if (subtitleElement) subtitleElement.textContent = travel.description;
            }

            console.log("Sceny załadowane pomyślnie, inicjalizacja gry...");
            return true;
        } else {
            // Jeśli nie udało się załadować scen z JSON, spróbuj załadować z scenes.js
            console.warn("Nie udało się załadować scen z JSON, korzystam z scenes.js jako zapasowego źródła.");
            return false;
        }
    } catch (error) {
        console.error("Błąd podczas inicjalizacji gry:", error);
        return false;
    }
}

// Funkcja zmieniająca aktualną podróż
async function switchTravel(travelId) {
    const success = await initGameWithTravel(travelId);

    if (success) {
        // Stwórz nową instancję gry lub zresetuj istniejącą
        if (window.game) {
            // Zresetuj stan gry
            window.game.gameState = {
                emotions: {
                    melancholy: 0,
                    hope: 0,
                    love: 0,
                    courage: 0
                },
                variables: {},
                visitedScenes: []
            };

            // Załaduj scenę początkową nowej podróży
            window.game.loadScene('intro');
        } else {
            console.error("Obiekt gry nie istnieje, nie można przełączyć podróży.");
        }
    }
}

// Eksportuj funkcje
window.loadScenesFromTravel = loadScenesFromTravel;
window.initGameWithTravel = initGameWithTravel;
window.switchTravel = switchTravel;

// Klasa ładująca i obsługująca dane gry
// --------------------------------------------------------------
class StoryLoader {
    constructor() {
        this.scenesData = null;
        this.loadingElement = null;
        this.butterflyCount = 5;
        this.butterflies = [];
        this.dataLoaded = false;
        this.scenesLoaded = false;
        this.imagesDataLoaded = false;

        // Dodajemy właściwość dla określenia aktualnej podróży
        this.currentTravelId = 1; // Domyślnie pierwsza podróż
    }

    // Inicjalizacja procesu ładowania
    async init() {
        // Stwórz element ładowania
        this.createLoadingElement();

        try {
            // Próba załadowania scen z wybranej podróży
            const scenes = await loadScenesFromTravel(this.currentTravelId);

            if (scenes) {
                // Ustaw globalną zmienną scenesData
                window.scenesData = scenes;
                this.scenesLoaded = true;
                this.updateStatus("Wczytywanie danych obrazów...");
                this.checkImagesDataLoaded();
            } else {
                // Jeśli nie udało się załadować z JSON, sprawdź tradycyjny sposób
                this.checkIfDataIsReady();
            }
        } catch (error) {
            console.error("Błąd podczas ładowania podróży:", error);
            // Powrót do tradycyjnego sprawdzania
            this.checkIfDataIsReady();
        }
    }

    // Tworzenie elementu ładowania z motylami
    createLoadingElement() {
        // Utwórz główny element ładowania
        this.loadingElement = document.createElement('div');
        this.loadingElement.className = 'loading-screen';
        this.loadingElement.innerHTML = `
            <div class="loading-container">
                <h3 class="loading-text">Ładowanie opowieści</h3>
                <div class="loading-butterflies-container"></div>
                <p class="loading-status">Przygotowywanie historii...</p>
            </div>
        `;

        // Dodaj style
        const style = document.createElement('style');
        style.textContent = `
            .loading-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #f9f5f6 0%, #fdf2f6 100%);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                opacity: 1;
                transition: opacity 0.8s ease-out;
            }
            
            .loading-container {
                text-align: center;
                max-width: 80%;
                position: relative;
            }
            
            .loading-text {
                font-family: 'Playfair Display', serif;
                color: #b58ea6;
                font-size: 1.8rem;
                margin-bottom: 2rem;
                font-weight: normal;
                opacity: 0;
                animation: fadeIn 1s ease forwards;
            }
            
            .loading-status {
                font-family: 'Montserrat', sans-serif;
                color: #94718a;
                font-size: 1rem;
                font-style: italic;
                margin-top: 2rem;
                opacity: 0;
                animation: fadeIn 1s ease forwards 0.3s;
            }
            
            .loading-butterflies-container {
                height: 150px;
                position: relative;
                margin: 0 auto;
                width: 300px;
            }
            
            .butterfly {
                position: absolute;
                width: 30px;
                height: 30px;
                pointer-events: none;
                z-index: 5;
                transform-origin: center;
            }
            
            .butterfly svg {
                width: 100%;
                height: 100%;
                filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.8));
            }
            
            /* Elegancka animacja lotu motyla z realistycznym ruchem skrzydeł */
            @keyframes flyButterfly {
                0% { 
                    opacity: 0; 
                    transform: translateY(20px) translateX(-10px) scale(0.2); 
                }
                10% { 
                    opacity: 1; 
                    transform: translateY(10px) translateX(10px) scale(0.8) rotate(5deg); 
                }
                25% { 
                    transform: translateY(-15px) translateX(15px) scale(1) rotate(-3deg); 
                }
                40% { 
                    transform: translateY(-5px) translateX(25px) scale(0.9) rotate(2deg); 
                }
                60% { 
                    transform: translateY(-20px) translateX(10px) scale(1) rotate(-2deg); 
                }
                75% { 
                    transform: translateY(-10px) translateX(15px) scale(0.9) rotate(5deg); 
                }
                90% { 
                    opacity: 1; 
                    transform: translateY(0px) translateX(5px) scale(0.8) rotate(0deg); 
                }
                100% { 
                    opacity: 0; 
                    transform: translateY(10px) translateX(-5px) scale(0.2); 
                }
            }
            
            @keyframes flutterWings {
                0% { transform: scaleX(1); }
                50% { transform: scaleX(0.8); }
                100% { transform: scaleX(1); }
            }
            
            @keyframes moveRandomly {
                0%, 100% { 
                    transform: translate(0, 0) rotate(0deg);
                }
                25% { 
                    transform: translate(20px, -15px) rotate(5deg);
                }
                50% { 
                    transform: translate(-5px, -25px) rotate(-3deg);
                }
                75% { 
                    transform: translate(-15px, -5px) rotate(2deg);
                }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            
            @keyframes finalButterflyFlight {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0);
                }
                10% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1) rotate(0deg);
                }
                30% {
                    transform: translate(-40%, -40%) scale(1.1) rotate(5deg);
                }
                60% {
                    transform: translate(-60%, -10%) scale(0.9) rotate(-5deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, 100px) scale(0.2) rotate(0deg);
                }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(this.loadingElement);

        // Dodaj motyle
        this.createButterflies();
    }

    // Tworzenie ulepszonej animacji motyli
    createButterflies() {
        const container = this.loadingElement.querySelector('.loading-butterflies-container');

        const butterflyColors = [
            '#ffb7d5', '#ffc2e2', '#ffcce0', '#ffd9e9',
            '#ffe5f1', '#ffdca6', '#c5a3ff'
        ];

        for (let i = 0; i < this.butterflyCount; i++) {
            const butterfly = document.createElement('div');
            butterfly.className = 'butterfly';

            // Losowy kolor i rozmiar
            const color = butterflyColors[Math.floor(Math.random() * butterflyColors.length)];
            const size = 25 + Math.floor(Math.random() * 15);
            butterfly.style.width = `${size}px`;
            butterfly.style.height = `${size}px`;

            // Ulepszone SVG motyla z bardziej szczegółowymi skrzydłami
            butterfly.innerHTML = `
                <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                    <g class="wings" style="animation: flutterWings ${0.15 + Math.random() * 0.1}s alternate infinite ease-in-out;">
                        <path d="M25,10 C30,5 40,0 45,15 C45,30 30,35 25,25 C20,35 5,30 5,15 C5,0 20,5 25,10 Z" fill="${color}" opacity="0.9"/>
                        <path d="M25,25 C30,30 40,35 45,45 C45,50 30,55 25,45 C20,55 5,50 5,45 C5,35 20,30 25,25 Z" fill="${color}" opacity="0.7"/>
                        <path d="M25,10 L25,45" stroke="#fff" stroke-width="0.8" stroke-dasharray="1,1"/>
                        <ellipse cx="25" cy="25" rx="2" ry="4" fill="#fff" opacity="0.5"/>
                    </g>
                </svg>
            `;

            // Losowa pozycja początkowa
            const left = 10 + Math.random() * 260;
            const top = 10 + Math.random() * 130;
            butterfly.style.left = `${left}px`;
            butterfly.style.top = `${top}px`;

            // Losowe opóźnienie i czas trwania
            const delay = 0.1 + Math.random() * 0.5;
            const duration = 4 + Math.random() * 3;

            // Bardziej realistyczna animacja lotu
            butterfly.style.animation = `flyButterfly ${duration}s ease-in-out ${delay}s infinite`;

            container.appendChild(butterfly);
            this.butterflies.push(butterfly);
        }
    }

    // Sprawdza czy dane są już załadowane
    checkIfDataIsReady() {
        // Sprawdź czy obiekt scenesData jest dostępny (został wczytany z 2.json)
        if (typeof scenesData !== 'undefined' && scenesData) {
            this.scenesLoaded = true;
            this.updateStatus("Wczytywanie danych obrazów...");
            this.checkImagesDataLoaded();
        } else {
            // Dane jeszcze się ładują, sprawdź ponownie za chwilę
            this.updateStatus("Wczytywanie scen...");
            setTimeout(() => this.checkIfDataIsReady(), 500);
        }
    }

    // Sprawdza czy dane obrazów zostały załadowane
    checkImagesDataLoaded() {
        fetch('data/images.csv')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Plik CSV nie jest dostępny');
                }
                return response.text();
            })
            .then(data => {
                this.imagesDataLoaded = true;
                this.updateStatus("Wszystkie dane załadowane!");
                this.checkAllDataLoaded();
            })
            .catch(error => {
                console.warn('Błąd wczytywania CSV:', error);
                this.updateStatus("Ładowanie zakończone (używam danych zapasowych)");
                this.imagesDataLoaded = true;
                this.checkAllDataLoaded();
            });
    }

    // Sprawdza czy wszystkie dane zostały załadowane
    checkAllDataLoaded() {
        if (this.scenesLoaded && this.imagesDataLoaded) {
            this.dataLoaded = true;
            setTimeout(() => this.sceneLoadComplete(), 500);
        }
    }

    // Aktualizacja statusu ładowania
    updateStatus(message) {
        const statusElement = this.loadingElement.querySelector('.loading-status');

        // Animacja zmiany tekstu
        statusElement.style.animation = 'fadeOut 0.3s ease forwards';

        setTimeout(() => {
            statusElement.textContent = message;
            statusElement.style.animation = 'fadeIn 0.3s ease forwards';
        }, 300);
    }

    // Zakończenie ładowania
    sceneLoadComplete() {
        this.updateStatus("Historia gotowa!");

        // Dodaj motyla, który poleci do przycisku Start
        this.addFinalButterfly();

        // Ukryj ekran ładowania po krótkiej chwili
        setTimeout(() => {
            this.hideLoadingScreen();
        }, 1500);
    }

    // Dodanie finałowego motyla
    addFinalButterfly() {
        const container = this.loadingElement.querySelector('.loading-butterflies-container');
        const finalButterfly = document.createElement('div');
        finalButterfly.className = 'butterfly final-butterfly';

        finalButterfly.innerHTML = `
            <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <g class="wings" style="animation: flutterWings 0.15s alternate infinite ease-in-out;">
                    <path d="M25,10 C30,5 40,0 45,15 C45,30 30,35 25,25 C20,35 5,30 5,15 C5,0 20,5 25,10 Z" fill="#ffb7d5" opacity="0.9"/>
                    <path d="M25,25 C30,30 40,35 45,45 C45,50 30,55 25,45 C20,55 5,50 5,45 C5,35 20,30 25,25 Z" fill="#ffb7d5" opacity="0.7"/>
                    <path d="M25,10 L25,45" stroke="#fff" stroke-width="0.8" stroke-dasharray="1,1"/>
                    <ellipse cx="25" cy="25" rx="2" ry="4" fill="#fff" opacity="0.5"/>
                </g>
            </svg>
        `;

        container.appendChild(finalButterfly);

        // Style dla finałowego motyla
        finalButterfly.style.left = '50%';
        finalButterfly.style.top = '50%';
        finalButterfly.style.width = '40px';
        finalButterfly.style.height = '40px';
        finalButterfly.style.opacity = '1';
        finalButterfly.style.zIndex = '10';
        finalButterfly.style.transform = 'translate(-50%, -50%)';

        // Animacja finałowego motyla
        setTimeout(() => {
            finalButterfly.style.animation = 'finalButterflyFlight 2s forwards ease-out';
        }, 300);
    }

    // Ukrycie ekranu ładowania
    hideLoadingScreen() {
        this.loadingElement.style.opacity = '0';

        // Po zakończeniu animacji, usuń element
        setTimeout(() => {
            document.body.removeChild(this.loadingElement);

            // Wyemituj event zakończenia ładowania
            const event = new Event('scenesLoaded');
            document.dispatchEvent(event);

            // Dodaj efekt motyla do przycisku Start
            this.addButterflyToStartButton();
        }, 800);
    }

    // Dodanie efektu motyla do przycisku Start
    addButterflyToStartButton() {
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            // Dodaj motylkowy efekt do przycisku
            const butterflyEffect = document.createElement('div');
            butterflyEffect.className = 'start-butterfly-effect';

            const style = document.createElement('style');
            style.textContent = `
                .start-butterfly-effect {
                    position: absolute;
                    top: -15px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 30px;
                    height: 30px;
                    z-index: 5;
                    pointer-events: none;
                    opacity: 0;
                    animation: butterflyAppear 0.8s forwards;
                }
                
                @keyframes butterflyAppear {
                    0% {
                        opacity: 0;
                        transform: translateX(-50%) scale(0.2);
                    }
                    100% {
                        opacity: 1;
                        transform: translateX(-50%) scale(1);
                    }
                }
                
                .start-btn {
                    position: relative;
                    overflow: visible !important;
                }
                
                .start-btn:hover .start-butterfly-effect {
                    animation: butterflyDance 2s infinite alternate ease-in-out;
                }
                
                @keyframes butterflyDance {
                    0% {
                        transform: translateX(-50%) translateY(0) rotate(0deg);
                    }
                    33% {
                        transform: translateX(-40%) translateY(-5px) rotate(5deg);
                    }
                    66% {
                        transform: translateX(-60%) translateY(-8px) rotate(-3deg);
                    }
                    100% {
                        transform: translateX(-50%) translateY(-12px) rotate(2deg);
                    }
                }
            `;
            document.head.appendChild(style);

            butterflyEffect.innerHTML = `
                <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                    <g class="wings" style="animation: flutterWings 0.25s alternate infinite ease-in-out;">
                        <path d="M25,10 C30,5 40,0 45,15 C45,30 30,35 25,25 C20,35 5,30 5,15 C5,0 20,5 25,10 Z" fill="#ffffff" opacity="0.9"/>
                        <path d="M25,25 C30,30 40,35 45,45 C45,50 30,55 25,45 C20,55 5,50 5,45 C5,35 20,30 25,25 Z" fill="#ffffff" opacity="0.7"/>
                        <path d="M25,10 L25,45" stroke="#fff" stroke-width="0.8" stroke-dasharray="1,1"/>
                        <ellipse cx="25" cy="25" rx="2" ry="4" fill="#ffb7d5" opacity="0.5"/>
                    </g>
                </svg>
            `;

            startBtn.appendChild(butterflyEffect);
            startBtn.style.position = 'relative';
            startBtn.style.overflow = 'visible';
        }
    }
}

// Funkcja inicjująca grę po załadowaniu dokumentu
document.addEventListener('DOMContentLoaded', () => {
    const storyLoader = new StoryLoader();
    storyLoader.init();

    // Nasłuchiwanie na zakończenie ładowania
    document.addEventListener('scenesLoaded', () => {
        // Inicjalizacja gry
        const game = new StoryGame();
    });
});