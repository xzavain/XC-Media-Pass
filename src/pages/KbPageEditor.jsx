import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { canManageKb } from "@/lib/kbPermissions";
import RichTextEditor from "@/components/kb/RichTextEditor";
import TagInput from "@/components/kb/TagInput";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, FileCode, PenLine } from "lucide-react";

export default function KbPageEditor() {
  const { pageId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = pageId === "new";

  const [page, setPage] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [markdownContent, setMarkdownContent] = useState("");
  const [tags, setTags] = useState([]);
  const [editorMode, setEditorMode] = useState("wysiwyg");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const bookId = searchParams.get("bookId");
  const chapterId = searchParams.get("chapterId");

  useEffect(() => {
    if (!isNew) {
      base44.entities.KbPage.get(pageId).then(async (p) => {
        setPage(p);
        setTitle(p.title);
        let pageContent = p.content || "";
        if (!pageContent && p.content_url) {
          try {
            const res = await fetch(p.content_url);
            pageContent = await res.text();
          } catch (e) { /* use empty */ }
        }
        setContent(pageContent);
        setMarkdownContent(p.markdown_content || "");
        setEditorMode(p.markdown_content ? "markdown" : "wysiwyg");
        setTags(p.tags || []);
        setLoading(false);
      });
    }
  }, [pageId, isNew]);

  const canManage = canManageKb(user);
  if (!canManage) {
    return <div className="p-8 text-sm text-zinc-500">Only staff and admins can edit knowledge base pages.</div>;
  }
  if (loading) return <div className="p-8 text-sm text-zinc-500">Loading page...</div>;

  const save = async (status) => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      let savedPage;
      const md = editorMode === "markdown" ? markdownContent : "";
      if (isNew) {
        savedPage = await base44.entities.KbPage.create({
          book_id: bookId,
          chapter_id: chapterId || undefined,
          title,
          content: editorMode === "markdown" ? "" : content,
          markdown_content: md,
          status,
          tags,
          author_name: user?.full_name,
          author_email: user?.email,
          version: 1,
        });
        await base44.entities.KbPageRevision.create({
          page_id: savedPage.id,
          title,
          content: editorMode === "markdown" ? "" : content,
          markdown_content: md,
          version: 1,
          revision_type: "create",
          summary: "Initial creation",
          editor_name: user?.full_name,
          editor_email: user?.email,
        });
      } else {
        const nextVersion = (page.version || 1) + 1;
        savedPage = await base44.entities.KbPage.update(page.id, {
          title,
          content: editorMode === "markdown" ? "" : content,
          content_url: "",
          markdown_content: md,
          status,
          tags,
          version: nextVersion,
        });
        await base44.entities.KbPageRevision.create({
          page_id: page.id,
          title,
          content: editorMode === "markdown" ? "" : content,
          markdown_content: md,
          version: nextVersion,
          revision_type: "edit",
          editor_name: user?.full_name,
          editor_email: user?.email,
        });
      }
      navigate(`/kb/page/${savedPage.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <Input
        placeholder="Page title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="bg-zinc-800 border-zinc-700 text-zinc-100 text-lg font-semibold h-12"
      />

      <TagInput tags={tags} onChange={setTags} />

      {/* Editor mode toggle — BookStack supports both WYSIWYG and Markdown */}
      <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-800/50 w-fit">
        <button
          onClick={() => setEditorMode("wysiwyg")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${editorMode === "wysiwyg" ? "bg-lime-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          <PenLine className="w-3.5 h-3.5" /> WYSIWYG
        </button>
        <button
          onClick={() => setEditorMode("markdown")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${editorMode === "markdown" ? "bg-lime-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          <FileCode className="w-3.5 h-3.5" /> Markdown
        </button>
      </div>

      {editorMode === "wysiwyg" ? (
        <RichTextEditor value={content} onChange={setContent} user={user} pageId={isNew ? null : pageId} />
      ) : (
        <Textarea
          placeholder="Write page content in Markdown..."
          value={markdownContent}
          onChange={(e) => setMarkdownContent(e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-zinc-100 min-h-[300px] font-mono text-sm"
        />
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className="border-zinc-700" disabled={saving} onClick={() => save("draft")}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save as Draft"}
        </Button>
        <Button className="bg-lime-600 hover:bg-lime-700 text-white" disabled={saving} onClick={() => save("published")}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish"}
        </Button>
      </div>
    </div>
  );
}