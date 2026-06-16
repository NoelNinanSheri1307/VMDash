import React, { useMemo, useState } from "react";

const ReportPopup = ({
  availableColumns,
  selectedColumns,
  setSelectedColumns,
  selectedFormat,
  setSelectedFormat,
  onClose,
  onDownload,
  onSave,
  errorMsg,
  setErrorMsg,
}) => {
  const [highlightedAvailable, setHighlightedAvailable] = useState([]);
  const [highlightedSelected, setHighlightedSelected] = useState([]);

  const leftColumns = useMemo(() => {
    return availableColumns.filter((col) => !selectedColumns.includes(col.key));
  }, [availableColumns, selectedColumns]);

  const toggleHighlight = (key, list, setter) => {
    if (list.includes(key)) setter(list.filter((x) => x !== key));
    else setter([...list, key]);
  };

  const handleAdd = () => {
    if (highlightedAvailable.length === 0) return;
    setSelectedColumns((prev) => [...prev, ...highlightedAvailable]);
    setHighlightedAvailable([]);
  };

  const handleRemove = () => {
    if (highlightedSelected.length === 0) return;
    setSelectedColumns((prev) =>
      prev.filter((key) => !highlightedSelected.includes(key))
    );
    setHighlightedSelected([]);
  };

  const handleSelectAll = () => {
    setSelectedColumns(availableColumns.map((c) => c.key));
    setHighlightedAvailable([]);
    setHighlightedSelected([]);
  };

  const handleDeselectAll = () => {
    setSelectedColumns([]);
    setHighlightedAvailable([]);
    setHighlightedSelected([]);
  };

  const getLabel = (key) => {
    return availableColumns.find((c) => c.key === key)?.label || key;
  };

  const listBoxClass =
    "list-none m-0 p-[10px] border border-slate-200 rounded-xl bg-white h-[260px] overflow-y-auto";

  const itemClass =
    "px-[10px] py-[9px] mb-2 cursor-pointer rounded-lg text-[13px] text-slate-700 border border-transparent hover:bg-sky-100 hover:border-blue-200";

  const activeItemClass =
    "bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.35)] text-blue-900 font-semibold before:content-['✓'] before:font-extrabold before:mr-[10px] before:text-blue-600";

  return (
    <div
      className="fixed inset-0 bg-[rgba(15,23,42,0.45)] flex justify-center items-center z-[1000] p-2"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-[0_10px_28px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto px-4 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="m-0 mb-4 px-4 py-3 rounded-xl bg-sky-50 border border-slate-200 text-[18px] font-bold text-slate-800">
          Customize Report
        </h2>

        {errorMsg && (
          <div className="mb-4 mx-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-800 flex items-center justify-between">
            <span>{errorMsg}</span>
            {setErrorMsg && (
              <button onClick={() => setErrorMsg("")} className="text-rose-800 hover:opacity-80 font-bold ml-3">✕</button>
            )}
          </div>
        )}

        <div className="flex flex-row items-start gap-8 min-h-[320px]">
          <div className="flex-1 flex flex-col">
            <h3 className="m-0 mb-2 text-[15px] font-semibold text-slate-800">
              Available Columns
            </h3>

            <ul className={listBoxClass}>
              {leftColumns.map((col, idx) => (
                <li
                  key={col.key}
                  className={`${itemClass} ${
                    highlightedAvailable.includes(col.key)
                      ? activeItemClass
                      : ""
                  } ${idx === leftColumns.length - 1 ? "mb-0" : ""}`}
                  onClick={() =>
                    toggleHighlight(
                      col.key,
                      highlightedAvailable,
                      setHighlightedAvailable
                    )
                  }
                >
                  {col.label}
                </li>
              ))}
            </ul>

            <div className="flex gap-4 mt-4">
              <button
                onClick={handleSelectAll}
                className="px-6 py-2 rounded-lg border border-slate-200 bg-white text-[14px] font-semibold text-slate-700 hover:bg-sky-50 hover:border-blue-500"
              >
                Select All
              </button>

              <button
                onClick={handleDeselectAll}
                className="px-6 py-2 rounded-lg border border-slate-200 bg-white text-[14px] font-semibold text-slate-700 hover:bg-sky-50 hover:border-blue-500"
              >
                Deselect All
              </button>
            </div>

            <div className="mt-6">
              <h3 className="m-0 mb-2 text-[15px] font-semibold text-slate-800">
                Select Format
              </h3>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-[260px] px-4 py-3 rounded-xl border border-slate-200 text-[14px] text-slate-800 cursor-pointer bg-white"
              >
                <option value="">---Select Format---</option>
                <option value="pdf">PDF</option>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="xls">Excel</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-4 items-center mx-2 self-stretch justify-center">
            <button
              onClick={handleAdd}
              className="w-[120px] py-2 rounded-xl btn-premium-primary text-xs font-bold"
            >
              Add →
            </button>
            <button
              onClick={handleRemove}
              className="w-[120px] py-2 rounded-xl btn-premium-primary text-xs font-bold"
            >
              ← Remove
            </button>
          </div>

          <div className="flex-1 flex flex-col">
            <h3 className="m-0 mb-2 text-[15px] font-semibold text-slate-800">
              Selected Columns
            </h3>

            <ul className={listBoxClass}>
              {selectedColumns.map((key, idx) => (
                <li
                  key={key}
                  className={`${itemClass} ${
                    highlightedSelected.includes(key) ? activeItemClass : ""
                  } ${idx === selectedColumns.length - 1 ? "mb-0" : ""}`}
                  onClick={() =>
                    toggleHighlight(
                      key,
                      highlightedSelected,
                      setHighlightedSelected
                    )
                  }
                >
                  {getLabel(key)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200">
          <div className="flex gap-2">
            <button
              onClick={onDownload}
              className="px-6 py-2 rounded-xl btn-premium-success text-[13px] font-bold"
            >
              Download
            </button>
            {onSave && (
              <button
                onClick={onSave}
                className="px-6 py-2 rounded-xl btn-premium-primary text-[13px] font-bold"
              >
                Save Config
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl btn-premium-danger text-[13px] font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportPopup;

