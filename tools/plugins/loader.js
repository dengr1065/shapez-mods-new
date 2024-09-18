import * as path from "path";
import { modFileToMetadataPath, projectDir } from "../util.js";

const loaderPrefix = "\0shapez-loader\0";

/**
 * @param {string} modPath
 * @param {string} metadataPath
 */
function generateLoaderCode(modPath, metadataPath) {
    return `import { default as Mod } from ${JSON.stringify(modPath)};
            import { default as METADATA } from ${JSON.stringify(metadataPath)};
            $shapez_registerMod(Mod, METADATA);`;
}

/**
 * This plugin redirects mod entry points to virtual modules
 * that expose the mod class and metadata with correct names.
 * @returns {import("rollup").Plugin}
 */
export function shapezLoader() {
    return {
        name: "shapez-loader",
        resolveId(id, _source, { isEntry }) {
            if (!isEntry || id.includes(".loader.")) {
                // We're only proxying the entry
                return null;
            }

            return loaderPrefix + id;
        },
        load(virtualModuleId) {
            if (!virtualModuleId.startsWith(loaderPrefix)) {
                return null;
            }

            const relativePath = virtualModuleId.slice(loaderPrefix.length);

            const entry = path.resolve(projectDir, relativePath);
            const metadataPath = modFileToMetadataPath(entry);
            return generateLoaderCode(entry, metadataPath);
        },
    };
}
