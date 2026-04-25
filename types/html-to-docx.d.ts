declare module "html-to-docx" {
  type HtmlToDocxOptions = Record<string, unknown>;

  function HTMLtoDOCX(
    htmlString: string,
    headerHTMLString: string | null,
    documentOptions?: HtmlToDocxOptions,
    footerHTMLString?: string | null
  ): Promise<Buffer | Blob | ArrayBuffer>;

  export default HTMLtoDOCX;
}
