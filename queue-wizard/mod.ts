import { BUILD_OPTIONS } from "core/globals";
import { createLogger } from "core/logging";
import { Mod } from "mods/mod";
import type { ModMetadata } from "mods/modloader";
import { StorageImplElectron } from "platform/electron/storage";
import { FILE_NOT_FOUND } from "platform/storage";
import { satisfies, validRange } from "semver";

interface QueueWizardMetadata extends ModMetadata {
    loadBefore?: string | string[];
    loadAfter?: string | string[];
    queuePrefs?: {
        first: boolean;
        last: boolean;
        before: string[];
        after: string[];
    };
}

interface QueueEntry {
    modClass: typeof Mod;
    meta: QueueWizardMetadata;
}

class QueueWizard extends Mod {
    private LOG = createLogger("QueueWizard");
    private storage = new StorageImplElectron(this.app);

    override async init() {
        if (this.settings.initialized) {
            // This is the second instance => all mods are loaded
            return;
        }

        await this.storage.initialize();

        const loadQueue = this.getSortedMods();
        this.modLoader.modLoadQueue.splice(1);

        for (const { modClass, meta } of loadQueue) {
            await this.loadMod(modClass, meta);
        }
    }

    private getSortedMods() {
        // The first mod is QW
        const [, ...queue] = this.modLoader.modLoadQueue as QueueEntry[];

        // The following code is copy-pasted from Skim's implementation
        // TODO: Don't pollute mod metadata structures
        for (const { meta } of queue) {
            if (!meta.loadBefore) {
                meta.loadBefore = [];
            } else if (typeof meta.loadBefore === "string") {
                meta.loadBefore = [meta.loadBefore];
            }

            if (!meta.loadAfter) {
                meta.loadAfter = [];
            } else if (typeof meta.loadAfter === "string") {
                meta.loadAfter = [meta.loadAfter];
            }

            const first = meta.loadBefore.includes("*");
            const last = meta.loadAfter.includes("*");
            if (first && last) {
                alert(
                    "[QueueWizard] Invalid load order detected (launch with --dev for more info)",
                );
                this.LOG.error(
                    `Invalid load order: "${meta.id}" is requesting to load both first and last simultaneously.`,
                );
            }

            meta.queuePrefs = {
                first: first && !last,
                last: !first && last,
                before: [],
                after: [],
            };
        }

        for (const { meta: a } of queue) {
            for (const { meta: b } of queue) {
                const loadsBefore =
                    a.loadBefore!.includes(b.id) || b.loadAfter!.includes(a.id);
                const loadsAfter =
                    b.loadBefore!.includes(a.id) || a.loadAfter!.includes(b.id);
                if (loadsBefore && loadsAfter) {
                    alert(
                        "[QueueWizard] Circular dependency detected (launch with --dev for more info)",
                    );
                    this.LOG.error(
                        `Invalid load order: Circular dependency between "${a.id}" and "${b.id}".`,
                    );
                    continue;
                }

                if (loadsBefore) {
                    a.queuePrefs!.before.push(b.id);
                    b.queuePrefs!.after.push(a.id);
                }
                if (loadsAfter) {
                    b.queuePrefs!.before.push(a.id);
                    a.queuePrefs!.after.push(b.id);
                }
            }
        }

        queue.sort(
            ({ meta: { queuePrefs: a } }, { meta: { queuePrefs: b } }) =>
                Number(a!.first || b!.last) - Number(b!.first || a!.last),
        );

        queue.sort((a, b) => this.compareMods(a, b));

        const output: QueueEntry[] = [];

        while (true) {
            const nextOrphan = queue.findIndex(
                ({ meta }) => meta.queuePrefs!.after.length === 0,
            );
            if (nextOrphan === -1) {
                break;
            }

            const toProcess = queue.splice(nextOrphan, 1)[0];
            toProcess!.meta.queuePrefs!.before.forEach((id) => {
                const linkedAfter = queue.find(({ meta }) => meta.id === id)!.meta
                    .queuePrefs!.after;
                linkedAfter.splice(
                    linkedAfter.findIndex((x) => x === id),
                    1,
                );
            });
            delete toProcess!.meta.queuePrefs;

            output.push(toProcess!);
        }

        if (queue.length > 0) {
            alert(
                "[QueueWizard] Circular dependency detected (launch with --dev for more info)",
            );

            const invalidMods = queue.map(({ meta }) => `"${meta.id}"`);
            const lastInvalidMod = invalidMods.pop();

            this.LOG.error(
                `Invalid load order: 1 or more circular dependencies between ${invalidMods.join(
                    ", ",
                )} and ${lastInvalidMod}.`,
            );

            queue.forEach(({ meta }) => delete meta.queuePrefs);
        }

        return [...output, ...queue];
    }

    private compareMods(a: QueueEntry, b: QueueEntry): number {
        const aId = a.meta.id;
        const bId = b.meta.id;

        const aLoadBefore = a.meta.loadBefore as string[];
        const bLoadBefore = b.meta.loadBefore as string[];
        const aLoadAfter = a.meta.loadAfter as string[];
        const bLoadAfter = b.meta.loadAfter as string[];

        const shouldLoadBeforeAny = aLoadBefore.includes("*") || bLoadAfter.includes("*");
        const shouldLoadBefore =
            aLoadBefore.some((x) => x === bId) || bLoadAfter.some((x) => x === aId);

        const shouldLoadAfterAny = bLoadBefore.includes("*") || aLoadAfter.includes("*");
        const shouldLoadAfter =
            bLoadBefore.some((x) => x === aId) || aLoadAfter.some((x) => x === bId);

        let order = 0;
        order += shouldLoadBeforeAny ? -1 : 0;
        order += shouldLoadBefore ? -2 : 0;
        order += shouldLoadAfterAny ? 1 : 0;
        order += shouldLoadAfter ? 2 : 0;
        return order;
    }

    private async loadMod(modClass: typeof Mod, meta: QueueWizardMetadata) {
        // Mostly the same as vanilla mod loader
        if (meta.minimumGameVersion && validRange(meta.minimumGameVersion)) {
            if (!satisfies(BUILD_OPTIONS.BUILD_VERSION, meta.minimumGameVersion)) {
                alert(
                    "Unsupported game version: " +
                        `Mod ${meta.name} requires ${meta.minimumGameVersion} ` +
                        `but the game version is ${BUILD_OPTIONS.BUILD_VERSION}. ` +
                        "This mod will not be loaded.",
                );
                return;
            }
        }

        const settingsFile = `modsettings_${meta.id}__${meta.version}.json`;
        const settings = !!meta.settings
            ? await this.loadModSettings(settingsFile, meta.settings)
            : undefined;

        try {
            const modInstance: Mod = new modClass({
                app: this.app,
                modLoader: this.modLoader,
                meta,
                settings,
                saveSettings: async () => {
                    const serialized = JSON.stringify(modInstance.settings, undefined, 2);
                    await this.storage.writeFileAsync(settingsFile, serialized);
                },
            });

            await modInstance.init();
            this.modLoader.mods.push(modInstance);
        } catch (err) {
            this.LOG.error(`Mod failed to load: ${meta.id} (${meta.name})`);
            console.error(err);

            alert("");
        }
    }

    private async loadModSettings(filename: string, defaultSettings: {} | undefined) {
        try {
            const contents = await this.storage.readFileAsync(filename);
            return JSON.parse(contents);
        } catch (err) {
            if (err !== FILE_NOT_FOUND) {
                // TODO: Record errors?
                alert(`Failed to load settings from ${filename}:\n\n${err}`);
            }

            await this.storage.writeFileAsync(filename, JSON.stringify(defaultSettings));
            return JSON.parse(JSON.stringify(defaultSettings));
        }
    }
}

export default QueueWizard;
