import UploadCsvForm from "./UploadCsvForm";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Surfboard CSV Migration</h1>
      <p className="text-sm text-gray-500">
        Upload <code>SurfBoardDB Migration+.csv</code>. Choose dry-run first.
      </p>
      <UploadCsvForm />
    </div>
  );
}
