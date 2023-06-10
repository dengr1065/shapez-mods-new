import { existsSync } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import { modFileToMetadataPath, projectDir } from "./util.js";

const ignoredDirs = ["tools", "node_modules", ".vscode", ".git"];
const possibleEntryPoints = ["./index.ts", "./mod.ts", "./ts/index.ts", "./ts/mod.ts"];
export const modSources = await enumerateMods();

async function enumerateMods() {
    /** @type {string[]} */
    const mods = [];
    const directory = await fs.readdir(projectDir, {
        withFileTypes: true,
    });

    for (const entry of directory) {
        if (!entry.isDirectory() || ignoredDirs.includes(entry.name)) {
            continue;
        }

        const metadataPath = modFileToMetadataPath(entry.name);
        if (!existsSync(metadataPath) || !resolveModEntry(entry.name)) {
            continue;
        }

        mods.push(entry.name);
    }

    return mods;
}

/**
 * Returns relative path to the entry point of a mod.
 * @param {string} id
 */
export function resolveModEntry(id) {
    const relative = possibleEntryPoints.filter((entryPoint) => {
        const entryPointPath = path.join(id, entryPoint);
        return existsSync(entryPointPath);
    })[0];

    return path.join(id, relative);
}
