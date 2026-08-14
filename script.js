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

    const qrScanScreen = document.getElementById('qrScanScreen'); // ÚJ: QR Scan képernyő
    const replayQrMusicBtn = document.getElementById('replayQrMusicBtn'); // ÚJ: Újrajátszás gomb
    const backToMainMenuFromQrBtn = document.getElementById('backToMainMenuFromQr'); // ÚJ: Vissza a főmenübe gomb

    // --- Játék állapot változók ---
    const gameSettings = {
        listeningTime: '45',
        musicStyle: 'POP',
        songCount: '50'
    };
    let currentSong = null;
    let spotifyIframe = null;
    let playbackInterval = null;

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
        spotifyIframe.src = `https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0&autoplay=1`;
        spotifyIframe.width = "100%";
        spotifyIframe.height = "80";
        spotifyIframe.frameBorder = "0";
        spotifyIframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
        spotifyIframe.loading = "lazy";

        spotifyPlayerPlaceholder.innerHTML = '';
        spotifyPlayerPlaceholder.appendChild(spotifyIframe);
        playMusicBtn.disabled = true;
        pauseMusicBtn.disabled = false;
    }

    // Lejátszás időzítő indítása (MOCK)
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

    // Főmenü - QR-kód olvasás (átvezet a QR Scan képernyőre)
    qrScanBtn.addEventListener('click', () => {
        alert('A QR-kód olvasó funkció fejlesztés alatt áll. Egyelőre egy mock képet látsz.');
        // TODO: Később itt kellene indítani a valós QR kód olvasót
        showScreen('qrScanScreen');
    });

    // Főmenü - Telefonos játék (átvezet a Beállítások képernyőre)
    phoneGameBtn.addEventListener('click', () => {
        showScreen('settingsScreen');
    });

    // Főmenü - Eredmények
    resultsBtn.addEventListener('click', () => {
        alert('Eredmények oldal betöltése... (Funkcionalitás később)');
        // showScreen('resultsScreen');
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
        currentSong = songsData.find(song => song.ID === 'RO001'); // prototípushoz fix RO001

        if (currentSong) {
            console.log("Aktuális dal:", currentSong);
            displayArtist.textContent = `Előadó: ???`;
            displayTitle.textContent = `Dal címe: ???`;
            displayYear.textContent = `Megjelenés éve: ????`;
            displayArtist.classList.remove('active');
            displayTitle.classList.remove('active');
            displayYear.classList.remove('active');
            yearGuessInput.value = '';

            loadSpotifyPlayer(currentSong['Spotify ID']);
            startPlaybackTimer();
            showScreen('gameScreen');
        } else {
            alert('Hiba: Az RO001 dal nem található az adatbázisban.');
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

        showAnswer();
        stopPlaybackTimer();

        if (currentSong && guessedYear === currentSong['Megjelenési év']) {
            alert('Helyes megfejtés! Gratulálok!');
        } else {
            alert(`Helytelen megfejtés! A helyes év: ${currentSong['Megjelenési év']}`);
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
        // Itt kellene újra betölteni és elindítani a dalt a QR kód alapján
    });

    // QR Scan képernyő - Vissza a Főmenübe
    backToMainMenuFromQrBtn.addEventListener('click', () => {
        showScreen('mainMenuScreen');
    });
});
