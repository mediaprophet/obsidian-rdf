import { App, Modal, Setting, Notice, TextComponent } from 'obsidian';
import { RDFPlugin } from '../main';

export class NamespaceOntologyModal extends Modal {
  plugin: RDFPlugin;
  onSubmit: (namespaces: { [key: string]: string }, ontologyTtl: string) => void;

  constructor(app: App, plugin: RDFPlugin, onSubmit: (namespaces: { [key: string]: string }, ontologyTtl: string) => void) {
    super(app);
    this.plugin = plugin;
    this.onSubmit = onSubmit;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('semantic-weaver-modal');
    contentEl.createEl('h2', { text: 'Manage RDF Namespaces and Ontology' });

    const namespaces: { [key: string]: string } = { ...this.plugin.settings.namespaces };
    let ontologyTtl = this.plugin.ontologyTtl || '@prefix ex: <http://example.org/> .\nex:Document a rdfs:Class .';

    // Common namespaces for autocomplete
    const commonNamespaces = {
      'foaf': 'http://xmlns.com/foaf/0.1/',
      'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
      'owl': 'http://www.w3.org/2002/07/owl#',
      'skos': 'http://www.w3.org/2004/02/skos/core#',
      'dc': 'http://purl.org/dc/elements/1.1/',
      'dcterms': 'http://purl.org/dc/terms/',
      'ex': 'http://example.org/'
    };

    // Namespace Management
    const namespaceContainer = contentEl.createEl('div', { cls: 'semantic-weaver-namespace-container' });
    namespaceContainer.createEl('h3', { text: 'Namespaces' });
    const namespaceList = namespaceContainer.createEl('div', { cls: 'semantic-weaver-namespace-list' });

    const updateNamespaceList = () => {
      namespaceList.empty();
      for (const [prefix, uri] of Object.entries(namespaces)) {
        const namespaceSetting = new Setting(namespaceList)
          .setClass('semantic-weaver-setting')
          .addText(text => text
            .setPlaceholder('Prefix (e.g., foaf)')
            .setValue(prefix)
            .onChange(value => {
              if (value && value !== prefix) {
                namespaces[value] = namespaces[prefix];
                delete namespaces[prefix];
                updateNamespaceList();
              }
            })
            .inputEl.addClass('semantic-weaver-input'))
          .addText(text => text
            .setPlaceholder('URI (e.g., http://xmlns.com/foaf/0.1/)')
            .setValue(uri)
            .onChange(value => {
              namespaces[prefix] = value.trim();
            })
            .inputEl.addClass('semantic-weaver-input'))
          .addButton(button => button
            .setIcon('ri-delete-bin-line')
            .setTooltip('Remove namespace')
            .onClick(() => {
              delete namespaces[prefix];
              updateNamespaceList();
            }));
      }
    };

    new Setting(namespaceContainer)
      .setName('Add Namespace')
      .setDesc('Add a new namespace prefix and URI.')
      .setClass('semantic-weaver-setting')
      .addDropdown(dropdown => dropdown
        .addOption('', 'Custom Prefix')
        .addOptions(Object.keys(commonNamespaces).reduce((acc, key) => ({ ...acc, [key]: key }), {}))
        .onChange(value => {
          prefixInput.setValue(value);
          uriInput.setValue(commonNamespaces[value] || '');
        })
        .selectEl.addClass('semantic-weaver-input'))
      .addText(text => {
        const prefixInput = text
          .setPlaceholder('Prefix (e.g., foaf)')
          .onChange(value => {
            if (value && !namespaces[value]) {
              namespaces[value] = uriInput.getValue() || 'http://example.org/';
              updateNamespaceList();
            }
          });
        prefixInput.inputEl.addClass('semantic-weaver-input');
        return prefixInput;
      })
      .addText(text => {
        const uriInput = text
          .setPlaceholder('URI (e.g., http://xmlns.com/foaf/0.1/)')
          .onChange(value => {
            const prefix = prefixInput.getValue();
            if (prefix && namespaces[prefix]) {
              namespaces[prefix] = value.trim();
            }
          });
        uriInput.inputEl.addClass('semantic-weaver-input');
        return uriInput;
      });

    updateNamespaceList();

    // Ontology TTL Editor
    new Setting(contentEl)
      .setName('Ontology (Turtle)')
      .setDesc('Edit the Turtle ontology file (templates/ontology.ttl).')
      .setClass('semantic-weaver-setting')
      .addTextArea(text => text
        .setValue(ontologyTtl)
        .onChange(value => (ontologyTtl = value))
        .inputEl.addClass('semantic-weaver-textarea'));

    // Validation Feedback
    const validationEl = contentEl.createEl('div', { cls: 'semantic-weaver-validation' });

    // Buttons
    new Setting(contentEl)
      .setClass('semantic-weaver-button-group')
      .addButton(button => button
        .setButtonText('Save')
        .setCta()
        .onClick(async () => {
          if (Object.keys(namespaces).some(prefix => !prefix.match(/^[a-zA-Z0-9_-]+$/))) {
            validationEl.setText('Error: Namespace prefixes must contain only letters, numbers, underscores, or hyphens.');
            return;
          }
          if (Object.values(namespaces).some(uri => !uri.match(/^https?:\/\/.+/))) {
            validationEl.setText('Error: Namespace URIs must be valid URLs.');
            return;
          }
          try {
            const parser = new N3.Parser({ format: 'Turtle' });
            await new Promise((resolve, reject) => {
              parser.parse(ontologyTtl, (error, quad, prefixes) => {
                if (error) reject(error);
                else resolve(null);
              });
            });
            await this.onSubmit(namespaces, ontologyTtl);
            validationEl.setText('Success: Namespaces and ontology saved.');
            this.close();
          } catch (error) {
            validationEl.setText(`Error: Invalid Turtle syntax: ${error.message}`);
          }
        }))
      .addButton(button => button
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
  }
}