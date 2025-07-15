import { App, Modal, Setting } from 'obsidian';
import RDFPlugin from '../main';

export class NamespaceOntologyModal extends Modal {
  plugin: RDFPlugin;
  onSubmit: (namespaces: { [key: string]: string }, ontologyTtl: string) => void;

  constructor(app: App, plugin: RDFPlugin, onSubmit: (namespaces: { [key: string]: string }, ontologyTtl: string) => void) {
    super(app);
    this.plugin = plugin;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Manage RDF Namespaces and Ontology' });
    let namespaces: { [key: string]: string } = { ...this.plugin.settings.namespaces };
    let ontologyTtl = this.plugin.ontologyTtl;

    new Setting(contentEl)
      .setName('Namespaces (JSON)')
      .addTextArea(text => text
        .setValue(JSON.stringify(namespaces, null, 2))
        .onChange(value => {
          try {
            namespaces = JSON.parse(value);
          } catch (e) {
            console.error('Invalid JSON for namespaces:', e);
          }
        }));

    new Setting(contentEl)
      .setName('Ontology (Turtle)')
      .addTextArea(text => text
        .setValue(ontologyTtl)
        .onChange(value => (ontologyTtl = value)));

    new Setting(contentEl)
      .addButton(button => button
        .setButtonText('Save')
        .onClick(() => {
          this.onSubmit(namespaces, ontologyTtl);
          this.close();
        }));
  }

  onClose() {
    this.contentEl.empty();
  }
}