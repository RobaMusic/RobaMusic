let songsData = [];
let isSongsDataLoaded = false;
let spotifyPlayerSDKReady = false; // Ezt a változót később lehet használni a Spotify SDK integrációhoz
let spotifyAudio = null; // A Spotify audio lejátszója (ha a Web Playback SDK-t használnánk)

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
    const spotifyPlayerPlaceholder = document.getElementById('spotifyPlayerPlaceholder');
    const spotifyNote = document.querySelector('.spotify-note');
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
    let spotifyIframe = null; // A Spotify iframe eleme
    let playbackInterval = null; // Az időzítő intervallum
    let currentScore = 0; // Aktuális pontszám
    let bestScore = localStorage.getItem('robaMusicBestScore') || 0; // Legjobb pontszám localStorage-ből
    let isPlaying = false; // Jelzi, hogy a zene éppen szól-e

    bestScoreDisplay.textContent = bestScore;


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
    // Ez csak betölti az iframe-et, de nem indítja el a lejátszást!
    function setupSpotifyPlayer(spotifyId) {
        if (spotifyIframe) {
            spotifyIframe.remove();
            spotifyIframe = null;
        }

        spotifyIframe = document.createElement('iframe');
        // Autoplay=0, hogy a playMusicGameBtn indítsa.
        // data-skip-spotify-uri="true" attribútum elrejti az előadó/cím infót,
        // de ehhez a Spotify embed JS-ének kellene futnia, ami nem mindig történik meg a szimpla iframe-nél.
        // Az igazi megoldás az iframe teljes elrejtése a felületen.
        spotifyIframe.src = `https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0&autoplay=0`;
        spotifyIframe.width = "100%";
        spotifyIframe.height = "100%"; // Kitölti a wrappert
        spotifyIframe.frameBorder = "0";
        // spotifyIframe.setAttribute('data-skip-spotify-uri', 'true'); // Ezt kivesszük, mert nem működik az elrejtéshez
        spotifyIframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
        spotifyIframe.loading = "lazy";

        spotifyPlayerPlaceholder.innerHTML = ''; // Ürítjük a placeholder-t
        spotifyPlayerPlaceholder.appendChild(spotifyIframe);
        
        // Letiltjuk a lejátszás gombot, amíg az iframe be nem töltődik (mock)
        playMusicGameBtn.disabled = true;
        spotifyNote.textContent = "Spotify lejátszó betöltése...";

        // Egyszerűsített "betöltés" érzékelés, valójában nincs direkt iframe event.
        setTimeout(() => {
            playMusicGameBtn.disabled = false;
            spotifyNote.textContent = "Kattintson a lejátszás gombra a zene indításához.";
        }, 1500); // 1.5 másodperc múlva "kész" a lejátszó
    }

    // A Spotify lejátszó elindítása (újratöltéssel)
    function playSpotifyTrack() {
        if (spotifyIframe && currentSong && !isPlaying) {
            // Újratöltjük az iframe-et autoplay=1-gyel, hogy a zene elinduljon.
            spotifyIframe.src = `https://open.spotify.com/embed/track/${currentSong['Spotify ID']}?utm_source=generator&theme=0&autoplay=1`;
            isPlaying = true;
            playMusicGameBtn.disabled = true; // Letiltjuk a play gombot
            stopMusicBtn.disabled = false;
            spotifyNote.textContent = "Zene szól...";
            startPlaybackTimer(); // Elindítjuk az időzítőt
        }
    }

    // A Spotify lejátszó leállítása (újratöltéssel)
    function stopSpotifyTrack() {
        if (spotifyIframe && currentSong && isPlaying) {
            // Újratöltjük az iframe-et autoplay=0-val, hogy leálljon.
            spotifyIframe.src = `https://open.spotify.com/embed/track/${currentSong['Spotify ID']}?utm_source=generator&theme=0&autoplay=0`;
            isPlaying = false;
            playMusicGameBtn.disabled = false; // Engedélyezzük újra a play gombot
            stopMusicBtn.disabled = true;
            spotifyNote.textContent = "Zene leállítva.";
            stopPlaybackTimer(); // Leállítjuk az időzítőt
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
            currentScore = 0; // Játék indításakor a pontszám nullázása

            // Játék képernyő elemek alapállapotba állítása
            answerRevealPanel.classList.add('hidden'); // Elrejtjük az önbevallás panelt
            // Checkboxok alapállapotba állítása (ha látszanak is)
            hitTitleCheckbox.checked = false;
            hitArtistCheckbox.checked = false;
            hitYearCheckbox.checked = false;

            playMusicGameBtn.disabled = false; // Engedélyezzük a lejátszás gombot
            stopMusicBtn.disabled = true; // Letiltjuk a leállítás gombot (csak akkor kell, ha szól a zene)

            setupSpotifyPlayer(currentSong['Spotify ID']); // Spotify lejátszó előkészítése
            showScreen('gameScreen');
        } else {
            alert('Hiba: Nem sikerült dalt választani a megadott beállításokkal. Ellenőrizze a songsData-t és a szűrési logikát.');
        }
    });

    // Játék képernyő - "Zene lejátszása" gomb
    playMusicGameBtn.addEventListener('click', playSpotifyTrack);

    // Játék képernyő - "Zene leállítása és válasz" gomb
    stopMusicBtn.addEventListener('click', () => {
        stopSpotifyTrack(); // Leállítjuk a lejátszást
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

        // Új dal indítása: visszatérünk a Beállítások képernyőre, majd indítjuk a játékot
        // Vagy: Egyből új dalt választunk
        // A legegyszerűbb, ha "szimuláljuk" a Beállítások -> Játék indítása folyamatot.
        stopSpotifyTrack(); // Biztos, ami biztos leállítjuk az előzőt
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

        stopSpotifyTrack(); // Leállítjuk a zenét
        stopPlaybackTimer(); // Leállítjuk az időzítőt is, ha még futna

        // Vissza a főmenübe, de előtte frissítjük az eredményeket
        resultsBtn.click(); // Ez elnavigál az eredmények képernyőre és ott frissülnek az adatok
    });

    // Játék képernyő - Vissza a Főmenübe
    backToMainMenuFromGameBtn.addEventListener('click', () => {
        stopSpotifyTrack(); // Leállítjuk a zenét
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
