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