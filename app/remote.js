/**
 * Samsung Tizen Remote Control Navigation Handler
 * Handles D-pad spatial navigation, color keys, number keys, and back/return actions.
 */

class RemoteControl {
    constructor() {
        this.listeners = {};
        this.focusedElement = null;
        this.numberBuffer = '';
        this.numberTimeout = null;

        this.initTizenKeys();
        this.bindEvents();
    }

    /**
     * Register Tizen TV physical keys with Tizen OS so they are not consumed by the OS
     */
    initTizenKeys() {
        if (typeof tizen !== 'undefined' && tizen.tvinputdevice) {
            const keysToRegister = [
                'ColorF0Red',
                'ColorF1Green',
                'ColorF2Yellow',
                'ColorF3Blue',
                'MediaPlay',
                'MediaPause',
                'MediaPlayPause',
                'MediaStop',
                '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                'ChannelUp',
                'ChannelDown'
            ];

            keysToRegister.forEach(key => {
                try {
                    tizen.tvinputdevice.registerKey(key);
                } catch (e) {
                    console.warn(`[Remote] Could not register key: ${key}`, e);
                }
            });
        }
    }

    /**
     * Attach global keydown listeners
     */
    bindEvents() {
        window.addEventListener('keydown', (e) => {
            const keyCode = e.keyCode || e.which;
            const keyName = e.key;

            console.log(`[Remote] Key pressed: ${keyName} (code: ${keyCode})`);

            // Color Keys (Red = 403, Green = 404, Yellow = 405, Blue = 406)
            if (keyName === 'ColorF0Red' || keyCode === 403) {
                e.preventDefault();
                this.emit('red');
                return;
            }
            if (keyName === 'ColorF1Green' || keyCode === 404) {
                e.preventDefault();
                this.emit('green');
                return;
            }
            if (keyName === 'ColorF2Yellow' || keyCode === 405) {
                e.preventDefault();
                this.emit('yellow');
                return;
            }
            if (keyName === 'ColorF3Blue' || keyCode === 406) {
                e.preventDefault();
                this.emit('blue');
                return;
            }

            // Return / Back Key (Tizen: 10009, Escape: 27, Back: 8)
            if (keyName === 'Escape' || keyCode === 10009 || keyCode === 27 || keyCode === 8) {
                e.preventDefault();
                this.emit('back');
                return;
            }

            // D-Pad Navigation
            if (keyName === 'ArrowUp' || keyCode === 38) {
                e.preventDefault();
                this.emit('up');
                return;
            }
            if (keyName === 'ArrowDown' || keyCode === 40) {
                e.preventDefault();
                this.emit('down');
                return;
            }
            if (keyName === 'ArrowLeft' || keyCode === 37) {
                e.preventDefault();
                this.emit('left');
                return;
            }
            if (keyName === 'ArrowRight' || keyCode === 39) {
                e.preventDefault();
                this.emit('right');
                return;
            }

            // Enter / OK (Tizen OK: 13)
            if (keyName === 'Enter' || keyCode === 13) {
                e.preventDefault();
                this.emit('enter');
                return;
            }

            // Channel Up / Down
            if (keyName === 'ChannelUp' || keyCode === 427) {
                e.preventDefault();
                this.emit('channelUp');
                return;
            }
            if (keyName === 'ChannelDown' || keyCode === 428) {
                e.preventDefault();
                this.emit('channelDown');
                return;
            }

            // Media Controls
            if (keyName === 'MediaPlay' || keyName === 'MediaPlayPause' || keyCode === 415 || keyCode === 10252) {
                e.preventDefault();
                this.emit('playPause');
                return;
            }

            // Number Keys (0-9: keycodes 48-57)
            if (keyCode >= 48 && keyCode <= 57) {
                e.preventDefault();
                const num = String(keyCode - 48);
                this.handleNumberInput(num);
                return;
            }
        });
    }

    /**
     * Handle buffer for direct multi-digit channel numbers (e.g. 1-2-3 -> 123)
     */
    handleNumberInput(num) {
        this.numberBuffer += num;
        this.emit('numberInput', this.numberBuffer);

        clearTimeout(this.numberTimeout);
        this.numberTimeout = setTimeout(() => {
            if (this.numberBuffer) {
                this.emit('numberSubmit', this.numberBuffer);
                this.numberBuffer = '';
            }
        }, 1500);
    }

    /**
     * Event subscription
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    /**
     * Event trigger
     */
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }
}

// Export singleton
window.remoteControl = new RemoteControl();
