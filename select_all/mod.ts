import { STOP_PROPAGATION } from "core/signal";
import type { TrackedState } from "core/tracked_state";
import { HUDMassSelector } from "game/hud/parts/mass_selector";
import type { Keybinding } from "game/key_action_mapper";
import { KEYCODES, KeyActionMapper, keyToKeyCode } from "game/key_action_mapper";
import type { MetaBuilding } from "game/meta_building";
import type { GameRoot } from "game/root";
import { Mod } from "mods/mod";
import { SOUNDS } from "platform/sound";
import { MOD_ID } from "shapez-env";
import { getHudPart } from "../_lib/hud_parts";

interface KeyMapping {
    id: string;
    keyCode: number;
}

const keybindingId = MOD_ID + "/select_all";

function selectAll(root: GameRoot): typeof STOP_PROPAGATION | void {
    const massSelector = getHudPart(root, HUDMassSelector);
    if (!massSelector) {
        root.app.sound.playUiSound(SOUNDS.uiError);
        return STOP_PROPAGATION;
    }

    // Avoid triggering if the user is currently placing something
    const selectedBuilding: TrackedState =
        root.hud.parts.buildingPlacer.currentMetaBuilding;
    const selectedBlueprint: TrackedState =
        root.hud.parts.blueprintPlacer.currentBlueprint;

    // Or if a selection is in progress
    const isSelecting = !!massSelector.currentSelectionStartWorld;

    if (selectedBuilding.get() || selectedBlueprint.get() || isSelecting) {
        return;
    }

    const allEntities = root.entityMgr.getFrozenUidSearchMap();
    const selectedEntityUids = new Set<number>();

    for (const [uid, entity] of allEntities) {
        const staticComp = entity.components.StaticMapEntity;
        if (!staticComp) {
            continue;
        }

        const building: MetaBuilding = staticComp.getMetaBuilding();

        if (!building.getIsRemovable(root)) {
            continue;
        }

        selectedEntityUids.add(uid);
    }

    // @ts-expect-error non-null in typings
    massSelector.currentSelectionStartWorld = null;
    // @ts-expect-error
    massSelector.currentSelectionEnd = null;

    massSelector.selectedUids = new Set(selectedEntityUids);
    return STOP_PROPAGATION;
}

function getBindingHook(
    this: KeyActionMapper,
    hookedFunction: (keybinding: KeyMapping) => Keybinding,
    [keybinding]: [KeyMapping]
): Keybinding {
    const result = hookedFunction(keybinding);
    const selectAll = this.keybindings[keybindingId]!;
    const ctrlHeld = this.root.app.inputMgr.keysDown.has(KEYCODES.Ctrl);

    if (result.keyCode !== selectAll.keyCode || !ctrlHeld) {
        // No conflict, ignore
        return result;
    }

    // This may break consumers that use anything except pressed getter
    // @ts-expect-error intentionally horrible
    return { pressed: false };
}

export default class extends Mod {
    override init(): void {
        this.modInterface.registerIngameKeybinding({
            id: keybindingId,
            handler: selectAll,
            translation: "Select All Buildings",
            keyCode: keyToKeyCode("A"),
            modifiers: {
                ctrl: true,
            },
        });

        // Super ugly hack to make Ctrl+A block other keybindings
        // @ts-expect-error bad typings
        this.modInterface.replaceMethod(KeyActionMapper, "getBinding", getBindingHook);
    }
}
