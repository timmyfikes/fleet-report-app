import "./tickets.css";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  card,
  input,
  label,
  notificationBase,
  notificationStyles,
  removeActionButton,
  selectInput,
  supabase,
} from "../fleetReport/config";

import { createTicketPersistence, TICKET_CACHE_KEY as STORAGE_KEY, TICKET_BACKUP_KEY as BACKUP_STORAGE_KEY } from "./ticketPersistence";

const PUMPDOWN_PASSWORD = "1775";
const ACCESS_KEY = "pumpdownTicketsUnlocked";
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
  { value: "9", label: "Fleet 9", teamsTitle: "Fleet 9 -" },
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
  "Blue Arrow",
  "Chevron",
  "Crescent Energy",
  "Devon",
  "Diamondback",
  "Exxon",
  "Lakewood",
  "Matador",
  "Oxy",
  "Permian Resources",
  "SM Energy",
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

const compactInput = {
  ...input,
  padding: "8px 10px",
  borderRadius: 10,
  fontSize: 14,
  minWidth: 0,
  minHeight: 42,
};

const compactSelect = {
  ...selectInput,
  padding: "8px 30px 8px 10px",
  borderRadius: 10,
  fontSize: 14,
  minWidth: 0,
  minHeight: 42,
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
  for (const key of [STORAGE_KEY, BACKUP_STORAGE_KEY]) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key));
      if (Array.isArray(parsed)) return parsed.map(normalizeTicket);
    } catch (error) {
      console.error("Unable to load pumpdown ticket backup", error);
    }
  }
  return templateTickets.map(normalizeTicket);
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

export function PumpdownTicketsPage({ isMobile, onBack, onOpenSchedule, wsEnergyLogo }) {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(ACCESS_KEY) === "true";
  });
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [tickets, setTickets] = useState(loadStoredTickets);
  const persistenceRef = useRef(null);
  const ticketElementsRef = useRef(new Map());
  const pendingFollowRef = useRef(null);
  const [moveNotice, setMoveNotice] = useState("");
  const [highlightedTicket, setHighlightedTicket] = useState(null);
  const [syncMessage, setSyncMessage] = useState(supabase ? "Loading shared tickets..." : "Using local ticket backup");
  const [syncMessageType, setSyncMessageType] = useState(supabase ? "info" : "warning");
  const [newTicketSection, setNewTicketSection] = useState("1");
  const [copyMessage, setCopyMessage] = useState("");

  const [search, setSearch] = useState("");
  const [fleetFilter, setFleetFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const visibleTickets = useMemo(() => tickets.filter((ticket) => {
    // Keep an edited ticket visible even if its new values no longer match the filters.
    if (ticket.id === editingId) return true;
    const query = search.trim().toLowerCase();
    return (!fleetFilter || ticket.fleet === fleetFilter)
      && (!statusFilter || ticket.status === statusFilter)
      && (!query || [getCustomerName(ticket), ticket.job, ticket.ticket, getHomeSectionLabel(ticket.fleet)]
        .some((value) => value.toLowerCase().includes(query)));
  }), [tickets, search, fleetFilter, statusFilter, editingId]);
  const resetFilters = () => {
    setSearch(""); setFleetFilter(""); setStatusFilter(""); setEditingId(null);
  };

  useEffect(() => {
    const persistence = createTicketPersistence({
      client: supabase,
      storage: window.localStorage,
      initialTickets: loadStoredTickets(),
      normalize: normalizeTicket,
      onTickets: setTickets,
      onStatus: (message, type) => {
        setSyncMessage(message);
        setSyncMessageType(type);
      },
    });
    persistenceRef.current = persistence;
    const retry = () => { void persistence.sync(); };
    const onVisibility = () => { if (document.visibilityState === "visible") retry(); };
    const beforeUnload = (event) => {
      if (persistence.hasPending()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    persistence.start();
    window.addEventListener("online", retry);
    window.addEventListener("storage", retry);
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      persistence.stop();
      window.removeEventListener("online", retry);
      window.removeEventListener("storage", retry);
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

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

  useLayoutEffect(() => {
    const follow = pendingFollowRef.current;
    if (!follow) return;
    pendingFollowRef.current = null;
    const element = ticketElementsRef.current.get(follow.id);
    if (!element) return;
    const control = element.querySelector(`[data-ticket-field="${follow.key}"]`);
    if (follow.hadFocus && control && document.activeElement !== control) {
      control.focus({ preventScroll: true });
      if (follow.selectionStart !== null && typeof control.setSelectionRange === "function") {
        control.setSelectionRange(follow.selectionStart, follow.selectionEnd);
      }
    }
    if (follow.moved) {
      setHighlightedTicket({ id: follow.id });
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const cardFits = element.getBoundingClientRect().height <= window.innerHeight - 40;
      (cardFits ? element : control || element).scrollIntoView({
        behavior: reducedMotion ? "instant" : "smooth",
        block: cardFits ? "start" : "center",
        inline: "nearest",
      });
    }
  }, [tickets, expandedTicketId]);

  useEffect(() => {
    if (!moveNotice) return undefined;
    const timeout = window.setTimeout(() => setMoveNotice(""), 6000);
    return () => window.clearTimeout(timeout);
  }, [moveNotice]);

  useEffect(() => {
    if (!highlightedTicket) return undefined;
    const timeout = window.setTimeout(() => setHighlightedTicket(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [highlightedTicket]);

  const activeTicketCount = useMemo(() => tickets.filter(ticketHasContent).length, [tickets]);
  const statusCounts = useMemo(() => getStatusCounts(tickets), [tickets]);
  const teamsText = useMemo(() => formatPumpdownTickets(tickets), [tickets]);

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
    const fields = { [key]: value };
    if (key === "fleet") fields.sourceFleet = normalizeSection(value);
    if (key === "customer" && value !== "Other") fields.customerOther = "";
    if (key === "startMode" && value === "tbd") fields.startDate = "";
    if (key === "endMode" && value === "tbd") fields.endDate = "";
    const ticket = tickets.find((item) => item.id === id);
    if (!ticket) return;
    const nextTicket = { ...ticket, ...fields };
    setEditingId(id);
    const previousSection = getDisplaySection(ticket);
    const nextSection = getDisplaySection(nextTicket);
    const previousIndex = tickets.filter((item) => getDisplaySection(item) === previousSection).sort(compareTicketsForSection(previousSection)).findIndex((item) => item.id === id);
    const nextIndex = tickets
      .map((item) => item.id === id ? nextTicket : item)
      .filter((item) => getDisplaySection(item) === nextSection)
      .sort(compareTicketsForSection(nextSection))
      .findIndex((item) => item.id === id);
    const moved = previousSection !== nextSection || previousIndex !== nextIndex;
    const activeControl = document.activeElement;
    pendingFollowRef.current = {
      id, key, moved,
      hadFocus: ticketElementsRef.current.get(id)?.contains(activeControl),
      selectionStart: activeControl?.selectionStart ?? null,
      selectionEnd: activeControl?.selectionEnd ?? null,
    };
    if (moved) {
      setMoveNotice(`${nextTicket.ticket ? `Ticket #${nextTicket.ticket}` : "Ticket"} moved to ${getDisplaySectionLabel(nextSection)}. You're still editing it.`);
    }
    persistenceRef.current.edit({ type: "update", id, fields });
  };

  const addTicket = (fleet = newTicketSection) => {
    const ticket = getBlankTicket(fleet);
    resetFilters();
    setEditingId(ticket.id);
    setExpandedTicketId(ticket.id);
    pendingFollowRef.current = { id: ticket.id, key: "customer", moved: true, hadFocus: true, selectionStart: null };
    setMoveNotice(`New ticket added to ${getHomeSectionLabel(fleet)}. Ready to enter the customer.`);
    persistenceRef.current.edit({ type: "add", ticket });
  };

  const removeTicket = (id) => {
    const ticket = tickets.find((item) => item.id === id);
    if (!ticket) return;
    const description = [ticket.ticket ? `Ticket #${ticket.ticket}` : "this ticket", getCustomerName(ticket), ticket.job].filter(Boolean).join(" — ");
    if (!window.confirm(`Remove ${description}?\n\n${getHomeSectionLabel(ticket.fleet)} · ${getStatusDisplayLabel(ticket.status)}\n\nThis removes the ticket and its information from the shared list for everyone.\n\nChoose Cancel to keep it, or OK to confirm removal.`)) return;
    persistenceRef.current.edit({ type: "remove", id });
    if (editingId === id) setEditingId(null);
    setMoveNotice(`${description} removed.`);
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
        <select style={compactSelect} value={ticket.fleet} aria-label="Fleet" data-ticket-field="fleet" onChange={(event) => updateTicket(ticket.id, "fleet", event.target.value)}>
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
    <div style={{ ...inlineControl, flexWrap: "wrap" }}>
      <select
        aria-label="Customer" style={{ ...compactSelect, flex: 1 }}
        value={ticket.customer}
        data-ticket-field="customer" onChange={(event) => updateTicket(ticket.id, "customer", event.target.value)}
      >
        <option value="">Select customer</option>
        {ticket.customer && !customerOptions.includes(ticket.customer) ? (
          <option value={ticket.customer}>{ticket.customer} (existing)</option>
        ) : null}
        {customerOptions.map((customer) => (
          <option key={customer} value={customer}>{customer}</option>
        ))}
      </select>
      {ticket.customer === "Other" ? (
        <input
          style={{ ...compactInput, flex: 1, minWidth: 0 }}
          aria-label="Other customer" placeholder="Customer"
          value={ticket.customerOther}
          data-ticket-field="customerOther" onChange={(event) => updateTicket(ticket.id, "customerOther", event.target.value)}
        />
      ) : null}
    </div>
  );

  const renderJobControl = (ticket) => (
    <input
      style={compactInput}
      value={ticket.job}
      aria-label="Pad / Job" data-ticket-field="job" onChange={(event) => updateTicket(ticket.id, "job", event.target.value)}
      placeholder="Pad, well, or job"
    />
  );

  const renderStartControl = (ticket) => (
    <div style={inlineControl}>
      <select
        style={{ ...compactSelect, flex: ticket.startMode === "date" ? "0 0 98px" : 1 }}
        value={ticket.startMode}
        aria-label="Start date setting" data-ticket-field="startMode" onChange={(event) => updateTicket(ticket.id, "startMode", event.target.value)}
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
          aria-label="Start date" data-ticket-field="startDate" onChange={(event) => updateTicket(ticket.id, "startDate", event.target.value)}
        />
      ) : null}
    </div>
  );

  const renderEndControl = (ticket) => (
    <div style={inlineControl}>
      <select
        style={{ ...compactSelect, flex: ticket.endMode === "date" ? "0 0 92px" : 1 }}
        value={ticket.endMode}
        aria-label="End date setting" data-ticket-field="endMode" onChange={(event) => updateTicket(ticket.id, "endMode", event.target.value)}
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
          aria-label="End date" data-ticket-field="endDate" onChange={(event) => updateTicket(ticket.id, "endDate", event.target.value)}
        />
      ) : null}
    </div>
  );

  const renderTicketNumberControl = (ticket) => (
    <input
      style={compactInput}
      inputMode="numeric"
      value={ticket.ticket}
      aria-label="Ticket number" data-ticket-field="ticket" onChange={(event) => updateTicket(ticket.id, "ticket", event.target.value.replace(/[^0-9]/g, ""))}
      placeholder="Ticket"
    />
  );

  const renderStatusControl = (ticket) => (
    <select style={compactSelect} value={ticket.status} aria-label="Status" data-ticket-field="status" onChange={(event) => updateTicket(ticket.id, "status", event.target.value)}>
      {allStatusOptions.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );

  const renderField = (caption, content, className = "") => (
    <div className={`ticket-field ${className}`}>
      <span style={fieldCaption}>{caption}</span>
      {content}
    </div>
  );

  const renderTicketCard = (ticket) => (
    <article key={ticket.id} className={`ticket-card${highlightedTicket?.id === ticket.id ? " ticket-card-highlighted" : ""}`}
      aria-label={`Ticket ${ticket.ticket || "new"}: ${getCustomerName(ticket) || "Customer TBD"}`}
      onFocusCapture={() => setEditingId(ticket.id)}
      ref={(element) => { if (element) ticketElementsRef.current.set(ticket.id, element); else ticketElementsRef.current.delete(ticket.id); }}
      style={{ borderLeftColor: statusTone[ticket.status]?.borderColor }}>
      <div className="ticket-summary">
        <div className="ticket-summary-job">
          <h3>{getCustomerName(ticket) || "New ticket"}</h3>
          <p>{ticket.job || "Pad / job needed"}</p>
        </div>
        <div><span className="ticket-summary-label">Ticket / Fleet</span>
          <strong>{ticket.ticket ? `#${ticket.ticket}` : "Number needed"}</strong>
          <span className="ticket-summary-secondary">{getHomeSectionLabel(ticket.fleet)}</span>
        </div>
        <div><span className="ticket-summary-label">Start → End</span>
          <span>{ticket.startMode === "date" && ticket.startDate ? ticket.startDate.split("-").slice(1).join("/") : "TBD"} → {ticket.endMode === "date" && ticket.endDate ? ticket.endDate.split("-").slice(1).join("/") : "TBD"}</span>
        </div>
        <span style={{ ...getStatusPillStyle(ticket.status), whiteSpace: "normal", textAlign: "center" }}>{getStatusDisplayLabel(ticket.status)}</span>
        <button type="button" className="ticket-edit-button" aria-expanded={expandedTicketId === ticket.id} aria-controls={`ticket-edit-${ticket.id}`}
          onClick={() => {
            if (expandedTicketId === ticket.id) { setExpandedTicketId(null); return; }
            setExpandedTicketId(ticket.id);
            setEditingId(ticket.id);
            pendingFollowRef.current = { id: ticket.id, key: "customer", moved: true, hadFocus: true, selectionStart: null };
          }}>{expandedTicketId === ticket.id ? "Done ↑" : "Edit ↓"}</button>
      </div>
      <div id={`ticket-edit-${ticket.id}`} hidden={expandedTicketId !== ticket.id} className="ticket-edit-panel">
      <div className="ticket-fields">
        {renderField("Customer", renderCustomerControl(ticket))}
        {renderField("Pad / Job", renderJobControl(ticket), "ticket-job")}
        {renderField("Ticket #", renderTicketNumberControl(ticket))}
        {renderField("Start", renderStartControl(ticket))}
        {renderField("End", renderEndControl(ticket))}
        {renderField("Status", renderStatusControl(ticket))}
      </div>
      <div className="ticket-card-footer">
        <div className="ticket-fleet">{renderField("Assigned fleet", renderFleetControl(ticket))}</div>
        <button type="button" onClick={() => removeTicket(ticket.id)} style={{ ...removeActionButton, width: "auto", padding: "8px 12px", borderRadius: 10 }}>Remove ticket</button>
      </div>
      </div>
    </article>
  );

  if (!isUnlocked) {
    return (
      <div style={{ background: "linear-gradient(180deg, #f3f7fc 0%, #f8fafc 100%)", minHeight: "100vh", padding: isMobile ? 12 : 18, color: "#111827", colorScheme: "light" }}>
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "left" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <button type="button" onClick={onBack} style={{ ...pageButton, background: "#e2e8f0", border: "none", width: isMobile ? "100%" : "auto" }}>
              Back to Fleet Report
            </button>
            {onOpenSchedule ? (
              <button type="button" onClick={onOpenSchedule} style={{ ...pageButton, background: "#ecfeff", border: "1px solid #67e8f9", color: "#0e7490", WebkitTextFillColor: "#0e7490", width: isMobile ? "100%" : "auto" }}>
                Pumpdown Schedule
              </button>
            ) : null}
          </div>
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
    <div className="tickets-page">
      {moveNotice ? <div role="status" className="ticket-toast">{moveNotice}</div> : null}
      <div className="tickets-container">
        <header className="tickets-header">
          <div className="tickets-navigation">
            <button type="button" onClick={onBack} style={pageButton}>← Fleet report</button>
            {onOpenSchedule ? <button type="button" onClick={onOpenSchedule} style={pageButton}>Pumpdown schedule ↗</button> : null}
            <button type="button" onClick={lockPage} style={{ ...pageButton, marginLeft: "auto" }}>Lock page</button>
          </div>
          <div className="tickets-title-row">
            <div>
              <div className="ticket-eyebrow">WS ENERGY SERVICES / OPERATIONS</div>
              <h1>Pumpdown tickets</h1>
              <p>Every ticket, from the field to completion. Changes save automatically.</p>
            </div>
            <button type="button" onClick={copyForTeams} className="tickets-primary">Copy Teams update</button>
          </div>
          <div className="tickets-sync">
            <span role="status" style={{ ...notificationBase, ...notificationStyles[syncMessageType], boxShadow: "none" }}>{syncMessage}</span>
            <button type="button" onClick={() => persistenceRef.current?.sync()} className="tickets-text-button">Save now / Retry</button>
          </div>
          {copyMessage ? <p role="status">{copyMessage}</p> : null}
        </header>

        <div className="tickets-stats" aria-label="Filter tickets by status">
          <button type="button" aria-pressed={!statusFilter} onClick={() => { setStatusFilter(""); setEditingId(null); }} className={`ticket-stat ${!statusFilter ? "selected" : ""}`}>
            <span>All tickets</span><strong>{activeTicketCount}</strong>
          </button>
          {statusCounts.map((status) => (
            <button type="button" key={status.value} aria-pressed={statusFilter === status.value}
              onClick={() => { setStatusFilter(statusFilter === status.value ? "" : status.value); setEditingId(null); }}
              className={`ticket-stat ${statusFilter === status.value ? "selected" : ""}`}>
              <span>{status.label}</span><strong style={{ color: statusTone[status.value].color }}>{status.count}</strong>
            </button>
          ))}
        </div>

        <section className="tickets-toolbar" aria-label="Find and add tickets">
          <div className="tickets-filter-row">
            <label className="tickets-search"><span style={fieldCaption}>Find a ticket</span>
              <input type="search" style={compactInput} placeholder="Customer, pad / job, or ticket #" value={search} onChange={(event) => { setSearch(event.target.value); setEditingId(null); }} />
            </label>
            <label><span style={fieldCaption}>Fleet</span>
              <select style={compactSelect} value={fleetFilter} onChange={(event) => { setFleetFilter(event.target.value); setEditingId(null); }}>
                <option value="">All fleets</option>
                {homeSectionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <button type="button" className="tickets-text-button" onClick={resetFilters}>Clear filters</button>
          </div>
          <div className="tickets-add-row">
            <label><span style={fieldCaption}>New ticket fleet</span>
              <select style={compactSelect} value={newTicketSection} onChange={(event) => setNewTicketSection(event.target.value)}>
                {homeSectionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <button type="button" className="tickets-primary" onClick={() => addTicket()}>+ Add ticket</button>
          </div>
        </section>

        <div className="tickets-results">
          <span role="status">Showing {visibleTickets.length} of {tickets.length} tickets{statusFilter ? ` · ${getStatusDisplayLabel(statusFilter)}` : ""}</span>
          <label>Jump to section <select aria-label="Jump to section" value="" onChange={(event) => document.getElementById(`ticket-section-${event.target.value}`)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" })}>
            <option value="">Choose section…</option>
            {groupedTickets.filter((group) => group.tickets.length).map((group) => <option key={group.value} value={group.value}>{group.label} ({group.tickets.length})</option>)}
          </select></label>
        </div>

        <main className="tickets-groups">
          {!visibleTickets.length ? <div style={emptySectionStyle}><h2>No tickets match your filters</h2><p>Try a different customer, job, ticket number, or fleet.</p><button type="button" onClick={resetFilters} style={pageButton}>Show all tickets</button></div> : null}
          {groupedTickets.filter((group) => group.tickets.length).map((group) => {
            const accent = getSectionAccent(group.value);
            return (
              <section id={`ticket-section-${group.value}`} key={group.value} style={sectionPanel}>
                <div style={sectionHeader}>
                  <div>
                    <div style={sectionKicker}>{group.value === "Completed" ? "Archive" : homeSectionValues.has(group.value) ? "Field operations" : "Workflow"}</div>
                    <h2 style={{ margin: 0, fontSize: 20 }}>{group.label} <span style={{ fontSize: 13, fontWeight: 600, color: accent.color }}>({group.tickets.length})</span></h2>
                  </div>
                  {homeSectionValues.has(group.value) ? <button type="button" className="tickets-text-button" onClick={() => addTicket(group.value)}>+ Add to {group.label}</button> : null}
                </div>
                <div className="ticket-section-cards">{group.tickets.map(renderTicketCard)}</div>
              </section>
            );
          })}
        </main>

        <details className="tickets-preview">
          <summary>Teams update preview <span>Full list · includes all tickets regardless of filters</span></summary>
          <pre>{teamsText}</pre>
          <button type="button" onClick={copyForTeams} className="tickets-primary">Copy Teams update</button>
        </details>
      </div>
    </div>
  );
}
