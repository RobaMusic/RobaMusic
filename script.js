// Ide jön a teljes zenei adatbázis JSON formátumban
const songsData = [
    {"ID": "RO001", "Előadó": "Pink Floyd", "Dal címe": "Another Brick in the Wall (Part 2)", "Megjelenési év": 1979, "Kategória": "RO", "Spotify ID": "7rPzEczIS574IgPaiPieS3", "Spotify URL": "https://open.spotify.com/track/7rPzEczIS574IgPaiPieS3", "Címkék": "klasszikus; ikonikus; progresszív", "Aktív": "Igen"},
    {"ID": "RO002", "Előadó": "Pink Floyd", "Dal címe": "Wish You Were Here", "Megjelenési év": 1975, "Kategória": "RO", "Spotify ID": "6mFkJmJqdDVQ1REhVfGgd1", "Spotify URL": "https://open.spotify.com/track/6mFkJmJqdDVQ1REhVfGgd1", "Címkék": "klasszikus; ballada; gitár", "Aktív": "Igen"},
    // ... ide jön az ÖSSZES DAL, amit mellékeltél JSON formátumban ...
    // Jelenleg csak RO001-et használjuk prototípusra, de az adatbázis teljes legyen!
    {"ID": "NEW050", "Előadó": "ByeAlex és a Slepp", "Dal címe": "Még mindig...", "Megjelenési év": 2021, "Kategória": "NEW", "Spotify ID": "1KRLNcB2Kj1IT2Dz6S0a1J", "Spotify URL": "https://open.spotify.com/track/1KRLNcB2Kj1IT2Dz6S0a1J", "Címkék": "magyar; modern", "Aktív": "Igen"}
];

document.addEventListener('DOMContentLoaded', () => {
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
    let spotifyPlayer = null; // A Spotify lejátszó API objektuma (ha később integráljuk)
    let playbackInterval = null; // Az időzítő intervallum


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
        // Eltávolítjuk az előző lejátszót, ha van
        if (spotifyIframe) {
            spotifyIframe.remove();
            spotifyIframe = null;
        }

        spotifyIframe = document.createElement('iframe');
        spotifyIframe.src = `https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0`;
        spotifyIframe.width = "100%";
        spotifyIframe.height = "80"; // Kisebb magasság a kompakt lejátszóhoz
        spotifyIframe.frameBorder = "0";
        spotifyIframe.allowfullscreen = "";
        spotifyIframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
        spotifyIframe.loading = "lazy";

        spotifyPlayerPlaceholder.innerHTML = ''; // Ürítjük a placeholder-t
        spotifyPlayerPlaceholder.appendChild(spotifyIframe);
        spotifyPlayerPlaceholder.classList.remove('spotify-player-placeholder'); // Eltávolítjuk a placeholder stílust

        // A prototípushoz a lejátszás gombokat engedélyezzük, de valójában az iframe tartalmazza a vezérlőket
        playMusicBtn.disabled = false;
        pauseMusicBtn.disabled = false;
    }

    // Lejátszás időzítő indítása (MOCK)
    function startPlaybackTimer() {
        clearInterval(playbackInterval); // Töröljük az előző időzítőt, ha van

        let duration = parseInt(gameSettings.listeningTime);
        if (gameSettings.listeningTime === 'full') {
             // A prototípusnál fix 90 mp a "teljes dal", amíg nincs valós API
             duration = 90;
        }

        let timeLeft = duration;
        remainingTimeSlider.max = duration; // A csúszka maximuma
        remainingTimeSlider.value = timeLeft; // Kezdőérték

        function updateTimerDisplay() {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timeRemainingText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            remainingTimeSlider.value = timeLeft; // Frissítjük a csúszkát
        }

        updateTimerDisplay(); // Azonnal frissítjük a kijelzőt

        playbackInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();

            if (timeLeft <= 0) {
                clearInterval(playbackInterval);
                timeRemainingText.textContent = "Idő lejárt!";
                // Itt esetleg automatikusan megjelenhet a megfejtés
                // showAnswer();
            }
        }, 1000); // Minden másodpercben frissül
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

            // Aktív státusz hozzáadása a stílusozáshoz
            displayArtist.classList.add('active');
            displayTitle.classList.add('active');
            displayYear.classList.add('active');
        }
    }

    // --- Eseménykezelők ---

    // MOCK: Spotify csatlakoztatása
    spotifyConnectBtn.addEventListener('click', () => {
        spotifyConnectBtn.disabled = true;
        spotifyStatus.textContent = 'Csatlakozás Spotifyhoz...';
        setTimeout(() => {
            spotifyStatus.textContent = 'Spotify csatlakoztatva!';
            startGameBtn.disabled = false;
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
        // --- Játék előkészítése ---
        // A prototípushoz most az RO001 ID-jű dalt keressük
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

            loadSpotifyPlayer(currentSong['Spotify ID']); // Spotify lejátszó betöltése
            startPlaybackTimer(); // Időzítő indítása
            showScreen('gameScreen'); // Átváltás a játék képernyőre
        } else {
            alert('Hiba: Az RO001 dal nem található az adatbázisban.');
        }
    });

    // Játék képernyő - Zene lejátszása (MOCK)
    playMusicBtn.addEventListener('click', () => {
        // Valós Spotify API integrációval itt lehetne a lejátszás
        alert('Zene lejátszása a Spotify lejátszón keresztül. (Prototípusban már automatikus)');
    });

    // Játék képernyő - Zene leállítása (MOCK)
    pauseMusicBtn.addEventListener('click', () => {
        // Valós Spotify API integrációval itt lehetne a leállítás
        alert('Zene leállítása a Spotify lejátszón keresztül. (Prototípusban a lejátszó vezérli)');
    });

    // Játék képernyő - Válasz ellenőrzése
    checkAnswerBtn.addEventListener('click', () => {
        const guessedYear = parseInt(yearGuessInput.value);
        if (isNaN(guessedYear)) {
            alert('Kérlek, adj meg egy érvényes évszámot!');
            return;
        }

        showAnswer(); // Megjelenítjük a helyes adatokat
        stopPlaybackTimer(); // Leállítjuk az időzítőt

        if (currentSong && guessedYear === currentSong['Megjelenési év']) {
            alert('Helyes megfejtés! Gratulálok!');
            // Itt jöhetne a pontozás logikája
        } else {
            alert(`Helytelen megfejtés! A helyes év: ${currentSong['Megjelenési év']}`);
        }
        // A gombok inaktiválása, hogy ne lehessen újra megfejteni
        checkAnswerBtn.disabled = true;
        yearGuessInput.disabled = true;
    });

    // Játék képernyő - Vissza a Főmenübe
    backToMainMenuFromGameBtn.addEventListener('click', () => {
        stopPlaybackTimer(); // Leállítjuk az időzítőt
        if (spotifyIframe) {
            spotifyIframe.remove(); // Eltávolítjuk a Spotify lejátszót
            spotifyIframe = null;
            spotifyPlayerPlaceholder.classList.add('spotify-player-placeholder'); // Visszaállítjuk a placeholder stílust
            spotifyPlayerPlaceholder.textContent = 'Spotify lejátszó töltődik...';
        }
        playMusicBtn.disabled = true;
        pauseMusicBtn.disabled = true;
        checkAnswerBtn.disabled = false; // Újra engedélyezzük a következő játékhoz
        yearGuessInput.disabled = false; // Újra engedélyezzük a következő játékhoz
        showScreen('mainMenuScreen');
    });
});
