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

  it('renders a placeholder when the message is empty', () => {
    const { text } = buildEmail({ ...submission, message: '' });
    expect(text).toContain('(no message)');
  });
});
