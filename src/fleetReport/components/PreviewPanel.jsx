import React from "react";
import { card, input } from "../config";
import { SavedReportView } from "../SavedReportView";

export function PreviewPanel({ resolvedSelectedReport, summary, copyReportForTeams, isMobile, copyMessage }) {
  return (
    <div style={card}>
      <h3 style={{ marginTop: 0 }}>{resolvedSelectedReport ? "📄 Saved Report View" : "👀 Preview"}</h3>
      {resolvedSelectedReport ? (
        <>
          <SavedReportView report={resolvedSelectedReport} />
          <div style={{ display: "flex", justifyContent: "center", marginTop: 12, width: "100%" }}>
            <button
              type="button"
              onClick={copyReportForTeams}
              style={{
                ...input,
                width: isMobile ? "100%" : "auto",
                maxWidth: 360,
                padding: "10px 12px",
                background: "#dbeafe",
                border: "1px solid #93c5fd",
                color: "#1d4ed8",
                WebkitTextFillColor: "#1d4ed8",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Copy For Microsoft Teams
            </button>
          </div>
          {copyMessage ? (
            <div style={{ marginTop: 8, textAlign: "center", color: "#166534", fontWeight: 700, fontSize: 13 }}>{copyMessage}</div>
          ) : null}
        </>
      ) : (
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, margin: 0 }}>{summary}</pre>
      )}
    </div>
  );
}
