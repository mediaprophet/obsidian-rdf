import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';


const RDFGraph = ({ quads }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!quads || quads.length === 0) return;

    // Deduplicate nodes
    const nodeIds = new Set();
    const nodes = [];
    quads.forEach(quad => {
      const subj = quad.subject.value || quad.subject;
      const obj = quad.object.value || quad.object;
      if (!nodeIds.has(subj)) {
        nodes.push({ data: { id: subj, label: subj.split('/').pop() } });
        nodeIds.add(subj);
      }
      if (!nodeIds.has(obj)) {
        nodes.push({ data: { id: obj, label: obj.split('/').pop() } });
        nodeIds.add(obj);
      }
    });

    const edges = quads.map(quad => {
      const subj = quad.subject.value || quad.subject;
      const obj = quad.object.value || quad.object;
      const pred = quad.predicate.value || quad.predicate;
      return {
        data: {
          source: subj,
          target: obj,
          label: pred.split('/').pop()
        }
      };
    });

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...nodes.map(n => ({ group: 'nodes', ...n })),
        ...edges.map(e => ({ group: 'edges', ...e }))
      ],
      style: [
        { selector: 'node', style: { label: 'data(label)', 'background-color': '#0074D9' } },
        { selector: 'edge', style: { label: 'data(label)', 'curve-style': 'bezier', 'target-arrow-shape': 'triangle' } }
      ],
      layout: { name: 'cose' }
    });

    return () => {
      cy.destroy();
    };
  }, [quads]);

  return <div ref={containerRef} className="rdf-graph" style={{ width: '100%', height: '400px' }} />;
};

export default RDFGraph;