import React from "react";
import { card, input } from "../config";

export function SavedReportsPanel({
  activeFleet,
  deleteUnlocked,
  openDeleteAccessPrompt,
  reportsLoading,
  visibleSavedReports,
  viewSavedReport,
  loadSavedReport,
  openDeletePrompt,
  deleteTargetId,
  deleteReport,
  cancelDeletePrompt,
}) {
  return (
    <div style={card}>
      <div style={{ display: "grid", gap: 10, justifyItems: "center", textAlign: "center" }}>
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>Saved Reports – Fleet {activeFleet}</h3>
        <button
          type="button"
          onClick={openDeleteAccessPrompt}
          style={{
            ...input,
            width: "auto",
            padding: "8px 10px",
            background: deleteUnlocked ? "#dcfce7" : "#fee2e2",
            border: deleteUnlocked ? "1px solid #86efac" : "1px solid #fca5a5",
            color: deleteUnlocked ? "#166534" : "#991b1b",
            WebkitTextFillColor: deleteUnlocked ? "#166534" : "#991b1b",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Delete Reports
        </button>
      </div>

      {reportsLoading ? (
        <p style={{ color: "#64748b", textAlign: "center" }}>Loading reports...</p>
      ) : visibleSavedReports.length === 0 ? (
        <p style={{ color: "#64748b", textAlign: "center" }}>No saved reports yet.</p>
      ) : (
        visibleSavedReports.map((r) => (
          <div key={r.id} style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10, marginTop: 10, textAlign: "center" }}>
            <strong>Fleet {r.fleet || "No Fleet"}</strong>
            <div>{r.shift} shift • {r.date}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, justifyContent: "center", alignItems: "center" }}>
              <button
                onClick={() => viewSavedReport(r)}
                style={{
                  background: "#dbeafe",
                  color: "#1d4ed8",
                  border: "1px solid #93c5fd",
                  borderRadius: 10,
                  padding: "8px 10px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                View Report
              </button>
              <button
                onClick={() => loadSavedReport(r)}
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  border: "1px solid #86efac",
                  borderRadius: 10,
                  padding: "8px 10px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Load This Report
              </button>
              {deleteUnlocked ? (
                <button
                  onClick={() => openDeletePrompt(r.id)}
                  style={{
                    background: "#fee2e2",
                    color: "#991b1b",
                    border: "1px solid #fca5a5",
                    borderRadius: 10,
                    padding: "8px 10px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Delete Report
                </button>
              ) : null}
            </div>

            {deleteTargetId === r.id ? (
              <div style={{ marginTop: 10, padding: 12, border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 12 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, justifyContent: "center", alignItems: "center" }}>
                  <button
                    onClick={() => deleteReport(r.id)}
                    style={{
                      background: "#991b1b",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 10,
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={cancelDeletePrompt}
                    style={{
                      background: "#e5e7eb",
                      color: "#111827",
                      border: "none",
                      borderRadius: 10,
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
