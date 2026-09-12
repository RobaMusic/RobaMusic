let accessToken = null, isSpotifySdkReady = false, isAudioUnlocked = false;
let player = null, deviceId = null, activeDeviceId = null;
let songsData = [], isSongsDataLoaded = false, isPlaying = false;
let playbackInterval = null;
const gameSettings = { listeningTime: '45', musicStyle: 'ALL' };
const SPOTIFY_CLIENT_ID = '64b3bdc013e84162bf973ec883854bfa';

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

const REDIRECT_URI = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? window.location.origin + window.location.pathname
    : 'https://robamusic.github.io/RobaMusic/';

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

// Spotify Web Playback SDK (Android & Desktop)
window.onSpotifyWebPlaybackSDKReady = () => {
    console.log("Spotify SDK készen áll.");
    isSpotifySdkReady = true;
    if (!isIOS) tryToInitializePlayer();
};

function tryToInitializePlayer() {
    if (accessToken && isSpotifySdkReady && !player) {
        initializeSpotifyPlayer();
    }
}

function initializeSpotifyPlayer() {
    const appStatus = document.getElementById('appStatus');
    const startGameBtn = document.getElementById('startGameBtn');
              
    player = new window.Spotify.Player({ 
        name: 'RobaMusic Game Player', 
        getOAuthToken: cb => { cb(accessToken); }, 
        volume: 0.8 
    });
    
    player.addListener('ready', async ({ device_id }) => {
        deviceId = device_id;
        console.log('SDK Lejátszó csatlakozott. Device ID:', deviceId);
        
        try {
            await fetch('https://api.spotify.com/v1/me/player', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ device_ids: [deviceId], play: false })
            });
        } catch (err) {
            console.warn('Eszköz átirányítási hiba:', err);
        }

        appStatus.textContent = 'Spotify csatlakoztatva (SDK Lejátszó)!';
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

    player.addListener('authentication_error', () => { 
        localStorage.removeItem('spotify_access_token'); 
        alert("Spotify authentikációs hiba! Újrajelentkezés szükséges."); 
        window.location.reload(); 
    });
    
    player.connect();
}

async function fetchActiveDevice() {
    if (!accessToken) return null;
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) return null;
        const data = await response.json();
        const devices = data.devices || [];
        const device = devices.find(d => d.is_active) || devices[0];
        if (device) {
            activeDeviceId = device.id;
            return activeDeviceId;
        }
    } catch (e) {
        console.error("Eszközök lekérdezése hiba:", e);
    }
    return null;
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
                onTokenReady();
            }
        } catch (e) { console.error("Token csere hiba:", e); }
    }

    async function onTokenReady() {
        if (isIOS) {
            appStatus.textContent = 'Spotify csatlakoztatva! (iOS Mód)';
            await fetchActiveDevice();
            if (isSongsDataLoaded) startGameBtn.disabled = false;
        } else {
            appStatus.textContent = 'Spotify csatlakoztatva! Lejátszó előkészítése...';
            tryToInitializePlayer();
        }
    }

    if (code) {
        const verifier = localStorage.getItem('code_verifier');
        if (verifier) await exchangeCodeForToken(code, verifier);
        window.history.pushState({}, document.title, REDIRECT_URI);
    } else {
        accessToken = localStorage.getItem('spotify_access_token');
        if (accessToken) {
            onTokenReady();
        } else {
            appStatus.textContent = 'Spotify nincs csatlakoztatva.';
        }
    }
              
    const startGameBtn = document.getElementById('startGameBtn');
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
    const backToMainMenuFromGameBtn = document.getElementById('backToMainMenuFromGame');
    const backToMainMenuFromResultsBtn = document.getElementById('backToMainMenuFromResults');
    const spotifyConnectBtn = document.getElementById('spotifyConnectBtn');

    let currentSong = null, currentScore = 0, bestScore = localStorage.getItem('robaMusicBestScore') || 0;
    let currentRound = 0, totalRounds = 0, playedSongs = [];
    bestScoreDisplay.textContent = bestScore;

    (async function loadSongsData() {
        try {
            const r = await fetch('./assets/songs.json');
            songsData = await r.json();
            isSongsDataLoaded = true;
            if (accessToken) startGameBtn.disabled = false;
        } catch (e) { console.error("Hiba a dalok betöltésekor:", e); }
    })();

    function showScreen(id) { document.querySelectorAll('.game-container').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
    
    async function playSpotifyTrack(uri) {
        if (!uri || !uri.startsWith('spotify:track:')) { alert("Hiba: Érvénytelen Spotify link."); return; }

        const targetDeviceId = isIOS ? await fetchActiveDevice() : deviceId;

        const url = targetDeviceId 
            ? `https://api.spotify.com/v1/me/player/play?device_id=${targetDeviceId}`
            : `https://api.spotify.com/v1/me/player/play`;

        try {
            const response = await fetch(url, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` }, 
                body: JSON.stringify({ uris: [uri] }), 
            });

            if (response.status === 403 || response.status === 404) {
                alert("A lejátszás nem indítható el. Győződj meg róla, hogy Spotify Premium fiókot használsz, és Androidon/PC-n az engedélyek meg vannak adva, vagy iOS-en meg van nyitva a Spotify app.");
                return;
            }

            if (!response.ok) {
                const errorBody = await response.json();
                console.warn("Lejátszási hiba:", errorBody);
                if (errorBody.error && errorBody.error.message.includes("Restriction")) {
                    currentRound--;
                    playedSongs.pop();
                    startNewRound();
                    if (currentSong) playSpotifyTrack(currentSong.URI);
                }
            } else {
                isPlaying = true;
                playMusicGameBtn.disabled = true;
                pauseMusicGameBtn.disabled = false;
                stopMusicBtn.disabled = false;
                document.getElementById('playbackStatusMessage').textContent = "Zene szól...";
                startPlaybackTimer();
            }
        } catch (e) { console.error("API hiba:", e); }
    }

    async function pauseSpotifyTrack() {
        if (player && !isIOS) {
            await player.pause();
        } else {
            try {
                await fetch('https://api.spotify.com/v1/me/player/pause', {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
            } catch (e) { console.error("Pause hiba:", e); }
        }
        isPlaying = false;
        playMusicGameBtn.disabled = false;
        pauseMusicGameBtn.disabled = true;
        document.getElementById('playbackStatusMessage').textContent = "Zene szüneteltetve.";
        stopPlaybackTimer();
    }
              
    function prepareAndStartNewGame() {
        let songs = songsData.filter(s => (!s.hasOwnProperty('Aktív') || s.Aktív === 'Igen') && (gameSettings.musicStyle === 'ALL' || s.Kategória === gameSettings.musicStyle));
        totalRounds = Math.min(50, songs.length);

        if (totalRounds === 0) { alert('Nincs elérhető dal.'); return; }
        currentRound = 0; currentScore = 0; playedSongs = [];
        startNewRound(); showScreen('gameScreen');
    }

    function startNewRound() {
        currentRound++;
        if (currentRound > totalRounds) { endGame(); return; }
        let available = songsData.filter(s => (!s.hasOwnProperty('Aktív') || s.Aktív === 'Igen') && !playedSongs.includes(s.URI) && (gameSettings.musicStyle === 'ALL' || s.Kategória === gameSettings.musicStyle));
        if (available.length === 0) { endGame(); return; }
        currentSong = available[Math.floor(Math.random() * available.length)];
        playedSongs.push(currentSong.URI);
        playerDeviceStatus.textContent = `Kör: ${currentRound} / ${totalRounds}`;
        answerRevealPanel.classList.add('hidden');
        [hitTitleCheckbox, hitArtistCheckbox, hitYearCheckbox].forEach(cb => cb.checked = false);
        playMusicGameBtn.disabled = false;
        pauseMusicGameBtn.disabled = true;
        stopMusicBtn.disabled = true;
    }

    async function endGame() {
        if (isPlaying) await pauseSpotifyTrack();
        currentScoreDisplay.textContent = currentScore;
        bestScoreDisplay.textContent = bestScore;
        showScreen('resultsScreen');
    }

    spotifyConnectBtn.addEventListener('click', async () => {
        const verifier = generatePkceVerifier(128);
        const challenge = await generatePkceChallenge(verifier);
        localStorage.setItem('code_verifier', verifier);
        const scopes = 'user-read-playback-state user-modify-playback-state streaming user-read-email user-read-private';
        window.location.href = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&code_challenge_method=S256&code_challenge=${challenge}&show_dialog=true`;
    });

    playMusicGameBtn.addEventListener('click', () => {
        if (player && typeof player.activateElement === 'function') {
            player.activateElement();
        }
        if (currentSong) {
            playSpotifyTrack(currentSong.URI);
        }
    });

    pauseMusicGameBtn.addEventListener('click', () => pauseSpotifyTrack());

    stopMusicBtn.addEventListener('click', async () => {
        await pauseSpotifyTrack();
        revealedTitleText.textContent = currentSong['Dal címe'];
        revealedArtistText.textContent = currentSong.Elõadó || currentSong.Előadó; 
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
    startGameBtn.addEventListener('click', () => showScreen('settingsScreen'));
    startPhoneGameBtn.addEventListener('click', prepareAndStartNewGame);
    settingOptionButtons.forEach(b => b.addEventListener('click', () => {
        const { setting, value } = b.dataset;
        document.querySelectorAll(`.setting-option-button[data-setting="${setting}"]`).forEach(btn => btn.classList.remove('selected'));
        b.classList.add('selected'); gameSettings[setting] = value;
    }));
    resultsBtn.addEventListener('click', () => { showScreen('resultsScreen'); });
    backToMainMenuFromGameBtn.addEventListener('click', () => { if (confirm("Biztosan befejezed a játékot?")) endGame(); });
    backToMainMenuFromResultsBtn.addEventListener('click', () => showScreen('settingsScreen'));
});
