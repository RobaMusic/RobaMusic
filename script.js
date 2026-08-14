let songsData = [];
let isSongsDataLoaded = false;

document.addEventListener('DOMContentLoaded', async () => {
    // ... (A képernyő elemek lekérdezése változatlan) ...

    // --- Játék állapot változók ---
    const gameSettings = {
        listeningTime: '45',
        musicStyle: 'ALL',   // <--- EZ VÁLTOZOTT POP-RÓL ALL-RA
        songCount: '50'
    };
    let currentSong = null;
    let spotifyIframe = null;
    let playbackInterval = null;
    let currentScore = 0;
    let bestScore = localStorage.getItem('robaMusicBestScore') || 0;

    bestScoreDisplay.textContent = bestScore;

    // ... (A loadSongsData, showScreen, loadSpotifyPlayer, startPlaybackTimer, stopPlaybackTimer, showAnswer függvények változatlanok) ...

    // --- Eseménykezelők ---
    // ... (Az összes eseménykezelő változatlan, kivéve a settingsScreen gombkezelését, ami pontosítva lett) ...

    // Beállítási opciók kiválasztása
    settingOptionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const settingType = button.dataset.setting;
            const settingValue = button.dataset.value;

            // Különleges kezelés a zenestílus gombokra:
            // Leveszi a selected osztályt az összes zenestílus gombról, ha "ALL" van kiválasztva
            if (settingType === 'musicStyle') {
                 // Ha "Összes kategória"-t választja ki, akkor az összes többit is aktívnak tekintjük logikailag
                 // de a kijelzőn csak az "ALL" gomb marad kiválasztva.
                 // Ha bármely más stílust választ, akkor az "ALL" gomb selected állapotát elveszi
                document.querySelectorAll(`.setting-option-button[data-setting="musicStyle"]`).forEach(btn => {
                    btn.classList.remove('selected');
                });
                button.classList.add('selected');
            } else if (settingType === 'songCount') {
                document.querySelectorAll(`.setting-option-button[data-setting="songCount"]`).forEach(btn => {
                    btn.classList.remove('selected');
                });
                button.classList.add('selected');
            } else { // listeningTime
                document.querySelectorAll(`.setting-option-button[data-setting="${settingType}"]`).forEach(btn => {
                    btn.classList.remove('selected');
                });
                button.classList.add('selected');
            }

            gameSettings[settingType] = settingValue;
            console.log('Aktuális beállítások:', gameSettings);
        });
    });

    // ... (A többi eseménykezelő változatlan) ...
});
