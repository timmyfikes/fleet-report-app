import React, { memo, useMemo, useState } from "react";
import { input } from "./config";

export const SearchableSelect = memo(function SearchableSelect({ value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    const q = (value || "").toLowerCase().trim();
    if (!q) return options;
    return options.filter((option) => option.toLowerCase().includes(q));
  }, [value, options]);

  return (
    <div style={{ position: "relative", marginBottom: 8 }}>
      <input
        style={{ ...input, paddingRight: 36 }}
        placeholder={placeholder}
        value={value}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 150);
        }}
      />
      <div style={{ position: "absolute", right: 12, top: 11, color: "#475569", pointerEvents: "none", fontSize: 14 }}>▾</div>
      {isOpen ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxHeight: 180,
            overflowY: "auto",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: 10,
            boxShadow: "0 8px 20px rgba(15, 23, 42, 0.12)",
            zIndex: 20,
          }}
        >
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  border: "none",
                  background: "#ffffff",
                  color: "#111827",
                  cursor: "pointer",
                }}
              >
                {option}
              </button>
            ))
          ) : (
            <div style={{ padding: "10px 12px", color: "#64748b" }}>No matches. Keep typing to enter a custom unit.</div>
          )}
        </div>
      ) : null}
    </div>
  );
});

