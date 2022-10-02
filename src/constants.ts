export const PLUGIN_ID = 'steam-deck-battery-usage-plugin';

export enum BATTERY_STATE {
    UNKNOWN = 'unknown',
    CHARGING = 'charging',
    DISCHARGING = 'discharging',
    FULL = 'fully-charged',
    EMPTY = 'empty',
}