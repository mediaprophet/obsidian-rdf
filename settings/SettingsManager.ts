import { Plugin } from 'obsidian';

export interface RDFPluginSettings {
  namespaces: { [key: string]: string };
  // Add other settings as needed
}

export const DEFAULT_SETTINGS: RDFPluginSettings = {
  namespaces: {
    ex: 'http://example.org/',
    doc: 'http://example.org/doc/',
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    owl: 'http://www.w3.org/2002/07/owl#',
    oa: 'http://www.w3.org/ns/oa#',
    skos: 'http://www.w3.org/2004/02/skos/core#'
  }
};

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