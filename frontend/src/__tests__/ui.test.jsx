import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { StarRating, StarRatingInput } from '../components/ui/StarRating.jsx';
import { ChoiceChips } from '../components/ui/ChoiceChips.jsx';
import { formatDate, pluralize, timeAgo } from '../lib/format.js';
import { coverColors, coverInitial } from '../lib/cover.js';

describe('StatusBadge', () => {
  it.each([
    ['want_to_read', 'Want to Read'],
    ['reading', 'Reading'],
    ['finished', 'Finished'],
  ])('shows the readable label for %s', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(label)).toHaveClass(`badge--${status}`);
  });
});

describe('StarRating (read-only)', () => {
  it('announces the rating and shows the numeric value', () => {
    render(<StarRating value={4} />);
    expect(screen.getByRole('img', { name: 'Rated 4 out of 5' })).toBeInTheDocument();
    expect(screen.getByText('4/5')).toBeInTheDocument();
  });

  it('shows "Not rated" when there is no rating', () => {
    render(<StarRating value={null} />);
    expect(screen.getByText('Not rated')).toBeInTheDocument();
  });
});

function ControlledRating({ initial = null, onChange = () => {} }) {
  const [value, setValue] = useState(initial);
  return (
    <StarRatingInput
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe('StarRatingInput', () => {
  it('sets the rating when a star is clicked', async () => {
    const onChange = vi.fn();
    render(<ControlledRating onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Rate 3 of 5' }));
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '3');
  });

  it('clears the rating when the same star is clicked again', async () => {
    const onChange = vi.fn();
    render(<ControlledRating initial={3} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Rate 3 of 5' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');

    // Once the pointer leaves, the hover preview goes away and "Not rated" shows.
    await userEvent.unhover(screen.getByRole('button', { name: 'Rate 3 of 5' }));
    expect(screen.getByText('Not rated')).toBeInTheDocument();
  });

  it('has a Clear button when rated', async () => {
    const onChange = vi.fn();
    render(<ControlledRating initial={5} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('supports keyboard arrows', async () => {
    const onChange = vi.fn();
    render(<ControlledRating initial={2} onChange={onChange} />);

    const slider = screen.getByRole('slider');
    slider.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(3);
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith(1);
    await userEvent.keyboard('{Backspace}');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe('ChoiceChips', () => {
  const options = [
    { value: '', label: 'All' },
    { value: 'reading', label: 'Reading', count: 2 },
    { value: 'finished', label: 'Finished', count: 4 },
  ];

  it('renders a radio group with the selected option checked', () => {
    render(<ChoiceChips label="Status" options={options} value="reading" onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Reading/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /All/ })).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with the clicked value', async () => {
    const onChange = vi.fn();
    render(<ChoiceChips label="Status" options={options} value="" onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /Finished/ }));
    expect(onChange).toHaveBeenCalledWith('finished');
  });
});

describe('format helpers', () => {
  it('formats dates', () => {
    expect(formatDate('2026-03-10T10:00:00.000Z')).toMatch(/10 Mar 2026/);
    expect(formatDate(null)).toBe('');
  });

  it('formats relative time', () => {
    const now = new Date('2026-03-12T10:00:00.000Z');
    expect(timeAgo('2026-03-12T09:59:50.000Z', now)).toBe('just now');
    expect(timeAgo('2026-03-10T10:00:00.000Z', now)).toBe('2 days ago');
    expect(timeAgo('2026-03-11T10:00:00.000Z', now)).toBe('yesterday');
  });

  it('pluralizes', () => {
    expect(pluralize(1, 'book')).toBe('1 book');
    expect(pluralize(3, 'book')).toBe('3 books');
  });
});

describe('cover helpers', () => {
  it('is deterministic for the same title', () => {
    expect(coverColors('Dune')).toEqual(coverColors('dune '));
  });

  it('skips leading articles for the initial', () => {
    expect(coverInitial('The Hobbit')).toBe('H');
    expect(coverInitial('a memory called empire')).toBe('M');
    expect(coverInitial('Dune')).toBe('D');
    expect(coverInitial('')).toBe('?');
  });
});
