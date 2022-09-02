import { SMM } from '@crankshaft/types';

const PLUGIN_ID = 'steam-deck-battery-usage-plugin';

export const load = (smm: SMM) => {
  smm.MenuManager.addMenuItem({
    id: PLUGIN_ID,
    label: 'Battery Usage Stats',
    render: async (smm: SMM, root: HTMLElement) => {
      console.log('loaded smm', smm);
      console.log('open the windows too', window);
     
      attachClock(root);
      attachCurrentGameInfo(smm, root);
      attachPowerUsage(smm, root);
      attachBatteryStatus(smm, root);
      attachLastPluginLoad(smm, root);
    },
  });
};

export const unload = (smm: SMM) => {
  smm.MenuManager.removeMenuItem('steam-deck-battery-usage-plugin');
};

const getBatteryInfo = async (smm: SMM, type: string) => {
  try {
    // @TODO check also for BAT0
    const output = await smm.FS.readFile(`/sys/class/power_supply/BAT1/${type}`);
    return output;
  } catch (err) {
    console.error(err);
    smm.Toast.addToast('Error getting battery status');
    return 'Unknown';
  }
};

const attachBatteryStatus = async (smm: SMM, root: HTMLElement) => {
  const status = document.createElement('p');
  root.appendChild(status);
  status.innerText = await getBatteryInfo(smm, 'status');
  
  setInterval(async () => {
    status.innerText = await getBatteryInfo(smm, 'status');
  }, 10000);
}

const attachPowerUsage = (smm: SMM, root: HTMLElement) => {
  const powerUsage = document.createElement('p');
  root.appendChild(powerUsage);

  setInterval(async () => {
    const current = await getBatteryInfo(smm, 'current_now');
    const voltage = await getBatteryInfo(smm, 'voltage_now');
    const power = ((parseInt(current) * parseInt(voltage)) / 10^12).toFixed(2);
    powerUsage.innerText = power + ' W';
  }, 1000);
}

const attachClock = (root: HTMLElement) => {
  const currentTime = document.createElement('p');
  root.appendChild(currentTime);

  setInterval(() => {
    currentTime.innerText = new Date().toLocaleString();
  }, 1000);
};

const attachCurrentGameInfo = (smm: SMM, root: HTMLElement) => {
  const currentGame = document.createElement('p');
  root.appendChild(currentGame);
  // @TODO will it update on every quick menu open?
  const game = smm['_currentAppName'] ?? 'Not in a game';
  currentGame.innerText = game;
}

const attachLastPluginLoad = async (smm: SMM, root: HTMLElement) => {
  const lastPluginLoad = document.createElement('p');
  root.appendChild(lastPluginLoad);
  const lastLoad = await smm.Store.get(PLUGIN_ID, 'lastPluginLoad')
  lastPluginLoad.innerText = lastLoad ? new Date(+lastLoad).toLocaleString() : 'Never';
  smm.Store.set(PLUGIN_ID, 'lastPluginLoad', new Date().getTime().toString());
}


