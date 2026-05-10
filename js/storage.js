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

  function createFirestoreStorage(firebaseService, normalizeLegacyEqualSplits) {
    function ensureService() {
      if (!firebaseService || !firebaseService.currentUser) {
        throw new Error('Firebase service is not ready.');
      }
      if (!firebaseService.currentUser()) {
        throw new Error('Sign in before saving FairShare data.');
      }
    }

    async function save(state) {
      ensureService();
      await firebaseService.saveSession({
        expenses: state.expenses || [],
        names: state.names || [],
      });
    }

    async function load() {
      ensureService();
      const data = await firebaseService.loadSession();
      if (!data || !data.names || data.names.length < 2) return { found: false };

      const state = {
        expenses: data.expenses || [],
        names: data.names,
      };
      const migrated = normalizeLegacyEqualSplits(state.names, state.expenses);
      if (migrated) await save(state);
      return { found: true, migrated, state };
    }

    async function clear() {
      ensureService();
      await firebaseService.clearSession();
    }

    async function hasRestorableSession() {
      try {
        const result = await load();
        return result.found;
      } catch (e) {
        return false;
      }
    }

    return { clear, hasRestorableSession, load, save };
  }

  root.FairShareStorage = { createFirestoreStorage, createStorage };
})(typeof globalThis !== 'undefined' ? globalThis : window);
