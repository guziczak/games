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

        // Wyczyść zawartość
        this.gameContent.innerHTML = '';

        // Utwórz element sceny
        const sceneElement = document.createElement('div');
        sceneElement.className = 'scene fade-in';
        sceneElement.style.display = 'block';

        // Dodaj tekst sceny
        const text = document.createElement('div');
        text.className = 'scene-text';
        text.innerHTML = scene.text;
        sceneElement.appendChild(text);

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
            sceneElement.appendChild(imageContainer);
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
            sceneElement.appendChild(quoteContainer);
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
                    // Załaduj następną scenę
                    this.loadScene(choice.nextScene);

                    // Dodaj efekt motyla po wyborze
                    this.addChoiceButterfly(button);
                });

                choicesContainer.appendChild(button);
            });

            sceneElement.appendChild(choicesContainer);
        }

        // Dodaj scenę do kontenera
        this.gameContent.appendChild(sceneElement);

        // Przewiń do góry (tylko na większych ekranach, na mobilnych zostawiamy jak jest)
        if (window.innerWidth > 768) {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }

    // Dodaj efekt motyla po dokonaniu wyboru
    addChoiceButterfly(buttonElement) {
        // Stwórz motyla
        const butterfly = document.createElement('div');
        butterfly.className = 'choice-butterfly';

        // Style dla motyla
        const style = document.createElement('style');
        style.textContent = `
            .choice-butterfly {
                position: absolute;
                width: 30px;
                height: 30px;
                pointer-events: none;
                z-index: 1000;
            }
            
            @keyframes flyAway {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.2);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                40% {
                    transform: translate(${Math.random() > 0.5 ? '' : '-'}${20 + Math.random() * 30}px, -${30 + Math.random() * 40}px) scale(0.9) rotate(${Math.random() * 10 - 5}deg);
                }
                70% {
                    transform: translate(${Math.random() > 0.5 ? '' : '-'}${40 + Math.random() * 60}px, -${60 + Math.random() * 80}px) scale(0.7) rotate(${Math.random() * 20 - 10}deg);
                }
                100% {
                    opacity: 0;
                    transform: translate(${Math.random() > 0.5 ? '' : '-'}${80 + Math.random() * 100}px, -${100 + Math.random() * 150}px) scale(0.2) rotate(${Math.random() * 30 - 15}deg);
                }
            }
        `;
        document.head.appendChild(style);

        // Pozycja motyla (na klikniętym przycisku)
        const rect = buttonElement.getBoundingClientRect();
        butterfly.style.left = `${rect.left + rect.width / 2}px`;
        butterfly.style.top = `${rect.top + rect.height / 2}px`;

        // Zawartość motyla - ulepszone SVG
        butterfly.innerHTML = `
            <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <g class="wings" style="animation: flutterWings 0.2s alternate infinite ease-in-out;">
                    <path d="M25,10 C30,5 40,0 45,15 C45,30 30,35 25,25 C20,35 5,30 5,15 C5,0 20,5 25,10 Z" fill="#ffb7d5" opacity="0.9"/>
                    <path d="M25,25 C30,30 40,35 45,45 C45,50 30,55 25,45 C20,55 5,50 5,45 C5,35 20,30 25,25 Z" fill="#ffb7d5" opacity="0.7"/>
                    <path d="M25,10 L25,45" stroke="#fff" stroke-width="0.8" stroke-dasharray="1,1"/>
                    <ellipse cx="25" cy="25" rx="2" ry="4" fill="#fff" opacity="0.5"/>
                </g>
            </svg>
        `;

        // Animacja
        butterfly.style.animation = 'flyAway 1.5s forwards';

        // Dodaj do body
        document.body.appendChild(butterfly);

        // Usuń po zakończeniu animacji
        setTimeout(() => {
            document.body.removeChild(butterfly);
        }, 1500);
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

            // Przechodzimy przez ścieżkę, aby dotrzeć do właściwości
            for (let i = 0; i < path.length - 1; i++) {
                const part = path[i];
                if (!currentObj[part]) {
                    currentObj[part] = {};
                }
                currentObj = currentObj[part];
            }

            // Ustawiamy wartość
            const lastPart = path[path.length - 1];
            if (typeof value === 'string' && value.startsWith('+')) {
                // Dodanie wartości (np. "+1")
                currentObj[lastPart] += parseFloat(value.substring(1));
            } else if (typeof value === 'string' && value.startsWith('-')) {
                // Odjęcie wartości (np. "-1")
                currentObj[lastPart] -= parseFloat(value.substring(1));
            } else {
                // Przypisanie wartości
                currentObj[lastPart] = value;
            }
        });

        console.log('Stan gry po efektach:', this.gameState);
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
}