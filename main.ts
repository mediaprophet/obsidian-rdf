import { Plugin, Notice, TFolder } from 'obsidian';
import * as N3 from 'n3';
import * as path from 'path';
import * as fs from 'fs';
import { RDFPluginSettings, DEFAULT_SETTINGS, RDFPluginSettingTab } from './settings/RDFPluginSettings';
import { RDFGraphView } from './views/RDFGraphView';
import { loadOntology, loadProjectTTL, loadExportedPredicates, storeQuad, parseCML, canvasToTurtle, exportCanvasToRDF, fetchOntologyTerms, extractCMLDMetadata, updateCMLDMetadata, deployToGitHub, generateProjectTTL, copyDocs, copyJsFiles } from './utils/RDFUtils';

const { namedNode, literal, quad } = N3.DataFactory;

export default class RDFPlugin extends Plugin {
  settings: RDFPluginSettings;
  rdfStore: N3.Store;
  ontologyTtl: string;

  async onload() {
    await this.loadSettings();
    await this.importDemoDocs();

    this.rdfStore = new N3.Store();
    this.ontologyTtl = await loadOntology(this.app);
    try {
      const parser = new N3.Parser({ format: 'Turtle' });
      const quads = await new Promise<N3.Quad[]>((resolve, reject) => {
        const quads: N3.Quad[] = [];
        parser.parse(this.ontologyTtl, (error, quad, prefixes) => {
          if (error) reject(error);
          if (quad) quads.push(quad);
          else resolve(quads);
        });
      });
      await this.rdfStore.addQuads(quads);
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
    if (this.settings.exportDir) {
      try {
        await loadExportedPredicates(this.app, this.rdfStore, this.settings.exportDir);
      } catch (error) {
        new Notice(`Failed to load exported predicates: ${error.message}. Configure export directory in settings.`);
        console.error(error);
      }
    } else {
      new Notice('Export directory not set. Configure in Settings > Semantic Weaver Settings and run "Export RDF Docs for MkDocs".');
    }

    this.addRibbonIcon('book-open', 'Semantic Weaver: Manage RDF Namespaces and Ontology', () => {
      import('./modals/NamespaceOntologyModal').then(({ NamespaceOntologyModal }) => {
        new NamespaceOntologyModal(this.app, this, async (namespaces, ontologyTtl) => {
          this.settings.namespaces = namespaces;
          this.ontologyTtl = ontologyTtl;
          await this.saveSettings();
          this.rdfStore = new N3.Store();
          const parser = new N3.Parser({ format: 'Turtle' });
          const quads = await new Promise<N3.Quad[]>((resolve, reject) => {
            const quads: N3.Quad[] = [];
            parser.parse(this.ontologyTtl, (error, quad, prefixes) => {
              if (error) reject(error);
              if (quad) quads.push(quad);
              else resolve(quads);
            });
          });
          await this.rdfStore.addQuads(quads);
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
    this.registerView('rdf-graph', (leaf) => new RDFGraphView(leaf, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async importDemoDocs() {
    const demoFolderPath = 'semantic-weaver';
    const demoFolder = this.app.vault.getAbstractFileByPath(demoFolderPath);
    
    if (!(demoFolder instanceof TFolder)) {
      await this.app.vault.createFolder(demoFolderPath);
      new Notice('Created semantic-weaver folder for demo docs.');
    }

    const demoFiles = [
      { 
        path: `${demoFolderPath}/example-canvas.canvas`, 
        content: JSON.stringify({
          nodes: [
            { id: 'node1', type: 'http://example.org/doc/Document', properties: { category: 'Example', author: 'http://example.org/Person/John' }, x: 0, y: 0, width: 200, height: 100 },
            { id: 'node2', type: 'http://example.org/doc/Document', properties: { category: 'Sample', author: 'http://example.org/Person/Jane' }, x: 300, y: 0, width: 200, height: 100 }
          ],
          edges: [
            { id: 'edge1', fromNode: 'node1', toNode: 'node2', rdfPredicate: 'http://example.org/relatedTo' }
          ]
        }) 
      },
      { 
        path: `${demoFolderPath}/example-note.md`, 
        content: `
# Example Note
@doc [ExampleNote] category: "Documentation"; author: [John]; created: "2025-07-15".
This is an example note with CMLD metadata.
` 
      },
      { 
        path: `${demoFolderPath}/semantic-weaver-functional-spec.md`, 
        content: await fs.promises.readFile(
          path.join(this.app.vault.adapter.basePath, '.obsidian', 'plugins', 'semantic-weaver', 'templates', 'semantic-weaver-functional-spec.md').replace(/\\/g, '/'), 
          'utf-8'
        ).catch(() => '') 
      },
      { 
        path: `${demoFolderPath}/SemanticSyncGuide.json`, 
        content: await fs.promises.readFile(
          path.join(this.app.vault.adapter.basePath, '.obsidian', 'plugins', 'semantic-weaver', 'templates', 'SemanticSyncGuide.json').replace(/\\/g, '/'), 
          'utf-8'
        ).catch(() => '') 
      }
    ];

    for (const file of demoFiles) {
      if (!this.app.vault.getAbstractFileByPath(file.path) && file.content) {
        await this.app.vault.create(file.path, file.content);
        new Notice(`Created demo file: ${file.path}`);
      }
    }

    // Copy ontology.ttl and project.ttl from plugin templates if they don't exist
    const pluginDir = path.join(this.app.vault.adapter.basePath, '.obsidian', 'plugins', 'semantic-weaver').replace(/\\/g, '/');
    const ontologySrc = path.join(pluginDir, 'templates', 'ontology.ttl').replace(/\\/g, '/');
    const projectSrc = path.join(pluginDir, 'templates', 'project.ttl').replace(/\\/g, '/');
    const ontologyDest = `${demoFolderPath}/ontology.ttl`;
    const projectDest = `${demoFolderPath}/project.ttl`;

    if (!this.app.vault.getAbstractFileByPath(ontologyDest) && fs.existsSync(ontologySrc)) {
      const content = await fs.promises.readFile(ontologySrc, 'utf-8');
      await this.app.vault.create(ontologyDest, content);
      new Notice('Created demo ontology.ttl in semantic-weaver folder.');
    }

    if (!this.app.vault.getAbstractFileByPath(projectDest) && fs.existsSync(projectSrc)) {
      const content = await fs.promises.readFile(projectSrc, 'utf-8');
      await this.app.vault.create(projectDest, content);
      new Notice('Created demo project.ttl in semantic-weaver folder.');
    }
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
    const tempStore = new N3.Store();
    const parser = new N3.Parser({ format: 'Turtle' });
    const quads = await new Promise<N3.Quad[]>((resolve, reject) => {
      const quads: N3.Quad[] = [];
      parser.parse(turtle, (error, quad, prefixes) => {
        if (error) reject(error);
        if (quad) quads.push(quad);
        else resolve(quads);
      });
    });
    await tempStore.addQuads(quads);
    const results = [];
    for await (const binding of tempStore.query(query)) {
      results.push({
        subject: binding.get('subject')?.value,
        predicate: binding.get('predicate')?.value,
        object: binding.get('object')?.value
      });
    }
    return results;
  }

  async exportDocs() {
    const { exportDir, includeTests, githubRepo, siteUrl } = this.settings;
    const pluginDir = path.join(this.app.vault.adapter.basePath, '.obsidian', 'plugins', 'semantic-weaver').replace(/\\/g, '/');
    await copyDocs(this, pluginDir, exportDir);
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