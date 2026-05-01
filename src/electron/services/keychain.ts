import { createRequire } from "node:module";

const SERVICE_NAME = "m3u8-viewer-plugins";
const require = createRequire(__filename);

type KeytarLike = {
  setPassword: (service: string, account: string, password: string) => Promise<void>;
  getPassword: (service: string, account: string) => Promise<string | null>;
  deletePassword: (service: string, account: string) => Promise<boolean>;
};

let keytarCache: KeytarLike | null | undefined;

async function loadKeytar() {
  if (keytarCache !== undefined) {
    return keytarCache;
  }

  try {
    const loaded = require("keytar") as KeytarLike;
    keytarCache = loaded;
    return loaded;
  } catch {
    keytarCache = null;
    return null;
  }
}

export async function savePluginToken(pluginId: string, token: string): Promise<void> {
  const keytar = await loadKeytar();
  if (!keytar) {
    throw new Error("keychain-unavailable");
  }

  await keytar.setPassword(SERVICE_NAME, pluginId, token);
}

export async function getPluginToken(pluginId: string): Promise<string | null> {
  const keytar = await loadKeytar();
  if (!keytar) {
    return null;
  }

  return keytar.getPassword(SERVICE_NAME, pluginId);
}

export async function deletePluginToken(pluginId: string): Promise<void> {
  const keytar = await loadKeytar();
  if (!keytar) {
    return;
  }

  await keytar.deletePassword(SERVICE_NAME, pluginId);
}
