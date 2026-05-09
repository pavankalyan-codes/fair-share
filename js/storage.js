(function initStorage(root) {
  function createStorage(storage, key, normalizeLegacyEqualSplits) {
    function save(state) {
      storage.setItem(key, JSON.stringify(state));
    }

    function load() {
      const raw = storage.getItem(key);
      if (!raw) return { found: false };

      const data = JSON.parse(raw);
      if (!data.names || data.names.length < 2) return { found: false };

      const state = {
        expenses: data.expenses || [],
        names: data.names,
      };
      const migrated = normalizeLegacyEqualSplits(state.names, state.expenses);
      if (migrated) save(state);
      return { found: true, migrated, state };
    }

    function clear() {
      storage.removeItem(key);
    }

    function hasRestorableSession() {
      try {
        const result = load();
        return result.found;
      } catch (e) {
        return false;
      }
    }

    return { clear, hasRestorableSession, load, save };
  }

  root.FairShareStorage = { createStorage };
})(typeof globalThis !== 'undefined' ? globalThis : window);
