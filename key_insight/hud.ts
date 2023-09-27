import { TrackedState } from "core/tracked_state";
import { makeDiv, makeDivElement } from "core/utils";
import { BaseHUDPart } from "game/hud/base_hud_part";
import { DynamicDomAttach } from "game/hud/dynamic_dom_attach";
import { KEYCODES, type Keybinding } from "game/key_action_mapper";

export const keys = [KEYCODES.Ctrl, KEYCODES.Shift, KEYCODES.Alt];

export class HUDKeyInsight extends BaseHUDPart {
    private element!: HTMLDivElement;
    private domAttach!: DynamicDomAttach;

    private bindings = keys.map(this.findBindingByCode.bind(this));
    private keyElements = this.mapKeysToElements();
    private state = new TrackedState(this.onChange, this);
    private visible = false;

    override createElements(parent: HTMLElement) {
        this.element = makeDiv(parent, "HUD_KeyInsight");
        this.element.style.setProperty("display", "grid", "important");

        for (const key of this.keyElements.values()) {
            this.element.appendChild(key);
        }

        const columns = `repeat(${this.keyElements.size}, 1fr)`;
        this.element.style.gridTemplateColumns = columns;
    }

    override initialize(): void {
        this.domAttach = new DynamicDomAttach(this.root, this.element, {
            attachClass: "visible",
            timeToKeepSeconds: 0.2,
        });
    }

    override update(): void {
        this.domAttach.update(this.visible);

        if (!this.visible) {
            return;
        }

        let state = 0;
        for (const binding of this.bindings) {
            state <<= 1;
            state += binding.pressed ? 1 : 0;
        }

        this.state.set(state);
    }

    toggle(): void {
        this.visible = !this.visible;
    }

    private onChange() {
        for (const binding of this.bindings) {
            const element = this.keyElements.get(binding.keyCode);
            element?.classList.toggle("pressed", binding.pressed);
        }
    }

    private mapKeysToElements() {
        const result = new Map<number, HTMLDivElement>();

        for (const binding of this.bindings) {
            const element = this.createKeyElement(binding);
            result.set(binding.keyCode, element);
        }

        return result;
    }

    private findBindingByCode(keyCode: number) {
        const keyMapper = this.root.keyMapper;
        const allBindings = Object.values(keyMapper.keybindings);

        const binding = allBindings.find((key) => key.keyCode === keyCode);
        if (binding === undefined) {
            throw new Error(`Failed to find a keybinding for key ${keyCode}`);
        }

        return binding;
    }

    private createKeyElement(binding: Keybinding) {
        const element = makeDivElement(undefined, ["key", "noPressEffect"]);
        element.innerText = binding.getKeyCodeString();

        return element;
    }
}
