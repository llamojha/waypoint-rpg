"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Mail } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/constants/support";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-parchment-100 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-error-border rounded-lg shadow-lg max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-6 border-2 border-error/30">
              <AlertTriangle size={32} className="text-error" />
            </div>
            
            <h1 className="font-display text-2xl text-ink mb-2">
              Something Went Wrong
            </h1>
            
            <p className="text-ink-light text-sm mb-6">
              An unexpected error occurred. Please reload the page to continue your adventure.
            </p>

            <button
              onClick={this.handleReload}
              className="w-full px-6 py-3 bg-burgundy text-white rounded-md font-bold font-small-caps uppercase text-sm hover:bg-burgundy/90 shadow-md flex items-center justify-center gap-2 transition-all active:translate-y-0.5 mb-4"
            >
              <RefreshCw size={18} /> Reload Page
            </button>

            <div className="border-t border-parchment-300 pt-4">
              <p className="text-xs text-ink-light mb-2">
                If this keeps happening, please contact support:
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex items-center gap-2 text-sm text-burgundy hover:underline"
              >
                <Mail size={14} />
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
