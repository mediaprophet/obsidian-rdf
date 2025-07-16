import { App, Notice, TFile, TFolder } from 'obsidian';
import * as N3 from 'n3';
import { RDFPlugin } from '../main';
import { MarkdownLDModal } from '../modals/MarkdownLDModal';

const { namedNode, literal, quad } = N3.DataFactory;

export class RDFUtils {
  private plugin: RDFPlugin;

  constructor(plugin: RDFPlugin) {
    this.plugin = plugin;
  }

  async loadOntology(): Promise<string> {
    const ontologyPath = 'templates/ontology.ttl';
    const ontologyFile = this.plugin.app.vault.getAbstractFileByPath(ontologyPath);
    if (ontologyFile instanceof TFile) {
      try {
        return await this.plugin.app.vault.read(ontologyFile);
      } catch (error) {
        console.error('Error reading ontology.ttl:', error);
        new Notice('Error reading ontology file');
      }
    }
    // Fallback to default TTL if file is missing
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
    const folderPath = 'templates';
    const folder = this.plugin.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) {
      await this.plugin.app.vault.createFolder(folderPath);
    }
    await this.plugin.app.vault.create(ontologyPath, defaultTtl);
    new Notice(`Created default ontology file: ${ontologyPath}`);
    return defaultTtl;
  }

  async loadProjectTTL(store: N3.Store): Promise<void> {
    const projectPath = 'templates/project.ttl';
    const projectFile = this.plugin.app.vault.getAbstractFileByPath(projectPath);
    if (projectFile instanceof TFile) {
      try {
        const content = await this.plugin.app.vault.read(projectFile);
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
        new Notice(`Loaded project TTL: ${projectPath}`);
      } catch (error) {
        throw new Error(`Could not load project TTL from ${projectPath}: ${error.message}`);
      }
    }
  }

  async loadMarkdownOntologies(store: N3.Store): Promise<void> {
    const ontologyFolderPath = 'templates/ontology';
    let ontologyFolder = this.plugin.app.vault.getAbstractFileByPath(ontologyFolderPath);
    if (!(ontologyFolder instanceof TFolder)) {
      new Notice(`Ontology folder ${ontologyFolderPath} not found. Creating it...`);
      await this.plugin.app.vault.createFolder(ontologyFolderPath);
      ontologyFolder = this.plugin.app.vault.getAbstractFileByPath(ontologyFolderPath) as TFolder;
    }

    // If folder is empty, create a default README.md for visibility in Obsidian
    if (ontologyFolder.children.length === 0) {
      const defaultMD = `[ex]: http://example.org/\n[Document]{typeof=ex:Document rdfs:label="Document"}`;
      await this.plugin.app.vault.create(`${ontologyFolderPath}/README.md`, defaultMD);
      new Notice('Created default README.md in ontology folder for visibility.');
    }

    const files = ontologyFolder.children.filter(file => file instanceof TFile && file.extension === 'md') as TFile[];
    for (const file of files) {
      try {
        const content = await this.plugin.app.vault.read(file);
        const modal = new MarkdownLDModal(this.plugin.app, this.plugin, null, async () => {}, this.plugin.settingsManager.settings.outputFormat);
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
        new Notice(`Loaded Markdown ontology: ${file.path}`);
      } catch (error) {
        new Notice(`Failed to parse Markdown-LD in ${file.path}: ${error.message}. Check syntax (e.g., invalid line or missing prefix).`);
        console.error(error);
      }
    }
  }

  async canvasToMermaid(canvasData: any): Promise<string> {
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

  async loadExportedPredicates(store: N3.Store, exportDir: string): Promise<void> {
    const canvasDir = `${exportDir}/docs/canvas`;
    // Ensure folder exists to avoid ENOENT
    await this.plugin.app.vault.createFolder(canvasDir).catch(() => { /* Ignore if exists */ });
    const canvasFolder = this.plugin.app.vault.getAbstractFileByPath(canvasDir);
    if (canvasFolder instanceof TFolder) {
      const files = canvasFolder.children.filter(file => file instanceof TFile && file.extension === 'ttl') as TFile[];
      for (const file of files) {
        try {
          const content = await this.plugin.app.vault.read(file);
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
          new Notice(`Loaded predicates from exported file: ${file.path}`);
        } catch (error) {
          new Notice(`Failed to load predicates from ${file.path}: ${error.message}`);
          console.error(error);
        }
      }
    } else {
      new Notice(`Export directory ${canvasDir} not found. Run 'Export RDF Docs for MkDocs' to create it.`);
    }
  }

  async storeQuad(store: N3.Store, quads: any[]): Promise<void> {
    await store.addQuads(quads);
  }

  async parseCML(markdown: string): Promise<any[]> {
    // Note: Use ex:refersTo for ambiguity resolution, e.g., [Washington] ex:refersTo: [ex:State_Washington] to disambiguate terms like 'Washington' (state vs. person).
    const triples: any[] = [];
    const cmlPattern = /(@doc\s+)?\[(.*?)\]\s*(.*?)(?=\n\[|\n@doc|\Z)/gs;
    const matches = markdown.matchAll(cmlPattern);
    for (const match of matches) {
      const isDoc = !!match[1];
      const subject = match[2].trim();
      const properties = match[3].trim();
      const ns = isDoc ? this.plugin.settingsManager.getNamespaces().doc : this.plugin.settingsManager.getNamespaces().ex;
      const subjUri = namedNode(`${ns}${subject.replace(' ', '_')}`);
      const propPairs = properties.split(';').map(p => p.trim()).filter(p => p && p.includes(':'));
      for (const pair of propPairs) {
        const [pred, obj] = pair.split(':', 2).map(s => s.trim());
        const predUri = namedNode(`${ns}${pred}`);
        if (obj.startsWith('[') && obj.endsWith(']')) {
          const objUri = namedNode(`${this.plugin.settingsManager.getNamespaces().ex}${obj.slice(1, -1).replace(' ', '_')}`);
          triples.push(quad(subjUri, predUri, objUri));
        } else {
          triples.push(quad(subjUri, predUri, literal(obj.replace(/^"|"$/, ''))));
        }
      }
    }
    return triples;
  }

  async canvasToTurtle(canvasData: any): Promise<string> {
    const store = this.plugin.rdfStore;
    const writer = new N3.Writer({ format: 'Turtle' });
    for (const node of canvasData.nodes) {
      const nodeUri = node.url || `${this.plugin.settingsManager.getNamespaces().ex}${node.id}`;
      const quads = store.getQuads(namedNode(nodeUri), null, null);
      quads.forEach(q => writer.addQuad(q));
    }
    for (const edge of canvasData.edges) {
      const fromNode = canvasData.nodes.find(n => n.id === edge.fromNode);
      const toNode = canvasData.nodes.find(n => n.id === edge.toNode);
      if (fromNode && toNode) {
        const fromUri = fromNode.url || `${this.plugin.settingsManager.getNamespaces().ex}${edge.fromNode}`;
        const toUri = toNode.url || `${this.plugin.settingsManager.getNamespaces().ex}${edge.toNode}`;
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

  async exportCanvasToRDF(canvasFile: TFile, format: 'jsonld' | 'turtle'): Promise<string> {
    const canvasContent = await this.plugin.app.vault.read(canvasFile);
    const canvasData = JSON.parse(canvasContent);
    const store = this.plugin.rdfStore;
    const quads = [];
    for (const node of canvasData.nodes) {
      const nodeUri = node.url || `${this.plugin.settingsManager.getNamespaces().ex}${node.id}`;
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
        const fromUri = fromNode.url || `${this.plugin.settingsManager.getNamespaces().ex}${edge.fromNode}`;
        const toUri = toNode.url || `${this.plugin.settingsManager.getNamespaces().ex}${edge.toNode}`;
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

  async copyJsFiles(exportDir: string): Promise<void> {
    const srcJsDir = 'js';
    const destJsDir = `${exportDir}/docs/js`;
    const srcFolder = this.plugin.app.vault.getAbstractFileByPath(srcJsDir);
    if (srcFolder instanceof TFolder) {
      await this.plugin.app.vault.createFolder(destJsDir).catch(() => {});
      const files = ['faceted-search.js', 'rdf-graph.js', 'rdf-render.js'];
      for (const file of files) {
        const srcFile = this.plugin.app.vault.getAbstractFileByPath(`${srcJsDir}/${file}`);
        if (srcFile instanceof TFile) {
          const content = await this.plugin.app.vault.read(srcFile);
          await this.plugin.app.vault.create(`${destJsDir}/${file}`, content);
          new Notice(`Copied ${file} to ${destJsDir}`);
        } else {
          new Notice(`Warning: ${file} not found in ${srcJsDir}`);
        }
      }
    } else {
      new Notice(`Source JS directory ${srcJsDir} not found`);
    }
  }

  async copyDocs(exportDir: string): Promise<void> {
    const srcDocsDir = 'templates';
    const destDocsDir = `${exportDir}/docs`;
    const srcFolder = this.plugin.app.vault.getAbstractFileByPath(srcDocsDir);
    if (srcFolder instanceof TFolder) {
      await this.plugin.app.vault.createFolder(destDocsDir).catch(() => {});
      const files = srcFolder.children.filter(file => file instanceof TFile && (file.extension === 'md' || file.extension === 'yml')) as TFile[];
      for (const file of files) {
        const content = await this.plugin.app.vault.read(file);
        await this.plugin.app.vault.create(`${destDocsDir}/${file.name}`, content);
        new Notice(`Copied ${file.name} to ${destDocsDir}`);
      }
      const tutorialsDir = `${srcDocsDir}/tutorials`;
      const destTutorialsDir = `${destDocsDir}/tutorials`;
      const tutorialsFolder = this.plugin.app.vault.getAbstractFileByPath(tutorialsDir);
      if (tutorialsFolder instanceof TFolder) {
        await this.plugin.app.vault.createFolder(destTutorialsDir).catch(() => {});
        const tutorialFiles = tutorialsFolder.children.filter(file => file instanceof TFile && file.extension === 'md') as TFile[];
        for (const file of tutorialFiles) {
          const content = await this.plugin.app.vault.read(file);
          await this.plugin.app.vault.create(`${destTutorialsDir}/${file.name}`, content);
          new Notice(`Copied tutorial ${file.name} to ${destTutorialsDir}`);
        }
      }
    } else {
      new Notice(`Source docs directory ${srcDocsDir} not found. Creating it...`);
      await this.plugin.app.vault.createFolder(srcDocsDir);
    }
  }

  async deployToGitHub(exportDir: string): Promise<void> {
    new Notice('GitHub deployment is not supported in browser-based Obsidian environments. Please run Git commands manually or use a Node.js-based deployment script outside Obsidian.');
    console.warn('deployToGitHub is not implemented due to lack of child_process support in browser-based Obsidian.');
    // TODO: Implement alternative deployment logic, e.g., generate a script for the user to run manually
  }

  async generateProjectTTL(): Promise<string> {
    const store = this.plugin.rdfStore;
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

  extractCMLDMetadata(content: string): { [key: string]: string } {
    const metadata: { [key: string]: string } = {};
    const cmlPattern = /(@doc\s+)?\[(.*?)\]\s*(.*?)(?=\n\[|\n@doc|\Z)/gs;
    const matches = content.matchAll(cmlPattern);
    for (const match of matches) {
      if (match[1]) {
        const properties = match[3].trim();
        const propPairs = properties.split(';').map(p => p.trim()).filter(p => p && p.includes(':'));
        for (const pair of propPairs) {
          const [key, value] = pair.split(':', 2).map(s => s.trim());
          metadata[key] = value.replace(/^"|"$/, '');
        }
      }
    }
    return metadata;
  }

  async updateCMLDMetadata(file: TFile, newMetadata: { [key: string]: string }): Promise<void> {
    let content = await this.plugin.app.vault.read(file);
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
    await this.plugin.app.vault.modify(file, content);
  }

  async executeSPARQL(store: N3.Store, query: string): Promise<any[]> {
    const results = [];
    try {
      for await (const binding of store.query(query)) {
        results.push(Object.fromEntries(binding.entries()));
      }
    } catch (error) {
      new Notice(`SPARQL query error: ${error.message}`);
    }
    return results;
  }
}