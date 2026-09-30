import { notFound } from "next/navigation";
import { ActionForm } from "@/app/action-form";
import { AppNav } from "@/app/app-nav";
import { todayInRome } from "@/lib/dates";
import { formatCents } from "@/lib/onboarding/money";
import { isInForce, listPrices } from "@/lib/onboarding/price-list";
import { listServices } from "@/lib/onboarding/service-catalog";
import { getStudio } from "@/lib/onboarding/studios";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setPriceAction, updateStudioAction } from "../actions";
import { StudioFields } from "../studio-fields";

export default async function StudioPage(props: PageProps<"/studios/[id]">) {
  const { id } = await props.params;
  const supabase = await createSupabaseServerClient();
  const studio = await getStudio(supabase, id);
  if (!studio) {
    notFound();
  }

  const [services, prices] = await Promise.all([listServices(supabase), listPrices(supabase, id)]);
  const today = todayInRome();

  return (
    <>
      <AppNav />
      <main className="flex flex-col gap-8 p-8 max-w-2xl">
        <section className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">{studio.name}</h1>
          <ActionForm action={updateStudioAction.bind(null, studio.id)} submitLabel="Save">
            <StudioFields studio={studio} />
          </ActionForm>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Price List</h2>

          {services.map((service) => {
            const history = prices.filter((p) => p.serviceId === service.id);
            return (
              <div key={service.id} className="flex flex-col gap-1">
                <h3 className="font-semibold">{service.name}</h3>
                {history.length === 0 ? (
                  <p>No price set.</p>
                ) : (
                  <ul className="pl-6">
                    {history.map((entry) => {
                      const current = isInForce(entry, today);
                      return (
                        <li key={entry.id} className={current ? "font-semibold" : undefined}>
                          € {formatCents(entry.priceCents)} from {entry.validFrom}
                          {entry.validUntil ? ` to ${entry.validUntil}` : " onwards"}
                          {current && " (current)"}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}

          <ActionForm action={setPriceAction.bind(null, studio.id)} submitLabel="Set price">
            <label className="flex flex-col gap-1">
              <span>Service</span>
              <select name="serviceId" required>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span>Price (€)</span>
              <input name="price" required inputMode="decimal" placeholder="34,50" />
            </label>
            <label className="flex flex-col gap-1">
              <span>Valid from</span>
              <input name="validFrom" type="date" required defaultValue={today} />
            </label>
            <p className="text-sm">
              A new price applies from its start date until the next one. Setting a price for a date
              that already has one replaces it.
            </p>
          </ActionForm>
        </section>
      </main>
    </>
  );
}
