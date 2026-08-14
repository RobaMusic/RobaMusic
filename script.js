let songsData = [];
let isSongsDataLoaded = false;
let spotifyPlayerSDKReady = false; // Jelzi, hogy a Spotify Web Playback SDK betöltődött-e
let spotifyWebApi = null; // Ide jön majd a Spotify Web API kliens
let currentSpotifyTrackId = null; // Az aktuális Spotify Track ID, amit játszanánk

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
    const playMusicGameBtn = document.getElementById('playMusicGameBtn'); // ÚJ
    const spotifyPlayerPlaceholder = document.getElementById('spotifyPlayerPlaceholder');
    const spotifyNote = document.querySelector('.spotify-note'); // ÚJ
    const remainingTimeSlider = document.getElementById('remainingTimeSlider');
    const timeRemainingText = document.getElementById('timeRemainingText');
    const stopMusicBtn = document.getElementById('stopMusicBtn'); // ÁTNEVEZVE checkAnswerBtn-ről
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
    const revealedArtist = document.getElementById('revealedArtist').querySelector('.revealed-value');
    const revealedTitle = document.getElementById('revealedTitle').querySelector('.revealed-value');
    const revealedYear = document.getElementById('revealedYear').querySelector('.revealed-value');
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
    let spotifyIframe = null;
    let playbackInterval = null;
    let currentScore = 0;
    let bestScore = localStorage.getItem('robaMusicBestScore') || 0;
    let spotifyPlayerInitialized = false; // Jelzi, hogy a lejátszó iframe betöltődött-e

    bestScoreDisplay.textContent = bestScore;

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
            // Ha a Spotify már csatlakoztatva van, engedélyezzük a játék indítását
            if (spotifyStatus.textContent === 'Spotify csatlakoztatva!') {
                startGameBtn.disabled = false;
            }
        } catch (error) {
            console.error("Hiba a dal adatok betöltésekor:", error);
            spotifyStatus.textContent = "Hiba a dal adatok betöltésekor. Kérjük, próbálja újra később.";
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

    // Spotify lejátszó iframe betöltése
    // Megjegyzés: A Spotify iframe nem ad közvetlen JavaScript vezérlést (play/pause),
    // hacsak nem a Spotify Web Playback SDK-t használjuk (ami komplexebb,
    // és API kulcsot igényel). Ezért a "Play Music" gomb csak az iframe betöltését,
    // indítását szimulálja, de a valós lejátszást az iframe-en belül kell kezelni.
    function loadSpotifyPlayer(spotifyId) {
        if (spotifyIframe) {
            spotifyIframe.remove();
            spotifyIframe = null;
            spotifyPlayerInitialized = false;
        }

        spotifyIframe = document.createElement('iframe');
        // autoplay=0, hogy a playMusicGameBtn indítsa
        spotifyIframe.src = `https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0&autoplay=0`;
        spotifyIframe.width = "100%";
        spotifyIframe.height = "80";
        spotifyIframe.frameBorder = "0";
        spotifyIframe.setAttribute('data-skip-spotify-uri', 'true'); // Elrejti az előadó/cím infót
        spotifyIframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
        spotifyIframe.loading = "lazy";

        spotifyPlayerPlaceholder.innerHTML = '';
        spotifyPlayerPlaceholder.appendChild(spotifyIframe);
        spotifyPlayerInitialized = true;
        
        // Elrejtjük az iframe-et, és csak a hangot halljuk, miután a playMusicGameBtn meg lett nyomva
        // A lejátszás gomb csak akkor lesz aktív, ha az iframe betöltődött (ami aszinkron)
        playMusicGameBtn.disabled = false;
        spotifyNote.textContent = "Kattintson a lejátszás gombra a zene indításához.";
    }

    // A playMusicGameBtn indítja a Spotify lejátszót (valódi play/pause vezérlés nélkül)
    function playCurrentSpotifyTrack() {
        if (spotifyIframe && currentSpotifyTrackId) {
            // Mivel a sima embed iframe nem vezérelhető közvetlenül,
            // újra betöltjük az iframe-et autoplay=1-gyel.
            // Ez szimulálja a lejátszást. Valódi API integrációval lenne jobb.
            spotifyIframe.src = `https://open.spotify.com/embed/track/${currentSpotifyTrackId}?utm_source=generator&theme=0&autoplay=1`;
            playMusicGameBtn.disabled = true; // Letiltjuk, amíg szól a zene
            stopMusicBtn.disabled = false;
            spotifyNote.textContent = "Zene szól...";
            startPlaybackTimer();
        }
    }

    // A stopMusicBtn leállítja a lejátszót (valódi play/pause vezérlés nélkül)
    function stopCurrentSpotifyTrack() {
        if (spotifyIframe && currentSpotifyTrackId) {
            // Újra betöltjük az iframe-et autoplay=0-val, hogy leálljon.
            spotifyIframe.src = `https://open.spotify.com/embed/track/${currentSpotifyTrackId}?utm_source=generator&theme=0&autoplay=0`;
            playMusicGameBtn.disabled = false; // Engedélyezzük újra a lejátszást
            stopMusicBtn.disabled = true;
            spotifyNote.textContent = "Zene leállítva.";
            stopPlaybackTimer();
        }
    }

    // Lejátszás időzítő indítása
    function startPlaybackTimer() {
        clearInterval(playbackInterval);

        let duration = parseInt(gameSettings.listeningTime);
        if (gameSettings.listeningTime === 'full') {
             duration = 90; // Prototípusnál fix 90 mp a "teljes dal"
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
                stopMusicBtn.click(); // Automatikusan leállítja a zenét és megjeleníti a panelt
            }
        }, 1000);
    }

    // Lejátszás időzítő leállítása
    function stopPlaybackTimer() {
        clearInterval(playbackInterval);
    }

    // --- Eseménykezelők ---

    // Spotify csatlakoztatása
    spotifyConnectBtn.addEventListener('click', () => {
        spotifyConnectBtn.disabled = true;
        spotifyStatus.textContent = 'Csatlakozás Spotifyhoz...';
        setTimeout(() => {
            spotifyStatus.textContent = 'Spotify csatlakoztatva!';
            if (isSongsDataLoaded) {
                startGameBtn.disabled = false;
            }
            spotifyConnectBtn.style.display = 'none';
        }, 2000);
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
    startPhoneGameBtn.addEventListener('click', () => {
        if (!isSongsDataLoaded) {
            alert('A dal adatok még nem töltődtek be. Kérjük, várjon!');
            return;
        }

        // --- Dal kiválasztása a beállítások alapján ---
        let availableSongs = songsData;

        // Szűrés kategória szerint
        if (gameSettings.musicStyle !== 'ALL') {
            availableSongs = availableSongs.filter(song => song.Kategória === gameSettings.musicStyle);
        }

        // Szűrés aktív státusz szerint
        availableSongs = availableSongs.filter(song => song.Aktív === 'Igen');

        if (availableSongs.length === 0) {
            alert('Nincs elérhető dal a kiválasztott kategóriában. Kérjük, módosítsa a beállításokat!');
            return;
        }

        let songsToPickFrom = availableSongs;
        if (gameSettings.songCount !== 'all' && parseInt(gameSettings.songCount) < availableSongs.length) {
            songsToPickFrom = availableSongs
                .sort(() => 0.5 - Math.random())
                .slice(0, parseInt(gameSettings.songCount));
        }

        currentSong = songsToPickFrom[Math.floor(Math.random() * songsToPickFrom.length)];

        if (currentSong) {
            console.log("Aktuális dal:", currentSong);
            currentSpotifyTrackId = currentSong['Spotify ID']; // Elmentjük az ID-t a lejátszáshoz
            currentScore = 0; // Játék indításakor a pontszám nullázása

            // Játék képernyő elemek alapállapotba állítása
            playMusicGameBtn.disabled = false; // Engedélyezzük a lejátszás gombot
            stopMusicBtn.disabled = true;     // Leállítás gomb letiltva kezdetben
            answerRevealPanel.classList.add('hidden'); // Elrejtjük az önbevallás panelt
            // Checkboxok alapállapotba állítása (ha látszanak is)
            hitTitleCheckbox.checked = false;
            hitArtistCheckbox.checked = false;
            hitYearCheckbox.checked = false;

            loadSpotifyPlayer(currentSpotifyTrackId); // Spotify lejátszó betöltése (autoplay=0)
            showScreen('gameScreen');
        } else {
            alert('Hiba: Nem sikerült dalt választani a megadott beállításokkal. Ellenőrizze a songsData-t és a szűrési logikát.');
        }
    });

    // Játék képernyő - "Zene lejátszása" gomb
    playMusicGameBtn.addEventListener('click', () => {
        playCurrentSpotifyTrack(); // Indítjuk a lejátszást
    });

    // Játék képernyő - "Zene leállítása és válasz" gomb
    stopMusicBtn.addEventListener('click', () => {
        stopCurrentSpotifyTrack(); // Leállítjuk a lejátszást
        stopPlaybackTimer(); // Leállítjuk az időzítőt is

        // Megjelenítjük a helyes dal infókat az önbevallás panelen
        revealedTitle.textContent = currentSong['Dal címe'];
        revealedArtist.textContent = currentSong.Előadó;
        revealedYear.textContent = currentSong['Megjelenési év'];

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

        // Új dal indítása: visszatérünk a Beállítások képernyőre, majd indítjuk a játékot
        // VAGY: Egyből új dalt választunk
        startPhoneGameBtn.click(); // Ez elindít egy új kört az aktuális beállításokkal
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

        // Vissza a főmenübe, de előtte frissítjük az eredményeket
        resultsBtn.click(); // Ez elnavigál az eredmények képernyőre és ott frissülnek az adatok
    });

    // Játék képernyő - Vissza a Főmenübe
    backToMainMenuFromGameBtn.addEventListener('click', () => {
        stopCurrentSpotifyTrack(); // Leállítjuk a zenét
        stopPlaybackTimer();
        if (spotifyIframe) {
            spotifyIframe.remove();
            spotifyIframe = null;
        }
        answerRevealPanel.classList.add('hidden'); // Elrejtjük az önbevallás panelt is
        playMusicGameBtn.disabled = true; // Letiltjuk
        stopMusicBtn.disabled = true; // Letiltjuk
        showScreen('mainMenuScreen');
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
