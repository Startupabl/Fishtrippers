// Central brand configuration. Single source of truth for brand strings used
// across the app (Header, Logo, mock email chrome, etc.).

export const BRAND = {
  name: "FishTrippers",
  // Word-part breakdown used by the Logo component for two-tone rendering.
  // "Fish" (gold) + "Trippers" (navy).
  nameParts: {
    leading: "Fish",
    middle: "",
    trailing: "Trippers",
  },
  tagline: "Book your next fishing trip.",
  onboardingRoute: "/onboarding/choice",
  homeRoute: "/",
} as const;

export const DESIGN_SYSTEM = {
  colors: {
    background: "#FAFBFC", // Soft paper
    textPrimary: "#0A2540", // Ocean deep
    textSecondary: "#4B5563",
    // New brand palette
    oceanDeep: "#0A2540",
    ocean: "#1E4D7B",
    sky: "#3B82F6",
    gold: "#E8B547",
    goldDeep: "#C8941F",
    // Legacy aliases kept so existing components don't break.
    sunnyYellow: "#E8B547", // legacy alias → now gold
    leafGreen: "#1E4D7B", // legacy alias → now ocean
    primaryBlue: "#0A2540",
    accentGreen: "#E8B547", // CTA accent (now gold)
  },
  fonts: {
    serif: '"Montserrat", "Inter", system-ui, sans-serif',
    sansSerif: '"Inter", system-ui, sans-serif',
  },
} as const;
