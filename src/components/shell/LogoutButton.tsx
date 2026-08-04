"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ variant = "icon" }: { variant?: "icon" | "side" }) {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  if (variant === "side") {
    return (
      <button className="side-link" onClick={logout}>
        <span className="ic">
          <LogOut size={18} strokeWidth={2} />
        </span>
        Salir
      </button>
    );
  }
  return (
    <button className="icon-btn" onClick={logout} aria-label="Salir">
      <LogOut size={16} />
    </button>
  );
}
