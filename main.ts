import { Plugin, Notice, TFile } from 'obsidian';
import * as N3 from 'n3';
import * as path from 'path';
import * as fs from 'fs';
import mermaid from 'mermaid';
import { RDFPluginSettings, DEFAULT_SETTINGS, RDFPluginSettingTab } from './settings/RDFPluginSettings';
import { RDFGraphView } from './views/RDFGraphView';
import { MermaidView } from './views/MermaidView';
import { loadOntology, loadProjectTTL, loadExportedPredicates, storeQuad, parseCML, canvasToTurtle, exportCanvasToRDF, extractCMLDMetadata, updateCMLDMetadata, copyDocs, copyJsFiles, loadMarkdownOntologies, canvasToMermaid, deployToGitHub, generateProjectTTL } from './utils/RDFUtils';

const { namedNode, literal, quad } = N3.DataFactory;

export default class RDFPlugin extends Plugin {
  settings: RDFPluginSettings;
  rdfStore: N3.Store;
  ontologyTtl: string;

  async onload() {
    await this.loadSettings();
    await this.importDemoDocs();

    // Initialize Mermaid with theme-aware colors
    const isDarkTheme = this.app.getTheme() === 'obsidian';
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: isDarkTheme ? '#7d5bed' : '#5b4dd6', // Accent color for dark/light themes
        background: isDarkTheme ? '#202020' : '#ffffff' // Background for dark/light themes
      }
    });

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

    if (!this.app.vault.config?.detectAllExtensions) {
      new Notice('Enable "Detect all file extensions" in Settings > Files & Links to view .canvas and .ttl files.');
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

    this.addRibbonIcon('code', 'Semantic Weaver: Parse Markdown-LD', () => {
      import('./modals/MarkdownLDModal').then(({ MarkdownLDModal }) => {
        new MarkdownLDModal(this.app, this, null, async (graph, turtle, constraints, file) => {
          if (file) {
            const parser = new N3.Parser({ format: 'Turtle' });
            const quads = await new Promise<N3.Quad[]>((resolve, reject) => {
              const quads: N3.Quad[] = [];
              parser.parse(turtle, (error, quad, prefixes) => {
                if (error) reject(error);
                if (quad) quads.push(quad);
                else resolve(quads);
              });
            });
            await this.rdfStore.addQuads(quads);
            new Notice(`Parsed Markdown-LD and updated RDF store for ${file.path}`);
          } else {
            const output = this.settings.outputFormat === 'jsonld' ? JSON.stringify(graph, null, 2) : turtle;
            new Notice(`Parsed Markdown-LD:\n${output}`);
          }
          if (constraints.length > 0) {
            import('./modals/MarkdownLDModal').then(({ MarkdownLDModal }) => {
              const modal = new MarkdownLDModal(this.app, this, file, async () => {}, this.settings.outputFormat);
              modal.validateSHACL(modal.markdownContent).then(results => {
                if (results.length > 0) {
                  new Notice(`SHACL validation errors: ${JSON.stringify(results)}`);
                } else {
                  new Notice('SHACL validation passed');
                }
              });
            });
          }
        }, this.settings.outputFormat).open();
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

        menu.addItem(item => item
          .setTitle('Parse Markdown-LD')
          .setIcon('code')
          .onClick(() => {
            import('./modals/MarkdownLDModal').then(({ MarkdownLDModal }) => {
              new MarkdownLDModal(this.app, this, file, async (graph, turtle, constraints, file) => {
                const parser = new N3.Parser({ format: 'Turtle' });
                const quads = await new Promise<N3.Quad[]>((resolve, reject) => {
                  const quads: N3.Quad[] = [];
                  parser.parse(turtle, (error, quad, prefixes) => {
                    if (error) reject(error);
                    if (quad) quads.push(quad);
                    else resolve(quads);
                  });
                });
                await this.rdfStore.addQuads(quads);
                new Notice(`Parsed Markdown-LD and updated RDF store for ${file.path}`);
                if (constraints.length > 0) {
                  const modal = new MarkdownLDModal(this.app, this, file, async () => {}, this.settings.outputFormat);
                  const results = await modal.validateSHACL(modal.markdownContent);
                  if (results.length > 0) {
                    new Notice(`SHACL validation errors: ${JSON.stringify(results)}`);
                  } else {
                    new Notice('SHACL validation passed');
                  }
                }
              }, this.settings.outputFormat).open();
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

        menu.addItem(item => item
          .setTitle('Add Annotation')
          .setIcon('note')
          .onClick(() => {
            import('./modals/AnnotationModal').then(({ AnnotationModal }) => {
              new AnnotationModal(this.app, selection, async annotation => {
                const wrapped = `<<[${selection}] oa:hasBody "${annotation}">>`;
                editor.replaceSelection(wrapped);
                new Notice('Annotation added by Semantic Weaver.');
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

    this.addCommand({
      id: 'validate-rdf-data',
      name: 'Semantic Weaver: Validate RDF Data',
      callback: async () => {
        const ontologyFolder = path.join(this.manifest.dir || path.join(this.app.vault.adapter.basePath, '.obsidian', 'plugins', 'semantic-weaver'), 'templates').replace(/\\/g, '/');
        try {
          const files = await fs.promises.readdir(ontologyFolder);
          for (const file of files.filter(f => f.endsWith('.shacl.md'))) {
            const content = await fs.promises.readFile(path.join(ontologyFolder, file), 'utf-8');
            import('./modals/MarkdownLDModal').then(({ MarkdownLDModal }) => {
              const modal = new MarkdownLDModal(this.app, this, null, async () => {}, this.settings.outputFormat);
              modal.validateSHACL(content).then(results => {
                if (results.length > 0) {
                  new Notice(`SHACL validation errors in ${file}: ${JSON.stringify(results)}`);
                } else {
                  new Notice(`SHACL validation passed for ${file}`);
                }
              });
            });
          }
        } catch (error) {
          new Notice(`Failed to validate RDF data: ${error.message}`);
          console.error(error);
        }
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
    const pluginDir = this.manifest.dir || path.join(this.app.vault.adapter.basePath, '.obsidian', 'plugins', 'semantic-weaver').replace(/\\/g, '/');
    
    await this.app.vault.createFolder(templatesFolderPath).catch(() => {});
    await this.app.vault.createFolder(ontologyFolderPath).catch(() => {});
    await this.app.vault.createFolder(tutorialsFolderPath).catch(() => {});
    
    const demoFiles = [
      { path: 'example-note.md', content: '# Example Note\nThis is a sample note for Semantic Weaver.' },
      { path: 'example-canvas.canvas', content: JSON.stringify({ nodes: [], edges: [] }) },
      { path: 'semantic-weaver-functional-spec.md', content: '# Semantic Weaver Functional Spec\nDetails about the plugin.' },
      { path: 'SemanticSyncGuide.json', content: '{}' },
      { path: 'SemanticSyncGuide.md', content: '# Semantic Sync Guide\nGuide for syncing RDF data.' },
      { path: 'ontology/example-ontology.md', content: '[ex]: http://example.org/\n[Document]{typeof=ex:Document}' },
      { path: 'ontology.ttl', content: '@prefix ex: <http://example.org/> .\nex:Document a rdfs:Class .' },
      { path: 'project.ttl', content: '@prefix ex: <http://example.org/> .' },
      { path: 'constraints.shacl.md', content: '## SHACL Constraint: example\n```sparql\nSELECT ?this WHERE { ?this a ex:Document . }\n```' }
    ];

    const tutorialFiles = [
      { path: 'tutorials/semantic-canvas.md', content: '# Semantic Canvas Tutorial\nGuide for using semantic canvas.' },
      { path: 'tutorials/authoring-cml-cmld.md', content: '# Authoring CML and CMLD\nGuide for CML and CMLD.' },
      { path: 'tutorials/metadata-ui.md', content: '# Metadata UI\nGuide for metadata UI.' },
      { path: 'tutorials/mermaid-diagrams.md', content: '# Mermaid Diagrams\nGuide for Mermaid diagrams.' },
      { path: 'tutorials/faceted-search.md', content: '# Faceted Search\nGuide for faceted search.' },
      { path: 'tutorials/deployment.md', content: '# Deployment\nGuide for deploying to GitHub Pages.' },
      { path: 'tutorials/rdf-graph.md', content: '# RDF Graph\nGuide for RDF graph view.' },
      { path: 'tutorials/rdf-star-shacl.md', content: '# RDF-Star and SHACL\n## Mode: rdf-star\nGuide for RDF-Star and SHACL.' }
    ];

    for (const file of demoFiles) {
      const srcPath = path.join(pluginDir, 'templates', file.path).replace(/\\/g, '/');
      const destPath = path.join(templatesFolderPath, file.path).replace(/\\/g, '/');
      if (!fs.existsSync(srcPath)) {
        // Create default file if missing
        await fs.promises.mkdir(path.dirname(srcPath), { recursive: true }).catch(() => {});
        await fs.promises.writeFile(srcPath, file.content);
        console.log(`Created default file: ${srcPath}`);
      }
      if (!this.app.vault.getAbstractFileByPath(destPath)) {
        await fs.promises.mkdir(path.dirname(path.join(pluginDir, destPath)), { recursive: true }).catch(() => {});
        await this.app.vault.create(destPath, await fs.promises.readFile(srcPath, 'utf-8'));
        new Notice(`Created demo file: ${destPath}`);
      }
    }

    for (const file of tutorialFiles) {
      const srcPath = path.join(pluginDir, 'templates', file.path).replace(/\\/g, '/');
      const destPath = path.join(templatesFolderPath, file.path).replace(/\\/g, '/');
      if (!fs.existsSync(srcPath)) {
        // Create default file if missing
        await fs.promises.mkdir(path.dirname(srcPath), { recursive: true }).catch(() => {});
        await fs.promises.writeFile(srcPath, file.content);
        console.log(`Created default file: ${srcPath}`);
      }
      if (!this.app.vault.getAbstractFileByPath(destPath)) {
        await fs.promises.mkdir(path.dirname(path.join(pluginDir, destPath)), { recursive: true }).catch(() => {});
        await this.app.vault.create(destPath, await fs.promises.readFile(srcPath, 'utf-8'));
        new Notice(`Created tutorial file: ${destPath}`);
      }
    }

    // Copy js/ files to templates/js/
    const jsSrcDir = path.join(pluginDir, 'js').replace(/\\/g, '/');
    const jsDestDir = path.join(templatesFolderPath, 'js').replace(/\\/g, '/');
    if (fs.existsSync(jsSrcDir)) {
      await fs.promises.mkdir(jsDestDir, { recursive: true }).catch(() => {});
      const jsFiles = ['faceted-search.js', 'rdf-graph.js', 'rdf-render.js'];
      for (const file of jsFiles) {
        const srcPath = path.join(jsSrcDir, file).replace(/\\/g, '/');
        const destPath = path.join(jsDestDir, file).replace(/\\/g, '/');
        if (!fs.existsSync(srcPath)) {
          // Create placeholder if missing
          await fs.promises.writeFile(srcPath, '// Placeholder JavaScript file');
          console.log(`Created placeholder JS file: ${srcPath}`);
        }
        await fs.promises.copyFile(srcPath, destPath);
        new Notice(`Created JS file: ${destPath}`);
      }
    } else {
      await fs.promises.mkdir(jsSrcDir, { recursive: true }).catch(() => {});
      await fs.promises.mkdir(jsDestDir, { recursive: true }).catch(() => {});
      const jsFiles = ['faceted-search.js', 'rdf-graph.js', 'rdf-render.js'];
      for (const file of jsFiles) {
        const srcPath = path.join(jsSrcDir, file).replace(/\\/g, '/');
        const destPath = path.join(jsDestDir, file).replace(/\\/g, '/');
        await fs.promises.writeFile(srcPath, '// Placeholder JavaScript file');
        await fs.promises.copyFile(srcPath, destPath);
        console.log(`Created placeholder JS file: ${srcPath}`);
        new Notice(`Created JS file: ${destPath}`);
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
    const { exportDir, githubRepo, githubToken } = this.settings;
    const pluginDir = this.manifest.dir || path.join(this.app.vault.adapter.basePath, '.obsidian', 'plugins', 'semantic-weaver').replace(/\\/g, '/');
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
        try {
          import('./modals/MarkdownLDModal').then(({ MarkdownLDModal }) => {
            const modal = new MarkdownLDModal(this.app, this, null, async () => {}, this.settings.outputFormat);
            const { graph } = modal.parseMarkdownLD(content);
            modal.markdownLDToTurtle(content).then(turtle => {
              const turtlePath = path.join(exportDir, 'docs', 'ontology', `${file.replace('.md', '.ttl')}`).replace(/\\/g, '/');
              const jsonldPath = path.join(exportDir, 'docs', 'ontology', `${file.replace('.md', '.jsonld')}`).replace(/\\/g, '/');
              fs.promises.mkdir(path.dirname(turtlePath), { recursive: true }).then(() => {
                fs.promises.writeFile(turtlePath, turtle);
                fs.promises.writeFile(jsonldPath, JSON.stringify(graph, null, 2));
              });
            });
          });
        } catch (error) {
          new Notice(`Failed to convert Markdown-LD file ${file}: ${error.message}`);
          console.error(error);
        }
      }
    }
    if (githubRepo) {
      await deployToGitHub(this, exportDir);
    }
  }
}