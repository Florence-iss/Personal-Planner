import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  NextOrObserver,
  User as FirebaseUser,
} from 'firebase/auth';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { auth } from './firebase';
import { User } from '../types';

// Required for AuthSession to properly close the browser on iOS/Android
WebBrowser.maybeCompleteAuthSession();

// ---------------------------------------------------------------------------
// Env vars for Google OAuth — set these in your .env.local
// EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID       → from Google Cloud Console
// EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID       → from Google Cloud Console
// EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID   → from Google Cloud Console
// ---------------------------------------------------------------------------

const GOOGLE_WEB_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     ?? 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID     ?? 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';

// ---------------------------------------------------------------------------
// Helper — map Firebase user to our app User type
// ---------------------------------------------------------------------------

function mapFirebaseUser(firebaseUser: FirebaseUser): User {
  return {
    uid:         firebaseUser.uid,
    email:       firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL:    firebaseUser.photoURL,
  };
}

// ---------------------------------------------------------------------------
// Email / Password Auth
// ---------------------------------------------------------------------------

/**
 * Sign in with email and password.
 * @returns Mapped User object.
 * @throws FirebaseError on invalid credentials.
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return mapFirebaseUser(credential.user);
}

/**
 * Register a new account with email, password, and display name.
 * Updates the Firebase profile so `displayName` is immediately available.
 * @returns Mapped User object.
 * @throws FirebaseError if the email is already in use.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  return mapFirebaseUser(credential.user);
}

// ---------------------------------------------------------------------------
// Google OAuth (expo-auth-session)
// ---------------------------------------------------------------------------

/**
 * React hook — returns [request, response, promptAsync] for Google sign-in.
 *
 * Usage in a component:
 * ```tsx
 * const [request, response, promptAsync] = useGoogleAuth();
 *
 * useEffect(() => {
 *   if (response?.type === 'success') {
 *     handleGoogleResponse(response).then(user => authStore.setUser(user));
 *   }
 * }, [response]);
 *
 * <Button onPress={() => promptAsync()} disabled={!request} title="Sign in with Google" />
 * ```
 *
 * Requested scopes include Google Calendar and Gmail read access for
 * calendar sync and SMS/email transaction parsing features.
 */
export function useGoogleAuth() {
  return Google.useAuthRequest({
    webClientId:     GOOGLE_WEB_CLIENT_ID,
    iosClientId:     GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    scopes: [
      'openid',
      'profile',
      'email',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
    responseType: AuthSession.ResponseType.Token,
  });
}

/**
 * Complete the Google sign-in flow after receiving a successful response
 * from `useGoogleAuth`'s `promptAsync`.
 *
 * Call this inside the `useEffect` that watches the `response` object:
 * ```ts
 * if (response?.type === 'success') {
 *   const user = await handleGoogleResponse(response);
 * }
 * ```
 *
 * @returns Mapped User object signed in to Firebase with a Google credential.
 * @throws Error if the response does not contain an access token.
 */
export async function handleGoogleResponse(
  response: AuthSession.AuthSessionResult,
): Promise<User> {
  if (response.type !== 'success') {
    throw new Error(`Google sign-in failed: ${response.type}`);
  }

  const { access_token: accessToken } = response.params as { access_token: string };
  if (!accessToken) {
    throw new Error('Google sign-in did not return an access token.');
  }

  const googleCredential = GoogleAuthProvider.credential(null, accessToken);
  const firebaseCredential = await signInWithCredential(auth, googleCredential);
  return mapFirebaseUser(firebaseCredential.user);
}

/**
 * Convenience wrapper — use in screens that don't need the raw hook.
 * This is NOT a hook; it only works after `handleGoogleResponse` resolves.
 *
 * @deprecated Prefer the `useGoogleAuth` hook + `handleGoogleResponse` pattern
 *             directly inside your component for the best UX.
 */
export async function signInWithGoogle(): Promise<never> {
  throw new Error(
    'signInWithGoogle() cannot be called outside a React component. ' +
    'Use the useGoogleAuth() hook together with handleGoogleResponse() instead.',
  );
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

/**
 * Sign the current user out of Firebase.
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// ---------------------------------------------------------------------------
// Auth state
// ---------------------------------------------------------------------------

/**
 * Subscribe to Firebase auth state changes.
 * Returns the unsubscribe function — call it in a cleanup effect.
 *
 * ```ts
 * const unsubscribe = onAuthChange((user) => {
 *   authStore.setUser(user);
 * });
 * return () => unsubscribe();
 * ```
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  const wrappedCallback: NextOrObserver<FirebaseUser> = (firebaseUser) => {
    callback(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
  };
  return onAuthStateChanged(auth, wrappedCallback);
}

/**
 * Returns the currently signed-in user, or null if not authenticated.
 * This is synchronous — for reactive updates subscribe with `onAuthChange`.
 */
export function getCurrentUser(): User | null {
  const firebaseUser = auth.currentUser;
  return firebaseUser ? mapFirebaseUser(firebaseUser) : null;
}
