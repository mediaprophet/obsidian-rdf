import { App, Modal, Setting, Notice } from 'obsidian';
import { RDFPlugin } from '../main';

export class MarkdownOntologyModal extends Modal {
  private plugin: RDFPlugin;
  private markdownContent: string;
  private fileName: string;

  constructor(app: App, plugin: RDFPlugin, onSubmit: (markdownContent: string, fileName: string) => void) {
    super(app);
    this.plugin = plugin;
    this.markdownContent = `
[schema]: http://schema.org
[rdfs]: http://www.w3.org/2000/01/rdf-schema#
[owl]: http://www.w3.org/2002/07/owl#

[NewClass]{typeof=owl:Class rdfs:label="New Class"}
[NewProperty]{typeof=rdfs:Property schema:domainIncludes=[NewClass]; schema:rangeIncludes=[schema:Text]; rdfs:label="New Property"}
`;
    this.fileName = 'new-ontology';
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Create Markdown Ontology' });

    new Setting(contentEl)
      .setName('File Name')
      .setDesc('Name of the Markdown file (without .md extension)')
      .addText(text => text
        .setPlaceholder('new-ontology')
        .setValue(this.fileName)
        .onChange(value => {
          this.fileName = value.trim();
        }));

    new Setting(contentEl)
      .setName('Ontology Content')
      .setDesc('Define ontology using Markdown-LD syntax (e.g., [Class]{typeof=owl:Class rdfs:label="Class"})')
      .addTextArea(text => text
        .setPlaceholder('Enter Markdown-LD content...')
        .setValue(this.markdownContent)
        .onChange(value => {
          this.markdownContent = value;
        })
        .inputEl.setAttr('rows', 10));

    new Setting(contentEl)
      .addButton(button => button
        .setButtonText('Save')
        .setCta()
        .onClick(() => {
          if (!this.fileName) {
            new Notice('Please enter a file name.');
            return;
          }
          this.onSubmit(this.markdownContent, this.fileName);
          this.close();
        }));
  }

  onClose() {
    this.contentEl.empty();
  }
}