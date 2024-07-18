// components/Common/CollapsibleSection.tsx
"use client";

import React, { useState, ReactNode } from "react";
import { Collapse } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";

interface CollapsibleSectionProps {
  title: string;
  loading: boolean;
  children: ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, loading, children }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div className="max-w-md mx-auto my-4 p-4 bg-primary text-quaternary font-bold">
      <h3
        className="text-lg italic mb-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {title}
      </h3>
      <Collapse in={isOpen}>
        {loading ? (
          <div className="flex justify-center items-center p-4">
            <CircularProgress />
          </div>
        ) : (
          children
        )}
      </Collapse>
    </div>
  );
};

export default CollapsibleSection;
