(function initApp(root) {
  const config = root.ZettlupConfig;
  const core = root.ZettlupCore;
  const csv = root.ZettlupCsv;

  let names = [];
  let expenses = [];
  let uidCounter = 0;
  let view = null;
  let storage = null;
  let firebase = null;

  function state() {
    return { expenses, names };
  }

  async function saveState() {
    if (!storage) return;
    try {
      await storage.save(state());
      view.flashSaved();
    } catch (e) {
      view.flashSaveError();
    }
  }

  function resetInMemoryState() {
    names = [];
    expenses = [];
    uidCounter = 0;
    if (view) {
      view.dom.roommateInputs.innerHTML = '';
    }
  }

  function refreshApp() {
    view.renderExpenses(names, expenses);
    view.renderSettlement(names, expenses);
  }

  function addDefaultPeople() {
    addPersonInput();
    addPersonInput();
    addPersonInput();
  }

  function addPersonInput(defaultVal = '') {
    const existing = document.querySelectorAll('.roommate-row').length;
    if (existing >= 10) return;

    const uid = uidCounter++;
    const idx = existing;
    const row = document.createElement('div');
    row.className = 'roommate-row';
    row.dataset.uid = uid;
    row.innerHTML = `
      <div class="avatar-pill" id="av-${uid}">?</div>
      <input type="text" class="roommate-name-input" placeholder="Name ${idx + 1}" maxlength="20" autocomplete="off" value="${view.esc(defaultVal)}">
      <button class="remove-btn" type="button" aria-label="Remove person">${config.symbols.close}</button>`;

    const input = row.querySelector('input');
    row.querySelector('.remove-btn').addEventListener('click', () => removePerson(uid));
    input.addEventListener('input', () => liveAvatar(uid));
    input.addEventListener('keydown', rowKeydown);

    view.dom.roommateInputs.appendChild(row);
    if (defaultVal) liveAvatar(uid);
    refreshSetupRows();
    setTimeout(() => input.focus(), 20);
  }

  function removePerson(uid) {
    const rows = document.querySelectorAll('.roommate-row');
    if (rows.length <= 2) {
      view.showWarn('Need at least 2 people!');
      return;
    }
    document.querySelector(`.roommate-row[data-uid="${uid}"]`).remove();
    refreshSetupRows();
  }

  function liveAvatar(uid) {
    const row = document.querySelector(`.roommate-row[data-uid="${uid}"]`);
    const val = row.querySelector('input').value.trim();
    document.getElementById(`av-${uid}`).textContent = val ? val.slice(0, 2).toUpperCase() : '?';
  }

  function refreshSetupRows() {
    document.querySelectorAll('.roommate-row').forEach((row, idx) => {
      const uid = row.dataset.uid;
      const av = document.getElementById(`av-${uid}`);
      if (av) view.setPersonColors(av, idx);
      row.querySelector('input').placeholder = `Name ${idx + 1}`;
    });
    view.dom.addPersonBtn.disabled = document.querySelectorAll('.roommate-row').length >= 10;
  }

  function rowKeydown(e) {
    if (e.key === 'Enter') {
      if (document.querySelectorAll('.roommate-row').length < 10) addPersonInput();
      else startApp();
    }
  }

  function startApp() {
    const rows = [...document.querySelectorAll('.roommate-row')];
    const raw = rows.map(r => r.querySelector('input').value.trim());
    if (raw.some(n => !n)) {
      view.showWarn('Please fill in all names!');
      return;
    }
    if (new Set(raw.map(n => n.toLowerCase())).size < raw.length) {
      view.showWarn('Names must be unique!');
      return;
    }
    if (raw.length < 2) {
      view.showWarn('Add at least 2 people!');
      return;
    }
    names = raw;
    initAppScreen();
    saveState();
  }

  function initAppScreen() {
    view.showApp(names);
    view.renderMembers(names);
    view.renderSplitControls(names);
    refreshApp();
  }

  function addExpense() {
    const desc = view.dom.desc.value.trim();
    const amount = parseFloat(view.dom.amount.value);
    const amountCents = core.toCents(amount);
    const payer = parseInt(view.dom.payer.value, 10);
    const splitType = view.dom.splitType.value;

    if (!desc) {
      view.shake('desc');
      return;
    }
    if (!amount || amount <= 0) {
      view.shake('amount');
      return;
    }

    let splits = {};
    if (splitType === 'equal') {
      splits = core.allocateByWeights(amountCents, names.map(() => 1), payer, names.length);
    } else if (splitType === 'shares') {
      const raw = names.map((_, i) => parseFloat(document.getElementById(`share${i}`).value) || 0);
      const total = raw.reduce((a, b) => a + b, 0);
      if (total <= 0) {
        alert('Shares must be > 0');
        return;
      }
      splits = core.allocateByWeights(amountCents, raw, payer, names.length);
    } else {
      const sel = names.map((_, i) => document.getElementById(`ptog${i}`).checked ? i : -1).filter(x => x >= 0);
      if (!sel.length) {
        alert('Select at least 1 person!');
        return;
      }
      const weightMap = names.map((_, i) => sel.includes(i) ? 1 : 0);
      splits = core.allocateByWeights(amountCents, weightMap, payer, names.length);
    }

    expenses.push({ desc, amount: core.fromCents(amountCents), payer, splits, id: Date.now() });
    view.resetExpenseForm();
    view.renderSplitControls(names);
    refreshApp();
    saveState();
  }

  function removeExpense(id) {
    expenses = expenses.filter(e => e.id !== id);
    refreshApp();
    saveState();
  }

  function clearAll() {
    if (!expenses.length) return;
    if (confirm('Remove all expenses?')) {
      expenses = [];
      refreshApp();
      saveState();
    }
  }

  async function resetApp() {
    if (!confirm('Reset everything and change members?')) return;
    expenses = [];
    names = [];
    try {
      await storage.clear();
      view.flashSaved();
    } catch (e) {
      view.flashSaveError();
    }
    view.showSetup();
    view.dom.roommateInputs.innerHTML = '';
    uidCounter = 0;
    addDefaultPeople();
  }

  function downloadCSV() {
    if (!expenses.length) {
      view.showWarn('No expenses to export!');
      return;
    }

    csv.downloadCsv({ core, documentRef: document, expenses, names, urlApi: URL });

    const orig = view.dom.csvBtn.textContent;
    view.dom.csvBtn.textContent = 'Downloaded!';
    view.dom.csvBtn.classList.add('download-confirmed');
    setTimeout(() => {
      view.dom.csvBtn.textContent = orig;
      view.dom.csvBtn.classList.remove('download-confirmed');
    }, 2000);
  }

  function bindEvents() {
    view.dom.addExpenseBtn.addEventListener('click', addExpense);
    view.dom.addPersonBtn.addEventListener('click', () => addPersonInput());
    view.dom.clearAllBtn.addEventListener('click', clearAll);
    view.dom.csvBtn.addEventListener('click', downloadCSV);
    view.dom.resetBtn.addEventListener('click', resetApp);
    view.dom.splitType.addEventListener('change', () => view.setSplitTypeVisibility(view.dom.splitType.value));
    view.dom.startBtn.addEventListener('click', startApp);
    view.dom.googleSignInBtn.addEventListener('click', signIn);
    view.dom.signOutBtn.addEventListener('click', signOut);
  }

  function waitForFirebase() {
    if (root.ZettlupFirebase) return Promise.resolve(root.ZettlupFirebase);
    if (root.ZettlupFirebaseError) return Promise.reject(root.ZettlupFirebaseError);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Firebase did not load.')), 10000);
      root.addEventListener('zettlup:firebase-ready', () => {
        clearTimeout(timer);
        resolve(root.ZettlupFirebase);
      }, { once: true });
      root.addEventListener('zettlup:firebase-error', event => {
        clearTimeout(timer);
        reject(event.detail || new Error('Firebase did not load.'));
      }, { once: true });
    });
  }

  function formatFirebaseError(error, fallback) {
    const code = error && error.code ? error.code : '';
    if (code === 'auth/unauthorized-domain') {
      return 'This domain is not authorized in Firebase Auth. Add localhost in Authentication settings.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'Google sign-in is not enabled in Firebase Authentication.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in popup closed before completion.';
    }
    if (code === 'auth/invalid-api-key') {
      return 'Firebase web config has an invalid API key.';
    }
    if (code === 'unavailable') {
      return 'Firestore is unavailable. Create/enable Cloud Firestore for this Firebase project and check your network.';
    }
    if (code === 'not-found') {
      return 'Firestore database was not found. Create a Cloud Firestore database for this Firebase project.';
    }
    if (code === 'permission-denied') {
      return 'Firestore rules blocked this request. Check your published rules in Firebase Console.';
    }
    if (code) {
      return `${fallback} (${code})`;
    }
    return error && error.message ? error.message : fallback;
  }

  async function signIn() {
    view.dom.googleSignInBtn.disabled = true;
    view.dom.authStatus.textContent = 'Opening Google sign-in...';
    try {
      await firebase.signInWithGoogle();
    } catch (e) {
      view.showSignedOut(formatFirebaseError(e, 'Google sign-in was not completed.'));
    } finally {
      view.dom.googleSignInBtn.disabled = false;
    }
  }

  async function signOut() {
    try {
      await firebase.signOutUser();
    } catch (e) {
      view.flashSaveError();
    }
  }

  async function handleSignedIn(user) {
    storage = root.ZettlupStorage.createFirestoreStorage(firebase, core.normalizeLegacyEqualSplits);
    view.showAccount(firebase.getUserLabel(user));
    resetInMemoryState();

    try {
      const result = await storage.load();
      if (result.found) {
        names = result.state.names;
        expenses = result.state.expenses;
        initAppScreen();
      } else {
        view.showSetup();
        addDefaultPeople();
      }
    } catch (e) {
      view.showSignedOut(formatFirebaseError(e, 'Could not load your Firestore session. Check your Firebase config and rules.'));
    }
  }

  function handleSignedOut() {
    storage = null;
    resetInMemoryState();
    view.showSignedOut();
  }

  async function boot() {
    view = root.ZettlupDom.createView({
      config,
      core,
      documentRef: document,
      onRemoveExpense: removeExpense,
    });
    view.applyStaticSymbols();
    bindEvents();
    view.dom.warnMsg.textContent = config.emptyText;
    view.showAuthLoading();

    try {
      firebase = await waitForFirebase();
      firebase.onAuthStateChanged(user => {
        if (user) handleSignedIn(user);
        else handleSignedOut();
      });
    } catch (e) {
      view.showSignedOut(formatFirebaseError(e, 'Firebase could not load. Check your network and Firebase config.'));
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})(typeof globalThis !== 'undefined' ? globalThis : window);
