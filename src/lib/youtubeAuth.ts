import { initializeApp, getApps, getApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  inMemoryPersistence,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type Unsubscribe,
  type User,
  type UserCredential,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

export const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
];

const GIS_SCOPES = [
  ...SCOPES,
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export interface YouTubeAuthUser {
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  uid?: string;
}

interface GisTokenResponse {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

interface GisErrorResponse {
  type?: "popup_closed" | "popup_failed_to_open" | "unknown" | string;
  message?: string;
}

interface GisTokenClient {
  requestAccessToken: (overrideConfig?: {
    prompt?: string;
    scope?: string;
  }) => void;
}

interface GoogleIdentityNamespace {
  accounts?: {
    oauth2?: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        prompt?: string;
        callback: (resp: GisTokenResponse) => void;
        error_callback?: (err: GisErrorResponse) => void;
      }) => GisTokenClient;
      revoke?: (token: string, done?: () => void) => void;
    };
  };
}

function getGoogleNamespace(): GoogleIdentityNamespace | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { google?: GoogleIdentityNamespace }).google;
}

function resolveAuthDomain(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (
      host.endsWith(".run.app") ||
      host.endsWith(".firebaseapp.com") ||
      host.endsWith(".web.app")
    ) {
      return window.location.host;
    }
  }
  return firebaseConfig.authDomain;
}

const resolvedFirebaseConfig = {
  ...firebaseConfig,
  authDomain: resolveAuthDomain(),
};

const app =
  getApps().length > 0 ? getApp() : initializeApp(resolvedFirebaseConfig);

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: [
      indexedDBLocalPersistence,
      browserLocalPersistence,
      browserSessionPersistence,
      inMemoryPersistence,
    ],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} catch {
  auth = getAuth(app);
}

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({ prompt: "select_account consent" });

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedAuthUser: YouTubeAuthUser | null = null;
let activeAuthSource: "gis" | "firebase" | null = null;
let gsiLoadPromise: Promise<void> | null = null;
let sharedRedirectPromise: Promise<UserCredential | null> | null = null;

export interface YouTubeAuthFailureInfo {
  message: string;
  code?: string;
  suggestFullTab?: boolean;
  suggestRedirect?: boolean;
}

export class YouTubeAuthError extends Error {
  code?: string;
  suggestFullTab: boolean;
  suggestRedirect: boolean;

  constructor(info: YouTubeAuthFailureInfo) {
    super(info.message);
    this.name = "YouTubeAuthError";
    this.code = info.code;
    this.suggestFullTab = Boolean(info.suggestFullTab);
    this.suggestRedirect = Boolean(info.suggestRedirect);
  }
}

export function isEmbeddedIframe(): boolean {
  try {
    return typeof window !== "undefined" && window.self !== window.top;
  } catch {
    return true;
  }
}

function toAuthUser(user: User): YouTubeAuthUser {
  return {
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    uid: user.uid,
  };
}

function loadGsiClient(): Promise<void> {
  if (getGoogleNamespace()?.accounts?.oauth2?.initTokenClient) {
    return Promise.resolve();
  }
  if (typeof document === "undefined") {
    return Promise.reject(new Error("Browseromgeving niet beschikbaar."));
  }
  if (gsiLoadPromise) {
    return gsiLoadPromise;
  }

  gsiLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://accounts.google.com/gsi/client"]'
    );

    const startTime = Date.now();
    const checkReady = () => {
      if (getGoogleNamespace()?.accounts?.oauth2?.initTokenClient) {
        resolve();
        return;
      }
      if (Date.now() - startTime > 6000) {
        gsiLoadPromise = null;
        reject(new Error("Google Identity Services laadt niet op tijd."));
        return;
      }
      window.setTimeout(checkReady, 80);
    };

    if (existing) {
      checkReady();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => checkReady();
    script.onerror = () => {
      gsiLoadPromise = null;
      reject(new Error("Kon Google Identity Services niet laden."));
    };
    document.head.appendChild(script);
  });

  return gsiLoadPromise;
}

async function fetchGoogleUserInfo(
  accessToken: string
): Promise<YouTubeAuthUser> {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    if (!res.ok) {
      return { email: null, displayName: null, photoURL: null };
    }
    const data = (await res.json()) as {
      email?: string;
      name?: string;
      picture?: string;
      sub?: string;
    };
    return {
      email: data.email || null,
      displayName: data.name || null,
      photoURL: data.picture || null,
      uid: data.sub,
    };
  } catch {
    return { email: null, displayName: null, photoURL: null };
  }
}

function extractAccessTokenFromResult(
  result: UserCredential
): string | null {
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) {
    return credential.accessToken;
  }
  const internal = result as unknown as {
    _tokenResponse?: { oauthAccessToken?: string };
  };
  if (internal?._tokenResponse?.oauthAccessToken) {
    return internal._tokenResponse.oauthAccessToken;
  }
  return null;
}

function mapFirebaseAuthError(err: unknown): YouTubeAuthError {
  if (err instanceof YouTubeAuthError) return err;

  const embedded = isEmbeddedIframe();
  const fbErr = err as { code?: string; message?: string };
  const code = fbErr?.code || "";

  if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request" ||
    code === "gis/popup_closed"
  ) {
    return new YouTubeAuthError({
      code,
      message: embedded
        ? `Het inlogvenster is gesloten zonder het YouTube-token terug te geven (${code}). Open de app eventueel in een nieuw browsertabblad en log daar direct in.`
        : `Het Google-venster gaf geen toegangstoken terug (${code}). Probeer opnieuw of klik op 'Inloggen via omleiding'.`,
      suggestFullTab: embedded,
      suggestRedirect: !embedded,
    });
  }

  if (code === "auth/popup-blocked" || code === "gis/popup_failed_to_open") {
    return new YouTubeAuthError({
      code,
      message: embedded
        ? "De browser blokkeerde het Google-pop-upvenster. Sta pop-ups toe of open de app in een volledig browsertabblad."
        : "De browser blokkeerde het Google-pop-upvenster. Sta pop-ups toe of klik op 'Inloggen via omleiding'.",
      suggestFullTab: embedded,
      suggestRedirect: !embedded,
    });
  }

  if (code === "gis/access_denied") {
    return new YouTubeAuthError({
      code,
      message:
        "Toegang geweigerd tijdens Google-autorisatie. Geef toestemming voor YouTube-lezen en uploaden om je kanaal te koppelen.",
      suggestFullTab: false,
      suggestRedirect: !embedded,
    });
  }

  if (code === "auth/unauthorized-domain") {
    return new YouTubeAuthError({
      code,
      message: `Dit domein (${typeof window !== "undefined" ? window.location.host : "huidig"}) staat nog niet in de geautoriseerde domeinen van Firebase Auth.`,
      suggestFullTab: false,
      suggestRedirect: false,
    });
  }

  if (code === "auth/internal-error" || code === "auth/network-request-failed") {
    return new YouTubeAuthError({
      code,
      message: embedded
        ? "De browser kon de beveiligde sessie niet afronden binnen dit ingebedde venster. Open de app in een nieuw tabblad om YouTube direct te koppelen."
        : "Netwerk- of sessiefout tijdens Google-inloggen. Probeer opnieuw of gebruik 'Inloggen via omleiding'.",
      suggestFullTab: embedded,
      suggestRedirect: !embedded,
    });
  }

  return new YouTubeAuthError({
    code,
    message:
      fbErr?.message || "Koppelen met Google/YouTube is onverwacht mislukt.",
    suggestFullTab: embedded,
    suggestRedirect: !embedded,
  });
}

function getSharedRedirectResult(): Promise<UserCredential | null> {
  if (!sharedRedirectPromise) {
    sharedRedirectPromise = getRedirectResult(auth, browserPopupRedirectResolver);
  }
  return sharedRedirectPromise;
}

function signInWithGisPopup(): Promise<{
  user: YouTubeAuthUser;
  accessToken: string;
}> {
  const oauth2 = getGoogleNamespace()?.accounts?.oauth2;
  const clientId = firebaseConfig.oAuthClientId?.trim();
  if (!oauth2?.initTokenClient || !clientId) {
    return Promise.reject(new Error("GIS_UNAVAILABLE"));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finishReject = (err: unknown) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    try {
      const client = oauth2.initTokenClient({
        client_id: clientId,
        scope: GIS_SCOPES.join(" "),
        prompt: "select_account consent",
        callback: async (resp) => {
          if (settled) return;
          if (resp.error || !resp.access_token) {
            settled = true;
            const errCode = resp.error ? `gis/${resp.error}` : "gis/no_token";
            reject(
              mapFirebaseAuthError({
                code: errCode,
                message: resp.error_description || resp.error,
              })
            );
            return;
          }
          settled = true;
          const token = resp.access_token;
          const profile = await fetchGoogleUserInfo(token);
          cachedAccessToken = token;
          cachedAuthUser = profile;
          activeAuthSource = "gis";
          resolve({ user: profile, accessToken: token });
        },
        error_callback: (err) => {
          const type = err?.type || "unknown";
          if (type === "popup_failed_to_open") {
            finishReject(new Error("GIS_POPUP_FAILED_TO_OPEN"));
            return;
          }
          finishReject(
            mapFirebaseAuthError({
              code: `gis/${type}`,
              message: err?.message,
            })
          );
        },
      });

      client.requestAccessToken({ prompt: "select_account consent" });
    } catch (err) {
      finishReject(err);
    }
  });
}

export function initYouTubeAuth(
  onAuthSuccess?: (user: YouTubeAuthUser, token: string) => void,
  onAuthUnavailable?: (user: YouTubeAuthUser | null) => void,
  onRedirectError?: (error: YouTubeAuthError) => void
): Unsubscribe {
  let active = true;

  // Preload Google Identity Services immediately on mount so clicks trigger
  // requestAccessToken synchronously inside the browser's user gesture.
  void loadGsiClient().catch(() => undefined);

  if (cachedAccessToken && cachedAuthUser) {
    onAuthSuccess?.(cachedAuthUser, cachedAccessToken);
  }

  getSharedRedirectResult()
    .then((redirectResult) => {
      if (!active || !redirectResult) return;
      const token = extractAccessTokenFromResult(redirectResult);
      if (token) {
        const mapped = toAuthUser(redirectResult.user);
        cachedAccessToken = token;
        cachedAuthUser = mapped;
        activeAuthSource = "firebase";
        onAuthSuccess?.(mapped, token);
      } else {
        onRedirectError?.(
          new YouTubeAuthError({
            message:
              "Google-omleiding afgerond, maar geen YouTube-toegangstoken ontvangen. Probeer opnieuw in te loggen.",
            suggestFullTab: isEmbeddedIframe(),
          })
        );
      }
    })
    .catch((err) => {
      if (!active) return;
      onRedirectError?.(mapFirebaseAuthError(err));
    });

  return onAuthStateChanged(auth, (user) => {
    if (!active) return;
    if (cachedAccessToken && cachedAuthUser) {
      if (activeAuthSource === "firebase" && user) {
        onAuthSuccess?.(toAuthUser(user), cachedAccessToken);
      }
      return;
    }
    if (!isSigningIn && activeAuthSource !== "gis") {
      cachedAccessToken = null;
      cachedAuthUser = null;
      onAuthUnavailable?.(user ? toAuthUser(user) : null);
    }
  });
}

export async function signInWithYouTube(): Promise<{
  user: YouTubeAuthUser;
  accessToken: string;
}> {
  try {
    isSigningIn = true;

    // 1. Primary path: Direct Google Identity Services OAuth2 token popup
    //    (does not rely on cross-origin Firebase /__/auth/iframe storage).
    const clientId = firebaseConfig.oAuthClientId?.trim();
    if (clientId) {
      if (!getGoogleNamespace()?.accounts?.oauth2?.initTokenClient) {
        await loadGsiClient().catch(() => undefined);
      }
      if (getGoogleNamespace()?.accounts?.oauth2?.initTokenClient) {
        try {
          return await signInWithGisPopup();
        } catch (gisErr) {
          const msg = gisErr instanceof Error ? gisErr.message : "";
          const isFallbackWorthy =
            msg === "GIS_UNAVAILABLE" ||
            msg === "GIS_POPUP_FAILED_TO_OPEN" ||
            (gisErr instanceof YouTubeAuthError &&
              gisErr.code !== "gis/popup_closed" &&
              gisErr.code !== "gis/access_denied");
          if (!isFallbackWorthy) {
            throw gisErr;
          }
        }
      }
    }

    // 2. Fallback path: Same-origin proxied Firebase Auth popup
    const result = await signInWithPopup(
      auth,
      provider,
      browserPopupRedirectResolver
    );
    const token = extractAccessTokenFromResult(result);
    if (!token) {
      throw new YouTubeAuthError({
        message:
          "Wel ingelogd bij Google, maar geen YouTube-toegangstoken ontvangen. Geef alle gevraagde YouTube-machtigingen.",
        suggestFullTab: isEmbeddedIframe(),
        suggestRedirect: !isEmbeddedIframe(),
      });
    }
    const mapped = toAuthUser(result.user);
    cachedAccessToken = token;
    cachedAuthUser = mapped;
    activeAuthSource = "firebase";
    return { user: mapped, accessToken: cachedAccessToken };
  } catch (err) {
    throw mapFirebaseAuthError(err);
  } finally {
    isSigningIn = false;
  }
}

export async function signInWithYouTubeRedirect(): Promise<void> {
  if (isEmbeddedIframe()) {
    throw new YouTubeAuthError({
      message:
        "Inloggen via omleiding werkt alleen in een eigen tabblad. Open de app eerst in een nieuw tabblad.",
      suggestFullTab: true,
    });
  }
  try {
    sharedRedirectPromise = null;
    await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
  } catch (err) {
    throw mapFirebaseAuthError(err);
  }
}

export function getYouTubeAccessToken(): string | null {
  return cachedAccessToken;
}

export async function signOutYouTube(): Promise<void> {
  const tokenToRevoke = cachedAccessToken;
  cachedAccessToken = null;
  cachedAuthUser = null;
  activeAuthSource = null;

  if (tokenToRevoke) {
    try {
      getGoogleNamespace()?.accounts?.oauth2?.revoke?.(tokenToRevoke, () => {});
    } catch {
      // ignore revoke errors on sign out
    }
  }

  await auth.signOut().catch(() => undefined);
}
