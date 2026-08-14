let songsData = [];
let isSongsDataLoaded = false;

// --- Spotify PKCE authetnikációhoz szükséges segédfüggvények ---
// https://aaronparecki.com/oauth-2-simplified/#pkce
function dec2hex(dec) {
    return ('0' + dec.toString(16)).substr(-2)
}

function generatePkceVerifier(length) {
    var array = new Uint32Array(length / 2);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec2hex).join('');
}

function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generatePkceChallenge(v) {
    const hashed = await sha256(v);
    return base64urlencode(hashed);
}

// --- Globális változók a Spotify SDK-hoz ---
let accessToken = null;
let player = null;      // A Spotify Web Playback Player objektum
let deviceId = null;    // A lejátszó Device ID-je

// Spotify API beállítások
const SPOTIFY_CLIENT_ID = '64b3bdc013e84162bf973ec883854bfa'; // A TE CLIENT ID-d
const REDIRECT_URI = 'https://RobaMusic.github.io/RobaMusic/'; // A TE GitHub Pages URL-ed

// --- A Spotify Web Playback SDK betöltésekor hívódik meg ---
window.onSpotifyWebPlaybackSDKReady = () => {
    console.log("Spotify Web Playback SDK ready.");
    // Ha van már tokenünk, inicializáljuk a lejátszót
    if (accessToken) {
        initializeSpotifyPlayer();
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // --- Képernyő elemek lekérdezése ---
    const splashScreen = document.getElementById('splashScreen');
    const spotifyConnectBtn = document.getElementById('spotifyConnectBtn');
    const appStatus = document.getElementById('appStatus'); 
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
    const pauseMusicGameBtn = document.getElementById('pauseMusicGameBtn'); 
    const playerDeviceStatus = document.getElementById('playerDeviceStatus'); 
    const playbackStatusMessage = document.getElementById('playbackStatusMessage'); 
    const remainingTimeSlider = document.getElementById('remainingTimeSlider');
    const timeRemainingText = document.getElementById('timeRemainingText');
    const stopMusicBtn = document.getElementById('stopMusicBtn');
    const backToMainMenuFromGameBtn = document.getElementById('backToMainMenuFromGame');

    const qrScanScreen = document.getElementById('qrScanScreen');
    const replayQrMusicBtn = document.getElementById('replayQrMusicBtn');
    const backToMainMenuFromQrBtn = document.getElementById('backToMainMenuFromQr');

    const resultsScreen = document.getElementById('resultsScreen');
    const currentScoreDisplay = document.getElementById('currentScore');
    const bestScoreDisplay = document = document.getElementById('bestScore');
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
    let playbackInterval = null; 
    let currentScore = 0; 
    let bestScore = localStorage.getItem('robaMusicBestScore') || 0; 
    let isPlaying = false; 

    let currentRound = 0; 
    let totalRounds = 0; 
    let playedSongs = []; 

    bestScoreDisplay.textContent = bestScore;

    // --- Spotify PKCE Autentikációs flow kezelése ---
    // Ellenőrizzük, hogy van-e "code" az URL-ben
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        const codeVerifier = localStorage.getItem('code_verifier');
        if (codeVerifier) {
            exchangeCodeForToken(code, codeVerifier);
        } else {
            console.error("Code Verifier not found in localStorage.");
            appStatus.textContent = "Spotify csatlakozási hiba: code_verifier hiányzik.";
            spotifyConnectBtn.disabled = false;
        }
        // Töröljük a code-ot az URL-ből, hogy ne okozzon gondot újra betöltéskor
        window.history.pushState({}, document.title, REDIRECT_URI);
    } else {
        // Ha nincs kód, de van tárolt token, próbáljuk meg felhasználni
        accessToken = localStorage.getItem('spotify_access_token');
        if (accessToken) {
            initializeSpotifyPlayer();
        } else {
            appStatus.textContent = 'Spotify nincs csatlakoztatva.';
        }
    }

    // --- Code Exchange for Token ---
    async function exchangeCodeForToken(code, codeVerifier) {
        const params = new URLSearchParams();
        params.append('client_id', SPOTIFY_CLIENT_ID);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', REDIRECT_URI);
        params.append('code_verifier', codeVerifier);

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params,
            });
            const data = await response.json();

            if (data.access_token) {
                accessToken = data.access_token;
                localStorage.setItem('spotify_access_token', accessToken);
                // Refresh token-t is tárolhatunk, ha használnánk refresh token flow-t
                // localStorage.setItem('spotify_refresh_token', data.refresh_token);
                appStatus.textContent = 'Spotify csatlakoztatva!';
                spotifyConnectBtn.style.display = 'none'; // Elrejtjük a connect gombot
                console.log("Access Token received via PKCE:", accessToken);
                initializeSpotifyPlayer();
            } else {
                console.error("Hiba a token cseréjénél:", data);
                appStatus.textContent = "Spotify csatlakozási hiba: Token csere sikertelen.";
                spotifyConnectBtn.disabled = false;
            }
        } catch (error) {
            console.error("Hiba a token cseréje során:", error);
            appStatus.textContent = "Hálózati hiba a token cseréjekor.";
            spotifyConnectBtn.disabled = false;
        }
    }

    // --- Spotify Player inicializálása ---
    async function initializeSpotifyPlayer() {
        if (!accessToken) {
            console.error("Nincs Access Token a Spotify lejátszó inicializálásához.");
            appStatus.textContent = "Spotify csatlakozási hiba (token hiányzik).";
            startGameBtn.disabled = true;
            return;
        }

        // Várjuk meg, amíg az SDK betöltődik
        while (!window.Spotify) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        player = new window.Spotify.Player({
            name: 'RobaMusic Game Player',
            getOAuthToken: cb => { cb(accessToken); },
            volume: 0.5
        });

        // Csatlakozási hiba kezelése
        player.addListener('initialization_error', ({ message }) => { console.error('Initialization Error:', message); appStatus.textContent = `Player init hiba: ${message}`; });
        player.addListener('authentication_error', ({ message }) => { 
            console.error('Authentication Error:', message); 
            appStatus.textContent = `Auth hiba: ${message}`;
            accessToken = null; // Töröljük a rossz tokent
            localStorage.removeItem('spotify_access_token');
            spotifyConnectBtn.style.display = 'block'; // Jelenítsük meg újra a connect gombot
            appStatus.textContent = 'Spotify csatlakozási token lejárt vagy érvénytelen. Kérjük, csatlakozzon újra.';
            startGameBtn.disabled = true;
        });
        player.addListener('account_error', ({ message }) => { console.error('Account Error:', message); appStatus.textContent = `Account hiba: ${message}`; });
        player.addListener('playback_error', ({ message }) => { console.error('Playback Error:', message); appStatus.textContent = `Lejátszási hiba: ${message}`; });

        // A lejátszó készen áll
        player.addListener('ready', ({ device_id }) => {
            deviceId = device_id;
            console.log('Ready with Device ID', deviceId);
            appStatus.textContent = 'Spotify csatlakoztatva! Készen áll a lejátszásra.';
            playerDeviceStatus.textContent = `Lejátszó kész: ${player.name}`; // Frissítjük a status div-et
            if (isSongsDataLoaded) { // Ha a dalok is betöltődtek, akkor engedélyezzük a játék indítását
                startGameBtn.disabled = false;
            }
        });

        // A lejátszó offline
        player.addListener('not_ready', ({ device_id }) => {
            console.log('Device ID has gone offline', device_id);
            appStatus.textContent = "Spotify Player offline.";
            playerDeviceStatus.textContent = "Lejátszó offline.";
            startGameBtn.disabled = true; // Letiltjuk a játékot, ha offline
        });

        // Lejátszás állapot változásának figyelése
        player.addListener('player_state_changed', state => {
            if (!state) { // Ha nincs state, valószínűleg leállt a lejátszó
                isPlaying = false;
                return;
            }
            isPlaying = !state.paused;
            console.log('Is playing?', isPlaying);
            console.log('Current Track:', state.track_window.current_track);
            // Itt frissíthetjük a UI-t a lejátszás állapotának megfelelően
            if (isPlaying) {
                playMusicGameBtn.disabled = true;
                pauseMusicGameBtn.disabled = false;
                playbackStatusMessage.textContent = "Zene szól...";
            } else {
                playMusicGameBtn.disabled = false;
                pauseMusicGameBtn.disabled = true;
                playbackStatusMessage.textContent = "Zene szüneteltetve.";
            }
        });


        // Csatlakozunk a lejátszóhoz
        player.connect();
    }


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
            // Ha a Spotify már csatlakoztatva van (tokennel) és a dalok is betöltődtek, engedélyezzük a játék indítását
            if (accessToken && player && deviceId) { // Player is inicializálva kell legyen
                startGameBtn.disabled = false;
            }
        } catch (error) {
            console.error("Hiba a dal adatok betöltésekor:", error);
            appStatus.textContent = "Hiba a dal adatok betöltésekor. Kérjük, próbálja újra később.";
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

    // A Spotify lejátszó elindítása (SDK-n keresztül)
    async function playSpotifyTrack(uri, position_ms = 0) {
        if (!player || !deviceId || !accessToken) {
            console.error("Spotify lejátszó nincs inicializálva, vagy hiányzik a token/device ID.");
            playbackStatusMessage.textContent = "Hiba: Spotify lejátszó nem kész. Kérjük, csatlakozzon újra a kezdőképernyőn.";
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
                    play: false, // Ne indítsa el azonnal, a player.resume() indítja
                }),
            });
            console.log("Transferred playback to RobaMusic device.");
        } catch (error) {
             console.error("Hiba a lejátszó aktiválásakor:", error);
             playbackStatusMessage.textContent = "Hiba a lejátszó aktiválásakor. Próbálja újra.";
             return;
        }

        try {
            await player.resume({ // player.resume() helyett player.start() az első indításhoz
                uris: [uri],
                position_ms: position_ms
            });
            // isPlaying, disabled states handled by player_state_changed listener
            startPlaybackTimer(); // Elindítjuk az időzítőt
            console.log("Lejátszás elindult:", uri);
        } catch (error) {
            console.error("Hiba a zene lejátszásakor:", error);
            playbackStatusMessage.textContent = `Lejátszási hiba: ${error.message}`;
            // isPlaying = false; // Ezt a player_state_changed kezeli
            // playMusicGameBtn.disabled = false; // Ezt a player_state_changed kezeli
            // pauseMusicGameBtn.disabled = true; // Ezt a player_state_changed kezeli
        }
    }

    // A Spotify lejátszó szüneteltetése (SDK-n keresztül)
    async function pauseSpotifyTrack() {
        if (!player || !deviceId || !accessToken || !isPlaying) {
            return;
        }
        try {
            await player.pause(); // Szüneteltetjük a lejátszást
            // isPlaying, disabled states handled by player_state_changed listener
            stopPlaybackTimer(); // Leállítjuk az időzítőt
            console.log("Lejátszás szüneteltetve.");
        } catch (error) {
            console.error("Hiba a zene szüneteltetésekor:", error);
            playbackStatusMessage.textContent = `Szüneteltetési hiba: ${error.message}`;
        }
    }

    // Lejátszás időzítő indítása
    function startPlaybackTimer() {
        clearInterval(playbackInterval);

        let duration = parseInt(gameSettings.listeningTime);
        if (gameSettings.listeningTime === 'full') {
             duration = 90; // Ezt valós dalhosszal kéne helyettesíteni, ha API-ból megkapjuk
        }

        let timeLeft = duration;
        remainingTimeSlider.max = duration;
        remainingTimeSlider.value = timeLeft;

        function updateTimerDisplay() {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = Math.floor(timeLeft % 60);
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
                if(isPlaying) {
                    stopMusicBtn.click(); // Automatikusan leállítja a lejátszást és előhozza a panelt
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
            alert('Kérjük, először csatlakozzon a Spotify-hoz a kezdőképernyőn!');
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
        if (currentRound > totalRounds) {
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
            // Ha elfogytak a dalok, de még nem értünk a totalRounds végére (pl. kevesebb dal van, mint kértünk)
            alert('Nincs több elérhető dal a kiválasztott beállításokkal. A játék befejeződik.');
            endGame();
            return;
        }

        currentSong = availableSongsForThisRound[Math.floor(Math.random() * availableSongsForThisRound.length)];
        playedSongs.push(currentSong.ID); // Hozzáadjuk az aktuális dalt a lejátszottak listájához

        if (currentSong) {
            console.log("Aktuális dal:", currentSong, "Kör:", currentRound, "/", totalRounds);
            playerDeviceStatus.textContent = `Kör: ${currentRound} / ${totalRounds}`; // Frissítjük a körszámot

            // Játék képernyő elemek alapállapotba állítása
            answerRevealPanel.classList.add('hidden'); // Elrejtjük az önbevallás panelt
            hitTitleCheckbox.checked = false;
            hitArtistCheckbox.checked = false;
            hitYearCheckbox.checked = false;

            playMusicGameBtn.disabled = false; // Engedélyezzük a lejátszás gombot
            pauseMusicGameBtn.disabled = true; // Letiltjuk a pause gombot kezdetben
            stopMusicBtn.disabled = true; // Letiltjuk a leállítás gombot (csak akkor kell, ha szól a zene)
            isPlaying = false; // Még nem szól a zene
            playbackStatusMessage.textContent = "Kattintson a Zene lejátszása gombra.";

            // A lejátszót már az SDK initilizálta, csak lejátszásra készen állítjuk be
        } else {
            alert('Hiba: Nem sikerült dalt választani a megadott beállításokkal. Ellenőrizze a songsData-t és a szűrési logikát.');
            endGame();
        }
    }

    // --- Játék befejezése ---
    async function endGame() {
        if (player && isPlaying) {
            await player.pause(); // Szüneteltetjük a lejátszót
        }
        stopPlaybackTimer(); // Leállítjuk az időzítőt is
        isPlaying = false;
        answerRevealPanel.classList.add('hidden'); // Elrejtjük az önbevallás panelt is
        playMusicGameBtn.disabled = true;
        pauseMusicGameBtn.disabled = true;
        stopMusicBtn.disabled = true;
        
        currentScoreDisplay.textContent = currentScore;
        bestScoreDisplay.textContent = bestScore;
        showScreen('resultsScreen'); // Irány az eredmények képernyő!
    }


    // --- Eseménykezelők ---

    // Spotify csatlakoztatása gomb (OAuth indítása)
    spotifyConnectBtn.addEventListener('click', async () => {
        spotifyConnectBtn.disabled = true;
        appStatus.textContent = "Csatlakozás Spotifyhoz...";

        const codeVerifier = generatePkceVerifier(128);
        const codeChallenge = await generatePkceChallenge(codeVerifier);

        localStorage.setItem('code_verifier', codeVerifier); // Tároljuk a verifier-t

        const scopes = 'user-read-playback-state user-modify-playback-state streaming user-read-email user-read-private';
        window.location = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scopes}&code_challenge_method=S256&code_challenge=${codeChallenge}&show_dialog=true`;
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

    // Játék képernyő - "Zene lejátszása" gomb (SDK-s play)
    playMusicGameBtn.addEventListener('click', async () => {
        if (!currentSong) {
            alert("Nincs kiválasztott dal. Kérjük, indítson új játékot.");
            return;
        }
        // Itt már van dal, és inicializált a player, deviceId is beállítva.
        // A player.resume() már elindítja a lejátszást, ha szüneteltetve volt.
        // Első indításkor is a resume() működik, ha az átvitel megtörtént.
        if (player && deviceId && accessToken) {
             // Átadjuk a lejátszást az SDK lejátszónak
            await fetch(`https://api.spotify.com/v1/me/player`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    device_ids: [deviceId],
                    play: true, // Itt már indítjuk
                    uris: [`spotify:track:${currentSong['Spotify ID']}`]
                }),
            });
            // isPlaying, disabled states handled by player_state_changed listener
            startPlaybackTimer(); // Elindítjuk az időzítőt
            console.log("Lejátszás elindult.");
        } else {
            playbackStatusMessage.textContent = "Hiba: Spotify lejátszó nem kész. Kérjük, csatlakozzon újra a kezdőképernyőn.";
        }
    });

    // Játék képernyő - "Zene szüneteltetése" gomb (SDK-s pause)
    pauseMusicGameBtn.addEventListener('click', async () => {
        if (player && isPlaying) {
            await player.pause(); // Szüneteltetjük a lejátszást
            // isPlaying, disabled states handled by player_state_changed listener
            stopPlaybackTimer(); // Leállítjuk az időzítőt
        }
    });

    // Játék képernyő - "Zene leállítása és válasz" gomb
    stopMusicBtn.addEventListener('click', async () => {
        if (player && isPlaying) {
            await player.pause(); // Leállítjuk a lejátszást
        }
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
        pauseMusicGameBtn.disabled = true;
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
