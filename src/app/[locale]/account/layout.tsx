import type { ReactNode } from "react";
import { AccountNav } from "@/components/account/account-nav";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AccountNav />
      {children}
    </>
  );
}
