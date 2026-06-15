// Central brand configuration. Single source of truth for brand strings used
// across the app (Header, Logo, mock email chrome, etc.).

export const BRAND = {
  name: "Lemonaidely",
  // Word-part breakdown used by the Logo component for multi-color rendering.
  // "Lemon" + "AI" + "dely" — yellow/green/yellow.
  nameParts: {
    leading: "Lemon",
    middle: "AI",
    trailing: "dely",
  },
  tagline: "AI Made Refreshing™",
  onboardingRoute: "/onboarding/choice",
  homeRoute: "/",
} as const;

export const DESIGN_SYSTEM = {
  colors: {
    background: "#FFFDF5", // Soft lemon cream
    textPrimary: "#1F2937", // Deep charcoal
    textSecondary: "#4B5563",
    sunnyYellow: "#F5C518", // Brand yellow ("Lemon" / "dely")
    leafGreen: "#3DA35D", // Brand green ("AI")
    primaryBlue: "#F5C518", // legacy alias → now yellow
    accentGreen: "#3DA35D", // legacy alias → leaf green
  },
  fonts: {
    serif: '"Montserrat", "Inter", system-ui, sans-serif',
    sansSerif: '"Inter", system-ui, sans-serif',
  },
} as const;
