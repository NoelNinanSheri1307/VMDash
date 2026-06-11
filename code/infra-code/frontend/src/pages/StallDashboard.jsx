import React, { useEffect, useState } from "react";
import PressureGraph from "../components/PressureGraph";

const API = "/api/proxmox";

export default function StallDashboard() {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    async function loadNodes() {
      const res = await fetch(`${API}/api/nodes`);
      const json = await res.json();
      setNodes(json.nodes || []);
    }
    loadNodes();
  }, []);

  if (!nodes.length) {
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
