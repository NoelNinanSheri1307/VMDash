import React from "react";

const Loader = ({ text = "Loading..." }) => {
    return (
        <div className = "flex flex-col items-center justify-center space-y-2">
            <div className = "w-8 h-8 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <div className = "text-gray-600 text-sm">{text}</div>
        </div>
    );
};

export default Loader;