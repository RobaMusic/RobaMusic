// SCRIPT.JS (VÉGLEGES, STABILIZÁLT, "POLL" MÓDSZERREL)

let songsData = [], isSongsDataLoaded = false, accessToken = null, player = null, deviceId = null;
const SPOTIFY_CLIENT_ID = '64b3bdc013e84162bf973ec883854bfa';
const REDIRECT_URI = 'https://RobaMusic.github.io/RobaMusic/';

// --- PKCE segédfüggvények (változatlan) ---
function dec2hex(dec) { return ('0' + dec.toString(16)).substr(-2); }
function generatePkceVerifier(length) { let a = new Uint32Array(length / 2); window.crypto.getRandomValues(a); return Array.from(a, dec2hex).join(''); }
function sha256(plain) { const enc = new TextEncoder(); const data = enc.encode(plain); return window.crypto.subtle.digest('SHA-256', data); }
function base64urlencode(a) { return btoa(String.fromCharCode.apply(null, new Uint8Array(a))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
async function generatePkceChallenge(v) { const h = await sha256(v); return base64urlencode(h); }

// ##################################################################
// ### BOMBABIZTOS MEGOLDÁS: A "POLLING" MÓDSZER ###
// ##################################################################

/**
 * Ez a függvény addig fut 100ms-enként, amíg a window.Spotify objektum elérhetővé nem válik.
 * Csak ezután hívja meg a lejátszó tényleges inicializálását.
 * Ezt a függvényt CSAK AKKOR hívjuk meg, ha már van accessToken-ünk.
 */
function ensureSpotifySdkIsReadyAndInit() {
    if (window.Spotify) {
        console.log("Spotify SDK készen áll. Lejátszó inicializálása...");
        initializeSpotifyPlayer();
    } else {
        console.log("Access Token megvan, várakozás a Spotify SDK-ra (100ms)...");
        setTimeout(ensureSpotifySdkIsReadyAndInit, 100);
    }
}

/**
 * A tényleges lejátszó-inicializáló függvény.
 * Ezt már csak akkor hívjuk meg, ha a token ÉS az SDK is garantáltan rendelkezésre áll.
 */
function initializeSpotifyPlayer() {
    const appStatus = document.getElementById('appStatus');
    const startGameBtn = document.getElementById('startGameBtn');
    const playerDeviceStatus = document.getElementById('playerDeviceStatus');

    if (!accessToken) {
        console.error("KRITIKUS HIBA: initializeSpotifyPlayer hívódott token nélkül!");
        return;
    }

    player = new window.Spotify.Player({
        name: 'RobaMusic Game Player',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
    });

    player.addListener('initialization_error', ({ message }) => console.error('Initialization Error:', message));
    player.addListener('authentication_error', ({ message }) => {
        console.error('Authentication Error:', message);
        localStorage.removeItem('spotify_access_token');
        alert("Spotify authentikációs hiba! Kérlek, jelentkezz be újra.");
        window.location.reload();
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
            if (!wasPlaying) startPlaybackTimer();
        } else {
            playMusicGameBtn.disabled = false;
            pauseMusicGameBtn.disabled = true;
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
    phoneGameBtn = document.getElementById('phoneGameBtn'),
    settingsScreen = document.getElementById('settingsScreen'),
    startPhoneGameBtn = document.getElementById('startPhoneGameBtn'),
    settingOptionButtons = document.querySelectorAll('.setting-option-button'),
    gameScreen = document.getElementById('gameScreen'),
    playMusicGameBtn = document.getElementById('playMusicGameBtn'),
    pauseMusicGameBtn = document.getElementById('pauseMusicGameBtn'),
    playerDeviceStatus = document.getElementById('playerDeviceStatus'),
    playbackStatusMessage = document.getElementById('playbackStatusMessage'),
    remainingTimeSlider = document.getElementById('remainingTimeSlider'),
    timeRemainingText = document.getElementById('timeRemainingText'),
    stopMusicBtn = document.getElementById('stopMusicBtn'),
    answerRevealPanel = document.getElementById('answerRevealPanel'),
    revealedArtistText = document.getElementById('revealedArtistText'),
    revealedTitleText = document.getElementById('revealedTitleText'),
    revealedYearText = document.getElementById('revealedYearText'),
    hitTitleCheckbox = document.getElementById('hitTitle'),
    hitArtistCheckbox = document.getElementById('hitArtist'),
    hitYearCheckbox = document.getElementById('hitYear'),
    recordScoreAndNextBtn = document.getElementById('recordScoreAndNextBtn'),
    recordScoreAndFinishBtn = document.getElementById('recordScoreAndFinishBtn'),
    resultsScreen = document.getElementById('resultsScreen'),
    currentScoreDisplay = document.getElementById('currentScore'),
    bestScoreDisplay = document.getElementById('bestScore');

    // --- Gombok ---
    const resultsBtn = document.getElementById('resultsBtn'),
    backToMainMenuFromSettingsBtn = document.getElementById('backToMainMenuFromSettings'),
    backToMainMenuFromGameBtn = document.getElementById('backToMainMenuFromGame'),
    backToMainMenuFromQrBtn = document.getElementById('backToMainMenuFromQr'),
    backToMainMenuFromResultsBtn = document.getElementById('backToMainMenuFromResults'),
    qrScanBtn = document.getElementById('qrScanBtn');

    // --- Játék állapot változók (változatlan) ---
    const gameSettings = { listeningTime: '45', musicStyle: 'ALL', songCount: '50' };
    let currentSong = null, playbackInterval = null, currentScore = 0, bestScore = localStorage.getItem('robaMusicBestScore') || 0;
    let isPlaying = false, currentRound = 0, totalRounds = 0, playedSongs = [];
    bestScoreDisplay.textContent = bestScore;

    // --- Autentikációs logika (a hívási sorrend a kulcs) ---
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) { // Visszatérés a Spotify-tól
        const codeVerifier = localStorage.getItem('code_verifier');
        if (codeVerifier) await exchangeCodeForToken(code, codeVerifier);
        else appStatus.textContent = "Hiba: Hiányzó 'code_verifier'. Jelentkezz be újra.";
        window.history.pushState({}, document.title, REDIRECT_URI);
    } else { // Normál betöltés
        accessToken = localStorage.getItem('spotify_access_token');
        if (accessToken) {
            appStatus.textContent = 'Spotify token betöltve. Lejátszó keresése...';
            ensureSpotifySdkIsReadyAndInit(); // <--- INDÍTÁS INNEN
        } else {
             appStatus.textContent = 'Spotify nincs csatlakoztatva.';
        }
    }

    async function exchangeCodeForToken(code, codeVerifier) {
        const params = new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: codeVerifier });
        try {
            const response = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
            const data = await response.json();
            if (data.access_token) {
                accessToken = data.access_token;
                localStorage.setItem('spotify_access_token', accessToken);
                ensureSpotifySdkIsReadyAndInit(); // <--- VAGY INDÍTÁS INNEN
            } else { throw new Error(data.error_description || 'Ismeretlen hiba a token cseréjekor.'); }
        } catch (error) { console.error("Hiba a token cseréje során:", error); appStatus.textContent = "Hiba a Spotify csatlakozáskor."; }
    }

    // --- Dal adatbázis betöltése ---
    async function loadSongsData() {
        try {
            const response = await fetch('./assets/songs.json');
            songsData = await response.json();
            isSongsDataLoaded = true;
            console.log("Dal adatok sikeresen betöltve:", songsData.length, "dal.");
            if (accessToken && player && deviceId) startGameBtn.disabled = false;
        } catch (error) { console.error("Hiba a dal adatok betöltésekor:", error); }
    }
    loadSongsData();

    // --- Segédfüggvények (lejátszás, időzítő, stb.) ---
    function showScreen(id) { document.querySelectorAll('.game-container').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
    async function playSpotifyTrack(uri) {
        if (!deviceId) return;
        try {
            await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify({ uris: [uri] }),
            });
        } catch (error) { console.error("Lejátszási API hiba:", error); }
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
            timeLeft--; update();
            if (timeLeft <= 0) { clearInterval(playbackInterval); if(isPlaying) stopMusicBtn.click(); }
        }, 1000);
    }
    function stopPlaybackTimer() { clearInterval(playbackInterval); }
    
    // --- Játéklogika ---
    function prepareAndStartNewGame() {
        let songs = songsData.filter(s => s.Aktív === 'Igen' && (gameSettings.musicStyle === 'ALL' || s.Kategória === gameSettings.musicStyle));
        totalRounds = gameSettings.songCount === 'all' ? songs.length : Math.min(parseInt(gameSettings.songCount), songs.length);
        if (totalRounds === 0) { alert('Nincs elérhető dal.'); return; }
        currentRound = 0; currentScore = 0; playedSongs = [];
        startNewRound(); showScreen('gameScreen');
    }
    function startNewRound() {
        currentRound++;
        if (currentRound > totalRounds) { endGame(); return; }
        let available = songsData.filter(s => s.Aktív === 'Igen' && !playedSongs.includes(s.ID) && (gameSettings.musicStyle === 'ALL' || s.Kategória === gameSettings.musicStyle));
        if (available.length === 0) { endGame(); return; }
        currentSong = available[Math.floor(Math.random() * available.length)];
        playedSongs.push(currentSong.ID);
        playerDeviceStatus.textContent = `Kör: ${currentRound} / ${totalRounds}`;
        answerRevealPanel.classList.add('hidden');
        [hitTitleCheckbox, hitArtistCheckbox, hitYearCheckbox].forEach(cb => cb.checked = false);
        playMusicGameBtn.disabled = false;
        pauseMusicGameBtn.disabled = true;
        stopMusicBtn.disabled = true;
    }
    async function endGame() {
        if (player && isPlaying) await player.pause();
        currentScoreDisplay.textContent = currentScore;
        bestScoreDisplay.textContent = bestScore;
        showScreen('resultsScreen');
    }

    // --- Eseménykezelők ---
    spotifyConnectBtn.addEventListener('click', async () => {
        const v = generatePkceVerifier(128);
        const challenge = await generatePkceChallenge(v);
        localStorage.setItem('code_verifier', v);
        const scopes = 'user-read-playback-state user-modify-playback-state streaming user-read-email user-read-private';
        window.location.href = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scopes}&code_challenge_method=S256&code_challenge=${challenge}&show_dialog=true`;
    });

    playMusicGameBtn.addEventListener('click', () => { if (currentSong) playSpotifyTrack(currentSong.URI); });
    pauseMusicGameBtn.addEventListener('click', async () => { if (player) await player.pause(); });
    stopMusicBtn.addEventListener('click', async () => {
        if (player) await player.pause();
        revealedTitleText.textContent = currentSong['Dal címe'];
        revealedArtistText.textContent = currentSong.Előadó;
        revealedYearText.textContent = currentSong['Megjelenési év'];
        answerRevealPanel.classList.remove('hidden');
        playMusicGameBtn.disabled = true; pauseMusicGameBtn.disabled = true; stopMusicBtn.disabled = true;
    });

    const recordScore = (isFinishing) => {
        let score = (hitTitleCheckbox.checked | 0) + (hitArtistCheckbox.checked | 0) + (hitYearCheckbox.checked | 0);
        currentScore += score;
        if (currentScore > bestScore) { bestScore = currentScore; localStorage.setItem('robaMusicBestScore', bestScore); }
        if (isFinishing) endGame(); else startNewRound();
    };

    recordScoreAndNextBtn.addEventListener('click', () => recordScore(false));
    recordScoreAndFinishBtn.addEventListener('click', () => recordScore(true));
    startGameBtn.addEventListener('click', () => showScreen('mainMenuScreen'));
    phoneGameBtn.addEventListener('click', () => showScreen('settingsScreen'));
    startPhoneGameBtn.addEventListener('click', prepareAndStartNewGame);
    settingOptionButtons.forEach(b => b.addEventListener('click', () => {
        const { setting, value } = b.dataset;
        document.querySelectorAll(`.setting-option-button[data-setting="${setting}"]`).forEach(btn => btn.classList.remove('selected'));
        b.classList.add('selected'); gameSettings[setting] = value;
    }));
    resultsBtn.addEventListener('click', () => { currentScoreDisplay.textContent = currentScore; bestScoreDisplay.textContent = bestScore; showScreen('resultsScreen'); });
    backToMainMenuFromSettingsBtn.addEventListener('click', () => showScreen('mainMenuScreen'));
    backToMainMenuFromGameBtn.addEventListener('click', () => { if (confirm("Biztosan befejezed a játékot?")) endGame(); });
    backToMainMenuFromQrBtn.addEventListener('click', () => showScreen('mainMenuScreen'));
    backToMainMenuFromResultsBtn.addEventListener('click', () => showScreen('mainMenuScreen'));
    qrScanBtn.addEventListener('click', () => alert('Ez a funkció fejlesztés alatt áll.'));
});
