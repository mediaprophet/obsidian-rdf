import { App, Modal, Setting, TFile } from 'obsidian';
import { RDFPlugin } from '../main';

export class SemanticCanvasModal extends Modal {
  private plugin: RDFPlugin;
  private file: TFile;
  private nodeId: string;
  private onSubmit: (nodeId: string, type: string, properties: { [key: string]: string }) => void;

  constructor(app: App, plugin: RDFPlugin, file: TFile, onSubmit: (nodeId: string, type: string, properties: { [key: string]: string }) => void) {
    super(app);
    this.plugin = plugin;
    this.file = file;
    this.nodeId = '';
    this.onSubmit = onSubmit;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Edit Semantic Node' });

    let type = '';
    const properties: { [key: string]: string } = {};

    new Setting(contentEl)
      .setName('Node ID')
      .setDesc('Enter the node ID')
      .addText(text => text
        .setPlaceholder('Node ID')
        .onChange(value => {
          this.nodeId = value;
        }));

    new Setting(contentEl)
      .setName('Type')
      .setDesc('Enter the RDF type (e.g., http://example.org/doc/Document)')
      .addText(text => text
        .setPlaceholder('Type URI')
        .onChange(value => {
          type = value;
        }));

    new Setting(contentEl)
      .setName('Properties')
      .setDesc('Enter properties as key:value pairs, one per line')
      .addTextArea(text => text
        .setPlaceholder('key1:value1\nkey2:value2')
        .onChange(value => {
          value.split('\n').forEach(line => {
            const [key, val] = line.split(':').map(s => s.trim());
            if (key && val) properties[key] = val;
          });
        }));

    new Setting(contentEl)
      .addButton(button => button
        .setButtonText('Submit')
        .setCta()
        .onClick(async () => {
          // Autonomous save: update node in canvas file
          try {
            const content = await this.app.vault.read(this.file);
            const data = JSON.parse(content);
            const node = data.nodes.find((n: any) => n.id === this.nodeId);
            if (node) {
              node.type = type;
              node.properties = properties;
              await this.app.vault.modify(this.file, JSON.stringify(data));
            }
          } catch (e) {
            // Optionally handle error
          }
          this.onSubmit(this.nodeId, type, properties);
          this.close();
        }));
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}