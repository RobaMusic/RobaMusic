// SCRIPT.JS (VÉGLEGES, JAVÍTOTT)

let accessToken = null, isSpotifySdkReady = false, isAudioUnlocked = false; 
let player = null, deviceId = null, songsData = [], isSongsDataLoaded = false, isPlaying = false;
let playbackInterval = null;
const gameSettings = { listeningTime: '45', musicStyle: 'ALL', songCount: '50' };
const SPOTIFY_CLIENT_ID = '64b3bdc013e84162bf973ec883854bfa';
const REDIRECT_URI = 'https://RobaMusic.github.io/RobaMusic/';

// PKCE KÓDOK
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
    return btoa(String.fromCharCode.apply(null, new Uint8Array(a))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function generatePkceChallenge(v) {
    const hashed = await sha256(v);
    return base64urlencode(hashed);
}

window.onSpotifyWebPlaybackSDKReady = () => {
    console.log("Spotify SDK betöltődött és készen áll.");
    isSpotifySdkReady = true;
    tryToInitializePlayer();
};

function tryToInitializePlayer() {
    if (accessToken && isSpotifySdkReady) {
        console.log("Minden készen áll, a lejátszó inicializálása indul...");
        initializeSpotifyPlayer();
    }
}

function startPlaybackTimer() {
    clearInterval(playbackInterval);
    const timeRemainingText = document.getElementById('timeRemainingText');
    const remainingTimeSlider = document.getElementById('remainingTimeSlider');
    const stopMusicBtn = document.getElementById('stopMusicBtn');
    let duration = gameSettings.listeningTime === 'full' ? 240 : parseInt(gameSettings.listeningTime);
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

function initializeSpotifyPlayer() {
    const appStatus = document.getElementById('appStatus');
    const startGameBtn = document.getElementById('startGameBtn');
         
    player = new window.Spotify.Player({ name: 'RobaMusic Game Player', getOAuthToken: cb => { cb(accessToken); }, volume: 0.5 });
    player.addListener('ready', ({ device_id }) => {
        deviceId = device_id;
        console.log('Lejátszó sikeresen csatlakozott. Device ID:', deviceId);
        appStatus.textContent = 'Spotify csatlakoztatva! Készen áll a játékra.';
        if (isSongsDataLoaded) startGameBtn.disabled = false;
    });
    player.addListener('player_state_changed', state => {
        if (!state) { isPlaying = false; return; }
        const wasPlaying = isPlaying;
        isPlaying = !state.paused;
        document.getElementById('playMusicGameBtn').disabled = isPlaying;
        document.getElementById('pauseMusicGameBtn').disabled = !isPlaying;
        if(isPlaying) document.getElementById('stopMusicBtn').disabled = false;
        document.getElementById('playbackStatusMessage').textContent = isPlaying ? "Zene szól..." : "Zene szüneteltetve.";
        if (isPlaying && !wasPlaying) startPlaybackTimer();
        if (!isPlaying && wasPlaying) stopPlaybackTimer();
    });
    player.addListener('authentication_error', ({ message }) => { console.error('Auth Error:', message); localStorage.removeItem('spotify_access_token'); alert("Spotify authentikációs hiba! Az oldal újratöltődik a bejelentkezéshez."); window.location.reload(); });
    player.addListener('initialization_error', ({ message }) => console.error('Init Error:', message));
    player.addListener('account_error', ({ message }) => console.error('Account Error:', message));
    player.addListener('playback_error', ({ message }) => console.error('Playback Error:', message));
    player.addListener('not_ready', () => { console.log('Device offline'); startGameBtn.disabled = true; });
    player.connect();
}

document.addEventListener('DOMContentLoaded', async () => {
    const appStatus = document.getElementById('appStatus');
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    async function exchangeCodeForToken(code, verifier) {
        const params = new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: verifier });
        try {
            const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
            if (!r.ok) { const err = await r.json(); throw new Error(err.error_description); }
            const data = await r.json();
            if (data.access_token) {
                accessToken = data.access_token;
                localStorage.setItem('spotify_access_token', accessToken);
                tryToInitializePlayer();
            }
        } catch (e) { console.error("Token csere hiba:", e); }
    }
    if (code) {
        const verifier = localStorage.getItem('code_verifier');
        if (verifier) await exchangeCodeForToken(code, verifier);
        window.history.pushState({}, document.title, REDIRECT_URI);
    } else {
        accessToken = localStorage.getItem('spotify_access_token');
        if (accessToken) {
            appStatus.textContent = 'Spotify token betöltve. Várakozás...';
            tryToInitializePlayer();
        } else {
            appStatus.textContent = 'Spotify nincs csatlakoztatva.';
        }
    }
         
    // Elemek
    const startGameBtn = document.getElementById('startGameBtn');
    const phoneGameBtn = document.getElementById('phoneGameBtn');
    const settingsScreen = document.getElementById('settingsScreen');
    const startPhoneGameBtn = document.getElementById('startPhoneGameBtn');
    const settingOptionButtons = document.querySelectorAll('.setting-option-button');
    const gameScreen = document.getElementById('gameScreen');
    const playMusicGameBtn = document.getElementById('playMusicGameBtn');
    const pauseMusicGameBtn = document.getElementById('pauseMusicGameBtn');
    const playerDeviceStatus = document.getElementById('playerDeviceStatus');
    const stopMusicBtn = document.getElementById('stopMusicBtn');
    const answerRevealPanel = document.getElementById('answerRevealPanel');
    const revealedArtistText = document.getElementById('revealedArtistText');
    const revealedTitleText = document.getElementById('revealedTitleText');
    const revealedYearText = document.getElementById('revealedYearText');
    const hitTitleCheckbox = document.getElementById('hitTitle');
    const hitArtistCheckbox = document.getElementById('hitArtist');
    const hitYearCheckbox = document.getElementById('hitYear');
    const recordScoreAndNextBtn = document.getElementById('recordScoreAndNextBtn');
    const recordScoreAndFinishBtn = document.getElementById('recordScoreAndFinishBtn');
    const resultsScreen = document.getElementById('resultsScreen');
    const currentScoreDisplay = document.getElementById('currentScore');
    const bestScoreDisplay = document.getElementById('bestScore');
    const resultsBtn = document.getElementById('resultsBtn');
    const backToMainMenuFromSettingsBtn = document.getElementById('backToMainMenuFromSettings');
    const backToMainMenuFromGameBtn = document.getElementById('backToMainMenuFromGame');
    const backToMainMenuFromQrBtn = document.getElementById('backToMainMenuFromQr');
    const backToMainMenuFromResultsBtn = document.getElementById('backToMainMenuFromResults');
    const qrScanBtn = document.getElementById('qrScanBtn');
    const spotifyConnectBtn = document.getElementById('spotifyConnectBtn');

    // Játék állapot
    let currentSong = null, currentScore = 0, bestScore = localStorage.getItem('robaMusicBestScore') || 0;
    let currentRound = 0, totalRounds = 0, playedSongs = [];
    bestScoreDisplay.textContent = bestScore;

    (async function loadSongsData() {
        try {
            const r = await fetch('./assets/songs.json');
            songsData = await r.json();
            isSongsDataLoaded = true;
            console.log("Dal adatok sikeresen betöltve.");
            if (deviceId) startGameBtn.disabled = false;
        } catch (e) { console.error("Hiba a dalok betöltésekor:", e); }
    })();

    // Segédfüggvények
    function showScreen(id) { document.querySelectorAll('.game-container').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
    async function playSpotifyTrack(uri) {
        if (!uri || typeof uri !== 'string' || !uri.startsWith('spotify:track:')) { alert("Hiba: A kiválasztott dalhoz nem tartozik érvényes Spotify link."); return; }
        if (!deviceId) return;
        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` }, body: JSON.stringify({ uris: [uri] }), });
            if (!response.ok) { const errorBody = await response.json(); alert(`Hiba a zene lejátszásakor: ${errorBody.error.message}`); }
        } catch (e) { console.error("Lejátszási API hiba:", e); }
    }
         
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

    spotifyConnectBtn.addEventListener('click', async () => {
        const verifier = generatePkceVerifier(128);
        const challenge = await generatePkceChallenge(verifier);
        localStorage.setItem('code_verifier', verifier);
        const scopes = 'user-read-playback-state user-modify-playback-state streaming user-read-email user-read-private';
        window.location.href = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scopes}&code_challenge_method=S256&code_challenge=${challenge}&show_dialog=true`;
    });

    playMusicGameBtn.addEventListener('click', () => {
        // VÉGLEGES JAVÍTÁS MOBILRA: "Néma Hang" trükk a hang kontextus feloldásához
        if (!isAudioUnlocked) {
            const silentAudio = new Audio("data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBvZiB0aGUgSmF2b1hMQURlBgAAAAAAA3Y0SmF2b1hMQURlAAAAAAAAAQUAAAAAAGM4AAAAAAAAAAE3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8wYgQAYjQEAyv/37//5q3/44AAAAA//8wYhBABiNAQEK//3//+at/+OAAAAA//8wYhAABiNAQAK//f//5q3/44AAAAA//8wYhoAAGI0BAAK//f//5q3/44AAAAA//8wYhoAAGI0BAAK//f//5q3/44AAAAA//8wYhoAAGI0BAAK//f//5q3/44AAAAA//8wYhoAAGI0BAAK//f//5q3/44AAAAA//8wYh4AAGI0BAAK//f//5q3/44AAAAA//8wYh4AAGI0BAAK//f//5q3/44AAAAA//8wYh4AAGI0BAAK//f//5q3/44AAAAA//8wYh4AAGI0BAAK//f//5q3/44AAAAA//8wYh4AAGI0BAAK//f//5q3/44AAAAA//8wYh4AAGI0BAAK//f//5q3/44AAAAA//8wYh4AAGI0BAAK//f//5q3/44AAAAA");
            silentAudio.play().catch(() => {});
            isAudioUnlocked = true;
            console.log('Mobile audio context UNLOCKED.');
        }

        if (currentSong) {
            playSpotifyTrack(currentSong.URI);
        }
    });

    pauseMusicGameBtn.addEventListener('click', async () => { if (player) await player.pause(); });
    stopMusicBtn.addEventListener('click', async () => {
        if (player) await player.pause();
        revealedTitleText.textContent = currentSong['Dal címe'];
        revealedArtistText.textContent = currentSong.Elõadó; // JAVÍTVA HULLÁMOS Õ BETŰRE!
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
