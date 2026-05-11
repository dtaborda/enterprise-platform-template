"use client";

import { cn } from "@enterprise/ui/lib/utils";
import { useEffect, useState } from "react";

interface SettingsSidebarProps {
  role: string;
}

const NAV_ITEMS = [
  { id: "profile", label: "Profile" },
  { id: "logo", label: "Logo" },
  { id: "regional", label: "Regional" },
] as const;

const OWNER_ONLY_ITEMS = [{ id: "security", label: "Security" }] as const;

export function SettingsSidebar({ role }: SettingsSidebarProps) {
  const [activeHash, setActiveHash] = useState<string>("");

  useEffect(() => {
    const handleHashChange = () => {
      setActiveHash(window.location.hash.slice(1));
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const allItems = role === "owner" ? [...NAV_ITEMS, ...OWNER_ONLY_ITEMS] : [...NAV_ITEMS];

  return (
    <nav className="flex w-48 shrink-0 flex-col gap-1" aria-label="Settings navigation">
      {allItems.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={() => setActiveHash(id)}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
            activeHash === id ? "bg-muted text-foreground" : "text-muted-foreground",
          )}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
