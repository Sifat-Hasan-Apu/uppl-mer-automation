import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const regPath = path.join(root, "web", "public", "IBMPlexMono-Regular.ttf");
const boldPath = path.join(root, "web", "public", "IBMPlexMono-Bold.ttf");
const outPath = path.join(root, "web", "lib", "ibm-plex-mono-font.ts");

const regBase64 = fs.readFileSync(regPath).toString("base64");
const boldBase64 = fs.readFileSync(boldPath).toString("base64");

const content = `// Auto-generated IBM Plex Mono base64 font data for jsPDF
export const IBM_PLEX_MONO_REGULAR = "${regBase64}";
export const IBM_PLEX_MONO_BOLD = "${boldBase64}";
`;

fs.writeFileSync(outPath, content, "utf8");
console.log("Successfully converted IBM Plex Mono to TypeScript base64 module.");
