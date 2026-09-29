import { registerBuildingVariant } from "game/building_codes";
import { defaultBuildingVariant } from "game/meta_building";
import type { ModInterface } from "mods/mod_interface";
import type { ModMetaBuilding } from "mods/mod_meta_building";
import { T } from "translations";
import { REGISTRIES } from "./registries";

type MetaBuildingClass = typeof ModMetaBuilding;

/**
 * A version of {@link ModInterface.registerNewBuilding} that does not override
 * existing translations and does not register building images.
 * @param modInterface
 */
export function registerNewBuilding(metaClass: MetaBuildingClass) {
    REGISTRIES.metaBuilding.register(metaClass);
    const instance = REGISTRIES.metaBuilding.findByClass(metaClass);
    const buildingId = instance.getId();

    const translations = (T.buildings[buildingId] ??= {});

    for (const combination of metaClass.getAllVariantCombinations()) {
        const { variant, name, description } = combination;
        const variantSuffix = variant === defaultBuildingVariant ? "" : `-${variant}`;

        const rotationVariant = combination.rotationVariant ?? 0;
        const rotationVariantSuffix = rotationVariant === 0 ? "" : `-${rotationVariant}`;

        const combinationId = `${buildingId}${variantSuffix}${rotationVariantSuffix}`;
        registerBuildingVariant(combinationId, metaClass, variant, rotationVariant);

        const variantTranslations = (translations[variant] ??= {});
        variantTranslations.name ??= name;
        variantTranslations.description ??= description;
    }
}
