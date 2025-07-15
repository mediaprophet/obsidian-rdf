import { App, Modal, Setting, TFile } from 'obsidian';

export class CMLDMetadataModal extends Modal {
  noteFile: TFile;
  metadata: { [key: string]: string };
  onSubmit: (metadata: { [key: string]: string }) => void;

  constructor(app: App, noteFile: TFile, metadata: { [key: string]: string }, onSubmit: (metadata: { [key: string]: string }) => void) {
    super(app);
    this.noteFile = noteFile;
    this.metadata = metadata;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Semantic Weaver: Edit CMLD Metadata' });

    const fields = [
      { key: 'category', label: 'Category', placeholder: 'e.g., Tutorial' },
      { key: 'author', label: 'Author (URI)', placeholder: 'e.g., http://example.org/Alice' },
      { key: 'related', label: 'Related Page (URI)', placeholder: 'e.g., http://example.org/Page2' },
      { key: 'created', label: 'Created Date', placeholder: 'e.g., 2025-07-14' },
      { key: 'version', label: 'Version', placeholder: 'e.g., 1.0' },
    ];

    fields.forEach(field => {
      new Setting(contentEl)
        .setName(field.label)
        .addText(text => text
          .setPlaceholder(field.placeholder)
          .setValue(this.metadata[field.key] || '')
          .onChange(value => this.metadata[field.key] = value));
    });

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText('Save')
        .onClick(() => {
          this.onSubmit(this.metadata);
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