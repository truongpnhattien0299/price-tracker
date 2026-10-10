// Pro prices in VND. `null` = not decided yet (DESIGN.md §14.4 leaves the
// numbers to the paywall phase); the landing then shows "Sắp công bố" rather
// than an invented figure. Keep in sync with the RevenueCat offering.
export const proPrice: { monthly: number | null; yearly: number | null } = {
  monthly: null,
  yearly: null,
}

// Free tier limits from DESIGN.md §14.1 — enforced by the backend in plan 07.
export const freeLimits = {
  entriesPerMonth: 50,
  historyMonths: 3,
}

export const TRIAL_DAYS = 30
