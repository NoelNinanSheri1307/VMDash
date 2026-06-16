import React, { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";
import useLazyUpdate from "../hooks/useLazyUpdate";
import proxmoxApi from "../api/proxmoxapi";

const COLORS = ["#fbbf24", "#60a5fa", "#34d399", "#f87171", "#a78bfa"];

function hexToRgba(hex, alpha = 0.2) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function buildSegments(x, y, customdata) {
  const segments = [];
  let sx = [];
  let sy = [];
  let sc = [];

  for (let i = 0; i < x.length; i++) {
    const yi = y[i];

    if (yi === null || yi === undefined) {
      if (sx.length) segments.push({ x: sx, y: sy, c: sc });
      sx = [];
      sy = [];
      sc = [];
      continue;
    }

    sx.push(x[i]);
    sy.push(yi);
    sc.push(customdata?.[i] ?? "");
  }

  if (sx.length) segments.push({ x: sx, y: sy, c: sc });
  return segments;
}

export default function PressureGraph({
  title,
  apiPath,
  nodesList,
  defaultNodes,
  showFull,
}) {
  const [selectedNodes, setSelectedNodes] = useState(defaultNodes || []);
  const [timeframe, setTimeframe] = useState("hour");
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(false);

  const lazyNodes = useLazyUpdate(selectedNodes, 350);
  const lazyTimeframe = useLazyUpdate(timeframe, 250);

  useEffect(() => {
    async function load() {
      if (!lazyNodes.length) return;

      const qs = `nodes=${lazyNodes.join(",")}&timeframe=${lazyTimeframe}&topk=5`;

      try {
        setLoading(true);
        const res = await proxmoxApi.get(`${apiPath}?${qs}`);
        setGraph(res.data);
      } catch (e) {
        console.error("Graph fetch error:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [lazyNodes, lazyTimeframe, apiPath]);

  const traces = useMemo(() => {
    if (!graph) return [];

    const x = (graph.x || []).map((ts) => new Date(ts * 1000));
    const t = [];

    (graph.series || []).forEach((s, idx) => {
      const c = COLORS[idx % COLORS.length];

      const vmText =
        (s.top_vms || []).length === x.length
          ? s.top_vms.map((arr) =>
              arr && arr.length ? arr.join(", ") : "No running VMs"
            )
          : x.map(() => "No running VMs");

      let someLegendShown = false;
      let fullLegendShown = false;

      const someSegments = buildSegments(x, s.some || [], vmText);

      someSegments.forEach((seg) => {
        t.push({
          x: seg.x,
          y: seg.y,
          type: "scatter",
          mode: "lines",
          line: { color: "rgba(0,0,0,0)", width: 0 },
          fill: "tozeroy",
          fillcolor: hexToRgba(c, 0.25),
          hoverinfo: "skip",
          showlegend: false,
          legendgroup: `${s.node}-some`,
        });

        t.push({
          x: seg.x,
          y: seg.y,
          type: "scatter",
          mode: "lines",
          line: { color: c, width: 2 },
          name: `${s.node} - some`,
          marker: { size: 8, symbol: "circle", color: c },
          legendgroup: `${s.node}-some`,
          showlegend: !someLegendShown,
          customdata: seg.c,
          hovertemplate:
            `<b>${s.node}</b><br>` +
            "Some: %{y:.2f}%<br>%{x}<br>" +
            "<b>Top VMs:</b> %{customdata}<extra></extra>",
        });

        someLegendShown = true;
      });

      if (showFull && s.full) {
        const fullSegments = buildSegments(x, s.full || [], vmText);

        fullSegments.forEach((seg) => {
          t.push({
            x: seg.x,
            y: seg.y,
            type: "scatter",
            mode: "lines",
            line: { color: "rgba(0,0,0,0)", width: 0 },
            fill: "tozeroy",
            fillcolor: hexToRgba(c, 0.12),
            hoverinfo: "skip",
            showlegend: false,
            legendgroup: `${s.node}-full`,
          });

          t.push({
            x: seg.x,
            y: seg.y,
            type: "scatter",
            mode: "lines",
            line: { color: c, width: 2, dash: "dot" },
            name: `${s.node} - full`,
            marker: { size: 8, symbol: "circle", color: c },
            legendgroup: `${s.node}-full`,
            showlegend: !fullLegendShown,
            customdata: seg.c,
            hovertemplate:
              `<b>${s.node}</b><br>` +
              "Full: %{y:.2f}%<br>%{x}<br>" +
              "<b>Top VMs:</b> %{customdata}<extra></extra>",
          });

          fullLegendShown = true;
        });
      }
    });

    return t;
  }, [graph, showFull]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-7 shadow-sm transition-shadow duration-300 hover:shadow-lg">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3 border-b-2 border-blue-600 pb-3">
        <div className="text-[18px] font-semibold text-slate-800">{title}</div>

        <select
          className="min-w-[120px] cursor-pointer rounded-lg border-[1.5px] bg-white px-3 py-2.5 font-medium text-slate-800 outline-none transition focus:border-blue-600"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
        >
          <option value="hour">Hour</option>
          <option value="day">Day</option>
          <option value="week">Week</option>
        </select>
      </div>

      {/* Node filter */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="flex w-full flex-col gap-2">
          <label className="text-sm font-medium text-slate-600">
            Nodes (Click to select multiple)
          </label>

          <div className="flex flex-wrap gap-2.5 rounded-lg border-[1.5px] border-slate-200 bg-white p-2">
            {nodesList.map((n) => {
              const active = selectedNodes.includes(n);

              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setSelectedNodes((prev) => {
                      if (prev.includes(n)) return prev.filter((x) => x !== n);
                      return [...prev, n];
                    });
                  }}
                  className={[
                    "rounded-lg border-[1.5px] px-3.5 py-2 text-sm font-medium transition",
                    active
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:border-blue-600 hover:bg-indigo-50 hover:text-blue-600",
                  ].join(" ")}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Graph */}
      {loading ? (
        <div className="flex h-[320px] items-center justify-center text-[15px] font-semibold text-slate-800">
          Loading {title}...
        </div>
      ) : (
        <div className="w-full max-w-full overflow-hidden">
          <Plot
            data={traces}
            layout={{
              height: 340,
              paper_bgcolor: "#ffffff",
              plot_bgcolor: "#ffffff",
              font: { color: "#111827" },
              hovermode: "closest",
              margin: { l: 55, r: 20, t: 10, b: 80 },

              xaxis: {
                type: "date",
                showgrid: true,
                gridcolor: "#e5e7eb",
                zeroline: false,
                linecolor: "#d1d5db",
              },

              yaxis: {
                title: "%",
                showgrid: true,
                gridcolor: "#e5e7eb",
                rangemode: "tozero",
                zeroline: false,
                linecolor: "#d1d5db",
              },

              legend: {
                orientation: "h",
                x: 0,
                y: -0.25,
                bgcolor: "rgba(255,255,255,0.9)",
                bordercolor: "#e5e7eb",
                borderwidth: 1,
              },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%" }}
          />
        </div>
      )}
    </div>
  );
}
