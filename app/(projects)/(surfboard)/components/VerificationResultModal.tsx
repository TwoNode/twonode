import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Check } from "lucide-react";

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
        return "bg-gray-100 text-gray-800 border-gray-200";
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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-gray-50">
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

          {resultData.parcelResults?.map((parcel: any, idx: number) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
              <h4 className="font-bold text-gray-900 border-b pb-2">
                Parcel {parcel.parcelIndex}
              </h4>

              {parcel.status === "NOT_VERIFIED" && parcel.error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  {parcel.error}
                </div>
              )}

              {/* Identified Anchor */}
              {parcel.anchor && (
                <div>
                  <h5 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                    Identified Anchor
                  </h5>
                  <div className="bg-gray-50 border rounded-lg p-3 text-sm font-mono flex flex-wrap gap-4">
                    <div>
                      <span className="text-gray-500">Ref:</span> E{" "}
                      {parcel.anchor.ref.easting} · N{" "}
                      {parcel.anchor.ref.northing}
                    </div>
                    <div>
                      <span className="text-gray-500">Vertex:</span>{" "}
                      <span className="text-blue-600 font-bold">
                        {parcel.anchor.vertex.id}
                      </span>{" "}
                      (E {parcel.anchor.vertex.easting} · N{" "}
                      {parcel.anchor.vertex.northing})
                    </div>
                    <div>
                      <span className="text-gray-500">Residual:</span>{" "}
                      {parcel.anchor.residual.toFixed(3)}m
                    </div>
                  </div>
                </div>
              )}

              {/* Traverse Legs Table */}
              {parcel.traverse?.legResults && (
                <div>
                  <h5 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                    Traverse Legs
                  </h5>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm text-left font-mono">
                      <thead className="bg-gray-100 text-gray-700 text-xs uppercase">
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
                        <tr className="bg-gray-50">
                          <th className="px-4 py-1 border-b text-gray-400"></th>
                          <th className="px-4 py-1 border-b text-center text-gray-500 font-normal">WCB</th>
                          <th className="px-4 py-1 border-b text-center text-gray-500 font-normal">Dist</th>
                          <th className="px-4 py-1 border-b text-center text-gray-500 font-normal">WCB</th>
                          <th className="px-4 py-1 border-b text-center text-gray-500 font-normal">Dist</th>
                          <th className="px-4 py-1 border-b"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {parcel.traverse.legResults.map((lr: any, i: number) => (
                          <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50">
                            <td className="px-4 py-2 font-bold text-gray-700">
                              {lr.fromVertex?.id} → {lr.toVertex?.id}
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
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {lr.extractedDist !== null ? (
                                <span className={lr.accepted ? "text-green-600" : "text-red-600"}>
                                  {lr.extractedDist.toFixed(2)}m
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
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
                  <h5 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
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
                          className="w-8 h-12 bg-gray-100 rounded-md relative overflow-hidden flex items-end group cursor-default"
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
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
