import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Initialize Native GoogleAuth safely
let isGoogleAuthInitialized = false;
export const ensureGoogleAuthInitialized = async () => {
  if (isGoogleAuthInitialized || typeof window === 'undefined') return;
  try {
    if (Capacitor.isNativePlatform() && GoogleAuth) {
      await GoogleAuth.initialize({
        clientId: '13178099429-u613g9lmhp7vjf7saut3ov1brhftdbm9.apps.googleusercontent.com',
        scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.appdata'],
        grantOfflineAccess: true
      });
      isGoogleAuthInitialized = true;
    }
  } catch (err) {
    console.warn('GoogleAuth.initialize info:', err);
  }
};

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

      // 1. For Native Android / iOS, use Capacitor GoogleAuth (Native Account Picker)
      if (Capacitor.isNativePlatform()) {
        try {
          await ensureGoogleAuthInitialized();
          const googleUser = await GoogleAuth.signIn();
          if (googleUser && googleUser.authentication) {
            const idToken = googleUser.authentication.idToken;
            const accessToken = googleUser.authentication.accessToken || idToken;

            // Link with Firebase Auth using ID token
            let firebaseUser = auth.currentUser;
            if (idToken) {
              try {
                const credential = GoogleAuthProvider.credential(idToken, accessToken);
                const userCred = await signInWithCredential(auth, credential);
                firebaseUser = userCred.user;
              } catch (credErr) {
                console.warn('Firebase credential sign in info:', credErr);
              }
            }

            if (accessToken) {
              cachedAccessToken = accessToken;
              localStorage.setItem('google_drive_access_token', cachedAccessToken);
            }

            // Create pseudo user object if Firebase was skipped or offline
            const finalUser: User = firebaseUser || ({
              uid: googleUser.id || 'google_user',
              displayName: googleUser.name || googleUser.displayName || 'Google User',
              email: googleUser.email || '',
              photoURL: googleUser.imageUrl || null,
              emailVerified: true,
              isAnonymous: false,
              metadata: {} as any,
              providerData: [],
              refreshToken: '',
              tenantId: null,
              delete: async () => {},
              getIdToken: async () => idToken || '',
              getIdTokenResult: async () => ({} as any),
              reload: async () => {},
              toJSON: () => ({})
            } as unknown as User);

            return { user: finalUser, accessToken: cachedAccessToken || accessToken || '' };
          }
          return null;
        } catch (nativeErr: any) {
          console.warn('Native GoogleAuth result:', nativeErr);
          // If user cancelled selection
          const errStr = typeof nativeErr === 'string' ? nativeErr : (nativeErr?.message || JSON.stringify(nativeErr) || '');
          if (
            errStr.toLowerCase().includes('cancel') ||
            nativeErr?.code === '13' ||
            nativeErr?.code === 13 ||
            errStr.includes('user cancelled') ||
            errStr.includes('closed')
          ) {
            return null;
          }

          // Native sign-in failed (e.g. DEVELOPER_ERROR (10) / SHA-1 fingerprint issue)
          // Directly throw native error without web fallback as requested
          let detailMessage = 'গুগল একাউন্ট নির্বাচনে সমস্যা হয়েছে।';
          if (errStr.includes('10') || errStr.toLowerCase().includes('developer_error')) {
            detailMessage = 'গুগল সাইন-ইন এরর (Code 10): গুগল ক্লাউড কনসোলে এই APK-এর SHA-1 ফিঙ্গারপ্রিন্ট বা প্যাকেজ নেম ভেরিফিকেশন মেলেনি।';
          } else if (errStr.includes('12500') || errStr.toLowerCase().includes('sign_in_failed')) {
            detailMessage = 'গুগল সাইন-ইন এরর (12500): ডিভাইসের গুগল প্লে সার্ভিসেস বা ড্রাইভ পারমিশন কনফিগারেশন চেক করুন।';
          } else if (errStr.includes('7') || errStr.toLowerCase().includes('network')) {
            detailMessage = 'নেটওয়ার্ক এরর: ডিভাইসের ইন্টারনেট কানেকশন চেক করুন।';
          } else if (errStr) {
            detailMessage = `গুগল সাইন-ইন সমস্যা: ${errStr}`;
          }

          throw new Error(detailMessage);
        }
      }

      // 2. For Web / Browser environment
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
    if (Capacitor.isNativePlatform()) {
      try {
        await GoogleAuth.signOut();
      } catch (nativeErr) {
        console.warn('Native signOut warning:', nativeErr);
      }
    }
    await signOut(auth);
  } catch (e) {
    console.warn('Sign out warning:', e);
  }
  cachedAccessToken = null;
  localStorage.removeItem('google_drive_access_token');
  activeSignInPromise = null;
  isSigningIn = false;
};
