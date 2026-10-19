import React, { useState } from "react";
import { FileText, ChevronDown, ChevronRight, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const apiDocs = [
  {
    platform: "Jellyfin",
    color: "violet",
    baseUrl: "https://api.jellyfin.org",
    docUrl: "https://jellyfin.org/docs/",
    endpoints: [
      {
        method: "GET",
        path: "/System/Info",
        description: "Test server connectivity and get system information",
        headers: { "X-Emby-Token": "YOUR_API_KEY" },
        response: '{\n  "ServerName": "My Server",\n  "Version": "10.8.x",\n  "Id": "...",\n  "OperatingSystem": "Linux"\n}',
      },
      {
        method: "GET",
        path: "/Library/VirtualFolders",
        description: "Get all libraries (virtual folders) on the server",
        headers: { "X-Emby-Token": "YOUR_API_KEY" },
        response: '[\n  {\n    "Name": "Movies",\n    "ItemId": "abc123",\n    "CollectionType": "movies"\n  }\n]',
      },
      {
        method: "POST",
        path: "/Users/New",
        description: "Create a new user account",
        headers: { "X-Emby-Token": "YOUR_API_KEY", "Content-Type": "application/json" },
        body: '{\n  "Name": "newuser",\n  "Password": "securepass123"\n}',
        response: '{\n  "Id": "user-uuid",\n  "Name": "newuser",\n  "Policy": { ... }\n}',
      },
      {
        method: "POST",
        path: "/Users/{userId}/Policy",
        description: "Set user permissions and library access (Policy object)",
        headers: { "X-Emby-Token": "YOUR_API_KEY", "Content-Type": "application/json" },
        body: '{\n  "IsAdministrator": false,\n  "IsDisabled": false,\n  "EnableAllFolders": false,\n  "EnabledFolders": ["lib-id-1", "lib-id-2"],\n  "EnableMediaPlayback": true,\n  "EnableRemoteAccess": true,\n  "MaxActiveSessions": 3\n}',
      },
      {
        method: "DELETE",
        path: "/Users/{userId}",
        description: "Delete/remove a user from the server",
        headers: { "X-Emby-Token": "YOUR_API_KEY" },
      },
      {
        method: "GET",
        path: "/Users",
        description: "Get all users on the server",
        headers: { "X-Emby-Token": "YOUR_API_KEY" },
      },
    ],
  },
  {
    platform: "Emby",
    color: "emerald",
    baseUrl: "https://emby.media/community/index.php",
    docUrl: "https://github.com/MediaBrowser/Emby/wiki/Browsing-the-Library",
    endpoints: [
      {
        method: "GET",
        path: "/System/Info",
        description: "Test connection (identical to Jellyfin API)",
        headers: { "X-Emby-Token": "YOUR_API_KEY" },
      },
      {
        method: "GET",
        path: "/Library/VirtualFolders",
        description: "Get all libraries on the server",
        headers: { "X-Emby-Token": "YOUR_API_KEY" },
      },
      {
        method: "POST",
        path: "/Users/New",
        description: "Create a new user",
        headers: { "X-Emby-Token": "YOUR_API_KEY", "Content-Type": "application/json" },
        body: '{\n  "Name": "username",\n  "Password": "password"\n}',
      },
      {
        method: "POST",
        path: "/Users/{userId}/Policy",
        description: "Set user policy (library access, permissions)",
        headers: { "X-Emby-Token": "YOUR_API_KEY", "Content-Type": "application/json" },
        body: '{\n  "IsAdministrator": false,\n  "EnableAllFolders": false,\n  "EnabledFolders": ["folder-id"],\n  "EnableMediaPlayback": true\n}',
      },
      {
        method: "DELETE",
        path: "/Users/{userId}",
        description: "Delete a user from the server",
        headers: { "X-Emby-Token": "YOUR_API_KEY" },
      },
    ],
  },
  {
    platform: "Plex",
    color: "amber",
    baseUrl: "https://plex.tv/api/v2",
    docUrl: "https://www.plexopedia.com/plex-media-server/api/",
    endpoints: [
      {
        method: "GET",
        path: "/ (server root)",
        description: "Get server info including machineIdentifier",
        headers: { "X-Plex-Token": "YOUR_TOKEN", "Accept": "application/json" },
        response: '{\n  "MediaContainer": {\n    "machineIdentifier": "abc123...",\n    "friendlyName": "My Plex Server"\n  }\n}',
      },
      {
        method: "GET",
        path: "/library/sections",
        description: "Get all library sections (movies, TV, music)",
        headers: { "X-Plex-Token": "YOUR_TOKEN", "Accept": "application/json" },
        response: '{\n  "MediaContainer": {\n    "Directory": [\n      { "key": "1", "title": "Movies", "type": "movie" }\n    ]\n  }\n}',
      },
      {
        method: "POST",
        path: "https://plex.tv/api/v2/shared_servers",
        description: "Invite/share server with a user by email. Grants access to specific library sections.",
        headers: { "X-Plex-Token": "YOUR_TOKEN", "Content-Type": "application/json" },
        body: '{\n  "machineIdentifier": "server-machine-id",\n  "invitedEmail": "user@example.com",\n  "librarySectionIds": [1, 2, 5],\n  "settings": {\n    "allowSync": false,\n    "allowCameraUpload": false\n  }\n}',
        note: "Plex uses a sharing model rather than local user creation. The invited user must have a Plex account.",
      },
      {
        method: "DELETE",
        path: "https://plex.tv/api/v2/shared_servers/{sharedServerId}",
        description: "Remove a shared user from your server",
        headers: { "X-Plex-Token": "YOUR_TOKEN" },
      },
      {
        method: "GET",
        path: "https://plex.tv/api/v2/shared_servers",
        description: "Get all users you're sharing with",
        headers: { "X-Plex-Token": "YOUR_TOKEN", "Accept": "application/json" },
      },
    ],
  },
];

const methodColors = {
  GET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  DELETE: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  PUT: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  PATCH: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

function CodeBlock({ code, label }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="mt-2">
      {label && <p className="text-xs text-zinc-500 mb-1">{label}</p>}
      <div className="relative bg-zinc-950 rounded-lg border border-zinc-800/60 p-3 group">
        <pre className="text-xs text-zinc-400 overflow-x-auto font-mono">{code}</pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

function EndpointCard({ endpoint }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-zinc-800/60 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800/20 transition-colors text-left"
      >
        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${methodColors[endpoint.method]}`}>
          {endpoint.method}
        </span>
        <code className="text-sm text-zinc-300 font-mono flex-1 truncate">{endpoint.path}</code>
        {expanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-zinc-800/40 pt-3 space-y-3">
          <p className="text-sm text-zinc-400">{endpoint.description}</p>
          {endpoint.note && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-2.5">
              <p className="text-xs text-amber-400">{endpoint.note}</p>
            </div>
          )}
          {endpoint.headers && (
            <CodeBlock
              label="Headers"
              code={Object.entries(endpoint.headers).map(([k, v]) => `${k}: ${v}`).join("\n")}
            />
          )}
          {endpoint.body && <CodeBlock label="Request Body" code={endpoint.body} />}
          {endpoint.response && <CodeBlock label="Response" code={endpoint.response} />}
        </div>
      )}
    </div>
  );
}

export default function ApiDocs() {
  const [openPlatform, setOpenPlatform] = useState("Jellyfin");

  const platformColorMap = {
    Jellyfin: "border-violet-500/30 bg-violet-500/5",
    Emby: "border-emerald-500/30 bg-emerald-500/5",
    Plex: "border-amber-500/30 bg-amber-500/5",
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100">API Documentation</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Reference for the media server APIs used for user management
        </p>
      </div>

      {/* Architecture note */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-200">Architecture Notes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-zinc-400">
          <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-800/60">
            <p className="font-medium text-zinc-300 text-xs uppercase tracking-wider mb-1">Background Workers</p>
            <p className="text-xs">Use Redis + Celery (Python) or BullMQ (Node) for expiry task scheduling. On invite creation, enqueue a delayed job at the expiry timestamp.</p>
          </div>
          <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-800/60">
            <p className="font-medium text-zinc-300 text-xs uppercase tracking-wider mb-1">Library Mapping</p>
            <p className="text-xs">Plex uses shared server model. Jellyfin/Emby use Policy objects with EnabledFolders array for library-level access.</p>
          </div>
          <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-800/60">
            <p className="font-medium text-zinc-300 text-xs uppercase tracking-wider mb-1">Token Security</p>
            <p className="text-xs">All API keys are stored encrypted. Invite tokens use crypto-random 256-bit hex strings. All links are single-use by default.</p>
          </div>
        </div>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-2">
        {apiDocs.map(doc => (
          <button
            key={doc.platform}
            onClick={() => setOpenPlatform(doc.platform)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border
              ${openPlatform === doc.platform
                ? platformColorMap[doc.platform] + " text-zinc-200"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
          >
            {doc.platform}
          </button>
        ))}
      </div>

      {/* Endpoint list */}
      {apiDocs.filter(d => d.platform === openPlatform).map(doc => (
        <div key={doc.platform} className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-200">{doc.platform} API</h2>
              <p className="text-xs text-zinc-500 font-mono">{doc.baseUrl}</p>
            </div>
            <a
              href={doc.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              Official Docs <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-2">
            {doc.endpoints.map((ep, i) => (
              <EndpointCard key={i} endpoint={ep} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}