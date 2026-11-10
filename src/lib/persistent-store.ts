import { useSyncExternalStore } from "react";

/**
 * Minimal localStorage-backed external store. The server snapshot is always the
 * initial value, so SSR and hydration agree; the saved value takes over right after.
 */
export interface PersistentStore<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
  reset: () => void;
  key: string;
  initial: T;
}

export function createPersistentStore<T>(
  key: string,
  initial: T,
  revive: (raw: unknown) => T = (raw) => raw as T,
): PersistentStore<T> {
  let state: T | undefined;
  const listeners = new Set<() => void>();

  const load = (): T => {
    if (state !== undefined) return state;
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      state = raw ? revive(JSON.parse(raw)) : initial;
    } catch {
      state = initial;
    }
    return state;
  };

  const emit = () => listeners.forEach((l) => l());

  const set: PersistentStore<T>["set"] = (next) => {
    const prev = load();
    const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
    if (Object.is(value, prev)) return;
    state = value;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded or storage disabled: keep the in-memory value.
    }
    emit();
  };

  return {
    key,
    initial,
    get: load,
    set,
    reset: () => {
      state = initial;
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => {
        if (e.key !== key) return;
        state = undefined;
        listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
}

/** Subscribe to the whole store value; derive slices with useMemo in the caller. */
export function useStore<T>(store: PersistentStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.initial);
}
