import { App, Modal, Setting, TFile } from 'obsidian';
import { RDFPlugin } from '../main';

export class SPARQLQueryModal extends Modal {
  plugin: RDFPlugin;
  canvasFile: TFile;
  onSubmit: (query: string) => void;
  query: string = '';

  constructor(app: App, plugin: RDFPlugin, canvasFile: TFile, onSubmit: (query: string) => void) {
    super();
    this.plugin = plugin;
    this.canvasFile = canvasFile;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const contentEl = this.contentEl;
    contentEl.createEl('h2', { text: 'Semantic Weaver: Run SPARQL Query on Canvas' });

    new Setting(contentEl)
      .setName('SPARQL Query')
      .setDesc('Enter a SPARQL query to run against the canvas RDF data')
      .addTextArea((text: any) => text
        .setPlaceholder('e.g., SELECT ?s ?p ?o WHERE { ?s ?p ?o }')
        .onChange((value: string) => this.query = value));

    new Setting(contentEl)
      .addButton((btn: any) => btn
        .setButtonText('Run Query')
        .onClick(async () => {
          if (this.query) {
            this.onSubmit(this.query);
            this.close();
          }
        }))
      .addButton((btn: any) => btn
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
  }
}