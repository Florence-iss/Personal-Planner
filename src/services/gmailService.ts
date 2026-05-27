/**
 * Gmail API Service — iOS (and Android) email-based transaction auto-parsing.
 *
 * Flow:
 *  1. OAuth2 tokens are stored securely via `expo-secure-store`.
 *  2. `fetchBankEmails` queries the Gmail REST API for messages matching
 *     configurable search queries (e.g. "from:noreply@bank.com").
 *  3. `parseEmailMessage` applies the same `SmsPattern` regex logic used for
 *     SMS so a single pattern set works for both channels.
 *  4. `pollGmailForTransactions` is the high-level entry point: it fetches,
 *     parses, and returns both successfully-parsed transactions and raw
 *     unparsed email bodies for manual review.
 *
 * ── Gmail OAuth2 Setup ──────────────────────────────────────────────────────
 *  1. Create OAuth2 credentials (type: iOS / Android) in Google Cloud Console.
 *  2. Add scopes: https://www.googleapis.com/auth/gmail.readonly
 *  3. Use `expo-auth-session` with Google provider to obtain tokens.
 *  4. Call `saveGmailTokens` after a successful auth session.
 *  5. Before any API call, check `getGmailTokens` and refresh if `expiresAt`
 *     has passed using your token-refresh endpoint.
 */

import * as SecureStore from 'expo-secure-store';
import { SmsPattern, Transaction, TransactionType } from '../types';

// ---------------------------------------------------------------------------
// Secure-store keys
// ---------------------------------------------------------------------------

const SECURE_STORE_KEY_ACCESS  = 'gmail_access_token';
const SECURE_STORE_KEY_REFRESH = 'gmail_refresh_token';
const SECURE_STORE_KEY_EXPIRY  = 'gmail_expires_at';

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

/**
 * Persist Gmail OAuth2 tokens to the device's secure keychain.
 *
 * @param accessToken  Short-lived Google access token.
 * @param refreshToken Long-lived refresh token (store securely; never log).
 * @param expiresAt    Unix timestamp (ms) when the access token expires.
 */
export async function saveGmailTokens(
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(SECURE_STORE_KEY_ACCESS,  accessToken),
    SecureStore.setItemAsync(SECURE_STORE_KEY_REFRESH, refreshToken),
    SecureStore.setItemAsync(SECURE_STORE_KEY_EXPIRY,  String(expiresAt)),
  ]);
}

/**
 * Retrieve stored Gmail OAuth2 tokens.
 *
 * Returns `null` if no tokens have been saved (user has not connected Gmail).
 */
export async function getGmailTokens(): Promise<{
  accessToken:  string;
  refreshToken: string;
  expiresAt:    number;
} | null> {
  const [accessToken, refreshToken, expiresAtStr] = await Promise.all([
    SecureStore.getItemAsync(SECURE_STORE_KEY_ACCESS),
    SecureStore.getItemAsync(SECURE_STORE_KEY_REFRESH),
    SecureStore.getItemAsync(SECURE_STORE_KEY_EXPIRY),
  ]);

  if (!accessToken || !refreshToken || !expiresAtStr) return null;

  return {
    accessToken,
    refreshToken,
    expiresAt: Number(expiresAtStr),
  };
}

/**
 * Delete all stored Gmail tokens (e.g. on sign-out or when the user
 * disconnects Gmail integration).
 */
export async function clearGmailTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_STORE_KEY_ACCESS),
    SecureStore.deleteItemAsync(SECURE_STORE_KEY_REFRESH),
    SecureStore.deleteItemAsync(SECURE_STORE_KEY_EXPIRY),
  ]);
}

// ---------------------------------------------------------------------------
// Gmail REST API helpers
// ---------------------------------------------------------------------------

const GMAIL_BASE = 'https://www.googleapis.com/gmail/v1/users/me';

/** Decoded email message fields we care about. */
export interface EmailMessage {
  id:      string;
  subject: string;
  body:    string;
  date:    Date;
}

/**
 * Build a Gmail search query string.
 *
 * @param queries  One or more query fragments (e.g. 'from:bank@example.com').
 * @param since    If provided, restrict results to emails after this date.
 */
function buildGmailQuery(queries: string[], since?: Date): string {
  const parts = [...queries];
  if (since) {
    // Gmail `after:` operator accepts Unix timestamp or YYYY/MM/DD
    const y = since.getFullYear();
    const m = String(since.getMonth() + 1).padStart(2, '0');
    const d = String(since.getDate()).padStart(2, '0');
    parts.push(`after:${y}/${m}/${d}`);
  }
  return parts.join(' ');
}

/**
 * Decode a base64url-encoded Gmail message part body.
 */
function decodeBase64Url(encoded: string): string {
  // Replace URL-safe chars and pad
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
  } catch {
    // atob may fail on malformed data; return raw
    return base64;
  }
}

/**
 * Recursively walk a Gmail message part tree and return the plain-text body.
 * Falls back to HTML body (stripped of tags) if no text/plain part is found.
 */
function extractBodyFromParts(
  parts: GmailMessagePart[],
  preferMimeType = 'text/plain',
): string {
  for (const part of parts) {
    if (part.mimeType === preferMimeType && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
    if (part.parts && part.parts.length > 0) {
      const nested = extractBodyFromParts(part.parts, preferMimeType);
      if (nested) return nested;
    }
  }

  // Fall back to HTML, strip tags
  for (const part of parts) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      const html = decodeBase64Url(part.body.data);
      return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    if (part.parts && part.parts.length > 0) {
      const nested = extractBodyFromParts(part.parts, 'text/html');
      if (nested) return nested;
    }
  }

  return '';
}

// Minimal typing for the Gmail API response shapes we use
interface GmailMessageBody {
  data?: string;
}

interface GmailMessagePart {
  mimeType?: string;
  body?:     GmailMessageBody;
  parts?:    GmailMessagePart[];
}

interface GmailMessagePayload {
  headers?: Array<{ name: string; value: string }>;
  body?:    GmailMessageBody;
  parts?:   GmailMessagePart[];
  mimeType?: string;
}

interface GmailMessage {
  id:       string;
  payload?: GmailMessagePayload;
}

interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
}

/**
 * Fetch a single Gmail message by ID and decode its subject, body, and date.
 */
async function fetchMessageById(
  messageId: string,
  accessToken: string,
): Promise<EmailMessage | null> {
  const url = `${GMAIL_BASE}/messages/${messageId}?format=full`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.warn(`[gmailService] Failed to fetch message ${messageId}: ${response.status}`);
    return null;
  }

  const msg: GmailMessage = await response.json();
  const payload = msg.payload;
  if (!payload) return null;

  const headers = payload.headers ?? [];
  const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value ?? '(no subject)';
  const dateHeader = headers.find((h) => h.name.toLowerCase() === 'date')?.value;
  const date = dateHeader ? new Date(dateHeader) : new Date();

  // Extract body
  let body = '';
  if (payload.parts && payload.parts.length > 0) {
    body = extractBodyFromParts(payload.parts);
  } else if (payload.body?.data) {
    body = decodeBase64Url(payload.body.data);
  }

  return { id: msg.id, subject, body, date };
}

/**
 * Fetch all email messages matching the given search queries since an optional
 * date, handling Gmail's pagination automatically.
 *
 * @param accessToken  Valid Google OAuth2 access token with gmail.readonly scope.
 * @param queries      Array of Gmail search query fragments joined with spaces.
 * @param since        Restrict results to emails after this date (optional).
 * @returns            Array of decoded email messages.
 */
export async function fetchBankEmails(
  accessToken: string,
  queries: string[],
  since?: Date,
): Promise<EmailMessage[]> {
  const q = buildGmailQuery(queries, since);
  const messageIds: string[] = [];
  let pageToken: string | undefined;

  // Paginate through the messages list
  do {
    const params = new URLSearchParams({ q, maxResults: '100' });
    if (pageToken) params.set('pageToken', pageToken);

    const listUrl = `${GMAIL_BASE}/messages?${params.toString()}`;
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      console.warn(`[gmailService] Failed to list messages: ${listRes.status}`);
      break;
    }

    const listData: GmailListResponse = await listRes.json();
    if (listData.messages) {
      for (const m of listData.messages) {
        messageIds.push(m.id);
      }
    }
    pageToken = listData.nextPageToken;
  } while (pageToken);

  // Fetch full message content in parallel (batched to avoid rate limits)
  const BATCH_SIZE = 10;
  const results: EmailMessage[] = [];

  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);
    const fetched = await Promise.all(
      batch.map((id) => fetchMessageById(id, accessToken)),
    );
    for (const msg of fetched) {
      if (msg) results.push(msg);
    }
  }

  // Sort oldest first
  results.sort((a, b) => a.date.getTime() - b.date.getTime());
  return results;
}

// ---------------------------------------------------------------------------
// Email parsing
// ---------------------------------------------------------------------------

/**
 * Attempt to parse amount from a regex-captured string.
 * Mirrors the logic in smsService for consistency.
 */
function extractAmount(value: string): number {
  if (!value) return 0;
  let cleaned = value.replace(/[^\d.,]/g, '');

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot   = cleaned.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastDot > lastComma) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const afterComma = cleaned.slice(lastComma + 1);
    if (afterComma.length <= 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Determine transaction type from a captured indicator string.
 * Mirrors the logic in smsService for consistency.
 */
function extractTransactionType(value: string): TransactionType {
  if (!value) return 'expense';
  const lower = value.toLowerCase().trim();

  const incomeKeywords = [
    'credit', 'credited', 'received', 'deposit', 'deposited',
    'refund', 'refunded', 'cashback', 'salary', 'inward', 'cr', '+',
  ];
  const expenseKeywords = [
    'debit', 'debited', 'sent', 'paid', 'payment', 'purchase',
    'withdrawal', 'withdrawn', 'charge', 'charged', 'outward', 'dr', '-',
  ];

  for (const kw of incomeKeywords) {
    if (lower.includes(kw)) return 'income';
  }
  for (const kw of expenseKeywords) {
    if (lower.includes(kw)) return 'expense';
  }
  return 'expense';
}

/**
 * Parse an email (subject + body) against a list of `SmsPattern` definitions.
 *
 * Patterns are tried against the combined `subject + '\n' + body` string so
 * that a single pattern can match either part.  Returns the first successful
 * match as a `Partial<Transaction>`, or `null` if nothing matched.
 */
export function parseEmailMessage(
  subject: string,
  body: string,
  patterns: SmsPattern[],
): Partial<Transaction> | null {
  const fullText = `${subject}\n${body}`;

  for (const pattern of patterns) {
    let regex: RegExp;
    try {
      regex = new RegExp(pattern.regex, 'is'); // case-insensitive + dotAll
    } catch {
      console.warn(`[gmailService] Invalid regex in pattern "${pattern.name}":`, pattern.regex);
      continue;
    }

    const match = regex.exec(fullText);
    if (!match || !match.groups) continue;

    const groups = match.groups;
    const { amount: amountKey, type: typeKey, description: descKey, date: dateKey } =
      pattern.fieldMap;

    const rawAmount = groups[amountKey] ?? '';
    const rawType   = groups[typeKey]   ?? '';

    if (!rawAmount) continue;

    const amount = extractAmount(rawAmount);
    if (amount <= 0) continue;

    const type: TransactionType = extractTransactionType(rawType);

    const result: Partial<Transaction> = {
      amount,
      type,
      source:    'email',
      rawText:   fullText,
      confirmed: false,
    };

    if (descKey && groups[descKey]) {
      result.description = groups[descKey].trim();
    }

    if (dateKey && groups[dateKey]) {
      const parsedDate = new Date(groups[dateKey]);
      if (!isNaN(parsedDate.getTime())) {
        const y = parsedDate.getFullYear();
        const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const d = String(parsedDate.getDate()).padStart(2, '0');
        result.date = `${y}-${m}-${d}`;
      }
    }

    if (!result.date) {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      result.date = `${y}-${m}-${d}`;
    }

    return result;
  }

  return null;
}

// ---------------------------------------------------------------------------
// High-level polling entry point
// ---------------------------------------------------------------------------

export interface GmailPollResult {
  /** Transactions that were successfully parsed from email bodies. */
  parsed:   Partial<Transaction>[];
  /** Raw concatenated text of emails that could not be parsed. */
  unparsed: string[];
}

/**
 * Fetch bank emails from Gmail and attempt to parse each one as a transaction.
 *
 * @param accessToken  Valid Google OAuth2 access token.
 * @param queries      Gmail search query fragments (see Gmail search operators).
 * @param patterns     List of `SmsPattern` objects to match against each email.
 * @param since        Only fetch emails after this date (optional).
 * @returns            Object containing arrays of parsed and unparsed results.
 *
 * Example usage:
 *   const tokens = await getGmailTokens();
 *   if (!tokens) return;
 *   const { parsed, unparsed } = await pollGmailForTransactions(
 *     tokens.accessToken,
 *     ['from:alerts@mybank.com', 'subject:transaction'],
 *     patterns,
 *     lastChecked,
 *   );
 *   for (const tx of parsed) {
 *     await createTransaction(userId, tx as Omit<Transaction, 'id'|'userId'|'createdAt'>);
 *   }
 */
export async function pollGmailForTransactions(
  accessToken: string,
  queries: string[],
  patterns: SmsPattern[],
  since?: Date,
): Promise<GmailPollResult> {
  const emails = await fetchBankEmails(accessToken, queries, since);

  const parsed:   Partial<Transaction>[] = [];
  const unparsed: string[]               = [];

  for (const email of emails) {
    const result = parseEmailMessage(email.subject, email.body, patterns);
    if (result) {
      // Attach the email date as the transaction date if parsing didn't supply one
      if (!result.date) {
        const y = email.date.getFullYear();
        const m = String(email.date.getMonth() + 1).padStart(2, '0');
        const d = String(email.date.getDate()).padStart(2, '0');
        result.date = `${y}-${m}-${d}`;
      }
      parsed.push(result);
    } else {
      unparsed.push(`Subject: ${email.subject}\n${email.body}`);
    }
  }

  return { parsed, unparsed };
}
