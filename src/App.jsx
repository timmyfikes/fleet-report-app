import React, { memo, useMemo, useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const input = {
  width: "100%",
  padding: "10px",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  fontSize: 16,
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#111827",
  colorScheme: "light",
  WebkitTextFillColor: "#111827",
  appearance: "none",
};

const selectInput = {
  ...input,
  paddingRight: 36,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M5 7.5L10 12.5L15 7.5' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  backgroundSize: "14px",
  cursor: "pointer",
};

const section = {
  borderTop: "1px solid #d1d5db",
  paddingTop: 18,
  marginTop: 18,
};

const row = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

const label = {
  display: "block",
  fontWeight: 600,
  marginBottom: 6,
};

const getStatusColors = (status) => {
  if (status === "OK") return { background: "#dcfce7", border: "1px solid #86efac", color: "#166534" };
  if (status === "DUE") return { background: "#fef9c3", border: "1px solid #fde047", color: "#854d0e" };
  if (status === "OVERDUE") return { background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b" };
  return { background: "#fff", border: "1px solid #e5e7eb", color: "#111827" };
};

const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const isRealTruckUnit = (value) => typeof value === "string" && /^C-\d+$/.test(value);

const getTruckPmStatus = (item, reportDate) => {
  const currentMiles = toNumber(item.miles);
  const dueMiles = toNumber(item.dueAt);
  const currentHours = toNumber(item.engineHours);
  const dueHours = toNumber(item.engineHoursDueAt);

  const milesOverdue = currentMiles !== null && dueMiles !== null && currentMiles > dueMiles;
  const hoursOverdue = currentHours !== null && dueHours !== null && currentHours > dueHours;

  let qcStatus = "OK";
  if (reportDate && item.qcDue) {
    const report = new Date(`${reportDate}T00:00:00`);
    const qcDue = new Date(`${item.qcDue}T00:00:00`);
    const dayBeforeQc = new Date(qcDue);
    dayBeforeQc.setDate(qcDue.getDate() - 1);

    if (report > qcDue) {
      qcStatus = "OVERDUE";
    } else if (report >= dayBeforeQc) {
      qcStatus = "DUE";
    }
  }

  if (milesOverdue || hoursOverdue || qcStatus === "OVERDUE") return "OVERDUE";

  const milesDue = currentMiles !== null && dueMiles !== null && currentMiles >= dueMiles - 250;
  const hoursDue = currentHours !== null && dueHours !== null && currentHours >= dueHours - 15;
  if (milesDue || hoursDue || qcStatus === "DUE") return "DUE";

  return "OK";
};

const getTractorPmStatus = (item, reportDate) => {
  const currentMiles = toNumber(item.miles);
  const dueMiles = toNumber(item.dueAt);
  const currentHours = toNumber(item.hours);
  const dueHours = toNumber(item.hoursDueAt);

  const milesOverdue = currentMiles !== null && dueMiles !== null && currentMiles > dueMiles;
  const hoursOverdue = currentHours !== null && dueHours !== null && currentHours > dueHours;

  let qcStatus = "OK";
  if (reportDate && item.qcDue) {
    const report = new Date(`${reportDate}T00:00:00`);
    const qcDue = new Date(`${item.qcDue}T00:00:00`);
    const dayBeforeQc = new Date(qcDue);
    dayBeforeQc.setDate(qcDue.getDate() - 1);

    if (report > qcDue) {
      qcStatus = "OVERDUE";
    } else if (report >= dayBeforeQc) {
      qcStatus = "DUE";
    }
  }

  if (milesOverdue || hoursOverdue || qcStatus === "OVERDUE") return "OVERDUE";

  const milesDue = currentMiles !== null && dueMiles !== null && currentMiles >= dueMiles - 250;
  const hoursDue = currentHours !== null && dueHours !== null && currentHours >= dueHours - 15;
  if (milesDue || hoursDue || qcStatus === "DUE") return "DUE";

  return "OK";
};

const getPumpPmStatus = (item) => {
  const currentHours = toNumber(item.hours);
  const fuelAirDue = toNumber(item.fuelAirDue);
  const oilDue = toNumber(item.oilDue);
  const pm1000Due = toNumber(item.pm1000Due);

  const overdue = [fuelAirDue, oilDue, pm1000Due].some((due) => currentHours !== null && due !== null && currentHours > due);
  if (overdue) return "OVERDUE";

  const dueSoon = [fuelAirDue, oilDue, pm1000Due].some((due) => currentHours !== null && due !== null && currentHours >= due - 24);
  if (dueSoon) return "DUE";

  return "OK";
};

const getGeneratorPmStatus = (item) => {
  const currentHours = toNumber(item.hours);
  const dueHours = toNumber(item.dueAt);
  if (currentHours !== null && dueHours !== null && currentHours > dueHours) return "OVERDUE";
  if (currentHours !== null && dueHours !== null && currentHours >= dueHours - 24) return "DUE";
  return "OK";
};

const blankRental = () => ({ unit: "", status: "Active", description: "", descriptionOther: "", rentedFrom: "", rentedFromOther: "" });
const blankChemical = () => ({ chemical: "", chemicalOther: "", amount: "" });
const blankTruckPm = () => ({ truck: "", miles: "", engineHours: "", dueAt: "", engineHoursDueAt: "", qcDue: "", status: "OK" });
const blankTractorPm = () => ({ tractor: "", miles: "", hours: "", dueAt: "", hoursDueAt: "", qcDue: "", status: "OK" });
const blankPumpPm = () => ({ pump: "", hours: "", fuelAirDue: "", oilDue: "", pm1000Due: "", status: "OK" });
const blankFuelEntry = () => ({ tankUnit: "", trailer: "", strap: "" });
const blankGeneratorPm = () => ({ unit: "", hours: "", dueAt: "", status: "OK" });

const createInitialState = (fleet = "1") => ({
  date: new Date().toISOString().slice(0, 10),
  fleet,
  shift: "Day",
  employees: {
    dayOperator: "",
    dayAssistants: [""],
    nightOperator: "",
    nightAssistants: [""],
  },
  pumpUnits: [""],
  tractors: [""],
  commandCenters: [{ unit: "", starlink: "", radio: "" }],
  trailers: [{ prefix: "C-", number: "" }],
  ironPackage: '2"',
  dayTrucks: [""],
  nightTrucks: [""],
  chemicalSkids: [""],
  rentalEquipment: [blankRental()],
  misc: {
    bleedOff: "",
    bleedOffSkid: "",
    bleedOffValveManifold: "",
    bleedOffValveManifoldUnit: "",
    containments: "",
    containmentCount: "",
    restraints: "",
    restraintsType: "",
    ponyPump: "",
  },
  thirdParty: {
    acidTransports: [{ provider: "", unit: "" }],
  },
  wsChemicals: [blankChemical()],
  fuel: {
    entries: [blankFuelEntry()],
  },
  pm: {
    trucks: [blankTruckPm(), blankTruckPm()],
    tractors: Array.from({ length: 10 }, () => blankTractorPm()),
    pumps: Array.from({ length: 10 }, () => blankPumpPm()),
    generators: [blankGeneratorPm(), blankGeneratorPm()],
  },
  partsNeeded: Array(10).fill(""),
  issues: Array(10).fill(""),
});

const fleetTabs = ["1", "2", "3", "4", "5", "6", "7"];

const PUMP_OPTIONS = [
  ...Array.from({ length: 11 }, (_, idx) => `FPU-${String(idx + 1).padStart(3, "0")}`),
  "DPU-001 (Roadside)",
  "DPU-001 (Curbside)",
  "LTC-2428",
  "LTC-3113",
  "LTC-0019",
  "LTC-0036",
  "LTC-3068",
];

const TRACTOR_OPTIONS = Array.from({ length: 21 }, (_, idx) => `RT-${String(idx + 5).padStart(2, "0")}`);

const COMMAND_CENTER_OPTIONS = Array.from({ length: 7 }, (_, i) => `CT-${String(i + 1).padStart(3, "0")}`);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const SearchableSelect = memo(function SearchableSelect({ value, onChange, options, placeholder }) {
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

const SavedReportView = memo(function SavedReportView({ report }) {
  if (!report) return null;

  const renderPmCard = (title, item, keyName) => {
    const status = keyName === "Truck"
      ? getTruckPmStatus(item, report.date)
      : keyName === "Tractor"
        ? getTractorPmStatus(item, report.date)
        : keyName === "Pump"
          ? getPumpPmStatus(item)
          : keyName === "Generator"
            ? getGeneratorPmStatus(item)
            : item.status;
    const statusColors = getStatusColors(status);
    return (
      <div style={{ ...statusColors, padding: 10, borderRadius: 10, marginBottom: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
        <div><strong>{keyName}:</strong> {item[keyName.toLowerCase()] || "—"}</div>
        {item.miles ? <div><strong>Current Miles:</strong> {item.miles}</div> : null}
        {item.engineHours ? <div><strong>Current Engine Hours:</strong> {item.engineHours}</div> : null}
        {item.hours ? <div><strong>Current Hours:</strong> {item.hours}</div> : null}
        {item.dueAt ? <div><strong>Miles Service Due At:</strong> {item.dueAt}</div> : null}
        {item.engineHoursDueAt ? <div><strong>Engine Hours Service Due At:</strong> {item.engineHoursDueAt}</div> : null}
        {item.hoursDueAt ? <div><strong>Hours Service Due At:</strong> {item.hoursDueAt}</div> : null}
        {item.qcDue ? <div><strong>QC Due Date:</strong> {item.qcDue}</div> : null}
        {item.fuelAirDue ? <div><strong>Fuel / Air Filters Due At:</strong> {item.fuelAirDue}</div> : null}
        {item.oilDue ? <div><strong>Oil Filters Due At:</strong> {item.oilDue}</div> : null}
        {item.pm1000Due ? <div><strong>1000 HR PM Due At:</strong> {item.pm1000Due}</div> : null}
        {keyName === "Generator" && item.dueAt ? <div><strong>Hours PM Due At:</strong> {item.dueAt}</div> : null}
        <div><strong>Status:</strong> {status}</div>
      </div>
    );
  };

  return (
    <div style={{ fontSize: 14, lineHeight: 1.6 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>🔧 END-OF-SHIFT INVENTORY & PM REPORT</div>
      <div><strong>Date:</strong> {report.date}</div>
      <div><strong>Fleet #:</strong> {report.fleet}</div>
      <div><strong>Shift:</strong> {report.shift}</div>

      <div style={{ marginTop: 12, fontWeight: 700 }}>Employees</div>
      <div><strong>Day Shift Operator:</strong> {report.employees.dayOperator || "—"}</div>
      <div><strong>Day Shift Assistants:</strong> {report.employees.dayAssistants?.filter(Boolean).join(", ") || "—"}</div>
      <div><strong>Night Shift Operator:</strong> {report.employees.nightOperator || "—"}</div>
      <div><strong>Night Shift Assistants:</strong> {report.employees.nightAssistants?.filter(Boolean).join(", ") || "—"}</div>

      <div style={{ marginTop: 12, fontWeight: 700 }}>🚛 Equipment Inventory</div>
      {report.pumpUnits.some(Boolean) ? (
        <div><strong>Pump Units:</strong> {report.pumpUnits.filter(Boolean).join(", ")}</div>
      ) : null}
      {report.tractors.some(Boolean) ? (
        <div><strong>Tractors:</strong> {report.tractors.filter(Boolean).join(", ")}</div>
      ) : null}

      {report.commandCenters?.some((cc) => cc?.unit) ? (
        <div>
          <strong>Command Centers:</strong>
          {report.commandCenters.map((cc, i) => {
            if (!cc?.unit) return null;
            const details = [
              cc.starlink ? `Starlink: ${cc.starlink}` : null,
              cc.radio ? `Full Radio Set: ${cc.radio}` : null,
            ].filter(Boolean).join(" | ");
            return (
              <div key={i} style={{ marginLeft: 8 }}>
                • {cc.unit}{details ? ` (${details})` : ""}
              </div>
            );
          })}
        </div>
      ) : null}

      {report.trailers.some((t) => t.prefix || t.number) ? (
        <div>
          <strong>Support Trailers / Floats:</strong> {report.trailers
            .map((unit) => `${unit.prefix || ""}${unit.number || ""}`)
            .filter(Boolean)
            .join(", ")}
        </div>
      ) : null}

      {report.dayTrucks.some(isRealTruckUnit) ? (
        <div><strong>Day Shift Truck(s):</strong> {report.dayTrucks.filter(isRealTruckUnit).join(", ")}</div>
      ) : null}
      {report.nightTrucks.some(isRealTruckUnit) ? (
        <div><strong>Night Shift Truck(s):</strong> {report.nightTrucks.filter(isRealTruckUnit).join(", ")}</div>
      ) : null}
      {report.chemicalSkids.some(Boolean) ? (
        <div><strong>Chem Add / Chemical Skid(s):</strong> {report.chemicalSkids.filter(Boolean).join(", ")}</div>
      ) : null}

      {report.rentalEquipment.some((item) => item.unit || item.description || item.rentedFrom) ? (
        <>
          <div style={{ marginTop: 12, fontWeight: 700 }}>Rental Equipment</div>
          {report.rentalEquipment.map((item, i) => {
            if (!(item.unit || item.description || item.rentedFrom)) return null;
            return (
              <div key={i} style={{ marginBottom: 6 }}>
                <div><strong>Unit #:</strong> {item.unit || "—"} | <strong>Status:</strong> {item.status}</div>
                <div><strong>Description:</strong> {item.description === "Other" ? (item.descriptionOther || "—") : (item.description || "—")}</div>
                <div><strong>Rented From:</strong> {item.rentedFrom === "Other" ? (item.rentedFromOther || "—") : (item.rentedFrom || "—")}</div>
              </div>
            );
          })}
        </>
      ) : null}

      {(report.misc.bleedOffSkid || report.misc.bleedOffValveManifoldUnit || report.misc.containmentCount || report.misc.restraintsType) ? (
        <>
          <div style={{ marginTop: 12, fontWeight: 700 }}>⚠️ Miscellaneous Equipment</div>
          {report.misc.bleedOffSkid ? <div><strong>Bleed Off Skid:</strong> {report.misc.bleedOffSkid}</div> : null}
          {report.misc.bleedOffValveManifoldUnit ? <div><strong>Bleed Off Valve Manifold Unit:</strong> {report.misc.bleedOffValveManifoldUnit}</div> : null}
          {report.misc.containmentCount ? <div><strong># of Containments:</strong> {report.misc.containmentCount}</div> : null}
          {report.misc.restraintsType ? <div><strong>Restraint Type:</strong> {report.misc.restraintsType}</div> : null}
          {report.misc.ponyPump === "Yes" ? <div><strong>Hydraulic Pony Pump:</strong> Yes</div> : null}
        </>
      ) : null}

      {report.thirdParty.acidTransports?.some(t => t.provider || t.unit) ? (
        <>
          <div style={{ marginTop: 12, fontWeight: 700 }}>🧪 Acid Equipment</div>
          {report.thirdParty.acidTransports.map((t, i) => {
            if (!(t.provider || t.unit)) return null;
            return (
              <div key={i}>
                <strong>Provider:</strong> {t.provider || "—"} | <strong>Unit:</strong> {t.unit || "—"}
              </div>
            );
          })}
        </>
      ) : null}

      {report.wsChemicals.some((item) => item.chemical || item.amount) ? (
        <>
          <div style={{ marginTop: 12, fontWeight: 700 }}>🧪 WS Chemicals On Hand</div>
          {report.wsChemicals.map((item, i) => {
            if (!(item.chemical || item.amount)) return null;
            return <div key={i}>• {item.chemical === "Other" ? (item.chemicalOther || "—") : (item.chemical || "—")} | Amount: {item.amount ? `${item.amount} gallons` : "—"}</div>;
          })}
        </>
      ) : null}

      {report.fuel.entries?.some((entry) => entry.tankUnit || entry.trailer || entry.strap) ? (
        <>
          <div style={{ marginTop: 12, fontWeight: 700 }}>⛽ Fuel Status</div>
          {report.fuel.entries.map((entry, i) => {
            if (!(entry.tankUnit || entry.trailer || entry.strap)) return null;
            return (
              <div key={i} style={{ marginBottom: 6 }}>
                {(entry.tankUnit || entry.trailer) ? (
                  <div>
                    {entry.tankUnit ? <><strong>Tank Unit #:</strong> {entry.tankUnit}</> : null}
                    {entry.tankUnit && entry.trailer ? " | " : null}
                    {entry.trailer ? <><strong>Trailer #:</strong> {entry.trailer}</> : null}
                  </div>
                ) : null}
                {entry.strap ? <div><strong>Fuel Strap Reading:</strong> {entry.strap} inches</div> : null}
              </div>
            );
          })}
        </>
      ) : null}

      <div style={{ marginTop: 12, fontWeight: 700 }}>🛠 Scheduled Maintenance (PM Status)</div>
      <div style={{ marginTop: 8, fontWeight: 700 }}>🛻 Trucks</div>
      {report.pm.trucks.some((item) => item.truck)
        ? report.pm.trucks.map((item, i) => {
            if (!item.truck) return null;
            return <div key={i}>{renderPmCard(`Truck ${i + 1}`, item, "Truck")}</div>;
          })
        : <div>—</div>}

      <div style={{ marginTop: 8, fontWeight: 700 }}>🚜 Tractors</div>
      {report.pm.tractors.some((item) => item.tractor)
        ? report.pm.tractors.map((item, i) => {
            if (!item.tractor) return null;
            return <div key={i}>{renderPmCard(`Tractor ${i + 1}`, item, "Tractor")}</div>;
          })
        : <div>—</div>}

      <div style={{ marginTop: 8, fontWeight: 700 }}>🪛 Pumps</div>
      {report.pm.pumps.some((item) => item.pump)
        ? report.pm.pumps.map((item, i) => {
            if (!item.pump) return null;
            return <div key={i}>{renderPmCard(`Pump ${i + 1}`, item, "Pump")}</div>;
          })
        : <div>—</div>}

      <div style={{ marginTop: 8, fontWeight: 700 }}>⚡ Generators</div>
      {report.pm.generators?.some((item) => item.unit)
        ? report.pm.generators.map((item, i) => {
            if (!item.unit) return null;
            return <div key={i}>{renderPmCard(`Generator ${i + 1}`, item, "Generator")}</div>;
          })
        : <div>—</div>}

      <div style={{ marginTop: 12, fontWeight: 700 }}>🛢️ Oil / Parts / Supplies Needed</div>
      {report.partsNeeded.some(Boolean)
        ? report.partsNeeded.filter(Boolean).map((item, i) => <div key={i}>• {item}</div>)
        : <div>—</div>}

      <div style={{ marginTop: 12, fontWeight: 700 }}>⚠️ Issues / Notes / Follow-Ups</div>
      {report.issues.some(Boolean)
        ? report.issues.filter(Boolean).map((item, i) => <div key={i}>• {item}</div>)
        : <div>—</div>}
    </div>
  );
});

export default function FleetReportApp() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [activeFleet, setActiveFleet] = useState("1");
  const [fleetForms, setFleetForms] = useState(() =>
    fleetTabs.reduce((acc, fleet) => {
      acc[fleet] = createInitialState(fleet);
      return acc;
    }, {})
  );
  const [savedReports, setSavedReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveMessageType, setSaveMessageType] = useState("success");
  const [loadMessage, setLoadMessage] = useState("");
  const [viewMessage, setViewMessage] = useState("");
  const [unitMessage, setUnitMessage] = useState("");

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  const form = fleetForms[activeFleet];

  const fetchSavedReports = useCallback(async () => {
    if (!supabase) {
      setReportsLoading(false);
      return;
    }

    setReportsLoading(true);
    const { data, error } = await supabase
      .from("fleet_reports")
      .select("id, fleet, report_date, shift, report_data, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setReportsLoading(false);
      return;
    }

    const normalized = (data || []).map((row) => ({
      id: row.id,
      ...row.report_data,
      fleet: String(row.fleet ?? row.report_data?.fleet ?? ""),
      date: row.report_date ?? row.report_data?.date ?? "",
      shift: row.shift ?? row.report_data?.shift ?? "Day",
    }));

    setSavedReports(normalized);
    setReportsLoading(false);
  }, []);

  useEffect(() => {
    fetchSavedReports();
  }, [fetchSavedReports]);
  const visibleSavedReports = useMemo(
    () => savedReports.filter((report) => String(report.fleet) === String(activeFleet)),
    [savedReports, activeFleet]
  );

  const updateFleetForm = useCallback((updater) => {
    setFleetForms((prev) => ({
      ...prev,
      [activeFleet]: updater(prev[activeFleet]),
    }));
  }, [activeFleet]);

  const updateField = (key, value) => updateFleetForm((prev) => ({ ...prev, [key]: value }));
  const updateNested = (group, key, value) => updateFleetForm((prev) => ({ ...prev, [group]: { ...prev[group], [key]: value } }));

  const updateArray = (key, index, value) => {
    updateFleetForm((prev) => {
      const isDuplicatePump = key === "pumpUnits" && value && prev.pumpUnits.some((item, idx) => idx !== index && item === value);
      const isDuplicateTractor = key === "tractors" && value && prev.tractors.some((item, idx) => idx !== index && item === value);

      const isTruckValue = isRealTruckUnit(value);
      const isDuplicateDayTruck = key === "dayTrucks" && isTruckValue && (
        prev.dayTrucks.some((item, idx) => idx !== index && item === value) ||
        prev.nightTrucks.some((item) => item === value)
      );
      const isDuplicateNightTruck = key === "nightTrucks" && isTruckValue && (
        prev.nightTrucks.some((item, idx) => idx !== index && item === value) ||
        prev.dayTrucks.some((item) => item === value)
      );

      if (isDuplicatePump || isDuplicateTractor || isDuplicateDayTruck || isDuplicateNightTruck) {
        setUnitMessage(`${value} is already selected on this report`);
        setTimeout(() => setUnitMessage(""), 2500);
        return prev;
      }

      const next = [...prev[key]];
      next[index] = value;

      let nextPm = prev.pm;

      if (key === "pumpUnits") {
        const pumps = [...prev.pm.pumps];
        pumps[index] = { ...pumps[index], pump: value };
        nextPm = { ...prev.pm, pumps };
      }

      if (key === "tractors") {
        const tractors = [...prev.pm.tractors];
        tractors[index] = { ...tractors[index], tractor: value };
        nextPm = { ...nextPm, tractors };
      }

      if (key === "dayTrucks") {
        const trucks = [...prev.pm.trucks];
        trucks[0] = { ...trucks[0], truck: value };
        nextPm = { ...nextPm, trucks };
      }

      if (key === "nightTrucks") {
        const trucks = [...prev.pm.trucks];
        trucks[1] = { ...trucks[1], truck: value };
        nextPm = { ...nextPm, trucks };
      }

      return { ...prev, [key]: next, pm: nextPm };
    });
  };

  const updateEmployee = (key, value) => updateFleetForm((prev) => ({ ...prev, employees: { ...prev.employees, [key]: value } }));

  const updateCommandCenter = (index, key, value) => {
    updateFleetForm((prev) => {
      const next = [...prev.commandCenters];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, commandCenters: next };
    });
  };

  const addCommandCenter = () => {
    updateFleetForm((prev) => {
      if (prev.commandCenters.length >= 2) return prev;
      return { ...prev, commandCenters: [...prev.commandCenters, { unit: "", starlink: "", radio: "" }] };
    });
  };

  const removeCommandCenter = (index) => {
    updateFleetForm((prev) => {
      if (prev.commandCenters.length <= 1) return prev;
      return { ...prev, commandCenters: prev.commandCenters.filter((_, i) => i !== index) };
    });
  };

  const updateTrailer = (index, key, value) => {
    updateFleetForm((prev) => {
      const next = [...prev.trailers];
      const cleanValue = key === "number" ? value.replace(/[^0-9]/g, "") : value;
      next[index] = { ...next[index], [key]: cleanValue };
      return { ...prev, trailers: next };
    });
  };

  const addTrailer = () => {
    updateFleetForm((prev) => {
      if (prev.trailers.length >= 10) return prev;
      return { ...prev, trailers: [...prev.trailers, { prefix: "C-", number: "" }] };
    });
  };

  const removeTrailer = (index) => {
    updateFleetForm((prev) => {
      if (prev.trailers.length <= 1) return prev;
      return { ...prev, trailers: prev.trailers.filter((_, i) => i !== index) };
    });
  };

  const addAssistant = (shift) => {
    updateFleetForm((prev) => {
      const key = shift === "day" ? "dayAssistants" : "nightAssistants";
      const list = prev.employees[key];
      if (list.length >= 6) return prev;
      return { ...prev, employees: { ...prev.employees, [key]: [...list, ""] } };
    });
  };

  const removeAssistant = (shift, index) => {
    updateFleetForm((prev) => {
      const key = shift === "day" ? "dayAssistants" : "nightAssistants";
      const list = prev.employees[key];
      if (list.length <= 1) return prev;
      return { ...prev, employees: { ...prev.employees, [key]: list.filter((_, i) => i !== index) } };
    });
  };

  const addPumpUnit = () => {
    updateFleetForm((prev) => {
      if (prev.pumpUnits.length >= 10) return prev;
      return { ...prev, pumpUnits: [...prev.pumpUnits, ""] };
    });
  };

  const removePumpUnit = (index) => {
    updateFleetForm((prev) => {
      if (prev.pumpUnits.length <= 1) return prev;
      const nextPumpUnits = prev.pumpUnits.filter((_, i) => i !== index);
      const nextPumpPm = [...prev.pm.pumps];
      nextPumpPm[index] = blankPumpPm();
      return { ...prev, pumpUnits: nextPumpUnits, pm: { ...prev.pm, pumps: nextPumpPm } };
    });
  };

  const addTractorUnit = () => {
    updateFleetForm((prev) => {
      if (prev.tractors.length >= 10) return prev;
      return { ...prev, tractors: [...prev.tractors, ""] };
    });
  };

  const removeTractorUnit = (index) => {
    updateFleetForm((prev) => {
      if (prev.tractors.length <= 1) return prev;
      const nextTractors = prev.tractors.filter((_, i) => i !== index);
      const nextTractorPm = [...prev.pm.tractors];
      nextTractorPm[index] = blankTractorPm();
      return { ...prev, tractors: nextTractors, pm: { ...prev.pm, tractors: nextTractorPm } };
    });
  };

  const updateRental = (index, key, value) => {
    updateFleetForm((prev) => {
      const next = [...prev.rentalEquipment];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, rentalEquipment: next };
    });
  };

  const addRentalEquipment = () => {
    updateFleetForm((prev) => {
      if (prev.rentalEquipment.length >= 10) return prev;
      return { ...prev, rentalEquipment: [...prev.rentalEquipment, blankRental()] };
    });
  };

  const removeRentalEquipment = (index) => {
    updateFleetForm((prev) => {
      if (prev.rentalEquipment.length <= 1) return prev;
      return { ...prev, rentalEquipment: prev.rentalEquipment.filter((_, i) => i !== index) };
    });
  };

  const updateChemical = (index, key, value) => {
    updateFleetForm((prev) => {
      const next = [...prev.wsChemicals];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, wsChemicals: next };
    });
  };

  const addChemical = () => {
    updateFleetForm((prev) => {
      if (prev.wsChemicals.length >= 10) return prev;
      return { ...prev, wsChemicals: [...prev.wsChemicals, blankChemical()] };
    });
  };

  const removeChemical = (index) => {
    updateFleetForm((prev) => {
      if (prev.wsChemicals.length <= 1) return prev;
      return { ...prev, wsChemicals: prev.wsChemicals.filter((_, i) => i !== index) };
    });
  };

  const updateFuelEntry = (index, key, value) => {
    updateFleetForm((prev) => {
      const next = [...prev.fuel.entries];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, fuel: { ...prev.fuel, entries: next } };
    });
  };

  const addFuelEntry = () => {
    updateFleetForm((prev) => {
      if (prev.fuel.entries.length >= 3) return prev;
      return { ...prev, fuel: { ...prev.fuel, entries: [...prev.fuel.entries, blankFuelEntry()] } };
    });
  };

  const removeFuelEntry = (index) => {
    updateFleetForm((prev) => {
      if (prev.fuel.entries.length <= 1) return prev;
      return { ...prev, fuel: { ...prev.fuel, entries: prev.fuel.entries.filter((_, i) => i !== index) } };
    });
  };

  const updateAcidTransport = (index, key, value) => {
    updateFleetForm((prev) => {
      const next = [...prev.thirdParty.acidTransports];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, thirdParty: { ...prev.thirdParty, acidTransports: next } };
    });
  };

  const addAcidTransport = () => {
    updateFleetForm((prev) => {
      if (prev.thirdParty.acidTransports.length >= 5) return prev;
      return {
        ...prev,
        thirdParty: {
          ...prev.thirdParty,
          acidTransports: [...prev.thirdParty.acidTransports, { provider: "", unit: "" }],
        },
      };
    });
  };

  const removeAcidTransport = (index) => {
    updateFleetForm((prev) => {
      if (prev.thirdParty.acidTransports.length <= 1) return prev;
      return {
        ...prev,
        thirdParty: {
          ...prev.thirdParty,
          acidTransports: prev.thirdParty.acidTransports.filter((_, i) => i !== index),
        },
      };
    });
  };

  const updatePm = (group, index, key, value) => {
    updateFleetForm((prev) => {
      const nextGroup = [...prev.pm[group]];
      nextGroup[index] = { ...nextGroup[index], [key]: value };
      return { ...prev, pm: { ...prev.pm, [group]: nextGroup } };
    });
  };

  const summary = useMemo(() => {
    const bulletLines = (items) => items.filter(Boolean).map((item) => `• ${item}`).join("\n") || "• ";
    const pumpLines = bulletLines(form.pumpUnits);
    const tractorLines = bulletLines(form.tractors);
    const commandCenterLines = form.commandCenters
      .filter((cc) => cc?.unit)
      .map((cc) => {
        const details = [
          cc.starlink ? `Starlink: ${cc.starlink}` : null,
          cc.radio ? `Full Radio Set: ${cc.radio}` : null,
        ].filter(Boolean).join(" | ");
        return `• ${cc.unit}${details ? ` (${details})` : ""}`;
      })
      .join("\n") || "• ";
    const trailerLines = bulletLines(
      form.trailers
        .map((unit) => `${unit.prefix || ""}${unit.number || ""}`)
        .filter((unit) => unit !== "")
    );
    const issueLines = bulletLines(form.issues.filter(Boolean).slice(0, 2));
    const dayAssistantLines = bulletLines(form.employees.dayAssistants);
    const nightAssistantLines = bulletLines(form.employees.nightAssistants);

    return `🔧 END-OF-SHIFT INVENTORY & PM REPORT
Date: ${form.date}
Fleet #: ${form.fleet}
Shift: ${form.shift}

Employees:
Day Shift Operator: ${form.employees.dayOperator}
Day Shift Assistants:
${dayAssistantLines}
Night Shift Operator: ${form.employees.nightOperator}
Night Shift Assistants:
${nightAssistantLines}

Pump Units:
${pumpLines}

Tractors:
${tractorLines}

Command Centers:
${commandCenterLines}

Support Trailers / Floats:
${trailerLines}

Iron Package: ${form.ironPackage}

Issues / Notes / Follow-Ups:
${issueLines}`;
  }, [form]);

  const getPmValidationErrors = (currentForm) => {
    const errors = [];

    currentForm.pumpUnits.forEach((unit, i) => {
      if (!unit) return;
      const pm = currentForm.pm.pumps[i] || {};
      const missing = [];
      if (!pm.hours) missing.push("Current Hours");
      if (!pm.fuelAirDue) missing.push("Fuel / Air Filters Due At");
      if (!pm.oilDue) missing.push("Oil Filters Due At");
      if (!pm.pm1000Due) missing.push("1000 HR PM Due At");
      if (missing.length) errors.push(`${unit}: ${missing.join(", ")}`);
    });

    currentForm.tractors.forEach((unit, i) => {
      if (!unit) return;
      const pm = currentForm.pm.tractors[i] || {};
      const missing = [];
      if (!pm.miles) missing.push("Current Miles");
      if (!pm.hours) missing.push("Current Hours");
      if (!pm.dueAt) missing.push("Miles Service Due At");
      if (!pm.hoursDueAt) missing.push("Hours Service Due At");
      if (!pm.qcDue) missing.push("QC Due Date");
      if (missing.length) errors.push(`${unit}: ${missing.join(", ")}`);
    });

    const truckChecks = [
      { unit: currentForm.dayTrucks[0], pm: currentForm.pm.trucks[0] || {} },
      { unit: currentForm.nightTrucks[0], pm: currentForm.pm.trucks[1] || {} },
    ];

    truckChecks.forEach(({ unit, pm }) => {
      if (!isRealTruckUnit(unit)) return;
      const missing = [];
      if (!pm.miles) missing.push("Current Miles");
      if (!pm.engineHours) missing.push("Current Engine Hours");
      if (!pm.dueAt) missing.push("Miles Service Due At");
      if (!pm.engineHoursDueAt) missing.push("Engine Hours Service Due At");
      if (!pm.qcDue) missing.push("QC Due Date");
      if (missing.length) errors.push(`${unit}: ${missing.join(", ")}`);
    });

    const generatorUnits = [];
    if (currentForm.tractors.includes("RT-13")) generatorUnits.push("RT-13");
    if (currentForm.commandCenters.some((cc) => cc?.unit === "CT-007")) generatorUnits.push("CT-007");
    generatorUnits.forEach((unit, i) => {
      const pm = currentForm.pm.generators[i] || {};
      const missing = [];
      if (!pm.hours) missing.push("Current Hours");
      if (!pm.dueAt) missing.push("Hours PM Due At");
      if (missing.length) errors.push(`${unit} Generator: ${missing.join(", ")}`);
    });

    return errors;
  };

  const saveReport = async () => {
  if (isSaving) return;

  const pmErrors = getPmValidationErrors(form);
  if (pmErrors.length) {
    setSaveMessageType("error");
    setSaveMessage(`Complete PM before saving: ${pmErrors[0]}`);
    setTimeout(() => setSaveMessage(""), 3500);
    return;
  }

  if (!supabase) {
    setSaveMessageType("error");
    setSaveMessage("Supabase is not connected");
    setTimeout(() => setSaveMessage(""), 3500);
    return;
  }

  setIsSaving(true);
  setSaveMessageType("success");

  const payload = {
    fleet: form.fleet,
    report_date: form.date,
    shift: form.shift,
    report_data: form,
  };

  const { error } = await supabase.from("fleet_reports").insert(payload);

  if (error) {
    console.error(error);
    setSaveMessageType("error");
    setSaveMessage("Save failed");
    setIsSaving(false);
    setTimeout(() => setSaveMessage(""), 3500);
    return;
  }

  await fetchSavedReports();
  setSaveMessage("Report Saved ✅");

  setTimeout(() => {
    setIsSaving(false);
    setSaveMessage("");
  }, 2000);
};

  const loadLastReport = () => {
    const lastForFleet = savedReports.find((report) => String(report.fleet) === String(activeFleet));
    if (!lastForFleet) return;
    updateFleetForm(() => ({ ...lastForFleet, id: undefined, date: new Date().toISOString().slice(0, 10), fleet: activeFleet }));
    setLoadMessage("Last Report Loaded ✅");
    setTimeout(() => setLoadMessage(""), 2000);
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteReport = async (reportId) => {
  if (deletePassword !== "1775") {
    setDeleteMessage("Wrong password");
    return;
  }

  if (!supabase) {
    setDeleteMessage("Supabase is not connected");
    return;
  }

  const { error } = await supabase.from("fleet_reports").delete().eq("id", reportId);

  if (error) {
    console.error(error);
    setDeleteMessage("Delete failed");
    return;
  }

  await fetchSavedReports();

  if (selectedReport?.id === reportId) setSelectedReport(null);

  setDeleteMessage("Report deleted");
  setDeletePassword("");
  setDeleteTargetId(null);
};

  const openDeletePrompt = (reportId) => {
    setDeleteTargetId(reportId);
    setDeletePassword("");
    setDeleteMessage("");
  };

  const cancelDeletePrompt = () => {
    setDeleteTargetId(null);
    setDeletePassword("");
    setDeleteMessage("");
  };

  const viewSavedReport = useCallback((report) => {
    setSelectedReport(report);
    setViewMessage("Viewing Report 👁️");
    setTimeout(() => setViewMessage(""), 2000);
  }, []);

  const loadSavedReport = useCallback((report) => {
    setActiveFleet(String(report.fleet));
    setFleetForms((prev) => ({
      ...prev,
      [String(report.fleet)]: { ...report, id: undefined },
    }));
    setSelectedReport(null);
    setLoadMessage("Report Loaded ✅");
    setTimeout(() => setLoadMessage(""), 2000);
  }, []);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: 16, colorScheme: "light", color: "#111827" }}>
      <div style={{ maxWidth: 1050, margin: "0 auto" }}>
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
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
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>🔧 END-OF-SHIFT INVENTORY & PM REPORT</h1>
          </div>
          <p style={{ color: "#475569", marginBottom: 6 }}>
            Only fill in the sections that apply. Please ensure all equipment on location is added. Fill it out once, then use Load Last Report and only change what changed.
          </p>
          
        </div>

        <div style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr"
        }}>
          <div style={card}>
            <div style={row}>
              <div>
                <label style={label}>Date</label>
                <input style={input} type="date" value={form.date} onChange={(e) => updateField("date", e.target.value)} />
              </div>
              <div>
                <label style={label}>Fleet #</label>
                <input style={{ ...input, background: "#f8fafc", fontWeight: 700 }} value={form.fleet} readOnly />
              </div>
              <div>
                <label style={label}>Shift</label>
                <select style={input} value={form.shift} onChange={(e) => updateField("shift", e.target.value)}>
                  <option value="Day">Day</option>
                  <option value="Night">Night</option>
                </select>
              </div>
            </div>

            <div style={section}>
              <h3>Employees</h3>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                <div>
                  <div><label style={label}>Day Shift Operator</label><input style={input} value={form.employees.dayOperator} onChange={(e) => updateEmployee("dayOperator", e.target.value)} /></div>
                  <label style={label}>Day Shift Assistants</label>
                  {form.employees.dayAssistants.map((v, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input
                        style={{ ...input, flex: 1 }}
                        value={v}
                        onChange={(e) => {
                          const next = [...form.employees.dayAssistants];
                          next[i] = e.target.value;
                          updateFleetForm((prev) => ({ ...prev, employees: { ...prev.employees, dayAssistants: next } }));
                        }}
                      />
                      {form.employees.dayAssistants.length > 1 ? (
                        <button type="button" onClick={() => removeAssistant("day", i)} style={{ ...input, width: "auto", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", WebkitTextFillColor: "#991b1b", fontWeight: 600, cursor: "pointer" }}>Remove</button>
                      ) : null}
                    </div>
                  ))}
                  {form.employees.dayAssistants.length < 6 ? (
                    <button type="button" onClick={() => addAssistant("day")} style={{ ...input, width: "auto", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", WebkitTextFillColor: "#1d4ed8", fontWeight: 600, cursor: "pointer" }}>+ Add Another Assistant</button>
                  ) : null}
                </div>
                <div>
                  <div><label style={label}>Night Shift Operator</label><input style={input} value={form.employees.nightOperator} onChange={(e) => updateEmployee("nightOperator", e.target.value)} /></div>
                  <label style={label}>Night Shift Assistants</label>
                  {form.employees.nightAssistants.map((v, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input
                        style={{ ...input, flex: 1 }}
                        value={v}
                        onChange={(e) => {
                          const next = [...form.employees.nightAssistants];
                          next[i] = e.target.value;
                          updateFleetForm((prev) => ({ ...prev, employees: { ...prev.employees, nightAssistants: next } }));
                        }}
                      />
                      {form.employees.nightAssistants.length > 1 ? (
                        <button type="button" onClick={() => removeAssistant("night", i)} style={{ ...input, width: "auto", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", WebkitTextFillColor: "#991b1b", fontWeight: 600, cursor: "pointer" }}>Remove</button>
                      ) : null}
                    </div>
                  ))}
                  {form.employees.nightAssistants.length < 6 ? (
                    <button type="button" onClick={() => addAssistant("night")} style={{ ...input, width: "auto", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", WebkitTextFillColor: "#1d4ed8", fontWeight: 600, cursor: "pointer" }}>+ Add Another Assistant</button>
                  ) : null}
                </div>
              </div>
            </div>

            <div style={section}>
              <h3>🚛 EQUIPMENT INVENTORY</h3>
              <div style={row}>
                <div>
                  <label style={label}>Pump Units</label>
                  {form.pumpUnits.map((v, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <SearchableSelect
                          value={v}
                          onChange={(nextValue) => updateArray("pumpUnits", i, nextValue)}
                          options={PUMP_OPTIONS}
                          placeholder="Select or type pump"
                        />
                      </div>
                      {form.pumpUnits.length > 1 ? (
                        <button type="button" onClick={() => removePumpUnit(i)} style={{ ...input, width: "auto", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", WebkitTextFillColor: "#991b1b", fontWeight: 600, cursor: "pointer", padding: "10px 12px" }}>Remove</button>
                      ) : null}
                    </div>
                  ))}
                  {form.pumpUnits.length < 10 ? (
                    <button type="button" onClick={addPumpUnit} style={{ ...input, width: "auto", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", WebkitTextFillColor: "#1d4ed8", fontWeight: 600, cursor: "pointer" }}>+ Add Another Pump</button>
                  ) : null}
                </div>

                <div>
                  <label style={label}>Tractors</label>
                  {form.tractors.map((v, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <SearchableSelect
                          value={v}
                          onChange={(nextValue) => updateArray("tractors", i, nextValue)}
                          options={TRACTOR_OPTIONS}
                          placeholder="Select or type tractor"
                        />
                      </div>
                      {form.tractors.length > 1 ? (
                        <button type="button" onClick={() => removeTractorUnit(i)} style={{ ...input, width: "auto", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", WebkitTextFillColor: "#991b1b", fontWeight: 600, cursor: "pointer", padding: "10px 12px" }}>Remove</button>
                      ) : null}
                    </div>
                  ))}
                  {form.tractors.length < 10 ? (
                    <button type="button" onClick={addTractorUnit} style={{ ...input, width: "auto", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", WebkitTextFillColor: "#1d4ed8", fontWeight: 600, cursor: "pointer" }}>+ Add Another Tractor</button>
                  ) : null}
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={label}>Command Centers</label>
                  {form.commandCenters.map((cc, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <select
                          style={{ ...selectInput, flex: 1 }}
                          value={cc.unit}
                          onChange={(e) => updateCommandCenter(i, "unit", e.target.value)}
                        >
                          <option value="">Select Command Center</option>
                          {COMMAND_CENTER_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        {form.commandCenters.length > 1 ? (
                          <button type="button" onClick={() => removeCommandCenter(i)} style={{ ...input, width: "auto", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", WebkitTextFillColor: "#991b1b" }}>Remove</button>
                        ) : null}
                      </div>
                      {cc.unit ? (
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginTop: 8 }}>
                          <div>
                            <label style={label}>Equipped with Starlink?</label>
                            <select style={selectInput} value={cc.starlink} onChange={(e) => updateCommandCenter(i, "starlink", e.target.value)}>
                              <option value="">Select</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </div>
                          <div>
                            <label style={label}>Equipped with Full Radio Set?</label>
                            <select style={selectInput} value={cc.radio} onChange={(e) => updateCommandCenter(i, "radio", e.target.value)}>
                              <option value="">Select</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {form.commandCenters.length < 2 ? (
                    <button type="button" onClick={addCommandCenter} style={{ ...input, width: "auto", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", WebkitTextFillColor: "#1d4ed8" }}>+ Add Another Command Center</button>
                  ) : null}
                </div>

                <div>
                  <label style={label}>Support Trailers / Floats</label>
                  <div style={{ fontSize: 13, color: "#475569", marginBottom: 6 }}>
                    Please ensure all trailers on location are added, including bumper pull trailers, gooseneck trailers, floats, etc.
                  </div>
                  {form.trailers.map((unit, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                      <select style={{ ...selectInput, width: 110 }} value={unit.prefix} onChange={(e) => updateTrailer(i, "prefix", e.target.value)}>
                        <option value="C-">C-</option>
                        <option value="CT-">CT-</option>
                        <option value="FLT-">FLT-</option>
                        <option value="MIT-">MIT-</option>
                      </select>
                      <input style={{ ...input, flex: 1 }} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Numbers only" value={unit.number} onChange={(e) => updateTrailer(i, "number", e.target.value)} />
                      {form.trailers.length > 1 ? (
                        <button type="button" onClick={() => removeTrailer(i)} style={{ ...input, width: "auto", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", WebkitTextFillColor: "#991b1b", fontWeight: 600, cursor: "pointer", padding: "10px 12px" }}>Remove</button>
                      ) : null}
                    </div>
                  ))}
                  {form.trailers.length < 10 ? (
                    <button type="button" onClick={addTrailer} style={{ ...input, width: "auto", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", WebkitTextFillColor: "#1d4ed8", fontWeight: 600, cursor: "pointer" }}>+ Add Another Trailer</button>
                  ) : null}
                </div>
              </div>

              <div style={{ ...row, marginTop: 8 }}>
                <div>
                  <h3>Day Shift Truck(s)</h3>
                  {form.dayTrucks.map((v, i) => {
                    const num = (v || "").replace("C-", "").replace("OTHER", "");
                    const options = ["416","427","430","431","464","496","706","710","715","721","722","723","724","725","727","728","745","746","747","749"];
                    const selected = options.includes(num) ? num : (v === "OTHER" || (!options.includes(num) && num) ? "Other" : "");
                    return (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <div style={{ ...input, width: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", fontWeight: 700 }}>C-</div>
                        <select
                          style={{ ...selectInput, flex: 1 }}
                          value={selected}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "Other") updateArray("dayTrucks", i, "OTHER");
                            else if (!val) updateArray("dayTrucks", i, "");
                            else updateArray("dayTrucks", i, `C-${val}`);
                          }}
                        >
                          <option value="">Select Truck</option>
                          {options.map((o) => <option key={o} value={o}>{o}</option>)}
                          <option value="Other">Other</option>
                        </select>
                        {selected === "Other" ? (
                          <input
                            style={{ ...input, flex: 1 }}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="Numbers only"
                            value={v === "OTHER" ? "" : num}
                            onChange={(e) => updateArray("dayTrucks", i, `C-${e.target.value.replace(/[^0-9]/g, "")}`)}
                          />
                        ) : null}
                        {form.dayTrucks.length > 1 ? (
                          <button type="button" onClick={() => updateFleetForm(prev => ({ ...prev, dayTrucks: prev.dayTrucks.filter((_, idx) => idx !== i) }))} style={{ ...input, width: "auto", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", WebkitTextFillColor: "#991b1b" }}>Remove</button>
                        ) : null}
                      </div>
                    );
                  })}
                  {form.dayTrucks.length < 3 ? (
                    <button type="button" onClick={() => updateFleetForm(prev => ({ ...prev, dayTrucks: [...prev.dayTrucks, ""] }))} style={{ ...input, width: "auto", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", WebkitTextFillColor: "#1d4ed8" }}>+ Add Another Truck</button>
                  ) : null}
                </div>

                <div>
                  <h3>Night Shift Truck(s)</h3>
                  {form.nightTrucks.map((v, i) => {
                    const num = (v || "").replace("C-", "").replace("OTHER", "");
                    const options = ["416","427","430","431","464","496","706","710","715","721","722","723","724","725","727","728","745","746","747","749"];
                    const selected = options.includes(num) ? num : (v === "OTHER" || (!options.includes(num) && num) ? "Other" : "");
                    return (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <div style={{ ...input, width: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", fontWeight: 700 }}>C-</div>
                        <select
                          style={{ ...selectInput, flex: 1 }}
                          value={selected}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "Other") updateArray("nightTrucks", i, "OTHER");
                            else if (!val) updateArray("nightTrucks", i, "");
                            else updateArray("nightTrucks", i, `C-${val}`);
                          }}
                        >
                          <option value="">Select Truck</option>
                          {options.map((o) => <option key={o} value={o}>{o}</option>)}
                          <option value="Other">Other</option>
                        </select>
                        {selected === "Other" ? (
                          <input
                            style={{ ...input, flex: 1 }}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="Numbers only"
                            value={v === "OTHER" ? "" : num}
                            onChange={(e) => updateArray("nightTrucks", i, `C-${e.target.value.replace(/[^0-9]/g, "")}`)}
                          />
                        ) : null}
                        {form.nightTrucks.length > 1 ? (
                          <button type="button" onClick={() => updateFleetForm((prev) => ({ ...prev, nightTrucks: prev.nightTrucks.filter((_, idx) => idx !== i) }))} style={{ ...input, width: "auto", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", WebkitTextFillColor: "#991b1b" }}>Remove</button>
                        ) : null}
                      </div>
                    );
                  })}
                  {form.nightTrucks.length < 3 ? (
                    <button type="button" onClick={() => updateFleetForm((prev) => ({ ...prev, nightTrucks: [...prev.nightTrucks, ""] }))} style={{ ...input, width: "auto", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", WebkitTextFillColor: "#1d4ed8" }}>+ Add Another Truck</button>
                  ) : null}
                </div>
              </div>

              <div style={section}>
                <h3>Chem Add / Chemical Skid(s)</h3>
                {form.chemicalSkids.map((v, i) => {
                  let prefix = "CAT-";
                  let number = "";
                  if (v.startsWith("CAT-")) {
                    prefix = "CAT-";
                    number = v.replace("CAT-", "");
                  } else if (v.startsWith("Chemical Skid #")) {
                    prefix = "Chemical Skid #";
                    number = v.replace("Chemical Skid #", "");
                  }
                  return (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                      <select
                        style={{ ...selectInput, width: 180 }}
                        value={prefix}
                        onChange={(e) => {
                          const newPrefix = e.target.value;
                          updateArray("chemicalSkids", i, `${newPrefix}${number}`);
                        }}
                      >
                        <option value="CAT-">CAT-</option>
                        <option value="Chemical Skid #">Chemical Skid #</option>
                      </select>
                      <input
                        style={{ ...input, flex: 1 }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Numbers only"
                        value={number}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[^0-9]/g, "");
                          updateArray("chemicalSkids", i, `${prefix}${clean}`);
                        }}
                      />
                      {form.chemicalSkids.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => updateFleetForm(prev => ({ ...prev, chemicalSkids: prev.chemicalSkids.filter((_, idx) => idx !== i) }))}
                          style={{ ...input, width: "auto", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", WebkitTextFillColor: "#991b1b" }}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  );
                })}
                {form.chemicalSkids.length < 3 ? (
                  <button
                    type="button"
                    onClick={() => updateFleetForm(prev => ({ ...prev, chemicalSkids: [...prev.chemicalSkids, ""] }))}
                    style={{ ...input, width: "auto", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", WebkitTextFillColor: "#1d4ed8", marginTop: 6 }}
                  >
                    + Add Another Chem Add / Skid
                  </button>
                ) : null}
              </div>

              <div style={section}>
                <h3>Rental Equipment</h3>
                {form.rentalEquipment.map((item, i) => (
                  <div key={i} style={{ ...card, marginBottom: 10, padding: 12 }}>
                    <div style={{ marginBottom: 8 }}>
                      <label style={label}>Rented From</label>
                      <select
                        style={selectInput}
                        value={item.rentedFrom}
                        onChange={(e) => {
                          updateRental(i, "rentedFrom", e.target.value);
                          if (e.target.value !== "Other") updateRental(i, "rentedFromOther", "");
                        }}
                      >
                        <option value="">Select</option>
                        <option value="Equipment Share">Equipment Share</option>
                        <option value="National T&E">National T&E</option>
                        <option value="Kar Equipment">Kar Equipment</option>
                        <option value="Other">Other</option>
                      </select>
                      {item.rentedFrom === "Other" ? (
                        <input style={{ ...input, marginTop: 8 }} value={item.rentedFromOther || ""} placeholder="Type company" onChange={(e) => updateRental(i, "rentedFromOther", e.target.value)} />
                      ) : null}
                    </div>
                    <div style={row}>
                      <div><label style={label}>Unit #</label><input style={input} value={item.unit} onChange={(e) => updateRental(i, "unit", e.target.value)} /></div>
                      <div><label style={label}>Status</label><select style={selectInput} value={item.status} onChange={(e) => updateRental(i, "status", e.target.value)}><option>Active</option><option>Standby</option></select></div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <label style={label}>Description</label>
                      <select
                        style={selectInput}
                        value={item.description}
                        onChange={(e) => {
                          updateRental(i, "description", e.target.value);
                          if (e.target.value !== "Other") updateRental(i, "descriptionOther", "");
                        }}
                      >
                        <option value="">Select Description</option>
                        <option value="Boost Pump">Boost Pump</option>
                        <option value="Generator">Generator</option>
                        <option value="Command Center">Command Center</option>
                        <option value="Other">Other</option>
                      </select>
                      {item.description === "Other" ? (
                        <input style={{ ...input, marginTop: 8 }} value={item.descriptionOther || ""} placeholder="Type description" onChange={(e) => updateRental(i, "descriptionOther", e.target.value)} />
                      ) : null}
                    </div>
                    {form.rentalEquipment.length > 1 ? (
                      <div style={{ marginTop: 10 }}>
                        <button type="button" onClick={() => removeRentalEquipment(i)} style={{ ...input, width: "auto", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", WebkitTextFillColor: "#991b1b", fontWeight: 600, cursor: "pointer" }}>Remove</button>
                      </div>
                    ) : null}
                  </div>
                ))}
                {form.rentalEquipment.length < 10 ? (
                  <button type="button" onClick={addRentalEquipment} style={{ ...input, width: "auto", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", WebkitTextFillColor: "#1d4ed8", fontWeight: 600, cursor: "pointer" }}>+ Add Another Rental Item</button>
                ) : null}
              </div>
            </div>

            <div style={section}>
              <h3>⚠️ MISCELLANEOUS EQUIPMENT</h3>

  <div style={{ display: "grid", gap: 12 }}>
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, alignItems: "end" }}>
      <div>
        <label style={label}>Hydraulic Bleed Off Skid on Location?</label>
        <select
style={selectInput}
          value={form.misc.bleedOff}
          onChange={(e) => {
            updateNested("misc", "bleedOff", e.target.value);
            if (e.target.value !== "Yes") {
              updateNested("misc", "bleedOffSkid", "");
            }
          }}
        >
          <option value="">Select</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      <div>
        {form.misc.bleedOff === "Yes" ? (
          <>
            <label style={label}>Bleed Off Skid Unit</label>
            <select
style={selectInput}
              value={form.misc.bleedOffSkid || ""}
              onChange={(e) => updateNested("misc", "bleedOffSkid", e.target.value)}
            >
              <option value="">Select Skid</option>
              {Array.from({ length: 15 }, (_, i) => {
                const num = String(i + 1).padStart(2, "0");
                return `WS-BOS-${num}`;
              }).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </>
        ) : null}
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, alignItems: "end" }}>
      <div>
        <label style={label}>Hydraulic Bleed Off Valve Manifold on Location?</label>
        <select
style={selectInput}
          value={form.misc.bleedOffValveManifold}
          onChange={(e) => {
            updateNested("misc", "bleedOffValveManifold", e.target.value);
            if (e.target.value !== "Yes") {
              updateNested("misc", "bleedOffValveManifoldUnit", "");
            }
          }}
        >
          <option value="">Select</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      <div>
        {form.misc.bleedOffValveManifold === "Yes" ? (
          <>
            <label style={label}>Valve Manifold Unit</label>
            <select
style={selectInput}
              value={form.misc.bleedOffValveManifoldUnit || ""}
              onChange={(e) => updateNested("misc", "bleedOffValveManifoldUnit", e.target.value)}
            >
              <option value="">Select Unit</option>
              <option value="WS-BOM-01">WS-BOM-01</option>
              <option value="WS-BOM-02">WS-BOM-02</option>
              {Array.from({ length: 13 }, (_, i) => {
                const num = String(i + 3).padStart(2, "0");
                return `WS-HBO-${num}`;
              }).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </>
        ) : null}
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, alignItems: "end" }}>
      <div>
        <label style={label}>WS Provided Containments?</label>
        <select
style={selectInput}
          value={form.misc.containments}
          onChange={(e) => {
            updateNested("misc", "containments", e.target.value);
            if (e.target.value !== "Yes") {
              updateNested("misc", "containmentCount", "");
            }
          }}
        >
          <option value="">Select</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      <div>
        {form.misc.containments === "Yes" ? (
          <>
            <label style={label}># of Containments</label>
            <input
              style={input}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.misc.containmentCount || ""}
              onChange={(e) => updateNested("misc", "containmentCount", e.target.value.replace(/[^0-9]/g, ""))}
            />
          </>
        ) : null}
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, alignItems: "end" }}>
      <div>
        <label style={label}>Restraints?</label>
        <select
style={selectInput}
          value={form.misc.restraints}
          onChange={(e) => {
            updateNested("misc", "restraints", e.target.value);
            if (e.target.value !== "Yes") {
              updateNested("misc", "restraintsType", "");
            }
          }}
        >
          <option value="">Select</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      <div>
        {form.misc.restraints === "Yes" ? (
          <>
            <label style={label}>Restraint Type</label>
            <select
style={selectInput}
              value={form.misc.restraintsType || ""}
              onChange={(e) => updateNested("misc", "restraintsType", e.target.value)}
            >
              <option value="">Select Type</option>
              <option value="Ribs & Splines">Ribs & Splines</option>
              <option value="Blue Whip Checks">Blue Whip Checks</option>
            </select>
          </>
        ) : null}
      </div>
    </div>

    <div style={{ marginTop: 12 }}>
      <label style={label}>Hydraulic Pony Pump?</label>
      <select
style={selectInput}
        value={form.misc.ponyPump}
        onChange={(e) => updateNested("misc", "ponyPump", e.target.value)}
      >
        <option value="">Select</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    </div>

  </div>
</div>

            <div style={section}>
  <h3>🧪 ACID EQUIPMENT</h3>

  {form.thirdParty.acidTransports.map((item, i) => (
    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-end" }}>
      <div style={{ flex: 1 }}>
        <label style={label}>Acid Transport Provider</label>
        <select
style={selectInput}
          value={item.provider}
          onChange={(e) => updateAcidTransport(i, "provider", e.target.value)}
        >
          <option value="">Select Provider</option>
          <option value="OneCor">OneCor</option>
          <option value="WolfEx">WolfEx</option>
          <option value="Tarquin">Tarquin</option>
          <option value="CNR">CNR</option>
        </select>
      </div>

      <div style={{ flex: 1 }}>
        <label style={label}>Unit #</label>
        <input
          style={input}
          value={item.unit}
          onChange={(e) => updateAcidTransport(i, "unit", e.target.value)}
        />
      </div>

      {form.thirdParty.acidTransports.length > 1 && (
        <button
          type="button"
          onClick={() => removeAcidTransport(i)}
          style={{ ...input, width: "auto", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b" }}
        >
          Remove
        </button>
      )}
    </div>
  ))}

  {form.thirdParty.acidTransports.length < 5 && (
    <button
      type="button"
      onClick={addAcidTransport}
      style={{ ...input, width: "auto", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", marginTop: 6 }}
    >
      + Add Another Acid Transport
    </button>
  )}
</div>

            <div style={section}>
              <h3>🧪 WS CHEMICALS ON HAND</h3>
              {form.wsChemicals.map((item, i) => (
                <div key={i} style={{ ...card, marginBottom: 10, padding: 12 }}>
                  <div style={row}>
                    <div>
  <label style={label}>Chemical</label>
  <select
style={selectInput}
    value={item.chemical}
    onChange={(e) => {
      updateChemical(i, "chemical", e.target.value);
      if (e.target.value !== "Other") {
        updateChemical(i, "chemicalOther", "");
      }
    }}
  >
    <option value="">Select Chemical</option>
    <option value="Friction Reducer">Friction Reducer</option>
    <option value="Biocide">Biocide</option>
    <option value="Pipe-on-Pipe">Pipe-on-Pipe</option>
    <option value="Scale Inhibitor">Scale Inhibitor</option>
    <option value="Iron Control">Iron Control</option>
    <option value="Other">Other</option>
  </select>
  {item.chemical === "Other" ? (
    <input
      style={{ ...input, marginTop: 8 }}
      placeholder="Type chemical"
      value={item.chemicalOther || ""}
      onChange={(e) => updateChemical(i, "chemicalOther", e.target.value)}
    />
  ) : null}
</div>
                    <div>
  <label style={label}>Amount (Gallons)</label>
  <input
    style={input}
    type="text"
    inputMode="numeric"
    pattern="[0-9]*"
    placeholder="Gallons"
    value={item.amount}
    onChange={(e) => updateChemical(i, "amount", e.target.value.replace(/[^0-9]/g, ""))}
  />
</div>
                  </div>
                  {form.wsChemicals.length > 1 ? (
                    <div style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => removeChemical(i)}
                        style={{ ...input, width: "auto", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", WebkitTextFillColor: "#991b1b", fontWeight: 600, cursor: "pointer" }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              {form.wsChemicals.length < 10 ? (
                <button
                  type="button"
                  onClick={addChemical}
                  style={{ ...input, width: "auto", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", WebkitTextFillColor: "#1d4ed8", fontWeight: 600, cursor: "pointer" }}
                >
                  + Add Another Chemical
                </button>
              ) : null}
            </div>

            <div style={section}>
              <h3>⛽ FUEL STATUS</h3>
              {form.fuel.entries.map((entry, i) => (
                <div key={i} style={{ ...card, marginBottom: 10, padding: 12 }}>
                  <div style={row}>
                    <div>
                      <label style={label}>Tank Unit #</label>
                      <input
                        style={input}
                        list={`fuelTankOptions-${i}`}
                        placeholder="Select or type tank"
                        value={entry.tankUnit}
                        onChange={(e) => updateFuelEntry(i, "tankUnit", e.target.value)}
                      />
                      <datalist id={`fuelTankOptions-${i}`}>
                        <option value="MS-2136-P" />
                        <option value="MS-2148-P" />
                      </datalist>
                    </div>
                    <div>
                      <label style={label}>Fuel Trailer #</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ ...input, width: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", fontWeight: 700 }}>C-</div>
                        <input
                          style={{ ...input, flex: 1 }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Numbers only"
                          value={(entry.trailer || "").replace("C-", "")}
                          onChange={(e) => updateFuelEntry(i, "trailer", `C-${e.target.value.replace(/[^0-9]/g, "")}`)}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={label}>Fuel Strap Reading (inches)</label>
                      <input
                        style={input}
                        type="text"
                        inputMode="decimal"
                        placeholder="Inches"
                        value={entry.strap}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[^0-9.]/g, "");
                          const valid = clean.split(".").length <= 2 ? clean : entry.strap;
                          updateFuelEntry(i, "strap", valid);
                        }}
                      />
                    </div>
                  </div>
                  {form.fuel.entries.length > 1 ? (
                    <div style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => removeFuelEntry(i)}
                        style={{ ...input, width: "auto", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", WebkitTextFillColor: "#991b1b" }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              {form.fuel.entries.length < 3 ? (
                <button
                  type="button"
                  onClick={addFuelEntry}
                  style={{ ...input, width: "auto", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", WebkitTextFillColor: "#1d4ed8" }}
                >
                  + Add Another Fuel Entry
                </button>
              ) : null}
            </div>

            <div style={section}>
              <h3>🛠 SCHEDULED MAINTENANCE (PM STATUS)</h3>
              <h4>🛻 TRUCKS</h4>
              {isRealTruckUnit(form.dayTrucks[0]) ? (() => {
                const item = form.pm.trucks[0];
                const truckStatus = getTruckPmStatus(item, form.date);
                const statusColors = getStatusColors(truckStatus);
                return (
                  <div style={{ ...card, ...statusColors, marginBottom: 10, padding: 12 }}>
                    <div style={row}>
                      <div><label style={label}>Truck #</label><input style={{ ...input, background: "#f8fafc", fontWeight: 700 }} value={item.truck} readOnly /></div>
                      <div><label style={label}>Current Miles</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.miles} onChange={(e) => updatePm("trucks", 0, "miles", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={label}>Current Engine Hours</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.engineHours || ""} onChange={(e) => updatePm("trucks", 0, "engineHours", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={label}>Miles Service Due At</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.dueAt} onChange={(e) => updatePm("trucks", 0, "dueAt", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={label}>Engine Hours Service Due At</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.engineHoursDueAt || ""} onChange={(e) => updatePm("trucks", 0, "engineHoursDueAt", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={label}>QC Due Date</label><input style={input} type="date" value={item.qcDue} onChange={(e) => updatePm("trucks", 0, "qcDue", e.target.value)} /></div>
                      <div><label style={label}>Status</label><input style={{ ...input, background: "#f8fafc", fontWeight: 700 }} value={truckStatus} readOnly /></div>
                    </div>
                  </div>
                );
              })() : <div style={{ color: "#64748b", marginBottom: 10 }}>Add a day shift truck above to enable truck PM.</div>}

              {isRealTruckUnit(form.nightTrucks[0]) ? (() => {
                const item = form.pm.trucks[1];
                const truckStatus = getTruckPmStatus(item, form.date);
                const statusColors = getStatusColors(truckStatus);
                return (
                  <div style={{ ...card, ...statusColors, marginBottom: 10, padding: 12 }}>
                    <div style={row}>
                      <div><label style={label}>Truck #</label><input style={{ ...input, background: "#f8fafc", fontWeight: 700 }} value={item.truck} readOnly /></div>
                      <div><label style={label}>Current Miles</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.miles} onChange={(e) => updatePm("trucks", 1, "miles", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={label}>Current Engine Hours</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.engineHours || ""} onChange={(e) => updatePm("trucks", 1, "engineHours", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={label}>Miles Service Due At</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.dueAt} onChange={(e) => updatePm("trucks", 1, "dueAt", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={label}>Engine Hours Service Due At</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.engineHoursDueAt || ""} onChange={(e) => updatePm("trucks", 1, "engineHoursDueAt", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={label}>QC Due Date</label><input style={input} type="date" value={item.qcDue} onChange={(e) => updatePm("trucks", 1, "qcDue", e.target.value)} /></div>
                      <div><label style={label}>Status</label><input style={{ ...input, background: "#f8fafc", fontWeight: 700 }} value={truckStatus} readOnly /></div>
                    </div>
                  </div>
                );
              })() : null}

              <h4>🚜 TRACTORS</h4>
              {form.tractors.some(Boolean) ? form.pm.tractors.map((item, i) => {
                if (!form.tractors[i]) return null;
                const tractorStatus = getTractorPmStatus(item, form.date);
                const statusColors = getStatusColors(tractorStatus);
                return (
                  <div key={i} style={{ ...card, ...statusColors, marginBottom: 10, padding: 12 }}>
                    <div style={row}>
                      <div><label style={label}>Tractor #</label><input style={{ ...input, background: "#f8fafc", fontWeight: 700 }} value={item.tractor} readOnly /></div>
                      <div><label style={label}>Current Miles</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.miles} onChange={(e) => updatePm("tractors", i, "miles", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={label}>Current Hours</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.hours} onChange={(e) => updatePm("tractors", i, "hours", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={label}>Miles Service Due At</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.dueAt} onChange={(e) => updatePm("tractors", i, "dueAt", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={label}>Hours Service Due At</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.hoursDueAt || ""} onChange={(e) => updatePm("tractors", i, "hoursDueAt", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={label}>QC Due Date</label><input style={input} type="date" value={item.qcDue || ""} onChange={(e) => updatePm("tractors", i, "qcDue", e.target.value)} /></div>
                      <div><label style={label}>Status</label><input style={{ ...input, background: "#f8fafc", fontWeight: 700 }} value={getTractorPmStatus(item, form.date)} readOnly /></div>
                    </div>
                  </div>
                );
              }) : <div style={{ color: "#64748b", marginBottom: 10 }}>Add tractors above to enable tractor PM.</div>}

              <h4>🪛 PUMPS</h4>
              {form.pumpUnits.some(Boolean) ? form.pm.pumps.map((item, i) => {
                if (!form.pumpUnits[i]) return null;
                const pumpStatus = getPumpPmStatus(item);
                const statusColors = getStatusColors(pumpStatus);
                return (
                  <div key={i} style={{ ...card, ...statusColors, marginBottom: 10, padding: 12 }}>
                    <div style={row}>
                      <div><label style={label}>Pump #</label><input style={{ ...input, background: "#f8fafc", fontWeight: 700 }} value={item.pump} readOnly /></div>
                      <div><label style={label}>Current Hours</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.hours} onChange={(e) => updatePm("pumps", i, "hours", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={label}>Fuel / Air Filters Due At</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.fuelAirDue} onChange={(e) => updatePm("pumps", i, "fuelAirDue", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={label}>Oil Filters Due At</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.oilDue} onChange={(e) => updatePm("pumps", i, "oilDue", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={label}>1000 HR PM Due At</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.pm1000Due} onChange={(e) => updatePm("pumps", i, "pm1000Due", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={label}>Status</label><input style={{ ...input, background: "#f8fafc", fontWeight: 700 }} value={pumpStatus} readOnly /></div>
                    </div>
                  </div>
                );
              }) : <div style={{ color: "#64748b", marginBottom: 10 }}>Add pumps above to enable pump PM.</div>}

              <h4>⚡ GENERATORS</h4>
              {(() => {
                const generatorUnits = [];
                if (form.tractors.includes("RT-13")) generatorUnits.push("RT-13");
                if (form.commandCenters.some((cc) => cc?.unit === "CT-007")) generatorUnits.push("CT-007");

                if (!generatorUnits.length) {
                  return <div style={{ color: "#64748b", marginBottom: 10 }}>Select RT-13 or CT-007 above to enable generator PM.</div>;
                }

                return generatorUnits.map((unit, i) => {
                  const item = { ...(form.pm.generators[i] || blankGeneratorPm()), unit };
                  const generatorStatus = getGeneratorPmStatus(item);
                  const statusColors = getStatusColors(generatorStatus);
                  return (
                    <div key={unit} style={{ ...card, ...statusColors, marginBottom: 10, padding: 12 }}>
                      <div style={row}>
                        <div><label style={label}>Generator Unit</label><input style={{ ...input, background: "#f8fafc", fontWeight: 700 }} value={unit} readOnly /></div>
                        <div><label style={label}>Current Hours</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.hours} onChange={(e) => updatePm("generators", i, "unit", unit) || updatePm("generators", i, "hours", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                        <div><label style={label}>Hours PM Due At</label><input style={input} type="text" inputMode="numeric" pattern="[0-9]*" value={item.dueAt} onChange={(e) => updatePm("generators", i, "unit", unit) || updatePm("generators", i, "dueAt", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                        <div><label style={label}>Status</label><input style={{ ...input, background: "#f8fafc", fontWeight: 700 }} value={generatorStatus} readOnly /></div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div style={section}>
              <h3>🛢️ OIL / PARTS / SUPPLIES NEEDED</h3>
              {form.partsNeeded.map((v, i) => (
                <input key={i} style={{ ...input, marginBottom: 8 }} value={v} onChange={(e) => updateArray("partsNeeded", i, e.target.value)} />
              ))}
            </div>

            <div style={section}>
              <h3>⚠️ ISSUES / NOTES / FOLLOW-UPS</h3>
              {form.issues.map((v, i) => (
                <input key={i} style={{ ...input, marginBottom: 8 }} value={v} onChange={(e) => updateArray("issues", i, e.target.value)} />
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18, alignItems: "center" }}>
              <button
  onClick={saveReport}
  disabled={isSaving}
  style={{
    ...input,
    width: "auto",
    cursor: isSaving ? "not-allowed" : "pointer",
    background: isSaving ? "#9ca3af" : "#111827",
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
    border: "none",
    padding: "12px 16px",
  }}
>
  {isSaving ? "Saving..." : "Save Report"}
</button>
{saveMessage && (
  <div style={{ color: saveMessageType === "error" ? "#b91c1c" : "#166534", fontWeight: 600 }}>{saveMessage}</div>
)}
{loadMessage && (
  <div style={{ color: "#1d4ed8", fontWeight: 600 }}>{loadMessage}</div>
)}
{viewMessage && (
  <div style={{ color: "#7c3aed", fontWeight: 600 }}>{viewMessage}</div>
)}
{unitMessage && (
  <div style={{ color: "#b45309", fontWeight: 600 }}>{unitMessage}</div>
)}
              <button onClick={loadLastReport} style={{ ...input, width: "auto", cursor: "pointer", background: "#e2e8f0", border: "none", padding: "12px 16px" }}>Load Last Report</button>
              <button onClick={copySummary} style={{ ...input, width: "auto", cursor: "pointer", background: "#dbeafe", border: "none", padding: "12px 16px" }}>Copy Summary</button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <div style={card}>
              <h3 style={{ marginTop: 0 }}>{selectedReport ? "Saved Report View" : "Preview"}</h3>
              {selectedReport ? (
                <SavedReportView report={selectedReport} />
              ) : (
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, margin: 0 }}>{summary}</pre>
              )}
            </div>

            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Saved Reports – Fleet {activeFleet}</h3>

              {reportsLoading ? (
                <p style={{ color: "#64748b" }}>Loading reports...</p>
              ) : visibleSavedReports.length === 0 ? (
                <p style={{ color: "#64748b" }}>No saved reports yet.</p>
              ) : (
                visibleSavedReports.map((r) => (
                  <div key={r.id} style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10, marginTop: 10 }}>
                    <strong>Fleet {r.fleet || "No Fleet"}</strong>
                    <div>{r.shift} shift • {r.date}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
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
                    </div>

                    {deleteTargetId === r.id ? (
                      <div style={{ marginTop: 10, padding: 12, border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 12 }}>
                        <label style={label}>Enter delete password</label>
                        <input
                          style={input}
                          type="password"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          placeholder="Password required"
                        />
                        {deleteMessage ? (
                          <div style={{ marginTop: 6, fontSize: 14, color: deleteMessage === "Wrong password" ? "#b91c1c" : "#166534" }}>
                            {deleteMessage}
                          </div>
                        ) : null}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
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
          </div>
        </div>
      </div>
    </div>
  );
}
