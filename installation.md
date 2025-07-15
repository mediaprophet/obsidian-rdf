# Installation Guide for Semantic Weaver

This guide provides detailed steps to install and set up the **Semantic Weaver** Obsidian plugin, including creating the `./ontology/` folder, installing dependencies, and building the plugin. The plugin enhances Obsidian with RDF capabilities, requiring specific setup to function correctly.

## Prerequisites

- **Obsidian**: Version 0.15.0 or higher.
- **Node.js**: Version 16 or higher.
- **Python**: For previewing exported MkDocs sites (optional).
- **Git**: For GitHub deployment (optional).

## Installation Steps

1. **Clone or Copy the Plugin**:
   - Copy the plugin files to `your-vault/.obsidian/plugins/semantic-weaver/`. If you have a GitHub repository (e.g., `username/semantic-weaver`), clone it:
     ```bash
     git clone https://github.com/username/semantic-weaver.git your-vault/.obsidian/plugins/semantic-weaver
     ```
   - Alternatively, manually create the `semantic-weaver` folder and copy the files listed in the [File Structure](#file-structure) section.

2. **Create the `./ontology/` Folder**:
   - In your vault root (`your-vault/`), create the `ontology/` folder:
     ```bash
     mkdir your-vault/ontology
     ```
   - Create `ontology.ttl` with default ontology content:
     ```turtle
     @prefix ex: <http://example.org/> .
     @prefix doc: <http://example.org/doc/> .
     @prefix owl: <http://www.w3.org/2002/07/owl#> .
     @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
     @prefix oa: <http://www.w3.org/ns/oa#> .

     ex:similarTo a owl:ObjectProperty .
     ex:unRelatedTo a owl:ObjectProperty .
     ex:differentTo a owl:ObjectProperty .
     ```
     - Save as `your-vault/ontology/ontology.ttl`.
   - Create `project.ttl` with project metadata:
     ```turtle
     @prefix doap: <http://usefulinc.com/ns/doap#> .
     @prefix schema: <http://schema.org/> .
     @prefix dc: <http://purl.org/dc/elements/1.1/> .

     <http://example.org/project/your-vault> a doap:Project, schema:SoftwareApplication ;
       dc:title "your-vault" ;
       dc:creator "Semantic Weaver" ;
       dc:date "2025-07-15" ;
       doap:homepage "" ;
       doap:repository "" .
     ```
     - Save as `your-vault/ontology/project.ttl`.
     - Replace `your-vault` with your vault’s name (e.g., `TestPlugin` for `F:/git-working-folder/test-obsidian-plugin/TestPlugin/`).

3. **Clear npm Cache**:
   ```bash
   npm cache clean --force
   ```

4. **Set npm Registry**:
   ```bash
   npm config set registry https://registry.npmjs.com
   ```

5. **Install Dependencies**:
   - Navigate to the plugin directory:
     ```bash
     cd your-vault/.obsidian/plugins/semantic-weaver
     ```
   - Install dependencies:
     ```bash
     npm install
     ```

6. **Build the Plugin**:
   - Run the build command to compile TypeScript files:
     ```bash
     npm run build
     ```

7. **Enable the Plugin in Obsidian**:
   - Open Obsidian, go to **Settings > Community Plugins**, and ensure **Safe Mode** is off.
   - Locate **Semantic Weaver** in the plugin list and click **Enable**.
   - Check the console (Ctrl+Shift+I) for errors. If you see `"Solid dependencies not found"`, this is expected unless Solid support is needed (see [Optional: Enable Solid Support](#optional-enable-solid-support)).

8. **Verify Setup**:
   - Confirm the `./ontology/` folder exists:
     ```bash
     dir your-vault\ontology\ontology.ttl
     dir your-vault\ontology\project.ttl
     ```
   - Test basic functionality:
     - Go to **Settings > Semantic Weaver Settings** and enable **Semantic Canvas Mode**.
     - Create a canvas (`File > New Canvas`), add nodes/edges, and use **Edit Semantic Node** or **Edit Semantic Edge** from the context menu.
     - Run a SPARQL query via **Run SPARQL Query** (e.g., `SELECT ?s ?p ?o WHERE { ?s ?p ?o }`).
     - Open **Semantic Weaver: Open RDF Graph View** to visualize RDF data.
     - Export via **Semantic Weaver: Export RDF Docs for MkDocs**, setting **Local Export Directory** (e.g., `~/my-docs`) and **GitHub** provider.

## Optional: Enable Solid Support

To enable Solid Pod integration (publishing RDF data to Solid Pods):
- Install optional dependencies:
  ```bash
  npm install @comunica/query-sparql-solid@4.3.0 @inrupt/solid-client-authn-browser@2.0.0
  ```
- Rebuild the plugin:
  ```bash
  npm run build
  ```
- Use the **Semantic Weaver: Solid Pod Login** ribbon icon to log in and select a vault.
- Test publishing RDF data to your Solid Pod.

## File Structure

Ensure the following structure in `your-vault/.obsidian/plugins/semantic-weaver/`:
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
│   │   ├── semantic-canvas.md
│   │   ├── authoring-cml-cmld.md
│   │   ├── metadata-ui.md
│   │   ├── mermaid-diagrams.md
│   │   ├── faceted-search.md
│   │   ├── deployment.md
│   │   ├── solid-pod.md
│   │   ├── rdf-graph.md
│   ├── github-action.yml
├── js/
│   ├── rdf-render.js
│   ├── faceted-search.js
│   ├── rdf-graph.js
├── tests/
│   ├── page1.markdown
│   ├── meta.rdf.json
```

## Troubleshooting

- **Dereference Error** (`Could not dereference ...ontology.ttl`):
  - Ensure `ontology.ttl` and `project.ttl` exist in `your-vault/ontology/`.
  - Verify file paths use forward slashes (e.g., `F:/git-working-folder/test-obsidian-plugin/TestPlugin/ontology/ontology.ttl`).
  - Check file readability:
    ```bash
    type your-vault\ontology\ontology.ttl
    type your-vault\ontology\project.ttl
    ```
  - If errors persist, open the Obsidian console (Ctrl+Shift+I) and share the output.

- **Solid Dependencies Warning** (`Solid dependencies not found`):
  - This is expected if `@comunica/query-sparql-solid` and `@inrupt/solid-client-authn-browser` are not installed. Install them for Solid support or ignore if not needed.

- **Build Errors**:
  - Ensure all dependencies are installed (`npm install`).
  - Verify `esbuild.config.js` includes all entry points (`main.ts`, modals, views, utils, settings).
  - Clear npm cache and retry:
    ```bash
    npm cache clean --force
    npm install
    npm run build
    ```

- **Export Issues**:
  - Ensure **Local Export Directory** and **Site URL** are set in the export modal.
  - For GitHub deployment, add a Personal Access Token to the repository’s secrets (`GH_TOKEN`).

## Previewing Exported Docs

To preview the exported MkDocs site:
```bash
cd ~/my-docs
pip install mkdocs mkdocs-material mkdocs-mermaid2 rdflib
mkdocs serve
```
Open `http://localhost:8000` in your browser.