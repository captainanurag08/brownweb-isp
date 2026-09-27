import { create } from 'zustand';
import { api, ApiError } from '../services/api';
import { browserSocket } from '../services/websocket';
import type { AppId, Device, DeviceSettings, ServerMessage, TabInfo, ToastNotification, UserRecord } from '../types';

export type AuthStatus = 'loading' | 'unauthenticated' | 'first-run' | 'ready';

interface StoreState {
  status: AuthStatus;
  user: UserRecord | null;
  device: Device | null;
  deviceSettings: DeviceSettings | null;
  currentApp: AppId;
  tabs: TabInfo[];
  activeTabId: string | null;
  sessionId: string | null;
  wsStatus: 'connecting' | 'open' | 'closed';
  locked: boolean;
  toasts: ToastNotification[];

  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  completeFirstRun: () => Promise<void>;
  setCurrentApp: (app: AppId) => void;
  updateDevice: (patch: Partial<Device>) => Promise<void>;
  lock: () => void;
  unlock: () => void;
  pushToast: (toast: Omit<ToastNotification, 'id'>) => void;
  dismissToast: (id: string) => void;

  newTab: (url?: string) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  navigate: (tabId: string, url: string) => void;
}

let socketWired = false;

function wireSocket(set: (fn: (s: StoreState) => Partial<StoreState>) => void, get: () => StoreState) {
  if (socketWired) return;
  socketWired = true;

  browserSocket.onStatusChange((wsStatus) => set(() => ({ wsStatus })));

  browserSocket.onMessage((msg: ServerMessage) => {
    switch (msg.type) {
      case 'session.ready':
        set(() => ({
          sessionId: msg.sessionId,
          tabs: msg.tabs,
          activeTabId: msg.tabs.find((t) => t.isActive)?.id ?? msg.tabs[0]?.id ?? null,
        }));
        break;
      case 'tab.created':
        set((s) => ({ tabs: [...s.tabs, msg.tab], activeTabId: msg.tab.isActive ? msg.tab.id : s.activeTabId }));
        break;
      case 'tab.updated':
        set((s) => ({ tabs: s.tabs.map((t) => (t.id === msg.tab.id ? msg.tab : t)) }));
        break;
      case 'tab.closed':
        set((s) => {
          const tabs = s.tabs.filter((t) => t.id !== msg.tabId);
          const activeTabId = s.activeTabId === msg.tabId ? tabs[0]?.id ?? null : s.activeTabId;
          return { tabs, activeTabId };
        });
        break;
      case 'navigation':
        set((s) => ({ tabs: s.tabs.map((t) => (t.id === msg.tabId ? { ...t, url: msg.url, title: msg.title } : t)) }));
        break;
      case 'error':
        get().pushToast({ title: msg.message, tone: 'danger' });
        break;
    }
  });
}

export const useStore = create<StoreState>((set, get) => ({
  status: 'loading',
  user: null,
  device: null,
  deviceSettings: null,
  currentApp: 'home',
  tabs: [],
  activeTabId: null,
  sessionId: null,
  wsStatus: 'closed',
  locked: false,
  toasts: [],

  checkAuth: async () => {
    try {
      const data = await api.get<{ user: UserRecord; device: Device }>('/auth/me');
      const settingsRes = await api.get<{ settings: DeviceSettings }>('/device/settings').catch(() => null);
      set(() => ({
        status: data.device.first_run_complete ? 'ready' : 'first-run',
        user: data.user,
        device: data.device,
        deviceSettings: settingsRes?.settings ?? null,
      }));
      if (data.device.first_run_complete) {
        wireSocket(set, get);
        browserSocket.connect();
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        set(() => ({ status: 'unauthenticated' }));
      } else {
        set(() => ({ status: 'unauthenticated' }));
      }
    }
  },

  login: async (email, password) => {
    const data = await api.post<{ user: UserRecord; device: Device }>('/auth/login', { email, password });
    set(() => ({ status: data.device.first_run_complete ? 'ready' : 'first-run', user: data.user, device: data.device }));
    if (data.device.first_run_complete) {
      wireSocket(set, get);
      browserSocket.connect();
    }
  },

  register: async (email, password) => {
    const data = await api.post<{ user: UserRecord; device: Device }>('/auth/register', { email, password });
    set(() => ({ status: 'first-run', user: data.user, device: data.device }));
  },

  logout: async () => {
    browserSocket.disconnect();
    await api.post('/auth/logout').catch(() => undefined);
    set(() => ({ status: 'unauthenticated', user: null, device: null, tabs: [], activeTabId: null }));
  },

  completeFirstRun: async () => {
    const { device } = await api.patch<{ device: Device }>('/device', { firstRunComplete: true });
    set(() => ({ status: 'ready', device }));
    wireSocket(set, get);
    browserSocket.connect();
  },

  setCurrentApp: (app) => set(() => ({ currentApp: app })),

  updateDevice: async (patch) => {
    const { device } = await api.patch<{ device: Device }>('/device', patch);
    set(() => ({ device }));
  },

  lock: () => set(() => ({ locked: true })),
  unlock: () => set(() => ({ locked: false })),

  pushToast: (toast) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => get().dismissToast(id), 5000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  newTab: (url) => browserSocket.send({ type: 'tab.new', url }),
  closeTab: (tabId) => browserSocket.send({ type: 'tab.close', tabId }),
  switchTab: (tabId) => {
    set(() => ({ activeTabId: tabId }));
    browserSocket.send({ type: 'tab.switch', tabId });
  },
  navigate: (tabId, url) => browserSocket.send({ type: 'tab.navigate', tabId, url }),
}));
