import { readFile } from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const thisFilePath = fileURLToPath(import.meta.url);
export const projectDir = path.join(path.dirname(thisFilePath), "..");

// Collect all virtual modules
const typings = await readFile("./types.d.ts", "utf-8");
export const shapezModules = typings
    .split(/declare\smodule\s"/gm)
    .map((m) => m.slice(0, m.indexOf('"')));

/**
 * Transforms a file path into a mod ID.
 * @param {string} entryPath
 */
export function modFilePathToId(entryPath) {
    // Workaround for shapez-loader
    if (entryPath.startsWith("\0shapez-loader\0")) {
        entryPath = entryPath.slice(15);
    }

    const relativePath = path.relative(projectDir, entryPath);
    return relativePath.split(path.sep)[0];
}

/**
 * Returns absolute path to the mod.json file based on path to a file
 * that belongs to a mod.
 * @param {string} filePath
 */
export function modFileToMetadataPath(filePath) {
    const modId = modFilePathToId(filePath);
    return path.resolve(modId, "mod.json");
}

/**
 * Formats a string for a banner comment.
 * @param {string} text
 */
export function formatAsBanner(text) {
    const lines = text.split("\n");
    const formattedLines = lines.map((line) => ` * ${line.trim()}`);

    return `/**!\n${formattedLines.join("\n")}\n */`;
}
