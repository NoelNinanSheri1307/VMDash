import React from "react";

const Card = ({ children, className = "", onClick, hoverable = false }) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-slate-900 
        border border-slate-200 dark:border-slate-800 
        rounded-[18px] 
        shadow-sm dark:shadow-md 
        p-5 
        transition-all duration-150
        ${hoverable ? "hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;
