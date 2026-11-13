declare module 'word-extractor' {
  type ExtractedDocument = {
    getBody(): string;
    getFootnotes(): string;
    getEndnotes(): string;
  };

  export default class WordExtractor {
    extract(source: string | Buffer): Promise<ExtractedDocument>;
  }
}
