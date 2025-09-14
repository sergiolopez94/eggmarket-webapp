import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Role utility functions for our business app
export function getRoleColor(role: string): string {
  const roleColors = {
    admin: "bg-blue-700 text-white",
    manager: "bg-blue-500 text-white",
    salesperson: "bg-blue-400 text-white",
    viewer: "bg-neutral-500 text-white"
  }
  return roleColors[role.toLowerCase() as keyof typeof roleColors] || roleColors.viewer
}

export function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
}

// Status utility functions for orders
export function getStatusColor(status: string): string {
  const statusColors = {
    draft: "status-draft",
    pending: "status-pending",
    confirmed: "status-confirmed",
    shipped: "status-shipped",
    delivered: "status-delivered"
  }
  return statusColors[status.toLowerCase() as keyof typeof statusColors] || statusColors.draft
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}