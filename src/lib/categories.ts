export const CATEGORIES = [
  { code: 'FOOD',       label: 'FOOD',       kind: 'EXPENSE' },
  { code: 'TRANSPORT',  label: 'TRANSPORT',  kind: 'EXPENSE' },
  { code: 'BILLS',      label: 'BILLS',      kind: 'EXPENSE' },
  { code: 'SHOPPING',   label: 'SHOPPING',   kind: 'EXPENSE' },
  { code: 'FUN',        label: 'FUN',        kind: 'EXPENSE' },
  { code: 'HEALTH',     label: 'HEALTH',     kind: 'EXPENSE' },
  { code: 'INVEST',     label: 'INVEST',     kind: 'EXPENSE' },
  { code: 'OTHER',      label: 'OTHER',      kind: 'EXPENSE' },
  { code: 'SALARY',     label: 'SALARY',     kind: 'INCOME'  },
  { code: 'FREELANCE',  label: 'FREELANCE',  kind: 'INCOME'  },
  { code: 'INVESTMENT', label: 'INV',        kind: 'INCOME'  },
] as const

export type CategoryCode = (typeof CATEGORIES)[number]['code']
