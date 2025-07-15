# Solid Pod Integration

This tutorial explains how to publish and annotate documents using Solid Pods.

## Setup
1. Click the "Solid Pod Login" ribbon icon.
2. Enter your Solid Pod URL (e.g., `https://joep.inrupt.net/`).
3. Log in using your WebID credentials.
4. Select a vault (e.g., `/public/`) from the list.

## Publishing
1. Run "Export RDF Docs for MkDocs".
2. Set the provider to "Solid Pod".
3. Enter your Solid Pod URL and export directory.
4. The plugin publishes documents to the `/public/` container.

## Annotating
1. Highlight text in a note.
2. Right-click and select "Annotate Selection".
3. Enter your annotation and save.
4. Annotations are stored in your Solid Pod's `/public/annotations/` container.

@doc [SolidPod] category: "Tutorial"; author: [PluginAuthor]; created: "2025-07-15".