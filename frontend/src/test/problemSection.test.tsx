import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProblemSection from '../components/landing/ProblemSection';

describe('ProblemSection', () => {
  it('renders the heading, sub-copy, and both toggle buttons', () => {
    render(<ProblemSection />);
    expect(
      screen.getByRole('heading', { name: /outgrown the options/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Trello vs Tudu/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Jira vs Tudu/i }),
    ).toBeInTheDocument();
  });

  it('renders all three comparison cards', () => {
    render(<ProblemSection />);
    expect(screen.getAllByText('Trello').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tudu').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Jira').length).toBeGreaterThanOrEqual(1);
  });

  it('toggles aria-pressed when a mode button is clicked', () => {
    render(<ProblemSection />);
    const trelloBtn = screen.getByRole('button', { name: /Trello vs Tudu/i });
    const jiraBtn = screen.getByRole('button', { name: /Jira vs Tudu/i });

    expect(trelloBtn).toHaveAttribute('aria-pressed', 'true');
    expect(jiraBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(jiraBtn);
    expect(trelloBtn).toHaveAttribute('aria-pressed', 'false');
    expect(jiraBtn).toHaveAttribute('aria-pressed', 'true');
  });
});