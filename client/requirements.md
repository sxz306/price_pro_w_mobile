## Packages
date-fns | Date formatting and manipulation
recharts | Dashboard charts and data visualization
lucide-react | Icons

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["var(--font-display)"],
  sans: ["var(--font-sans)"],
}
Prices are stored as numeric strings on the backend for precision; frontend will coerce to numbers for calculation and display.
No additional third-party dependencies are required beyond the base stack.
