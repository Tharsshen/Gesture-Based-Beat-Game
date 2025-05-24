document.addEventListener('DOMContentLoaded', () => {
    const debugConsole = document.getElementById('debug-console');
    const debugLogContainer = document.getElementById('debug-log');
    const debugToggleBtn = document.getElementById('debug-toggle-btn');
    const toggleDebugBtn = document.getElementById('toggle-debug');
    const clearDebugBtn = document.getElementById('clear-debug');
    
    function logDebugMessage(message, level = 'info') {
        if (!debugLogContainer) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `debug-entry debug-${level}`;
        logEntry.innerHTML = `<span class="debug-time">[${timestamp}]</span> ${message}`;
        
        debugLogContainer.appendChild(logEntry);
        debugLogContainer.scrollTop = debugLogContainer.scrollHeight;
        
        while (debugLogContainer.children.length > 100) {
            debugLogContainer.removeChild(debugLogContainer.firstChild);
        }
    }
    
    if (debugToggleBtn) {
        debugToggleBtn.addEventListener('click', () => {
            if (debugConsole) {
                debugConsole.classList.remove('hidden');
                debugConsole.classList.add('visible');
                logDebugMessage("Debug console opened");
            }
        });
    }
    
    if (toggleDebugBtn) {
        toggleDebugBtn.addEventListener('click', () => {
            if (debugConsole) {
                if (debugConsole.classList.contains('visible')) {
                    debugConsole.classList.remove('visible');
                    debugConsole.classList.add('hidden');
                    toggleDebugBtn.textContent = 'Show';
                } else {
                    debugConsole.classList.remove('hidden');
                    debugConsole.classList.add('visible');
                    toggleDebugBtn.textContent = 'Hide';
                }
            }
        });
    }
    
    if (clearDebugBtn) {
        clearDebugBtn.addEventListener('click', () => {
            if (debugLogContainer) {
                debugLogContainer.innerHTML = '';
                logDebugMessage("Debug log cleared");
            }
        });
    }
    
    logDebugMessage("Debug console initialized", "info");

    let gameState = {
        mode: null,
        song: null,
        songFile: null,
        patterns: null,
        player1: { score: 0, combo: 0, maxCombo: 0, hits: 0, totalNotes: 0 },
        isRunning: false,
        currentNoteIndex: 0,
        speedMultiplier: 1.0,
        bpm: 120,
        difficultyMultiplier: 1.0,
        songDuration: 0,
        timeLimit: 0,
        timeRemaining: 0,
        difficulty: 'medium',
        soundVolumes: {
            song: 0.5,
            hit: 1.0,
            miss: 0.0,
            combo: 1.0
        },
        difficultySettings: {
            easy: {
                tilesPerMinute: 20,      
                maxActiveTiles: 1,       
                fallingSpeed: 5.0,       
                minSpacing: 3000,        
                description: 'Super slow pace for beginners'
            },
            medium: {
                tilesPerMinute: 40,      
                maxActiveTiles: 2,       
                fallingSpeed: 3.0,       
                minSpacing: 1500,       
                description: 'Balanced pace for casual players'
            },
            hard: {
                tilesPerMinute: 80,      
                maxActiveTiles: 3,       
                fallingSpeed: 2.0,       
                minSpacing: 750,         
                description: 'Fast-paced challenge for experienced players'
            },
            expert: {
                tilesPerMinute: 120,     
                maxActiveTiles: 4,       
                fallingSpeed: 1.5,       
                minSpacing: 500,         
                description: 'Intense rhythm challenge for experts'
            }
        }
    };

    const screens = {
        splash: document.getElementById('splash-screen'),
        tutorial: document.getElementById('tutorial-screen'),
        leaderboard: document.getElementById('leaderboard-screen'),
        songSelect: document.getElementById('song-select-screen'),
        game: document.getElementById('game-screen'),
        results: document.getElementById('results-screen')
    };

    const audio = {
        song: document.getElementById('song-audio'),
        hit: document.getElementById('hit-sound'),
        miss: document.getElementById('miss-sound'),
        combo: document.getElementById('combo-sound')
    };

    Object.entries(gameState.soundVolumes).forEach(([key, volume]) => {
        if (audio[key]) {
            audio[key].volume = volume;
            if (key !== 'song') {
                audio[key].addEventListener('error', () => {
                    logDebugMessage(`Failed to load ${key} sound, continuing without it`, "warning");
                });
                
                audio[key].addEventListener('timeupdate', function() {
                    if (this.currentTime > 0.5) {
                        this.pause();
                        this.currentTime = 0;
                    }
                });
            }
        }
    });

    function playSound(soundName) {
        if (audio[soundName]) {
            audio[soundName].play().catch(e => {
                logDebugMessage(`Error playing ${soundName} sound: ${e.message}`, "warning");
            });
        }
    }

    const timeLimit = document.getElementById('time-limit');
    const gameSpeed = document.getElementById('game-speed');
    const difficultySelect = document.getElementById('difficulty-select');
    const musicVolume = document.getElementById('music-volume');
    const effectsVolume = document.getElementById('effects-volume');
    const musicVolumeValue = document.getElementById('music-volume-value');
    const effectsVolumeValue = document.getElementById('effects-volume-value');
    
    const songTimeLimit = document.getElementById('song-time-limit');
    const songGameSpeed = document.getElementById('song-game-speed');
    const songDifficultySelect = document.getElementById('song-difficulty-select');
    const songMusicVolume = document.getElementById('song-music-volume');
    const songEffectsVolume = document.getElementById('song-effects-volume');
    const songMusicVolumeValue = document.getElementById('song-music-volume-value');
    const songEffectsVolumeValue = document.getElementById('song-effects-volume-value');

    const tutorialDifficulty = document.getElementById('difficulty-select');
    const tutorialTimeLimit = document.getElementById('time-limit');
    const tutorialGameSpeed = document.getElementById('game-speed');
    const tutorialMusicVolume = document.getElementById('music-volume');
    const tutorialEffectsVolume = document.getElementById('effects-volume');
    const tutorialMusicVolumeValue = document.getElementById('music-volume-value');
    const tutorialEffectsVolumeValue = document.getElementById('effects-volume-value');

    function syncSettings() {
        if (difficultySelect && tutorialDifficulty) {
            tutorialDifficulty.value = difficultySelect.value;
        }
        if (timeLimit && tutorialTimeLimit) {
            tutorialTimeLimit.value = timeLimit.value;
        }
        if (gameSpeed && tutorialGameSpeed) {
            tutorialGameSpeed.value = gameSpeed.value;
        }
        if (musicVolume && tutorialMusicVolume) {
            tutorialMusicVolume.value = musicVolume.value;
            tutorialMusicVolumeValue.textContent = `${musicVolume.value}%`;
        }
        if (effectsVolume && tutorialEffectsVolume) {
            tutorialEffectsVolume.value = effectsVolume.value;
            tutorialEffectsVolumeValue.textContent = `${effectsVolume.value}%`;
        }
    }

    if (timeLimit) {
        timeLimit.addEventListener('change', () => {
            gameState.timeLimit = parseInt(timeLimit.value);
            logDebugMessage(`Time limit set to: ${gameState.timeLimit} seconds`);
        });
    }

    if (gameSpeed) {
        gameSpeed.addEventListener('change', () => {
            gameState.speedMultiplier = parseFloat(gameSpeed.value);
            logDebugMessage(`Game speed set to: ${gameState.speedMultiplier}x`);
        });
    }
    
    if (difficultySelect) {
        difficultySelect.addEventListener('change', () => {
            gameState.difficulty = difficultySelect.value;
            logDebugMessage(`Difficulty set to: ${gameState.difficulty}`);
        });
    }

    if (musicVolume) {
        musicVolume.addEventListener('input', () => {
            const value = musicVolume.value;
            gameState.soundVolumes.song = value / 100;
            audio.song.volume = gameState.soundVolumes.song;
            if (musicVolumeValue) {
                musicVolumeValue.textContent = `${value}%`;
            }
        });
    }

    if (effectsVolume) {
        effectsVolume.addEventListener('input', () => {
            const value = effectsVolume.value;
            gameState.soundVolumes.hit = value / 100;
            gameState.soundVolumes.combo = value / 100;
            if (effectsVolumeValue) {
                effectsVolumeValue.textContent = `${value}%`;
            }
        });
    }

    if (tutorialDifficulty) {
        tutorialDifficulty.addEventListener('change', () => {
            if (difficultySelect) {
                difficultySelect.value = tutorialDifficulty.value;
                gameState.difficulty = tutorialDifficulty.value;
                logDebugMessage(`Difficulty set to: ${gameState.difficulty} (from tutorial)`);
            }
        });
    }

    if (tutorialTimeLimit) {
        tutorialTimeLimit.addEventListener('change', () => {
            if (timeLimit) {
                timeLimit.value = tutorialTimeLimit.value;
                gameState.timeLimit = parseInt(tutorialTimeLimit.value);
                logDebugMessage(`Time limit set to: ${gameState.timeLimit} seconds (from tutorial)`);
            }
        });
    }

    if (tutorialGameSpeed) {
        tutorialGameSpeed.addEventListener('change', () => {
            if (gameSpeed) {
                gameSpeed.value = tutorialGameSpeed.value;
                gameState.speedMultiplier = parseFloat(tutorialGameSpeed.value);
                logDebugMessage(`Game speed set to: ${gameState.speedMultiplier}x (from tutorial)`);
            }
        });
    }

    if (tutorialMusicVolume) {
        tutorialMusicVolume.addEventListener('input', () => {
            const value = tutorialMusicVolume.value;
            if (musicVolume) {
                musicVolume.value = value;
                gameState.soundVolumes.song = value / 100;
                audio.song.volume = gameState.soundVolumes.song;
                musicVolumeValue.textContent = `${value}%`;
            }
            if (tutorialMusicVolumeValue) {
                tutorialMusicVolumeValue.textContent = `${value}%`;
            }
        });
    }

    if (tutorialEffectsVolume) {
        tutorialEffectsVolume.addEventListener('input', () => {
            const value = tutorialEffectsVolume.value;
            if (effectsVolume) {
                effectsVolume.value = value;
                gameState.soundVolumes.hit = value / 100;
                gameState.soundVolumes.combo = value / 100;
                effectsVolumeValue.textContent = `${value}%`;
            }
            if (tutorialEffectsVolumeValue) {
                tutorialEffectsVolumeValue.textContent = `${value}%`;
            }
        });
    }

    const toggleHelpBtn = document.getElementById('toggle-help');
    const gestureGuideOverlay = document.getElementById('gesture-guide-overlay');
    
    if (toggleHelpBtn && gestureGuideOverlay) {
        toggleHelpBtn.addEventListener('click', () => {
            gestureGuideOverlay.classList.toggle('hidden');
            toggleHelpBtn.textContent = gestureGuideOverlay.classList.contains('hidden') ? 'Show Help' : 'Hide Help';
            logDebugMessage(`Help overlay ${gestureGuideOverlay.classList.contains('hidden') ? 'hidden' : 'shown'}`);
        });
        
        gestureGuideOverlay.addEventListener('click', (e) => {
            if (e.target === gestureGuideOverlay) {
                gestureGuideOverlay.classList.add('hidden');
                toggleHelpBtn.textContent = 'Show Help';
                logDebugMessage("Help overlay hidden by clicking outside");
            }
        });
    }

    document.getElementById('single-player-btn').addEventListener('click', () => {
        gameState.mode = 'single';
        showScreen(screens.songSelect);
        logDebugMessage("Single player mode selected");
    });


    document.getElementById('tutorial-btn').addEventListener('click', () => {
        showScreen(screens.tutorial);
        syncSettings();
        logDebugMessage("Tutorial screen opened");
    });

    document.getElementById('back-to-menu').addEventListener('click', () => {
        showScreen(screens.splash);
        logDebugMessage("Returned to main menu from tutorial");
    });

    function showScreen(screen) {
        Object.values(screens).forEach(s => s.classList.add('hidden'));
        screen.classList.remove('hidden');
        logDebugMessage(`Screen switched to ${screen.id}`);
    }

    document.getElementById('back-from-songs').addEventListener('click', () => {
        showScreen(screens.splash);
        logDebugMessage("Returned to main menu from song select");
    });

    document.getElementById('exit-game').addEventListener('click', () => {
        endGame();
        logDebugMessage("Game exited");
    });

    document.getElementById('play-again').addEventListener('click', () => {
        showScreen(screens.songSelect);
        resetGameState();
        restartWebcam();
        logDebugMessage("Play again selected");
    });

    document.getElementById('back-to-main').addEventListener('click', () => {
        showScreen(screens.splash);
        resetGameState();
        logDebugMessage("Returned to main menu from results");
    });

    const showSongSettingsBtn = document.getElementById('show-song-settings');
    const songSettingsPanel = document.getElementById('song-settings-panel');
    
    if (showSongSettingsBtn && songSettingsPanel) {
        showSongSettingsBtn.addEventListener('click', () => {
            songSettingsPanel.classList.toggle('hidden');
            showSongSettingsBtn.textContent = songSettingsPanel.classList.contains('hidden') ? 
                'Game Settings' : 'Hide Settings';
            logDebugMessage(`Song settings panel ${songSettingsPanel.classList.contains('hidden') ? 'hidden' : 'shown'}`);
        });
    }

    function showScreen(screen) {
        Object.values(screens).forEach(s => s.classList.add('hidden'));
        screen.classList.remove('hidden');
        logDebugMessage(`Screen switched to ${screen.id}`);
    }

    function setLoadingProgress(percent) {
        const progressContainer = document.getElementById('loading-progress-container');
        const progressFill = document.getElementById('loading-progress-fill');
        const progressPercent = document.getElementById('loading-progress-percent');
        if (progressContainer && progressFill && progressPercent) {
            progressContainer.style.display = 'block';
            progressFill.style.width = percent + '%';
            progressPercent.textContent = Math.round(percent) + '%';
        }
    }
    function hideLoadingProgress() {
        const progressContainer = document.getElementById('loading-progress-container');
        if (progressContainer) progressContainer.style.display = 'none';
    }

    document.getElementById('song-search-btn').addEventListener('click', async () => {
        const query = document.getElementById('song-search-input').value;
        if (!query) {
            alert('Please enter a search query');
            logDebugMessage("Song search attempted with empty query", "error");
            return;
        }

        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        
        if (loadingOverlay) {
            loadingText.textContent = 'Searching for songs...';
            loadingOverlay.classList.remove('hidden');
            setLoadingProgress(10);
        }

        try {
            setLoadingProgress(30);
            const response = await fetch('/search_song', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            setLoadingProgress(60);
            if (!response.ok) {
                throw new Error(`Search request failed: ${response.statusText}`);
            }
            const results = await response.json();
            setLoadingProgress(100);

            const songList = document.getElementById('song-list');
            songList.innerHTML = '';
            if (!results || results.length === 0) {
                songList.innerHTML = '<p>No songs found. Try a different search.</p>';
                logDebugMessage("No songs found for query: " + query);
                return;
            }

            results.forEach(song => {
                const songEl = document.createElement('div');
                songEl.classList.add('song-item');
                songEl.innerHTML = `
                    <span class="song-title">${song.title}</span>
                `;
                songEl.dataset.videoId = song.id;
                songEl.dataset.title = song.title;
                songEl.addEventListener('click', () => selectSong(song.id, song.title));
                songList.appendChild(songEl);
            });

            logDebugMessage(`Found ${results.length} songs for query: ${query}`);
        } catch (error) {
            console.error('Error during song search:', error);
            logDebugMessage(`Error during song search: ${error.message}`, "error");
            alert('Error searching for songs: ' + error.message);
        } finally {
            setTimeout(() => {
                hideLoadingProgress();
                if (loadingOverlay) loadingOverlay.classList.add('hidden');
            }, 400);
        }
    });

    async function selectSong(videoId, songName) {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        
        if (loadingOverlay) {
            loadingText.textContent = 'Processing song...';
            loadingOverlay.classList.remove('hidden');
            setLoadingProgress(10);
        }

        document.querySelectorAll('.song-item').forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.videoId === videoId) {
                item.classList.add('selected');
            }
        });

        try {
            setLoadingProgress(30);
            const response = await fetch('/select_song', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ video_id: videoId, song_name: songName })
            });
            setLoadingProgress(60);
            if (!response.ok) {
                throw new Error(`Select song request failed: ${response.statusText}`);
            }
            const songData = await response.json();

            if (!songData.name || !songData.file || !songData.bpm || !songData.multiplier) {
                throw new Error('Invalid song data returned from server');
            }

            gameState.song = songData.name;
            gameState.songFile = songData.file;
            gameState.bpm = songData.bpm;
            gameState.difficultyMultiplier = songData.multiplier;
            gameState.songDuration = songData.duration;

            const selectedSongInfo = document.getElementById('selected-song-info');
            const selectedSongTitle = document.getElementById('selected-song-title');
            const songBpm = document.getElementById('song-bpm');
            const songDuration = document.getElementById('song-duration');
            const songDifficulty = document.getElementById('song-difficulty');
            
            if (selectedSongInfo) selectedSongInfo.classList.remove('hidden');
            if (selectedSongTitle) selectedSongTitle.textContent = songName;
            if (songBpm) songBpm.textContent = Math.round(songData.bpm);
            if (songDuration) songDuration.textContent = formatTime(songData.duration);
            if (songDifficulty) songDifficulty.textContent = songData.difficulty;

            logDebugMessage(`Song selected: ${songName} (BPM: ${songData.bpm}, Duration: ${songData.duration}s, Difficulty: ${songData.difficulty})`);
        } catch (error) {
            console.error('Error selecting song:', error);
            logDebugMessage(`Error selecting song: ${error.message}`, "error");
            alert('Failed to select song: ' + error.message);
        } finally {
            setTimeout(() => {
                hideLoadingProgress();
                if (loadingOverlay) loadingOverlay.classList.add('hidden');
            }, 400);
        }
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    document.getElementById('start-game-btn').addEventListener('click', startGame);

    const playPauseBtn = document.getElementById('play-pause-btn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            if (!gameState.isRunning) {
                gameState.isRunning = true;
                audio.song.play().catch(e => logDebugMessage(`Audio play failed: ${e.message}`, "error"));
                playPauseBtn.textContent = 'Pause';
                logDebugMessage("Game resumed");
            } else {
                gameState.isRunning = false;
                audio.song.pause();
                playPauseBtn.textContent = 'Play';
                logDebugMessage("Game paused");
            }
        });
    }

    const stopBtn = document.getElementById('stop-btn');
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            endGame();
            logDebugMessage("Game stopped via stop button");
        });
    }
    
    const gestureTypes = ['peace', 'index', 'fist', 'open_hand'];
    let lanePositions = [];

    function calculateLanePositions() {
        lanePositions = [12.5, 37.5, 62.5, 87.5]; 
        logDebugMessage(`Calculated lane positions as percentages: ${lanePositions}`);
    }

    function initializeGameLane() {
        calculateLanePositions();
        window.addEventListener('resize', calculateLanePositions);
        
        initializeGestureIcons();
        
        logDebugMessage('Game lanes initialized with gesture icons and hit zones');
    }

    function setupHitBoxes(playerLane, player) {
        playerLane.querySelectorAll('.hit-box').forEach(box => box.remove());
        lanePositions.forEach((percent, laneIdx) => {
            const hitBox = document.createElement('div');
            hitBox.classList.add('hit-box');
            hitBox.style.left = `${percent}%`;
            hitBox.style.transform = 'translateX(-50%)';
            hitBox.dataset.lane = laneIdx;
            hitBox.innerHTML = `<div class="hit-box-icon"></div>`;
            playerLane.appendChild(hitBox);
        });
        logDebugMessage(`Hit boxes set up for ${player} with positions: ${lanePositions}`);
    }

    function updateHitBoxIcons(player) {
        const playerLane = document.getElementById(`${player}-gameplay`);
        const hitBoxes = playerLane.querySelectorAll('.hit-box');
        const tiles = Array.from(playerLane.querySelectorAll('.tile'));
        const hitZoneTop = playerLane.clientHeight - 80;

        hitBoxes.forEach(hitBox => {
            hitBox.classList.remove('active', ...gestureTypes);
            hitBox.querySelector('.hit-box-icon').className = 'hit-box-icon';
        });

        const closestTiles = Array(lanePositions.length).fill(null);
        tiles.forEach(tile => {
            const tileRect = tile.getBoundingClientRect();
            const laneRect = playerLane.getBoundingClientRect();
            const tileBottom = tileRect.bottom - laneRect.top;
            const laneIdx = lanePositions.findIndex(pos => Math.abs(parseFloat(tile.style.left) - pos) < 1);

            if (laneIdx >= 0 && tileBottom <= hitZoneTop + 200 && tileBottom >= hitZoneTop - 200) {
                if (!closestTiles[laneIdx] || tileBottom > closestTiles[laneIdx].bottom) {
                    closestTiles[laneIdx] = { tile, bottom: tileBottom };
                }
            }
        });

        closestTiles.forEach((closest, laneIdx) => {
            if (closest) {
                const hitBox = hitBoxes[laneIdx];
                const gesture = closest.tile.dataset.gesture;
                hitBox.classList.add('active', gesture);
                hitBox.querySelector('.hit-box-icon').className = `hit-box-icon ${gesture}`;
                if (closest.bottom >= hitZoneTop - 80 && closest.bottom <= hitZoneTop + 120) {
                    hitBox.classList.add('in-hit-zone');
                }
            }
        });
    }
    
    function generateTile(playerLane, gestureType, spawnTime, fallDuration) {
        const tile = document.createElement('div');
        tile.classList.add('tile', gestureType);
        tile.innerHTML = `<div class="tile-icon"></div>`;
        const adjustedFallDuration = fallDuration / gameState.speedMultiplier;
        tile.style.animationDuration = `${adjustedFallDuration}s`;
        const randomDelay = Math.random() * 0.3;
        tile.style.animationDelay = `${randomDelay}s`;
        tile.dataset.gesture = gestureType;
        tile.dataset.spawnTime = spawnTime;
        tile.dataset.fallDuration = adjustedFallDuration;
        const laneIdx = Math.floor(Math.random() * lanePositions.length);
        tile.style.left = `${lanePositions[laneIdx]}%`;
        tile.style.transform = 'translateX(-50%)';
        playerLane.appendChild(tile);
        if (gameState.player1) gameState.player1.totalNotes++;
        tile.addEventListener('animationend', () => {
            if (tile.parentElement) {
                tile.classList.add('expired');
                setTimeout(() => {
                    if (tile.parentElement) {
                        tile.remove();
                        handleMiss('player1');
                    }
                }, 200);
            }
        });
        return tile;
    }
    
    function startTileGeneration() {
        const settings = gameState.difficultySettings[gameState.difficulty];
        const tilesPerMinute = settings.tilesPerMinute * gameState.speedMultiplier;
        const intervalMs = (60 / tilesPerMinute) * 1000;
        const fallDuration = settings.fallingSpeed / gameState.speedMultiplier;
        
        let minTiles;
        if (gameState.timeLimit === 30) {
            minTiles = Math.min(25, tilesPerMinute * 0.5); 
        } else if (gameState.timeLimit === 60) {
            minTiles = Math.min(50, tilesPerMinute);
        } else {
            minTiles = tilesPerMinute * (gameState.timeLimit / 60);
        }
        
        const adjustedInterval = Math.min(intervalMs, (gameState.timeLimit * 1000) / minTiles);
        
        const lastSpawnTimes = Array(4).fill(0);
        let lastGlobalSpawnTime = 0;
        
        const arrowContainers = [];
        for (let i = 0; i < 4; i++) {
            const container = document.getElementById(`lane-arrows-${i}`);
            if (container) {
                arrowContainers.push({container, laneIdx: i});
            }
        }
        
        if (arrowContainers.length === 0) {
            logDebugMessage("Error: No arrow containers found for tile generation", "error");
            return;
        }
        
        const tileGenerationInterval = setInterval(() => {
            if (!gameState.isRunning) return;
            const currentTime = Date.now(); 
            
            const minGlobalSpacing = settings.minSpacing / gameState.speedMultiplier;
            if (currentTime - lastGlobalSpawnTime < minGlobalSpacing) {
                return; 
            }
            
            let totalActiveTiles = 0;
            arrowContainers.forEach(({container}) => {
                totalActiveTiles += container.querySelectorAll('.arrow').length || 0;
            });
            
            if (totalActiveTiles >= settings.maxActiveTiles) {
                return;
            }
            
            const availableLanes = arrowContainers
                .filter(({container}) => {
                    const activeTiles = container.querySelectorAll('.arrow').length || 0;
                    if (gameState.difficulty === 'easy') {
                        return activeTiles === 0;
                    }
                    return activeTiles < 1; 
                })
                .filter(({laneIdx}) => {
                    const laneMinSpacing = settings.minSpacing / gameState.speedMultiplier;
                    return currentTime - lastSpawnTimes[laneIdx] >= laneMinSpacing;
                });
            
            if (availableLanes.length > 0) {
                const {laneIdx} = availableLanes[Math.floor(Math.random() * availableLanes.length)];
                
                const laneGesture = GESTURE_LANE_MAP[laneIdx];
                
                let direction = 'up';
                let requiredGesture = laneGesture;
                
                if (laneGesture === 'fist') {
                    direction = 'up';
                    requiredGesture = 'fist';
                } else {
                    direction = 'down';
                    requiredGesture = laneGesture;
                }
                
                spawnArrow(laneIdx, direction);
                lastSpawnTimes[laneIdx] = currentTime;
                lastGlobalSpawnTime = currentTime;
                
                logDebugMessage(`Arrow spawned in lane ${laneIdx} (direction: ${direction}, gesture: ${requiredGesture})`);
            }
            
            if (currentGesture) {
                setRightPanelGesture(currentGesture);
            }
            
            if (gameState.timeLimit > 0 && gameState.timeRemaining <= 0) {
                clearInterval(tileGenerationInterval);
                setTimeout(endGame, 1000); 
            }
        }, adjustedInterval / 2); 
    }
    
    function setupGestureDetection() {
        const socket = io();
        
        socket.on('connect', () => {
            logDebugMessage("Socket.IO connected for gesture detection");
        });
        
        socket.on('gesture', (data) => {
            try {
                const gesture = data.gesture.toLowerCase();
                
                currentGesture = gesture;
                
                setRightPanelGesture(gesture);
                
                checkHits(gesture);
            } catch (error) {
                logDebugMessage(`Socket.IO message error: ${error.message}`, "error");
            }
        });
        
        socket.on('disconnect', () => {
            logDebugMessage("Socket.IO disconnected", "error");
        });
        
        socket.on('connect_error', (error) => {
            logDebugMessage(`Socket.IO connection error: ${error.message}`, "error");
        });
        
        const requestGestures = () => {
            if (gameState.isRunning && socket.connected) {
                socket.emit('request_gesture', { player: 1 });
            }
            setTimeout(requestGestures, 100);
        };
        
        requestGestures();
    }
    
    function checkHits(gesture) {
        if (!gameState.isRunning) return;
        
        for (let laneIdx = 0; laneIdx < 4; laneIdx++) {
            const arrowsContainer = document.getElementById(`lane-arrows-${laneIdx}`);
            if (!arrowsContainer) continue;
            
            const arrows = Array.from(arrowsContainer.querySelectorAll('.arrow'));
            if (!arrows.length) continue;
            
            const lane = document.querySelector(`.lane[data-lane="${laneIdx}"]`);
            if (!lane) continue;
            
            const laneRect = lane.getBoundingClientRect();
            const hitZone = lane.querySelector('.hit-zone');
            const hitZoneRect = hitZone ? hitZone.getBoundingClientRect() : null;
            
            if (!hitZoneRect) continue;
            
            const hitZoneTop = hitZoneRect.top - laneRect.top;
            const hitZoneBottom = hitZoneRect.bottom - laneRect.top;
            
            const arrowsInHitZone = arrows.filter(arrow => {
                const arrowRect = arrow.getBoundingClientRect();
                const arrowCenter = arrowRect.top + (arrowRect.height / 2) - laneRect.top;
                return arrowCenter >= hitZoneTop && arrowCenter <= hitZoneBottom;
            });
            
            if (!arrowsInHitZone.length) continue;
            
            const hitZoneCenter = (hitZoneTop + hitZoneBottom) / 2;
            arrowsInHitZone.sort((a, b) => {
                const aRect = a.getBoundingClientRect();
                const bRect = b.getBoundingClientRect();
                const aCenter = aRect.top + (aRect.height / 2) - laneRect.top;
                const bCenter = bRect.top + (bRect.height / 2) - laneRect.top;
                return Math.abs(aCenter - hitZoneCenter) - Math.abs(bCenter - hitZoneCenter);
            });
            
            const closestArrow = arrowsInHitZone[0];
            const closestArrowRect = closestArrow.getBoundingClientRect();
            const closestArrowCenter = closestArrowRect.top + (closestArrowRect.height / 2) - laneRect.top;
            
            const distanceFromCenter = Math.abs(closestArrowCenter - hitZoneCenter);
            const maxDistance = (hitZoneBottom - hitZoneTop) / 2;
            const accuracy = 1 - (distanceFromCenter / maxDistance);
            
            const laneGesture = GESTURE_LANE_MAP[laneIdx];
            const arrowGesture = closestArrow.dataset.gesture;
            
            const gestureMatches = (gesture === laneGesture) || (gesture === arrowGesture);
            
            if (gestureMatches) {
                let score = 0;
                let feedback = 'miss';
                
                if (accuracy > 0.9) {
                    score = 100;
                    feedback = 'perfect';
                } else if (accuracy > 0.7) {
                    score = 75;
                    feedback = 'great';
                } else if (accuracy > 0.5) {
                    score = 50;
                    feedback = 'good';
                }
                
                if (score > 0) {
                    closestArrow.remove();
                    
                    updateScore('player1', score, feedback, laneIdx);
                    
                    return;
                }
            }
        }
    }
    
    function updateScore(player, score, feedback, laneIdx) {
        const playerState = gameState[player];
        let comboMultiplier = Math.floor(playerState.combo / 10) + 1;
        
        comboMultiplier = Math.min(comboMultiplier, 5);
        
        if (score > 0) {
            let streakBonus = 0;
            if (feedback === 'perfect') {
                playerState.perfectStreak = (playerState.perfectStreak || 0) + 1;
                if (playerState.perfectStreak >= 3) {
                    streakBonus = 25 * (playerState.perfectStreak - 2); 
                    streakBonus = Math.min(streakBonus, 100); 
                }
            } else {
                playerState.perfectStreak = 0;
            }
            
            const totalScore = (score * comboMultiplier) + streakBonus;
            playerState.score += totalScore;
            playerState.combo++;
            playerState.hits++;
            
            if (playerState.combo > playerState.maxCombo) {
                playerState.maxCombo = playerState.combo;
            }
            
            if (playerState.combo % 10 === 0 && playerState.combo >= 10) {
                playSound('combo');
            } else if (feedback === 'perfect') {
                playSound('hit');
                if (audio.hit) {
                    audio.hit.playbackRate = 1.05;
                }
            } else {
                playSound('hit');
                if (audio.hit) {
                    audio.hit.playbackRate = 1.0;
                }
            }
            
            if (streakBonus > 0) {
                feedback += ` +${streakBonus}`;
            }
        } else {
            playerState.combo = 0;
            playerState.perfectStreak = 0;
            playSound('miss');
        }
        
        const scoreDisplay = document.getElementById('score');
        const comboDisplay = document.getElementById('combo');
        const comboMultiplierDisplay = document.getElementById('combo-multiplier');
        
        if (scoreDisplay) {
            scoreDisplay.textContent = playerState.score;
        }
        
        if (comboDisplay) {
            comboDisplay.textContent = playerState.combo;
        }
        
        if (comboMultiplierDisplay) {
            comboMultiplierDisplay.textContent = playerState.combo > 0 ? `x${comboMultiplier}` : '';
        }
        
        if (laneIdx >= 0) {
            const lane = document.querySelector(`.lane[data-lane="${laneIdx}"]`);
            if (lane) {
                const feedbackText = document.createElement('div');
                feedbackText.className = `feedback-text ${feedback.split(' ')[0].toLowerCase()}`; 
                feedbackText.textContent = feedback.toUpperCase();
                lane.appendChild(feedbackText);
                
                setTimeout(() => {
                    feedbackText.style.opacity = '0';
                    setTimeout(() => {
                        if (feedbackText.parentElement) {
                            feedbackText.remove();
                        }
                    }, 500);
                }, 700); 
            }
        }
        
        if (score > 0 && playerState.combo % 10 === 0 && playerState.combo >= 10) {
            const lane = document.querySelector(`.lane[data-lane="${laneIdx}"]`);
            if (lane) {
                const comboFeedback = document.createElement('div');
                comboFeedback.className = 'feedback-text combo-feedback';
                comboFeedback.textContent = `COMBO x${comboMultiplier}`;
                comboFeedback.style.top = '30%';
                lane.appendChild(comboFeedback);
                
                const comboFlash = document.createElement('div');
                comboFlash.className = 'combo-flash';
                lane.appendChild(comboFlash);
                
                setTimeout(() => {
                    comboFeedback.style.opacity = '0';
                    comboFlash.style.opacity = '0';
                    setTimeout(() => {
                        if (comboFeedback.parentElement) {
                            comboFeedback.remove();
                        }
                        if (comboFlash.parentElement) {
                            comboFlash.remove();
                        }
                    }, 500);
                }, 1000);
            }
        }
        
        logDebugMessage(`${player} scored ${score} (${feedback}), combo: ${playerState.combo}, total score: ${playerState.score}`);
    }
    
    function handleMiss(player) {
        updateScore(player, 0, 'miss', -1);
    }
    
    async function startGame() {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        
        if (loadingOverlay) {
            loadingText.textContent = 'Preparing game...';
            loadingOverlay.classList.remove('hidden');
            setLoadingProgress(10);
            
            setTimeout(() => {
                if (loadingOverlay.classList.contains('hidden')) return;
                loadingText.textContent = 'Loading is taking longer than expected. If it continues, please refresh the page.';
            }, 10000);
        }
        
        try {
            await restartWebcam();
            
            showScreen(screens.game);
            
            const songTimeLimit = document.getElementById('song-time-limit');
            const songGameSpeed = document.getElementById('song-game-speed');
            const songDifficultySelect = document.getElementById('song-difficulty-select');
            
            if (songGameSpeed && songGameSpeed.value) {
                gameState.speedMultiplier = parseFloat(songGameSpeed.value);
                logDebugMessage(`Using song speed setting: ${gameState.speedMultiplier}x`);
            } else if (gameSpeed) {
                gameState.speedMultiplier = parseFloat(gameSpeed.value) || 1.0;
            }
            
            if (songTimeLimit && songTimeLimit.value) {
                gameState.timeLimit = parseInt(songTimeLimit.value);
                logDebugMessage(`Using song time limit: ${gameState.timeLimit}s`);
            } else if (timeLimit) {
                gameState.timeLimit = parseInt(timeLimit.value) || 0;
            }
            gameState.timeRemaining = gameState.timeLimit;
            
            if (songDifficultySelect && songDifficultySelect.value) {
                gameState.difficulty = songDifficultySelect.value;
                logDebugMessage(`Using song difficulty: ${gameState.difficulty}`);
            } else if (difficultySelect) {
                gameState.difficulty = difficultySelect.value || 'medium';
            }
            
            if (songMusicVolume) {
                const value = songMusicVolume.value;
                gameState.soundVolumes.song = value / 100;
            }
            
            if (songEffectsVolume) {
                const value = songEffectsVolume.value;
                gameState.soundVolumes.hit = value / 100;
                gameState.soundVolumes.combo = value / 100;
            }
            
            initializeGameLane();
            
            if (document.getElementById('song-name')) {
                document.getElementById('song-name').textContent = gameState.song;
            }
            
            const speedIndicator = document.getElementById('speed-indicator');
            if (speedIndicator) {
                speedIndicator.textContent = gameState.speedMultiplier !== 1.0 ? 
                    ` (${gameState.speedMultiplier}x)` : '';
            }
            
            logDebugMessage(`Starting game with: Speed=${gameState.speedMultiplier}x, Difficulty=${gameState.difficulty}, Time Limit=${gameState.timeLimit}s`);
            
            try {
                setLoadingProgress(30);
                audio.song.src = `${gameState.songFile}`;
                audio.song.load();
                
                await Promise.race([
                    new Promise(resolve => {
                        audio.song.oncanplaythrough = resolve;
                    }),
                    new Promise((_, reject) => {
                        audio.song.onerror = () => {
                            logDebugMessage(`Failed to load song audio: ${gameState.songFile}`, "error");
                            reject(new Error('Failed to load song audio'));
                        };
                    }),
                    new Promise(resolve => setTimeout(resolve, 5000))
                ]);
                
                setLoadingProgress(60);
                
                const realDuration = audio.song.duration;
                if (realDuration && isFinite(realDuration)) {
                    if (gameState.timeLimit === 0 || gameState.timeLimit > realDuration) {
                        gameState.timeLimit = Math.ceil(realDuration);
                        gameState.timeRemaining = gameState.timeLimit;
                        logDebugMessage(`Adjusted time limit to match song duration: ${gameState.timeLimit}s`);
                    }
                }
                
            } catch (error) {
                logDebugMessage(`Audio loading error: ${error.message}. Continuing without song audio.`, "warning");
            }
            
            setTimeout(() => {
                hideLoadingProgress();
                if (loadingOverlay) loadingOverlay.classList.add('hidden');
                
                startCountdown().then(() => {
                    gameState.isRunning = true;
                    
                    if (audio.song) {
                        audio.song.play().catch(e => {
                            logDebugMessage(`Error playing song: ${e.message}`, "error");
                        });
                    }
                    
                    updateTimeDisplay();
                    startTileGeneration();
                    setupGestureDetection();
                    
                    const timerInterval = setInterval(() => {
                        if (!gameState.isRunning) return;
                        
                        gameState.timeRemaining--;
                        updateTimeDisplay();
                        
                        const progress = (gameState.timeRemaining / gameState.timeLimit) * 100;
                        setHeaderProgress(progress);
                        
                        if (gameState.timeLimit > 0 && gameState.timeRemaining <= 0) {
                            clearInterval(timerInterval);
                            endGame();
                        }
                    }, 1000);
                    
                    logDebugMessage(`Game started: ${gameState.song} (Difficulty: ${gameState.difficulty}, Time Limit: ${gameState.timeLimit}s)`);
                });
            }, 400);
            
        } catch (error) {
            console.error('Error starting game:', error);
            logDebugMessage(`Error starting game: ${error.message}`, "error");
            alert('Failed to start game: ' + error.message);
            showScreen(screens.songSelect);
            
            setTimeout(() => {
                hideLoadingProgress();
                if (loadingOverlay) loadingOverlay.classList.add('hidden');
            }, 400);
        }
    }
    
    function startCountdown() {
        return new Promise(resolve => {
            const countdownOverlay = document.getElementById('countdown-overlay');
            const countdownNumber = document.getElementById('countdown-number');
            
            if (!countdownOverlay || !countdownNumber) {
                resolve();
                return;
            }
            
            countdownOverlay.classList.remove('hidden');
            countdownNumber.textContent = '3';
            countdownNumber.classList.remove('start');
            
            let count = 3;
            
            const countdownInterval = setInterval(() => {
                count--;
                
                if (count > 0) {
                    countdownNumber.textContent = count.toString();
                } else if (count === 0) {
                    countdownNumber.textContent = 'Start!';
                    countdownNumber.classList.add('start');
                } else {
                    clearInterval(countdownInterval);
                    countdownOverlay.classList.add('hidden');
                    resolve();
                }
            }, 1000);
        });
    }

    function updateTimeDisplay() {
        const timeDisplay = document.getElementById('time-value');
        
        if (timeDisplay) {
            const minutes = Math.floor(gameState.timeRemaining / 60);
            const seconds = Math.floor(gameState.timeRemaining % 60);
            timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        const progress = gameState.timeLimit > 0 ? 
            (gameState.timeRemaining / gameState.timeLimit) * 100 : 
            (audio.song && audio.song.duration ? (audio.song.currentTime / audio.song.duration) * 100 : 0);
        
        setHeaderProgress(progress);
    }
    
    function endGame() {
        gameState.isRunning = false;
        if (audio.song) {
            audio.song.pause();
            audio.song.currentTime = 0;
        }
        
        const arrows = document.querySelectorAll('.arrow');
        if (arrows) {
            arrows.forEach(arrow => arrow.remove());
        }
        
        showScreen(screens.results);
        displayResults();
        logDebugMessage("Game ended");
    }
    
    function displayResults() {
        const playerState = gameState.player1;
        
        if (playerState) {
            const finalScore = document.getElementById('player1-final-score');
            const maxCombo = document.getElementById('player1-max-combo');
            const accuracy = document.getElementById('player1-accuracy');
            const rank = document.getElementById('player1-rank');
            
            if (finalScore) finalScore.textContent = playerState.score;
            if (maxCombo) maxCombo.textContent = playerState.maxCombo;
            
            if (accuracy) {
                accuracy.textContent = playerState.totalNotes > 0 
                    ? `${Math.round((playerState.hits / playerState.totalNotes) * 100)}%`
                    : '0%';
            }
            
            if (rank) {
                const accuracyPercent = playerState.totalNotes > 0 
                    ? (playerState.hits / playerState.totalNotes) * 100
                    : 0;
                
                let rankValue = 'F';
                if (accuracyPercent >= 95) rankValue = 'S';
                else if (accuracyPercent >= 90) rankValue = 'A';
                else if (accuracyPercent >= 80) rankValue = 'B';
                else if (accuracyPercent >= 70) rankValue = 'C';
                else if (accuracyPercent >= 60) rankValue = 'D';
                
                rank.textContent = rankValue;
            }
        }
        
        const winnerDisplay = document.getElementById('winner-text');
        if (winnerDisplay) {
            winnerDisplay.textContent = 'Great Job!';
        }
    }
    
    function resetGameState(preserveSong = false) {
        gameState.player1 = { score: 0, combo: 0, maxCombo: 0, hits: 0, totalNotes: 0 };
        gameState.player2 = { score: 0, combo: 0, maxCombo: 0, hits: 0, totalNotes: 0 };
        gameState.isRunning = false;
        gameState.currentNoteIndex = 0;
        gameState.timeLimit = 0;
        gameState.timeRemaining = 0;
        
        if (!preserveSong) {
            gameState.song = null;
            gameState.songFile = null;
            gameState.bpm = 120;
            gameState.difficultyMultiplier = 1.0;
            gameState.songDuration = 0;
        }
        
        document.getElementById('score').textContent = '0';
        document.getElementById('combo').textContent = '0';
        document.getElementById('combo-multiplier').textContent = '';
        document.getElementById('player1-score-bar').style.setProperty('--score-width', '0%');
        document.getElementById('player2-score-bar').style.setProperty('--score-width', '0%');
        document.getElementById('player1-feedback').textContent = '';
        document.getElementById('player2-feedback').textContent = '';
        document.getElementById('time-value').textContent = '0:00';
        document.getElementById('header-progress-fill').style.width = '0%';
        
        restartWebcam();
        
        logDebugMessage("Game state reset");
    }
    
    async function restartWebcam() {
        try {
            logDebugMessage("Restarting webcam...");
            
            const loadingOverlay = document.getElementById('loading-overlay');
            const loadingText = document.getElementById('loading-text');
            
            if (loadingOverlay) {
                loadingText.textContent = 'Resetting camera...';
                loadingOverlay.classList.remove('hidden');
            }
            
            const response = await fetch('/restart_webcam', {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error(`Webcam restart failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            logDebugMessage(`Webcam restart ${result.success ? 'successful' : 'failed'}: ${result.message || result.error}`);
            
            const webcamFeed = document.getElementById('webcam1');
            if (webcamFeed) {
                const timestamp = new Date().getTime();
                webcamFeed.src = `/video_feed?player=1&t=${timestamp}`;
            }
            
            if (loadingOverlay) {
                setTimeout(() => {
                    loadingOverlay.classList.add('hidden');
                }, 1000);
            }
        } catch (error) {
            console.error('Error restarting webcam:', error);
            logDebugMessage(`Error restarting webcam: ${error.message}`, "error");
        }
    }
    
    
    document.getElementById('diagnostic-btn').addEventListener('click', async () => {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        
        if (loadingOverlay) {
            loadingText.textContent = 'Running diagnostics...';
            loadingOverlay.classList.remove('hidden');
        }
        
        try {
            const response = await fetch('/run_diagnostic', {
                method: 'POST'
            });
            if (!response.ok) {
                throw new Error(`Diagnostic request failed: ${response.statusText}`);
            }
            const result = await response.json();
            
            alert(`Diagnostic Results:\nWebcam: ${result.webcam ? 'OK' : 'Failed'}\nModel: ${result.model ? 'OK' : 'Failed'}`);
            logDebugMessage(`Diagnostics run: Webcam ${result.webcam ? 'OK' : 'Failed'}, Model ${result.model ? 'OK' : 'Failed'}`);
        } catch (error) {
            console.error('Error running diagnostics:', error);
            logDebugMessage(`Error running diagnostics: ${error.message}`, "error");
            alert('Error running diagnostics: ' + error.message);
        } finally {
            setTimeout(() => {
                hideLoadingProgress();
                if (loadingOverlay) loadingOverlay.classList.add('hidden');
            }, 400);
        }
    });
    
    syncSettings();
    logDebugMessage("Game initialized");

    const ARROW_ICONS = {
        up: '⬆️',
        down: '⬇️'
    };
    const GESTURE_ICONS = {
        peace: '✌️',
        index: '☝️',
        fist: '👊',
        open_hand: '🤟',
        down: '👎', 
        none: '❓'
    };
    const GESTURE_NAMES = {
        peace: 'Peace',
        index: 'Index',
        fist: 'Fist',
        open_hand: 'Open Hand',
        down: 'Down',
        none: 'None'
    };

    const GESTURE_LANE_MAP = [
        'fist',       
        'peace',      
        'index',      
        'open_hand'   
    ];

    function spawnArrow(laneIdx, direction) {
        const arrowsContainer = document.getElementById(`lane-arrows-${laneIdx}`);
        if (!arrowsContainer) return;
        
        const arrow = document.createElement('div');
        arrow.className = `arrow arrow-${direction}`;
        
        const gestureType = direction === 'up' ? 'fist' : 'down';
        arrow.dataset.gesture = gestureType;
        
        const settings = gameState.difficultySettings[gameState.difficulty];
        const fallDuration = settings.fallingSpeed / gameState.speedMultiplier;
        
        arrow.style.animationDuration = `${fallDuration}s`;
        
        arrowsContainer.appendChild(arrow);
        
        if (gameState.player1) {
            gameState.player1.totalNotes++;
        }
        
        arrow.addEventListener('animationend', () => {
            if (arrow.parentElement) {
                handleMiss('player1');
                arrow.remove();
            }
        });
        
        logDebugMessage(`Spawned ${direction} arrow in lane ${laneIdx} with duration ${fallDuration}s`);
        return arrow;
    }

    function initializeGestureIcons() {
        for (let i = 0; i < 4; i++) {
            const iconElement = document.getElementById(`lane-gesture-${i}`);
            if (iconElement) {
                iconElement.textContent = '';
            }
        }
        
        logDebugMessage('Lane gesture icons initialized with SVG graphics');
    }

    function setRightPanelGesture(gesture) {
        const iconElement = document.getElementById('gesture-icon-large');
        const nameElement = document.getElementById('gesture-name-large');
        
        if (iconElement) {
            iconElement.classList.remove('peace', 'index', 'fist', 'open_hand', 'down', 'none');
            
            iconElement.classList.add(gesture);
        }
        
        if (nameElement) {
            nameElement.classList.remove('peace', 'index', 'fist', 'open_hand', 'down', 'none');
            
            nameElement.classList.add(gesture);
            
            const displayName = gesture === 'none' ? 'None' : 
                gesture.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            nameElement.textContent = displayName;
        }
        
        updateHitZones(gesture);
    }

    function updateHitZones(gesture) {
        const lanes = document.querySelectorAll('.lane');
        if (!lanes) return;
        
        lanes.forEach((lane, laneIdx) => {
            const hitZone = lane.querySelector('.hit-zone');
            if (!hitZone) return;
            
            const laneGesture = GESTURE_LANE_MAP[laneIdx];
            
            if (gesture === laneGesture) {
                hitZone.classList.add('active');
            } else {
                hitZone.classList.remove('active');
            }
        });
    }

    function setHeaderProgress(percent) {
        const fill = document.getElementById('header-progress-fill');
        if (fill) fill.style.width = `${percent}%`;
    }

    let currentGesture = 'none';
});