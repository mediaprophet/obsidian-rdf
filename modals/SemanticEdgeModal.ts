import { App, Modal, Setting, TFile } from 'obsidian';
import { RDFPlugin } from '../main';

export class SemanticEdgeModal extends Modal {
  plugin: RDFPlugin;
  canvasFile: TFile;
  onSubmit: (edgeId: string, predicate: string) => void;
  edgeId: string = '';
  predicate: string = '';
  customPredicate: string = '';

  constructor(app: App, plugin: RDFPlugin, canvasFile: TFile, onSubmit: (edgeId: string, predicate: string) => void) {
    super(app);
    this.plugin = plugin;
    this.canvasFile = canvasFile;
    this.onSubmit = onSubmit;
  }

  async onOpen() {
    const contentEl = this.contentEl;
    contentEl.createEl('h2', { text: 'Semantic Weaver: Edit Semantic Canvas Edge' });

    new Setting(contentEl)
      .setName('Edge ID')
      .setDesc('Enter the edge ID from the canvas')
      .addText((text: any) => text
        .setPlaceholder('e.g., edge_123')
        .onChange((value: string) => this.edgeId = value));

    new Setting(contentEl)
      .setName('Predicate')
      .setDesc('Select or enter the RDF predicate for this edge')
      .addDropdown((dropdown: any) => dropdown
        .addOption('rdfs:subClassOf', 'SubClass Of')
        .addOption('owl:sameAs', 'Same As')
        .addOption('owl:equivalentClass', 'Equivalent Class')
        .addOption('skos:related', 'Related To')
        .addOption('ex:similarTo', 'Similar To')
        .addOption('ex:unRelatedTo', 'Unrelated To')
        .addOption('ex:differentTo', 'Different To')
        .addOption('custom', 'Custom Predicate')
        .onChange((value: string) => {
          this.predicate = value;
          this.customPredicate = value === 'custom' ? '' : value;
        }));

    if (this.predicate === 'custom') {
      new Setting(contentEl)
        .setName('Custom Predicate URI')
        .setDesc('Enter a custom predicate URI')
        .addText((text: any) => text
          .setPlaceholder('e.g., http://example.org/customPredicate')
          .onChange((value: string) => this.customPredicate = value));
    }

    new Setting(contentEl)
      .addButton((btn: any) => btn
        .setButtonText('Save')
        .onClick(async () => {
          if (this.edgeId && (this.predicate !== 'custom' || this.customPredicate)) {
            // Autonomous save: update edge in canvas file
            try {
              const content = await this.app.vault.read(this.canvasFile);
              const data = JSON.parse(content);
              const edge = data.edges.find((e: any) => e.id === this.edgeId);
              if (edge) {
                edge.predicate = this.predicate === 'custom' ? this.customPredicate : this.predicate;
                await this.app.vault.modify(this.canvasFile, JSON.stringify(data));
              }
            } catch (e) {
              // Optionally handle error
            }
            this.onSubmit(this.edgeId, this.predicate === 'custom' ? this.customPredicate : this.predicate);
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