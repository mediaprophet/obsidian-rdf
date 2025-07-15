
import { App, Modal, Setting } from 'obsidian';
import { Parser } from 'n3';
import * as fs from 'fs';
import * as path from 'path';


export class URILookupModal extends Modal {
  namespaces: { [key: string]: string };
  ontologyTtl: string;
  onSubmit: (uri: string) => void;
  // queryEngine: any;
  selectedPrefix: string = '';
  suffix: string = '';
  selectedUri: string = '';

  constructor(app: App, namespaces: { [key: string]: string }, ontologyTtl: string, onSubmit: (uri: string) => void) {
    super(app);
    this.namespaces = namespaces;
    this.ontologyTtl = ontologyTtl;
    this.onSubmit = onSubmit;
    // this.queryEngine = ...
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

    // Use adapter's getFullPath to get the absolute path if available, else fallback
    const adapter: any = this.app.vault.adapter;
    let ontologyPath = '';
    if (typeof adapter.getFullPath === 'function') {
      ontologyPath = adapter.getFullPath('ontology/ontology.ttl');
    } else if (adapter.basePath) {
      ontologyPath = path.join(adapter.basePath, 'ontology', 'ontology.ttl');
    } else {
      ontologyPath = path.join('ontology', 'ontology.ttl');
    }

    // Use n3 to parse ontology.ttl and extract all subject URIs
    let ontologyUris: string[] = [];
    try {
      const ttl = await fs.promises.readFile(ontologyPath, 'utf-8');
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