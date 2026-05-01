export interface UpdateProvider {
  checkForUpdates(): Promise<{ enabled: boolean; message: string }>;
}

export class NoopUpdateProvider implements UpdateProvider {
  async checkForUpdates(): Promise<{ enabled: boolean; message: string }> {
    return {
      enabled: false,
      message: "Updater is disabled in the initial release.",
    };
  }
}
