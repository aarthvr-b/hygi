"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginActionResult = { error: string } | { info: string };

export async function signIn(
  _prevState: LoginActionResult | null,
  formData: FormData,
): Promise<LoginActionResult | null> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

export async function signUp(
  _prevState: LoginActionResult | null,
  formData: FormData,
): Promise<LoginActionResult | null> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  if (data.session === null) {
    return { info: "Check your email to confirm your account." };
  }

  redirect("/");
}
