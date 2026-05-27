import { create } from 'zustand';
import { User } from '../types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface AuthState {
  /** The currently authenticated user, or null when signed out. */
  user: User | null;
  /** True while the initial Firebase auth state is being resolved. */
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface AuthActions {
  /** Store the authenticated user (called after sign-in / auth state change). */
  setUser: (user: User | null) => void;
  /** Toggle the loading indicator. */
  setLoading: (loading: boolean) => void;
  /** Clear the user — equivalent to setUser(null), provided for readability. */
  clearUser: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  // --- initial state ---
  user: null,
  loading: true, // start true so screens can show a splash until auth resolves

  // --- actions ---
  setUser: (user) => set({ user, loading: false }),

  setLoading: (loading) => set({ loading }),

  clearUser: () => set({ user: null, loading: false }),
}));

// ---------------------------------------------------------------------------
// Selectors (stable references — avoid object creation on every call)
// ---------------------------------------------------------------------------

/** Returns true when a user is signed in. */
export const selectIsAuthenticated = (state: AuthState): boolean => state.user !== null;

/** Returns the current user's uid or undefined. */
export const selectUserId = (state: AuthState): string | undefined => state.user?.uid;
