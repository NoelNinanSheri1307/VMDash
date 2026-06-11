import React, { useState } from "react";

const AddCluster = () => {
  const [clusterName, setClusterName] = useState("");
  const [clusterIp, setClusterIp] = useState("");
  const [sshToken, setSshToken] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex flex-col items-center justify-start py-12 px-2">
      <h1 className="text-4xl font-bold text-slate-800 text-center mb-8 mt-4">
        Add New Cluster
      </h1>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-auto p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-800 text-left leading-tight">Cluster Details</h2>
          <div className="h-0.5 w-full bg-blue-400 rounded mt-2 mb-1"></div>
        </div>
        <form className="flex flex-col gap-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6 w-full">
            <div className="flex flex-col w-full md:w-1/2">
              <label className="font-semibold text-slate-700 mb-2">
                Cluster Name
              </label>
              <input
                type="text"
                className="border border-blue-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                placeholder="Enter cluster name"
                value={clusterName}
                onChange={(e) => setClusterName(e.target.value)}
              />
            </div>
            <div className="flex flex-col w-full md:w-1/2">
              <label className="font-semibold text-slate-700 mb-2">
                Cluster IP
              </label>
              <input
                type="text"
                className="border border-blue-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                placeholder="Enter cluster IP"
                value={clusterIp}
                onChange={(e) => setClusterIp(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col w-full">
            <label className="font-semibold text-slate-700 mb-2">
              SSH Token
            </label>
            <input
              type="text"
              className="border border-blue-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              placeholder="Enter SSH token"
              value={sshToken}
              onChange={(e) => setSshToken(e.target.value)}
            />
          </div>
        </form>
        <div className="flex justify-center mt-2">
          <button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-lg shadow transition text-lg"
          >
            Add Cluster
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCluster;

