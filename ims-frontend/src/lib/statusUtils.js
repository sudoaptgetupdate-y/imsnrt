// src/lib/statusUtils.js

/**
 * @typedef {'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'warning-alt' | 'info'} BadgeVariant
 */

/**
 * @typedef {Object} StatusConfig
 * @property {string} label - The text to display on the badge.
 * @property {BadgeVariant} variant - The color variant of the badge.
 */

/**
 * A centralized map for all status types across the application.
 * @type {Object.<string, StatusConfig>}
 */
const STATUS_CONFIG = {
  // General & User Statuses
  ACTIVE: { label: "Active", variant: "success" },
  DISABLED: { label: "Disabled", variant: "destructive" },

  // Owner Types
  COMPANY: { label: "Company", variant: "warning-alt" },
  CUSTOMER: { label: "Customer", variant: "info" },

  // Inventory & Asset Statuses
  IN_STOCK: { label: "In Stock", variant: "success" },
  IN_WAREHOUSE: { label: "In Warehouse", variant: "success" },
  SOLD: { label: "Sold", variant: "secondary" },
  RESERVED: { label: "Reserved", variant: "warning" },
  DEFECTIVE: { label: "Defective", variant: "destructive" },
  
  // Transaction Types
  SALE: { label: "Sale", variant: "success" },
  BORROWING: { label: "Borrowing", variant: "warning" },
  ASSET: { label: "Asset", variant: "secondary" },

  // Sale Statuses
  COMPLETED: { label: "Completed", variant: "success" },
  VOIDED: { label: "Voided", variant: "destructive" },
  VOID: { label: "Voided", variant: "destructive" },

  // Borrowing Statuses
  BORROW: { label: "Borrowed", variant: "warning" },
  BORROWED: { label: "Borrowed", variant: "warning" },
  RETURNED: { label: "Returned", variant: "success" },
  OVERDUE: { label: "Overdue", variant: "destructive" },
  
  // Assignment & Repair Statuses
  PARTIALLY_RETURNED: { label: "Partially Returned", variant: "info" },
  REPAIRING: { label: "Repairing", variant: "warning" },

  REPAIR_SUCCESS: { label: "Repair Successful", variant: "success" },
  REPAIR_FAILED: { label: "Repair Failed", variant: "destructive" },

  // Repair Outcomes & Status
  REPAIRED_SUCCESSFULLY: { label: "Repair Success", variant: "success" },
  UNREPAIRABLE: { label: "Unrepairable", variant: "destructive" },
  
  RETURNED_TO_CUSTOMER: { label: "Returned to Customer", variant: "info" },

  // Asset Statuses & History Events
  ASSIGNED: { label: "Assigned", variant: "warning" },
  DECOMMISSIONED: { label: "Archived", variant: "destructive" },
  
  // History Event Types
  CREATE: { label: "Created", variant: "success" },
  UPDATE: { label: "Updated", variant: "info" },
  ASSIGN: { label: "Assigned", variant: "warning" },
  RETURN: { label: "Returned", variant: "success" },
  RETURN_FROM_BORROW: { label: "Return from Borrow", variant: "success" },
  RETURN_FROM_ASSIGN: { label: "Return from Assign", variant: "success" },
  DECOMMISSION: { label: "Decommissioned", variant: "destructive" },
  REINSTATE: { label: "Reinstated", variant: "success" },
  REPAIR_SENT: { label: "Sent to Repair", variant: "info" },
  REPAIR_RETURNED: { label: "Returned from Repair", variant: "success" },

  // Default for unknown statuses
  DEFAULT: { label: "Unknown", variant: "outline" },
};

/**
 * Gets the display properties (label and variant) for a given status.
 * @param {string} status - The status string (e.g., 'IN_STOCK', 'COMPLETED').
 * @returns {StatusConfig} The configuration for the badge.
 */
export const getStatusProperties = (status) => {
  return STATUS_CONFIG[status] || { label: status.replace(/_/g, ' '), variant: 'default' };
};