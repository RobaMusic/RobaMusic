// SCRIPT.JS (VÉGLEGES, STABILIZÁLT VERZIÓ)

let songsData = [];
let isSongsDataLoaded = false;
let accessToken = null;
let player = null;
let deviceId = null;

const SPOTIFY_CLIENT_ID = '64b3bdc013e84162bf973ec883854bfa';
const REDIRECT_URI = 'https://RobaMusic.github.io/RobaMusic/';

// --- PKCE segédfüggvények (változatlan) ---
function dec2hex(dec) { return ('0' + dec.toString(16)).substr(-2); }
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


// ##################################################################
// ### JAVÍTÁS: A lejátszó inicializálása CSAK akkor indul, ha van token ###
// ##################################################################

/**
 * ÚJ, KÖZPONTI INDÍTÓ FÜGGVÉNY
 * Ez a függvény felelős a lejátszó indításáért.
 * Megvárja, amíg az SDK betöltődik, ha szükséges.
 */
function startPlayerInitialization() {
    if (window.Spotify) {
        // Ha az SDK már be van töltve, azonnal inicializálunk
        initializeSpotifyPlayer();
    } else {
        // Ha az SDK MÉG NINCS betöltve, megvárjuk a 'ready' jelzését
        console.log("Access Token megvan, várakozás a Spotify SDK betöltődésére...");
        window.onSpotifyWebPlaybackSDKReady = initializeSpotifyPlayer;
    }
}

/**
 * A tényleges lejátszó-inicializáló függvény.
 * Ezt már csak akkor hívjuk meg, ha van tokenünk.
 */
async function initializeSpotifyPlayer() {
    const appStatus = document.getElementById('appStatus');
    const startGameBtn = document.getElementById('startGameBtn');
    const playerDeviceStatus = document.getElementById('playerDeviceStatus');

    // Az accessToken ellenőrzése itt már csak egy plusz biztonsági lépés,
    // mert a hívási lánc miatt itt már lennie kell.
    if (!accessToken) {
        console.error("KRITIKUS HIBA: initializeSpotifyPlayer hívódott token nélkül!");
        return;
    }
    console.log("Spotify Player inicializálása elkezdődött...");

    player = new window.Spotify.Player({
        name: 'RobaMusic Game Player',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
    });

    // Event Listenerek (változatlan)
    player.addListener('initialization_error', ({ message }) => console.error('Initialization Error:', message));
    player.addListener('authentication_error', ({ message }) => {
        console.error('Authentication Error:', message);
        localStorage.removeItem('spotify_access_token');
        window.location.reload(); // Legtisztább, ha újratöltjük az oldalt a bejelentkezéshez
    });
    player.addListener('account_error', ({ message }) => console.error('Account Error:', message));
    player.addListener('playback_error', ({ message }) => {
        console.error('Playback Error:', message);
        document.getElementById('playbackStatusMessage').textContent = `Lejátszási hiba: ${message}`;
    });

    player.addListener('ready', ({ device_id }) => {
        deviceId = device_id;
        console.log('Spotify lejátszó KÉSZ, Device ID:', deviceId);
        appStatus.textContent = 'Spotify csatlakoztatva! Készen áll a játékra.';
        playerDeviceStatus.textContent = `Lejátszó kész`;
        if (isSongsDataLoaded) {
            startGameBtn.disabled = false;
        }
    });

    player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID offline lett', device_id);
        appStatus.textContent = "Spotify lejátszó offline.";
        startGameBtn.disabled = true;
    });

    player.addListener('player_state_changed', state => {
        const playMusicGameBtn = document.getElementById('playMusicGameBtn');
        const pauseMusicGameBtn = document.getElementById('pauseMusicGameBtn');
        const stopMusicBtn = document.getElementById('stopMusicBtn');
        const playbackStatusMessage = document.getElementById('playbackStatusMessage');

        if (!state) { isPlaying = false; return; }
        const wasPlaying = isPlaying;
        isPlaying = !state.paused;

        if (isPlaying) {
            playMusicGameBtn.disabled = true;
            pauseMusicGameBtn.disabled = false;
            stopMusicBtn.disabled = false;
            playbackStatusMessage.textContent = "Zene szól...";
            // Az időzítő csak akkor indul, ha a zene ténylegesen elindult
            if (!wasPlaying) {
                startPlaybackTimer();
            }
        } else {
            playMusicGameBtn.disabled = false;
            pauseMusicGameBtn.disabled = true;
            // A stopMusicBtn-t a saját logikája tiltja le, itt nem bántjuk
            playbackStatusMessage.textContent = "Zene szüneteltetve.";
            stopPlaybackTimer();
        }
    });

    player.connect();
}


document.addEventListener('DOMContentLoaded', async () => {
    // --- Elemek lekérdezése (változatlan) ---
    const splashScreen = document.getElementById('splashScreen'),
    spotifyConnectBtn = document.getElementById('spotifyConnectBtn'),
    appStatus = document.getElementById('appStatus'),
    startGameBtn = document.getElementById('startGameBtn'),
    mainMenuScreen = document.getElementById('mainMenuScreen'),
    qrScanBtn = document.getElementById('qrScanBtn'),
    phoneGameBtn = document.getElementById('phoneGameBtn'),
    resultsBtn = document.getElementById('resultsBtn'),
    settingsScreen = document.getElementById('settingsScreen'),
    startPhoneGameBtn = document.getElementById('startPhoneGameBtn'),
    backToMainMenuFromSettingsBtn = document.getElementById('backToMainMenuFromSettings'),
    settingOptionButtons = document.querySelectorAll('.setting-option-button'),
    gameScreen = document.getElementById('gameScreen'),
    playMusicGameBtn = document.getElementById('playMusicGameBtn'),
    pauseMusicGameBtn = document.getElementById('pauseMusicGameBtn'),
    playerDeviceStatus = document.getElementById('playerDeviceStatus'),
    playbackStatusMessage = document.getElementById('playbackStatusMessage'),
    remainingTimeSlider = document.getElementById('remainingTimeSlider'),
    timeRemainingText = document.getElementById('timeRemainingText'),
    stopMusicBtn = document.getElementById('stopMusicBtn'),
    backToMainMenuFromGameBtn = document.getElementById('backToMainMenuFromGame'),
    qrScanScreen = document.getElementById('qrScanScreen'),
    replayQrMusicBtn = document.getElementById('replayQrMusicBtn'),
    backToMainMenuFromQrBtn = document.getElementById('backToMainMenuFromQr'),
    resultsScreen = document.getElementById('resultsScreen'),
    currentScoreDisplay = document.getElementById('currentScore'),
    bestScoreDisplay = document.getElementById('bestScore'),
    backToMainMenuFromResultsBtn = document.getElementById('backToMainMenuFromResults'),
    answerRevealPanel = document.getElementById('answerRevealPanel'),
    revealedArtistText = document.getElementById('revealedArtistText'),
    revealedTitleText = document.getElementById('revealedTitleText'),
    revealedYearText = document.getElementById('revealedYearText'),
    hitTitleCheckbox = document.getElementById('hitTitle'),
    hitArtistCheckbox = document.getElementById('hitArtist'),
    hitYearCheckbox = document.getElementById('hitYear'),
    recordScoreAndNextBtn = document.getElementById('recordScoreAndNextBtn'),
    recordScoreAndFinishBtn = document.getElementById('recordScoreAndFinishBtn');

    // --- Játék állapot változók (változatlan) ---
    const gameSettings = { listeningTime: '45', musicStyle: 'ALL', songCount: '50' };
    let currentSong = null, playbackInterval = null, currentScore = 0, bestScore = localStorage.getItem('robaMusicBestScore') || 0;
    let isPlaying = false, currentRound = 0, totalRounds = 0, playedSongs = [];
    bestScoreDisplay.textContent = bestScore;

    // --- Autentikációs logika ---
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) { // Ha visszatérünk a Spotify-tól
        const codeVerifier = localStorage.getItem('code_verifier');
        if (codeVerifier) {
            await exchangeCodeForToken(code, codeVerifier);
        } else {
            appStatus.textContent = "Hiba: Hiányzó 'code_verifier'. Jelentkezz be újra.";
        }
        window.history.pushState({}, document.title, REDIRECT_URI); // URL takarítása
    } else { // Normál betöltés
        accessToken = localStorage.getItem('spotify_access_token');
        if (accessToken) {
            appStatus.textContent = 'Spotify token betöltve. Lejátszó inicializálása...';
            // ### HÍVÁS INNEN 1: Ha már van mentett tokenünk ###
            startPlayerInitialization();
        } else {
             appStatus.textContent = 'Spotify nincs csatlakoztatva.';
        }
    }

    async function exchangeCodeForToken(code, codeVerifier) {
        const params = new URLSearchParams({
            client_id: SPOTIFY_CLIENT_ID,
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            code_verifier: codeVerifier
        });
        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params,
            });
            const data = await response.json();
            if (data.access_token) {
                accessToken = data.access_token;
                localStorage.setItem('spotify_access_token', accessToken);
                console.log("Access Token received via PKCE:", accessToken);
                // ### HÍVÁS INNEN 2: Miután sikeresen megkaptuk az új tokent ###
                startPlayerInitialization();
            } else { throw new Error(data.error_description || 'Ismeretlen hiba a token cseréjekor.'); }
        } catch (error) {
            console.error("Hiba a token cseréje során:", error);
            appStatus.textContent = "Hiba a Spotify csatlakozáskor.";
        }
    }

    // --- Dal adatbázis betöltése (változatlan) ---
    async function loadSongsData() {
        try {
            const response = await fetch('./assets/songs.json');
            songsData = await response.json();
            isSongsDataLoaded = true;
            console.log("Dal adatok sikeresen betöltve:", songsData.length, "dal.");
            if (accessToken && player && deviceId) {
                startGameBtn.disabled = false;
            }
        } catch (error) { console.error("Hiba a dal adatok betöltésekor:", error); }
    }
    loadSongsData();

    // --- Segéd függvények (lejátszás, időzítő, stb.) ---
    function showScreen(screenId) {
        document.querySelectorAll('.game-container').forEach(s => s.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
    }

    async function playSpotifyTrack(uri) {
        if (!deviceId || !accessToken) { console.error("Lejátszó nem kész."); return; }
        try {
            // Irányítás átvétele ÉS lejátszás indítása a Web Playback SDK helyett a Web API-n keresztül
            // sokkal stabilabb, különösen mobilon.
            await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify({ uris: [uri] }),
            });
            console.log("Lejátszási parancs elküldve a dalhoz:", uri);
        } catch (error) {
            console.error("Hiba a zene lejátszásakor:", error);
            playbackStatusMessage.textContent = `Lejátszási hiba: ${error.message}`;
        }
    }

    function startPlaybackTimer() {
        clearInterval(playbackInterval);
        let duration = gameSettings.listeningTime === 'full' ? 90 : parseInt(gameSettings.listeningTime);
        let timeLeft = duration;
        remainingTimeSlider.max = duration;
        const update = () => {
            timeRemainingText.textContent = `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`;
            remainingTimeSlider.value = timeLeft;
        };
        update();
        playbackInterval = setInterval(() => {
            timeLeft--;
            update();
            if (timeLeft <= 0) {
                clearInterval(playbackInterval);
                if(isPlaying) stopMusicBtn.click();
            }
        }, 1000);
    }

    function stopPlaybackTimer() { clearInterval(playbackInterval); }
    
    // --- Játéklogika (nagyrészt változatlan, kisebb egyszerűsítésekkel) ---
    function prepareAndStartNewGame() {
        let filteredSongs = songsData.filter(s => s.Aktív === 'Igen' && (gameSettings.musicStyle === 'ALL' || s.Kategória === gameSettings.musicStyle));
        totalRounds = gameSettings.songCount === 'all' ? filteredSongs.length : Math.min(parseInt(gameSettings.songCount), filteredSongs.length);
        if (totalRounds === 0) { alert('Nincs elérhető dal a kiválasztott beállításokkal.'); return; }
        currentRound = 0; currentScore = 0; playedSongs = [];
        startNewRound();
        showScreen('gameScreen');
    }
    
    function startNewRound() {
        currentRound++;
        if (currentRound > totalRounds) { endGame(); return; }

        let availableSongs = songsData.filter(s => s.Aktív === 'Igen' && !playedSongs.includes(s.ID) && (gameSettings.musicStyle === 'ALL' || s.Kategória === gameSettings.musicStyle));
        if (availableSongs.length === 0) { endGame(); return; }

        currentSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
        playedSongs.push(currentSong.ID);
        
        console.log(`Kör ${currentRound}/${totalRounds}:`, currentSong);
        playerDeviceStatus.textContent = `Kör: ${currentRound} / ${totalRounds}`;
        answerRevealPanel.classList.add('hidden');
        [hitTitleCheckbox, hitArtistCheckbox, hitYearCheckbox].forEach(cb => cb.checked = false);
        playMusicGameBtn.disabled = false;
        pauseMusicGameBtn.disabled = true;
        stopMusicBtn.disabled = true;
        playbackStatusMessage.textContent = "Kattintson a Zene lejátszása gombra.";
    }

    async function endGame() {
        if (player && isPlaying) await player.pause();
        currentScoreDisplay.textContent = currentScore;
        bestScoreDisplay.textContent = bestScore;
        showScreen('resultsScreen');
    }

    // --- Eseménykezelők (változatlan) ---
    spotifyConnectBtn.addEventListener('click', async () => {
        const codeVerifier = generatePkceVerifier(128);
        const codeChallenge = await generatePkceChallenge(codeVerifier);
        localStorage.setItem('code_verifier', codeVerifier);
        const scopes = 'user-read-playback-state user-modify-playback-state streaming user-read-email user-read-private';
        window.location.href = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scopes}&code_challenge_method=S256&code_challenge=${codeChallenge}&show_dialog=true`;
    });

    startGameBtn.addEventListener('click', () => showScreen('mainMenuScreen'));
    phoneGameBtn.addEventListener('click', () => showScreen('settingsScreen'));
    startPhoneGameBtn.addEventListener('click', prepareAndStartNewGame);
    
    settingOptionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const { setting, value } = button.dataset;
            document.querySelectorAll(`.setting-option-button[data-setting="${setting}"]`).forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            gameSettings[setting] = value;
        });
    });

    playMusicGameBtn.addEventListener('click', () => {
        if (currentSong && currentSong.URI) playSpotifyTrack(currentSong.URI);
    });

    pauseMusicGameBtn.addEventListener('click', async () => { if (player && isPlaying) await player.pause(); });

    stopMusicBtn.addEventListener('click', async () => {
        if (player && isPlaying) await player.pause();
        stopPlaybackTimer();
        revealedTitleText.textContent = currentSong['Dal címe'];
        revealedArtistText.textContent = currentSong.Előadó;
        revealedYearText.textContent = currentSong['Megjelenési év'];
        answerRevealPanel.classList.remove('hidden');
        playMusicGameBtn.disabled = true;
        pauseMusicGameBtn.disabled = true;
        stopMusicBtn.disabled = true;
    });

    const recordScoreAndContinue = (isFinishing) => {
        let score = (hitTitleCheckbox.checked ? 1 : 0) + (hitArtistCheckbox.checked ? 1 : 0) + (hitYearCheckbox.checked ? 1 : 0);
        currentScore += score;
        if (currentScore > bestScore) {
            bestScore = currentScore;
            localStorage.setItem('robaMusicBestScore', bestScore);
        }
        alert(`Eredmény: +${score} pont! Aktuális pontszám: ${currentScore}`);
        if (isFinishing) endGame(); else startNewRound();
    };

    recordScoreAndNextBtn.addEventListener('click', () => recordScoreAndContinue(false));
    recordScoreAndFinishBtn.addEventListener('click', () => recordScoreAndContinue(true));

    resultsBtn.addEventListener('click', () => { currentScoreDisplay.textContent = currentScore; bestScoreDisplay.textContent = bestScore; showScreen('resultsScreen'); });
    backToMainMenuFromSettingsBtn.addEventListener('click', () => showScreen('mainMenuScreen'));
    backToMainMenuFromGameBtn.addEventListener('click', () => { if (confirm("Biztosan befejezed a játékot?")) endGame(); });
    backToMainMenuFromQrBtn.addEventListener('click', () => showScreen('mainMenuScreen'));
    backToMainMenuFromResultsBtn.addEventListener('click', () => showScreen('mainMenuScreen'));
    qrScanBtn.addEventListener('click', () => alert('Ez a funkció fejlesztés alatt áll.'));
});
