// electron/store.ts
import Store from "electron-store";
var defaults = {
  notificationLevel: "all",
  soundEnabled: true,
  autoStart: false,
  theme: "system",
  timerIslandEnabled: true,
  timerSystemNotificationEnabled: false
};
var storeInstance = null;
function getStore() {
  if (!storeInstance) {
    storeInstance = new Store({
      name: "ddo-ding-config",
      defaults
    });
  }
  return storeInstance;
}
function getConfig(key) {
  return getStore().get(key);
}
function setConfig(key, value) {
  getStore().set(key, value);
}
export {
  getConfig,
  getStore,
  setConfig
};
