import fs from "fs/promises";
import path from "path";
import { AtlasStitcher } from "../atlas.js";
import { modFilePathToId } from "../util.js";

const loaderPrefix = "\0atlas-loader:";
const spritesPathSegment = "/sprites/";

/**
 * Returns a camelCase sprite ID for usage in code.
 * @param {string} file
 * @param {boolean} isBlueprint
 */
function generateSpriteId(file, isBlueprint) {
    // Assumes that files always have extensions
    const validId = path
        .normalize(file)
        .split(/[\.\/\\]+/)
        .slice(0, -1)
        .join("_");

    const result = validId.replace(/_[a-zA-Z0-9]/g, (group) =>
        group.slice(-1).toUpperCase()
    );
    return isBlueprint ? result + "Blueprint" : result;
}

/**
 * Writes an index.d.ts file in the sprites directory for editor suggestions.
 * @param {string} file
 * @param {string[]} spriteIds
 */
async function writeDefinitions(file, spriteIds) {
    const result = `import type { Mod } from "mods/mod";
    export function registerAtlas(mod: Mod): void;
    ${spriteIds.map((id) => `export const ${id}: string;`).join("\n")}`;

    // If the definitions haven't changed, don't overwrite
    const existing = await fs.readFile(file, "utf-8");
    if (existing == result) {
        return;
    }

    await fs.writeFile(file, result, "utf-8");
}

/**
 * Generates the resulting module code.
 * @param {string} modId
 * @param {{ scale: number, url: string }[]} atlases
 * @param {(typeof import("../atlas.js").atlasSpriteDef)[]} sprites
 */
function generateCode(modId, atlases, sprites) {
    const prefix = `${modId}/`;

    /** @type {number[]} */
    const scales = [];
    const atlasUrls = [];

    for (const { scale, url } of atlases) {
        scales.push(scale);
        atlasUrls.push(url);
    }

    /** @type {{ x: number, y: number, w: number, h: number }[][]} */
    const spriteLinks = [];
    /** @type {Record<string, string>} */
    const idMapping = {};

    for (const [index, sprite] of Object.entries(sprites)) {
        spriteLinks.push(
            scales.map((scale) => {
                return AtlasStitcher.scaleDimensions(sprite, scale);
            })
        );

        const generatedId = generateSpriteId(sprite.src, sprite.blueprint);
        idMapping[generatedId] = prefix + index;
    }

    return `
    const scales = ${JSON.stringify(scales)};
    const urls = ${JSON.stringify(atlasUrls)};
    const links = ${JSON.stringify(spriteLinks)};

    export const idMapping = ${JSON.stringify(idMapping)};

    export function registerAtlas(mod) {
        const images = urls.map(url => {
            const image = new Image();
            image.src = url;
            return image;
        });

        for (let i = 0; i < links.length; i++) {
            const spriteId = ${JSON.stringify(prefix)} + i;
            const sprite = new shapez.AtlasSprite(spriteId);
            sprite.frozen = true;

            for (const [j, scale] of Object.entries(scales)) {
                const link = links[i][j];
                sprite.linksByResolution[scale] = new shapez.SpriteAtlasLink({
                    atlas: images[j],
                    packOffsetX: 0,
                    packOffsetY: 0,
                    packedX: link.x,
                    packedY: link.y,
                    packedW: link.w,
                    packedH: link.h,
                    w: link.w,
                    h: link.h
                });
            }

            shapez.Loader.sprites.set(spriteId, sprite);
        }
    }
    `;
}

/**
 * This plugin makes it possible to import sprites/ directories with an
 * atlas.json file. Type definitions are generated while building.
 * @returns {import("rollup").Plugin}
 */
export function shapezAtlasLoader() {
    return {
        name: "shapez-atlas-loader",
        async resolveId(id, importer) {
            if (!id.endsWith("/")) {
                id += "/";
            }

            if (!id.endsWith(spritesPathSegment)) {
                return null;
            }

            const atlasId = id + "atlas.json";
            const resolved = await this.resolve(atlasId, importer);

            if (resolved === null) {
                // Not an atlas sprites directory
                return null;
            }

            return loaderPrefix + resolved.id;
        },
        async load(src) {
            if (!src.startsWith(loaderPrefix)) {
                return null;
            }

            const atlasPath = src.slice(loaderPrefix.length);
            const modId = modFilePathToId(atlasPath);

            if (this.cache.has(atlasPath)) {
                const result = this.cache.get(atlasPath);
                for (const file of result._dependencies) {
                    this.addWatchFile(file);
                }

                return result;
            }

            const atlas = await AtlasStitcher.loadAtlasDefinition(atlasPath);
            this.addWatchFile(atlasPath);

            for (const { filePath } of atlas) {
                this.addWatchFile(filePath);
            }

            const stitcher = new AtlasStitcher(atlas);
            const atlases = await stitcher.generate();

            const result = {
                code: generateCode(modId, atlases, atlas),
                syntheticNamedExports: "idMapping",
                moduleSideEffects: false,
                _dependencies: [atlasPath, ...atlas.map((s) => s.filePath)],
            };

            const definitionsFile = path.join(path.dirname(atlasPath), "index.d.ts");
            const spriteIds = atlas.map((sprite) => {
                return generateSpriteId(sprite.src, sprite.blueprint);
            });

            await writeDefinitions(definitionsFile, spriteIds);

            this.cache.set(atlasPath, result);
            return result;
        },
        watchChange(id) {
            let spritesDir = id;
            do {
                if (spritesDir.length == 1) {
                    // This change is definitely not relevant
                    return;
                }

                spritesDir = path.dirname(spritesDir);
            } while (!spritesDir.endsWith("/sprites"));

            const atlasPath = path.join(spritesDir, "atlas.json");
            this.cache.delete(atlasPath);
        },
    };
}
