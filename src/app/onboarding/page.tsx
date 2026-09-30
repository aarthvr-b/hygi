import { redirect } from "next/navigation";
import { hasServiceCatalog, SUGGESTED_SERVICES } from "@/lib/onboarding/service-catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CatalogForm } from "./catalog-form";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  if (await hasServiceCatalog(supabase)) {
    redirect("/");
  }

  return (
    <main className="flex flex-col gap-4 p-8 max-w-lg">
      <h1 className="text-2xl font-semibold">Welcome to Hygi</h1>
      <p>
        These are the Services most hygienists offer. Rename, remove or add any before saving — you
        can change them later too.
      </p>
      <CatalogForm suggested={SUGGESTED_SERVICES} />
    </main>
  );
}
