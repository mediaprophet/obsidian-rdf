import { App, Modal, Setting, TFile } from 'obsidian';
import RDFPlugin from '../main';

export class SemanticCanvasModal extends Modal {
  plugin: RDFPlugin;
  canvasFile: TFile;
  onSubmit: (nodeId: string, type: string, properties: { [key: string]: string }) => void;
  nodeId: string;
  rdfType: string;
  propertyKey: string;
  propertyValue: string;
  properties: { [key: string]: string };

  constructor(app: App, plugin: RDFPlugin, canvasFile: TFile, onSubmit: (nodeId: string, type: string, properties: { [key: string]: string }) => void) {
    super(app);
    this.plugin = plugin;
    this.canvasFile = canvasFile;
    this.onSubmit = onSubmit;
    this.nodeId = '';
    this.rdfType = '';
    this.propertyKey = '';
    this.propertyValue = '';
    this.properties = {};
  }

  async onOpen() {
    const contentEl = this.containerEl;
    contentEl.createEl('h2', { text: 'Semantic Weaver: Edit Semantic Canvas Node' });

    new Setting(contentEl)
      .setName('Node ID')
      .setDesc('Enter the node ID from the canvas')
      .addText((text: any) => text
        .setPlaceholder('e.g., node_123')
        .onChange((value: string) => this.nodeId = value));

    new Setting(contentEl)
      .setName('RDF Type')
      .setDesc('Select the RDF type for this node')
      .addDropdown((dropdown: any) => dropdown
        .addOption('owl:Class', 'OWL Class')
        .addOption('owl:NamedIndividual', 'OWL Named Individual')
        .addOption('rdfs:Resource', 'RDFS Resource')
        .onChange((value: string) => this.rdfType = value));

    new Setting(contentEl)
      .setName('Properties')
      .setDesc('Add custom properties (e.g., rdfs:label)')
      .addText((text: any) => text
        .setPlaceholder('Property URI (e.g., rdfs:label)')
        .onChange((value: string) => this.propertyKey = value))
      .addText((text: any) => text
        .setPlaceholder('Property Value')
        .onChange((value: string) => this.propertyValue = value))
      .addButton((btn: any) => btn
        .setButtonText('Add Property')
        .onClick(() => {
          if (this.propertyKey && this.propertyValue) {
            this.properties = this.properties || {};
            this.properties[this.propertyKey] = this.propertyValue;
            this.onOpen();
          }
        }));

    if (this.properties) {
      contentEl.createEl('h3', { text: 'Current Properties' });
      Object.entries(this.properties).forEach(([key, value]) => {
        new Setting(contentEl)
          .setName(key)
          .setDesc(value)
          .addButton((btn: any) => btn
            .setButtonText('Remove')
            .onClick(() => {
              delete this.properties[key];
              this.onOpen();
            }));
      });
    }

    new Setting(contentEl)
      .addButton((btn: any) => btn
        .setButtonText('Save')
        .onClick(async () => {
          if (this.nodeId && this.rdfType) {
            this.onSubmit(this.nodeId, this.rdfType, this.properties || {});
            this.close();
          }
        }))
      .addButton((btn: any) => btn
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  onClose() {
    this.containerEl.empty();
  }
}