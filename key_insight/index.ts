import { Mod } from "mods/mod";
import { HUDKeyInsight, keys } from "./hud";
import styles from "./hud.scss";
import { KEYCODES } from "game/key_action_mapper";
import type { GameRoot } from "game/root";

class KeyInsight extends Mod {
    // Expose the key list to allow modifying it by other mods
    keys = keys;

    override init(): void {
        this.modInterface.registerCss(styles);
        this.modInterface.registerHudElement("keyInsight", HUDKeyInsight);

        this.modInterface.registerIngameKeybinding({
            id: "toggle_key_insight",
            keyCode: KEYCODES.F7,
            translation: "Toggle Key Insight",
            handler: this.handleKeybinding,
        });
    }

    private handleKeybinding(root: GameRoot) {
        const parts = root.hud.parts;
        if ("keyInsight" in parts && parts.keyInsight instanceof HUDKeyInsight) {
            parts.keyInsight.toggle();
        }
    }
}

export default KeyInsight;
