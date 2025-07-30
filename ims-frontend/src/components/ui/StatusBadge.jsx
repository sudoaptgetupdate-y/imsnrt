// src/components/ui/StatusBadge.jsx

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { getStatusProperties } from "@/lib/statusUtils";
import { cn } from "@/lib/utils";

export const StatusBadge = ({ status, className, children, ...props }) => {
  const { label, variant } = getStatusProperties(status);
  const isInteractive = !!props.onClick;

  return (
    <Badge
      variant={variant}
      interactive={isInteractive}
      className={cn("justify-center", className)}
      {...props}
    >
      {/* ถ้ามี children (เช่น icon) ให้แสดงผล children, ถ้าไม่มี ให้ใช้ label เริ่มต้น */}
      {children || label}
    </Badge>
  );
};