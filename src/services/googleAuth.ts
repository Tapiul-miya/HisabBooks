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

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check for any pending redirect result when app opens on mobile device
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          if (onAuthSuccess) onAuthSuccess(result.user, cachedAccessToken);
        }
      }
    })
    .catch((err) => {
      console.warn('Redirect auth check warning:', err);
    });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    let result;
    try {
      result = await signInWithPopup(auth, provider);
    } catch (popupErr: unknown) {
      const pErr = popupErr as { code?: string; message?: string };
      // On native platform or if popup is blocked/unsupported, fall back to redirect
      if (
        Capacitor.isNativePlatform() ||
        pErr?.code === 'auth/popup-blocked' ||
        pErr?.code === 'auth/operation-not-supported-in-this-environment'
      ) {
        console.warn('Popup not supported/blocked, falling back to signInWithRedirect...');
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw popupErr;
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('গুগল ড্রাইভ অ্যাক্সেস টোকেন পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    const authErr = error as { code?: string; message?: string };
    console.error('Google Sign in error:', authErr);

    if (authErr?.code === 'auth/popup-closed-by-user' || authErr?.code === 'auth/cancelled-popup-request') {
      throw new Error('সাইন-ইন উইন্ডো বন্ধ করা হয়েছে। আবার চেষ্টা করুন।');
    }
    if (authErr?.code === 'auth/popup-blocked') {
      throw new Error('পপআপ ব্লক করা আছে। আবার চেষ্টা করুন।');
    }

    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Sign out warning:', e);
  }
  cachedAccessToken = null;
};
