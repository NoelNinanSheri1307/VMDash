import React from "react";

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#0B1220] p-4 transition-colors duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[18px] shadow-sm dark:shadow-md p-8">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
