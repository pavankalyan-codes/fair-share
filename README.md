# FairShare — Room Edition 🏠

A lightweight, single-page app to track and split shared expenses among roommates — no login, no server, no fuss.

---

## ✨ Features

- **2–10 roommates** — not locked to 3, works for any group size
- **3 split modes** — equal split, custom share ratios, or selected participants only
- **Smart settlement engine** — minimizes the number of transactions needed to settle up (e.g. chains A→B→C collapse into A→C)
- **Live balances** — see who owes and who gets paid back in real time
- **Persistent storage** — data survives page refreshes via `localStorage`; prompts you to restore your session on next visit
- **CSV export** — download a full report with expenses, balances, and settlements
- **Mobile-first** — large inputs and tap targets, works great at the grocery store checkout

---

## 🚀 Getting Started

No installation needed. It's a single HTML file.

```bash
git clone https://github.com/your-username/fairshare.git
cd fairshare
open fairshare.html   # or just double-click the file
```

Or host it for free on **GitHub Pages**:

1. Go to your repo → **Settings** → **Pages**
2. Set source to `main` branch, `/ (root)`
3. Visit `https://your-username.github.io/fairshare`

---

## 🗂 Project Structure

```
fairshare/
└── fairshare.html   # The entire app — HTML, CSS, and JS in one file
└── README.md
```

No dependencies. No build step. No `node_modules`.

---

## 📖 How to Use

### 1. Setup
Enter the names of everyone splitting expenses (2–10 people). Hit **→ Let's Split Bills** to start.

### 2. Add Expenses
Fill in the description, amount, who paid, and how to split:

| Split Mode | How it works |
|---|---|
| **Equal** | Amount ÷ number of people |
| **Custom Shares** | Set a ratio per person (e.g. 2 : 1 : 1) |
| **Selected People** | Pick who's included; excludes everyone else |

### 3. Settle Up
The **Who Pays Whom** card at the bottom shows the minimum transactions needed to zero out all balances. Once everyone pays up, hit **↺ Change members** to reset.

### 4. Export
Hit **⬇ CSV** in the Expenses card to download a spreadsheet with:
- All expenses with individual shares
- Net balance per person
- Final settlement instructions

---

## 🧮 The Math

**Per expense:**
- The payer's balance is credited the full amount
- Each participant's balance is debited their share

**Settlement algorithm:**
1. Compute net balance for each person
2. Separate into debtors (negative) and creditors (positive)
3. Greedily match the largest debtor to the largest creditor until all balances reach zero

This minimizes the total number of payments needed.

---

## 💾 Data & Privacy

All data is stored **locally in your browser** using `localStorage`. Nothing is sent to any server. Clearing your browser data or hitting *"Change members"* wipes the session.

---

## 🛠 Tech Stack

| Layer | Choice |
|---|---|
| UI | Vanilla HTML / CSS / JS |
| Fonts | Google Fonts (DM Serif Display, DM Mono, DM Sans) |
| Storage | Browser `localStorage` |
| Dependencies | **None** |

---

## 🗺 Roadmap

- [ ] Mark individual settlements as paid
- [ ] Expense categories (🍕 Food, 🏠 Rent, ⚡ Utilities)
- [ ] Recurring expense templates (e.g. monthly rent)
- [ ] Supabase / Google Sheets sync for shared access
- [ ] Dark mode

---

## 📄 License

MIT — do whatever you want with it.
