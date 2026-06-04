import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Mentrixa palette
        mentrixa: {
          50:  "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          400: "#A78BFA",
          600: "#7C3AED",
          700: "#6D28D9",
          900: "#4C1D95",
        },
        // Workbench (LeetCode-inspired utility surfaces; still Mentrixa colors)
        workbench: {
          bg: "#0B1220",
          panel: "#111A2B",
          panelSoft: "#162238",
          border: "#22314A",
          text: "#E2E8F0",
          muted: "#94A3B8",
          accent: "#6366F1",
        },
        // Arena (Clash-inspired progression surfaces using Mentrixa spectrum)
        arena: {
          bg: "#0A1022",
          card: "#15203A",
          cardSoft: "#1D2B4B",
          border: "#334A79",
          cta: "#7C3AED",
          ctaSecondary: "#4F46E5",
          reward: "#8B5CF6",
          danger: "#EF4444",
        },
        difficulty: {
          easy: "#22C55E",
          medium: "#F59E0B",
          hard: "#EF4444",
        },
        rank: {
          bronze: "#B45309",
          silver: "#64748B",
          gold: "#F59E0B",
          platinum: "#6366F1",
          grandmaster: "#8B5CF6",
        },
        // Legacy brand palette
        brand: {
          50:  "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
          950: "#1E1B4B",
        },
        surface: {
          base:   "#FFFFFF",
          soft:   "#F9FAFB",
          muted:  "#F3F4F6",
          border: "#E5E7EB",
          hover:  "#F5F3FF",
        },
        text: {
          primary:   "#0F172A",
          secondary: "#334155",
          muted:     "#64748B",
          disabled:  "#94A3B8",
        },
        success: { DEFAULT: "#059669", light: "#ECFDF5", border: "#6EE7B7" },
        warning: { DEFAULT: "#D97706", light: "#FFFBEB", border: "#FCD34D" },
        danger:  { DEFAULT: "#DC2626", light: "#FEF2F2", border: "#FCA5A5" },
        gold:    { DEFAULT: "#B45309", light: "#FFFBEB" },

        // Keep legacy CSS-variable based tokens so existing pages don't break
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      fontFamily: {
        display: ["Geist", "system-ui", "sans-serif"],
        sans:    ["Geist", "system-ui", "sans-serif"],
        mono:    ["Geist Mono", "monospace"],
      },
      borderRadius: {
        lg:   "var(--radius)",
        md:   "calc(var(--radius) - 2px)",
        sm:   "calc(var(--radius) - 4px)",
        xl:   "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 16px)",
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        "glow-sm":   "0 0 0 3px rgba(99,102,241,0.12)",
        "glow":      "0 0 0 4px rgba(99,102,241,0.18)",
        "glow-lg":   "0 0 48px 0 rgba(124,58,237,0.25)",
        "card":      "0 1px 3px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.04)",
        "card-hover":"0 4px 16px rgba(99,102,241,0.12), 0 1px 3px rgba(15,23,42,0.06)",
        "float":     "0 8px 32px rgba(99,102,241,0.18), 0 2px 8px rgba(15,23,42,0.08)",
      },
      animation: {
        "float":       "float 6s ease-in-out infinite",
        "pulse-glow":  "pulseGlow 2s ease-in-out infinite",
        "slide-up":    "slideUp 0.5s cubic-bezier(0.16,1,0.3,1)",
        "fade-in":     "fadeIn 0.4s ease-out",
        "shimmer":     "shimmer 2s infinite",
        "bounce-slow": "bounce 3s infinite",
        "spin-slow":   "spin 8s linear infinite",
        // legacy
        "fade-up":         "fade-up 0.6s ease-out forwards",
        "scale-in":        "scale-in 0.4s ease-out forwards",
        "slide-in-right":  "slide-in-right 0.5s ease-out forwards",
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "spotlight":       "spotlight 2s ease .75s 1 forwards",
      },
      keyframes: {
        float:     { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-12px)" } },
        pulseGlow: { "0%,100%": { boxShadow: "0 0 12px rgba(99,102,241,0.2)" }, "50%": { boxShadow: "0 0 32px rgba(99,102,241,0.5)" } },
        slideUp:   { "0%": { transform: "translateY(16px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        fadeIn:    { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        shimmer:   { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(20px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "scale-in":{ from: { opacity: "0", transform: "scale(0.95)" }, to: { opacity: "1", transform: "scale(1)" } },
        "slide-in-right": { from: { opacity: "0", transform: "translateX(20px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        spotlight: { "0%": { opacity: "0", transform: "translate(-72%, -62%) scale(0.5)" }, "100%": { opacity: "1", transform: "translate(-50%,-40%) scale(1)" } },
      },
      backgroundImage: {
        "gradient-radial":  "radial-gradient(var(--tw-gradient-stops))",
        "gradient-brand":   "linear-gradient(135deg, #2563EB 0%, #6366F1 50%, #A855F7 100%)",
        "gradient-warm":    "linear-gradient(135deg, #F8FAFF 0%, #F5F3FF 50%, #F0F9FF 100%)",
        "gradient-card":    "linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(245,243,255,0.6) 100%)",
        "mesh-blue":        "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 60%)",
        "shimmer-gradient": "linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.08) 50%, transparent 100%)",
      },
      fontSize: {
        "display-xl": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-md": ["3rem",    { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "display-sm": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
