import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { ttl2jsonld } from '@frogcat/ttl2jsonld';
import * as N3 from 'n3';

interface MarkdownLDNode {
  type: string;
  id: string;
  properties: { [key: string]: string | string[] };
}

interface SHACLConstraint {
  id: string;
  sparql: string;
}

export function markdownld(content: string): { graph: any; constraints: SHACLConstraint[] } {
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
        const sparqlNode = node.nextSibling;
        if (sparqlNode?.type === 'code' && sparqlNode.lang === 'sparql') {
          constraints.push({ id, sparql: sparqlNode.value });
        }
      }
    } else if (node.type === 'paragraph') {
      const text = node.children[0]?.value || '';
      // Namespace: [prefix]: URI
      if (text.match(/^\[(\w+)\]:\s*(\S+)/)) {
        const [, prefix, uri] = text.match(/^\[(\w+)\]:\s*(\S+)/) || [];
        namespaces[prefix] = uri;
      }
      // Standard RDF: [Entity]{typeof=type property=value}
      else if (text.match(/^\[([^\]]+)\]\{(.+)\}/)) {
        const [, id, attributes] = text.match(/^\[([^\]]+)\]\{(.+)\}/) || [];
        const props: { [key: string]: string } = {};
        attributes.split(/\s+/).forEach((attr: string) => {
          const [key, value] = attr.split('=');
          props[key] = value.replace(/^"|"$/g, '');
        });
        currentNode = { type: props.typeof || 'rdfs:Resource', id, properties: props };
        nodes.push(currentNode);
      }
      // RDF-Star: <<[Subject] predicate: [Object]>> property: value
      else if (mode === 'rdf-star' && text.match(/^<<\[([^\]]+)\]\s+([^:]+):\s*\[([^\]]+)\]>> (.+)/)) {
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

export async function markdownldToTurtle(content: string): Promise<string> {
  const { graph } = markdownld(content);
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

export async function validateSHACL(content: string, store: N3.Store): Promise<any[]> {
  const { constraints } = markdownld(content);
  const results: any[] = [];
  for (const constraint of constraints) {
    try {
      const queryResults = [];
      for await (const binding of store.query(constraint.sparql)) {
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