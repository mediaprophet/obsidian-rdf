# Authoring CML and CMLD

Learn to write CML and CMLD in Markdown notes.

## CML
Use square brackets for inline RDF:
```markdown
[Alice] knows [Bob]; name: "Alice Smith".
```
Represents:
```turtle
ex:Alice ex:knows ex:Bob; ex:name "Alice Smith".
```

## CMLD
Use @doc for documentation metadata:
```markdown
@doc [Page1] category: "Tutorial"; author: [Alice]; related: [Page2].
```
Represents:
```turtle
ex:Page1 doc:category "Tutorial"; doc:author ex:Alice; doc:related ex:Page2.
```

@doc [AuthoringCMLCMLD] category: "Tutorial"; author: [PluginAuthor]; created: "2025-07-14".