import commonJS from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import url from "@rollup/plugin-url";
import postcss from "postcss";
import postcssUrl from "postcss-url";
import sass from "rollup-plugin-sass";
import { modSources, resolveModEntry } from "./mod_resolver.js";
import { shapezAtlasLoader } from "./plugins/atlas_loader.js";
import { shapezDevWrapper } from "./plugins/dev_wrapper.js";
import { shapezLoader } from "./plugins/loader.js";
import { marked } from "./plugins/marked.js";
import { shapezMetadata } from "./plugins/metadata.js";
import { shapezEnv, shapezGlobal } from "./plugins/shapez_env.js";
import { modFilePathToId } from "./util.js";

const isDev = !!process.env.ROLLUP_WATCH;

const cssProcessor = postcss([postcssUrl({ url: "inline" })]);
const plugins = [
    // @ts-ignore invalid typings
    url({ limit: Infinity }),
    // @ts-ignore invalid typings
    json({ exclude: "**/mod.json" }),
    // @ts-ignore invalid typings
    sass({
        processor: (css, id) =>
            cssProcessor.process(css, { from: id }).then((r) => r.css),
    }),
    marked(),
    shapezEnv(),
    shapezAtlasLoader(),
    shapezMetadata({ isDev }),
    shapezLoader(),
    // @ts-ignore invalid typings
    nodeResolve(),
    // @ts-ignore invalid typings
    commonJS(),
    // @ts-ignore invalid typings
    isDev ? shapezDevWrapper() : terser(),
];

/** @type {import("rollup").RollupOptions} */
const base = {
    output: {
        format: "iife",
        exports: "none",
        esModule: false,
        globals: {
            [shapezGlobal]: "shapez",
        },
        sourcemap: isDev ? "inline" : false,
        generatedCode: {
            preset: "es2015",
            symbols: false,
        },
    },
    external: [shapezGlobal],
};

/** @type {import("rollup").RollupOptions[]} */
const configs = [];

for (const mod of modSources) {
    configs.push({
        ...base,
        // A unique instance of TypeScript is needed for correct warning reports
        // @ts-ignore invalid typings
        plugins: [typescript(), ...plugins],
        onwarn(warning, defaultHandler) {
            const file = warning.loc?.file;
            if (file && modFilePathToId(file) !== mod) {
                // The warning is unrelated to this mod
                return;
            }

            defaultHandler(warning);
        },
        input: resolveModEntry(mod),
        output: {
            ...base.output,
            file: `build/${mod}.mod.js`,
        },
    });
}

export default configs;
