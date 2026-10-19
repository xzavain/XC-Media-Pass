import React from "react";
import ContentTile from "@/components/browse/ContentTile";

export default function ContentRow({ title, items, isUnlocked, onTileClick }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-sm sm:text-base font-semibold text-white px-1">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-thin">
        {items.map((item) => (
          <ContentTile
            key={item.id}
            item={item}
            locked={!isUnlocked(item)}
            onClick={onTileClick}
          />
        ))}
      </div>
    </div>
  );
}