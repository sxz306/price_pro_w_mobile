import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "pricepro_auth";

type Stored = { token: string; email: string };

const webStore = {
  async get(): Promise<string | null> {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(KEY);
  },
  async set(v: string) {
    window.localStorage.setItem(KEY, v);
  },
  async del() {
    window.localStorage.removeItem(KEY);
  },
};

export async function loadAuth(): Promise<Stored | null> {
  try {
    const raw =
      Platform.OS === "web"
        ? await webStore.get()
        : await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Stored;
  } catch {
    return null;
  }
}

export async function saveAuth(value: Stored): Promise<void> {
  const raw = JSON.stringify(value);
  if (Platform.OS === "web") await webStore.set(raw);
  else await SecureStore.setItemAsync(KEY, raw);
}

export async function clearAuth(): Promise<void> {
  if (Platform.OS === "web") await webStore.del();
  else await SecureStore.deleteItemAsync(KEY);
}
