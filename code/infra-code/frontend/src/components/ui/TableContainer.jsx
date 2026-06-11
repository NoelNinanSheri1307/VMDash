import React from "react";

const TableContainer = ({ children, className = "" }) => {
  return (
    <div className={`w-full overflow-hidden border border-slate-200 dark:border-slate-800 rounded-[18px] bg-white dark:bg-slate-900 shadow-sm ${className}`}>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse text-[14px]">
          {children}
        </table>
      </div>
    </div>
  );
};

export default TableContainer;
