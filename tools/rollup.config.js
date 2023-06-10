import commonJS from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import url from "@rollup/plugin-url";
import sass from "rollup-plugin-sass";
import { modSources, resolveModEntry } from "./mod_resolver.js";
import { shapezDevWrapper } from "./plugins/dev_wrapper.js";
import { shapezLoader } from "./plugins/loader.js";
import { marked } from "./plugins/marked.js";
import { shapezMetadata } from "./plugins/metadata.js";
import { shapezEnv } from "./plugins/shapez_env.js";
import { resolveShapezModule, shapezExternal } from "./util.js";

const isDev = !!process.env.ROLLUP_WATCH;
const plugins = [
    // @ts-ignore invalid typings
    url({ limit: 0 }),
    // @ts-ignore invalid typings
    json({ exclude: "**/mod.json" }),
    sass(),
    marked(),
    shapezEnv(),
    shapezMetadata({ isDev }),
    shapezLoader(),
    // @ts-ignore invalid typings
    nodeResolve(),
    // @ts-ignore invalid typings
    commonJS(),
    // @ts-ignore invalid typings
    typescript(),
    // @ts-ignore invalid typings
    isDev ? shapezDevWrapper() : terser(),
];

/** @type {import("rollup").RollupOptions} */
const base = {
    output: {
        format: "iife",
        name: "self",
        extend: true,
        exports: "named",
        esModule: false,
        globals: resolveShapezModule,
        sourcemap: isDev ? "inline" : false,
        generatedCode: {
            preset: "es2015",
            symbols: false,
        },
    },
    external: shapezExternal,
    plugins,
};

const configs = [];

for (const mod of modSources) {
    configs.push({
        ...base,
        input: resolveModEntry(mod),
        output: {
            ...base.output,
            file: `build/${mod}.mod.js`,
        },
    });
}

export default configs;
