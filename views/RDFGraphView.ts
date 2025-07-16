import { ItemView, WorkspaceLeaf } from 'obsidian';
import * as cytoscape from 'cytoscape';
import { RDFPlugin } from '../main';
import { RDFUtils } from '../utils/RDFUtils';
import * as N3 from 'n3';

export const RDF_GRAPH_VIEW = 'rdf-graph-view';

export class RDFGraphView extends ItemView {
  private plugin: RDFPlugin;

  constructor(leaf: WorkspaceLeaf, plugin?: RDFPlugin) {
    super(leaf);
    this.plugin = plugin || (this.app.plugins.plugins['semantic-weaver'] as RDFPlugin);
  }

  getViewType() {
    return RDF_GRAPH_VIEW;
  }

  getDisplayText() {
    return 'RDF Graph View';
  }

  getIcon() {
    return 'ri-git-branch-line';
  }

  async onOpen() {
    this.containerEl.empty();
    const graphContainer = this.containerEl.createDiv({ cls: 'rdf-graph-container' });
    graphContainer.style.height = '100%';
    graphContainer.style.width = '100%';

    try {
      // Load ontology from plugin’s loaded TTL or fall back to RDFUtils
      const turtleData = this.plugin.ontologyTtl || (await this.plugin.rdfUtils.loadOntology());
      const parser = new N3.Parser({ format: 'Turtle' });
      const quads = await new Promise<N3.Quad[]>((resolve, reject) => {
        const quads: N3.Quad[] = [];
        parser.parse(turtleData, (error, quad, prefixes) => {
          if (error) reject(error);
          if (quad) quads.push(quad);
          else resolve(quads);
        });
      });

      const graphData = this.quadsToCytoscapeElements(quads);

      const cy = cytoscape({
        container: graphContainer,
        elements: graphData,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#666',
              'label': 'data(label)',
              'text-valign': 'center',
              'color': '#fff',
              'text-outline-width': 2,
              'text-outline-color': '#666',
              'width': '100px',
              'height': '100px'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 3,
              'line-color': '#ccc',
              'target-arrow-color': '#ccc',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'label': 'data(label)',
              'text-rotation': 'autorotate'
            }
          }
        ],
        layout: {
          name: 'cose',
          idealEdgeLength: 100,
          nodeOverlap: 20,
          fit: true,
          padding: 30
        }
      });

      // Add basic interaction
      cy.on('cxttap', 'node', (evt) => {
        const node = evt.target;
        new Notice(`Clicked node: ${node.data('label')}`);
      });

      console.log('RDF Graph View rendered successfully');
    } catch (error) {
      console.error('Error rendering RDF graph:', error);
      graphContainer.setText('Error rendering graph. Check console for details.');
      new Notice('Error rendering RDF graph');
    }
  }

  async onClose() {
    this.containerEl.empty();
  }

  private quadsToCytoscapeElements(quads: N3.Quad[]): any[] {
    const elements: any[] = [];
    const nodeIds = new Set<string>();
    quads.forEach(quad => {
      const subject = quad.subject.value;
      const object = quad.object.value;
      const predicate = quad.predicate.value.split('/').pop() || quad.predicate.value;
      if (!nodeIds.has(subject)) {
        elements.push({
          data: { id: subject, label: subject.split('/').pop() || subject }
        });
        nodeIds.add(subject);
      }
      if (quad.object.termType === 'NamedNode' && !nodeIds.has(object)) {
        elements.push({
          data: { id: object, label: object.split('/').pop() || object }
        });
        nodeIds.add(object);
      }
      if (quad.object.termType === 'NamedNode') {
        elements.push({
          data: {
            source: subject,
            target: object,
            label: predicate
          }
        });
      }
    });
    return elements;
  }
}