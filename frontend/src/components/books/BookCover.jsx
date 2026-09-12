import { coverColors, coverInitial } from '../../lib/cover.js';

/** Generated cover placeholder: the title's initial on a colour derived from the title. */
export function BookCover({ title, size = 'md', className = '' }) {
  const { from, to } = coverColors(title);
  return (
    <div
      className={`cover cover--${size} ${className}`.trim()}
      style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}
      aria-hidden="true"
    >
      {coverInitial(title)}
    </div>
  );
}
