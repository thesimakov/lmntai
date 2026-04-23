import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-rubik)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)"
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)"
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)"
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)"
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)"
        },
        panel: "#171717",
        accentFrom: "#a855f7",
        accentTo: "#ec4899"
      },
      borderRadius: {
        DEFAULT: "15px",
        none: "0",
        sm: "15px",
        md: "15px",
        lg: "var(--radius)",
        xl: "15px",
        "2xl": "15px",
        "3xl": "15px",
        full: "9999px"
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)"
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        pulsegrid: {
          "0%, 100%": { opacity: "0.2" },
          "50%": { opacity: "0.7" }
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        },
        /** Изометрический build-loader (CodePen-стиль, правый панель «сборка») */
        "cp-iso-yaw": {
          from: { transform: "rotateX(-22deg) rotateY(0deg)" },
          to: { transform: "rotateX(-22deg) rotateY(360deg)" }
        },
        "cp-iso-pulse": {
          "0%, 100%": { opacity: "0.45", filter: "brightness(0.9)" },
          "50%": { opacity: "1", filter: "brightness(1.12)" }
        }
      },
      animation: {
        "fade-in-up": "fade-in-up 0.45s ease-out both",
        shimmer: "shimmer 2s linear infinite",
        pulsegrid: "pulsegrid 1.6s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "cp-iso-yaw": "cp-iso-yaw 14s linear infinite",
        "cp-iso-pulse": "cp-iso-pulse 2.2s ease-in-out infinite"
      }
    }
  },
  plugins: [tailwindcssAnimate]
};

export default config;
