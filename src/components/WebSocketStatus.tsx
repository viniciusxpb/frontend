import React, { useState } from "react";

type Props = {
  status: "idle" | "connecting" | "open" | "closing" | "closed";
  onTest?: () => Promise<boolean>;
};

export function WebSocketStatus({ status, onTest }: Props) {
  const [testResult, setTestResult] = useState<null | "ok" | "err">(null);

  const handleTest = async () => {
    if (!onTest) return;
    const ok = await onTest();
    setTestResult(ok ? "ok" : "err");
    window.setTimeout(() => setTestResult(null), 2000);
  };
  const color =
    status === "open"
      ? "#00ff95"
      : status === "connecting"
      ? "#ffee00"
      : status === "closing"
      ? "#ff9f00"
      : status === "closed"
      ? "#ff4d4d"
      : "#7fdbff";

  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        right: 8,
        zIndex: 9999,
        background: "#0b0f0c",
        border: `1px solid ${color}`,
        color,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 10,
        boxShadow: "0 0 10px rgba(0,255,149,0.15)",
        userSelect: "none",
      }}
      aria-live="polite"
    >
      WS: {status.toUpperCase()}
      {onTest && (
        <button
          onClick={handleTest}
          style={{
            marginLeft: 8,
            background: "transparent",
            border: `1px solid ${color}`,
            color,
            borderRadius: 6,
            padding: "2px 6px",
            cursor: "pointer",
          }}
        >
          test
        </button>
      )}
      {testResult && (
        <span style={{ marginLeft: 4 }}>
          {testResult === "ok" ? "✅" : "❌"}
        </span>
      )}
    </div>
  );
}
