import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../components/marketing/MarketingShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../components/docs/DocsLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import DocsPage from '../pages/marketing/DocsPage';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/docs/:slug" element={<DocsPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('DocsPage', () => {
  it('renders the index doc at /docs', () => {
    renderAt('/docs');
    expect(
      screen.getByRole('heading', { level: 1, name: /welcome to tudu/i })
    ).toBeInTheDocument();
  });

  it('renders a known doc at /docs/:slug', () => {
    renderAt('/docs/boards');
    expect(
      screen.getByRole('heading', { level: 1, name: /boards & kanban/i })
    ).toBeInTheDocument();
  });

  it('renders a 404 for an unknown slug instead of falling back to the index', () => {
    renderAt('/docs/does-not-exist');
    expect(
      screen.getByRole('heading', { level: 1, name: /page not found/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 1, name: /welcome to tudu/i })
    ).toBeNull();
  });
});