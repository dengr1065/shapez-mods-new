import { createLogger } from "core/logging";
import type { BaseItem } from "game/base_item";
import { enumColorToShortcode, enumShortcodeToColor } from "game/colors";
import type { Entity } from "game/entity";
import { HUDConstantSignalEdit } from "game/hud/parts/constant_signal_edit";
import { enumSubShapeToShortcode } from "game/shape_definition";
import { Mod } from "mods/mod";
import { parseStructuralCode } from "./parser";

interface ModSettings {
    subshape: string;
    useIndexedColors: boolean;
    indexedColorMapping: ColorName[][];
}

function parserHook(
    source: (entity: Entity, code: string) => BaseItem | null,
    [entity, code]: [Entity, string]
): BaseItem | null {
    if (code.trim() === "") {
        return null;
    }

    const originalResult = source(entity, code);
    if (originalResult !== null) {
        // Supported already
        return originalResult;
    }

    try {
        // Get a BaseItem for resolved code
        return source(entity, parseStructuralCode(code));
    } catch {
        // Invalid or unsupported code
        return null;
    }
}

class Structural extends Mod {
    logger = createLogger("Structural");
    subshape = enumSubShapeToShortcode.circle;

    override init() {
        const settings = this.settings as ModSettings;
        const colorMapping = settings.indexedColorMapping;
        if (colorMapping.length === 0 || colorMapping.some((l) => l.length === 0)) {
            // Idiot-proofing
            settings.indexedColorMapping = [["uncolored"]];
            this.saveSettings;
        }

        this.subshape =
            enumSubShapeToShortcode[settings.subshape as SubShapeName] ??
            enumSubShapeToShortcode.circle;

        this.modInterface.replaceMethod(
            HUDConstantSignalEdit,
            "parseSignalCode",
            // @ts-expect-error bad typings
            parserHook
        );
    }

    resolveIndexedColor(index: string, layer: number): ColorShortCode {
        if (index in enumShortcodeToColor) {
            return index as ColorShortCode;
        }

        const settings = this.settings as ModSettings;
        if (!settings.useIndexedColors) {
            if (index === "1") {
                return enumColorToShortcode.uncolored;
            } else {
                throw new Error(`Invalid color index: ${index}`);
            }
        }

        const mapping = settings.indexedColorMapping;
        const color = mapping[layer % mapping.length]![Number(index) - 1];

        if (color === undefined || color === null) {
            throw new Error(`No indexed color for ${index}`);
        }

        return enumColorToShortcode[color];
    }
}

export default Structural;
