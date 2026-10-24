import { describe, expect, it } from 'vitest';

import { buildEmail } from '../../src/lib/email-template';

const submission = {
  name: 'Amina Yusuf',
  email: 'amina@example.com',
  phone: '612-555-0142',
  message: 'Question about green cards.',
  subject: 'Green Card',
};

describe('buildEmail', () => {
  it('puts the form subject in the email subject', () => {
    expect(buildEmail(submission).subject).toContain('Green Card');
  });

  it('includes every submitted field in the body', () => {
    const { text } = buildEmail(submission);
    expect(text).toContain('Amina Yusuf');
    expect(text).toContain('amina@example.com');
    expect(text).toContain('612-555-0142');
    expect(text).toContain('Question about green cards.');
  });

  it('fences and indents a multi-line message so it cannot pass for the details block', () => {
    // The visitor controls the message. Unfenced, a line like "Email: someone@else.example"
    // would look exactly like the real details above it.
    const message = 'Hi\r\nEmail: someone@else.example\r\nPhone: 000';
    const { text } = buildEmail({ ...submission, message });
    const lines = text.split('\n');

    expect(lines).not.toContain('Email: someone@else.example');
    expect(lines).toContain('  Email: someone@else.example');
    expect(text).not.toContain('\r');
    const start = lines.indexOf('--- Message from the visitor ---');
    const end = lines.indexOf('--- End of message ---');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
  });

  it('never puts the message in the subject line', () => {
    const { subject } = buildEmail({ ...submission, message: 'URGENT read now' });
    expect(subject).not.toContain('URGENT');
  });

  it('renders a placeholder when the message is empty', () => {
    const { text } = buildEmail({ ...submission, message: '' });
    expect(text).toContain('(no message)');
  });
});
