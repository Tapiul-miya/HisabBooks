import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.appdata');
provider.setCustomParameters({
  prompt: 'select_account'
});

let isSigningIn = false;
let activeSignInPromise: Promise<{ user: User; accessToken: string } | null> | null = null;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check redirect result on app load (critical for Capacitor & redirect flows)
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          localStorage.setItem('google_drive_access_token', cachedAccessToken);
          if (onAuthSuccess) onAuthSuccess(result.user, cachedAccessToken);
        }
      }
    })
    .catch((err) => {
      console.warn('Redirect result check error:', err);
    });

  // Pre-load from localStorage
  const storedToken = localStorage.getItem('google_drive_access_token');
  if (storedToken) {
    cachedAccessToken = storedToken;
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = cachedAccessToken || localStorage.getItem('google_drive_access_token');
      if (token) {
        cachedAccessToken = token;
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        try {
          const idToken = await user.getIdToken();
          if (idToken) {
            // User is signed in with Firebase
            if (onAuthSuccess) onAuthSuccess(user, idToken);
          }
        } catch {
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('google_drive_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (activeSignInPromise) {
    return activeSignInPromise;
  }

  activeSignInPromise = (async () => {
    try {
      isSigningIn = true;

      // For native devices, try signInWithPopup first or fallback to redirect smoothly
      if (Capacitor.isNativePlatform()) {
        try {
          const result = await signInWithPopup(auth, provider);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const token = credential?.accessToken || (await result.user.getIdToken());
          if (token) {
            cachedAccessToken = token;
            localStorage.setItem('google_drive_access_token', cachedAccessToken);
            return { user: result.user, accessToken: cachedAccessToken };
          }
        } catch (popupErr: any) {
          console.log('Native popup fallback to redirect:', popupErr?.message);
          await signInWithRedirect(auth, provider);
          return null;
        }
      }

      // For web/preview environments, try popup first
      try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken || (await result.user.getIdToken());
        if (!token) {
          throw new Error('গুগল ড্রাইভ অ্যাক্সেস টোকেন পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
        }

        cachedAccessToken = token;
        localStorage.setItem('google_drive_access_token', cachedAccessToken);
        return { user: result.user, accessToken: cachedAccessToken };
      } catch (popupErr: any) {
        // If popup was blocked or failed in iframe/browser, fallback seamlessly to redirect
        if (popupErr?.code === 'auth/popup-blocked' || popupErr?.code === 'auth/cancelled-popup-request') {
          console.log('Popup blocked or cancelled, attempting redirect sign-in...');
          await signInWithRedirect(auth, provider);
          return null;
        }
        throw popupErr;
      }
    } catch (error: unknown) {
      const authErr = error as { code?: string; message?: string };
      console.warn('Google Sign in status:', authErr?.code || authErr?.message);

      if (
        authErr?.code === 'auth/popup-closed-by-user' ||
        authErr?.code === 'auth/cancelled-popup-request'
      ) {
        return null;
      }

      throw error;
    } finally {
      isSigningIn = false;
      activeSignInPromise = null;
    }
  })();

  return activeSignInPromise;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || localStorage.getItem('google_drive_access_token');
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    localStorage.setItem('google_drive_access_token', token);
  } else {
    localStorage.removeItem('google_drive_access_token');
  }
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Sign out warning:', e);
  }
  cachedAccessToken = null;
  localStorage.removeItem('google_drive_access_token');
  activeSignInPromise = null;
  isSigningIn = false;
};
