import type { Terminal } from "@shared/schema";

/**
 * Utility functions for filtering terminals based on their status and subscription
 */

export interface TerminalFilter {
  id: number;
  terminalName: string;
  shortCode: string;
  portId: number;
  isActive: boolean;
  status: string;
  subscriptionTypeId?: number | null;
  activationStartDate?: string | null;
  activationEndDate?: string | null;
}

/**
 * Filter terminals to only include active and subscribed ones
 * A terminal is considered subscribed if it has a subscriptionTypeId and is within the activation period
 */
export function getActiveAndSubscribedTerminals(terminals: TerminalFilter[]): TerminalFilter[] {
  const now = new Date();
  
  return terminals.filter(terminal => {
    // Must be active
    if (!terminal.isActive) {
      return false;
    }
    
    // Must have a subscription
    if (!terminal.subscriptionTypeId) {
      return false;
    }
    
    // Check activation period if dates are provided
    if (terminal.activationStartDate && terminal.activationEndDate) {
      const startDate = new Date(terminal.activationStartDate);
      const endDate = new Date(terminal.activationEndDate);
      
      // Must be within the subscription period
      if (now < startDate || now > endDate) {
        return false;
      }
    }
    
    // Status should be "Active" for proper terminals
    if (terminal.status !== "Active") {
      return false;
    }
    
    return true;
  });
}

/**
 * Check if a single terminal is active and subscribed
 */
export function isTerminalActiveAndSubscribed(terminal: TerminalFilter): boolean {
  const filtered = getActiveAndSubscribedTerminals([terminal]);
  return filtered.length > 0;
}

/**
 * Get available terminals for a specific port
 */
export function getAvailableTerminalsForPort(terminals: TerminalFilter[], portId: number): TerminalFilter[] {
  const portTerminals = terminals.filter(terminal => terminal.portId === portId);
  return getActiveAndSubscribedTerminals(portTerminals);
}

/**
 * Format terminal display name for dropdowns
 */
export function formatTerminalDisplayName(terminal: TerminalFilter): string {
  return `${terminal.terminalName} (${terminal.shortCode})`;
}