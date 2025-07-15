import { App, Modal, Setting, Notice, TFile } from 'obsidian';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { ttl2jsonld } from '@frogcat/ttl2jsonld';
import * as N3 from 'n3';
import { RDFPlugin } from '../main';

interface MarkdownLDNode {
  type: string;
  id: string;
  properties: { [key: string]: string | string[] };
}

interface SHACLConstraint {
  id: string;
  sparql: string;
}

export class MarkdownLDModal extends Modal {
  plugin: RDFPlugin;
  file: TFile | null;
  onSubmit: (graph: any, turtle: string, constraints: SHACLConstraint[], file: TFile | null) => void;
  markdownContent: string = '';
  outputFormat: 'jsonld' | 'turtle' = 'turtle';

  constructor(app: App, plugin: RDFPlugin, file: TFile | null, onSubmit: (graph: any, turtle: string, constraints: SHACLConstraint[], file: TFile | null) => void) {
    super(app);
    this.plugin = plugin;
    this.file = file;
    this.onSubmit = onSubmit;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Semantic Weaver: Parse Markdown-LD' });

    // Load file content if provided
    if (this.file) {
      this.markdownContent = await this.app.vault.read(this.file);
    }

    new Setting(contentEl)
      .setName('Markdown Content')
      .setDesc('Enter Markdown with RDF-Star and SHACL annotations')
      .addTextArea(text => text
        .setPlaceholder('e.g., [ex]: http://example.org/\n## Mode: rdf-star\n[Node1]{typeof=ex:Document}\n<<[Node1] ex:relatedTo [Node2]>> ex:certainty="0.9"')
        .setValue(this.markdownContent)
        .onChange(value => (this.markdownContent = value)));

    new Setting(contentEl)
      .setName('Output Format')
      .setDesc('Select output format for RDF data')
      .addDropdown(dropdown => dropdown
        .addOption('turtle', 'Turtle')
        .addOption('jsonld', 'JSON-LD')
        .setValue(this.outputFormat)
        .onChange(value => (this.outputFormat = value as 'jsonld' | 'turtle')));

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText('Parse and Save')
        .setCta()
        .onClick(async () => {
          try {
            const { graph, constraints } = this.parseMarkdownLD(this.markdownContent);
            const turtle = await this.markdownLDToTurtle(this.markdownContent);
            this.onSubmit(graph, turtle, constraints, this.file);
            this.close();
          } catch (error) {
            new Notice(`Failed to parse Markdown-LD: ${error.message}`);
            console.error(error);
          }
        }))
      .addButton(btn => btn
        .setButtonText('Cancel')
        .onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
  }

  private parseMarkdownLD(content: string): { graph: any; constraints: SHACLConstraint[] } {
    const processor = unified().use(remarkParse);
    const ast = processor.parse(content);

    let mode: 'standard' | 'rdf-star' = 'standard';
    const namespaces: { [key: string]: string } = {};
    const nodes: MarkdownLDNode[] = [];
    const constraints: SHACLConstraint[] = [];
    let currentNode: MarkdownLDNode | null = null;

    function processNode(node: any) {
      if (node.type === 'heading' && node.depth === 2) {
        const text = node.children[0]?.value || '';
        if (text.match(/^Mode: (standard|rdf-star)$/)) {
          mode = text.split(': ')[1] as 'standard' | 'rdf-star';
        } else if (text.match(/^SHACL Constraint: (.+)/)) {
          const [, id] = text.match(/^SHACL Constraint: (.+)/) || [];
          const sparqlNode = node.children.find((n: any) => n.type === 'code' && n.lang === 'sparql') || node.nextSibling;
          if (sparqlNode?.type === 'code' && sparqlNode.lang === 'sparql') {
            constraints.push({ id, sparql: sparqlNode.value });
          }
        }
      } else if (node.type === 'paragraph') {
        const text = node.children[0]?.value || '';
        if (text.match(/^\[(\w+)\]:\s*(\S+)/)) {
          const [, prefix, uri] = text.match(/^\[(\w+)\]:\s*(\S+)/) || [];
          namespaces[prefix] = uri;
        } else if (text.match(/^\[([^\]]+)\]\{(.+)\}/)) {
          const [, id, attributes] = text.match(/^\[([^\]]+)\]\{(.+)\}/) || [];
          const props: { [key: string]: string } = {};
          attributes.split(/\s+/).forEach((attr: string) => {
            const [key, value] = attr.split('=');
            props[key] = value.replace(/^"|"$/g, '');
          });
          currentNode = { type: props.typeof || 'rdfs:Resource', id, properties: props };
          nodes.push(currentNode);
        } else if (mode === 'rdf-star' && text.match(/^<<\[([^\]]+)\]\s+([^:]+):\s*\[([^\]]+)\]>> (.+)/)) {
          const [, subject, predicate, object, props] = text.match(/^<<\[([^\]]+)\]\s+([^:]+):\s*\[([^\]]+)\]>> (.+)/) || [];
          const propsObj: { [key: string]: string } = {};
          props.split(';').forEach((pair: string) => {
            const [key, value] = pair.split(':').map(s => s.trim());
            propsObj[key] = value.replace(/^"|"$/g, '');
          });
          nodes.push({
            type: 'rdf:Statement',
            id: `_:${Math.random().toString(36).slice(2)}`,
            properties: {
              'rdf:subject': `${namespaces.ex || 'http://example.org/'}${subject.replace(/\s+/g, '_')}`,
              'rdf:predicate': `${namespaces.ex || 'http://example.org/'}${predicate}`,
              'rdf:object': `${namespaces.ex || 'http://example.org/'}${object.replace(/\s+/g, '_')}`,
              ...propsObj
            }
          });
        }
      }
      if (node.children) {
        node.children.forEach(processNode);
      }
    }

    processNode(ast);

    const jsonld = {
      '@context': namespaces,
      '@graph': nodes.map(node => ({
        '@id': node.type === 'rdf:Statement' ? node.id : `${namespaces.ex || 'http://example.org/'}${node.id.replace(/\s+/g, '_')}`,
        '@type': node.type,
        ...Object.fromEntries(
          Object.entries(node.properties).filter(([key]) => key !== 'typeof')
        )
      }))
    };

    return { graph: jsonld, constraints };
  }

  private async markdownLDToTurtle(content: string): Promise<string> {
    const { graph } = this.parseMarkdownLD(content);
    const writer = new N3.Writer({ format: 'Turtle' });
    const parser = new N3.Parser({ format: 'application/ld+json' });
    const quads = await new Promise<N3.Quad[]>((resolve, reject) => {
      const quads: N3.Quad[] = [];
      parser.parse(JSON.stringify(graph), (error, quad, prefixes) => {
        if (error) reject(error);
        if (quad) quads.push(quad);
        else resolve(quads);
      });
    });
    writer.addQuads(quads);
    return new Promise<string>((resolve, reject) => {
      writer.end((error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  async validateSHACL(content: string): Promise<any[]> {
    const { constraints } = this.parseMarkdownLD(content);
    const results: any[] = [];
    for (const constraint of constraints) {
      try {
        const queryResults = [];
        for await (const binding of this.plugin.rdfStore.query(constraint.sparql)) {
          queryResults.push({
            constraint: constraint.id,
            subject: binding.get('this')?.value,
            message: `Failed constraint ${constraint.id}`
          });
        }
        results.push(...queryResults);
      } catch (error) {
        results.push({ constraint: constraint.id, error: error.message });
      }
    }
    return results;
  }
}