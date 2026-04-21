import Store from 'electron-store'

interface AppConfig {
  notificationLevel: 'all' | 'important' | 'urgent'
  soundEnabled: boolean
  autoStart: boolean
  theme: 'light' | 'dark' | 'system'
  timerIslandEnabled: boolean
  timerSystemNotificationEnabled: boolean
}

const defaults: AppConfig = {
  notificationLevel: 'all',
  soundEnabled: true,
  autoStart: false,
  theme: 'system',
  timerIslandEnabled: true,
  timerSystemNotificationEnabled: false
}

let storeInstance: Store<AppConfig> | null = null

export function getStore(): Store<AppConfig> {
  if (!storeInstance) {
    storeInstance = new Store<AppConfig>({
      name: 'ddo-ding-config',
      defaults
    })
  }
  return storeInstance
}

export function getConfig<K extends keyof AppConfig>(key: K): AppConfig[K] {
  return getStore().get(key)
}

export function setConfig<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
  getStore().set(key, value)
}