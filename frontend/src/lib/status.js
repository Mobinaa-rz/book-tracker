/**
 * Single source of truth for book statuses: the API value, the label shown
 * to users and the CSS modifier used by badges/chips/stat cards.
 */
export const STATUSES = [
  { value: 'want_to_read', label: 'Want to Read' },
  { value: 'reading', label: 'Reading' },
  { value: 'finished', label: 'Finished' },
];

export const STATUS_VALUES = STATUSES.map((s) => s.value);

export function statusLabel(value) {
  return STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function isValidStatus(value) {
  return STATUS_VALUES.includes(value);
}
