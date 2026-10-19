import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { canManageKb } from "@/lib/kbPermissions";
import BookCard from "@/components/kb/BookCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Library } from "lucide-react";

export default function KbShelfPage() {
  const { shelfId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCustomerPortal = useLocation().pathname.startsWith("/customer/");
  const [shelf, setShelf] = useState(null);
  const [books, setBooks] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [s, allBooks, allPages] = await Promise.all([
      base44.entities.KbShelf.get(shelfId),
      base44.entities.KbBook.list("-created_date", 500),
      base44.entities.KbPage.list("-created_date", 1000),
    ]);
    setShelf(s);
    const shelfBookIds = s.book_ids || [];
    setBooks(allBooks.filter((b) => shelfBookIds.includes(b.id)));
    setPages(allPages);
    setLoading(false);
  }, [shelfId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-8 text-sm text-zinc-500">Loading shelf...</div>;
  if (!shelf) return <div className="p-8 text-sm text-zinc-500">Shelf not found.</div>;

  const canManage = canManageKb(user) && !isCustomerPortal;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <button onClick={() => navigate("/kb")} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Knowledge Base
      </button>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Library className="w-5 h-5 text-lime-400" />
            <h1 className="text-2xl font-heading font-bold text-zinc-100">{shelf.name}</h1>
          </div>
          <p className="text-sm text-zinc-500 mt-1">{shelf.description}</p>
          {shelf.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {shelf.tags.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700">{t}</span>
              ))}
            </div>
          )}
        </div>
        {canManage && (
          <Button asChild className="bg-lime-600 hover:bg-lime-700 text-white gap-1.5">
            <Link to="/kb"><Plus className="w-4 h-4" /> Add Books from KB</Link>
          </Button>
        )}
      </div>

      {books.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-12">No books in this shelf yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} pageCount={pages.filter((p) => p.book_id === book.id).length} />
          ))}
        </div>
      )}
    </div>
  );
}