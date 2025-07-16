import { App, Modal, Setting, Notice, TextComponent } from 'obsidian';
import { RDFPlugin } from './main';
import { SettingsManager } from './SettingsManager';

export class NamespaceModal extends Modal {
  plugin: RDFPlugin;
  settingsManager: SettingsManager;
  onSubmit: () => void;

  constructor(app: App, plugin: RDFPlugin, onSubmit: () => void) {
    super(app);
    this.plugin = plugin;
    this.settingsManager = plugin.settingsManager;
    this.onSubmit = onSubmit;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('semantic-weaver-modal');
    contentEl.createEl('h2', { text: 'Manage RDF Namespaces' });

    const namespaces = this.settingsManager.getNamespaces();
    const validationEl = contentEl.createEl('div', { cls: 'semantic-weaver-validation' });

    // Display existing namespaces
    for (const [prefix, uri] of Object.entries(namespaces)) {
      new Setting(contentEl)
        .setName(`Namespace: ${prefix}`)
        .setDesc(`URI: ${uri}`)
        .setClass('semantic-weaver-setting')
        .addText(text => text
          .setValue(uri)
          .setPlaceholder('http://example.org/')
          .onChange(async (value) => {
            if (value.trim()) {
              namespaces[prefix] = value.trim();
            } else {
              delete namespaces[prefix];
            }
          }))
        .addButton(button => button
          .setButtonText('Remove')
          .setWarning()
          .onClick(async () => {
            delete namespaces[prefix];
            await this.settingsManager.updateNamespaces(namespaces);
            this.close();
            this.open();
          }));
    }

    // Add new namespace
    let newPrefix = '';
    let newUri = '';
    new Setting(contentEl)
      .setName('New Namespace')
      .setDesc('Add a new namespace prefix and URI.')
      .setClass('semantic-weaver-setting')
      .addText(text => {
        const prefixInput = text
          .setPlaceholder('Prefix (e.g., ex)')
          .onChange(value => (newPrefix = value.trim()));
        prefixInput.inputEl.addClass('semantic-weaver-input');
        return prefixInput;
      })
      .addText(text => {
        const uriInput = text
          .setPlaceholder('URI (e.g., http://example.org/)')
          .onChange(value => (newUri = value.trim()));
        uriInput.inputEl.addClass('semantic-weaver-input');
        return uriInput;
      })
      .addButton(button => button
        .setButtonText('Add')
        .setCta()
        .onClick(async () => {
          if (!newPrefix || !newUri) {
            validationEl.setText('Error: Both prefix and URI are required.');
            return;
          }
          if (!newPrefix.match(/^[a-zA-Z0-9_-]+$/)) {
            validationEl.setText('Error: Prefix must contain only letters, numbers, underscores, or hyphens.');
            return;
          }
          if (!newUri.match(/^https?:\/\/.+/)) {
            validationEl.setText('Error: URI must be a valid URL.');
            return;
          }
          if (namespaces[newPrefix]) {
            validationEl.setText(`Error: Prefix ${newPrefix} already exists.`);
            return;
          }
          namespaces[newPrefix] = newUri;
          await this.settingsManager.updateNamespaces(namespaces);
          validationEl.setText(`Added namespace: ${newPrefix}`);
          this.close();
          this.open();
        }));

    // Buttons
    new Setting(contentEl)
      .setClass('semantic-weaver-button-group')
      .addButton(button => button
        .setButtonText('Save')
        .setCta()
        .onClick(async () => {
          await this.settingsManager.updateNamespaces(namespaces);
          this.onSubmit();
          this.close();
        }))
      .addButton(button => button
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
  }
}