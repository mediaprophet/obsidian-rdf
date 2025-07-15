# Semantic Weaver

**Semantic Weaver** is an Obsidian plugin for managing RDF-based ontologies, annotating notes and canvases with semantic metadata, visualizing RDF graphs and Mermaid diagrams, querying data with SPARQL, and exporting RDF-enhanced documentation to MkDocs with optional GitHub Pages deployment. It uses **Context Markup Language (CML)** and **Context Markup Language for Documentation (CMLD)** to add contextual RDF metadata to Markdown notes, addressing ambiguities in unstructured text or linked-data ontologies (e.g., language or regional differences). The plugin also supports defining ontologies in Markdown using Markdown-LD syntax with RDF-Star support.

## Features

- **Ontology Management**:
  - Load and edit RDF ontologies in Turtle format (`templates/ontology.ttl`) or Markdown-LD (`templates/ontology/*.md`).
  - Define namespaces (e.g., `ex:`, `doc:`) and terms (e.g., `doc:Document`, `ex:Person`).
  - Create Markdown ontologies via the **Create Markdown Ontology** ribbon icon.
- **Context Markup Language (CML/CMLD)**:
  - Annotate notes with CML for contextual RDF metadata, e.g., `[Washington]{ex:refersTo=ex:State_Washington}` to disambiguate entities.
  - Use CMLD for document metadata, e.g., `@doc [Note] category: "Documentation"; author: [John]`.
  - Supports RDF-Star for annotating triples, e.g., `<<[Node1] ex:relatedTo [Node2]>> ex:certainty="0.9"`.
  - See [CML](https://mediaprophet.github.io/init-draft-standards-wip/cml/) and [CMLD](https://mediaprophet.github.io/init-draft-standards-wip/CMLD/) for specifications.
- **Semantic Canvas Editing**:
  - Enable **Semantic Canvas Mode** to annotate canvas nodes and edges with RDF types and predicates (e.g., `doc:category`, `ex:relatedTo`).
  - Supports fragment identifiers (e.g., `http://example.org/doc/Note#section1`).
- **SPARQL Querying**:
  - Run SPARQL queries on canvas RDF data via the canvas context menu.
- **RDF Graph Visualization**:
  - Visualize RDF triples using Cytoscape with interactive features (e.g., expand neighbors, self-organize).
- **Mermaid Diagram Visualization**:
  - Visualize canvas RDF data as Mermaid flowcharts via the **Open Mermaid Diagram View** command.
  - Select from available canvas files in the vault, with support for RDF properties (e.g., `doc:category`, `ex:certainty`).
- **MkDocs Export**:
  - Export notes, canvases, and ontologies as RDF-enhanced MkDocs documentation in Turtle or JSON-LD formats.
  - Deploy to GitHub Pages using a configured repository and optional Personal Access Token.
- **Content Negotiation**:
  - Serve exported files with `server.js` for Turtle or JSON-LD access via HTTP content negotiation.

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
   - `cytoscape` (^3.30.2) for RDF graph visualization.
   - `mermaid` (^10.9.1) for Mermaid diagrams.
   - `unified`, `remark-parse`, `remark-stringify`, `ttl2jsonld` for Markdown-LD processing.

3. **Build the Plugin**:
   ```bash
   npm run build
   ```
   Generates `main.js`, `manifest.json`, and `styles.css` in the `semantic-weaver` folder.

4. **Enable in Obsidian**:
   - Open Obsidian and go to **Settings > Community Plugins**. Turn off **Safe Mode**.
   - Enable **Semantic Weaver** in the Community Plugins list.
   - Configure settings in **Settings > Semantic Weaver Settings**:
     - Set **Default Export Directory** (e.g., `~/my-docs` or `G:/git/obsidian-rdf/export`).
     - Set **GitHub Repository** (e.g., `mediaprophet/obsidian-semantic-weaver`) and optional **GitHub Personal Access Token** for deployment.
     - Enable **Detect all file extensions** in **Settings > Files & Links** to view `.canvas`, `.ttl`, and other files.

## Usage

1. **Explore Demo Files**:
   - The plugin automatically copies demo files to your vault’s `templates/` folder during initialization.
   - Access them in `YourVaultFolder/templates/`:
     - `example-note.md`: CML/CMLD example with `[Washington]{ex:refersTo=ex:State_Washington}`.
     - `example-canvas.canvas`: Canvas with RDF-annotated nodes and edges.
     - `ontology.ttl`: Default Turtle ontology with `ex:` and `doc:` namespaces.
     - `ontology/example-ontology.md`: Markdown-LD ontology with RDF-Star support.
     - `constraints.shacl.md`: SHACL constraints for validation.
     - `semantic-weaver-functional-spec.md`: Plugin specification and tutorial.
     - `SemanticSyncGuide.json`: AI agent instructions for RDF processing.
     - `SemanticSyncGuide.md`: Human-readable sync guide.
     - `tutorials/`:
       - `semantic-canvas.md`: Guide for semantic canvas usage.
       - `authoring-cml-cmld.md`: CML/CMLD authoring guide.
       - `metadata-ui.md`: Metadata UI guide.
       - `mermaid-diagrams.md`: Mermaid diagram guide.
       - `faceted-search.md`: Faceted search guide.
       - `deployment.md`: Deployment guide for GitHub Pages.
       - `rdf-graph.md`: RDF graph visualization guide.
       - `rdf-star-shacl.md`: RDF-Star and SHACL tutorial.

2. **Manage Ontologies**:
   - Use the **book-open** ribbon icon (**Manage RDF Namespaces and Ontology**) to edit `templates/ontology.ttl` or namespaces.
   - Use the **file-text** ribbon icon (**Create Markdown Ontology**) to create a Markdown-LD ontology, e.g.:
     ```markdown
     [ex]: http://example.org/
     [Document1]{typeof=ex:Document; category="Report"}
     <<[Document1] ex:relatedTo [Document2]>> ex:certainty="0.9"
     ```
   - Save in `templates/ontology/` (e.g., `my-ontology.md`).

3. **Annotate Notes**:
   - Add CML/CMLD metadata to Markdown files:
     ```markdown
     @doc [Note] category: "Meeting"; author: [John]; created: "2025-07-16"
     [Sydney]{ex:refersTo=ex:City_Sydney_Australia}
     ```
   - Use the **Edit CMLD Metadata** command to modify metadata via a modal.
   - Right-click text to **Wrap as CML URI**, **Look Up URI**, or **Add Annotation** for RDF-Star annotations.

4. **Edit Canvases**:
   - Enable **Semantic Canvas Mode** in **Settings > Semantic Weaver Settings**.
   - Right-click canvas nodes/edges to edit RDF properties via **Edit Semantic Node** or **Edit Semantic Edge**.

5. **Visualize RDF**:
   - Run **Semantic Weaver: Open RDF Graph View** to visualize triples from notes, canvases, and ontologies using Cytoscape.
   - Interact with nodes (e.g., expand neighbors, view attributes).

6. **Visualize Mermaid Diagrams**:
   - Run **Semantic Weaver: Open Mermaid Diagram View** to visualize canvas RDF data as a flowchart.
   - Select a `.canvas` file (e.g., `templates/example-canvas.canvas`) to render nodes, edges, and RDF properties (e.g., `ex:certainty`).

7. **Query Data**:
   - Right-click a canvas file and select **Run SPARQL Query**, e.g.:
     ```sparql
     SELECT ?doc ?category WHERE {
       ?doc doc:category ?category .
     }
     ```

8. **Export Documentation**:
   - Configure **Default Export Directory** and **GitHub Repository** in settings.
   - Run **Semantic Weaver: Export RDF Docs for MkDocs** to export to the configured directory (e.g., `~/my-docs`).
   - Files exported to `exportDir/docs/`:
     - `canvas/*.ttl`, `canvas/*.jsonld`: Canvas RDF data.
     - `ontology/*.ttl`, `ontology/*.jsonld`: Markdown-LD ontologies.
     - `ontology.ttl`, `project.ttl`: Core ontologies.
     - `tutorials/*.md`: Tutorial documentation.
     - `js/*.js`: JavaScript for faceted search and visualization.
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
   - Deploy to GitHub Pages if **GitHub Repository** and **GitHub Personal Access Token** are set.

## Demo Files
- **example-note.md**: Demonstrates CML/CMLD with contextual disambiguation.
- **example-canvas.canvas**: Canvas with RDF-annotated nodes and edges.
- **ontology.ttl**: Default ontology with `ex:`, `doc:`, and other namespaces.
- **ontology/example-ontology.md**: Markdown-LD ontology with RDF-Star triples.
- **constraints.shacl.md**: SHACL constraints for RDF validation.
- **semantic-weaver-functional-spec.md**: Detailed plugin specification and tutorial.
- **SemanticSyncGuide.json**: AI agent instructions for RDF processing.
- **SemanticSyncGuide.md**: Human-readable sync guide.
- **tutorials/**:
  - `semantic-canvas.md`: Semantic canvas usage.
  - `authoring-cml-cmld.md`: CML/CMLD authoring.
  - `metadata-ui.md`: Metadata UI.
  - `mermaid-diagrams.md`: Mermaid diagrams.
  - `faceted-search.md`: Faceted search.
  - `deployment.md`: GitHub Pages deployment.
  - `rdf-graph.md`: RDF graph visualization.
  - `rdf-star-shacl.md`: RDF-Star and SHACL.

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
  - Verify `templates/` folder in `YourVaultFolder/.obsidian/plugins/semantic-weaver/templates/`:
    ```bash
    dir YourVaultFolder\.obsidian\plugins\semantic-weaver\templates
    ```
- **Plugin Fails to Load**:
  - Ensure dependencies are installed:
    ```bash
    npm list n3 cytoscape mermaid
    ```
  - Rebuild the plugin:
    ```bash
    npm run build
    ```
  - Check Obsidian console (Ctrl+Shift+I) for errors.
- **CML/CMLD Ambiguity Issues**:
  - Use contextual predicates like `ex:refersTo`, e.g., `[Washington]{ex:refersTo=ex:State_Washington}`.
  - Verify `ex:refersTo` in `templates/ontology/example-ontology.md` or `ontology.ttl`.
- **Export Errors**:
  - Confirm **Default Export Directory** and **GitHub Repository** in settings.
  - Check `exportDir/docs/`:
    ```bash
    dir ~/my-docs/docs
    ```
  - Ensure **GitHub Personal Access Token** has `repo` scope (generate at [https://github.com/settings/tokens](https://github.com/settings/tokens)).
- **Markdown-LD Errors**:
  - Validate syntax in `templates/ontology/*.md` (see [Markdown-LD docs](https://blog.sparna.fr/post/semantic-markdown)).
  - Check SHACL constraints in `constraints.shacl.md`.
- **Mermaid Diagram Errors**:
  - Verify `mermaid` (^10.9.1) is installed:
    ```bash
    npm list mermaid
    ```
  - Check console (Ctrl+Shift+I) for rendering errors.
  - Ensure `templates/example-canvas.canvas` has valid RDF data (e.g., nodes with `type` and `properties`).

For persistent issues, file a report at [https://github.com/mediaprophet/obsidian-semantic-weaver/issues](https://github.com/mediaprophet/obsidian-semantic-weaver/issues).