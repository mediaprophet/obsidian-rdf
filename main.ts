import { Plugin, Notice } from 'obsidian';
import * as rdflib from 'rdflib';
import { RDFPluginSettings, DEFAULT_SETTINGS, RDFPluginSettingTab } from './settings/RDFPluginSettings';
import { RDFGraphView } from './views/RDFGraphView';
import { loadOntology, loadProjectTTL, storeQuad, parseCML, canvasToTurtle, exportCanvasToRDF, fetchOntologyTerms, extractCMLDMetadata, updateCMLDMetadata, deployToGitHub, generateProjectTTL, copyDocs, copyJsFiles } from './utils/RDFUtils';
import * as path from 'path';

export default class RDFPlugin extends Plugin {
  settings: RDFPluginSettings;
  rdfStore: rdflib.Store;
  ontologyTtl: string;

  async onload() {
    await this.loadSettings();
    this.rdfStore = rdflib.graph();
    this.ontologyTtl = await loadOntology(this.app);
    try {
      await loadOntology(this.app); // Load ontology TTL
      rdflib.parse(this.ontologyTtl, this.rdfStore, `file://${path.join(this.app.vault.adapter.basePath, 'ontology', 'ontology.ttl').replace(/\\/g, '/')}`, 'text/turtle');
    } catch (error) {
      new Notice(`Failed to load ontology: ${error.message}. Using default ontology.`);
      console.error(error);
    }
    try {
      await loadProjectTTL(this.app, this.rdfStore);
    } catch (error) {
      new Notice(`Failed to load project TTL: ${error.message}. Skipping project TTL.`);
      console.error(error);
    }

    this.addRibbonIcon('book-open', 'Semantic Weaver: Manage RDF Namespaces and Ontology', () => {
      import('./modals/NamespaceOntologyModal').then(({ NamespaceOntologyModal }) => {
        new NamespaceOntologyModal(this.app, this, async (namespaces, ontologyTtl) => {
          this.settings.namespaces = namespaces;
          this.ontologyTtl = ontologyTtl;
          await this.saveSettings();
          this.rdfStore = rdflib.graph();
          rdflib.parse(this.ontologyTtl, this.rdfStore, `file://${path.join(this.app.vault.adapter.basePath, 'ontology', 'ontology.ttl').replace(/\\/g, '/')}`, 'text/turtle');
          new Notice('Namespaces and ontology saved by Semantic Weaver.');
        }).open();
      });
    });

    this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
      if (file.extension === 'canvas' && this.settings.semanticCanvasMode) {
        menu.addItem(item => item
          .setTitle('Edit Semantic Node')
          .setIcon('edit')
          .onClick(() => {
            import('./modals/SemanticCanvasModal').then(({ SemanticCanvasModal }) => {
              new SemanticCanvasModal(this.app, this, file, async (nodeId, type, properties) => {
                await this.updateCanvasNode(file, nodeId, type, properties);
                new Notice('Semantic node updated by Semantic Weaver.');
              }).open();
            });
          }));

        menu.addItem(item => item
          .setTitle('Edit Semantic Edge')
          .setIcon('link')
          .onClick(() => {
            import('./modals/SemanticEdgeModal').then(({ SemanticEdgeModal }) => {
              new SemanticEdgeModal(this.app, this, file, async (edgeId, predicate) => {
                await this.updateCanvasEdge(file, edgeId, predicate);
                new Notice('Semantic edge updated by Semantic Weaver.');
              }).open();
            });
          }));

        menu.addItem(item => item
          .setTitle('Run SPARQL Query')
          .setIcon('search')
          .onClick(() => {
            import('./modals/SPARQLQueryModal').then(({ SPARQLQueryModal }) => {
              new SPARQLQueryModal(this.app, this, file, async query => {
                const results = await this.runSPARQLQuery(file, query);
                new Notice('Query results: ' + JSON.stringify(results));
              }).open();
            });
          }));
      }
    }));

    this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor) => {
      const selection = editor.getSelection();
      if (selection) {
        menu.addItem(item => item
          .setTitle('Wrap as CML URI')
          .setIcon('link')
          .onClick(() => {
            const wrapped = `[${selection}]`;
            editor.replaceSelection(wrapped);
            new Notice('Text wrapped as CML URI by Semantic Weaver.');
          }));

        menu.addItem(item => item
          .setTitle('Look Up URI')
          .setIcon('search')
          .onClick(() => {
            import('./modals/URILookupModal').then(({ URILookupModal }) => {
              new URILookupModal(this.app, this.settings.namespaces, this.ontologyTtl, async uri => {
                editor.replaceSelection(`[${uri.split('/').pop()}]`);
                new Notice(`Inserted URI: ${uri} by Semantic Weaver`);
              }).open();
            });
          }));
      }
    }));

    this.addCommand({
      id: 'edit-cmld-metadata',
      name: 'Semantic Weaver: Edit CMLD Metadata',
      editorCallback: (editor, view) => {
        const file = view.file;
        if (file) {
          const content = editor.getValue();
          const metadata = extractCMLDMetadata(content);
          import('./modals/CMLDMetadataModal').then(({ CMLDMetadataModal }) => {
            new CMLDMetadataModal(this.app, file, metadata, async (newMetadata) => {
              await updateCMLDMetadata(this.app, file, newMetadata);
              new Notice('CMLD metadata updated by Semantic Weaver.');
            }).open();
          });
        }
      },
    });

    this.addCommand({
      id: 'export-rdf-docs',
      name: 'Semantic Weaver: Export RDF Docs for MkDocs',
      callback: () => {
        import('./modals/ExportConfigModal').then(({ ExportConfigModal }) => {
          new ExportConfigModal(this.app, this.settings, async (newSettings) => {
            this.settings = newSettings;
            await this.saveSettings();
            new Notice('Starting export with Semantic Weaver...');
            await this.exportDocs();
            new Notice('Exported RDF-enhanced docs with Semantic Weaver.');
          }).open();
        });
      },
    });

    this.addCommand({
      id: 'open-rdf-graph',
      name: 'Semantic Weaver: Open RDF Graph View',
      callback: () => {
        this.app.workspace.getLeaf(true).setViewState({
          type: 'rdf-graph',
          active: true
        });
      }
    });

    this.addSettingTab(new RDFPluginSettingTab(this.app, this));
    this.registerView('rdf-graph', (leaf) => new RDFGraphView(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async updateCanvasNode(file: TFile, nodeId: string, type: string, properties: { [key: string]: string }) {
    const content = await this.app.vault.read(file);
    const canvasData = JSON.parse(content);
    const node = canvasData.nodes.find(n => n.id === nodeId);
    if (node) {
      node.type = type;
      node.properties = properties;
      const quads = [];
      const nodeUri = node.url || `${this.settings.namespaces.ex}${nodeId}`;
      if (type) {
        quads.push(quad(namedNode(nodeUri), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode(type)));
      }
      for (const [key, value] of Object.entries(properties)) {
        const predUri = namedNode(`${this.settings.namespaces.ex}${key}`);
        quads.push(quad(namedNode(nodeUri), predUri, value.startsWith('http') ? namedNode(value) : literal(value)));
      }
      await storeQuad(this.rdfStore, quads);
      await this.app.vault.modify(file, JSON.stringify(canvasData));
    }
  }

  async updateCanvasEdge(file: TFile, edgeId: string, predicate: string) {
    const content = await this.app.vault.read(file);
    const canvasData = JSON.parse(content);
    const edge = canvasData.edges.find(e => e.id === edgeId);
    if (edge) {
      edge.rdfPredicate = predicate;
      const fromNode = canvasData.nodes.find(n => n.id === edge.fromNode);
      const toNode = canvasData.nodes.find(n => n.id === edge.toNode);
      if (fromNode && toNode) {
        const fromUri = fromNode.url || `${this.settings.namespaces.ex}${edge.fromNode}`;
        const toUri = toNode.url || `${this.settings.namespaces.ex}${edge.toNode}`;
        const quads = [quad(namedNode(fromUri), namedNode(predicate), namedNode(toUri))];
        await storeQuad(this.rdfStore, quads);
        await this.app.vault.modify(file, JSON.stringify(canvasData));
      }
    }
  }

  async runSPARQLQuery(file: TFile, query: string): Promise<any[]> {
    const canvasContent = await this.app.vault.read(file);
    const canvasData = JSON.parse(canvasContent);
    const turtle = await canvasToTurtle(this, canvasData);
    const tempStore = rdflib.graph();
    rdflib.parse(turtle, tempStore, `file://${file.path}`, 'text/turtle');
    const results = [];
    tempStore.query(query).forEach(s => {
      results.push({
        subject: s.subject.value,
        predicate: s.predicate.value,
        object: s.object.value
      });
    });
    return results;
  }

  async exportDocs() {
    const { exportDir, includeTests, githubRepo, siteUrl } = this.settings;
    const pluginDir = path.join(this.app.vault.adapter.basePath, '.obsidian', 'plugins', 'semantic-weaver').replace(/\\/g, '/');
    await copyDocs(this, pluginDir, exportDir, includeTests);
    await copyJsFiles(this, pluginDir, exportDir);
    const ontologyPath = path.join(exportDir, 'docs', 'ontology.ttl').replace(/\\/g, '/');
    const projectTtl = await generateProjectTTL(this);
    const projectPath = path.join(exportDir, 'docs', 'project.ttl').replace(/\\/g, '/');
    await fs.promises.mkdir(path.dirname(ontologyPath), { recursive: true });
    await fs.promises.writeFile(ontologyPath, this.ontologyTtl);
    await fs.promises.writeFile(projectPath, projectTtl);
    const canvasFiles = this.app.vault.getFiles().filter(f => f.extension === 'canvas');
    for (const file of canvasFiles) {
      const turtle = await exportCanvasToRDF(this, file, 'turtle');
      const jsonld = await exportCanvasToRDF(this, file, 'jsonld');
      const turtlePath = path.join(exportDir, 'docs', 'canvas', `${file.basename}.ttl`).replace(/\\/g, '/');
      const jsonldPath = path.join(exportDir, 'docs', 'canvas', `${file.basename}.jsonld`).replace(/\\/g, '/');
      await fs.promises.mkdir(path.dirname(turtlePath), { recursive: true });
      await fs.promises.writeFile(turtlePath, turtle);
      await fs.promises.writeFile(jsonldPath, jsonld);
    }
    if (githubRepo) {
      await deployToGitHub(this, exportDir);
    }
  }
}