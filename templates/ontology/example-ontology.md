# Example Ontology
[schema]: http://schema.org
[rdfs]: http://www.w3.org/2000/01/rdf-schema#
[owl]: http://www.w3.org/2002/07/owl#

[Person]{typeof=schema:Person rdfs:label="Person"}
[Document]{typeof=schema:Document rdfs:label="Document"}
[name]{typeof=rdfs:Property schema:domainIncludes=[Person]; schema:rangeIncludes=[schema:Text]; rdfs:label="Name"}
[author]{typeof=rdfs:Property schema:domainIncludes=[Document]; schema:rangeIncludes=[Person]; rdfs:label="Author"}
[refersTo]{typeof=rdfs:Property schema:domainIncludes=[rdfs:Resource]; schema:rangeIncludes=[rdfs:Resource]; rdfs:label="Refers To"}