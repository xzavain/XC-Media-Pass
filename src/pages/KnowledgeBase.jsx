import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { canManageKb } from "@/lib/kbPermissions";
import BookCard from "@/components/kb/BookCard";
import BookFormModal from "@/components/kb/BookFormModal";
import ShelfCard from "@/components/kb/ShelfCard";
import ShelfFormModal from "@/components/kb/ShelfFormModal";
import KbSearchBar from "@/components/kb/KbSearchBar";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { Plus, Image as ImageIcon, Library } from "lucide-react";

export default function KnowledgeBase() {
  const { user } = useAuth();
  const isCustomerPortal = useLocation().pathname.startsWith("/customer/");
  const [shelves, setShelves] = useState([]);
  const [books, setBooks] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showShelfForm, setShowShelfForm] = useState(false);

  const load = useCallback(async () => {
    const [s, b, p] = await Promise.all([
      base44.entities.KbShelf.list("-order", 200),
      base44.entities.KbBook.list("-created_date", 200),
      base44.entities.KbPage.list("-created_date", 1000),
    ]);
    setShelves(s);
    setBooks(b);
    setPages(p);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="p-8 text-sm text-zinc-500">Loading knowledge base...</div>;
  }

  const canManage = canManageKb(user) && !isCustomerPortal;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-zinc-100">Knowledge Base</h1>
          <p className="text-sm text-zinc-500 mt-1">Books, chapters, and pages for documentation and internal guides</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <Button asChild variant="outline" className="border-zinc-700 gap-1.5">
                <Link to="/kb/migration"><Library className="w-4 h-4" /> BookStack Migration</Link>
              </Button>
              <Button asChild variant="outline" className="border-zinc-700 gap-1.5">
                <Link to="/kb/assets"><ImageIcon className="w-4 h-4" /> Asset Manager</Link>
              </Button>
            </>
          )}
          {canManage && (
            <>
              <Button onClick={() => setShowShelfForm(true)} variant="outline" className="border-zinc-700 gap-1.5">
                <Plus className="w-4 h-4" /> New Shelf
              </Button>
              <Button onClick={() => setShowForm(true)} className="bg-lime-600 hover:bg-lime-700 text-white gap-1.5">
                <Plus className="w-4 h-4" /> New Book
              </Button>
            </>
          )}
        </div>
      </div>

      <KbSearchBar user={user} />

      {shelves.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Shelves</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shelves.map((shelf) => (
              <ShelfCard key={shelf.id} shelf={shelf} bookCount={(shelf.book_ids || []).length} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">All Books</h2>
        {books.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-12">No books yet. Create one to get started.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} pageCount={pages.filter((p) => p.book_id === book.id).length} />
            ))}
          </div>
        )}
      </div>

      <BookFormModal open={showForm} onOpenChange={setShowForm} onCreated={load} />
      <ShelfFormModal open={showShelfForm} onOpenChange={setShowShelfForm} onCreated={load} />
    </div>
  );
}