document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splashScreen');
    const spotifyConnectBtn = document.getElementById('spotifyConnectBtn');
    const spotifyStatus = document.getElementById('spotifyStatus');
    const startGameBtn = document.getElementById('startGameBtn');

    const mainMenuScreen = document.getElementById('mainMenuScreen');
    const qrScanBtn = document.getElementById('qrScanBtn');
    const phoneGameBtn = document.getElementById('phoneGameBtn');
    const resultsBtn = document.getElementById('resultsBtn');

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
        splashScreen.classList.add('hidden'); // Elrejtjük a kezdőképernyőt
        mainMenuScreen.classList.remove('hidden'); // Megjelenítjük a főmenüt
    });

    // Főmenü gombok (egyelőre csak alert üzenetek)
    qrScanBtn.addEventListener('click', () => {
        alert('QR-kód olvasás oldal betöltése...');
        // Valós implementációban: mainMenuScreen.classList.add('hidden'); qrScanScreen.classList.remove('hidden');
    });

    phoneGameBtn.addEventListener('click', () => {
        alert('Telefonos játék oldal betöltése...');
        // Valós implementációban: mainMenuScreen.classList.add('hidden'); phoneGameScreen.classList.remove('hidden');
    });

    resultsBtn.addEventListener('click', () => {
        alert('Eredmények oldal betöltése...');
        // Valós implementációban: mainMenuScreen.classList.add('hidden'); resultsScreen.classList.remove('hidden');
    });
});
