import React from "react";

const SectionHeader = ({ title, description, className = "" }) => {
  return (
    <div className={`mb-4 ${className}`}>
      <h2 className="text-[18px] md:text-[20px] font-bold text-slate-800 dark:text-slate-100 tracking-wide">
        {title}
      </h2>
      {description && (
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
          {description}
        </p>
      )}
    </div>
  );
};

export default SectionHeader;
