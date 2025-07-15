import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import cytoscape from 'cytoscape';
import { RDFPlugin } from '../main';

export const VIEW_TYPE_RDF_GRAPH = 'rdf-graph';

export class RDFGraphView extends ItemView {
  private plugin: RDFPlugin;
  private cy: cytoscape.Core | null = null;
  private selectedNode: cytoscape.NodeSingular | null = null;
  private attributesPanel: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: RDFPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_RDF_GRAPH;
  }

  getDisplayText(): string {
    return 'RDF Graph View';
  }

  getIcon(): string {
    return 'network';
  }

  async onOpen() {
    const container = this.containerEl.createDiv({ cls: 'rdf-graph-container' });
    container.style.height = '100%';
    container.style.width = '100%';

    // Attributes panel for RDF properties
    this.attributesPanel = this.containerEl.createDiv({ cls: 'rdf-attributes-panel' });
    this.attributesPanel.style.position = 'absolute';
    this.attributesPanel.style.top = '10px';
    this.attributesPanel.style.right = '10px';
    this.attributesPanel.style.width = '300px';
    this.attributesPanel.style.maxHeight = '80%';
    this.attributesPanel.style.overflowY = 'auto';
    this.attributesPanel.style.background = 'var(--background-secondary)';
    this.attributesPanel.style.padding = '10px';
    this.attributesPanel.style.border = '1px solid var(--background-modifier-border)';
    this.attributesPanel.style.display = 'none';

    this.cy = cytoscape({
      container: container,
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#666',
            'label': 'data(label)',
            'text-valign': 'center',
            'color': '#fff',
            'text-outline-width': 2,
            'text-outline-color': '#000'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'text-outline-width': 2,
            'text-outline-color': '#000'
          }
        }
      ],
      layout: {
        name: 'cose',
        idealEdgeLength: 100,
        nodeOverlap: 20,
        fit: true
      },
      userPanningEnabled: true,
      userZoomingEnabled: true,
      autoungrabify: false, // Allows manual node movement
      boxSelectionEnabled: true
    });

    // Center graph on clicked node
    this.cy.on('tap', 'node', (event) => {
      this.selectedNode = event.target;
      this.updateAttributesPanel();
      this.cy.center(this.selectedNode);
    });

    // Hide attributes panel when clicking outside nodes
    this.cy.on('tap', (event) => {
      if (event.target === this.cy) {
        this.selectedNode = null;
        this.attributesPanel.style.display = 'none';
      }
    });

    await this.updateGraph();

    // Add self-organize button
    const layoutButton = this.containerEl.createEl('button', { text: 'Self-Organize Graph' });
    layoutButton.style.position = 'absolute';
    layoutButton.style.top = '10px';
    layoutButton.style.left = '10px';
    layoutButton.addEventListener('click', () => {
      this.cy.layout({ name: 'cose', fit: true }).run();
    });

    // Context menu enhancements
    this.cy.contextMenus({
      menuItems: [
        {
          id: 'view-in-source',
          content: 'View in Source',
          selector: 'node',
          onClickFunction: (event) => {
            const node = event.target;
            this.viewInSource(node);
          }
        },
        {
          id: 'expand-neighbors',
          content: 'Expand Neighbors',
          selector: 'node',
          onClickFunction: (event) => {
            const node = event.target;
            this.expandNeighbors(node);
          }
        },
        {
          id: 'hide-node',
          content: 'Hide Node',
          selector: 'node',
          onClickFunction: (event) => {
            const node = event.target;
            node.remove();
          }
        }
      ]
    });
  }

  async updateGraph() {
    if (!this.cy) return;
    const quads = this.plugin.rdfStore.getQuads(null, null, null);
    const elements: any[] = [];
    const nodes = new Set<string>();

    quads.forEach(quad => {
      const subject = quad.subject.value;
      const object = quad.object.termType === 'NamedNode' ? quad.object.value : null;
      const predicate = quad.predicate.value;

      if (!nodes.has(subject)) {
        nodes.add(subject);
        elements.push({
          data: { id: subject, label: subject.split('/').pop() || subject }
        });
      }
      if (object && !nodes.has(object)) {
        nodes.add(object);
        elements.push({
          data: { id: object, label: object.split('/').pop() || object }
        });
      }
      if (object) {
        elements.push({
          data: {
            id: `${subject}-${predicate}-${object}`,
            source: subject,
            target: object,
            label: predicate.split('/').pop() || predicate
          }
        });
      }
    });

    this.cy.remove(this.cy.elements());
    this.cy.add(elements);
    this.cy.layout({ name: 'cose', fit: true }).run();
  }

  updateAttributesPanel() {
    if (!this.selectedNode || !this.attributesPanel) return;
    const nodeId = this.selectedNode.id();
    const quads = this.plugin.rdfStore.getQuads(namedNode(nodeId), null, null);
    this.attributesPanel.empty();
    if (quads.length === 0) {
      this.attributesPanel.createEl('p', { text: 'No attributes found.' });
    } else {
      const table = this.attributesPanel.createEl('table');
      const headerRow = table.createEl('tr');
      headerRow.createEl('th', { text: 'Property' });
      headerRow.createEl('th', { text: 'Value' });
      quads.forEach(quad => {
        const row = table.createEl('tr');
        row.createEl('td', { text: quad.predicate.value });
        row.createEl('td', { text: quad.object.value });
      });
    }
    this.attributesPanel.style.display = 'block';
  }

  viewInSource(node: cytoscape.NodeSingular) {
    const nodeId = node.id();
    // Placeholder: Logic to open source document and scroll to relevant section
    new Notice(`Opening source for node: ${nodeId} (not fully implemented)`);
  }

  expandNeighbors(node: cytoscape.NodeSingular) {
    const neighbors = node.neighborhood().nodes();
    neighbors.forEach(neighbor => {
      neighbor.style('background-color', '#ff0'); // Highlight neighbors
    });
  }

  async onClose() {
    if (this.cy) {
      this.cy.destroy();
    }
  }
}