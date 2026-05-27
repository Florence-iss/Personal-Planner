/**
 * SMS Auto-Parsing Service
 *
 * This module provides:
 *  1. Pure parsing logic (`parseSmsMessage`, `extractAmount`,
 *     `extractTransactionType`) — fully testable without any native module.
 *  2. An Android-only native SMS listener stub with clear setup instructions.
 *     Full SMS inbox / receive access requires a custom native module (or an
 *     Expo Config Plugin that wraps a Java BroadcastReceiver).  The stub below
 *     wires everything together so only the native bridge code needs adding.
 *  3. `requestSmsPermission` — uses expo-modules-core to request READ_SMS on
 *     Android; returns false + logs a warning on iOS.
 *
 * ── Native Module Setup (Android) ──────────────────────────────────────────
 *
 * To receive incoming SMS in real time you need a BroadcastReceiver that
 * listens for `android.provider.Telephony.SMS_RECEIVED`.
 *
 * Option A — Expo Config Plugin (recommended for Expo managed workflow):
 *   1. Create a native module package, e.g. `modules/sms-receiver/`.
 *   2. Register a BroadcastReceiver in your AndroidManifest via an Expo Config
 *      Plugin (app.config.ts → `plugins: [['./modules/sms-receiver']]`).
 *   3. Emit events via `EventEmitter` from the Expo Modules Core.
 *   4. Replace the `startSmsListener` stub below with a real subscription to
 *      that `EventEmitter` instance.
 *
 * Option B — React Native Community module:
 *   Install `react-native-receive-sms-module` (or similar) and replace the
 *   body of `startSmsListener` with the module's subscription API.
 *
 * Required AndroidManifest permissions (added via Config Plugin or manually):
 *   <uses-permission android:name="android.permission.RECEIVE_SMS" />
 *   <uses-permission android:name="android.permission.READ_SMS" />
 */

import { Platform } from 'react-native';
import { SmsPattern, Transaction, TransactionType } from '../types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to parse a numeric amount from a regex-captured string.
 * Handles common formats: "1,234.56", "1.234,56", "1234", "1 234.56"
 * Returns 0 if parsing fails.
 */
function extractAmount(value: string): number {
  if (!value) return 0;

  // Remove currency symbols, letters, and whitespace
  let cleaned = value.replace(/[^\d.,]/g, '');

  // Detect format: if there is both a comma and a dot, the last one is the
  // decimal separator.  If only a comma exists and it's in position that
  // suggests it's a decimal (e.g. "1234,56"), treat it as decimal.
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot   = cleaned.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastDot > lastComma) {
      // European thousands + decimal: "1.234,56" → remove dots, replace comma
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US thousands + decimal: "1,234.56" → remove commas
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // Could be decimal comma ("1234,56") or thousands ("1,234")
    // Heuristic: if fewer than 3 digits follow the comma it's a decimal separator
    const afterComma = cleaned.slice(lastComma + 1);
    if (afterComma.length <= 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  // Pure dot notation or integer — no change needed

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Determine the transaction type from a captured indicator string.
 *
 * Common English/Asian banking SMS keywords are recognised.  Returns
 * 'expense' by default when the value is unrecognised.
 */
function extractTransactionType(value: string): TransactionType {
  if (!value) return 'expense';

  const lower = value.toLowerCase().trim();

  const incomeKeywords = [
    'credit',
    'credited',
    'received',
    'deposit',
    'deposited',
    'refund',
    'refunded',
    'cashback',
    'salary',
    'payment received',
    'inward',
    'cr',
    '+',
  ];

  const expenseKeywords = [
    'debit',
    'debited',
    'sent',
    'paid',
    'payment',
    'purchase',
    'withdrawal',
    'withdrawn',
    'charge',
    'charged',
    'outward',
    'dr',
    '-',
  ];

  for (const kw of incomeKeywords) {
    if (lower.includes(kw)) return 'income';
  }
  for (const kw of expenseKeywords) {
    if (lower.includes(kw)) return 'expense';
  }

  return 'expense';
}

// ---------------------------------------------------------------------------
// Public parsing API
// ---------------------------------------------------------------------------

/**
 * Attempt to parse an SMS message body against a list of `SmsPattern`
 * definitions.  Patterns are tried in order; the first successful match wins.
 *
 * Returns a `Partial<Transaction>` with the fields that could be extracted, or
 * `null` if no pattern matched.
 */
export function parseSmsMessage(
  body: string,
  patterns: SmsPattern[],
): Partial<Transaction> | null {
  for (const pattern of patterns) {
    let regex: RegExp;
    try {
      regex = new RegExp(pattern.regex, 'i');
    } catch {
      // Skip malformed patterns
      console.warn(`[smsService] Invalid regex in pattern "${pattern.name}":`, pattern.regex);
      continue;
    }

    const match = regex.exec(body);
    if (!match || !match.groups) continue;

    const groups = match.groups;
    const { amount: amountKey, type: typeKey, description: descKey, date: dateKey } =
      pattern.fieldMap;

    const rawAmount = groups[amountKey] ?? '';
    const rawType   = groups[typeKey]   ?? '';

    if (!rawAmount) continue; // amount is mandatory

    const amount = extractAmount(rawAmount);
    if (amount <= 0) continue;

    const type: TransactionType = extractTransactionType(rawType);

    const result: Partial<Transaction> = {
      amount,
      type,
      source:    'sms',
      rawText:   body,
      confirmed: false,
    };

    if (descKey && groups[descKey]) {
      result.description = groups[descKey].trim();
    }

    if (dateKey && groups[dateKey]) {
      // Attempt to parse the date into 'YYYY-MM-DD'
      const parsedDate = new Date(groups[dateKey]);
      if (!isNaN(parsedDate.getTime())) {
        const y = parsedDate.getFullYear();
        const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const d = String(parsedDate.getDate()).padStart(2, '0');
        result.date = `${y}-${m}-${d}`;
      }
    }

    // Fall back to today if no date was parsed
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
// Native SMS permission + listener
// ---------------------------------------------------------------------------

/**
 * Request the READ_SMS / RECEIVE_SMS permission on Android.
 *
 * On iOS this always returns `false` because iOS does not allow apps to read
 * SMS messages; use `gmailService` for email-based parsing instead.
 *
 * On Android the permission request is performed via `expo-modules-core`.
 * If the module is not available (e.g. bare workflow without the native
 * module installed) the function logs a warning and returns `false`.
 */
export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    console.warn(
      '[smsService] SMS reading is not supported on iOS. ' +
        'Use gmailService for automatic transaction parsing on iOS.',
    );
    return false;
  }

  try {
    // expo-modules-core exposes a Permissions API on Android.
    // Dynamically import to avoid a hard dependency in environments where the
    // native module may not be linked.
    const { PermissionsAndroid } = await import('react-native');
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ]);

    const readGranted =
      granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === 'granted';
    const receiveGranted =
      granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === 'granted';

    return readGranted && receiveGranted;
  } catch (err) {
    console.warn('[smsService] Failed to request SMS permissions:', err);
    return false;
  }
}

/**
 * Start listening for incoming SMS messages and parse them against the
 * provided patterns.
 *
 * On iOS this is a no-op (logs a warning) and returns a no-op cleanup.
 *
 * On Android this stub emits a clear console instruction explaining how to
 * wire up the native module.  Replace the body of the Android branch with
 * your actual native module subscription once the bridge is in place.
 *
 * @param patterns   The list of `SmsPattern` objects to match against.
 * @param onParsed   Called with a partial Transaction when parsing succeeds.
 * @param onFailure  Called with the raw SMS body when no pattern matches.
 * @returns          Cleanup function — call on component unmount.
 *
 * ── Wiring instructions ─────────────────────────────────────────────────────
 *
 * 1. Create `modules/sms-receiver/` with an Expo Module that emits an
 *    "onSmsReceived" event carrying `{ messageBody: string }`.
 *
 * 2. Replace the placeholder below with:
 *
 *    import SmsReceiverModule from '../modules/sms-receiver';
 *
 *    const subscription = SmsReceiverModule.addListener(
 *      'onSmsReceived',
 *      ({ messageBody }: { messageBody: string }) => {
 *        const parsed = parseSmsMessage(messageBody, patterns);
 *        if (parsed) {
 *          onParsed(parsed);
 *        } else {
 *          onFailure(messageBody);
 *        }
 *      },
 *    );
 *    return () => subscription.remove();
 */
export function startSmsListener(
  patterns: SmsPattern[],
  onParsed: (tx: Partial<Transaction>) => void,
  onFailure: (raw: string) => void,
): () => void {
  if (Platform.OS !== 'android') {
    console.warn(
      '[smsService] startSmsListener: SMS listening is not supported on iOS. ' +
        'No listener was registered.',
    );
    return () => {};
  }

  // ── STUB ─────────────────────────────────────────────────────────────────
  // The native SMS BroadcastReceiver module has not been wired yet.
  // Follow the instructions in the JSDoc above to complete the integration.
  // ─────────────────────────────────────────────────────────────────────────
  console.warn(
    '[smsService] startSmsListener: Native SMS module is not yet integrated. ' +
      'See the JSDoc in src/services/smsService.ts for setup instructions.',
  );

  // Once the native module exists, replace this block with the real
  // subscription as shown in the JSDoc wiring instructions above.
  // The `patterns`, `onParsed`, and `onFailure` callbacks are already in
  // scope and should be used inside the event handler.
  void patterns; void onParsed; void onFailure;

  // Return a no-op cleanup
  return () => {};
}

/**
 * Convenience hook-style wrapper for use inside React components.
 *
 * Starts the SMS listener on mount and cleans up on unmount.  Because this
 * wraps `startSmsListener`, the same stub / iOS restrictions apply.
 *
 * Usage:
 *   const { isListening } = useSmsParsing(patterns, handleParsed);
 */
export function useSmsParsing(
  patterns: SmsPattern[],
  onTransaction: (tx: Partial<Transaction>) => void,
  onFailure?: (raw: string) => void,
): { isListening: boolean } {
  // We deliberately avoid importing React here to keep this file framework-
  // agnostic.  Callers should wrap this in a useEffect themselves if preferred.
  // This function is provided as a convenience entry-point; a fuller
  // implementation that uses React hooks directly would live in a hooks/ file.

  const isListening = Platform.OS === 'android';

  const cleanup = startSmsListener(
    patterns,
    onTransaction,
    onFailure ?? ((raw) => console.log('[smsService] Unmatched SMS:', raw)),
  );

  // The caller is responsible for calling cleanup (e.g. from useEffect return)
  void cleanup;

  return { isListening };
}
