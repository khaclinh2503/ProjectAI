// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService } from './StorageService';

describe('StorageService', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('get returns null when localStorage is empty', () => {
        expect(StorageService.get('highscore')).toBeNull();
    });

    it('set then get round-trips value with bloomtap_ prefix', () => {
        StorageService.set('highscore', '1200');
        expect(StorageService.get('highscore')).toBe('1200');
        expect(localStorage.getItem('bloomtap_highscore')).toBe('1200');
    });

    it('get returns null when localStorage.getItem throws', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('unavailable'); });
        expect(StorageService.get('highscore')).toBeNull();
    });

    it('set does not throw when localStorage.setItem throws (silent fail)', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
        expect(() => StorageService.set('highscore', '1200')).not.toThrow();
    });
});
