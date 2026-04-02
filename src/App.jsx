import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  input,
  selectInput,
  section,
  row,
  card,
  label,
  NOTIFICATION_MS,
  addActionButton,
  notificationBase,
  notificationStyles,
  notificationStrip,
  getStatusColors,
  getTruckPmStatus,
  getTractorPmStatus,
  getPumpPmStatus,
  getGeneratorPmStatus,
  blankGeneratorPm,
  blankPumpPm,
  blankTractorPm,
  blankFuelEntry,
  blankChemical,
  blankRental,
  buildFleetStateFromDraft,
  loadFleetDraft,
  getFleetDraftKey,
  fleetTabs,
  PUMP_OPTIONS,
  TRACTOR_OPTIONS,
  COMMAND_CENTER_OPTIONS,
  supabase,
  isRealTruckUnit,
  toNameCase,
} from "./fleetReport/config";
import { SearchableSelect } from "./fleetReport/SearchableSelect";
import { formatReportForTeams } from "./fleetReport/formatReportForTeams";
import wsEnergyLogo from "./assets/ws_energy_svcs_logo.jpeg";
import { HeaderCard } from "./fleetReport/components/HeaderCard";
import { PreviewPanel } from "./fleetReport/components/PreviewPanel";
import { SavedReportsPanel } from "./fleetReport/components/SavedReportsPanel";
import { DeleteAccessModal } from "./fleetReport/components/DeleteAccessModal";
import { HelpModal } from "./fleetReport/components/HelpModal";

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
      acc[fleet] = buildFleetStateFromDraft(fleet);
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
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteUnlocked, setDeleteUnlocked] = useState(false);
  const [showDeleteAccessPrompt, setShowDeleteAccessPrompt] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showPmValidation, setShowPmValidation] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  const form = fleetForms[activeFleet];
  const equipmentBox = {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 12,
  };

  const fetchSavedReports = useCallback(async () => {
    if (!supabase) {
      setReportsLoading(false);
      return;
    }

    setReportsLoading(true);
    const { data, error } = await supabase
      .from("reports")
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSavedReports();
  }, [fetchSavedReports]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const timeoutId = window.setTimeout(() => {
      Object.entries(fleetForms).forEach(([fleet, data]) => {
        try {
          window.localStorage.setItem(getFleetDraftKey(fleet), JSON.stringify(data));
        } catch (error) {
          console.error(`Unable to save local draft for fleet ${fleet}`, error);
        }
      });
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [fleetForms]);

  const visibleSavedReports = useMemo(
    () => savedReports.filter((report) => String(report.fleet) === String(activeFleet)),
    [savedReports, activeFleet]
  );

  const resolvedSelectedReport = useMemo(() => {
    if (selectedReport) return selectedReport;
    const latestForActiveFleet = savedReports.find((report) => String(report.fleet) === String(activeFleet));
    return latestForActiveFleet || savedReports[0] || null;
  }, [selectedReport, savedReports, activeFleet]);

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
        setTimeout(() => setUnitMessage(""), NOTIFICATION_MS);
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

  const updateEmployee = (key, value) => updateFleetForm((prev) => ({ ...prev, employees: { ...prev.employees, [key]: toNameCase(value) } }));

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
          acidTransports: [...prev.thirdParty.acidTransports, { provider: "", unit: "", strap: "" }],
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

  const addTextEntry = (key) => {
    updateFleetForm((prev) => {
      const list = Array.isArray(prev[key]) ? prev[key] : [""];
      if (list.length >= 10) return prev;
      return { ...prev, [key]: [...list, ""] };
    });
  };

  const removeTextEntry = (key, index) => {
    updateFleetForm((prev) => {
      const list = Array.isArray(prev[key]) ? prev[key] : [""];
      if (list.length <= 1) return prev;
      return { ...prev, [key]: list.filter((_, i) => i !== index) };
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
Iron Package Source: ${form.ironPackageSource || "—"}

Issues / Notes / Follow-Ups:
${issueLines}`;
  }, [form]);

  const getPmValidationDetails = useCallback((currentForm) => {
    const errors = [];
    const missingFieldIds = new Set();

    currentForm.pumpUnits.forEach((unit, i) => {
      if (!unit) return;
      const pm = currentForm.pm.pumps[i] || {};
      const missing = [];
      if (!pm.hours) { missing.push("Current Hours"); missingFieldIds.add(`pm-pumps-${i}-hours`); }
      if (!pm.fuelAirDue) { missing.push("Fuel / Air Filters Due At"); missingFieldIds.add(`pm-pumps-${i}-fuelAirDue`); }
      if (!pm.oilDue) { missing.push("Oil Filters Due At"); missingFieldIds.add(`pm-pumps-${i}-oilDue`); }
      if (!pm.pm1000Due) { missing.push("1000 HR PM Due At"); missingFieldIds.add(`pm-pumps-${i}-pm1000Due`); }
      if (missing.length) errors.push(`${unit}: ${missing.join(", ")}`);
    });

    currentForm.tractors.forEach((unit, i) => {
      if (!unit) return;
      const pm = currentForm.pm.tractors[i] || {};
      const missing = [];
      if (!pm.miles) { missing.push("Current Miles"); missingFieldIds.add(`pm-tractors-${i}-miles`); }
      if (!pm.hours) { missing.push("Current Hours"); missingFieldIds.add(`pm-tractors-${i}-hours`); }
      if (!pm.dueAt) { missing.push("Miles Service Due At"); missingFieldIds.add(`pm-tractors-${i}-dueAt`); }
      if (!pm.hoursDueAt) { missing.push("Hours Service Due At"); missingFieldIds.add(`pm-tractors-${i}-hoursDueAt`); }
      if (!pm.qcDue) { missing.push("QC Due Date"); missingFieldIds.add(`pm-tractors-${i}-qcDue`); }
      if (missing.length) errors.push(`${unit}: ${missing.join(", ")}`);
    });

    const truckChecks = [
      { unit: currentForm.dayTrucks[0], pm: currentForm.pm.trucks[0] || {}, index: 0 },
      { unit: currentForm.nightTrucks[0], pm: currentForm.pm.trucks[1] || {}, index: 1 },
    ];

    truckChecks.forEach(({ unit, pm, index }) => {
      if (!isRealTruckUnit(unit)) return;
      const missing = [];
      if (!pm.miles) { missing.push("Current Miles"); missingFieldIds.add(`pm-trucks-${index}-miles`); }
      if (!pm.engineHours) { missing.push("Current Engine Hours"); missingFieldIds.add(`pm-trucks-${index}-engineHours`); }
      if (!pm.dueAt) { missing.push("Miles Service Due At"); missingFieldIds.add(`pm-trucks-${index}-dueAt`); }
      if (!pm.engineHoursDueAt) { missing.push("Engine Hours Service Due At"); missingFieldIds.add(`pm-trucks-${index}-engineHoursDueAt`); }
      if (!pm.qcDue) { missing.push("QC Due Date"); missingFieldIds.add(`pm-trucks-${index}-qcDue`); }
      if (missing.length) errors.push(`${unit}: ${missing.join(", ")}`);
    });

    const generatorUnits = [];
    if (currentForm.tractors.includes("RT-13")) generatorUnits.push("RT-13");
    if (currentForm.commandCenters.some((cc) => cc?.unit === "CT-007")) generatorUnits.push("CT-007");
    generatorUnits.forEach((unit, i) => {
      const pm = currentForm.pm.generators[i] || {};
      const missing = [];
      if (!pm.hours) { missing.push("Current Hours"); missingFieldIds.add(`pm-generators-${i}-hours`); }
      if (!pm.dueAt) { missing.push("Hours PM Due At"); missingFieldIds.add(`pm-generators-${i}-dueAt`); }
      if (missing.length) errors.push(`${unit} Generator: ${missing.join(", ")}`);
    });

    return { errors, missingFieldIds };
  }, []);

  const pmValidationDetails = useMemo(() => getPmValidationDetails(form), [form, getPmValidationDetails]);
  const isPmFieldMissing = useCallback(
    (fieldId) => showPmValidation && pmValidationDetails.missingFieldIds.has(fieldId),
    [showPmValidation, pmValidationDetails]
  );

  const getPmLabelStyle = useCallback(
    (fieldId) => (isPmFieldMissing(fieldId) ? { ...label, color: "#b91c1c" } : label),
    [isPmFieldMissing]
  );

  const getPmInputStyle = useCallback(
    (fieldId, baseStyle = input) => (isPmFieldMissing(fieldId) ? { ...baseStyle, border: "2px solid #ef4444", background: "#fff1f2" } : baseStyle),
    [isPmFieldMissing]
  );

  const getPmRequiredSuffix = useCallback(
    (fieldId) => (isPmFieldMissing(fieldId) ? " *" : ""),
    [isPmFieldMissing]
  );

  const jumpToPmField = useCallback((fieldId) => {
    if (typeof document === "undefined" || !fieldId) return;
    const el = document.getElementById(fieldId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      if (typeof el.focus === "function") el.focus();
    }, 250);
  }, []);

  const saveReport = async () => {
  if (isSaving) return;

  const pmErrors = pmValidationDetails.errors;
  if (pmErrors.length) {
    setShowPmValidation(true);
    setSaveMessageType("error");
    setSaveMessage(`Complete PM before saving: ${pmErrors[0]}`);
    const firstMissing = [...pmValidationDetails.missingFieldIds][0];
    jumpToPmField(firstMissing);
    setTimeout(() => setSaveMessage(""), NOTIFICATION_MS);
    return;
  }

  if (!supabase) {
    setSaveMessageType("error");
    setSaveMessage("Supabase is not connected");
    setTimeout(() => setSaveMessage(""), NOTIFICATION_MS);
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

  const { data: insertedRow, error } = await supabase
    .from("reports")
    .insert(payload)
    .select("id, fleet, report_date, shift, report_data, created_at")
    .single();

  if (error) {
    console.error(error);
    setSaveMessageType("error");
    setSaveMessage("Save failed");
    setIsSaving(false);
    setTimeout(() => setSaveMessage(""), NOTIFICATION_MS);
    return;
  }

  if (insertedRow) {
    const normalizedInserted = {
      id: insertedRow.id,
      ...insertedRow.report_data,
      fleet: String(insertedRow.fleet ?? insertedRow.report_data?.fleet ?? ""),
      date: insertedRow.report_date ?? insertedRow.report_data?.date ?? "",
      shift: insertedRow.shift ?? insertedRow.report_data?.shift ?? "Day",
    };
    setSelectedReport(normalizedInserted);
  }

  await fetchSavedReports();
  setShowPmValidation(false);
  setSaveMessage("Report Saved ✅");

  setTimeout(() => {
    setIsSaving(false);
    setSaveMessage("");
  }, NOTIFICATION_MS);
};

  const loadLastReport = () => {
    const lastForFleet = savedReports.find((report) => String(report.fleet) === String(activeFleet));
    if (lastForFleet) {
      updateFleetForm(() => ({ ...lastForFleet, id: undefined, date: new Date().toISOString().slice(0, 10), fleet: activeFleet }));
      setShowPmValidation(false);
      setLoadMessage("Last Report Loaded ✅");
      setTimeout(() => setLoadMessage(""), NOTIFICATION_MS);
      return;
    }

    const localDraft = loadFleetDraft(activeFleet);
    if (!localDraft) return;
    updateFleetForm(() => ({ ...buildFleetStateFromDraft(activeFleet), ...localDraft, fleet: activeFleet }));
    setShowPmValidation(false);
    setLoadMessage("Local Draft Loaded ✅");
    setTimeout(() => setLoadMessage(""), NOTIFICATION_MS);
  };

  const copyReportForTeams = useCallback(async () => {
    if (!resolvedSelectedReport) return;

    const text = formatReportForTeams(resolvedSelectedReport);
    let copied = false;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      copied = document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopyMessage(copied ? "Copied for Microsoft Teams ✅" : "Unable to copy report");
    setTimeout(() => setCopyMessage(""), NOTIFICATION_MS);
  }, [resolvedSelectedReport]);

  const deleteReport = async (reportId) => {
  if (!deleteUnlocked) return;

  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("reports").delete().eq("id", reportId);

  if (error) {
    console.error(error);
    return;
  }

  await fetchSavedReports();

  if (resolvedSelectedReport?.id === reportId) setSelectedReport(null);
  setDeleteTargetId(null);
};

  const openDeletePrompt = (reportId) => {
    setDeleteTargetId(reportId);
  };

  const cancelDeletePrompt = () => {
    setDeleteTargetId(null);
  };

  const openDeleteAccessPrompt = () => {
    setShowDeleteAccessPrompt(true);
    setDeleteTargetId(null);
    setDeletePassword("");
  };

  const cancelDeleteAccessPrompt = () => {
    setShowDeleteAccessPrompt(false);
    setDeletePassword("");
  };

  const confirmDeleteAccess = () => {
    if (deletePassword !== "1775") {
      setDeletePassword("");
      return;
    }
    setDeleteUnlocked(true);
    setShowDeleteAccessPrompt(false);
    setDeletePassword("");
  };

  const viewSavedReport = useCallback((report) => {
    setSelectedReport(report);
    setViewMessage("Viewing Report 👁️");
    setTimeout(() => setViewMessage(""), NOTIFICATION_MS);
  }, []);

  const loadSavedReport = useCallback((report) => {
    setActiveFleet(String(report.fleet));
    setFleetForms((prev) => ({
      ...prev,
      [String(report.fleet)]: { ...report, id: undefined },
    }));
    setShowPmValidation(false);
    setSelectedReport(null);
    setLoadMessage("Report Loaded ✅");
    setTimeout(() => setLoadMessage(""), NOTIFICATION_MS);
  }, []);

  return (
    <div style={{ background: "linear-gradient(180deg, #f3f7fc 0%, #f8fafc 45%, #f8fafc 100%)", minHeight: "100vh", padding: isMobile ? 12 : 18, colorScheme: "light", color: "#111827" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        <HeaderCard
          isMobile={isMobile}
          activeFleet={activeFleet}
          fleetTabs={fleetTabs}
          setActiveFleet={setActiveFleet}
          setShowHelp={setShowHelp}
          wsEnergyLogo={wsEnergyLogo}
        />

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
              <h3>👥 Employees</h3>
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
                          next[i] = toNameCase(e.target.value);
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
                          next[i] = toNameCase(e.target.value);
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
                <div style={equipmentBox}>
                  <label style={label}>Pump Units</label>
                  {form.pumpUnits.map((v, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <SearchableSelect
                          value={v}
                          onChange={(nextValue) => updateArray("pumpUnits", i, nextValue)}
                          options={PUMP_OPTIONS}
                          placeholder="Select or type pump"
                          enableOther
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

                <div style={equipmentBox}>
                  <label style={label}>Tractors</label>
                  {form.tractors.map((v, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <SearchableSelect
                          value={v}
                          onChange={(nextValue) => updateArray("tractors", i, nextValue)}
                          options={TRACTOR_OPTIONS}
                          placeholder="Select or type tractor"
                          enableOther
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

                <div style={{ ...equipmentBox, gridColumn: "1 / -1" }}>
                  <label style={label}>🛰️ Command Centers</label>
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

                <div style={{ ...equipmentBox, gridColumn: "1 / -1" }}>
                  <label style={label}>🚛 Support Trailers / Floats</label>
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

                <div style={{ ...equipmentBox, gridColumn: "1 / -1" }}>
                  <label style={label}>🔩 Iron Package</label>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
                    <div>
                      <label style={label}>Size</label>
                      <select style={selectInput} value={form.ironPackage || '2"'} onChange={(e) => updateField("ironPackage", e.target.value)}>
                        <option value={'2"'}>2"</option>
                        <option value={'3"'}>3"</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>Type</label>
                      <select style={selectInput} value={form.ironPackageSource || ""} onChange={(e) => updateField("ironPackageSource", e.target.value)}>
                        <option value="">Select</option>
                        <option value="WS Owned">WS Owned</option>
                        <option value="Rental">Rental</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ ...row, marginTop: 8 }}>
                <div style={equipmentBox}>
                  <h3>🛻 Day Shift Truck(s)</h3>
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

                <div style={equipmentBox}>
                  <h3>🚚 Night Shift Truck(s)</h3>
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
                <h3>🧪 Chem Add / Chemical Skid(s)</h3>
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
                <h3>📦 Rental Equipment</h3>
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
                        <option value="Tiger Industrial">Tiger Industrial</option>
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

    <div style={{ marginTop: 12 }}>
      <label style={label}>WS Fuel Cube?</label>
      <select
style={selectInput}
        value={form.misc.fuelCube}
        onChange={(e) => updateNested("misc", "fuelCube", e.target.value)}
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

      <div style={{ flex: 1 }}>
        <label style={label}>Current Strap (inches)</label>
        <input
          style={input}
          type="text"
          inputMode="decimal"
          placeholder="e.g. 12.5"
          value={item.strap || ""}
          onChange={(e) => {
            const clean = e.target.value.replace(/[^0-9.]/g, "");
            const valid = clean.split(".").length <= 2 ? clean : item.strap;
            updateAcidTransport(i, "strap", valid);
          }}
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
              {showPmValidation && pmValidationDetails.errors.length ? (
                <div
                  style={{
                    marginBottom: 10,
                    padding: "8px 10px",
                    background: "#fff1f2",
                    border: "1px solid #fda4af",
                    color: "#9f1239",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Missing required PM fields are marked in red with an asterisk (*).
                </div>
              ) : null}
              <h4>🛻 TRUCKS</h4>
              {isRealTruckUnit(form.dayTrucks[0]) ? (() => {
                const item = form.pm.trucks[0];
                const truckStatus = getTruckPmStatus(item, form.date);
                const statusColors = getStatusColors(truckStatus);
                return (
                  <div style={{ ...card, ...statusColors, marginBottom: 10, padding: 12 }}>
                    <div style={row}>
                      <div><label style={label}>Truck #</label><input style={{ ...input, background: "#f8fafc", fontWeight: 700 }} value={item.truck} readOnly /></div>
                      <div><label style={getPmLabelStyle("pm-trucks-0-miles")}>Current Miles{getPmRequiredSuffix("pm-trucks-0-miles")}</label><input id="pm-trucks-0-miles" style={getPmInputStyle("pm-trucks-0-miles")} type="text" inputMode="numeric" pattern="[0-9]*" value={item.miles} onChange={(e) => updatePm("trucks", 0, "miles", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={getPmLabelStyle("pm-trucks-0-engineHours")}>Current Engine Hours{getPmRequiredSuffix("pm-trucks-0-engineHours")}</label><input id="pm-trucks-0-engineHours" style={getPmInputStyle("pm-trucks-0-engineHours")} type="text" inputMode="numeric" pattern="[0-9]*" value={item.engineHours || ""} onChange={(e) => updatePm("trucks", 0, "engineHours", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={getPmLabelStyle("pm-trucks-0-dueAt")}>Miles Service Due At{getPmRequiredSuffix("pm-trucks-0-dueAt")}</label><input id="pm-trucks-0-dueAt" style={getPmInputStyle("pm-trucks-0-dueAt")} type="text" inputMode="numeric" pattern="[0-9]*" value={item.dueAt} onChange={(e) => updatePm("trucks", 0, "dueAt", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={getPmLabelStyle("pm-trucks-0-engineHoursDueAt")}>Engine Hours Service Due At{getPmRequiredSuffix("pm-trucks-0-engineHoursDueAt")}</label><input id="pm-trucks-0-engineHoursDueAt" style={getPmInputStyle("pm-trucks-0-engineHoursDueAt")} type="text" inputMode="numeric" pattern="[0-9]*" value={item.engineHoursDueAt || ""} onChange={(e) => updatePm("trucks", 0, "engineHoursDueAt", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={getPmLabelStyle("pm-trucks-0-qcDue")}>QC Due Date{getPmRequiredSuffix("pm-trucks-0-qcDue")}</label><input id="pm-trucks-0-qcDue" style={getPmInputStyle("pm-trucks-0-qcDue")} type="date" value={item.qcDue} onChange={(e) => updatePm("trucks", 0, "qcDue", e.target.value)} /></div>
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
                      <div><label style={getPmLabelStyle("pm-trucks-1-miles")}>Current Miles{getPmRequiredSuffix("pm-trucks-1-miles")}</label><input id="pm-trucks-1-miles" style={getPmInputStyle("pm-trucks-1-miles")} type="text" inputMode="numeric" pattern="[0-9]*" value={item.miles} onChange={(e) => updatePm("trucks", 1, "miles", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={getPmLabelStyle("pm-trucks-1-engineHours")}>Current Engine Hours{getPmRequiredSuffix("pm-trucks-1-engineHours")}</label><input id="pm-trucks-1-engineHours" style={getPmInputStyle("pm-trucks-1-engineHours")} type="text" inputMode="numeric" pattern="[0-9]*" value={item.engineHours || ""} onChange={(e) => updatePm("trucks", 1, "engineHours", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={getPmLabelStyle("pm-trucks-1-dueAt")}>Miles Service Due At{getPmRequiredSuffix("pm-trucks-1-dueAt")}</label><input id="pm-trucks-1-dueAt" style={getPmInputStyle("pm-trucks-1-dueAt")} type="text" inputMode="numeric" pattern="[0-9]*" value={item.dueAt} onChange={(e) => updatePm("trucks", 1, "dueAt", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={getPmLabelStyle("pm-trucks-1-engineHoursDueAt")}>Engine Hours Service Due At{getPmRequiredSuffix("pm-trucks-1-engineHoursDueAt")}</label><input id="pm-trucks-1-engineHoursDueAt" style={getPmInputStyle("pm-trucks-1-engineHoursDueAt")} type="text" inputMode="numeric" pattern="[0-9]*" value={item.engineHoursDueAt || ""} onChange={(e) => updatePm("trucks", 1, "engineHoursDueAt", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={getPmLabelStyle("pm-trucks-1-qcDue")}>QC Due Date{getPmRequiredSuffix("pm-trucks-1-qcDue")}</label><input id="pm-trucks-1-qcDue" style={getPmInputStyle("pm-trucks-1-qcDue")} type="date" value={item.qcDue} onChange={(e) => updatePm("trucks", 1, "qcDue", e.target.value)} /></div>
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
                      <div><label style={getPmLabelStyle(`pm-tractors-${i}-miles`)}>Current Miles{getPmRequiredSuffix(`pm-tractors-${i}-miles`)}</label><input id={`pm-tractors-${i}-miles`} style={getPmInputStyle(`pm-tractors-${i}-miles`)} type="text" inputMode="numeric" pattern="[0-9]*" value={item.miles} onChange={(e) => updatePm("tractors", i, "miles", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={getPmLabelStyle(`pm-tractors-${i}-hours`)}>Current Hours{getPmRequiredSuffix(`pm-tractors-${i}-hours`)}</label><input id={`pm-tractors-${i}-hours`} style={getPmInputStyle(`pm-tractors-${i}-hours`)} type="text" inputMode="numeric" pattern="[0-9]*" value={item.hours} onChange={(e) => updatePm("tractors", i, "hours", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={getPmLabelStyle(`pm-tractors-${i}-dueAt`)}>Miles Service Due At{getPmRequiredSuffix(`pm-tractors-${i}-dueAt`)}</label><input id={`pm-tractors-${i}-dueAt`} style={getPmInputStyle(`pm-tractors-${i}-dueAt`)} type="text" inputMode="numeric" pattern="[0-9]*" value={item.dueAt} onChange={(e) => updatePm("tractors", i, "dueAt", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={getPmLabelStyle(`pm-tractors-${i}-hoursDueAt`)}>Hours Service Due At{getPmRequiredSuffix(`pm-tractors-${i}-hoursDueAt`)}</label><input id={`pm-tractors-${i}-hoursDueAt`} style={getPmInputStyle(`pm-tractors-${i}-hoursDueAt`)} type="text" inputMode="numeric" pattern="[0-9]*" value={item.hoursDueAt || ""} onChange={(e) => updatePm("tractors", i, "hoursDueAt", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={getPmLabelStyle(`pm-tractors-${i}-qcDue`)}>QC Due Date{getPmRequiredSuffix(`pm-tractors-${i}-qcDue`)}</label><input id={`pm-tractors-${i}-qcDue`} style={getPmInputStyle(`pm-tractors-${i}-qcDue`)} type="date" value={item.qcDue || ""} onChange={(e) => updatePm("tractors", i, "qcDue", e.target.value)} /></div>
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
                      <div><label style={getPmLabelStyle(`pm-pumps-${i}-hours`)}>Current Hours{getPmRequiredSuffix(`pm-pumps-${i}-hours`)}</label><input id={`pm-pumps-${i}-hours`} style={getPmInputStyle(`pm-pumps-${i}-hours`)} type="text" inputMode="numeric" pattern="[0-9]*" value={item.hours} onChange={(e) => updatePm("pumps", i, "hours", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={getPmLabelStyle(`pm-pumps-${i}-fuelAirDue`)}>Fuel / Air Filters Due At{getPmRequiredSuffix(`pm-pumps-${i}-fuelAirDue`)}</label><input id={`pm-pumps-${i}-fuelAirDue`} style={getPmInputStyle(`pm-pumps-${i}-fuelAirDue`)} type="text" inputMode="numeric" pattern="[0-9]*" value={item.fuelAirDue} onChange={(e) => updatePm("pumps", i, "fuelAirDue", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={getPmLabelStyle(`pm-pumps-${i}-oilDue`)}>Oil Filters Due At{getPmRequiredSuffix(`pm-pumps-${i}-oilDue`)}</label><input id={`pm-pumps-${i}-oilDue`} style={getPmInputStyle(`pm-pumps-${i}-oilDue`)} type="text" inputMode="numeric" pattern="[0-9]*" value={item.oilDue} onChange={(e) => updatePm("pumps", i, "oilDue", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                      <div><label style={getPmLabelStyle(`pm-pumps-${i}-pm1000Due`)}>1000 HR PM Due At{getPmRequiredSuffix(`pm-pumps-${i}-pm1000Due`)}</label><input id={`pm-pumps-${i}-pm1000Due`} style={getPmInputStyle(`pm-pumps-${i}-pm1000Due`)} type="text" inputMode="numeric" pattern="[0-9]*" value={item.pm1000Due} onChange={(e) => updatePm("pumps", i, "pm1000Due", e.target.value.replace(/[^0-9]/g, ""))} /></div>
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
                        <div><label style={getPmLabelStyle(`pm-generators-${i}-hours`)}>Current Hours{getPmRequiredSuffix(`pm-generators-${i}-hours`)}</label><input id={`pm-generators-${i}-hours`} style={getPmInputStyle(`pm-generators-${i}-hours`)} type="text" inputMode="numeric" pattern="[0-9]*" value={item.hours} onChange={(e) => updatePm("generators", i, "unit", unit) || updatePm("generators", i, "hours", e.target.value.replace(/[^0-9]/g, ""))} /></div>
                        <div><label style={getPmLabelStyle(`pm-generators-${i}-dueAt`)}>Hours PM Due At{getPmRequiredSuffix(`pm-generators-${i}-dueAt`)}</label><input id={`pm-generators-${i}-dueAt`} style={getPmInputStyle(`pm-generators-${i}-dueAt`)} type="text" inputMode="numeric" pattern="[0-9]*" value={item.dueAt} onChange={(e) => updatePm("generators", i, "unit", unit) || updatePm("generators", i, "dueAt", e.target.value.replace(/[^0-9]/g, ""))} /></div>
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
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                  <input style={{ ...input, flex: 1, minWidth: isMobile ? "100%" : 0 }} value={v} onChange={(e) => updateArray("partsNeeded", i, e.target.value)} />
                  {form.partsNeeded.length > 1 ? (
                    <button type="button" onClick={() => removeTextEntry("partsNeeded", i)} style={{ ...input, width: isMobile ? "100%" : "auto", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", WebkitTextFillColor: "#991b1b", fontWeight: 600, cursor: "pointer" }}>
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
              {form.partsNeeded.length < 10 ? (
                <button type="button" onClick={() => addTextEntry("partsNeeded")} style={addActionButton}>
                  + Add Another Supply Item
                </button>
              ) : null}
            </div>

            <div style={section}>
              <h3>⚠️ ISSUES / NOTES / FOLLOW-UPS</h3>
              {form.issues.map((v, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                  <input style={{ ...input, flex: 1, minWidth: isMobile ? "100%" : 0 }} value={v} onChange={(e) => updateArray("issues", i, e.target.value)} />
                  {form.issues.length > 1 ? (
                    <button type="button" onClick={() => removeTextEntry("issues", i)} style={{ ...input, width: isMobile ? "100%" : "auto", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", WebkitTextFillColor: "#991b1b", fontWeight: 600, cursor: "pointer" }}>
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
              {form.issues.length < 10 ? (
                <button type="button" onClick={() => addTextEntry("issues")} style={addActionButton}>
                  + Add Another Issue
                </button>
              ) : null}
            </div>

            <div style={notificationStrip}>
              {saveMessage && (
                <div style={{ ...notificationBase, ...(saveMessageType === "error" ? notificationStyles.error : notificationStyles.success) }}>
                  <span>{saveMessage}</span>
                </div>
              )}
              {loadMessage && (
                <div style={{ ...notificationBase, ...notificationStyles.success }}>
                  <span>{loadMessage}</span>
                </div>
              )}
              {viewMessage && (
                <div style={{ ...notificationBase, ...notificationStyles.info }}>
                  <span>{viewMessage}</span>
                </div>
              )}
              {unitMessage && (
                <div style={{ ...notificationBase, ...notificationStyles.warning }}>
                  <span>{unitMessage}</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18, alignItems: "center", justifyContent: "center" }}>
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
              <button onClick={loadLastReport} style={{ ...input, width: "auto", cursor: "pointer", background: "#e2e8f0", border: "none", padding: "12px 16px" }}>Load Last Report</button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <PreviewPanel
              resolvedSelectedReport={resolvedSelectedReport}
              summary={summary}
              copyReportForTeams={copyReportForTeams}
              isMobile={isMobile}
              copyMessage={copyMessage}
            />

            <SavedReportsPanel
              activeFleet={activeFleet}
              deleteUnlocked={deleteUnlocked}
              openDeleteAccessPrompt={openDeleteAccessPrompt}
              reportsLoading={reportsLoading}
              visibleSavedReports={visibleSavedReports}
              viewSavedReport={viewSavedReport}
              loadSavedReport={loadSavedReport}
              openDeletePrompt={openDeletePrompt}
              deleteTargetId={deleteTargetId}
              deleteReport={deleteReport}
              cancelDeletePrompt={cancelDeletePrompt}
            />

            <DeleteAccessModal
              showDeleteAccessPrompt={showDeleteAccessPrompt}
              deletePassword={deletePassword}
              setDeletePassword={setDeletePassword}
              confirmDeleteAccess={confirmDeleteAccess}
              cancelDeleteAccessPrompt={cancelDeleteAccessPrompt}
            />

            <HelpModal showHelp={showHelp} setShowHelp={setShowHelp} />
          </div>
        </div>
      </div>
    </div>
  );
}
