declare module "grapesjs-preset-webpage" {
  import type { Editor } from "grapesjs";

  export default function presetWebpage(editor: Editor, options?: Record<string, unknown>): void;
}

declare module "grapesjs-blocks-basic" {
  import type { Editor } from "grapesjs";

  export default function basicBlocks(editor: Editor, options?: Record<string, unknown>): void;
}

declare module "grapesjs/locale/ru.mjs" {
  const messages: {
    assetManager: Record<string, string>;
    blockManager: { labels: Record<string, string>; categories: Record<string, string> };
    domComponents: { names: Record<string, string> };
    deviceManager: { device: string; devices: Record<string, string> };
    panels: { buttons: { titles: Record<string, string> } };
    selectorManager: Record<string, unknown>;
    styleManager: Record<string, unknown>;
    traitManager: Record<string, unknown> & {
      empty?: string;
      label?: string;
      traits?: Record<string, unknown>;
    };
    storageManager: Record<string, string>;
  };

  export default messages;
}
