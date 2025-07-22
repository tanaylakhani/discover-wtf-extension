const fs = require("fs");
const path = require("path");

// Path to the markdown file
const mdPath = path.join(__dirname, "example.md");

// Output TypeScript file
const tsOutputPath = path.join(__dirname, "data.ts");

// Read the markdown file
fs.readFile(mdPath, "utf8", (err, data) => {
  if (err) {
    console.error("Error reading the markdown file:", err);
    return;
  }

  // Extract https links
  const links = data.match(/https:\/\/[^\s)\]]+/g) || [];

  // Prepare TS file content
  const tsContent =
    `export const links: string[] = [\n` +
    links.map((link) => `  "${link}"`).join(",\n") +
    `\n];\n`;

  // Write to data.ts
  fs.writeFile(tsOutputPath, tsContent, (err) => {
    if (err) {
      console.error("Error writing to data.ts:", err);
      return;
    }
    console.log("✅ Links written to data.ts");
  });
});
