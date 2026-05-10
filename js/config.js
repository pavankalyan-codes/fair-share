(function initConfig(root) {
  root.ZettlupConfig = {
    emptyText: '\u00a0',
    palette: [
      { bg: '#e8e0f0', fg: '#6a3ab0' },
      { bg: '#e0eef8', fg: '#1a6a9a' },
      { bg: '#e8f5e0', fg: '#3a7a1a' },
      { bg: '#fdf0e0', fg: '#a05a00' },
      { bg: '#fde0e8', fg: '#a01a4a' },
      { bg: '#e0faf5', fg: '#0a7a60' },
      { bg: '#f0f0e0', fg: '#6a6a1a' },
      { bg: '#ffe8e0', fg: '#c0381a' },
      { bg: '#e0e8ff', fg: '#2a3ab0' },
      { bg: '#f0e8f8', fg: '#8a2ab0' },
    ],
    storageKey: 'zettlup_v1',
    symbols: {
      arrowRight: '\u2192',
      check: '\u2713',
      close: '\u00d7',
      lightning: '\u26a1',
      minus: '\u2212',
      money: '\ud83d\udcb8',
      receipt: '\ud83e\uddfe',
      reset: '\u21ba',
      save: '\ud83d\udcbe',
      separator: '\u00b7',
      wave: '\ud83d\udc4b',
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
