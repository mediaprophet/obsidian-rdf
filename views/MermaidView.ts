import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import * as mermaid from 'mermaid';
import { RDFPlugin } from '../main';
import { canvasToMermaid } from '../utils/RDFUtils';

export const MERMAID_VIEW_TYPE = 'mermaid-view';

export class MermaidView extends ItemView {
  plugin: RDFPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: RDFPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return MERMAID_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Mermaid Diagram';
  }

  getIcon(): string {
    return 'diagram';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl('h4', { text: 'Mermaid Diagram' });

    const canvasFiles = this.app.vault.getFiles().filter(f => f.extension === 'canvas');
    const diagramDiv = container.createEl('div', { cls: 'mermaid' });

    if (canvasFiles.length === 0) {
      diagramDiv.createEl('p', { text: 'No canvas files found. Create a canvas file to visualize as a Mermaid diagram.' });
      return;
    }

    const select = container.createEl('select');
    const activeFile = this.app.workspace.getActiveFile();
    canvasFiles.forEach(file => {
      const option = select.createEl('option', { text: file.basename, value: file.path });
      if (file === activeFile || (!activeFile && file.path === 'templates/example-canvas.canvas')) {
        option.selected = true;
      }
    });

    const renderDiagram = async () => {
      diagramDiv.empty();
      const filePath = select.value;
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile && file.extension === 'canvas') {
        try {
          const content = await this.app.vault.read(file);
          const canvasData = JSON.parse(content);
          const mermaidCode = await canvasToMermaid(this.plugin, canvasData);
          const { svg } = await mermaid.default.render('mermaid-diagram', mermaidCode);
          diagramDiv.innerHTML = svg;
        } catch (error) {
          diagramDiv.createEl('p', { text: `Error rendering Mermaid diagram: ${error.message}` });
        }
      } else {
        diagramDiv.createEl('p', { text: 'Select a canvas file to view its Mermaid diagram.' });
      }
    };

    select.addEventListener('change', renderDiagram);
    await renderDiagram();
  }

  async onClose() {
    // Cleanup if necessary
  }
}