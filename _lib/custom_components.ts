import type { Component } from "game/component";
import type { Entity } from "game/entity";

export function getEntityComponent<T extends typeof Component>(
    entity: Entity,
    componentType: T
): InstanceType<T> | null {
    return (
        ((entity.components as unknown as Record<string, Component>)[
            componentType.getId()
        ] as InstanceType<T> | undefined) ?? null
    );
}
