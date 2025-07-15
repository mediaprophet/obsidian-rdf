import { Plugin } from 'obsidian';
import { RDFPluginSettings, DEFAULT_SETTINGS } from './main';

export class SettingsManager {
  private plugin: Plugin;
  settings: RDFPluginSettings;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
    this.settings = DEFAULT_SETTINGS;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.plugin.loadData());
  }

  async saveSettings() {
    await this.plugin.saveData(this.settings);
  }

  getNamespaces(): { [key: string]: string } {
    return this.settings.namespaces;
  }

  async updateNamespaces(namespaces: { [key: string]: string }) {
    this.settings.namespaces = { ...this.settings.namespaces, ...namespaces };
    await this.saveSettings();
  }
}