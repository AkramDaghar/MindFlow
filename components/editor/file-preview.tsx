"use client";

import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, Maximize2, Minimize2, Presentation, X } from "lucide-react";
import type { NodeFile, NodeFileExt } from "@/lib/types";
import {
  dataUrlToBlobUrl,
  dataUrlToBytes,
  parseDocx,
  parsePptx,
  parseXlsx,
  xlsxColLabel,
  type DocxBlock,
  type DocxRun,
  type PptxSlide,
  type XlsxSheet,
} from "@/lib/file-preview";

type PreviewState =
  | { kind: "loading" }
  | { kind: "pdf"; blobUrl: string }
  | { kind: "docx"; blocks: DocxBlock[] }
  | { kind: "pptx"; slides: PptxSlide[] }
  | { kind: "xlsx"; sheets: XlsxSheet[] }
  | { kind: "unsupported"; message: string };

function FileHeaderIcon({ ext }: { ext: NodeFileExt }) {
  switch (ext) {
    case "pdf":
      return <FileText size={16} className="shrink-0 text-rose-500" />;
    case "doc":
    case "docx":
      return <FileText size={16} className="shrink-0 text-blue-500" />;
    case "pptx":
      return <Presentation size={16} className="shrink-0 text-amber-500" />;
    case "xlsx":
      return <FileSpreadsheet size={16} className="shrink-0 text-emerald-500" />;
  }
}

function renderRuns(runs: DocxRun[]) {
  return runs.map((r, i) => (
    <span
      key={i}
      className={`${r.bold ? "font-semibold" : ""} ${r.italic ? "italic" : ""}`}
    >
      {r.text}
    </span>
  ));
}

export function FilePreview({ file, onClose }: { file: NodeFile; onClose: () => void }) {
  const [state, setState] = useState<PreviewState>({ kind: "loading" });
  const [activeSheet, setActiveSheet] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setActiveSheet(0);
    let createdBlobUrl: string | null = null;

    if (file.ext === "pdf") {
      try {
        createdBlobUrl = dataUrlToBlobUrl(file.dataUrl);
        setState({ kind: "pdf", blobUrl: createdBlobUrl });
      } catch {
        setState({ kind: "unsupported", message: "Could not load PDF preview." });
      }
      return () => {
        if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
      };
    }

    if (file.ext === "doc") {
      setState({
        kind: "unsupported",
        message: "Browser preview is not available for legacy .doc files. Download the file to open it.",
      });
      return;
    }

    setState({ kind: "loading" });
    try {
      const bytes = dataUrlToBytes(file.dataUrl);
      if (file.ext === "docx") {
        setState({ kind: "docx", blocks: parseDocx(bytes) });
      } else if (file.ext === "pptx") {
        setState({ kind: "pptx", slides: parsePptx(bytes) });
      } else if (file.ext === "xlsx") {
        setState({ kind: "xlsx", sheets: parseXlsx(bytes) });
      }
    } catch {
      setState({
        kind: "unsupported",
        message: "Could not render a preview for this file. You can download it instead.",
      });
    }
  }, [file]);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = file.dataUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <aside
      aria-label="File preview"
      className={`absolute inset-y-3 right-3 z-20 flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white/95 shadow-2xl backdrop-blur transition-[width,left] duration-200 dark:border-neutral-800 dark:bg-neutral-950/95 ${
        expanded
          ? "left-3"
          : "w-[380px] max-w-[calc(100%-1.5rem)] sm:w-[440px] lg:w-[500px]"
      }`}
    >
      {/* Top header with Download & Close on top right */}
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-neutral-200 px-3 dark:border-neutral-800">
        <div className="flex min-w-0 items-center gap-2">
          <FileHeaderIcon ext={file.ext} />
          <span className="truncate text-sm font-medium" title={file.name}>
            {file.name}
          </span>
          <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            {file.ext}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            title="Download file"
            aria-label="Download file"
          >
            <Download size={15} />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            title={expanded ? "Restore preview width" : "Full width preview"}
            aria-label={expanded ? "Restore preview width" : "Full width preview"}
            aria-pressed={expanded}
          >
            {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            title="Close preview"
            aria-label="Close preview"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {state.kind === "loading" && (
          <div className="flex flex-1 items-center justify-center text-neutral-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        )}

        {state.kind === "pdf" && (
          <iframe
            src={state.blobUrl}
            title={file.name}
            className="h-full w-full flex-1 border-0 bg-neutral-100 dark:bg-neutral-900"
          />
        )}

        {state.kind === "docx" && (
          <div className="flex-1 space-y-3 overflow-y-auto p-5 text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
            {state.blocks.length === 0 ? (
              <p className="text-neutral-400">This document appears to be empty.</p>
            ) : (
              state.blocks.map((block, i) => {
                if (block.kind === "heading") {
                  const cls =
                    block.level === 1
                      ? "text-lg font-semibold mt-2"
                      : block.level === 2
                        ? "text-base font-semibold mt-2"
                        : "text-sm font-semibold mt-1";
                  return (
                    <p key={i} className={cls}>
                      {renderRuns(block.runs)}
                    </p>
                  );
                }
                if (block.kind === "table") {
                  return (
                    <div key={i} className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
                      <table className="w-full border-collapse text-xs">
                        <tbody>
                          {block.rows.map((row, ri) => (
                            <tr
                              key={ri}
                              className="border-b border-neutral-200 last:border-b-0 dark:border-neutral-800"
                            >
                              {row.map((cell, ci) => (
                                <td
                                  key={ci}
                                  className="border-r border-neutral-200 px-2.5 py-1.5 align-top last:border-r-0 dark:border-neutral-800"
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                return (
                  <p key={i} className={block.bullet ? "pl-4 before:mr-2 before:content-['•']" : ""}>
                    {renderRuns(block.runs)}
                  </p>
                );
              })
            )}
          </div>
        )}

        {state.kind === "pptx" && (
          <div className="flex-1 space-y-4 overflow-y-auto bg-neutral-50/70 p-4 dark:bg-neutral-900/40">
            {state.slides.length === 0 ? (
              <p className="text-center text-sm text-neutral-400">No slides found in this presentation.</p>
            ) : (
              state.slides.map((slide) => (
                <div
                  key={slide.index}
                  className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Slide {slide.index}
                  </p>
                  {slide.paragraphs.length === 0 ? (
                    <p className="text-xs italic text-neutral-400">(No text on this slide)</p>
                  ) : (
                    <div className="space-y-1.5 text-sm text-neutral-800 dark:text-neutral-200">
                      {slide.paragraphs.map((p, idx) => (
                        <p key={idx} className={idx === 0 ? "font-semibold" : "text-neutral-600 dark:text-neutral-300"}>
                          {p}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {state.kind === "xlsx" && (() => {
          const sheet = state.sheets[activeSheet];
          if (!sheet) {
            return (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-neutral-400">
                No worksheets found.
              </div>
            );
          }
          const colCount = sheet.rows[0]?.length ?? 0;
          return (
            <div className="flex min-h-0 flex-1 flex-col">
              {state.sheets.length > 1 && (
                <div className="flex gap-1 overflow-x-auto border-b border-neutral-200 bg-neutral-50 px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-900/60">
                  {state.sheets.map((s, idx) => (
                    <button
                      key={s.name + idx}
                      type="button"
                      onClick={() => setActiveSheet(idx)}
                      className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        idx === activeSheet
                          ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white"
                          : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex-1 overflow-auto">
                {sheet.rows.length === 0 ? (
                  <p className="p-6 text-center text-sm text-neutral-400">Empty worksheet</p>
                ) : (
                  <table className="w-full border-collapse text-xs">
                    <thead className="sticky top-0 bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                      <tr>
                        <th className="w-10 border-b border-r border-neutral-200 px-2 py-1 text-center font-medium dark:border-neutral-800" />
                        {Array.from({ length: colCount }, (_, ci) => (
                          <th
                            key={ci}
                            className="min-w-[80px] border-b border-r border-neutral-200 px-2 py-1 text-left font-medium dark:border-neutral-800"
                          >
                            {xlsxColLabel(ci)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.rows.map((row, ri) => (
                        <tr key={ri} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40">
                          <td className="border-b border-r border-neutral-200 bg-neutral-50 px-2 py-1 text-center text-[11px] tabular-nums text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900/60">
                            {ri + 1}
                          </td>
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className="max-w-[220px] truncate border-b border-r border-neutral-200 px-2 py-1 text-neutral-800 dark:border-neutral-800 dark:text-neutral-200"
                              title={cell}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {sheet.truncated && (
                  <p className="p-3 text-center text-xs text-neutral-400">
                    Showing the first 300 rows. Download the file to view everything.
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {state.kind === "unsupported" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <FileHeaderIcon ext={file.ext} />
            <p className="max-w-xs text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              {state.message}
            </p>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              <Download size={13} /> Download {file.name}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
