import React, { useEffect, useState } from "react";
import PressureGraph from "../components/PressureGraph";
import proxmoxApi from "../api/proxmoxapi";

export default function StallDashboard() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadNodes() {
      try {
        const res = await proxmoxApi.get("/api/nodes");
        const fetchedNodes = res.data.nodes || [];
        if (fetchedNodes.length === 0) {
          setNodes(["fsgpu1", "fsgpu2", "fsgpu3"]);
          setErrorMsg("No nodes returned from API. Using default simulated nodes.");
        } else {
          setNodes(fetchedNodes);
        }
      } catch (err) {
        console.error("Failed to load nodes:", err);
        setErrorMsg("Failed to retrieve live node data. Using cached/simulated nodes.");
        setNodes(["fsgpu1", "fsgpu2", "fsgpu3"]);
      } finally {
        setLoading(false);
      }
    }
    loadNodes();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50/80 to-green-50/80 px-10 py-8">
        <div className="flex h-[65vh] items-center justify-center text-[15px] font-semibold text-slate-800">
          Fetching live node data...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50/80 to-green-50/80 px-10 py-8">
      <div className="mb-6 text-center text-[32px] font-bold tracking-[-0.5px] text-slate-800">
        Pressure Stall Dashboard
      </div>

      {errorMsg && (
        <div className="mb-6 mx-auto max-w-4xl rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 text-sm text-amber-800 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="text-amber-800 hover:text-amber-950 font-bold ml-4">✕</button>
        </div>
      )}

      <div className="flex w-full flex-col gap-5">
        <PressureGraph
          title="CPU Pressure Stall (Some)"
          apiPath="/api/stall/cpu"
          nodesList={nodes}
          defaultNodes={nodes}
          showFull={false}
        />

        <PressureGraph
          title="IO Pressure Stall (Some + Full)"
          apiPath="/api/stall/io"
          nodesList={nodes}
          defaultNodes={nodes}
          showFull={true}
        />

        <PressureGraph
          title="Memory Pressure Stall (Some + Full)"
          apiPath="/api/stall/mem"
          nodesList={nodes}
          defaultNodes={nodes}
          showFull={true}
        />
      </div>
    </div>
  );
}
