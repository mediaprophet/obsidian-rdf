import { Plugin, Notice, TFolder } from 'obsidian';
import * as N3 from 'n3';
import * as path from 'path';
import * as fs from 'fs';
import mermaid from 'mermaid';
import markdownld from 'markdown-ld';
import { RDFPluginSettings, DEFAULT_SETTINGS, RDFPluginSettingTab } from './settings/RDFPluginSettings';
import { RDFGraphView } from './views/RDFGraphView';
import { MermaidView } from './views/MermaidView';
import { loadOntology, loadProjectTTL, loadExportedPredicates, storeQuad, parseCML, canvasToTurtle, exportCanvasToRDF, fetchOntologyTerms, extractCMLDMetadata, updateCMLDMetadata, deployToGitHub, generateProjectTTL, copyDocs, copyJsFiles, loadMarkdownOntologies, canvasToMermaid } from './utils/RDFUtils';

const { namedNode, literal, quad } = N3.DataFactory;

export default class RDFPlugin extends Plugin {
  settings: RDFPluginSettings;
  rdfStore: N3.Store;
  ontologyTtl: string;

  async onload() {
    await this.loadSettings();
    await this.importDemoDocs();

    // Initialize Mermaid.js
    mermaid.initialize({ startOnLoad: false, theme: 'default' });

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
    try {
      await loadMarkdownOntologies(this.app, this.rdfStore);
    } catch (error) {
      new Notice(`Failed to load Markdown ontologies: ${error.message}. Skipping Markdown ontologies.`);
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
          await loadMarkdownOntologies(this.app, this.rdfStore);
          new Notice('Namespaces and ontology saved by Semantic Weaver.');
        }).open();
      });
    });

    this.addRibbonIcon('file-text', 'Semantic Weaver: Create Markdown Ontology', () => {
      import('./modals/MarkdownOntologyModal').then(({ MarkdownOntologyModal }) => {
        new MarkdownOntologyModal(this.app, this, async (markdownContent, fileName) => {
          const ontologyFolder = 'templates/ontology';
          const filePath = `${ontologyFolder}/${fileName}.md`;
          await this.app.vault.createFolder(ontologyFolder).catch(() => {});
          await this.app.vault.create(filePath, markdownContent);
          await loadMarkdownOntologies(this.app, this.rdfStore);
          new Notice(`Markdown ontology created: ${filePath}`);
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

    this.addCommand({
      id: 'open-mermaid-view',
      name: 'Semantic Weaver: Open Mermaid Diagram View',
      callback: () => {
        this.app.workspace.getLeaf(true).setViewState({
          type: 'mermaid-view',
          active: true
        });
      }
    });

    this.addSettingTab(new RDFPluginSettingTab(this.app, this));
    this.registerView('rdf-graph', (leaf) => new RDFGraphView(leaf, this));
    this.registerView('mermaid-view', (leaf) => new MermaidView(leaf, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async importDemoDocs() {
    const templatesFolderPath = 'templates';
    const ontologyFolderPath = `${templatesFolderPath}/ontology`;
    const tutorialsFolderPath = `${templatesFolderPath}/tutorials`;
    const pluginDir = path.join(this.app.vault.adapter.basePath, '.obsidian', 'plugins', 'semantic-weaver').replace(/\\/g, '/');
    
    await this.app.vault.createFolder(templatesFolderPath).catch(() => {});
    await this.app.vault.createFolder(ontologyFolderPath).catch(() => {});
    await this.app.vault.createFolder(tutorialsFolderPath).catch(() => {});
    
    const demoFiles = [
      'example-note.md',
      'example-canvas.canvas',
      'semantic-weaver-functional-spec.md',
      'SemanticSyncGuide.json',
      'SemanticSyncGuide.md',
      'ontology/example-ontology.md',
      'ontology.ttl',
      'project.ttl'
    ];

    const tutorialFiles = [
      'tutorials/semantic-canvas.md',
      'tutorials/authoring-cml-cmld.md',
      'tutorials/metadata-ui.md',
      'tutorials/mermaid-diagrams.md',
      'tutorials/faceted-search.md',
      'tutorials/deployment.md',
      'tutorials/rdf-graph.md'
    ];

    for (const file of demoFiles) {
      const srcPath = path.join(pluginDir, 'templates', file).replace(/\\/g, '/');
      const destPath = path.join(pluginDir, 'templates', file).replace(/\\/g, '/');
      if (!this.app.vault.getAbstractFileByPath(path.join(templatesFolderPath, file).replace(/\\/g, '/')) && fs.existsSync(srcPath)) {
        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
        await fs.promises.copyFile(srcPath, destPath);
        new Notice(`Created demo file: ${templatesFolderPath}/${file}`);
      }
    }

    for (const file of tutorialFiles) {
      const srcPath = path.join(pluginDir, 'templates', file).replace(/\\/g, '/');
      const destPath = path.join(pluginDir, 'templates', file).replace(/\\/g, '/');
      if (!this.app.vault.getAbstractFileByPath(path.join(templatesFolderPath, file).replace(/\\/g, '/')) && fs.existsSync(srcPath)) {
        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
        await fs.promises.copyFile(srcPath, destPath);
        new Notice(`Created tutorial file: ${templatesFolderPath}/${file}`);
      }
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
    const ontologyFolder = path.join(pluginDir, 'templates', 'ontology').replace(/\\/g, '/');
    if (await fs.promises.access(ontologyFolder).then(() => true).catch(() => false)) {
      const ontologyFiles = await fs.promises.readdir(ontologyFolder);
      for (const file of ontologyFiles.filter(f => f.endsWith('.md'))) {
        const content = await fs.promises.readFile(path.join(ontologyFolder, file), 'utf-8');
        const jsonld = markdownld(content);
        const turtle = await new Promise<string>((resolve, reject) => {
          const writer = new N3.Writer({ format: 'Turtle' });
          const parser = new N3.Parser({ format: 'application/ld+json' });
          parser.parse(jsonld, (error, quad, prefixes) => {
            if (error) reject(error);
            if (quad) writer.addQuad(quad);
            else writer.end((err, result) => err ? reject(err) : resolve(result));
          });
        });
        const turtlePath = path.join(exportDir, 'docs', 'ontology', `${file.replace('.md', '.ttl')}`).replace(/\\/g, '/');
        const jsonldPath = path.join(exportDir, 'docs', 'ontology', `${file.replace('.md', '.jsonld')}`).replace(/\\/g, '/');
        await fs.promises.mkdir(path.dirname(turtlePath), { recursive: true });
        await fs.promises.writeFile(turtlePath, turtle);
        await fs.promises.writeFile(jsonldPath, jsonld);
      }
    }
    if (githubRepo) {
      await deployToGitHub(this, exportDir);
    }
  }
}