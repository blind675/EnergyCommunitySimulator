import type { Member, MemberType, ProfileKey } from "../types";
import { MEMBER_TYPES, PROFILE_LABELS } from "../constants";

interface MemberEditorProps {
  member: Member;
  onChange: (m: Member) => void;
  onDelete: () => void;
}

export function MemberEditor({ member, onChange, onDelete }: MemberEditorProps) {
  const inputCls = "bg-black/40 border border-white/10 rounded-md px-2 py-1 text-slate-100 text-[13px]";
  return (
    <div
      className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 mb-2"
      style={{ borderLeft: `3px solid ${member.color}` }}
    >
      <div className="flex gap-2 flex-wrap items-center">
        <input
          value={member.name}
          onChange={e => onChange({ ...member, name: e.target.value })}
          className={`${inputCls} flex-[1_1_160px]`}
          placeholder="Nume membru"
        />
        <select
          value={member.type}
          onChange={e => onChange({ ...member, type: e.target.value as MemberType })}
          className={inputCls}
        >
          {MEMBER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={member.profileKey}
          onChange={e => onChange({ ...member, profileKey: e.target.value as ProfileKey })}
          className={inputCls}
        >
          {Object.entries(PROFILE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {member.type === "prosumator" && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-300">Putere instalată:</span>
            <input
              type="number" min="0" max="20" step="0.5"
              value={member.peakKw}
              onChange={e => onChange({ ...member, peakKw: parseFloat(e.target.value) || 0 })}
              className="w-15 bg-black/40 border border-white/10 rounded-md px-2 py-1 text-amber-400 text-[13px]"
            />
            <span className="text-[11px] text-slate-300">kWp</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-slate-300">Consum zilnic:</span>
          <input
            type="number" min="1" max="200" step="1"
            value={member.avgDailyKwh}
            onChange={e => onChange({ ...member, avgDailyKwh: parseFloat(e.target.value) || 1 })}
            className="w-15 bg-black/40 border border-white/10 rounded-md px-2 py-1 text-blue-400 text-[13px]"
          />
          <span className="text-[11px] text-slate-300">kWh/zi</span>
        </div>
        <button
          onClick={onDelete}
          className="bg-red-500/15 border border-red-500/30 rounded-md px-2.5 py-1 text-red-400 text-xs cursor-pointer"
        >✕</button>
      </div>
    </div>
  );
}
