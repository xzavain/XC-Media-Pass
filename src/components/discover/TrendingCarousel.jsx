import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import TrendingCard from "./TrendingCard";

export default function TrendingCarousel({ items, onCardClick }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 600, behavior: "smooth" });
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="relative group/carousel">
      <button
        onClick={() => scroll(-1)}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-zinc-900/90 border border-zinc-700 items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 opacity-0 group-hover/carousel:opacity-100 transition-opacity -translate-x-1/2"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => scroll(1)}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-zinc-900/90 border border-zinc-700 items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 opacity-0 group-hover/carousel:opacity-100 transition-opacity translate-x-1/2"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-1"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item, i) => (
          <TrendingCard
            key={`${item.tmdb_id}-${item.media_type}` || i}
            item={item}
            onClick={() => onCardClick(item)}
          />
        ))}
      </div>
    </div>
  );
}