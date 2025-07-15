import { Plugin, Notice } from 'obsidian';
import { SettingsManager } from './SettingsManager';
import { RDFStore } from './RDFStore';
import { ImportOntologyModal } from './modals/ImportOntologyModal';
import { NamespaceModal } from './modals/NamespaceModal';

export interface RDFPluginSettings {
  namespaces: { [key: string]: string };
}

export const DEFAULT_SETTINGS: RDFPluginSettings = {
  namespaces: {
    'ex': 'http://example.org/',
    'doc': 'http://example.org/doc/'
  }
};

export class RDFPlugin extends Plugin {
  settingsManager: SettingsManager;
  rdfStore: RDFStore;

  async onload() {
    // Initialize components
    this.settingsManager = new SettingsManager(this);
    this.rdfStore = new RDFStore();
    await this.settingsManager.loadSettings();

    // Import demo documents
    await this.importDemoDocs();

    // Register commands
    this.registerCommands();

    // Register file modification event
    this.registerEvent(
      this.app.vault.on('modify', async (file) => {
        if (file.extension === 'ttl') {
          try {
            await this.rdfStore.parseTurtleFile(this.app.vault, file);
            new Notice(`Parsed Turtle file: ${file.path}`);
          } catch (error) {
            new Notice(`Error parsing Turtle file: ${error.message}`);
          }
        }
      })
    );
  }

  async importDemoDocs() {
    const demoFolder = 'templates/demo';
    const demoFiles = [
      'demo1.md',
      'demo2.md'
    ];
    await this.app.vault.createFolder(demoFolder).catch(() => {});
    for (const fileName of demoFiles) {
      const filePath = `${demoFolder}/${fileName}`;
      if (!this.app.vault.getAbstractFileByPath(filePath)) {
        const content = `[Demo]: http://example.org/\n[Document]{typeof=ex:Document; name="Demo"}`;
        await this.app.vault.create(filePath, content);
        new Notice(`Created demo file: ${filePath}`);
      }
    }
  }

  registerCommands() {
    // Import Ontology command
    this.addCommand({
      id: 'import-ontology',
      name: 'Import Ontology from URI',
      callback: () => {
        new ImportOntologyModal(this.app, this, async (filePath: string) => {
          new Notice(`Imported ontology: ${filePath}`);
        }).open();
      }
    });

    // Manage Namespaces command
    this.addCommand({
      id: 'manage-namespaces',
      name: 'Manage RDF Namespaces',
      callback: () => {
        new NamespaceModal(this.app, this, async () => {
          new Notice('Namespaces updated');
        }).open();
      }
    });
  }

  async onunload() {
    // Clean up if needed
  }
}