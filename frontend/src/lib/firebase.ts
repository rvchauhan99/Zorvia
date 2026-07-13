import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, User } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app = null;
let auth: any = null;
if (typeof window !== "undefined" && config.apiKey && config.projectId) {
  app = getApps().length ? getApps()[0] : initializeApp(config);
  auth = getAuth(app);
}

export const firebaseReady = typeof window !== "undefined" && !!auth;

export async function signInWithGoogleAndGetIdToken(): Promise<{ idToken: string; user: User }> {
  if (!auth) throw new Error("Firebase not configured");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return { idToken, user: result.user };
}
