import { App, Modal, Setting, TFile } from 'obsidian';
import { Parser } from 'n3';

export class URILookupModal extends Modal {
  namespaces: { [key: string]: string };
  ontologyTtl: string;
  onSubmit: (uri: string) => void;
  selectedPrefix: string = '';
  suffix: string = '';
  selectedUri: string = '';

  constructor(app: App, namespaces: { [key: string]: string }, ontologyTtl: string, onSubmit: (uri: string) => void) {
    super(app);
    this.namespaces = namespaces;
    this.ontologyTtl = ontologyTtl;
    this.onSubmit = onSubmit;
  }

  async onOpen() {
    const contentEl = this.contentEl;
    contentEl.createEl('h2', { text: 'Semantic Weaver: Look Up URI' });

    new Setting(contentEl)
      .setName('Select Namespace')
      .addDropdown((dropdown: any) => {
        Object.entries(this.namespaces).forEach(([prefix, uri]) => {
          dropdown.addOption(prefix, `${prefix}: ${uri}`);
        });
        dropdown.onChange((value: string) => this.selectedPrefix = value);
      });

    new Setting(contentEl)
      .setName('URI Suffix')
      .setDesc('Enter the suffix to append to the namespace (e.g., Alice for ex:Alice)')
      .addText((text: any) =>
        text
          .setPlaceholder('e.g., Alice')
          .onChange((value: string) => this.suffix = value));

    // Use Obsidian's Vault API to read the ontology file
    let ontologyUris: string[] = [];
    const ontologyPath = 'ontology/ontology.ttl';
    const ontologyFile = this.app.vault.getAbstractFileByPath(ontologyPath);
    if (ontologyFile instanceof TFile) {
      try {
        const ttl = await this.app.vault.read(ontologyFile);
        const parser = new Parser({ format: 'Turtle' });
        const quads = parser.parse(ttl);
        const uris = new Set<string>();
        for (const q of quads) {
          if (q.subject.termType === 'NamedNode') {
            uris.add(q.subject.value);
          }
          if (q.object.termType === 'NamedNode') {
            uris.add(q.object.value);
          }
        }
        ontologyUris = Array.from(uris);
      } catch (e) {
        ontologyUris = [];
        console.error('Error reading or parsing ontology file:', e);
      }
    } else {
      console.error('Ontology file not found:', ontologyPath);
    }

    new Setting(contentEl)
      .setName('Ontology URIs')
      .addDropdown((dropdown: any) => {
        ontologyUris.forEach((uri: string) => {
          if (typeof uri === 'string') {
            dropdown.addOption(uri, uri.split('/').pop() || uri);
          }
        });
        dropdown.onChange((value: string) => this.selectedUri = value);
      });

    new Setting(contentEl)
      .addButton((btn: any) => btn
        .setButtonText('Insert Namespace URI')
        .onClick(() => {
          if (this.selectedPrefix && this.suffix) {
            const uri = `${this.namespaces[this.selectedPrefix]}${this.suffix.replace(' ', '_')}`;
            this.onSubmit(uri);
            this.close();
          }
        }))
      .addButton((btn: any) => btn
        .setButtonText('Insert Ontology URI')
        .onClick(() => {
          if (this.selectedUri) {
            this.onSubmit(this.selectedUri);
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