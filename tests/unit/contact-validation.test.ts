import { describe, expect, it } from 'vitest';

import { hasHeaderInjection, validateSubmission } from '../../src/lib/contact-validation';

const valid = {
  name: 'Amina Yusuf',
  email: 'amina@example.com',
  phone: '612-555-0142',
  message: 'I would like to ask about the green card process.',
  subject: 'Contact',
};

describe('hasHeaderInjection', () => {
  it('accepts a clean string', () => {
    expect(hasHeaderInjection('Amina Yusuf')).toBe(false);
  });

  it('rejects a carriage return', () => {
    expect(hasHeaderInjection('Amina\rBcc: victim@example.com')).toBe(true);
  });

  it('rejects a line feed', () => {
    expect(hasHeaderInjection('Amina\nBcc: victim@example.com')).toBe(true);
  });

  it('rejects an encoded CRLF sequence', () => {
    expect(hasHeaderInjection('Amina\r\nBcc: victim@example.com')).toBe(true);
  });
});

describe('validateSubmission', () => {
  it('accepts a valid submission', () => {
    const result = validateSubmission(valid);
    expect(result.ok).toBe(true);
  });

  it('trims surrounding whitespace on accept', () => {
    const result = validateSubmission({ ...valid, name: '  Amina Yusuf  ' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe('Amina Yusuf');
  });

  it('rejects a header injection attempt in name', () => {
    const result = validateSubmission({ ...valid, name: 'Amina\r\nBcc: victim@example.com' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('name');
  });

  it('rejects a header injection attempt in subject', () => {
    const result = validateSubmission({ ...valid, subject: 'Contact\r\nBcc: victim@example.com' });
    expect(result.ok).toBe(false);
  });

  it('rejects a header injection attempt in email', () => {
    const result = validateSubmission({ ...valid, email: 'a@b.com\r\nBcc: victim@example.com' });
    expect(result.ok).toBe(false);
  });

  it('rejects a missing name', () => {
    const result = validateSubmission({ ...valid, name: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects a whitespace-only name', () => {
    const result = validateSubmission({ ...valid, name: '   ' });
    expect(result.ok).toBe(false);
  });

  it('rejects a malformed email', () => {
    const result = validateSubmission({ ...valid, email: 'not-an-email' });
    expect(result.ok).toBe(false);
  });

  it('rejects an over-long message', () => {
    const result = validateSubmission({ ...valid, message: 'x'.repeat(5001) });
    expect(result.ok).toBe(false);
  });

  it('rejects an over-long name', () => {
    const result = validateSubmission({ ...valid, name: 'x'.repeat(101) });
    expect(result.ok).toBe(false);
  });

  it('rejects a non-string field', () => {
    const result = validateSubmission({ ...valid, name: 42 });
    expect(result.ok).toBe(false);
  });

  it('rejects a missing field entirely', () => {
    const { name, ...withoutName } = valid;
    const result = validateSubmission(withoutName);
    expect(result.ok).toBe(false);
  });

  it('allows an empty message (matches live form: message is optional)', () => {
    const result = validateSubmission({ ...valid, message: '' });
    expect(result.ok).toBe(true);
  });

  it('reports every failing field at once, not just the first', () => {
    const result = validateSubmission({ ...valid, name: '', email: 'bad' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(1);
  });

  it('ignores unexpected extra fields rather than passing them through', () => {
    const result = validateSubmission({ ...valid, to: 'attacker@example.com' });
    expect(result.ok).toBe(true);
    if (result.ok) expect('to' in result.value).toBe(false);
  });
});
