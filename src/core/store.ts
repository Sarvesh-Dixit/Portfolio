import { useSyncExternalStore } from 'react';

export interface Store<T> {
  get(): T;
  set(value: T): void;
  subscribe(cb: () => void): () => void;
}

/** Minimal external store; React reads it via useStore without prop drilling. */
export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return;
      value = next;
      subs.forEach((cb) => cb());
    },
    subscribe(cb) {
      subs.add(cb);
      return () => subs.delete(cb);
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
