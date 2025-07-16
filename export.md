---

## ImportOntologyModal.ts

```typescript
...existing code...
```

---

## modals/NamespaceModal.ts

```typescript
import { App, Modal, Setting, Notice, TextComponent } from 'obsidian';
import { RDFPlugin } from '../main';
import { SettingsManager } from '../settings/SettingsManager';

export class NamespaceModal extends Modal {
  plugin: RDFPlugin;
  settingsManager: SettingsManager;
  onSubmit: () => void;

  constructor(app: App, plugin: RDFPlugin, onSubmit: () => void) {
    super(app);
    this.plugin = plugin;
    this.settingsManager = plugin.settingsManager;
    this.onSubmit = onSubmit;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('semantic-weaver-modal');
    contentEl.createEl('h2', { text: 'Manage RDF Namespaces' });

    const namespaces = this.settingsManager.getNamespaces();
    const validationEl = contentEl.createEl('div', { cls: 'semantic-weaver-validation' });

    // Display existing namespaces
    for (const [prefix, uri] of Object.entries(namespaces)) {
      new Setting(contentEl)
        .setName(`Namespace: ${prefix}`)
        .setDesc(`URI: ${uri}`)
        .setClass('semantic-weaver-setting')
        .addText(text => text
          .setValue(uri)
          .setPlaceholder('http://example.org/')
          .onChange(async (value) => {
            if (value.trim()) {
              namespaces[prefix] = value.trim();
            } else {
              delete namespaces[prefix];
            }
          }))
        .addButton(button => button
          .setButtonText('Remove')
          .setWarning()
          .onClick(async () => {
            delete namespaces[prefix];
            await this.settingsManager.updateNamespaces(namespaces);
            this.close();
            this.open();
          }));
    }

    // Add new namespace
    let newPrefix = '';
    let newUri = '';
    new Setting(contentEl)
      .setName('New Namespace')
      .setDesc('Add a new namespace prefix and URI.')
      .setClass('semantic-weaver-setting')
      .addText(text => {
        const prefixInput = text
          .setPlaceholder('Prefix (e.g., ex)')
          .onChange(value => (newPrefix = value.trim()));
        prefixInput.inputEl.addClass('semantic-weaver-input');
        return prefixInput;
      })
      .addText(text => {
        const uriInput = text
          .setPlaceholder('URI (e.g., http://example.org/)')
          .onChange(value => (newUri = value.trim()));
        uriInput.inputEl.addClass('semantic-weaver-input');
        return uriInput;
      })
      .addButton(button => button
        .setButtonText('Add')
        .setCta()
        .onClick(async () => {
          if (!newPrefix || !newUri) {
            validationEl.setText('Error: Both prefix and URI are required.');
            return;
          }
          if (!newPrefix.match(/^[a-zA-Z0-9_-]+$/)) {
            validationEl.setText('Error: Prefix must contain only letters, numbers, underscores, or hyphens.');
            return;
          }
          if (!newUri.match(/^https?:\/\/.+/)) {
            validationEl.setText('Error: URI must be a valid URL.');
            return;
          }
          if (namespaces[newPrefix]) {
            validationEl.setText(`Error: Prefix ${newPrefix} already exists.`);
            return;
          }
          namespaces[newPrefix] = newUri;
          await this.settingsManager.updateNamespaces(namespaces);
          validationEl.setText(`Added namespace: ${newPrefix}`);
          this.close();
          this.open();
        }));

    // Buttons
    new Setting(contentEl)
      .setClass('semantic-weaver-button-group')
      .addButton(button => button
        .setButtonText('Save')
        .setCta()
        .onClick(async () => {
          await this.settingsManager.updateNamespaces(namespaces);
          this.onSubmit();
          this.close();
        }))
      .addButton(button => button
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
  }
}
```

---

## RDFStore.ts

```typescript
import { Vault } from 'obsidian';
import * as N3 from 'n3';
import { TFile } from 'obsidian';

export class RDFStore {
  private quads: N3.Quad[] = [];

  async addQuads(quads: N3.Quad[]) {
    this.quads.push(...quads);
    // Future: Persist to storage or integrate with RDF dataset
  }

  async parseTurtleFile(vault: Vault, file: TFile) {
    const content = await vault.read(file);
    const parser = new N3.Parser();
    const quads = await new Promise<N3.Quad[]>((resolve, reject) => {
      const quads: N3.Quad[] = [];
      parser.parse(content, (error, quad, prefixes) => {
        if (error) reject(error);
        if (quad) quads.push(quad);
        else resolve(quads);
      });
    });
    await this.addQuads(quads);
  }

  getQuads(): N3.Quad[] {
    return this.quads;
  }
}
```

---

## obsidian.d.ts

```typescript
// Minimal Obsidian Modal API type declarations for plugin development
// This is a stub for type safety. For full types, use the official API.
declare module 'obsidian' {
  export class Modal {
    app: any;
    contentEl: HTMLElement;
    open(): void;
    close(): void;
    onOpen(): void;
    onClose(): void;
  }
  // Patch for modal classes with .open()
  export interface Modal {
    open(): void;
  }
  export class Setting {
    constructor(containerEl: HTMLElement);
    setName(name: string): this;
    setDesc(desc: string): this;
    addText(cb: (text: any) => any): this;
    addTextArea(cb: (text: any) => any): this;
    addDropdown(cb: (dropdown: any) => any): this;
    addButton(cb: (btn: any) => any): this;
    addToggle(cb: (toggle: any) => any): this;
  }
  export class Plugin {
    app: any;
    addCommand(cmd: { id: string; name: string; callback: (...args: any[]) => void | Promise<void>; }): void;
    addSettingTab(tab: any): void;
    registerView(type: string, viewCreator: (leaf: any) => any): void;
    registerEvent(eventRef: any): void;
    loadData(): Promise<any>;
    saveData(data: any): Promise<void>;
  }
  export interface App {}
  export interface TFile {}
}
// Patch HTMLElement for Obsidian plugin API
interface HTMLElement {
  createEl(tag: string, options?: any): HTMLElement;
  createDiv(options?: any): HTMLElement;
  empty(): void;
}

```

## templates/mkdocs.yaml

```yaml
site_name: Semantic Weaver
site_url: {}
theme:
  name: material
  features:
    - content.code.copy
    - content.tabs
    - navigation.tabs
    - navigation.sections
    - navigation.top
plugins:
  - search
  - mdx:
      source_dir: docs
      output_dir: site
markdown_extensions:
  - pymdownx.tasklist:
      custom_checkbox: true
  - pymdownx.superfences
  - pymdownx.tabbed
  - pymdownx.blocks
  - pymdownx.emoji
  - attr_list
  - def_list
  - admonition
  - pymdownx.highlight:
      use_pygments: true
  - pymdownx.inlinehilite
nav:
  - Home: index.md
  - Getting Started: getting-started.md
  - Tutorials:
      - Authoring CML/CMLD: tutorials/authoring-cml-cmld.md
      - Metadata UI: tutorials/metadata-ui.md
      - Mermaid Diagrams: tutorials/mermaid-diagrams.md
      - Faceted Search: tutorials/faceted-search.md
      - Deployment: tutorials/deployment.md
      - Solid Pod Integration: tutorials/solid-pod.md
      - RDF Graph Visualization: tutorials/rdf-graph.md
      - Semantic Canvas Mode: tutorials/semantic-canvas.md
```
# Semantic Weaver Project Export

---

## README.md

````markdown
# Semantic Weaver

**Semantic Weaver** is an Obsidian plugin for managing RDF-based ontologies, annotating notes and canvases with semantic metadata, visualizing RDF graphs and Mermaid diagrams, querying data with SPARQL, and exporting RDF-enhanced documentation to MkDocs with optional GitHub Pages deployment. It uses **Context Markup Language (CML)** and **Context Markup Language for Documentation (CMLD)** to add contextual RDF metadata to Markdown notes, addressing ambiguities in unstructured text or linked-data ontologies (e.g., language or regional differences). The plugin also supports defining and importing ontologies in Markdown using Markdown-LD syntax with RDF-Star support.

## Features

- **Ontology Management**:
  - Load and edit RDF ontologies in Turtle format (`templates/ontology.ttl`) or Markdown-LD (`templates/ontology/*.md`).
  - Define namespaces (e.g., `ex:`, `doc:`) and terms (e.g., `doc:Document`, `ex:Person`) via a modern UI with autocomplete and validation.
  - Create Markdown ontologies via the **Create Markdown Ontology** ribbon icon (`ri-file-text-line`).
  - Import ontologies from a URI (Turtle or JSON-LD) and convert to Markdown-LD via the **Import Ontology from URI** ribbon icon (`ri-download-line`).
- **Context Markup Language (CML/CMLD)**:
  - Annotate notes with CML for contextual RDF metadata, e.g., `[Washington]{ex:refersTo=ex:State_Washington}`.
  - Use CMLD for document metadata, e.g., `@doc [Note] category: "Documentation"; author: [John]`.
  - Supports RDF-Star for annotating triples, e.g., `<<[Node1] ex:relatedTo [Node2]>> ex:certainty="0.9"`.
  - See [CML](https://mediaprophet.github.io/init-draft-standards-wip/cml/) and [CMLD](https://mediaprophet.github.io/init-draft-standards-wip/CMLD/) for specifications.
- **Semantic Canvas Editing**:
  - Enable **Semantic Canvas Mode** to annotate canvas nodes and edges with RDF types and predicates (e.g., `doc:category`, `ex:relatedTo`).
  - Supports fragment identifiers (e.g., `http://example.org/doc/Note#section1`).
- **SPARQL Querying**:
  - Run SPARQL queries on canvas RDF data via the canvas context menu (`ri-search-line`).
- **RDF Graph Visualization**:
  - Visualize RDF triples using Cytoscape with interactive features (e.g., expand neighbors, view attributes) via **Open RDF Graph View** (`ri-git-branch-line`).
- **Mermaid Diagram Visualization**:
  - Visualize canvas RDF data as Mermaid flowcharts via **Open Mermaid Diagram View** (`ri-flow-chart`).
  - Select from available canvas files, with support for RDF properties (e.g., `doc:category`, `ex:certainty`).
- **MkDocs Export**:
  - Export notes, canvases, and ontologies as RDF-enhanced MkDocs documentation in Turtle or JSON-LD formats via **Export RDF Docs** (`ri-upload-line`).
  - Deploy to GitHub Pages using a configured repository and optional Personal Access Token.
- **Content Negotiation**:
  - Serve exported files with `server.js` for Turtle or JSON-LD access via HTTP content negotiation.
- **Improved UI**:
  - Modern, user-friendly forms for ontology management with autocomplete, validation, and clear feedback.
  - Custom icons for all commands and views using Remix Icon set for a consistent look.

## Installation

1. **Clone the Repository**:
   ```bash
   cd YourVaultFolder/.obsidian/plugins
   git clone https://github.com/mediaprophet/obsidian-semantic-weaver.git
   cd semantic-weaver
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```
   Required dependencies:
   - `n3` (^1.17.2) for RDF parsing.
   - `cytoscape` (^3.30.2) and `cytoscape-context-menus` (^4.2.0) for RDF graph visualization.
   - `mermaid` (^10.9.1) for Mermaid diagrams.
   - `node-fetch` (^2.7.0) for importing ontologies from URIs.
   - `unified`, `remark-parse`, `remark-stringify`, `ttl2jsonld` for Markdown-LD processing.

3. **Build the Plugin**:
   ```bash
   npm run build
   ```
   Generates `main.js`, `manifest.json`, `styles.css`, and `dist/cytoscape-context-menus.css` in the `semantic-weaver` folder.

4. **Enable in Obsidian**:
   - Open Obsidian and go to **Settings > Community Plugins**. Turn off **Safe Mode**.
   - Enable **Semantic Weaver** in the Community Plugins list.
   - Configure settings in **Settings > Semantic Weaver Settings**:
     - Set **Default Export Directory** (e.g., `~/my-docs` or `G:/git/obsidian-rdf/export`).
     - Set **GitHub Repository** (e.g., `mediaprophet/obsidian-semantic-weaver`) and optional **GitHub Personal Access Token** for deployment.
     - Enable **Detect all file extensions** in **Settings > Files & Links** to view `.canvas`, `.ttl`, and other files.

## Usage

1. **Explore Demo Files**:
   - The plugin automatically copies demo files to `YourVaultFolder/templates/` during initialization:
     - `example-note.md`: CML/CMLD example with `[Washington]{ex:refersTo=ex:State_Washington}`.
     - `example-canvas.canvas`: Canvas with RDF-annotated nodes and edges.
     - `ontology.ttl`: Default Turtle ontology with `ex:` and `doc:` namespaces.
     - `ontology/example-ontology.md`: Markdown-LD ontology with RDF-Star support.
     - `constraints.shacl.md`: SHACL constraints for validation.
     - `semantic-weaver-functional-spec.md`: Plugin specification and tutorial.
     - `SemanticSyncGuide.json`: AI agent instructions for RDF processing.
     - `SemanticSyncGuide.md`: Human-readable sync guide.
     - `tutorials/`: Guides for semantic canvas, CML/CMLD, metadata UI, Mermaid diagrams, faceted search, deployment, RDF graph, and RDF-Star/SHACL.

2. **Manage Ontologies**:
   - Use the **Manage RDF Namespaces and Ontology** ribbon icon (`ri-book-open-line`) to edit `templates/ontology.ttl` or namespaces with a modern UI, including autocomplete for common namespaces (e.g., `foaf`, `rdf`).
   - Use the **Create Markdown Ontology** ribbon icon (`ri-file-text-line`) to create a Markdown-LD ontology, e.g.:
     ```markdown
     [ex]: http://example.org/
     [Document1]{typeof=ex:Document; category="Report"}
     <<[Document1] ex:relatedTo [Document2]>> ex:certainty="0.9"
     ```
   - Use the **Import Ontology from URI** ribbon icon (`ri-download-line`) to fetch an ontology (e.g., `http://xmlns.com/foaf/0.1/`) and convert to Markdown-LD, saved in `templates/ontology/`.
   - Modals feature improved UI with grouped inputs, validation feedback, and a clean design.

3. **Annotate Notes**:
   - Add CML/CMLD metadata to Markdown files:
     ```markdown
     @doc [Note] category: "Meeting"; author: [John]; created: "2025-07-16"
     [Sydney]{ex:refersTo=ex:City_Sydney_Australia}
     ```
   - Use the **Edit CMLD Metadata** command (`ri-edit-line`) to modify metadata via a modal.
   - Right-click text to **Wrap as CML URI** (`ri-link`), **Look Up URI** (`ri-search-line`), or **Add Annotation** (`ri-notebook-line`) for RDF-Star annotations.

4. **Edit Canvases**:
   - Enable **Semantic Canvas Mode** in settings.
   - Right-click canvas nodes/edges to edit RDF properties via **Edit Semantic Node** (`ri-edit-line`) or **Edit Semantic Edge** (`ri-link`).

5. **Visualize RDF**:
   - Run **Open RDF Graph View** (`ri-git-branch-line`) to visualize triples using Cytoscape.
   - Interact with nodes (e.g., expand neighbors, view attributes).

6. **Visualize Mermaid Diagrams**:
   - Run **Open Mermaid Diagram View** (`ri-flow-chart`) to visualize canvas RDF data as a flowchart.
   - Select a `.canvas` file (e.g., `templates/example-canvas.canvas`).

7. **Query Data**:
   - Right-click a canvas file and select **Run SPARQL Query** (`ri-search-line`), e.g.:
     ```sparql
     SELECT ?doc ?category WHERE {
       ?doc doc:category ?category .
     }
     ```

8. **Export Documentation**:
   - Configure **Default Export Directory** and **GitHub Repository** in settings.
   - Run **Export RDF Docs for MkDocs** (`ri-upload-line`) to export to `exportDir/docs/`.
   - Test locally:
     ```bash
     cd ~/my-docs
     pip install mkdocs mkdocs-material mkdocs-mermaid2
     mkdocs serve
     ```
     Open `http://localhost:8000`.
   - Test content negotiation:
     ```bash
     npm install express
     node server.js
     ```
     Access `http://localhost:3000/canvas/example-canvas?format=jsonld`.
   - Deploy to GitHub Pages if configured.

## Demo Files
- **example-note.md**: Demonstrates CML/CMLD with contextual disambiguation.
- **example-canvas.canvas**: Canvas with RDF-annotated nodes and edges.
- **ontology.ttl**: Default ontology with `ex:`, `doc:` namespaces.
- **ontology/example-ontology.md**: Markdown-LD ontology with RDF-Star triples.
- **constraints.shacl.md**: SHACL constraints for validation.
- **semantic-weaver-functional-spec.md**: Plugin specification and tutorial.
- **SemanticSyncGuide.json**: AI agent instructions for RDF processing.
- **SemanticSyncGuide.md**: Human-readable sync guide.
- **tutorials/**: Guides for semantic canvas, CML/CMLD, metadata UI, Mermaid diagrams, faceted search, deployment, RDF graph, and RDF-Star/SHACL.

## Author
- **Timothy Holborn** ([GitHub: mediaprophet](https://github.com/mediaprophet))
- **LinkedIn**: [LinkedIn Profile](https://www.linkedin.com/in/ubiquitous/) 

## Contributors
- **xAI Grok 3** ([xAI](https://x.ai)): Assisted with code improvements, documentation, and troubleshooting.

## Contributing
Contributions are welcome! To contribute:
1. Fork the repository at [https://github.com/mediaprophet/obsidian-semantic-weaver](https://github.com/mediaprophet/obsidian-semantic-weaver).
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request.

Please follow the code style in the repository and include tests for new features. Report issues at [https://github.com/mediaprophet/obsidian-semantic-weaver/issues](https://github.com/mediaprophet/obsidian-semantic-weaver/issues).

## References
- **CML**: [https://mediaprophet.github.io/init-draft-standards-wip/cml/](https://mediaprophet.github.io/init-draft-standards-wip/cml/)
- **CMLD**: [https://mediaprophet.github.io/init-draft-standards-wip/CMLD/](https://mediaprophet.github.io/init-draft-standards-wip/CMLD/)
- **Markdown-LD**: [https://blog.sparna.fr/post/semantic-markdown](https://blog.sparna.fr/post/semantic-markdown)
- **Repository**: [https://github.com/mediaprophet/obsidian-semantic-weaver](https://github.com/mediaprophet/obsidian-semantic-weaver)

## Troubleshooting
- **Files Not Visible**:
  - Enable **Detect all file extensions** in **Settings > Files & Links**.
  - Verify `templates/` folder:
    ```bash
    dir YourVaultFolder\.obsidian\plugins\semantic-weaver\templates
    ```
- **Plugin Fails to Load**:
  - Ensure dependencies are installed:
    ```bash
    npm list n3 cytoscape cytoscape-context-menus mermaid node-fetch
    ```
  - Rebuild the plugin:
    ```bash
    npm run build
    ```
  - Check Obsidian console (Ctrl+Shift+I) for errors.
- **CML/CMLD Ambiguity Issues**:
  - Use contextual predicates like `ex:refersTo`, e.g., `[Washington]{ex:refersTo=ex:State_Washington}`.
  - Verify `ex:refersTo` in `templates/ontology/example-ontology.md` or `ontology.ttl`.
- **Import Ontology Errors**:
  - Ensure the URI is accessible and returns valid Turtle or JSON-LD.
  - Check for large ontologies (>10 MB or >10,000 triples) and confirm prompts.
  - Verify `templates/ontology/` is writable:
    ```bash
    dir YourVaultFolder\templates\ontology
    ```
- **Export Errors**:
  - Confirm **Default Export Directory** and **GitHub Repository** in settings.
  - Check `exportDir/docs/`:
    ```bash
    dir ~/my-docs/docs
    ```
  - Ensure **GitHub Personal Access Token** has `repo` scope (generate at [https://github.com/settings/tokens](https://github.com/settings/tokens)).
- **UI Issues**:
  - Ensure `styles.css` is loaded in `dist/styles.css`:
    ```bash
    dir YourVaultFolder\.obsidian\plugins\semantic-weaver\dist\styles.css
    ```
  - Check console (Ctrl+Shift+I) for CSS errors.
  - Verify modal forms display correctly with autocomplete and validation feedback.

For persistent issues, file a report at [https://github.com/mediaprophet/obsidian-semantic-weaver/issues](https://github.com/mediaprophet/obsidian-semantic-weaver/issues).
````

---


## main.ts

```typescript
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
```

---

## manifest.json

```json
{
  "id": "semantic-weaver",
  "name": "Semantic Weaver",
  "version": "1.0.0",
  "minAppVersion": "1.6.7",
  "description": "Enhance Obsidian with RDF-based ontology management and documentation",
  "author": "Timothy Holborn",
  "isDesktopOnly": true
}
```

---

## package.json

```json
{
  "name": "obsidian-semantic-weaver",
  "version": "1.0.0",
  "description": "Obsidian plugin for managing RDF-based ontologies and annotating notes and canvases",
  "main": "main.js",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "node esbuild.config.mjs production",
    "test": "jest"
  },
  "keywords": ["obsidian", "plugin", "rdf", "ontology", "semantic-web"],
  "author": "Timothy Holborn",
  "license": "MIT",
  "devDependencies": {
    "@types/node": "^20.14.2",
    "@types/jest": "^29.5.12",
    "esbuild": "^0.21.5",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.5",
    "typescript": "^5.4.5",
    "builtin-modules": "^3.3.0"
  },
  "dependencies": {
    "n3": "^1.17.2",
    "cytoscape": "^3.30.2",
    "cytoscape-context-menus": "^4.2.0",
    "mermaid": "^10.9.1",
    "node-fetch": "^2.7.0",
    "unified": "^10.1.2",
    "remark-parse": "^10.0.2",
    "remark-stringify": "^10.0.3",
    "@rdfjs/serializer-jsonld": "2.0.0",
    "@rdfjs/parser-n3": "2.0.0",
    "rdf-store-dataset": "^1.0.0",
    "3d-force-graph": "^1.73.2",
    "three": "^0.167.1",
    "d3-force-3d": "^3.0.3",
    "lru-cache": "^10.0.0",
    "glob": "^11.0.0",
    "readable-stream": "^3.6.2"
  },
  "overrides": {
    "glob": "^11.0.0",
    "readable-stream": "^3.6.2",
    "@rdfjs/parser-n3": "2.0.0",
    "@rdfjs/serializer-jsonld": "2.0.0",
    "unified": "^10.1.2",
    "remark-parse": "^10.0.2",
    "remark-stringify": "^10.0.3"
  }
}
```

---

## tsconfig.json

```jsonc
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "allowJs": true,
    "noEmit": false,
    "types": ["node", "obsidian"],
    "baseUrl": "."
  },
  "include": [
    "main.ts",
    "utils/*.ts",
    "views/*.ts",
    "settings/*.ts",
    "modals/*.ts",
    "js/*.js"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

---

## esbuild.config.mjs

```javascript
import esbuild from 'esbuild';
import process from 'process';
import builtins from 'builtin-modules';
import { copyFile, access, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
If you want to view the source, please visit the github repository
https://github.com/mediaprophet/obsidian-semantic-weaver
*/
`;

const prod = process.argv[2] === 'production';

// Plugin to shim Node.js built-ins for Electron's browser context
const nodeBuiltinsPlugin = {
  name: 'node-builtins',
  setup(build) {
    const nodeBuiltins = [
      'http', 'https', 'zlib', 'stream', 'buffer', 'fs', 'url', 'net', 'util', 'path'
    ];
    // Resolve node:* and bare built-in imports to absolute paths
    nodeBuiltins.forEach(module => {
      build.onResolve({ filter: new RegExp(`^(node:)?${module}$`) }, args => ({
        path: path.resolve(__dirname, `shims/${module}.js`),
        namespace: 'file',
      }));
    });
    // Shim process and process/
    build.onResolve({ filter: /^process(\/)?$/ }, args => ({
      path: path.resolve(__dirname, 'shims/process.js'),
      namespace: 'file',
    }));
    // Handle vfile imports (minpath.js, minurl.js)
    build.onResolve({ filter: /vfile\/lib\/min(path|url)\.js$/ }, args => ({
      path: path.resolve(__dirname, `shims/${args.path.split('/').pop().replace('min', '')}.js`),
      namespace: 'file',
    }));
    // Load shim files
    build.onLoad({ filter: /shims\/.*\.js$/, namespace: 'file' }, args => {
      if (args.path.includes('shims/process.js')) {
        return {
          contents: 'module.exports = globalThis.process || {};',
          loader: 'js',
        };
      }
      if (args.path.includes('shims/path.js')) {
        return {
          contents: `
            module.exports = {
              join: (...args) => args
                .filter(segment => segment && typeof segment === 'string')
                .map(segment => segment.replace(/\/+/g, '/'))
                .join('/')
            };
          `,
          loader: 'js',
        };
      }
      return {
        contents: `module.exports = {}; // Shim for ${path.basename(args.path, '.js')} in Electron`,
        loader: 'js',
      };
    });
  },
};

const context = await esbuild.context({
  banner: {
    js: banner,
  },
  entryPoints: ['main.ts'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    'three',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    ...builtins,
  ],
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  logLevel: 'info',
  sourcemap: true, // Enable sourcemaps for debugging
  treeShaking: true,
  minify: false,
  outfile: 'main.js',
  plugins: [nodeBuiltinsPlugin],
});

async function safeCopyFile(src, dest) {
  try {
    await access(src);
    await mkdir('dist', { recursive: true });
    await copyFile(src, dest);
    console.log(`Copied ${src} to ${dest}`);
  } catch (error) {
    console.warn(`Warning: Could not copy ${src} to ${dest}: ${error.message}`);
  }
}

if (prod) {
  await context.rebuild();
  await safeCopyFile('cytoscape-context-menus.css', 'dist/cytoscape-context-menus.css');
  await safeCopyFile('styles.css', 'dist/styles.css');
  process.exit(0);
} else {
  await context.watch();
}
```

---

## styles.css

```css
/* Semantic Weaver plugin styles */
.semantic-weaver-modal,
.modal {
  background: var(--background-primary, #fff);
  border: 1px solid var(--border-color, #ccc);
  border-radius: 6px;
  padding: 20px;
  max-width: 600px;
  margin: 20px auto;
}

.semantic-weaver-modal h2,
.modal h2,
.semantic-weaver-modal h3,
.modal h3 {
  margin-bottom: 20px;
  color: var(--text-normal, #333);
}

.semantic-weaver-setting,
.setting-item {
  margin-bottom: 15px;
}

.semantic-weaver-input,
.semantic-weaver-textarea,
textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color, #ccc);
  border-radius: 4px;
  background: var(--background-secondary, #f9f9f9);
  color: var(--text-normal, #333);
  font-size: 14px;
}

.semantic-weaver-textarea,
textarea {
  min-height: 150px;
  resize: vertical;
  font-family: var(--font-monospace, monospace);
}

.semantic-weaver-button-group {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.semantic-weaver-button-group .button-cta {
  background: var(--interactive-accent, #7d5bed);
  color: var(--text-on-accent, #fff);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.semantic-weaver-button-group .button-cta:hover {
  background: var(--interactive-accent-hover, #6a4ed6);
}

.semantic-weaver-validation {
  margin-top: 10px;
  color: var(--text-error, #d33);
  font-size: 12px;
}

.rdf-graph {
  width: 100%;
  height: 600px;
}

.mermaid-diagram svg {
  background-color: var(--background-primary, #fff);
  fill: var(--text-normal, #333);
}

.semantic-weaver-toggle-button {
  background: var(--background-secondary, #f9f9f9);
  border: 1px solid var(--border-color, #ccc);
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-normal, #333);
}

.semantic-weaver-toggle-button:hover {
  background: var(--background-modifier-hover, #e8e8e8);
}

/* Dark theme support */
body.theme-dark .semantic-weaver-modal,
body.theme-dark .modal {
  background: var(--background-primary, #2f2f2f);
  border-color: var(--border-color, #555);
}

body.theme-dark .semantic-weaver-modal h2,
body.theme-dark .modal h2,
body.theme-dark .semantic-weaver-modal h3,
body.theme-dark .modal h3 {
  color: var(--text-normal, #dcdcdc);
}

body.theme-dark .semantic-weaver-input,
body.theme-dark .semantic-weaver-textarea,
body.theme-dark textarea {
  background: var(--background-secondary, #3a3a3a);
  color: var(--text-normal, #dcdcdc);
  border-color: var(--border-color, #555);
}

body.theme-dark .semantic-weaver-button-group .button-cta {
  background: var(--interactive-accent, #7d5bed);
}

body.theme-dark .semantic-weaver-button-group .button-cta:hover {
  background: var(--interactive-accent-hover, #6a4ed6);
}

body.theme-dark .semantic-weaver-toggle-button {
  background: var(--background-secondary, #3a3a3a);
  color: var(--text-normal, #dcdcdc);
  border-color: var(--border-color, #555);
}

body.theme-dark .semantic-weaver-toggle-button:hover {
  background: var(--background-modifier-hover, #444);
}

body.theme-dark .mermaid-diagram svg {
  background-color: var(--background-primary, #2f2f2f);
  fill: var(--text-normal, #dcdcdc);
}
```

---

## utils/RDFStore.ts

```typescript
import { Vault } from 'obsidian';
import * as N3 from 'n3';
import { TFile } from 'obsidian';

export class RDFStore {
  private quads: N3.Quad[] = [];

  async addQuads(quads: N3.Quad[]) {
    this.quads.push(...quads);
    // Future: Persist to storage or integrate with RDF dataset
  }

  async parseTurtleFile(vault: Vault, file: TFile) {
    const content = await vault.read(file);
    const parser = new N3.Parser();
    const quads = await new Promise<N3.Quad[]>((resolve, reject) => {
      const quads: N3.Quad[] = [];
      parser.parse(content, (error, quad, prefixes) => {
        if (error) reject(error);
        if (quad) quads.push(quad);
        else resolve(quads);
      });
    });
    await this.addQuads(quads);
  }

  getQuads(): N3.Quad[] {
    return this.quads;
  }
}
```

---

## projectstructure.json

```json
{
  "name": "semantic-weaver",
  "description": "Obsidian plugin for managing RDF-based ontologies, semantic annotation, visualization, and export.",
  "structure": [
    {
      "path": "main.ts",
      "type": "typescript",
      "description": "Plugin entry point. Handles lifecycle, settings, RDF logic, UI commands, and event registration."
    },
    {
      "path": "manifest.json",
      "type": "json",
      "description": "Obsidian plugin manifest. Declares plugin id, name, version, and compatibility."
    },
    {
      "path": "package.json",
      "type": "json",
      "description": "NPM package manifest. Lists dependencies, scripts, and metadata for build and development."
    },
    {
      "path": "tsconfig.json",
      "type": "jsonc",
      "description": "TypeScript configuration. Sets compiler options and included/excluded files."
    },
    {
      "path": "esbuild.config.js",
      "type": "js",
      "description": "Build configuration for esbuild. Transpiles TypeScript to JavaScript for plugin distribution."
    },
    {
      "path": "styles.css",
      "type": "css",
      "description": "Custom styles for Semantic Weaver modals, views, and UI components. Supports light/dark themes."
    },
    {
      "path": "utils/RDFUtils.ts",
      "type": "typescript",
      "description": "Utility functions for RDF parsing, ontology loading, CML/CMLD parsing, export, and GitHub deployment."
    },
    {
      "path": "settings/RDFPluginSettings.ts",
      "type": "typescript",
      "description": "Settings interface, default values, and settings tab for plugin configuration in Obsidian."
    },
    {
      "path": "views/RDFGraphView.ts",
      "type": "typescript",
      "description": "Obsidian ItemView for interactive RDF graph visualization (2D/3D) using Cytoscape and ForceGraph3D."
    },
    {
      "path": "views/MermaidView.ts",
      "type": "typescript",
      "description": "Obsidian ItemView for visualizing RDF/canvas data as Mermaid diagrams."
    },
    {
      "path": "modals/AnnotationModal.ts",
      "type": "typescript",
      "description": "Modal dialog for adding RDF-Star or semantic annotations to selected text."
    },
    {
      "path": "modals/CMLDMetadataModal.ts",
      "type": "typescript",
      "description": "Modal dialog for editing CMLD (Context Markup Language for Documentation) metadata in notes."
    },
    {
      "path": "modals/ExportConfigModal.ts",
      "type": "typescript",
      "description": "Modal dialog for configuring export settings (GitHub repo, export dir, provider, etc.)."
    },
    {
      "path": "modals/NamespaceOntologyModal.ts",
      "type": "typescript",
      "description": "Modal dialog for managing RDF namespaces and editing ontology Turtle."
    },
    {
      "path": "modals/SemanticCanvasModal.ts",
      "type": "typescript",
      "description": "Modal dialog for editing semantic properties of canvas nodes."
    },
    {
      "path": "modals/SemanticEdgeModal.ts",
      "type": "typescript",
      "description": "Modal dialog for editing semantic properties of canvas edges."
    },
    {
      "path": "modals/SPARQLQueryModal.ts",
      "type": "typescript",
      "description": "Modal dialog for running SPARQL queries on canvas or RDF data."
    },
    {
      "path": "modals/URILookupModal.ts",
      "type": "typescript",
      "description": "Modal dialog for looking up and inserting URIs from namespaces or ontology."
    },
    {
      "path": "js/faceted-search.js",
      "type": "javascript",
      "description": "React component for faceted search UI over RDF-enhanced documents."
    },
    {
      "path": "js/rdf-graph.js",
      "type": "javascript",
      "description": "React component for rendering RDF graphs using Cytoscape."
    },
    {
      "path": "js/rdf-render.js",
      "type": "javascript",
      "description": "React component for rendering RDF triples as a table from JSON-LD."
    },
    {
      "path": "templates/getting-started.md",
      "type": "markdown",
      "description": "Getting started guide for installing and using the plugin."
    },
    {
      "path": "templates/mkdocs.yaml",
      "type": "yaml",
      "description": "MkDocs configuration for exporting documentation."
    },
    {
      "path": "templates/tutorials/authoring-cml-cmld.md",
      "type": "markdown",
      "description": "Tutorial for authoring CML and CMLD in Markdown notes."
    },
    {
      "path": "tests/tests_meta.rdf.json",
      "type": "json",
      "description": "Test RDF metadata in JSON format for validation and development."
    },
    {
      "path": "tests/tests_page1.md",
      "type": "markdown",
      "description": "Test Markdown file with CML/CMLD and Mermaid diagram for plugin validation."
    }
  ]
}

```

---

## templates/getting-started.md

````markdown
# Getting Started with RDF Documentation Plugin

This guide helps you set up and use the RDF Documentation Plugin in Obsidian.

## Installation
1. Copy the plugin to `.obsidian/plugins/obsidian-rdf-plugin/`.
2. Install dependencies:
   ```bash
   npm install
   pip install rdflib
   ```
3. Build the plugin:
   ```bash
   npm run build
   ```
4. Enable in Obsidian Settings > Community Plugins.

## Basic Usage
1. Create a note with CML or CMLD:
   ```markdown
   [Alice] knows [Bob].
   @doc [Page1] category: "Tutorial"; author: [Alice].
   ```
2. Use the "Edit CMLD Metadata" command to edit metadata.
3. Run "Export RDF Docs for MkDocs" to generate files.
4. Enter GitHub repo, site URL, export directory, and test file inclusion in the dialogue.
5. Deploy to GitHub Pages via the generated GitHub Action.

@doc [GettingStarted] category: "Guide"; author: [PluginAuthor]; created: "2025-07-14".
````

---

*This export includes the main project files and documentation. For a full export of all source files, please request a recursive export or specify additional files/folders.*

---

## views/RDFGraphView.ts

```typescript
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
```

---

## views/MermaidView.ts

```typescript
import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import * as mermaid from 'mermaid';
import { RDFPlugin } from '../main';
import { canvasToMermaid } from '../utils/RDFUtils';

export const MERMAID_VIEW_TYPE = 'mermaid-view';

export class MermaidView extends ItemView {
  plugin: RDFPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: RDFPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return MERMAID_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Mermaid Diagram';
  }

  getIcon(): string {
    return 'diagram';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl('h4', { text: 'Mermaid Diagram' });

    const canvasFiles = this.app.vault.getFiles().filter(f => f.extension === 'canvas');
    const diagramDiv = container.createEl('div', { cls: 'mermaid' });

    if (canvasFiles.length === 0) {
      diagramDiv.createEl('p', { text: 'No canvas files found. Create a canvas file to visualize as a Mermaid diagram.' });
      return;
    }

    const select = container.createEl('select');
    const activeFile = this.app.workspace.getActiveFile();
    canvasFiles.forEach(file => {
      const option = select.createEl('option', { text: file.basename, value: file.path });
      if (file === activeFile || (!activeFile && file.path === 'templates/example-canvas.canvas')) {
        option.selected = true;
      }
    });

    const renderDiagram = async () => {
      diagramDiv.empty();
      const filePath = select.value;
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile && file.extension === 'canvas') {
        try {
          const content = await this.app.vault.read(file);
          const canvasData = JSON.parse(content);
          const mermaidCode = await canvasToMermaid(this.plugin, canvasData);
          const { svg } = await mermaid.default.render('mermaid-diagram', mermaidCode);
          diagramDiv.innerHTML = svg;
        } catch (error) {
          diagramDiv.createEl('p', { text: `Error rendering Mermaid diagram: ${error.message}` });
        }
      } else {
        diagramDiv.createEl('p', { text: 'Select a canvas file to view its Mermaid diagram.' });
      }
    };

    select.addEventListener('change', renderDiagram);
    await renderDiagram();
  }

  async onClose() {
    // Cleanup if necessary
  }
}
```

---

## utils/RDFUtils.ts

```typescript
import { App, Notice, TFile } from 'obsidian';
import * as fs from 'fs';
import * as path from 'path';
import * as N3 from 'n3';
import { RDFPlugin } from '../main';
import { MarkdownLDModal } from '../modals/MarkdownLDModal';

const { namedNode, literal, quad } = N3.DataFactory;

export async function loadOntology(app: App): Promise<string> {
  const pluginDir = app.plugins.plugins['semantic-weaver']?.manifest.dir || path.join(app.vault.adapter.basePath, '.obsidian', 'plugins', 'semantic-weaver').replace(/\\/g, '/');
  const ontologyPath = path.join(pluginDir, 'templates', 'ontology.ttl').replace(/\\/g, '/');
  try {
    return await fs.promises.readFile(ontologyPath, 'utf-8');
  } catch {
    const defaultTtl = `
@prefix ex: <http://example.org/> .
@prefix doc: <http://example.org/doc/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix oa: <http://www.w3.org/ns/oa#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix schema: <http://schema.org/> .

ex:similarTo a owl:ObjectProperty ; rdfs:label "Similar To" .
ex:unRelatedTo a owl:ObjectProperty ; rdfs:label "Unrelated To" .
ex:differentTo a owl:ObjectProperty ; rdfs:label "Different To" .
ex:refersTo a rdfs:Property ; rdfs:label "Refers To" ; schema:domainIncludes rdfs:Resource ; schema:rangeIncludes rdfs:Resource .
ex:certainty a rdf:Property ; rdfs:label "Certainty" ; schema:domainIncludes rdf:Statement ; schema:rangeIncludes rdfs:Literal .
doc:category a rdf:Property ; rdfs:label "Category" ; rdfs:domain doc:Document ; rdfs:range rdfs:Literal .
doc:author a rdf:Property ; rdfs:label "Author" ; rdfs:domain doc:Document ; rdfs:range ex:Person .
doc:related a rdf:Property ; rdfs:label "Related" ; rdfs:domain doc:Document ; rdfs:range doc:Document .
doc:created a rdf:Property ; rdfs:label "Created Date" ; rdfs:domain doc:Document ; rdfs:range rdfs:Literal .
doc:version a rdf:Property ; rdfs:label "Version" ; rdfs:domain doc:Document ; rdfs:range rdfs:Literal .
doc:Document a rdfs:Class ; rdfs:label "Document" .
ex:Person a rdfs:Class ; rdfs:label "Person" .
`;
    await fs.promises.mkdir(path.dirname(ontologyPath), { recursive: true });
    await fs.promises.writeFile(ontologyPath, defaultTtl);
    return defaultTtl;
  }
}

export async function loadProjectTTL(app: App, store: N3.Store): Promise<void> {
  const pluginDir = app.plugins.plugins['semantic-weaver']?.manifest.dir || path.join(app.vault.adapter.basePath, '.obsidian', 'plugins', 'semantic-weaver').replace(/\\/g, '/');
  const projectPath = path.join(pluginDir, 'templates', 'project.ttl').replace(/\\/g, '/');
  if (await fs.promises.access(projectPath).then(() => true).catch(() => false)) {
    try {
      const content = await fs.promises.readFile(projectPath, 'utf-8');
      const parser = new N3.Parser({ format: 'Turtle' });
      const quads = await new Promise<N3.Quad[]>((resolve, reject) => {
        const quads: N3.Quad[] = [];
        parser.parse(content, (error, quad, prefixes) => {
          if (error) reject(error);
          if (quad) quads.push(quad);
          else resolve(quads);
        });
      });
      await store.addQuads(quads);
    } catch (error) {
      throw new Error(`Could not load project TTL from ${projectPath}: ${error.message}`);
    }
  }
}

export async function loadMarkdownOntologies(app: App, store: N3.Store): Promise<void> {
  const pluginDir = app.plugins.plugins['semantic-weaver']?.manifest.dir || path.join(app.vault.adapter.basePath, '.obsidian', 'plugins', 'semantic-weaver').replace(/\\/g, '/');
  const ontologyFolder = path.join(pluginDir, 'templates', 'ontology').replace(/\\/g, '/');
  try {
    await fs.promises.access(ontologyFolder);
    const files = await fs.promises.readdir(ontologyFolder);
    for (const file of files.filter(f => f.endsWith('.md'))) {
      const content = await fs.promises.readFile(path.join(ontologyFolder, file), 'utf-8');
      try {
        const plugin = app.plugins.plugins['semantic-weaver'] as RDFPlugin;
        const modal = new MarkdownLDModal(app, plugin, null, async () => {}, plugin.settings.outputFormat);
        const { graph } = modal.parseMarkdownLD(content);
        const parser = new N3.Parser({ format: 'application/ld+json' });
        const quads = await new Promise<N3.Quad[]>((resolve, reject) => {
          const quads: N3.Quad[] = [];
          parser.parse(JSON.stringify(graph), (error, quad, prefixes) => {
            if (error) reject(error);
            if (quad) quads.push(quad);
            else resolve(quads);
          });
        });
        await store.addQuads(quads);
        new Notice(`Loaded Markdown ontology: ${file}`);
      } catch (error) {
        new Notice(`Failed to parse Markdown-LD in ${file}: ${error.message}`);
        console.error(error);
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      new Notice(`Ontology folder ${ontologyFolder} not found. Creating it...`);
      await fs.promises.mkdir(ontologyFolder, { recursive: true });
    } else {
      new Notice(`Failed to load Markdown ontologies: ${error.message}`);
      console.error(error);
    }
  }
}

export async function canvasToMermaid(plugin: RDFPlugin, canvasData: any): Promise<string> {
  let mermaidCode = 'graph TD;\n';
  const nodes = new Set<string>();
  for (const edge of canvasData.edges) {
    const fromNode = canvasData.nodes.find(n => n.id === edge.fromNode);
    const toNode = canvasData.nodes.find(n => n.id === edge.toNode);
    if (fromNode && toNode) {
      const fromId = fromNode.url ? fromNode.url.split('/').pop().replace(/[^a-zA-Z0-9_]/g, '_') : edge.fromNode;
      const toId = toNode.url ? toNode.url.split('/').pop().replace(/[^a-zA-Z0-9_]/g, '_') : edge.toNode;
      nodes.add(fromId);
      nodes.add(toId);
      const predicate = edge.rdfPredicate ? edge.rdfPredicate.split('/').pop() : 'relatedTo';
      mermaidCode += `  ${fromId}-->${toId}["${predicate}"];\n`;
    }
  }
  for (const node of canvasData.nodes) {
    const nodeId = node.url ? node.url.split('/').pop().replace(/[^a-zA-Z0-9_]/g, '_') : node.id;
    if (nodes.has(nodeId)) {
      const label = node.properties?.category || node.id;
      const classDef = node.type === 'http://example.org/doc/Document' ? ':::document' : 
                      node.type === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Statement' ? ':::statement' : '';
      mermaidCode += `  ${nodeId}["${label}${node.properties?.certainty ? '<br>certainty: ' + node.properties.certainty : ''}"]${classDef};\n`;
    }
  }
  mermaidCode += '\nclassDef document fill:#f9f,stroke:#333,stroke-width:2px;';
  mermaidCode += '\nclassDef statement fill:#bbf,stroke:#333,stroke-width:2px;';
  return mermaidCode;
}

export async function loadExportedPredicates(app: App, store: N3.Store, exportDir: string): Promise<void> {
  const canvasDir = path.join(exportDir, 'docs', 'canvas').replace(/\\/g, '/');
  try {
    await fs.promises.access(canvasDir);
    const files = await fs.promises.readdir(canvasDir);
    for (const file of files.filter(f => f.endsWith('.ttl'))) {
      const content = await fs.promises.readFile(path.join(canvasDir, file), 'utf-8');
      const parser = new N3.Parser({ format: 'Turtle' });
      const quads = await new Promise<N3.Quad[]>((resolve, reject) => {
        const quads: N3.Quad[] = [];
        parser.parse(content, (error, quad, prefixes) => {
          if (error) reject(error);
          if (quad) quads.push(quad);
          else resolve(quads);
        });
      });
      await store.addQuads(quads);
      new Notice(`Loaded predicates from exported file: ${file}`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      new Notice(`Export directory ${canvasDir} not found. Run 'Export RDF Docs for MkDocs' to create it.`);
    } else {
      new Notice(`Failed to load exported predicates: ${error.message}`);
      console.error(error);
    }
  }
}

export async function storeQuad(store: N3.Store, quads: any[]): Promise<void> {
  await store.addQuads(quads);
}

export async function parseCML(plugin: RDFPlugin, markdown: string): Promise<any[]> {
  const triples: any[] = [];
  const cmlPattern = /(@doc\s+)?\[(.*?)\]\s*(.*?)(?=\n\[|\n@doc|\Z)/gs;
  const matches = markdown.matchAll(cmlPattern);
  for (const match of matches) {
    const isDoc = !!match[1];
    const subject = match[2].trim();
    const properties = match[3].trim();
    const ns = isDoc ? plugin.settings.namespaces.doc : plugin.settings.namespaces.ex;
    const subjUri = namedNode(`${ns}${subject.replace(' ', '_')}`);
    const propPairs = properties.split(';').map(p => p.trim()).filter(p => p && p.includes(':'));
    for (const pair of propPairs) {
      const [pred, obj] = pair.split(':', 2).map(s => s.trim());
      const predUri = namedNode(`${ns}${pred}`);
      if (obj.startsWith('[') && obj.endsWith(']')) {
        const objUri = namedNode(`${plugin.settings.namespaces.ex}${obj.slice(1, -1).replace(' ', '_')}`);
        triples.push(quad(subjUri, predUri, objUri));
      } else {
        triples.push(quad(subjUri, predUri, literal(obj.replace(/^"|"$/g, ''))));
      }
    }
  }
  return triples;
}

export async function canvasToTurtle(plugin: RDFPlugin, canvasData: any): Promise<string> {
  const store = plugin.rdfStore;
  const writer = new N3.Writer({ format: 'Turtle' });
  for (const node of canvasData.nodes) {
    const nodeUri = node.url || `${plugin.settings.namespaces.ex}${node.id}`;
    const quads = store.getQuads(namedNode(nodeUri), null, null);
    quads.forEach(q => writer.addQuad(q));
  }
  for (const edge of canvasData.edges) {
    const fromNode = canvasData.nodes.find(n => n.id === edge.fromNode);
    const toNode = canvasData.nodes.find(n => n.id === edge.toNode);
    if (fromNode && toNode) {
      const fromUri = fromNode.url || `${plugin.settings.namespaces.ex}${edge.fromNode}`;
      const toUri = toNode.url || `${plugin.settings.namespaces.ex}${edge.toNode}`;
      const predicate = edge.rdfPredicate || 'ex:relatedTo';
      writer.addQuad(quad(namedNode(fromUri), namedNode(predicate), namedNode(toUri)));
    }
  }
  return new Promise<string>((resolve, reject) => {
    writer.end((error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

export async function exportCanvasToRDF(plugin: RDFPlugin, canvasFile: TFile, format: 'jsonld' | 'turtle'): Promise<string> {
  const canvasContent = await plugin.app.vault.read(canvasFile);
  const canvasData = JSON.parse(canvasContent);
  const store = plugin.rdfStore;
  const quads = [];
  for (const node of canvasData.nodes) {
    const nodeUri = node.url || `${plugin.settings.namespaces.ex}${node.id}`;
    const nodeQuads = store.getQuads(namedNode(nodeUri), null, null);
    quads.push(...nodeQuads);
    if (node.url && node.url.includes('#')) {
      const fragment = node.url.split('#')[1];
      quads.push(quad(
        namedNode(nodeUri),
        namedNode('http://schema.org/section'),
        literal(fragment)
      ));
    }
  }
  for (const edge of canvasData.edges) {
    const fromNode = canvasData.nodes.find(n => n.id === edge.fromNode);
    const toNode = canvasData.nodes.find(n => n.id === edge.toNode);
    if (fromNode && toNode) {
      const fromUri = fromNode.url || `${plugin.settings.namespaces.ex}${edge.fromNode}`;
      const toUri = toNode.url || `${plugin.settings.namespaces.ex}${edge.toNode}`;
      const predicate = edge.rdfPredicate || 'ex:relatedTo';
      quads.push(quad(namedNode(fromUri), namedNode(predicate), namedNode(toUri)));
    }
  }
  if (format === 'jsonld') {
    const writer = new N3.Writer({ format: 'application/ld+json' });
    quads.forEach(q => writer.addQuad(q));
    return new Promise<string>((resolve, reject) => {
      writer.end((error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  } else {
    const writer = new N3.Writer({ format: 'Turtle' });
    quads.forEach(q => writer.addQuad(q));
    return new Promise<string>((resolve, reject) => {
      writer.end((error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }
}

export async function copyJsFiles(plugin: RDFPlugin, pluginDir: string, exportDir: string): Promise<void> {
  const srcJsDir = path.join(pluginDir, 'js').replace(/\\/g, '/');
  const destJsDir = path.join(exportDir, 'docs', 'js').replace(/\\/g, '/');
  try {
    await fs.promises.access(srcJsDir);
    await fs.promises.mkdir(destJsDir, { recursive: true });
    const files = ['faceted-search.js', 'rdf-graph.js', 'rdf-render.js'];
    for (const file of files) {
      const srcPath = path.join(srcJsDir, file).replace(/\\/g, '/');
      const destPath = path.join(destJsDir, file).replace(/\\/g, '/');
      if (await fs.promises.access(srcPath).then(() => true).catch(() => false)) {
        await fs.promises.copyFile(srcPath, destPath);
        new Notice(`Copied ${file} to ${destJsDir}`);
      } else {
        new Notice(`Warning: ${file} not found in ${srcJsDir}`);
      }
    }
  } catch (error) {
    new Notice(`Failed to copy JS files: ${error.message}`);
    console.error(error);
  }
}

export async function copyDocs(plugin: RDFPlugin, pluginDir: string, exportDir: string): Promise<void> {
  const srcDocsDir = path.join(pluginDir, 'templates').replace(/\\/g, '/');
  const destDocsDir = path.join(exportDir, 'docs').replace(/\\/g, '/');
  try {
    await fs.promises.access(srcDocsDir);
    await fs.promises.mkdir(destDocsDir, { recursive: true });
    const files = await fs.promises.readdir(srcDocsDir);
    for (const file of files.filter(f => f.endsWith('.md') || f.endsWith('.yml'))) {
      const srcPath = path.join(srcDocsDir, file).replace(/\\/g, '/');
      const destPath = path.join(destDocsDir, file).replace(/\\/g, '/');
      await fs.promises.copyFile(srcPath, destPath);
      new Notice(`Copied ${file} to ${destDocsDir}`);
    }
    const tutorialsDir = path.join(srcDocsDir, 'tutorials').replace(/\\/g, '/');
    const destTutorialsDir = path.join(destDocsDir, 'tutorials').replace(/\\/g, '/');
    if (await fs.promises.access(tutorialsDir).then(() => true).catch(() => false)) {
      await fs.promises.mkdir(destTutorialsDir, { recursive: true });
      const tutorialFiles = await fs.promises.readdir(tutorialsDir);
      for (const file of tutorialFiles.filter(f => f.endsWith('.md'))) {
        const srcPath = path.join(tutorialsDir, file).replace(/\\/g, '/');
        const destPath = path.join(destTutorialsDir, file).replace(/\\/g, '/');
        await fs.promises.copyFile(srcPath, destPath);
        new Notice(`Copied tutorial ${file} to ${destTutorialsDir}`);
      }
    }
  } catch (error) {
    new Notice(`Failed to copy docs: ${error.message}`);
    console.error(error);
  }
}

export async function deployToGitHub(plugin: RDFPlugin, exportDir: string): Promise<void> {
  const { githubRepo, githubToken } = plugin.settings;
  if (!githubRepo) {
    new Notice('GitHub repository not configured. Set in Settings > Semantic Weaver Settings.');
    return;
  }
  try {
    const gitDir = path.join(exportDir, '.git').replace(/\\/g, '/');
    if (!await fs.promises.access(gitDir).then(() => true).catch(() => false)) {
      await fs.promises.mkdir(exportDir, { recursive: true });
      await require('child_process').execSync(`git init`, { cwd: exportDir });
      const remoteUrl = githubToken ? `https://${githubToken}@github.com/${githubRepo}.git` : `https://github.com/${githubRepo}.git`;
      await require('child_process').execSync(`git remote add origin ${remoteUrl}`, { cwd: exportDir });
    }
    await require('child_process').execSync(`git add .`, { cwd: exportDir });
    await require('child_process').execSync(`git commit -m "Deploy RDF docs to GitHub Pages"`, { cwd: exportDir });
    const pushCommand = githubToken ? `git push -f origin main` : `git push -f origin main`;
    await require('child_process').execSync(pushCommand, { cwd: exportDir });
    new Notice(`Deployed RDF docs to ${githubRepo}`);
  } catch (error) {
    new Notice(`Failed to deploy to GitHub: ${error.message}`);
    console.error(error);
  }
}

export async function generateProjectTTL(plugin: RDFPlugin): Promise<string> {
  const store = plugin.rdfStore;
  const writer = new N3.Writer({ format: 'Turtle' });
  const quads = store.getQuads(null, null, null);
  quads.forEach(q => writer.addQuad(q));
  return new Promise<string>((resolve, reject) => {
    writer.end((error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

export function extractCMLDMetadata(content: string): { [key: string]: string } {
  const metadata: { [key: string]: string } = {};
  const cmlPattern = /(@doc\s+)?\[(.*?)\]\s*(.*?)(?=\n\[|\n@doc|\Z)/gs;
  const matches = content.matchAll(cmlPattern);
  for (const match of matches) {
    if (match[1]) {
      const properties = match[3].trim();
      const propPairs = properties.split(';').map(p => p.trim()).filter(p => p && p.includes(':'));
      for (const pair of propPairs) {
        const [key, value] = pair.split(':', 2).map(s => s.trim());
        metadata[key] = value.replace(/^"|"$/g, '');
      }
    }
  }
  return metadata;
}

export async function updateCMLDMetadata(app: App, file: TFile, newMetadata: { [key: string]: string }): Promise<void> {
  let content = await app.vault.read(file);
  const cmlPattern = /(@doc\s+)?\[(.*?)\]\s*(.*?)(?=\n\[|\n@doc|\Z)/gs;
  let updated = false;
  content = content.replace(cmlPattern, (match, isDoc, subject, properties) => {
    if (isDoc) {
      updated = true;
      const propString = Object.entries(newMetadata)
        .map(([key, value]) => `${key}: "${value}"`)
        .join('; ');
      return `@doc [${subject}] ${propString}`;
    }
    return match;
  });
  if (!updated) {
    const propString = Object.entries(newMetadata)
      .map(([key, value]) => `${key}: "${value}"`)
      .join('; ');
    content = `@doc [${file.basename}] ${propString}\n\n${content}`;
  }
  await app.vault.modify(file, content);
}
```

---

## settings/RDFPluginSettings.ts

```typescript
import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import { RDFPlugin } from '../main';

export interface RDFPluginSettings {
  namespaces: { [key: string]: string };
  semanticCanvasMode: boolean;
  githubRepo: string;
  githubToken: string;
  siteUrl: string;
  exportDir: string;
  includeTests: boolean;
  outputFormat: 'jsonld' | 'turtle';
}

export const DEFAULT_SETTINGS: RDFPluginSettings = {
  namespaces: {
    ex: 'http://example.org/',
    doc: 'http://example.org/doc/',
    owl: 'http://www.w3.org/2002/07/owl#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    oa: 'http://www.w3.org/ns/oa#'
  },
  semanticCanvasMode: false,
  githubRepo: '',
  githubToken: '',
  siteUrl: '',
  exportDir: '',
  includeTests: false,
  outputFormat: 'turtle'
};

export class RDFPluginSettingTab extends PluginSettingTab {
  plugin: RDFPlugin;

  constructor(app: App, plugin: RDFPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Semantic Weaver Settings' });

    new Setting(containerEl)
      .setName('Semantic Canvas Mode')
      .setDesc('Enable RDF-enhanced canvas functionality')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.semanticCanvasMode)
        .onChange(async value => {
          this.plugin.settings.semanticCanvasMode = value;
          await this.plugin.saveSettings();
          new Notice(`Semantic Canvas Mode ${value ? 'enabled' : 'disabled'} by Semantic Weaver.`);
        }));

    new Setting(containerEl)
      .setName('Namespaces')
      .setDesc('Define RDF namespaces as JSON (e.g., {"ex": "http://example.org/"})')
      .addTextArea(text => text
        .setValue(JSON.stringify(this.plugin.settings.namespaces, null, 2))
        .onChange(async value => {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed !== 'object' || parsed === null) {
              new Notice('Invalid namespaces: Must be a JSON object.');
              return;
            }
            this.plugin.settings.namespaces = parsed;
            await this.plugin.saveSettings();
            new Notice('Namespaces updated by Semantic Weaver.');
          } catch (e) {
            new Notice(`Invalid JSON for namespaces: ${e.message}`);
          }
        }));

    new Setting(containerEl)
      .setName('Default Export Directory')
      .setDesc('Set the default directory for exporting MkDocs projects')
      .addText(text => text
        .setPlaceholder('~/my-docs')
        .setValue(this.plugin.settings.exportDir)
        .onChange(async value => {
          this.plugin.settings.exportDir = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Default Site URL')
      .setDesc('Set the default site URL for exports (e.g., username.github.io/reponame)')
      .addText(text => text
        .setPlaceholder('username.github.io/reponame')
        .setValue(this.plugin.settings.siteUrl)
        .onChange(async value => {
          this.plugin.settings.siteUrl = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('GitHub Repository')
      .setDesc('Set the GitHub repository for exports (e.g., username/repository)')
      .addText(text => text
        .setPlaceholder('username/repository')
        .setValue(this.plugin.settings.githubRepo)
        .onChange(async value => {
          this.plugin.settings.githubRepo = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('GitHub Personal Access Token')
      .setDesc('Set a GitHub token for authenticated deployment (optional, for private repositories)')
      .addText(text => text
        .setPlaceholder('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
        .setValue(this.plugin.settings.githubToken)
        .onChange(async value => {
          this.plugin.settings.githubToken = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Include Test Files')
      .setDesc('Include files from the tests/ folder in exports')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.includeTests)
        .onChange(async value => {
          this.plugin.settings.includeTests = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('RDF Output Format')
      .setDesc('Select the default output format for Markdown-LD parsing')
      .addDropdown(dropdown => dropdown
        .addOption('turtle', 'Turtle')
        .addOption('jsonld', 'JSON-LD')
        .setValue(this.plugin.settings.outputFormat)
        .onChange(async value => {
          this.plugin.settings.outputFormat = value as 'jsonld' | 'turtle';
          await this.plugin.saveSettings();
          new Notice(`Default RDF output format set to ${value}.`);
        }));
  }
}
```

---

## modals/AnnotationModal.ts

```typescript
import { App, Modal, Setting } from 'obsidian';

export class AnnotationModal extends Modal {
  selection: string;
  onSubmit: (annotation: string) => void;
  annotation: string = '';

  constructor(app: App, selection: string, onSubmit: (annotation: string) => void) {
    super();
    this.selection = selection;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const contentEl = this.contentEl;
    contentEl.createEl('h2', { text: 'Semantic Weaver: Add Annotation' });
    contentEl.createEl('p', { text: `Selection: ${this.selection}` });

    new Setting(contentEl)
      .setName('Annotation')
      .setDesc('Enter your annotation')
      .addTextArea((text: any) => text
        .setPlaceholder('Enter annotation...')
        .onChange((value: string) => this.annotation = value));

    new Setting(contentEl)
      .addButton((btn: any) => btn
        .setButtonText('Save')
        .onClick(() => {
          if (this.annotation) {
            this.onSubmit(this.annotation);
            this.close();
          }
        }))
      .addButton((btn: any) => btn
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
  }
}
```

---

## modals/CMLDMetadataModal.ts

```typescript
import { App, Modal, Setting, TFile } from 'obsidian';

export class CMLDMetadataModal extends Modal {
  noteFile: TFile;
  metadata: { [key: string]: string };
  onSubmit: (metadata: { [key: string]: string }) => void;

  constructor(app: App, noteFile: TFile, metadata: { [key: string]: string }, onSubmit: (metadata: { [key: string]: string }) => void) {
    super(app);
    this.noteFile = noteFile;
    this.metadata = metadata;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Semantic Weaver: Edit CMLD Metadata' });

    const fields = [
      { key: 'category', label: 'Category', placeholder: 'e.g., Tutorial' },
      { key: 'author', label: 'Author (URI)', placeholder: 'e.g., http://example.org/Alice' },
      { key: 'related', label: 'Related Page (URI)', placeholder: 'e.g., http://example.org/Page2' },
      { key: 'created', label: 'Created Date', placeholder: 'e.g., 2025-07-14' },
      { key: 'version', label: 'Version', placeholder: 'e.g., 1.0' },
    ];

    fields.forEach(field => {
      new Setting(contentEl)
        .setName(field.label)
        .addText(text => text
          .setPlaceholder(field.placeholder)
          .setValue(this.metadata[field.key] || '')
          .onChange(value => this.metadata[field.key] = value));
    });

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText('Save')
        .onClick(() => {
          this.onSubmit(this.metadata);
          this.close();
        }))
      .addButton(btn => btn
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
  }
}
```

---

## modals/ExportConfigModal.ts

```typescript
import { App, Modal, Notice, Setting } from 'obsidian';
import { RDFPluginSettings } from '../settings/RDFPluginSettings';

export class ExportConfigModal extends Modal {
  settings: RDFPluginSettings;
  onSubmit: (settings: RDFPluginSettings) => void;

  constructor(app: App, settings: RDFPluginSettings, onSubmit: (settings: RDFPluginSettings) => void) {
    super(app);
    this.settings = { ...settings };
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Semantic Weaver: Export RDF Docs Configuration' });

    new Setting(contentEl)
      .setName('GitHub Repository')
      .setDesc('Enter the repository in the format username/repository')
      .addText(text => text
        .setPlaceholder('username/repository')
        .setValue(this.settings.githubRepo)
        .onChange(value => this.settings.githubRepo = value));

    new Setting(contentEl)
      .setName('GitHub Pages URL')
      .setDesc('Enter the site URL (e.g., username.github.io/reponame)')
      .addText(text => text
        .setPlaceholder('username.github.io/reponame')
        .setValue(this.settings.siteUrl)
        .onChange(value => this.settings.siteUrl = value));

    new Setting(contentEl)
      .setName('Local Export Directory')
      .setDesc('Enter the local path to export the MkDocs project')
      .addText(text => text
        .setPlaceholder('~/my-docs')
        .setValue(this.settings.exportDir)
        .onChange(value => this.settings.exportDir = value));

    new Setting(contentEl)
      .setName('Include Test Files')
      .setDesc('Include files from the tests/ folder')
      .addToggle(toggle => toggle
        .setValue(this.settings.includeTests)
        .onChange(value => this.settings.includeTests = value));

    if (typeof window.Session !== 'undefined') {
      new Setting(contentEl)
        .setName('Solid Pod URL')
        .setDesc('Enter the Solid Pod URL for publishing')
        .addText(text => text
          .setPlaceholder('https://joep.inrupt.net/')
          .setValue(this.settings.solidPodUrl)
          .onChange(value => this.settings.solidPodUrl = value));

      new Setting(contentEl)
        .setName('Provider')
        .setDesc('Select deployment provider')
        .addDropdown(dropdown => dropdown
          .addOption('github', 'GitHub Pages')
          .addOption('solid', 'Solid Pod')
          .addOption('vercel', 'Vercel')
          .setValue(this.settings.provider)
          .onChange(value => this.settings.provider = value));
    } else {
      new Setting(contentEl)
        .setName('Provider')
        .setDesc('Select deployment provider (Solid Pod support unavailable)')
        .addDropdown(dropdown => dropdown
          .addOption('github', 'GitHub Pages')
          .addOption('vercel', 'Vercel')
          .setValue(this.settings.provider === 'solid' ? 'github' : this.settings.provider)
          .onChange(value => this.settings.provider = value));
    }

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText('Save and Export')
        .onClick(() => {
          this.onSubmit(this.settings);
          this.close();
        }))
      .addButton(btn => btn
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
  }
}
```

---

## modals/NamespaceOntologyModal.ts

```typescript
import { App, Modal, Setting, Notice, TextComponent } from 'obsidian';
import { RDFPlugin } from '../main';

export class NamespaceOntologyModal extends Modal {
  plugin: RDFPlugin;
  onSubmit: (namespaces: { [key: string]: string }, ontologyTtl: string) => void;

  constructor(app: App, plugin: RDFPlugin, onSubmit: (namespaces: { [key: string]: string }, ontologyTtl: string) => void) {
    super(app);
    this.plugin = plugin;
    this.onSubmit = onSubmit;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('semantic-weaver-modal');
    contentEl.createEl('h2', { text: 'Manage RDF Namespaces and Ontology' });

    const namespaces: { [key: string]: string } = { ...this.plugin.settings.namespaces };
    let ontologyTtl = this.plugin.ontologyTtl || '@prefix ex: <http://example.org/> .\nex:Document a rdfs:Class .';

    // Common namespaces for autocomplete
    const commonNamespaces = {
      'foaf': 'http://xmlns.com/foaf/0.1/',
      'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
      'owl': 'http://www.w3.org/2002/07/owl#',
      'skos': 'http://www.w3.org/2004/02/skos/core#',
      'dc': 'http://purl.org/dc/elements/1.1/',
      'dcterms': 'http://purl.org/dc/terms/',
      'ex': 'http://example.org/'
    };

    // Namespace Management
    const namespaceContainer = contentEl.createEl('div', { cls: 'semantic-weaver-namespace-container' });
    namespaceContainer.createEl('h3', { text: 'Namespaces' });
    const namespaceList = namespaceContainer.createEl('div', { cls: 'semantic-weaver-namespace-list' });

    const updateNamespaceList = () => {
      namespaceList.empty();
      for (const [prefix, uri] of Object.entries(namespaces)) {
        const namespaceSetting = new Setting(namespaceList)
          .setClass('semantic-weaver-setting')
          .addText(text => text
            .setPlaceholder('Prefix (e.g., foaf)')
            .setValue(prefix)
            .onChange(value => {
              if (value && value !== prefix) {
                namespaces[value] = namespaces[prefix];
                delete namespaces[prefix];
                updateNamespaceList();
              }
            })
            .inputEl.addClass('semantic-weaver-input'))
          .addText(text => text
            .setPlaceholder('URI (e.g., http://xmlns.com/foaf/0.1/)')
            .setValue(uri)
            .onChange(value => {
              namespaces[prefix] = value.trim();
            })
            .inputEl.addClass('semantic-weaver-input'))
          .addButton(button => button
            .setIcon('ri-delete-bin-line')
            .setTooltip('Remove namespace')
            .onClick(() => {
              delete namespaces[prefix];
              updateNamespaceList();
            }));
      }
    };

    new Setting(namespaceContainer)
      .setName('Add Namespace')
      .setDesc('Add a new namespace prefix and URI.')
      .setClass('semantic-weaver-setting')
      .addDropdown(dropdown => dropdown
        .addOption('', 'Custom Prefix')
        .addOptions(Object.keys(commonNamespaces).reduce((acc, key) => ({ ...acc, [key]: key }), {}))
        .onChange(value => {
          prefixInput.setValue(value);
          uriInput.setValue(commonNamespaces[value] || '');
        })
        .selectEl.addClass('semantic-weaver-input'))
      .addText(text => {
        const prefixInput = text
          .setPlaceholder('Prefix (e.g., foaf)')
          .onChange(value => {
            if (value && !namespaces[value]) {
              namespaces[value] = uriInput.getValue() || 'http://example.org/';
              updateNamespaceList();
            }
          });
        prefixInput.inputEl.addClass('semantic-weaver-input');
        return prefixInput;
      })
      .addText(text => {
        const uriInput = text
          .setPlaceholder('URI (e.g., http://xmlns.com/foaf/0.1/)')
          .onChange(value => {
            const prefix = prefixInput.getValue();
            if (prefix && namespaces[prefix]) {
              namespaces[prefix] = value.trim();
            }
          });
        uriInput.inputEl.addClass('semantic-weaver-input');
        return uriInput;
      });

    updateNamespaceList();

    // Ontology TTL Editor
    new Setting(contentEl)
      .setName('Ontology (Turtle)')
      .setDesc('Edit the Turtle ontology file (templates/ontology.ttl).')
      .setClass('semantic-weaver-setting')
      .addTextArea(text => text
        .setValue(ontologyTtl)
        .onChange(value => (ontologyTtl = value))
        .inputEl.addClass('semantic-weaver-textarea'));

    // Validation Feedback
    const validationEl = contentEl.createEl('div', { cls: 'semantic-weaver-validation' });

    // Buttons
    new Setting(contentEl)
      .setClass('semantic-weaver-button-group')
      .addButton(button => button
        .setButtonText('Save')
        .setCta()
        .onClick(async () => {
          if (Object.keys(namespaces).some(prefix => !prefix.match(/^[a-zA-Z0-9_-]+$/))) {
            validationEl.setText('Error: Namespace prefixes must contain only letters, numbers, underscores, or hyphens.');
            return;
          }
          if (Object.values(namespaces).some(uri => !uri.match(/^https?:\/\/.+/))) {
            validationEl.setText('Error: Namespace URIs must be valid URLs.');
            return;
          }
          try {
            const parser = new N3.Parser({ format: 'Turtle' });
            await new Promise((resolve, reject) => {
              parser.parse(ontologyTtl, (error, quad, prefixes) => {
                if (error) reject(error);
                else resolve(null);
              });
            });
            await this.onSubmit(namespaces, ontologyTtl);
            validationEl.setText('Success: Namespaces and ontology saved.');
            this.close();
          } catch (error) {
            validationEl.setText(`Error: Invalid Turtle syntax: ${error.message}`);
          }
        }))
      .addButton(button => button
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
  }
}
```

---

## modals/SemanticCanvasModal.ts

```typescript
import { App, Modal, Setting, TFile } from 'obsidian';
import { RDFPlugin } from '../main';

export class SemanticCanvasModal extends Modal {
  private plugin: RDFPlugin;
  private file: TFile;
  private nodeId: string;
  private onSubmit: (nodeId: string, type: string, properties: { [key: string]: string }) => void;

  constructor(app: App, plugin: RDFPlugin, file: TFile, onSubmit: (nodeId: string, type: string, properties: { [key: string]: string }) => void) {
    super(app);
    this.plugin = plugin;
    this.file = file;
    this.nodeId = '';
    this.onSubmit = onSubmit;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Edit Semantic Node' });

    let type = '';
    const properties: { [key: string]: string } = {};

    new Setting(contentEl)
      .setName('Node ID')
      .setDesc('Enter the node ID')
      .addText(text => text
        .setPlaceholder('Node ID')
        .onChange(value => {
          this.nodeId = value;
        }));

    new Setting(contentEl)
      .setName('Type')
      .setDesc('Enter the RDF type (e.g., http://example.org/doc/Document)')
      .addText(text => text
        .setPlaceholder('Type URI')
        .onChange(value => {
          type = value;
        }));

    new Setting(contentEl)
      .setName('Properties')
      .setDesc('Enter properties as key:value pairs, one per line')
      .addTextArea(text => text
        .setPlaceholder('key1:value1\nkey2:value2')
        .onChange(value => {
          value.split('\n').forEach(line => {
            const [key, val] = line.split(':').map(s => s.trim());
            if (key && val) properties[key] = val;
          });
        }));

    new Setting(contentEl)
      .addButton(button => button
        .setButtonText('Submit')
        .setCta()
        .onClick(() => {
          this.onSubmit(this.nodeId, type, properties);
          this.close();
        }));
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
```

---

## modals/SemanticEdgeModal.ts

```typescript
import { App, Modal, Setting, TFile } from 'obsidian';
import { RDFPlugin } from '../main';

export class SemanticEdgeModal extends Modal {
  plugin: RDFPlugin;
  canvasFile: TFile;
  onSubmit: (edgeId: string, predicate: string) => void;
  edgeId: string = '';
  predicate: string = '';
  customPredicate: string = '';

  constructor(app: App, plugin: RDFPlugin, canvasFile: TFile, onSubmit: (edgeId: string, predicate: string) => void) {
    super();
    this.plugin = plugin;
    this.canvasFile = canvasFile;
    this.onSubmit = onSubmit;
  }

  async onOpen() {
    const contentEl = this.contentEl;
    contentEl.createEl('h2', { text: 'Semantic Weaver: Edit Semantic Canvas Edge' });

    new Setting(contentEl)
      .setName('Edge ID')
      .setDesc('Enter the edge ID from the canvas')
      .addText((text: any) => text
        .setPlaceholder('e.g., edge_123')
        .onChange((value: string) => this.edgeId = value));

    new Setting(contentEl)
      .setName('Predicate')
      .setDesc('Select or enter the RDF predicate for this edge')
      .addDropdown((dropdown: any) => dropdown
        .addOption('rdfs:subClassOf', 'SubClass Of')
        .addOption('owl:sameAs', 'Same As')
        .addOption('owl:equivalentClass', 'Equivalent Class')
        .addOption('skos:related', 'Related To')
        .addOption('ex:similarTo', 'Similar To')
        .addOption('ex:unRelatedTo', 'Unrelated To')
        .addOption('ex:differentTo', 'Different To')
        .addOption('custom', 'Custom Predicate')
        .onChange((value: string) => {
          this.predicate = value;
          this.customPredicate = value === 'custom' ? '' : value;
        }));

    if (this.predicate === 'custom') {
      new Setting(contentEl)
        .setName('Custom Predicate URI')
        .setDesc('Enter a custom predicate URI')
        .addText((text: any) => text
          .setPlaceholder('e.g., http://example.org/customPredicate')
          .onChange((value: string) => this.customPredicate = value));
    }

    new Setting(contentEl)
      .addButton((btn: any) => btn
        .setButtonText('Save')
        .onClick(async () => {
          if (this.edgeId && (this.predicate !== 'custom' || this.customPredicate)) {
            this.onSubmit(this.edgeId, this.predicate === 'custom' ? this.customPredicate : this.predicate);
            this.close();
          }
        }))
      .addButton((btn: any) => btn
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
  }
}
```

---

## modals/SPARQLQueryModal.ts

```typescript
import { App, Modal, Setting, TFile } from 'obsidian';
import { RDFPlugin } from '../main';

export class SPARQLQueryModal extends Modal {
  plugin: RDFPlugin;
  canvasFile: TFile;
  onSubmit: (query: string) => void;
  query: string = '';

  constructor(app: App, plugin: RDFPlugin, canvasFile: TFile, onSubmit: (query: string) => void) {
    super();
    this.plugin = plugin;
    this.canvasFile = canvasFile;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const contentEl = this.contentEl;
    contentEl.createEl('h2', { text: 'Semantic Weaver: Run SPARQL Query on Canvas' });

    new Setting(contentEl)
      .setName('SPARQL Query')
      .setDesc('Enter a SPARQL query to run against the canvas RDF data')
      .addTextArea((text: any) => text
        .setPlaceholder('e.g., SELECT ?s ?p ?o WHERE { ?s ?p ?o }')
        .onChange((value: string) => this.query = value));

    new Setting(contentEl)
      .addButton((btn: any) => btn
        .setButtonText('Run Query')
        .onClick(async () => {
          if (this.query) {
            this.onSubmit(this.query);
            this.close();
          }
        }))
      .addButton((btn: any) => btn
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
  }
}
```

---

## modals/URILookupModal.ts

```typescript

import { App, Modal, Setting } from 'obsidian';
import { Parser } from 'n3';
import * as fs from 'fs';
import * as path from 'path';


export class URILookupModal extends Modal {
  namespaces: { [key: string]: string };
  ontologyTtl: string;
  onSubmit: (uri: string) => void;
  // queryEngine: any;
  selectedPrefix: string = '';
  suffix: string = '';
  selectedUri: string = '';

  constructor(app: App, namespaces: { [key: string]: string }, ontologyTtl: string, onSubmit: (uri: string) => void) {
    super(app);
    this.namespaces = namespaces;
    this.ontologyTtl = ontologyTtl;
    this.onSubmit = onSubmit;
    // this.queryEngine = ...
  }


  async onOpen() {
    const contentEl = this.contentEl;
    contentEl.createEl('h2', { text: 'Semantic Weaver: Look Up URI' });

    new Setting(contentEl)
      .setName('Select Namespace')
      .addDropdown((dropdown: any) => {
        Object.entries(this.namespaces).forEach(([prefix, uri]) => {
          dropdown.addOption(prefix, `${prefix}: ${uri}`);
        });
        dropdown.onChange((value: string) => this.selectedPrefix = value);
      });

    new Setting(contentEl)
      .setName('URI Suffix')
      .setDesc('Enter the suffix to append to the namespace (e.g., Alice for ex:Alice)')
      .addText((text: any) =>
        text
          .setPlaceholder('e.g., Alice')
          .onChange((value: string) => this.suffix = value));

    // Use adapter's getFullPath to get the absolute path if available, else fallback
    const adapter: any = this.app.vault.adapter;
    let ontologyPath = '';
    if (typeof adapter.getFullPath === 'function') {
      ontologyPath = adapter.getFullPath('ontology/ontology.ttl');
    } else if (adapter.basePath) {
      ontologyPath = path.join(adapter.basePath, 'ontology', 'ontology.ttl');
    } else {
      ontologyPath = path.join('ontology', 'ontology.ttl');
    }

    // Use n3 to parse ontology.ttl and extract all subject URIs
    let ontologyUris: string[] = [];
    try {
      const ttl = await fs.promises.readFile(ontologyPath, 'utf-8');
      const parser = new Parser({ format: 'Turtle' });
      const quads = parser.parse(ttl);
      const uris = new Set<string>();
      for (const q of quads) {
        if (q.subject.termType === 'NamedNode') {
          uris.add(q.subject.value);
        }
        if (q.object.termType === 'NamedNode') {
          uris.add(q.object.value);
        }
      }
      ontologyUris = Array.from(uris);
    } catch (e) {
      ontologyUris = [];
    }

    new Setting(contentEl)
      .setName('Ontology URIs')
      .addDropdown((dropdown: any) => {
        ontologyUris.forEach((uri: string) => {
          if (typeof uri === 'string') {
            dropdown.addOption(uri, uri.split('/').pop() || uri);
          }
        });
        dropdown.onChange((value: string) => this.selectedUri = value);
      });

    new Setting(contentEl)
      .addButton((btn: any) => btn
        .setButtonText('Insert Namespace URI')
        .onClick(() => {
          if (this.selectedPrefix && this.suffix) {
            const uri = `${this.namespaces[this.selectedPrefix]}${this.suffix.replace(' ', '_')}`;
            this.onSubmit(uri);
            this.close();
          }
        }))
      .addButton((btn: any) => btn
        .setButtonText('Insert Ontology URI')
        .onClick(() => {
          if (this.selectedUri) {
            this.onSubmit(this.selectedUri);
            this.close();
          }
        }))
      .addButton((btn: any) => btn
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
  }
}
```
