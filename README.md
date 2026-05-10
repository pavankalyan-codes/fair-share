# FairShare - Room Edition

FairShare is a roommate expense splitter for tracking shared costs, calculating exact cents, and exporting settlement reports. It uses Google sign-in and saves each user's private session to Cloud Firestore.

[Live Demo](https://pavankalyan-codes.github.io/fair-share) · [Source Code](https://github.com/pavankalyan-codes/fair-share)

![FairShare preview](assets/fairshare-preview.png)

---

## Why I Built This

Splitting roommate expenses sounds simple until the group has a mix of rent, utilities, groceries, personal items, partial participants, and rounding edge cases. I built FairShare to make that workflow transparent: add expenses, choose how each bill is split, and see exactly who owes whom.

The project is intentionally small and static. It runs as HTML/CSS/JS, authenticates with Firebase Authentication, stores data in Firestore, and exports CSV reports that can be opened in Excel or Google Sheets.

---

## Features

- **2-10 roommates** - flexible setup for small shared households
- **3 split modes** - equal split, custom share ratios, or selected participants only
- **Cent-safe math** - calculations operate in cents to avoid floating-point drift
- **Live settlements** - balances and who-pays-whom instructions update immediately
- **Cloud saved sessions** - restore your room's expenses after sign-in via Firestore
- **CSV export** - download expenses, balances, and settlement instructions
- **Mobile-first UI** - quick to use at checkout or while entering receipts

---

## Engineering Highlights

- **Modular vanilla JavaScript** - no framework or bundler; responsibilities are split by layer.
- **Pure core logic** - money allocation, balances, and settlements live in `js/core.js`.
- **Fixture-backed tests** - unit tests validate edge cases and a real exported CSV fixture.
- **Firebase backend** - Google authentication and private per-user Firestore documents.
- **Clean adapters** - storage, rendering, and CSV export are isolated from the core math.

---

## Getting Started

No build step is needed. Fill in the Firebase config, then serve the static files locally or deploy them to a static host.

```bash
git clone https://github.com/pavankalyan-codes/fairshare.git
cd fairshare
npx serve .
```

Firebase setup:

1. Create a Firebase project.
2. Enable **Authentication** -> **Sign-in method** -> **Google**.
3. Create a Cloud Firestore database.
4. Copy your web app config into `js/firebase-config.js`.
5. Configure and publish Firestore rules in Firebase Console.
6. For GitHub Pages, add your Pages host in **Authentication** -> **Settings** -> **Authorized domains**.

GitHub Pages build setup:

1. In GitHub, open **Settings** -> **Secrets and variables** -> **Actions**.
2. Add these repository secrets from your Firebase web app config:
   - `FIREBASE_API_KEY`
   - `FIREBASE_APP_ID`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
3. Open **Settings** -> **Pages** and set **Source** to **GitHub Actions**.
4. Push to `main` or run the **Deploy GitHub Pages** workflow manually.

Netlify build setup:

1. Connect the repository in Netlify.
2. Netlify will read `netlify.toml` and run `npm run build:pages`.
3. Set these environment variables in **Site configuration** -> **Environment variables**:
   - `FIREBASE_API_KEY`
   - `FIREBASE_APP_ID`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
4. Add your Netlify domain in Firebase **Authentication** -> **Settings** -> **Authorized domains**.

Optional Admin SDK setup for trusted server scripts:

1. Install dependencies with `npm install`.
2. In Firebase Console, create a service account key from **Project settings** -> **Service accounts**.
3. Save the downloaded JSON as `server/serviceAccountKey.json`, or set `GOOGLE_APPLICATION_CREDENTIALS` to its path.
4. Import `server/firebase-admin.js` from Node-only scripts to access `{ admin, db }`.

Never import `server/firebase-admin.js` or a service account JSON from browser code.

Then host it with GitHub Pages:

1. Go to the repo's **Settings** -> **Pages**
2. Set source to `main` branch, `/ (root)`
3. Visit `https://pavankalyan-codes.github.io/fairshare`

---

## Project Structure

```text
fairshare/
|-- index.html
|-- netlify.toml
|-- .github/
|   `-- workflows/
|       `-- pages.yml
|-- assets/
|   `-- fairshare-preview.png
|-- css/
|   `-- styles.css
|-- js/
|   |-- app.js       # App orchestration and event wiring
|   |-- config.js    # Constants, symbols, and palette
|   |-- core.js      # Pure money and settlement logic
|   |-- csv.js       # CSV export helpers
|   |-- dom.js       # DOM rendering and view helpers
|   |-- firebase-config.template.js
|   |-- firebase-service.js
|   `-- storage.js   # Firestore storage adapter
|-- scripts/
|   `-- build-pages.js
|-- tests/
|   |-- check-syntax.js
|   |-- core.test.js
|   |-- storage.test.js
|   `-- test-data.csv
|-- server/
|   |-- firebase-admin.js
|   `-- serviceAccountKey.example.json
|-- LICENSE
|-- package.json
`-- README.md
```

---

## Tests

The app has no runtime dependencies. `package.json` only provides convenience scripts.

```bash
npm test
npm run check
npm run verify
```

The test suite covers:

- cent conversion and rounding
- equal, selected, and weighted split edge cases
- pairwise settlement netting
- fixture validation from `tests/test-data.csv`
- exported total, balance, and settlement consistency

---

## Manual QA Checklist

Before publishing or posting:

- [ ] Setup flow: add, remove, validate blank names, validate duplicate names
- [ ] Expense flow: add equal split, custom shares, and selected participants
- [ ] Settlement flow: verify balances update after add, remove, and clear-all
- [ ] Persistence: sign in, refresh page, restore session from Firestore, reset members
- [ ] CSV export: download file and confirm expenses, balances, and settlements
- [ ] Auth: sign in with Google, sign out, and confirm signed-out users cannot see data
- [ ] Firestore: confirm data persists for one account and is isolated from another account
- [ ] Mobile viewport: check setup, expense form, and settlement card on narrow screens
- [ ] GitHub Pages: verify live demo loads CSS, JS, and preview image

---

## Architecture

FairShare follows a small layered structure:

- `js/core.js` contains pure functions for cents, split allocation, balances, settlements, and legacy normalization.
- `js/firebase-service.js` initializes Firebase Auth and Firestore from browser modules.
- `js/storage.js` wraps Firestore session persistence so storage stays separate from app behavior.
- `server/firebase-admin.js` initializes the Firebase Admin SDK for trusted Node-only scripts.
- `js/dom.js` owns DOM caching, rendering, visual feedback, and symbol application.
- `js/csv.js` builds and downloads CSV exports.
- `js/app.js` coordinates state, events, and the flow between the adapters.

This keeps the math testable and lets UI/storage/export concerns change independently.

---

## How to Use

1. Enter the names of everyone splitting expenses.
2. Add expenses with description, amount, payer, and split type.
3. Watch balances and settlement instructions update live.
4. Export a CSV report when the group is ready to settle.

| Split Mode | How it works |
|---|---|
| **Equal** | Amount divided across everyone |
| **Custom Shares** | Set a ratio per person, such as `2 : 1 : 1` |
| **Selected People** | Pick who is included and exclude everyone else |

---

## Data & Privacy

Users must sign in with Google. Each account's FairShare data is stored at `users/{uid}/fairshare/session` in Cloud Firestore. The included rules restrict reads and writes to the signed-in owner only. Hitting **Change members** clears that Firestore session.

---

## Tech Stack

| Layer | Choice |
|---|---|
| UI | Vanilla HTML / CSS / JS |
| Fonts | Google Fonts |
| Auth | Firebase Authentication with Google provider |
| Storage | Cloud Firestore |
| Admin SDK | Firebase Admin for trusted Node scripts |
| Tests | Node.js built-in `assert` |
| Dependencies | `firebase-admin` for server-only Admin SDK usage |

---

## Roadmap

- [ ] Edit expenses after adding them
- [ ] Expense categories
- [ ] CSV import / restore from export
- [ ] Copy settlement summary
- [ ] Recurring expense templates

---


## License

MIT - see [LICENSE](LICENSE).
