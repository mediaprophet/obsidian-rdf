# Semantic Weaver Sync Guide

@doc [SemanticSyncGuide] category: "Documentation"; author: [SemanticWeaverTeam]; created: "2025-07-16"; version: "1.0.0"; related: [SemanticWeaverSpec].

## Overview

This guide provides instructions for AI agents to convert documents into Semantic Weaver's Context Markup Language (CML), Context Markup Language for Documentation (CMLD), and Markdown-LD formats for RDF integration in Obsidian. CML and CMLD address ambiguity in unstructured text or linked-data ontologies (e.g., language or regional differences) by adding contextual RDF metadata. The JSON version is available at `https://github.com/mediaprophet/obsidian-semantic-weaver` for programmatic use, while this Markdown file is for human readability within Obsidian. See [CML](https://mediaprophet.github.io/init-draft-standards-wip/cml/) and [CMLD](https://mediaprophet.github.io/init-draft-standards-wip/CMLD/) for details.

### Metadata
- **Category**: Documentation
- **Author**: Semantic Weaver Team
- **Created**: 2025-07-16
- **Version**: 1.0.0
- **Related**: [SemanticWeaverSpec]

## Formats

### 1. Context Markup Language (CML/CMLD)

#### Description
Context Markup Language (CML) and Context Markup Language for Documentation (CMLD) are used to annotate Markdown notes with RDF metadata, designed to resolve ambiguities in unstructured text or linked-data ontologies (e.g., clarifying "Washington" as a state or person).

#### Syntax

**CML**:
- **Description**: Used for general RDF annotations without `@doc` prefix, including contextual disambiguation.
- **Pattern**: `[Subject] predicate: value; predicate2: [Object] or "Literal".`
- **Example**:
  ```markdown
  [Washington] ex:refersTo: [ex:State_Washington]; category: "Location".
  ```
- **Rules**:
  - Subject is enclosed in square brackets, e.g., `[Washington]`.
  - Predicates and values are separated by a colon (`:`).
  - Multiple predicate-value pairs are separated by semicolons (`;`).
  - Objects can be URIs (in square brackets) or literals (in quotes for strings).
  - Use namespace prefixes from ontology, e.g., `ex:` for `http://example.org/`.
  - Use `ex:refersTo` for contextual disambiguation, e.g., `[Washington]{ex:refersTo=ex:State_Washington}`.

**CMLD**:
- **Description**: Used for document metadata with `@doc` prefix, supporting contextual metadata.
- **Pattern**: `@doc [Subject] predicate: value; predicate2: [Object] or "Literal".`
- **Example**:
  ```markdown
  @doc [ExampleNote] category: "Documentation"; author: [John]; created: "2025-07-15".
  ```
- **Rules**:
  - Start with `@doc` followed by subject in square brackets.
  - Follows same predicate-value pair rules as CML.
  - Typically used for document-level metadata like `category`, `author`, `created`.

#### Conversion
- **Input**: Any document with identifiable entities and relationships, potentially ambiguous (e.g., "Washington" as state or person).
- **Output**: Markdown file with CML or CMLD annotations.
- **Example**:
  - **Input**: "This is a note about a project meeting held on July 15, 2025, with John as the author, discussing Washington."
  - **Output**:
    ```markdown
    # Project Meeting
    @doc [MeetingNote] category: "Meeting"; author: [John]; created: "2025-07-15".
    [Washington]{ex:refersTo=ex:State_Washington}
    This is a note about a project meeting in Washington state.
    ```
- **Steps**:
  1. Identify key entities (e.g., documents, people, locations) and their relationships.
  2. Detect potential ambiguities (e.g., "Washington" as state, person, or city) and resolve using context (e.g., document content, regional references).
  3. Map entities to ontology terms (e.g., `doc:Document`, `ex:Person`) from `semantic-weaver/ontology.ttl` or `semantic-weaver/ontology/*.md`.
  4. Generate CML for relationships and disambiguation (e.g., `[Washington] ex:refersTo: [ex:State_Washington]`).
  5. Generate CMLD for document metadata (e.g., `@doc [Note] category: "Documentation"`).
  6. Append annotations to the Markdown file.

### 2. Markdown-LD

#### Description
Markdown-LD syntax is used to define RDF ontologies in `semantic-weaver/ontology/*.md` files, based on schema.org and RDFa, as described at https://blog.sparna.fr/post/semantic-markdown.

#### Syntax
- **Description**: Uses inline attributes in square brackets with `typeof` and property annotations, and footnote-style namespace declarations.
- **Pattern**: `[Entity]{typeof=type property=value}` or `[prefix]: URI`.
- **Example**:
  ```markdown
  [schema]: http://schema.org
  [rdfs]: http://www.w3.org/2000/01/rdf-schema#
  [Person]{typeof=rdfs:Class rdfs:label="Person"}
  [name]{typeof=rdfs:Property schema:domainIncludes=[Person]; schema:rangeIncludes=[schema:Text]; rdfs:label="Name"}
  ```
- **Rules**:
  - Define namespaces at the top with `[prefix]: URI` (e.g., `[schema]: http://schema.org`).
  - Entities are enclosed in square brackets, e.g., `[Person]`.
  - Attributes are specified in curly braces, e.g., `{typeof=rdfs:Class}`.
  - Multiple properties are space-separated, e.g., `{typeof=rdfs:Property rdfs:label="Name"}`.
  - Use `schema.org`, `rdfs`, or `owl` vocabularies for types and properties.
  - Save files in `semantic-weaver/ontology/` with `.md` extension.

#### Conversion
- **Input**: Ontology definitions in plain text, Turtle, or other RDF formats.
- **Output**: Markdown file with Markdown-LD syntax, saved in `semantic-weaver/ontology/`.
- **Example**:
  - **Input**:
    ```turtle
    @prefix schema: <http://schema.org> .
    schema:Person a rdfs:Class ;
      rdfs:label "Person" .
    ```
  - **Output**:
    ```markdown
    [schema]: http://schema.org
    [rdfs]: http://www.w3.org/2000/01/rdf-schema#
    [Person]{typeof=rdfs:Class rdfs:label="Person"}
    ```
- **Steps**:
  1. Identify classes, properties, and relationships in the input ontology.
  2. Map to `schema.org`, `rdfs`, or `owl` vocabularies (refer to `semantic-weaver/ontology.ttl`).
  3. Define namespaces at the top of the Markdown file (e.g., `[schema]: http://schema.org`).
  4. Convert classes to `[Entity]{typeof=rdfs:Class rdfs:label="Label"}`.
  5. Convert properties to `[Property]{typeof=rdfs:Property schema:domainIncludes=[Class]; schema:rangeIncludes=[Type]; rdfs:label="Label"}`.
  6. Save as a `.md` file in `semantic-weaver/ontology/`, e.g., `my-ontology.md`.

## References
- **Ontology**: `semantic-weaver/ontology.ttl` and `semantic-weaver/ontology/*.md`
- **CML Docs**: https://mediaprophet.github.io/init-draft-standards-wip/cml/
- **CMLD Docs**: https://mediaprophet.github.io/init-draft-standards-wip/CMLD/
- **Markdown-LD Docs**: https://blog.sparna.fr/post/semantic-markdown