import React, { useState } from "react";
import { card, input, label } from "../fleetReport/config";

const STROKE_LENGTH_INCHES = 8;
const VOLUMETRIC_EFFICIENCY = 0.95;
const CUBIC_INCHES_PER_GALLON = 231;
const GALLONS_PER_BARREL = 42;

const pageButton = {
  ...input,
  width: "auto",
  cursor: "pointer",
  fontWeight: 700,
};

const selectStyle = {
  ...input,
  cursor: "pointer",
  background: "#ffffff",
};

const calculatePumpRate = ({ plungerCount, plungerDiameter, strokesPerMinute }) => {
  const plungerArea = Math.PI * (plungerDiameter / 2) ** 2;
  const cubicInchesPerMinute = plungerArea * STROKE_LENGTH_INCHES * plungerCount * strokesPerMinute;
  const gallonsPerMinute = (cubicInchesPerMinute / CUBIC_INCHES_PER_GALLON) * VOLUMETRIC_EFFICIENCY;
  return {
    gallonsPerMinute,
    barrelsPerMinute: gallonsPerMinute / GALLONS_PER_BARREL,
  };
};

export function CalculatorsPage({ isMobile, onBack, wsEnergyLogo }) {
  const [plungerCount, setPlungerCount] = useState(3);
  const [plungerDiameter, setPlungerDiameter] = useState(4);
  const [strokesPerMinute, setStrokesPerMinute] = useState("");

  const strokeRate = Number(strokesPerMinute);
  const hasValidStrokeRate = Number.isFinite(strokeRate) && strokeRate > 0;
  const result = hasValidStrokeRate
    ? calculatePumpRate({ plungerCount, plungerDiameter, strokesPerMinute: strokeRate })
    : null;

  return (
    <div style={{ background: "linear-gradient(180deg, #f3f7fc 0%, #f8fafc 45%, #f8fafc 100%)", minHeight: "100vh", padding: isMobile ? 12 : 18, color: "#111827", colorScheme: "light" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ ...card, marginBottom: 16, padding: isMobile ? 14 : 18 }}>
          <button type="button" onClick={onBack} style={{ ...pageButton, background: "#e2e8f0", border: "none" }}>
            Back to Fleet Report
          </button>
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <img
              src={wsEnergyLogo}
              alt="WS Energy Services logo"
              style={{ width: isMobile ? 130 : 180, height: "auto", display: "block", margin: "0 auto 10px", objectFit: "contain" }}
            />
            <h1 style={{ margin: 0, fontSize: isMobile ? 26 : 34, color: "#111827" }}>Calculators</h1>
            <p style={{ margin: "8px auto 0", color: "#64748b", fontWeight: 700 }}>
              Field calculation tools
            </p>
          </div>
        </div>

        <div style={{ ...card, borderRadius: 18, border: "1px solid #bfdbfe", boxShadow: "0 16px 38px rgba(37, 99, 235, 0.08)" }}>
          <div style={{ borderRadius: 14, padding: isMobile ? 16 : 20, background: "linear-gradient(135deg, #eff6ff 0%, #ecfeff 100%)", border: "1px solid #bae6fd", marginBottom: 18 }}>
            <div style={{ color: "#1d4ed8", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 }}>
              Frac Pump
            </div>
            <h2 style={{ margin: 0, fontSize: isMobile ? 22 : 27, color: "#111827" }}>Plunger Stroke Rate to BPM</h2>
            <p style={{ margin: "10px 0 0", color: "#334155", fontSize: 15, fontWeight: 700, lineHeight: 1.55 }}>
              Count the number of strokes on one plunger for one full minute. Enter the pump information and stroke count below to view the estimated barrels per minute.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 14 }}>
            <div>
              <label style={label}>Number of Plungers</label>
              <select style={selectStyle} value={plungerCount} onChange={(event) => setPlungerCount(Number(event.target.value))}>
                <option value={3}>3 - Triplex</option>
                <option value={5}>5 - Quintuplex</option>
              </select>
            </div>
            <div>
              <label style={label}>Plunger Diameter</label>
              <select style={selectStyle} value={plungerDiameter} onChange={(event) => setPlungerDiameter(Number(event.target.value))}>
                <option value={4}>4 inches</option>
                <option value={4.5}>4.5 inches</option>
              </select>
            </div>
            <div>
              <label style={label}>Strokes in 1 Minute</label>
              <input
                style={input}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={strokesPerMinute}
                onChange={(event) => setStrokesPerMinute(event.target.value)}
                placeholder="Example: 60"
              />
            </div>
          </div>

          <div style={{ marginTop: 18, borderRadius: 16, border: `2px solid ${result ? "#2563eb" : "#cbd5e1"}`, background: result ? "#eff6ff" : "#f8fafc", padding: isMobile ? 18 : 24, textAlign: "center" }}>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Estimated Pump Rate
            </div>
            <div style={{ marginTop: 7, color: result ? "#1d4ed8" : "#94a3b8", fontSize: isMobile ? 42 : 54, fontWeight: 900, lineHeight: 1 }}>
              {result ? result.barrelsPerMinute.toFixed(2) : "--"}
            </div>
            <div style={{ marginTop: 7, color: "#334155", fontSize: 17, fontWeight: 900 }}>BPM</div>
            {result ? (
              <div style={{ marginTop: 12, color: "#475569", fontSize: 14, fontWeight: 700 }}>
                {result.gallonsPerMinute.toFixed(1)} gallons per minute
              </div>
            ) : (
              <div style={{ marginTop: 12, color: "#64748b", fontSize: 14, fontWeight: 700 }}>
                Enter the one-minute stroke count to calculate BPM.
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <span style={{ borderRadius: 999, padding: "7px 10px", background: "#f1f5f9", color: "#475569", fontSize: 12, fontWeight: 800 }}>
              Fixed stroke length: 8 in
            </span>
            <span style={{ borderRadius: 999, padding: "7px 10px", background: "#f1f5f9", color: "#475569", fontSize: 12, fontWeight: 800 }}>
              Volumetric efficiency: 95%
            </span>
          </div>

          <div style={{ marginTop: 18, borderRadius: 14, border: "1px solid #cbd5e1", background: "#f8fafc", padding: isMobile ? 15 : 18 }}>
            <h3 style={{ margin: 0, color: "#111827", fontSize: 17 }}>Formula Used</h3>
            <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 13, fontWeight: 700, lineHeight: 1.55 }}>
              The volume displaced by one plunger stroke is multiplied by the number of plungers, the one-minute stroke count, and 95% efficiency. The result is then converted from cubic inches to gallons and barrels.
            </p>
            <div style={{ marginTop: 12, borderRadius: 10, background: "#ffffff", border: "1px solid #dbe4ee", padding: "12px 14px", color: "#1e3a8a", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: isMobile ? 12 : 14, fontWeight: 800, lineHeight: 1.7, overflowWrap: "anywhere" }}>
              BPM = [π × (diameter ÷ 2)² × 8 × plungers × strokes/min × 0.95] ÷ 231 ÷ 42
            </div>
            {result ? (
              <div style={{ marginTop: 10, color: "#334155", fontSize: 13, fontWeight: 700, lineHeight: 1.55 }}>
                Current values: [π × ({plungerDiameter} ÷ 2)² × 8 × {plungerCount} × {strokeRate} × 0.95] ÷ 231 ÷ 42 = <strong>{result.barrelsPerMinute.toFixed(2)} BPM</strong>
              </div>
            ) : null}
            <div style={{ marginTop: 10, color: "#64748b", fontSize: 12, fontWeight: 700 }}>
              231 cubic inches = 1 gallon · 42 gallons = 1 barrel
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
