import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type Unsubscribe,
  type User,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

export const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({ prompt: "select_account consent" });

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export function initYouTubeAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthUnavailable?: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, (user) => {
    if (user && cachedAccessToken) {
      onAuthSuccess?.(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      onAuthUnavailable?.(user);
    }
  });
}

export async function signInWithYouTube(): Promise<{
  user: User;
  accessToken: string;
}> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        "Geen toegangstoken ontvangen van Google. Controleer of pop-ups zijn toegestaan."
      );
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export function getYouTubeAccessToken(): string | null {
  return cachedAccessToken;
}

export async function signOutYouTube(): Promise<void> {
  await auth.signOut();
  cachedAccessToken = null;
}
