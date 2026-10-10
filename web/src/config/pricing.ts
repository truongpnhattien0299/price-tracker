// Pro prices in VND. `null` = not decided yet (DESIGN.md §14.4 leaves the
// numbers to the paywall phase); the landing then shows "Sắp công bố" rather
// than an invented figure. Keep in sync with the RevenueCat offering.
export const proPrice: { monthly: number | null; yearly: number | null } = {
  monthly: null,
  yearly: null,
}

// Free tier limits from DESIGN.md §14.1, for the static landing only. The backend
// enforces its own copy (FREE_LIMITS in backend/src/common/entitlement.util.ts) and
// the dashboard reads the numbers from /me/entitlement — keep the two in sync.
export const freeLimits = {
  entriesPerMonth: 50,
  historyMonths: 3,
}

export const TRIAL_DAYS = 30
