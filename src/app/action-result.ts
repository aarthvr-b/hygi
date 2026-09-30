export type ActionResult = { error: string } | null;

// Turns a thrown error (usually a PostgrestError wrapped by `unwrap`) into a
// message fit for the hygienist.
export function actionError(error: unknown): ActionResult {
  const code = (error as { cause?: { code?: string } })?.cause?.code;
  if (code === "23505") {
    return { error: "That already exists." };
  }
  if (code === "23514") {
    return { error: "Please check the values you entered." };
  }
  return { error: error instanceof Error ? error.message : "Something went wrong." };
}
