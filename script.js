// --- Globális változók a Spotify SDK-hoz ---
let songsData = [];
let isSongsDataLoaded = false;
let accessToken = null; // Ide tároljuk a Spotify Access Token-t
let player = null;      // A Spotify Web Playback Player objektum
let deviceId = null;    // A lejátszó Device ID-je

const SPOTIFY_CLIENT_ID = '64b3bdc013e84162bf973ec883854bfa'; // <-- A TE CLIENT ID-D
const REDIRECT_URI = 'https://robaadam88.github.io/RobaMusic/'; // <-- HELYESÍTVE: A TE GitHub Pages URL-ed

// --- A Spotify Web Playback SDK betöltésekor hívódik meg ---
window.onSpotifyWebPlaybackSDKReady = () => {
    console.log("Spotify Web Playback SDK ready.");
};

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
    const playMusicGameBtn = document.getElementById('playMusicGameBtn');
    const playbackStatusMessage = document.getElementById('playbackStatusMessage'); // Az új ID a status üzenetnek
    const spotifyPlayerPlaceholder = document.getElementById('spotifyPlayerPlaceholder'); // Itt tároljuk a Spotify Player status-át
    const remainingTimeSlider = document.getElementById('remainingTimeSlider');
    const timeRemainingText = document.getElementById('timeRemainingText');
    const stopMusicBtn = document.getElementById('stopMusicBtn');
    const backToMainMenuFromGameBtn = document.getElementById('backToMainMenuFromGame');

    const qrScanScreen = document.getElementById('qrScanScreen');
    const replayQrMusicBtn = document.getElementById('replayQrMusicBtn');
    const backToMainMenuFromQrBtn = document = document.getElementById('backToMainMenuFromQr');

    const resultsScreen = document.getElementById('resultsScreen');
    const currentScoreDisplay = document.getElementById('currentScore');
    const bestScoreDisplay = document.getElementById('bestScore');
    const backToMainMenuFromResultsBtn = document.getElementById('backToMainMenuFromResults');

    // Önbecslés panel elemek
    const answerRevealPanel = document.getElementById('answerRevealPanel');
    const revealedArtistText = document.getElementById('revealedArtistText');
    const revealedTitleText = document.getElementById('revealedTitleText');
    const revealedYearText = document.getElementById('revealedYearText');
    const hitTitleCheckbox = document.getElementById('hitTitle');
    const hitArtistCheckbox = document.getElementById('hitArtist');
    const hitYearCheckbox = document.getElementById('hitYear');
    const recordScoreAndNextBtn = document.getElementById('recordScoreAndNextBtn');
    const recordScoreAndFinishBtn = document.getElementById('recordScoreAndFinishBtn');


    // --- Játék állapot változók ---
    const gameSettings = {
        listeningTime: '45',
        musicStyle: 'ALL',
        songCount: '50'
    };
    let currentSong = null;
    let playbackInterval = null; // Az időzítő intervallum
    let currentScore = 0; // Aktuális pontszám
    let bestScore = localStorage.getItem('robaMusicBestScore') || 0; // Legjobb pontszám localStorage-ből
    let isPlaying = false; // Jelzi, hogy a zene éppen szól-e

    let currentRound = 0; // Aktuális kör száma
    let totalRounds = 0; // Összes kör száma a beállítások alapján
    let playedSongs = []; // Eltárolja a már lejátszott dalok ID-it, hogy ne ismétlődjenek

    bestScoreDisplay.textContent = bestScore;

    // --- Spotify OAuth Callback kezelése ---
    // Ellenőrizzük, hogy van-e access token az URL-ben (miután a Spotify visszairányított minket)
    const hash = window.location.hash
        .substring(1)
        .split('&')
        .reduce(function (initial, item) {
            if (item) {
                var parts = item.split('=');
                initial[parts[0]] = decodeURIComponent(parts[1]);
            }
            return initial;
        }, {});
    window.location.hash = ''; // Töröljük a tokent az URL-ből biztonsági okokból

    if (hash.access_token) {
        accessToken = hash.access_token;
        localStorage.setItem('spotify_access_token', accessToken); // Tároljuk a tokent
        spotifyStatus.textContent = 'Spotify csatlakoztatva!';
        spotifyConnectBtn.style.display = 'none'; // Elrejtjük a connect gombot
        console.log("Access Token received:", accessToken);
        initializeSpotifyPlayer(); // Inicializáljuk a lejátszót a token-nel
    } else {
        // Ha nincs token, ellenőrizzük, hogy van-e a localStorage-ban
        accessToken = localStorage.getItem('spotify_access_token');
        if (accessToken) {
            spotifyStatus.textContent = 'Spotify csatlakoztatva! (régi token)';
            spotifyConnectBtn.style.display = 'none';
            console.log("Using stored Access Token:", accessToken);
            initializeSpotifyPlayer();
        } else {
            spotifyStatus.textContent = 'Spotify nincs csatlakoztatva.';
        }
    }
    
    // Ha az SDK már betöltődött, és van token, akkor inicializáljuk.
    // window.onSpotifyWebPlaybackSDKReady() is meghívja, de ha reload van és van token, akkor itt is kell.
    if (window.Spotify && accessToken) {
        initializeSpotifyPlayer();
    }


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
            // Ha a Spotify már csatlakoztatva van (tokennel) és a dalok is betöltődtek, engedélyezzük a játék indítását
            if (accessToken && player) { // Player is inicializálva kell legyen
                startGameBtn.disabled = false;
            }
        } catch (error) {
            console.error("Hiba a dal adatok betöltésekor:", error);
            spotifyStatus.textContent = "Hiba a dal adatok betöltésekor. Kérjük, próbálja újra később.";
        }
    }

    // A script betöltésekor azonnal megpróbáljuk betölteni a dal adatokat
    loadSongsData();

    // --- Spotify Player inicializálása ---
    async function initializeSpotifyPlayer() {
        if (!accessToken) {
            console.error("Nincs Access Token a Spotify lejátszó inicializálásához.");
            spotifyStatus.textContent = "Spotify csatlakozási hiba (token hiányzik).";
            return;
        }

        if (!window.Spotify) { // Ellenőrizzük, hogy az SDK betöltődött-e
            console.warn("Spotify Web Playback SDK még nem töltődött be.");
            // Megpróbáljuk újra, ha onSpotifyWebPlaybackSDKReady esemény még nem futott le
            window.onSpotifyWebPlaybackSDKReady = initializeSpotifyPlayer;
            return;
        }

        player = new window.Spotify.Player({
            name: 'RobaMusic Web Playback SDK',
            getOAuthToken: cb => { cb(accessToken); },
            volume: 0.5
        });

        // Csatlakozási hiba kezelése
        player.addListener('initialization_error', ({ message }) => { console.error('Initialization Error:', message); playbackStatusMessage.textContent = `Player init hiba: ${message}`; });
        player.addListener('authentication_error', ({ message }) => { 
            console.error('Authentication Error:', message); 
            playbackStatusMessage.textContent = `Auth hiba: ${message}`;
            accessToken = null; // Töröljük a rossz tokent
            localStorage.removeItem('spotify_access_token');
            spotifyConnectBtn.style.display = 'block'; // Jelenítsük meg újra a connect gombot
            spotifyStatus.textContent = 'Spotify csatlakozási token lejárt vagy érvénytelen. Kérjük, csatlakozzon újra.';
            startGameBtn.disabled = true;
        });
        player.addListener('account_error', ({ message }) => { console.error('Account Error:', message); playbackStatusMessage.textContent = `Account hiba: ${message}`; });
        player.addListener('playback_error', ({ message }) => { console.error('Playback Error:', message); playbackStatusMessage.textContent = `Lejátszási hiba: ${message}`; });

        // A lejátszó készen áll
        player.addListener('ready', ({ device_id }) => {
            deviceId = device_id;
            console.log('Ready with Device ID', deviceId);
            spotifyStatus.textContent = 'Spotify csatlakoztatva! Készen áll a lejátszásra.';
            if (isSongsDataLoaded) { // Ha a dalok is betöltődtek, akkor engedélyezzük a játék indítását
                startGameBtn.disabled = false;
            }
            playbackStatusMessage.textContent = "Spotify Player kész.";
        });

        // A lejátszó offline
        player.addListener('not_ready', ({ device_id }) => {
            console.log('Device ID has gone offline', device_id);
            playbackStatusMessage.textContent = "Spotify Player offline.";
            startGameBtn.disabled = true; // Letiltjuk a játékot, ha offline
        });

        // Csatlakozunk a lejátszóhoz
        player.connect();
    }

    // --- Segéd függvények ---

    // Képernyőváltó funkció
    function showScreen(screenId) {
        document.querySelectorAll('.game-container').forEach(screen => {
            screen.classList.add('hidden');
        });
        document.getElementById(screenId).classList.remove('hidden');
    }

    // A Spotify lejátszó elindítása (SDK-n keresztül)
    async function playSpotifyTrack(uri, position_ms = 0) {
        if (!player || !deviceId || !accessToken) {
            console.error("Spotify lejátszó nincs inicializálva, vagy hiányzik a token/device ID.");
            playbackStatusMessage.textContent = "Hiba: Spotify lejátszó nem kész. Kérjük, csatlakozzon újra.";
            return;
        }
        
        // Mivel a Web Playback SDK csak a felhasználó saját eszközén tud lejátszani,
        // át kell adni a lejátszást a Web Playback SDK eszközre.
        try {
            await fetch(`https://api.spotify.com/v1/me/player`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    device_ids: [deviceId],
                    play: false, // Ne indítsa el azonnal, a play() hívás indítja
                }),
            });
            console.log("Transferred playback to RobaMusic device.");
        } catch (error) {
             console.error("Hiba a lejátszó aktiválásakor:", error);
             playbackStatusMessage.textContent = "Hiba a lejátszó aktiválásakor. Próbálja újra.";
             return;
        }

        try {
            await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    uris: [uri],
                    position_ms: position_ms
                }),
            });
            isPlaying = true;
            playMusicGameBtn.disabled = true;
            stopMusicBtn.disabled = false;
            playbackStatusMessage.textContent = "Zene szól...";
            startPlaybackTimer();
            console.log("Lejátszás elindult:", uri);
        } catch (error) {
            console.error("Hiba a zene lejátszásakor:", error);
            playbackStatusMessage.textContent = `Lejátszási hiba: ${error.message}`;
            isPlaying = false;
            playMusicGameBtn.disabled = false;
            stopMusicBtn.disabled = true;
        }
    }

    // A Spotify lejátszó leállítása (SDK-n keresztül)
    async function stopSpotifyTrack() {
        if (!player || !deviceId || !accessToken || !isPlaying) {
            return;
        }
        try {
            await fetch('https://api.spotify.com/v1/me/player/pause', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            isPlaying = false;
            playMusicGameBtn.disabled = false;
            stopMusicBtn.disabled = true;
            playbackStatusMessage.textContent = "Zene leállítva.";
            stopPlaybackTimer();
            console.log("Lejátszás leállt.");
        } catch (error) {
            console.error("Hiba a zene leállításakor:", error);
            playbackStatusMessage.textContent = `Leállítási hiba: ${error.message}`;
        }
    }

    // Lejátszás időzítő indítása
    function startPlaybackTimer() {
        clearInterval(playbackInterval);

        let duration = parseInt(gameSettings.listeningTime);
        if (gameSettings.listeningTime === 'full') {
             // A Web Playback SDK-ból megkaphatjuk a dal valós hosszát, de ehhez API call kell.
             // Egyelőre maradjunk a 90 mp-nél prototípus szinten.
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
                // Automatikusan leállítja a zenét és megjeleníti a panelt
                if(isPlaying) {
                    stopMusicBtn.click();
                }
            }
        }, 1000);
    }

    // Lejátszás időzítő leállítása
    function stopPlaybackTimer() {
        clearInterval(playbackInterval);
    }

    // --- Játék indításának előkészítése és első dal kiválasztása ---
    async function prepareAndStartNewGame() {
        if (!isSongsDataLoaded) {
            alert('A dal adatok még nem töltődtek be. Kérjük, várjon!');
            return;
        }
        if (!accessToken || !player || !deviceId) {
            alert('Kérjük, először csatlakozzon a Spotify-hoz a lejátszás megkezdéséhez!');
            showScreen('splashScreen'); // Visszavisszük a kezdőképernyőre
            return;
        }

        // --- Játékmenet inicializálása ---
        currentRound = 0;
        currentScore = 0; // Új játék elején a pontszám nullázása
        playedSongs = []; // Töröljük a már lejátszott dalok listáját

        let availableSongsForSelection = songsData;

        // Szűrés kategória szerint
        if (gameSettings.musicStyle !== 'ALL') {
            availableSongsForSelection = availableSongsForSelection.filter(song => song.Kategória === gameSettings.musicStyle);
        }

        // Szűrés aktív státusz szerint
        availableSongsForSelection = availableSongsForSelection.filter(song => song.Aktív === 'Igen');

        if (availableSongsForSelection.length === 0) {
            alert('Nincs elérhető dal a kiválasztott kategóriában. Kérjük, módosítsa a beállításokat!');
            return;
        }

        // Meghatározzuk az összes kör számát
        if (gameSettings.songCount === 'all') {
            totalRounds = availableSongsForSelection.length;
        } else {
            totalRounds = Math.min(parseInt(gameSettings.songCount), availableSongsForSelection.length);
        }

        if (totalRounds === 0) {
             alert('Nincs elegendő dal a kiválasztott beállításokkal. Kérjük, módosítsa a beállításokat!');
             return;
        }
        
        startNewRound(); // Elindítjuk az első kört
        showScreen('gameScreen'); // Megjelenítjük a játék képernyőt
    }

    // --- Új kör indítása ---
    function startNewRound() {
        if (currentRound >= totalRounds) {
            // Játék vége
            endGame();
            return;
        }

        currentRound++; // Növeljük a kör számát

        // Dal kiválasztása a beállítások alapján (amely még nem volt lejátszva)
        let availableSongsForThisRound = songsData;

        // Szűrés kategória szerint
        if (gameSettings.musicStyle !== 'ALL') {
            availableSongsForThisRound = availableSongsForThisRound.filter(song => song.Kategória === gameSettings.musicStyle);
        }

        // Szűrés aktív státusz szerint
        availableSongsForThisRound = availableSongsForThisRound.filter(song => song.Aktív === 'Igen');
        
        // Kiszűrjük a már lejátszott dalokat
        availableSongsForThisRound = availableSongsForThisRound.filter(song => !playedSongs.includes(song.ID));

        if (availableSongsForThisRound.length === 0) {
            alert('Nincs több elérhető dal a kiválasztott beállításokkal. A játék befejeződik.');
            endGame();
            return;
        }

        currentSong = availableSongsForThisRound[Math.floor(Math.random() * availableSongsForThisRound.length)];
        playedSongs.push(currentSong.ID); // Hozzáadjuk az aktuális dalt a lejátszottak listájához

        if (currentSong) {
            console.log("Aktuális dal:", currentSong, "Kör:", currentRound, "/", totalRounds);
            // Itt frissíthetjük a kör számát a képernyőn, ha van rá HTML elem
            
            // Játék képernyő elemek alapállapotba állítása
            answerRevealPanel.classList.add('hidden'); // Elrejtjük az önbevallás panelt
            hitTitleCheckbox.checked = false;
            hitArtistCheckbox.checked = false;
            hitYearCheckbox.checked = false;

            playMusicGameBtn.disabled = false; // Engedélyezzük a lejátszás gombot
            stopMusicBtn.disabled = true; // Letiltjuk a leállítás gombot (csak akkor kell, ha szól a zene)
            playbackStatusMessage.textContent = "Kattintson a lejátszás gombra a zene indításához.";

            // A lejátszót most már nem kell újra inicializálni, csak lejátszani az új dalt
            // setupSpotifyPlayer(currentSong['Spotify ID']); // Ezt már nem kell hívni minden körben, a player készen van
        } else {
            alert('Hiba: Nem sikerült dalt választani a megadott beállításokkal. Ellenőrizze a songsData-t és a szűrési logikát.');
            endGame();
        }
    }

    // --- Játék befejezése ---
    function endGame() {
        stopSpotifyTrack(); // Leállítjuk a zenét
        stopPlaybackTimer(); // Leállítjuk az időzítőt is
        // Az SDK lejátszót nem kell eltávolítani, csak megállítani.
        answerRevealPanel.classList.add('hidden'); // Elrejtjük az önbevallás panelt is
        playMusicGameBtn.disabled = true;
        stopMusicBtn.disabled = true;
        
        currentScoreDisplay.textContent = currentScore;
        bestScoreDisplay.textContent = bestScore;
        showScreen('resultsScreen'); // Irány az eredmények képernyő!
    }


    // --- Eseménykezelők ---

    // Spotify csatlakoztatása gomb (OAuth indítása)
    spotifyConnectBtn.addEventListener('click', () => {
        // Fontos: a 'streaming' scope kell a Web Playback SDK-hoz
        const scopes = 'user-read-playback-state user-modify-playback-state streaming user-read-email user-read-private';
        window.location = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scopes}&response_type=token&show_dialog=true`;
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
    startPhoneGameBtn.addEventListener('click', prepareAndStartNewGame);

    // Játék képernyő - "Zene lejátszása" gomb
    playMusicGameBtn.addEventListener('click', async () => {
        if (!currentSong) {
            alert("Nincs kiválasztott dal. Kérjük, indítson új játékot.");
            return;
        }
        // Spotify URI formátum: "spotify:track:TRACK_ID"
        await playSpotifyTrack(`spotify:track:${currentSong['Spotify ID']}`);
    });

    // Játék képernyő - "Zene leállítása és válasz" gomb
    stopMusicBtn.addEventListener('click', async () => {
        await stopSpotifyTrack(); // Leállítjuk a lejátszást az SDK-n keresztül
        stopPlaybackTimer(); // Leállítjuk az időzítőt is

        // Megjelenítjük a helyes dal infókat az önbevallás panelen
        revealedTitleText.textContent = currentSong['Dal címe'];
        revealedArtistText.textContent = currentSong.Előadó;
        revealedYearText.textContent = currentSong['Megjelenési év'];

        // Visszaállítjuk a checkboxokat alaphelyzetbe
        hitTitleCheckbox.checked = false;
        hitArtistCheckbox.checked = false;
        hitYearCheckbox.checked = false;

        // Megjelenítjük az önbevallás panelt
        answerRevealPanel.classList.remove('hidden');

        // Letiltjuk a lejátszás gombokat amíg a panel nyitva van
        playMusicGameBtn.disabled = true;
        stopMusicBtn.disabled = true;
    });

    // Önbecslés panel - "Pontszám rögzítése és következő dal" gomb
    recordScoreAndNextBtn.addEventListener('click', () => {
        let scoreForThisRound = 0;

        if (hitTitleCheckbox.checked) {
            scoreForThisRound += 1;
        }
        if (hitArtistCheckbox.checked) {
            scoreForThisRound += 1;
        }
        if (hitYearCheckbox.checked) {
            scoreForThisRound += 1;
        }

        currentScore += scoreForThisRound;
        if (currentScore > bestScore) {
            bestScore = currentScore;
            localStorage.setItem('robaMusicBestScore', bestScore);
        }

        alert(`Eredmény: +${scoreForThisRound} pont! Aktuális pontszám: ${currentScore}`);
        answerRevealPanel.classList.add('hidden'); // Elrejtjük a panelt

        startNewRound(); // Elindítjuk a következő kört
    });

    // Önbecslés panel - "Pontszám rögzítése és Játék vége" gomb
    recordScoreAndFinishBtn.addEventListener('click', () => {
        let scoreForThisRound = 0;

        if (hitTitleCheckbox.checked) {
            scoreForThisRound += 1;
        }
        if (hitArtistCheckbox.checked) {
            scoreForThisRound += 1;
        }
        if (hitYearCheckbox.checked) {
            scoreForThisRound += 1;
        }

        currentScore += scoreForThisRound;
        if (currentScore > bestScore) {
            bestScore = currentScore;
            localStorage.setItem('robaMusicBestScore', bestScore);
        }

        alert(`Eredmény: +${scoreForThisRound} pont! Játék vége. Összes pontszám: ${currentScore}`);
        answerRevealPanel.classList.add('hidden'); // Elrejtjük a panelt

        endGame(); // Játék befejezése
    });

    // Játék képernyő - Vissza a Főmenübe (bármikor leállítható a játék)
    backToMainMenuFromGameBtn.addEventListener('click', () => {
        if (confirm("Biztosan be akarod fejezni a játékot? Az aktuális pontszám elveszik.")) {
            endGame(); // A játék vége funkcióval térünk vissza a főmenübe
            showScreen('mainMenuScreen'); // Vissza a főmenübe
        }
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
