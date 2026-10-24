import { describe, expect, it } from 'vitest';

import { messageForFailedSubmission, messageForInvalidField } from '../../src/lib/form-feedback';

describe('messageForInvalidField', () => {
  it('names the field the visitor needs to fix', () => {
    expect(messageForInvalidField('name')).toBe('Please enter your name.');
    expect(messageForInvalidField('email')).toBe('Please enter a valid email address.');
    expect(messageForInvalidField('phone')).toBe('Please enter your phone number.');
  });

  it('falls back to a general prompt for anything else', () => {
    expect(messageForInvalidField(undefined)).toBe('Please check the form and try again.');
  });
});

describe('messageForFailedSubmission', () => {
  it('points at the email address when the server rejected it', () => {
    const body = {
      error: 'Please check the form and try again.',
      details: ['email is not a valid address'],
    };
    expect(messageForFailedSubmission(400, body)).toBe('Please enter a valid email address.');
  });

  it('asks for a re-check on any other validation failure', () => {
    const body = { error: 'Please check the form and try again.', details: ['name is required'] };
    expect(messageForFailedSubmission(400, body)).toBe('Please check the form and try again.');
  });

  it('offers a retry when verification failed', () => {
    expect(messageForFailedSubmission(403, null)).toContain('Please try again');
    expect(messageForFailedSubmission(403, null)).toContain('(612) 822-5747');
  });

  it('explains the rate limit rather than inviting an immediate retry', () => {
    expect(messageForFailedSubmission(429, null)).toContain('try again later');
    expect(messageForFailedSubmission(429, null)).toContain('(612) 822-5747');
  });

  it('gives the phone number when the message could not be sent at all', () => {
    for (const status of [500, 502, 503, undefined]) {
      expect(messageForFailedSubmission(status, null)).toBe(
        'Sorry, we could not send your message. Please call us at (612) 822-5747.',
      );
    }
  });
});
