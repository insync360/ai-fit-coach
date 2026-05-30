// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this.
    server: { entry: "server" },
  },
  // Force Nitro on with the Vercel preset so self-deploys produce a
  // Build-Output-API bundle. Without this, the Lovable preset auto-skips
  // Nitro for non-sandbox builds.
  //
  // The Vercel preset emits Build Output API v3 layout — point it at
  // `.vercel/output/` with Vercel's expected `static/` + `functions/__server.func/`
  // subpaths so Vercel auto-detects the bundle without needing vercel.json.
  nitro: {
    preset: "vercel",
    output: {
      dir: ".vercel/output",
      publicDir: ".vercel/output/static",
      serverDir: ".vercel/output/functions/__server.func",
    },
  },
});
