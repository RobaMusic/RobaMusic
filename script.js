// SCRIPT.JS (VÉGLEGES, STABIL, "KÉTKULCSOS" MEGOLDÁS)

// Globális változók
let songsData = [], isSongsDataLoaded = false, accessToken = null, player = null, deviceId = null;
let isSpotifySdkReady = false; // <- EZ AZ EGYIK "KULCS"

const SPOTIFY_CLIENT_ID = '64b3bdc013e84162bf973ec883854bfa';
const REDIRECT_URI = 'https://RobaMusic.github.io/RobaMusic/';

// --- PKCE segédfüggvények (változatlan) ---
function dec2hex(dec) { return ('0' + dec.toString(16)).substr(-2); }
function generatePkceVerifier(length) { let a = new Uint32Array(length / 2); window.crypto.getRandomValues(a); return Array.from(a, dec2hex).join(''); }
function sha256(plain) { const enc = new TextEncoder(); const data = enc.encode(plain); return window.crypto.subtle.digest('SHA-256', data); }
function base64urlencode(a) { return btoa(String.fromCharCode.apply(null, new Uint8Array(a))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
async function generatePkceChallenge(v) { const h = await sha256(v); return base64urlencode(h); }


// #####################################################################
// ### JAVÍTÁS: A "KÉTKULCSOS" INDÍTÁSI RENDSZER ###
// #####################################################################

/**
 * 1. LÉPÉS: Ez a funkció KÖTELEZŐ a Spotify SDK számára.
 * Azonnal definiáljuk. Amikor lefut, jelzi, hogy az SDK készen áll ("2. kulcs megvan").
 */
window.onSpotifyWebPlaybackSDKReady = () => {
    console.log("Spotify SDK betöltődött.");
    isSpotifySdkReady = true;
    tryToInitializePlayer(); // Megpróbáljuk elindítani a lejátszót.
};

/**
 * 2. LÉPÉS: A "kapuőr" funkció.
 * Csak akkor engedi tovább a folyamatot, ha mindkét kulcs megvan.
 */
function tryToInitializePlayer() {
    // Ellenőrizzük, hogy mindkét feltétel teljesül-e
    if (accessToken && isSpotifySdkReady) {
        console.log("MINDEN KÉSZ: Access Token és SDK is rendelkezésre áll. Indítás...");
        initializeSpotifyPlayer();
    } else {
        console.log(`Indítási ellenőrzés: Token megvan? ${!!accessToken}, SDK kész? ${isSpotifySdkReady}`);
    }
}

/**
 * 3. LÉPÉS: A tényleges inicializáló. Ezt már csak a "kapuőr" hívhatja meg.
 */
function initializeSpotifyPlayer() {
    const appStatus = document.getElementById('appStatus');
    const startGameBtn = document.getElementById('startGameBtn');
    
    player = new window.Spotify.Player({
        name: 'RobaMusic Game Player',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
    });

    player.addListener('ready', ({ device_id }) => {
        deviceId = device_id;
        console.log('Spotify lejátszó KÉSZ, Device ID:', deviceId);
        appStatus.textContent = 'Spotify csatlakoztatva! Készen áll a játékra.';
        if (isSongsDataLoaded) {
            startGameBtn.disabled = false;
        }
    });
    
    player.addListener('player_state_changed', state => {
        if (!state) { isPlaying = false; return; }
        const wasPlaying = isPlaying;
        isPlaying = !state.paused;
        
        const playBtn = document.getElementById('playMusicGameBtn');
        const pauseBtn = document.getElementById('pauseMusicGameBtn');
        const stopBtn = document.getElementById('stopMusicBtn');

        playBtn.disabled = isPlaying;
        pauseBtn.disabled = !isPlaying;
        if(isPlaying) stopBtn.disabled = false;
        
        document.getElementById('playbackStatusMessage').textContent = isPlaying ? "Zene szól..." : "Zene szüneteltetve.";

        if (isPlaying && !wasPlaying) startPlaybackTimer();
        if (!isPlaying && wasPlaying) stopPlaybackTimer();
    });

    // Egyéb hibakezelők
    player.addListener('initialization_error', ({ message }) => console.error('Init Error:', message));
    player.addListener('authentication_error', ({ message }) => {
        console.error('Auth Error:', message);
        localStorage.removeItem('spotify_access_token');
        alert("Spotify authentikációs hiba! Kérlek, jelentkezz be újra.");
        window.location.reload();
    });
    player.addListener('account_error', ({ message }) => console.error('Account Error:', message));
    player.addListener('playback_error', ({ message }) => console.error('Playback Error:', message));
    player.addListener('not_ready', ({ device_id }) => {
        console.log('Device offline:', device_id);
        startGameBtn.disabled = true;
    });

    player.connect();
}


document.addEventListener('DOMContentLoaded', async () => {
    // --- Elemek lekérdezése (változatlan) ---
    const spotifyConnectBtn = document.getElementById('spotifyConnectBtn'),
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
    bestScoreDisplay = document.getElementById('bestScore'),
    resultsBtn = document.getElementById('resultsBtn'),
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

    // --- Autentikációs logika ---
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    async function exchangeCodeForToken(code, verifier) {
        const params = new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: verifier });
        try {
            const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
            const data = await r.json();
            if (data.access_token) {
                accessToken = data.access_token; // "1. kulcs megvan"
                localStorage.setItem('spotify_access_token', accessToken);
                tryToInitializePlayer(); // Megpróbáljuk elindítani a lejátszót.
            } else { throw new Error('Token csere sikertelen'); }
        } catch (e) { console.error(e); }
    }

    if (code) {
        const verifier = localStorage.getItem('code_verifier');
        if (verifier) await exchangeCodeForToken(code, verifier);
        window.history.pushState({}, document.title, REDIRECT_URI);
    } else {
        accessToken = localStorage.getItem('spotify_access_token');
        if (accessToken) {
            appStatus.textContent = 'Spotify token betöltve. Várakozás az SDK-ra...';
            tryToInitializePlayer(); // Megpróbáljuk elindítani a lejátszót.
        }
    }

    // --- Dal adatbázis betöltése ---
    (async function loadSongsData() {
        try {
            const r = await fetch('./assets/songs.json');
            songsData = await r.json();
            isSongsDataLoaded = true;
            console.log("Dal adatok sikeresen betöltve.");
            if (deviceId) startGameBtn.disabled = false;
        } catch (e) { console.error("Hiba a dalok betöltésekor:", e); }
    })();

    // --- Segédfüggvények ---
    function showScreen(id) { document.querySelectorAll('.game-container').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
    async function playSpotifyTrack(uri) {
        if (!deviceId) return;
        try {
            await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify({ uris: [uri] }),
            });
        } catch (e) { console.error("Lejátszási API hiba:", e); }
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
    resultsBtn.addEventListener('click', () => { showScreen('resultsScreen'); });
    backToMainMenuFromSettingsBtn.addEventListener('click', () => showScreen('mainMenuScreen'));
    backToMainMenuFromGameBtn.addEventListener('click', () => { if (confirm("Biztosan befejezed a játékot?")) endGame(); });
    backToMainMenuFromQrBtn.addEventListener('click', () => showScreen('mainMenuScreen'));
    backToMainMenuFromResultsBtn.addEventListener('click', () => showScreen('mainMenuScreen'));
    qrScanBtn.addEventListener('click', () => alert('Ez a funkció fejlesztés alatt áll.'));
});
