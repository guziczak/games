// Główna klasa obsługująca grę
class StoryGame {
    constructor() {
        this.currentScene = null;
        this.gameState = {
            emotions: {
                melancholy: 0,
                hope: 0,
                love: 0,
                courage: 0
            },
            variables: {},
            visitedScenes: []
        };
        this.savedQuotes = [];
        this.imageData = [];
        this.musicPlaying = false;

        // Elementy DOM
        this.gameContent = document.getElementById('gameContent');
        this.startBtn = document.getElementById('startBtn');
        this.soundToggle = document.getElementById('soundToggle');
        this.soundIcon = document.getElementById('soundIcon');
        this.backgroundMusic = document.getElementById('backgroundMusic');
        this.diaryBtn = document.getElementById('diaryBtn');
        this.diaryPanel = document.getElementById('diaryPanel');
        this.diaryClose = document.getElementById('diaryClose');
        this.quotesContainer = document.getElementById('quotesContainer');

        // Inicjalizacja
        this.init();
    }

    init() {
        // Załaduj dane obrazów z CSV
        this.loadImageData();

        // Załaduj zapisane cytaty z localStorage
        this.loadSavedQuotes();

        // Dodaj efekt płatków
        this.addBackgroundPetals();

        // Stwórz wskaźnik emocji
        this.createEmotionIndicator();

        // Przypisanie zdarzeń do elementów
        this.startBtn.addEventListener('click', () => {
            this.startGame();
            // Spróbuj włączyć muzykę po kliknięciu przycisku start
            this.playBackgroundMusic();
        });

        this.soundToggle.addEventListener('click', () => this.toggleMusic());
        this.diaryBtn.addEventListener('click', () => this.openDiary());
        this.diaryClose.addEventListener('click', () => this.closeDiary());

        // Obsługa klawiszy
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.diaryPanel.style.display === 'flex') {
                this.closeDiary();
            }
        });
    }

    // Metoda włączająca muzykę w tle
    playBackgroundMusic() {
        try {
            const playPromise = this.backgroundMusic.play();

            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Muzyka działa
                    this.musicPlaying = true;
                    this.updateMusicIcon(true);
                    console.log('Muzyka w tle włączona pomyślnie');
                })
                    .catch(error => {
                        // Muzyka zablokowana lub inny błąd
                        console.log('Nie można włączyć muzyki automatycznie:', error);
                        this.musicPlaying = false;
                        this.updateMusicIcon(false);
                    });
            }
        } catch (error) {
            console.log('Błąd przy próbie włączenia muzyki:', error);
        }
    }

    // Metoda aktualizująca ikonę dźwięku
    updateMusicIcon(isPlaying) {
        if (isPlaying) {
            this.soundIcon.innerHTML = `
                <path d="M12 5v14c-3.5-0.8-5-3-5-7s1.5-6.2 5-7z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"></path>
                <path d="M19 8a9 9 0 0 1 0 8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"></path>
                <path d="M16 10.5a5 5 0 0 1 0 3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"></path>
            `;
        } else {
            this.soundIcon.innerHTML = `
                <path d="M12 5v14c-3.5-0.8-5-3-5-7s1.5-6.2 5-7z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"></path>
                <line x1="17" y1="9" x2="21" y2="13" stroke="currentColor" stroke-linecap="round" stroke-width="2"></line>
                <line x1="21" y1="9" x2="17" y2="13" stroke="currentColor" stroke-linecap="round" stroke-width="2"></line>
            `;
        }
    }

    // Metoda ładująca dane obrazów z CSV
    async loadImageData() {
        try {
            // Pobierz plik CSV
            const response = await fetch('data/images.csv');
            if (!response.ok) {
                throw new Error(`Błąd HTTP! status: ${response.status}`);
            }
            const csvData = await response.text();

            // Parsowanie danych CSV
            this.parseImageCSV(csvData);

            console.log('Załadowane dane obrazów:', this.imageData);
        } catch (error) {
            console.error('Błąd podczas ładowania danych obrazów:', error);
            // Wyświetl komunikat o błędzie i kontynuuj bez danych obrazów
            this.imageData = [];
        }
    }

    // Metoda parsująca dane CSV
// Alternatywne rozwiązanie - poprawiona metoda parseImageCSV
    parseImageCSV(csvData) {
        const lines = csvData.trim().split('\n');
        const headers = lines[0].split(',').map(header => header.trim()); // Usunięcie białych znaków z nagłówków

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].split(',');
            const data = {};

            // Specjalne traktowanie czwartej kolumny (opis), który może zawierać przecinki
            if (line.length > 4) {
                data[headers[0]] = line[0];
                data[headers[1]] = parseInt(line[1]);
                data[headers[2]] = parseInt(line[2]);
                // Łączymy resztę linii jako opis (może zawierać przecinki)
                data[headers[3]] = line.slice(3).join(',');
            } else {
                for (let j = 0; j < headers.length; j++) {
                    if (j === 1 || j === 2) {
                        data[headers[j]] = parseInt(line[j]);
                    } else {
                        data[headers[j]] = line[j];
                    }
                }
            }

            this.imageData.push(data);
        }
    }

    // Metoda uruchamiająca grę
    startGame() {
        document.querySelector('.start-screen').style.display = 'none';
        this.loadScene('intro');
    }

    // Metoda ładująca scenę
    loadScene(sceneId) {
        // Zapamiętaj odwiedzoną scenę
        if (!this.gameState.visitedScenes.includes(sceneId)) {
            this.gameState.visitedScenes.push(sceneId);
        }

        // Pobierz dane sceny
        const scene = scenesData[sceneId];
        if (!scene) {
            console.error(`Scena o ID ${sceneId} nie została znaleziona.`);
            return;
        }

        // Ustaw aktualną scenę
        this.currentScene = scene;

        // Płynnie przewiń do góry kontenera gry
        const gameContainer = document.querySelector('.game-container');
        gameContainer.scrollTo({ top: 0, behavior: 'smooth' });

        // Stwórz element nowej sceny, ale nie dodawaj go jeszcze
        const newSceneElement = document.createElement('div');
        newSceneElement.className = 'scene';
        newSceneElement.style.display = 'block';
        newSceneElement.style.opacity = '0';
        newSceneElement.style.transform = 'translateY(20px)';
        newSceneElement.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

        // Dodaj tekst sceny
        const text = document.createElement('div');
        text.className = 'scene-text';
        text.innerHTML = scene.text;
        newSceneElement.appendChild(text);

        // Dodaj obrazek (jeśli jest)
        if (scene.image) {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'scene-image-container';

            const imageData = this.getImageData(scene.image);

            const img = document.createElement('img');
            img.className = 'scene-image';
            img.src = `img/${scene.image}`;

            if (imageData) {
                img.alt = imageData.description;
                img.width = imageData.width;
                img.height = imageData.height;
                img.style.objectFit = 'cover';
            }

            // Obsługa błędu ładowania obrazka
            img.onerror = () => {
                if (imageData) {
                    // Utwórz placeholder
                    const placeholder = document.createElement('div');
                    placeholder.className = 'image-placeholder';
                    placeholder.style.width = `${imageData.width}px`;
                    placeholder.style.height = `${imageData.height}px`;
                    placeholder.style.maxWidth = '100%';
                    placeholder.innerHTML = `
                        <div>
                            <p style="margin-bottom: 0.5rem;"><b>${scene.image}</b></p>
                            <p>${imageData.description}</p>
                        </div>
                    `;
                    imageContainer.innerHTML = '';
                    imageContainer.appendChild(placeholder);
                } else {
                    imageContainer.innerHTML = `<div class="image-placeholder">Brak obrazka: ${scene.image}</div>`;
                }
            };

            imageContainer.appendChild(img);
            newSceneElement.appendChild(imageContainer);
        }

        // Dodaj cytat poetycki (jeśli scena ma cytat)
        if (scene.quote) {
            const quoteContainer = document.createElement('div');
            quoteContainer.className = 'poetic-text';
            quoteContainer.textContent = scene.quote;

            const saveBtn = document.createElement('button');
            saveBtn.className = 'save-quote-btn';
            saveBtn.innerHTML = '❤';
            saveBtn.title = 'Zapisz do pamiętnika';
            saveBtn.addEventListener('click', () => this.saveQuote(scene.quote));

            quoteContainer.appendChild(saveBtn);
            newSceneElement.appendChild(quoteContainer);
        }

        // Dodaj wybory
        if (scene.choices && scene.choices.length > 0) {
            const choicesContainer = document.createElement('div');
            choicesContainer.className = 'choices';

            scene.choices.forEach(choice => {
                // Sprawdź warunki wyboru (jeśli są)
                if (choice.condition && !this.checkCondition(choice.condition)) {
                    return; // Pomiń wybór, który nie spełnia warunku
                }

                const button = document.createElement('button');
                button.className = 'choice-btn';
                button.textContent = choice.text;
                button.addEventListener('click', () => {
                    // Zastosuj efekty wyboru
                    if (choice.effects) {
                        this.applyEffects(choice.effects);
                    }

                    // Dodaj efekt motyla po wyborze
                    this.addChoiceButterfly(button);

                    // Załaduj następną scenę
                    setTimeout(() => {
                        this.loadScene(choice.nextScene);
                    }, 300); // Małe opóźnienie by zobaczyć efekt motyla
                });

                choicesContainer.appendChild(button);
            });

            newSceneElement.appendChild(choicesContainer);
        }

        // Jeśli jest już jakaś scena, wyciemnij ją najpierw
        if (this.gameContent.children.length > 0) {
            const oldScene = this.gameContent.children[0];
            oldScene.style.opacity = '0';
            oldScene.style.transform = 'translateY(-20px)';

            // Po wygaśnięciu starej sceny, pokaż nową
            setTimeout(() => {
                this.gameContent.innerHTML = '';
                this.gameContent.appendChild(newSceneElement);

                // Pokaż nową scenę
                setTimeout(() => {
                    newSceneElement.style.opacity = '1';
                    newSceneElement.style.transform = 'translateY(0)';
                    newSceneElement.classList.add('fade-in');
                }, 50);
            }, 300);
        } else {
            // Nie ma istniejącej sceny, po prostu dodaj nową
            this.gameContent.appendChild(newSceneElement);

            // Pokaż nową scenę
            setTimeout(() => {
                newSceneElement.style.opacity = '1';
                newSceneElement.style.transform = 'translateY(0)';
                newSceneElement.classList.add('fade-in');
            }, 50);
        }
    }

    // Metoda pobierająca dane obrazu z CSV
// Poprawiona metoda getImageData w klasie StoryGame
    getImageData(filename) {
        const imageData = this.imageData.find(img => img.filename === filename);
        if (!imageData) {
            console.warn(`Nie znaleziono danych dla obrazu: ${filename}`);
            // Zwróć domyślne dane
            return {
                filename: filename,
                width: 600,
                height: 400,
                description: `Obraz: ${filename}`
            };
        }

        // Utwórz czystą kopię danych z poprawnym kluczem opisu
        return {
            filename: imageData.filename,
            width: imageData.width,
            height: imageData.height,
            description: imageData["description "] || imageData.description || `Obraz: ${filename}` // Obsługa obu wariantów klucza
        };
    }

    // Metoda sprawdzająca warunek
    checkCondition(condition) {
        // Przykład: "emotions.hope > 3"
        try {
            const parts = condition.split(' ');
            const path = parts[0].split('.');
            const operator = parts[1];
            const value = parseFloat(parts[2]);

            let currentObj = this.gameState;
            for (const part of path) {
                currentObj = currentObj[part];
            }

            switch (operator) {
                case '>': return currentObj > value;
                case '<': return currentObj < value;
                case '>=': return currentObj >= value;
                case '<=': return currentObj <= value;
                case '==': return currentObj == value;
                case '!=': return currentObj != value;
                default: return false;
            }
        } catch (error) {
            console.error('Błąd podczas sprawdzania warunku:', error);
            return false;
        }
    }

    // Metoda aplikująca efekty wyboru
    applyEffects(effects) {
        Object.entries(effects).forEach(([key, value]) => {
            const path = key.split('.');
            let currentObj = this.gameState;

            // Przejdź przez ścieżkę aby dostać się do właściwości
            for (let i = 0; i < path.length - 1; i++) {
                const part = path[i];
                if (!currentObj[part]) {
                    currentObj[part] = {};
                }
                currentObj = currentObj[part];
            }

            // Zaktualizuj wartość
            const lastPart = path[path.length - 1];
            if (typeof value === 'string' && value.startsWith('+')) {
                currentObj[lastPart] += parseFloat(value.substring(1));

                // Pokaż animację dla zmian emocjonalnych
                if (path[0] === 'emotions') {
                    this.showEmotionEffect(lastPart, value);
                }
            } else if (typeof value === 'string' && value.startsWith('-')) {
                currentObj[lastPart] -= parseFloat(value.substring(1));

                // Pokaż animację dla zmian emocjonalnych
                if (path[0] === 'emotions') {
                    this.showEmotionEffect(lastPart, value);
                }
            } else {
                currentObj[lastPart] = value;

                // Jeśli jest to bezpośrednie ustawienie emocji
                if (path[0] === 'emotions' && typeof value === 'number') {
                    this.showEmotionEffect(lastPart, value);
                }
            }
        });

        // Zaktualizuj wskaźnik emocji
        this.updateEmotionIndicator();

        console.log('Stan gry po efektach:', this.gameState);
    }

    // Dodaj metodę do aktualizacji wskaźnika
    updateEmotionIndicator() {
        const indicator = document.getElementById('emotion-indicator');
        if (!indicator) {
            this.createEmotionIndicator();
            return;
        }

        // Zaktualizuj wartości dla każdej emocji
        ['melancholy', 'hope', 'love', 'courage'].forEach(emotion => {
            const valueElement = document.getElementById(`emotion-value-${emotion}`);
            const barElement = document.getElementById(`emotion-bar-${emotion}`);

            if (valueElement && barElement) {
                const value = this.gameState.emotions[emotion] || 0;
                valueElement.textContent = value;

                // Ustaw szerokość paska (maksymalnie 10)
                const barWidth = Math.min(100, (value / 10) * 100);
                barElement.style.width = `${barWidth}%`;

                // Dodaj animację przy zmianie
                barElement.style.transition = 'width 0.8s ease';
                setTimeout(() => {
                    barElement.style.transition = 'width 0.3s ease';
                }, 800);
            }
        });
    }

    // Dodaj nową metodę showEmotionEffect
    showEmotionEffect(emotionType, value) {
        // Parsowanie wartości by obsłużyć format "+1" lub "-1"
        const numValue = typeof value === 'string' ?
            parseFloat(value.replace(/^(\+|\-)/, '')) :
            value;
        const isPositive = typeof value === 'string' ?
            !value.startsWith('-') :
            value >= 0;

        // Zdefiniuj kolory i ikony dla różnych emocji
        const emotions = {
            'melancholy': { color: '#94718a', icon: '☁️', name: 'melancholia' },
            'hope': { color: '#7fb1b3', icon: '✨', name: 'nadzieja' },
            'love': { color: '#e6c0d0', icon: '❤️', name: 'miłość' },
            'courage': { color: '#dfa75a', icon: '🦋', name: 'odwaga' }
        };

        const emotion = emotions[emotionType] || { color: '#b58ea6', icon: '✨', name: emotionType };

        // Stwórz element efektu emocjonalnego
        const effectElement = document.createElement('div');
        effectElement.className = 'emotion-effect';
        effectElement.innerHTML = `
            <span class="emotion-icon">${emotion.icon}</span>
            <span class="emotion-text">${isPositive ? '+' : '-'}${numValue} ${emotion.name}</span>
        `;

        // Dodaj style jeśli jeszcze nie istnieją
        if (!document.getElementById('emotion-effect-styles')) {
            const style = document.createElement('style');
            style.id = 'emotion-effect-styles';
            style.textContent = `
                .emotion-effect {
                    position: fixed;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    background-color: rgba(255, 255, 255, 0.9);
                    border-radius: 20px;
                    padding: 8px 15px;
                    box-shadow: 0 3px 15px rgba(0,0,0,0.1);
                    font-family: 'Playfair Display', serif;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    z-index: 1000;
                    opacity: 0;
                    pointer-events: none;
                    animation: emotion-float 2s forwards;
                }
                
                .emotion-icon {
                    font-size: 1.2rem;
                }
                
                .emotion-text {
                    font-size: 1rem;
                    color: var(--emotion-color);
                    font-weight: 500;
                }
                
                @keyframes emotion-float {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, 20px);
                    }
                    20% {
                        opacity: 1;
                        transform: translate(-50%, -10px);
                    }
                    80% {
                        opacity: 1;
                        transform: translate(-50%, -30px);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -50px);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Ustaw kolor na podstawie emocji
        effectElement.style.setProperty('--emotion-color', emotion.color);

        // Dodaj do body
        document.body.appendChild(effectElement);

        // Usuń po zakończeniu animacji
        setTimeout(() => {
            document.body.removeChild(effectElement);
        }, 2000);
    }

    // Dodaj metodę tworzącą wskaźnik emocji
    createEmotionIndicator() {
        // Jeśli wskaźnik już istnieje, usuń go
        const existingIndicator = document.getElementById('emotion-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Stwórz kontener wskaźnika
        const indicator = document.createElement('div');
        indicator.id = 'emotion-indicator';
        indicator.className = 'emotion-indicator';

        // Dodaj style jeśli jeszcze nie istnieją
        if (!document.getElementById('emotion-indicator-styles')) {
            const style = document.createElement('style');
            style.id = 'emotion-indicator-styles';
            style.textContent = `
                .emotion-indicator {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background-color: rgba(255, 255, 255, 0.9);
                    border-radius: 12px;
                    padding: 10px;
                    box-shadow: 0 3px 15px rgba(0,0,0,0.08);
                    font-family: 'Montserrat', sans-serif;
                    z-index: 100;
                    transition: all 0.3s ease;
                    opacity: 0;
                    transform: translateY(-10px);
                    max-width: 150px;
                }
                
                .emotion-indicator:hover {
                    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                    transform: translateY(0) scale(1.05);
                }
                
                .emotion-indicator.visible {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                .emotion-indicator h3 {
                    font-family: 'Playfair Display', serif;
                    color: var(--header-color);
                    font-size: 1rem;
                    margin: 0 0 8px 0;
                    text-align: center;
                    font-weight: normal;
                }
                
                .emotion-item {
                    display: flex;
                    align-items: center;
                    margin-bottom: 5px;
                    font-size: 0.85rem;
                }
                
                .emotion-icon {
                    width: 18px;
                    margin-right: 8px;
                    text-align: center;
                }
                
                .emotion-name {
                    flex-grow: 1;
                    color: var(--dark-accent);
                }
                
                .emotion-value {
                    font-weight: 500;
                    min-width: 25px;
                    text-align: right;
                }
                
                .emotion-bar-bg {
                    position: relative;
                    height: 3px;
                    background-color: rgba(0,0,0,0.05);
                    border-radius: 2px;
                    margin-top: 3px;
                    width: 100%;
                    overflow: hidden;
                }
                
                .emotion-bar {
                    position: absolute;
                    top: 0;
                    left: 0;
                    height: 100%;
                    border-radius: 2px;
                    transition: width 0.5s ease;
                }
                
                .toggle-indicator {
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background-color: var(--light-accent);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.7rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .toggle-indicator:hover {
                    background-color: var(--accent-color);
                    color: white;
                }
                
                .emotion-indicator.collapsed {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    padding: 0;
                    overflow: hidden;
                }
                
                .emotion-indicator.collapsed .toggle-indicator {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    top: 0;
                    right: 0;
                    font-size: 1.2rem;
                }
                
                .emotion-indicator.collapsed h3,
                .emotion-indicator.collapsed .emotion-item {
                    display: none;
                }
            `;
            document.head.appendChild(style);
        }

        // Dodaj tytuł
        const title = document.createElement('h3');
        title.textContent = 'Twoje emocje';
        indicator.appendChild(title);

        // Definicje emocji
        const emotions = [
            { name: 'melancholy', label: 'Melancholia', icon: '☁️', color: '#94718a' },
            { name: 'hope', label: 'Nadzieja', icon: '✨', color: '#7fb1b3' },
            { name: 'love', label: 'Miłość', icon: '❤️', color: '#e6c0d0' },
            { name: 'courage', label: 'Odwaga', icon: '🦋', color: '#dfa75a' }
        ];

        // Dodaj wskaźniki dla każdej emocji
        emotions.forEach(emotion => {
            const emotionItem = document.createElement('div');
            emotionItem.className = 'emotion-item';

            const icon = document.createElement('span');
            icon.className = 'emotion-icon';
            icon.textContent = emotion.icon;

            const name = document.createElement('span');
            name.className = 'emotion-name';
            name.textContent = emotion.label;

            const value = document.createElement('span');
            value.className = 'emotion-value';
            value.id = `emotion-value-${emotion.name}`;
            value.textContent = this.gameState.emotions[emotion.name] || 0;

            const barBg = document.createElement('div');
            barBg.className = 'emotion-bar-bg';

            const bar = document.createElement('div');
            bar.className = 'emotion-bar';
            bar.id = `emotion-bar-${emotion.name}`;
            bar.style.backgroundColor = emotion.color;
            // Ustaw szerokość paska na podstawie wartości (maksymalnie 10)
            const barWidth = Math.min(100, ((this.gameState.emotions[emotion.name] || 0) / 10) * 100);
            bar.style.width = `${barWidth}%`;

            barBg.appendChild(bar);
            emotionItem.appendChild(icon);
            emotionItem.appendChild(name);
            emotionItem.appendChild(value);
            emotionItem.appendChild(barBg);

            indicator.appendChild(emotionItem);
        });

        // Dodaj przycisk do zwijania/rozwijania
        const toggleButton = document.createElement('div');
        toggleButton.className = 'toggle-indicator';

        // ZMIANA: Domyślnie zwinięte - ustawienie początkowego stanu
        let isCollapsed = true;
        toggleButton.innerHTML = '❤';
        indicator.classList.add('collapsed');

        // Obsługa kliknięcia
        toggleButton.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            if (isCollapsed) {
                indicator.classList.add('collapsed');
                toggleButton.innerHTML = '❤';
            } else {
                indicator.classList.remove('collapsed');
                toggleButton.innerHTML = '×';
            }
        });

        indicator.appendChild(toggleButton);
        document.body.appendChild(indicator);

        // Pokaż z opóźnieniem dla animacji
        setTimeout(() => {
            indicator.classList.add('visible');
        }, 300);
    }

    // Dodaj metodę dodającą tło z płatkami kwiatów
    addBackgroundPetals() {
        // Stwórz kontener na płatki
        const petalsContainer = document.createElement('div');
        petalsContainer.className = 'background-petals';
        document.body.appendChild(petalsContainer);

        // Liczba płatków
        const petalCount = 15;

        // Kolory płatków
        const petalColors = [
            'rgba(255, 183, 213, 0.3)',
            'rgba(255, 204, 224, 0.3)',
            'rgba(255, 218, 233, 0.3)',
            'rgba(255, 229, 241, 0.3)',
            'rgba(230, 192, 208, 0.3)'
        ];

        // Stwórz płatki
        for (let i = 0; i < petalCount; i++) {
            const petal = document.createElement('div');
            petal.className = 'petal';

            // Losowy rozmiar
            const size = 10 + Math.random() * 15;
            petal.style.width = `${size}px`;
            petal.style.height = `${size}px`;

            // Losowa pozycja początkowa
            const startPosX = Math.random() * window.innerWidth;
            const startPosY = -50 - Math.random() * 100;
            petal.style.left = `${startPosX}px`;
            petal.style.top = `${startPosY}px`;

            // Losowy kolor
            petal.style.backgroundColor = petalColors[Math.floor(Math.random() * petalColors.length)];

            // Losowe opóźnienie
            petal.style.animationDelay = `${Math.random() * 10}s`;

            // Losowa prędkość
            const duration = 15 + Math.random() * 20;
            petal.style.animationDuration = `${duration}s`;

            // Losowy kierunek i rotacja
            const direction = Math.random() > 0.5 ? 1 : -1;
            petal.style.transform = `rotate(${Math.random() * 360}deg) scale(${0.8 + Math.random() * 0.5})`;

            petalsContainer.appendChild(petal);
        }
    }

    // Metoda zapisująca cytat
    saveQuote(quote) {
        const date = new Date().toLocaleDateString('pl-PL');
        this.savedQuotes.push({ text: quote, date });

        localStorage.setItem('savedQuotes', JSON.stringify(this.savedQuotes));

        // Zamieniamy alert na delikatną animację/powiadomienie
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.bottom = '70px';
        notification.style.left = '20px';
        notification.style.backgroundColor = 'rgba(255,255,255,0.9)';
        notification.style.color = 'var(--dark-accent)';
        notification.style.padding = '10px 15px';
        notification.style.borderRadius = '20px';
        notification.style.boxShadow = '0 3px 10px rgba(0,0,0,0.1)';
        notification.style.transition = 'all 0.3s ease';
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        notification.style.zIndex = '150';
        notification.innerHTML = 'Cytat został zapisany w pamiętniku ❤';

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(20px)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);

        this.updateQuotesDisplay();
    }

    // Metoda ładująca zapisane cytaty
    loadSavedQuotes() {
        const saved = localStorage.getItem('savedQuotes');
        if (saved) {
            this.savedQuotes = JSON.parse(saved);
            this.updateQuotesDisplay();
        }
    }

    // Metoda aktualizująca wyświetlanie cytatów
    updateQuotesDisplay() {
        if (this.savedQuotes.length === 0) {
            this.quotesContainer.innerHTML = '<p class="no-quotes">Twój pamiętnik jest jeszcze pusty. Zapisz swoje ulubione cytaty podczas gry.</p>';
            return;
        }

        const list = document.createElement('ul');
        list.className = 'quotes-list';

        this.savedQuotes.forEach((quote, index) => {
            const item = document.createElement('li');
            item.className = 'quote-item';

            item.innerHTML = `
                <p class="quote-text">${quote.text}</p>
                <p class="quote-date">${quote.date}</p>
            `;

            list.appendChild(item);
        });

        this.quotesContainer.innerHTML = '';
        this.quotesContainer.appendChild(list);
    }

    // Metoda otwierająca pamiętnik
    openDiary() {
        this.diaryPanel.style.display = 'flex';
        setTimeout(() => {
            this.diaryPanel.style.opacity = '1';
        }, 10);

        // Dodaj efekt motylków do pamiętnika
        this.addDiaryButterflies();
    }

    // Dodaj efekt motylków do pamiętnika
    addDiaryButterflies() {
        const content = this.diaryPanel.querySelector('.diary-content');
        const butterflyCount = Math.min(this.savedQuotes.length, 5);

        // Jeśli nie ma cytatów, nie dodawaj motyli
        if (butterflyCount === 0) return;

        for (let i = 0; i < butterflyCount; i++) {
            const butterfly = document.createElement('div');
            butterfly.className = 'diary-butterfly';

            const size = 20 + Math.random() * 15;
            butterfly.style.width = `${size}px`;
            butterfly.style.height = `${size}px`;

            // Losowe kolory
            const colors = ['#ffb7d5', '#ffc2e2', '#ffcce0', '#ffd9e9', '#ffe5f1'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            butterfly.innerHTML = `
                <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                    <g class="wings" style="animation: flutterWings 0.3s alternate infinite ease-in-out;">
                        <path d="M25,10 C30,5 40,0 45,15 C45,30 30,35 25,25 C20,35 5,30 5,15 C5,0 20,5 25,10 Z" fill="${color}" opacity="0.9"/>
                        <path d="M25,25 C30,30 40,35 45,45 C45,50 30,55 25,45 C20,55 5,50 5,45 C5,35 20,30 25,25 Z" fill="${color}" opacity="0.7"/>
                        <path d="M25,10 L25,45" stroke="#fff" stroke-width="0.8" stroke-dasharray="1,1"/>
                        <ellipse cx="25" cy="25" rx="2" ry="4" fill="#fff" opacity="0.5"/>
                    </g>
                </svg>
            `;

            // Losowe pozycje i animacje
            const randomPos = Math.random() * 80;
            butterfly.style.top = `${randomPos}%`;
            butterfly.style.right = `${5 + Math.random() * 15}%`;
            butterfly.style.animation = `diaryButterflyFloat ${3 + Math.random() * 2}s infinite alternate ease-in-out`;
            butterfly.style.animationDelay = `${Math.random() * 2}s`;

            // Dodaj style dla animacji, jeśli nie zostały już dodane
            if (!document.getElementById('butterfly-styles')) {
                const style = document.createElement('style');
                style.id = 'butterfly-styles';
                style.textContent = `
                    .diary-butterfly {
                        position: absolute;
                        pointer-events: none;
                        z-index: 10;
                        opacity: 0.7;
                    }
                    
                    @keyframes diaryButterflyFloat {
                        0% {
                            transform: translateY(0) rotate(0deg);
                        }
                        33% {
                            transform: translateY(-10px) rotate(5deg);
                        }
                        66% {
                            transform: translateY(-15px) rotate(-3deg);
                        }
                        100% {
                            transform: translateY(-20px) rotate(2deg);
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            content.appendChild(butterfly);

            // Ustawienie timeoutu do usunięcia motyla przy zamknięciu
            butterfly.dataset.timeout = setTimeout(() => {
                if (content.contains(butterfly)) {
                    content.removeChild(butterfly);
                }
            }, 10000);
        }
    }

    // Metoda zamykająca pamiętnik
    closeDiary() {
        // Usuń wszystkie motyle
        const butterflies = document.querySelectorAll('.diary-butterfly');
        butterflies.forEach(butterfly => {
            clearTimeout(parseInt(butterfly.dataset.timeout));
            butterfly.parentNode.removeChild(butterfly);
        });

        this.diaryPanel.style.opacity = '0';
        setTimeout(() => {
            this.diaryPanel.style.display = 'none';
        }, 300);
    }

    // Metoda włączająca/wyłączająca muzykę
    toggleMusic() {
        if (this.musicPlaying) {
            this.backgroundMusic.pause();
            this.musicPlaying = false;
            this.updateMusicIcon(false);
        } else {
            const playPromise = this.backgroundMusic.play();

            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.musicPlaying = true;
                    this.updateMusicIcon(true);
                })
                    .catch(error => {
                        console.log('Błąd odtwarzania:', error);
                        this.musicPlaying = false;
                        this.updateMusicIcon(false);

                        // Pokaż informację o konieczności interakcji
                        this.showMusicInfo();
                    });
            }
        }

        // Dodaj efekt dźwiękowy
        this.addSoundEffect();
    }

    // Informacja o konieczności interakcji dla muzyki
    showMusicInfo() {
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.bottom = '70px';
        notification.style.right = '20px';
        notification.style.backgroundColor = 'rgba(255,255,255,0.9)';
        notification.style.color = 'var(--dark-accent)';
        notification.style.padding = '10px 15px';
        notification.style.borderRadius = '20px';
        notification.style.boxShadow = '0 3px 10px rgba(0,0,0,0.1)';
        notification.style.transition = 'all 0.3s ease';
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        notification.style.zIndex = '150';
        notification.style.maxWidth = '250px';
        notification.style.textAlign = 'center';
        notification.style.fontSize = '0.9rem';
        notification.innerHTML = 'Muzyka wymaga interakcji użytkownika. Kliknij ponownie ikonę dźwięku.';

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(20px)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 4000);
    }

    // Dodaj efekt wizualny przy włączaniu/wyłączaniu dźwięku
    addSoundEffect() {
        const soundPanel = document.querySelector('.sound-panel');

        // Stwórz efekt fali dźwiękowej
        const soundWave = document.createElement('div');
        soundWave.className = 'sound-wave';

        // Dodaj style dla efektu dźwięku
        const style = document.createElement('style');
        style.textContent = `
            .sound-wave {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(255, 183, 213, 0.2);
                transform: translate(-50%, -50%) scale(0);
                pointer-events: none;
                z-index: -1;
                animation: soundWave 1s forwards;
            }
            
            @keyframes soundWave {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0.7;
                }
                100% {
                    transform: translate(-50%, -50%) scale(3);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        soundPanel.appendChild(soundWave);

        // Usuń element po zakończeniu animacji
        setTimeout(() => {
            soundPanel.removeChild(soundWave);
        }, 1000);
    }

    // Dodaj nową, rozszerzoną metodę dodającą motylki po wyborze
    addChoiceButterfly(buttonElement) {
        // Liczba motyli
        const butterflyCount = 3 + Math.floor(Math.random() * 3); // 3-5 motyli

        // Kolory motyli - pastelowe odcienie dopasowane do stylu aplikacji
        const colors = [
            '#ffb7d5', '#ffc2e2', '#ffcce0', '#ffd9e9',
            '#ffe5f1', '#ffdca6', '#c5a3ff', '#b58ea6'
        ];

        // Dodaj style jeśli jeszcze nie istnieją
        if (!document.getElementById('enhanced-butterfly-styles')) {
            const style = document.createElement('style');
            style.id = 'enhanced-butterfly-styles';
            style.textContent = `
                .choice-butterfly {
                    position: absolute;
                    pointer-events: none;
                    z-index: 1000;
                    opacity: 0;
                }
                
                @keyframes flutterWings {
                    0% { transform: scaleX(1); }
                    50% { transform: scaleX(0.8); }
                    100% { transform: scaleX(1); }
                }
                
                @keyframes flyAwayEnhanced {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
                    }
                    15% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1) rotate(5deg);
                    }
                    30% {
                        transform: translate(var(--fly-x-30), var(--fly-y-30)) scale(0.9) rotate(var(--rotate-30));
                    }
                    60% {
                        transform: translate(var(--fly-x-60), var(--fly-y-60)) scale(0.8) rotate(var(--rotate-60));
                    }
                    90% {
                        opacity: 0.7;
                        transform: translate(var(--fly-x-90), var(--fly-y-90)) scale(0.6) rotate(var(--rotate-90));
                    }
                    100% {
                        opacity: 0;
                        transform: translate(var(--fly-x-100), var(--fly-y-100)) scale(0.4) rotate(var(--rotate-100));
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Stwórz kilka motyli z różnymi ścieżkami lotu
        for (let i = 0; i < butterflyCount; i++) {
            // Stwórz motyla
            const butterfly = document.createElement('div');
            butterfly.className = 'choice-butterfly';

            // Losowy rozmiar
            const size = 25 + Math.random() * 15;
            butterfly.style.width = `${size}px`;
            butterfly.style.height = `${size}px`;

            // Losowy kolor
            const color = colors[Math.floor(Math.random() * colors.length)];

            // Pozycja początkowa (na przycisku)
            const rect = buttonElement.getBoundingClientRect();
            butterfly.style.left = `${rect.left + rect.width / 2}px`;
            butterfly.style.top = `${rect.top + rect.height / 2}px`;

            // Unikalna ścieżka lotu dla każdego motyla
            // Generujemy losowe wartości dla każdego etapu animacji
            const flyX30 = (Math.random() > 0.5 ? '' : '-') + (10 + Math.random() * 20) + 'px';
            const flyY30 = '-' + (10 + Math.random() * 20) + 'px';
            const rotate30 = (Math.random() * 20 - 10) + 'deg';

            const flyX60 = (Math.random() > 0.5 ? '' : '-') + (30 + Math.random() * 40) + 'px';
            const flyY60 = '-' + (30 + Math.random() * 50) + 'px';
            const rotate60 = (Math.random() * 30 - 15) + 'deg';

            const flyX90 = (Math.random() > 0.5 ? '' : '-') + (50 + Math.random() * 80) + 'px';
            const flyY90 = '-' + (70 + Math.random() * 100) + 'px';
            const rotate90 = (Math.random() * 40 - 20) + 'deg';

            const flyX100 = (Math.random() > 0.5 ? '' : '-') + (80 + Math.random() * 120) + 'px';
            const flyY100 = '-' + (100 + Math.random() * 150) + 'px';
            const rotate100 = (Math.random() * 60 - 30) + 'deg';

            // Ustaw niestandardowe właściwości CSS dla animacji
            butterfly.style.setProperty('--fly-x-30', flyX30);
            butterfly.style.setProperty('--fly-y-30', flyY30);
            butterfly.style.setProperty('--rotate-30', rotate30);

            butterfly.style.setProperty('--fly-x-60', flyX60);
            butterfly.style.setProperty('--fly-y-60', flyY60);
            butterfly.style.setProperty('--rotate-60', rotate60);

            butterfly.style.setProperty('--fly-x-90', flyX90);
            butterfly.style.setProperty('--fly-y-90', flyY90);
            butterfly.style.setProperty('--rotate-90', rotate90);

            butterfly.style.setProperty('--fly-x-100', flyX100);
            butterfly.style.setProperty('--fly-y-100', flyY100);
            butterfly.style.setProperty('--rotate-100', rotate100);

            // Zawartość motyla - ulepszone SVG
            butterfly.innerHTML = `
                <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <radialGradient id="wing-gradient-${i}" cx="50%" cy="50%" r="70%" fx="30%" fy="30%">
                            <stop offset="0%" stop-color="#fff" stop-opacity="0.9" />
                            <stop offset="70%" stop-color="${color}" stop-opacity="0.9" />
                            <stop offset="100%" stop-color="${color}" stop-opacity="0.7" />
                        </radialGradient>
                    </defs>
                    <g class="wings" style="animation: flutterWings ${0.15 + Math.random() * 0.1}s alternate infinite ease-in-out;">
                        <path d="M25,10 C30,5 40,0 45,15 C45,30 30,35 25,25 C20,35 5,30 5,15 C5,0 20,5 25,10 Z" fill="url(#wing-gradient-${i})" />
                        <path d="M25,25 C30,30 40,35 45,45 C45,50 30,55 25,45 C20,55 5,50 5,45 C5,35 20,30 25,25 Z" fill="url(#wing-gradient-${i})" opacity="0.8" />
                        <path d="M25,10 L25,45" stroke="#fff" stroke-width="0.8" stroke-dasharray="1,1" />
                        <ellipse cx="25" cy="25" rx="2" ry="4" fill="#fff" opacity="0.7" />
                    </g>
                </svg>
            `;

            // Dodaj do body
            document.body.appendChild(butterfly);

            // Animacja z opóźnieniem dla każdego motyla
            setTimeout(() => {
                butterfly.style.animation = `flyAwayEnhanced ${1.5 + Math.random() * 0.5}s forwards`;
            }, i * 100); // Opóźnienie zależne od indeksu

            // Usuń po zakończeniu animacji
            setTimeout(() => {
                if (document.body.contains(butterfly)) {
                    document.body.removeChild(butterfly);
                }
            }, 2000 + i * 100);
        }
    }
}