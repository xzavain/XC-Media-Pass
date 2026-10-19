import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { canManageKb } from "@/lib/kbPermissions";
import ChapterFormModal from "@/components/kb/ChapterFormModal";
import PageListItem from "@/components/kb/PageListItem";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, FolderPlus, Library } from "lucide-react";

export default function KbBookPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCustomerPortal = useLocation().pathname.startsWith("/customer/");
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [pages, setPages] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChapterForm, setShowChapterForm] = useState(false);

  const load = useCallback(async () => {
    const [b, c, p] = await Promise.all([
      base44.entities.KbBook.get(bookId),
      base44.entities.KbChapter.filter({ book_id: bookId }),
      base44.entities.KbPage.filter({ book_id: bookId }),
    ]);
    setBook(b);
    setChapters(c.sort((a, b2) => (a.order || 0) - (b2.order || 0)));
    setPages(p);
    if (b?.shelf_ids?.length) {
      const allShelves = await base44.entities.KbShelf.list("-order", 200);
      setShelves(allShelves.filter((s) => b.shelf_ids.includes(s.id)));
    }
    setLoading(false);
  }, [bookId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-8 text-sm text-zinc-500">Loading book...</div>;
  if (!book) return <div className="p-8 text-sm text-zinc-500">Book not found.</div>;

  const canManage = canManageKb(user) && !isCustomerPortal;
  const visiblePages = (list) => canManage ? list : list.filter((p) => p.status === "published" || p.author_email === user?.email);
  const looseasPages = visiblePages(pages.filter((p) => !p.chapter_id));

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => navigate("/kb")} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Knowledge Base
        </button>
        {shelves.length > 0 && (
          <span className="flex items-center gap-1.5">
            {shelves.map((shelf) => (
              <Link key={shelf.id} to={`/kb/shelf/${shelf.id}`} className="flex items-center gap-1 text-xs text-lime-400 hover:text-lime-300">
                <Library className="w-3 h-3" /> {shelf.name}
              </Link>
            ))}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-zinc-100">{book.title}</h1>
          {book.description && (
            <div className="kb-content prose prose-invert prose-sm max-w-none mt-1 text-sm text-zinc-400" dangerouslySetInnerHTML={{ __html: book.description }} />
          )}
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" className="border-zinc-700 gap-1.5" onClick={() => setShowChapterForm(true)}>
              <FolderPlus className="w-4 h-4" /> New Chapter
            </Button>
            <Button asChild className="bg-lime-600 hover:bg-lime-700 text-white gap-1.5">
              <Link to={`/kb/editor/new?bookId=${bookId}`}><Plus className="w-4 h-4" /> New Page</Link>
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {chapters.map((chapter) => {
          const chapterPages = visiblePages(pages.filter((p) => p.chapter_id === chapter.id));
          return (
            <div key={chapter.id} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">{chapter.title}</h3>
                  {chapter.description && (
                    <div className="kb-content prose prose-invert prose-sm max-w-none text-xs text-zinc-500" dangerouslySetInnerHTML={{ __html: chapter.description }} />
                  )}
                </div>
                {canManage && (
                  <Button asChild size="sm" variant="outline" className="border-zinc-700">
                    <Link to={`/kb/editor/new?bookId=${bookId}&chapterId=${chapter.id}`}>+ Page</Link>
                  </Button>
                )}
              </div>
              <div className="space-y-0.5">
                {chapterPages.length === 0 ? (
                  <p className="text-xs text-zinc-600 px-3 py-2">No pages yet.</p>
                ) : (
                  chapterPages.map((p) => <PageListItem key={p.id} page={p} />)
                )}
              </div>
            </div>
          );
        })}

        {(looseasPages.length > 0 || chapters.length === 0) && (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
            <h3 className="text-sm font-semibold text-zinc-200 mb-2">Pages</h3>
            <div className="space-y-0.5">
              {looseasPages.length === 0 ? (
                <p className="text-xs text-zinc-600 px-3 py-2">No pages yet.</p>
              ) : (
                looseasPages.map((p) => <PageListItem key={p.id} page={p} />)
              )}
            </div>
          </div>
        )}
      </div>

      <ChapterFormModal bookId={bookId} open={showChapterForm} onOpenChange={setShowChapterForm} onCreated={load} />
    </div>
  );
}