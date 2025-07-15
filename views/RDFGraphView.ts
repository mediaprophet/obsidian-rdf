import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import cytoscape from 'cytoscape';
import contextMenus from 'cytoscape-context-menus';
import { RDFPlugin } from '../main';
import * as N3 from 'n3';
import ForceGraph3D from '3d-force-graph';

export const RDF_GRAPH_VIEW = 'rdf-graph';

export class RDFGraphView extends ItemView {
  plugin: RDFPlugin;
  cy: cytoscape.Core | null = null;
  forceGraph: any | null = null;
  is3DMode: boolean = false;

  constructor(leaf: WorkspaceLeaf, plugin: RDFPlugin) {
    super(leaf);
    this.plugin = plugin;
    cytoscape.use(contextMenus);
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
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('rdf-graph-view');

    // Toggle Button
    const toggleButton = container.createEl('button', {
      cls: 'semantic-weaver-toggle-button',
      text: 'Switch to 3D View',
    });
    toggleButton.addEventListener('click', () => {
      this.is3DMode = !this.is3DMode;
      toggleButton.setText(this.is3DMode ? 'Switch to 2D View' : 'Switch to 3D View');
      this.renderGraph();
    });

    // Graph Container
    const graphContainer = container.createEl('div', { cls: 'rdf-graph-container' });
    this.renderGraph();
  }

  async renderGraph() {
    const container = this.containerEl.querySelector('.rdf-graph-container') as HTMLElement;
    container.empty();

    if (this.is3DMode) {
      await this.render3DGraph(container);
    } else {
      await this.render2DGraph(container);
    }
  }

  async render2DGraph(container: HTMLElement) {
    if (this.forceGraph) {
      this.forceGraph = null;
    }

    const elements = await this.getGraphElements();
    this.cy = cytoscape({
      container,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#7d5bed',
            label: 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            color: '#ffffff',
            'font-size': '12px',
          },
        },
        {
          selector: 'edge',
          style: {
            'line-color': '#5b4dd6',
            'target-arrow-color': '#5b4dd6',
            'target-arrow-shape': 'triangle',
            label: 'data(label)',
            'font-size': '10px',
            color: '#ffffff',
            'curve-style': 'bezier',
          },
        },
      ],
      layout: { name: 'cose', animate: true },
    });

    (this.cy as any).contextMenus({
      menuItems: [
        {
          id: 'expand',
          content: 'Expand Neighbors',
          selector: 'node',
          onClickFunction: async (event: any) => {
            const node = event.target;
            const nodeId = node.id();
            const neighbors = await this.getNeighbors(nodeId);
            this.cy?.add(neighbors);
            this.cy?.layout({ name: 'cose', animate: true }).run();
          },
        },
        {
          id: 'attributes',
          content: 'View Attributes',
          selector: 'node',
          onClickFunction: (event: any) => {
            const node = event.target;
            const attributes = node.data('attributes');
            new Notice(`Attributes: ${JSON.stringify(attributes)}`);
          },
        },
      ],
    });
  }

  async render3DGraph(container: HTMLElement) {
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }

    const { nodes, links } = await this.get3DGraphData();
    this.forceGraph = ForceGraph3D()(container)
      .graphData({ nodes, links })
      .nodeLabel('label')
      .nodeColor(() => '#7d5bed')
      .linkColor(() => '#5b4dd6')
      .linkWidth(2)
      .nodeAutoColorBy('type')
      .linkDirectionalArrowLength(5)
      .linkDirectionalArrowRelPos(1)
      .onNodeClick((node: any) => {
        new Notice(`Node: ${node.label}\nAttributes: ${JSON.stringify(node.attributes)}`);
      })
      .onLinkClick((link: any) => {
        new Notice(`Edge: ${link.label}`);
      });

    // Camera settings for better visibility
    this.forceGraph.cameraPosition({ z: 300 });
  }

  async getGraphElements(): Promise<any[]> {
    const elements: any[] = [];
    const seenNodes = new Set<string>();
    for await (const quad of this.plugin.rdfStore.getQuads(null, null, null, null)) {
      const subject = quad.subject.value;
      const predicate = quad.predicate.value;
      const object = quad.object.value;

      if (!seenNodes.has(subject)) {
        seenNodes.add(subject);
        const label = subject.split('/').pop() || subject;
        const attributes = await this.getNodeAttributes(subject);
        elements.push({
          data: { id: subject, label, attributes },
        });
      }

      if (quad.object.termType === 'NamedNode' && !seenNodes.has(object)) {
        seenNodes.add(object);
        const label = object.split('/').pop() || object;
        const attributes = await this.getNodeAttributes(object);
        elements.push({
          data: { id: object, label, attributes },
        });
      }

      if (quad.object.termType === 'NamedNode') {
        const label = predicate.split('/').pop() || predicate;
        elements.push({
          data: {
            id: `${subject}-${predicate}-${object}`,
            source: subject,
            target: object,
            label,
          },
        });
      }
    }
    return elements;
  }

  async get3DGraphData(): Promise<{ nodes: any[], links: any[] }> {
    const nodes: any[] = [];
    const links: any[] = [];
    const seenNodes = new Set<string>();

    for await (const quad of this.plugin.rdfStore.getQuads(null, null, null, null)) {
      const subject = quad.subject.value;
      const predicate = quad.predicate.value;
      const object = quad.object.value;

      if (!seenNodes.has(subject)) {
        seenNodes.add(subject);
        const label = subject.split('/').pop() || subject;
        const attributes = await this.getNodeAttributes(subject);
        const type = (await this.plugin.rdfStore.getQuads(subject, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', null, null))[0]?.object.value || '';
        nodes.push({ id: subject, label, attributes, type });
      }

      if (quad.object.termType === 'NamedNode' && !seenNodes.has(object)) {
        seenNodes.add(object);
        const label = object.split('/').pop() || object;
        const attributes = await this.getNodeAttributes(object);
        const type = (await this.plugin.rdfStore.getQuads(object, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', null, null))[0]?.object.value || '';
        nodes.push({ id: object, label, attributes, type });
      }

      if (quad.object.termType === 'NamedNode') {
        const label = predicate.split('/').pop() || predicate;
        links.push({
          source: subject,
          target: object,
          label,
        });
      }
    }

    return { nodes, links };
  }

  async getNodeAttributes(nodeId: string): Promise<{ [key: string]: string }> {
    const attributes: { [key: string]: string } = {};
    for await (const quad of this.plugin.rdfStore.getQuads(nodeId, null, null, null)) {
      if (quad.object.termType === 'Literal') {
        attributes[quad.predicate.value.split('/').pop() || quad.predicate.value] = quad.object.value;
      }
    }
    return attributes;
  }

  async getNeighbors(nodeId: string): Promise<any[]> {
    const elements: any[] = [];
    const seenNodes = new Set<string>();
    for await (const quad of this.plugin.rdfStore.getQuads(nodeId, null, null, null)) {
      const object = quad.object.value;
      if (quad.object.termType === 'NamedNode' && !seenNodes.has(object)) {
        seenNodes.add(object);
        const label = object.split('/').pop() || object;
        const attributes = await this.getNodeAttributes(object);
        elements.push({
          data: { id: object, label, attributes },
        });
      }
      const predicate = quad.predicate.value;
      if (quad.object.termType === 'NamedNode') {
        const label = predicate.split('/').pop() || predicate;
        elements.push({
          data: {
            id: `${nodeId}-${predicate}-${object}`,
            source: nodeId,
            target: object,
            label,
          },
        });
      }
    }
    return elements;
  }

  async onClose() {
    if (this.cy) {
      this.cy.destroy();
    }
    if (this.forceGraph) {
      this.forceGraph = null;
    }
  }
}