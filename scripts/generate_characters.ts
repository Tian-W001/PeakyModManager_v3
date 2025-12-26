import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

// Define paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const charactersJsonPath = path.join(__dirname, "Characters.json");
const characterTsPath = path.join(rootDir, "src", "shared", "character.ts");
const enJsonPath = path.join(rootDir, "src", "renderer", "src", "i18n", "locales", "en.json");
const zhJsonPath = path.join(rootDir, "src", "renderer", "src", "i18n", "locales", "zh.json");

// Define types
interface CharacterData {
  id: string;
  nicknames: { en: string; zh: string };
  fullnames: { en: string; zh: string };
}

async function main() {
  try {
    // Read Characters.json
    console.log(`Reading characters from ${charactersJsonPath}...`);
    if (!(await fs.pathExists(charactersJsonPath))) {
      throw new Error(`${charactersJsonPath} not found.`);
    }
    const characters: CharacterData[] = await fs.readJson(charactersJsonPath);

    // 1. Update character.ts
    console.log(`Updating ${characterTsPath}...`);
    if (await fs.pathExists(characterTsPath)) {
      const characterTsContent = await fs.readFile(characterTsPath, "utf-8");
      const characterListString = characters.map((c) => `  "${c.id}",`).join("\n");

      const markerRegex = /(\/\/ AUTO-GENERATED-START)[\s\S]*?(\/\/ AUTO-GENERATED-END)/;

      if (markerRegex.test(characterTsContent)) {
        const newCharacterTsContent = characterTsContent.replace(markerRegex, `$1\n${characterListString}\n  $2`);
        await fs.writeFile(characterTsPath, newCharacterTsContent, "utf-8");
      } else {
        console.error(`Error: Could not find AUTO-GENERATED markers in ${characterTsPath}`);
      }
    } else {
      console.error(`Error: ${characterTsPath} not found.`);
    }

    // 2. Update i18n files
    const updateI18nFile = async (filePath: string, lang: "en" | "zh") => {
      console.log(`Updating ${filePath}...`);
      if (!(await fs.pathExists(filePath))) {
        console.error(`Error: ${filePath} not found.`);
        return;
      }

      const content = await fs.readJson(filePath);

      // Ensure structure exists
      content.characters = content.characters || {};
      content.characters.nicknames = content.characters.nicknames || {};
      content.characters.fullnames = content.characters.fullnames || {};

      // Update values
      characters.forEach((c) => {
        content.characters.nicknames[c.id] = c.nicknames[lang];
        content.characters.fullnames[c.id] = c.fullnames[lang];
      });

      await fs.writeJson(filePath, content, { spaces: 2 });
    };

    await updateI18nFile(enJsonPath, "en");
    await updateI18nFile(zhJsonPath, "zh");

    console.log("Character generation complete.");
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
}

main();
