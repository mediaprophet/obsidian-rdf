import { App, Modal, Setting, Notice, TFile } from 'obsidian';
import { RDFPlugin } from '../main';
import * as N3 from 'n3';
import Parser from '@rdfjs/parser-n3';
import Serializer from '@rdfjs/serializer-jsonld';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';

export class MarkdownLDModal extends Modal {
  plugin: RDFPlugin;
  file: TFile | null;
  onSubmit: (graph: any, turtle: string, constraints: string[], file: TFile | null) => void;
  outputFormat: 'turtle' | 'jsonld';
  markdownContent: string;

  constructor(app: App, plugin: RDFPlugin, file: TFile | null, onSubmit: (graph: any, turtle: string, constraints: string[], file: TFile | null) => void, outputFormat: 'turtle' | 'jsonld') {
    super(app);
    this.plugin = plugin;
    this.file = file;
    this.onSubmit = onSubmit;
    this.outputFormat = outputFormat;
    this.markdownContent = '';
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('semantic-weaver-modal');
    contentEl.createEl('h2', { text: 'Parse Markdown-LD' });

    let markdownInput = '';
    if (this.file) {
      markdownInput = await this.app.vault.read(this.file);
    }

    new Setting(contentEl)
      .setName('Markdown-LD Content')
      .setDesc('Enter Markdown-LD content to parse. Use [ex]: http://example.org/ for namespaces, [Node]{typeof=ex:Type} for nodes, and <<[S] p [O]>> for RDF-Star triples.')
      .setClass('semantic-weaver-setting')
      .addTextArea(text => {
        text
          .setPlaceholder('[ex]: http://example.org/\n[Document]{typeof=ex:Document; category="Report"}')
          .setValue(markdownInput)
          .onChange(value => (this.markdownContent = value.trim()));
        text.inputEl.addClass('semantic-weaver-textarea');
        return text;
      });

    const validationEl = contentEl.createEl('div', { cls: 'semantic-weaver-validation' });

    new Setting(contentEl)
      .setClass('semantic-weaver-button-group')
      .addButton(button => button
        .setButtonText('Parse')
        .setCta()
        .onClick(async () => {
          if (!this.markdownContent) {
            validationEl.setText('Error: Please enter Markdown-LD content.');
            return;
          }
          try {
            const { graph, turtle, constraints } = this.parseMarkdownLD(this.markdownContent);
            this.onSubmit(graph, turtle, constraints, this.file);
            validationEl.setText('Success: Markdown-LD parsed.');
            this.close();
          } catch (error) {
            validationEl.setText(`Error: Failed to parse Markdown-LD: ${error.message}`);
            console.error(error);
          }
        }))
      .addButton(button => button
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  parseMarkdownLD(content: string): { graph: any; turtle: string; constraints: string[] } {
    const processor = unified()
      .use(remarkParse)
      .use(remarkStringify);
    
    const ast = processor.parse(content);
    const prefixes: { [key: string]: string } = {};
    const nodes: { [key: string]: { type?: string; properties: { [key: string]: string } } } = {};
    const rdfStarTriples: string[] = [];
    const constraints: string[] = [];

    let currentSection: string | null = null;
    for (const node of ast.children) {
      if (node.type === 'definition' && node.label && node.url) {
        prefixes[node.label] = node.url;
      } else if (node.type === 'heading' && node.children[0]?.type === 'text') {
        currentSection = node.children[0].value.toLowerCase();
      } else if (node.type === 'paragraph' && currentSection?.includes('shacl constraint')) {
        const sparql = node.children.find(c => c.type === 'code' && c.lang === 'sparql')?.value;
        if (sparql) constraints.push(sparql);
      } else if (node.type === 'paragraph') {
        const text = processor.stringify({ type: 'paragraph', children: node.children }).trim();
        if (text.startsWith('<<') && text.endsWith('>>')) {
          rdfStarTriples.push(text);
        } else {
          const match = text.match(/\[([^\]]+)\](?:\{([^}]+)\})?/);
          if (match) {
            const label = match[1];
            const uri = prefixes['ex'] ? `${prefixes['ex']}${label.replace(/\s+/g, '_')}` : `http://example.org/${label.replace(/\s+/g, '_')}`;
            nodes[uri] = { properties: {} };
            if (match[2]) {
              const props = match[2].split(';').map(p => p.trim());
              for (const prop of props) {
                const [key, value] = prop.split('=').map(s => s.trim());
                if (key === 'typeof') {
                  const [prefix, local] = value.split(':');
                  nodes[uri].type = prefixes[prefix] ? `${prefixes[prefix]}${local}` : value;
                } else {
                  const [prefix, local] = key.includes(':') ? key.split(':') : ['ex', key];
                  const propKey = prefixes[prefix] ? `${prefixes[prefix]}${local}` : key;
                  nodes[uri].properties[propKey] = value.startsWith('"') ? value.slice(1, -1) : (prefixes[value.split(':')[0]] ? `${prefixes[value.split(':')[0]]}${value.split(':')[1]}` : value);
                }
              }
            }
          }
        }
      }
    }

    const store = new N3.Store();
    for (const [uri, data] of Object.entries(nodes)) {
      if (data.type) {
        store.addQuad(
          N3.DataFactory.namedNode(uri),
          N3.DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
          N3.DataFactory.namedNode(data.type)
        );
      }
      for (const [key, value] of Object.entries(data.properties)) {
        store.addQuad(
          N3.DataFactory.namedNode(uri),
          N3.DataFactory.namedNode(key),
          value.startsWith('http') ? N3.DataFactory.namedNode(value) : N3.DataFactory.literal(value)
        );
      }
    }

    for (const triple of rdfStarTriples) {
      const match = triple.match(/<<([^>]+) ([^>]+) ([^>]+)>> ([^ ]+)/);
      if (match) {
        const [, subject, predicate, object, graph] = match;
        const [sPrefix, sLocal] = subject.includes(':') ? subject.split(':') : ['ex', subject];
        const [pPrefix, pLocal] = predicate.includes(':') ? predicate.split(':') : ['ex', predicate];
        const [oPrefix, oLocal] = object.includes(':') ? object.split(':') : ['ex', object];
        const [gPrefix, gLocal] = graph.includes(':') ? graph.split(':') : ['ex', graph];
        const sUri = prefixes[sPrefix] ? `${prefixes[sPrefix]}${sLocal}` : subject;
        const pUri = prefixes[pPrefix] ? `${prefixes[pPrefix]}${pLocal}` : predicate;
        const oUri = prefixes[oPrefix] ? `${prefixes[oPrefix]}${oLocal}` : object;
        const gUri = prefixes[gPrefix] ? `${prefixes[gPrefix]}${gLocal}` : graph;
        store.addQuad(
          N3.DataFactory.namedNode(sUri),
          N3.DataFactory.namedNode(pUri),
          N3.DataFactory.namedNode(oUri),
          N3.DataFactory.namedNode(gUri)
        );
      }
    }

    const writer = new N3.Writer({ prefixes });
    store.forEach(quad => writer.addQuad(quad), null, null, null, null);
    let turtle = '';
    writer.end((error, result) => {
      if (error) throw error;
      turtle = result;
    });

    const jsonldSerializer = new Serializer();
    const graph: any[] = [];
    store.forEach(quad => {
      graph.push({
        '@id': quad.subject.value,
        [quad.predicate.value]: quad.object.termType === 'Literal' ? quad.object.value : { '@id': quad.object.value },
        ...(quad.graph.value !== 'urn:x-arq:DefaultGraph' ? { '@graph': quad.graph.value } : {})
      });
    });

    return { graph, turtle, constraints };
  }

  async markdownLDToTurtle(content: string): Promise<string> {
    const { turtle } = this.parseMarkdownLD(content);
    return turtle;
  }

  async validateSHACL(content: string): Promise<any[]> {
    const { constraints } = this.parseMarkdownLD(content);
    const results: any[] = [];
    for (const constraint of constraints) {
      try {
        const tempStore = new N3.Store();
        const parser = new Parser();
        const quads = await new Promise<N3.Quad[]>((resolve, reject) => {
          const quads: N3.Quad[] = [];
          parser.parse(this.plugin.ontologyTtl, (error, quad, prefixes) => {
            if (error) reject(error);
            if (quad) quads.push(quad);
            else resolve(quads);
          });
        });
        await tempStore.addQuads(quads);
        for await (const binding of tempStore.query(constraint)) {
          results.push({
            subject: binding.get('subject')?.value,
            predicate: binding.get('predicate')?.value,
            object: binding.get('object')?.value
          });
        }
      } catch (error) {
        results.push({ error: `SHACL validation failed: ${error.message}` });
      }
    }
    return results;
  }

  onClose() {
    this.contentEl.empty();
  }
}