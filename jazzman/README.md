# Super Jazzman 3.0

Generatywny zespół jazzowy w przeglądarce: fortepian, kontrabas, perkusja i trąbka
syntezowane w Web Audio API, grające kompletne, ustrukturyzowane utwory.

## Uruchamianie

Aplikacja używa modułów ES, więc wymaga serwera HTTP (nie zadziała z `file://`):

```
npx http-server .        # albo dowolny inny serwer statyczny
```

i otwórz `index.html`. Kliknij **Aktywuj audio**, potem **Start**.

## Jak powstaje muzyka

Kompozycją zajmuje się `js/modules/jazzBrain.js` — czysty moduł (bez DOM i Web Audio),
który generuje cały występ z góry, jako listę zdarzeń na wspólnej siatce beatów:

- **Forma utworu** — prawdziwe progresje z harmoniką funkcyjną: 12-taktowy blues,
  bebop blues, rhythm changes (AABA) i forma modalna à la "So What"; losowa tonacja.
- **Struktura występu** — Intro → Temat → Solo trąbki → Solo fortepianu →
  Czwórki z perkusją (w feelu swingowym) → Temat (finał) → Koda z fermatą.
  Po kodzie generowany jest kolejny utwór.
- **Chwytliwy temat** — jeden synkopowany hak rytmiczny na cały chorus
  (powtórzenie = chwytliwość), kontury z powtarzanym dźwiękiem, naprzemienne
  frazy pytanie-odpowiedź dopasowywane do akordów; w bluesie kolor skali
  bluesowej tonacji.
- **Dramaturgia** — temat grany "w dwójce" (półnuty basu), sola przechodzą na
  walking (lift), kolejne chorusy podnoszą rejestr, gęstość i dynamikę; za solem
  fortepianu tła długich dźwięków trąbki.
- **Walking bass** — ćwierćnuty prowadzące krokami po skali do prymy *następnego*
  akordu, z chromatyczną nutą podejściową na czwartym beacie.
- **Comping fortepianu** — bezkorzeniowe voicingi (3-5-7-9 itd.) dobierane
  voice leadingiem, rytmy typu Charleston, antycypacje, czasem substytut
  trytonowy w pushu.
- **Improwizacja** — frazy z oddechami, celowanie w tercje/septymy na zmianach
  akordów, bebopowe obiegniki (enclosures) przed celami, wstawki double-time,
  motywy call & response, scoop i fall trąbki, łuk dynamiczny frazy.
- **Perkusja jazzowa** — syntezowany talerz ride (nieharmoniczne partiale +
  shimmer) z wariantami "ding ding-ga-ding", hi-hat nogą na 2 i 4, feathering
  stopy, comping werbla, fille na końcach fraz, solówki w czwórkach, crash na
  początkach chorusów.
- **Rozwój motywiczny** — pierwsza fraza solówki staje się motywem (rytm +
  kontur interwałowy), rozwijanym przez powtórzenie w nowej harmonii, inwersję,
  fragmentację i przesunięcie rytmiczne; frazy naprzemiennie "pytają" (finał
  na 9/b7) i "odpowiadają" (finał na 3/1/5).
- **Interakcja zespołu** — perkusja zna granice fraz solisty: akcentuje ich
  końce dzwonem ride'u i gra "setup" werbla przed wejściem kolejnej frazy;
  w ostatnim chorusie comping przechodzi na alterowane dominanty.
- **Warianty aranżu** — intro rytmiczne albo perkusyjne (4 takty samych
  bębnów), opcjonalny tag (powtórzony turnaround) przed kodą.
- **Wspólny swing** — jeden współczynnik swingu (zależny od tempa) stosowany do
  wszystkich instrumentów przy zamianie beatów na sekundy; do tego humanizacja
  timingu (kilka ms) i dynamiki.

## Synteza (bez sampli)

- **Kontrabas**: model fizyczny Karplus-Strong - pętla opóźnienia z tłumieniem
  wzbudzana impulsem szumu, plus sub-sinus, rezonans pudła i tąpnięcie palca.
- **Fortepian**: synteza addytywna - partiale o rozciągniętym stroju
  (inharmoniczność struny), każdy z własnym wykładniczym zanikiem, rozstrojone
  bliźniaki (dudnienie chóru strun) i szum młoteczka.
- **Trąbka**: 2-operatorowa synteza FM (ratio 1:1) z kopertą indeksu modulacji
  ("blask" rośnie z atakiem i dynamiką), waveshaper, kopertowany lowpass,
  chiff oddechu, scoop i fall.
- **Ride**: nieharmoniczne partiale talerza + wąskopasmowy shimmer + klik
  pałki; osobny tryb dzwonu (bell) do akcentów.
- **Miks**: rozstawienie stereo jak na scenie (fortepian z lewej, perkusja
  z prawej, bas w centrum), kanałowe EQ, reverb i kompresja.

Występ jest deterministyczny dla danego seeda, dzięki czemu da się go testować.

`main.js` tylko planuje wygenerowane zdarzenia w sekwencerze (`sequencer.js`)
i odtwarza je na instrumentach z `audioSynthesis.js` — zawsze z czasem podanym
przez sekwencer, żeby cały zespół trzymał wspólny groove.

## Testy

```
node --test tests/jazzBrain.test.mjs
```

Testy sprawdzają muzyczne niezmienniki: strukturę sekcji, siatkę rytmiczną ride'u
i basu, prowadzenie basu do następnego taktu, zakresy i voice leading voicingów,
frazowanie solisty (pauzy!), powtórkę tematu w finale i determinizm.

## Uwagi

- `js/jazzman.js` to martwa, starsza implementacja — nie jest ładowana przez
  `index.html` (jedynym punktem wejścia jest `js/main.js`).
- Tryb AUTO-JAZZ steruje nastrojem i miksem; zmiany tempa/stylu zgłaszane przez
  AutoJazz wchodzą w życie od następnego utworu, żeby nie łamać formy w trakcie.
