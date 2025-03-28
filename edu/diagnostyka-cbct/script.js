// Ulepszony skrypt dla gry edukacyjnej CBCT w Endodoncji

// Globalne zmienne dla zarządzania stanem gry
let cases = [];
let currentCaseIndex = 0;
let answeredCases = [];
let userScore = 0;
let isLoading = true;

// Elementy DOM
const welcomeScreen = document.getElementById('welcome-screen');
const gameScreen = document.getElementById('game-screen');
const resultsScreen = document.getElementById('results-screen');
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const progressPercent = document.getElementById('progress-percent');
const caseTitle = document.getElementById('case-title');
const caseDescription = document.getElementById('case-description');
const axialSvgContainer = document.getElementById('axial-svg-container');
const sagittalSvgContainer = document.getElementById('sagittal-svg-container');
const coronalSvgContainer = document.getElementById('coronal-svg-container');
const diagnosisOptions = document.getElementById('diagnosis-options');
const findingsOptions = document.getElementById('findings-options');
const treatmentOptions = document.getElementById('treatment-options');
const feedback = document.getElementById('feedback');
const feedbackContent = document.getElementById('feedback-content');
const finalScoreValue = document.getElementById('final-score-value');
const casesSummary = document.getElementById('cases-summary');

// Przyciski
const startGameBtn = document.getElementById('start-game');
const submitAnswerBtn = document.getElementById('submit-answer');
const nextCaseBtn = document.getElementById('next-case');
const restartGameBtn = document.getElementById('restart-game');
const viewButtons = document.querySelectorAll('[data-view]');

// Widoki CBCT
const axialView = document.getElementById('axial-view');
const sagittalView = document.getElementById('sagittal-view');
const coronalView = document.getElementById('coronal-view');

// Inicjalizacja aplikacji po załadowaniu DOM
document.addEventListener('DOMContentLoaded', initializeGame);

// Główna funkcja inicjalizacyjna
async function initializeGame() {
    showLoadingScreen();
    
    try {
        // Wczytanie danych z plików CSV
        console.log('Próba wczytania plików CSV...');
        
        const casesData = await loadCasesFromCSV('cases.csv');
        console.log('Wczytano plik cases.csv:', casesData);
        
        const svgData = await loadSVGsFromCSV('svg_data.csv');
        console.log('Wczytano plik svg_data.csv:', svgData);
        
        if (!casesData || casesData.length === 0) {
            throw new Error('Nie udało się wczytać danych przypadków lub plik jest pusty.');
        }
        
        if (!svgData || svgData.length === 0) {
            throw new Error('Nie udało się wczytać danych SVG lub plik jest pusty.');
        }
        
        // Przetworzenie danych
        console.log('Przetwarzanie danych...');
        cases = processCasesData(casesData, svgData);
        console.log('Przetworzone przypadki:', cases);
        
        if (!cases || cases.length === 0) {
            throw new Error('Nie udało się przetworzyć danych. Przypadki są puste.');
        }
        
        // Przypisanie akcji do przycisków
        attachEventListeners();
        
        // Gotowe do gry
        hideLoadingScreen();
        showWelcomeScreen();
    } catch (error) {
        console.error('Błąd podczas inicjalizacji gry:', error);
        displayErrorMessage('Nie udało się wczytać danych gry: ' + error.message);
    }
}

// ====== ŁADOWANIE DANYCH ======

// Funkcja do wczytywania danych przypadków z CSV
async function loadCasesFromCSV(filename) {
    try {
        console.log(`Rozpoczęcie ładowania pliku ${filename}`);
        const response = await fetch(filename);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log(`Zawartość pliku ${filename} (pierwsze 200 znaków):`, csvText.substring(0, 200));
        
        // Sprawdź czy plik nie jest pusty
        if (!csvText || csvText.trim() === '') {
            throw new Error(`Plik ${filename} jest pusty.`);
        }
        
        return parseCSV(csvText);
    } catch (error) {
        console.error(`Błąd podczas ładowania pliku ${filename}:`, error);
        throw error;
    }
}

// Funkcja do wczytywania danych SVG z CSV
async function loadSVGsFromCSV(filename) {
    return loadCasesFromCSV(filename); // Używamy tej samej funkcji dla obu plików
}

// Ulepszony parser CSV obsługujący formatowanie CSV z cudzysłowami
function parseCSV(csvText) {
    // Usunięcie BOM (Byte Order Mark) jeśli istnieje
    csvText = csvText.replace(/^\uFEFF/, '');
    
    // Normalizacja znaków końca linii (CR, LF, CRLF -> LF)
    csvText = csvText.replace(/\r\n?/g, '\n');
    
    const lines = csvText.split('\n');
    
    // Sprawdź czy są nagłówki
    if (lines.length === 0) {
        console.error('Plik CSV nie zawiera linii.');
        return [];
    }
    
    const headers = lines[0].split(',').map(header => header.trim());
    console.log('Wykryte nagłówki CSV:', headers);
    
    // Jeśli nie ma nagłówków, zwróć pustą tablicę
    if (headers.length === 0) {
        console.error('Plik CSV nie zawiera nagłówków.');
        return [];
    }
    
    // Funkcja do dekodowania pola CSV z uwzględnieniem cudzysłowów
    const decodeField = (field) => {
        // Jeśli pole zaczyna i kończy się cudzysłowem, usuwamy je i zamieniamy podwójne cudzysłowy
        if (field.startsWith('"') && field.endsWith('"')) {
            return field.substring(1, field.length - 1).replace(/""/g, '"');
        }
        return field;
    };
    
    const parsedData = [];
    
    // Przetwarzanie wierszy danych
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;
        
        const entry = {};
        let inQuotes = false;
        let currentField = '';
        let headerIndex = 0;
        
        // Parsuj każdy znak w wierszu
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
                // Sprawdź, czy to podwójny cudzysłów wewnątrz pola
                if (j + 1 < line.length && line[j + 1] === '"') {
                    currentField += '"';
                    j++; // Pomiń następny cudzysłów
                } else {
                    // Przełącz stan "wewnątrz cudzysłowów"
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Koniec pola, dodaj do obiektu i zresetuj
                if (headerIndex < headers.length) {
                    entry[headers[headerIndex]] = decodeField(currentField);
                    headerIndex++;
                    currentField = '';
                }
            } else {
                // Dodaj znak do aktualnego pola
                currentField += char;
            }
        }
        
        // Dodaj ostatnie pole
        if (headerIndex < headers.length) {
            entry[headers[headerIndex]] = decodeField(currentField);
        }
        
        // Uzupełnij brakujące pola
        for (let j = headerIndex + 1; j < headers.length; j++) {
            entry[headers[j]] = '';
        }
        
        // Dodaj wpis do tablicy wyników
        parsedData.push(entry);
        
        // Loguj kilka pierwszych wpisów do debugowania
        if (i <= 2) {
            console.log(`Wiersz ${i}: `, entry);
        }
    }
    
    console.log(`Sparsowano ${parsedData.length} wierszy danych.`);
    return parsedData;
}

// Przetwarzanie danych przypadków
function processCasesData(casesData, svgData) {
    return casesData.map((caseData, index) => {
        console.log(`Przetwarzanie przypadku ${index + 1}, ID: ${caseData.id}`);
        
        // Znajdź odpowiednie SVG dla tego przypadku - zapewniamy konwersję do String
        const caseSVGs = svgData.filter(svg => String(svg.caseId) === String(caseData.id));
        console.log(`Znaleziono ${caseSVGs.length} SVG dla przypadku ID: ${caseData.id}`);
        
        // Przygotuj opcje diagnozy
        const diagnosisOptions = [];
        for (let i = 1; i <= 5; i++) {
            if (caseData[`diagnosis${i}`]) {
                diagnosisOptions.push({
                    id: `d${i}`,
                    text: caseData[`diagnosis${i}`],
                    correct: caseData[`diagnosisCorrect${i}`] === 'true'
                });
            }
        }
        
        // Przygotuj opcje obserwacji
        const findingsOptions = [];
        for (let i = 1; i <= 5; i++) {
            if (caseData[`finding${i}`]) {
                findingsOptions.push({
                    id: `f${i}`,
                    text: caseData[`finding${i}`],
                    correct: caseData[`findingCorrect${i}`] === 'true'
                });
            }
        }
        
        // Przygotuj opcje leczenia
        const treatmentOptions = [];
        for (let i = 1; i <= 5; i++) {
            if (caseData[`treatment${i}`]) {
                treatmentOptions.push({
                    id: `t${i}`,
                    text: caseData[`treatment${i}`],
                    correct: caseData[`treatmentCorrect${i}`] === 'true'
                });
            }
        }
        
        // Znajdź SVG dla każdego widoku
        const axialSvg = caseSVGs.find(svg => svg.viewType === 'axial')?.svgContent || '';
        const sagittalSvg = caseSVGs.find(svg => svg.viewType === 'sagittal')?.svgContent || '';
        const coronalSvg = caseSVGs.find(svg => svg.viewType === 'coronal')?.svgContent || '';
        
        // Log dla pierwszego przypadku - pomoc w debugowaniu
        if (index === 0) {
            console.log('Pierwsze widoki SVG:', {
                axial: axialSvg ? `${axialSvg.substring(0, 50)}...` : 'brak',
                sagittal: sagittalSvg ? `${sagittalSvg.substring(0, 50)}...` : 'brak',
                coronal: coronalSvg ? `${coronalSvg.substring(0, 50)}...` : 'brak'
            });
        }
        
        return {
            id: caseData.id,
            title: caseData.title || `Przypadek ${index + 1}`,
            description: caseData.description || 'Brak opisu przypadku.',
            axialSvg: axialSvg,
            sagittalSvg: sagittalSvg,
            coronalSvg: coronalSvg,
            diagnosisOptions: diagnosisOptions,
            findingsOptions: findingsOptions,
            treatmentOptions: treatmentOptions,
            feedback: caseData.feedback || 'Brak informacji zwrotnej dla tego przypadku.'
        };
    });
}

// ====== ZARZĄDZANIE INTERFEJSEM UŻYTKOWNIKA ======

// Przypisywanie nasłuchiwaczy zdarzeń do elementów UI
function attachEventListeners() {
    // Przyciski nawigacyjne
    startGameBtn.addEventListener('click', startGame);
    submitAnswerBtn.addEventListener('click', checkAnswers);
    nextCaseBtn.addEventListener('click', nextCase);
    restartGameBtn.addEventListener('click', restartGame);
    
    // Przyciski widoku
    viewButtons.forEach(button => {
        button.addEventListener('click', () => {
            setActiveViewButton(button);
            const viewType = button.dataset.view;
            changeView(viewType);
        });
    });
    
    console.log('Przypisano wszystkie zdarzenia do przycisków.');
}

// Zmiana aktywnego przycisku widoku
function setActiveViewButton(button) {
    viewButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
}

// Zmiana widoku CBCT
function changeView(viewType) {
    switch (viewType) {
        case 'all':
            axialView.style.display = 'block';
            sagittalView.style.display = 'block';
            coronalView.style.display = 'block';
            break;
        case 'axial':
            axialView.style.display = 'block';
            sagittalView.style.display = 'none';
            coronalView.style.display = 'none';
            break;
        case 'sagittal':
            axialView.style.display = 'none';
            sagittalView.style.display = 'block';
            coronalView.style.display = 'none';
            break;
        case 'coronal':
            axialView.style.display = 'none';
            sagittalView.style.display = 'none';
            coronalView.style.display = 'block';
            break;
    }
}

// Tworzenie opcji typu checkbox
function createCheckboxOptions(options, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    // Jeśli brak opcji, dodaj informację
    if (!options || options.length === 0) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'option';
        infoDiv.textContent = 'Brak dostępnych opcji';
        container.appendChild(infoDiv);
        return;
    }
    
    options.forEach(option => {
        const div = document.createElement('div');
        div.className = 'option';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = option.id;
        input.name = containerId;
        
        const label = document.createElement('label');
        label.htmlFor = option.id;
        label.textContent = option.text;
        
        div.appendChild(input);
        div.appendChild(label);
        container.appendChild(div);
        
        // Dodaj trochę interaktywności
        div.addEventListener('click', (e) => {
            if (e.target !== input) {
                input.checked = !input.checked;
            }
        });
    });
}

// ====== MECHANIKA GRY ======

// Rozpoczęcie gry
function startGame() {
    console.log('Rozpoczynanie gry...');
    
    // Sprawdź czy mamy przypadki
    if (!cases || cases.length === 0) {
        console.error('Brak przypadków do wyświetlenia.');
        displayErrorMessage('Nie można rozpocząć gry - brak danych przypadków.');
        return;
    }
    
    // Losowe ułożenie kolejności przypadków
    shuffleArray(cases);
    
    // Reset zmiennych gry
    currentCaseIndex = 0;
    answeredCases = [];
    userScore = 0;
    
    // Zmiana widoczności ekranów
    hideWelcomeScreen();
    showGameScreen();
    
    // Załadowanie pierwszego przypadku
    loadCase(currentCaseIndex);
    console.log('Gra rozpoczęta, załadowano pierwszy przypadek.');
}

// Ładowanie przypadku
function loadCase(caseIndex) {
    console.log(`Ładowanie przypadku ${caseIndex + 1}/${cases.length}`);
    
    const currentCase = cases[caseIndex];
    
    // Aktualizacja informacji o przypadku
    caseTitle.textContent = currentCase.title;
    caseDescription.textContent = currentCase.description;
    
    // Wczytanie obrazów SVG
    console.log('Ładowanie obrazów SVG...');
    
    // Zastosowanie odpowiedniego kodowania do SVG
    const axialSvgContent = decodeSVG(currentCase.axialSvg);
    const sagittalSvgContent = decodeSVG(currentCase.sagittalSvg);
    const coronalSvgContent = decodeSVG(currentCase.coronalSvg);
    
    axialSvgContainer.innerHTML = enhanceSVG(axialSvgContent, 'axial');
    sagittalSvgContainer.innerHTML = enhanceSVG(sagittalSvgContent, 'sagittal');
    coronalSvgContainer.innerHTML = enhanceSVG(coronalSvgContent, 'coronal');
    
    // Sprawdź czy SVG zostały załadowane
    console.log('Status ładowania SVG:', {
        axial: axialSvgContainer.innerHTML.length > 0 ? 'załadowano' : 'pusty',
        sagittal: sagittalSvgContainer.innerHTML.length > 0 ? 'załadowano' : 'pusty',
        coronal: coronalSvgContainer.innerHTML.length > 0 ? 'załadowano' : 'pusty'
    });
    
    // Jeśli brakuje SVG, dodaj placeholdera
    if (axialSvgContainer.innerHTML.length === 0) {
        axialSvgContainer.innerHTML = createSVGPlaceholder('Brak obrazu osiowego');
    }
    if (sagittalSvgContainer.innerHTML.length === 0) {
        sagittalSvgContainer.innerHTML = createSVGPlaceholder('Brak obrazu strzałkowego');
    }
    if (coronalSvgContainer.innerHTML.length === 0) {
        coronalSvgContainer.innerHTML = createSVGPlaceholder('Brak obrazu czołowego');
    }
    
    // Utwórz opcje diagnozy, obserwacji i leczenia
    createCheckboxOptions(shuffleArray([...currentCase.diagnosisOptions]), 'diagnosis-options');
    createCheckboxOptions(shuffleArray([...currentCase.findingsOptions]), 'findings-options');
    createCheckboxOptions(shuffleArray([...currentCase.treatmentOptions]), 'treatment-options');
    
    // Aktualizacja paska postępu
    const progress = ((caseIndex + 1) / cases.length) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `Przypadek ${caseIndex + 1} z ${cases.length}`;
    progressPercent.textContent = `${Math.round(progress)}%`;
    
    // Ukryj informację zwrotną
    feedback.style.display = 'none';
    
    // Aktywuj przycisk widoku całościowego i pokaż wszystkie widoki
    setActiveViewButton(document.querySelector('[data-view="all"]'));
    changeView('all');
    
    // Reset przycisku zatwierdzania
    submitAnswerBtn.disabled = false;
    
    console.log(`Przypadek ${caseIndex + 1} załadowany.`);
}

// Funkcja dekodująca zawartość SVG (usuwanie dodatkowych znaków cudzysłowów)
function decodeSVG(svgContent) {
    if (!svgContent) return '';
    
    // Usunięcie podwójnych cudzysłowów (często spotykane w CSV)
    return svgContent.replace(/""/g, '"');
}

// Funkcja tworząca placeholder SVG gdy brakuje obrazu
function createSVGPlaceholder(message) {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="100%" height="100%">
        <rect width="100%" height="100%" fill="#f0f0f0" />
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#666666">${message}</text>
        <text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" fill="#666666" font-size="smaller">Sprawdź plik svg_data.csv</text>
    </svg>
    `;
}

// Sprawdzanie odpowiedzi
function checkAnswers() {
    const currentCase = cases[currentCaseIndex];
    let correctCount = 0;
    let totalCorrect = 0;
    
    // Sprawdź diagnozę
    checkOptionGroup(currentCase.diagnosisOptions, 'd', (correct) => {
        correctCount += correct ? 1 : 0;
        totalCorrect += 1;
    });
    
    // Sprawdź obserwacje
    checkOptionGroup(currentCase.findingsOptions, 'f', (correct) => {
        correctCount += correct ? 1 : 0;
        totalCorrect += 1;
    });
    
    // Sprawdź leczenie
    checkOptionGroup(currentCase.treatmentOptions, 't', (correct) => {
        correctCount += correct ? 1 : 0;
        totalCorrect += 1;
    });
    
    // Zabezpieczenie przed dzieleniem przez zero
    if (totalCorrect === 0) {
        totalCorrect = 1; // Unikamy dzielenia przez zero
    }
    
    // Oblicz wynik
    const totalOptions = 
        (currentCase.diagnosisOptions ? currentCase.diagnosisOptions.length : 0) +
        (currentCase.findingsOptions ? currentCase.findingsOptions.length : 0) +
        (currentCase.treatmentOptions ? currentCase.treatmentOptions.length : 0);
    
    const score = Math.round((correctCount / totalCorrect) * 100);
    
    // Zapisz wynik
    answeredCases.push({
        caseId: currentCase.id,
        caseTitle: currentCase.title,
        score: score,
        correctAnswers: correctCount,
        totalOptions: totalOptions,
        correctRequired: totalCorrect
    });
    
    // Zwiększ całkowity wynik
    userScore += score;
    
    // Wyświetl informację zwrotną
    feedbackContent.innerHTML = currentCase.feedback;
    
    // Efekt pojawiania się informacji zwrotnej
    setTimeout(() => {
        feedback.style.display = 'block';
        feedback.scrollIntoView({ behavior: 'smooth' });
    }, 500);
    
    // Wyłącz przycisk zatwierdzania
    submitAnswerBtn.disabled = true;
    
    // Podświetl ważne elementy w SVG
    highlightPathologicalElements();
    
    console.log(`Sprawdzono odpowiedzi dla przypadku ${currentCaseIndex + 1}. Wynik: ${score}%`);
}

// Sprawdzanie grupy opcji (diagnoza, obserwacje, leczenie)
function checkOptionGroup(options, prefix, callback) {
    if (!options || options.length === 0) {
        return; // Brak opcji do sprawdzenia
    }
    
    options.forEach(option => {
        const checkbox = document.getElementById(option.id);
        if (!checkbox) {
            console.error(`Nie znaleziono checkboxa o ID: ${option.id}`);
            return;
        }
        
        const parent = checkbox.parentElement;
        
        if (option.correct) {
            callback(true);
            
            // Zaznacz poprawne odpowiedzi
            if (checkbox.checked) {
                parent.classList.add('correct');
            } else {
                parent.classList.add('incorrect');
                // Dodaj oznaczenie "Powinna być zaznaczona"
                const missedIndicator = document.createElement('span');
                missedIndicator.textContent = " ✓";
                missedIndicator.style.color = 'var(--success)';
                missedIndicator.style.fontWeight = 'bold';
                parent.appendChild(missedIndicator);
            }
        } else if (checkbox.checked) {
            callback(false);
            // Zaznacz niepoprawne odpowiedzi
            parent.classList.add('incorrect');
            // Dodaj oznaczenie "Nie powinna być zaznaczona"
            const wrongIndicator = document.createElement('span');
            wrongIndicator.textContent = " ✗";
            wrongIndicator.style.color = 'var(--danger)';
            wrongIndicator.style.fontWeight = 'bold';
            parent.appendChild(wrongIndicator);
        }
        
        // Wyłącz checkbox po sprawdzeniu
        checkbox.disabled = true;
    });
}

// Podświetlenie patologicznych elementów w SVG
function highlightPathologicalElements() {
    const svgElements = document.querySelectorAll('.tooth-pathology');
    
    console.log(`Podświetlanie ${svgElements.length} elementów patologicznych w SVG.`);
    
    svgElements.forEach(element => {
        element.classList.add('highlight');
    });
}

// Następny przypadek
function nextCase() {
    currentCaseIndex++;
    
    if (currentCaseIndex < cases.length) {
        loadCase(currentCaseIndex);
        
        // Przewijanie do góry ekranu
        gameScreen.scrollIntoView({ behavior: 'smooth' });
    } else {
        showResults();
    }
}

// Pokaż wyniki
function showResults() {
    // Ukryj ekran gry i pokaż wyniki
    hideGameScreen();
    showResultsScreen();
    
    // Oblicz średni wynik
    const averageScore = answeredCases.length > 0 
        ? Math.round(userScore / answeredCases.length) 
        : 0;
        
    finalScoreValue.textContent = `${averageScore}%`;
    
    // Dostosuj kolor koła wyników
    const scoreCircle = document.querySelector('.score-circle');
    if (averageScore >= 80) {
        scoreCircle.style.background = `conic-gradient(var(--success) 0%, var(--success) ${averageScore}%, #e2e8f0 ${averageScore}%, #e2e8f0 100%)`;
    } else if (averageScore >= 60) {
        scoreCircle.style.background = `conic-gradient(var(--warning) 0%, var(--warning) ${averageScore}%, #e2e8f0 ${averageScore}%, #e2e8f0 100%)`;
    } else {
        scoreCircle.style.background = `conic-gradient(var(--danger) 0%, var(--danger) ${averageScore}%, #e2e8f0 ${averageScore}%, #e2e8f0 100%)`;
    }
    
    // Wyczyść i wypełnij podsumowanie przypadków
    casesSummary.innerHTML = '';
    
    // Sprawdź czy mamy jakiekolwiek odpowiedzi
    if (answeredCases.length === 0) {
        const noResultsMsg = document.createElement('li');
        noResultsMsg.textContent = 'Brak danych do wyświetlenia.';
        casesSummary.appendChild(noResultsMsg);
        return;
    }
    
    // Sortuj od najlepszych do najgorszych wyników
    answeredCases.sort((a, b) => b.score - a.score);
    
    answeredCases.forEach(caseResult => {
        const li = document.createElement('li');
        
        // Dodaj klasę koloru w zależności od wyniku
        let scoreClass = '';
        if (caseResult.score >= 80) {
            scoreClass = 'case-score-high';
        } else if (caseResult.score >= 60) {
            scoreClass = 'case-score-medium';
        } else {
            scoreClass = 'case-score-low';
        }
        
        li.innerHTML = `
            ${caseResult.caseTitle}
            <span class="${scoreClass}">${caseResult.score}%</span>
        `;
        
        casesSummary.appendChild(li);
    });
    
    console.log('Wyświetlono ekran wyników.');
}

// Restart gry
function restartGame() {
    // Resetuj zmienne
    currentCaseIndex = 0;
    answeredCases = [];
    userScore = 0;
    
    // Ukryj ekran wyników i pokaż ekran gry
    hideResultsScreen();
    showGameScreen();
    
    // Załaduj pierwszy przypadek
    loadCase(currentCaseIndex);
    
    console.log('Gra zrestartowana.');
}

// ====== FUNKCJE POMOCNICZE ======

// Mieszanie tablicy (algorytm Fisher-Yates)
function shuffleArray(array) {
    if (!array || !Array.isArray(array)) {
        console.error('Próba wymieszania nieprawidłowej tablicy:', array);
        return array || [];
    }
    
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Ulepszony i bardziej odporny SVG enhancement
function enhanceSVG(svgContent, viewType) {
    if (!svgContent || typeof svgContent !== 'string') {
        console.warn(`Brak zawartości SVG dla widoku ${viewType}`);
        return '';
    }
    
    if (svgContent.trim().length === 0) {
        console.warn(`Pusty ciąg SVG dla widoku ${viewType}`);
        return '';
    }
    
    try {
        // Sprawdź czy zawartość to prawidłowy SVG
        if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
            console.error(`Nieprawidłowy format SVG dla widoku ${viewType}:`, svgContent.substring(0, 100));
            return svgContent; // Zwróć oryginał, jeśli nie wygląda na SVG
        }
        
        // Dodaj klasy i atrybuty do SVG dla lepszych efektów wizualnych
        let enhancedSVG = svgContent;
        
        // Dodaj klasę 'tooth-element' do elementów tylko gdy nie mają już klasy
        enhancedSVG = enhancedSVG.replace(/<(circle|rect|ellipse|path)(\s+[^>]*?)(?!\sclass=)(\s*\/?>)/g, 
            '<$1$2 class="tooth-element"$3');
        
        // Dodaj klasę 'tooth-pathology' do elementów patologicznych na podstawie koloru
        const pathologyPattern = /(fill="#ddd"|fill="#f99"|stroke="#f00"|stroke="#c00")([^>]*?)(?!\sclass=)(\s*\/?>)/g;
        enhancedSVG = enhancedSVG.replace(pathologyPattern, '$1$2 class="tooth-pathology"$3');
        
        // Dodaj animacje linii wskaźnikowych
        enhancedSVG = enhancedSVG.replace(/(stroke-dasharray="2"|stroke-dasharray="3,3")([^>]*?)(?!\sclass=)(\s*\/?>)/g, 
            '$1$2 class="animated-line"$3');
        
        return enhancedSVG;
    } catch (error) {
        console.error(`Error enhancing SVG for ${viewType}:`, error);
        return svgContent; // Zwróć oryginał jeśli ulepszenie nie powiedzie się
    }
}

// Udoskonalony wyświetlacz komunikatu o błędzie
function displayErrorMessage(message) {
    hideLoadingScreen();
    
    // Usuń wcześniejsze komunikaty o błędach, jeśli istnieją
    const existingErrors = document.querySelectorAll('.error-message');
    existingErrors.forEach(error => error.remove());
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message card';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translate(-50%, -50%)';
    errorDiv.style.zIndex = '9999';
    errorDiv.style.padding = '2rem';
    errorDiv.style.maxWidth = '90%';
    errorDiv.style.width = '500px';
    errorDiv.style.backgroundColor = 'white';
    errorDiv.style.boxShadow = 'var(--shadow-lg)';
    
    errorDiv.innerHTML = `
        <h2 style="color: var(--danger);">Wystąpił błąd</h2>
        <p>${message}</p>
        <div class="button-container">
            <button class="btn btn-primary" onclick="location.reload()">Odśwież stronę</button>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
    console.error('Wyświetlono komunikat o błędzie:', message);
}

// ====== ZARZĄDZANIE WIDOCZNOŚCIĄ EKRANÓW ======

function showLoadingScreen() {
    loadingScreen.style.display = 'flex';
    isLoading = true;
}

function hideLoadingScreen() {
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 500);
    isLoading = false;
}

function showWelcomeScreen() {
    welcomeScreen.classList.add('active');
    gameScreen.classList.remove('active');
    resultsScreen.classList.remove('active');
}

function hideWelcomeScreen() {
    welcomeScreen.classList.remove('active');
}

function showGameScreen() {
    gameScreen.classList.add('active');
    welcomeScreen.classList.remove('active');
    resultsScreen.classList.remove('active');
}

function hideGameScreen() {
    gameScreen.classList.remove('active');
}

function showResultsScreen() {
    resultsScreen.classList.add('active');
    welcomeScreen.classList.remove('active');
    gameScreen.classList.remove('active');
}

function hideResultsScreen() {
    resultsScreen.classList.remove('active');
}