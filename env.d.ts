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
