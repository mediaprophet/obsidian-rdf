# Semantic Weaver

**Semantic Weaver** is an Obsidian plugin for managing RDF-based ontologies, annotating notes and canvases with semantic metadata, visualizing RDF graphs and Mermaid diagrams, querying data with SPARQL, and exporting RDF-enhanced documentation to MkDocs with optional GitHub deployment. It uses **Context Markup Language (CML)** and **Context Markup Language for Documentation (CMLD)** to add contextual RDF metadata to Markdown notes, addressing ambiguities in unstructured text or linked-data ontologies (e.g., language or regional differences). The plugin also supports defining ontologies in Markdown using Markdown-LD syntax.

## Features

- **Ontology Management**:
  - Load and edit RDF ontologies in Turtle format (`templates/ontology.ttl`) or Markdown-LD (`templates/ontology/*.md`).
  - Define namespaces (e.g., `ex:`, `doc:`) and terms (e.g., `doc:Document`, `ex:Person`).
  - Create Markdown ontologies via the **Create Markdown Ontology** ribbon icon.
- **Context Markup Language (CML/CMLD)**:
  - Annotate notes with CML to add contextual RDF metadata, e.g., `[Washington]{ex:refersTo=ex:State_Washington}` to disambiguate entities.
  - Use CMLD for document metadata, e.g., `@doc [Note] category: "Documentation"; author: [John]`.
  - See [CML](https://mediaprophet.github.io/init-draft-standards-wip/cml/) and [CMLD](https://mediaprophet.github.io/init-draft-standards-wip/CMLD/) for specifications.
- **Semantic Canvas Editing**:
  - Annotate canvas nodes and edges with RDF types and predicates in **Semantic Canvas Mode**.
  - Supports fragment identifiers (e.g., `http://example.org/doc/Note#section1`).
- **SPARQL Querying**:
  - Run SPARQL queries on canvas RDF data via the canvas context menu.
- **RDF Graph Visualization**:
  - Visualize RDF triples using Cytoscape with interactive features (e.g., expand neighbors, self-organize).
- **Mermaid Diagram Visualization**:
  - Visualize canvas RDF data as Mermaid diagrams (e.g., flowcharts) using the **Open Mermaid Diagram View** command.
  - Supports rendering of nodes and edges with labels from RDF properties (e.g., `doc:category`, `ex:relatedTo`).
- **MkDocs Export**:
  - Export notes, canvases, and ontologies as RDF-enhanced MkDocs documentation.
  - Supports Turtle and JSON-LD formats for canvases and ontologies.
  - Optional GitHub deployment for hosting (e.g., GitHub Pages).
- **Content Negotiation**:
  - Serve exported files with `server.js` for Turtle or JSON-LD access.

## Installation

1. **Clone the Repository**:
   ```bash
   cd G:/git/obsidian-rdf/.obsidian/plugins
   git clone https://github.com/mediaprophet/obsidian-semantic-weaver.git
   cd semantic-weaver
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```
   Required: `n3` (^1.17.2), `cytoscape` (^3.30.2), `markdown-ld` (^0.8.0), `mermaid` (^10.9.1).

3. **Build the Plugin**:
   ```bash
   npm run build
   ```
   Generates `main.js` in the `semantic-weaver` folder.

4. **Enable in Obsidian**:
   - Open Obsidian, go to **Settings > Community Plugins**, and turn off **Safe Mode**.
   - Browse and enable **Semantic Weaver**.
   - Configure **Default Export Directory** (e.g., `~/my-docs`) in **Settings > Semantic Weaver Settings**.
   - Enable **Detect all file extensions** in **Settings > Files & Links** to view `.canvas`, `.ttl`, and other files.

## Usage

1. **Explore Demo Files**:
   - Open the `templates` folder in your Obsidian vault (`.obsidian/plugins/semantic-weaver/templates/`).
   - View:
     - `example-note.md`: CML/CMLD example with `[Washington]{ex:refersTo=ex:State_Washington}`.
     - `example-canvas.canvas`: Canvas with RDF-annotated nodes and edges.
     - `ontology.ttl`: Default Turtle ontology.
     - `ontology/example-ontology.md`: Markdown-LD ontology.
     - `SemanticSyncGuide.json`: AI agent instructions (available at `https://github.com/mediaprophet/obsidian-semantic-weaver`).
     - `SemanticSyncGuide.md`: Human-readable sync guide.
     - `semantic-weaver-functional-spec.md`: Detailed specification and tutorial.
     - `tutorials/*`: Tutorials on semantic canvas, CML/CMLD authoring, metadata UI, Mermaid diagrams, faceted search, deployment, and RDF graph visualization.

2. **Manage Ontologies**:
   - Click the **book-open** ribbon icon to edit `templates/ontology.ttl`.
   - Click the **file-text** ribbon icon to create a Markdown ontology, e.g.:
     ```markdown
     [schema]: http://schema.org
     [rdfs]: http://www.w3.org/2000/01/rdf-schema#
     [Person]{typeof=rdfs:Class rdfs:label="Person"}
     ```
   - Save in `templates/ontology/` (e.g., `my-ontology.md`).

3. **Annotate Notes**:
   - Add CML/CMLD metadata to Markdown files:
     ```markdown
     @doc [Note] category: "Meeting"; author: [John]; created: "2025-07-16".
     [Sydney]{ex:refersTo=ex:City_Sydney_Australia}
     ```
   - Use the **Edit CMLD Metadata** command to modify metadata.
   - Right-click text and select **Wrap as CML URI** or **Look Up URI**.

4. **Edit Canvases**:
   - Enable **Semantic Canvas Mode** in settings.
   - Right-click canvas nodes/edges to edit RDF properties (e.g., `doc:category`, `ex:relatedTo`).

5. **Visualize RDF**:
   - Run **Semantic Weaver: Open RDF Graph View** to see triples from notes, canvases, and ontologies.
   - Interact with nodes (e.g., expand neighbors, view attributes).

6. **Visualize Mermaid Diagrams**:
   - Run **Semantic Weaver: Open Mermaid Diagram View** to visualize canvas RDF data as a flowchart.
   - Select a canvas file (e.g., `templates/example-canvas.canvas`) to render nodes and edges as a Mermaid diagram.

7. **Query Data**:
   - Right-click a canvas file and select **Run SPARQL Query**, e.g.:
     ```sparql
     SELECT ?doc ?category WHERE {
       ?doc doc:category ?category .
     }
     ```

8. **Export Documentation**:
   - Set **Default Export Directory** and **GitHub Repository** in settings.
   - Run **Semantic Weaver: Export RDF Docs for MkDocs** to export to `~/my-docs`.
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

## Demo Files
- **example-note.md**: Demonstrates CML/CMLD with contextual disambiguation.
- **example-canvas.canvas**: Canvas with RDF-annotated nodes/edges.
- **ontology.ttl**: Default ontology with `doc:` and `ex:` namespaces.
- **ontology/example-ontology.md**: Markdown-LD ontology with `ex:refersTo`.
- **semantic-weaver-functional-spec.md**: Plugin specification and tutorial.
- **SemanticSyncGuide.json**: AI agent guide for CML/CMLD and Markdown-LD conversion.
- **SemanticSyncGuide.md**: Human-readable version of the sync guide.
- **tutorials/**: Includes `semantic-canvas.md`, `authoring-cml-cmld.md`, `metadata-ui.md`, `mermaid-diagrams.md`, `faceted-search.md`, `deployment.md`, `rdf-graph.md`.

## References
- **CML**: [https://mediaprophet.github.io/init-draft-standards-wip/cml/](https://mediaprophet.github.io/init-draft-standards-wip/cml/)
- **CMLD**: [https://mediaprophet.github.io/init-draft-standards-wip/CMLD/](https://mediaprophet.github.io/init-draft-standards-wip/CMLD/)
- **Markdown-LD**: [https://blog.sparna.fr/post/semantic-markdown](https://blog.sparna.fr/post/semantic-markdown)
- **Repository**: [https://github.com/mediaprophet/obsidian-semantic-weaver](https://github.com/mediaprophet/obsidian-semantic-weaver)

## Troubleshooting
- **Files Not Visible**:
  - Enable **Detect all file extensions** in **Settings > Files & Links**.
  - Verify `templates/` folder in `.obsidian/plugins/semantic-weaver/templates/`:
    ```bash
    dir G:\git\obsidian-rdf\.obsidian\plugins\semantic-weaver\templates
    ```
- **CML/CMLD Ambiguity Issues**:
  - Ensure contextual predicates like `ex:refersTo` are used, e.g., `[Washington]{ex:refersTo=ex:State_Washington}`.
  - Check `templates/ontology/example-ontology.md` for `ex:refersTo` definition.
- **Export Errors**:
  - Verify **Default Export Directory** in settings.
  - Check `~/my-docs/docs/canvas` and `~/my-docs/docs/ontology`:
    ```bash
    dir ~/my-docs/docs
    ```
- **Markdown-LD Errors**:
  - Validate syntax in `templates/ontology/*.md`.
  - Refer to [Markdown-LD docs](https://blog.sparna.fr/post/semantic-markdown).
- **Mermaid Diagram Errors**:
  - Ensure `mermaid` (^10.9.1) is installed:
    ```bash
    npm list mermaid
    ```
  - Check console (Ctrl+Shift+I) for rendering errors.
  - Verify `templates/example-canvas.canvas` contains valid RDF data.

For issues, file a report at [https://github.com/mediaprophet/obsidian-semantic-weaver/issues](https://github.com/mediaprophet/obsidian-semantic-weaver/issues).