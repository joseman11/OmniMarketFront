"use server";

import { redirect } from "next/navigation";

function safeCallback(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function signInWithGoogle(formData: FormData) {
  const target = encodeURIComponent(safeCallback(formData.get("callbackUrl")));
  redirect(`/api/auth/google?returnTo=${target}`);
}

export async function signInWithGitHub(formData: FormData) {
  const target = encodeURIComponent(safeCallback(formData.get("callbackUrl")));
  redirect(`/api/auth/github?returnTo=${target}`);
}
