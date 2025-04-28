// =============================================================================
// Image Remapper - automatyczne mapowanie brakujących obrazów na dostępne alternatywy
// Wersja 1.2.0 - Poprawiona wersja ze ścisłym dopasowaniem nazw plików
// =============================================================================

(function() {
    console.log("Image Remapper: Inicjalizacja wersji 1.2.0...");

    // KOREKCJA: Używamy DOKŁADNIE tych samych nazw plików, jakie widać w systemie
    // Lista dostępnych obrazów z dokładnymi nazwami (włącznie z polskimi znakami)
    const availableImages = [
        "deszcz_za_oknem_spokój_po_przebaczeniu.png",
        "drzwi.png",
        "fala_wspomnien_wracajaca.png",
        "ksiazka.png",
        "list.png",
        "muzyka.png",
        "park.png",
        "pracownia_petna_slonca_dziela.png",
        "rozstanie.png",
        "sala_spotkan_społeczność.png",
        "spokojna_sypialnia_poranne_slonce.png",
        "spotkanie.png",
        "spotkanie_moment_przebaczenia.png",
        "stare_zdjecie_w_ramce.png",
        "swiatlo.png",
        "telefon_w_dloni_wahanie.png",
        "warsztaty_dzielenie_się_pasją.png",
        "wymiana_wiadomosci_pierwszy_kontakt.png",
        "zachod_slonca_centrum_spoleczne.png",
        "zdjecie.png"
    ];

    // Mapa remapująca brakujące obrazy na dostępne zamienniki
    // KOREKCJA: Upewniona zgodność nazw plików z zestawem dostępnych obrazów
    const imageMap = {
        // Brakujące obrazy -> dostępne zamienniki (na podstawie analizy tematycznej)
        "moment_przelomu_jasnosc.png": "swiatlo.png",
        "adaptacja_nowa_sytuacja.png": "fala_wspomnien_wracajaca.png",
        "zanurz_w_naturze.png": "park.png",
        "widok_ze_wzgorza_panorama_zycia.png": "zachod_slonca_centrum_spoleczne.png",
        "wewnętrzne_olśnienie_moment_jasności.png": "swiatlo.png",
        "zmierzch_weranda_wewnętrzny_spokój.png": "spokojna_sypialnia_poranne_slonce.png",
        "zmiana_perspektywy_nowe_spojrzenie.png": "swiatlo.png",
        "odbicie_w_lustrze_transformacja.png": "zdjecie.png",
        "zachód_słońca_nad_jeziorem_spokój.png": "zachod_slonca_centrum_spoleczne.png",
        "świadomy_dzień_uważność.png": "spokojna_sypialnia_poranne_slonce.png",
        "docenianie_momentu_promień_słońca.png": "swiatlo.png",
        "zwykły_poranek_niezwykła_perspektywa.png": "spokojna_sypialnia_poranne_slonce.png",
        "spotykanie_w_kawiarni_odnowiona_milosc.png": "sala_spotkan_społeczność.png",
        "wyruszenie_w_podróż_droga.png": "park.png",
        "nowy_dom_poranne_światło.png": "spokojna_sypialnia_poranne_slonce.png",
        "las_sciezka_w_glebi.png": "park.png",
        "harmonia_natura_polanka.png": "park.png",
        "transformacja_motyl_kokon.png": "fala_wspomnien_wracajaca.png",
        "wyciagnieta_dlon_pomoc.png": "drzwi.png", // KOREKCJA: usunięto polskie znaki
        "glebsze_zaangazowanie_wolontariat.png": "sala_spotkan_społeczność.png", // KOREKCJA: usunięto polskie znaki
        "refleksja_nad_dzielem_kontemplacja.png": "pracownia_petna_slonca_dziela.png",
        "pracownia_ślady_twórczości_uzdrowienie.png": "pracownia_petna_slonca_dziela.png",
        "przygotowania_do_podróży_mapy.png": "ksiazka.png",
        "zachod_slonca_rodzinny_taras.png": "zachod_slonca_centrum_spoleczne.png",
        "rodzinne_spotkanie_przy_stole.png": "sala_spotkan_społeczność.png",
        "odnowiona_przyjaźń_zachód_słońca.png": "zachod_slonca_centrum_spoleczne.png",
        "spotkanie_przyjaciela_kawiarnia.png": "sala_spotkan_społeczność.png",
        "poszukiwanie_przyjaciela_detal.png": "telefon_w_dloni_wahanie.png",
        "wspomnienia_przyjaźni_album.png": "stare_zdjecie_w_ramce.png",
        "wspomnienie_przyjaciela_zdjęcie.png": "stare_zdjecie_w_ramce.png",
        "wyzwalacz_wspomnień_zapach.png": "fala_wspomnien_wracajaca.png",
        "konfrontacja_z_bólem_ciemny_pokój.png": "drzwi.png",
        "zapomniany_talent_odkrycie.png": "pracownia_petna_slonca_dziela.png",
        "eksploracja_talentu_odkrywanie.png": "warsztaty_dzielenie_się_pasją.png",
        "rozwijanie_talentu_regularna_praca.png": "pracownia_petna_slonca_dziela.png",
        "twórczy_przepływ_zanurzenie.png": "warsztaty_dzielenie_się_pasją.png",
        "emocjonalny_ciężar_uznanie.png": "rozstanie.png",
        "uznanie_ciężaru_lustro.png": "zdjecie.png",
        "ceremonia_uwolnienia_ogień.png": "swiatlo.png",
        "poczucie_lekkości_chmury.png": "swiatlo.png",
        "wolność_od_przeszłości_wzgórze.png": "zachod_slonca_centrum_spoleczne.png",
        "rozpoczęcie_tworzenia_płótno.png": "pracownia_petna_slonca_dziela.png",
        "przetwarzanie_emocji_fale.png": "fala_wspomnien_wracajaca.png",
        "zrozumienie_emocjonalne_jasność.png": "swiatlo.png",
        "zachod_slonca_klif_nad_oceanem.png": "zachod_slonca_centrum_spoleczne.png",
        "medytacja_spokój_cisza.png": "spokojna_sypialnia_poranne_slonce.png",
        "głębsza_refleksja_wgląd.png": "swiatlo.png",
        "refleksja_przebaczenie_głębia.png": "deszcz_za_oknem_spokój_po_przebaczeniu.png",
        "list_przebaczenie_pióro.png": "list.png",
        "nawiązanie_kontaktu_rodzina.png": "telefon_w_dloni_wahanie.png",
        "wspomnienia_rodzinne_album.png": "stare_zdjecie_w_ramce.png",
        "pamiątka_rodzinna_wspomnienia.png": "stare_zdjecie_w_ramce.png",
        "widok_przez_okno_świat.png": "drzwi.png",
        "przybory_artystyczne_inspiracja.png": "warsztaty_dzielenie_się_pasją.png",
        "spokojny_poranek_promienie.png": "spokojna_sypialnia_poranne_slonce.png",
        "poranna_herbata_cisza.png": "spokojna_sypialnia_poranne_slonce.png",
        "interpretacja_snów_symbole.png": "swiatlo.png",
        "wspomnienia_twórcze_notatki.png": "ksiazka.png",
        "nieoczekiwana_wiadomość_zaskoczenie.png": "list.png",
        "początkowa_reakcja_emocje.png": "fala_wspomnien_wracajaca.png",
        "wyjscie_na_zewnątrz_swiat.png": "drzwi.png",
        "broszura_podróżnicza_marzenia.png": "ksiazka.png",
        "rozważanie_podróży_mapy.png": "ksiazka.png",
        "myśl_o_przebaczeniu_refleksja.png": "deszcz_za_oknem_spokój_po_przebaczeniu.png"
    };

    // Funkcja tworząca alternatywne warianty zapisu polskich znaków
    function createAlternateSpellings(names) {
        const alternateMap = {};

        // Mapowania znaków polskich na ich odpowiedniki bez ogonków
        const charMap = {
            'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
            'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
        };

        // Dla każdej nazwy z polskimi znakami tworzymy alternatywny wariant bez ogonków
        names.forEach(name => {
            let simplified = name;

            // Zastępujemy polskie znaki odpowiednikami bez ogonków
            for (const [polish, ascii] of Object.entries(charMap)) {
                simplified = simplified.replace(new RegExp(polish, 'g'), ascii);
            }

            // Jeśli nazwa się zmieniła, dodajemy ją do mapy alternatywnych zapisów
            if (simplified !== name) {
                alternateMap[simplified] = name;
                console.log(`Dodano alternatywny zapis: ${simplified} -> ${name}`);
            }
        });

        return alternateMap;
    }

    // Tworzymy alternatywne warianty zapisu dla dostępnych obrazów
    const alternateSpellings = createAlternateSpellings(availableImages);

    // Normalizacja nazw plików - usuwanie polskich znaków i innych potencjalnych problemów
    function normalizeFileName(filename) {
        return filename
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Usuwanie znaków diakrytycznych
            .replace(/\s+/g, '_') // Zamiana spacji na podkreślniki
            .toLowerCase();
    }

    // Tworzenie znormalizowanych wersji map dla lepszego dopasowania
    const normalizedImageMap = {};
    for (const [key, value] of Object.entries(imageMap)) {
        normalizedImageMap[normalizeFileName(key)] = value;
    }

    // Tworzenie znormalizowanej listy dostępnych obrazów
    const normalizedAvailableImages = availableImages.map(img => normalizeFileName(img));

    // Funkcja znajdująca najlepsze dopasowanie dla nazwy pliku
    function findBestMatch(filename) {
        // 1. Sprawdzamy, czy plik jest bezpośrednio dostępny
        if (availableImages.includes(filename)) {
            return filename;
        }

        // 2. Sprawdzamy, czy istnieje alternatywny zapis z polskimi znakami
        if (alternateSpellings[filename]) {
            return alternateSpellings[filename];
        }

        // 3. Sprawdzamy, czy istnieje bezpośrednie mapowanie
        if (imageMap[filename]) {
            return imageMap[filename];
        }

        // 4. Sprawdzamy znormalizowaną wersję
        const normalizedFilename = normalizeFileName(filename);
        if (normalizedImageMap[normalizedFilename]) {
            return normalizedImageMap[normalizedFilename];
        }

        // 5. Sprawdzamy, czy znormalizowana wersja jest dostępna
        if (normalizedAvailableImages.includes(normalizedFilename)) {
            // Znajdujemy oryginalną wersję z poprawną wielkością liter i znakami
            const index = normalizedAvailableImages.indexOf(normalizedFilename);
            return availableImages[index];
        }

        // 6. Próbujemy znaleźć częściowe dopasowanie w nazwach plików
        for (const key of Object.keys(imageMap)) {
            const keyParts = key.toLowerCase().split(/[_\s-]+/);
            const filenameParts = filename.toLowerCase().split(/[_\s-]+/);

            const commonParts = keyParts.filter(part =>
                part.length > 3 && filenameParts.some(fpart => fpart.includes(part) || part.includes(fpart))
            );

            if (commonParts.length > 0) {
                return imageMap[key];
            }
        }

        // 7. Jeśli wszystko zawiedzie, użyj domyślnego obrazu
        console.log(`Nie znaleziono dopasowania dla: ${filename}, używam domyślnego obrazu`);
        return "swiatlo.png";
    }

    // =========================================================================
    // AGRESYWNE PRZECHWYTYWANIE ŻĄDAŃ HTTP
    // =========================================================================

    // Przechwyć natywny XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        // Sprawdź czy to żądanie dotyczy obrazu
        if (typeof url === 'string' && url.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
            // Znajdź nazwę pliku z URL
            const urlParts = url.split('/');
            const filename = urlParts[urlParts.length - 1];

            // Sprawdź, czy potrzebne jest remapowanie (plik nie jest bezpośrednio dostępny)
            if (!availableImages.includes(filename) && !alternateSpellings[filename]) {
                // Znajdź najlepsze dopasowanie
                const mappedFilename = findBestMatch(filename);

                if (mappedFilename !== filename) {
                    // Zbuduj nowy URL z remapowaną nazwą pliku
                    urlParts[urlParts.length - 1] = mappedFilename;
                    const newUrl = urlParts.join('/');

                    console.log(`Image Remapper XHR: ${filename} -> ${mappedFilename}`);

                    // Wywołaj oryginalną metodę z nowym URL
                    return originalXHROpen.call(this, method, newUrl, async, user, password);
                }
            }
        }

        // Dla wszystkich innych przypadków - standardowe zachowanie
        return originalXHROpen.call(this, method, url, async, user, password);
    };

    // Przechwyć natywny fetch
    const originalFetch = window.fetch;

    window.fetch = function(resource, options) {
        if (typeof resource === 'string' && resource.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
            // Znajdź nazwę pliku z URL
            const urlParts = resource.split('/');
            const filename = urlParts[urlParts.length - 1];

            // Sprawdź, czy potrzebne jest remapowanie (plik nie jest bezpośrednio dostępny)
            if (!availableImages.includes(filename) && !alternateSpellings[filename]) {
                // Znajdź najlepsze dopasowanie
                const mappedFilename = findBestMatch(filename);

                if (mappedFilename !== filename) {
                    // Zbuduj nowy URL z remapowaną nazwą pliku
                    urlParts[urlParts.length - 1] = mappedFilename;
                    const newUrl = urlParts.join('/');

                    console.log(`Image Remapper Fetch: ${filename} -> ${mappedFilename}`);

                    // Wywołaj oryginalny fetch z nowym URL
                    return originalFetch.call(this, newUrl, options);
                }
            }
        }

        // Dla wszystkich innych przypadków - standardowe zachowanie
        return originalFetch.call(this, resource, options);
    };

    // Przechwyć createElement, aby złapać tworzenie elementów img przed dodaniem ich do DOM
    const originalCreateElement = document.createElement;

    document.createElement = function(tagName, options) {
        const element = originalCreateElement.call(this, tagName, options);

        // Jeśli tworzony jest element img, przechwyć ustawianie atrybutu src
        if (tagName.toLowerCase() === 'img') {
            const originalSetAttribute = element.setAttribute;

            element.setAttribute = function(name, value) {
                if (name === 'src' && typeof value === 'string' && value.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
                    // Znajdź nazwę pliku z URL
                    const urlParts = value.split('/');
                    const filename = urlParts[urlParts.length - 1];

                    // Sprawdź, czy potrzebne jest remapowanie (plik nie jest bezpośrednio dostępny)
                    if (!availableImages.includes(filename) && !alternateSpellings[filename]) {
                        // Znajdź najlepsze dopasowanie
                        const mappedFilename = findBestMatch(filename);

                        if (mappedFilename !== filename) {
                            // Zbuduj nowy URL z remapowaną nazwą pliku
                            urlParts[urlParts.length - 1] = mappedFilename;
                            const newValue = urlParts.join('/');

                            console.log(`Image Remapper createElement: ${filename} -> ${mappedFilename}`);

                            // Wywołaj oryginalną metodę z nową wartością
                            return originalSetAttribute.call(this, name, newValue);
                        }
                    }
                }

                // Dla wszystkich innych przypadków - standardowe zachowanie
                return originalSetAttribute.call(this, name, value);
            };

            // Przechwyć bezpośrednie przypisanie do właściwości src
            const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');

            Object.defineProperty(element, 'src', {
                get: function() {
                    return originalSrcDescriptor.get.call(this);
                },
                set: function(value) {
                    if (typeof value === 'string' && value.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
                        // Znajdź nazwę pliku z URL
                        const urlParts = value.split('/');
                        const filename = urlParts[urlParts.length - 1];

                        // Sprawdź, czy potrzebne jest remapowanie (plik nie jest bezpośrednio dostępny)
                        if (!availableImages.includes(filename) && !alternateSpellings[filename]) {
                            // Znajdź najlepsze dopasowanie
                            const mappedFilename = findBestMatch(filename);

                            if (mappedFilename !== filename) {
                                // Zbuduj nowy URL z remapowaną nazwą pliku
                                urlParts[urlParts.length - 1] = mappedFilename;
                                const newValue = urlParts.join('/');

                                console.log(`Image Remapper src property: ${filename} -> ${mappedFilename}`);

                                // Wywołaj oryginalny setter z nową wartością
                                return originalSrcDescriptor.set.call(this, newValue);
                            }
                        }
                    }

                    // Dla wszystkich innych przypadków - standardowe zachowanie
                    return originalSrcDescriptor.set.call(this, value);
                },
                enumerable: originalSrcDescriptor.enumerable,
                configurable: originalSrcDescriptor.configurable
            });
        }

        return element;
    };

    // =========================================================================
    // PATCHOWANIE METOD GRY
    // =========================================================================

    // Funkcja patchująca getImageData w obiekcie gry
    function patchGameMethods() {
        if (!window.game) {
            setTimeout(patchGameMethods, 100);
            return;
        }

        console.log("Image Remapper: Wykryto obiekt gry, patchuję metody...");

        // Patch dla metody getImageData
        if (typeof window.game.getImageData === 'function') {
            const originalGetImageData = window.game.getImageData;

            window.game.getImageData = function(filename) {
                if (!filename) return originalGetImageData.call(this, filename);

                // Sprawdź, czy potrzebne jest remapowanie (plik nie jest bezpośrednio dostępny)
                if (!availableImages.includes(filename) && !alternateSpellings[filename]) {
                    // Znajdź najlepsze dopasowanie
                    const mappedFilename = findBestMatch(filename);

                    if (mappedFilename !== filename) {
                        console.log(`Image Remapper getImageData: ${filename} -> ${mappedFilename}`);
                        return originalGetImageData.call(this, mappedFilename);
                    }
                }

                return originalGetImageData.call(this, filename);
            };

            console.log("Image Remapper: Spatchowano metodę getImageData");
        }

        // Patch dla metody loadScene
        if (typeof window.game.loadScene === 'function') {
            const originalLoadScene = window.game.loadScene;

            window.game.loadScene = function(sceneId) {
                console.log(`Image Remapper: Ładowanie sceny ${sceneId}, przygotowuję patchowanie obrazów...`);

                // Wywołaj oryginalną metodę
                const result = originalLoadScene.call(this, sceneId);

                // Po załadowaniu sceny, znajdź i popraw wszystkie obrazy
                setTimeout(fixAllSceneImages, 50);

                return result;
            };

            console.log("Image Remapper: Spatchowano metodę loadScene");
        }
    }

    // Funkcja naprawiająca wszystkie obrazy w bieżącej scenie
    function fixAllSceneImages() {
        const images = document.querySelectorAll('img');
        let patchedCount = 0;

        images.forEach(img => {
            if (!img.hasAttribute('src')) return;

            const src = img.getAttribute('src');
            if (!src.match(/\.(png|jpg|jpeg|gif|webp)$/i)) return;

            // Znajdź nazwę pliku z URL
            const urlParts = src.split('/');
            const filename = urlParts[urlParts.length - 1];

            // Sprawdź, czy potrzebne jest remapowanie (plik nie jest bezpośrednio dostępny)
            if (!availableImages.includes(filename) && !alternateSpellings[filename]) {
                // Znajdź najlepsze dopasowanie
                const mappedFilename = findBestMatch(filename);

                if (mappedFilename !== filename) {
                    // Zbuduj nowy URL z remapowaną nazwą pliku
                    urlParts[urlParts.length - 1] = mappedFilename;
                    const newSrc = urlParts.join('/');

                    console.log(`Image Remapper fixAllSceneImages: ${filename} -> ${mappedFilename}`);

                    // Ustaw nowy src
                    img.setAttribute('src', newSrc);

                    patchedCount++;
                }
            }
        });

        if (patchedCount > 0) {
            console.log(`Image Remapper: Naprawiono ${patchedCount} obrazów w bieżącej scenie`);
        }
    }

    // =========================================================================
    // OBSŁUGA BŁĘDÓW ŁADOWANIA OBRAZÓW
    // =========================================================================

    // Globalna funkcja obsługi błędów dla obrazów
    function setupGlobalErrorHandler() {
        window.addEventListener('error', function(event) {
            const target = event.target;

            // Sprawdź, czy to błąd ładowania obrazu
            if (target && target.tagName === 'IMG' && target.src) {
                // Znajdź nazwę pliku z URL
                const urlParts = target.src.split('/');
                const filename = urlParts[urlParts.length - 1];

                // Nie próbujemy ponownie, jeśli obraz już był przetwarzany
                if (target.hasAttribute('data-remapped')) return;

                // Znajdź najlepsze dopasowanie
                const mappedFilename = findBestMatch(filename);

                if (mappedFilename !== filename) {
                    // Zbuduj nowy URL z remapowaną nazwą pliku
                    urlParts[urlParts.length - 1] = mappedFilename;
                    const newSrc = urlParts.join('/');

                    console.log(`Image Remapper errorHandler: ${filename} -> ${mappedFilename}`);

                    // Ustaw nowy src i oznacz obraz jako przetworzony
                    target.setAttribute('data-remapped', 'true');
                    target.src = newSrc;

                    // Zatrzymaj propagację błędu
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        }, true);

        console.log("Image Remapper: Skonfigurowano globalny handler błędów dla obrazów");
    }

    // =========================================================================
    // INICJALIZACJA
    // =========================================================================

    // Główna funkcja inicjalizująca
    function initialize() {
        console.log("Image Remapper: Inicjalizacja wersji 1.2.0");

        // Wyświetl listę dostępnych obrazów
        console.log("Dostępne obrazy:", availableImages);

        // Wyświetl alternatywne zapisy
        console.log("Alternatywne zapisy:", alternateSpellings);

        // Ustaw obsługę błędów
        setupGlobalErrorHandler();

        // Patch metod gry (asynchronicznie)
        setTimeout(patchGameMethods, 10);

        // Napraw istniejące obrazy
        setTimeout(fixAllSceneImages, 100);

        // Regularnie sprawdzaj nowe obrazy (na wszelki wypadek)
        setInterval(fixAllSceneImages, 1000);
    }

    // =========================================================================
    // INTERFEJS PUBLICZNY
    // =========================================================================

    // Udostępnienie publicznego API
    window.imageRemapper = {
        // Metoda zwracająca mapowanie dla pliku
        getMapping: function(filename) {
            return findBestMatch(filename);
        },

        // Metoda zwracająca wszystkie mapowania
        getAllMappings: function() {
            return {...imageMap};
        },

        // Wymuszenie naprawy wszystkich obrazów
        fixAllImages: function() {
            fixAllSceneImages();
            return "Naprawiono wszystkie obrazy";
        },

        // Sprawdzenie czy plik jest dostępny
        isImageAvailable: function(filename) {
            return availableImages.includes(filename) || alternateSpellings[filename] !== undefined;
        },

        // Generowanie Debug info
        getDebugInfo: function() {
            return {
                availableImages: [...availableImages],
                alternateSpellings: {...alternateSpellings},
                normalizedNames: availableImages.map(img => ({
                    original: img,
                    normalized: normalizeFileName(img)
                }))
            };
        },

        // Wersja remappera
        version: "1.2.0"
    };

    // Uruchom inicjalizację
    initialize();
})();