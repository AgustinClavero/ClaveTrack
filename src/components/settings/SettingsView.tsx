"use client";

import { useState } from "react";
import type { SettingsData } from "@/lib/data/queries";
import { GoalsPanel } from "./GoalsPanel";
import { ProfilePanel } from "./ProfilePanel";
import { HabitsPanel } from "./HabitsPanel";
import { ScorePanel } from "./ScorePanel";

const TABS = [
  { k: "goals", l: "Objetivos" },
  { k: "profile", l: "Perfil" },
  { k: "habits", l: "Hábitos" },
  { k: "score", l: "Cumplimiento" },
] as const;

export function SettingsView({ data }: { data: SettingsData }) {
  const [tab, setTab] = useState<string>("goals");

  return (
    <div className="settings">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.k}
            role="tab"
            aria-selected={tab === t.k}
            className={`tab${tab === t.k ? " on" : ""}`}
            onClick={() => setTab(t.k)}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="tab-body">
        {tab === "goals" && <GoalsPanel goals={data.goals} profile={data.profile} lastWeightKg={data.lastWeightKg} />}
        {tab === "profile" && <ProfilePanel profile={data.profile} />}
        {tab === "habits" && <HabitsPanel habits={data.habits} />}
        {tab === "score" && <ScorePanel settings={data.settings} />}
      </div>
    </div>
  );
}
