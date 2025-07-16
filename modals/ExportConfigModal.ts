import { App, Modal, Notice, Setting } from 'obsidian';
import { RDFPluginSettings } from '../settings/RDFPluginSettings';

export class ExportConfigModal extends Modal {
  settings: RDFPluginSettings;
  onSubmit: (settings: RDFPluginSettings) => void;

  constructor(app: App, settings: RDFPluginSettings, onSubmit: (settings: RDFPluginSettings) => void) {
    super(app);
    this.settings = { ...settings };
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Semantic Weaver: Export RDF Docs Configuration' });

    new Setting(contentEl)
      .setName('GitHub Repository')
      .setDesc('Enter the repository in the format username/repository')
      .addText(text => text
        .setPlaceholder('username/repository')
        .setValue(this.settings.githubRepo)
        .onChange(value => this.settings.githubRepo = value));

    new Setting(contentEl)
      .setName('GitHub Pages URL')
      .setDesc('Enter the site URL (e.g., username.github.io/reponame)')
      .addText(text => text
        .setPlaceholder('username.github.io/reponame')
        .setValue(this.settings.siteUrl)
        .onChange(value => this.settings.siteUrl = value));

    new Setting(contentEl)
      .setName('Local Export Directory')
      .setDesc('Enter the local path to export the MkDocs project')
      .addText(text => text
        .setPlaceholder('export')
        .setValue(this.settings.exportDir)
        .onChange(value => this.settings.exportDir = value));

    new Setting(contentEl)
      .setName('Include Test Files')
      .setDesc('Include files from the tests/ folder')
      .addToggle(toggle => toggle
        .setValue(this.settings.includeTests)
        .onChange(value => this.settings.includeTests = value));

    if (typeof window.Session !== 'undefined') {
      new Setting(contentEl)
        .setName('Solid Pod URL')
        .setDesc('Enter the Solid Pod URL for publishing')
        .addText(text => text
          .setPlaceholder('https://joep.inrupt.net/')
          .setValue(this.settings.solidPodUrl)
          .onChange(value => this.settings.solidPodUrl = value));

      new Setting(contentEl)
        .setName('Provider')
        .setDesc('Select deployment provider')
        .addDropdown(dropdown => dropdown
          .addOption('github', 'GitHub Pages')
          .addOption('solid', 'Solid Pod')
          .addOption('vercel', 'Vercel')
          .setValue(this.settings.provider)
          .onChange(value => this.settings.provider = value));
    } else {
      new Setting(contentEl)
        .setName('Provider')
        .setDesc('Select deployment provider (Solid Pod support unavailable)')
        .addDropdown(dropdown => dropdown
          .addOption('github', 'GitHub Pages')
          .addOption('vercel', 'Vercel')
          .setValue(this.settings.provider === 'solid' ? 'github' : this.settings.provider)
          .onChange(value => this.settings.provider = value));
    }

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText('Save and Export')
        .onClick(() => {
          this.onSubmit(this.settings);
          this.close();
        }))
      .addButton(btn => btn
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
  }
}