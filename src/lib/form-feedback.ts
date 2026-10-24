// What the contact form tells a visitor when a submission doesn't go through. Kept separate from
// the form's browser script so the wording can be unit-tested.
//
// Every dead end offers the phone number: the form exists to produce a conversation, and a
// visitor who gives up on it should still have a way to reach the office.

const PHONE = '(612) 822-5747';

const GENERIC_INVALID = 'Please check the form and try again.';

const INVALID_FIELD_MESSAGES: Readonly<Record<string, string>> = {
  name: 'Please enter your name.',
  email: 'Please enter a valid email address.',
  phone: 'Please enter your phone number.',
};

/** Message for a field the browser's own validation rejected, before anything was sent. */
export function messageForInvalidField(fieldName: string | undefined): string {
  return (fieldName && INVALID_FIELD_MESSAGES[fieldName]) || GENERIC_INVALID;
}

function rejectedFields(body: unknown): string[] {
  if (typeof body !== 'object' || body === null || !('details' in body)) return [];
  const { details } = body as { details: unknown };
  return Array.isArray(details) ? details.filter((d): d is string => typeof d === 'string') : [];
}

/**
 * Message for a submission the server (or the network) refused. `status` is undefined when the
 * request never got a response.
 */
export function messageForFailedSubmission(status: number | undefined, body: unknown): string {
  if (status === 400) {
    const emailRejected = rejectedFields(body).some((detail) => detail.startsWith('email'));
    return emailRejected ? INVALID_FIELD_MESSAGES.email ?? GENERIC_INVALID : GENERIC_INVALID;
  }
  if (status === 403) {
    return `We couldn't verify your submission. Please try again, or call us at ${PHONE}.`;
  }
  if (status === 429) {
    return (
      "You've sent several messages in a short time. " +
      `Please try again later, or call us at ${PHONE}.`
    );
  }
  return `Sorry, we could not send your message. Please call us at ${PHONE}.`;
}
