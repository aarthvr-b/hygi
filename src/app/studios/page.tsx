import Link from "next/link";
import { ActionForm } from "@/app/action-form";
import { AppNav } from "@/app/app-nav";
import { listStudios } from "@/lib/onboarding/studios";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createStudioAction } from "./actions";
import { StudioFields } from "./studio-fields";

export default async function StudiosPage() {
  const studios = await listStudios(await createSupabaseServerClient());

  return (
    <>
      <AppNav />
      <main className="flex flex-col gap-6 p-8 max-w-lg">
        <h1 className="text-2xl font-semibold">Studios</h1>

        {studios.length === 0 ? (
          <p>No Studios yet — add the first one below.</p>
        ) : (
          <ul className="list-disc pl-6">
            {studios.map((studio) => (
              <li key={studio.id}>
                <Link href={`/studios/${studio.id}`}>{studio.name}</Link>
                {studio.address && <span> — {studio.address}</span>}
              </li>
            ))}
          </ul>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Add a Studio</h2>
          <ActionForm action={createStudioAction} submitLabel="Add Studio">
            <StudioFields />
          </ActionForm>
        </section>
      </main>
    </>
  );
}
