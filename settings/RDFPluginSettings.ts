import { App, PluginSettingTab, Setting } from 'obsidian';
import { RDFPlugin } from '../main';

export interface RDFPluginSettings {
  namespaces: { [key: string]: string };
  semanticCanvasMode: boolean;
  githubRepo: string;
  siteUrl: string;
  exportDir: string;
  includeTests: boolean;
}

export const DEFAULT_SETTINGS: RDFPluginSettings = {
  namespaces: {
    ex: 'http://example.org/',
    doc: 'http://example.org/doc/',
    owl: 'http://www.w3.org/2002/07/owl#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    oa: 'http://www.w3.org/ns/oa#'
  },
  semanticCanvasMode: false,
  githubRepo: '',
  siteUrl: '',
  exportDir: '',
  includeTests: false
};

export class RDFPluginSettingTab extends PluginSettingTab {
  plugin: RDFPlugin;

  constructor(app: App, plugin: RDFPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Semantic Weaver Settings' });

    new Setting(containerEl)
      .setName('Semantic Canvas Mode')
      .setDesc('Enable RDF-enhanced canvas functionality')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.semanticCanvasMode)
        .onChange(async value => {
          this.plugin.settings.semanticCanvasMode = value;
          await this.plugin.saveSettings();
          new Notice(`Semantic Canvas Mode ${value ? 'enabled' : 'disabled'} by Semantic Weaver.`);
        }));

    new Setting(containerEl)
      .setName('Default Export Directory')
      .setDesc('Set the default directory for exporting MkDocs projects')
      .addText(text => text
        .setPlaceholder('~/my-docs')
        .setValue(this.plugin.settings.exportDir)
        .onChange(async value => {
          this.plugin.settings.exportDir = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Default Site URL')
      .setDesc('Set the default site URL for exports (e.g., username.github.io/reponame)')
      .addText(text => text
        .setPlaceholder('username.github.io/reponame')
        .setValue(this.plugin.settings.siteUrl)
        .onChange(async value => {
          this.plugin.settings.siteUrl = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Include Test Files')
      .setDesc('Include files from the tests/ folder in exports')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.includeTests)
        .onChange(async value => {
          this.plugin.settings.includeTests = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('GitHub Repository')
      .setDesc('Set the GitHub repository for exports (e.g., username/repository)')
      .addText(text => text
        .setPlaceholder('username/repository')
        .setValue(this.plugin.settings.githubRepo)
        .onChange(async value => {
          this.plugin.settings.githubRepo = value;
          await this.saveSettings();
        }));
  }
}