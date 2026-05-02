import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const vendored = path.join(
  repoRoot,
  "components/playground/page-transition-loader.source.css"
);
const dist = fs.existsSync(vendored)
  ? vendored
  : path.join(
      process.env.HOME || "",
      "Desktop/рабочий стол/page-transition-loader/dist/style.css"
    );
const out = "components/playground/page-transition-build.css";
let c = fs.readFileSync(dist, "utf8");

c = c.replace(
  `body:not(.loaded) *:not(.spinner, .spinner > .path) {
  -moz-animation: none !important;
  -webkit-animation: none !important;
  animation: none !important;
}
`,
  ""
);
c = c.replace(
  /.center, \.loader, \.container, \.page(?:, \.btn:after)?, \.ARS \{/,
  ".center, .loader, .container, .page {"
);
c = c.replace(/\.loaded\.new-page \.ARS \{[^}]*\}/s, "");
c = c.replace(/\.ARS:hover \{[^}]*\}/s, "");
c = c.replace(/\.ARS \{[^}]*\}/s, "");
c = c.replace(/body\s*\{[^}]*\}/g, "");
c = c.replace(/body:not\([^)]*\)\s*\{[^}]*\}/gs, "");

// Remove @keyframes ARS (three variants) — multiline
c = c.replace(/@-moz-keyframes ARS[\s\S]*?^\}/gm, "");
c = c.replace(/@-webkit-keyframes ARS[\s\S]*?^\}/gm, "");
c = c.replace(/@keyframes ARS[\s\S]*?^\}/gm, "");

c = c.replace(/core-loaded/g, "__COREK__");
c = c.replace(/btn-loaded/g, "__BTNK__");
c = c.replace(/btn-restart/g, "__BTNR__");
c = c.replace(/scale-in/g, "__SCALEI__");
c = c.replace(/scaleX-in/g, "__SCALEX__");
c = c.replace(/.new-page/g, ".ptlB--newPage");
c = c.replace(/.restart/g, ".ptlB--restart");
c = c.replace(/.loaded/g, ".ptlB--loaded");
c = c.replace(/__COREK__/g, "core-loaded");
c = c.replace(/__BTNK__/g, "btn-loaded");
c = c.replace(/__BTNR__/g, "btn-restart");
c = c.replace(/__SCALEI__/g, "scale-in");
c = c.replace(/__SCALEX__/g, "scaleX-in");

c = c.replace(/@keyframes layer-/g, "@keyframes ptlB-layer-");
c = c.replace(/animation:\s*layer-/g, "animation: ptlB-layer-");
c = c.replace(/.layer-/g, ".ptlB-layer-");
c = c.replace(/.container(?![\w-])/g, ".ptlB-fx");
c = c.replace(/(^|[\s,{])\.loader(?![\w-])/g, "$1.ptlB-loader");
c = c.replace(/(^|[\s,{>])\.spinner(?![\w-])/g, "$1.ptlB-spinner");
c = c.replace(/(^|[\s,{>])\.core(?![\w-])/g, "$1.ptlB-core");
c = c.replace(/(^|[\s,{>])\.page(?![\w-])/g, "$1.ptlB-page");
c = c.replace(/(^|[\s,{>])\.wrap(?![\w-])/g, "$1.ptlB-wrap");
c = c.replace(/(^|[\s,{>])\.img(?![\w-])/g, "$1.ptlB-img");
c = c.replace(/(^|[\s,{>])\.txt(?![\w-])/g, "$1.ptlB-txt");
c = c.replace(/(^|[\s,{>])\.btn(?![\w-])/g, "$1.ptlB-btn");
c = c.replace(/(^|[\s,{>])\.center(?![\w-])/g, "$1.ptlB-center");

c = c
  .replace(/#EF836E/gi, "var(--ptlB-major)")
  .replace(/#ccc/g, "var(--ptlB-mock)")
  .replace(/#eaeaea/g, "var(--ptlB-minor)");
c = c.replace(/color:\s*#fff/g, "color: hsl(var(--background))");

c = c.replace(/ptlB\.ptlB-layer-/g, "ptlB-layer-");
c = c.replace(/@-moz-keyframes\.ptlB-layer-/g, "@-moz-keyframes ptlB-layer-");
c = c.replace(/@-webkit-keyframes\.ptlB-layer-/g, "@-webkit-keyframes ptlB-layer-");

const header = `/* page-transition-loader (CodePen) — scoped */\n`;
const root = `.ptlB {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  isolation: isolate;
  --ptlB-major: #ef836e;
  --ptlB-minor: #eaeaea;
  --ptlB-mock: rgb(200 200 200 / 0.55);
  background: transparent;
  color: hsl(var(--foreground));
}
.dark .ptlB {
  --ptlB-mock: rgb(100 100 110 / 0.45);
  --ptlB-minor: rgb(60 60 70);
}
`;

c = header + root + c;
const util = [
  "ib",
  "fw",
  "hw",
  "mt0",
  "mb2",
  "h10",
  "f0"
];
for (let n = 5; n <= 100; n += 5) util.push(`w${n}`);
for (const u of util) {
  c = c.replace(new RegExp(`^\\.${u} \\{`, "gm"), `.ptlB .${u} {`);
}
c = c.replace(
  /\.ptlB-fx \{\s*position: fixed;\s*overflow: hidden;\s*\}/s,
  ".ptlB-fx {\n  position: absolute;\n  inset: 0;\n  overflow: hidden;\n}"
);
c = c.replace(
  /\.ptlB-loader, \.ptlB-core, \.ptlB-spinner, \.path \{/s,
  `.ptlB-loader,
.ptlB-core,
.ptlB-spinner,
.ptlB-loader :is(path, circle),
.ptlB-core :is(path, circle),
.ptlB-spinner :is(path, circle) {`
);
c += `

/* Оверлей поверх превью (правый столбец) */
.ptlB--overPreview .ptlB-page {
  width: min(80vh, 100%);
  max-width: 100%;
}
.ptlB--overPreview .ptlB-loader {
  max-width: min(120px, 28vw);
  max-height: min(120px, 28vw);
}
`;
fs.writeFileSync(out, c);
console.log("Wrote", out, "lines", c.split("\n").length);
