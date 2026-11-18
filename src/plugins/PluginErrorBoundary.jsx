import { Component } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * React Error Boundary isolating UI crashes caused by third-party or
 * client-exclusive plugins so the core ShiftPulse application never crashes.
 */
export class PluginErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Unexpected plugin rendering error.",
    };
  }

  componentDidCatch(error, info) {
    console.error(
      `[PluginErrorBoundary] Isolated render crash in plugin "${this.props.pluginId || "unknown"}":`,
      error,
      info,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            Plugin &quot;{this.props.pluginId || "extension"}&quot; paused after an isolated error:{" "}
            {this.state.errorMessage}
          </span>
        </div>
      );
    }

    return this.props.children;
  }
}
