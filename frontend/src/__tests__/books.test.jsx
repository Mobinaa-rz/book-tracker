import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/auth.js';
import { booksApi } from '../api/books.js';
import { ApiError } from '../api/client.js';
import { BooksPage } from '../pages/BooksPage.jsx';
import { AddBookPage } from '../pages/AddBookPage.jsx';
import { EditBookPage } from '../pages/EditBookPage.jsx';
import { BookDetailsPage } from '../pages/BookDetailsPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { Navbar } from '../components/layout/Navbar.jsx';
import { LocationDisplay, renderWithProviders, sampleBooks } from '../test/utils.jsx';

vi.mock('../api/auth.js', () => ({
  authApi: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

vi.mock('../api/books.js', () => ({
  booksApi: { list: vi.fn(), stats: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const stats = { total: 2, wantToRead: 0, reading: 1, finished: 1, recent: sampleBooks };

beforeEach(() => {
  for (const fn of Object.values(booksApi)) fn.mockReset();
  authApi.me.mockReset();
  authApi.logout.mockReset();
  booksApi.stats.mockResolvedValue(stats);
  booksApi.list.mockResolvedValue(sampleBooks);
});

describe('BooksPage', () => {
  it('shows a loading skeleton, then the user\'s books', async () => {
    renderWithProviders(<BooksPage />, { route: '/books' });

    expect(screen.getByLabelText('Loading books')).toBeInTheDocument();

    expect(await screen.findByRole('link', { name: 'Dune by Frank Herbert' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'The Hobbit by J.R.R. Tolkien' })).toBeInTheDocument();
    expect(screen.getByText('2 books in your library')).toBeInTheDocument();
    expect(booksApi.list).toHaveBeenCalledWith({ search: '', status: '' });
  });

  it('reads search and status from the URL and passes them to the API', async () => {
    renderWithProviders(<BooksPage />, { route: '/books?search=dune&status=reading', path: '/books' });

    await screen.findByRole('link', { name: 'Dune by Frank Herbert' });
    expect(booksApi.list).toHaveBeenCalledWith({ search: 'dune', status: 'reading' });
    expect(screen.getByRole('searchbox')).toHaveValue('dune');
    expect(screen.getByRole('radio', { name: /Reading/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('filters by status when a chip is clicked and updates the URL', async () => {
    renderWithProviders(<BooksPage />, {
      route: '/books',
      extraRoutes: <Route path="/location" element={null} />,
    });
    await screen.findByRole('link', { name: 'Dune by Frank Herbert' });

    await userEvent.click(screen.getByRole('radio', { name: /Finished/ }));

    await waitFor(() => expect(booksApi.list).toHaveBeenLastCalledWith({ search: '', status: 'finished' }));
  });

  it('searches after typing (debounced)', async () => {
    renderWithProviders(<BooksPage />, { route: '/books' });
    await screen.findByRole('link', { name: 'Dune by Frank Herbert' });

    await userEvent.type(screen.getByRole('searchbox'), 'tolk');

    await waitFor(() => expect(booksApi.list).toHaveBeenLastCalledWith({ search: 'tolk', status: '' }), {
      timeout: 2000,
    });
  });

  it('shows the "no results" state with a clear-filters action', async () => {
    booksApi.list.mockResolvedValue([]);
    renderWithProviders(<BooksPage />, { route: '/books?search=zzz', path: '/books' });

    expect(await screen.findByText('No books match')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(booksApi.list).toHaveBeenLastCalledWith({ search: '', status: '' }));
  });

  it('shows the empty-library state when there are no books at all', async () => {
    booksApi.list.mockResolvedValue([]);
    booksApi.stats.mockResolvedValue({ total: 0, wantToRead: 0, reading: 0, finished: 0, recent: [] });
    renderWithProviders(<BooksPage />, { route: '/books' });

    expect(await screen.findByText('Your library is empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add your first book/ })).toHaveAttribute('href', '/books/new');
  });

  it('shows an error with a retry button when loading fails', async () => {
    booksApi.list.mockRejectedValueOnce(new ApiError(500, 'Something went wrong'));
    renderWithProviders(<BooksPage />, { route: '/books' });

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your books");
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: 'Dune by Frank Herbert' })).toBeInTheDocument();
  });
});

describe('AddBookPage', () => {
  it('validates required fields before calling the API', async () => {
    renderWithProviders(<AddBookPage />, { route: '/books/new' });

    await userEvent.click(await screen.findByRole('button', { name: 'Add book' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Author is required')).toBeInTheDocument();
    expect(booksApi.create).not.toHaveBeenCalled();
  });

  it('submits the cleaned payload and navigates to the new book', async () => {
    booksApi.create.mockResolvedValue({ ...sampleBooks[0], id: 42 });
    renderWithProviders(<AddBookPage />, {
      route: '/books/new',
      extraRoutes: <Route path="/books/:id" element={<LocationDisplay />} />,
    });

    await userEvent.type(await screen.findByLabelText(/Title/), '  Circe ');
    await userEvent.type(screen.getByLabelText(/Author/), 'Madeline Miller');
    await userEvent.click(screen.getByRole('radio', { name: /Finished/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Rate 4 of 5' }));
    await userEvent.type(screen.getByLabelText('Notes'), 'Loved it.');
    await userEvent.click(screen.getByRole('button', { name: 'Add book' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/books/42'));
    expect(booksApi.create).toHaveBeenCalledWith({
      title: 'Circe',
      author: 'Madeline Miller',
      status: 'finished',
      rating: 4,
      notes: 'Loved it.',
      // No dates were typed, so both are sent explicitly as null.
      start_date: null,
      finished_date: null,
    });
    expect(screen.getByRole('status')).toHaveTextContent('Book added');
  });

  it('sends rating: null when no rating is chosen', async () => {
    booksApi.create.mockResolvedValue({ ...sampleBooks[0], id: 7 });
    renderWithProviders(<AddBookPage />, {
      route: '/books/new',
      extraRoutes: <Route path="/books/:id" element={<LocationDisplay />} />,
    });

    await userEvent.type(await screen.findByLabelText(/Title/), 'Piranesi');
    await userEvent.type(screen.getByLabelText(/Author/), 'Susanna Clarke');
    await userEvent.click(screen.getByRole('button', { name: 'Add book' }));

    await waitFor(() => expect(booksApi.create).toHaveBeenCalled());
    expect(booksApi.create.mock.calls[0][0]).toMatchObject({ rating: null, status: 'want_to_read', notes: '' });
  });

  it('shows server-side field errors', async () => {
    booksApi.create.mockRejectedValue(
      new ApiError(400, 'Validation failed', { title: 'Title must be at most 200 characters' }),
    );
    renderWithProviders(<AddBookPage />, { route: '/books/new' });

    await userEvent.type(await screen.findByLabelText(/Title/), 'X');
    await userEvent.type(screen.getByLabelText(/Author/), 'Y');
    await userEvent.click(screen.getByRole('button', { name: 'Add book' }));

    expect(await screen.findByText('Title must be at most 200 characters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add book' })).toBeEnabled();
  });
});

describe('EditBookPage', () => {
  it('pre-fills the form and saves changes', async () => {
    booksApi.get.mockResolvedValue(sampleBooks[0]);
    booksApi.update.mockResolvedValue({ ...sampleBooks[0], title: 'Dune Messiah' });
    renderWithProviders(<EditBookPage />, {
      route: '/books/1/edit',
      path: '/books/:id/edit',
      extraRoutes: <Route path="/books/:id" element={<LocationDisplay />} />,
    });

    const title = await screen.findByLabelText(/Title/);
    expect(title).toHaveValue('Dune');
    expect(screen.getByLabelText(/Author/)).toHaveValue('Frank Herbert');
    expect(screen.getByRole('radio', { name: /Reading/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '4');
    // A date the API sent as null must land as an empty string, or React would
    // treat the input as uncontrolled and warn when it is typed into.
    expect(screen.getByLabelText('Started')).toHaveValue('2026-03-10');
    expect(screen.getByLabelText('Finished')).toHaveValue('');

    await userEvent.clear(title);
    await userEvent.type(title, 'Dune Messiah');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/books/1'));
    expect(booksApi.update).toHaveBeenCalledWith('1', {
      title: 'Dune Messiah',
      author: 'Frank Herbert',
      status: 'reading',
      rating: 4,
      notes: 'Great world-building.',
      // The stored dates come back round: PUT is a full update, so a form that
      // omitted them would clear them on every save.
      start_date: '2026-03-10',
      finished_date: null,
    });
    expect(screen.getByRole('status')).toHaveTextContent('Changes saved');
  });

  it('shows a not-found state for a missing book', async () => {
    booksApi.get.mockRejectedValue(new ApiError(404, 'Book not found'));
    renderWithProviders(<EditBookPage />, { route: '/books/999/edit', path: '/books/:id/edit' });

    expect(await screen.findByText('Book not found')).toBeInTheDocument();
  });
});

describe('BookDetailsPage', () => {
  it('shows the book details', async () => {
    booksApi.get.mockResolvedValue(sampleBooks[0]);
    renderWithProviders(<BookDetailsPage />, { route: '/books/1', path: '/books/:id' });

    expect(await screen.findByRole('heading', { level: 2, name: 'Dune' })).toBeInTheDocument();
    expect(screen.getByText('by Frank Herbert')).toBeInTheDocument();
    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Rated 4 out of 5' })).toBeInTheDocument();
    expect(screen.getByText('Great world-building.')).toBeInTheDocument();
    // The reader's own date, rendered from the date-only string without a
    // timezone shift, and ahead of the "added" timestamp.
    expect(screen.getByText('Started 10 Mar 2026')).toBeInTheDocument();
    expect(screen.queryByText(/Finished \d/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Edit/ })).toHaveAttribute('href', '/books/1/edit');
  });

  it('only deletes after confirmation, then navigates to My Books', async () => {
    booksApi.get.mockResolvedValue(sampleBooks[0]);
    booksApi.remove.mockResolvedValue(null);
    renderWithProviders(<BookDetailsPage />, {
      route: '/books/1',
      path: '/books/:id',
      extraRoutes: <Route path="/books" element={<LocationDisplay />} />,
    });

    await userEvent.click(await screen.findByRole('button', { name: /Delete/ }));
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(within(dialog).getByText('Delete “Dune”?')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel', hidden: true }));
    expect(booksApi.remove).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Delete/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete', hidden: true }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/books'));
    expect(booksApi.remove).toHaveBeenCalledWith('1');
    expect(screen.getByRole('status')).toHaveTextContent('Book deleted');
  });

  it('shows a friendly not-found state', async () => {
    booksApi.get.mockRejectedValue(new ApiError(404, 'Book not found'));
    renderWithProviders(<BookDetailsPage />, { route: '/books/999', path: '/books/:id' });

    expect(await screen.findByText("We couldn't find that book")).toBeInTheDocument();
  });
});

describe('DashboardPage', () => {
  it('renders the statistics and recent books', async () => {
    renderWithProviders(<DashboardPage />, { route: '/', protectedPage: true });

    expect(await screen.findByRole('heading', { name: 'Welcome back, mobina' })).toBeInTheDocument();
    // The heading renders straight away; the stats arrive once the API call resolves.
    expect(await screen.findByRole('link', { name: 'Total books: 2. View these books' })).toHaveAttribute(
      'href',
      '/books',
    );
    expect(screen.getByRole('link', { name: 'Reading: 1. View these books' })).toHaveAttribute(
      'href',
      '/books?status=reading',
    );
    expect(screen.getByRole('link', { name: 'Finished: 1. View these books' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Want to Read: 0. View these books' })).toBeInTheDocument();
    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText('The Hobbit')).toBeInTheDocument();
  });

  it('shows the empty state for a brand-new user', async () => {
    booksApi.stats.mockResolvedValue({ total: 0, wantToRead: 0, reading: 0, finished: 0, recent: [] });
    renderWithProviders(<DashboardPage />, { route: '/', protectedPage: true });

    expect(await screen.findByText('Start your library')).toBeInTheDocument();
  });
});

describe('Navbar', () => {
  it('highlights the current page and logs out', async () => {
    authApi.logout.mockResolvedValue(null);
    renderWithProviders(<Navbar />, {
      route: '/books',
      protectedPage: true,
      extraRoutes: <Route path="/login" element={<LocationDisplay />} />,
    });

    expect(await screen.findByRole('link', { name: 'My Books' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
    expect(screen.getByText('mobina')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login'));
    expect(authApi.logout).toHaveBeenCalled();
  });
});
