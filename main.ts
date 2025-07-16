import { Plugin, Notice, Menu } from 'obsidian';
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

export class RDFPlugin extends Plugin {
  settingsManager: SettingsManager;
  rdfStore: RDFStore;
  rdfUtils: RDFUtils;

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

  addRibbonIcons() {
    this.addRibbonIcon('ri-download-line', 'Import Ontology from URI', () => {
      try {
        console.log('Opening ImportOntologyModal from ribbon');
        new ImportOntologyModal(this.app, this, async (filePath: string) => {
          new Notice(`Imported ontology: ${filePath}`);
        }).open();
      } catch (error) {
        console.error('Error opening ImportOntologyModal from ribbon:', error);
        new Notice(`Error opening Import Ontology: ${error.message}`);
      }
    });

    this.addRibbonIcon('ri-book-open-line', 'Manage RDF Namespaces', () => {
      try {
        console.log('Opening NamespaceModal from ribbon');
        new NamespaceModal(this.app, this, async () => {
          new Notice('Namespaces updated');
        }).open();
      } catch (error) {
        console.error('Error opening NamespaceModal from ribbon:', error);
        new Notice(`Error opening Manage Namespaces: ${error.message}`);
      }
    });

    this.addRibbonIcon('ri-edit-line', 'Add Annotation', () => {
      try {
        console.log('Opening AnnotationModal from ribbon');
        new AnnotationModal(this.app, this, async () => {
          new Notice('Annotation added');
        }).open();
      } catch (error) {
        console.error('Error opening AnnotationModal from ribbon:', error);
        new Notice(`Error opening Add Annotation: ${error.message}`);
      }
    });

    this.addRibbonIcon('ri-file-text-line', 'Edit CMLD Metadata', () => {
      try {
        console.log('Opening CMLDMetadataModal from ribbon');
        new CMLDMetadataModal(this.app, this, async () => {
          new Notice('CMLD metadata updated');
        }).open();
      } catch (error) {
        console.error('Error opening CMLDMetadataModal from ribbon:', error);
        new Notice(`Error opening Edit CMLD Metadata: ${error.message}`);
      }
    });

    this.addRibbonIcon('ri-upload-line', 'Configure Export', () => {
      try {
        console.log('Opening ExportConfigModal from ribbon');
        new ExportConfigModal(this.app, this, async () => {
          new Notice('Export settings updated');
        }).open();
      } catch (error) {
        console.error('Error opening ExportConfigModal from ribbon:', error);
        new Notice(`Error opening Configure Export: ${error.message}`);
      }
    });

    this.addRibbonIcon('ri-node-tree', 'Edit Semantic Canvas', () => {
      try {
        console.log('Opening SemanticCanvasModal from ribbon');
        new SemanticCanvasModal(this.app, this, async () => {
          new Notice('Canvas node properties updated');
        }).open();
      } catch (error) {
        console.error('Error opening SemanticCanvasModal from ribbon:', error);
        new Notice(`Error opening Edit Semantic Canvas: ${error.message}`);
      }
    });

    this.addRibbonIcon('ri-link', 'Edit Semantic Edge', () => {
      try {
        console.log('Opening SemanticEdgeModal from ribbon');
        new SemanticEdgeModal(this.app, this, async () => {
          new Notice('Canvas edge properties updated');
        }).open();
      } catch (error) {
        console.error('Error opening SemanticEdgeModal from ribbon:', error);
        new Notice(`Error opening Edit Semantic Edge: ${error.message}`);
      }
    });

    this.addRibbonIcon('ri-search-line', 'Run SPARQL Query', () => {
      try {
        console.log('Opening SPARQLQueryModal from ribbon');
        new SPARQLQueryModal(this.app, this, async () => {
          new Notice('SPARQL query executed');
        }).open();
      } catch (error) {
        console.error('Error opening SPARQLQueryModal from ribbon:', error);
        new Notice(`Error opening Run SPARQL Query: ${error.message}`);
      }
    });

    this.addRibbonIcon('ri-link-m', 'Lookup URI', () => {
      try {
        console.log('Opening URILookupModal from ribbon');
        new URILookupModal(this.app, this, async (uri: string) => {
          new Notice(`URI inserted: ${uri}`);
        }).open();
      } catch (error) {
        console.error('Error opening URILookupModal from ribbon:', error);
        new Notice(`Error opening Lookup URI: ${error.message}`);
      }
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
        try {
          console.log('Opening ImportOntologyModal');
          new ImportOntologyModal(this.app, this, async (filePath: string) => {
            new Notice(`Imported ontology: ${filePath}`);
          }).open();
        } catch (error) {
          console.error('Error opening ImportOntologyModal:', error);
          new Notice(`Error opening Import Ontology: ${error.message}`);
        }
      }
    });

    this.addCommand({
      id: 'manage-namespaces',
      name: 'Manage RDF Namespaces',
      callback: () => {
        try {
          console.log('Opening NamespaceModal');
          new NamespaceModal(this.app, this, async () => {
            new Notice('Namespaces updated');
          }).open();
        } catch (error) {
          console.error('Error opening NamespaceModal:', error);
          new Notice(`Error opening Manage Namespaces: ${error.message}`);
        }
      }
    });

    this.addCommand({
      id: 'add-annotation',
      name: 'Add Annotation',
      editorCallback: (editor) => {
        try {
          console.log('Opening AnnotationModal');
          new AnnotationModal(this.app, this, async () => {
            new Notice('Annotation added');
          }).open();
        } catch (error) {
          console.error('Error opening AnnotationModal:', error);
          new Notice(`Error opening Add Annotation: ${error.message}`);
        }
      }
    });

    this.addCommand({
      id: 'edit-cmld-metadata',
      name: 'Edit CMLD Metadata',
      editorCallback: (editor) => {
        try {
          console.log('Opening CMLDMetadataModal');
          new CMLDMetadataModal(this.app, this, async () => {
            new Notice('CMLD metadata updated');
          }).open();
        } catch (error) {
          console.error('Error opening CMLDMetadataModal:', error);
          new Notice(`Error opening Edit CMLD Metadata: ${error.message}`);
        }
      }
    });

    this.addCommand({
      id: 'configure-export',
      name: 'Configure Export',
      callback: () => {
        try {
          console.log('Opening ExportConfigModal');
          new ExportConfigModal(this.app, this, async () => {
            new Notice('Export settings updated');
          }).open();
        } catch (error) {
          console.error('Error opening ExportConfigModal:', error);
          new Notice(`Error opening Configure Export: ${error.message}`);
        }
      }
    });

    this.addCommand({
      id: 'edit-semantic-canvas',
      name: 'Edit Semantic Canvas',
      checkCallback: (checking) => {
        const leaf = this.app.workspace.activeLeaf;
        if (leaf && leaf.view.getViewType() === 'canvas') {
          if (!checking) {
            try {
              console.log('Opening SemanticCanvasModal');
              new SemanticCanvasModal(this.app, this, async () => {
                new Notice('Canvas node properties updated');
              }).open();
            } catch (error) {
              console.error('Error opening SemanticCanvasModal:', error);
              new Notice(`Error opening Edit Semantic Canvas: ${error.message}`);
            }
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
            try {
              console.log('Opening SemanticEdgeModal');
              new SemanticEdgeModal(this.app, this, async () => {
                new Notice('Canvas edge properties updated');
              }).open();
            } catch (error) {
              console.error('Error opening SemanticEdgeModal:', error);
              new Notice(`Error opening Edit Semantic Edge: ${error.message}`);
            }
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
        try {
          console.log('Opening SPARQLQueryModal');
          new SPARQLQueryModal(this.app, this, async () => {
            new Notice('SPARQL query executed');
          }).open();
        } catch (error) {
          console.error('Error opening SPARQLQueryModal:', error);
          new Notice(`Error opening Run SPARQL Query: ${error.message}`);
        }
      }
    });

    this.addCommand({
      id: 'lookup-uri',
      name: 'Lookup URI',
      editorCallback: (editor) => {
        try {
          console.log('Opening URILookupModal');
          new URILookupModal(this.app, this, async (uri: string) => {
            new Notice(`URI inserted: ${uri}`);
          }).open();
        } catch (error) {
          console.error('Error opening URILookupModal:', error);
          new Notice(`Error opening Lookup URI: ${error.message}`);
        }
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
              .onClick(async () => {
                try {
                  console.log(`Opening SPARQLQueryModal for ${file.path}`);
                  new SPARQLQueryModal(this.app, this, async () => {
                    new Notice(`SPARQL query executed on ${file.path}`);
                  }).open();
                } catch (error) {
                  console.error('Error opening SPARQLQueryModal:', error);
                  new Notice(`Error running SPARQL Query: ${error.message}`);
                }
              });
          });

          if (file.extension === 'md') {
            menu.addItem(item => {
              item
                .setTitle('Add Annotation')
                .setIcon('ri-notebook-line')
                .onClick(async () => {
                  try {
                    console.log(`Opening AnnotationModal for ${file.path}`);
                    new AnnotationModal(this.app, this, async () => {
                      new Notice('Annotation added');
                    }).open();
                  } catch (error) {
                    console.error('Error opening AnnotationModal:', error);
                    new Notice(`Error adding annotation: ${error.message}`);
                  }
                });
            });

            menu.addItem(item => {
              item
                .setTitle('Edit CMLD Metadata')
                .setIcon('ri-file-text-line')
                .onClick(async () => {
                  try {
                    console.log(`Opening CMLDMetadataModal for ${file.path}`);
                    new CMLDMetadataModal(this.app, this, async () => {
                      new Notice('CMLD metadata updated');
                    }).open();
                  } catch (error) {
                    console.error('Error opening CMLDMetadataModal:', error);
                    new Notice(`Error editing CMLD metadata: ${error.message}`);
                  }
                });
            });

            menu.addItem(item => {
              item
                .setTitle('Lookup URI')
                .setIcon('ri-link-m')
                .onClick(async () => {
                  try {
                    console.log(`Opening URILookupModal for ${file.path}`);
                    new URILookupModal(this.app, this, async (uri: string) => {
                      new Notice(`URI inserted: ${uri}`);
                    }).open();
                  } catch (error) {
                    console.error('Error opening URILookupModal:', error);
                    new Notice(`Error looking up URI: ${error.message}`);
                  }
                });
            });
          }

          if (file.extension === 'canvas') {
            menu.addItem(item => {
              item
                .setTitle('Edit Semantic Canvas')
                .setIcon('ri-node-tree')
                .onClick(async () => {
                  try {
                    console.log(`Opening SemanticCanvasModal for ${file.path}`);
                    new SemanticCanvasModal(this.app, this, async () => {
                      new Notice('Canvas node properties updated');
                    }).open();
                  } catch (error) {
                    console.error('Error opening SemanticCanvasModal:', error);
                    new Notice(`Error editing semantic canvas: ${error.message}`);
                  }
                });
            });

            menu.addItem(item => {
              item
                .setTitle('Edit Semantic Edge')
                .setIcon('ri-link')
                .onClick(async () => {
                  try {
                    console.log(`Opening SemanticEdgeModal for ${file.path}`);
                    new SemanticEdgeModal(this.app, this, async () => {
                      new Notice('Canvas edge properties updated');
                    }).open();
                  } catch (error) {
                    console.error('Error opening SemanticEdgeModal:', error);
                    new Notice(`Error editing semantic edge: ${error.message}`);
                  }
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

export default RDFPlugin;