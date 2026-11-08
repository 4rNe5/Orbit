"use client";

import { useMemo, useState } from "react";
import { DIFFICULTIES, type Chart, type Difficulty } from "@/lib/core/types";
import { Chip, TextInput } from "./ui";
import { groupPacks } from "@/lib/packs";

export interface ChartFilterState {
  q: string;
  diffs: Difficulty[];
  min: string;
  max: string;
  pack: string;
  hideDeleted: boolean;
}

export function useChartFilter(initial?: Partial<ChartFilterState>) {
  const [state, setState] = useState<ChartFilterState>({
    q: "",
    diffs: ["IV", "IV-α"],
    min: "",
    max: "",
    pack: "",
    hideDeleted: true,
    ...initial,
  });
  const set = (p: Partial<ChartFilterState>) => setState((s) => ({ ...s, ...p }));
  return { state, set };
}

export function normalize(s: string) {
  return s.toLowerCase().normalize("NFKC").replace(/\s+/g, "");
}

export function applyChartFilter(charts: Chart[], f: ChartFilterState): Chart[] {
  const q = normalize(f.q);
  const min = f.min === "" ? -Infinity : Number(f.min);
  const max = f.max === "" ? Infinity : Number(f.max);
  return charts.filter(
    (c) =>
      (f.diffs.length === 0 || f.diffs.includes(c.difficulty)) &&
      c.constant >= min &&
      c.constant <= max &&
      (!f.pack || c.pack === f.pack || c.songPack === f.pack) &&
      (!f.hideDeleted || !c.deleted) &&
      (!q || normalize(c.title).includes(q) || normalize(c.songTitle).includes(q) || normalize(c.songId).includes(q)),
  );
}

export function ChartFilterBar({ state, set, charts, extra }: { state: ChartFilterState; set: (p: Partial<ChartFilterState>) => void; charts: Chart[]; extra?: React.ReactNode }) {
  const packs = useMemo(() => groupPacks(charts.map((c) => c.songPack)), [charts]);

  const toggle = (d: Difficulty) => set({ diffs: state.diffs.includes(d) ? state.diffs.filter((x) => x !== d) : [...state.diffs, d] });

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line bg-paper p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <TextInput
          type="search"
          value={state.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="곡 제목, 곡 ID로 검색"
          aria-label="곡 검색"
          className="min-w-0 flex-1 basis-56"
        />
        <select
          value={state.pack}
          onChange={(e) => set({ pack: e.target.value })}
          aria-label="카테고리"
          className="h-10 max-w-[14rem] rounded-[10px] border border-line bg-paper px-3 text-sm"
        >
          <option value="">모든 곡</option>
          {packs.map((g) => (
            <optgroup key={g.category} label={g.category}>
              {g.packs.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {DIFFICULTIES.map((d) => (
          <Chip key={d} active={state.diffs.includes(d)} onClick={() => toggle(d)}>
            {d}
          </Chip>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        <label className="flex items-center gap-1.5 text-[13px] text-mist">
          정수
          <TextInput
            inputMode="decimal"
            value={state.min}
            onChange={(e) => set({ min: e.target.value.replace(/[^0-9.]/g, "") })}
            placeholder="최소"
            aria-label="최소 정수"
            className="h-8 w-16 text-center"
          />
          ~
          <TextInput
            inputMode="decimal"
            value={state.max}
            onChange={(e) => set({ max: e.target.value.replace(/[^0-9.]/g, "") })}
            placeholder="최대"
            aria-label="최대 정수"
            className="h-8 w-16 text-center"
          />
        </label>
        <label className="flex items-center gap-1.5 text-[13px] text-mist">
          <input type="checkbox" checked={state.hideDeleted} onChange={(e) => set({ hideDeleted: e.target.checked })} className="accent-[var(--orbit)]" />
          삭제곡 숨기기
        </label>
        {extra}
      </div>
    </div>
  );
}
