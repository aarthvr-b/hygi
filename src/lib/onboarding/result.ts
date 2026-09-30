import type { PostgrestError } from "@supabase/supabase-js";

// Supabase returns errors as values; the onboarding modules throw them so
// callers deal with a plain value or an exception.
export function unwrap<T>({ data, error }: { data: T | null; error: PostgrestError | null }): T {
  if (error) {
    throw new Error(error.message, { cause: error });
  }
  return data as T;
}
