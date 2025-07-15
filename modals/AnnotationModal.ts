import { App, Modal, Setting } from 'obsidian';

export class AnnotationModal extends Modal {
  selection: string;
  onSubmit: (annotation: string) => void;
  annotation: string = '';

  constructor(app: App, selection: string, onSubmit: (annotation: string) => void) {
    super();
    this.selection = selection;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const contentEl = this.contentEl;
    contentEl.createEl('h2', { text: 'Semantic Weaver: Add Annotation' });
    contentEl.createEl('p', { text: `Selection: ${this.selection}` });

    new Setting(contentEl)
      .setName('Annotation')
      .setDesc('Enter your annotation')
      .addTextArea((text: any) => text
        .setPlaceholder('Enter annotation...')
        .onChange((value: string) => this.annotation = value));

    new Setting(contentEl)
      .addButton((btn: any) => btn
        .setButtonText('Save')
        .onClick(() => {
          if (this.annotation) {
            this.onSubmit(this.annotation);
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