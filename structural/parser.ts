import { getMod } from "shapez-env";
import type Structural from "./mod";

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
    const mod = getMod() as Structural;

    const layers = code.split(":");
    const processedLayers: string[] = [];

    for (const [index, layer] of layers.map((l, i) => [i, l] as const)) {
        if (layer.length > 4) {
            throw new Error(`Layer is too long: ${layer}`);
        }

        const fillCount = 4 / layer.length;
        if (fillCount % 1 !== 0) {
            throw new Error(`Impossible to fill ${layer}`);
        }

        const quads = [...layer.repeat(fillCount)];
        const processingFunc = processQuad.bind(null, mod, index);

        processedLayers.push(quads.map(processingFunc).join(""));
    }

    return processedLayers.join(":");
}
