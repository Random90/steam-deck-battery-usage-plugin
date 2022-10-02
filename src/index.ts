import { SMM } from '@crankshaft/types';
import { BATTERY_STATE } from './constants';

const PLUGIN_ID = 'steam-deck-battery-usage-plugin';

let statusRef: HTMLElement;
let powerRef: HTMLElement;
let capacityRef: HTMLElement;

let timers: number[] = [];

let currentStatus = BATTERY_STATE.UNKNOWN;
let currentPower = 0;
let capacity = '0%';

export const load = (smm: SMM) => {
  const render = async (smm: SMM, root: HTMLElement) => {
    timers.forEach(timer => clearInterval(timer));
    console.log('loaded smm', smm);
    console.log('open the windows too', window);
   
    createUI(smm, root);
    attachIntervalHandlers(smm);
  }

  smm.MenuManager.addMenuItem({
    id: PLUGIN_ID,
    label: 'Battery Usage Stats',
    render
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
  timers.forEach(timer => clearInterval(timer));
};

const updateCurrentPower = async (smm: SMM) => {
  try {
    let result = await smm.Exec.run('bash', ['-c', "upower -i `upower -e | grep 'BAT'` | grep -E \"energy-rate\" | awk '{print $2}'"]);
    currentPower = +result.stdout;
    powerRef.innerText = currentPower + ' W';
  } catch (err) {
    console.error(err);
    smm.Toast.addToast('Error getting battery status'); 
  }
};

const attachIntervalHandlers = (smm: SMM) => {
  timers.push(setInterval(async () => {
    await updateCurrentPower(smm);
  }, 5000));
}

const createUI = (smm: SMM, root: HTMLElement) => {
  statusRef = document.createElement('p');
  root.appendChild(statusRef);
  statusRef.innerText = currentStatus;

  powerRef = document.createElement('p');
  root.appendChild(powerRef);
  powerRef.innerText = currentPower + ' W';

  capacityRef = document.createElement('p');
  root.appendChild(capacityRef);
}
