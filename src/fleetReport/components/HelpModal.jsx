import React from "react";
import { card, input } from "../config";

export function HelpModal({ showHelp, setShowHelp }) {
  if (!showHelp) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.35)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 80,
      }}
    >
      <div
        style={{
          ...card,
          width: "100%",
          maxWidth: 620,
          maxHeight: "80vh",
          overflowY: "auto",
          padding: 18,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>❓ How To Use This Report</h3>
        <div style={{ color: "#475569", lineHeight: 1.5 }}>
          Fill in only what applies to your location and shift. Most sections support adding or removing rows as needed.
        </div>
        <ol style={{ margin: "12px 0 0", paddingLeft: 20, color: "#1f2937", lineHeight: 1.6 }}>
          <li>Choose Fleet tab, Date, and Shift.</li>
          <li>Add units and equipment in Inventory sections.</li>
          <li>Complete PM fields for any active truck, tractor, pump, or generator.</li>
          <li>Add supplies needed and issue notes before saving.</li>
          <li>Use `Load Last Report` to copy the latest report for this fleet.</li>
          <li>Open a saved report and click `Copy For Microsoft Teams` to copy a Teams-ready message.</li>
          <li>Use Saved Reports on the right to view, load, or delete old reports.</li>
        </ol>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button
            type="button"
            onClick={() => setShowHelp(false)}
            style={{
              ...input,
              width: "auto",
              padding: "8px 12px",
              background: "#e5e7eb",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
