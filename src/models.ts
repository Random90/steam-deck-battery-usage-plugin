import { BATTERY_STATE } from "./constants";

export interface BatteryHistoryEntry {
    timestamp: number;
    power: number;
    state: BATTERY_STATE;
}

export type BatteryHistory = BatteryHistoryEntry[];