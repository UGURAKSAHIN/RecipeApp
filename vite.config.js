const { defineConfig } = require("vite");

const base = process.env.VITE_BASE_PATH || "./";

module.exports = defineConfig({
    base,
    server: {
        host: "127.0.0.1",
        port: 4173
    },
    preview: {
        host: "127.0.0.1",
        port: 4174
    }
});
