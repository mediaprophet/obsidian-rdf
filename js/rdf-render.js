import React, { useEffect, useState } from 'react';
import { Parser } from 'n3';


const RDFTable = ({ jsonldPath }) => {
  const [triples, setTriples] = useState([]);

  useEffect(() => {
    const fetchTriples = async () => {
      try {
        const res = await fetch(jsonldPath);
        const data = await res.text();
        const parser = new Parser();
        const parsedTriples = [];
        parser.parse(data, (error, quad, prefixes) => {
          if (quad) {
            parsedTriples.push({
              subject: quad.subject.value,
              predicate: quad.predicate.value.split('/').pop(),
              object: quad.object.value
            });
          } else if (error) {
            console.error(error);
          }
        });
        setTriples(parsedTriples);
      } catch (e) {
        setTriples([]);
        console.error(e);
      }
    };
    fetchTriples();
  }, [jsonldPath]);

  return (
    <table>
      <thead>
        <tr>
          <th>Subject</th>
          <th>Predicate</th>
          <th>Object</th>
        </tr>
      </thead>
      <tbody>
        {triples.map((triple, index) => (
          <tr key={index}>
            <td><a href={triple.subject}>{triple.subject.split('/').pop()}</a></td>
            <td>{triple.predicate}</td>
            <td>{triple.object.startsWith('http') ? <a href={triple.object}>{triple.object.split('/').pop()}</a> : triple.object}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default RDFTable;