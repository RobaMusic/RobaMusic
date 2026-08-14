document.addEventListener('DOMContentLoaded', () => {
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

    // Objektum a játék beállításainak tárolására
    const gameSettings = {
        listeningTime: '45', // Alapértelmezett: 45 mp
        musicStyle: 'POP',   // Alapértelmezett: POP
        songCount: '50'      // Alapértelmezett: 50 dal
    };

    // --- Képernyőváltó funkció ---
    function showScreen(screenId) {
        // Elrejt minden képernyőt
        document.querySelectorAll('.game-container').forEach(screen => {
            screen.classList.add('hidden');
        });
        // Megjeleníti a kívánt képernyőt
        document.getElementById(screenId).classList.remove('hidden');
    }

    // --- Eseménykezelők ---

    // MOCK: Spotify csatlakoztatása
    spotifyConnectBtn.addEventListener('click', () => {
        spotifyConnectBtn.disabled = true;
        spotifyStatus.textContent = 'Csatlakozás Spotifyhoz...';
        setTimeout(() => {
            spotifyStatus.textContent = 'Spotify csatlakoztatva!';
            startGameBtn.disabled = false;
            spotifyConnectBtn.style.display = 'none'; // Eltüntetjük a Spotify gombot
        }, 2000);
    });

    // Játék indítása (Kezdőképernyőről a Főmenübe)
    startGameBtn.addEventListener('click', () => {
        showScreen('mainMenuScreen');
    });

    // Főmenü - QR-kód olvasás
    qrScanBtn.addEventListener('click', () => {
        alert('QR-kód olvasás oldal betöltése... (Funkcionalitás később)');
        // Valós implementációban: showScreen('qrScanScreen');
    });

    // Főmenü - Telefonos játék (átvezet a Beállítások képernyőre)
    phoneGameBtn.addEventListener('click', () => {
        showScreen('settingsScreen');
    });

    // Főmenü - Eredmények
    resultsBtn.addEventListener('click', () => {
        alert('Eredmények oldal betöltése... (Funkcionalitás később)');
        // Valós implementációban: showScreen('resultsScreen');
    });

    // Beállítások képernyő - Vissza a Főmenübe
    backToMainMenuFromSettingsBtn.addEventListener('click', () => {
        showScreen('mainMenuScreen');
    });

    // Beállítási opciók kiválasztása
    settingOptionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const settingType = button.dataset.setting; // Milyen beállítás (pl. listeningTime)
            const settingValue = button.dataset.value;   // Melyik érték (pl. 45)

            // Előző kiválasztott gomb de-szelektálása ugyanazon beállítási típuson belül
            document.querySelectorAll(`.setting-option-button[data-setting="${settingType}"]`).forEach(btn => {
                btn.classList.remove('selected');
            });

            // Aktuális gomb szelektálása
            button.classList.add('selected');

            // Beállítás mentése az objektumba
            gameSettings[settingType] = settingValue;
            console.log('Aktuális beállítások:', gameSettings); // Konzolra írás ellenőrzéshez
        });
    });

    // Beállítások képernyő - Játék kezdése (telefonos játék)
    startPhoneGameBtn.addEventListener('click', () => {
        alert(`Játék indítása a következő beállításokkal:\nIdőtartam: ${gameSettings.listeningTime} mp\nStílus: ${gameSettings.musicStyle}\nDalok száma: ${gameSettings.songCount}`);
        // Valós implementációban: showScreen('phoneGameScreen'); és elkezdődik a játék a kiválasztott beállításokkal
    });
});
