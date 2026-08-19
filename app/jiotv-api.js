/**
 * JioTV Direct Client-Side API Library
 * Handles authentication, OTP verification, channel listing, and live stream token resolution.
 */

class JioTVAPI {
    constructor() {
        this.AUTH_BASE_URL = 'https://api.jio.com/v3/dip/user/otp';
        this.JIOTV_API_BASE = 'https://jiotvapi.cdn.jio.com/apis';
        this.STORAGE_KEY = 'jiotv_tizen_auth';
        this.CHANNELS_CACHE_KEY = 'jiotv_channels_cache';
        this.CHANNELS_CACHE_TIME_KEY = 'jiotv_channels_cache_time';
        this.CACHE_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours
        
        this.authData = this.loadAuth();
    }

    /**
     * Load stored authentication credentials from localStorage
     */
    loadAuth() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) {
            console.error('[JioTV API] Failed to parse stored auth:', e);
        }
        return null;
    }

    /**
     * Save authentication credentials to localStorage
     */
    saveAuth(data) {
        this.authData = data;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    /**
     * Check if user is currently authenticated
     */
    isLoggedIn() {
        return !!(this.authData && (this.authData.ssoToken || this.authData.authToken));
    }

    /**
     * Clear login data (Logout)
     */
    logout() {
        this.authData = null;
        localStorage.removeItem(this.STORAGE_KEY);
    }

    /**
     * Send OTP to a Jio mobile number with automatic CORS proxy fallbacks
     * @param {string} mobileNumber 10-digit Jio phone number
     */
    async sendOTP(mobileNumber) {
        const cleanedNumber = mobileNumber.replace(/\D/g, '');
        if (cleanedNumber.length !== 10) {
            throw new Error('Please enter a valid 10-digit mobile number');
        }

        const targetUrl = `${this.AUTH_BASE_URL}/send`;
        const payload = {
            number: cleanedNumber,
            appName: 'RJIL_JioTV'
        };

        const headers = {
            'Content-Type': 'application/json',
            'app-name': 'RJIL_JioTV',
            'devicetype': 'phone',
            'os': 'Android'
        };

        // Try direct first, then CORS proxy fallbacks
        const endpoints = [
            targetUrl,
            `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`
        ];

        let lastError = null;
        for (const url of endpoints) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    return await response.json();
                }
            } catch (e) {
                lastError = e;
                console.warn(`[JioTV API] OTP send failed on ${url}:`, e);
            }
        }

        throw new Error(lastError ? lastError.message : 'Failed to send OTP. Check internet connection.');
    }

    /**
     * Verify OTP and obtain authentication tokens with CORS proxy fallbacks
     * @param {string} mobileNumber 
     * @param {string} otp 
     */
    async verifyOTP(mobileNumber, otp) {
        const cleanedNumber = mobileNumber.replace(/\D/g, '');
        const targetUrl = `${this.AUTH_BASE_URL}/verify`;
        const payload = {
            number: cleanedNumber,
            otp: otp.trim(),
            appName: 'RJIL_JioTV',
            deviceType: 'phone',
            os: 'Android'
        };

        const headers = {
            'Content-Type': 'application/json',
            'app-name': 'RJIL_JioTV',
            'devicetype': 'phone',
            'os': 'Android'
        };

        const endpoints = [
            targetUrl,
            `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`
        ];

        let result = null;
        let lastError = null;
        for (const url of endpoints) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    result = await response.json();
                    break;
                }
            } catch (e) {
                lastError = e;
                console.warn(`[JioTV API] OTP verify failed on ${url}:`, e);
            }
        }

        if (!result) {
            throw new Error(lastError ? lastError.message : 'Invalid OTP or verification failed.');
        }
        
        const authData = {
            mobile: cleanedNumber,
            ssoToken: result.ssoToken || result.authToken || result.token,
            crmid: result.crmid || result.sessionAttributes?.crmid || '',
            uniqueId: result.uniqueId || result.sessionAttributes?.uniqueId || '',
            timestamp: Date.now()
        };

        this.saveAuth(authData);
        return authData;
    }

    /**
     * Fetch the complete list of 600+ JioTV channels
     * Uses localStorage cache with 12h expiry to speed up TV load times.
     */
    async getChannels(forceRefresh = false) {
        if (!forceRefresh) {
            const cached = localStorage.getItem(this.CHANNELS_CACHE_KEY);
            const cachedTime = localStorage.getItem(this.CHANNELS_CACHE_TIME_KEY);
            if (cached && cachedTime && (Date.now() - parseInt(cachedTime, 10) < this.CACHE_EXPIRY_MS)) {
                try {
                    return JSON.parse(cached);
                } catch (e) {
                    console.warn('[JioTV API] Cache parse failed, fetching fresh.');
                }
            }
        }

        const channelEndpoints = [
            `${this.JIOTV_API_BASE}/v1.4/getallchannelnew/getallchannel.json`,
            `https://raw.githubusercontent.com/jiotv-go/jiotv_go/main/assets/channels.json`
        ];

        let channels = null;
        let lastError = null;

        for (const endpoint of channelEndpoints) {
            try {
                const res = await fetch(endpoint, {
                    headers: {
                        'User-Agent': 'okhttp/3.14.9',
                        'Accept': 'application/json'
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    channels = data.result || data.channels || (Array.isArray(data) ? data : []);
                    if (channels.length > 0) break;
                }
            } catch (err) {
                lastError = err;
                console.warn(`[JioTV API] Channel fetch error on ${endpoint}:`, err);
            }
        }

        if (!channels || channels.length === 0) {
            throw new Error(lastError ? lastError.message : 'Unable to load channel list from Jio servers.');
        }

        // Standardize channel objects
        const standardized = channels.map(ch => {
            const id = ch.channel_id || ch.channelId || ch.id || '';
            const name = ch.channel_name || ch.channelName || ch.name || 'Unknown Channel';
            const category = ch.channel_category_name || ch.category || 'General';
            const language = ch.channel_language_name || ch.language || 'Hindi';
            const logo = ch.logoUrl || (ch.logo ? `https://jiotvimages.cdn.jio.com/dare_images/images/${ch.logo}` : `https://jiotvimages.cdn.jio.com/dare_images/images/channel_logos/${id}.png`);

            return {
                id: String(id),
                name: name,
                category: category,
                language: language,
                logo: logo,
                isHD: ch.isHD || name.toLowerCase().includes('hd')
            };
        });

        // Save to cache
        try {
            localStorage.setItem(this.CHANNELS_CACHE_KEY, JSON.stringify(standardized));
            localStorage.setItem(this.CHANNELS_CACHE_TIME_KEY, String(Date.now()));
        } catch (e) {
            console.warn('[JioTV API] Failed to cache channels in localStorage:', e);
        }

        return standardized;
    }

    /**
     * Get stream URL for a specific channel
     * @param {string} channelId 
     * @param {string} quality 'auto' | 'high' | 'medium' | 'low'
     */
    async getStreamUrl(channelId, quality = 'auto') {
        if (!this.isLoggedIn()) {
            throw new Error('You must be logged in to stream channels');
        }

        const payload = {
            channel_id: String(channelId),
            stream_type: 'Seek',
            quality: quality === 'auto' ? 'high' : quality
        };

        const headers = {
            'Content-Type': 'application/json',
            'ssotoken': this.authData.ssoToken,
            'crmid': this.authData.crmid || '',
            'uniqueId': this.authData.uniqueId || '',
            'appkey': 'NzIxNTY1MjY0',
            'channel_id': String(channelId),
            'User-Agent': 'okhttp/3.14.9',
            'os': 'Android',
            'devicetype': 'phone'
        };

        const streamEndpoints = [
            `${this.JIOTV_API_BASE}/v1.3/live/getliveurl.json`,
            `${this.JIOTV_API_BASE}/v2.0/getchannelurl/getchannelurl.json`
        ];

        let streamUrl = null;
        let lastError = null;

        for (const endpoint of streamEndpoints) {
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const data = await res.json();
                    streamUrl = data.result || data.url || data.stream_url || data.bitrates?.high || data.bitrates?.auto;
                    if (streamUrl) break;
                } else if (res.status === 401 || res.status === 403) {
                    throw new Error('Your Jio login session has expired. Please log in again.');
                }
            } catch (e) {
                lastError = e;
                if (e.message.includes('expired')) throw e;
            }
        }

        if (!streamUrl) {
            // Direct HLS CDN fallback construction
            streamUrl = `https://jiotv.live.cdn.jio.com/live/${channelId}/master.m3u8?auth=${encodeURIComponent(this.authData.ssoToken)}`;
        }

        return {
            url: streamUrl,
            headers: {
                'ssotoken': this.authData.ssoToken,
                'User-Agent': 'okhttp/3.14.9'
            }
        };
    }
}

// Export singleton instance
window.jioAPI = new JioTVAPI();
