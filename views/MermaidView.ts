import { ItemView, WorkspaceLeaf } from 'obsidian';
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
    return 'Mermaid Diagram View';
  }

  getIcon(): string {
    return 'diagram';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl('h4', { text: 'Mermaid Diagram View' });

    const canvasFiles = this.app.vault.getFiles().filter(f => f.extension === 'canvas');
    if (canvasFiles.length === 0) {
      container.createEl('p', { text: 'No canvas files found. Create a canvas file to visualize as a Mermaid diagram.' });
      return;
    }

    const select = container.createEl('select');
    canvasFiles.forEach(file => {
      const option = select.createEl('option', { text: file.basename, value: file.path });
      if (file.path === 'templates/example-canvas.canvas') {
        option.selected = true;
      }
    });

    const diagramDiv = container.createEl('div', { cls: 'mermaid-diagram' });

    const renderDiagram = async () => {
      const filePath = select.value;
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile) {
        const content = await this.app.vault.read(file);
        const canvasData = JSON.parse(content);
        const mermaidCode = await canvasToMermaid(this.plugin, canvasData);
        try {
          const { svg } = await mermaid.render('mermaid-diagram', mermaidCode);
          diagramDiv.innerHTML = svg;
        } catch (error) {
          diagramDiv.innerHTML = `<p>Error rendering Mermaid diagram: ${error.message}</p>`;
        }
      }
    };

    select.addEventListener('change', renderDiagram);
    await renderDiagram();
  }

  async onClose() {
    // Cleanup if needed
  }
}