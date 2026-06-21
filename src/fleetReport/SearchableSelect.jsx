import React, { memo, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { input } from "./config";

export const SearchableSelect = memo(function SearchableSelect({ value, onChange, options, placeholder, enableOther = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomEntry, setIsCustomEntry] = useState(false);
  const inputRef = useRef(null);
  const isTypingCustom = isCustomEntry;

  const filteredOptions = useMemo(() => {
    const q = (isTypingCustom ? value : "").toLowerCase().trim();
    if (!q) return options;
    return options.filter((option) => option.toLowerCase().includes(q));
  }, [isTypingCustom, value, options]);

  const focusCustomInput = () => {
    const field = inputRef.current;
    if (!field) return;

    try {
      field.focus({ preventScroll: true });
    } catch {
      field.focus();
    }

    try {
      const cursorPosition = field.value.length;
      field.setSelectionRange(cursorPosition, cursorPosition);
    } catch {
      // Some mobile browsers do not allow selection changes on every input type.
    }
  };

  const chooseOther = (event) => {
    event.preventDefault();
    event.stopPropagation();
    flushSync(() => {
      setIsCustomEntry(true);
      onChange("");
      setIsOpen(false);
    });
    focusCustomInput();
  };

  return (
    <div style={{ position: "relative", marginBottom: 8 }}>
      <input
        key={isTypingCustom ? "custom-entry" : "option-picker"}
        ref={inputRef}
        style={{ ...input, paddingRight: 36, cursor: isTypingCustom ? "text" : "pointer" }}
        placeholder={placeholder}
        value={value}
        readOnly={!isTypingCustom}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        onClick={() => {
          if (!isTypingCustom) {
            setIsOpen(true);
          }
        }}
        onFocus={() => {
          if (!isTypingCustom) {
            setIsOpen(true);
          }
        }}
        onChange={(e) => {
          if (isTypingCustom) {
            onChange(e.target.value);
          }
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setIsOpen(false);
          }, 150);
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
                  setIsCustomEntry(false);
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
          {enableOther ? (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onTouchEnd={chooseOther}
              onClick={chooseOther}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                border: "none",
                borderTop: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#1d4ed8",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Other (type custom)
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
