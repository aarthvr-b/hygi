import { ActionForm } from "@/app/action-form";
import { AppNav } from "@/app/app-nav";
import { listServices } from "@/lib/onboarding/service-catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addServiceAction, archiveServiceAction, renameServiceAction } from "./actions";

export default async function ServicesPage() {
  const services = await listServices(await createSupabaseServerClient());

  return (
    <>
      <AppNav />
      <main className="flex flex-col gap-6 p-8 max-w-lg">
        <h1 className="text-2xl font-semibold">Services</h1>

        <ul className="flex flex-col gap-2">
          {services.map((service) => (
            <li key={service.id} className="flex gap-2 items-start">
              <ActionForm
                action={renameServiceAction.bind(null, service.id)}
                submitLabel="Rename"
                className="flex gap-2"
              >
                <input name="name" defaultValue={service.name} required aria-label="Service name" />
              </ActionForm>
              <ActionForm action={archiveServiceAction.bind(null, service.id)} submitLabel="Remove" />
            </li>
          ))}
        </ul>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Add a Service</h2>
          <ActionForm action={addServiceAction} submitLabel="Add" className="flex gap-2">
            <input name="name" required aria-label="New Service name" />
          </ActionForm>
        </section>

        <p className="text-sm">
          Removed Services disappear from your catalog and Studio price lists; their past prices
          are kept on record.
        </p>
      </main>
    </>
  );
}
