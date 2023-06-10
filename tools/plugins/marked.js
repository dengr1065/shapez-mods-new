import { marked as parse } from "marked";

/**
 * A plugin to transpile Markdown into HTML and return it as a module
 * with default export containing the resulting string.
 * @returns {import("rollup").Plugin}
 */
export function marked() {
    return {
        name: "marked",
        async transform(code, id) {
            if (!id.endsWith(".md")) {
                return;
            }

            const result = await parse(code, {
                async: true,
                mangle: false,
                headerIds: false,
            });

            return {
                code: `export default ${JSON.stringify(result)}`,
                map: { mappings: "" },
            };
        },
    };
}
