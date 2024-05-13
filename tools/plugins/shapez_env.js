import { modFilePathToId, shapezModules } from "../util.js";

const modulePrefix = "\0shapez-env";
export const shapezGlobal = "shapez-global";

/**
 * Provides the shapez-env module based on imported module ID.
 * @param {string} id
 */
async function loadShapezEnv(id) {
    if (!id.startsWith(modulePrefix)) {
        return null;
    }

    const modId = id.split("/")[1];

    return `
    export const MOD_ID = ${JSON.stringify(modId)};

    export function getMod() {
        return shapez.MODS.mods.find((m) => m.metadata.id === ${JSON.stringify(modId)});
    }
    `;
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
            if (id === "shapez-env") {
                return `${modulePrefix}/${modId}`;
            }

            if (shapezModules.includes(id)) {
                return shapezGlobal;
            }

            return null;
        },
        load: loadShapezEnv,
    };
}
