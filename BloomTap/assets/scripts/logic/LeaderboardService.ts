import { StorageService } from './StorageService';

export interface LeaderboardEntry {
    name: string;
    score: number;
    timestamp: number;
}

export class LeaderboardService {
    static getPlayerName(): string | null { return null; }
    static setPlayerName(_name: string): void {}
    static getEntries(): LeaderboardEntry[] { return []; }
    static saveEntry(_name: string, _score: number): number | null { return null; }
    static getRank(_score: number): number | null { return null; }
}
