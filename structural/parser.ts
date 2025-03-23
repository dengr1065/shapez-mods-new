import { getMod } from "shapez-env";
import type Structural from "./mod";

const HEX_PREFIX = "0x";
const PART_COUNT = 4;

function processHex(code: string): string {
    const hex = Number(code);
    if (isNaN(hex) || !code.startsWith(HEX_PREFIX)) {
        throw new Error("Invalid hex code");
    }

    const parts = [...hex.toString(2)].reverse();

    // Pad strings like 11111 (0x001F) to 11111000
    // NOTE: This code can be improved
    const fullLength = Math.ceil(parts.length / PART_COUNT) * PART_COUNT;
    while (parts.length < fullLength) {
        parts.push("0");
    }

    // Insert layer separators
    let position = fullLength - PART_COUNT;
    while (position > 0) {
        parts.splice(position, 0, ":");
        position -= PART_COUNT;
    }

    return parseStructuralCode(parts.join(""));
}

function processQuad(mod: Structural, layer: number, quad: string): string {
    if (quad === "0") {
        return "--";
    }

    try {
        return mod.subshape + mod.resolveIndexedColor(quad, layer);
    } catch {
        // Silly support for SI and most future mods
        return quad.repeat(2);
    }
}

export function parseStructuralCode(code: string): string {
    if (code.startsWith(HEX_PREFIX)) {
        return processHex(code);
    }

    const mod = getMod() as Structural;

    const layers = code.split(":");
    const processedLayers: string[] = [];

    for (const [index, layer] of layers.map((l, i) => [i, l] as const)) {
        if (layer.length > PART_COUNT) {
            throw new Error(`Layer is too long: ${layer}`);
        }

        const fillCount = PART_COUNT / layer.length;
        if (fillCount % 1 !== 0) {
            throw new Error(`Impossible to fill ${layer}`);
        }

        const quads = [...layer.repeat(fillCount)];
        const processingFunc = processQuad.bind(null, mod, index);

        processedLayers.push(quads.map(processingFunc).join(""));
    }

    return processedLayers.join(":");
}
