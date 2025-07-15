# Semantic Weaver Functional Specification

@doc [SemanticWeaverSpec] category: "Documentation"; author: [SemanticWeaverTeam]; created: "2025-07-16"; version: "1.0.0"; related: [ExampleNote].

## Overview

**Semantic Weaver** is an Obsidian plugin for RDF-based ontology management, semantic canvas editing, SPARQL querying, and exporting documentation to MkDocs with GitHub deployment. It enables users to annotate notes and canvases with RDF metadata using Context Markup Language (CML) and Context Markup Language for Documentation (CMLD), visualize RDF graphs, query data with SPARQL, and generate semantic documentation. This document serves as both a functional specification and a tutorial, using demo files in the `semantic-weaver` folder.

### Metadata
- **Category**: Documentation
- **Author**: Semantic Weaver Team
- **Created**: 2025-07-16
- **Version**: 1.0.0
- **Related**: [ExampleNote]

## Features

### 1. Ontology Management
- **Description**: Load and manage RDF ontologies in Turtle format (`ontology.ttl`) and Markdown format (`semantic-weaver/ontology/*.md`) using Markdown-LD syntax.
- **Functionality**:
  - Define namespaces (e.g., `ex:`, `doc:`) and ontology terms (e.g., `doc:Document`, `ex:Person`) in `ontology.ttl` or `.md` files.
  - Edit Turtle ontologies via **Semantic Weaver: Manage RDF Namespaces and Ontology** ribbon icon.
  - Create Markdown ontologies via **Semantic Weaver: Create Markdown Ontology** ribbon icon.
  - Automatically loads predicates from exported canvas `.ttl` files in the export directory (`docs/canvas/`) and Markdown ontologies in `semantic-weaver/ontology/`.
- **Tutorial**:
  1. Open the `semantic-weaver` folder in your vault.
  2. View `ontology.ttl` or `semantic-weaver/ontology/example-ontology.md` for predefined terms.
  3. Click the **book-open** ribbon icon to edit `ontology.ttl`.
  4. Click the **file-text** ribbon icon to create a new Markdown ontology (e.g., `new-ontology.md`).
     - Example Markdown-LD syntax:
       ```markdown
       [schema]: http://schema.org
       [rdfs]: http://www.w3.org/2000/01/rdf-schema#
       [Person]{typeof=rdfs:Class rdfs:label="Person"}
       [name]{typeof=rdfs:Property schema:domainIncludes=[Person]; schema:rangeIncludes=[schema:Text]; rdfs:label="Name"}
       ```
  5. Save and verify the ontology is loaded into the RDF store.
  6. Configure **Default Export Directory** in **Settings > Semantic Weaver Settings** (e.g., `~/my-docs`).
  7. Run **Semantic Weaver: Export RDF Docs for MkDocs** to export `.md` ontologies to `~/my-docs/docs/ontology/` as `.ttl` and `.jsonld`.

### 2. Semantic Canvas Editing
- **Description**: Annotate canvas nodes and edges with RDF triples, stored in an `n3` store and exported as Turtle/JSON-LD.
- **Functionality**:
  - Enable **Semantic Canvas Mode** in settings.
  - Right-click canvas files to access **Edit Semantic Node**, **Edit Semantic Edge**, or **Run SPARQL Query**.
  - Nodes can have RDF types (e.g., `doc:Document`) and properties (e.g., `doc:category`).
  - Edges can have RDF predicates (e.g., `ex:relatedTo`).
  - Supports fragment identifiers (e.g., `http://example.org/doc/Note#section1`) with `schema:section` metadata in JSON-LD.
- **Tutorial**:
  1. Enable **Semantic Canvas Mode** in **Settings > Semantic Weaver Settings**.
  2. Open `semantic-weaver/example-canvas.canvas`.
  3. Right-click a node (e.g., `node1`) and select **Edit Semantic Node**.
  4. Set `Type` to `http://example.org/doc/Document` and add properties (e.g., `category: Tutorial`).
  5. Set `URL` to `http://example.org/doc/Node1#section1` to include a fragment.
  6. Right-click the edge between `node1` and `node2`, select **Edit Semantic Edge**, and set the predicate to `http://example.org/relatedTo`.
  7. Save and verify changes in the canvas file.

### 3. SPARQL Querying
- **Description**: Run SPARQL queries on canvas RDF data to extract semantic information.
- **Functionality**:
  - Access via **Run SPARQL Query** in the canvas file context menu.
  - Queries are executed against a temporary `n3` store populated with canvas data.
- **Tutorial**:
  1. Open `semantic-weaver/example-canvas.canvas`.
  2. Right-click and select **Run SPARQL Query**.
  3. Enter the query:
     ```sparql
     SELECT ?doc ?category WHERE {
       ?doc doc:category ?category .
     }
     ```
  4. Submit to see results (e.g., `node1` with category `Example`, `node2` with `Sample`).
  5. Try querying relationships:
     ```sparql
     SELECT ?subject ?object WHERE {
       ?subject ex:relatedTo ?object .
     }
     ```

### 4. Context Markup Language (CML/CMLD)
- **Description**: Annotate Markdown notes with Context Markup Language (CML) or Context Markup Language for Documentation (CMLD) to add RDF metadata, addressing ambiguity in unstructured text or linked-data ontologies (e.g., language or regional differences). See [CML](https://mediaprophet.github.io/init-draft-standards-wip/cml/) and [CMLD](https://mediaprophet.github.io/init-draft-standards-wip/CMLD/) for details.
- **Functionality**:
  - CML adds contextual metadata to entities (e.g., `[Washington]{ex:refersTo=ex:State_Washington}` to disambiguate "Washington").
  - CMLD uses `@doc` for document-level metadata (e.g., `category`, `author`, `created`).
  - Edit via **Semantic Weaver: Edit CMLD Metadata** command.
  - Supports URI lookups and wrapping text as CML URIs.
- **Tutorial**:
  1. Open `semantic-weaver/example-note.md`.
  2. Note the CMLD metadata: `@doc [ExampleNote] category: "Documentation"; author: [John]; created: "2025-07-15".`.
  3. Add CML for context: `[Washington]{ex:refersTo=ex:State_Washington}` to clarify the entity.
  4. Select text in the editor, right-click, and choose **Wrap as CML URI** to wrap it in square brackets.
  5. Run the **Edit CMLD Metadata** command to modify metadata (e.g., change `category` to `Tutorial`).
  6. Use **Look Up URI** to insert a URI from the ontology (e.g., `http://example.org/Person/John`).

### 5. RDF Graph Visualization
- **Description**: Visualize RDF triples as a graph using Cytoscape.
- **Functionality**:
  - Access via **Semantic Weaver: Open RDF Graph View** command.
  - Displays nodes (subjects/objects) and edges (predicates) from the `n3` store, including Markdown ontologies.
  - Right-click nodes for options: **View in Source**, **Expand Neighbors**, **Hide Node**.
  - Attributes panel shows RDF properties for selected nodes.
  - Self-organize graph with a button or drag nodes manually.
- **Tutorial**:
  1. Run the **Open RDF Graph View** command.
  2. View the graph of triples from `example-canvas.canvas`, `ontology.ttl`, and `ontology/example-ontology.md`.
  3. Click a node to center the graph and view its RDF attributes (e.g., `ex:refersTo`) in the right panel.
  4. Right-click a node and select **Expand Neighbors** to highlight connected nodes.
  5. Click **Self-Organize Graph** to rearrange the layout.

### 6. MkDocs Export and GitHub Deployment
- **Description**: Export vault data as RDF-enhanced MkDocs documentation, optionally deploying to GitHub.
- **Functionality**:
  - Export canvas files as Turtle/JSON-LD, Markdown with CML/CMLD, and ontologies from `semantic-weaver/ontology/` as Turtle/JSON-LD.
  - Deploy to a GitHub repository for hosting (e.g., GitHub Pages).
  - Supports content negotiation via a sample `server.js` for serving exported files.
- **Tutorial**:
  1. Configure settings in **Settings > Semantic Weaver Settings**:
     - Set **Default Export Directory** (e.g., `~/my-docs`).
     - Set **GitHub Repository** (e.g., `username/repository`).
     - Set **Default Site URL** (e.g., `username.github.io/reponame`).
     - Enable **Include Test Files** if desired.
  2. Run **Semantic Weaver: Export RDF Docs for MkDocs** to create `~/my-docs/docs/canvas/` and `~/my-docs/docs/ontology/`.
  3. Check `~/my-docs/docs/ontology/` for exported `example-ontology.ttl` and `example-ontology.jsonld`.
  4. Verify `ontology.ttl`, `project.ttl`, `SemanticSyncGuide.md`, and `server.js` in `~/my-docs/`.
  5. Preview locally:
     ```bash
     cd ~/my-docs
     pip install mkdocs mkdocs-material mkdocs-mermaid2
     mkdocs serve
     ```
     Open `http://localhost:8000`.
  6. Test content negotiation:
     ```bash
     cd ~/my-docs
     npm install express
     node server.js
     ```
     Access `http://localhost:3000/canvas/example-canvas?format=jsonld` or `http://localhost:3000/ontology/example-ontology?format=ttl`.
  7. If a GitHub repository is configured, the export will push to `https://github.com/username/repository`.

## Demo Files
The `semantic-weaver` folder contains:
- **example-canvas.canvas**: A canvas with two nodes (`node1`, `node2`) and an edge (`ex:relatedTo`).
- **example-note.md**: A Markdown note with CMLD metadata.
- **ontology.ttl**: Default ontology with `doc:` and `ex:` namespaces.
- **project.ttl**: Project metadata in RDF.
- **semantic-weaver-functional-spec.md**: This specification and tutorial.
- **SemanticSyncGuide.json**: Instructions for AI agents to convert documents to CML/CMLD and Markdown-LD, available at `https://github.com/mediaprophet/obsidian-semantic-weaver`.
- **SemanticSyncGuide.md**: Human-readable version of the sync guide.
- **ontology/example-ontology.md**: Sample Markdown ontology using Markdown-LD syntax.

## Technical Details
- **Dependencies**:
  - `n3` (`^1.17.2`): RDF parsing, serialization, and SPARQL querying.
  - `cytoscape` (`^3.30.2`): Graph visualization.
  - `markdown-ld` (`^0.8.0`): Semantic Markdown parsing.
  - `fs`, `child_process`: Built-in Node.js modules for file operations and Git deployment.
- **Platform**: Desktop-only (`isDesktopOnly: true`).
- **Icons**: Uses Obsidian’s Lucide icons (e.g., `book-open`, `file-text`, `edit`, `link`, `search`).
- **GitHub Actions**: Uses Python `rdflib` for RDF validation during deployment.

## Getting Started
1. Enable **Semantic Weaver** in **Settings > Community Plugins**.
2. Configure **Default Export Directory** in **Settings > Semantic Weaver Settings** (e.g., `~/my-docs`).
3. Create or edit ontologies in `semantic-weaver/ontology/` using the **Create Markdown Ontology** ribbon icon.
4. Run **Semantic Weaver: Export RDF Docs for MkDocs** to create the export directory structure.
5. Explore the `semantic-weaver` folder for demo files.
6. Follow the tutorials above to manage ontologies, edit canvases, query data, and export documentation.
7. Use `server.js` for local content negotiation testing.

## Troubleshooting
- **Empty Ontology Folder in Obsidian UI**:
  - **Cause**: Obsidian may hide non-Markdown files like `.ttl` or the folder may not be initialized.
  - **Fix**:
    1. Go to **Settings > Files & Links** and ensure **Detect all file extensions** is enabled.
    2. Verify `semantic-weaver/ontology/` exists in the vault:
       ```bash
       dir G:\git\obsidian-rdf\semantic-weaver\ontology
       ```
    3. Create a Markdown ontology via the **Create Markdown Ontology** ribbon icon.
    4. Restart Obsidian to refresh the file explorer.
- **Error: ENOENT: no such file or directory, scandir 'docs/canvas'**:
  - **Cause**: The export directory (`~/my-docs`) does not contain a `docs/canvas` folder.
  - **Fix**:
    1. Set **Default Export Directory** in **Settings > Semantic Weaver Settings**.
    2. Run **Semantic Weaver: Export RDF Docs for MkDocs**.
    3. Verify the directory:
       ```bash
       dir ~/my-docs/docs/canvas
       ```
- **Markdown-LD Syntax Errors**:
  - **Cause**: Invalid `markdown-ld` syntax in `.md` files.
  - **Fix**:
    1. Check the syntax in `semantic-weaver/ontology/example-ontology.md`.
    2. Use the **Create Markdown Ontology** modal to generate valid syntax.
    3. Refer to https://blog.sparna.fr/post/semantic-markdown for guidance.
- **CML/CMLD Ambiguity Issues**:
  - **Cause**: Missing contextual predicates like `ex:refersTo`.
  - **Fix**:
    1. Add contextual annotations, e.g., `[Washington]{ex:refersTo=ex:State_Washington}`.
    2. Refer to [CML](https://mediaprophet.github.io/init-draft-standards-wip/cml/) and [CMLD](https://mediaprophet.github.io/init-draft-standards-wip/CMLD/).

For issues, check the repository: [https://github.com/mediaprophet/obsidian-semantic-weaver](https://github.com/mediaprophet/obsidian-semantic-weaver).