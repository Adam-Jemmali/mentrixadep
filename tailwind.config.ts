import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Mentrixa palette
        mentrixa: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          400: "#60A5FA",
          600: "#2563EB",
          700: "#1D4ED8",
          900: "#1E3A8A",
        },
        // Legacy brand palette (kept for existing pages)
        brand: {
          50:  "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
          950: "#0F172A",
        },
        surface: {
          base:   "#FFFFFF",
          soft:   "#F8FAFF",
          muted:  "#F1F5FF",
          border: "#E2EAFF",
          hover:  "#EFF6FF",
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
        "glow-sm":   "0 0 0 3px rgba(37,99,235,0.12)",
        "glow":      "0 0 0 4px rgba(37,99,235,0.18)",
        "glow-lg":   "0 0 48px 0 rgba(37,99,235,0.25)",
        "card":      "0 1px 3px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.04)",
        "card-hover":"0 4px 16px rgba(37,99,235,0.12), 0 1px 3px rgba(15,23,42,0.06)",
        "float":     "0 8px 32px rgba(37,99,235,0.18), 0 2px 8px rgba(15,23,42,0.08)",
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
      },
      keyframes: {
        float:     { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-12px)" } },
        pulseGlow: { "0%,100%": { boxShadow: "0 0 12px rgba(37,99,235,0.2)" }, "50%": { boxShadow: "0 0 32px rgba(37,99,235,0.5)" } },
        slideUp:   { "0%": { transform: "translateY(16px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        fadeIn:    { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        shimmer:   { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(20px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "scale-in":{ from: { opacity: "0", transform: "scale(0.95)" }, to: { opacity: "1", transform: "scale(1)" } },
        "slide-in-right": { from: { opacity: "0", transform: "translateX(20px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      backgroundImage: {
        "gradient-radial":  "radial-gradient(var(--tw-gradient-stops))",
        "gradient-brand":   "linear-gradient(135deg, #2563EB 0%, #4F46E5 50%, #06B6D4 100%)",
        "gradient-warm":    "linear-gradient(135deg, #F8FAFF 0%, #EFF6FF 50%, #F0F9FF 100%)",
        "gradient-card":    "linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(239,246,255,0.6) 100%)",
        "mesh-blue":        "radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(79,70,229,0.06) 0%, transparent 60%)",
        "shimmer-gradient": "linear-gradient(90deg, transparent 0%, rgba(37,99,235,0.08) 50%, transparent 100%)",
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
