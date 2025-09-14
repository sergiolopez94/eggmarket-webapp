/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Custom Egg Market color palette
        neutral: {
          25: "#FFFFFF",
          50: "#E7E8E8",
          100: "#CFD0D2",
          200: "#B6B8BD",
          300: "#9CA0A9",
          400: "#818795",
          500: "#686F80",
          600: "#585D69",
          700: "#484B53",
          800: "#37393D",
          900: "#252628",
          950: "#131314"
        },
        blue: {
          25: "#F3F7FC",
          50: "#D0E1F5",
          100: "#ABC0F0",
          200: "#84A8ED",
          300: "#5CA6EB",
          400: "#3195EC",
          500: "#0F85E4", // Primary blue
          600: "#106CC3",
          700: "#1156A2",
          800: "#104283",
          900: "#0E3065",
          950: "#0C2147"
        },
        // ShadCN theme variables
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Role indicator colors
        roles: {
          admin: "#1156A2",    // blue-700
          manager: "#0F85E4",  // blue-500
          salesperson: "#3195EC", // blue-400
          viewer: "#686F80"    // neutral-500
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}