import React from "react";
import { card, input, label } from "../config";

export function DeleteAccessModal({
  showDeleteAccessPrompt,
  deletePassword,
  setDeletePassword,
  confirmDeleteAccess,
  cancelDeleteAccessPrompt,
}) {
  if (!showDeleteAccessPrompt) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.35)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 70,
      }}
    >
      <div
        style={{
          ...card,
          width: "100%",
          maxWidth: 420,
          padding: 16,
        }}
      >
        <label style={label}>Enter delete password</label>
        <input
          style={input}
          type="password"
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmDeleteAccess();
          }}
          placeholder="Password required"
          autoFocus
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button
            type="button"
            onClick={confirmDeleteAccess}
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
            Unlock Delete
          </button>
          <button
            type="button"
            onClick={cancelDeleteAccessPrompt}
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
    </div>
  );
}
