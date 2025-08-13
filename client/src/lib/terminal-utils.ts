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
    // Console log for debugging
    console.log('Terminal filtering debug:', {
      name: terminal.terminalName,
      isActive: terminal.isActive,
      subscriptionTypeId: terminal.subscriptionTypeId,
      status: terminal.status,
      activationStartDate: terminal.activationStartDate,
      activationEndDate: terminal.activationEndDate
    });
    
    // Must have a subscription
    if (!terminal.subscriptionTypeId) {
      console.log(`Terminal ${terminal.terminalName} filtered out: no subscription`);
      return false;
    }
    
    // Status should be "Active" for proper terminals
    if (terminal.status !== "Active") {
      console.log(`Terminal ${terminal.terminalName} filtered out: status is ${terminal.status}`);
      return false;
    }
    
    // Check activation period if dates are provided
    if (terminal.activationStartDate && terminal.activationEndDate) {
      const startDate = new Date(terminal.activationStartDate);
      const endDate = new Date(terminal.activationEndDate);
      
      // Must be within the subscription period
      if (now < startDate || now > endDate) {
        console.log(`Terminal ${terminal.terminalName} filtered out: outside subscription period`);
        return false;
      }
    }
    
    // Check isActive OR if terminal has valid subscription and is "Active" status
    const hasValidSubscription = terminal.subscriptionTypeId && terminal.status === "Active";
    const isActiveOrSubscribed = terminal.isActive || hasValidSubscription;
    
    if (!isActiveOrSubscribed) {
      console.log(`Terminal ${terminal.terminalName} filtered out: not active and no valid subscription`);
      return false;
    }
    
    console.log(`Terminal ${terminal.terminalName} passed all filters`);
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