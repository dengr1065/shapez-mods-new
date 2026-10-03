import type { Vector } from "core/vector";

export function vectorEqualsEpsilon(a: Vector, b: Vector, epsilon = 1e-5) {
    return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;
}
