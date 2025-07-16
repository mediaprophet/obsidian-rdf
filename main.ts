import { Plugin, Notice, Menu, TFile, WorkspaceLeaf } from 'obsidian';
import { SettingsManager, RDFPluginSettings, DEFAULT_SETTINGS } from './settings/SettingsManager';
import { RDFStore } from './utils/RDFStore';
import { ImportOntologyModal } from './modals/ImportOntologyModal';
import { NamespaceModal } from './modals/NamespaceModal';
import { AnnotationModal } from './modals/AnnotationModal';
import { CMLDMetadataModal } from './modals/CMLDMetadataModal';
import { ExportConfigModal } from './modals/ExportConfigModal';
import { SemanticCanvasModal } from './modals/SemanticCanvasModal';
import { SemanticEdgeModal } from './modals/SemanticEdgeModal';
import { SPARQLQueryModal } from './modals/SPARQLQueryModal';
import { URILookupModal } from './modals/URILookupModal';
import { RDFGraphView, RDF_GRAPH_VIEW } from './views/RDFGraphView';
import { MermaidView, MERMAID_VIEW_TYPE } from './views/MermaidView';
import { RDFUtils } from './utils/RDFUtils';

export default class RDFPlugin extends Plugin {
  settingsManager: SettingsManager;
  rdfStore: RDFStore;
  rdfUtils: RDFUtils;
  ontologyTtl: string = ''; // Store ontology.ttl content

  async onload() {
    try {
      console.log('Starting RDFPlugin onload');
      console.log('Initializing SettingsManager');
      this.settingsManager = new SettingsManager(this);
      console.log('Initializing RDFStore');
      this.rdfStore = new RDFStore();
      console.log('Initializing RDFUtils');
      this.rdfUtils = new RDFUtils(this);
      console.log('Loading settings');
      try {
        await this.settingsManager.loadSettings();
        console.log('Settings loaded:', this.settingsManager.getNamespaces());
      } catch (error) {
        console.error('Failed to load settings:', error);
        new Notice('Error loading plugin settings');
      }

      console.log('Loading ontology.ttl');
      try {
        await this.loadOntologyTtl();
        console.log('Ontology TTL loaded:', this.ontologyTtl.slice(0, 100) + '...');
      } catch (error) {
        console.error('Failed to load ontology:', error);
        new Notice('Error loading ontology file');
      }

      console.log('Importing demo documents');
      try {
        await this.importDemoDocs();
        console.log('Demo documents imported');
      } catch (error) {
        console.error('Failed to import demo documents:', error);
        new Notice('Error importing demo documents');
      }

      console.log('Registering views');
      try {
        this.registerViews();
        console.log('Views registered');
      } catch (error) {
        console.error('Failed to register views:', error);
        new Notice('Error registering views');
      }

      console.log('Adding ribbon icons');
      try {
        this.addRibbonIcons();
        console.log('Ribbon icons added');
      } catch (error) {
        console.error('Failed to add ribbon icons:', error);
        new Notice('Error adding ribbon icons');
      }

      console.log('Registering commands');
      try {
        this.registerCommands();
        console.log('Commands registered');
      } catch (error) {
        console.error('Failed to register commands:', error);
        new Notice('Error registering commands');
      }

      console.log('Registering context menu');
      try {
        this.registerContextMenu();
        console.log('Context menu registered');
      } catch (error) {
        console.error('Failed to register context menu:', error);
        new Notice('Error registering context menu');
      }

      console.log('Registering file modification event');
      this.registerEvent(
        this.app.vault.on('modify', async (file) => {
          if (file.extension === 'ttl') {
            try {
              await this.rdfStore.parseTurtleFile(this.app.vault, file);
              new Notice(`Parsed Turtle file: ${file.path}`);
              if (file.path === 'templates/ontology.ttl') {
                await this.loadOntologyTtl();
                console.log('Reloaded ontology TTL after modification');
              }
            } catch (error) {
              new Notice(`Error parsing Turtle file: ${error.message}`);
              console.error('Error parsing Turtle file:', error);
            }
          }
        })
      );
      console.log('RDFPlugin onload completed');
    } catch (error) {
      console.error('Error in RDFPlugin.onload:', error);
      new Notice(`Failed to load Semantic Weaver: ${error.message}`);
      throw error;
    }
  }

  async loadOntologyTtl() {
    const ontologyPath = 'templates/ontology.ttl';
    const ontologyFile = this.app.vault.getAbstractFileByPath(ontologyPath);
    if (ontologyFile instanceof TFile) {
      try {
        this.ontologyTtl = await this.app.vault.read(ontologyFile);
      } catch (error) {
        console.error('Error reading ontology.ttl:', error);
        new Notice('Error reading ontology file');
        this.ontologyTtl = '';
      }
    } else {
      console.warn('Ontology file not found:', ontologyPath);
      this.ontologyTtl = '';
    }
  }

  async importDemoDocs() {
    const demoFolder = 'templates/demo';
    const ontologyFolder = 'templates/ontology';
    const demoFiles = [
      'demo1.md',
      'demo2.md',
      'example-canvas.canvas',
      'ontology.ttl',
      'ontology/example-ontology.md',
      'getting-started.md',
      'tutorials/authoring-cml-cmld.md'
    ];
    await this.app.vault.createFolder(demoFolder).catch(() => {});
    await this.app.vault.createFolder(ontologyFolder).catch(() => {});
    for (const fileName of demoFiles) {
      const filePath = fileName.startsWith('ontology/') || fileName.startsWith('tutorials/') ? `templates/${fileName}` : `${demoFolder}/${fileName}`;
      if (!this.app.vault.getAbstractFileByPath(filePath)) {
        const content = fileName.endsWith('.ttl') ?
          `@prefix ex: <http://example.org/> .\nex:Document a ex:Type ; ex:name "Demo" .` :
          fileName.endsWith('.canvas') ?
            JSON.stringify({ nodes: [], edges: [] }) :
            `[Demo]: http://example.org/\n[Document]{typeof=ex:Document; name="Demo"}`;
        await this.app.vault.create(filePath, content);
        new Notice(`Created demo file: ${filePath}`);
      }
    }
  }

  registerViews() {
    console.log('Registering RDFGraphView');
    this.registerView(RDF_GRAPH_VIEW, (leaf) => new RDFGraphView(leaf, this));
    console.log('Registering MermaidView');
    this.registerView(MERMAID_VIEW_TYPE, (leaf) => new MermaidView(leaf, this));
  }

  // Helper function to open modals with error handling
  private openModal(modal: new (...args: any[]) => any, ...args: any[]) {
    try {
      new modal(this.app, ...args).open();
      console.log(`Opened modal: ${modal.name}`);
    } catch (error) {
      new Notice(`Error opening modal: ${error.message}`);
      console.error(`Error opening modal ${modal.name}:`, error);
    }
  }

  private openView(viewType: string) {
    try {
      const leaf = this.app.workspace.getLeaf('tab');
      leaf.setViewState({ type: viewType, active: true });
      console.log(`Opened view: ${viewType}`);
    } catch (error) {
      new Notice(`Error opening view ${viewType}: ${error.message}`);
      console.error(`Error opening view ${viewType}:`, error);
    }
  }

  addRibbonIcons() {
    console.log('Adding Import Ontology ribbon icon');
    this.addRibbonIcon('ri-download-line', 'Import Ontology from URI', () => {
      console.log('Opening ImportOntologyModal from ribbon');
      this.openModal(ImportOntologyModal, this, (filePath: string) => {
        new Notice(`Imported ontology: ${filePath}`);
      });
    });

    console.log('Adding Manage RDF Namespaces ribbon icon');
    this.addRibbonIcon('ri-book-open-line', 'Manage RDF Namespaces', () => {
      console.log('Opening NamespaceModal from ribbon');
      this.openModal(NamespaceModal, this, () => {
        new Notice('Namespaces updated');
      });
    });

    console.log('Adding Add Annotation ribbon icon');
    this.addRibbonIcon('ri-edit-line', 'Add Annotation', () => {
      const editor = this.app.workspace.activeEditor?.editor;
      const selection = editor ? editor.getSelection() : '';
      if (!selection) {
        new Notice('No text selected for annotation');
        return;
      }
      console.log('Opening AnnotationModal from ribbon');
      this.openModal(AnnotationModal, selection, (annotation: string) => {
        new Notice('Annotation added: ' + annotation);
      });
    });

    console.log('Adding Edit CMLD Metadata ribbon icon');
    this.addRibbonIcon('ri-file-text-line', 'Edit CMLD Metadata', () => {
      const file = this.app.workspace.getActiveFile();
      if (file && file.extension === 'md') {
        (async () => {
          const content = await this.app.vault.read(file);
          const metadata = this.rdfUtils.extractCMLDMetadata(content);
          console.log('Opening CMLDMetadataModal from ribbon');
          this.openModal(CMLDMetadataModal, file, metadata, async (newMetadata: { [key: string]: string }) => {
            await this.rdfUtils.updateCMLDMetadata(file, newMetadata);
            new Notice('CMLD metadata updated');
          });
        })();
      } else {
        new Notice('No Markdown file active for CMLD metadata edit');
      }
    });

    console.log('Adding Configure Export ribbon icon');
    this.addRibbonIcon('ri-upload-line', 'Configure Export', () => {
      console.log('Opening ExportConfigModal from ribbon');
      this.openModal(ExportConfigModal, this.settingsManager.settings, async (updatedSettings: RDFPluginSettings) => {
        this.settingsManager.settings = updatedSettings;
        await this.settingsManager.saveSettings();
        new Notice('Export settings updated');
      });
    });

    console.log('Adding Edit Semantic Canvas ribbon icon');
    this.addRibbonIcon('ri-node-tree', 'Edit Semantic Canvas', () => {
      const file = this.app.workspace.getActiveFile();
      if (file && file.extension === 'canvas') {
        console.log('Opening SemanticCanvasModal from ribbon');
        this.openModal(SemanticCanvasModal, this, file, (nodeId: string, type: string, properties: { [key: string]: string }) => {
          new Notice('Canvas node properties updated');
        });
      } else {
        new Notice('No canvas file active');
      }
    });

    console.log('Adding Edit Semantic Edge ribbon icon');
    this.addRibbonIcon('ri-link', 'Edit Semantic Edge', () => {
      const file = this.app.workspace.getActiveFile();
      if (file && file.extension === 'canvas') {
        console.log('Opening SemanticEdgeModal from ribbon');
        this.openModal(SemanticEdgeModal, this, file, (edgeId: string, predicate: string) => {
          new Notice('Canvas edge properties updated');
        });
      } else {
        new Notice('No canvas file active');
      }
    });

    console.log('Adding Run SPARQL Query ribbon icon');
    this.addRibbonIcon('ri-search-line', 'Run SPARQL Query', () => {
      const file = this.app.workspace.getActiveFile();
      if (file && (file.extension === 'canvas' || file.extension === 'ttl')) {
        console.log('Opening SPARQLQueryModal from ribbon');
        this.openModal(SPARQLQueryModal, this, file, async (query: string) => {
          const results = await this.rdfUtils.executeSPARQL(this.rdfStore, query);
          new Notice('SPARQL results: ' + JSON.stringify(results, null, 2));
        });
      } else {
        new Notice('No canvas or TTL file active for SPARQL query');
      }
    });

    console.log('Adding Lookup URI ribbon icon');
    this.addRibbonIcon('ri-link-m', 'Lookup URI', () => {
      console.log('Opening URILookupModal from ribbon');
      this.openModal(URILookupModal, this.settingsManager.getNamespaces(), this.ontologyTtl, (uri: string) => {
        new Notice(`URI inserted: ${uri}`);
      });
    });

    console.log('Adding RDF Graph View ribbon icon');
    this.addRibbonIcon('ri-git-branch-line', 'Open RDF Graph View (2D/3D)', () => {
      console.log('Opening RDFGraphView from ribbon');
      this.openView(RDF_GRAPH_VIEW);
    });

    console.log('Adding Mermaid Diagram View ribbon icon');
    this.addRibbonIcon('ri-flow-chart', 'Open Mermaid Diagram View', () => {
      console.log('Opening MermaidView from ribbon');
      this.openView(MERMAID_VIEW_TYPE);
    });
  }

  registerCommands() {
    this.addCommand({
      id: 'import-ontology',
      name: 'Import Ontology from URI',
      callback: () => {
        console.log('Opening ImportOntologyModal');
        this.openModal(ImportOntologyModal, this, (filePath: string) => {
          new Notice(`Imported ontology: ${filePath}`);
        });
      }
    });

    this.addCommand({
      id: 'manage-namespaces',
      name: 'Manage RDF Namespaces',
      callback: () => {
        console.log('Opening NamespaceModal');
        this.openModal(NamespaceModal, this, () => {
          new Notice('Namespaces updated');
        });
      }
    });

    this.addCommand({
      id: 'add-annotation',
      name: 'Add Annotation',
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        if (!selection) {
          new Notice('No text selected for annotation');
          return;
        }
        console.log('Opening AnnotationModal');
        this.openModal(AnnotationModal, selection, (annotation: string) => {
          new Notice('Annotation added: ' + annotation);
        });
      }
    });

    this.addCommand({
      id: 'edit-cmld-metadata',
      name: 'Edit CMLD Metadata',
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (file && file.extension === 'md') {
          if (!checking) {
            (async () => {
              const content = await this.app.vault.read(file);
              const metadata = this.rdfUtils.extractCMLDMetadata(content);
              console.log('Opening CMLDMetadataModal');
              this.openModal(CMLDMetadataModal, file, metadata, async (newMetadata: { [key: string]: string }) => {
                await this.rdfUtils.updateCMLDMetadata(file, newMetadata);
                new Notice('CMLD metadata updated');
              });
            })();
          }
          return true;
        }
        return false;
      }
    });

    this.addCommand({
      id: 'configure-export',
      name: 'Configure Export',
      callback: () => {
        console.log('Opening ExportConfigModal');
        this.openModal(ExportConfigModal, this.settingsManager.settings, async (updatedSettings: RDFPluginSettings) => {
          this.settingsManager.settings = updatedSettings;
          await this.settingsManager.saveSettings();
          new Notice('Export settings updated');
        });
      }
    });

    this.addCommand({
      id: 'edit-semantic-canvas',
      name: 'Edit Semantic Node',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (file && file.extension === 'canvas') {
          if (!checking) {
            console.log('Opening SemanticCanvasModal');
            this.openModal(SemanticCanvasModal, this, file, (nodeId: string, type: string, properties: { [key: string]: string }) => {
              new Notice('Canvas node properties updated');
            });
          }
          return true;
        }
        return false;
      }
    });

    this.addCommand({
      id: 'edit-semantic-edge',
      name: 'Edit Semantic Edge',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (file && file.extension === 'canvas') {
          if (!checking) {
            console.log('Opening SemanticEdgeModal');
            this.openModal(SemanticEdgeModal, this, file, (edgeId: string, predicate: string) => {
              new Notice('Canvas edge properties updated');
            });
          }
          return true;
        }
        return false;
      }
    });

    this.addCommand({
      id: 'run-sparql-query',
      name: 'Run SPARQL Query',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (file && (file.extension === 'canvas' || file.extension === 'ttl')) {
          if (!checking) {
            console.log('Opening SPARQLQueryModal');
            this.openModal(SPARQLQueryModal, this, file, async (query: string) => {
              const results = await this.rdfUtils.executeSPARQL(this.rdfStore, query);
              new Notice('SPARQL results: ' + JSON.stringify(results, null, 2));
            });
          }
          return true;
        }
        return false;
      }
    });

    this.addCommand({
      id: 'lookup-uri',
      name: 'Lookup URI',
      editorCallback: (editor) => {
        console.log('Opening URILookupModal');
        this.openModal(URILookupModal, this.settingsManager.getNamespaces(), this.ontologyTtl, (uri: string) => {
          editor.replaceSelection(`[${uri.split('/').pop()}]`);
          new Notice(`URI inserted: ${uri}`);
        });
      }
    });

    this.addCommand({
      id: 'open-rdf-graph',
      name: 'Open RDF Graph View (2D/3D)',
      callback: () => {
        console.log('Opening RDFGraphView');
        this.openView(RDF_GRAPH_VIEW);
      }
    });

    this.addCommand({
      id: 'open-mermaid-diagram',
      name: 'Open Mermaid Diagram View',
      callback: () => {
        console.log('Opening MermaidView');
        this.openView(MERMAID_VIEW_TYPE);
      }
    });
  }

  registerContextMenu() {
    console.log('Registering context menu for files');
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu: Menu, file) => {
        if (file.extension === 'canvas' || file.extension === 'md') {
          console.log(`Adding context menu items for ${file.path}`);
          menu.addItem(item => {
            item
              .setTitle('Run SPARQL Query')
              .setIcon('ri-search-line')
              .onClick(() => {
                console.log(`Opening SPARQLQueryModal for ${file.path}`);
                this.openModal(SPARQLQueryModal, this, file, async (query: string) => {
                  const results = await this.rdfUtils.executeSPARQL(this.rdfStore, query);
                  new Notice('SPARQL results: ' + JSON.stringify(results, null, 2));
                });
              });
          });

          if (file.extension === 'md') {
            menu.addItem(item => {
              item
                .setTitle('Add Annotation')
                .setIcon('ri-notebook-line')
                .onClick(() => {
                  const editor = this.app.workspace.activeEditor?.editor;
                  const selection = editor ? editor.getSelection() : '';
                  if (!selection) {
                    new Notice('No text selected for annotation');
                    return;
                  }
                  console.log(`Opening AnnotationModal for ${file.path}`);
                  this.openModal(AnnotationModal, selection, (annotation: string) => {
                    new Notice('Annotation added');
                  });
                });
            });

            menu.addItem(item => {
              item
                .setTitle('Edit CMLD Metadata')
                .setIcon('ri-file-text-line')
                .onClick(() => {
                  (async () => {
                    const content = await this.app.vault.read(file);
                    const metadata = this.rdfUtils.extractCMLDMetadata(content);
                    console.log(`Opening CMLDMetadataModal for ${file.path}`);
                    this.openModal(CMLDMetadataModal, file, metadata, async (newMetadata: { [key: string]: string }) => {
                      await this.rdfUtils.updateCMLDMetadata(file, newMetadata);
                      new Notice('CMLD metadata updated');
                    });
                  })();
                });
            });

            menu.addItem(item => {
              item
                .setTitle('Lookup URI')
                .setIcon('ri-link-m')
                .onClick(() => {
                  console.log(`Opening URILookupModal for ${file.path}`);
                  this.openModal(URILookupModal, this.settingsManager.getNamespaces(), this.ontologyTtl, (uri: string) => {
                    new Notice(`URI inserted: ${uri}`);
                  });
                });
            });
          }

          if (file.extension === 'canvas') {
            menu.addItem(item => {
              item
                .setTitle('Edit Semantic Node')
                .setIcon('ri-node-tree')
                .onClick(() => {
                  console.log(`Opening SemanticCanvasModal for ${file.path}`);
                  this.openModal(SemanticCanvasModal, this, file, (nodeId: string, type: string, properties: { [key: string]: string }) => {
                    new Notice('Canvas node properties updated');
                  });
                });
            });

            menu.addItem(item => {
              item
                .setTitle('Edit Semantic Edge')
                .setIcon('ri-link')
                .onClick(() => {
                  console.log(`Opening SemanticEdgeModal for ${file.path}`);
                  this.openModal(SemanticEdgeModal, this, file, (edgeId: string, predicate: string) => {
                    new Notice('Canvas edge properties updated');
                  });
                });
            });
          }
        }
      })
    );
  }

  async onunload() {
    console.log('Unloading RDFPlugin');
  }
}