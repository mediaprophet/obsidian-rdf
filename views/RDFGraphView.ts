import { App, ItemView } from 'obsidian';
import RDFPlugin from '../main';
import cytoscape from 'cytoscape';

export class RDFGraphView extends ItemView {
  plugin: RDFPlugin;

  constructor(leaf: any, plugin: RDFPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return 'rdf-graph';
  }

  getDisplayText() {
    return 'Semantic Weaver: RDF Graph';
  }

  async onOpen() {
    const container = this.containerEl;
    container.empty();
    const graphDiv = container.createEl('div', { cls: 'rdf-graph' });
    const quads = this.plugin.rdfStore.statementsMatching(undefined, undefined, undefined);
    // Build unique node set
    const nodeIds = new Set<string>();
    quads.forEach((q: any) => {
      nodeIds.add(q.subject.value);
      nodeIds.add(q.object.value);
    });
    const nodes = Array.from(nodeIds).map(id => ({
      data: { id, label: id.split('/').pop() }
    }));
    const edges = quads.map((q: any) => ({
      data: {
        source: q.subject.value,
        target: q.object.value,
        label: q.predicate.value.split('/').pop()
      }
    }));
    cytoscape({
      container: graphDiv,
      elements: [...nodes, ...edges],
      style: [
        { selector: 'node', style: { label: 'data(label)', 'background-color': '#0074D9' } },
        { selector: 'edge', style: { label: 'data(label)', 'curve-style': 'bezier', 'target-arrow-shape': 'triangle' } }
      ],
      layout: { name: 'cose' }
    });
  }
}