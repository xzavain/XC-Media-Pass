import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

export default function ContentDetailModal({ item, unlocked, onClose }) {
  if (!item) return null;
  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {unlocked ? (
            item.file_url && (
              <video src={item.file_url} controls className="w-full rounded-lg bg-black" poster={item.thumbnail_url} />
            )
          ) : (
            item.thumbnail_url && (
              <div className="relative rounded-lg overflow-hidden">
                <img src={item.thumbnail_url} alt={item.title} className="w-full aspect-video object-cover blur-sm" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-amber-400" />
                </div>
              </div>
            )
          )}
          <p className="text-sm text-zinc-400">{item.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {(item.tags || []).map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{tag}</span>
            ))}
          </div>
          {!unlocked && (
            <Button asChild className="w-full">
              <Link to="/store">Upgrade to Unlock</Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}