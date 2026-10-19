import React from "react";
import { Loader2, CheckCircle2, AlertCircle, FileText, BookOpen, FolderOpen, Library, Image as ImageIcon } from "lucide-react";

function PhaseRow({ label, current, total, icon: Icon, active, done }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${done ? "bg-lime-500/10 text-lime-400" : active ? "bg-lime-500/10 text-lime-400" : "bg-zinc-800 text-zinc-600"}`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : active ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      </div>
      <div className="flex-1">
        <p className={`text-sm ${active || done ? "text-zinc-100" : "text-zinc-500"}`}>{label}</p>
        {active && total > 0 && (
          <p className="text-xs text-zinc-500">{current} / {total} — processing...</p>
        )}
        {done && total > 0 && (
          <p className="text-xs text-lime-400">{current} / {total} imported</p>
        )}
      </div>
    </div>
  );
}

export default function MigrationProgressPanel({ progress, stats }) {
  if (!progress && !stats) {
    return (
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 text-center">
        <p className="text-sm text-zinc-500">No migration running. Test your connection and start a migration above.</p>
      </div>
    );
  }

  const step = progress?.step || "";
  const isShelfStep = step.toLowerCase().includes("shelf");
  const isBookStep = step.toLowerCase().includes("book") && !isShelfStep;
  const isChapterStep = step.toLowerCase().includes("chapter");
  const isPageStep = step.toLowerCase().includes("page");

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100">Migration Progress</h3>
        {progress?.detail && <p className="text-xs text-zinc-500 truncate max-w-xs">{progress.detail}</p>}
      </div>

      {progress && (
        <div className="px-3 py-2 rounded-lg bg-zinc-800/50 text-xs text-zinc-300">
          {progress.step}
          {progress.total > 0 && (
            <span className="ml-2 text-zinc-500">({progress.current} / {progress.total})</span>
          )}
        </div>
      )}

      {stats && (
        <div className="space-y-1">
          <PhaseRow label="Shelves" current={stats.imported_shelves} total={stats.total_shelves} icon={Library} active={isShelfStep} done={stats.total_shelves > 0 && !isShelfStep} />
          <PhaseRow label="Books" current={stats.imported_books} total={stats.total_books} icon={BookOpen} active={isBookStep} done={stats.total_books > 0 && !isBookStep && !isShelfStep} />
          <PhaseRow label="Chapters" current={stats.imported_chapters} total={stats.total_chapters} icon={FolderOpen} active={isChapterStep} done={stats.total_chapters > 0 && !isChapterStep && !isBookStep && !isShelfStep} />
          <PhaseRow label="Pages & Media" current={stats.imported_pages} total={stats.total_pages} icon={FileText} active={isPageStep} done={stats.total_pages > 0 && !isPageStep} />
          <PhaseRow label="Assets Re-hosted" current={stats.imported_assets} total={stats.total_assets} icon={ImageIcon} active={isPageStep} done={!isPageStep} />
        </div>
      )}

      {stats?.failed_items > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-400 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <AlertCircle className="w-4 h-4" />
          {stats.failed_items} item(s) failed — see migration log for details
        </div>
      )}
    </div>
  );
}