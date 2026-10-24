"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { safeCallbackPath } from "@/lib/safe-redirect";

type Provider = "google" | "github";

const ENV_KEYS: Record<Provider, [string, string]> = {
  google: ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"],
  github: ["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"],
};


async function start(provider: Provider, formData: FormData) {
  const [id, secret] = ENV_KEYS[provider];
  if (!process.env[id] || !process.env[secret] || !process.env.AUTH_SECRET) {
    redirect("/login?error=Configuration");
  }
  await signIn(provider, { redirectTo: safeCallbackPath(formData.get("callbackUrl")) });
}

export async function signInWithGoogle(formData: FormData) {
  await start("google", formData);
}

export async function signInWithGitHub(formData: FormData) {
  await start("github", formData);
}
