import React from "react";
import PageHeader from "../components/ui/PageHeader";

const PageContainer = ({ title, description, actions, children, className = "" }) => {
  return (
    <div className={`p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6 ${className}`}>
      {(title || description || actions) && (
        <PageHeader title={title} description={description} actions={actions} />
      )}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
