import { Plugin, Notice, Menu, TFile } from 'obsidian';
import { SettingsManager } from './settings/SettingsManager';
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
import { RDFGraphView } from './views/RDFGraphView';
import { MermaidView } from './views/MermaidView';
import { RDFUtils } from './utils/RDFUtils';
import { RDFPluginSettings, DEFAULT_SETTINGS } from './settings/RDFPluginSettings';

export default class RDFPlugin extends Plugin {
  settingsManager: SettingsManager;
  rdfStore: RDFStore;
  rdfUtils: RDFUtils;
  ontologyTtl: string = ''; // Store ontology.ttl content

  async onload() {
    try {
      console.log('Initializing SettingsManager');
      this.settingsManager = new SettingsManager(this);
      console.log('Initializing RDFStore');
      this.rdfStore = new RDFStore();
      console.log('Initializing RDFUtils');
      this.rdfUtils = new RDFUtils(this);
      console.log('Loading settings');
      await this.settingsManager.loadSettings();

      console.log('Loading ontology.ttl');
      await this.loadOntologyTtl();

      console.log('Importing demo documents');
      await this.importDemoDocs();

      console.log('Adding ribbon icons');
      this.addRibbonIcons();

      console.log('Registering commands');
      this.registerCommands();

      console.log('Registering context menu');
      this.registerContextMenu();

      console.log('Registering file modification event');
      this.registerEvent(
        this.app.vault.on('modify', async (file) => {
          if (file.extension === 'ttl') {
            try {
              await this.rdfStore.parseTurtleFile(this.app.vault, file);
              new Notice(`Parsed Turtle file: ${file.path}`);
              // Reload ontologyTtl if the modified file is templates/ontology.ttl
              if (file.path === 'templates/ontology.ttl') {
                await this.loadOntologyTtl();
              }
            } catch (error) {
              new Notice(`Error parsing Turtle file: ${error.message}`);
              console.error('Error parsing Turtle file:', error);
            }
          }
        })
      );
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

  // Helper function to open modals with error handling
  private openModal(modal: new (...args: any[]) => any, ...args: any[]) {
    try {
      new modal(this.app, ...args).open();
    } catch (error) {
      new Notice(`Error opening modal: ${error.message}`);
      console.error(`Error opening modal:`, error);
    }
  }

  addRibbonIcons() {
    this.addRibbonIcon('ri-download-line', 'Import Ontology from URI', () => {
      console.log('Opening ImportOntologyModal from ribbon');
      this.openModal(ImportOntologyModal, this, (filePath: string) => {
        new Notice(`Imported ontology: ${filePath}`);
      });
    });

    this.addRibbonIcon('ri-book-open-line', 'Manage RDF Namespaces', () => {
      console.log('Opening NamespaceModal from ribbon');
      this.openModal(NamespaceModal, this, () => {
        new Notice('Namespaces updated');
      });
    });

    this.addRibbonIcon('ri-edit-line', 'Add Annotation', () => {
      console.log('Opening AnnotationModal from ribbon');
      this.openModal(AnnotationModal, this, () => {
        new Notice('Annotation added');
      });
    });

    this.addRibbonIcon('ri-file-text-line', 'Edit CMLD Metadata', () => {
      console.log('Opening CMLDMetadataModal from ribbon');
      this.openModal(CMLDMetadataModal, this, () => {
        new Notice('CMLD metadata updated');
      });
    });

    this.addRibbonIcon('ri-upload-line', 'Configure Export', () => {
      console.log('Opening ExportConfigModal from ribbon');
      this.openModal(ExportConfigModal, this, () => {
        new Notice('Export settings updated');
      });
    });

    this.addRibbonIcon('ri-node-tree', 'Edit Semantic Canvas', () => {
      console.log('Opening SemanticCanvasModal from ribbon');
      this.openModal(SemanticCanvasModal, this, () => {
        new Notice('Canvas node properties updated');
      });
    });

    this.addRibbonIcon('ri-link', 'Edit Semantic Edge', () => {
      console.log('Opening SemanticEdgeModal from ribbon');
      this.openModal(SemanticEdgeModal, this, () => {
        new Notice('Canvas edge properties updated');
      });
    });

    this.addRibbonIcon('ri-search-line', 'Run SPARQL Query', () => {
      console.log('Opening SPARQLQueryModal from ribbon');
      this.openModal(SPARQLQueryModal, this, () => {
        new Notice('SPARQL query executed');
      });
    });

    this.addRibbonIcon('ri-link-m', 'Lookup URI', () => {
      console.log('Opening URILookupModal from ribbon');
      this.openModal(URILookupModal, this.settingsManager.namespaces, this.ontologyTtl, (uri: string) => {
        new Notice(`URI inserted: ${uri}`);
      });
    });

    this.addRibbonIcon('ri-git-branch-line', 'Open RDF Graph View (2D/3D)', () => {
      try {
        console.log('Opening RDFGraphView from ribbon');
        new Notice('RDF Graph View not implemented');
        // TODO: Instantiate RDFGraphView when available
        // e.g., new RDFGraphView(this.app).open();
      } catch (error) {
        console.error('Error opening RDFGraphView from ribbon:', error);
        new Notice(`Error opening RDF Graph View: ${error.message}`);
      }
    });

    this.addRibbonIcon('ri-flow-chart', 'Open Mermaid Diagram View', () => {
      try {
        console.log('Opening MermaidView from ribbon');
        new Notice('Mermaid Diagram View not implemented');
        // TODO: Instantiate MermaidView when available
        // e.g., new MermaidView(this.app).open();
      } catch (error) {
        console.error('Error opening MermaidView from ribbon:', error);
        new Notice(`Error opening Mermaid Diagram View: ${error.message}`);
      }
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
        console.log('Opening AnnotationModal');
        this.openModal(AnnotationModal, this, () => {
          new Notice('Annotation added');
        });
      }
    });

    this.addCommand({
      id: 'edit-cmld-metadata',
      name: 'Edit CMLD Metadata',
      editorCallback: (editor) => {
        console.log('Opening CMLDMetadataModal');
        this.openModal(CMLDMetadataModal, this, () => {
          new Notice('CMLD metadata updated');
        });
      }
    });

    this.addCommand({
      id: 'configure-export',
      name: 'Configure Export',
      callback: () => {
        console.log('Opening ExportConfigModal');
        this.openModal(ExportConfigModal, this, () => {
          new Notice('Export settings updated');
        });
      }
    });

    this.addCommand({
      id: 'edit-semantic-canvas',
      name: 'Edit Semantic Canvas',
      checkCallback: (checking) => {
        const leaf = this.app.workspace.activeLeaf;
        if (leaf && leaf.view.getViewType() === 'canvas') {
          if (!checking) {
            console.log('Opening SemanticCanvasModal');
            this.openModal(SemanticCanvasModal, this, () => {
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
        const leaf = this.app.workspace.activeLeaf;
        if (leaf && leaf.view.getViewType() === 'canvas') {
          if (!checking) {
            console.log('Opening SemanticEdgeModal');
            this.openModal(SemanticEdgeModal, this, () => {
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
      callback: () => {
        console.log('Opening SPARQLQueryModal');
        this.openModal(SPARQLQueryModal, this, () => {
          new Notice('SPARQL query executed');
        });
      }
    });

    this.addCommand({
      id: 'lookup-uri',
      name: 'Lookup URI',
      editorCallback: (editor) => {
        console.log('Opening URILookupModal');
        this.openModal(URILookupModal, this.settingsManager.namespaces, this.ontologyTtl, (uri: string) => {
          new Notice(`URI inserted: ${uri}`);
        });
      }
    });

    this.addCommand({
      id: 'open-rdf-graph',
      name: 'Open RDF Graph View (2D/3D)',
      callback: () => {
        try {
          console.log('Opening RDFGraphView');
          new Notice('RDF Graph View not implemented');
          // TODO: Instantiate RDFGraphView when available
        } catch (error) {
          console.error('Error opening RDFGraphView:', error);
          new Notice(`Error opening RDF Graph View: ${error.message}`);
        }
      }
    });

    this.addCommand({
      id: 'open-mermaid-diagram',
      name: 'Open Mermaid Diagram View',
      callback: () => {
        try {
          console.log('Opening MermaidView');
          new Notice('Mermaid Diagram View not implemented');
          // TODO: Instantiate MermaidView when available
        } catch (error) {
          console.error('Error opening MermaidView:', error);
          new Notice(`Error opening Mermaid Diagram View: ${error.message}`);
        }
      }
    });
  }

  registerContextMenu() {
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu: Menu, file) => {
        if (file.extension === 'canvas' || file.extension === 'md') {
          menu.addItem(item => {
            item
              .setTitle('Run SPARQL Query')
              .setIcon('ri-search-line')
              .onClick(() => {
                console.log(`Opening SPARQLQueryModal for ${file.path}`);
                this.openModal(SPARQLQueryModal, this, () => {
                  new Notice(`SPARQL query executed on ${file.path}`);
                });
              });
          });

          if (file.extension === 'md') {
            menu.addItem(item => {
              item
                .setTitle('Add Annotation')
                .setIcon('ri-notebook-line')
                .onClick(() => {
                  console.log(`Opening AnnotationModal for ${file.path}`);
                  this.openModal(AnnotationModal, this, () => {
                    new Notice('Annotation added');
                  });
                });
            });

            menu.addItem(item => {
              item
                .setTitle('Edit CMLD Metadata')
                .setIcon('ri-file-text-line')
                .onClick(() => {
                  console.log(`Opening CMLDMetadataModal for ${file.path}`);
                  this.openModal(CMLDMetadataModal, this, () => {
                    new Notice('CMLD metadata updated');
                  });
                });
            });

            menu.addItem(item => {
              item
                .setTitle('Lookup URI')
                .setIcon('ri-link-m')
                .onClick(() => {
                  console.log(`Opening URILookupModal for ${file.path}`);
                  this.openModal(URILookupModal, this.settingsManager.namespaces, this.ontologyTtl, (uri: string) => {
                    new Notice(`URI inserted: ${uri}`);
                  });
                });
            });
          }

          if (file.extension === 'canvas') {
            menu.addItem(item => {
              item
                .setTitle('Edit Semantic Canvas')
                .setIcon('ri-node-tree')
                .onClick(() => {
                  console.log(`Opening SemanticCanvasModal for ${file.path}`);
                  this.openModal(SemanticCanvasModal, this, () => {
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
                  this.openModal(SemanticEdgeModal, this, () => {
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
    // Clean up if needed
  }
}