"use server";

import { redirect } from "next/navigation";
import { safeCallbackPath } from "@/lib/safe-redirect";

export async function signInWithGoogle(formData: FormData) {
  const target = encodeURIComponent(safeCallbackPath(formData.get("callbackUrl")));
  redirect(`/api/auth/google?returnTo=${target}`);
}

export async function signInWithGitHub(formData: FormData) {
  const target = encodeURIComponent(safeCallbackPath(formData.get("callbackUrl")));
  redirect(`/api/auth/github?returnTo=${target}`);
}
