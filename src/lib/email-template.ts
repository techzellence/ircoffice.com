import type { ContactSubmission } from './contact-validation';

/**
 * The visitor's message, fenced and indented. The message is free text the visitor controls and
 * may span several lines; without the fence, a line such as "Email: someone@else.example" would
 * be indistinguishable from the real details block above it.
 */
function fencedMessage(message: string): string[] {
  if (message.length === 0) return ['(no message)'];
  const lines = message.split(/\r\n|\r|\n/).map((line) => `  ${line}`);
  return ['--- Message from the visitor ---', ...lines, '--- End of message ---'];
}

export function buildEmail(s: ContactSubmission): { subject: string; text: string } {
  const text = [
    `New enquiry from the ircoffice.com website`,
    ``,
    `Subject: ${s.subject}`,
    `Name:    ${s.name}`,
    `Email:   ${s.email}`,
    `Phone:   ${s.phone}`,
    ``,
    ...fencedMessage(s.message),
  ].join('\n');

  // Only header-safe fields (validated against CR/LF) may reach the subject line.
  return { subject: `Website enquiry: ${s.subject}`, text };
}
