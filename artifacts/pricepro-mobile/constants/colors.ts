// Exact tokens mirroring artifacts/price-pro/src/index.css :root and .dark blocks
// (HSL → hex). Do not invent new colors here — keep parity with the web app.

const colors = {
  light: {
    text: "#0F172A",
    tint: "#4F46E5",

    background: "#F9FAFB",         // 210 20% 98%
    foreground: "#0F172A",         // 222 47% 11%

    card: "#FFFFFF",                // 0 0% 100%
    cardForeground: "#0F172A",
    cardBorder: "#E2E8F0",

    primary: "#4F46E5",             // 243 75% 59%
    primaryForeground: "#F8FAFC",   // 210 40% 98%

    secondary: "#E2E8F0",           // 214 32% 91%
    secondaryForeground: "#0F172A",

    muted: "#E2E8F0",
    mutedForeground: "#64748B",     // 215.4 16.3% 46.9%

    accent: "#E2E8F0",              // 214 32% 91% (matches web exactly)
    accentForeground: "#0F172A",    // 222 47% 11%

    destructive: "#EF4444",         // 0 84.2% 60.2%
    destructiveForeground: "#F8FAFC",

    success: "#10B981",
    warning: "#F59E0B",

    border: "#E2E8F0",              // 214.3 31.8% 91.4%
    input: "#E2E8F0",
    ring: "#4F46E5",
  },
  dark: {
    text: "#F8FAFC",
    tint: "#6366F1",

    background: "#0F172A",          // 222 47% 11%
    foreground: "#F8FAFC",          // 210 40% 98%

    card: "#1E293B",                // 217.2 32.6% 17.5%
    cardForeground: "#F8FAFC",
    cardBorder: "#2D3B55",          // 217.2 32.6% 25%

    primary: "#6366F1",             // 243 75% 65%
    primaryForeground: "#FFFFFF",   // 0 0% 100%

    secondary: "#1E293B",
    secondaryForeground: "#F8FAFC",

    muted: "#1E293B",
    mutedForeground: "#94A3B8",     // 215 20.2% 65.1%

    accent: "#1E293B",              // 217.2 32.6% 17.5%
    accentForeground: "#F8FAFC",    // 210 40% 98%

    destructive: "#7F1D1D",         // 0 62.8% 30.6%
    destructiveForeground: "#F8FAFC",

    success: "#10B981",
    warning: "#F59E0B",

    border: "#1E293B",
    input: "#1E293B",
    ring: "#6366F1",
  },
  radius: 12,                       // --radius 0.75rem
};

export default colors;
