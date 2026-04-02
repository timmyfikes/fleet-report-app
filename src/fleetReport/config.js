import { createClient } from "@supabase/supabase-js";

export const input = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  fontSize: 15,
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#111827",
  colorScheme: "light",
  WebkitTextFillColor: "#111827",
  appearance: "none",
  boxShadow: "inset 0 1px 2px rgba(15,23,42,0.04)",
};

export const selectInput = {
  ...input,
  paddingRight: 36,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M5 7.5L10 12.5L15 7.5' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  backgroundSize: "14px",
  cursor: "pointer",
};

export const section = {
  marginTop: 16,
  padding: 14,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
};

export const row = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
};

export const card = {
  background: "#ffffff",
  border: "1px solid #dfe6ef",
  borderRadius: 20,
  padding: 18,
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
};

export const label = {
  display: "block",
  fontWeight: 600,
  marginBottom: 6,
  color: "#1f2937",
};

export const NOTIFICATION_MS = 5000;

export const notificationBase = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 700,
  border: "1px solid transparent",
  boxShadow: "0 6px 16px rgba(15,23,42,0.08)",
};

export const notificationStyles = {
  success: { background: "#ecfdf3", borderColor: "#86efac", color: "#166534" },
  error: { background: "#fef2f2", borderColor: "#fca5a5", color: "#991b1b" },
  info: { background: "#eff6ff", borderColor: "#93c5fd", color: "#1d4ed8" },
  warning: { background: "#fffbeb", borderColor: "#fcd34d", color: "#92400e" },
};

export const notificationStrip = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  minHeight: 34,
  marginTop: 10,
};

export const addActionButton = {
  ...input,
  width: "auto",
  background: "#eff6ff",
  border: "1px solid #93c5fd",
  color: "#1d4ed8",
  WebkitTextFillColor: "#1d4ed8",
  fontWeight: 600,
  cursor: "pointer",
};

export const getStatusColors = (status) => {
  if (status === "OK") return { background: "#dcfce7", border: "1px solid #86efac", color: "#166534" };
  if (status === "DUE") return { background: "#fef9c3", border: "1px solid #fde047", color: "#854d0e" };
  if (status === "OVERDUE") return { background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b" };
  return { background: "#fff", border: "1px solid #e5e7eb", color: "#111827" };
};

export const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export const toNameCase = (value) =>
  (value || "")
    .toLowerCase()
    .replace(/(^|[\s-'])([a-z])/g, (match, separator, letter) => `${separator}${letter.toUpperCase()}`);

export const isRealTruckUnit = (value) => typeof value === "string" && /^C-\d+$/.test(value);

export const getTruckPmStatus = (item, reportDate) => {
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

export const getTractorPmStatus = (item, reportDate) => {
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

export const getPumpPmStatus = (item) => {
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

export const getGeneratorPmStatus = (item) => {
  const currentHours = toNumber(item.hours);
  const dueHours = toNumber(item.dueAt);
  if (currentHours !== null && dueHours !== null && currentHours > dueHours) return "OVERDUE";
  if (currentHours !== null && dueHours !== null && currentHours >= dueHours - 24) return "DUE";
  return "OK";
};

export const blankRental = () => ({ unit: "", status: "Active", description: "", descriptionOther: "", rentedFrom: "", rentedFromOther: "" });
export const blankChemical = () => ({ chemical: "", chemicalOther: "", amount: "" });
export const blankTruckPm = () => ({ truck: "", miles: "", engineHours: "", dueAt: "", engineHoursDueAt: "", qcDue: "", status: "OK" });
export const blankTractorPm = () => ({ tractor: "", miles: "", hours: "", dueAt: "", hoursDueAt: "", qcDue: "", status: "OK" });
export const blankPumpPm = () => ({ pump: "", hours: "", fuelAirDue: "", oilDue: "", pm1000Due: "", status: "OK" });
export const blankFuelEntry = () => ({ tankUnit: "", trailer: "", strap: "" });
export const blankGeneratorPm = () => ({ unit: "", hours: "", dueAt: "", status: "OK" });

export const createInitialState = (fleet = "1") => ({
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
  ironPackageSource: "WS Owned",
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
    fuelCube: "",
  },
  thirdParty: {
    acidTransports: [{ provider: "", unit: "", strap: "" }],
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
  partsNeeded: [""],
  issues: [""],
});

export const fleetTabs = ["1", "2", "3", "4", "5", "6", "7"];

export const FLEET_DRAFT_STORAGE_PREFIX = "fleet-report-draft-v1";
export const getFleetDraftKey = (fleet) => `${FLEET_DRAFT_STORAGE_PREFIX}-${fleet}`;
export const toArrayOrFallback = (value, fallback) => (Array.isArray(value) ? value : fallback);

export const loadFleetDraft = (fleet) => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getFleetDraftKey(fleet));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch (error) {
    console.error(`Unable to read local draft for fleet ${fleet}`, error);
    return null;
  }
};

export const buildFleetStateFromDraft = (fleet) => {
  const initial = createInitialState(fleet);
  const draft = loadFleetDraft(fleet);
  if (!draft) return initial;

  return {
    ...initial,
    ...draft,
    fleet,
    employees: {
      ...initial.employees,
      ...(draft.employees || {}),
      dayAssistants: toArrayOrFallback(draft.employees?.dayAssistants, initial.employees.dayAssistants),
      nightAssistants: toArrayOrFallback(draft.employees?.nightAssistants, initial.employees.nightAssistants),
    },
    commandCenters: toArrayOrFallback(draft.commandCenters, initial.commandCenters),
    trailers: toArrayOrFallback(draft.trailers, initial.trailers),
    pumpUnits: toArrayOrFallback(draft.pumpUnits, initial.pumpUnits),
    tractors: toArrayOrFallback(draft.tractors, initial.tractors),
    dayTrucks: toArrayOrFallback(draft.dayTrucks, initial.dayTrucks),
    nightTrucks: toArrayOrFallback(draft.nightTrucks, initial.nightTrucks),
    chemicalSkids: toArrayOrFallback(draft.chemicalSkids, initial.chemicalSkids),
    rentalEquipment: toArrayOrFallback(draft.rentalEquipment, initial.rentalEquipment),
    misc: {
      ...initial.misc,
      ...(draft.misc || {}),
    },
    thirdParty: {
      ...initial.thirdParty,
      ...(draft.thirdParty || {}),
      acidTransports: toArrayOrFallback(draft.thirdParty?.acidTransports, initial.thirdParty.acidTransports),
    },
    wsChemicals: toArrayOrFallback(draft.wsChemicals, initial.wsChemicals),
    fuel: {
      ...initial.fuel,
      ...(draft.fuel || {}),
      entries: toArrayOrFallback(draft.fuel?.entries, initial.fuel.entries),
    },
    pm: {
      ...initial.pm,
      ...(draft.pm || {}),
      trucks: toArrayOrFallback(draft.pm?.trucks, initial.pm.trucks),
      tractors: toArrayOrFallback(draft.pm?.tractors, initial.pm.tractors),
      pumps: toArrayOrFallback(draft.pm?.pumps, initial.pm.pumps),
      generators: toArrayOrFallback(draft.pm?.generators, initial.pm.generators),
    },
    partsNeeded: toArrayOrFallback(draft.partsNeeded, initial.partsNeeded),
    issues: toArrayOrFallback(draft.issues, initial.issues),
  };
};

export const PUMP_OPTIONS = [
  ...Array.from({ length: 11 }, (_, idx) => `FPU-${String(idx + 1).padStart(3, "0")}`),
  "DPU-001 (Roadside)",
  "DPU-001 (Curbside)",
  "LTC-2428",
  "LTC-3113",
  "LTC-0019",
  "LTC-0036",
  "LTC-3068",
];

export const TRACTOR_OPTIONS = Array.from({ length: 21 }, (_, idx) => `RT-${String(idx + 5).padStart(2, "0")}`);

export const COMMAND_CENTER_OPTIONS = Array.from({ length: 7 }, (_, i) => `CT-${String(i + 1).padStart(3, "0")}`);

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
