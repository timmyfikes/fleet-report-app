import React from "react";
import { card, input } from "../config";

export function HeaderCard({ isMobile, activeFleet, fleetTabs, setActiveFleet, setShowHelp, wsEnergyLogo }) {
  return (
    <div style={{ ...card, marginBottom: 16, position: "relative" }}>
      <button
        type="button"
        onClick={() => setShowHelp(true)}
        style={{
          position: isMobile ? "static" : "absolute",
          top: isMobile ? undefined : 14,
          right: isMobile ? undefined : 14,
          ...input,
          width: "auto",
          padding: "8px 12px",
          background: "#eff6ff",
          border: "1px solid #93c5fd",
          color: "#1d4ed8",
          WebkitTextFillColor: "#1d4ed8",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          marginLeft: isMobile ? "auto" : 0,
          marginBottom: isMobile ? 10 : 0,
          display: "block",
        }}
      >
        Help
      </button>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, justifyContent: "center" }}>
        {fleetTabs.map((fleet) => (
          <button
            key={fleet}
            onClick={() => setActiveFleet(fleet)}
            style={{
              ...input,
              width: "auto",
              padding: "10px 14px",
              cursor: "pointer",
              border: activeFleet === fleet ? "2px solid #2563eb" : "1px solid #cbd5e1",
              background: activeFleet === fleet ? "#dbeafe" : "#ffffff",
              color: "#111827",
              fontWeight: 700,
            }}
          >
            Fleet {fleet}
          </button>
        ))}
      </div>
      <div style={{ textAlign: "center" }}>
        <img
          src={wsEnergyLogo}
          alt="WS Energy Services logo"
          style={{
            width: isMobile ? 130 : 190,
            height: "auto",
            display: "block",
            margin: "0 auto 10px",
            objectFit: "contain",
          }}
        />
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 30, lineHeight: 1.2, color: "#111827", WebkitTextFillColor: "#111827" }}>
          🔧 END-OF-SHIFT INVENTORY & PM REPORT
        </h1>
      </div>
      <p style={{ color: "#475569", margin: "10px auto 0", maxWidth: 840, lineHeight: 1.5, textAlign: "center" }}>
        Only fill in the sections that apply. Please ensure all equipment on location is added. Fill it out once, then use Load Last Report and only change what changed.
      </p>
    </div>
  );
}
