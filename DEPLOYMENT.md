# GitHub Pages Deployment & Operation Guide

This guide details how to publish, update, and maintain the **CLS Conference 2026** web application using the repository:
**`https://github.com/CLS-Data/cls-conference-2026`**

---

## 📱 1. Testing on Your Smartphone Right Now (Same Wi-Fi)

To test the application on your physical smartphone while running locally:
1. Ensure your smartphone is connected to the same Wi-Fi network as your laptop.
2. Open Safari (iPhone) or Chrome (Android) on your phone and enter:
   👉 **`http://192.168.1.6:8000/`**

---

## 🚀 2. Deploying to GitHub Pages

### Step A: Push Code to GitHub Repository
Open PowerShell or Command Prompt in `c:\Users\ucbvrjh\Documents\CLS conference app` and run:

```bash
git init
git remote add origin https://github.com/CLS-Data/cls-conference-2026.git
git branch -M main
git add .
git commit -m "Deploy CLS Conference 2026 Web Application"
git push -u origin main
```

### Step B: Enable GitHub Pages in Repository Settings
1. Go to your repository on GitHub:
   👉 **[https://github.com/CLS-Data/cls-conference-2026](https://github.com/CLS-Data/cls-conference-2026)**
2. Click **Settings** (gear icon at top right).
3. In the left menu, select **Pages** (under *Code and automation*).
4. Under **Build and deployment**:
   - **Source**: Select **`Deploy from a branch`**.
   - **Branch**: Select **`main`** and **`/ (root)`** folder.
5. Click **Save**.

Within ~60 seconds, GitHub Pages will publish the live website at:
👉 **`https://cls-data.github.io/cls-conference-2026/`**

---

## 🔄 3. Updating `timetable.csv` (Session or Room Changes)

If you need to change a speaker name, room location, presentation title, or session time:

1. Open `timetable.csv` and edit the rows (or paste a new CSV from Excel / Google Sheets).
2. Run our automated sync script in PowerShell:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\update_dataset.ps1
   ```
   *This automatically updates `sessions-data.js` so all 145+ sessions update instantly on GitHub Pages with 0ms loading time!*
3. Commit and push the changes to GitHub:
   ```bash
   git add timetable.csv sessions-data.js
   git commit -m "Update conference timetable dataset"
   git push
   ```

---

## 💾 4. How "My Schedule" (Bookmarks) Works on Mobile Devices

- **Device-Local Memory (`localStorage`)**: When an attendee bookmarks a session using the ⭐ star button, the app saves those session keys into the phone's browser memory (`localStorage`).
- **No Login Needed**: Attendees do not need to log in or create an account.
- **Cross-Network & Offline Access**:
  - Whether attendees leave the venue, disconnect from Wi-Fi, switch to 4G/5G mobile data, close their browser, or return hours later, their saved **"My Schedule"** remains **100% intact on their phone**.
  - The web application runs entirely client-side, making it extremely fast, resilient, and reliable on mobile connections.
