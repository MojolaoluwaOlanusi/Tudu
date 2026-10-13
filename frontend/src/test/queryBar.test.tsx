import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QueryBar from '../components/tasks/QueryBar';

describe('QueryBar', () => {
  it('renders with the placeholder from the design', () => {
    render(
      <MemoryRouter>
        <QueryBar />
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText(/Search tasks/i)).toBeInTheDocument();
  });

  it('opens the syntax help on click', () => {
    render(
      <MemoryRouter>
        <QueryBar />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /Query syntax help/i }));
    expect(screen.getByText(/Filter syntax/i)).toBeInTheDocument();
    expect(screen.getByText('@me')).toBeInTheDocument();
    expect(screen.getByText('due:week')).toBeInTheDocument();
  });
});
