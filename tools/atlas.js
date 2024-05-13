import { Image, createCanvas, loadImage } from "@napi-rs/canvas";
import assert from "assert";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

export const atlasSpriteDef = {
    filePath: "",
    src: "",
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    blueprint: false,
};

const atlasScales = [0.25, 0.5, 0.75];
const blueprintScriptPath = path.resolve("./tools/blueprint.py");

/**
 * Makes a blueprint image from the provided image using an external Python
 * script, returns a PNG buffer.
 * @param {Buffer} source
 */
async function getBlueprintBuffer(source) {
    // Render on a canvas first because the script expects PNG
    const image = await loadImage(source, {
        requestOptions: {},
    });
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(image, 0, 0, image.width, image.height);
    const input = await canvas.encode("png");

    const proc = spawn("python", [blueprintScriptPath], {
        stdio: ["pipe", "pipe", "inherit"],
    });

    // This is why I hate JS
    await /** @type {Promise<void>} */ (
        new Promise((resolve) => {
            proc.stdin.end(input, resolve);
        })
    );
    assert(proc.stdout);

    /** @type {Buffer[]} */
    const chunks = [];
    for await (const chunk of proc.stdout) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
}

export class AtlasStitcher {
    /** @type {(typeof atlasSpriteDef)[]} */
    sprites = [];
    /** @type {Map<number, Image>} */
    imageCache = new Map();

    /**
     * @param {(typeof atlasSpriteDef)[]} sprites
     */
    constructor(sprites) {
        this.sprites = sprites;
    }

    async generate() {
        /** @type {{ scale: number, url: string }[]} */
        const atlasByScale = [];
        const [w, h] = this.getDimensions();

        await this.prepareImages();

        for (const scale of atlasScales) {
            const canvas = createCanvas(Math.ceil(w * scale), Math.ceil(h * scale));
            const context = canvas.getContext("2d");

            this.renderAtlas(context, scale);

            const dataUri = await canvas.toDataURLAsync("image/png");
            atlasByScale.push({
                scale,
                url: dataUri,
            });
        }

        return atlasByScale;
    }

    getDimensions() {
        // Don't fail if there are no sprites
        let maxX = 1;
        let maxY = 1;

        for (const sprite of this.sprites) {
            maxX = Math.max(maxX, sprite.x + sprite.w);
            maxY = Math.max(maxY, sprite.y + sprite.h);
        }

        return [maxX, maxY];
    }

    /**
     * Loads images for each sprite and stores the results in
     * this.imageCache to reuse the same image for different scales.
     */
    async prepareImages() {
        this.imageCache.clear();

        const loadPromises = this.sprites.map(async ({ filePath, blueprint }, i) => {
            if (!blueprint) {
                // No preprocessing needed
                this.imageCache.set(i, await loadImage(filePath));
                return;
            }

            const normalBuffer = await fs.readFile(filePath);
            const blueprintBuffer = await getBlueprintBuffer(normalBuffer);
            this.imageCache.set(i, await loadImage(blueprintBuffer));
        });

        await Promise.all(loadPromises);
    }

    /**
     * @param {import("@napi-rs/canvas").SKRSContext2D} context
     * @param {number} scale
     */
    async renderAtlas(context, scale) {
        for (let i = 0; i < this.sprites.length; i++) {
            const sprite = this.sprites[i];

            const image = this.imageCache.get(i);
            if (!image) {
                throw new Error(`Image for ${sprite.src} wasn't prepared!`);
            }

            const { x, y, w, h } = AtlasStitcher.scaleDimensions(sprite, scale);
            context.drawImage(image, x, y, w, h);
        }
    }

    /**
     * Loads an atlas.json file from the file system.
     * @param {string} file
     * @returns {Promise<(typeof atlasSpriteDef)[]>}
     */
    static async loadAtlasDefinition(file) {
        const data = await fs.readFile(file, "utf-8");
        /** @type {Omit<typeof atlasSpriteDef, "filePath">[]} */
        const json = JSON.parse(data);

        const spritesRoot = path.dirname(file);

        return json.map((sprite) => {
            return {
                ...sprite,
                filePath: path.join(spritesRoot, sprite.src),
            };
        });
    }

    /**
     * Returns scaled dimensions of the sprite.
     * @param {{ x: number, y: number, w: number, h: number }} src
     * @param {number} scale
     */
    static scaleDimensions(src, scale) {
        return {
            x: Math.ceil(src.x * scale),
            y: Math.ceil(src.y * scale),
            w: Math.floor(src.w * scale),
            h: Math.floor(src.h * scale),
        };
    }
}
