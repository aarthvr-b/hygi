import Link from "next/link";
import { redirect } from "next/navigation";
import { hasServiceCatalog } from "@/lib/onboarding/service-catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppNav } from "./app-nav";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!(await hasServiceCatalog(supabase))) {
    redirect("/onboarding");
  }

  return (
    <>
      <AppNav />
      <main className="flex flex-col gap-4 p-8">
        <p>Signed in as {data.user?.email}</p>
        <ul className="list-disc pl-6">
          <li>
            <Link href="/calendar">Calendar</Link>
          </li>
          <li>
            <Link href="/studios">Studios, prices and Shift Templates</Link>
          </li>
          <li>
            <Link href="/services">Services</Link>
          </li>
        </ul>
      </main>
    </>
  );
}
