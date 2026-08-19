# JioTV TizenMod (Standalone All-in-One)

A self-contained **TizenBrew module** that brings 600+ live JioTV channels directly to **Samsung Smart TVs (Tizen 3.0+)** with full TV remote control navigation and direct client-side streaming—**requiring zero external servers, containers, or backend software**.

---

## 🚀 Features

* **Zero External Backend / No Containers:** Runs 100% natively inside your Samsung Smart TV via TizenBrew.
* **Direct Jio Authentication:** Log in on your TV with your Jio mobile number & OTP once; credentials are saved securely in your TV's `localStorage`.
* **Full TV Remote Support:** 
  * **D-pad (Arrow Keys & OK):** Seamless spatial navigation across channel grids and category tabs.
  * **Color Buttons:**
    * 🔴 **Red:** Open Login / Settings / Exit Player
    * 🟡 **Yellow:** Force Refresh Channels
    * 🔵 **Blue:** Cycle Video Stream Quality (`Auto` / `1080p` / `720p` / `480p`)
  * **Number Keys (0–9):** Direct channel number tuning.
  * **Channel Up / Down:** Fast channel switching while watching.
* **TV 10-Foot UI:** High-contrast, big-screen UI with category filtering (*Entertainment, Sports, Movies, News, Music, Kids, Devotional, Regional*).
* **Universal HLS Engine:** High-performance playback with automatic mobile header injection directly to Jio's CDN.

---

## 🛠️ Step 1: Host for Free on GitHub Pages (2 Minutes)

Because your Samsung TV needs a web URL to load the module into TizenBrew:

1. Create a new public repository on [GitHub](https://github.com/new) (e.g. `jiotv-tizenmod`).
2. Upload the files in this project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of JioTV TizenMod"
   git branch -M main
   git remote add origin https://github.com/<YOUR-USERNAME>/jiotv-tizenmod.git
   git push -u origin main
   ```
3. In your GitHub repository:
   * Go to **Settings** → **Pages**.
   * Under **Build and deployment** → **Branch**, select `main` / `root` and click **Save**.
4. GitHub will give you your permanent free live URL (e.g., `https://<YOUR-USERNAME>.github.io/jiotv-tizenmod/app/`).

---

## 📺 Step 2: Install on Your Samsung Smart TV via TizenBrew

1. Open **TizenBrew** on your Samsung TV.
2. Navigate to **Module Manager** → **Add Module from URL**.
3. Type your GitHub Pages URL:
   ```text
   https://<YOUR-USERNAME>.github.io/jiotv-tizenmod/app/
   ```
4. Click **Install**.
5. Launch **JioTV Live** from your TizenBrew home menu.

---

## 🔑 First-Time Setup on TV

1. When you first launch the app on your Samsung TV, the **JioTV Login** modal will appear.
2. Enter your **10-digit Jio Mobile Number** using your TV remote and click **Send OTP**.
3. Enter the **OTP** received on your phone and click **Verify OTP**.
4. Your TV will instantly load all **600+ live channels**!

---

## 🎮 Remote Control Reference

| Button | Grid Navigation | Video Player |
| :--- | :--- | :--- |
| **Arrow Up / Down** | Move across channel rows / category tabs | Next / Previous Channel |
| **Arrow Left / Right** | Move across channel cards / tabs | - |
| **Enter / OK** | Select category / Play channel | Play / Pause |
| **Red Button 🔴** | Open Login / Settings | Exit video back to channel grid |
| **Yellow Button 🟡** | Force refresh channel list from Jio | - |
| **Blue Button 🔵** | - | Cycle stream quality (Auto / HD / SD) |
| **Numbers 0–9** | Direct channel tuning | Direct channel tuning |
| **Return / Back** | Close modal | Exit player |

---

## 📄 License
MIT License. Created for the Samsung Smart TV & TizenBrew Homebrew Community.
