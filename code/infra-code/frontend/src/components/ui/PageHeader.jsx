import React from "react";

const PageHeader = ({ title, description, actions, className = "" }) => {
  return (
    <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 ${className}`}>
      <div>
        <h1 className="text-[24px] md:text-[28px] font-bold text-slate-900 dark:text-slate-50 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};

export default PageHeader;
