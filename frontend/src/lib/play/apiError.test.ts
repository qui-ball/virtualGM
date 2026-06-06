import { describe, expect, it } from 'vitest';
import { parseApiErrorMessage } from '@/lib/play/apiError';

describe('parseApiErrorMessage', () => {
  it('parses FastAPI detail from JSON body', () => {
    const err = new Error(
      'API 400: {"detail":"Character is not eligible for level up"}',
    );
    expect(parseApiErrorMessage(err)).toBe(
      'Character is not eligible for level up',
    );
  });

  it('returns plain message when not API-shaped', () => {
    expect(parseApiErrorMessage(new Error('network down'))).toBe('network down');
  });
});
