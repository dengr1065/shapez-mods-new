import type { Vector } from "core/vector";
import type { Blueprint } from "game/blueprint";
import type { GameRoot } from "game/root";
import { getMod } from "shapez-env";
import type BlueprintControl from "./mod";
import { ACHIEVEMENTS } from "platform/achievement_provider";
import type { Entity } from "game/entity";

export function tryPlaceBlueprint(
    this: Blueprint,
    _srcMethod: (root: GameRoot, tile: Vector) => boolean,
    [root, tile]: [GameRoot, Vector]
): boolean {
    const mod = getMod() as BlueprintControl;

    return root.logic.performBulkOperation(() => {
        return root.logic.performImmutableOperation(() => {
            let count = 0;
            for (const entity of this.entities) {
                let clone = processHooks(mod, this, entity);

                if (clone === null) {
                    // Replicate vanilla behavior
                    if (!root.logic.checkCanPlaceEntity(entity, { offset: tile })) {
                        continue;
                    }

                    clone = entity.clone();
                } else {
                    // This makes placement of processed entities slower, but allows
                    // changing what building/variant is placed.
                    if (!root.logic.checkCanPlaceEntity(clone, { offset: tile })) {
                        continue;
                    }
                }

                clone.components.StaticMapEntity.origin.addInplace(tile);
                root.logic.freeEntityAreaBeforeBuild(clone);
                root.map.placeStaticEntity(clone);
                root.entityMgr.registerEntity(clone);

                count++;
            }

            root.signals.bulkAchievementCheck.dispatch(
                ACHIEVEMENTS.placeBlueprint,
                count,
                ACHIEVEMENTS.placeBp1000,
                count
            );

            return count !== 0;
        });
    });
}

function processHooks(
    mod: BlueprintControl,
    blueprint: Blueprint,
    entity: Entity
): Entity | null {
    for (const hook of mod.hooks) {
        const result = hook(blueprint, entity);
        if (result) {
            return result;
        }
    }

    return null;
}
