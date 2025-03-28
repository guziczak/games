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
        const casesData = await loadCasesFromCSV('cases.csv');
        const svgData = await loadSVGsFromCSV('svg_data.csv');
        
        // Przetworzenie danych
        cases = processCasesData(casesData, svgData);
        
        // Przypisanie akcji do przycisków
        attachEventListeners();
        
        // Gotowe do gry
        hideLoadingScreen();
        showWelcomeScreen();
    } catch (error) {
        console.error('Błąd podczas inicjalizacji gry:', error);
        displayErrorMessage('Nie udało się wczytać danych gry. Odśwież stronę i spróbuj ponownie.');
    }
}

// ====== ŁADOWANIE DANYCH ======

// Funkcja do wczytywania danych przypadków z CSV
async function loadCasesFromCSV(filename) {
    try {
        const response = await fetch(filename);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error('Błąd podczas ładowania pliku CSV:', error);
        throw error;
    }
}

// Funkcja do wczytywania danych SVG z CSV
async function loadSVGsFromCSV(filename) {
    try {
        const response = await fetch(filename);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error('Błąd podczas ładowania SVG z CSV:', error);
        throw error;
    }
}

// Prosty parser CSV
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    return lines.slice(1).filter(line => line.trim() !== '').map(line => {
        const values = line.split(',');
        const entry = {};
        
        headers.forEach((header, index) => {
            // Obsługa wartości zawierających przecinki
            if (values[index] && values[index].startsWith('"')) {
                let value = values[index];
                let valueIndex = index;
                
                while (!values[valueIndex].endsWith('"') && valueIndex < values.length - 1) {
                    valueIndex++;
                    value += ',' + values[valueIndex];
                }
                
                entry[header] = value.replace(/^"|"$/g, '').replace(/""/g, '"');
            } else {
                entry[header] = values[index] ? values[index].trim() : '';
            }
        });
        
        return entry;
    });
}

// Przetwarzanie danych przypadków
function processCasesData(casesData, svgData) {
    return casesData.map(caseData => {
        // Znajdź odpowiednie SVG dla tego przypadku
        const caseSVGs = svgData.filter(svg => svg.caseId === caseData.id);
        
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
        
        return {
            id: caseData.id,
            title: caseData.title,
            description: caseData.description,
            axialSvg: axialSvg,
            sagittalSvg: sagittalSvg,
            coronalSvg: coronalSvg,
            diagnosisOptions: diagnosisOptions,
            findingsOptions: findingsOptions,
            treatmentOptions: treatmentOptions,
            feedback: caseData.feedback
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
}

// Ładowanie przypadku
function loadCase(caseIndex) {
    const currentCase = cases[caseIndex];
    
    // Aktualizacja informacji o przypadku
    caseTitle.textContent = currentCase.title;
    caseDescription.textContent = currentCase.description;
    
    // Wczytanie obrazów SVG
    axialSvgContainer.innerHTML = enhanceSVG(currentCase.axialSvg, 'axial');
    sagittalSvgContainer.innerHTML = enhanceSVG(currentCase.sagittalSvg, 'sagittal');
    coronalSvgContainer.innerHTML = enhanceSVG(currentCase.coronalSvg, 'coronal');
    
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
    
    // Oblicz wynik
    const totalOptions = currentCase.diagnosisOptions.length + currentCase.findingsOptions.length + currentCase.treatmentOptions.length;
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
}

// Sprawdzanie grupy opcji (diagnoza, obserwacje, leczenie)
function checkOptionGroup(options, prefix, callback) {
    options.forEach(option => {
        const checkbox = document.getElementById(option.id);
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
    const averageScore = Math.round(userScore / answeredCases.length);
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
}

// ====== FUNKCJE POMOCNICZE ======

// Mieszanie tablicy (algorytm Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Ulepszenie kodu SVG
function enhanceSVG(svgContent, viewType) {
    if (!svgContent) return '';
    
    // Dodaj klasy i atrybuty do SVG dla lepszych efektów wizualnych
    let enhancedSVG = svgContent;
    
    // Dodaj klasę 'tooth-element' do wszystkich elementów anatomicznych
    enhancedSVG = enhancedSVG.replace(/<(circle|rect|ellipse|path)\s/g, '<$1 class="tooth-element" ');
    
    // Dodaj klasę 'tooth-pathology' do elementów patologicznych
    enhancedSVG = enhancedSVG.replace(/fill="#ddd"|fill="#f99"|stroke="#f00"|stroke="#c00"/g, (match) => {
        return match + ' class="tooth-pathology"';
    });
    
    // Dodaj animacje linii wskaźnikowych
    enhancedSVG = enhancedSVG.replace(/stroke-dasharray="2"/g, 'stroke-dasharray="6,3" class="animated-line"');
    
    return enhancedSVG;
}

// Pokaż komunikat o błędzie
function displayErrorMessage(message) {
    hideLoadingScreen();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <h2>Wystąpił błąd</h2>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">Odśwież stronę</button>
    `;
    
    document.body.appendChild(errorDiv);
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

// ====== FALLBACK DLA OBSŁUGI BŁĘDÓW WCZYTYWANIA CSV ======

// Funkcja do wczytywania zastępczych danych przypadków (na wypadek, gdyby wczytanie CSV się nie powiodło)
function getFallbackCases() {
    // Tu należy umieścić kopię danych z oryginalnego pliku jako backup
    return [
        {
            id: '1',
            title: 'Przypadek 1: Ząb 36 - Ból przy żuciu',
            description: 'Pacjent, 45 lat, zgłasza się z bólem w okolicy zęba 36, który nasila się podczas żucia. Ząb reaguje nadwrażliwie na bodźce termiczne. W wywiadzie leczenie kanałowe w przeszłości.',
            // Reszta danych przypadku...
        },
        // Pozostałe przypadki...
    ];
}