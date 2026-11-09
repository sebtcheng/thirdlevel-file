// Console badge colors for the dev logger. Console styles cannot read CSS variables,
// so the InsightED palette values live here (theme folder is the only place for raw colors).
export const LOG_BADGE_STYLE = {
  debug: 'background:#586679;color:#E8EFF7',
  info: 'background:#0F4C8A;color:#FFFFFF',
  warn: 'background:#8A5605;color:#FFFFFF',
  error: 'background:#9B1022;color:#FFFFFF',
} as const;
