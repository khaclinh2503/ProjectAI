/**
 * StorageService — pure TypeScript, no 'cc' imports.
 *
 * Wraps localStorage with a 'bloomtap_' namespace prefix and silent-fail
 * error handling. If localStorage is unavailable (private browsing, quota
 * exceeded, etc.) operations silently no-op so the game continues.
 */
export class StorageService {
    private static readonly PREFIX = 'bloomtap_';

    /**
     * Reads a value from localStorage under the bloomtap_ namespace.
     * @param key - The key (without prefix)
     * @returns The stored string value, or null if absent or unavailable
     */
    static get(key: string): string | null {
        try {
            return localStorage.getItem(StorageService.PREFIX + key);
        } catch {
            return null;
        }
    }

    /**
     * Writes a value to localStorage under the bloomtap_ namespace.
     * Silently fails if localStorage is unavailable or quota is exceeded.
     * @param key   - The key (without prefix)
     * @param value - The string value to store
     */
    static set(key: string, value: string): void {
        try {
            localStorage.setItem(StorageService.PREFIX + key, value);
        } catch {
            // silent fail — game continues without persistence
        }
    }
}
