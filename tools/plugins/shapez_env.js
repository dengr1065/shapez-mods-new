import * as fs from "fs/promises";
import * as path from "path/posix";
import { modFilePathToId, projectDir, shapezModules } from "../util.js";

const modulePrefix = "\0shapez-env";
export const shapezGlobal = "shapez-global";

const spriteExtensions = [".png", ".webp"];

/**
 * Returns an array of absolute paths to every sprite that
 * belongs to a mod with the specified ID. sprites/ directory
 * is assumed.
 * @param {string} id
 */
async function getAllModSprites(id) {
    const spritesDir = path.join(projectDir, id, "sprites");

    try {
        const fileList = await fs.readdir(spritesDir, {
            recursive: true,
            withFileTypes: true,
        });

        return fileList
            .filter((entry) => !entry.isDirectory())
            .filter((entry) => {
                return spriteExtensions.some((ext) => entry.name.endsWith(ext));
            })
            .map((entry) => path.join(entry.path, entry.name));
    } catch {
        return [];
    }
}

/**
 * Provides the shapez-env module based on imported module ID.
 * @param {string} id
 */
async function loadShapezEnv(id) {
    if (!id.startsWith(modulePrefix)) {
        return null;
    }

    const modId = id.split("/")[1];

    const sprites = await getAllModSprites(modId);
    const spritesBaseDir = `${projectDir}/${modId}/sprites`;

    /** @type {string[]} */
    const spriteImports = [];
    /** @type {string[]} */
    const spriteRegistryCode = [];

    for (const [index, filePath] of Object.entries(sprites)) {
        const importName = `_s${index}`;
        const relativePath = JSON.stringify(path.relative(spritesBaseDir, filePath));

        spriteImports.push(`import ${importName} from ${JSON.stringify(filePath)};`);
        spriteRegistryCode.push(`register(prefix + ${relativePath}, ${importName});`);
    }

    return `${spriteImports.join("\n")};
    import { MODS } from "mods/modloader";

    const DEFAULT_SPRITE_PREFIX = ${JSON.stringify(modId + "/sprites/")};

    export function getMod() {
        return MODS.mods.find((m) => m.metadata.id === ${JSON.stringify(modId)});
    }

    export function registerModSprites(mod, prefix) {
        if (prefix === true || prefix === null || prefix === undefined) {
            prefix = DEFAULT_SPRITE_PREFIX;
        } else if (prefix === false) {
            prefix = "sprites/";
        }

        const register = mod.modInterface.registerSprite.bind(mod.modInterface);
        ${spriteRegistryCode.join("\n")}
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
