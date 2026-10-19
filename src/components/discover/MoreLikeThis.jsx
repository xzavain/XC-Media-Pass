import TrendingCarousel from "./TrendingCarousel";

export default function MoreLikeThis({ items, onCardClick }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">More Like This</h3>
      <TrendingCarousel items={items} onCardClick={onCardClick} />
    </div>
  );
}