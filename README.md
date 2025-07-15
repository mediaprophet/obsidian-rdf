# Semantic Weaver

**Semantic Weaver** is an Obsidian plugin that enhances your notes with RDF (Resource Description Framework) capabilities, enabling semantic annotations, ontology management, and export to MkDocs-powered documentation sites. It integrates with Obsidian’s canvas feature, supports Solid Pods (optional), and provides tools for creating and querying RDF graphs.

## Features

- **Semantic Canvas Mode**: Add RDF metadata to canvas nodes and edges, creating rich, queryable knowledge graphs.
- **CML/CMLD Support**: Author notes using Custom Markup Language (CML) and CML for Documentation (CMLD) to embed RDF metadata.
- **Ontology Management**: Define and manage ontologies in Turtle format, stored in `./ontology/ontology.ttl`.
- **SPARQL Queries**: Run SPARQL queries on canvas data to extract insights.
- **RDF Graph Visualization**: View RDF data as interactive graphs using Cytoscape.
- **Export to MkDocs**: Generate RDF-enhanced documentation sites with JSON-LD, Turtle, and RDF/XML outputs.
- **Solid Pod Integration**: Publish RDF data to Solid Pods (requires optional dependencies).
- **GitHub Pages Deployment**: Deploy documentation to GitHub Pages with a single command.

## Installation

For detailed installation instructions, including setting up the `./ontology/` folder, installing dependencies, and building the plugin, see [installation.md](./installation.md).

### Quick Start

1. Clone or copy the plugin to `your-vault/.obsidian/plugins/semantic-weaver/`.
2. Create the `./ontology/` folder in your vault root with `ontology.ttl` and `project.ttl`.
3. Install dependencies:
   ```bash
   cd your-vault/.obsidian/plugins/semantic-weaver
   npm install
   ```
4. Build the plugin:
   ```bash
   npm run build
   ```
5. Enable **Semantic Weaver** in Obsidian’s **Settings > Community Plugins**.

## Usage

1. **Enable Semantic Canvas Mode**:
   - Go to **Settings > Semantic Weaver Settings** and toggle **Semantic Canvas Mode**.
   - Create a canvas (`File > New Canvas`), add nodes/edges, and use context menu options (**Edit Semantic Node**, **Edit Semantic Edge**) to add RDF metadata.

2. **Manage Ontologies and Namespaces**:
   - Use the ribbon icon (**Semantic Weaver: Manage RDF Namespaces and Ontology**) to define namespaces and edit `ontology.ttl`.
   - The plugin loads `ontology.ttl` and `project.ttl` from the `./ontology/` folder in your vault root.

3. **Author CML/CMLD**:
   - In notes, use CML syntax (e.g., `[MyClass] rdfs:label "Example Class"; ex:relatedTo [OtherClass].`) or CMLD (e.g., `@doc [MyPage] category: Tutorial; author: http://example.org/Alice.`).
   - Edit metadata via **Semantic Weaver: Edit CMLD Metadata** command.

4. **Run SPARQL Queries**:
   - Right-click a canvas and select **Run SPARQL Query** to query RDF data (e.g., `SELECT ?s ?p ?o WHERE { ?s ?p ?o }`).

5. **Visualize RDF Graphs**:
   - Use **Semantic Weaver: Open RDF Graph View** to view RDF data as an interactive graph.

6. **Export to MkDocs**:
   - Use **Semantic Weaver: Export RDF Docs for MkDocs** to export notes and canvases as RDF-enhanced documentation.
   - Set **Local Export Directory** (e.g., `~/my-docs`) and **GitHub** provider in the export modal.
   - Preview locally:
     ```bash
     cd ~/my-docs
     pip install mkdocs mkdocs-material mkdocs-mermaid2 rdflib
     mkdocs serve
     ```
     Open `http://localhost:8000`.

7. **Solid Pod Support** (Optional):
   - Install optional dependencies:
     ```bash
     npm install @comunica/query-sparql-solid@4.3.0 @inrupt/solid-client-authn-browser@2.0.0
     ```
   - Use the **Semantic Weaver: Solid Pod Login** ribbon icon to log in and publish RDF data.

## File Structure

The plugin expects the following structure in `your-vault/.obsidian/plugins/semantic-weaver/`:
```
semantic-weaver/
├── main.ts
├── esbuild.config.js
├── package.json
├── manifest.json
├── versions.json
├── README.md
├── installation.md
├── modals/
│   ├── ExportConfigModal.ts
│   ├── CMLDMetadataModal.ts
│   ├── NamespaceOntologyModal.ts
│   ├── SolidPodModal.ts
│   ├── SemanticCanvasModal.ts
│   ├── SemanticEdgeModal.ts
│   ├── SPARQLQueryModal.ts
│   ├── URILookupModal.ts
│   ├── AnnotationModal.ts
├── views/
│   ├── RDFGraphView.ts
├── utils/
│   ├── RDFUtils.ts
├── settings/
│   ├── RDFPluginSettings.ts
├── ontology/ (in vault root: your-vault/ontology/)
│   ├── ontology.ttl
│   ├── project.ttl
├── templates/
│   ├── mkdocs.yml
│   ├── getting-started.md
│   ├── tutorials/
│   ├── github-action.yml
├── js/
│   ├── rdf-render.js
│   ├── faceted-search.js
│   ├── rdf-graph.js
├── tests/
│   ├── page1.markdown
│   ├── meta.rdf.json
```

## Contributing

Contributions are welcome! Fork the repository, make changes, and submit a pull request. Ensure you update `ontology.ttl` and `project.ttl` in the `./ontology/` folder as needed.

## License

MIT License. See [LICENSE](./LICENSE) for details.