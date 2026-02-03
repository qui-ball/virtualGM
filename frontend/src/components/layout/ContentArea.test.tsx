import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContentArea } from './ContentArea';

describe('ContentArea', () => {
  it('renders children content', () => {
    render(
      <ContentArea>
        <div>Test Content</div>
      </ContentArea>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies default max-width container', () => {
    render(<ContentArea>Content</ContentArea>);
    const contentArea = screen.getByTestId('content-area');
    expect(contentArea).toHaveClass('max-w-7xl', 'mx-auto');
  });

  it('applies full max-width when specified', () => {
    render(<ContentArea maxWidth="full">Content</ContentArea>);
    const contentArea = screen.getByTestId('content-area');
    expect(contentArea).toHaveClass('max-w-full');
    expect(contentArea).not.toHaveClass('mx-auto');
  });

  it('applies narrow max-width when specified', () => {
    render(<ContentArea maxWidth="narrow">Content</ContentArea>);
    const contentArea = screen.getByTestId('content-area');
    expect(contentArea).toHaveClass('max-w-3xl', 'mx-auto');
  });

  it('applies default padding', () => {
    render(<ContentArea>Content</ContentArea>);
    const contentArea = screen.getByTestId('content-area');
    expect(contentArea).toHaveClass('p-4', 'sm:p-6', 'md:p-8', 'lg:p-12');
  });

  it('applies no padding when specified', () => {
    render(<ContentArea padding="none">Content</ContentArea>);
    const contentArea = screen.getByTestId('content-area');
    expect(contentArea).not.toHaveClass('p-4');
  });

  it('applies small padding when specified', () => {
    render(<ContentArea padding="sm">Content</ContentArea>);
    const contentArea = screen.getByTestId('content-area');
    expect(contentArea).toHaveClass('p-4', 'sm:p-6');
  });

  it('applies large padding when specified', () => {
    render(<ContentArea padding="lg">Content</ContentArea>);
    const contentArea = screen.getByTestId('content-area');
    expect(contentArea).toHaveClass('p-6', 'sm:p-8', 'md:p-12', 'lg:p-16');
  });

  it('applies scrollable class when scrollable is true', () => {
    render(<ContentArea scrollable>Content</ContentArea>);
    const contentArea = screen.getByTestId('content-area');
    expect(contentArea).toHaveClass('overflow-y-auto');
  });

  it('does not apply scrollable class when scrollable is false', () => {
    render(<ContentArea scrollable={false}>Content</ContentArea>);
    const contentArea = screen.getByTestId('content-area');
    expect(contentArea).not.toHaveClass('overflow-y-auto');
  });

  it('applies custom className', () => {
    render(<ContentArea className="custom-class">Content</ContentArea>);
    const contentArea = screen.getByTestId('content-area');
    expect(contentArea).toHaveClass('custom-class');
  });

  it('renders content area for layout', () => {
    render(<ContentArea>Content</ContentArea>);
    const contentArea = screen.getByTestId('content-area');
    expect(contentArea).toBeInTheDocument();
  });

  it('is responsive with mobile-first padding', () => {
    render(<ContentArea>Content</ContentArea>);
    const contentArea = screen.getByTestId('content-area');
    expect(contentArea).toHaveClass('p-4', 'sm:p-6', 'md:p-8', 'lg:p-12');
  });
});
