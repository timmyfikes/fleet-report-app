import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  addActionButton,
  card,
  input,
  label,
  notificationBase,
  notificationStyles,
  removeActionButton,
  row,
  section,
  selectInput,
  supabase,
} from "../fleetReport/config";

const PUMPDOWN_PASSWORD = "1775";
const STORAGE_KEY = "pumpdownTicketsDraft";
const BACKUP_STORAGE_KEY = "pumpdownTicketsDraftBackup";
const ACCESS_KEY = "pumpdownTicketsUnlocked";
const SHARED_TICKETS_TABLE = "pumpdown_ticket_state";
const SHARED_TICKETS_ID = "current";
const SHARED_SAVE_DELAY_MS = 700;
const DIVIDER = "—————————";

const homeSectionOptions = [
  { value: "1", label: "Fleet 1", teamsTitle: "Fleet 1 -" },
  { value: "2", label: "Fleet 2", teamsTitle: "Fleet 2 -" },
  { value: "3", label: "Fleet 3", teamsTitle: "Fleet 3 -" },
  { value: "4", label: "Fleet 4", teamsTitle: "Fleet 4 -" },
  { value: "5", label: "Fleet 5", teamsTitle: "Fleet 5 -" },
  { value: "6", label: "Fleet 6", teamsTitle: "Fleet 6 -" },
  { value: "7", label: "Fleet 7", teamsTitle: "Fleet 7 -" },
  { value: "8", label: "Fleet 8", teamsTitle: "Fleet 8 -" },
  { value: "Misc", label: "Misc Tickets", teamsTitle: "Misc TICKETS" },
];

const ticketSectionOptions = [
  ...homeSectionOptions,
  { value: "PendingApproval", label: "Pending Approval Tickets", teamsTitle: "‼️ PENDING APPROVAL TICKETS ‼️" },
  { value: "SentToCustomer", label: "Sent to Customer Tickets", teamsTitle: "⚠️ SENT TO CUSTOMER TICKETS ⚠️" },
  { value: "Completed", label: "Completed Tickets", teamsTitle: "✅ COMPLETED TICKETS ✅" },
];

const homeSectionValues = new Set(homeSectionOptions.map((option) => option.value));

const customerOptions = [
  "Apache",
  "APEX",
  "Bandera",
  "Chevron",
  "Coterra",
  "Diamondback",
  "Exxon",
  "Matador",
  "Other",
];

const allStatusOptions = [
  { value: "running", label: "🏃‍♂️ Running", teamsLabel: "🏃‍♂️ running" },
  { value: "need to complete", label: "⚠️ Need to complete", teamsLabel: "⚠️ need to complete" },
  { value: "pending approval", label: "⚠️ Pending approval", teamsLabel: "⚠️ pending approval" },
  { value: "sent to customer", label: "⚠️ Sent to customer", teamsLabel: "⚠️ sent to customer" },
  { value: "in IDK", label: "✅ In IDK", teamsLabel: "✅ in IDK" },
];

const statusTone = {
  running: { background: "#ecfdf5", borderColor: "#86efac", color: "#166534" },
  "need to complete": { background: "#fffbeb", borderColor: "#fcd34d", color: "#92400e" },
  "pending approval": { background: "#eff6ff", borderColor: "#93c5fd", color: "#1d4ed8" },
  "sent to customer": { background: "#f5f3ff", borderColor: "#c4b5fd", color: "#5b21b6" },
  "in IDK": { background: "#f0fdf4", borderColor: "#86efac", color: "#166534" },
};

const startModeOptions = [
  { value: "date", label: "Start date" },
  { value: "tbd", label: "Start TBD" },
];

const endModeOptions = [
  { value: "date", label: "End date" },
  { value: "tbd", label: "End TBD" },
];

const templateTickets = [
  {
    id: "fleet-1-68532",
    fleet: "1",
    customer: "Diamondback",
    customerOther: "",
    job: "Andretti",
    startMode: "date",
    startDate: "2026-05-01",
    endMode: "tbd",
    endDate: "",
    ticket: "68532",
    status: "running",
  },
  {
    id: "fleet-3-68534",
    fleet: "3",
    customer: "Bandera",
    customerOther: "",
    job: "Clase Azul Frac",
    startMode: "date",
    startDate: "2026-04-28",
    endMode: "tbd",
    endDate: "",
    ticket: "68534",
    status: "running",
  },
  {
    id: "fleet-5-68533",
    fleet: "5",
    customer: "Diamondback",
    customerOther: "",
    job: "Andretti",
    startMode: "date",
    startDate: "2026-05-01",
    endMode: "tbd",
    endDate: "",
    ticket: "68533",
    status: "running",
  },
  {
    id: "fleet-6-68557",
    fleet: "6",
    customer: "Matador",
    customerOther: "",
    job: "Kyle Pipken 202H, 203H",
    startMode: "date",
    startDate: "2026-04-04",
    endMode: "tbd",
    endDate: "",
    ticket: "68557",
    status: "need to complete",
  },
  {
    id: "fleet-8-66781",
    fleet: "8",
    customer: "Coterra",
    customerOther: "",
    job: "Vagrant Acid",
    startMode: "date",
    startDate: "2026-04-30",
    endMode: "tbd",
    endDate: "",
    ticket: "66781",
    status: "need to complete",
  },
  {
    id: "pending-68415",
    fleet: "Pending",
    customer: "Exxon",
    customerOther: "",
    job: "Mabee PKR flush",
    startMode: "date",
    startDate: "2026-04-17",
    endMode: "tbd",
    endDate: "",
    ticket: "68415",
    status: "sent to customer",
  },
  {
    id: "pending-67912",
    fleet: "Pending",
    customer: "Chevron",
    customerOther: "",
    job: "CT Unit #2",
    startMode: "date",
    startDate: "2026-04-09",
    endMode: "date",
    endDate: "2026-04-13",
    ticket: "67912",
    status: "sent to customer",
  },
  {
    id: "pending-67906",
    fleet: "Pending",
    customer: "Apache",
    customerOther: "",
    job: "Lovelace Pad 1",
    startMode: "date",
    startDate: "2026-04-06",
    endMode: "date",
    endDate: "2026-04-07",
    ticket: "67906",
    status: "sent to customer",
  },
  {
    id: "pending-67907",
    fleet: "Pending",
    customer: "Apache",
    customerOther: "",
    job: "Lovelace Pad 2",
    startMode: "date",
    startDate: "2026-04-08",
    endMode: "date",
    endDate: "2026-04-09",
    ticket: "67907",
    status: "sent to customer",
  },
  {
    id: "pending-66775",
    fleet: "Pending",
    customer: "Apache",
    customerOther: "",
    job: "Coleman 10DN",
    startMode: "date",
    startDate: "2026-04-23",
    endMode: "date",
    endDate: "2026-04-24",
    ticket: "66775",
    status: "sent to customer",
  },
  {
    id: "pending-68436",
    fleet: "Pending",
    customer: "APEX",
    customerOther: "",
    job: "Central Pad",
    startMode: "date",
    startDate: "2026-04-25",
    endMode: "date",
    endDate: "2026-04-27",
    ticket: "68436",
    status: "sent to customer",
  },
  {
    id: "pending-68429",
    fleet: "Pending",
    customer: "Bandera",
    customerOther: "",
    job: "Clase Azul",
    startMode: "date",
    startDate: "2026-04-24",
    endMode: "date",
    endDate: "2026-04-27",
    ticket: "68429",
    status: "sent to customer",
  },
  {
    id: "pending-66779",
    fleet: "Pending",
    customer: "Apache",
    customerOther: "",
    job: "Fraser",
    startMode: "date",
    startDate: "2026-04-28",
    endMode: "date",
    endDate: "2026-04-29",
    ticket: "66779",
    status: "sent to customer",
  },
  {
    id: "pending-68531",
    fleet: "Pending",
    customer: "Apache",
    customerOther: "",
    job: "Fraser Pad 2",
    startMode: "date",
    startDate: "2026-04-30",
    endMode: "date",
    endDate: "2026-05-02",
    ticket: "68531",
    status: "sent to customer",
  },
  {
    id: "pending-66790",
    fleet: "Pending",
    customer: "Apache",
    customerOther: "",
    job: "Coleman Acid Flush",
    startMode: "date",
    startDate: "2026-04-29",
    endMode: "date",
    endDate: "2026-05-01",
    ticket: "66790",
    status: "sent to customer",
  },
];

const tableCell = {
  padding: 10,
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "top",
};

const tableHeader = {
  ...tableCell,
  background: "#f8fafc",
  color: "#334155",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  whiteSpace: "nowrap",
};

const compactInput = {
  ...input,
  padding: "8px 10px",
  borderRadius: 10,
  fontSize: 14,
};

const compactSelect = {
  ...selectInput,
  padding: "8px 30px 8px 10px",
  borderRadius: 10,
  fontSize: 14,
};

const pageButton = {
  ...input,
  width: "auto",
  cursor: "pointer",
  fontWeight: 700,
};

const inlineControl = {
  display: "flex",
  gap: 6,
  alignItems: "center",
};

const refinedCard = {
  ...card,
  borderRadius: 16,
  border: "1px solid #dbe4ee",
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.07)",
};

const sectionPanel = {
  ...refinedCard,
  padding: 0,
  overflow: "hidden",
};

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  padding: "14px 16px",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
};

const sectionBody = {
  padding: 14,
};

const sectionKicker = {
  fontSize: 11,
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: 0.6,
  marginBottom: 3,
};

const fieldCaption = {
  display: "block",
  marginBottom: 5,
  fontSize: 12,
  fontWeight: 800,
  color: "#475569",
};

const mobileTicketPanel = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 12,
  background: "#ffffff",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.05)",
};

const mobileFieldGrid = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "1fr",
};

const desktopTableShell = {
  overflowX: "auto",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#ffffff",
};

const fleetNote = {
  marginTop: 6,
  fontSize: 12,
  color: "#64748b",
  fontWeight: 700,
};

const emptySectionStyle = {
  padding: 18,
  border: "1px dashed #cbd5e1",
  borderRadius: 12,
  color: "#64748b",
  background: "#f8fafc",
  textAlign: "center",
  fontWeight: 700,
};

const makeTicketId = () => `ticket-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getBlankTicket = (fleet = "1") => ({
  id: makeTicketId(),
  fleet,
  sourceFleet: fleet,
  customer: "",
  customerOther: "",
  job: "",
  startMode: "date",
  startDate: "",
  endMode: "tbd",
  endDate: "",
  ticket: "",
  status: "need to complete",
});

const normalizeSection = (fleet) => {
  if (homeSectionValues.has(fleet)) return fleet;
  return "Misc";
};

const normalizeStatus = (status) => {
  if (status === "running") return "running";
  if (status === "working on") return "need to complete";
  if (status === "need to complete") return "need to complete";
  if (status === "pending") return "pending approval";
  if (status === "pending approval") return "pending approval";
  if (status === "sent to customer") return "sent to customer";
  if (status === "complete") return "in IDK";
  if (status === "in IDK") return "in IDK";
  return "need to complete";
};

const normalizeTicket = (ticket) => {
  const id = ticket.id || makeTicketId();
  const sourceFleet = normalizeSection(ticket.sourceFleet || ticket.fleet);

  return {
    id,
    fleet: sourceFleet,
    sourceFleet,
    customer: ticket.customer || "",
    customerOther: ticket.customerOther || "",
    job: ticket.job || "",
    startMode: ticket.startMode === "tbd" ? "tbd" : "date",
    startDate: ticket.startDate || "",
    endMode: ticket.endMode === "date" ? "date" : "tbd",
    endDate: ticket.endMode === "date" ? ticket.endDate || "" : "",
    ticket: ticket.ticket || "",
    status: normalizeStatus(ticket.status),
  };
};

const loadStoredTickets = () => {
  if (typeof window === "undefined") return templateTickets.map(normalizeTicket);
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return templateTickets.map(normalizeTicket);
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(normalizeTicket) : templateTickets.map(normalizeTicket);
  } catch (error) {
    console.error("Unable to load pumpdown tickets", error);
    return templateTickets.map(normalizeTicket);
  }
};

const saveTicketsToLocalStorage = (tickets) => {
  if (typeof window === "undefined") return;

  try {
    const nextDraft = JSON.stringify(tickets);
    const currentDraft = window.localStorage.getItem(STORAGE_KEY);
    if (currentDraft && currentDraft !== nextDraft) {
      window.localStorage.setItem(BACKUP_STORAGE_KEY, currentDraft);
    }
    window.localStorage.setItem(STORAGE_KEY, nextDraft);
  } catch (error) {
    console.error("Unable to save pumpdown tickets", error);
  }
};

const formatShortDate = (dateValue) => {
  if (!dateValue) return "";
  const [, month, day] = dateValue.split("-");
  if (!month || !day) return dateValue;
  return `${Number(month)}/${Number(day)}`;
};

const getCustomerName = (ticket) => {
  if (ticket.customer === "Other") return ticket.customerOther || "Other";
  return ticket.customer || "";
};

const getStatusLabel = (status) =>
  allStatusOptions.find((option) => option.value === status)?.teamsLabel || status || "";

const getStatusDisplayLabel = (status) =>
  allStatusOptions.find((option) => option.value === status)?.label || status || "Status";

const getStatusPillStyle = (status) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "5px 9px",
  border: `1px solid ${statusTone[status]?.borderColor || "#cbd5e1"}`,
  background: statusTone[status]?.background || "#f8fafc",
  color: statusTone[status]?.color || "#334155",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.1,
  whiteSpace: "nowrap",
});

const getSectionAccent = (sectionValue) => {
  if (sectionValue === "PendingApproval") return { background: "#eff6ff", borderColor: "#93c5fd", color: "#1d4ed8" };
  if (sectionValue === "SentToCustomer") return { background: "#f5f3ff", borderColor: "#c4b5fd", color: "#5b21b6" };
  if (sectionValue === "Completed") return { background: "#f0fdf4", borderColor: "#86efac", color: "#166534" };
  if (sectionValue === "Misc") return { background: "#f8fafc", borderColor: "#cbd5e1", color: "#475569" };
  return { background: "#ecfeff", borderColor: "#67e8f9", color: "#0e7490" };
};

const getHomeSectionLabel = (fleet) =>
  homeSectionOptions.find((option) => option.value === normalizeSection(fleet))?.label || "Misc Tickets";

const getDisplaySection = (ticket) => {
  if (ticket.status === "in IDK") return "Completed";
  if (ticket.status === "pending approval") return "PendingApproval";
  if (ticket.status === "sent to customer") return "SentToCustomer";
  return normalizeSection(ticket.fleet);
};

const getDisplaySectionLabel = (value) =>
  ticketSectionOptions.find((option) => option.value === value)?.label || "Misc Tickets";

const getHomeSectionRank = (fleet) => {
  const normalized = normalizeSection(fleet);
  const index = homeSectionOptions.findIndex((option) => option.value === normalized);
  return index === -1 ? homeSectionOptions.length : index;
};

const getStatusSortRank = (status) => {
  if (status === "pending approval") return 0;
  if (status === "need to complete") return 1;
  if (status === "sent to customer") return 2;
  if (status === "running") return 3;
  if (status === "in IDK") return 4;
  return 5;
};

const getStartSortValue = (ticket) => {
  if (ticket.startMode !== "date" || !ticket.startDate) return Number.MAX_SAFE_INTEGER;
  const time = new Date(`${ticket.startDate}T00:00:00`).getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
};

const getAlphabeticalSortValue = (ticket) =>
  [getCustomerName(ticket), ticket.job, ticket.ticket].filter(Boolean).join(" ").toLowerCase();

const compareTickets = (a, b) => {
  const statusDiff = getStatusSortRank(a.status) - getStatusSortRank(b.status);
  if (statusDiff) return statusDiff;

  const dateDiff = getStartSortValue(a) - getStartSortValue(b);
  if (dateDiff) return dateDiff;

  return getAlphabeticalSortValue(a).localeCompare(getAlphabeticalSortValue(b));
};

const compareTicketsForSection = (sectionValue) => (a, b) => {
  if (sectionValue === "PendingApproval" || sectionValue === "SentToCustomer") {
    const fleetDiff = getHomeSectionRank(a.fleet) - getHomeSectionRank(b.fleet);
    if (fleetDiff) return fleetDiff;
  }

  return compareTickets(a, b);
};

const isIdkTicketPastRemovalDate = (ticket) => {
  if (ticket.status !== "in IDK" || ticket.endMode !== "date" || !ticket.endDate) return false;
  const endDate = new Date(`${ticket.endDate}T00:00:00`);
  if (Number.isNaN(endDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() - 18);
  return endDate < cutoff;
};

const getDateDetails = (ticket) => {
  const start = ticket.startMode === "tbd" ? "TBD" : formatShortDate(ticket.startDate) || "TBD";
  const end = ticket.endMode === "tbd" ? "TBD" : formatShortDate(ticket.endDate) || "TBD";
  return `(${start} to ${end})`;
};


const ticketHasContent = (ticket) =>
  Boolean(getCustomerName(ticket) || ticket.job || ticket.ticket || ticket.startDate || ticket.endDate);

const getStatusCounts = (tickets) => {
  const activeTickets = tickets.filter(ticketHasContent);
  return allStatusOptions.map((option) => ({
    ...option,
    count: activeTickets.filter((ticket) => ticket.status === option.value).length,
  }));
};

const toBoldText = (value) =>
  String(value || "").replace(/[A-Za-z0-9]/g, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d400 + code - 65);
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d41a + code - 97);
    return String.fromCodePoint(0x1d7ce + code - 48);
  });

const toSectionHeaderText = (value) => toBoldText(value);

const appendTicketForTeams = (lines, ticket, shouldShowFleet) => {
  const customer = getCustomerName(ticket) || "Customer TBD";
  const dateDetails = getDateDetails(ticket);
  const status = getStatusLabel(ticket.status);

  if (shouldShowFleet) lines.push(`From ${getHomeSectionLabel(ticket.fleet)}`);
  lines.push(toBoldText(customer));
  if (ticket.job || dateDetails) lines.push([ticket.job, dateDetails].filter(Boolean).join(" "));
  if (ticket.ticket && status) lines.push(`${ticket.ticket} - ${status}`);
  else if (ticket.ticket) lines.push(ticket.ticket);
  else if (status) lines.push(status);
  lines.push("");
};

const formatPumpdownTickets = (tickets) => {
  const activeTickets = tickets.filter(ticketHasContent);
  const lines = [toBoldText("-PUMPDOWN TICKETS-"), DIVIDER];

  ticketSectionOptions.forEach((sectionOption) => {
    const sectionTickets = activeTickets
      .filter((ticket) => getDisplaySection(ticket) === sectionOption.value)
      .sort(compareTicketsForSection(sectionOption.value));

    lines.push(toSectionHeaderText(sectionOption.teamsTitle));
    lines.push("");

    sectionTickets.forEach((ticket) => {
      appendTicketForTeams(
        lines,
        ticket,
        sectionOption.value === "PendingApproval" || sectionOption.value === "SentToCustomer" || sectionOption.value === "Completed"
      );
    });

    lines.push(DIVIDER);
  });

  lines.push(toSectionHeaderText("QUICK COUNTS"));
  lines.push("");
  getStatusCounts(tickets).forEach((status) => {
    lines.push(`${status.label}: ${status.count}`);
  });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

export function PumpdownTicketsPage({ isMobile, onBack, wsEnergyLogo }) {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(ACCESS_KEY) === "true";
  });
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [tickets, setTickets] = useState(loadStoredTickets);
  const initialTicketsRef = useRef(tickets);
  const [hasLoadedSharedTickets, setHasLoadedSharedTickets] = useState(!supabase);
  const [canSaveSharedTickets, setCanSaveSharedTickets] = useState(false);
  const [syncMessage, setSyncMessage] = useState(supabase ? "Loading shared tickets..." : "Using local ticket backup");
  const [syncMessageType, setSyncMessageType] = useState(supabase ? "info" : "warning");
  const [newTicketSection, setNewTicketSection] = useState("1");
  const [copyMessage, setCopyMessage] = useState("");

  const visibleTickets = useMemo(
    () => tickets.filter((ticket) => !isIdkTicketPastRemovalDate(ticket)),
    [tickets]
  );

  useEffect(() => {
    let ignore = false;

    const loadSharedTickets = async () => {
      if (!supabase) {
        setHasLoadedSharedTickets(true);
        setCanSaveSharedTickets(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from(SHARED_TICKETS_TABLE)
          .select("tickets")
          .eq("id", SHARED_TICKETS_ID)
          .maybeSingle();

        if (error) throw error;
        if (ignore) return;

        if (Array.isArray(data?.tickets)) {
          const sharedTickets = data.tickets.map(normalizeTicket);
          setTickets(sharedTickets);
          saveTicketsToLocalStorage(sharedTickets);
          setCanSaveSharedTickets(true);
          setSyncMessage("Shared tickets loaded");
          setSyncMessageType("success");
          return;
        }

        const localTickets = initialTicketsRef.current.map(normalizeTicket);
        setTickets(localTickets);
        saveTicketsToLocalStorage(localTickets);
        setCanSaveSharedTickets(false);
        setSyncMessage("Shared tickets need Supabase seed");
        setSyncMessageType("warning");
      } catch (error) {
        console.error("Unable to load shared pumpdown tickets", error);
        if (!ignore) {
          setCanSaveSharedTickets(false);
          setSyncMessage("Using local backup; shared tickets are unavailable");
          setSyncMessageType("warning");
        }
      } finally {
        if (!ignore) setHasLoadedSharedTickets(true);
      }
    };

    loadSharedTickets();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    saveTicketsToLocalStorage(visibleTickets);

    if (!supabase || !hasLoadedSharedTickets || !canSaveSharedTickets) return undefined;

    const timeoutId = window.setTimeout(async () => {
      try {
        const { error } = await supabase
          .from(SHARED_TICKETS_TABLE)
          .upsert({
            id: SHARED_TICKETS_ID,
            tickets: visibleTickets,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
        setSyncMessage("Shared tickets saved");
        setSyncMessageType("success");
      } catch (error) {
        console.error("Unable to save shared pumpdown tickets", error);
        setSyncMessage("Saved locally; shared save failed");
        setSyncMessageType("error");
      }
    }, SHARED_SAVE_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [canSaveSharedTickets, hasLoadedSharedTickets, visibleTickets]);

  const groupedTickets = useMemo(
    () =>
      ticketSectionOptions.map((sectionOption) => ({
        ...sectionOption,
        tickets: visibleTickets
          .filter((ticket) => getDisplaySection(ticket) === sectionOption.value)
          .sort(compareTicketsForSection(sectionOption.value)),
      })),
    [visibleTickets]
  );

  const activeTicketCount = useMemo(() => visibleTickets.filter(ticketHasContent).length, [visibleTickets]);
  const statusCounts = useMemo(() => getStatusCounts(visibleTickets), [visibleTickets]);
  const teamsText = useMemo(() => formatPumpdownTickets(visibleTickets), [visibleTickets]);

  const unlockPage = (event) => {
    event.preventDefault();
    if (password !== PUMPDOWN_PASSWORD) {
      setPassword("");
      setPasswordError("Incorrect password");
      return;
    }
    window.sessionStorage.setItem(ACCESS_KEY, "true");
    setIsUnlocked(true);
    setPassword("");
    setPasswordError("");
  };

  const lockPage = () => {
    window.sessionStorage.removeItem(ACCESS_KEY);
    setIsUnlocked(false);
    setPassword("");
  };

  const updateTicket = (id, key, value) => {
    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id !== id) return ticket;
        const next = { ...ticket, [key]: value };
        if (key === "fleet") next.sourceFleet = normalizeSection(value);
        if (key === "customer" && value !== "Other") next.customerOther = "";
        if (key === "startMode" && value === "tbd") next.startDate = "";
        if (key === "endMode" && value === "tbd") next.endDate = "";
        return next;
      })
    );
  };

  const addTicket = () => {
    setTickets((prev) => [getBlankTicket(newTicketSection), ...prev]);
  };

  const removeTicket = (id) => {
    setTickets((prev) => prev.filter((ticket) => ticket.id !== id));
  };

  const copyForTeams = async () => {
    let copied = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(teamsText);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      const textarea = document.createElement("textarea");
      textarea.value = teamsText;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      copied = document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopyMessage(copied ? "Pumpdown ticket list copied for Teams" : "Unable to copy ticket list");
    window.setTimeout(() => setCopyMessage(""), 10000);
  };

  const renderFleetControl = (ticket) => {
    const displaySection = getDisplaySection(ticket);

    return (
      <>
        <select style={compactSelect} value={ticket.fleet} onChange={(event) => updateTicket(ticket.id, "fleet", event.target.value)}>
          {homeSectionOptions.map((sectionOption) => (
            <option key={sectionOption.value} value={sectionOption.value}>{sectionOption.label}</option>
          ))}
        </select>
        {displaySection !== ticket.fleet ? (
          <div style={fleetNote}>Shown in {getDisplaySectionLabel(displaySection)}</div>
        ) : null}
      </>
    );
  };

  const renderCustomerControl = (ticket) => (
    <div style={inlineControl}>
      <select
        style={{ ...compactSelect, flex: ticket.customer === "Other" ? "0 0 94px" : 1 }}
        value={ticket.customer}
        onChange={(event) => updateTicket(ticket.id, "customer", event.target.value)}
      >
        <option value="">Select</option>
        {customerOptions.map((customer) => (
          <option key={customer} value={customer}>{customer}</option>
        ))}
      </select>
      {ticket.customer === "Other" ? (
        <input
          style={{ ...compactInput, flex: 1, minWidth: 0 }}
          placeholder="Customer"
          value={ticket.customerOther}
          onChange={(event) => updateTicket(ticket.id, "customerOther", event.target.value)}
        />
      ) : null}
    </div>
  );

  const renderJobControl = (ticket) => (
    <input
      style={compactInput}
      value={ticket.job}
      onChange={(event) => updateTicket(ticket.id, "job", event.target.value)}
      placeholder="Pad, well, or job"
    />
  );

  const renderStartControl = (ticket) => (
    <div style={inlineControl}>
      <select
        style={{ ...compactSelect, flex: ticket.startMode === "date" ? "0 0 98px" : 1 }}
        value={ticket.startMode}
        onChange={(event) => updateTicket(ticket.id, "startMode", event.target.value)}
      >
        {startModeOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {ticket.startMode === "date" ? (
        <input
          style={{ ...compactInput, flex: 1, minWidth: 0 }}
          type="date"
          value={ticket.startDate}
          onChange={(event) => updateTicket(ticket.id, "startDate", event.target.value)}
        />
      ) : null}
    </div>
  );

  const renderEndControl = (ticket) => (
    <div style={inlineControl}>
      <select
        style={{ ...compactSelect, flex: ticket.endMode === "date" ? "0 0 92px" : 1 }}
        value={ticket.endMode}
        onChange={(event) => updateTicket(ticket.id, "endMode", event.target.value)}
      >
        {endModeOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {ticket.endMode === "date" ? (
        <input
          style={{ ...compactInput, flex: 1, minWidth: 0 }}
          type="date"
          value={ticket.endDate}
          onChange={(event) => updateTicket(ticket.id, "endDate", event.target.value)}
        />
      ) : null}
    </div>
  );

  const renderTicketNumberControl = (ticket) => (
    <input
      style={compactInput}
      inputMode="numeric"
      value={ticket.ticket}
      onChange={(event) => updateTicket(ticket.id, "ticket", event.target.value.replace(/[^0-9]/g, ""))}
      placeholder="Ticket"
    />
  );

  const renderStatusControl = (ticket) => (
    <select style={compactSelect} value={ticket.status} onChange={(event) => updateTicket(ticket.id, "status", event.target.value)}>
      {allStatusOptions.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );

  const renderMobileField = (caption, content) => (
    <div>
      <span style={fieldCaption}>{caption}</span>
      {content}
    </div>
  );

  const renderTicketRow = (ticket) => (
    <tr key={ticket.id}>
      <td style={tableCell}>{renderFleetControl(ticket)}</td>
      <td style={tableCell}>{renderCustomerControl(ticket)}</td>
      <td style={tableCell}>{renderJobControl(ticket)}</td>
      <td style={tableCell}>{renderStartControl(ticket)}</td>
      <td style={tableCell}>{renderEndControl(ticket)}</td>
      <td style={tableCell}>{renderTicketNumberControl(ticket)}</td>
      <td style={tableCell}>{renderStatusControl(ticket)}</td>
      <td style={tableCell}>
        <button type="button" onClick={() => removeTicket(ticket.id)} style={{ ...removeActionButton, padding: "8px 10px", borderRadius: 10 }}>
          Remove
        </button>
      </td>
    </tr>
  );

  const renderTicketCard = (ticket) => (
    <div key={ticket.id} style={mobileTicketPanel}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", overflowWrap: "anywhere" }}>
            {getCustomerName(ticket) || "New ticket"}
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2, overflowWrap: "anywhere" }}>
            {ticket.job || getHomeSectionLabel(ticket.fleet)}
          </div>
        </div>
        <span style={getStatusPillStyle(ticket.status)}>{getStatusDisplayLabel(ticket.status)}</span>
      </div>

      <div style={mobileFieldGrid}>
        {renderMobileField("Fleet", renderFleetControl(ticket))}
        {renderMobileField("Customer", renderCustomerControl(ticket))}
        {renderMobileField("Pad / Job", renderJobControl(ticket))}
        {renderMobileField("Start", renderStartControl(ticket))}
        {renderMobileField("End", renderEndControl(ticket))}
        {renderMobileField("Ticket #", renderTicketNumberControl(ticket))}
        {renderMobileField("Status", renderStatusControl(ticket))}
      </div>

      <button
        type="button"
        onClick={() => removeTicket(ticket.id)}
        style={{ ...removeActionButton, width: "100%", marginTop: 12, borderRadius: 10 }}
      >
        Remove Ticket
      </button>
    </div>
  );

  if (!isUnlocked) {
    return (
      <div style={{ background: "linear-gradient(180deg, #f3f7fc 0%, #f8fafc 100%)", minHeight: "100vh", padding: isMobile ? 12 : 18, color: "#111827", colorScheme: "light" }}>
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "left" }}>
          <button type="button" onClick={onBack} style={{ ...pageButton, marginBottom: 12, background: "#e2e8f0", border: "none", width: isMobile ? "100%" : "auto" }}>
            Back to Fleet Report
          </button>
          <form onSubmit={unlockPage} style={{ ...refinedCard, padding: isMobile ? 18 : 24 }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <img
                src={wsEnergyLogo}
                alt="WS Energy Services logo"
                style={{ width: isMobile ? 130 : 180, height: "auto", objectFit: "contain", marginBottom: 10 }}
              />
              <h1 style={{ margin: 0, fontSize: isMobile ? 24 : 32, lineHeight: 1.2, color: "#111827" }}>
                Pumpdown Tickets
              </h1>
            </div>
            <label style={label}>Password</label>
            <input
              style={input}
              type="password"
              inputMode="numeric"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
            />
            {passwordError ? (
              <div style={{ ...notificationBase, ...notificationStyles.error, marginTop: 10 }}>
                {passwordError}
              </div>
            ) : null}
            <button
              type="submit"
              style={{ ...pageButton, marginTop: 14, width: "100%", background: "#111827", border: "none", color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
            >
              Unlock Page
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "linear-gradient(180deg, #f3f7fc 0%, #f8fafc 45%, #f8fafc 100%)", minHeight: "100vh", padding: isMobile ? 12 : 18, color: "#111827", colorScheme: "light" }}>
      <div style={{ maxWidth: 1220, margin: "0 auto", textAlign: "left" }}>
        <div style={{ ...refinedCard, marginBottom: 16, padding: isMobile ? 14 : 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={onBack} style={{ ...pageButton, background: "#e2e8f0", border: "none", width: isMobile ? "100%" : "auto" }}>
              Back to Fleet Report
            </button>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
              <button type="button" onClick={copyForTeams} style={{ ...pageButton, flex: isMobile ? 1 : "none", background: "#111827", border: "none", color: "#ffffff", WebkitTextFillColor: "#ffffff" }}>
                Copy Teams Update
              </button>
              <button type="button" onClick={lockPage} style={{ ...pageButton, flex: isMobile ? "0 0 92px" : "none", background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", WebkitTextFillColor: "#991b1b" }}>
                Lock
              </button>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <img
              src={wsEnergyLogo}
              alt="WS Energy Services logo"
              style={{ width: isMobile ? 130 : 190, height: "auto", display: "block", margin: "0 auto 10px", objectFit: "contain" }}
            />
            <h1 style={{ margin: 0, fontSize: isMobile ? 24 : 32, lineHeight: 1.2, color: "#111827" }}>
              Pumpdown Tickets
            </h1>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={getStatusPillStyle("need to complete")}>{activeTicketCount} active</span>
              <span style={getStatusPillStyle("pending approval")}>{statusCounts.find((status) => status.value === "pending approval")?.count || 0} pending approval</span>
              <span style={getStatusPillStyle("sent to customer")}>{statusCounts.find((status) => status.value === "sent to customer")?.count || 0} sent</span>
              <span style={{ ...notificationBase, ...notificationStyles[syncMessageType] }}>{syncMessage}</span>
            </div>
          </div>
          {copyMessage ? (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
              <div style={{ ...notificationBase, ...notificationStyles.success }}>{copyMessage}</div>
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.45fr) minmax(340px, 0.55fr)" }}>
          <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
            <div style={refinedCard}>
              <h2 style={{ margin: "0 0 12px", fontSize: 22, color: "#111827" }}>Add Ticket</h2>
              <div style={row}>
                <div>
                  <label style={label}>Fleet</label>
                  <select style={selectInput} value={newTicketSection} onChange={(event) => setNewTicketSection(event.target.value)}>
                    {homeSectionOptions.map((sectionOption) => (
                      <option key={sectionOption.value} value={sectionOption.value}>{sectionOption.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "end" }}>
                  <button type="button" onClick={addTicket} style={{ ...addActionButton, width: "100%", background: "#111827", border: "none", color: "#ffffff", WebkitTextFillColor: "#ffffff" }}>
                    Add Ticket
                  </button>
                </div>
              </div>
            </div>

            {groupedTickets.map((group) => {
              const accent = getSectionAccent(group.value);
              const groupActiveCount = group.tickets.filter(ticketHasContent).length;

              return (
              <div key={group.value} style={{ ...sectionPanel, minWidth: 0 }}>
                <div style={sectionHeader}>
                  <div>
                    <div style={sectionKicker}>{group.value === "Misc" ? "Misc" : group.value === "Completed" ? "Archive" : group.value === "PendingApproval" || group.value === "SentToCustomer" ? "Pending Workflow" : "Fleet"}</div>
                    <h2 style={{ margin: 0, fontSize: isMobile ? 19 : 22, color: "#111827" }}>{group.label}</h2>
                  </div>
                  <div style={{ ...notificationBase, background: accent.background, borderColor: accent.borderColor, color: accent.color }}>
                    {groupActiveCount} active
                  </div>
                </div>

                <div style={sectionBody}>
                  {group.tickets.length ? (
                    isMobile ? (
                      <div style={{ display: "grid", gap: 12 }}>
                        {group.tickets.map(renderTicketCard)}
                      </div>
                    ) : (
                  <div style={desktopTableShell}>
                    <table style={{ width: "100%", minWidth: 1280, borderCollapse: "collapse", tableLayout: "fixed", background: "#ffffff" }}>
                      <thead>
                        <tr>
                          <th style={{ ...tableHeader, width: 150 }}>Fleet</th>
                          <th style={{ ...tableHeader, width: 230 }}>Customer</th>
                          <th style={{ ...tableHeader, width: 210 }}>Pad / Job</th>
                          <th style={{ ...tableHeader, width: 220 }}>Start</th>
                          <th style={{ ...tableHeader, width: 220 }}>End</th>
                          <th style={{ ...tableHeader, width: 126 }}>Ticket #</th>
                          <th style={{ ...tableHeader, width: 180 }}>Status</th>
                          <th style={{ ...tableHeader, width: 108 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.tickets.map(renderTicketRow)}
                      </tbody>
                    </table>
                  </div>
                    )
                  ) : (
                    <div style={emptySectionStyle}>No tickets in this section.</div>
                  )}
                </div>
              </div>
              );
            })}
          </div>

          <div style={{ display: "grid", gap: 16, alignContent: "start", position: isMobile ? "static" : "sticky", top: isMobile ? undefined : 14 }}>
            <div style={refinedCard}>
              <h2 style={{ margin: 0, fontSize: 22, color: "#111827" }}>Teams Preview</h2>
              <pre
                style={{
                  ...section,
                  marginTop: 12,
                  maxHeight: isMobile ? 360 : 520,
                  whiteSpace: "pre-wrap",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: "#111827",
                  overflowX: "auto",
                }}
              >
                {teamsText}
              </pre>
              <button type="button" onClick={copyForTeams} style={{ ...pageButton, marginTop: 12, width: "100%", background: "#111827", border: "none", color: "#ffffff", WebkitTextFillColor: "#ffffff" }}>
                Copy Teams Update
              </button>
            </div>

            <div style={refinedCard}>
              <h2 style={{ margin: 0, fontSize: 22, color: "#111827" }}>Quick Counts</h2>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr", marginTop: 12 }}>
                <div style={{ ...section, marginTop: 0, padding: 12 }}>
                  <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>Active Rows</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>{activeTicketCount}</div>
                </div>
                {statusCounts.map((status) => (
                  <div key={status.value} style={{ ...section, marginTop: 0, padding: 12 }}>
                    <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>{status.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>{status.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
