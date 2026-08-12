# CLS Conference 2026: A celebration of cohort studies

A modern, responsive conference web application and dynamic timetable system for the **Centre for Longitudinal Studies (CLS), University College London (UCL)**.

- **Event Date**: 22 – 23 September 2026
- **Venue**: Cavendish Venues - 44 Hallam Street, London W1W 6JJ ([Google Maps Link](https://maps.app.goo.gl/J5EfA4VxxkCTsyoR7))
- **Live GitHub Pages URL**: [https://cls-data.github.io/cls-conference-2026/](https://cls-data.github.io/cls-conference-2026/)

---

## 🌟 Key Features

- **Dynamic CSV Integration**: Loads schedule data on the fly from `timetable.csv`. Any update to room assignments, talk titles, or session cancellations in the CSV instantly updates the web site without re-deploying code.
- **Interactive Timetable**:
  - Filter by Day (**Day 1 - 22 Sep** / **Day 2 - 23 Sep** / **All Days**).
  - Real-time keyword search (by talk title, speaker, institution, or track).
  - Expandable session track accordions with **Expand All / Collapse All** master toggle.
  - Filter by specific venue room.
  - Filter by session type (**Keynote**, **Parallel Sessions**, **Plenary**, **Poster**, **Break**).
- **Personal Schedule Builder**: Star/bookmark sessions to create a customized "My Schedule", saved across browser visits in `localStorage`.
- **Abstract & Detail Modal**: View complete talk descriptions, affiliations, and direct links to official UCL abstract papers.
- **Calendar Export**: Export any session directly to an iCalendar (`.ics`) file.
- **Venue & Location Map Modal**: Google Maps integration for Cavendish Venues (44 Hallam Street, London W1W 6JJ).
- **Dark Mode Support**: Seamless toggle between sleek dark and light themes.
- **Automated Web Scraper**: Included PowerShell (`scrape_timetable.ps1`) and Python (`scrape_timetable.py`) scripts to parse live schedule updates from `https://cls.ucl.ac.uk/events/cls-conference-2026/`.

---

## 📁 Repository Structure

```
CLS conference app/
├── index.html            # Main web application HTML
├── styles.css            # Custom modern CSS design system (UCL/CLS branding)
├── app.js                # Frontend application logic & reactive state
├── timetable.csv         # Structured schedule dataset (145+ sessions)
├── cls-logo-lockup.png   # Official CLS logo lockup image asset
├── scrape_timetable.ps1  # PowerShell scraping script
├── scrape_timetable.py   # Python scraping script
├── start_server.ps1      # Local PowerShell static web server
├── DEPLOYMENT.md         # GitHub Pages setup & deployment guide
└── README.md             # Project documentation
```

---

## 🚀 Quick Start (Running Locally)

Since the website is built with native HTML5, CSS3, and JavaScript, no build tools or package managers are required!

1. Open `index.html` directly in your browser, OR run the included local web server:
   ```powershell
   .\start_server.ps1
   ```
2. Open `http://localhost:8000` in your browser.

---

## 🔄 Updating the Schedule (`timetable.csv`)

To update room assignments or handle session cancellations during the conference:

1. Open `timetable.csv` in Excel, VS Code, or directly on GitHub.
2. Modify the target row:
   - Change `room` to update room assignment.
   - Change `status` to `Cancelled` or `Updated Room`.
   - Update `speaker`, `time_start`, or `presentation_title`.
3. Save or commit the changes. The web app updates automatically!

---

## 📖 Deployment Instructions

See [DEPLOYMENT.md](file:///c:/Users/ucbvrjh/Documents/CLS%20conference%20app/DEPLOYMENT.md) for full step-by-step instructions on publishing this site to **GitHub Pages**.
