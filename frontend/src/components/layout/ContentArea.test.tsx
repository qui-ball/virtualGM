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
    const { container } = render(<ContentArea>Content</ContentArea>);
    const main = container.querySelector('main');
    expect(main).toHaveClass('max-w-7xl', 'mx-auto');
  });

  it('applies full max-width when specified', () => {
    const { container } = render(<ContentArea maxWidth="full">Content</ContentArea>);
    const main = container.querySelector('main');
    expect(main).toHaveClass('max-w-full');
    expect(main).not.toHaveClass('mx-auto');
  });

  it('applies narrow max-width when specified', () => {
    const { container } = render(<ContentArea maxWidth="narrow">Content</ContentArea>);
    const main = container.querySelector('main');
    expect(main).toHaveClass('max-w-3xl', 'mx-auto');
  });

  it('applies default padding', () => {
    const { container } = render(<ContentArea>Content</ContentArea>);
    const main = container.querySelector('main');
    expect(main).toHaveClass('p-4', 'sm:p-6', 'md:p-8', 'lg:p-12');
  });

  it('applies no padding when specified', () => {
    const { container } = render(<ContentArea padding="none">Content</ContentArea>);
    const main = container.querySelector('main');
    expect(main).not.toHaveClass('p-4');
  });

  it('applies small padding when specified', () => {
    const { container } = render(<ContentArea padding="sm">Content</ContentArea>);
    const main = container.querySelector('main');
    expect(main).toHaveClass('p-4', 'sm:p-6');
  });

  it('applies large padding when specified', () => {
    const { container } = render(<ContentArea padding="lg">Content</ContentArea>);
    const main = container.querySelector('main');
    expect(main).toHaveClass('p-6', 'sm:p-8', 'md:p-12', 'lg:p-16');
  });

  it('applies scrollable class when scrollable is true', () => {
    const { container } = render(<ContentArea scrollable>Content</ContentArea>);
    const main = container.querySelector('main');
    expect(main).toHaveClass('overflow-y-auto');
  });

  it('does not apply scrollable class when scrollable is false', () => {
    const { container } = render(<ContentArea scrollable={false}>Content</ContentArea>);
    const main = container.querySelector('main');
    expect(main).not.toHaveClass('overflow-y-auto');
  });

  it('applies custom className', () => {
    const { container } = render(<ContentArea className="custom-class">Content</ContentArea>);
    const main = container.querySelector('main');
    expect(main).toHaveClass('custom-class');
  });

  it('has proper ARIA role', () => {
    render(<ContentArea>Content</ContentArea>);
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('is responsive with mobile-first padding', () => {
    const { container } = render(<ContentArea>Content</ContentArea>);
    const main = container.querySelector('main');
    expect(main).toHaveClass('p-4', 'sm:p-6', 'md:p-8', 'lg:p-12');
  });

  it('has main-content id for skip link', () => {
    render(<ContentArea>Content</ContentArea>);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
  });
});
