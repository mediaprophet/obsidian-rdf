import { App, Notice, TFile } from 'obsidian';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import * as N3 from 'n3';
import { RDFPlugin } from '../main';

const { namedNode, literal, quad } = N3.DataFactory;

export async function loadOntology(app: App): Promise<string> {
  const ontologyPath = path.join(app.vault.adapter.basePath, 'ontology', 'ontology.ttl').replace(/\\/g, '/');
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

ex:similarTo a owl:ObjectProperty ;
  rdfs:label "Similar To" .

ex:unRelatedTo a owl:ObjectProperty ;
  rdfs:label "Unrelated To" .

ex:differentTo a owl:ObjectProperty ;
  rdfs:label "Different To" .

doc:category a rdf:Property ;
  rdfs:label "Category" ;
  rdfs:domain doc:Document ;
  rdfs:range rdfs:Literal .

doc:author a rdf:Property ;
  rdfs:label "Author" ;
  rdfs:domain doc:Document ;
  rdfs:range ex:Person .

doc:related a rdf:Property ;
  rdfs:label "Related" ;
  rdfs:domain doc:Document ;
  rdfs:range doc:Document .

doc:created a rdf:Property ;
  rdfs:label "Created Date" ;
  rdfs:domain doc:Document ;
  rdfs:range rdfs:Literal .

doc:version a rdf:Property ;
  rdfs:label "Version" ;
  rdfs:domain doc:Document ;
  rdfs:range rdfs:Literal .

doc:Document a rdfs:Class ;
  rdfs:label "Document" .

ex:Person a rdfs:Class ;
  rdfs:label "Person" .`;
    await fs.promises.mkdir(path.dirname(ontologyPath), { recursive: true });
    await fs.promises.writeFile(ontologyPath, defaultTtl);
    return defaultTtl;
  }
}

export async function loadProjectTTL(app: App, store: N3.Store): Promise<void> {
  const projectPath = path.join(app.vault.adapter.basePath, 'ontology', 'project.ttl').replace(/\\/g, '/');
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
  } else if (format === 'turtle') {
    const writer = new N3.Writer({ format: 'Turtle' });
    quads.forEach(q => writer.addQuad(q));
    return new Promise<string>((resolve, reject) => {
      writer.end((error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }
  return '';
}

export async function fetchOntologyTerms(store: N3.Store): Promise<{ uri: string, label: string }[]> {
  const query = `
    SELECT ?uri ?label WHERE {
      ?uri a <http://www.w3.org/2002/07/owl#Class> .
      ?uri <http://www.w3.org/2000/01/rdf-schema#label> ?label .
    }
  `;
  const results = [];
  for await (const binding of store.query(query)) {
    results.push({
      uri: binding.get('uri')?.value,
      label: binding.get('label')?.value
    });
  }
  return results;
}

export function extractCMLDMetadata(content: string): { [key: string]: string } {
  const metadata: { [key: string]: string } = {};
  const cmlPattern = /(@doc\s+\[(.*?)\]\s*(.*?)(?=\n\[|\n@doc|\Z))/s;
  const match = content.match(cmlPattern);
  if (match) {
    const properties = match[2].trim().split(';').map(p => p.trim()).filter(p => p && p.includes(':'));
    for (const pair of properties) {
      const [key, value] = pair.split(':', 2).map(s => s.trim());
      metadata[key] = value.replace(/^\[|\]$/g, '').replace(/^"|"$/g, '');
    }
  }
  return metadata;
}

export async function updateCMLDMetadata(app: App, file: TFile, metadata: { [key: string]: string }) {
  const content = await app.vault.read(file);
  const cmlPattern = /(@doc\s+\[.*?\]\s*.*?)(?=\n\[|\n@doc|\Z)/s;
  const newCMLD = `@doc [${file.basename}] ${Object.entries(metadata)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k}: ${v.startsWith('http') ? `[${v.split('/').pop()}]` : `"${v}"`}`)
    .join('; ')}.`;
  let updatedContent;
  if (content.match(cmlPattern)) {
    updatedContent = content.replace(cmlPattern, newCMLD);
  } else {
    updatedContent = `${content}\n\n${newCMLD}`;
  }
  await app.vault.modify(file, updatedContent);
}

export async function deployToGitHub(plugin: RDFPlugin, exportDir: string) {
  const { githubRepo } = plugin.settings;
  if (!githubRepo) {
    throw new Error('GitHub repository not specified.');
  }
  try {
    process.chdir(exportDir);
    child_process.execSync('git init', { stdio: 'inherit' });
    child_process.execSync('git add .', { stdio: 'inherit' });
    child_process.execSync('git commit -m "Export RDF docs with Semantic Weaver"', { stdio: 'inherit' });
    child_process.execSync(`git remote add origin https://github.com/${githubRepo}.git`, { stdio: 'inherit' });
    child_process.execSync('git push -f origin main', { stdio: 'inherit' });
    new Notice(`Pushed to GitHub repository ${githubRepo} by Semantic Weaver`);
  } catch (error) {
    throw new Error(`Failed to push to GitHub: ${error.message}`);
  }
}

export async function generateProjectTTL(plugin: RDFPlugin): Promise<string> {
  const writer = new N3.Writer({ format: 'Turtle' });
  writer.addQuad(
    quad(
      namedNode(`http://example.org/project/${plugin.app.vault.getName()}`),
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      namedNode('http://usefulinc.com/ns/doap#Project')
    )
  );
  writer.addQuad(
    quad(
      namedNode(`http://example.org/project/${plugin.app.vault.getName()}`),
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      namedNode('http://schema.org/SoftwareApplication')
    )
  );
  writer.addQuad(
    quad(
      namedNode(`http://example.org/project/${plugin.app.vault.getName()}`),
      namedNode('http://purl.org/dc/elements/1.1/title'),
      literal(plugin.app.vault.getName())
    )
  );
  writer.addQuad(
    quad(
      namedNode(`http://example.org/project/${plugin.app.vault.getName()}`),
      namedNode('http://purl.org/dc/elements/1.1/creator'),
      literal('Semantic Weaver')
    )
  );
  writer.addQuad(
    quad(
      namedNode(`http://example.org/project/${plugin.app.vault.getName()}`),
      namedNode('http://purl.org/dc/elements/1.1/date'),
      literal('2025-07-15')
    )
  );
  if (plugin.settings.siteUrl) {
    writer.addQuad(
      quad(
        namedNode(`http://example.org/project/${plugin.app.vault.getName()}`),
        namedNode('http://usefulinc.com/ns/doap#homepage'),
        namedNode(plugin.settings.siteUrl)
      )
    );
  }
  if (plugin.settings.githubRepo) {
    writer.addQuad(
      quad(
        namedNode(`http://example.org/project/${plugin.app.vault.getName()}`),
        namedNode('http://usefulinc.com/ns/doap#repository'),
        namedNode(`https://github.com/${plugin.settings.githubRepo}`)
      )
    );
  }
  return new Promise<string>((resolve, reject) => {
    writer.end((error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

export async function copyDocs(plugin: RDFPlugin, pluginDir: string, exportDir: string, includeTests: boolean) {
  const templateFiles = [
    'mkdocs.yml',
    'getting-started.md',
    'tutorials/semantic-canvas.md',
    'tutorials/authoring-cml-cmld.md',
    'tutorials/metadata-ui.md',
    'tutorials/mermaid-diagrams.md',
    'tutorials/faceted-search.md',
    'tutorials/deployment.md',
    'tutorials/rdf-graph.md',
    'github-action.yml'
  ];
  for (const file of templateFiles) {
    const srcPath = path.join(pluginDir, 'templates', file).replace(/\\/g, '/');
    const destPath = path.join(exportDir, file).replace(/\\/g, '/');
    try {
      await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
      await fs.promises.copyFile(srcPath, destPath);
    } catch (error) {
      new Notice(`Failed to copy template ${file}: ${error.message}`);
    }
  }
  if (includeTests) {
    const testFiles = await fs.promises.readdir(path.join(pluginDir, 'tests'), { recursive: true });
    for (const file of testFiles) {
      const srcPath = path.join(pluginDir, 'tests', file).replace(/\\/g, '/');
      const destPath = path.join(exportDir, 'docs', 'tests', file).replace(/\\/g, '/');
      await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

export async function copyJsFiles(plugin: RDFPlugin, pluginDir: string, exportDir: string) {
  const jsFiles = ['rdf-render.js', 'faceted-search.js', 'rdf-graph.js'];
  for (const file of jsFiles) {
    const srcPath = path.join(pluginDir, 'js', file).replace(/\\/g, '/');
    const destPath = path.join(exportDir, 'docs', 'js', file).replace(/\\/g, '/');
    try {
      await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
      await fs.promises.copyFile(srcPath, destPath);
    } catch (error) {
      new Notice(`Failed to copy JS file ${file}: ${error.message}`);
    }
  }
}