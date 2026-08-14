let songsData = [];
let isSongsDataLoaded = false;

document.addEventListener('DOMContentLoaded', async () => {
    // --- Képernyő elemek ---
    const splashScreen = document.getElementById('splashScreen');
    const spotifyConnectBtn = document.getElementById('spotifyConnectBtn');
    const spotifyStatus = document.getElementById('spotifyStatus');
    const startGameBtn = document.getElementById('startGameBtn');

    const mainMenuScreen = document.getElementById('mainMenuScreen');
    const qrScanBtn = document.getElementById('qrScanBtn');
    const phoneGameBtn = document.getElementById('phoneGameBtn');
    const resultsBtn = document.getElementById('resultsBtn');

    const settingsScreen = document.getElementById('settingsScreen');
    const startPhoneGameBtn = document.getElementById('startPhoneGameBtn');
    const backToMainMenuFromSettingsBtn = document.getElementById('backToMainMenuFromSettings');
    const settingOptionButtons = document.querySelectorAll('.setting-option-button');

    const gameScreen = document.getElementById('gameScreen');
    const displayArtist = document.getElementById('displayArtist');
    const displayTitle = document.getElementById('displayTitle');
    const displayYear = document.getElementById('displayYear');
    const spotifyPlayerPlaceholder = document.getElementById('spotifyPlayerPlaceholder');
    const playMusicBtn = document.getElementById('playMusicBtn');
    const pauseMusicBtn = document.getElementById('pauseMusicBtn');
    const remainingTimeSlider = document.getElementById('remainingTimeSlider');
    const timeRemainingText = document.getElementById('timeRemainingText');
    const yearGuessInput = document.getElementById('yearGuess');
    const checkAnswerBtn = document.getElementById('checkAnswerBtn');
    const backToMainMenuFromGameBtn = document.getElementById('backToMainMenuFromGame');

    const qrScanScreen = document.getElementById('qrScanScreen');
    const replayQrMusicBtn = document.getElementById('replayQrMusicBtn');
    const backToMainMenuFromQrBtn = document.getElementById('backToMainMenuFromQr');

    const resultsScreen = document.getElementById('resultsScreen');
    const currentScoreDisplay = document.getElementById('currentScore');
    const bestScoreDisplay = document.getElementById('bestScore');
    const backToMainMenuFromResultsBtn = document.getElementById('backToMainMenuFromResults');

    // --- Játék állapot változók ---
    const gameSettings = {
        listeningTime: '45',
        musicStyle: 'ALL',   // Alapértelmezett: ÖSSZES KATEGÓRIA
        songCount: '50'      // Alapértelmezett: 50 dal
    };
    let currentSong = null;
    let spotifyIframe = null;
    let playbackInterval = null;
    let currentScore = 0; // Aktuális pontszám
    let bestScore = localStorage.getItem('robaMusicBestScore') || 0; // Legjobb pontszám localStorage-ből

    bestScoreDisplay.textContent = bestScore;


    // --- Dal adatbázis betöltése ---
    async function loadSongsData() {
        try {
            const response = await fetch('./assets/songs.json'); // Elérési út a songs.json fájlhoz
            if (!response.ok) {
                throw new Error(`HTTP hiba! Státusz: ${response.status}`);
            }
            songsData = await response.json();
            isSongsDataLoaded = true;
            console.log("Dal adatok sikeresen betöltve:", songsData.length, "dal.");
            // Ha a Spotify már csatlakoztatva van, engedélyezzük a játék indítását
            if (spotifyStatus.textContent === 'Spotify csatlakoztatva!') {
                startGameBtn.disabled = false;
            }
        } catch (error) {
            console.error("Hiba a dal adatok betöltésekor:", error);
            spotifyStatus.textContent = "Hiba a dal adatok betöltésekor. Kérjük, próbálja újra később.";
        }
    }

    // A script betöltésekor azonnal megpróbáljuk betölteni a dal adatokat
    loadSongsData();

    // --- Segéd függvények ---

    // Képernyőváltó funkció
    function showScreen(screenId) {
        document.querySelectorAll('.game-container').forEach(screen => {
            screen.classList.add('hidden');
        });
        document.getElementById(screenId).classList.remove('hidden');
    }

    // Spotify lejátszó iframe betöltése
    function loadSpotifyPlayer(spotifyId) {
        if (spotifyIframe) {
            spotifyIframe.remove();
            spotifyIframe = null;
        }

        spotifyIframe = document.createElement('iframe');
        spotifyIframe.src = `https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0&autoplay=1`; // autoplay hozzáadva
        spotifyIframe.width = "100%";
        spotifyIframe.height = "80"; // Kisebb magasság a kompakt lejátszóhoz
        spotifyIframe.frameBorder = "0";
        spotifyIframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
        spotifyIframe.loading = "lazy";

        spotifyPlayerPlaceholder.innerHTML = '';
        spotifyPlayerPlaceholder.appendChild(spotifyIframe);
        // A lejátszás gombokat engedélyezzük, de valójában az iframe tartalmazza a vezérlőket
        // Ezek a gombok most csak jelzik, hogy lenne ilyen funkcionalitás, de nem vezérlik az iframe-t közvetlenül
        playMusicBtn.disabled = true; // Az autoplay miatt alapból elindul
        pauseMusicBtn.disabled = false; // A lejátszóban van pause gomb
    }

    // Lejátszás időzítő indítása
    function startPlaybackTimer() {
        clearInterval(playbackInterval);

        let duration = parseInt(gameSettings.listeningTime);
        if (gameSettings.listeningTime === 'full') {
             duration = 90; // Prototípusnál fix 90 mp a "teljes dal"
        }

        let timeLeft = duration;
        remainingTimeSlider.max = duration;
        remainingTimeSlider.value = timeLeft;

        function updateTimerDisplay() {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timeRemainingText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            remainingTimeSlider.value = timeLeft;
        }

        updateTimerDisplay();

        playbackInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();

            if (timeLeft <= 0) {
                clearInterval(playbackInterval);
                timeRemainingText.textContent = "Idő lejárt!";
                // Opcionálisan: showAnswer(); // Lejátszási idő lejártakor automatikus megfejtés
                // Vagy: autoCheckAnswer(); // ha van rá külön logika
            }
        }, 1000);
    }

    // Lejátszás időzítő leállítása
    function stopPlaybackTimer() {
        clearInterval(playbackInterval);
    }

    // Válasz megjelenítése
    function showAnswer() {
        if (currentSong) {
            displayArtist.textContent = `Előadó: ${currentSong.Előadó}`;
            displayTitle.textContent = `Dal címe: ${currentSong['Dal címe']}`;
            displayYear.textContent = `Megjelenés éve: ${currentSong['Megjelenési év']}`;

            displayArtist.classList.add('active');
            displayTitle.classList.add('active');
            displayYear.classList.add('active');
        }
    }

    // --- Eseménykezelők ---

    // Spotify csatlakoztatása
    spotifyConnectBtn.addEventListener('click', () => {
        spotifyConnectBtn.disabled = true;
        spotifyStatus.textContent = 'Csatlakozás Spotifyhoz...';
        setTimeout(() => {
            spotifyStatus.textContent = 'Spotify csatlakoztatva!';
            if (isSongsDataLoaded) {
                startGameBtn.disabled = false;
            }
            spotifyConnectBtn.style.display = 'none';
        }, 2000);
    });

    // Játék indítása (Kezdőképernyőről a Főmenübe)
    startGameBtn.addEventListener('click', () => {
        showScreen('mainMenuScreen');
    });

    // Főmenü - QR-kód olvasás
    qrScanBtn.addEventListener('click', () => {
        alert('A QR-kód olvasó funkció fejlesztés alatt áll. Egyelőre egy mock képet látsz.');
        showScreen('qrScanScreen');
    });

    // Főmenü - Telefonos játék (átvezet a Beállítások képernyőre)
    phoneGameBtn.addEventListener('click', () => {
        showScreen('settingsScreen');
    });

    // Főmenü - Eredmények (átvezet az Eredmények képernyőre)
    resultsBtn.addEventListener('click', () => {
        currentScoreDisplay.textContent = currentScore;
        bestScoreDisplay.textContent = bestScore;
        showScreen('resultsScreen');
    });

    // Beállítások képernyő - Vissza a Főmenübe
    backToMainMenuFromSettingsBtn.addEventListener('click', () => {
        showScreen('mainMenuScreen');
    });

    // Beállítási opciók kiválasztása
    settingOptionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const settingType = button.dataset.setting;
            const settingValue = button.dataset.value;

            // Csak az adott beállítási kategória gombjait tesszük "selected" állapotba
            document.querySelectorAll(`.setting-option-button[data-setting="${settingType}"]`).forEach(btn => {
                btn.classList.remove('selected');
            });
            button.classList.add('selected');
            gameSettings[settingType] = settingValue;
            console.log('Aktuális beállítások:', gameSettings);
        });
    });

    // Beállítások képernyő - Játék kezdése (telefonos játék)
    startPhoneGameBtn.addEventListener('click', () => {
        if (!isSongsDataLoaded) {
            alert('A dal adatok még nem töltődtek be. Kérjük, várjon!');
            return;
        }

        // --- Dal kiválasztása a beállítások alapján ---
        let availableSongs = songsData;

        // Szűrés kategória szerint
        if (gameSettings.musicStyle !== 'ALL') {
            availableSongs = availableSongs.filter(song => song.Kategória === gameSettings.musicStyle);
        }

        // Szűrés aktív státusz szerint
        availableSongs = availableSongs.filter(song => song.Aktív === 'Igen');

        // Ellenőrzés, hogy van-e elérhető dal
        if (availableSongs.length === 0) {
            alert('Nincs elérhető dal a kiválasztott kategóriában. Kérjük, módosítsa a beállításokat!');
            return;
        }

        // Dalok számának korlátozása és véletlenszerű kiválasztás
        let songsToPickFrom = availableSongs;
        if (gameSettings.songCount !== 'all' && parseInt(gameSettings.songCount) < availableSongs.length) {
            songsToPickFrom = availableSongs
                .sort(() => 0.5 - Math.random()) // Shuffle
                .slice(0, parseInt(gameSettings.songCount));
        }

        // Véletlenszerű dal kiválasztása a szűrt listából
        currentSong = songsToPickFrom[Math.floor(Math.random() * songsToPickFrom.length)];

        if (currentSong) {
            console.log("Aktuális dal:", currentSong);
            displayArtist.textContent = `Előadó: ???`;
            displayTitle.textContent = `Dal címe: ???`;
            displayYear.textContent = `Megjelenés éve: ????`;
            displayArtist.classList.remove('active');
            displayTitle.classList.remove('active');
            displayYear.classList.remove('active');
            yearGuessInput.value = '';
            currentScore = 0; // Játék indításakor a pontszám nullázása

            loadSpotifyPlayer(currentSong['Spotify ID']);
            startPlaybackTimer();
            showScreen('gameScreen');
        } else {
            alert('Hiba: Nem sikerült dalt választani a megadott beállításokkal. Ellenőrizze a songsData-t és a szűrési logikát.');
        }
    });

    // Játék képernyő - Zene lejátszása (MOCK)
    playMusicBtn.addEventListener('click', () => {
        alert('Az Spotify lejátszó automatikusan elindul. A gombok csak jelzik a funkciót.');
    });

    // Játék képernyő - Zene leállítása (MOCK)
    pauseMusicBtn.addEventListener('click', () => {
        alert('Az Spotify lejátszó automatikusan elindul. A gombok csak jelzik a funkciót.');
    });

    // Játék képernyő - Válasz ellenőrzése
    checkAnswerBtn.addEventListener('click', () => {
        const guessedYear = parseInt(yearGuessInput.value);
        if (isNaN(guessedYear)) {
            alert('Kérlek, adj meg egy érvényes évszámot!');
            return;
        }

        stopPlaybackTimer(); // Leállítjuk az időzítőt, ha tippeltek

        // --- Pontozás implementálása ---
        let scoreForThisRound = 0;
        let yearScore = 0;
        // Az előadó és dalcím pontszámát is hozzáadjuk, ha majd lesznek hozzá input mezők
        // let artistScore = 0;
        // let titleScore = 0;

        // Évszám pontozás
        if (currentSong) {
            const yearDifference = Math.abs(currentSong['Megjelenési év'] - guessedYear);
            if (yearDifference === 0) {
                yearScore = 10;
            } else if (yearDifference <= 2) { // +/- 2 év
                yearScore = 5;
            } else {
                yearScore = 0;
            }
        }
        scoreForThisRound += yearScore;

        showAnswer(); // Megjelenítjük a helyes adatokat

        alert(`Játék vége!\nTipped év: ${guessedYear}\nHelyes év: ${currentSong['Megjelenési év']}\nPontszám az évszámért: ${yearScore}`);

        currentScore += scoreForThisRound;
        if (currentScore > bestScore) {
            bestScore = currentScore;
            localStorage.setItem('robaMusicBestScore', bestScore);
        }

        checkAnswerBtn.disabled = true;
        yearGuessInput.disabled = true;
    });

    // Játék képernyő - Vissza a Főmenübe
    backToMainMenuFromGameBtn.addEventListener('click', () => {
        stopPlaybackTimer();
        if (spotifyIframe) {
            spotifyIframe.remove();
            spotifyIframe = null;
        }
        playMusicBtn.disabled = true;
        pauseMusicBtn.disabled = true;
        checkAnswerBtn.disabled = false;
        yearGuessInput.disabled = false;
        showScreen('mainMenuScreen');
    });

    // QR Scan képernyő - Újrajátszás (MOCK)
    replayQrMusicBtn.addEventListener('click', () => {
        alert('Zene újrajátszása a QR kód alapján (funkcionalitás később).');
    });

    // QR Scan képernyő - Vissza a Főmenübe
    backToMainMenuFromQrBtn.addEventListener('click', () => {
        showScreen('mainMenuScreen');
    });

    // Eredmények képernyő - Vissza a Főmenübe
    backToMainMenuFromResultsBtn.addEventListener('click', () => {
        showScreen('mainMenuScreen');
    });
});
