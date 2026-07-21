/**
 * PII scrub — lossy redaction applied to free-text (user_message, reply) before
 * it's persisted to the trace DB. Governance by default; reversible tokenization
 * is out of scope.
 */

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const IBAN = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g;
// 13–19 digits with optional single separators between them (not trailing).
const CARD = /\b\d(?:[ -]?\d){12,18}\b/g;

/** Replace emails, IBANs and card-like number runs with tags. */
export const scrub = (text: string): string =>
  text.replace(EMAIL, "[email]").replace(IBAN, "[iban]").replace(CARD, "[card]");
