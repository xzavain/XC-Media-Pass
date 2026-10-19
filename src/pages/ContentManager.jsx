import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Clapperboard } from "lucide-react";
import ContentFormModal from "@/components/content/ContentFormModal";
import ContentCard from "@/components/content/ContentCard";
import { useToast } from "@/components/ui/use-toast";

export default function ContentManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.ContentItem.list("-created_date"),
      base44.entities.StorePlan.list(),
    ]).then(([content, storePlans]) => {
      setItems(content);
      setPlans(storePlans);
      setLoading(false);
    });
  }, []);

  const planNameMap = plans.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {});

  const filteredItems = items.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.category || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    await base44.entities.ContentItem.delete(item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast({ title: "Content deleted" });
  };

  const handleSave = async (payload) => {
    if (editingItem) {
      const updated = await base44.entities.ContentItem.update(editingItem.id, payload);
      setItems((prev) => prev.map((i) => (i.id === editingItem.id ? { ...i, ...updated } : i)));
    } else {
      const created = await base44.entities.ContentItem.create(payload);
      setItems((prev) => [created, ...prev]);
    }
    setShowForm(false);
    setEditingItem(null);
    toast({ title: editingItem ? "Content updated" : "Content created" });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Content Manager</h1>
          <p className="text-sm text-zinc-400">Upload media and control which subscription tiers can access it.</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Content
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          placeholder="Search content…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-zinc-900/40 border-zinc-800"
        />
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Clapperboard className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
          <p className="text-sm">No content yet. Add your first item.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              planNames={(item.allowed_plan_ids || []).map((id) => planNameMap[id]).filter(Boolean)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ContentFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingItem(null); }}
        onSave={handleSave}
        item={editingItem}
        plans={plans}
        user={user}
      />
    </div>
  );
}