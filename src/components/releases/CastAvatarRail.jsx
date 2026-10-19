import React from "react";
import { profileUrl } from "@/lib/releaseApi";

export default function CastAvatarRail({ cast, crew, onSelectPerson }) {
  const allPeople = [
    ...(cast || []).map((c) => ({ ...c, role: c.character ? `as ${c.character}` : c.known_for_department || "" })),
    ...(crew || []).map((c) => ({ ...c, role: c.job || c.department || "" })),
  ];

  if (allPeople.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Actors & Crew</p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {allPeople.map((person) => {
          const img = profileUrl(person.profile_path);
          return (
            <button
              key={`${person.id}-${person.name}`}
              onClick={() => onSelectPerson(person)}
              className="flex-shrink-0 w-20 text-center group"
            >
              <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700 group-hover:border-indigo-500 transition-colors mx-auto">
                {img ? (
                  <img src={img} alt={person.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-bold">
                    {person.name?.charAt(0) || "?"}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-200 mt-1.5 truncate group-hover:text-indigo-400 transition-colors">{person.name}</p>
              {person.role && <p className="text-[10px] text-slate-500 truncate">{person.role}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}