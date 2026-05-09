(function initCsv(root) {
  function csvCell(val) {
    const s = String(val);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  }

  function buildCsvLines({ core, expenses, names }) {
    const expHeaders = ['#', 'Description', 'Total Amount', 'Paid By', ...names.map(n => `${n}'s Share`)];
    const expRows = expenses.map((e, idx) => {
      const shares = names.map((_, i) => e.splits[i] != null ? e.splits[i].toFixed(2) : '0.00');
      return [idx + 1, csvCell(e.desc), e.amount.toFixed(2), csvCell(names[e.payer]), ...shares];
    });

    const bal = core.calculateBalances(names, expenses);
    const balHeaders = ['Person', 'Net Balance ($)', 'Status'];
    const balRows = names.map((n, i) => {
      const v = core.normalizeCents(bal[i]);
      const status = v > 0 ? 'Gets back' : v < 0 ? 'Owes' : 'Settled';
      return [csvCell(n), (v > 0 ? '+' : v < 0 ? '-' : '') + core.fromCents(Math.abs(v)).toFixed(2), status];
    });

    const txns = core.buildPairwiseSettlements(names, expenses);
    const settlHeaders = ['From', 'To', 'Amount ($)'];
    const settlRows = txns.length
      ? txns.map(t => [csvCell(names[t.from]), csvCell(names[t.to]), core.fromCents(t.amt).toFixed(2)])
      : [['-', '-', 'All settled']];

    return [
      `FairShare Export - ${new Date().toLocaleDateString()}`,
      `Members: ${names.join(', ')}`,
      '',
      '--- EXPENSES ---',
      expHeaders.join(','),
      ...expRows.map(r => r.join(',')),
      '',
      '--- NET BALANCES ---',
      balHeaders.join(','),
      ...balRows.map(r => r.join(',')),
      '',
      '--- SETTLEMENTS ---',
      settlHeaders.join(','),
      ...settlRows.map(r => r.join(',')),
    ];
  }

  function downloadCsv({ core, documentRef, expenses, names, urlApi }) {
    const lines = buildCsvLines({ core, expenses, names });
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = urlApi.createObjectURL(blob);
    const a = documentRef.createElement('a');
    a.href = url;
    a.download = `fairshare-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    urlApi.revokeObjectURL(url);
  }

  root.FairShareCsv = { buildCsvLines, csvCell, downloadCsv };
})(typeof globalThis !== 'undefined' ? globalThis : window);
