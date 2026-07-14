import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/SwingComboTinder/",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["assets/icon.svg", "assets/apple-touch-icon.png", "assets/social-preview.jpg"],
      manifest: {
        name: "Swing Thing — Lindy Hop Combo Prep",
        short_name: "Swing Thing",
        description: "Build a focused Lindy Hop, Charleston, or Collegiate Shag deck for tonight.",
        start_url: ".",
        scope: ".",
        display: "standalone",
        background_color: "#081d2d",
        theme_color: "#081d2d",
        icons: [{ src: "assets/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }]
      },
      workbox: {
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,png,svg,jpg,webmanifest}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          }
        ]
      }
    })
  ]
});
