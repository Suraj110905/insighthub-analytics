/**
 * In-memory storage adapter for Amazon Cognito User Pools SDK.
 * 
 * Prevents persisting sensitive JWT tokens, access tokens, or refresh tokens
 * in browser localStorage or sessionStorage.
 * 
 * Trade-off:
 * - Security Benefit: Zero risk of persistent token theft via XSS or disk inspection.
 * - UX Limitation: Sessions are scoped to the active browser tab lifecycle and reset on page refresh.
 */

export class MemoryStorage {
  constructor() {
    this.store = new Map();
  }

  setItem(key, value) {
    this.store.set(key, String(value));
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  removeItem(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

export const inMemoryStorage = new MemoryStorage();
