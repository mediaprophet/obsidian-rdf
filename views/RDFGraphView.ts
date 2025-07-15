import { ItemView, WorkspaceLeaf } from 'obsidian';
import * as cytoscape from 'cytoscape';
import { RDFPlugin } from '../main';

export const VIEW_TYPE_RDF_GRAPH = 'rdf-graph';

export class RDFGraphView extends ItemView {
  private plugin: RDFPlugin;
  private cy: cytoscape.Core | null = null;

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
    const container = this.containerEl.createDiv({ cls: 'rdf-graph-container', attr: { style: 'height: 100%; width: 100%;' } });

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
      }
    });

    await this.updateGraph();
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

  async onClose() {
    if (this.cy) {
      this.cy.destroy();
    }
  }
}