import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { canManageKb, canSeeDraft } from "@/lib/kbPermissions";
import RevisionHistoryPanel from "@/components/kb/RevisionHistoryPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import moment from "moment";

export default function KbPageView() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCustomerPortal = useLocation().pathname.startsWith("/customer/");
  const [page, setPage] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [externalContent, setExternalContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const load = useCallback(async () => {
    const p = await base44.entities.KbPage.get(pageId);
    setPage(p);
    base44.entities.KbPage.update(pageId, { view_count: (p.view_count || 0) + 1 });
    const revs = await base44.entities.KbPageRevision.filter({ page_id: pageId }, "-version");
    setRevisions(revs);
    if (p.content_url && !p.content) {
      setLoadingContent(true);
      try {
        const res = await fetch(p.content_url);
        setExternalContent(await res.text());
      } catch (e) {
        setExternalContent("<p>Failed to load page content.</p>");
      } finally {
        setLoadingContent(false);
      }
    }
    setLoading(false);
  }, [pageId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-8 text-sm text-zinc-500">Loading page...</div>;
  if (!page) return <div className="p-8 text-sm text-zinc-500">Page not found.</div>;

  const canManage = canManageKb(user) && !isCustomerPortal;
  if (page.status === "draft" && !canSeeDraft(user, page)) {
    return <div className="p-8 text-sm text-zinc-500">This page is a draft and not yet published.</div>;
  }

  const handleRestore = async (rev) => {
    setRestoring(true);
    try {
      const nextVersion = (page.version || 1) + 1;
      await base44.entities.KbPage.update(page.id, { title: rev.title, content: rev.content, version: nextVersion });
      await base44.entities.KbPageRevision.create({
        page_id: page.id,
        title: rev.title,
        content: rev.content,
        version: nextVersion,
        editor_name: user?.full_name,
        editor_email: user?.email,
      });
      await load();
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(`/kb/book/${page.book_id}`)} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Book
      </button>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-heading font-bold text-zinc-100">{page.title}</h1>
            {page.status === "draft" && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">Draft</span>
            )}
          </div>
          <p className="text-xs text-zinc-500">
            By {page.author_name || page.author_email} · Updated {moment(page.updated_date).fromNow()} · v{page.version || 1}
          </p>
          {page.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {page.tags.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700">{t}</span>
              ))}
            </div>
          )}
        </div>
        {canManage && (
          <Button asChild variant="outline" className="border-zinc-700 gap-1.5">
            <Link to={`/kb/editor/${page.id}`}><Pencil className="w-4 h-4" /> Edit</Link>
          </Button>
        )}
      </div>

      {page.content_url ? (
        loadingContent ? (
          <p className="text-sm text-zinc-500">Loading content...</p>
        ) : (
          <div className="kb-content prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: externalContent }} />
        )
      ) : page.content ? (
        <div className="kb-content prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: page.content }} />
      ) : page.markdown_content ? (
        <div className="kb-content prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{page.markdown_content}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm text-zinc-600">This page has no content yet.</p>
      )}

      {canManage && (
        <div className="pt-4 border-t border-zinc-800/60">
          {restoring ? (
            <p className="text-xs text-zinc-500 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Restoring...</p>
          ) : (
            <RevisionHistoryPanel revisions={revisions} onRestore={handleRestore} canManage={canManage} />
          )}
        </div>
      )}
    </div>
  );
}