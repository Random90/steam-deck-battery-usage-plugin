import { SMM } from '@crankshaft/types';
import { BATTERY_STATE, PLUGIN_ID } from './constants';
import { BatteryHistory } from './models';
import { secondsToHms } from './utils';

let api: SMM;

let powerRef: HTMLElement;
let capacityRef: HTMLElement;
let lastGamingSessionRef: HTMLElement;
let lastSuspendTimeRef: HTMLElement;

let timers: number[] = [];

let currentStatus = BATTERY_STATE.UNKNOWN;
let currentPower = 0;
let capacity = '0%';
let gamingSessions: string[] = [];
let lastSuspendTime = secondsToHms(0);

let batteryHistory: BatteryHistory;

export const load = (smm: SMM) => {
  api = smm;
  const render = async (smm: SMM, root: HTMLElement) => {
    timers.forEach((timer) => clearInterval(timer));
    console.log('loaded smm', smm);
    console.log('open the windows too', window);

    createUI(root);
    // @TODO remove timers if window is closed
    attachIntervalHandlers();

    await updateBatteryStatus();
    await updateCapacity();
    await updateCurrentPower();
    await updateBatteryHistory();
  };

  smm.MenuManager.addMenuItem({
    id: PLUGIN_ID,
    label: 'Battery Usage Stats',
    render,
  });

  // smm.InGameMenu.addMenuItem({
  //   id: PLUGIN_ID,
  //   title: 'Battery Usage Stats',
  //   render
  // });
};

export const unload = (smm: SMM) => {
  console.log('unloading');
  console.log('timers', timers);
  smm.MenuManager.removeMenuItem('steam-deck-battery-usage-plugin');
  // smm.InGameMenu.removeMenuItem('steam-deck-battery-usage-plugin');
  timers.forEach((timer) => clearInterval(timer));
};

const updateBatteryHistory = async () => {
  try {
    let batModel = await exec("upower -i `upower -e | grep 'BAT'` | grep -E 'model' | awk '{print $2}'");
    let batCapacity = (await exec("upower -i `upower -e | grep 'BAT'` | grep -E 'energy-full-design' | awk '{print $2}'"))?.split('.')[0];
    if (!batModel || !batCapacity) throw new Error('Could not get battery model or capacity');

    let rawHistory = await exec(`cat /var/lib/upower/history-rate-${batModel}-${batCapacity}.dat`);
    if (!rawHistory) throw new Error('Could not get battery history');

    batteryHistory = rawHistory.split('\n').map((line) => {
      let [timestamp, power, state] = line.replace(/\s+/g, ' ').split(' ');
      return {
        timestamp: +timestamp,
        power: +power,
        state: state as BATTERY_STATE,
      };
    });
    console.log('batteryHistory', batteryHistory);
    gamingSessions = [];
    let lastDischargeEnd: number | null = null;
    let lastDishargeStart: number | null = null;
    for (let i = batteryHistory.length - 1; i >= 0; i--) {
      let entry = batteryHistory[i];

      if (!lastDischargeEnd && entry.state === BATTERY_STATE.DISCHARGING) {
        lastDischargeEnd = entry.timestamp;
      }

      if (lastDischargeEnd && (entry.state !== BATTERY_STATE.DISCHARGING)) {
        lastDishargeStart = batteryHistory[i + 1].timestamp;
      }

      if (lastDishargeStart && lastDischargeEnd) {
        let dischargeDuration = lastDischargeEnd - lastDishargeStart;
        console.log('last discharge to', new Date(lastDischargeEnd * 1000));
        console.log('last discharge from', new Date(lastDishargeStart * 1000));
        console.log('dischargeDuration', secondsToHms(dischargeDuration));
        let suspendTime = await getSuspendTimeBetween(lastDishargeStart, lastDischargeEnd);

        // @TODO remove
        if (!lastSuspendTime) lastSuspendTime = secondsToHms(suspendTime);

        console.log('suspended during that time for', secondsToHms(suspendTime));
        console.log('gaming disharge time', secondsToHms(dischargeDuration - suspendTime));
        // @TODO calculate suspension discharge %
        // @TODO mark ongoing discharge session
        // @TODO check journal oldest suspend time, ditch any gaming sessions before that
        gamingSessions.push(secondsToHms(dischargeDuration - suspendTime));
        lastDischargeEnd = null;
        lastDishargeStart = null;
      }
    }

    console.log('gamingSessions', gamingSessions);
    lastGamingSessionRef.innerText = `Last gaming session: ${gamingSessions[0]}`;
    lastSuspendTimeRef.innerText = `Last suspend time: ${lastSuspendTime}`;
  } catch (err) {
    console.log('err', err);
    api.Toast.addToast('Error getting battery history');
  }
};

const updateCurrentPower = async () => {
  try {
    if ([BATTERY_STATE.CHARGING, BATTERY_STATE.DISCHARGING].includes(currentStatus)) {
      let result = await exec("upower -i `upower -e | grep 'BAT'` | grep -E 'energy-rate' | awk '{print $2}'");
      currentPower = result ? +result : -1;
      powerRef.innerText = currentPower + ' W';
    } else {
      currentPower = 0;
      powerRef.innerText = '';
    }
  } catch (err) {
    console.error(err);
    api.Toast.addToast('Error getting battery status');
  }
};

const updateCapacity = async () => {
  try {
    let result = await exec("upower -i `upower -e | grep 'BAT'` | grep -E 'capacity' | awk '{print $2}'");
    capacity = result ?? '-1%';
    capacityRef.innerText = 'Capacity:' + capacity;
  } catch (err) {
    console.error(err);
    api.Toast.addToast('Error getting battery capacity');
  }
};

const updateBatteryStatus = async () => {
  try {
    let result = await exec("upower -i `upower -e | grep 'BAT'` | grep -E 'state' | awk '{print $2}'");
    currentStatus = (result ?? BATTERY_STATE.UNKNOWN) as BATTERY_STATE;
  } catch (err) {
    console.error(err);
    api.Toast.addToast('Error getting battery status');
  }
};

/**
 * 
 * @param start 
 * @param end 
 * @returns suspend time in seconds
 */
const getSuspendTimeBetween = async (start: number, end: number): Promise<number> => {
  let suspendEntryRawData = await exec("journalctl -b 0 | grep 'suspend entry'") ?? '';
  let suspendExitRawData = await exec("journalctl -b 0 | grep 'suspend exit'") ?? '';

  let suspendTime = 0;

  let suspendStartEntries = suspendEntryRawData.split('\n').map((line) => {
    return new Date(line.substring(0, 14) + new Date().getFullYear()).getTime() / 1000;
  });

  let suspendEndEntries = suspendExitRawData.split('\n').map((line) => {
    return new Date(line.substring(0, 14) + new Date().getFullYear()).getTime() / 1000;
  });

  suspendStartEntries.forEach((entry, index) => {
    if (entry >= start && entry <= end) {
      suspendTime += suspendEndEntries[index] - entry;
    }
  });

  return suspendTime;
}

const exec = async (command: string): Promise<string | null> => {
  const result = await api.Exec.run('bash', ['-c', command]);
  if (result.exitCode !== 0) {
    console.error('Error running command', command, result.stderr);
    return null;
  }
  return result.stdout;
};

const attachIntervalHandlers = () => {
  timers.push(
    setInterval(async () => {
      await updateCurrentPower();
      await updateBatteryStatus();
      await updateBatteryHistory();
    }, 5000)
  );
};

// @TODO better UI
const createUI = (root: HTMLElement) => {
  lastGamingSessionRef = document.createElement('p');
  root.appendChild(lastGamingSessionRef);
  lastGamingSessionRef.innerText = `Last gaming session: ${gamingSessions[0] ?? secondsToHms(0)}`;

  lastSuspendTimeRef = document.createElement('p');
  root.appendChild(lastSuspendTimeRef);
  lastSuspendTimeRef.innerText = `Last suspend time: ${lastSuspendTime}`;

  powerRef = document.createElement('p');
  root.appendChild(powerRef);
  powerRef.innerText = currentPower + ' W';

  capacityRef = document.createElement('p');
  root.appendChild(capacityRef);
};
