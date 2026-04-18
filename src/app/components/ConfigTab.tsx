import type { Member } from "../types";
import { MemberEditor } from "./MemberEditor";

interface ConfigTabProps {
  members: Member[];
  onUpdate: (id: number, updated: Member) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
}

export function ConfigTab({ members, onUpdate, onDelete, onAdd }: ConfigTabProps) {
  return (
    <div>
      <div className="mb-4 text-xs text-slate-300 leading-relaxed">
        Configurează membrii comunității. Minimum 5 membri necesari legal.
        Prosumatorii au panouri solare și pot produce energie. Consumatorii doar consumă.
      </div>
      {members.map((m) => (
        <MemberEditor
          key={m.id}
          member={m}
          onChange={updated => onUpdate(m.id, updated)}
          onDelete={() => onDelete(m.id)}
        />
      ))}
      <button
        onClick={onAdd}
        className="mt-2 bg-green-400/10 border border-dashed border-green-400/40 rounded-lg px-5 py-2.5 text-green-400 text-[13px] cursor-pointer w-full tracking-[0.04em]"
      >+ Adaugă membru</button>

      <div className="mt-5 bg-amber-400/5 border border-amber-400/20 rounded-lg px-4 py-3 text-[11px] text-slate-300">
        <span className="text-amber-400">⚠️ Atenție:</span> Membrii comunității trebuie să fie racordați la același operator de distribuție
        (Rețele Electrice Banat / PPC pentru județul Timiș). În modelul fără licență, fiecare membru
        păstrează propriul contract de furnizare.
      </div>
    </div>
  );
}
