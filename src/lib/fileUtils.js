import { File, Film, Music2, Image as ImageIcon, FileText, Archive } from "lucide-react";

// Sizes in MB / GB only (e.g. 0.04 MB, 450.5 MB, 3.2 GB, 1,204.6 GB).
export function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return "—";
  const n = Number(bytes);
  if (n <= 0) return "0 MB";
  const GB = 1073741824;
  const MB = 1048576;
  if (n >= GB) return `${(n / GB).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} GB`;
  const mb = n / MB;
  return `${mb < 0.1 ? mb.toFixed(2) : mb.toFixed(1)} MB`;
}

// Windows-style MM/DD/YYYY hh:mm AM/PM. Accepts ISO strings, Date objects,
// and raw unix timestamps (seconds or milliseconds).
export function formatDate(value) {
  if (value == null || value === "") return "—";
  let d;
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const num = Number(value);
    d = new Date(num < 1e12 ? num * 1000 : num);
  } else {
    d = new Date(value);
  }
  if (isNaN(d.getTime())) return "—";
  const pad = (x) => String(x).padStart(2, "0");
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(h)}:${pad(d.getMinutes())} ${ampm}`;
}

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "tiff", "ico"];

export function isImageFile(name) {
  const ext = name?.split(".").pop()?.toLowerCase();
  return IMAGE_EXTS.includes(ext);
}

const EXT_ICONS = {
  mkv: Film, mp4: Film, avi: Film, mov: Film, wmv: Film, m4v: Film, ts: Film, m2ts: Film,
  mp3: Music2, flac: Music2, aac: Music2, wav: Music2, ogg: Music2,
  jpg: ImageIcon, jpeg: ImageIcon, png: ImageIcon, gif: ImageIcon, webp: ImageIcon, bmp: ImageIcon, svg: ImageIcon, ico: ImageIcon,
  txt: FileText, nfo: FileText, srt: FileText, ass: FileText,
  zip: Archive, rar: Archive, "7z": Archive,
};

export function getFileIcon(name) {
  const ext = name?.split(".").pop()?.toLowerCase();
  return EXT_ICONS[ext] || File;
}

const TYPE_MAP = {
  mkv: "MKV File", mp4: "MP4 File", avi: "AVI File", mov: "MOV File", wmv: "WMV File",
  m4v: "M4V File", ts: "TS File", m2ts: "M2TS File", mp3: "MP3 File", flac: "FLAC File",
  aac: "AAC File", wav: "WAV File", jpg: "JPG File", jpeg: "JPG File", png: "PNG File",
  gif: "GIF File", webp: "WEBP File", svg: "SVG File", txt: "Text File", nfo: "NFO File",
  srt: "SRT File", ass: "ASS File", zip: "ZIP File", rar: "RAR File", "7z": "7Z File",
};

export function getFileType(name, isDirectory) {
  if (isDirectory) return "Folder";
  const ext = name?.split(".").pop()?.toLowerCase();
  return TYPE_MAP[ext] || (ext ? `${ext.toUpperCase()} File` : "File");
}