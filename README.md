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