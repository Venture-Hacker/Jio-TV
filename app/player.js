/**
 * Video Player Engine for JioTV TizenMod
 * High-performance HLS playback with mobile header injection and TV OSD controls.
 */

class VideoPlayer {
    constructor() {
        this.videoElement = null;
        this.hls = null;
        this.isPlaying = false;
        this.currentChannel = null;
        this.osdTimeout = null;
        this.currentQuality = 'auto'; // 'auto' | 'high' | 'medium' | 'low'
    }

    init(videoElementId) {
        this.videoElement = document.getElementById(videoElementId);
        if (!this.videoElement) {
            console.error('[Player] Video element not found:', videoElementId);
            return;
        }

        this.videoElement.addEventListener('playing', () => {
            this.isPlaying = true;
            this.hideLoader();
        });

        this.videoElement.addEventListener('waiting', () => {
            this.showLoader();
        });

        this.videoElement.addEventListener('error', (e) => {
            console.error('[Player] Native video element error:', e);
            this.handlePlaybackError('Video playback error occurred.');
        });
    }

    /**
     * Play a channel
     * @param {Object} channel Channel metadata object
     * @param {Object} streamInfo { url, headers }
     */
    play(channel, streamInfo) {
        this.currentChannel = channel;
        this.showPlayerScreen();
        this.showLoader();
        this.updateOSD(channel);

        const url = streamInfo.url;
        console.log(`[Player] Starting playback for: ${channel.name} (${url})`);

        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }

        // Check if Hls.js is available
        if (window.Hls && Hls.isSupported()) {
            this.hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 30,
                maxBufferLength: 15,
                maxMaxBufferLength: 30,
                xhrSetup: (xhr, u) => {
                    // Inject mobile headers required by JioTV CDN
                    if (streamInfo.headers) {
                        for (const [key, value] of Object.entries(streamInfo.headers)) {
                            try {
                                xhr.setRequestHeader(key, value);
                            } catch (e) {
                                // Ignore restricted header errors in browser
                            }
                        }
                    }
                }
            });

            this.hls.loadSource(url);
            this.hls.attachMedia(this.videoElement);

            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.videoElement.play().catch(e => {
                    console.warn('[Player] Autoplay prevented, retrying with mute:', e);
                    this.videoElement.muted = true;
                    this.videoElement.play();
                });
            });

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('[Player] Hls.js error:', data);
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.warn('[Player] Fatal network error, trying recovery...');
                            this.hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.warn('[Player] Fatal media error, recovering media...');
                            this.hls.recoverMediaError();
                            break;
                        default:
                            this.handlePlaybackError('Cannot stream channel. Please try again.');
                            break;
                    }
                }
            });
        } else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS (Samsung Tizen Native Engine / Safari)
            this.videoElement.src = url;
            this.videoElement.play();
        } else {
            this.handlePlaybackError('Your TV browser does not support HLS video.');
        }
    }

    /**
     * Stop and reset playback
     */
    stop() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.removeAttribute('src');
            this.videoElement.load();
        }
        this.isPlaying = false;
        this.currentChannel = null;
        this.hidePlayerScreen();
    }

    /**
     * Toggle Play / Pause
     */
    togglePlayPause() {
        if (!this.videoElement) return;
        if (this.videoElement.paused) {
            this.videoElement.play();
        } else {
            this.videoElement.pause();
        }
        this.showOSD();
    }

    /**
     * Cycle through quality profiles
     */
    cycleQuality() {
        if (!this.hls) return;
        const levels = this.hls.levels;
        if (!levels || levels.length <= 1) return;

        let nextLevel = this.hls.currentLevel + 1;
        if (nextLevel >= levels.length) {
            nextLevel = -1; // Auto
        }
        this.hls.currentLevel = nextLevel;

        const label = nextLevel === -1 ? 'AUTO' : `${levels[nextLevel].height}p`;
        this.showToast(`Quality: ${label}`);
        const qualityBadge = document.getElementById('player-quality-badge');
        if (qualityBadge) qualityBadge.textContent = label;
    }

    /**
     * Update On-Screen Display info
     */
    updateOSD(channel) {
        const logo = document.getElementById('osd-logo');
        const name = document.getElementById('osd-channel-name');
        const category = document.getElementById('osd-category');

        if (logo) logo.src = channel.logo || '';
        if (name) name.textContent = channel.name || 'Live Channel';
        if (category) category.textContent = `${channel.category} • ${channel.language}`;

        this.showOSD();
    }

    showOSD() {
        const osd = document.getElementById('player-osd');
        if (!osd) return;

        osd.classList.add('visible');
        clearTimeout(this.osdTimeout);
        this.osdTimeout = setTimeout(() => {
            osd.classList.remove('visible');
        }, 4000);
    }

    showLoader() {
        const loader = document.getElementById('player-loader');
        if (loader) loader.classList.add('active');
    }

    hideLoader() {
        const loader = document.getElementById('player-loader');
        if (loader) loader.classList.remove('active');
    }

    showPlayerScreen() {
        const playerScreen = document.getElementById('player-screen');
        if (playerScreen) playerScreen.classList.add('active');
    }

    hidePlayerScreen() {
        const playerScreen = document.getElementById('player-screen');
        if (playerScreen) playerScreen.classList.remove('active');
    }

    handlePlaybackError(msg) {
        this.hideLoader();
        this.showToast(`⚠️ ${msg}`);
    }

    showToast(msg) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    }
}

// Export singleton
window.videoPlayer = new VideoPlayer();
