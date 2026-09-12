"use client";

import React from "react";
import { WifiOff, RefreshCw, Clock, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface RealtimeDashboardFallbackProps {
  isConnected: boolean;
  isConnecting: boolean;
  isStaleData: boolean;
  connectionAttempts: number;
  lastUpdated: Date | null;
  onRetry: () => void;
  children: React.ReactNode;
}

/**
 * Fallback UI overlay for the realtime dashboard when the WebSocket
 * connection is unavailable, reconnecting, or delivering stale data.
 * Preserves the last known children content underneath while showing
 * an appropriate status overlay.
 */
export function RealtimeDashboardFallback({
  isConnected,
  isConnecting,
  isStaleData,
  connectionAttempts,
  lastUpdated,
  onRetry,
  children,
}: RealtimeDashboardFallbackProps) {
  const showOverlay = !isConnected || isConnecting || isStaleData;

  const getStatusInfo = () => {
    if (!isConnected && isConnecting) {
      return {
        icon: <RefreshCw className="w-5 h-5 animate-spin text-yellow-500" aria-hidden="true" />,
        title: "Reconnecting...",
        description: connectionAttempts > 0
          ? `Attempt ${connectionAttempts} - trying to restore connection`
          : "Establishing connection to realtime server",
        action: null,
      };
    }
    if (!isConnected && !isConnecting) {
      return {
        icon: <WifiOff className="w-5 h-5 text-red-500" aria-hidden="true" />,
        title: "Disconnected",
        description: connectionAttempts > 0
          ? `Unable to reconnect after ${connectionAttempts} attempt${connectionAttempts > 1 ? "s" : ""}`
          : "Real-time connection lost",
        action: (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            aria-label="Retry connection"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Retry
          </button>
        ),
      };
    }
    if (isStaleData) {
      return {
        icon: <Clock className="w-5 h-5 text-yellow-500" aria-hidden="true" />,
        title: "Data may be stale",
        description: lastUpdated
          ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
          : "No recent updates received",
        action: (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-yellow-600 text-white hover:bg-yellow-700 transition-colors"
            aria-label="Refresh data"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Refresh
          </button>
        ),
      };
    }
    return null;
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="relative">
      {/* Always render children to preserve last known data */}
      <div className={showOverlay ? "opacity-50 pointer-events-none" : ""}>
        {children}
      </div>

      <AnimatePresence>
        {showOverlay && statusInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-0 right-0 z-10 flex justify-center pointer-events-none"
          >
            <div className="pointer-events-auto inline-flex items-center gap-3 px-4 py-2 mt-2 rounded-lg bg-slate-900/90 dark:bg-slate-800/95 border border-slate-700/50 backdrop-blur-md shadow-lg">
              {statusInfo.icon}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">
                  {statusInfo.title}
                </span>
                <span className="text-xs text-slate-400">
                  {statusInfo.description}
                </span>
              </div>
              {statusInfo.action}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full overlay for disconnected state with many attempts */}
      {!isConnected && !isConnecting && connectionAttempts >= 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/70 rounded-lg backdrop-blur-sm"
        >
          <div className="text-center p-6 max-w-sm">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-white mb-1">
              Connection Lost
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Unable to maintain a real-time connection after {connectionAttempts} attempts.
              Your data may not be up to date.
            </p>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              aria-label="Try reconnecting"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Try Again
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
