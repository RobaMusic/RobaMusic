document.addEventListener('DOMContentLoaded', () => {
    const spotifyConnectBtn = document.getElementById('spotifyConnectBtn');
    const spotifyStatus = document.getElementById('spotifyStatus');
    const startGameBtn = document.getElementById('startGameBtn');
    const splashScreen = document.getElementById('splashScreen');

    // MOCK: Spotify csatlakoztatása
    spotifyConnectBtn.addEventListener('click', () => {
        // Valós implementációban itt lenne a Spotify OAuth folyamat
        // Egyelőre csak szimuláljuk a csatlakozást 2 másodperc múlva
        spotifyConnectBtn.disabled = true;
        spotifyStatus.textContent = 'Csatlakozás Spotifyhoz...';
        setTimeout(() => {
            spotifyStatus.textContent = 'Spotify csatlakoztatva!';
            startGameBtn.disabled = false; // A játék indítása gomb aktív lesz
            spotifyConnectBtn.style.display = 'none'; // Eltüntetjük a Spotify gombot
        }, 2000);
    });

    // MOCK: Játék indítása (átváltás a Főmenü képernyőre)
    startGameBtn.addEventListener('click', () => {
        alert('Játék indítása! (Később ide jön a Főmenü)');
        // Valós implementációban:
        // splashScreen.style.display = 'none';
        // mainMenuScreen.style.display = 'flex'; // Megjeleníti a főmenüt
    });
});
