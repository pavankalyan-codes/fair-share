(function initCore(root, factory) {
  const core = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = core;
  }
  root.FairShareCore = core;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createCore() {
  function toCents(amount) {
    return Math.round(Number(amount) * 100);
  }

  function fromCents(cents) {
    return cents / 100;
  }

  function normalizeCents(cents) {
    return Math.abs(cents) <= 0 ? 0 : cents;
  }

  function allocateByWeights(totalCents, weights, tieStart = 0, personCount = weights.length) {
    const active = weights
      .map((w, i) => ({ i, w: Number(w) || 0 }))
      .filter(x => x.w > 0);
    if (!active.length) return null;

    const totalWeight = active.reduce((sum, x) => sum + x.w, 0);
    if (totalWeight <= 0) return null;

    const base = {};
    let used = 0;
    const fractions = [];

    active.forEach(x => {
      const exact = (totalCents * x.w) / totalWeight;
      const floorVal = Math.floor(exact);
      base[x.i] = floorVal;
      used += floorVal;
      fractions.push({ i: x.i, rem: exact - floorVal });
    });

    const n = personCount || 1;
    fractions.sort((a, b) => {
      if (b.rem !== a.rem) return b.rem - a.rem;
      const ar = ((a.i - tieStart) % n + n) % n;
      const br = ((b.i - tieStart) % n + n) % n;
      return ar - br;
    });

    const remaining = totalCents - used;
    for (let k = 0; k < remaining; k++) {
      base[fractions[k % fractions.length].i] += 1;
    }

    const splits = {};
    Object.keys(base).forEach(i => {
      splits[i] = fromCents(base[i]);
    });
    return splits;
  }

  function calculateBalances(names, expenses) {
    const bal = new Array(names.length).fill(0);
    expenses.forEach(e => {
      bal[e.payer] += toCents(e.amount);
      Object.entries(e.splits).forEach(([i, v]) => {
        bal[+i] -= toCents(v);
      });
    });
    return bal.map(normalizeCents);
  }

  function buildPairwiseSettlements(names, expenses) {
    const owes = Array.from({ length: names.length }, () => new Array(names.length).fill(0));

    expenses.forEach(e => {
      Object.entries(e.splits).forEach(([i, v]) => {
        const from = +i;
        if (from === e.payer) return;
        owes[from][e.payer] += toCents(v);
      });
    });

    const txns = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const ij = normalizeCents(owes[i][j]);
        const ji = normalizeCents(owes[j][i]);
        const net = ij - ji;
        if (net > 0) txns.push({ from: i, to: j, amt: net });
        else if (net < 0) txns.push({ from: j, to: i, amt: -net });
      }
    }
    return txns;
  }

  function normalizeLegacyEqualSplits(names, expenses) {
    let changed = false;
    expenses.forEach(e => {
      if (!e || !e.splits) return;
      const participants = Object.keys(e.splits).map(Number);
      if (participants.length !== names.length) return;

      const splitCents = names.map((_, i) => toCents(e.splits[i] != null ? e.splits[i] : 0));
      if (splitCents.some(v => v <= 0)) return;

      const min = Math.min(...splitCents);
      const max = Math.max(...splitCents);
      if (max - min > 1) return;

      const amountCents = toCents(e.amount);
      const sumCents = splitCents.reduce((a, b) => a + b, 0);
      if (sumCents !== amountCents) return;

      const normalized = allocateByWeights(amountCents, names.map(() => 1), Number(e.payer) || 0, names.length);
      const same = names.every((_, i) => toCents(normalized[i] != null ? normalized[i] : 0) === splitCents[i]);
      if (!same) {
        e.splits = normalized;
        changed = true;
      }
    });
    return changed;
  }

  return {
    allocateByWeights,
    buildPairwiseSettlements,
    calculateBalances,
    fromCents,
    normalizeCents,
    normalizeLegacyEqualSplits,
    toCents,
  };
});
