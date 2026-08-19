/**
 * Main Application Orchestrator for JioTV TizenMod
 */

class App {
    constructor() {
        this.channels = [];
        this.filteredChannels = [];
        this.currentCategory = 'All';
        this.categories = ['All', 'Entertainment', 'Sports', 'Movies', 'News', 'Music', 'Kids', 'Infotainment'];
        
        // Navigation state
        this.currentView = 'grid'; // 'grid' | 'categories' | 'player' | 'login' | 'search'
        this.focusedCategoryIndex = 0;
        this.focusedChannelIndex = 0;
        this.loginStep = 'phone'; // 'phone' | 'otp'
        this.enteredPhone = '';
        this.searchQuery = '';
        this.focusedInputIndex = 0;

        this.init();
    }

    async init() {
        // Init Player
        window.videoPlayer.init('video-player');

        // Setup Clock in Header
        this.startClock();

        // Render Category Tabs
        this.renderCategories();

        // Bind Remote Events
        this.bindRemoteEvents();

        // Bind Search Click
        const searchBtn = document.getElementById('search-trigger-btn');
        if (searchBtn) searchBtn.addEventListener('click', () => this.showSearchModal());

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearchInput(e.target.value));
        }

        const searchSubmitBtn = document.getElementById('search-submit-btn');
        if (searchSubmitBtn) searchSubmitBtn.addEventListener('click', () => this.applySearch());

        const searchClearBtn = document.getElementById('search-clear-btn');
        if (searchClearBtn) searchClearBtn.addEventListener('click', () => this.clearSearch());

        // Check Login Status
        if (!window.jioAPI.isLoggedIn()) {
            this.showLoginModal();
        } else {
            await this.loadChannels();
        }
    }

    startClock() {
        const updateTime = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const clockEl = document.getElementById('clock');
            if (clockEl) clockEl.textContent = timeStr;
        };
        updateTime();
        setInterval(updateTime, 1000);
    }

    renderCategories() {
        const container = document.getElementById('categories-bar');
        if (!container) return;

        container.innerHTML = '';
        this.categories.forEach((cat, index) => {
            const tab = document.createElement('div');
            tab.className = `cat-tab ${cat === this.currentCategory ? 'active' : ''}`;
            tab.textContent = cat;
            tab.id = `cat-${index}`;
            tab.addEventListener('click', () => this.selectCategory(cat, index));
            container.appendChild(tab);
        });
    }

    async loadChannels(forceRefresh = false) {
        this.showGridLoader(true);
        try {
            this.channels = await window.jioAPI.getChannels(forceRefresh);
            this.filterChannels();
            this.showToast(`Loaded ${this.channels.length} channels`);
        } catch (e) {
            console.error('[App] Failed to load channels:', e);
            this.showToast(`⚠️ ${e.message}`);
        } finally {
            this.showGridLoader(false);
        }
    }

    filterChannels() {
        let result = this.channels;

        // Apply category filter
        if (this.currentCategory !== 'All') {
            result = result.filter(ch => 
                ch.category && ch.category.toLowerCase().includes(this.currentCategory.toLowerCase())
            );
        }

        // Apply search query filter
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            result = result.filter(ch => 
                ch.name.toLowerCase().includes(q) ||
                (ch.category && ch.category.toLowerCase().includes(q)) ||
                (ch.language && ch.language.toLowerCase().includes(q))
            );
        }

        this.filteredChannels = result;
        this.renderGrid();
    }

    renderGrid() {
        const grid = document.getElementById('channel-grid');
        if (!grid) return;

        grid.innerHTML = '';

        if (this.filteredChannels.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; font-size: 24px; color: #94a3b8; padding: 100px;">No channels found in this category.</div>';
            return;
        }

        this.filteredChannels.forEach((ch, index) => {
            const card = document.createElement('div');
            card.className = `channel-card ${index === this.focusedChannelIndex && this.currentView === 'grid' ? 'focused' : ''}`;
            card.id = `ch-${index}`;

            card.innerHTML = `
                ${ch.isHD ? '<span class="hd-badge">HD</span>' : ''}
                <div class="channel-logo-wrap">
                    <img src="${ch.logo}" alt="${ch.name}" onerror="this.src='https://raw.githubusercontent.com/jiotv-go/jiotv_go/main/assets/jiotv.png'" loading="lazy" />
                </div>
                <div class="channel-name">${ch.name}</div>
                <div class="channel-sub">${ch.language || ch.category}</div>
            `;

            card.addEventListener('click', () => this.playChannel(ch));
            grid.appendChild(card);
        });

        this.updateChannelFocus();
    }

    async playChannel(channel) {
        if (!window.jioAPI.isLoggedIn()) {
            this.showLoginModal();
            return;
        }

        this.currentView = 'player';
        try {
            const streamInfo = await window.jioAPI.getStreamUrl(channel.id);
            window.videoPlayer.play(channel, streamInfo);
        } catch (e) {
            console.error('[App] Play error:', e);
            this.showToast(`⚠️ ${e.message}`);
            if (e.message.includes('expired')) {
                this.showLoginModal();
            }
        }
    }

    /**
     * Bind all remote control actions to UI handlers
     */
    bindRemoteEvents() {
        const rc = window.remoteControl;

        rc.on('up', () => this.handleUp());
        rc.on('down', () => this.handleDown());
        rc.on('left', () => this.handleLeft());
        rc.on('right', () => this.handleRight());
        rc.on('enter', () => this.handleEnter());
        rc.on('back', () => this.handleBack());

        // Color buttons
        rc.on('red', () => this.handleRedButton());
        rc.on('green', () => this.handleGreenButton());
        rc.on('yellow', () => this.handleYellowButton());
        rc.on('blue', () => this.handleBlueButton());

        // Channel numbers
        rc.on('numberSubmit', (num) => this.handleDirectNumber(num));
        rc.on('channelUp', () => this.changeChannelOffset(1));
        rc.on('channelDown', () => this.changeChannelOffset(-1));
        rc.on('playPause', () => window.videoPlayer.togglePlayPause());
    }

    handleGreenButton() {
        if (this.currentView === 'search') {
            this.hideModals();
            this.currentView = 'grid';
        } else {
            this.showSearchModal();
        }
    }

    showSearchModal() {
        this.currentView = 'search';
        const modal = document.getElementById('search-modal');
        if (modal) modal.classList.add('active');

        const input = document.getElementById('search-input');
        if (input) {
            input.value = this.searchQuery;
            input.focus();
            input.classList.add('focused');
        }
    }

    handleSearchInput(val) {
        this.searchQuery = val.trim();
        this.filterChannels();
    }

    applySearch() {
        this.hideModals();
        this.currentView = 'grid';
        this.filterChannels();
        this.showToast(`Found ${this.filteredChannels.length} channels`);
        this.updateChannelFocus();
    }

    clearSearch() {
        this.searchQuery = '';
        const input = document.getElementById('search-input');
        if (input) input.value = '';
        this.applySearch();
    }

    handleUp() {
        if (this.currentView === 'login') {
            const input = this.loginStep === 'phone' ? document.getElementById('phone-input') : document.getElementById('otp-input');
            const btn = document.getElementById('login-submit-btn');
            if (btn) btn.classList.remove('focused');
            if (input) {
                input.classList.add('focused');
                input.focus();
            }
            return;
        }

        if (this.currentView === 'grid') {
            const columns = this.getGridColumns();
            if (this.focusedChannelIndex - columns >= 0) {
                this.focusedChannelIndex -= columns;
                this.updateChannelFocus();
            } else {
                // Move focus up to category tabs
                this.currentView = 'categories';
                this.updateCategoryFocus();
            }
        } else if (this.currentView === 'player') {
            this.changeChannelOffset(1);
        }
    }

    handleDown() {
        if (this.currentView === 'login') {
            const input = this.loginStep === 'phone' ? document.getElementById('phone-input') : document.getElementById('otp-input');
            const btn = document.getElementById('login-submit-btn');
            if (input) input.classList.remove('focused');
            if (btn) {
                btn.classList.add('focused');
                btn.focus();
            }
            return;
        }

        if (this.currentView === 'categories') {
            this.currentView = 'grid';
            this.updateCategoryFocus();
            this.updateChannelFocus();
        } else if (this.currentView === 'grid') {
            const columns = this.getGridColumns();
            if (this.focusedChannelIndex + columns < this.filteredChannels.length) {
                this.focusedChannelIndex += columns;
                this.updateChannelFocus();
            }
        } else if (this.currentView === 'player') {
            this.changeChannelOffset(-1);
        }
    }

    handleLeft() {
        if (this.currentView === 'categories') {
            if (this.focusedCategoryIndex > 0) {
                this.focusedCategoryIndex--;
                this.updateCategoryFocus();
                this.selectCategory(this.categories[this.focusedCategoryIndex], this.focusedCategoryIndex);
            }
        } else if (this.currentView === 'grid') {
            if (this.focusedChannelIndex > 0) {
                this.focusedChannelIndex--;
                this.updateChannelFocus();
            }
        }
    }

    handleRight() {
        if (this.currentView === 'categories') {
            if (this.focusedCategoryIndex < this.categories.length - 1) {
                this.focusedCategoryIndex++;
                this.updateCategoryFocus();
                this.selectCategory(this.categories[this.focusedCategoryIndex], this.focusedCategoryIndex);
            }
        } else if (this.currentView === 'grid') {
            if (this.focusedChannelIndex < this.filteredChannels.length - 1) {
                this.focusedChannelIndex++;
                this.updateChannelFocus();
            }
        }
    }

    handleEnter() {
        if (this.currentView === 'login') {
            this.submitLoginForm();
            return;
        }

        if (this.currentView === 'grid') {
            const ch = this.filteredChannels[this.focusedChannelIndex];
            if (ch) this.playChannel(ch);
        } else if (this.currentView === 'categories') {
            this.currentView = 'grid';
            this.updateChannelFocus();
        } else if (this.currentView === 'player') {
            window.videoPlayer.togglePlayPause();
        } else if (this.currentView === 'search') {
            this.applySearch();
        }
    }

    handleBack() {
        if (this.currentView === 'player') {
            window.videoPlayer.stop();
            this.currentView = 'grid';
            this.updateChannelFocus();
        } else if (this.currentView === 'login' || this.currentView === 'settings' || this.currentView === 'search') {
            this.hideModals();
            this.currentView = 'grid';
            this.updateChannelFocus();
        }
    }

    handleRedButton() {
        if (this.currentView === 'player') {
            this.handleBack();
        } else {
            this.showLoginModal();
        }
    }

    handleYellowButton() {
        this.loadChannels(true);
    }

    handleBlueButton() {
        if (this.currentView === 'player') {
            window.videoPlayer.cycleQuality();
        }
    }

    handleDirectNumber(num) {
        const index = parseInt(num, 10) - 1;
        if (index >= 0 && index < this.filteredChannels.length) {
            const ch = this.filteredChannels[index];
            this.showToast(`Tuning to: ${ch.name}`);
            this.playChannel(ch);
        }
    }

    changeChannelOffset(offset) {
        if (this.filteredChannels.length === 0) return;
        let newIndex = this.focusedChannelIndex + offset;
        if (newIndex < 0) newIndex = this.filteredChannels.length - 1;
        if (newIndex >= this.filteredChannels.length) newIndex = 0;
        
        this.focusedChannelIndex = newIndex;
        const ch = this.filteredChannels[newIndex];
        if (ch) this.playChannel(ch);
    }

    getGridColumns() {
        const grid = document.getElementById('channel-grid');
        if (!grid) return 5;
        const gridWidth = grid.clientWidth;
        return Math.max(1, Math.floor(gridWidth / 234));
    }

    updateChannelFocus() {
        document.querySelectorAll('.channel-card').forEach(el => el.classList.remove('focused'));
        const activeCard = document.getElementById(`ch-${this.focusedChannelIndex}`);
        if (activeCard) {
            activeCard.classList.add('focused');
            activeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    updateCategoryFocus() {
        document.querySelectorAll('.cat-tab').forEach(el => el.classList.remove('focused'));
        if (this.currentView === 'categories') {
            const activeTab = document.getElementById(`cat-${this.focusedCategoryIndex}`);
            if (activeTab) activeTab.classList.add('focused');
        }
    }

    selectCategory(cat, index) {
        this.currentCategory = cat;
        this.focusedCategoryIndex = index;
        this.focusedChannelIndex = 0;
        this.renderCategories();
        this.filterChannels();
    }

    showGridLoader(show) {
        const loader = document.getElementById('grid-loader');
        if (loader) loader.style.display = show ? 'flex' : 'none';
    }

    showLoginModal() {
        this.currentView = 'login';
        this.loginStep = 'phone';
        const modal = document.getElementById('login-modal');
        if (modal) modal.classList.add('active');

        const phoneGroup = document.getElementById('login-phone-group');
        const otpGroup = document.getElementById('login-otp-group');
        const submitBtn = document.getElementById('login-submit-btn');

        if (phoneGroup) phoneGroup.style.display = 'block';
        if (otpGroup) otpGroup.style.display = 'none';
        if (submitBtn) submitBtn.textContent = 'Send OTP';

        const phoneInput = document.getElementById('phone-input');
        if (phoneInput) {
            phoneInput.focus();
            phoneInput.classList.add('focused');
        }
    }

    hideModals() {
        document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
    }

    async submitLoginForm() {
        const phoneInput = document.getElementById('phone-input');
        const otpInput = document.getElementById('otp-input');
        const submitBtn = document.getElementById('login-submit-btn');

        if (this.loginStep === 'phone') {
            const phone = phoneInput.value.trim();
            if (!phone || phone.length !== 10) {
                this.showToast('⚠️ Please enter a 10-digit Jio number');
                return;
            }

            this.enteredPhone = phone;
            submitBtn.textContent = 'Sending OTP...';
            try {
                await window.jioAPI.sendOTP(phone);
                this.loginStep = 'otp';
                document.getElementById('login-phone-group').style.display = 'none';
                document.getElementById('login-otp-group').style.display = 'block';
                submitBtn.textContent = 'Verify OTP';
                if (otpInput) {
                    otpInput.focus();
                    otpInput.classList.add('focused');
                }
                this.showToast('OTP sent to your Jio number');
            } catch (e) {
                this.showToast(`⚠️ ${e.message}`);
                submitBtn.textContent = 'Send OTP';
            }
        } else if (this.loginStep === 'otp') {
            const otp = otpInput.value.trim();
            if (!otp || otp.length < 4) {
                this.showToast('⚠️ Please enter the OTP');
                return;
            }

            submitBtn.textContent = 'Verifying...';
            try {
                await window.jioAPI.verifyOTP(this.enteredPhone, otp);
                this.showToast('✅ Login Successful!');
                this.hideModals();
                this.currentView = 'grid';
                await this.loadChannels();
            } catch (e) {
                this.showToast(`⚠️ ${e.message}`);
                submitBtn.textContent = 'Verify OTP';
            }
        }
    }

    showToast(msg) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3500);
        }
    }
}

// Start app on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
