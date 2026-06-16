import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function AddVM() {
  const navigate = useNavigate();

  const [vmData, setVmData] = useState({
    vm_name: "",
    host_name: "",
    environment: "",
    cluster: "",
    ram: "",
    cores: "",
    ip: "",
    mac: "",
    os: "",
    disk_size: "",
    source: "",
    narc: "",
    time_created: "",
    gpu: "",
  });

  const [users, setUsers] = useState([
    { staff_code: "", name: "", center: "", entity: "", groupname: "", division: "", section: "" },
  ]);

  const [suggestions, setSuggestions] = useState({});

  const handleVmChange = (e) => {
    setVmData({ ...vmData, [e.target.name]: e.target.value });
  };

  const handleUserChange = async (index, e) => {
    const { name, value } = e.target;
    const updatedUsers = [...users];
    updatedUsers[index][name] = value;
    setUsers(updatedUsers);

    // Auto-fetch suggestions for staff_code
    if (name === "staff_code" && value.length >= 2) {
      try {
        const res = await axios.get(`${process.env.REACT_APP_HOST_URL}/staff/search?q=${value}`);
        setSuggestions({ [index]: res.data });
      } catch (err) {
        console.error(err);
      }
    } else {
      setSuggestions({ [index]: [] });
    }
  };

  const handleSuggestionSelect = (index, emp) => {
    const updatedUsers = [...users];
    updatedUsers[index] = emp; // autofill all fields
    setUsers(updatedUsers);
    setSuggestions({ [index]: [] }); // clear suggestions
  };

  const addUserField = () => {
    setUsers([...users, { staff_code: "", name: "", center: "", entity: "", groupname: "", division: "", section: "" }]);
  };

  const removeUserField = (index) => {
    const updatedUsers = users.filter((_, i) => i !== index);
    setUsers(updatedUsers);
  };

  const HOST_URL = process.env.REACT_APP_HOST_URL;
  const handleSubmit = (e) => {
    e.preventDefault();
    axios
      .post(`${HOST_URL}/vms`, { ...vmData, users })
      .then((res) => navigate("/dashboard"))
      .catch((err) => console.error(err));
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-[#0B1220] dark:to-[#0d1627] text-slate-800 dark:text-slate-100 px-6 py-8 flex flex-col items-center">
      <h1 className="w-full max-w-[1100px] text-center text-slate-800 dark:text-white font-bold text-3xl md:text-[32px] tracking-tight mb-7">
        Add New VM
      </h1>

      <form onSubmit={handleSubmit} className="w-full max-w-[1100px]">
        {/* VM DETAILS SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-7 mb-8 shadow-md transition hover:shadow-lg text-slate-800 dark:text-slate-250">
          <div className="flex items-center gap-3 text-lg font-semibold text-slate-800 dark:text-slate-100 mb-5 pb-2 border-b-2 border-blue-600 dark:border-blue-500">
            <svg
              className="w-6 h-6 text-blue-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <span>VM Details</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Object.keys(vmData).map((key) => (
              <div key={key} className="flex flex-col">
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-2 text-sm capitalize">
                  {key.replace(/_/g, " ")}
                </label>

                <input
                  type="text"
                  name={key}
                  value={vmData[key]}
                  onChange={handleVmChange}
                  placeholder={key === "time_created" ? "YYYY-MM-DD" : `Enter ${key.replace(/_/g, " ")}`}
                  required={key === "vm_name"}
                  className="
                    w-full px-3.5 py-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white
                    transition
                    focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                    placeholder:text-slate-400 dark:placeholder:text-slate-500
                    [&:not(:placeholder-shown)]:bg-blue-50/50 [&:not(:placeholder-shown)]:border-blue-200
                    dark:[&:not(:placeholder-shown)]:bg-blue-950/20 dark:[&:not(:placeholder-shown)]:border-blue-900/40
                  "
                />
              </div>
            ))}
          </div>
        </div>

        {/* USER DETAILS SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-7 mb-8 shadow-md transition hover:shadow-lg text-slate-800 dark:text-slate-250">
          <div className="flex items-center gap-3 text-lg font-semibold text-slate-800 dark:text-slate-100 mb-5 pb-2 border-b-2 border-blue-600 dark:border-blue-500">
            <svg
              className="w-6 h-6 text-blue-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>User Details</span>
          </div>

          {users.map((user, index) => (
            <div
              key={index}
              className="bg-slate-50/50 dark:bg-slate-950/40 p-7 rounded-xl border border-slate-200 dark:border-slate-800 mb-5 shadow-sm text-slate-800 dark:text-slate-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {Object.keys(user).map((key) => (
                  <div key={key} className="flex flex-col">
                    <label className="block font-medium text-slate-600 dark:text-slate-400 mb-2 text-sm capitalize">
                      {key.replace(/_/g, " ")}
                    </label>

                    <div className="relative">
                      <input
                        type="text"
                        name={key}
                        value={user[key]}
                        onChange={(e) => handleUserChange(index, e)}
                        placeholder={`Enter ${key.replace(/_/g, " ")}`}
                        autoComplete="off"
                        className="
                          w-full px-3.5 py-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white
                          transition
                          focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                          placeholder:text-slate-400 dark:placeholder:text-slate-500
                          [&:not(:placeholder-shown)]:bg-blue-50/50 [&:not(:placeholder-shown)]:border-blue-200
                          dark:[&:not(:placeholder-shown)]:bg-blue-950/20 dark:[&:not(:placeholder-shown)]:border-blue-900/40
                        "
                      />

                      {/* suggestions */}
                      {key === "staff_code" && suggestions[index]?.length > 0 && (
                        <ul className="absolute left-0 top-full mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg z-[1000] max-h-52 overflow-y-auto shadow-lg">
                          {suggestions[index].map((emp, i) => (
                            <li
                              key={i}
                              onClick={() => handleSuggestionSelect(index, emp)}
                              className="px-4 py-2.5 cursor-pointer border-b border-slate-100 dark:border-slate-800/60 text-sm text-slate-700 dark:text-slate-350 flex gap-3 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-700 dark:hover:text-sky-400 transition"
                            >
                              <span className="font-semibold">{emp.staff_code}</span>
                              <span className="text-slate-500">{emp.name}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2.5 mt-5">
                {index === users.length - 1 && (
                  <button
                    type="button"
                    onClick={addUserField}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-500 text-white transition hover:bg-blue-600 hover:-translate-y-[1px] hover:shadow-md"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add User
                  </button>
                )}

                {users.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeUserField(index)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500 text-white transition hover:bg-red-600 hover:-translate-y-[1px] hover:shadow-md"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            type="submit"
            className="mt-8 mb-5 min-w-[200px] px-8 py-3 rounded-lg text-base font-semibold text-white
                       bg-gradient-to-br from-emerald-500 to-emerald-600
                       shadow-md shadow-emerald-500/30
                       inline-flex items-center justify-center gap-2.5
                       transition hover:from-emerald-600 hover:to-emerald-700 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            Submit VM
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddVM;
