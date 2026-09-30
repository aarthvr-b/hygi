import type { Studio } from "@/lib/onboarding/studios";

export function StudioFields({ studio }: { studio?: Studio }) {
  return (
    <>
      <label className="flex flex-col gap-1">
        <span>Name</span>
        <input name="name" required defaultValue={studio?.name} />
      </label>
      <label className="flex flex-col gap-1">
        <span>Address (optional)</span>
        <input name="address" defaultValue={studio?.address ?? ""} />
      </label>
    </>
  );
}
