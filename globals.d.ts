declare module "shapez-env" {
    import type { Mod } from "mods/mod";

    export const MOD_ID: string;
    export function getMod<T extends Mod>(): T;
}

declare module "*.scss" {
    const content: string;
    export default content;
}

declare module "*.png" {
    const content: string;
    export default content;
}

declare module "*.svg" {
    const content: string;
    export default content;
}

type STOP_PROPAGATION = "stop_propagation";
type SignalReceiver<T, S> = (this: S, ...arguments: T) => void | STOP_PROPAGATION;

interface TypedSignal<T extends Array> {
    add<S>(receiver: SignalReceiver<T, S>, scope?: S = null): void;
    addToTop<S>(receiver: SignalReceiver<T, S>, scope?: S = null): void;
    dispatch(...arguments: T): void | STOP_PROPAGATION;
    remove<S>(receiver: SignalReceiver<T, S>);
    removeAll(): void;
}

type LevelDefinition = {
    shape: string;
    required: number;
    reward: string;
    throughputOnly?: boolean;
};

type UpgradeType = "belt" | "miner" | "processors" | "painting";
type UpgradeDefinitions = {
    [t: UpgradeType]: {
        required: {
            shape: string;
            amount: number;
        }[];
        excludePrevious?: boolean;
    }[];
};

declare module "mods/mod" {
    import type { GameState } from "core/game_state";
    import type { BaseHUDPart } from "game/hud/base_hud_part";
    import type { GameRoot } from "game/root";
    import type { SerializedGame } from "savegame/savegame_typedefs";
    import type { InGameState } from "states/ingame";

    // Can be found as GAME_LOADING_STATES in upstream code
    type GameLoadingStage =
        | "s3_createCore"
        | "s4_A_initEmptyGame"
        | "s4_B_resumeGame"
        | "s5_firstUpdate"
        | "s6_postLoadHook"
        | "s7_warmup"
        | "s10_gameRunning"
        | "leaving"
        | "destroyed"
        | "initFailed";

    export interface Mod {
        signals: {
            appBooted: TypedSignal<[]>;
            modifyLevelDefinitions: TypedSignal<[LevelDefinition[]]>;
            modifyUpgrades: TypedSignal<[UpgradeDefinition[]]>;
            hudElementInitialized: TypedSignal<[BaseHUDPart]>;
            hudElementFinalized: TypedSignal<[BaseHUDPart]>;
            hudInitializer: TypedSignal<[GameRoot]>;
            gameInitialized: TypedSignal<[GameRoot]>;
            gameLoadingStageEntered: TypedSignal<[InGameState, GameLoadingStage]>;
            gameStarted: TypedSignal<[GameRoot]>;
            stateEntered: TypedSignal<[GameState]>;
            gameSerialized: TypedSignal<[GameRoot, SerializedGame]>;
            gameDeserialized: TypedSignal<[GameRoot, SerializedGame]>;
        };
    }
}

declare module "game/map_chunk" {
    import type { Entity } from "game/entity";

    interface MapChunk {
        containedEntitiesByLayer: {
            regular: Entity[];
            wires: Entity[];
        };
    }
}

type SubShapeShortCode = "R" | "C" | "S" | "W";
type SubShapeName = "rect" | "circle" | "star" | "windmill";

declare module "game/shape_definition" {
    export const enumSubShapeToShortcode: Record<SubShapeName, SubShapeShortCode> = {};
}

type ColorShortCode = "r" | "g" | "b" | "c" | "p" | "y" | "w" | "u";
type ColorName =
    | "red"
    | "green"
    | "blue"
    | "cyan"
    | "purple"
    | "yellow"
    | "white"
    | "uncolored";

declare module "game/colors" {
    export const enumShortcodeToColor: Record<ColorShortCode, ColorName> = {};
    export const enumColorToShortcode: Record<ColorName, ColorShortCode> = {};
    export const enumColorsToHexCode: Record<ColorName, string> = {};
}

declare module "game/items/color_item" {
    export const COLOR_ITEM_SINGLETONS: Record<ColorName, ColorItem> = {};

    export interface ColorItem {
        color: ColorName;
    }
}
