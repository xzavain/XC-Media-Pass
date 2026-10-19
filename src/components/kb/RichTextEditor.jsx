import React, { useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "@/lib/quillBlots"; // Register callout + collapsible blots with Quill
import AssetPickerModal from "@/components/kb/AssetPickerModal";
import PagePickerModal from "@/components/kb/PagePickerModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ImageIcon,
  Link2,
  Info,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  Plus,
} from "lucide-react";

const modules = {
  toolbar: {
    container: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote", "code-block"],
      ["link"],
      ["clean"],
    ],
  },
};

export default function RichTextEditor({ value, onChange, user, pageId }) {
  const quillRef = useRef(null);
  const [assetOpen, setAssetOpen] = useState(false);
  const [pageOpen, setPageOpen] = useState(false);

  const insertAtCursor = (html) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const range = editor.getSelection(true);
    editor.clipboard.dangerouslyPasteHTML(range ? range.index : editor.getLength(), html);
  };

  const handleAssetPick = (asset) => {
    if (asset.file_type === "image" || asset.file_type === "gif") {
      insertAtCursor(`<img src="${asset.file_url}" alt="${asset.file_name}" />`);
    } else if (asset.file_type === "video") {
      insertAtCursor(`<video src="${asset.file_url}" controls></video>`);
    } else {
      insertAtCursor(`<a href="${asset.file_url}" target="_blank">${asset.file_name}</a>`);
    }
  };

  const handlePagePick = (page) => {
    insertAtCursor(`<a href="/kb/page/${page.id}">${page.title}</a>`);
  };

  const insertCallout = (type) => {
    insertAtCursor(
      `<p class="callout ${type}">Enter your ${type} note here...</p>`
    );
  };

  const insertCollapsible = () => {
    const summary = window.prompt(
      "Enter a title for the collapsible section:",
      "Click to expand"
    );
    if (!summary) return;
    insertAtCursor(
      `<details><summary>${summary}</summary><p>Enter hidden content here...</p></details>`
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <Button type="button" variant="outline" size="sm" className="border-zinc-700 gap-1.5" onClick={() => setAssetOpen(true)}>
          <ImageIcon className="w-3.5 h-3.5" /> Insert Media
        </Button>
        <Button type="button" variant="outline" size="sm" className="border-zinc-700 gap-1.5" onClick={() => setPageOpen(true)}>
          <Link2 className="w-3.5 h-3.5" /> Link to Page
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="border-zinc-700 gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Callout
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-zinc-900 border-zinc-700">
            <DropdownMenuItem onClick={() => insertCallout("info")} className="gap-2 text-zinc-300 hover:text-white focus:text-white">
              <Info className="w-4 h-4 text-blue-400" /> Info
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertCallout("success")} className="gap-2 text-zinc-300 hover:text-white focus:text-white">
              <CheckCircle className="w-4 h-4 text-green-400" /> Success
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertCallout("warning")} className="gap-2 text-zinc-300 hover:text-white focus:text-white">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Warning
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertCallout("danger")} className="gap-2 text-zinc-300 hover:text-white focus:text-white">
              <AlertCircle className="w-4 h-4 text-red-400" /> Danger
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button type="button" variant="outline" size="sm" className="border-zinc-700 gap-1.5" onClick={insertCollapsible}>
          <ChevronDown className="w-3.5 h-3.5" /> Collapsible
        </Button>
      </div>
      <div className="kb-editor rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800">
        <ReactQuill ref={quillRef} theme="snow" value={value} onChange={onChange} modules={modules} />
      </div>
      <AssetPickerModal user={user} open={assetOpen} onOpenChange={setAssetOpen} onPick={handleAssetPick} />
      <PagePickerModal open={pageOpen} onOpenChange={setPageOpen} onPick={handlePagePick} excludePageId={pageId} />
    </div>
  );
}