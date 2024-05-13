import type { BaseHUDPart } from "game/hud/base_hud_part";
import type { GameRoot } from "game/root";

/**
 * This is a type-safe but inefficient way to retrieve HUD elements.
 */
export function getHudPart<T extends BaseHUDPart>(
    root: GameRoot,
    hudClass: new (root: GameRoot) => T
): T | null {
    const parts = Object.values(root.hud.parts);
    for (const part of parts) {
        if (part instanceof hudClass) {
            return part;
        }
    }

    return null;
}
