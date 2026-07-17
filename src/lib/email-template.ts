import type { ContactSubmission } from './contact-validation';

export function buildEmail(s: ContactSubmission): { subject: string; text: string } {
  const text = [
    `New enquiry from the ircoffice.com website`,
    ``,
    `Subject: ${s.subject}`,
    `Name:    ${s.name}`,
    `Email:   ${s.email}`,
    `Phone:   ${s.phone}`,
    ``,
    `Message:`,
    s.message.length > 0 ? s.message : '(no message)',
  ].join('\n');

  return { subject: `Website enquiry: ${s.subject}`, text };
}
