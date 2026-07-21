export interface ContactSubmission {
  name: string;
  email: string;
  phone: string;
  message: string;
  subject: string;
}

export type ValidationResult =
  | { ok: true; value: ContactSubmission }
  | { ok: false; errors: string[] };

export const FIELD_LIMITS: Readonly<Record<keyof ContactSubmission, number>> = Object.freeze({
  name: 100,
  email: 254,
  phone: 40,
  message: 5000,
  subject: 100,
});

const OPTIONAL_FIELDS: ReadonlySet<keyof ContactSubmission> = new Set(['message']);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * True if the value contains CR or LF, which could break out of an email
 * header and inject additional headers (e.g. Bcc).
 */
export function hasHeaderInjection(value: string): boolean {
  return /[\r\n]/.test(value);
}

export function validateSubmission(raw: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const clean: Partial<ContactSubmission> = {};

  for (const field of Object.keys(FIELD_LIMITS) as (keyof ContactSubmission)[]) {
    const value = raw[field];

    if (typeof value !== 'string') {
      errors.push(`${field} is required`);
      continue;
    }

    if (hasHeaderInjection(value)) {
      errors.push(`${field} contains invalid characters`);
      continue;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0 && !OPTIONAL_FIELDS.has(field)) {
      errors.push(`${field} is required`);
      continue;
    }

    if (trimmed.length > FIELD_LIMITS[field]) {
      errors.push(`${field} exceeds ${FIELD_LIMITS[field]} characters`);
      continue;
    }

    clean[field] = trimmed;
  }

  if (clean.email !== undefined && !EMAIL_PATTERN.test(clean.email)) {
    errors.push('email is not a valid address');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Every key of ContactSubmission is populated once errors is empty.
  return { ok: true, value: clean as ContactSubmission };
}
