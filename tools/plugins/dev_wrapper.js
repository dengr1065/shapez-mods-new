/**
 * A plugin to wrap the resulting bundle into an eval() call,
 * so that source maps work correctly.
 * @returns {import("rollup").Plugin}
 */
export function shapezDevWrapper() {
    return {
        name: "shapez-dev-wrapper",
        generateBundle(_options, bundle, _isWrite) {
            for (const file of Object.values(bundle)) {
                if (!("code" in file)) {
                    // Not a chunk
                    continue;
                }

                file.code = `eval(${JSON.stringify(file.code)});`;
            }
        },
    };
}
