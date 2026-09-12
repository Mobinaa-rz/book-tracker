const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "10 Mar 2026" */
export function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date);
}

/** "today", "yesterday", "3 days ago", "2 months ago"... */
export function timeAgo(isoString, now = new Date()) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSeconds);

  if (abs < 60) return 'just now';
  if (abs < 3600) return relativeFormatter.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86400) return relativeFormatter.format(Math.round(diffSeconds / 3600), 'hour');
  if (abs < 86400 * 30) return relativeFormatter.format(Math.round(diffSeconds / 86400), 'day');
  if (abs < 86400 * 365) return relativeFormatter.format(Math.round(diffSeconds / (86400 * 30)), 'month');
  return relativeFormatter.format(Math.round(diffSeconds / (86400 * 365)), 'year');
}

/** "1 book" / "12 books" */
export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
