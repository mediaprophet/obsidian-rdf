import { App, Modal, Setting, Notice, TextComponent } from 'obsidian';
import { RDFPlugin } from './main';
import * as N3 from 'n3';
const fetch = require('node-fetch').default;

export class ImportOntologyModal extends Modal {
  plugin: RDFPlugin;
  onSubmit: (filePath: string) => void;

  constructor(app: App, plugin: RDFPlugin, onSubmit: (filePath: string) => void) {
    super(app);
    this.plugin = plugin;
    this.onSubmit = onSubmit;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('semantic-weaver-modal');
    contentEl.createEl('h2', { text: 'Import Ontology from URI' });

    let uri = '';
    let fileName = '';
    let format = 'turtle';

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

    // URI Input with Autocomplete
    new Setting(contentEl)
      .setName('Ontology URI')
      .setDesc('Enter the URI of the RDF ontology (e.g., http://xmlns.com/foaf/0.1/). Select a common namespace or type a custom URI.')
      .setClass('semantic-weaver-setting')
      .addDropdown(dropdown => dropdown
        .addOption('', 'Custom URI')
        .addOptions(commonNamespaces)
        .onChange(value => {
          uri = value || '';
          uriInput.setValue(value);
        }))
      .addText(text => {
        const uriInput = text
          .setPlaceholder('http://example.org/ontology')
          .onChange(value => {
            uri = value.trim();
            if (fileNameInput.getValue() === '') {
              fileNameInput.setValue(uri.split('/').pop()?.replace(/\.[a-z]+$/, '') || 'imported-ontology');
            }
          });
        uriInput.inputEl.addClass('semantic-weaver-input');
        return uriInput;
      });

    // Filename Input
    const fileNameSetting = new Setting(contentEl)
      .setName('Output Filename')
      .setDesc('Name for the Markdown-LD file (without .md extension). Defaults to the URI basename.')
      .setClass('semantic-weaver-setting');
    let fileNameInput: TextComponent;
    fileNameSetting.addText(text => {
      fileNameInput = text
        .setPlaceholder('imported-ontology')
        .onChange(value => (fileName = value.trim()));
      fileNameInput.inputEl.addClass('semantic-weaver-input');
      return fileNameInput;
    });

    // Format Selection
    new Setting(contentEl)
      .setName('Input Format')
      .setDesc('Select the format of the ontology.')
      .setClass('semantic-weaver-setting')
      .addDropdown(dropdown => dropdown
        .addOption('turtle', 'Turtle')
        .addOption('jsonld', 'JSON-LD')
        .onChange(value => (format = value))
        .selectEl.addClass('semantic-weaver-input'));

    // Validation Feedback
    const validationEl = contentEl.createEl('div', { cls: 'semantic-weaver-validation' });

    // Buttons
    new Setting(contentEl)
      .setClass('semantic-weaver-button-group')
      .addButton(button => button
        .setButtonText('Import')
        .setCta()
        .onClick(async () => {
          if (!uri) {
            validationEl.setText('Error: Please enter a valid URI.');
            return;
          }
          if (!fileName) {
            fileName = uri.split('/').pop()?.replace(/\.[a-z]+$/, '') || 'imported-ontology';
            fileNameInput.setValue(fileName);
          }
          if (!fileName.match(/^[a-zA-Z0-9_-]+$/)) {
            validationEl.setText('Error: Filename must contain only letters, numbers, underscores, or hyphens.');
            return;
          }
          try {
            validationEl.setText('Fetching ontology...');
            const response = await fetch(uri, {
              headers: { Accept: format === 'turtle' ? 'text/turtle' : 'application/ld+json' }
            });
            if (!response.ok) {
              throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
            const content = await response.text();
            const contentSizeMB = content.length / (1024 * 1024);

            if (contentSizeMB > 10) {
              const proceed = confirm(`Ontology size is ${contentSizeMB.toFixed(2)} MB, which exceeds the 10 MB limit. This may impact performance. Proceed?`);
              if (!proceed) {
                validationEl.setText('Import cancelled due to large ontology size.');
                this.close();
                return;
              }
            }

            let quads: N3.Quad[];
            if (format === 'turtle') {
              const parser = new N3.Parser();
              quads = await new Promise((resolve, reject) => {
                const quads: N3.Quad[] = [];
                parser.parse(content, (error, quad, prefixes) => {
                  if (error) reject(error);
                  if (quad) quads.push(quad);
                  else resolve(quads);
                });
              });
            } else {
              const jsonldParser = new N3.Parser({ format: 'application/ld+json' });
              quads = await new Promise((resolve, reject) => {
                const quads: N3.Quad[] = [];
                jsonldParser.parse(content, (error, quad, prefixes) => {
                  if (error) reject(error);
                  if (quad) quads.push(quad);
                  else resolve(quads);
                });
              });
            }

            if (quads.length > 10000) {
              const proceed = confirm(`Ontology contains ${quads.length} triples, exceeding the 10,000 triple limit. This may impact performance. Proceed?`);
              if (!proceed) {
                validationEl.setText('Import cancelled due to large ontology size.');
                this.close();
                return;
              }
            }

            const markdownLD = this.convertToMarkdownLD(quads);
            const ontologyFolder = 'templates/ontology';
            await this.app.vault.createFolder(ontologyFolder).catch(() => {});
            const filePath = `${ontologyFolder}/${fileName}.md`;
            if (this.app.vault.getAbstractFileByPath(filePath)) {
              validationEl.setText(`Error: File ${filePath} already exists. Choose a different filename.`);
              return;
            }
            await this.app.vault.create(filePath, markdownLD);
            await this.plugin.rdfStore.addQuads(quads);
            validationEl.setText(`Success: Imported ontology as ${filePath}`);
            this.onSubmit(filePath);
            this.close();
          } catch (error) {
            validationEl.setText(`Error: Failed to import ontology: ${error.message}`);
            console.error(error);
          }
        }))
      .addButton(button => button
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  convertToMarkdownLD(quads: N3.Quad[]): string {
    const prefixes: { [key: string]: string } = {};
    const nodes: { [key: string]: { type?: string; properties: { [key: string]: string } } } = {};
    const rdfStarTriples: string[] = [];

    for (const quad of quads) {
      const subject = quad.subject.value;
      const predicate = quad.predicate.value;
      const object = quad.object.value;

      const prefixMatch = predicate.match(/^(.+[#/])([^#/]+)$/);
      if (prefixMatch) {
        const prefixUri = prefixMatch[1];
        const prefixName = Object.keys(this.plugin.settings.namespaces).find(
          key => this.plugin.settings.namespaces[key] === prefixUri
        ) || prefixUri.split('/').slice(-2, -1)[0] || 'ns';
        prefixes[prefixName] = prefixUri;
      }

      if (!nodes[subject]) {
        nodes[subject] = { properties: {} };
      }
      if (predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
        nodes[subject].type = object;
      } else {
        const propKey = predicate.split('/').pop() || predicate;
        nodes[subject].properties[propKey] = object;
      }

      if (quad.graph.termType !== 'DefaultGraph') {
        rdfStarTriples.push(`<<${quad.subject.value} ${quad.predicate.value} ${quad.object.value}>> ${quad.graph.value}`);
      }
    }

    let markdown = '';
    for (const [prefix, uri] of Object.entries(prefixes)) {
      markdown += `[${prefix}]: ${uri}\n`;
    }
    markdown += '\n## Mode: rdf-star\n\n';
    for (const [node, data] of Object.entries(nodes)) {
      const label = node.split('/').pop() || node;
      let nodeLine = `[${label}]`;
      if (data.type || Object.keys(data.properties).length > 0) {
        nodeLine += '{';
        if (data.type) {
          const typePrefix = Object.keys(prefixes).find(p => data.type.startsWith(prefixes[p])) || 'ex';
          const typeLocal = data.type.replace(prefixes[typePrefix], '');
          nodeLine += `typeof=${typePrefix}:${typeLocal}`;
        }
        for (const [key, value] of Object.entries(data.properties)) {
          const valuePrefix = Object.keys(prefixes).find(p => value.startsWith(prefixes[p])) || '';
          const valueLocal = valuePrefix ? value.replace(prefixes[valuePrefix], '') : value;
          nodeLine += `${data.type ? '; ' : ''}${key}=${valuePrefix ? `${valuePrefix}:${valueLocal}` : `"${value}"`}`;
        }
        nodeLine += '}';
      }
      markdown += `${nodeLine}\n`;
    }
    if (rdfStarTriples.length > 0) {
      markdown += '\n' + rdfStarTriples.join('\n') + '\n';
    }
    return markdown;
  }

  onClose() {
    this.contentEl.empty();
  }
}