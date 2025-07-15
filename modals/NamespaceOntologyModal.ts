import { App, Modal, Notice, Setting } from 'obsidian';
import { DataFactory } from 'n3';
import * as fs from 'fs';
import * as path from 'path';

const { namedNode, quad } = DataFactory;

export class NamespaceOntologyModal extends Modal {
  plugin: RDFPlugin;
  onSubmit: (namespaces: { [key: string]: string }, ontologyUpdates: string) => void;
  newPrefix: string = '';
  newUri: string = '';
  sparqlEndpoint: string = '';
  sourceUri: string = '';
  targetUri: string = '';
  relationship: string = '';

  constructor(app: App, plugin: RDFPlugin, onSubmit: (namespaces: { [key: string]: string }, ontologyUpdates: string) => void) {
    super(app);
    this.plugin = plugin;
    this.onSubmit = onSubmit;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Semantic Weaver: Manage RDF Namespaces and Ontology' });

    contentEl.createEl('h3', { text: 'Namespaces' });
    const namespaceContainer = contentEl.createDiv();
    const updateNamespaces = () => {
      namespaceContainer.empty();
      Object.entries(this.plugin.settings.namespaces).forEach(([prefix, uri]) => {
        new Setting(namespaceContainer)
          .setName(prefix)
          .addText(text => text
            .setValue(uri as string)
            .onChange((value: string) => {
              this.plugin.settings.namespaces[prefix] = value;
            }))
          .addButton(btn => btn
            .setButtonText('Remove')
            .onClick(() => {
              delete this.plugin.settings.namespaces[prefix];
              updateNamespaces();
            }));
      });
    };
    updateNamespaces();

    new Setting(contentEl)
      .setName('Add Namespace')
      .setDesc('Enter prefix and URI (e.g., ex: http://example.org/)')
      .addText((text: any) => text
        .setPlaceholder('Prefix (e.g., ex)')
        .onChange((value: string) => this.newPrefix = value))
      .addText((text: any) => text
        .setPlaceholder('URI (e.g., http://example.org/)')
        .onChange((value: string) => this.newUri = value))
      .addButton((btn: any) => btn
        .setButtonText('Add')
        .onClick(() => {
          if (this.newPrefix && this.newUri) {
            this.plugin.settings.namespaces[this.newPrefix] = this.newUri;
            updateNamespaces();
            this.newPrefix = '';
            this.newUri = '';
          }
        }));

    contentEl.createEl('h3', { text: 'Ontology' });
    new Setting(contentEl)
      .setName('Ontology Turtle')
      .setDesc('Edit ontology in Turtle format')
      .addTextArea((text: any) => text
        .setValue(this.plugin.ontologyTtl || '')
        .onChange((value: string) => this.plugin.ontologyTtl = value));

    contentEl.createEl('h3', { text: 'Fetch Ontology Terms' });
    new Setting(contentEl)
      .setName('SPARQL Endpoint')
      .setDesc('Enter a SPARQL endpoint to fetch ontology terms')
      .addText((text: any) => text
        .setPlaceholder('e.g., https://query.wikidata.org/sparql')
        .onChange((value: string) => this.sparqlEndpoint = value))
      .addButton((btn: any) => btn
        .setButtonText('Fetch Terms')
        .onClick(async () => {
          if (this.sparqlEndpoint) {
            const terms = await this.plugin.fetchOntologyTerms(this.sparqlEndpoint);
            const termsContainer = contentEl.createDiv();
            terms.forEach((term: any) => {
              new Setting(termsContainer)
                .setName(term.label)
                .setDesc(term.uri)
                .addButton((btn: any) => btn
                  .setButtonText('Add to Ontology')
                  .onClick(() => {
                    this.plugin.ontologyTtl += `\n${term.uri} a owl:Class ; rdfs:label "${term.label}" .`;
                    this.onOpen();
                  }));
            });
          }
        }));

    contentEl.createEl('h3', { text: 'Ontology Mapping' });
    new Setting(contentEl)
      .setName('Map Terms')
      .setDesc('Map terms with relationships (e.g., owl:sameAs, skos:related)')
      .addText((text: any) => text
        .setPlaceholder('Source URI')
        .onChange((value: string) => this.sourceUri = value))
      .addText((text: any) => text
        .setPlaceholder('Target URI')
        .onChange((value: string) => this.targetUri = value))
      .addDropdown((dropdown: any) => dropdown
        .addOption('rdfs:subClassOf', 'SubClass Of')
        .addOption('owl:sameAs', 'Same As')
        .addOption('owl:equivalentClass', 'Equivalent Class')
        .addOption('skos:related', 'Related To')
        .addOption('ex:similarTo', 'Similar To')
        .addOption('ex:unRelatedTo', 'Unrelated To')
        .addOption('ex:differentTo', 'Different To')
        .onChange((value: string) => this.relationship = value))
      .addButton((btn: any) => btn
        .setButtonText('Add Mapping')
        .onClick(async () => {
          if (this.sourceUri && this.targetUri && this.relationship) {
            // TODO: Implement quad storage with n3/rdfstore. Legacy storeQuad removed.
            new Notice('Ontology mapping added by Semantic Weaver (TODO: implement quad storage).');
          }
        }));

    new Setting(contentEl)
      .addButton((btn: any) => btn
        .setButtonText('Save')
        .onClick(async () => {
          this.onSubmit(this.plugin.settings.namespaces, this.plugin.ontologyTtl);
          await this.plugin.saveSettings();
          const ontologyPath = path.join(this.plugin.app.vault.adapter.basePath, 'ontology', 'ontology.ttl').replace(/\\/g, '/');
          await fs.promises.mkdir(path.dirname(ontologyPath), { recursive: true });
          await fs.promises.writeFile(ontologyPath, this.plugin.ontologyTtl);
          await this.plugin.loadOntologyToStore();
          new Notice('Namespaces and ontology saved by Semantic Weaver.');
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