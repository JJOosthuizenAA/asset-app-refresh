const fs = require("fs");
const path = require("path");

const display = new Intl.DisplayNames(["en"], { type: "region" });
const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const entries = [];
for (const a of letters) {
  for (const b of letters) {
    const code = `${a}${b}`;
    let label = display.of(code);
    if (!label || label === code) continue;
    let localeRegion;
    try {
      const locale = new Intl.Locale(`und-${code}`);
      localeRegion = locale.maximize().region;
    } catch (err) {
      continue;
    }
    if (localeRegion !== code) continue;
    label = label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/’/g, "'")
      .replace(/–/g, "-");
    entries.push({ value: code, label });
  }
}
entries.sort((a, b) => a.label.localeCompare(b.label));

const outPath = path.join(__dirname, "..", "src", "lib", "countries.ts");
fs.mkdirSync(path.dirname(outPath), { recursive: true });

const header = "// Auto-generated list of countries based on Intl data\n";
const bodyLines = [
  "export const COUNTRY_OPTIONS = [",
  ...entries.map((entry) => `  { value: \"${entry.value}\", label: \"${entry.label}\" },`),
  "] as const;",
  "",
  "const COUNTRY_LOOKUP = new Map(COUNTRY_OPTIONS.map((country) => [country.value, country.label]));",
  "",
  "export function getCountryLabel(code: string | null | undefined): string | null {",
  "  if (!code) return null;",
  "  return COUNTRY_LOOKUP.get(code) ?? null;",
  "}",
  "",
];

fs.writeFileSync(outPath, header + bodyLines.join("\n"), "utf8");
