import { createLogger } from "core/logging";
import { Vector } from "core/vector";
import { Camera } from "game/camera";
import { HUDNotifications } from "game/hud/parts/notifications";
import { HUDWaypoints } from "game/hud/parts/waypoints";
import type { GameRoot } from "game/root";
import { Mod } from "mods/mod";
import { getMod } from "shapez-env";
import { T } from "translations";
import { vectorEqualsEpsilon } from "../_lib/bugfixes";
import { getHudPart } from "../_lib/hud_parts";
import strings from "./strings.json";

// Used as an abstraction for HUDWaypoints and Camera
interface RootContainer {
    root: GameRoot;
}

// This interface is similar to Waypoint, but center is a Vector
interface CameraState {
    center: Vector;
    layer: string;
    zoomLevel: number;
}

function recordPosition(this: RootContainer) {
    const mod = getMod<Throwback>();
    const oldPos = this.root.camera.center;

    if (mod.isAtCheckpoint(this.root)) {
        mod.logger.log("Skipping write because we're already there");
        return;
    }

    if (mod.last == null || !mod.isInWaypoints(this.root)) {
        // Only write last position if it won't overwrite a non-waypoint one
        mod.logger.log("Writing position ", oldPos.toString());
        mod.last = {
            center: oldPos.copy(),
            layer: this.root.currentLayer,
            zoomLevel: this.root.camera.zoomLevel,
        };
    }
}

class Throwback extends Mod {
    logger = createLogger("Throwback");
    last: CameraState | null = null;

    override init() {
        this.modInterface.registerTranslations("en", strings);

        // Record when switching waypoints and returning to the Hub
        this.modInterface.runBeforeMethod(HUDWaypoints, "moveToWaypoint", recordPosition);
        this.modInterface.runBeforeMethod(Camera, "centerOnMap", recordPosition);

        this.modInterface.registerIngameKeybinding({
            id: "throwback:return",
            translation: T.keybindings.mappings["throwback:return"],
            keyCode: 8, // Couldn't find it in KEYCODES namespace
            handler: this.throwback.bind(this),
        });

        this.signals.gameInitialized.add(() => {
            this.last = null;
        });
    }

    /**
     * Returns true if the camera position is present in waypoint list.
     */
    isInWaypoints(root: GameRoot) {
        const waypointsHud = getHudPart(root, HUDWaypoints);
        if (!waypointsHud) {
            return false;
        }

        return waypointsHud.waypoints.some((waypoint) => {
            const { x, y } = waypoint.center;
            const target = new Vector(x, y);
            return (
                vectorEqualsEpsilon(root.camera.center, target, 5) &&
                root.currentLayer == waypoint.layer
            );
        });
    }

    /**
     * Checks if the camera position matches the last saved position
     */
    isAtCheckpoint(root: GameRoot) {
        if (this.last === null) {
            return false;
        }

        return vectorEqualsEpsilon(root.camera.center, this.last.center, 5);
    }

    /**
     * Saves current camera state if its center does not match last saved position
     * @returns Whether state was updated
     */
    checkpoint(root: GameRoot): boolean {
        if (this.isAtCheckpoint(root)) {
            this.logger.warn("Ignoring checkpoint, current position is already saved");
            return false;
        }

        // Checkpoints from this API are saved even if a waypoint matches
        this.last = {
            center: root.camera.center.copy(),
            layer: root.currentLayer,
            zoomLevel: root.camera.zoomLevel,
        };
        return true;
    }

    /**
     * Returns to the previous location, if it exists.
     */
    throwback(root: GameRoot) {
        if (this.last === null) {
            const notificationsHud = getHudPart(root, HUDNotifications);
            if (!notificationsHud) {
                return;
            }

            // Notify the user
            this.logger.log("No point recorded");
            notificationsHud.internalShowNotification(T.throwback.missing, "error");
            return;
        }

        if (this.isAtCheckpoint(root)) {
            this.logger.log("Already at last saved position!");
            return;
        }

        if (root.camera.desiredCenter) {
            this.logger.log("Not executing because already in movement");
            return;
        }

        // No waypoint check here to make travel faster
        const newPoint = {
            center: root.camera.center.copy(),
            layer: root.currentLayer,
            zoomLevel: root.camera.zoomLevel,
        };

        this.logger.log("Moving to", this.last.center.toString());
        root.camera.setDesiredCenter(this.last.center);
        root.camera.setDesiredZoom(this.last.zoomLevel);
        root.currentLayer = this.last.layer;

        this.logger.log("Writing previous throwback:", newPoint.center.toString());
        this.last = newPoint;
    }
}

export default Throwback;
