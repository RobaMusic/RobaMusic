// SCRIPT.JS (VÉGLEGES, JAVÍTOTT VERZIÓ)

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
    return ('0' + dec.toString(16)).substr(-2);
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

// --- Spotify Player inicializálása ---
async function initializeSpotifyPlayer() {
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
        accessToken = null;
        localStorage.removeItem('spotify_access_token');
        spotifyConnectBtn.style.display = 'block';
        appStatus.textContent = 'Spotify csatlakozási token lejárt vagy érvénytelen. Kérjük, csatlakozzon újra.';
        startGameBtn.disabled = true;
    });
    player.addListener('account_error', ({ message }) => { console.error('Account Error:', message); appStatus.textContent = `Account hiba: ${message}`; });
    player.addListener('playback_error', ({ message }) => { console.error('Playback Error:', message); playbackStatusMessage.textContent = `Lejátszási hiba: ${message}`; });

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
        
        if (isPlaying) {
            playMusicGameBtn.disabled = true;
            pauseMusicGameBtn.disabled = false;
            stopMusicBtn.disabled = false;
            playbackStatusMessage.textContent = "Zene szól...";
            startPlaybackTimer(); // JAVÍTÁS 3: Az időzítő indítása a valós lejátszáskor
        } else {
            playMusicGameBtn.disabled = false;
            pauseMusicGameBtn.disabled = true;
            // A stopMusicBtn letiltását már kivettük az előző verzióban, ez így jó.
            playbackStatusMessage.textContent = "Zene szüneteltetve.";
            stopPlaybackTimer(); // JAVÍTÁS 3: Az időzítő leállítása, ha bármiért megáll a zene
        }
    });

    player.connect();
}

window.onSpotifyWebPlaybackSDKReady = initializeSpotifyPlayer;

document.addEventListener('DOMContentLoaded', async () => {
    // --- Elemek lekérdezése (változatlan) ---
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
    const answerRevealPanel = document.getElementById('answerRevealPanel');
    const revealedArtistText = document.getElementById('revealedArtistText');
    const revealedTitleText = document.getElementById('revealedTitleText');
    const revealedYearText = document.getElementById('revealedYearText');
    const hitTitleCheckbox = document.getElementById('hitTitle');
    const hitArtistCheckbox = document.getElementById('hitArtist');
    const hitYearCheckbox = document.getElementById('hitYear');
    const recordScoreAndNextBtn = document.getElementById('recordScoreAndNextBtn');
    const recordScoreAndFinishBtn = document.getElementById('recordScoreAndFinishBtn');

    // --- Játék állapot változók (változatlan) ---
    const gameSettings = { listeningTime: '45', musicStyle: 'ALL', songCount: '50' };
    let currentSong = null;
    let playbackInterval = null;
    let currentScore = 0;
    let bestScore = localStorage.getItem('robaMusicBestScore') || 0;
    let isPlaying = false;
    let currentRound = 0;
    let totalRounds = 0;
    let playedSongs = [];
    bestScoreDisplay.textContent = bestScore;

    // --- Spotify Autentikáció (változatlan) ---
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        const codeVerifier = localStorage.getItem('code_verifier');
        if (codeVerifier) {
            await exchangeCodeForToken(code, codeVerifier);
        } else {
            console.error("Code Verifier not found in localStorage.");
            appStatus.textContent = "Spotify csatlakozási hiba: code_verifier hiányzik.";
        }
        window.history.pushState({}, document.title, REDIRECT_URI);
    } else {
        accessToken = localStorage.getItem('spotify_access_token');
        if (accessToken) {
            appStatus.textContent = 'Spotify csatlakoztatva! Várja a lejátszó inicializálását...';
            spotifyConnectBtn.style.display = 'none';
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
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params,
            });
            const data = await response.json();
            if (data.access_token) {
                accessToken = data.access_token;
                localStorage.setItem('spotify_access_token', accessToken);
                appStatus.textContent = 'Spotify csatlakoztatva!';
                spotifyConnectBtn.style.display = 'none';
            } else {
                console.error("Hiba a token cseréjénél:", data);
            }
        } catch (error) {
            console.error("Hiba a token cseréje során:", error);
        }
    }

    // --- Dal adatbázis betöltése (változatlan) ---
    async function loadSongsData() {
        try {
            const response = await fetch('./assets/songs.json');
            songsData = await response.json();
            isSongsDataLoaded = true;
            console.log("Dal adatok sikeresen betöltve.");
            if (accessToken && player && deviceId) {
                startGameBtn.disabled = false;
            }
        } catch (error) {
            console.error("Hiba a dal adatok betöltésekor:", error);
        }
    }
    loadSongsData();

    // --- Segéd függvények ---
    function showScreen(screenId) {
        document.querySelectorAll('.game-container').forEach(screen => screen.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
    }

    async function playSpotifyTrack(uri) {
        if (!deviceId || !accessToken) {
            console.error("Lejátszó nem kész vagy token hiányzik.");
            return;
        }
        try {
            // Először átvesszük az irányítást
            await fetch(`https://api.spotify.com/v1/me/player`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ device_ids: [deviceId], play: false }),
            });
            
            // Majd elindítjuk a konkrét dalt
            await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
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
        remainingTimeSlider.value = timeLeft;

        const updateTimerDisplay = () => {
            timeRemainingText.textContent = `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${Math.floor(timeLeft % 60).toString().padStart(2, '0')}`;
            remainingTimeSlider.value = timeLeft;
        };
        updateTimerDisplay();

        playbackInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(playbackInterval);
                timeRemainingText.textContent = "Idő lejárt!";
                if(isPlaying) stopMusicBtn.click();
            }
        }, 1000);
    }

    function stopPlaybackTimer() {
        clearInterval(playbackInterval);
    }

    // --- Játéklogika (változatlan) ---
    function prepareAndStartNewGame() {
        if (!isSongsDataLoaded || !deviceId) {
            alert('A játék nem áll készen. Csatlakozzon a Spotify-hoz és várja meg az adatok betöltését.');
            return;
        }
        currentRound = 0;
        currentScore = 0;
        playedSongs = [];
        let filteredSongs = songsData.filter(song => song.Aktív === 'Igen' && (gameSettings.musicStyle === 'ALL' || song.Kategória === gameSettings.musicStyle));
        totalRounds = gameSettings.songCount === 'all' ? filteredSongs.length : Math.min(parseInt(gameSettings.songCount), filteredSongs.length);
        if (totalRounds === 0) {
            alert('Nincs elérhető dal a kiválasztott beállításokkal.');
            return;
        }
        startNewRound();
        showScreen('gameScreen');
    }
    
    function startNewRound() {
        currentRound++;
        if (currentRound > totalRounds) {
            endGame();
            return;
        }

        let availableSongs = songsData.filter(song => song.Aktív === 'Igen' && (gameSettings.musicStyle === 'ALL' || song.Kategória === gameSettings.musicStyle) && !playedSongs.includes(song.ID));
        if (availableSongs.length === 0) {
            alert('Nincs több elérhető dal. A játék befejeződik.');
            endGame();
            return;
        }

        currentSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
        playedSongs.push(currentSong.ID);
        
        console.log("Aktuális dal:", currentSong, "Kör:", currentRound, "/", totalRounds);
        playerDeviceStatus.textContent = `Kör: ${currentRound} / ${totalRounds}`;
        answerRevealPanel.classList.add('hidden');
        ['hitTitle', 'hitArtist', 'hitYear'].forEach(id => document.getElementById(id).checked = false);
        playMusicGameBtn.disabled = false;
        pauseMusicGameBtn.disabled = true;
        stopMusicBtn.disabled = true;
        playbackStatusMessage.textContent = "Kattintson a Zene lejátszása gombra.";
    }

    async function endGame() {
        if (player && isPlaying) await player.pause();
        stopPlaybackTimer();
        isPlaying = false;
        answerRevealPanel.classList.add('hidden');
        ['playMusicGameBtn', 'pauseMusicGameBtn', 'stopMusicBtn'].forEach(id => document.getElementById(id).disabled = true);
        currentScoreDisplay.textContent = currentScore;
        bestScoreDisplay.textContent = bestScore;
        showScreen('resultsScreen');
    }

    // --- Eseménykezelők ---
    spotifyConnectBtn.addEventListener('click', async () => {
        const codeVerifier = generatePkceVerifier(128);
        const codeChallenge = await generatePkceChallenge(codeVerifier);
        localStorage.setItem('code_verifier', codeVerifier);
        const scopes = 'user-read-playback-state user-modify-playback-state streaming user-read-email user-read-private';
        window.location = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scopes}&code_challenge_method=S256&code_challenge=${codeChallenge}&show_dialog=true`;
    });

    startGameBtn.addEventListener('click', () => showScreen('mainMenuScreen'));
    qrScanBtn.addEventListener('click', () => { alert('Ez a funkció fejlesztés alatt áll.'); showScreen('qrScanScreen'); });
    phoneGameBtn.addEventListener('click', () => showScreen('settingsScreen'));
    resultsBtn.addEventListener('click', () => { currentScoreDisplay.textContent = currentScore; bestScoreDisplay.textContent = bestScore; showScreen('resultsScreen'); });
    backToMainMenuFromSettingsBtn.addEventListener('click', () => showScreen('mainMenuScreen'));
    startPhoneGameBtn.addEventListener('click', prepareAndStartNewGame);
    
    settingOptionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const { setting, value } = button.dataset;
            document.querySelectorAll(`.setting-option-button[data-setting="${setting}"]`).forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            gameSettings[setting] = value;
        });
    });

    playMusicGameBtn.addEventListener('click', async () => {
        if (!currentSong || !currentSong.URI) {
            alert("Hiba: Nincs kiválasztott dal.");
            return;
        }
        await playSpotifyTrack(currentSong.URI);
    });

    pauseMusicGameBtn.addEventListener('click', async () => {
        if (player && isPlaying) await player.pause();
    });

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

    const recordScore = () => {
        let scoreForThisRound = (hitTitle.checked ? 1 : 0) + (hitArtist.checked ? 1 : 0) + (hitYear.checked ? 1 : 0);
        currentScore += scoreForThisRound;
        if (currentScore > bestScore) {
            bestScore = currentScore;
            localStorage.setItem('robaMusicBestScore', bestScore);
        }
        return scoreForThisRound;
    };

    recordScoreAndNextBtn.addEventListener('click', () => {
        const score = recordScore();
        alert(`Eredmény: +${score} pont! Aktuális pontszám: ${currentScore}`);
        startNewRound();
    });

    recordScoreAndFinishBtn.addEventListener('click', () => {
        const score = recordScore();
        alert(`Eredmény: +${score} pont! Játék vége. Összes pontszám: ${currentScore}`);
        endGame();
    });

    backToMainMenuFromGameBtn.addEventListener('click', () => { if (confirm("Biztosan befejezed a játékot?")) endGame(); });
    backToMainMenuFromQrBtn.addEventListener('click', () => showScreen('mainMenuScreen'));
    backToMainMenuFromResultsBtn.addEventListener('click', () => showScreen('mainMenuScreen'));
});
