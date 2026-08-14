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
    // const playMusicBtn = document.getElementById('playMusicBtn'); // Eltávolítva
    // const pauseMusicBtn = document.getElementById('pauseMusicBtn'); // Eltávolítva
    const remainingTimeSlider = document.getElementById('remainingTimeSlider');
    const timeRemainingText = document.getElementById('timeRemainingText');
    const guessArtistInput = document.getElementById('guessArtistInput'); // ÚJ
    const guessTitleInput = document.getElementById('guessTitleInput');   // ÚJ
    const yearGuessInput = document.getElementById('yearGuessInput');     // NEVEZVE
    const checkAnswerBtn = document.getElementById('checkAnswerBtn');
    const backToMainMenuFromGameBtn = document.getElementById('backToMainMenuFromGame');

    const qrScanScreen = document.getElementById('qrScanScreen');
    const replayQrMusicBtn = document.getElementById('replayQrMusicBtn');
    const backToMainMenuFromQrBtn = document.getElementById('backToMainMenuFromQr');

    const resultsScreen = document.getElementById('resultsScreen');
    const currentScoreDisplay = document.getElementById('currentScore');
    const bestScoreDisplay = document.getElementById('bestScore');
    const backToMainMenuFromResultsBtn = document.getElementById('backToMainMenuFromResults');

    // Modál elemek
    const scoreModal = document.getElementById('scoreModal');
    const modalSongTitle = document.getElementById('modalSongTitle');
    const modalArtist = document.getElementById('modalArtist');
    const modalYear = document.getElementById('modalYear');
    const guessedTitleCheckbox = document.getElementById('guessedTitle');
    const guessedArtistCheckbox = document.getElementById('guessedArtist');
    const guessedYearCheckbox = document.getElementById('guessedYear');
    const submitScoreBtn = document.getElementById('submitScoreBtn');


    // --- Játék állapot változók ---
    const gameSettings = {
        listeningTime: '45',
        musicStyle: 'ALL',
        songCount: '50'
    };
    let currentSong = null;
    let spotifyIframe = null;
    let playbackInterval = null;
    let currentScore = 0;
    let bestScore = localStorage.getItem('robaMusicBestScore') || 0;

    bestScoreDisplay.textContent = bestScore;


    // --- Dal adatbázis betöltése ---
    async function loadSongsData() {
        try {
            const response = await fetch('./assets/songs.json');
            if (!response.ok) {
                throw new Error(`HTTP hiba! Státusz: ${response.status}`);
            }
            songsData = await response.json();
            isSongsDataLoaded = true;
            console.log("Dal adatok sikeresen betöltve:", songsData.length, "dal.");
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
        // data-skip-spotify-uri="true" attribútum a dal info elrejtéséhez
        spotifyIframe.src = `https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0&autoplay=1`;
        spotifyIframe.width = "100%";
        spotifyIframe.height = "80";
        spotifyIframe.frameBorder = "0";
        spotifyIframe.setAttribute('data-skip-spotify-uri', 'true'); // EZ AZ A FONTOS ATTRIBÚTUM!
        spotifyIframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
        spotifyIframe.loading = "lazy";

        spotifyPlayerPlaceholder.innerHTML = '';
        spotifyPlayerPlaceholder.appendChild(spotifyIframe);
        // Play/Pause gombok elrejtve a HTML-ből, így nincs szükség disabled beállításra
    }

    // Lejátszás időzítő indítása
    function startPlaybackTimer() {
        clearInterval(playbackInterval);

        let duration = parseInt(gameSettings.listeningTime);
        if (gameSettings.listeningTime === 'full') {
             duration = 90;
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
                // Amikor az idő lejár, automtikusan meghívjuk a válasz ellenőrzését
                // De most az "önbevallás" miatt nem automtikus, hanem gombnyomásra
                // checkAnswerBtn.click(); // Automatikus kattintás a megfejtés gombra
            }
        }, 1000);
    }

    // Lejátszás időzítő leállítása
    function stopPlaybackTimer() {
        clearInterval(playbackInterval);
    }

    // Válasz megjelenítése (erre már nincs szükség, mert a modálban jelenik meg a helyes válasz)
    /* function showAnswer() {
        if (currentSong) {
            displayArtist.textContent = `Előadó: ${currentSong.Előadó}`;
            displayTitle.textContent = `Dal címe: ${currentSong['Dal címe']}`;
            displayYear.textContent = `Megjelenés éve: ${currentSong['Megjelenési év']}`;

            displayArtist.classList.add('active');
            displayTitle.classList.add('active');
            displayYear.classList.add('active');
        }
    } */

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

        // --- Játék előkészítése ---
        let availableSongs = songsData;

        // Szűrés kategória szerint
        if (gameSettings.musicStyle !== 'ALL') {
            availableSongs = availableSongs.filter(song => song.Kategória === gameSettings.musicStyle);
        }

        // Szűrés aktív státusz szerint
        availableSongs = availableSongs.filter(song => song.Aktív === 'Igen');

        if (availableSongs.length === 0) {
            alert('Nincs elérhető dal a kiválasztott kategóriában. Kérjük, módosítsa a beállításokat!');
            return;
        }

        let songsToPickFrom = availableSongs;
        if (gameSettings.songCount !== 'all' && parseInt(gameSettings.songCount) < availableSongs.length) {
            songsToPickFrom = availableSongs
                .sort(() => 0.5 - Math.random())
                .slice(0, parseInt(gameSettings.songCount));
        }

        currentSong = songsToPickFrom[Math.floor(Math.random() * songsToPickFrom.length)];

        if (currentSong) {
            console.log("Aktuális dal:", currentSong);
            // Input mezők ürítése
            guessArtistInput.value = '';
            guessTitleInput.value = '';
            yearGuessInput.value = '';
            // Előző körből maradt megfejtett infók törlése
            displayArtist.textContent = `Előadó: ???`;
            displayTitle.textContent = `Dal címe: ???`;
            displayYear.textContent = `Megjelenés éve: ????`;
            displayArtist.classList.remove('active');
            displayTitle.classList.remove('active');
            displayYear.classList.remove('active');
            // Gombok és input mezők visszaállítása
            checkAnswerBtn.disabled = false;
            guessArtistInput.disabled = false;
            guessTitleInput.disabled = false;
            yearGuessInput.disabled = false;


            currentScore = 0; // Játék indításakor a pontszám nullázása

            loadSpotifyPlayer(currentSong['Spotify ID']);
            startPlaybackTimer();
            showScreen('gameScreen');
        } else {
            alert('Hiba: Nem sikerült dalt választani a megadott beállításokkal. Ellenőrizze a songsData-t és a szűrési logikát.');
        }
    });

    // Játék képernyő - Válasz ellenőrzése
    checkAnswerBtn.addEventListener('click', () => {
        stopPlaybackTimer(); // Leállítjuk az időzítőt

        // Megjelenítjük a helyes dal infókat a modálban
        modalSongTitle.textContent = currentSong['Dal címe'];
        modalArtist.textContent = currentSong.Előadó;
        modalYear.textContent = currentSong['Megjelenési év'];

        // Visszaállítjuk a checkboxokat alaphelyzetbe
        guessedTitleCheckbox.checked = false;
        guessedArtistCheckbox.checked = false;
        guessedYearCheckbox.checked = false;

        // Megjelenítjük a modált
        scoreModal.classList.remove('hidden');

        // Input mezők letiltása amíg a modál nyitva van
        guessArtistInput.disabled = true;
        guessTitleInput.disabled = true;
        yearGuessInput.disabled = true;
        checkAnswerBtn.disabled = true;
    });

    // Pontszám rögzítése gomb eseménykezelője a modálban
    submitScoreBtn.addEventListener('click', () => {
        let scoreForThisRound = 0;

        if (guessedTitleCheckbox.checked) {
            scoreForThisRound += 1;
        }
        if (guessedArtistCheckbox.checked) {
            scoreForThisRound += 1;
        }
        if (guessedYearCheckbox.checked) {
            scoreForThisRound += 1;
        }

        currentScore += scoreForThisRound;
        if (currentScore > bestScore) {
            bestScore = currentScore;
            localStorage.setItem('robaMusicBestScore', bestScore);
        }

        // Elrejtjük a modált
        scoreModal.classList.add('hidden');

        // Megjelenítjük a helyes választ a játék képernyőn
        displayArtist.textContent = `Előadó: ${currentSong.Előadó}`;
        displayTitle.textContent = `Dal címe: ${currentSong['Dal címe']}`;
        displayYear.textContent = `Megjelenés éve: ${currentSong['Megjelenési év']}`;
        displayArtist.classList.add('active');
        displayTitle.classList.add('active');
        displayYear.classList.add('active');

        alert(`Eredmény: +${scoreForThisRound} pont! Aktuális pontszám: ${currentScore}`);

        // A játék képernyő gombjait újraaktiváljuk a következő dalhoz (vagy befejezéshez)
        // checkAnswerBtn.disabled = false; // Ezt a gombot le is tilthatjuk a kör végén
        // guessArtistInput.disabled = false;
        // guessTitleInput.disabled = false;
        // yearGuessInput.disabled = false;
        // Javaslat: ide egy "Következő dal" vagy "Játék vége" gomb jönne, nem az inputok engedélyezése.
        // Egyelőre a Vissza a Főmenübe gomb működik.
    });


    // Játék képernyő - Vissza a Főmenübe
    backToMainMenuFromGameBtn.addEventListener('click', () => {
        stopPlaybackTimer();
        if (spotifyIframe) {
            spotifyIframe.remove();
            spotifyIframe = null;
        }
        // checkAnswerBtn.disabled = false; // Ne aktiváljuk, ha a kör lezárult
        // guessArtistInput.disabled = false; // Ne aktiváljuk
        // guessTitleInput.disabled = false; // Ne aktiváljuk
        // yearGuessInput.disabled = false; // Ne aktiváljuk
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
