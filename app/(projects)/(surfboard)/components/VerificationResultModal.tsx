import React, { useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Check } from "lucide-react";

interface TraverseCanvasMapProps {
  csvVertices: any[];
  legResults: any[];
  anchor: any;
}

export function TraverseCanvasMap({ csvVertices, legResults, anchor }: TraverseCanvasMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set dimensions based on parent container
    const W = canvas.parentElement?.clientWidth || 600;
    const H = 300;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#0f172a"; // slate-900 slate dark mode bg
    ctx.fillRect(0, 0, W, H);

    if (!csvVertices || csvVertices.length === 0) return;

    const pad = 40;
    // Extract coordinates
    const allE = csvVertices.map((v) => Number(v.easting));
    const allN = csvVertices.map((v) => Number(v.northing));
    const minE = Math.min(...allE);
    const maxE = Math.max(...allE);
    const minN = Math.min(...allN);
    const maxN = Math.max(...allN);
    const rangeE = maxE - minE || 1;
    const rangeN = maxN - minN || 1;
    const scale = Math.min((W - pad * 2) / rangeE, (H - pad * 2) / rangeN);
    const toX = (e: number) => pad + (e - minE) * scale;
    const toY = (n: number) => H - pad - (n - minN) * scale;

    // Draw grid lines
    ctx.strokeStyle = "#1e293b"; // slate-800
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const x = pad + (W - pad * 2) * i / 4;
      ctx.beginPath();
      ctx.moveTo(x, pad);
      ctx.lineTo(x, H - pad);
      ctx.stroke();

      const y = pad + (H - pad * 2) * i / 4;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(W - pad, y);
      ctx.stroke();
    }

    const legStatus: Record<string, boolean> = {};
    (legResults || []).forEach((lr) => {
      const fromId = lr.fromVertex?.id || lr.fromVertex?.pillarNumber || lr.fromVertex?.pillar || lr.fromVertex?.point || lr.fromVertex?.no;
      const toId = lr.toVertex?.id || lr.toVertex?.pillarNumber || lr.toVertex?.pillar || lr.toVertex?.point || lr.toVertex?.no;
      if (fromId && toId) {
        legStatus[`${fromId}->${toId}`] = lr.accepted;
      }
    });

    // Draw polygon interior fill
    ctx.beginPath();
    csvVertices.forEach((v, i) => {
      if (i === 0) ctx.moveTo(toX(Number(v.easting)), toY(Number(v.northing)));
      else ctx.lineTo(toX(Number(v.easting)), toY(Number(v.northing)));
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(16, 185, 129, 0.04)"; // emerald-500 with low opacity
    ctx.fill();

    // Draw legs
    const nv = csvVertices.length;
    for (let i = 0; i < nv; i++) {
      const from = csvVertices[i];
      const to = csvVertices[(i + 1) % nv];
      const fromId = from.id || from.pillarNumber || from.pillar || from.point || from.no;
      const toId = to.id || to.pillarNumber || to.pillar || to.point || to.no;
      const key = `${fromId}->${toId}`;
      const st = legStatus[key];

      ctx.beginPath();
      ctx.moveTo(toX(Number(from.easting)), toY(Number(from.northing)));
      ctx.lineTo(toX(Number(to.easting)), toY(Number(to.northing)));

      if (st === true) {
        ctx.strokeStyle = "#10b981"; // emerald-500 (Leg OK)
        ctx.lineWidth = 3;
      } else if (st === false) {
        ctx.strokeStyle = "#ef4444"; // red-500 (Failed Leg)
        ctx.lineWidth = 3.5;
      } else {
        ctx.strokeStyle = "#64748b"; // slate-500
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw vertices
    csvVertices.forEach((v) => {
      ctx.beginPath();
      ctx.arc(toX(Number(v.easting)), toY(Number(v.northing)), 5, 0, Math.PI * 2);
      ctx.fillStyle = "#10b981"; // emerald-500
      ctx.fill();

      // Vertex label
      ctx.fillStyle = "#cbd5e1"; // slate-300
      ctx.font = "bold 11px monospace";
      const name = v.id || v.pillarNumber || v.pillar || v.point || v.no || "";
      ctx.fillText(String(name), toX(Number(v.easting)) + 8, toY(Number(v.northing)) - 4);
    });

    // Draw anchor highlight if present
    if (anchor && anchor.vertex) {
      const ax = toX(Number(anchor.vertex.easting));
      const ay = toY(Number(anchor.vertex.northing));
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 10 : 5;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(ax + r * Math.cos(a), ay + r * Math.sin(a));
        else ctx.lineTo(ax + r * Math.cos(a), ay + r * Math.sin(a));
      }
      ctx.closePath();
      ctx.fillStyle = "#f59e0b"; // amber-500 star
      ctx.fill();
    }

    // Coordinates overlay labels
    ctx.fillStyle = "#475569"; // slate-600
    ctx.font = "9px monospace";
    ctx.fillText(`E: ${minE.toFixed(0)}`, pad, H - 8);
    ctx.fillText(`E: ${maxE.toFixed(0)}`, W - pad - 60, H - 8);

    ctx.save();
    ctx.translate(12, H - pad);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`N: ${minN.toFixed(0)}`, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(12, pad + 40);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`N: ${maxN.toFixed(0)}`, 0, 0);
    ctx.restore();

  }, [csvVertices, legResults, anchor]);

  return (
    <div className="w-full border rounded-xl overflow-hidden bg-slate-950 relative shadow-sm">
      <canvas ref={canvasRef} className="block w-full h-75" />
      <div className="absolute bottom-3 right-3 bg-slate-900/90 border border-slate-700/50 rounded px-2.5 py-1.5 text-[10px] font-mono flex flex-col gap-1 text-slate-300">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Leg OK</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>Failed Leg</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Anchor</span>
        </div>
      </div>
    </div>
  );
}

interface VerificationResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultData: any | null;
  planNumber: string;
}

export function VerificationResultModal({
  isOpen,
  onClose,
  resultData,
  planNumber,
}: VerificationResultModalProps) {
  if (!resultData) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "bg-green-100 text-green-800 border-green-200";
      case "REVIEW":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "NOT_VERIFIED":
      case "ERROR":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 dark:bg-white/10 text-gray-800 border-gray-200 dark:border-white/10";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "REVIEW":
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case "NOT_VERIFIED":
      case "ERROR":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-gray-50 dark:bg-white/5">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Record Copy Verification: {planNumber}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Overall Verdict Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${getStatusColor(
              resultData.overallVerdict
            )}`}
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(resultData.overallVerdict)}
              <div>
                <h3 className="font-bold text-lg">
                  {resultData.overallVerdict === "VERIFIED"
                    ? "VERIFIED - PASS"
                    : resultData.overallVerdict === "REVIEW"
                    ? "NEEDS REVIEW"
                    : "NOT VERIFIED - FAIL"}
                </h3>
                <p className="text-sm opacity-80">
                  Overall Match Confidence:{" "}
                  {Math.round(resultData.overallScore)}%
                </p>
              </div>
            </div>
          </div>

          {resultData.parcelResults?.map((parcel: any, idx: number) => {
            // Reconstruct vertices from computedLegs
            const csvVertices = parcel.traverse?.computedLegs?.map((leg: any) => leg.from) || [];

            // Compute detailed list of issues
            const issues: string[] = [];
            if (parcel.score?.errors) {
              parcel.score.errors.forEach((e: any) => {
                issues.push(`❌ ${e.msg}`);
              });
            }
            if (parcel.pdfArea !== null && parcel.pdfArea !== undefined && !parcel.areaMatch) {
              const diffVal = parcel.areaDiff !== null && parcel.areaDiff !== undefined ? parcel.areaDiff.toFixed(4) : "N/A";
              const csvAreaVal = parcel.csvArea ? parcel.csvArea.toFixed(3) : "N/A";
              const pdfAreaVal = parcel.pdfArea ? parcel.pdfArea.toFixed(3) : "N/A";
              issues.push(`❌ Area mismatch: CSV ${csvAreaVal} sq m vs PDF ${pdfAreaVal} sq m (diff ${diffVal} sq m)`);
            }
            
            // Check reference coordinate is first vertex
            const firstVertexId = parcel.firstCsvVertexId;
            const anchorVertexId = parcel.anchor?.vertex?.id || parcel.anchor?.vertex?.pillarNumber || parcel.anchor?.vertex?.pillar || parcel.anchor?.vertex?.point || parcel.anchor?.vertex?.no;
            if (anchorVertexId && firstVertexId && String(anchorVertexId).trim() !== String(firstVertexId).trim()) {
              issues.push(`⚠️ The reference coordinate matched CSV vertex ${anchorVertexId} which is not the first coordinate in your CSV (first is ${firstVertexId}). Please reconfirm you have quoted the correct reference coordinate to avoid query from the MDA.`);
            }

            if (parcel.pdfArea === null || parcel.pdfArea === undefined) {
              issues.push(`⚠️ Area not stated on PDF — cannot validate.`);
            }
            if (parcel.traverse?.warnings) {
              parcel.traverse.warnings.forEach((w: string) => {
                issues.push(`⚠️ ${w}`);
              });
            }

            return (
              <div key={idx} className="bg-white dark:bg-surface rounded-xl shadow-sm border p-6 space-y-6">
                <h4 className="font-bold text-gray-900 dark:text-white border-b pb-2">
                  Parcel {parcel.parcelIndex}
                </h4>

                {parcel.status === "NOT_VERIFIED" && parcel.error && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    {parcel.error}
                  </div>
                )}

                {/* Traverse Map Plotting */}
                {csvVertices.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                      Traverse Map
                    </h5>
                    <div className="mb-4">
                      <TraverseCanvasMap
                        csvVertices={csvVertices}
                        legResults={parcel.traverse.legResults}
                        anchor={parcel.anchor}
                      />
                    </div>
                  </div>
                )}

                {/* Identified Anchor */}
                {parcel.anchor && (
                  <div>
                    <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                      Identified Anchor
                    </h5>
                    <div className="bg-gray-50 dark:bg-white/5 border rounded-lg p-3 text-sm font-mono flex flex-wrap gap-4">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Ref:</span> E{" "}
                        {parcel.anchor.ref.easting} · N{" "}
                        {parcel.anchor.ref.northing}
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Vertex:</span>{" "}
                        <span className="text-blue-600 font-bold">
                          {parcel.anchor.vertex.id || parcel.anchor.vertex.pillarNumber || parcel.anchor.vertex.pillar || parcel.anchor.vertex.point || parcel.anchor.vertex.no || "Anchor"}
                        </span>{" "}
                        (E {parcel.anchor.vertex.easting} · N{" "}
                        {parcel.anchor.vertex.northing})
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Residual:</span>{" "}
                        {parcel.anchor.residual.toFixed(3)}m
                      </div>
                    </div>
                  </div>
                )}

                {/* Traverse Legs Table */}
                {parcel.traverse?.legResults && (
                  <div>
                    <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                      Traverse Legs
                    </h5>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm text-left font-mono">
                        <thead className="bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs uppercase">
                          <tr>
                            <th className="px-4 py-2 border-b">Leg</th>
                            <th className="px-4 py-2 border-b text-center" colSpan={2}>
                              Computed (CSV)
                            </th>
                            <th className="px-4 py-2 border-b text-center" colSpan={2}>
                              Extracted (PDF)
                            </th>
                            <th className="px-4 py-2 border-b text-center">Status</th>
                          </tr>
                          <tr className="bg-gray-50 dark:bg-white/5">
                            <th className="px-4 py-1 border-b text-gray-400 dark:text-gray-500"></th>
                            <th className="px-4 py-1 border-b text-center text-gray-500 dark:text-gray-400 font-normal">WCB</th>
                            <th className="px-4 py-1 border-b text-center text-gray-500 dark:text-gray-400 font-normal">Dist</th>
                            <th className="px-4 py-1 border-b text-center text-gray-500 dark:text-gray-400 font-normal">WCB</th>
                            <th className="px-4 py-1 border-b text-center text-gray-500 dark:text-gray-400 font-normal">Dist</th>
                            <th className="px-4 py-1 border-b"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {parcel.traverse.legResults.map((lr: any, i: number) => (
                            <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50">
                              <td className="px-4 py-2 font-bold text-gray-700 dark:text-gray-300">
                                {(lr.fromVertex?.id || lr.fromVertex?.pillarNumber || lr.fromVertex?.pillar || lr.fromVertex?.point || lr.fromVertex?.no || "?")} → {(lr.toVertex?.id || lr.toVertex?.pillarNumber || lr.toVertex?.pillar || lr.toVertex?.point || lr.toVertex?.no || "?")}
                              </td>
                              <td className="px-4 py-2 text-center text-blue-600">
                                {lr.computedWCB.toFixed(4)}°
                              </td>
                              <td className="px-4 py-2 text-center text-blue-600">
                                {lr.computedDist.toFixed(2)}m
                              </td>
                              <td className="px-4 py-2 text-center">
                                {lr.extractedWCB !== null ? (
                                  <span className={lr.accepted ? "text-green-600" : "text-red-600"}>
                                    {lr.extractedWCB.toFixed(4)}°
                                  </span>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {lr.extractedDist !== null ? (
                                  <span className={lr.accepted ? "text-green-600" : "text-red-600"}>
                                    {lr.extractedDist.toFixed(2)}m
                                  </span>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-center flex justify-center">
                                {lr.accepted ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Confidence Bars */}
                {parcel.score?.scores && (
                  <div>
                    <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                      Vertex Confidence
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {parcel.score.scores.map((s: any, i: number) => {
                        const colorClass =
                          s.legPct >= 95
                            ? "bg-green-500"
                            : s.legPct >= 80
                            ? "bg-amber-500"
                            : "bg-red-500";
                        return (
                          <div
                            key={i}
                            className="w-8 h-12 bg-gray-100 dark:bg-white/10 rounded-md relative overflow-hidden flex items-end group cursor-default"
                            title={`${s.fromId}→${s.toId}: ${s.legPct.toFixed(0)}%`}
                          >
                            <div
                              className={`w-full ${colorClass} transition-all`}
                              style={{ height: `${s.legPct}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/60 text-[10px] text-white font-bold transition-opacity">
                              {Math.round(s.legPct)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reference Coordinate Warning Banner */}
                {anchorVertexId && firstVertexId && anchorVertexId !== firstVertexId && (
                  <div className="bg-amber-50/80 border border-amber-300 rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>
                        The reference coordinate matched CSV vertex <strong>{anchorVertexId}</strong> which is not the first coordinate in your CSV (first is <strong>{firstVertexId}</strong>). Please reconfirm you have quoted the correct reference coordinate to avoid query from the MDA.
                      </span>
                    </p>
                  </div>
                )}

                {/* Issues section */}
                {issues.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                      Issues / Warnings
                    </h5>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                      {issues.map((issue, idx) => (
                        <p
                          key={idx}
                          className={`text-sm ${
                            issue.startsWith("❌")
                              ? "text-red-700 font-medium"
                              : "text-amber-800"
                          }`}
                        >
                          {issue}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
