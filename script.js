let songsData = [];
let isSongsDataLoaded = false;
let accessToken = null;
let player = null;      // A Spotify Web Playback Player objektum
let deviceId = null;    // A lejátszó Device ID-je

// Spotify API beállítások
const SPOTIFY_CLIENT_ID = '64b3bdc013e84162bf973ec883854bfa'; // A TE CLIENT ID-d
const REDIRECT_URI = 'https://RobaMusic.github.io/RobaMusic/'; // A TE GitHub Pages URL-ed

// --- Spotify PKCE authetnikációhoz szükséges segédfüggvények ---
function dec2hex(dec) {
    return ('0' + dec + dec.toString(16)).substr(-2) // Javítva az elírás
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

// --- Spotify Player inicializálása (GLOBÁLISAN ELÉRHETŐ ÉS HÍVHATÓ) ---
async function initializeSpotifyPlayer() {
    // App status elemek lekérése itt, mert globális függvény
    const appStatus = document.getElementById('appStatus');
    const startGameBtn = document.getElementById('startGameBtn');
    const spotifyConnectBtn = document.getElementById('spotifyConnectBtn');
    const playerDeviceStatus = document.getElementById('playerDeviceStatus');

    if (!accessToken) {
        console.error("Nincs Access Token a Spotify lejátszó inicializálásához.");
        appStatus.textContent = "Spotify csatlakozási hiba (token hiányzik).";
        startGameBtn.disabled = true;
        return;
    }

    player = new window.Spotify.Player({
        name: 'RobaMusic Game Player',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
    });

    player.addListener('initialization_error', ({ message }) => { console.error('Initialization Error:', message); appStatus.textContent = `Player init hiba: ${message}`; });
    player.addListener('authentication_error', ({ message }) => { 
        console.error('Authentication Error:', message); 
        appStatus.textContent = `Auth hiba: ${message}`;
        accessToken = null; 
        localStorage.removeItem('spotify_access_token');
        spotifyConnectBtn.style.display = 'block'; 
        appStatus.textContent = 'Spotify csatlakozási token lejárt vagy érvénytelen. Kérjük, csatlakozzon újra.';
        startGameBtn.disabled = true;
    });
    player.addListener('account_error', ({ message }) => { console.error('Account Error:', message); appStatus.textContent = `Account hiba: ${message}`; });
    player.addListener('playback_error', ({ message }) => { console.error('Playback Error:', message); appStatus.textContent = `Lejátszási hiba: ${message}`; });

    player.addListener('ready', ({ device_id }) => {
        deviceId = device_id;
        console.log('Ready with Device ID', deviceId);
        appStatus.textContent = 'Spotify csatlakoztatva! Készen áll a lejátszásra.';
        playerDeviceStatus.textContent = `Lejátszó kész: ${player.name}`;
        if (isSongsDataLoaded) { 
            startGameBtn.disabled = false;
        }
    });

    player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
        appStatus.textContent = "Spotify Player offline.";
        playerDeviceStatus.textContent = "Lejátszó offline.";
        startGameBtn.disabled = true;
    });

    player.addListener('player_state_changed', state => {
        const playMusicGameBtn = document.getElementById('playMusicGameBtn');
        const pauseMusicGameBtn = document.getElementById('pauseMusicGameBtn');
        const playbackStatusMessage = document.getElementById('playbackStatusMessage');
        const stopMusicBtn = document.getElementById('stopMusicBtn');

        if (!state) {
            isPlaying = false;
            return;
        }
        isPlaying = !state.paused;
        console.log('Is playing?', isPlaying);
        console.log('Current Track:', state.track_window.current_track); // Debug
        
        if (isPlaying) {
            playMusicGameBtn.disabled = true;
            pauseMusicGameBtn.disabled = false;
            stopMusicBtn.disabled = false; // Engedélyezzük a Stop gombot is, ha szól a zene
            playbackStatusMessage.textContent = "Zene szól...";
        } else {
            playMusicGameBtn.disabled = false;
            pauseMusicGameBtn.disabled = true;
            stopMusicBtn.disabled = true; // Letiltjuk a Stop gombot is, ha szünetel
            playbackStatusMessage.textContent = "Zene szüneteltetve.";
        }
    });

    player.connect();
}

// --- A Spotify Web Playback SDK betöltésekor hívódik meg (GLOBÁLISAN) ---
window.onSpotifyWebPlaybackSDKReady = initializeSpotifyPlayer;


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
    let playbackInterval = null; 
    let currentScore = 0; 
    let bestScore = localStorage.getItem('robaMusicBestScore') || 0; 
    let isPlaying = false; 

    let currentRound = 0; 
    let totalRounds = 0; 
    let playedSongs = []; 

    bestScoreDisplay.textContent = bestScore;

    // --- Spotify PKCE Autentikációs flow kezelése ---
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        const codeVerifier = localStorage.getItem('code_verifier');
        if (codeVerifier) {
            await exchangeCodeForToken(code, codeVerifier);
        } else {
            console.error("Code Verifier not found in localStorage. Please connect to Spotify again.");
            appStatus.textContent = "Spotify csatlakozási hiba: code_verifier hiányzik.";
            spotifyConnectBtn.disabled = false;
        }
        window.history.pushState({}, document.title, REDIRECT_URI);
    } else {
        accessToken = localStorage.getItem('spotify_access_token');
        if (accessToken) {
            appStatus.textContent = 'Spotify csatlakoztatva! Várja a lejátszó inicializálását...';
            spotifyConnectBtn.style.display = 'none'; 
        } else {
            appStatus.textContent = 'Spotify nincs csatlakoztatva.';
        }
    }

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
                appStatus.textContent = 'Spotify csatlakoztatva!';
                spotifyConnectBtn.style.display = 'none'; 
                console.log("Access Token received via PKCE:", accessToken);
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
            if (accessToken && player && deviceId) {
                startGameBtn.disabled = false;
            }
        } catch (error) {
            console.error("Hiba a dal adatok betöltésekor:", error);
            appStatus.textContent = "Hiba a dal adatok betöltésekor. Kérjük, próbálja újra később.";
        }
    }

    loadSongsData();

    // --- Segéd függvények ---

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
        
        // Először átadjuk a lejátszást a mi device ID-nkre.
        // Ez a hívás elengedhetetlen, hogy a mi Play/Pause gombjaink működjenek.
        try {
            const transferResponse = await fetch(`https://api.spotify.com/v1/me/player`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    device_ids: [deviceId],
                    play: false, // Az eszközátvitelkor ne induljon el automtikus lejátszás
                }),
            });
            if (!transferResponse.ok) {
                const errorBody = await transferResponse.json();
                console.warn(`Failed to transfer playback: ${transferResponse.status} - ${JSON.stringify(errorBody)}. Attempting to play specified track.`);
            } else {
                console.log("Transferred playback to RobaMusic device.");
            }
        } catch (error) {
             console.error("Hiba a lejátszó aktiválásakor:", error);
             playbackStatusMessage.textContent = `Hiba a lejátszó aktiválásakor: ${error.message}. Próbálja újra.`;
             return; 
        }

        try {
            // MOST HASZNÁLjuk a lejátszó Web API endpointját a lejátszáshoz
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
            startPlaybackTimer(); 
            console.log("Lejátszás elindult:", uri);
        } catch (error) {
            console.error("Hiba a zene lejátszásakor:", error);
            playbackStatusMessage.textContent = `Lejátszási hiba: ${error.message}`;
        }
    }

    async function pauseSpotifyTrack() {
        if (!player || !deviceId || !accessToken) { 
            return;
        }
        try {
            await player.pause();
            stopPlaybackTimer();
            console.log("Lejátszás szüneteltetve.");
        } catch (error) {
            console.error("Hiba a zene szüneteltetésekor:", error);
            playbackStatusMessage.textContent = `Szüneteltetési hiba: ${error.message}`;
        }
    }

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
                    stopMusicBtn.click();
                }
            }
        }, 1000);
    }

    function stopPlaybackTimer() {
        clearInterval(playbackInterval);
    }

    async function prepareAndStartNewGame() {
        if (!isSongsDataLoaded) {
            alert('A dal adatok még nem töltődtek be. Kérjük, várjon!');
            return;
        }
        if (!accessToken || !player || !deviceId) {
            alert('Kérjük, először csatlakozzon a Spotify-hoz a kezdőképernyőn!');
            showScreen('splashScreen');
            return;
        }

        currentRound = 0;
        currentScore = 0;
        playedSongs = [];

        let availableSongsForSelection = songsData;

        if (gameSettings.musicStyle !== 'ALL') {
            availableSongsForSelection = availableSongsForSelection.filter(song => song.Kategória === gameSettings.musicStyle);
        }

        availableSongsForSelection = availableSongsForSelection.filter(song => song.Aktív === 'Igen');

        if (availableSongsForSelection.length === 0) {
            alert('Nincs elérhető dal a kiválasztott kategóriában. Kérjük, módosítsa a beállításokat!');
            return;
        }

        if (gameSettings.songCount === 'all') {
            totalRounds = availableSongsForSelection.length;
        } else {
            totalRounds = Math.min(parseInt(gameSettings.songCount), availableSongsForSelection.length);
        }

        if (totalRounds === 0) {
             alert('Nincs elegendő dal a kiválasztott beállításokkal. Kérjük, módosítsa a beállításokat!');
             return;
        }
        
        startNewRound();
        showScreen('gameScreen');
    }

    function startNewRound() {
        if (currentRound > totalRounds) {
            endGame();
            return;
        }

        currentRound++;

        let availableSongsForThisRound = songsData;

        if (gameSettings.musicStyle !== 'ALL') {
            availableSongsForThisRound = availableSongsForThisRound.filter(song => song.Kategória === gameSettings.musicStyle);
        }

        availableSongsForThisRound = availableSongsForThisRound.filter(song => song.Aktív === 'Igen');
        
        availableSongsForThisRound = availableSongsForThisRound.filter(song => !playedSongs.includes(song.ID));

        if (availableSongsForThisRound.length === 0) { 
            alert('Nincs több elérhető dal a kiválasztott beállításokkal. A játék befejeződik.');
            endGame();
            return;
        }

        currentSong = availableSongsForThisRound[Math.floor(Math.random() * availableSongsForThisRound.length)];
        playedSongs.push(currentSong.ID);

        if (currentSong) {
            console.log("Aktuális dal:", currentSong, "Kör:", currentRound, "/", totalRounds);
            playerDeviceStatus.textContent = `Kör: ${currentRound} / ${totalRounds}`;

            answerRevealPanel.classList.add('hidden');
            hitTitleCheckbox.checked = false;
            hitArtistCheckbox.checked = false;
            hitYearCheckbox.checked = false;

            playMusicGameBtn.disabled = false;
            pauseMusicGameBtn.disabled = true;
            stopMusicBtn.disabled = true;
            isPlaying = false;
            playbackStatusMessage.textContent = "Kattintson a Zene lejátszása gombra.";

        } else {
            alert('Hiba: Nem sikerült dalt választani a megadott beállításokkal. Ellenőrizze a songsData-t és a szűrési logikát.');
            endGame();
        }
    }

    async function endGame() {
        if (player && isPlaying) {
            await player.pause();
        }
        stopPlaybackTimer();
        isPlaying = false;
        answerRevealPanel.classList.add('hidden');
        playMusicGameBtn.disabled = true;
        pauseMusicGameBtn.disabled = true;
        stopMusicBtn.disabled = true;
        
        currentScoreDisplay.textContent = currentScore;
        bestScoreDisplay.textContent = bestScore;
        showScreen('resultsScreen');
    }


    spotifyConnectBtn.addEventListener('click', async () => {
        spotifyConnectBtn.disabled = true;
        appStatus.textContent = "Csatlakozás Spotifyhoz...";

        const codeVerifier = generatePkceVerifier(128);
        const codeChallenge = await generatePkceChallenge(codeVerifier);

        localStorage.setItem('code_verifier', codeVerifier);

        const scopes = 'user-read-playback-state user-modify-playback-state streaming user-read-email user-read-private';
        window.location = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scopes}&code_challenge_method=S256&code_challenge=${codeChallenge}&show_dialog=true`;
    });

    startGameBtn.addEventListener('click', () => {
        showScreen('mainMenuScreen');
    });

    qrScanBtn.addEventListener('click', () => {
        alert('A QR-kód olvasó funkció fejlesztés alatt áll. Egyelőre egy mock képet látsz.');
        showScreen('qrScanScreen');
    });

    phoneGameBtn.addEventListener('click', () => {
        showScreen('settingsScreen');
    });

    resultsBtn.addEventListener('click', () => {
        currentScoreDisplay.textContent = currentScore;
        bestScoreDisplay.textContent = bestScore;
        showScreen('resultsScreen');
    });

    backToMainMenuFromSettingsBtn.addEventListener('click', () => {
        showScreen('mainMenuScreen');
    });

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

    startPhoneGameBtn.addEventListener('click', prepareAndStartNewGame);

    playMusicGameBtn.addEventListener('click', async () => {
        if (!currentSong) {
            alert("Nincs kiválasztott dal. Kérjük, indítson új játékot.");
            return;
        }
        if (player && deviceId && accessToken) {
            // Először átadjuk a lejátszást a RobaMusic lejátszóra
            try {
                const transferResponse = await fetch(`https://api.spotify.com/v1/me/player`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        device_ids: [deviceId],
                        play: false // Az elsődleges lejátszó beállításakor ne induljon el automtikus lejátszás
                    }),
                });
                if (!transferResponse.ok) {
                    const errorBody = await transferResponse.json();
                    console.warn(`Failed to transfer playback: ${transferResponse.status} - ${JSON.stringify(errorBody)}. Attempting to play specified track.`);
                } else {
                    console.log("Transferred playback to RobaMusic device.");
                }
            } catch (error) {
                 console.error("Hiba a lejátszó aktiválásakor:", error);
                 playbackStatusMessage.textContent = `Hiba a lejátszó aktiválásakor: ${error.message}. Próbálja újra.`;
                 // Folytatjuk a lejátszás elindítását
            }

            // Majd elindítjuk az adott dalt
            try {
                await player.togglePlay(); // Itt kellene használni a togglePlay-t a lejátszáshoz
                startPlaybackTimer(); // Időzítő indítása
                console.log("Lejátszás elindult a kiválasztott dallal.");
            } catch (error) {
                console.error("Hiba a zene lejátszásakor:", error);
                playbackStatusMessage.textContent = `Lejátszási hiba: ${error.message}.`;
            }

        } else {
            playbackStatusMessage.textContent = "Hiba: Spotify lejátszó nem kész. Kérjük, csatlakozzon újra a kezdőképernyőn.";
        }
    });

    pauseMusicGameBtn.addEventListener('click', async () => {
        if (player && isPlaying) {
            await player.pause(); // Szüneteltetjük a lejátszást
            stopPlaybackTimer();
        }
    });

    stopMusicBtn.addEventListener('click', async () => {
        if (player && isPlaying) {
            await player.pause(); // Leállítjuk a lejátszást
        }
        stopPlaybackTimer();

        revealedTitleText.textContent = currentSong['Dal címe'];
        revealedArtistText.textContent = currentSong.Előadó;
        revealedYearText.textContent = currentSong['Megjelenési év'];

        hitTitleCheckbox.checked = false;
        hitArtistCheckbox.checked = false;
        hitYearCheckbox.checked = false;

        answerRevealPanel.classList.remove('hidden');

        playMusicGameBtn.disabled = true;
        pauseMusicGameBtn.disabled = true;
        stopMusicBtn.disabled = true;
    });

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
        answerRevealPanel.classList.add('hidden');

        startNewRound();
    });

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
        answerRevealPanel.classList.add('hidden');

        endGame();
    });

    backToMainMenuFromGameBtn.addEventListener('click', () => {
        if (confirm("Biztosan be akarod fejezni a játékot? Az aktuális pontszám elveszik.")) {
            endGame();
        }
    });

    replayQrMusicBtn.addEventListener('click', () => {
        alert('Zene újrajátszása a QR kód alapján (funkcionalitás később).');
    });

    backToMainMenuFromQrBtn.addEventListener('click', () => {
        showScreen('mainMenuScreen');
    });

    backToMainMenuFromResultsBtn.addEventListener('click', () => {
        showScreen('mainMenuScreen');
    });
});
