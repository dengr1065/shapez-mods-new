import { modFilePathToId } from "../util.js";

const modulePrefix = "\0shapez-env";

/**
 * Provides the shapez-env module based on imported module ID.
 * @param {string} id
 */
function loadShapezEnv(id) {
    if (!id.startsWith(modulePrefix)) {
        return null;
    }

    const modId = JSON.stringify(id.split("/")[1]);
    return `import { MODS } from "mods/modloader";
            export const getMod = () =>
            MODS.mods.find(m => m.metadata.id === ${modId})`;
}

/**
 * A plugin to insert metadata import and mod registry code,
 * as well as provide virtual shapez-env module
 * @returns {import("rollup").Plugin}
 */
export function shapezEnv() {
    return {
        name: "shapez",
        resolveId(id, importer) {
            if (!importer) {
                return null;
            }

            const modId = modFilePathToId(importer);
            return id === "shapez-env" ? `${modulePrefix}/${modId}` : null;
        },
        load: loadShapezEnv,
    };
}
