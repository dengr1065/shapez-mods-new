import { Blueprint } from "game/blueprint";
import { Mod } from "mods/mod";
import { tryPlaceBlueprint } from "./patch";
import type { Entity } from "game/entity";

export type BlueprintHook = (blueprint: Blueprint, entity: Entity) => Entity | null;

class BlueprintControl extends Mod {
    public hooks: BlueprintHook[] = [];

    override init() {
        // @ts-expect-error bad typings
        this.modInterface.replaceMethod(Blueprint, "tryPlace", tryPlaceBlueprint);
    }

    public registerHook(hook: BlueprintHook) {
        this.hooks.push(hook);
    }
}

export default BlueprintControl;
