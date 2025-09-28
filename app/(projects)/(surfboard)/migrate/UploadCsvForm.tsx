"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { migrateSurfboardCsvAction } from "./actions";

type Result = Awaited<ReturnType<typeof migrateSurfboardCsvAction>>;

function PendingUI() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-2xl shadow text-white bg-black disabled:opacity-50"
    >
      {pending ? "Processing..." : "Run Migration"}
    </button>
  );
}

export default function UploadCsvForm() {
  const [result, setResult] = useState<Result | null>(null);

  async function action(formData: FormData) {
    const dryRun = formData.get("dryRun") === "on";
    const batchSize = Number(formData.get("batchSize") || 100);
    const res = await migrateSurfboardCsvAction(formData, {
      dryRun,
      batchSize,
      revalidatePath: "/migrate",
    });
    setResult(res);
  }

  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm"
        />
      </div>

      <div className="flex items-center gap-6">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name="dryRun"
            defaultChecked
            className="h-4 w-4"
          />
          <span className="text-sm">Dry-run</span>
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          Batch size
          <input
            type="number"
            name="batchSize"
            min={1}
            max={250}
            defaultValue={100}
            className="border rounded px-2 py-1 w-24"
          />
        </label>
      </div>

      <PendingUI />

      {result && (
        <div className="mt-6 space-y-4">
          <div className="text-sm">
            <div className="font-medium">{result.message}</div>
            {result.stats && (
              <div className="mt-1 grid grid-cols-2 gap-2 text-gray-600">
                <div>Total: {result.stats.total}</div>
                <div>Created: {result.stats.created}</div>
                <div>Updated: {result.stats.updated}</div>
                <div>Failed: {result.stats.failed}</div>
                <div>Skipped: {result.stats.skipped}</div>
                <div>Users created: {result.stats.usersCreated}</div>
                <div>Duration: {result.stats.durationMs} ms</div>
              </div>
            )}
          </div>

          {!!result.errors?.length && (
            <div className="border rounded-lg p-3">
              <div className="font-medium mb-2">
                Sample errors ({result.errors.length})
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="py-1 pr-2">Row</th>
                      <th className="py-1 pr-2 min-w-20">Plan #</th>
                      <th className="py-1 min-w-20">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.slice(0, 50).map((e, i) => (
                      <tr key={i} className="border-8 border-red-400">
                        <td className="py-1 pr-2 min-w-10">{e.row}</td>
                        <td className="py-1 pr-2 min-w-20">{e.planNumber}</td>
                        <td className="py-1 min-w-20">{e.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
