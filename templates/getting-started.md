# Getting Started with RDF Documentation Plugin

This guide helps you set up and use the RDF Documentation Plugin in Obsidian.

## Installation
1. Copy the plugin to `.obsidian/plugins/obsidian-rdf-plugin/`.
2. Install dependencies:
   ```bash
   npm install
   pip install rdflib
   ```
3. Build the plugin:
   ```bash
   npm run build
   ```
4. Enable in Obsidian Settings > Community Plugins.

## Basic Usage
1. Create a note with CML or CMLD:
   ```markdown
   [Alice] knows [Bob].
   @doc [Page1] category: "Tutorial"; author: [Alice].
   ```
2. Use the "Edit CMLD Metadata" command to edit metadata.
3. Run "Export RDF Docs for MkDocs" to generate files.
4. Enter GitHub repo, site URL, export directory, and test file inclusion in the dialogue.
5. Deploy to GitHub Pages via the generated GitHub Action.

@doc [GettingStarted] category: "Guide"; author: [PluginAuthor]; created: "2025-07-14".