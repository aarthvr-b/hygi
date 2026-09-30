import Link from "next/link";
import { SignOutButton } from "./sign-out-button";

export function AppNav() {
  return (
    <nav className="flex items-center gap-4 border-b p-4">
      <Link href="/" className="font-semibold">
        Hygi
      </Link>
      <Link href="/studios">Studios</Link>
      <Link href="/services">Services</Link>
      <span className="flex-1" />
      <SignOutButton />
    </nav>
  );
}
