import React from "react";

const Input = ({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder = "",
  required = false,
  error = "",
  className = "",
  disabled = false,
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-[13px] font-semibold text-slate-700 dark:text-slate-300"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`
          px-4 py-2 rounded-xl text-[14px] bg-white dark:bg-slate-900 
          border ${error ? "border-red-500" : "border-slate-200 dark:border-slate-800"} 
          text-slate-900 dark:text-slate-100 
          placeholder-slate-400 dark:placeholder-slate-600 
          focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 
          transition-all duration-150
          disabled:opacity-60 disabled:cursor-not-allowed
        `}
        {...props}
      />
      {error && (
        <span className="text-[12px] text-red-500 font-medium mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
};

export default Input;
