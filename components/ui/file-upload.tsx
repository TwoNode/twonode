"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UploadMode = "single" | "multi";
type Layout = "vertical" | "horizontal";

type AcceptedTypes = Record<string, string[]>;

interface FileUploaderProps {
  layout?: Layout;
  uploadMode?: UploadMode;
  defaultText?: string;
  otherText?: string;
  maxSize?: number;
  acceptedFileTypes?: string | string[];
  onFilesUploaded: (files: File[] | null) => void;
  zodSchema?: any;
  errors?: string | string[];
}

export default function FileUploader({
  layout = "vertical",
  uploadMode = "single",
  defaultText = "Select or drag and drop your files here",
  otherText = "(PDF, DOC, DOCX up to 20MB)",
  maxSize = 20 * 1024 * 1024,
  acceptedFileTypes = ".pdf,.doc,.docx",
  onFilesUploaded,
  zodSchema,
  errors: externalErrors,
}: FileUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [internalError, setInternalError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File) => {
      if (zodSchema) {
        try {
          zodSchema.parse({ file });
          return null;
        } catch (err: any) {
          return err.errors?.[0]?.message ?? "Invalid file";
        }
      }
      return null;
    },
    [zodSchema]
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (!accepted.length) {
        setInternalError("No valid files were dropped");
        return;
      }

      const processed = accepted.map((file) =>
        Object.assign(file, { preview: URL.createObjectURL(file) })
      );

      if (uploadMode === "single") {
        const err = validateFile(processed[0]);
        if (err) {
          setInternalError(err);
        } else {
          setInternalError(null);
          setFiles([processed[0]]);
          onFilesUploaded([processed[0]]);
        }
      } else {
        const errs = processed.map(validateFile).filter(Boolean);
        if (errs.length) {
          setInternalError(errs[0]!);
        } else {
          setInternalError(null);
          const all = [...files, ...processed];
          setFiles(all);
          onFilesUploaded(processed);
        }
      }
    },
    [uploadMode, validateFile, files, onFilesUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize,
    multiple: uploadMode === "multi",
  });

  const removeFile = (file: File) => {
    const updated = files.filter((f) => f !== file);
    setFiles(updated);
    setInternalError(null);
    onFilesUploaded(uploadMode === "single" ? null : updated);
  };

  const dropzoneClasses = cn(
    "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
    isDragActive
      ? "border-blue-500 bg-blue-50"
      : internalError || externalErrors
      ? "border-red-500"
      : "border-gray-300 hover:border-gray-400",
    layout === "horizontal"
      ? "flex items-center justify-center space-x-4"
      : "flex flex-col justify-center items-center space-y-2"
  );

  return (
    <div>
      {(uploadMode === "multi" || files.length === 0) && (
        <div {...getRootProps({ className: dropzoneClasses })}>
          <input {...getInputProps()} />
          <UploadIcon className="w-8 h-8 text-gray-400" />
          <p className="text-sm text-gray-600">{defaultText}</p>
          <p className="text-xs text-gray-500">{otherText}</p>
        </div>
      )}

      {(internalError || externalErrors) && (
        <p className="text-xs text-red-500 mt-2">
          {internalError ??
            (Array.isArray(externalErrors)
              ? externalErrors.join(", ")
              : externalErrors)}
        </p>
      )}

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-white rounded-md border shadow"
            >
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 rounded flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {file.name.split(".").pop()?.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col space-y-1 max-w-xs truncate">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeFile(file)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
