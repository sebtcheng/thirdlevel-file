const NO_DATE_LABEL = 'No date';

const toTime = (value) => {
  if (!value) return Infinity;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Infinity : time;
};

// Soonest separation date first, grouped by year. People without a valid date come last.
export const groupRetireesByYear = (retirees) => {
  const sorted = retirees
    .map(official => ({ official, time: toTime(official.separationDate) }))
    .sort((a, b) => (a.time === b.time ? 0 : a.time - b.time));

  const groups = [];
  for (const { official, time } of sorted) {
    const label = time === Infinity ? NO_DATE_LABEL : String(new Date(time).getFullYear());
    const current = groups[groups.length - 1];
    if (current?.label === label) current.officials.push(official);
    else groups.push({ label, officials: [official] });
  }
  return groups;
};
