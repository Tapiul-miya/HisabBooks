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
        serverClientId: '13178099429-u613g9lmhp7vjf7saut3ov1brhftdbm9.apps.googleusercontent.com',
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

export const autoSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    if (auth.currentUser) {
      const token = cachedAccessToken || localStorage.getItem('google_drive_access_token') || (await auth.currentUser.getIdToken());
      return { user: auth.currentUser, accessToken: token };
    }

    if (Capacitor.isNativePlatform()) {
      await ensureGoogleAuthInitialized();
      try {
        const googleUser = await GoogleAuth.refresh().catch(() => null);
        if (googleUser && googleUser.authentication) {
          const idToken = googleUser.authentication.idToken;
          const accessToken = googleUser.authentication.accessToken || idToken;

          let firebaseUser = auth.currentUser;
          if (idToken) {
            try {
              const credential = GoogleAuthProvider.credential(idToken, accessToken);
              const userCred = await signInWithCredential(auth, credential);
              firebaseUser = userCred.user;
            } catch (e) {
              console.warn('Firebase silent cred signin info:', e);
            }
          }

          if (accessToken) {
            cachedAccessToken = accessToken;
            localStorage.setItem('google_drive_access_token', cachedAccessToken);
          }

          if (firebaseUser) {
            return { user: firebaseUser, accessToken: cachedAccessToken || accessToken || '' };
          }
        }
      } catch (e) {
        console.warn('Auto signin refresh failed:', e);
      }
    }
  } catch (err) {
    console.warn('Auto signin error:', err);
  }
  return null;
};

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

  // Attempt silent auto sign-in if native platform
  if (Capacitor.isNativePlatform()) {
    ensureGoogleAuthInitialized().then(() => {
      autoSignIn().catch(() => {});
    }).catch(() => {});
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
          // If user cancelled selection or closed native dialog
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

          // Prepare clear bug report details
          let errorTypeMsg = '';
          if (errStr.includes('10') || errStr.toLowerCase().includes('developer_error')) {
            errorTypeMsg = 'কারণ: গুগল ক্লাউড কনসোলে (GCP) এই APK-এর SHA-1 ফিঙ্গারপ্রিন্ট বা Package Name (com.hisabbook.app) যুক্ত করা হয়নি (Code 10: DEVELOPER_ERROR)।';
          } else if (errStr.includes('12500') || errStr.toLowerCase().includes('sign_in_failed')) {
            errorTypeMsg = 'কারণ: গুগল প্লে সার্ভিসেস সমস্যা বা কনফিগারেশন অমিল (Code 12500: SIGN_IN_FAILED)।';
          } else if (errStr.includes('7') || errStr.toLowerCase().includes('network')) {
            errorTypeMsg = 'কারণ: নেটওয়ার্ক সংযোগ সমস্যা (Code 7: NETWORK_ERROR)।';
          } else {
            errorTypeMsg = `কারণ: প্লে সার্ভিসেস / ওঅথ সমস্যা (${errStr || 'অজানা ত্রুটি'})।`;
          }

          const bugReportInfo = `[বাগ রিপোর্ট / ত্রুটির বিবরণ]:\n• মূল এরর: ${errStr || 'N/A'}\n• ${errorTypeMsg}`;

          // If native GoogleAuth fails (e.g. Play Services issue or missing SHA-1 key in GCP),
          // ask user via a Yes/No warning if they want to try Web Auth Popup
          console.warn('Native GoogleAuth failed:', nativeErr);
          const confirmWebFallback = window.confirm(
            `গুগল প্লে সার্ভিসেসের মাধ্যমে সাইন-ইন সম্পন্ন করা যায়নি।\n\n${bugReportInfo}\n\nআপনি কি ওয়েব ব্রাউজার পপ-আপের মাধ্যমে গুগল সাইন-ইন চেষ্টা করতে চান?`
          );

          if (confirmWebFallback) {
            try {
              const result = await signInWithPopup(auth, provider);
              const credential = GoogleAuthProvider.credentialFromResult(result);
              const token = credential?.accessToken || (await result.user.getIdToken());
              if (token) {
                cachedAccessToken = token;
                localStorage.setItem('google_drive_access_token', cachedAccessToken);
                return { user: result.user, accessToken: cachedAccessToken };
              }
            } catch (fallbackErr: any) {
              console.warn('Web Auth fallback also failed:', fallbackErr);
              const fallbackMsg = fallbackErr?.message || String(fallbackErr);
              throw new Error(`গুগল সাইন-ইন সম্পূর্ণ ব্যর্থ হয়েছে।\n${bugReportInfo}\n• Web Fallback Error: ${fallbackMsg}`);
            }
          }

          throw new Error(`গুগল সাইন-ইন ত্রুটি:\n${bugReportInfo}`);
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
        if (
          popupErr?.code === 'auth/popup-closed-by-user' ||
          popupErr?.code === 'auth/cancelled-popup-request'
        ) {
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
