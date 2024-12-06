import { MODS, type ModLoader, type ModMetadata } from "mods/modloader";
import { StorageImplElectron } from "platform/electron/storage";
import { MOD_ID } from "shapez-env";
import QueueWizard from "./mod";
import metadata from "./mod.json";

async function initQueueWizard(this: ModLoader) {
    const modInstance = new QueueWizard({
        app: this.app,
        modLoader: this,
        meta: metadata,
        settings: {},
        saveSettings: async () => {},
    });

    // Intentionally skip adding QW to the mods array - this will happen
    // once the second (useless) instance is initialized
    await modInstance.init();
}

// Patch the Electron storage implementation
const readFileAsync = StorageImplElectron.prototype.readFileAsync;
StorageImplElectron.prototype.readFileAsync = async function (filename) {
    if (filename.includes(MOD_ID)) {
        // Instead of reading settings for QW, initialize the mod and await
        await initQueueWizard.call(MODS);

        // Once the settings are read, vanilla modloader will try to initialize
        // QW as well, therefore a marker is helpful
        return JSON.stringify({
            initialized: true,
        });
    }

    // Pass through irrelevant files
    const settings = await readFileAsync.call(this, filename);
    return settings;
};

// Make ourselves the first mod to be constructed
MODS.modLoadQueue.unshift({
    modClass: QueueWizard,
    meta: metadata as unknown as ModMetadata,
});
