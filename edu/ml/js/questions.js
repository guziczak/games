/**
 * @module Questions
 * @description Questions data for the ML Quiz
 */

export const questions = [
    // Podstawy ML
    {
        category: "Podstawy ML",
        question: "Czym jest problem klasyfikacji w uczeniu maszynowym?",
        answers: [
            "Przewidywanie wartości ciągłej na podstawie cech wejściowych",
            "Przypisywanie przykładów do jednej z predefiniowanych klas",
            "Grupowanie podobnych przykładów bez etykiet",
            "Redukcja wymiarowości danych"
        ],
        correct: 1,
        explanations: [
            "To jest definicja regresji, nie klasyfikacji. Regresja przewiduje wartości ciągłe jak cena czy temperatura.",
            "Tak! Klasyfikacja to przypisywanie przykładów do jednej z predefiniowanych klas (kategorii).",
            "To jest definicja clusteringu (grupowania), który jest uczeniem nienadzorowanym bez etykiet.",
            "To jest technika przetwarzania danych (np. PCA), służąca do zmniejszenia liczby wymiarów."
        ]
    },
    {
        category: "Podstawy ML",
        question: "Czym jest problem regresji w uczeniu maszynowym?",
        answers: [
            "Przypisywanie przykładów do klas",
            "Przewidywanie wartości ciągłej na podstawie cech wejściowych",
            "Grupowanie danych bez nadzoru",
            "Wykrywanie anomalii w danych"
        ],
        correct: 1,
        explanations: [
            "To jest klasyfikacja - przypisywanie do dyskretnych kategorii, nie przewidywanie wartości ciągłych.",
            "Dokładnie! Regresja to przewidywanie wartości ciągłej (np. cena, temperatura) na podstawie cech.",
            "To jest clustering - technika uczenia nienadzorowanego do grupowania podobnych przykładów.",
            "To jest osobny problem ML - wykrywanie nietypowych obserwacji odbiegających od normy."
        ]
    },
    {
        category: "Podstawy ML",
        question: "Co to jest uczenie nadzorowane?",
        answers: [
            "Uczenie bez użycia etykiet",
            "Uczenie z wykorzystaniem danych treningowych zawierających etykiety",
            "Uczenie poprzez interakcję ze środowiskiem",
            "Uczenie tylko na danych testowych"
        ],
        correct: 1,
        explanations: [
            "To jest uczenie nienadzorowane - model odkrywa struktury w danych bez etykiet.",
            "Zgadza się! W uczeniu nadzorowanym model uczy się na przykładach z etykietami (znanymi odpowiedziami).",
            "To jest uczenie ze wzmocnieniem (reinforcement learning) - agent uczy się przez nagrody i kary.",
            "Dane testowe służą do oceny, nie do uczenia. Model uczy się na danych treningowych."
        ]
    },
    {
        category: "Podstawy ML",
        question: "Co to jest uczenie nienadzorowane?",
        answers: [
            "Uczenie z etykietami",
            "Uczenie poprzez nagrody i kary",
            "Uczenie na danych bez etykiet, odkrywanie struktury w danych",
            "Uczenie tylko offline"
        ],
        correct: 2,
        explanations: [
            "Uczenie z etykietami to uczenie nadzorowane (supervised learning). Nienadzorowane nie używa etykiet.",
            "To opisuje uczenie ze wzmocnieniem (reinforcement learning), gdzie agent uczy się przez interakcję ze środowiskiem.",
            "Perfekcyjnie! Uczenie nienadzorowane odkrywa ukryte wzorce i struktury w danych bez znanych etykiet czy odpowiedzi.",
            "Tryb offline/online nie definiuje typu uczenia. Uczenie nienadzorowane może działać zarówno offline jak i online."
        ]
    },
    {
        category: "Podstawy ML",
        question: "Co to jest zbiór treningowy?",
        answers: [
            "Dane używane do oceny finalnej modelu",
            "Dane używane do uczenia modelu",
            "Dane używane tylko do walidacji",
            "Dane syntetyczne"
        ],
        correct: 1,
        explanations: [
            "To opisuje zbiór testowy, nie treningowy. Zbiór testowy służy do końcowej oceny modelu.",
            "Tak! Zbiór treningowy to dane na których model uczy się rozpoznawać wzorce i zależności.",
            "To zbiór walidacyjny służący do dostrajania hiperparametrów. Zbiór treningowy służy do uczenia.",
            "Dane syntetyczne to sztucznie wygenerowane dane. Zbiór treningowy może być rzeczywisty lub syntetyczny."
        ]
    },
    {
        category: "Podstawy ML",
        question: "Co to jest zbiór testowy?",
        answers: [
            "Dane używane do trenowania modelu",
            "Dane używane do doboru hiperparametrów",
            "Dane używane do finalnej oceny modelu",
            "Dane walidacyjne"
        ],
        correct: 2,
        explanations: [
            "To zbiór treningowy! Zbiór testowy musi być oddzielony od treningu, żeby ocenić rzeczywistą jakość modelu.",
            "To zadanie zbioru walidacyjnego. Zbiór testowy używamy tylko raz - do końcowej oceny.",
            "Dokładnie! Zbiór testowy służy do niezależnej, finalnej oceny jak model radzi sobie na niewidzianych danych.",
            "Zbiór walidacyjny to trzeci rodzaj danych. Testowy różni się tym, że używamy go tylko na samym końcu."
        ]
    },
    {
        category: "Podstawy ML",
        question: "Co to jest overfitting (przeuczenie)?",
        answers: [
            "Model ma zbyt małą złożoność",
            "Model zbyt dobrze dopasowuje się do danych treningowych, tracąc zdolność generalizacji",
            "Model uczy się zbyt wolno",
            "Model ma za mało parametrów"
        ],
        correct: 1,
        explanations: [
            "To jest underfitting - model jest zbyt prosty by uchwycić wzorce w danych.",
            "Właśnie tak! Overfitting występuje gdy model 'zapamiętuje' dane treningowe zamiast uczyć się ogólnych wzorców.",
            "Szybkość uczenia nie definiuje overfittingu. To problem nadmiernego dopasowania do danych.",
            "Overfitting często wynika z ZBYT DUŻEJ liczby parametrów, nie za małej."
        ]
    },
    {
        category: "Podstawy ML",
        question: "Co to jest underfitting (niedouczenie)?",
        answers: [
            "Model jest zbyt złożony",
            "Model ma za dużo parametrów",
            "Model jest zbyt prosty i nie potrafi uchwycić wzorców w danych",
            "Model uczy się zbyt szybko"
        ],
        correct: 2,
        explanations: [
            "Zbyt złożony model prowadzi do overfittingu, nie underfittingu. Underfitting to problem zbyt prostego modelu.",
            "Za dużo parametrów powoduje overfitting. Underfitting wynika z niewystarczającej złożoności modelu.",
            "Właśnie tak! Underfitting występuje gdy model jest zbyt prosty by nauczyć się nawet podstawowych wzorców w danych.",
            "Szybkość uczenia nie definiuje underfittingu. Problem tkwi w niewystarczającej pojemności modelu."
        ]
    },
    {
        category: "Podstawy ML",
        question: "Co to są hiperparametry?",
        answers: [
            "Parametry uczone podczas treningu",
            "Parametry ustawiane przed treningiem, kontrolujące proces uczenia",
            "Wagi w sieci neuronowej",
            "Parametry tylko modeli liniowych"
        ],
        correct: 1,
        explanations: [
            "To nieprawda - parametry uczone podczas treningu to wagi i biasy, nie hiperparametry.",
            "Dokładnie! Hiperparametry to parametry ustawiane przed treningiem, kontrolujące proces uczenia (np. learning rate, liczba warstw).",
            "Wagi są parametrami uczonymi podczas treningu, nie hiperparametrami. Hiperparametry są ustawiane przed uczeniem.",
            "Hiperparametry występują we wszystkich typach modeli ML, nie tylko liniowych."
        ]
    },
    {
        category: "Podstawy ML",
        question: "Czym jest bias-variance tradeoff?",
        answers: [
            "Kompromis między szybkością a dokładnością",
            "Kompromis między błędem systematycznym a wariancją modelu",
            "Kompromis między rozmiarem modelu a pamięcią",
            "Kompromis między precyzją a czułością"
        ],
        correct: 1,
        explanations: [
            "To jest kompromis między innymi czynnikami. Bias-variance dotyczy błędu systematycznego i wariancji predykcji.",
            "Właśnie tak! Bias-variance tradeoff to kompromis między niedopasowaniem (bias) a nadmierną wrażliwością na dane treningowe (variance).",
            "To nie ma związku z rozmiarem modelu czy pamięcią, tylko z jego zdolnością do generalizacji.",
            "Precyzja i czułość to metryki klasyfikacji. Bias-variance to fundamentalny problem w uczeniu maszynowym."
        ]
    },

    // Sztuczny neuron i perceptron
    {
        category: "Sztuczny neuron",
        question: "Co wchodzi w skład modelu sztucznego neuronu?",
        answers: [
            "Tylko wagi",
            "Wejścia, wagi, bias, funkcja aktywacji i wyjście",
            "Tylko funkcja aktywacji",
            "Tylko wejścia i wyjścia"
        ],
        correct: 1,
        explanations: [
            "Wagi to tylko część modelu neuronu. Brakuje wejść, biasu, funkcji aktywacji i wyjścia.",
            "Perfekcyjnie! Kompletny model neuronu zawiera: wejścia (x), wagi (w), bias (b), funkcję aktywacji (f) i wyjście.",
            "Funkcja aktywacji to tylko jeden element. Neuron potrzebuje też wejść, wag, biasu i generuje wyjście.",
            "To za mało - neuron potrzebuje też wag do ważenia wejść, biasu i funkcji aktywacji."
        ]
    },
    {
        category: "Sztuczny neuron",
        question: "Jak obliczana jest suma ważona w sztucznym neuronie?",
        answers: [
            "Mnożenie wejść",
            "Suma iloczynów wejść i odpowiadających im wag plus bias",
            "Średnia wejść",
            "Maksimum z wejść"
        ],
        correct: 1,
        explanations: [
            "Samo mnożenie wejść nie wystarcza - trzeba je pomnożyć przez wagi i zsumować.",
            "Dokładnie! Suma ważona to Σ(xi * wi) + b - suma iloczynów każdego wejścia przez jego wagę plus bias.",
            "Średnia nie uwzględnia wag. W neuronie każde wejście ma swoją wagę określającą jego ważność.",
            "To zbyt proste - neuron oblicza ważoną sumę wszystkich wejść, nie tylko wybiera maksimum."
        ]
    },
    {
        category: "Sztuczny neuron",
        question: "Po co stosuje się funkcję aktywacji w neuronie?",
        answers: [
            "Aby przyspieszyć obliczenia",
            "Aby zmniejszyć rozmiar modelu",
            "Aby wprowadzić nieliniowość do modelu",
            "Aby znormalizować wejścia"
        ],
        correct: 2,
        explanations: [
            "Funkcja aktywacji nie przyspiesza obliczeń - może nawet je spowolnić. Jej celem jest nieliniowość.",
            "Funkcja aktywacji nie zmniejsza rozmiaru modelu - dodaje obliczenia. Jej rolą jest transformacja nieliniowa.",
            "Właśnie tak! Bez funkcji aktywacji sieć byłaby tylko liniową transformacją. Nieliniowość pozwala modelować złożone wzorce.",
            "Normalizacja to osobny proces. Funkcja aktywacji wprowadza nieliniowość do modelu."
        ]
    },
    {
        category: "Sztuczny neuron",
        question: "Która funkcja aktywacji zwraca wartości w przedziale (0,1)?",
        answers: [
            "ReLU",
            "Tangens hiperboliczny",
            "Funkcja sigmoida",
            "Funkcja liniowa"
        ],
        correct: 2,
        explanations: [
            "ReLU zwraca wartości od 0 do nieskończoności: max(0,x). Nie ogranicza do przedziału (0,1).",
            "Tanh zwraca wartości w przedziale (-1,1), nie (0,1). Ma inny zakres niż potrzebny.",
            "Tak! Sigmoida f(x) = 1/(1+e^(-x)) zawsze zwraca wartości między 0 a 1, idealne dla prawdopodobieństw.",
            "Funkcja liniowa f(x)=x może zwracać dowolne wartości, nie jest ograniczona do (0,1)."
        ]
    },
    {
        category: "Sztuczny neuron",
        question: "Co to jest perceptron?",
        answers: [
            "Wielowarstwowa sieć neuronowa",
            "Pojedynczy sztuczny neuron z binarną funkcją aktywacji",
            "Algorytm grupowania",
            "Metoda redukcji wymiarów"
        ],
        correct: 1,
        explanations: [
            "Wielowarstwowa sieć to MLP (Multi-Layer Perceptron). Sam perceptron to tylko pojedynczy neuron.",
            "Dokładnie! Perceptron to najprostszy model neuronu z binarną funkcją aktywacji (próg), który zwraca 0 lub 1.",
            "To definicja algorytmów jak K-means czy DBSCAN. Perceptron to model klasyfikacji, nie grupowania.",
            "To opisuje techniki jak PCA czy t-SNE. Perceptron to klasyfikator, nie metoda redukcji wymiarów."
        ]
    },
    {
        category: "Sztuczny neuron",
        question: "Jakie problemy może rozwiązać pojedynczy perceptron?",
        answers: [
            "Wszystkie problemy klasyfikacji",
            "Tylko problemy liniowo separowalne",
            "Problemy nieliniowe",
            "Tylko problemy regresji"
        ],
        correct: 1,
        explanations: [
            "To nieprawda - pojedynczy perceptron ma ograniczenia i nie może rozwiązać wszystkich problemów klasyfikacji.",
            "Zgadza się! Perceptron tworzy liniową granicę decyzyjną, więc może rozwiązać tylko problemy liniowo separowalne.",
            "Perceptron nie radzi sobie z problemami nieliniowymi jak XOR. Potrzeba do tego sieci wielowarstwowej.",
            "Perceptron to algorytm klasyfikacji, nie regresji. Przewiduje klasy, nie wartości ciągłe."
        ]
    },
    {
        category: "Sztuczny neuron",
        question: "Co to jest perceptron wielowarstwowy (MLP)?",
        answers: [
            "Pojedynczy neuron z wieloma wejściami",
            "Sieć neuronowa z warstwą wejściową, ukrytymi i wyjściową",
            "Perceptron z wieloma funkcjami aktywacji",
            "Algorytm uczenia perceptronu"
        ],
        correct: 1,
        explanations: [
            "To opisuje zwykły perceptron, nie wielowarstwowy. MLP ma dodatkowe warstwy ukryte.",
            "Dokładnie! MLP (Multi-Layer Perceptron) to sieć z warstwą wejściową, jedną lub więcej warstw ukrytych i warstwą wyjściową.",
            "Perceptron ma tylko jedną funkcję aktywacji. MLP ma wiele neuronów w wielu warstwach.",
            "To algorytm sieci, nie algorytm uczenia. MLP to architektura, nie metoda treningu."
        ]
    },
    {
        category: "Sztuczny neuron",
        question: "Dlaczego MLP może rozwiązywać problemy nieliniowe?",
        answers: [
            "Ma więcej wag",
            "Używa szybszych algorytmów",
            "Warstwy ukryte z nieliniowymi funkcjami aktywacji",
            "Ma więcej neuronów wyjściowych"
        ],
        correct: 2,
        explanations: [
            "Więcej wag to nie wszystko - bez nieliniowości sieć byłaby nadal liniowa niezależnie od liczby wag.",
            "Szybkość algorytmów nie ma związku ze zdolnością do rozwiązywania problemów nieliniowych.",
            "Właśnie tak! Warstwy ukryte z nieliniowymi funkcjami aktywacji (np. ReLU, sigmoid) pozwalają modelować złożone, nieliniowe zależności.",
            "Liczba neuronów wyjściowych określa liczbę klas/wyjść, nie zdolność do rozwiązywania problemów nieliniowych."
        ]
    },
    {
        category: "Sztuczny neuron",
        question: "Co to jest bias w kontekście neuronu?",
        answers: [
            "Błąd modelu",
            "Dodatkowy parametr pozwalający przesunąć funkcję aktywacji",
            "Waga połączenia",
            "Typ funkcji aktywacji"
        ],
        correct: 1,
        explanations: [
            "Bias to nie błąd, tylko użyteczny parametr modelu. Błąd to coś innego (error/loss).",
            "Dokładnie! Bias pozwala przesunąć funkcję aktywacji, dając neuronowi większą elastyczność.",
            "Waga to parametr mnożący wejście. Bias to osobny parametr dodawany do sumy ważonej.",
            "Bias to nie typ funkcji aktywacji, tylko dodatkowy parametr dodawany przed funkcją aktywacji."
        ]
    },
    {
        category: "Sztuczny neuron",
        question: "Co to jest funkcja ReLU?",
        answers: [
            "f(x) = 1/(1+e^(-x))",
            "f(x) = tanh(x)",
            "f(x) = max(0, x)",
            "f(x) = x"
        ],
        correct: 2,
        explanations: [
            "To wzrór funkcji sigmoidy. ReLU ma inny wzór: max(0,x).",
            "To funkcja tangens hiperboliczny. ReLU jest prostsza: max(0,x).",
            "Tak! ReLU = max(0,x) - zwraca 0 dla wartości ujemnych i x dla dodatnich. To najprostsza nieliniowa funkcja aktywacji.",
            "To funkcja liniowa (identity). ReLU wprowadza nieliniowość przez \'złamanie\' w zerze."
        ]
    },

    // Drzewa decyzyjne
    {
        category: "Drzewa decyzyjne",
        question: "Co reprezentuje drzewo decyzyjne?",
        answers: [
            "Sieć neuronową",
            "Hierarchiczną strukturę decyzji opartą na cechach",
            "Graf cykliczny",
            "Macierz wag"
        ],
        correct: 1,
        explanations: [
            "Sieć neuronowa to inny typ modelu oparty na sztucznych neuronach, nie drzewo decyzyjne.",
            "Perfekcyjnie! Drzewo decyzyjne to hierarchiczna struktura warunków if-then, która podejmuje decyzje na podstawie cech.",
            "Graf cykliczny ma pętle. Drzewo decyzyjne to struktura acykliczna - bez cykli.",
            "Macierz wag to element sieci neuronowych. Drzewo decyzyjne używa warunków, nie wag."
        ]
    },
    {
        category: "Drzewa decyzyjne",
        question: "Co znajduje się w węzłach wewnętrznych drzewa decyzyjnego?",
        answers: [
            "Klasy końcowe",
            "Wartości predykcji",
            "Warunki podziału oparte na cechach",
            "Tylko liczby"
        ],
        correct: 2,
        explanations: [
            "Klasy końcowe znajdują się w liściach drzewa, nie w węzłach wewnętrznych. Węzły wewnętrzne służą do podejmowania decyzji.",
            "Wartości predykcji (klasy lub wartości numeryczne) są zwracane przez liście, nie węzły wewnętrzne.",
            "Tak! Węzły wewnętrzne zawierają warunki podziału typu 'cecha < próg' lub 'cecha = wartość', które kierują przykłady w lewo lub prawo.",
            "To zbyt uproszczone. Węzły zawierają konkretne warunki decyzyjne oparte na cechach i progach, nie tylko liczby."
        ]
    },
    {
        category: "Drzewa decyzyjne",
        question: "Co znajduje się w liściach drzewa decyzyjnego?",
        answers: [
            "Warunki podziału",
            "Cechy",
            "Predykcje (klasy lub wartości)",
            "Kolejne drzewa"
        ],
        correct: 2,
        explanations: [
            "Warunki podziału są w węzłach wewnętrznych, nie w liściach. Liście to końcowe elementy drzewa.",
            "Cechy są używane w węzłach do podejmowania decyzji. Liście zawierają wyniki końcowe.",
            "Dokładnie! Liście drzewa zawierają finalne predykcje - klasy (w klasyfikacji) lub wartości (w regresji).",
            "Liście są końcowymi elementami drzewa. Nie zawierają kolejnych drzew, tylko predykcje."
        ]
    },
    {
        category: "Drzewa decyzyjne",
        question: "Jak działa algorytm CART?",
        answers: [
            "Dzieli losowo dane",
            "Rekurencyjnie dzieli dane wybierając najlepszy podział według kryterium",
            "Używa gradientu",
            "Grupuje podobne przykłady"
        ],
        correct: 1,
        explanations: [
            "CART nie dzieli losowo - to przemyslany algorytm wybierający optymalne podziały.",
            "Właśnie tak! CART (Classification and Regression Trees) rekurencyjnie wybiera najlepsze podziały według kryterium jak zysk informacyjny.",
            "CART nie używa gradientu - to algorytm oparty na podziałach według kryteriów czystości.",
            "To opisuje algorytmy grupowania. CART buduje drzewo decyzyjne, nie grupuje przykłady."
        ]
    },
    {
        category: "Drzewa decyzyjne",
        question: "Co to jest zysk informacyjny (information gain)?",
        answers: [
            "Liczba przykładów w węźle",
            "Redukcja entropii po podziale",
            "Głębokość drzewa",
            "Liczba liści"
        ],
        correct: 1,
        explanations: [
            "To tylko liczność, nie miara jakości podziału. Zysk informacyjny mierzy redukcję niepewności.",
            "Dokładnie! Zysk informacyjny = entropia przed podziałem - średnia ważona entropii po podziale.",
            "Głębokość to cecha struktury drzewa. Zysk informacyjny mierzy jakość podziału węzła.",
            "Liczba liści to właściwość całego drzewa. Zysk informacyjny dotyczy pojedynczego podziału."
        ]
    },
    {
        category: "Drzewa decyzyjne",
        question: "Co to jest kryterium Gini w drzewach decyzyjnych?",
        answers: [
            "Miara głębokości drzewa",
            "Miara nieczystości węzła",
            "Liczba przykładów",
            "Typ funkcji aktywacji"
        ],
        correct: 1,
        explanations: [
            "Głębokość drzewa to osobna metryka strukturalna, nie związana z Gini.",
            "Tak! Indeks Gini mierzy nieczystość węzła - prawdopodobieństwo błędnej klasyfikacji losowego elementu.",
            "Liczba przykładów to prosta statystyka. Gini mierzy jakość podziału/nieczystość.",
            "Funkcje aktywacji to element sieci neuronowych, nie drzew decyzyjnych."
        ]
    },
    {
        category: "Drzewa decyzyjne",
        question: "Jakie są zalety drzew decyzyjnych?",
        answers: [
            "Zawsze dają najlepsze wyniki",
            "Łatwa interpretacja, brak potrzeby normalizacji danych",
            "Zawsze są małe",
            "Nie wymagają żadnych parametrów"
        ],
        correct: 1,
        explanations: [
            "To nieprawda - drzewa mają swoje ograniczenia i nie zawsze dają najlepsze wyniki.",
            "Zgadza się! Drzewa są łatwe do interpretacji (można śledzić ścieżkę decyzji) i działają na surowych danych.",
            "Drzewa mogą być bardzo głębokie jeśli nie są ograniczone. To zależy od danych i parametrów.",
            "Drzewa mają wiele parametrów do dostrojenia: max_depth, min_samples_split, itp."
        ]
    },
    {
        category: "Drzewa decyzyjne",
        question: "Co to jest przycinanie drzewa (pruning)?",
        answers: [
            "Dodawanie nowych węzłów",
            "Usuwanie węzłów aby zapobiec przeuczeniu",
            "Zmiana kolejności węzłów",
            "Łączenie drzew"
        ],
        correct: 1,
        explanations: [
            "Pruning usuwa węzły, nie dodaje nowych. To proces redukcji złożoności.",
            "Perfekcyjnie! Pruning (przycinanie) usuwa węzły które niewiele wnoszą, redukując overfitting.",
            "Pruning nie zmienia kolejności - usuwa części drzewa zachowując strukturę.",
            "Pruning dotyczy pojedynczego drzewa, nie łączenia wielu drzew."
        ]
    },
    {
        category: "Drzewa decyzyjne",
        question: "Co kontroluje parametr max_depth w drzewach?",
        answers: [
            "Liczbę cech",
            "Maksymalną głębokość drzewa",
            "Liczbę klas",
            "Minimalną liczbę próbek"
        ],
        correct: 1,
        explanations: [
            "max_depth nie kontroluje liczby cech używanych w drzewie, tylko jego głębokość.",
            "Tak! max_depth określa maksymalną głębokość drzewa, zapobiegając zbyt złożonym modelom.",
            "Liczba klas jest określona przez dane. max_depth kontroluje strukturę drzewa.",
            "To kontroluje parametr min_samples_split lub min_samples_leaf, nie max_depth."
        ]
    },
    {
        category: "Drzewa decyzyjne",
        question: "Kiedy drzewo decyzyjne przestaje się rozrastać?",
        answers: [
            "Zawsze po 10 poziomach",
            "Gdy węzeł jest czysty lub osiągnięto kryteria stopu",
            "Nigdy",
            "Po 1 godzinie"
        ],
        correct: 1,
        explanations: [
            "Drzewo nie ma sztywnego limitu 10 poziomów - to zależy od parametrów.",
            "Dokładnie! Drzewo przestaje się rozrastać gdy: węzeł jest czysty (jedna klasa), osiągnięto max_depth, lub za mało przykładów do podziału.",
            "Drzewo zawsze przestaje rosnąć według kryteriów stopu, nie rośnie w nieskończoność.",
            "Czas nie jest kryterium stopu w standardowych implementacjach drzew decyzyjnych."
        ]
    },

    // Regresja logistyczna
    {
        category: "Regresja logistyczna",
        question: "Do czego służy regresja logistyczna?",
        answers: [
            "Tylko do regresji",
            "Do klasyfikacji binarnej i obliczania prawdopodobieństw",
            "Do grupowania danych",
            "Do redukcji wymiarów"
        ],
        correct: 1,
        explanations: [
            "Nazwa jest myląca! Mimo słowa 'regresja', to algorytm klasyfikacji, nie regresji wartości ciągłych.",
            "Dokładnie tak! Regresja logistyczna służy do klasyfikacji i zwraca prawdopodobieństwa przynależności do klas.",
            "Grupowanie to zadanie dla algorytmów jak K-means czy DBSCAN. Regresja logistyczna potrzebuje etykiet.",
            "Redukcję wymiarów robią algorytmy jak PCA czy LDA. Regresja logistyczna to klasyfikator."
        ]
    },
    {
        category: "Regresja logistyczna",
        question: "Jaka funkcja jest używana w regresji logistycznej?",
        answers: [
            "Funkcja liniowa",
            "Funkcja kwadratowa",
            "Funkcja sigmoida (logistyczna)",
            "Funkcja skokowa"
        ],
        correct: 2,
        explanations: [
            "Funkcja liniowa nie ogranicza wyjścia do (0,1), co jest potrzebne dla prawdopodobieństw.",
            "Funkcja kwadratowa nie ma właściwości potrzebnych dla prawdopodobieństw - może dać wartości >1.",
            "Właśnie tak! Funkcja sigmoida (logistyczna) przekształca dowolne wartości rzeczywiste na przedział (0,1).",
            "Funkcja skokowa daje tylko 0 lub 1, nie ciągłe prawdopodobieństwa potrzebne do optymalizacji."
        ]
    },
    {
        category: "Regresja logistyczna",
        question: "Co zwraca regresja logistyczna?",
        answers: [
            "Zawsze 0 lub 1",
            "Wartości ujemne",
            "Prawdopodobieństwo przynależności do klasy",
            "Tylko liczby całkowite"
        ],
        correct: 2,
        explanations: [
            "Regresja logistyczna zwraca prawdopodobieństwa (np. 0.7, 0.3), nie binarne wartości. Dopiero po zastosowaniu progu (np. 0.5) otrzymujemy 0 lub 1.",
            "Funkcja sigmoid używana w regresji logistycznej zwraca wartości tylko z przedziału (0,1), nigdy ujemne.",
            "Dokładnie! Regresja logistyczna zwraca prawdopodobieństwo między 0 a 1, interpretowane jako szansa przynależności do klasy.",
            "Regresja logistyczna zwraca wartości rzeczywiste z przedziału (0,1), nie liczby całkowite. To prawdopodobieństwa."
        ]
    },
    {
        category: "Regresja logistyczna",
        question: "Jak interpretujemy wynik 0.8 z regresji logistycznej?",
        answers: [
            "80% cech ma wartość 1",
            "80% prawdopodobieństwo przynależności do klasy pozytywnej",
            "Model ma 80% dokładność",
            "80% danych treningowych"
        ],
        correct: 1,
        explanations: [
            "0.8 to prawdopodobieństwo przynależności do klasy, nie procent cech o wartości 1.",
            "Dokładnie! W regresji logistycznej wynik 0.8 = 80% prawdopodobieństwo przynależności do klasy pozytywnej.",
            "0.8 to prawdopodobieństwo dla konkretnego przykładu, nie ogólna dokładność modelu.",
            "0.8 to prawdopodobieństwo predykcji, nie procent danych treningowych."
        ]
    },
    {
        category: "Regresja logistyczna",
        question: "Co to jest próg decyzyjny w regresji logistycznej?",
        answers: [
            "Maksymalna wartość cechy",
            "Wartość prawdopodobieństwa do klasyfikacji (np. 0.5)",
            "Liczba iteracji",
            "Rozmiar danych"
        ],
        correct: 1,
        explanations: [
            "Próg decyzyjny dotyczy prawdopodobieństw, nie wartości cech.",
            "Perfekcyjnie! Próg decyzyjny (np. 0.5) określa: jeśli P(klasa=1) >= 0.5, przypisz do klasy pozytywnej.",
            "Liczba iteracji to parametr treningu, nie próg klasyfikacji.",
            "Rozmiar danych nie ma związku z progiem decyzyjnym."
        ]
    },
    {
        category: "Regresja logistyczna",
        question: "Czy regresja logistyczna może być używana do klasyfikacji wieloklasowej?",
        answers: [
            "Nie, tylko binarna",
            "Tak, używając strategii one-vs-rest lub softmax",
            "Tylko dla 3 klas",
            "Tylko z drzewami decyzyjnymi"
        ],
        correct: 1,
        explanations: [
            "To nieprawda - regresję logistyczną można rozszerzyć na wiele klas.",
            "Tak! Można użyć strategii one-vs-rest (osobny model dla każdej klasy) lub softmax (multinomial).",
            "Nie ma takiego ograniczenia - może obsługiwać dowolną liczbę klas.",
            "Regresja logistyczna może działać samodzielnie dla wielu klas, nie potrzebuje drzew."
        ]
    },
    {
        category: "Regresja logistyczna",
        question: "Co to jest regularyzacja w regresji logistycznej?",
        answers: [
            "Normalizacja danych",
            "Technika zapobiegająca przeuczeniu przez karanie dużych wag",
            "Typ funkcji aktywacji",
            "Metoda inicjalizacji"
        ],
        correct: 1,
        explanations: [
            "Normalizacja danych to preprocessing. Regularyzacja to technika kontroli złożoności modelu.",
            "Dokładnie! Regularyzacja dodaje karę za duże wagi do funkcji kosztu, wymuszając prostsze modele.",
            "Regularyzacja to nie funkcja aktywacji, tylko technika zapobiegająca przeuczeniu.",
            "Regularyzacja dotyczy wartości wag podczas treningu, nie inicjalizacji."
        ]
    },
    {
        category: "Regresja logistyczna",
        question: "Jaka jest główna różnica między regresją liniową a logistyczną?",
        answers: [
            "Nie ma różnicy",
            "Regresja liniowa dla wartości ciągłych, logistyczna dla klasyfikacji",
            "Tylko nazwa",
            "Regresja logistyczna jest szybsza"
        ],
        correct: 1,
        explanations: [
            "Są fundamentalne różnice - jedna dla regresji, druga dla klasyfikacji.",
            "Właśnie tak! Regresja liniowa przewiduje wartości ciągłe (np. cena), logistyczna prawdopodobieństwa klas (0-1).",
            "Różnica jest zasadnicza - inne zastosowania, funkcje aktywacji i interpretacja wyników.",
            "Szybkość nie jest główną różnicą. Kluczowa różnica to typ problemu: regresja vs klasyfikacja."
        ]
    },
    {
        category: "Regresja logistyczna",
        question: "Co to jest log-loss w kontekście regresji logistycznej?",
        answers: [
            "Typ regularyzacji",
            "Funkcja kosztu mierząca błąd predykcji prawdopodobieństw",
            "Metoda optymalizacji",
            "Typ kernela"
        ],
        correct: 1,
        explanations: [
            "Log-loss to funkcja kosztu, nie typ regularyzacji. Regularyzacja to L1/L2.",
            "Perfekcyjnie! Log-loss (entropia krzyżowa) mierzy jakość predykcji prawdopodobieństw w klasyfikacji.",
            "Log-loss to funkcja kosztu do minimalizacji, nie metoda optymalizacji jak SGD.",
            "Kernel to pojęcie z SVM. Log-loss to funkcja straty dla regresji logistycznej."
        ]
    },
    {
        category: "Regresja logistyczna",
        question: "Dlaczego regresja logistyczna jest 'liniowa'?",
        answers: [
            "Zawsze daje liniowe wyniki",
            "Granica decyzyjna jest liniowa w przestrzeni cech",
            "Używa tylko jednej cechy",
            "Jest wolniejsza od innych"
        ],
        correct: 1,
        explanations: [
            "Wyniki są probabilistyczne (0-1), nie liniowe. To odnosi się do granicy decyzyjnej.",
            "Zgadza się! Regresja logistyczna tworzy liniową granicę decyzyjną w przestrzeni cech, mimo użycia sigmoid.",
            "Regresja logistyczna może używać wszystkich dostępnych cech, nie tylko jednej.",
            "Liniowość granicy nie ma związku z szybkością. To właściwość matematyczna modelu."
        ]
    },

    // K-means i clustering
    {
        category: "Clustering",
        question: "Co to jest clustering (grupowanie)?",
        answers: [
            "Typ klasyfikacji z etykietami",
            "Uczenie nienadzorowane grupujące podobne przykłady",
            "Metoda regresji",
            "Algorytm redukcji szumu"
        ],
        correct: 1,
        explanations: [
            "Klasyfikacja wymaga etykiet (uczenie nadzorowane). Clustering odkrywa grupy bez etykiet.",
            "Perfekcyjnie! Clustering to uczenie nienadzorowane które grupuje podobne przykłady bez wcześniejszej wiedzy o klasach.",
            "Regresja przewiduje wartości ciągłe. Clustering organizuje dane w grupy podobnych obiektów.",
            "Redukcja szumu to preprocessing. Clustering może pomóc w wykrywaniu outliers, ale to nie jego główny cel."
        ]
    },
    {
        category: "Clustering",
        question: "Jak działa algorytm K-means?",
        answers: [
            "Losowo przypisuje punkty do grup",
            "Iteracyjnie przypisuje punkty do najbliższych centroidów i aktualizuje centroidy",
            "Używa drzew decyzyjnych",
            "Działa tylko na 2 wymiarach"
        ],
        correct: 1,
        explanations: [
            "K-means nie jest losowy - to algorytm iteracyjnej optymalizacji z konkretnymi krokami.",
            "Dokładnie! K-means powtarza: 1) przypisz każdy punkt do najbliższego centroidu, 2) przelicz centroidy jako średnie.",
            "K-means to algorytm grupowania, nie używa drzew decyzyjnych.",
            "K-means działa w dowolnej liczbie wymiarów, nie tylko 2D."
        ]
    },
    {
        category: "Clustering",
        question: "Co to jest centroid w K-means?",
        answers: [
            "Najdalszy punkt w klastrze",
            "Środek (średnia) punktów w klastrze",
            "Pierwszy punkt klastra",
            "Losowy punkt"
        ],
        correct: 1,
        explanations: [
            "Centroid to środek, nie najdalszy punkt. Reprezentuje średnią pozycję punktów w klastrze.",
            "Właśnie tak! Centroid to średnia arytmetyczna wszystkich punktów należących do klastra.",
            "Centroid to średnia wszystkich punktów klastra, nie tylko pierwszego.",
            "Centroid jest obliczany jako średnia, nie wybierany losowo."
        ]
    },
    {
        category: "Clustering",
        question: "Jak wybiera się liczbę klastrów K w K-means?",
        answers: [
            "Zawsze K=2",
            "Metoda łokcia, silhouette score lub wiedza domenowa",
            "Losowo",
            "K = liczba cech"
        ],
        correct: 1,
        explanations: [
            "K=2 to arbitralny wybór. Liczba klastrów zależy od danych i problemu.",
            "Tak! Metoda łokcia (elbow method) analizuje inercję, silhouette score mierzy spójność klastrów.",
            "Losowy wybór K może dać złe wyniki. Trzeba użyć metryk lub wiedzy domenowej.",
            "K to liczba klastrów, nie cech. Te dwa parametry są niezależne."
        ]
    },
    {
        category: "Clustering",
        question: "Co to jest inercja w K-means?",
        answers: [
            "Liczba iteracji",
            "Suma kwadratów odległości punktów od ich centroidów",
            "Liczba klastrów",
            "Typ odległości"
        ],
        correct: 1,
        explanations: [
            "Inercja to nie liczba iteracji algorytmu, tylko miara jakości grupowania.",
            "Perfekcyjnie! Inercja to suma kwadratów odległości punktów od ich centroidów - mierzy zwartość klastrów.",
            "Inercja to metryka jakości, nie parametr określający liczbę klastrów.",
            "Typ odległości to osobny parametr. Inercja to wynikowa miara jakości grupowania."
        ]
    },
    {
        category: "Clustering",
        question: "Jakie są ograniczenia K-means?",
        answers: [
            "Działa na każdych danych",
            "Zakłada sferyczne klastry, wrażliwy na inicjalizację",
            "Nie ma ograniczeń",
            "Działa tylko na tekście"
        ],
        correct: 1,
        explanations: [
            "Nieprawda! K-means ma wiele ograniczeń - wymaga sferycznych klastrów i jest wrażliwy na outliers.",
            "Dokładnie! K-means najlepiej działa na sferycznych klastrach i jest wrażliwy na początkowe centroidy.",
            "Każdy algorytm ma ograniczenia. K-means wymaga podania liczby klastrów z góry i zakłada sferyczne kształty.",
            "K-means działa na dowolnych danych numerycznych, nie tylko na tekście. To ograniczenie nie istnieje."
        ]
    },
    {
        category: "Clustering",
        question: "Co to jest K-means++?",
        answers: [
            "Szybsza wersja K-means",
            "Metoda inteligentnej inicjalizacji centroidów",
            "K-means dla dużych danych",
            "K-means z większą liczbą klastrów"
        ],
        correct: 1,
        explanations: [
            "K-means++ nie przyspiesza algorytmu, tylko poprawia jakość przez lepszą inicjalizację.",
            "Dokładnie! K-means++ inteligentnie wybiera początkowe centroidy z prawdopodobieństwem proporcjonalnym do odległości.",
            "K-means++ to metoda inicjalizacji, nie wersja dla dużych danych.",
            "++ nie oznacza więcej klastrów, tylko lepszą metodę wyboru startowych centroidów."
        ]
    },
    {
        category: "Clustering",
        question: "Czym różni się DBSCAN od K-means?",
        answers: [
            "Nie ma różnicy",
            "DBSCAN znajduje klastry o dowolnych kształtach i wykrywa szum",
            "DBSCAN jest wolniejszy",
            "DBSCAN wymaga więcej pamięci"
        ],
        correct: 1,
        explanations: [
            "Są zasadnicze różnice w podejściu - K-means vs algorytm oparty na gęstości.",
            "Właśnie tak! DBSCAN znajduje klastry oparte na gęstości punktów, radzi sobie z dowolnymi kształtami i wykrywa szum.",
            "Szybkość to nie główna różnica. DBSCAN ma inną filozofię - gęstość zamiast odległości od centroidów.",
            "Pamięć to szczegół implementacji. Kluczowa różnica to sposób definiowania klastrów."
        ]
    },
    {
        category: "Clustering",
        question: "Co to jest hierarchiczne grupowanie?",
        answers: [
            "Grupowanie w wielu wymiarach",
            "Budowanie drzewa klastrów przez łączenie lub dzielenie",
            "Grupowanie tylko 2 klastrów",
            "Grupowanie z etykietami"
        ],
        correct: 1,
        explanations: [
            "Hierarchiczne grupowanie dotyczy struktury klastrów, nie liczby wymiarów danych.",
            "Tak! Hierarchiczne grupowanie buduje drzewo klastrów przez aglomerację (łączenie) lub podział.",
            "Może tworzyć dowolną liczbę klastrów - decydujesz gdzie \'przeciąć\' dendrogram.",
            "Hierarchiczne grupowanie to uczenie nienadzorowane - nie używa etykiet."
        ]
    },
    {
        category: "Clustering",
        question: "Co pokazuje dendrogram?",
        answers: [
            "Tylko końcowe klastry",
            "Hierarchię łączenia klastrów i odległości między nimi",
            "Centroidy klastrów",
            "Błędy grupowania"
        ],
        correct: 1,
        explanations: [
            "Dendrogram pokazuje całą hierarchię łączenia, nie tylko końcowy wynik.",
            "Perfekcyjnie! Dendrogram to drzewo pokazujące kolejność łączenia klastrów i odległości między nimi.",
            "Dendrogram nie pokazuje centroidów (to koncept z K-means), tylko strukturę łączenia.",
            "Dendrogram pokazuje strukturę grupowania, nie błędy. To narzędzie analizy, nie diagnostyki."
        ]
    },

    // KNN i Nearest Neighbors
    {
        category: "Nearest Neighbors",
        question: "Jak działa algorytm K-Nearest Neighbors (KNN)?",
        answers: [
            "Trenuje złożony model",
            "Klasyfikuje na podstawie K najbliższych sąsiadów",
            "Używa drzew decyzyjnych",
            "Działa tylko online"
        ],
        correct: 1,
        explanations: [
            "KNN nie trenuje żadnego modelu! To algorytm 'lazy learning' - zapamiętuje dane i używa ich przy predykcji.",
            "Świetnie! KNN znajduje K najbliższych przykładów treningowych i przypisuje klasę przez głosowanie większościowe.",
            "KNN nie używa drzew. To prosty algorytm oparty na odległościach między punktami w przestrzeni cech.",
            "KNN może działać zarówno online jak i offline. Kluczowa cecha to brak fazy treningu, nie tryb pracy."
        ]
    },
    {
        category: "Nearest Neighbors",
        question: "Czy KNN wymaga fazy treningu?",
        answers: [
            "Tak, długiego treningu",
            "Nie, to algorytm lazy learning",
            "Tylko dla dużych danych",
            "Zależy od K"
        ],
        correct: 1,
        explanations: [
            "KNN wymaga długiego czasu predykcji, ale nie ma klasycznej fazy treningu.",
            "Zgadza się! KNN to algorytm \'lazy learning\' - zapamiętuje dane i dopiero przy predykcji szuka sąsiadów.",
            "Nie ma znaczenia rozmiar danych - KNN zawsze jest \'lazy\', nie buduje modelu.",
            "K określa liczbę sąsiadów do sprawdzenia, nie wpływa na to czy jest faza treningu."
        ]
    },
    {
        category: "Nearest Neighbors",
        question: "Jak K wpływa na działanie KNN?",
        answers: [
            "Nie ma wpływu",
            "Małe K - bardziej złożona granica, duże K - gładsza granica",
            "K określa liczbę cech",
            "K określa liczbę klas"
        ],
        correct: 1,
        explanations: [
            "K ma ogromny wpływ na działanie algorytmu - to kluczowy hiperparametr.",
            "Dokładnie! Małe K (np. 1) daje złożoną, elastyczną granicę. Duże K daje gładszą, bardziej ogólną.",
            "K to liczba sąsiadów do sprawdzenia, nie liczba cech używanych w algorytmie.",
            "K określa liczbę sąsiadów, nie liczbę klas w problemie klasyfikacji."
        ]
    },
    {
        category: "Nearest Neighbors",
        question: "Dlaczego normalizacja jest ważna w KNN?",
        answers: [
            "Nie jest ważna",
            "KNN opiera się na odległościach, skala cech ma znaczenie",
            "Przyspiesza algorytm",
            "Zmniejsza K"
        ],
        correct: 1,
        explanations: [
            "Normalizacja jest kluczowa dla KNN - algorytm opiera się na odległościach.",
            "Właśnie tak! Bez normalizacji cechy o dużych wartościach (np. dochód w tysiącach) zdominują cechy małe (np. wiek).",
            "Normalizacja nie przyspiesza KNN znacząco - główny cel to poprawa jakości.",
            "Normalizacja nie zmienia K. Poprawia tylko obliczanie odległości między punktami."
        ]
    },
    {
        category: "Nearest Neighbors",
        question: "Jaka jest złożoność predykcji w KNN?",
        answers: [
            "O(1)",
            "O(n) gdzie n to liczba próbek treningowych",
            "O(log n)",
            "O(K)"
        ],
        correct: 1,
        explanations: [
            "O(1) to stały czas. KNN musi sprawdzić wszystkie punkty, więc złożoność zależy od n.",
            "Tak! Podstawowy KNN porównuje nowy punkt ze wszystkimi n punktami treningowymi - O(n).",
            "O(log n) byłoby możliwe z strukturą jak KD-tree, ale podstawowy KNN to O(n).",
            "Złożoność zależy od liczby próbek treningowych n, nie od K."
        ]
    },
    {
        category: "Nearest Neighbors",
        question: "Co to jest 'curse of dimensionality' w kontekście KNN?",
        answers: [
            "KNN działa lepiej w wysokich wymiarach",
            "W wysokich wymiarach wszystkie punkty stają się podobnie odległe",
            "Więcej wymiarów to szybsze działanie",
            "Problem z pamięcią"
        ],
        correct: 1,
        explanations: [
            "To nieprawda - KNN cierpi w wysokich wymiarach z powodu \'curse of dimensionality\'.",
            "Perfekcyjnie! W wysokich wymiarach wszystkie punkty stają się podobnie odległe, co psuje działanie KNN.",
            "Wysokie wymiary spowalniają KNN, ale główny problem to utrata sensu odległości.",
            "Problem to nie pamięć, ale fakt że odległości przestają być informatywne."
        ]
    },
    {
        category: "Nearest Neighbors",
        question: "Jak KNN radzi sobie z niezbalansowanymi klasami?",
        answers: [
            "Bardzo dobrze",
            "Słabo - może być zdominowany przez liczniejszą klasę",
            "Automatycznie balansuje",
            "Nie ma tego problemu"
        ],
        correct: 1,
        explanations: [
            "KNN ma problem z niezbalansowanymi klasami - większość sąsiadów będzie z liczniejszej klasy.",
            "Dokładnie! Przy niezbalansowanych klasach KNN może być zdominowany przez liczniejszą klasę.",
            "KNN nie balansuje automatycznie - trzeba użyć technik jak ważone głosowanie.",
            "Problem istnieje - większość K sąsiadów może należeć do dominującej klasy."
        ]
    },
    {
        category: "Nearest Neighbors",
        question: "Co to jest KNN z ważonym głosowaniem?",
        answers: [
            "Każdy sąsiad ma taki sam głos",
            "Bliżsi sąsiedzi mają większy wpływ na decyzję",
            "Tylko najdalszy sąsiad głosuje",
            "Losowe wagi sąsiadów"
        ],
        correct: 1,
        explanations: [
            "W standardowym KNN każdy z K sąsiadów ma taki sam głos. Ważone to rozszerzenie.",
            "Właśnie tak! W ważonym KNN bliżsi sąsiedzi mają większy wpływ - waga = 1/odległość.",
            "To byłoby dziwne - najdalszy sąsiad ma zwykle najmniej wspólnego z nowym punktem.",
            "Wagi są oparte na odległości, nie są losowe. Bliżsi = większy wpływ."
        ]
    },
    {
        category: "Nearest Neighbors",
        question: "Czy KNN może być używany do regresji?",
        answers: [
            "Nie, tylko klasyfikacja",
            "Tak, przewiduje średnią K najbliższych sąsiadów",
            "Tylko dla danych binarnych",
            "Tylko z innymi algorytmami"
        ],
        correct: 1,
        explanations: [
            "KNN może być używany zarówno do klasyfikacji jak i regresji.",
            "Dokładnie! W regresji KNN uśrednia wartości K najbliższych sąsiadów zamiast głosować.",
            "KNN działa na dowolnych danych numerycznych, nie tylko binarnych.",
            "KNN może działać samodzielnie w regresji - nie potrzebuje innych algorytmów."
        ]
    },
    {
        category: "Nearest Neighbors",
        question: "Jakie metryki odległości można użyć w KNN?",
        answers: [
            "Tylko euklidesowa",
            "Euklidesowa, Manhattan, Minkowski i inne",
            "Nie używa odległości",
            "Tylko Manhattan"
        ],
        correct: 1,
        explanations: [
            "Euklidesowa to tylko jedna z opcji. KNN może używać różnych metryk.",
            "Tak! Można użyć: euklidesowej (domyślna), Manhattan (L1), Minkowski, a nawet własnych metryk.",
            "KNN opiera się całkowicie na odległościach - to podstawa algorytmu.",
            "Manhattan to tylko jedna z wielu możliwych metryk, nie jedyna."
        ]
    },

    // Metryki i walidacja
    {
        category: "Metryki",
        question: "Co to jest accuracy (dokładność)?",
        answers: [
            "Stosunek fałszywie pozytywnych do wszystkich",
            "Stosunek poprawnych predykcji do wszystkich predykcji",
            "Tylko dla klasy pozytywnej",
            "Średni błąd"
        ],
        correct: 1,
        explanations: [
            "To jest False Positive Rate, nie accuracy. Accuracy uwzględnia wszystkie poprawne predykcje (TP + TN).",
            "Dokładnie! Accuracy = (TP + TN) / (TP + TN + FP + FN) - procent poprawnych predykcji.",
            "Accuracy uwzględnia obie klasy (pozytywną i negatywną), nie tylko jedną.",
            "To może być MAE lub MSE. Accuracy to procent poprawnych predykcji, nie błąd."
        ]
    },
    {
        category: "Metryki",
        question: "Co to jest precision (precyzja)?",
        answers: [
            "Stosunek prawdziwie pozytywnych do wszystkich przewidzianych jako pozytywne",
            "Stosunek prawdziwie pozytywnych do wszystkich rzeczywiście pozytywnych",
            "Dokładność modelu",
            "Błąd średniokwadratowy"
        ],
        correct: 0,
        explanations: [
            "Perfekcyjnie! Precision = TP / (TP + FP) - procent poprawnych wśród wszystkich przewidzianych jako pozytywne.",
            "To definicja recall (sensitivity), nie precision. Precision patrzy na przewidziane pozytywne.",
            "Precision to konkretna metryka, nie ogólna dokładność (accuracy).",
            "MSE to metryka regresji. Precision dotyczy klasyfikacji binarnej."
        ]
    },
    {
        category: "Metryki",
        question: "Co to jest recall (czułość)?",
        answers: [
            "To samo co precision",
            "Stosunek prawdziwie pozytywnych do wszystkich rzeczywiście pozytywnych",
            "Błąd modelu",
            "Liczba fałszywie negatywnych"
        ],
        correct: 1,
        explanations: [
            "Recall i precision to różne metryki mierzące różne aspekty klasyfikacji.",
            "Dokładnie! Recall = TP / (TP + FN) - procent wykrytych spośród wszystkich rzeczywistych pozytywnych.",
            "Recall to nie błąd, tylko miara kompletności wykrywania klasy pozytywnej.",
            "FN to liczba, recall to proporcja. Recall = TP / (TP + FN)."
        ]
    },
    {
        category: "Metryki",
        question: "Co to jest F1-score?",
        answers: [
            "Średnia arytmetyczna precision i recall",
            "Średnia harmoniczna precision i recall",
            "Maksimum z precision i recall",
            "Różnica precision i recall"
        ],
        correct: 1,
        explanations: [
            "Średnia arytmetyczna faworyzowałaby wysoką wartość jednej metryki. Harmoniczna karze niskie wartości.",
            "Właśnie tak! F1-score to średnia harmoniczna, która daje niski wynik gdy którakolwiek metryka jest niska.",
            "F1 to średnia, nie maksimum. Balansuje precision i recall.",
            "F1 łączy obie metryki w jedną liczbę, nie mierzy ich różnicy."
        ]
    },
    {
        category: "Metryki",
        question: "Kiedy accuracy może być mylącą metryką?",
        answers: [
            "Zawsze jest dobra",
            "Przy niezbalansowanych klasach",
            "Przy małych danych",
            "Przy dużych danych"
        ],
        correct: 1,
        explanations: [
            "Accuracy ma swoje ograniczenia, szczególnie przy niezbalansowanych danych.",
            "Dokładnie! Przy 99% przykładów klasy negatywnej, model zawsze przewidujący \'negatywny\' ma 99% accuracy.",
            "Rozmiar danych nie wpływa na wiarygodność accuracy jako metryki.",
            "Problem nie w dużych danych, ale w proporcjach klas."
        ]
    },
    {
        category: "Metryki",
        question: "Co pokazuje macierz pomyłek (confusion matrix)?",
        answers: [
            "Tylko błędy modelu",
            "Rozkład prawdziwych i przewidzianych klas",
            "Wagi modelu",
            "Czas treningu"
        ],
        correct: 1,
        explanations: [
            "Macierz pokazuje wszystkie wyniki - poprawne i błędne klasyfikacje.",
            "Właśnie tak! Macierz pomyłek to tabela pokazująca rzeczywiste vs przewidziane klasy dla wszystkich przykładów.",
            "Macierz pomyłek pokazuje wyniki klasyfikacji, nie wagi modelu.",
            "To metryka ewaluacji, nie ma związku z czasem treningu."
        ]
    },
    {
        category: "Metryki",
        question: "Co to jest cross-validation (walidacja krzyżowa)?",
        answers: [
            "Podział na train/test",
            "Wielokrotna ocena modelu na różnych podzbiorach danych",
            "Typ regularyzacji",
            "Metoda treningu"
        ],
        correct: 1,
        explanations: [
            "Prosty podział train/test to nie cross-validation. CV używa wielu podziałów.",
            "Perfekcyjnie! K-fold CV dzieli dane na K części, każda służy raz jako test, reszta jako trening.",
            "Cross-validation to metoda oceny, nie regularyzacji modelu.",
            "CV to metoda ewaluacji używająca wielu podziałów danych, nie metoda treningu."
        ]
    },
    {
        category: "Metryki",
        question: "Co to jest stratified cross-validation?",
        answers: [
            "Losowy podział danych",
            "Zachowanie proporcji klas w każdym podzbiorze",
            "Używanie tylko 2 foldów",
            "Walidacja tylko na klasie pozytywnej"
        ],
        correct: 1,
        explanations: [
            "Stratified nie jest losowy - celowo zachowuje proporcje klas.",
            "Tak! Stratified CV dba o to, by każdy fold miał takie same proporcje klas jak cały zbiór.",
            "Można użyć dowolnej liczby foldów, nie tylko 2.",
            "Stratified CV używa wszystkich klas, zachowując ich proporcje."
        ]
    },
    {
        category: "Metryki",
        question: "Co to jest ROC curve?",
        answers: [
            "Wykres błędu w czasie",
            "Wykres TPR vs FPR dla różnych progów",
            "Wykres dokładności",
            "Histogram predykcji"
        ],
        correct: 1,
        explanations: [
            "ROC nie pokazuje błędu w czasie, tylko wydajność klasyfikatora.",
            "Dokładnie! ROC curve pokazuje TPR (sensitivity) vs FPR dla różnych progów decyzyjnych.",
            "ROC to nie wykres accuracy, tylko TPR vs FPR.",
            "ROC to krzywa, nie histogram. Pokazuje trade-off między TPR a FPR."
        ]
    },
    {
        category: "Metryki",
        question: "Co oznacza AUC (Area Under Curve)?",
        answers: [
            "Dokładność modelu",
            "Pole pod krzywą ROC - miara jakości klasyfikatora",
            "Średni błąd",
            "Liczba parametrów"
        ],
        correct: 1,
        explanations: [
            "AUC to pole pod krzywą ROC, nie to samo co accuracy.",
            "Właśnie tak! AUC (Area Under ROC Curve) mierzy ogólną zdolność rozróżniania klas. 1.0 = perfekcyjny, 0.5 = losowy.",
            "AUC to metryka klasyfikacji, nie średni błąd.",
            "AUC to miara jakości klasyfikatora, nie liczba jego parametrów."
        ]
    },

    // Preprocessing i feature engineering
    {
        category: "Preprocessing",
        question: "Dlaczego stosuje się normalizację danych?",
        answers: [
            "Zawsze poprawia wyniki",
            "Wyrównuje skale cech dla algorytmów wrażliwych na odległości",
            "Przyspiesza tylko",
            "Usuwa outliers"
        ],
        correct: 1,
        explanations: [
            "Normalizacja nie zawsze poprawia wyniki - zależy od algorytmu i danych.",
            "Dokładnie! Normalizacja wyrównuje skale cech, ważne dla algorytmów opartych na odległościach (KNN, SVM).",
            "Główny cel to poprawa jakości modelu, nie tylko przyspieszenie.",
            "Normalizacja skaluje wartości, nie usuwa outliers. To osobny proces."
        ]
    },
    {
        category: "Preprocessing",
        question: "Czym różni się standaryzacja od normalizacji Min-Max?",
        answers: [
            "Nie ma różnicy",
            "Standaryzacja: średnia=0, std=1; Min-Max: zakres [0,1]",
            "Standaryzacja jest szybsza",
            "Min-Max usuwa więcej danych"
        ],
        correct: 1,
        explanations: [
            "Są różne metody skalowania z różnymi właściwościami.",
            "Właśnie tak! Standaryzacja: (średnia=0, std=1), Min-Max: skaluje do [0,1] lub innego zakresu.",
            "Szybkość obu metod jest podobna. Różnica jest w sposobie transformacji.",
            "Obie metody zachowują wszystkie dane, tylko je przekształcają."
        ]
    },
    {
        category: "Preprocessing",
        question: "Co to jest one-hot encoding?",
        answers: [
            "Kodowanie liczb na binarne",
            "Przekształcenie zmiennej kategorycznej na binarne kolumny",
            "Kompresja danych",
            "Typ normalizacji"
        ],
        correct: 1,
        explanations: [
            "One-hot dotyczy zmiennych kategorycznych, nie numerycznych.",
            "Perfekcyjnie! One-hot encoding tworzy nową kolumnę 0/1 dla każdej unikalnej wartości kategorycznej.",
            "One-hot zwiększa liczbę kolumn, nie kompresuje danych.",
            "One-hot to metoda kodowania kategorii, nie normalizacji."
        ]
    },
    {
        category: "Preprocessing",
        question: "Kiedy używamy ordinal encoding zamiast one-hot?",
        answers: [
            "Zawsze",
            "Gdy kategorie mają naturalny porządek",
            "Dla danych numerycznych",
            "Nigdy"
        ],
        correct: 1,
        explanations: [
            "Nie zawsze - zależy od charakteru zmiennej kategorycznej.",
            "Dokładnie! Ordinal encoding zachowuje porządek: niski=1, średni=2, wysoki=3.",
            "Ordinal encoding jest dla zmiennych kategorycznych, nie numerycznych.",
            "Ordinal encoding jest użyteczny właśnie gdy istnieje naturalny porządek."
        ]
    },
    {
        category: "Preprocessing",
        question: "Jak postępować z brakującymi danymi?",
        answers: [
            "Zawsze usuwać",
            "Usunąć, wypełnić średnią/medianą/modą lub użyć zaawansowanych metod",
            "Ignorować",
            "Zastąpić zerami"
        ],
        correct: 1,
        explanations: [
            "Usuwanie wszystkich braków może drastycznie zmniejszyć zbiór danych.",
            "Właśnie tak! Można: usunąć wiersze/kolumny, wypełnić średnią/medianą/modą, lub użyć zaawansowanej imputacji.",
            "Ignorowanie braków zazwyczaj powoduje błędy w większości algorytmów.",
            "Zastąpienie zerami może być złym pomysłem - 0 może mieć inne znaczenie niż brak."
        ]
    },
    {
        category: "Preprocessing",
        question: "Co to jest feature scaling?",
        answers: [
            "Tworzenie nowych cech",
            "Przekształcenie cech do podobnego zakresu wartości",
            "Usuwanie cech",
            "Selekcja cech"
        ],
        correct: 1,
        explanations: [
            "Feature scaling nie tworzy nowych cech, tylko przekształca istniejące.",
            "Dokładnie! Feature scaling to ogólny termin dla normalizacji, standaryzacji i innych metod skalowania.",
            "Scaling zachowuje cechy, tylko zmienia ich skalę.",
            "To nie selekcja (wybór cech), tylko transformacja ich wartości."
        ]
    },
    {
        category: "Preprocessing",
        question: "Dlaczego wykrywanie outliers jest ważne?",
        answers: [
            "Nie jest ważne",
            "Outliers mogą znacząco wpłynąć na uczenie modelu",
            "Tylko dla wizualizacji",
            "Przyspiesza trening"
        ],
        correct: 1,
        explanations: [
            "Wykrywanie outliers jest ważne - mogą to być błędy lub ważne anomalie.",
            "Tak! Outliers mogą znacząco wpłynąć na średnią, regresję liniową i inne wrażliwe algorytmy.",
            "Outliers wpływają na model, nie tylko na wizualizację.",
            "Outliers mogą spowalniać lub przyspieszać, ale główny problem to jakość modelu."
        ]
    },
    {
        category: "Preprocessing",
        question: "Co to jest feature engineering?",
        answers: [
            "Usuwanie wszystkich cech",
            "Tworzenie nowych cech na podstawie istniejących",
            "Tylko normalizacja",
            "Kompresja danych"
        ],
        correct: 1,
        explanations: [
            "Feature engineering tworzy nowe cechy, nie usuwa istniejących.",
            "Dokładnie! Feature engineering to sztuka tworzenia nowych, bardziej informatywnych cech z danych surowych.",
            "To więcej niż normalizacja - tworzenie całkiem nowych cech.",
            "Feature engineering zwiększa wymiarowość, nie kompresuje danych."
        ]
    },
    {
        category: "Preprocessing",
        question: "Co to jest binning (dyskretyzacja)?",
        answers: [
            "Kodowanie binarne",
            "Podział zmiennej ciągłej na przedziały",
            "Usuwanie duplikatów",
            "Typ klasyfikacji"
        ],
        correct: 1,
        explanations: [
            "Binning nie ma związku z kodowaniem binarnym.",
            "Właśnie tak! Binning dzieli zakres wartości ciągłych na przedziały (np. wiek: 0-18, 19-65, 65+).",
            "Binning może tworzyć duplikaty (wiele wartości w tym samym przedziale), nie usuwa ich.",
            "Binning to technika preprocessingu, nie typ klasyfikacji."
        ]
    },
    {
        category: "Preprocessing",
        question: "Kiedy stosuje się logarytmiczne przekształcenie danych?",
        answers: [
            "Zawsze",
            "Dla danych skośnych lub o dużym zakresie wartości",
            "Tylko dla ujemnych wartości",
            "Nigdy"
        ],
        correct: 1,
        explanations: [
            "Log transform nie zawsze jest odpowiedni - zależy od rozkładu danych.",
            "Perfekcyjnie! Logarytm \'ściska\' duże wartości i rozciąga małe, redukując skośność.",
            "Logarytm z liczb ujemnych nie istnieje! Trzeba najpierw przesunąć dane.",
            "Log transform jest szczególnie przydatny dla danych skośnych i eksponencjalnych."
        ]
    },

    // Zaawansowane tematy
    {
        category: "Zaawansowane",
        question: "Co to jest ensemble learning?",
        answers: [
            "Uczenie jednego modelu",
            "Łączenie predykcji wielu modeli dla lepszych wyników",
            "Typ sieci neuronowej",
            "Metoda redukcji wymiarów"
        ],
        correct: 1,
        explanations: [
            "Ensemble to technika łączenia wielu modeli, nie uczenia jednego.",
            "Dokładnie! Ensemble learning łączy predykcje wielu modeli, często dając lepsze wyniki niż pojedynczy model.",
            "Ensemble to ogólna technika, nie konkretny typ sieci.",
            "Ensemble dotyczy łączenia modeli, nie redukcji wymiarów."
        ]
    },
    {
        category: "Zaawansowane",
        question: "Czym jest Random Forest?",
        answers: [
            "Jedno duże drzewo",
            "Zespół drzew decyzyjnych trenowanych na losowych podzbiorach",
            "Las w danych",
            "Typ regresji"
        ],
        correct: 1,
        explanations: [
            "Random Forest to wiele drzew, nie jedno duże drzewo.",
            "Właśnie tak! Random Forest trenuje wiele drzew na losowych podpróbkach danych i cech, potem uśrednia wyniki.",
            "Nazwa jest metaforyczna - to ensemble drzew decyzyjnych, nie prawdziwy las.",
            "Random Forest to konkretny algorytm ensemble, nie ogólny typ regresji."
        ]
    },
    {
        category: "Zaawansowane",
        question: "Co to jest gradient boosting?",
        answers: [
            "Typ gradientu",
            "Sekwencyjne dodawanie modeli korygujących błędy poprzednich",
            "Równoległe trenowanie",
            "Optymalizacja wag"
        ],
        correct: 1,
        explanations: [
            "Gradient boosting to technika ensemble, nie typ gradientu.",
            "Perfekcyjnie! Każdy kolejny model (zwykle drzewo) uczy się poprawiać błędy poprzedników.",
            "Boosting jest sekwencyjny - każdy model zależy od poprzednich.",
            "Gradient w nazwie odnosi się do optymalizacji błędów, nie wag."
        ]
    },
    {
        category: "Zaawansowane",
        question: "Co to jest bagging?",
        answers: [
            "Pakowanie modelu",
            "Bootstrap aggregating - trenowanie modeli na różnych próbkach",
            "Typ torby",
            "Kompresja modelu"
        ],
        correct: 1,
        explanations: [
            "Bagging to technika ML, nie pakowanie w sensie dosłownym.",
            "Dokładnie! Bagging = Bootstrap Aggregating - trenuje modele na losowych próbkach ze zwracaniem.",
            "Nazwa to skrót od Bootstrap Aggregating, nie ma związku z torbami.",
            "Bagging zwiększa złożoność (wiele modeli), nie kompresuje."
        ]
    },
    {
        category: "Zaawansowane",
        question: "Co to jest regularyzacja L1 i L2?",
        answers: [
            "Typy funkcji aktywacji",
            "L1 - suma wartości bezwzględnych wag, L2 - suma kwadratów wag",
            "Metody inicjalizacji",
            "Typy optymalizatorów"
        ],
        correct: 1,
        explanations: [
            "L1 i L2 to typy regularyzacji, nie funkcje aktywacji.",
            "Właśnie tak! L1 (Lasso) zeruje nieważne wagi, L2 (Ridge) zmniejsza wszystkie wagi proporcjonalnie.",
            "To metody regularyzacji wag, nie inicjalizacji.",
            "L1/L2 to terminy kary w funkcji kosztu, nie optymalizatory."
        ]
    },
    {
        category: "Zaawansowane",
        question: "Co to jest Grid Search?",
        answers: [
            "Wyszukiwanie w sieci",
            "Systematyczne przeszukiwanie przestrzeni hiperparametrów",
            "Typ algorytmu",
            "Metoda treningu"
        ],
        correct: 1,
        explanations: [
            "Grid Search przeszukuje przestrzeń hiperparametrów, nie internet.",
            "Tak! Grid Search systematycznie testuje każdą kombinację hiperparametrów z zadanej siatki.",
            "Grid Search to metoda optymalizacji hiperparametrów, nie algorytm ML.",
            "To metoda doboru hiperparametrów, nie treningu modelu."
        ]
    },
    {
        category: "Zaawansowane",
        question: "Czym różni się Random Search od Grid Search?",
        answers: [
            "Nie ma różnicy",
            "Random Search losowo próbkuje przestrzeń hiperparametrów",
            "Random Search jest zawsze gorszy",
            "Grid Search jest losowy"
        ],
        correct: 1,
        explanations: [
            "Są różne - Grid Search jest systematyczny, Random Search losowy.",
            "Dokładnie! Random Search losowo próbkuje hiperparametry, często znajdując dobre rozwiązania szybciej.",
            "Random Search może być bardziej efektywny, szczególnie przy wielu hiperparametrach.",
            "To odwrotnie - Grid Search jest systematyczny, Random Search losowy."
        ]
    },
    {
        category: "Zaawansowane",
        question: "Co to jest pipeline w ML?",
        answers: [
            "Rura z danymi",
            "Sekwencja kroków przetwarzania od surowych danych do predykcji",
            "Typ modelu",
            "Baza danych"
        ],
        correct: 1,
        explanations: [
            "Pipeline w ML to sekwencja operacji, nie fizyczna rura.",
            "Właśnie tak! Pipeline łączy wszystkie kroki przetwarzania w jeden spójny proces.",
            "Pipeline to architektura/wzorzec, nie konkretny model.",
            "Pipeline organizuje przepływ pracy, nie przechowuje danych."
        ]
    },
    {
        category: "Zaawansowane",
        question: "Co to jest transfer learning?",
        answers: [
            "Kopiowanie kodu",
            "Wykorzystanie wiedzy z jednego zadania w innym podobnym zadaniu",
            "Przesyłanie modelu",
            "Typ regularyzacji"
        ],
        correct: 1,
        explanations: [
            "Transfer learning to wykorzystanie wiedzy z modelu, nie kopiowanie kodu.",
            "Dokładnie! Transfer learning używa wag z modelu wytrenowanego na jednym zadaniu jako punkt wyjścia dla nowego.",
            "Transfer learning przenosi wagi/wiedzę, nie cały model bez zmian.",
            "To technika uczenia, nie regularyzacji. Przyspiesza i poprawia uczenie."
        ]
    },
    {
        category: "Zaawansowane",
        question: "Co to jest autoencoder?",
        answers: [
            "Automatyczny koder",
            "Sieć neuronowa ucząca się kompresji i rekonstrukcji danych",
            "Typ klasyfikatora",
            "Algorytm sortowania"
        ],
        correct: 1,
        explanations: [
            "Autoencoder to typ sieci neuronowej, nie automatyczne narzędzie.",
            "Właśnie tak! Autoencoder kompresuje dane do niższego wymiaru (encoder) i odtwarza je (decoder).",
            "Autoencoder to architektura do uczenia reprezentacji, nie klasyfikator.",
            "To speę neuronowa do kompresji/dekompresji, nie algorytm sortowania."
        ]
    }
];

/**
 * Gets all unique categories
 * @returns {Array<string>} Array of category names
 */
export function getCategories() {
    return [...new Set(questions.map(q => q.category))];
}

/**
 * Gets questions by category
 * @param {string} category - Category name
 * @returns {Array} Questions in category
 */
export function getQuestionsByCategory(category) {
    return questions.filter(q => q.category === category);
}

/**
 * Gets question count by category
 * @returns {Object} Category counts
 */
export function getCategoryCounts() {
    const counts = {};
    questions.forEach(q => {
        counts[q.category] = (counts[q.category] || 0) + 1;
    });
    return counts;
}