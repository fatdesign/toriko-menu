/**
 * ============================================
 * DIGITAL MENU - CENTRAL SETTINGS
 * ============================================
 * Edit this file to customize the restaurant's branding,
 * design, and API settings.
 */

const SETTINGS = {
    // 1. BRANDING
    restaurantName: "T O R I K O",
    tagline: "Korean Fried Chicken & Burger Spot",
    metaDescription: "Ehrlicher Geschmack & Asian Street Food Vibes am Mirabellplatz. Entdecken Sie unser Korean Fried Chicken und Smashed Burger.",
    footerText: "2026 TORIKO Salzburg",

    // 2. DESIGN TOKENS (Colors & Fonts)
    theme: {
        bgPrimary: "#1a1a1a",    // Dark Grey/Black
        bgHeader: "#262626",     // Slightly lighter dark
        accentPink: "#e74c3c",   // Vibrant Red (Asian vibe)
        accentTeal: "#f39c12",   // Orange/Gold accent
        textPrimary: "#ffffff",
        textSecondary: "#cccccc",
        fontHeading: "'Outfit', sans-serif",
        fontBody: "'Outfit', sans-serif"
    },

    // 3. API & STORAGE
    proxyUrl: "https://toriko-menu-proxy.f-klavun.workers.dev",
    storageKey: "toriko_menu_lang",

    // 4. FEATURES
    languages: ["de", "en"],
    defaultLang: "de"
};
