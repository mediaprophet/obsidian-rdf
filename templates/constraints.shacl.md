## SHACL Constraint: CertaintyCheck
```sparql
SELECT ?this WHERE {
  ?this ex:certainty ?c .
  FILTER NOT EXISTS { <<?s ?p ?o>> ex:certainty ?c . }
}
```