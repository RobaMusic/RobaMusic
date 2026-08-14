let songsData = []; // songsData-t most üres tömbként deklaráljuk
let isSongsDataLoaded = false; // Jelző, hogy az adatok betöltődtek-e

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

    // --- Játék állapot változók ---
    const gameSettings = {
        listeningTime: '45', // Alapértelmezett: 45 mp
        musicStyle: 'POP',   // Alapértelmezett: POP
        songCount: '50'      // Alapértelmezett: 50 dal
    };
    let currentSong = null; // Az aktuálisan játszott dal objektuma
    let spotifyIframe = null; // A Spotify iframe objektuma
    let playbackInterval = null; // Az időzítő intervallum

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
        // Fontos: a Spotify embed URL-jét módosítani kell, hogy a play gombok működjenek
        // A standard embed lejátszó nem vezérelhető JS-ből közvetlenül, ha nincs Premium előfizetés
        // Ezért a play/pause gombok csak mock-ként szolgálnak itt.
        spotifyIframe.src = `https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0&autoplay=1`; // autoplay hozzáadva
        spotifyIframe.width = "100%";
        spotifyIframe.height = "80";
        spotifyIframe.frameBorder = "0";
        spotifyIframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
        spotifyIframe.loading = "lazy";

        spotifyPlayerPlaceholder.innerHTML = '';
        spotifyPlayerPlaceholder.appendChild(spotifyIframe);
        // spotifyPlayerPlaceholder.classList.remove('spotify-player-placeholder'); // Ezt már nem vesszük ki, mert az iframe helyettesíti

        // A lejátszás gombokat engedélyezzük, de valójában az iframe tartalmazza a vezérlőket
        // Ezek a gombok most csak jelzik, hogy lenne ilyen funkcionalitás, de nem vezérlik az iframe-t közvetlenül
        playMusicBtn.disabled = true; // Az autoplay miatt alapból elindul
        pauseMusicBtn.disabled = false; // A lejátszóban van pause gomb
    }

    // Lejátszás időzítő indítása (MOCK)
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
                // showAnswer(); // Lejátszási idő lejártakor automatikus megfejtés
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
            if (isSongsDataLoaded) { // Csak akkor engedélyezzük, ha a dal adatok is betöltődtek
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
        alert('QR-kód olvasás oldal betöltése... (Funkcionalitás később)');
        // showScreen('qrScanScreen');
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
        // A prototípushoz most az RO001 ID-jű dalt keressük
        // Később ezt dinamikusan választjuk ki a beállítások és a songsData alapján
        currentSong = songsData.find(song => song.ID === 'RO001');

        if (currentSong) {
            console.log("Aktuális dal:", currentSong);
            // Visszaállítjuk a dal információkat rejtett állapotba
            displayArtist.textContent = `Előadó: ???`;
            displayTitle.textContent = `Dal címe: ???`;
            displayYear.textContent = `Megjelenés éve: ????`;
            displayArtist.classList.remove('active');
            displayTitle.classList.remove('active');
            displayYear.classList.remove('active');
            yearGuessInput.value = ''; // Ürítjük az évszám beviteli mezőt

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
            // A spotifyPlayerPlaceholder-t nem kell újra üresíteni, mert az iframe maga helyettesíti
        }
        playMusicBtn.disabled = true;
        pauseMusicBtn.disabled = true;
        checkAnswerBtn.disabled = false;
        yearGuessInput.disabled = false;
        showScreen('mainMenuScreen');
    });
});
