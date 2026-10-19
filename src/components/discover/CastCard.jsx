import PosterImage from "./PosterImage";

export default function CastCard({ member, onClick }) {
  return (
    <div className="flex-shrink-0 w-[100px] text-center cursor-pointer group" onClick={onClick}>
      <div className="w-[100px] h-[100px] rounded-full overflow-hidden mx-auto bg-zinc-900 border border-zinc-800 group-hover:border-indigo-500/50 transition-colors">
        <PosterImage
          src={member.profile_path ? `https://image.tmdb.org/t/p/w200${member.profile_path}` : null}
          alt={member.name}
          className="w-full h-full object-cover rounded-full"
          fallbackClassName="!rounded-full text-[10px]"
        />
      </div>
      <p className="text-xs font-semibold text-zinc-200 mt-2 truncate group-hover:text-indigo-400 transition-colors">{member.name}</p>
      <p className="text-[10px] text-zinc-500 truncate">{member.character}</p>
    </div>
  );
}