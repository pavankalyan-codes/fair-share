(function initDom(root) {
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function cacheDom(documentRef) {
    return {
      addExpenseBtn: documentRef.getElementById('add-expense-btn'),
      addPersonBtn: documentRef.getElementById('add-person-btn'),
      amount: documentRef.getElementById('amount'),
      balanceGrid: documentRef.getElementById('balance-grid'),
      clearAllBtn: documentRef.getElementById('clear-all-btn'),
      csvBtn: documentRef.getElementById('csv-btn'),
      desc: documentRef.getElementById('desc'),
      dismissRestoreBtn: documentRef.getElementById('dismiss-restore-btn'),
      expCount: documentRef.getElementById('exp-count'),
      expensesList: documentRef.getElementById('expenses-list'),
      headerSub: documentRef.getElementById('header-sub'),
      participantToggles: documentRef.getElementById('participant-toggles'),
      participantsSection: documentRef.getElementById('participants-section'),
      payer: documentRef.getElementById('payer'),
      resetBtn: documentRef.getElementById('reset-btn'),
      restoreBanner: documentRef.getElementById('restore-banner'),
      restoreBtn: documentRef.getElementById('restore-btn'),
      roommateInputs: documentRef.getElementById('roommate-inputs'),
      roommatesBar: documentRef.getElementById('roommates-bar'),
      saveIndicator: documentRef.getElementById('save-indicator'),
      setupScreen: documentRef.getElementById('setup-screen'),
      sharesGrid: documentRef.getElementById('shares-grid'),
      sharesSection: documentRef.getElementById('shares-section'),
      splitType: documentRef.getElementById('split-type'),
      startBtn: documentRef.getElementById('start-btn'),
      warnMsg: documentRef.getElementById('warn-msg'),
    };
  }

  function createView({ config, core, documentRef, onRemoveExpense }) {
    const dom = cacheDom(documentRef);
    const { emptyText, palette, symbols } = config;
    let saveTimer = null;
    let warnTimer = null;

    function colorFor(i) {
      return palette[i % palette.length];
    }

    function setPersonColors(el, i) {
      const c = colorFor(i);
      el.style.setProperty('--person-bg', c.bg);
      el.style.setProperty('--person-fg', c.fg);
    }

    function applyStaticSymbols() {
      documentRef.querySelectorAll('[data-symbol]').forEach(el => {
        const symbol = symbols[el.dataset.symbol];
        if (symbol) el.textContent = symbol;
      });
    }

    function flashSaved() {
      if (!dom.saveIndicator) return;
      dom.saveIndicator.classList.add('visible');
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => dom.saveIndicator.classList.remove('visible'), 1800);
    }

    function showWarn(msg) {
      dom.warnMsg.textContent = msg;
      clearTimeout(warnTimer);
      warnTimer = setTimeout(() => {
        dom.warnMsg.textContent = emptyText;
      }, 2200);
    }

    function shake(id) {
      const el = documentRef.getElementById(id);
      el.style.borderColor = 'var(--accent)';
      el.focus();
      setTimeout(() => {
        el.style.borderColor = '';
      }, 800);
    }

    function emptyExpensesMarkup() {
      return `<div class="expense-empty"><span class="big">${symbols.receipt}</span>No expenses yet - add one above!</div>`;
    }

    function settledMarkup() {
      return `<div class="settled-msg"><span class="big">${symbols.check}</span>All square - nothing owed!</div>`;
    }

    function showSetup() {
      documentRef.body.classList.remove('app-active');
      dom.setupScreen.style.display = 'block';
      dom.headerSub.textContent = 'ROOM EDITION';
    }

    function showApp(names) {
      documentRef.body.classList.add('app-active');
      dom.setupScreen.style.display = 'none';
      dom.headerSub.textContent = `ROOM EDITION ${symbols.separator} ${names.length} PEOPLE`;
    }

    function renderMembers(names) {
      dom.roommatesBar.innerHTML = names.map((n, i) => `
        <div class="chip" data-person-index="${i}"><span class="chip-dot"></span>${esc(n)}</div>`).join('');
      dom.roommatesBar.querySelectorAll('.chip').forEach((chip, i) => setPersonColors(chip, i));
      dom.payer.innerHTML = names.map((n, i) => `<option value="${i}">${esc(n)}</option>`).join('');
    }

    function renderSplitControls(names) {
      dom.sharesGrid.innerHTML = names.map((n, i) => `
        <div class="share-cell">
          <label for="share${i}">${esc(n)}</label>
          <input type="number" id="share${i}" value="1" min="0.1" step="0.1">
        </div>`).join('');

      dom.participantToggles.innerHTML = names.map((n, i) => `
        <div class="participant-toggle">
          <input type="checkbox" id="ptog${i}" value="${i}" checked>
          <label for="ptog${i}">${esc(n)}</label>
        </div>`).join('');
    }

    function setSplitTypeVisibility(splitType) {
      dom.sharesSection.style.display = splitType === 'shares' ? 'block' : 'none';
      dom.participantsSection.style.display = splitType === 'selected' ? 'block' : 'none';
    }

    function resetExpenseForm() {
      dom.desc.value = '';
      dom.amount.value = '';
      dom.splitType.value = 'equal';
      setSplitTypeVisibility('equal');
    }

    function renderExpenses(names, expenses) {
      dom.expCount.textContent = expenses.length;
      if (!expenses.length) {
        dom.expensesList.innerHTML = emptyExpensesMarkup();
        return;
      }

      dom.expensesList.innerHTML = [...expenses].reverse().map(e => {
        const parts = Object.keys(e.splits).map(Number);
        const allIn = parts.length === names.length;
        const splitDesc = allIn ? 'split among all' : `split: ${parts.map(i => names[i]).join(', ')}`;
        const shareDesc = parts
          .sort((a, b) => a - b)
          .map(i => `${names[i]} $${Number(e.splits[i]).toFixed(2)}`)
          .join(', ');
        return `
          <div class="expense-item">
            <div class="expense-avatar" data-person-index="${e.payer}">${esc(names[e.payer].slice(0, 2).toUpperCase())}</div>
            <div class="expense-body">
              <div class="expense-desc">${esc(e.desc)}</div>
              <div class="expense-meta">Paid by <b>${esc(names[e.payer])}</b> ${symbols.separator} ${esc(splitDesc)}<br>Shares: ${esc(shareDesc)}</div>
            </div>
            <div class="expense-amount">$${e.amount.toFixed(2)}
              <button class="btn btn-icon remove-expense-btn" type="button" data-expense-id="${e.id}" aria-label="Remove expense">${symbols.close}</button>
            </div>
          </div>`;
      }).join('');

      dom.expensesList.querySelectorAll('.expense-avatar').forEach(avatar => {
        setPersonColors(avatar, Number(avatar.dataset.personIndex));
      });
      dom.expensesList.querySelectorAll('.remove-expense-btn').forEach(btn => {
        btn.addEventListener('click', () => onRemoveExpense(Number(btn.dataset.expenseId)));
      });
    }

    function renderSettlement(names, expenses) {
      const bal = core.calculateBalances(names, expenses);

      dom.balanceGrid.innerHTML = names.map((n, i) => {
        const v = core.normalizeCents(bal[i]);
        const cls = v > 0 ? 'positive' : v < 0 ? 'negative' : 'zero';
        const lbl = v > 0 ? 'gets back' : v < 0 ? 'owes' : 'settled';
        const sign = v > 0 ? '+' : v < 0 ? symbols.minus : '';
        return `<div class="balance-cell">
          <div class="balance-name">${esc(n)}</div>
          <div class="balance-amount ${cls}">${sign}$${core.fromCents(Math.abs(v)).toFixed(2)}</div>
          <div class="balance-label ${cls}">${lbl}</div>
        </div>`;
      }).join('');

      const txns = core.buildPairwiseSettlements(names, expenses);
      documentRef.getElementById('settlements-list').innerHTML = txns.length
        ? txns.map(t => `
            <div class="settlement-row">
              <div class="payer-name">${esc(names[t.from])}</div>
              <div class="arrow-amount"><span class="amt">$${core.fromCents(t.amt).toFixed(2)}</span><span class="arr">${symbols.arrowRight}</span></div>
              <div class="receiver-name">${esc(names[t.to])}</div>
            </div>`).join('')
        : settledMarkup();
    }

    return {
      applyStaticSymbols,
      dom,
      esc,
      flashSaved,
      renderExpenses,
      renderMembers,
      renderSettlement,
      renderSplitControls,
      resetExpenseForm,
      setPersonColors,
      setSplitTypeVisibility,
      shake,
      showApp,
      showSetup,
      showWarn,
    };
  }

  root.FairShareDom = { createView, esc };
})(typeof globalThis !== 'undefined' ? globalThis : window);
