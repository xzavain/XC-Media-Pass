import { useState } from "react";
import { Film } from "lucide-react";

export default function PosterImage({ src, alt, className, fallbackClassName }) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div
        className={`${className} ${fallbackClassName || ""} flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-zinc-500 text-xs text-center p-2 rounded-lg gap-1.5`}
      >
        <Film className="w-6 h-6 text-zinc-700 flex-shrink-0" />
        <span className="line-clamp-3">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}