# Example Ontology
[schema]: http://schema.org
[rdfs]: http://www.w3.org/2000/01/rdf-schema#
[owl]: http://www.w3.org/2002/07/owl#

[Person]{typeof=schema:Person rdfs:label="Person"}
[Document]{typeof=schema:Document rdfs:label="Document"}
[name]{typeof=rdfs:Property schema:domainIncludes=[Person]; schema:rangeIncludes=[schema:Text]; rdfs:label="Name"}
[author]{typeof=rdfs:Property schema:domainIncludes=[Document]; schema:rangeIncludes=[Person]; rdfs:label="Author"}
[refersTo]{typeof=rdfs:Property schema:domainIncludes=[rdfs:Resource]; schema:rangeIncludes=[rdfs:Resource]; rdfs:label="Refers To"}

## Mode: rdf-star
[ex]: http://example.org/
[schema]: http://schema.org
[rdfs]: http://www.w3.org/2000/01/rdf-schema#
[Person]{typeof=rdfs:Class rdfs:label="Person"}
[John]{typeof=ex:Person schema:name="John Doe"}
[Mary]{typeof=ex:Person schema:name="Mary Smith"}
<<[John] ex:knows [Mary]>> ex:certainty "0.9"