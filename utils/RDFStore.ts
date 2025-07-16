import { Vault } from 'obsidian';
import * as N3 from 'n3';
import { TFile } from 'obsidian';

export class RDFStore {
  private quads: N3.Quad[] = [];

  async addQuads(quads: N3.Quad[]) {
    this.quads.push(...quads);
    // Future: Persist to storage or integrate with RDF dataset
  }

  async parseTurtleFile(vault: Vault, file: TFile) {
    const content = await vault.read(file);
    const parser = new N3.Parser();
    const quads = await new Promise<N3.Quad[]>((resolve, reject) => {
      const quads: N3.Quad[] = [];
      parser.parse(content, (error, quad, prefixes) => {
        if (error) reject(error);
        if (quad) quads.push(quad);
        else resolve(quads);
      });
    });
    await this.addQuads(quads);
  }

  getQuads(): N3.Quad[] {
    return this.quads;
  }
}