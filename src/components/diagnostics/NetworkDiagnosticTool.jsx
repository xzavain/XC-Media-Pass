import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import TelemetryGauge from "./TelemetryGauge";
import { Loader2, Zap, Globe, Copy, Check } from "lucide-react";
import { pingUrl, measureThroughput, detectIspAndGeo, evaluateConnection, buildDiagnosticReport } from "@/lib/diagnosticsApi";

const evalColors = {
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export default function NetworkDiagnosticTool({ servers, activeSession, sessions }) {
  const [selectedId, setSelectedId] = useState(activeSession?.server_id || servers[0]?.id || "");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [ispInfo, setIspInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  const selectedServer = servers.find((s) => s.id === selectedId);

  const runDiagnostic = async () => {
    if (!selectedServer?.ping_target_url) return;
    setRunning(true);
    setResults(null);
    try {
      const [pingResult, throughput, isp] = await Promise.all([
        pingUrl(selectedServer.ping_target_url),
        measureThroughput(25_000_000, selectedServer.speedtest_endpoint),
        detectIspAndGeo(),
      ]);
      setResults({ latency: pingResult.latency, jitter: pingResult.jitter, mbps: throughput.mbps });
      setIspInfo(isp);
    } finally {
      setRunning(false);
    }
  };

  const handleCopy = () => {
    const report = buildDiagnosticReport({
      server: selectedServer,
      ping: results?.latency,
      jitter: results?.jitter,
      mbps: results?.mbps,
      ispInfo,
      sessions,
    });
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const evaluation = results ? evaluateConnection(results.mbps, results.jitter) : null;

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Regional Speed & Latency Diagnostic</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Test your connection to a specific node edge</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 w-[200px]">
              <SelectValue placeholder="Select server" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {servers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={runDiagnostic} disabled={running || !selectedServer?.ping_target_url} className="bg-lime-600 hover:bg-lime-700 text-white gap-1.5">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {running ? "Testing..." : "Run Diagnostic"}
          </Button>
        </div>
      </div>

      {running && (
        <div className="flex justify-center py-6">
          <TelemetryGauge value="" max={100} color="#a3e635" size={100} label="Measuring..." />
        </div>
      )}

      {!running && !results && (
        <p className="text-xs text-zinc-500 text-center py-6">
          Select a server edge and click "Run Diagnostic" to measure your connection.
        </p>
      )}

      {results && !running && (
        <>
          <div className="flex justify-around flex-wrap gap-4">
            <TelemetryGauge value={results.latency} max={200} unit="ms" label="Latency" color="#6366f1" />
            <TelemetryGauge value={results.jitter} max={100} unit="ms" label="Jitter" color="#f59e0b" />
            <TelemetryGauge value={results.mbps} max={150} unit="Mbps" label="Download" color="#10b981" />
          </div>

          {evaluation && (
            <div className={`rounded-lg border px-4 py-3 ${evalColors[evaluation.color]}`}>
              <p className="text-sm font-semibold">{evaluation.label}</p>
              <p className="text-xs mt-0.5 opacity-80">{evaluation.description}</p>
            </div>
          )}

          {ispInfo && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-800/40 rounded-lg px-3 py-2">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>{ispInfo.isp || "Unknown ISP"}</span>
              <span className="text-zinc-600">•</span>
              <span>{ispInfo.asn || "N/A"}</span>
              <span className="text-zinc-600">•</span>
              <span>{ispInfo.city ? `${ispInfo.city}, ${ispInfo.country}` : "Location N/A"}</span>
            </div>
          )}

          <Button onClick={handleCopy} variant="outline" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 gap-1.5">
            {copied ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy Diagnostic Report"}
          </Button>
        </>
      )}
    </div>
  );
}