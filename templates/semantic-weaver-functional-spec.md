# Semantic Weaver Functional Specification

@doc [SemanticWeaverSpec] category: "Documentation"; author: [SemanticWeaverTeam]; created: "2025-07-16"; version: "1.0.0"; related: [ExampleNote].

## Overview

**Semantic Weaver** is an Obsidian plugin for RDF-based ontology management, semantic canvas editing, SPARQL querying, and exporting documentation to MkDocs with GitHub deployment. It enables users to annotate notes and canvases with RDF metadata, visualize RDF graphs, query data with SPARQL, and generate semantic documentation. This document serves as both a functional specification and a tutorial, using demo files in the `semantic-weaver` folder.

### Metadata
- **Category**: Documentation
- **Author**: Semantic Weaver Team
- **Created**: 2025-07-16
- **Version**: 1.0.0
- **Related**: [ExampleNote]

## Features

### 1. Ontology Management
- **Description**: Load and manage RDF ontologies in Turtle format, stored as `ontology.ttl` in the `semantic-weaver` folder.
- **Functionality**:
  - Define namespaces (e.g., `ex:`, `doc:`) and ontology terms (e.g., `doc:Document`, `ex:Person`).
  - Edit via **Semantic Weaver: Manage RDF Namespaces and Ontology** ribbon icon.
  - Automatically loads predicates from exported canvas `.ttl` files in the export directory.
- **Tutorial**:
  1. Open the `semantic-weaver` folder in your vault.
  2. View `ontology.ttl` to see predefined terms like `doc:category` and `ex:relatedTo`.
  3. Click the **book-open** ribbon icon to open the **NamespaceOntologyModal**.
  4. Add a new namespace (e.g., `my: http://my.org/`) or edit `ontology.ttl`.
  5. Save and verify the updated ontology is loaded.
  6. Export a canvas to `~/my-docs/docs/canvas/` and check that new predicates (e.g., `ex:newRelation`) are loaded into the RDF store.

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
     ```
     SELECT ?doc ?category WHERE {
       ?doc doc:category ?category .
     }
     ```
  4. Submit to see results (e.g., `node1` with category `Example`, `node2` with `Sample`).
  5. Try querying relationships:
     ```
     SELECT ?subject ?object WHERE {
       ?subject ex:relatedTo ?object .
     }
     ```

### 4. CML/CMLD Metadata
- **Description**: Annotate Markdown notes with Custom Markup Language (CML) or Custom Markup Language for Documentation (CMLD) using `@doc` tags.
- **Functionality**:
  - Add metadata like `category`, `author`, `created` using the `@doc` syntax.
  - Edit via **Semantic Weaver: Edit CMLD Metadata** command.
  - Supports URI lookups and wrapping text as CML URIs.
- **Tutorial**:
  1. Open `semantic-weaver/example-note.md`.
  2. Note the CMLD metadata: `@doc [ExampleNote] category: "Documentation"; author: [John]; created: "2025-07-15".`.
  3. Select text in the editor, right-click, and choose **Wrap as CML URI** to wrap it in square brackets.
  4. Run the **Edit CMLD Metadata** command to modify metadata (e.g., change `category` to `Tutorial`).
  5. Use **Look Up URI** to insert a URI from the ontology (e.g., `http://example.org/Person/John`).

### 5. RDF Graph Visualization
- **Description**: Visualize RDF triples as a graph using Cytoscape.
- **Functionality**:
  - Access via **Semantic Weaver: Open RDF Graph View** command.
  - Displays nodes (subjects/objects) and edges (predicates) from the `n3` store, including exported predicates.
- **Tutorial**:
  1. Run the **Open RDF Graph View** command.
  2. View the graph of triples from `example-canvas.canvas` and `ontology.ttl`.
  3. Nodes represent entities (e.g., `node1`, `node2`), and edges show relationships (e.g., `ex:relatedTo`).
  4. Verify that `doc:category` and other properties are visualized.

### 6. MkDocs Export and GitHub Deployment
- **Description**: Export vault data as RDF-enhanced MkDocs documentation, optionally deploying to GitHub.
- **Functionality**:
  - Export canvas files as Turtle/JSON-LD, Markdown with CMLD, and templates to a specified directory.
  - Deploy to a GitHub repository for hosting (e.g., GitHub Pages).
  - Supports content negotiation via a sample `server.js` for serving exported files.
- **Tutorial**:
  1. Configure settings in **Settings > Semantic Weaver Settings**:
     - Set **Default Export Directory** (e.g., `~/my-docs`).
     - Set **GitHub Repository** (e.g., `username/repository`).
     - Set **Default Site URL** (e.g., `username.github.io/reponame`).
     - Enable **Include Test Files** if desired.
  2. Run **Semantic Weaver: Export RDF Docs for MkDocs**.
  3. Check `~/my-docs/docs/canvas/` for exported `example-canvas.ttl` and `example-canvas.jsonld`.
  4. Verify `ontology.ttl`, `project.ttl`, and `server.js` in `~/my-docs/`.
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
     Access `http://localhost:3000/canvas/example-canvas?format=jsonld` or `?format=ttl`.
  7. If a GitHub repository is configured, the export will push to `https://github.com/username/repository`.

## Demo Files
The `semantic-weaver` folder contains:
- **example-canvas.canvas**: A canvas with two nodes (`node1`, `node2`) and an edge (`ex:relatedTo`).
- **example-note.md**: A Markdown note with CMLD metadata.
- **ontology.ttl**: Default ontology with `doc:` and `ex:` namespaces.
- **project.ttl**: Project metadata in RDF.
- **semantic-weaver-functional-spec.md**: This specification and tutorial.
- **SemanticSyncGuide.json**: Instructions for AI agents to convert documents to CML/CMLD.

## Technical Details
- **Dependencies**:
  - `n3` (`^1.17.2`): RDF parsing, serialization, and SPARQL querying.
  - `cytoscape` (`^3.30.2`): Graph visualization.
  - `fs`, `child_process`: Built-in Node.js modules for file operations and Git deployment.
- **Platform**: Desktop-only (`isDesktopOnly: true`).
- **Icons**: Uses Obsidian’s Lucide icons (e.g., `book-open`, `edit`, `link`, `search`).
- **GitHub Actions**: Uses Python `rdflib` for RDF validation during deployment.

## Getting Started
1. Enable **Semantic Weaver** in **Settings > Community Plugins**.
2. Explore the `semantic-weaver` folder for demo files.
3. Follow the tutorials above to manage ontologies, edit canvases, query data, and export documentation.
4. Configure export settings and deploy to GitHub for a live site.
5. Use `server.js` for local content negotiation testing.

For issues, check the repository: [https://github.com/mediaprophet/obsidian-semantic-weaver](https://github.com/mediaprophet/obsidian-semantic-weaver).