import {
    gComponentRegistry,
    gGameModeRegistry,
    gGameSpeedRegistry,
    gItemRegistry,
    gMetaBuildingRegistry,
} from "core/global_registries";
import type { BaseItem } from "game/base_item";
import type { Component } from "game/component";
import type { GameMode } from "game/game_mode";
import type { MetaBuilding } from "game/meta_building";
import type { BaseGameSpeed } from "game/time/base_game_speed";

interface Registry<T extends abstract new (...args: any) => any> {
    entries: InstanceType<T>[];
    getId(): string;
    register(instance: InstanceType<T>): void;
    hasId(id: string): boolean;
    findById(id: string): InstanceType<T>;
    getEntries(): InstanceType<T>[];
    getAllIds(): string[];
    getNumEntries(): number;
}

type SingletonRegistry<T extends abstract new (...args: any) => any> = Omit<
    Registry<T>,
    "register"
> & {
    register(cls: T): void;
    findByClass(cls: T): InstanceType<T>;
};

export const REGISTRIES = {
    metaBuilding: gMetaBuildingRegistry as SingletonRegistry<typeof MetaBuilding>,
    component: gComponentRegistry as Registry<typeof Component>,
    gameMode: gGameModeRegistry as Registry<typeof GameMode>,
    gameSpeed: gGameSpeedRegistry as Registry<typeof BaseGameSpeed>,
    item: gItemRegistry as Registry<typeof BaseItem>,
};
