const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../js/core');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`not ok - ${name}`);
    throw err;
  }
}

function sumSplitCents(splits) {
  return Object.values(splits).reduce((sum, amount) => sum + core.toCents(amount), 0);
}

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(cell);
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

function getSection(lines, title) {
  const start = lines.indexOf(title);
  assert.notEqual(start, -1, `Missing section: ${title}`);
  const bodyStart = start + 2;
  let end = bodyStart;
  while (end < lines.length && lines[end].trim() !== '') end++;
  return lines.slice(bodyStart, end);
}

function parseFairShareExport(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const membersLine = lines.find(line => line.startsWith('Members: '));
  assert.ok(membersLine, 'Missing Members line');
  const names = membersLine.replace('Members: ', '').split(', ');

  const expenseRows = getSection(lines, '--- EXPENSES ---').map(line => {
    const cells = parseCsvLine(line);
    const payer = names.indexOf(cells[3]);
    assert.notEqual(payer, -1, `Unknown payer: ${cells[3]}`);

    const splits = {};
    names.forEach((_, i) => {
      splits[i] = Number(cells[i + 4]);
    });

    return {
      amount: Number(cells[2]),
      desc: cells[1],
      payer,
      splits,
    };
  });
  const expenses = expenseRows.map(row => ({
    amount: row.amount,
    desc: row.desc,
    payer: row.payer,
    splits: row.splits,
  }));

  const expectedBalances = getSection(lines, '--- NET BALANCES ---').map(line => {
    const [name, balance] = parseCsvLine(line);
    return { name, cents: core.toCents(balance) };
  });

  const expectedSettlements = getSection(lines, '--- SETTLEMENTS ---').map(line => {
    const [fromName, toName, amount] = parseCsvLine(line);
    return {
      from: names.indexOf(fromName),
      to: names.indexOf(toName),
      amt: core.toCents(amount),
    };
  });

  return { expenseRows, expenses, expectedBalances, expectedSettlements, names };
}

test('converts money through cents without floating-point drift', () => {
  assert.equal(core.toCents('12.345'), 1235);
  assert.equal(core.toCents(0.1 + 0.2), 30);
  assert.equal(core.fromCents(1235), 12.35);
});

test('allocates equal splits and rotates the extra cent by payer', () => {
  const splits = core.allocateByWeights(1000, [1, 1, 1], 1, 3);

  assert.deepEqual(splits, { 0: 3.33, 1: 3.34, 2: 3.33 });
  assert.equal(sumSplitCents(splits), 1000);
});

test('allocates custom share weights exactly to the total cents', () => {
  const splits = core.allocateByWeights(1001, [2, 1, 1], 0, 3);

  assert.deepEqual(splits, { 0: 5.01, 1: 2.5, 2: 2.5 });
  assert.equal(sumSplitCents(splits), 1001);
});

test('ignores zero-weight participants and rejects empty allocations', () => {
  assert.deepEqual(core.allocateByWeights(999, [1, 0, 1], 0, 3), { 0: 5, 2: 4.99 });
  assert.equal(core.allocateByWeights(999, [0, 0, 0], 0, 3), null);
});

test('ignores negative and non-numeric weights during allocation', () => {
  const splits = core.allocateByWeights(1000, [1, -1, 'nope', 1], 3, 4);

  assert.deepEqual(splits, { 0: 5, 3: 5 });
  assert.equal(sumSplitCents(splits), 1000);
});

test('allocates decimal share weights without losing cents', () => {
  const splits = core.allocateByWeights(100, [0.1, 0.2, 0.7], 0, 3);

  assert.deepEqual(splits, { 0: 0.1, 1: 0.2, 2: 0.7 });
  assert.equal(sumSplitCents(splits), 100);
});

test('allocates one cent across more people than pennies', () => {
  const splits = core.allocateByWeights(1, [1, 1, 1], 2, 3);

  assert.deepEqual(splits, { 0: 0, 1: 0, 2: 0.01 });
  assert.equal(sumSplitCents(splits), 1);
});

test('allocates two cents across three equal participants by tie order', () => {
  const splits = core.allocateByWeights(2, [1, 1, 1], 1, 3);

  assert.deepEqual(splits, { 0: 0, 1: 0.01, 2: 0.01 });
  assert.equal(sumSplitCents(splits), 2);
});

test('rotates equal split remainder cents from the payer index', () => {
  assert.deepEqual(core.allocateByWeights(100, [1, 1, 1], 0, 3), { 0: 0.34, 1: 0.33, 2: 0.33 });
  assert.deepEqual(core.allocateByWeights(100, [1, 1, 1], 1, 3), { 0: 0.33, 1: 0.34, 2: 0.33 });
  assert.deepEqual(core.allocateByWeights(100, [1, 1, 1], 2, 3), { 0: 0.33, 1: 0.33, 2: 0.34 });
});

test('allocates non-divisible equal split across selected participants only', () => {
  const splits = core.allocateByWeights(1000, [1, 0, 1, 0], 2, 4);

  assert.deepEqual(splits, { 0: 5, 2: 5 });
  assert.equal(sumSplitCents(splits), 1000);
});

test('allocates odd cent selected split by selected participant tie order', () => {
  const splits = core.allocateByWeights(1001, [1, 0, 1, 0], 2, 4);

  assert.deepEqual(splits, { 0: 5, 2: 5.01 });
  assert.equal(sumSplitCents(splits), 1001);
});

test('allocates weighted split when remainder order differs from weight order', () => {
  const splits = core.allocateByWeights(101, [3, 2, 1], 0, 3);

  assert.deepEqual(splits, { 0: 0.5, 1: 0.34, 2: 0.17 });
  assert.equal(sumSplitCents(splits), 101);
});

test('allocates many remainder cents across equal participants predictably', () => {
  const splits = core.allocateByWeights(1004, [1, 1, 1, 1, 1, 1], 4, 6);

  assert.deepEqual(splits, { 0: 1.67, 1: 1.67, 2: 1.67, 3: 1.67, 4: 1.68, 5: 1.68 });
  assert.equal(sumSplitCents(splits), 1004);
});

test('calculates net balances from paid amounts and splits', () => {
  const names = ['Ava', 'Ben', 'Cam'];
  const expenses = [
    { amount: 30, payer: 0, splits: { 0: 10, 1: 10, 2: 10 } },
    { amount: 12, payer: 1, splits: { 1: 6, 2: 6 } },
  ];

  assert.deepEqual(core.calculateBalances(names, expenses), [2000, -400, -1600]);
});

test('returns zero balances and no settlements for empty expenses', () => {
  const names = ['Ava', 'Ben', 'Cam'];

  assert.deepEqual(core.calculateBalances(names, []), [0, 0, 0]);
  assert.deepEqual(core.buildPairwiseSettlements(names, []), []);
});

test('handles payer-only expenses without creating settlements', () => {
  const names = ['Ava', 'Ben'];
  const expenses = [
    { amount: 8.25, payer: 0, splits: { 0: 8.25 } },
  ];

  assert.deepEqual(core.calculateBalances(names, expenses), [0, 0]);
  assert.deepEqual(core.buildPairwiseSettlements(names, expenses), []);
});

test('handles sparse selected-participant splits', () => {
  const names = ['Ava', 'Ben', 'Cam'];
  const expenses = [
    { amount: 9, payer: 2, splits: { 0: 4.5, 2: 4.5 } },
  ];

  assert.deepEqual(core.calculateBalances(names, expenses), [-450, 0, 450]);
  assert.deepEqual(core.buildPairwiseSettlements(names, expenses), [
    { from: 0, to: 2, amt: 450 },
  ]);
});

test('builds pairwise settlements and nets opposing debts', () => {
  const names = ['Ava', 'Ben'];
  const expenses = [
    { amount: 10, payer: 0, splits: { 1: 10 } },
    { amount: 4, payer: 1, splits: { 0: 4 } },
  ];

  assert.deepEqual(core.buildPairwiseSettlements(names, expenses), [
    { from: 1, to: 0, amt: 600 },
  ]);
});

test('does not emit zero-dollar settlements for fully offset expenses', () => {
  const names = ['Ava', 'Ben'];
  const expenses = [
    { amount: 10, payer: 0, splits: { 1: 10 } },
    { amount: 10, payer: 1, splits: { 0: 10 } },
  ];

  assert.deepEqual(core.calculateBalances(names, expenses), [0, 0]);
  assert.deepEqual(core.buildPairwiseSettlements(names, expenses), []);
});

test('normalizes legacy equal splits to rotate penny bias by payer', () => {
  const names = ['Ava', 'Ben', 'Cam'];
  const expenses = [
    { amount: 10, payer: 1, splits: { 0: 3.34, 1: 3.33, 2: 3.33 } },
  ];

  assert.equal(core.normalizeLegacyEqualSplits(names, expenses), true);
  assert.deepEqual(expenses[0].splits, { 0: 3.33, 1: 3.34, 2: 3.33 });
});

test('leaves non-equal or partial legacy splits unchanged', () => {
  const names = ['Ava', 'Ben', 'Cam'];
  const expenses = [
    { amount: 10, payer: 0, splits: { 0: 5, 1: 3, 2: 2 } },
    { amount: 10, payer: 0, splits: { 0: 5, 1: 5 } },
  ];

  assert.equal(core.normalizeLegacyEqualSplits(names, expenses), false);
  assert.deepEqual(expenses, [
    { amount: 10, payer: 0, splits: { 0: 5, 1: 3, 2: 2 } },
    { amount: 10, payer: 0, splits: { 0: 5, 1: 5 } },
  ]);
});

test('parses quoted CSV cells with commas and escaped quotes', () => {
  assert.deepEqual(
    parseCsvLine('1,"Rice, beans, and ""snacks""",12.34,Ava'),
    ['1', 'Rice, beans, and "snacks"', '12.34', 'Ava'],
  );
});

test('matches balances from exported test-data.csv fixture', () => {
  const fixture = parseFairShareExport(path.join(__dirname, 'test-data.csv'));
  const actualBalances = core.calculateBalances(fixture.names, fixture.expenses);
  const expectedBalances = fixture.names.map(name => {
    const row = fixture.expectedBalances.find(balance => balance.name === name);
    assert.ok(row, `Missing expected balance for ${name}`);
    return row.cents;
  });

  assert.equal(fixture.expenses.length, 102);
  assert.deepEqual(actualBalances, expectedBalances);
});

test('matches settlements from exported test-data.csv fixture', () => {
  const fixture = parseFairShareExport(path.join(__dirname, 'test-data.csv'));

  assert.deepEqual(
    core.buildPairwiseSettlements(fixture.names, fixture.expenses),
    fixture.expectedSettlements,
  );
});

test('matches total expense amount from exported test-data.csv fixture', () => {
  const fixture = parseFairShareExport(path.join(__dirname, 'test-data.csv'));
  const totalFromCsv = fixture.expenseRows.reduce((sum, row) => sum + core.toCents(row.amount), 0);
  const totalFromAppData = fixture.expenses.reduce((sum, expense) => sum + core.toCents(expense.amount), 0);

  assert.equal(totalFromAppData, totalFromCsv);
  assert.equal(core.fromCents(totalFromAppData).toFixed(2), '2029.49');
});

test('matches total allocated shares from exported test-data.csv fixture', () => {
  const fixture = parseFairShareExport(path.join(__dirname, 'test-data.csv'));
  const totalExpenses = fixture.expenses.reduce((sum, expense) => sum + core.toCents(expense.amount), 0);
  const totalShares = fixture.expenses.reduce((sum, expense) => {
    return sum + Object.values(expense.splits).reduce((innerSum, share) => innerSum + core.toCents(share), 0);
  }, 0);

  assert.equal(totalShares, totalExpenses);
});

test('matches per-person share totals from exported test-data.csv fixture', () => {
  const fixture = parseFairShareExport(path.join(__dirname, 'test-data.csv'));
  const shareTotals = fixture.names.map((_, i) => {
    return fixture.expenseRows.reduce((sum, row) => sum + core.toCents(row.splits[i]), 0);
  });
  const appShareTotals = fixture.names.map((_, i) => {
    return fixture.expenses.reduce((sum, expense) => sum + core.toCents(expense.splits[i] || 0), 0);
  });

  assert.deepEqual(appShareTotals, shareTotals);
  assert.deepEqual(appShareTotals.map(total => core.fromCents(total).toFixed(2)), ['1117.04', '411.28', '501.17']);
});

test('every exported fixture expense allocates exactly its row total', () => {
  const fixture = parseFairShareExport(path.join(__dirname, 'test-data.csv'));
  const mismatches = fixture.expenseRows
    .map((row, index) => ({
      index: index + 1,
      amount: core.toCents(row.amount),
      shares: Object.values(row.splits).reduce((sum, share) => sum + core.toCents(share), 0),
    }))
    .filter(row => row.amount !== row.shares);

  assert.deepEqual(mismatches, []);
});

test('fixture balances are conserved to zero after all expenses', () => {
  const fixture = parseFairShareExport(path.join(__dirname, 'test-data.csv'));
  const balances = core.calculateBalances(fixture.names, fixture.expenses);

  assert.equal(balances.reduce((sum, balance) => sum + balance, 0), 0);
});

test('fixture settlements match pairwise net obligations', () => {
  const fixture = parseFairShareExport(path.join(__dirname, 'test-data.csv'));
  const settlements = core.buildPairwiseSettlements(fixture.names, fixture.expenses);
  const pairTotals = {};

  fixture.expenses.forEach(expense => {
    Object.entries(expense.splits).forEach(([personIndex, share]) => {
      const from = Number(personIndex);
      if (from === expense.payer) return;
      const low = Math.min(from, expense.payer);
      const high = Math.max(from, expense.payer);
      const key = `${low}:${high}`;
      const direction = from === low ? 1 : -1;
      pairTotals[key] = (pairTotals[key] || 0) + direction * core.toCents(share);
    });
  });

  const expected = Object.entries(pairTotals).flatMap(([key, net]) => {
    const [low, high] = key.split(':').map(Number);
    if (net > 0) return [{ from: low, to: high, amt: net }];
    if (net < 0) return [{ from: high, to: low, amt: Math.abs(net) }];
    return [];
  }).sort((a, b) => {
    const aLow = Math.min(a.from, a.to);
    const bLow = Math.min(b.from, b.to);
    if (aLow !== bLow) return aLow - bLow;
    return Math.max(a.from, a.to) - Math.max(b.from, b.to);
  });

  assert.deepEqual(settlements, expected);
});
