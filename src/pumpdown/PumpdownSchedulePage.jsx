import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  addActionButton,
  card,
  input,
  label,
  notificationBase,
  notificationStyles,
  removeActionButton,
  section,
  selectInput,
  supabase,
} from "../fleetReport/config";

const PUMPDOWN_SCHEDULE_PASSWORD = "1775";
const SHARED_SCHEDULE_TABLE = "pumpdown_schedule_state";
const SHARED_SAVE_DELAY_MS = 700;
const DEFAULT_ANCHOR_DATE = "2026-01-07";
const CYCLE_DAYS = 21;
const ROTATION_DAYS = 7;
const DEFAULT_SELECTED_YEAR = 2026;
const SHIFT_OPTIONS = ["A", "B", "C"];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, index) => 2026 + index);

const workbookFleets = [
  { label: "Fleet 1", crews: { A: ["Elihu Flores", "Diego Torres"], B: ["Miguel Avalos", "Jose A. Rueda Jr."], C: ["Wesley Whiddon", "Gabriel Martinez"] } },
  { label: "Fleet 2", crews: { A: ["Rudy Diaz", "Brian Doxey"], B: ["Manny Gonzalez", "Jose Vasquez"], C: ["Michael Gonzalez", "Carlos Rueda"] } },
  { label: "Fleet 3", crews: { A: ["Brian Abalos", "Fabian Martinez"], B: ["Omar Garcia", "Victor Ramirez"], C: ["Fabian Perez", "Luis G"] } },
  { label: "Fleet 4", crews: { A: ["John Bridges", "Mario Garza"], B: ["Dakota Chism", "Juan Barrientos"], C: ["", ""] } },
  { label: "Fleet 5", crews: { A: ["John Aaron", "Larry Rivas"], B: ["Miguel Hinojosa", "Jose M. Rueda Sr."], C: ["Chino Nguyen", "Alejandro Martinez"] } },
  { label: "Fleet 6", crews: { A: ["Chuck Phasadavong", "Jesse Flores"], B: ["David Gutierrez", "Armando Chavez"], C: ["Rosendo Garcia", "Rene Zuniga"] } },
  { label: "Fleet 7", crews: { A: ["Cecil Krueger", ""], B: ["Lee Dawkins", ""], C: ["Chad Howard", "Robert Kindle"] } },
  { label: "Fleet 8", crews: { A: ["", ""], B: ["", ""], C: ["", ""] } },
];

const defaultPeople = Array.from(
  new Set(
    workbookFleets.flatMap((fleet) =>
      SHIFT_OPTIONS.flatMap((shift) => fleet.crews[shift]).filter((person) => person && person !== "???")
    )
  )
).sort((a, b) => a.localeCompare(b));

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

const refinedCard = {
  ...card,
  borderRadius: 16,
  border: "1px solid #dbe4ee",
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.07)",
};

const mutedButton = {
  ...pageButton,
  background: "#e2e8f0",
  border: "none",
  color: "#111827",
  WebkitTextFillColor: "#111827",
};

const darkButton = {
  ...pageButton,
  background: "#111827",
  border: "none",
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
};

const rosterButton = {
  ...removeActionButton,
  padding: "7px 9px",
  borderRadius: 10,
  fontSize: 13,
};

const pdfButton = {
  ...pageButton,
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  color: "#334155",
  WebkitTextFillColor: "#334155",
  padding: "8px 10px",
  borderRadius: 10,
  fontSize: 13,
};

const shiftTone = {
  A: { background: "#ecfeff", border: "#67e8f9", color: "#0e7490" },
  B: { background: "#eff6ff", border: "#93c5fd", color: "#1d4ed8" },
  C: { background: "#f0fdf4", border: "#86efac", color: "#166534" },
};

const torqueTestShiftTone = {
  A: { background: "#fef9c3", border: "#facc15", color: "#854d0e" },
  B: { background: "#dbeafe", border: "#60a5fa", color: "#1d4ed8" },
  C: { background: "#fce7f3", border: "#f9a8d4", color: "#be185d" },
};

const scheduleConfigs = {
  pumpdown: {
    title: "Pumpdown Schedule",
    heading: "Pumpdown 14/7 Schedule",
    pdfTitle: "Pumpdown",
    filePrefix: "pumpdown",
    storageKey: "pumpdownScheduleDraft",
    backupStorageKey: "pumpdownScheduleDraftBackup",
    accessKey: "pumpdownScheduleUnlocked",
    sharedId: "current",
    cycleDays: CYCLE_DAYS,
    offDays: 7,
    rotationDays: ROTATION_DAYS,
    shiftTones: shiftTone,
    hideFleets: false,
  },
  torqueTest: {
    title: "Torque & Test Schedule",
    heading: "Torque & Test 20/10 Schedule",
    pdfTitle: "Torque & Test",
    filePrefix: "torque-test",
    storageKey: "torqueTestScheduleDraft",
    backupStorageKey: "torqueTestScheduleDraftBackup",
    accessKey: "torqueTestScheduleUnlocked",
    sharedId: "torque-test-current",
    cycleDays: 30,
    offDays: 10,
    rotationDays: 10,
    shiftTones: torqueTestShiftTone,
    hideFleets: true,
    unitLabel: "Torque & Test",
    defaultOffStartDates: { A: "2026-09-20", B: "2026-08-31", C: "2026-09-10" },
  },
};

const makeFleetId = () => `fleet-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const makePtoId = () => `pto-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getTodayDateValue = () => {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const dateFromInput = (value) => {
  const [year, month, day] = String(value || "").split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const dateToInput = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatShortDate = (date) =>
  date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

const formatFullDate = (date) =>
  date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

const formatDateRange = (startDate, endDate) => {
  const startMonth = startDate.toLocaleDateString(undefined, { month: "short" });
  const endMonth = endDate.toLocaleDateString(undefined, { month: "short" });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  if (startMonth === endMonth) return `${startMonth} ${startDay} - ${endDay}`;
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
};

const formatPdfDate = (value) =>
  value ? dateFromInput(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

const positiveMod = (value, divisor) => ((value % divisor) + divisor) % divisor;

const getDayOffset = (date, anchorDate) =>
  Math.round((dateFromInput(dateToInput(date)).getTime() - dateFromInput(anchorDate).getTime()) / DAY_MS);

const getShiftStatusForDate = (date, shift, schedule, config) => {
  if (config.hideFleets) {
    const offStartDate = schedule.offStartDates?.[shift] || config.defaultOffStartDates[shift];
    const cycleDay = positiveMod(getDayOffset(date, offStartDate), config.cycleDays);
    return cycleDay < config.offDays ? "OFF" : "ON";
  }
  const anchorDate = schedule.anchorDate;
  const cycleDay = positiveMod(getDayOffset(date, anchorDate), CYCLE_DAYS);
  if (shift === "A") return cycleDay <= 6 ? "OFF" : "ON";
  if (shift === "B") return cycleDay >= 7 && cycleDay <= 13 ? "OFF" : "ON";
  return cycleDay >= 14 ? "OFF" : "ON";
};

const getNextChangeDate = (shift, fromDate, schedule, config) => {
  const currentStatus = getShiftStatusForDate(fromDate, shift, schedule, config);
  for (let i = 1; i <= config.cycleDays; i += 1) {
    const candidate = addDays(fromDate, i);
    if (getShiftStatusForDate(candidate, shift, schedule, config) !== currentStatus) return candidate;
  }
  return fromDate;
};

const getRotationWeekStart = (date, anchorDate, rotationDays) => {
  const normalizedDate = dateFromInput(dateToInput(date));
  return addDays(normalizedDate, -positiveMod(getDayOffset(normalizedDate, anchorDate), rotationDays));
};

const getCrewNames = (crew = []) => crew.filter(Boolean).join(" / ") || "Open";

const getShiftChangeSummaries = (rows, getText) => {
  const seen = new Set();
  return rows.reduce((summaries, row) => {
    if (seen.has(row.shift)) return summaries;
    seen.add(row.shift);
    return [...summaries, getText(row)];
  }, []);
};

const isPtoEntryActiveInDateRange = (entry, startDate, endDate) => {
  if (!entry?.person || !entry.startDate) return false;
  const rangeStart = dateFromInput(dateToInput(startDate)).getTime();
  const rangeEnd = dateFromInput(dateToInput(endDate)).getTime();
  const entryStart = dateFromInput(entry.startDate).getTime();
  const entryEnd = dateFromInput(entry.endDate || entry.startDate).getTime();
  return Math.max(entryStart, entryEnd) >= Math.min(rangeStart, rangeEnd) && Math.min(entryStart, entryEnd) <= Math.max(rangeStart, rangeEnd);
};

const getPtoEntriesForDateRange = (ptoEntries, startDate, endDate) =>
  ptoEntries.filter((entry) => isPtoEntryActiveInDateRange(entry, startDate, endDate));

const formatPtoDateRange = (entry) => {
  const start = formatShortDate(dateFromInput(entry.startDate));
  const end = formatShortDate(dateFromInput(entry.endDate || entry.startDate));
  return start === end ? start : `${start} to ${end}`;
};

const normalizeCrew = (crew) => {
  if (!Array.isArray(crew)) return [""];
  const normalized = crew.map((person) => String(person || "").trim());
  return normalized.length ? normalized : [""];
};

const normalizeFleet = (fleet, index) => ({
  id: fleet?.id || `fleet-${index + 1}`,
  label: String(fleet?.label || `Fleet ${index + 1}`).trim() || `Fleet ${index + 1}`,
  crews: SHIFT_OPTIONS.reduce((acc, shift) => {
    acc[shift] = normalizeCrew(fleet?.crews?.[shift]);
    return acc;
  }, {}),
});

const getBlankPtoEntry = () => ({
  id: makePtoId(),
  person: "",
  startDate: getTodayDateValue(),
  endDate: getTodayDateValue(),
  note: "",
});

const normalizePtoEntry = (entry, index) => ({
  id: entry?.id || `pto-${index + 1}`,
  person: String(entry?.person || "").trim(),
  startDate: String(entry?.startDate || ""),
  endDate: String(entry?.endDate || entry?.startDate || ""),
  note: String(entry?.note || "").trim(),
});

const createInitialSchedule = (config) => ({
  anchorDate: DEFAULT_ANCHOR_DATE,
  offStartDates: config.defaultOffStartDates || undefined,
  selectedYear: DEFAULT_SELECTED_YEAR,
  people: config.hideFleets ? [] : defaultPeople,
  fleets: config.hideFleets
    ? [normalizeFleet({ id: "torque-test", label: config.unitLabel, crews: { A: [""], B: [""], C: [""] } }, 0)]
    : workbookFleets.map((fleet, index) => normalizeFleet({ ...fleet, id: `fleet-${index + 1}` }, index)),
  ptoEntries: [],
});

const normalizeSchedule = (schedule, config) => {
  const initial = createInitialSchedule(config);
  if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) return initial;

  let fleets = Array.isArray(schedule.fleets) && schedule.fleets.length
    ? schedule.fleets.map(normalizeFleet)
    : initial.fleets;
  if (config.hideFleets) {
    fleets = [{ ...fleets[0], id: "torque-test", label: config.unitLabel }];
  }
  const ptoEntries = Array.isArray(schedule.ptoEntries)
    ? schedule.ptoEntries.map(normalizePtoEntry)
    : initial.ptoEntries;

  const assignedPeople = fleets.flatMap((fleet) => SHIFT_OPTIONS.flatMap((shift) => fleet.crews[shift])).filter(Boolean);
  const ptoPeople = ptoEntries.map((entry) => entry.person).filter(Boolean);
  const people = Array.from(
    new Set([...(Array.isArray(schedule.people) ? schedule.people : initial.people), ...assignedPeople, ...ptoPeople].map((person) => String(person || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  return {
    ...initial,
    ...schedule,
    anchorDate: schedule.anchorDate || initial.anchorDate,
    offStartDates: config.hideFleets
      ? { ...config.defaultOffStartDates }
      : undefined,
    selectedYear: Number(schedule.selectedYear) || initial.selectedYear,
    people,
    fleets,
    ptoEntries,
  };
};

const loadStoredSchedule = (config) => {
  if (typeof window === "undefined") return createInitialSchedule(config);
  try {
    const stored = window.localStorage.getItem(config.storageKey);
    if (!stored) return createInitialSchedule(config);
    return normalizeSchedule(JSON.parse(stored), config);
  } catch (error) {
    console.error("Unable to load pumpdown schedule", error);
    return createInitialSchedule(config);
  }
};

const saveScheduleToLocalStorage = (schedule, config) => {
  if (typeof window === "undefined") return;

  try {
    const nextDraft = JSON.stringify(schedule);
    const currentDraft = window.localStorage.getItem(config.storageKey);
    if (currentDraft && currentDraft !== nextDraft) {
      window.localStorage.setItem(config.backupStorageKey, currentDraft);
    }
    window.localStorage.setItem(config.storageKey, nextDraft);
  } catch (error) {
    console.error("Unable to save pumpdown schedule", error);
  }
};

const getBlankFleet = (nextNumber) => ({
  id: makeFleetId(),
  label: `Fleet ${nextNumber}`,
  crews: { A: [""], B: [""], C: [""] },
});

const getMonthDates = (year, monthIndex) => {
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: totalDays }, (_, index) => new Date(year, monthIndex, index + 1));
};

const getYearDates = (year) =>
  Array.from({ length: 12 }, (_, monthIndex) => ({
    monthIndex,
    monthName: new Date(year, monthIndex, 1).toLocaleDateString(undefined, { month: "long" }),
    dates: getMonthDates(year, monthIndex),
  }));

const getCalendarWeeks = (dates) => {
  const weeks = [];
  let week = Array(7).fill(null);

  dates.forEach((date) => {
    const dayIndex = date.getDay();
    week[dayIndex] = date;
    if (dayIndex === 6) {
      weeks.push(week);
      week = Array(7).fill(null);
    }
  });

  if (week.some(Boolean)) weeks.push(week);
  while (weeks.length < 6) weeks.push(Array(7).fill(null));
  return weeks;
};

const getOffShiftsForDate = (date, schedule, config) =>
  SHIFT_OPTIONS.filter((shift) => getShiftStatusForDate(date, shift, schedule, config) === "OFF");

const escapePdfText = (value) =>
  Array.from(String(value ?? ""))
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 32 && code <= 126) return char;
      if (char === "\t") return " ";
      return "?";
    })
    .join("")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const pdfNum = (value) => {
  const fixed = Number(value).toFixed(2);
  return fixed.replace(/\.?0+$/, "");
};

const hexToRgb = (hex) => {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((char) => `${char}${char}`).join("") : clean;
  return [0, 2, 4].map((start) => parseInt(full.slice(start, start + 2), 16) / 255);
};

const pdfColor = (hex) => hexToRgb(hex).map(pdfNum).join(" ");

const createPdfPage = (width = 792, height = 612) => ({ width, height, commands: [] });

const drawRect = (page, x, y, width, height, { fill = null, stroke = "#cbd5e1", lineWidth = 0.7 } = {}) => {
  const yPdf = page.height - y - height;
  const commands = ["q"];
  if (fill) commands.push(`${pdfColor(fill)} rg`);
  if (stroke) commands.push(`${pdfColor(stroke)} RG`, `${pdfNum(lineWidth)} w`);
  commands.push(`${pdfNum(x)} ${pdfNum(yPdf)} ${pdfNum(width)} ${pdfNum(height)} re`);
  commands.push(fill && stroke ? "B" : fill ? "f" : "S");
  commands.push("Q");
  page.commands.push(commands.join("\n"));
};

const drawText = (page, text, x, y, { size = 9, bold = false, color = "#111827", maxWidth = null, align = "left" } = {}) => {
  let display = String(text ?? "");
  if (maxWidth) {
    const maxChars = Math.max(1, Math.floor(maxWidth / (size * 0.52)));
    if (display.length > maxChars) display = `${display.slice(0, Math.max(1, maxChars - 1))}…`;
  }
  const width = display.length * size * 0.52;
  const textX = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
  const yPdf = page.height - y - size;
  page.commands.push(`BT\n${pdfColor(color)} rg\n/${bold ? "F2" : "F1"} ${pdfNum(size)} Tf\n1 0 0 1 ${pdfNum(textX)} ${pdfNum(yPdf)} Tm\n(${escapePdfText(display)}) Tj\nET`);
};

const wrapPdfText = (value, maxWidth, size, maxLines = 2) => {
  const words = String(value || "").split(/\s+/).filter(Boolean);
  const maxChars = Math.max(6, Math.floor(maxWidth / (size * 0.52)));
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  const limited = lines.slice(0, maxLines);
  if (lines.length > maxLines && limited.length) {
    limited[limited.length - 1] = `${limited[limited.length - 1].slice(0, Math.max(1, maxChars - 1))}…`;
  }
  return limited.length ? limited : [""];
};

const drawTableHeader = (page, columns, x, y, rowHeight) => {
  let colX = x;
  columns.forEach((column) => {
    drawRect(page, colX, y, column.width, rowHeight, { fill: "#f1f5f9", stroke: "#cbd5e1" });
    drawText(page, column.label, colX + 5, y + 7, { size: 8, bold: true, color: "#334155", maxWidth: column.width - 10 });
    colX += column.width;
  });
};

const drawTableRow = (page, columns, row, x, y, rowHeight, fill = "#ffffff") => {
  let colX = x;
  columns.forEach((column, index) => {
    const value = row[index] ?? "";
    const size = column.size || 8.2;
    const maxLines = column.maxLines || 2;
    drawRect(page, colX, y, column.width, rowHeight, { fill, stroke: "#dbe4ee" });
    wrapPdfText(value, column.width - 10, size, maxLines).forEach((line, lineIndex) => {
      drawText(page, line, colX + 5, y + 6 + lineIndex * (size + 1.8), { size, color: column.color || "#111827", maxWidth: column.width - 10 });
    });
    colX += column.width;
  });
};

const drawDataTable = (writer, title, columns, rows) => {
  const headerHeight = 22;
  const rowHeight = 24;

  const startTable = (sectionTitle) => {
    writer.ensure(46);
    drawText(writer.page, sectionTitle, writer.margin, writer.y, { size: 13, bold: true });
    writer.y += 22;
    drawTableHeader(writer.page, columns, writer.margin, writer.y, headerHeight);
    writer.y += headerHeight;
  };

  startTable(title);
  rows.forEach((row, index) => {
    if (writer.y + rowHeight > writer.page.height - writer.margin) {
      writer.newPage();
      startTable(`${title} continued`);
    }
    drawTableRow(writer.page, columns, row, writer.margin, writer.y, rowHeight, index % 2 === 0 ? "#ffffff" : "#f8fafc");
    writer.y += rowHeight;
  });
  writer.y += 18;
};

const createPdfWriter = (title, subtitle = "") => {
  const writer = {
    margin: 30,
    pages: [],
    page: null,
    y: 0,
    newPage() {
      this.page = createPdfPage();
      this.pages.push(this.page);
      this.y = this.margin;
      drawText(this.page, title, this.margin, this.y, { size: 17, bold: true });
      this.y += 20;
      if (subtitle) {
        drawText(this.page, subtitle, this.margin, this.y, { size: 10, color: "#475569" });
        this.y += 18;
      }
    },
    ensure(heightNeeded) {
      if (!this.page || this.y + heightNeeded > this.page.height - this.margin) this.newPage();
    },
  };
  writer.newPage();
  return writer;
};

const buildPdfDocument = (pages) => {
  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds = [];

  pages.forEach((page) => {
    const content = page.commands.join("\n");
    const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent __PAGES__ 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  const pagesId = addObject(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  const resolvedObjects = objects.map((body) => body.replace(/__PAGES__/g, String(pagesId)));
  const parts = ["%PDF-1.4\n"];
  const offsets = [0];

  resolvedObjects.forEach((body, index) => {
    offsets.push(parts.join("").length);
    parts.push(`${index + 1} 0 obj\n${body}\nendobj\n`);
  });

  const xrefOffset = parts.join("").length;
  parts.push(`xref\n0 ${resolvedObjects.length + 1}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach((offset) => {
    parts.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  });
  parts.push(`trailer\n<< /Size ${resolvedObjects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return parts.join("");
};

const drawPdfFooter = (page, text) => {
  drawRect(page, 30, page.height - 42, page.width - 60, 1, { fill: "#e2e8f0", stroke: null });
  drawText(page, text, 30, page.height - 31, { size: 8, color: "#64748b" });
  drawText(page, "WS Energy Services", page.width - 30, page.height - 31, { size: 8, bold: true, color: "#475569", align: "right" });
};

const drawShiftCardHeader = (page, shift, tone, status, x, y, width) => {
  drawRect(page, x, y, width, 48, { fill: tone.background, stroke: tone.border, lineWidth: 1.2 });
  drawText(page, `${shift} SHIFT`, x + 14, y + 13, { size: 15, bold: true, color: tone.color });
  if (status) {
    const statusFill = status === "ON" ? "#dcfce7" : "#fee2e2";
    const statusBorder = status === "ON" ? "#86efac" : "#fca5a5";
    const statusColor = status === "ON" ? "#166534" : "#991b1b";
    drawRect(page, x + width - 60, y + 11, 46, 25, { fill: statusFill, stroke: statusBorder });
    drawText(page, status, x + width - 37, y + 17, { size: 10, bold: true, color: statusColor, align: "center" });
  }
};

const buildTorqueTestQuickReferencePdf = (periodStart, periodEnd, rows, config) => {
  const page = createPdfPage();
  const margin = 30;
  const gap = 14;
  const cardWidth = (page.width - margin * 2 - gap * 2) / 3;
  const cardY = 106;
  const cardHeight = 408;

  drawRect(page, 0, 0, page.width, page.height, { fill: "#ffffff", stroke: null });
  drawText(page, "Torque & Test Quick Reference", margin, 28, { size: 20, bold: true });
  drawText(page, `10-day rotation: ${formatDateRange(periodStart, periodEnd)}`, margin, 56, { size: 11, bold: true, color: "#475569" });
  drawText(page, "Current lineup and upcoming shift change", margin, 74, { size: 9, color: "#64748b" });

  SHIFT_OPTIONS.forEach((shift, shiftIndex) => {
    const row = rows.find((item) => item.shift === shift);
    const tone = config.shiftTones[shift];
    const x = margin + shiftIndex * (cardWidth + gap);
    drawRect(page, x, cardY, cardWidth, cardHeight, { fill: "#ffffff", stroke: tone.border, lineWidth: 1.2 });
    drawShiftCardHeader(page, shift, tone, row?.status, x, cardY, cardWidth);

    drawText(page, row?.status === "OFF" ? "Returns to work" : "First day off", x + 14, cardY + 67, { size: 8.5, bold: true, color: "#64748b" });
    drawText(page, row ? formatFullDate(row.changeDate) : "Not scheduled", x + 14, cardY + 83, { size: 11.5, bold: true, color: "#111827" });
    drawRect(page, x + 14, cardY + 110, cardWidth - 28, 1, { fill: "#e2e8f0", stroke: null });
    drawText(page, "PERSONNEL", x + 14, cardY + 126, { size: 8.5, bold: true, color: tone.color });

    const people = (row?.crewList || []).filter(Boolean);
    if (!people.length) {
      drawText(page, "Open shift", x + 14, cardY + 150, { size: 11, bold: true, color: "#64748b" });
    } else {
      people.slice(0, 10).forEach((person, personIndex) => {
        const rowY = cardY + 148 + personIndex * 23;
        drawRect(page, x + 14, rowY + 17, cardWidth - 28, 0.6, { fill: "#eef2f7", stroke: null });
        drawText(page, person, x + 14, rowY, { size: 10.2, color: "#111827", maxWidth: cardWidth - 28 });
      });
      if (people.length > 10) {
        drawText(page, `+ ${people.length - 10} more`, x + 14, cardY + 382, { size: 9, bold: true, color: tone.color });
      }
    }

    if (row?.vacationDetails?.length) {
      drawRect(page, x + 12, cardY + cardHeight - 58, cardWidth - 24, 42, { fill: "#fff1f2", stroke: "#fecaca" });
      drawText(page, "PTO / VACATION", x + 20, cardY + cardHeight - 49, { size: 7.5, bold: true, color: "#b91c1c" });
      drawText(page, row.vacationDetails.join("; "), x + 20, cardY + cardHeight - 35, { size: 8.2, color: "#991b1b", maxWidth: cardWidth - 40 });
    }
  });

  drawPdfFooter(page, `Prepared ${formatPdfDate(getTodayDateValue())}`);
  return buildPdfDocument([page]);
};

const buildTorqueTestPersonnelPdf = (fleets, config) => {
  const page = createPdfPage();
  const margin = 30;
  const gap = 14;
  const cardWidth = (page.width - margin * 2 - gap * 2) / 3;
  const crews = fleets[0]?.crews || { A: [], B: [], C: [] };
  const maxPeople = Math.max(...SHIFT_OPTIONS.map((shift) => (crews[shift] || []).filter(Boolean).length), 1);
  const cardY = 100;
  const cardHeight = Math.min(440, Math.max(270, 92 + maxPeople * 30));

  drawRect(page, 0, 0, page.width, page.height, { fill: "#ffffff", stroke: null });
  drawText(page, "Torque & Test Personnel Line Up", margin, 28, { size: 20, bold: true });
  drawText(page, "20 days on / 10 days off", margin, 56, { size: 11, bold: true, color: "#475569" });
  drawText(page, "Current A, B, and C shift assignments", margin, 74, { size: 9, color: "#64748b" });

  SHIFT_OPTIONS.forEach((shift, shiftIndex) => {
    const tone = config.shiftTones[shift];
    const x = margin + shiftIndex * (cardWidth + gap);
    const people = (crews[shift] || []).filter(Boolean);
    drawRect(page, x, cardY, cardWidth, cardHeight, { fill: "#ffffff", stroke: tone.border, lineWidth: 1.2 });
    drawShiftCardHeader(page, shift, tone, null, x, cardY, cardWidth);
    drawText(page, `${people.length} ${people.length === 1 ? "person" : "people"}`, x + 14, cardY + 65, { size: 8.5, bold: true, color: "#64748b" });

    if (!people.length) {
      drawText(page, "No personnel assigned", x + 14, cardY + 100, { size: 11, bold: true, color: "#64748b" });
    } else {
      people.forEach((person, personIndex) => {
        const rowY = cardY + 94 + personIndex * 30;
        if (rowY > cardY + cardHeight - 28) return;
        drawRect(page, x + 14, rowY - 6, 22, 22, { fill: tone.background, stroke: tone.border });
        drawText(page, String(personIndex + 1), x + 25, rowY, { size: 8.5, bold: true, color: tone.color, align: "center" });
        drawText(page, person, x + 46, rowY, { size: 10.5, color: "#111827", maxWidth: cardWidth - 60 });
        drawRect(page, x + 14, rowY + 22, cardWidth - 28, 0.6, { fill: "#eef2f7", stroke: null });
      });
    }
  });

  drawPdfFooter(page, `Updated ${formatPdfDate(getTodayDateValue())}`);
  return buildPdfDocument([page]);
};

const buildTodayPdf = (periodStart, periodEnd, onTodayRows, offTodayRows, config) => {
  if (config.hideFleets) {
    return buildTorqueTestQuickReferencePdf(periodStart, periodEnd, [...onTodayRows, ...offTodayRows], config);
  }
  const page = createPdfPage();
  const margin = 28;
  const gap = 16;
  const tableWidth = (page.width - margin * 2 - gap) / 2;
  const headerHeight = 22;
  const availableHeight = page.height - 112;
  const maxRows = Math.max(onTodayRows.length, offTodayRows.length, 1);
  const rowHeight = Math.max(15, Math.min(28, (availableHeight - headerHeight) / maxRows));
  const columns = config.hideFleets
    ? [
      { label: "Shift", width: 55 },
      { label: "Personnel / PTO", width: tableWidth - 55, maxLines: 3, size: 7.4 },
    ]
    : [
      { label: "Fleet", width: 50 },
      { label: "Shift", width: 45 },
      { label: "Personnel / PTO", width: tableWidth - 95, maxLines: 3, size: 7.4 },
    ];

  const drawTodayTable = (title, summaryLines, rows, x, y) => {
    drawText(page, title, x, y, { size: 13, bold: true });
    const summaryText = summaryLines.join("   |   ");
    if (summaryText) {
      drawText(page, summaryText, x, y + 18, { size: 8.5, bold: true, color: "#475569", maxWidth: tableWidth });
    }
    const tableY = y + 34;
    drawTableHeader(page, columns, x, tableY, headerHeight);
    rows.forEach((row, index) => {
      drawTableRow(page, columns, row.values, x, tableY + headerHeight + index * rowHeight, rowHeight, row.hasPto ? "#fff1f2" : index % 2 === 0 ? "#ffffff" : "#f8fafc");
    });
  };

  const makeTodayRow = (row) => ({
    hasPto: row.vacationDetails.length > 0,
    values: [
      ...(config.hideFleets ? [] : [row.fleet]),
      `${row.shift} Shift`,
      [row.crew, row.vacationDetails.length ? `PTO: ${row.vacationDetails.join("; ")}` : ""].filter(Boolean).join(" | "),
    ],
  });
  const onSummaries = getShiftChangeSummaries(onTodayRows, (row) => `${row.shift} Shift going off ${formatShortDate(row.changeDate)}`);
  const offSummaries = getShiftChangeSummaries(offTodayRows, (row) => `${row.shift} Shift returns ${formatShortDate(row.changeDate)}`);

  drawText(page, `${config.pdfTitle} Quick Reference`, margin, 28, { size: 18, bold: true });
  drawText(page, `Rotation: ${formatDateRange(periodStart, periodEnd)}`, margin, 52, { size: 10, color: "#475569" });
  drawTodayTable(
    "On This Week",
    onSummaries,
    onTodayRows.map((row) => makeTodayRow(row)),
    margin,
    82
  );
  drawTodayTable(
    "Off This Week",
    offSummaries,
    offTodayRows.map((row) => makeTodayRow(row)),
    margin + tableWidth + gap,
    82
  );

  return buildPdfDocument([page]);
};

const buildPtoPdf = (ptoEntries, fleets, config) => {
  const sortedEntries = [...(ptoEntries || [])].sort((a, b) => {
    const startSort = String(a.startDate || "").localeCompare(String(b.startDate || ""));
    if (startSort !== 0) return startSort;
    return String(a.person || "").localeCompare(String(b.person || ""));
  });
  const writer = createPdfWriter(`${config.pdfTitle} PTO / Vacation`, `${sortedEntries.length} entries`);
  const columns = [
    { label: "Person", width: 160 },
    { label: "Start", width: 96 },
    { label: "End", width: 96 },
    { label: "Assigned Shift", width: 160 },
    { label: "Note", width: 220 },
  ];
  const getAssignments = (person) => {
    const cleanPerson = String(person || "").trim().toLowerCase();
    if (!cleanPerson) return "";
    return fleets
      .flatMap((fleet) =>
        SHIFT_OPTIONS.flatMap((shift) =>
          (fleet.crews[shift] || [])
            .filter((crewPerson) => String(crewPerson || "").trim().toLowerCase() === cleanPerson)
            .map(() => config.hideFleets ? `${shift} Shift` : `${fleet.label} ${shift} Shift`)
        )
      )
      .join(", ");
  };
  const rows = sortedEntries.length
    ? sortedEntries.map((entry) => [
      entry.person || "Open",
      formatPdfDate(entry.startDate),
      formatPdfDate(entry.endDate || entry.startDate),
      getAssignments(entry.person) || "Not assigned",
      entry.note || "",
    ])
    : [["No PTO/vacation added", "", "", "", ""]];

  drawDataTable(writer, "PTO / Vacation", columns, rows);
  return buildPdfDocument(writer.pages);
};

const buildPersonnelPdf = (fleets, config) => {
  if (config.hideFleets) return buildTorqueTestPersonnelPdf(fleets, config);
  const writer = createPdfWriter(`${config.pdfTitle} Personnel Line Up`, config.hideFleets ? "A / B / C shifts" : `${fleets.length} fleets`);
  const columns = config.hideFleets
    ? [
      { label: "A Shift", width: 240 },
      { label: "B Shift", width: 240 },
      { label: "C Shift", width: 240 },
    ]
    : [
      { label: "Fleet", width: 90 },
      { label: "A Shift", width: 210 },
      { label: "B Shift", width: 210 },
      { label: "C Shift", width: 210 },
    ];
  const rows = fleets.map((fleet) => [
    ...(config.hideFleets ? [] : [fleet.label]),
    getCrewNames(fleet.crews.A),
    getCrewNames(fleet.crews.B),
    getCrewNames(fleet.crews.C),
  ]);

  drawDataTable(writer, "Personnel Line Up", columns, rows);
  return buildPdfDocument(writer.pages);
};

const buildYearPdf = (year, schedule, yearMonths, config) => {
  const page = createPdfPage();
  const margin = 22;
  const gapX = 8;
  const gapY = 10;
  const startY = 72;
  const monthWidth = (page.width - margin * 2 - gapX * 3) / 4;
  const monthHeight = (page.height - startY - margin - gapY * 2) / 3;
  const weekdayHeight = 11;
  const titleHeight = 17;
  const cellWidth = monthWidth / 7;
  const cellHeight = (monthHeight - titleHeight - weekdayHeight) / 6;

  drawText(page, `${config.pdfTitle} Year View ${year}`, margin, 26, { size: 18, bold: true });
  const anchorSummary = config.hideFleets
    ? SHIFT_OPTIONS.map((shift) => `${shift}: ${schedule.offStartDates[shift]}`).join("   ")
    : `A Shift Off Start: ${schedule.anchorDate}`;
  drawText(page, anchorSummary, margin, 50, { size: 9.5, color: "#475569" });
  drawText(page, "Calendar cells show the shift or shifts that are OFF.", page.width - margin, 50, { size: 8.4, color: "#475569", align: "right" });

  SHIFT_OPTIONS.forEach((shift, index) => {
    const tone = config.shiftTones[shift];
    const x = page.width - margin - 210 + index * 64;
    drawRect(page, x, 25, 14, 14, { fill: tone.background, stroke: tone.border });
    drawText(page, `OFF ${shift}`, x + 20, 28, { size: 8.2, bold: true, color: tone.color });
  });

  yearMonths.forEach((month, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const x = margin + column * (monthWidth + gapX);
    const y = startY + row * (monthHeight + gapY);
    const weeks = getCalendarWeeks(month.dates);

    drawRect(page, x, y, monthWidth, monthHeight, { fill: "#ffffff", stroke: "#cbd5e1" });
    drawRect(page, x, y, monthWidth, titleHeight, { fill: "#f8fafc", stroke: "#cbd5e1" });
    drawText(page, month.monthName, x + 6, y + 5, { size: 8.8, bold: true });

    WEEKDAY_LABELS.forEach((weekday, weekdayIndex) => {
      drawText(page, weekday.slice(0, 1), x + weekdayIndex * cellWidth + cellWidth / 2, y + titleHeight + 3, { size: 5.5, bold: true, color: "#64748b", align: "center" });
    });

    weeks.forEach((week, weekIndex) => {
      week.forEach((date, dayIndex) => {
        const cellX = x + dayIndex * cellWidth;
        const cellY = y + titleHeight + weekdayHeight + weekIndex * cellHeight;
        drawRect(page, cellX, cellY, cellWidth, cellHeight, { fill: date ? "#ffffff" : "#f8fafc", stroke: "#e2e8f0", lineWidth: 0.45 });
        if (!date) return;

        const offShifts = getOffShiftsForDate(date, schedule, config);
        const isToday = dateToInput(date) === getTodayDateValue();
        drawText(page, String(date.getDate()), cellX + 2, cellY + 2, { size: 5.5, bold: true, color: "#334155" });
        if (!offShifts.length) {
          drawText(page, "ALL ON", cellX + cellWidth / 2, cellY + 11, { size: 4.8, bold: true, color: "#64748b", align: "center" });
        }
        offShifts.forEach((offShift, offIndex) => {
          const tone = config.shiftTones[offShift];
          const stripeHeight = Math.max(4, (cellHeight - 11) / offShifts.length);
          drawRect(page, cellX + 2, cellY + 9 + offIndex * stripeHeight, cellWidth - 4, stripeHeight, {
            fill: tone.background,
            stroke: isToday ? "#2563eb" : tone.border,
            lineWidth: isToday ? 1 : 0.45,
          });
          drawText(page, offShift, cellX + cellWidth / 2, cellY + 9.5 + offIndex * stripeHeight, { size: 5.4, bold: true, color: tone.color, align: "center" });
        });
      });
    });
  });

  return buildPdfDocument([page]);
};

const downloadPdf = (fileName, pdf) => {
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export function PumpdownSchedulePage({ isMobile, onBack, onOpenTickets, onOpenPumpdownSchedule, onOpenTorqueTestSchedule, wsEnergyLogo, variant = "pumpdown" }) {
  const config = scheduleConfigs[variant] || scheduleConfigs.pumpdown;
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(config.accessKey) === "true";
  });
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [schedule, setSchedule] = useState(() => loadStoredSchedule(config));
  const initialScheduleRef = useRef(schedule);
  const [newPerson, setNewPerson] = useState("");
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [hasLoadedSharedSchedule, setHasLoadedSharedSchedule] = useState(!supabase);
  const [canSaveSharedSchedule, setCanSaveSharedSchedule] = useState(false);
  const [syncMessage, setSyncMessage] = useState(supabase ? "Loading shared schedule..." : "Using local schedule backup");
  const [syncMessageType, setSyncMessageType] = useState(supabase ? "info" : "warning");
  const lastSharedUpdatedAtRef = useRef("");
  const skipNextSharedSaveRef = useRef(false);
  const assignmentWarningTimeoutRef = useRef(null);

  useEffect(() => {
    let ignore = false;

    const loadSharedSchedule = async () => {
      if (!supabase) {
        setHasLoadedSharedSchedule(true);
        setCanSaveSharedSchedule(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from(SHARED_SCHEDULE_TABLE)
          .select("schedule, updated_at")
          .eq("id", config.sharedId)
          .maybeSingle();

        if (error) throw error;
        if (ignore) return;

        if (data?.schedule && typeof data.schedule === "object" && Object.keys(data.schedule).length) {
          const sharedSchedule = normalizeSchedule(data.schedule, config);
          const needsDateCorrection = config.hideFleets && SHIFT_OPTIONS.some(
            (shift) => data.schedule.offStartDates?.[shift] !== config.defaultOffStartDates[shift]
          );
          lastSharedUpdatedAtRef.current = data.updated_at || "";
          skipNextSharedSaveRef.current = !needsDateCorrection;
          setSchedule(sharedSchedule);
          saveScheduleToLocalStorage(sharedSchedule, config);
          setCanSaveSharedSchedule(true);
          setSyncMessage("Shared schedule loaded");
          setSyncMessageType("success");
          return;
        }

        const localSchedule = normalizeSchedule(initialScheduleRef.current, config);
        setSchedule(localSchedule);
        saveScheduleToLocalStorage(localSchedule, config);
        setCanSaveSharedSchedule(true);
        setSyncMessage("Shared schedule ready");
        setSyncMessageType("success");
      } catch (error) {
        console.error("Unable to load shared pumpdown schedule", error);
        if (!ignore) {
          setCanSaveSharedSchedule(false);
          setSyncMessage("Using local backup; shared schedule is unavailable");
          setSyncMessageType("warning");
        }
      } finally {
        if (!ignore) setHasLoadedSharedSchedule(true);
      }
    };

    loadSharedSchedule();

    return () => {
      ignore = true;
    };
  }, [config]);

  useEffect(() => {
    const normalized = normalizeSchedule(schedule, config);
    saveScheduleToLocalStorage(normalized, config);

    if (skipNextSharedSaveRef.current) {
      skipNextSharedSaveRef.current = false;
      return undefined;
    }

    if (!supabase || !hasLoadedSharedSchedule || !canSaveSharedSchedule) return undefined;

    const timeoutId = window.setTimeout(async () => {
      try {
        const savedAt = new Date().toISOString();
        const { data, error } = await supabase
          .from(SHARED_SCHEDULE_TABLE)
          .upsert({
            id: config.sharedId,
            schedule: normalized,
            updated_at: savedAt,
          })
          .select("updated_at")
          .maybeSingle();

        if (error) throw error;
        lastSharedUpdatedAtRef.current = data?.updated_at || savedAt;
        setSyncMessage("Shared schedule saved");
        setSyncMessageType("success");
      } catch (error) {
        console.error("Unable to save shared pumpdown schedule", error);
        setSyncMessage("Saved locally; shared save failed");
        setSyncMessageType("error");
      }
    }, SHARED_SAVE_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [canSaveSharedSchedule, config, hasLoadedSharedSchedule, schedule]);

  useEffect(() => {
    if (!supabase || !hasLoadedSharedSchedule) return undefined;

    const channel = supabase
      .channel(`${config.filePrefix}-schedule-state-sync`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: SHARED_SCHEDULE_TABLE,
          filter: `id=eq.${config.sharedId}`,
        },
        (payload) => {
          const nextRow = payload.new;
          if (!nextRow?.schedule || typeof nextRow.schedule !== "object") return;

          const remoteUpdatedAt = nextRow.updated_at || "";
          if (
            remoteUpdatedAt &&
            lastSharedUpdatedAtRef.current &&
            new Date(remoteUpdatedAt).getTime() <= new Date(lastSharedUpdatedAtRef.current).getTime()
          ) {
            return;
          }

          const remoteSchedule = normalizeSchedule(nextRow.schedule, config);
          const needsDateCorrection = config.hideFleets && SHIFT_OPTIONS.some(
            (shift) => nextRow.schedule.offStartDates?.[shift] !== config.defaultOffStartDates[shift]
          );
          lastSharedUpdatedAtRef.current = remoteUpdatedAt;
          skipNextSharedSaveRef.current = !needsDateCorrection;
          setSchedule(remoteSchedule);
          saveScheduleToLocalStorage(remoteSchedule, config);
          setCanSaveSharedSchedule(true);
          setSyncMessage("Shared schedule updated from another device");
          setSyncMessageType("info");
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setSyncMessage((current) => (current.includes("failed") || current.includes("unavailable") ? current : "Live schedule sync connected"));
          setSyncMessageType((current) => (current === "error" || current === "warning" ? current : "success"));
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [config, hasLoadedSharedSchedule]);

  const selectedYear = Number(schedule.selectedYear) || DEFAULT_SELECTED_YEAR;
  const availableYears = useMemo(
    () => Array.from(new Set([...YEAR_OPTIONS, selectedYear])).sort((a, b) => a - b),
    [selectedYear]
  );
  const yearMonths = useMemo(() => getYearDates(selectedYear), [selectedYear]);
  const todayInputValue = useMemo(() => getTodayDateValue(), []);
  const todayDate = useMemo(() => dateFromInput(todayInputValue), [todayInputValue]);
  const currentRotationStart = useMemo(
    () => getRotationWeekStart(todayDate, config.hideFleets ? schedule.offStartDates.A : schedule.anchorDate, config.rotationDays),
    [config, schedule.anchorDate, schedule.offStartDates, todayDate]
  );
  const selectedRotationStart = useMemo(
    () => addDays(currentRotationStart, selectedWeekOffset * config.rotationDays),
    [config.rotationDays, currentRotationStart, selectedWeekOffset]
  );
  const selectedRotationEnd = useMemo(
    () => addDays(selectedRotationStart, config.rotationDays - 1),
    [config.rotationDays, selectedRotationStart]
  );
  const quickReferenceTabs = useMemo(
    () => Array.from({ length: 6 }, (_, index) => {
      const start = addDays(currentRotationStart, index * config.rotationDays);
      const end = addDays(start, config.rotationDays - 1);
      return { index, start, end, label: formatDateRange(start, end) };
    }),
    [config.rotationDays, currentRotationStart]
  );

  const getRowsForDate = useMemo(() => (date, ptoStartDate = date, ptoEndDate = date) => {
    const rows = [];
    schedule.fleets.forEach((fleet) => {
      SHIFT_OPTIONS.forEach((shift) => {
        const status = getShiftStatusForDate(date, shift, schedule, config);
        const crewList = fleet.crews[shift] || [];
        const ptoEntries = getPtoEntriesForDateRange(schedule.ptoEntries || [], ptoStartDate, ptoEndDate);
        const vacationPeople = crewList.filter((person) =>
          ptoEntries.some((entry) => entry.person.toLowerCase() === person.toLowerCase())
        );
        const vacationDetails = crewList
          .filter(Boolean)
          .flatMap((person) =>
            ptoEntries
              .filter((entry) => String(entry.person || "").trim().toLowerCase() === String(person).trim().toLowerCase())
              .map((entry) => `${person}: ${formatPtoDateRange(entry)}`)
          );

        rows.push({
          fleetId: fleet.id,
          fleet: fleet.label,
          shift,
          status,
          crew: getCrewNames(crewList),
          crewList,
          vacationPeople,
          vacationDetails,
          ptoEntries,
          changeDate: getNextChangeDate(shift, date, schedule, config),
        });
      });
    });
    return rows;
  }, [config, schedule]);

  const selectedReferenceRows = useMemo(
    () => getRowsForDate(selectedRotationStart, selectedRotationStart, selectedRotationEnd),
    [getRowsForDate, selectedRotationEnd, selectedRotationStart]
  );

  const selectedOnRows = useMemo(() => selectedReferenceRows.filter((item) => item.status === "ON"), [selectedReferenceRows]);
  const selectedOffRows = useMemo(() => selectedReferenceRows.filter((item) => item.status === "OFF"), [selectedReferenceRows]);
  const selectedOnChangeSummaries = useMemo(
    () => getShiftChangeSummaries(selectedOnRows, (row) => `${row.shift} Shift going off ${formatShortDate(row.changeDate)}`),
    [selectedOnRows]
  );
  const selectedOffChangeSummaries = useMemo(
    () => getShiftChangeSummaries(selectedOffRows, (row) => `${row.shift} Shift returns ${formatShortDate(row.changeDate)}`),
    [selectedOffRows]
  );
  const sortedPtoEntries = useMemo(
    () => [...(schedule.ptoEntries || [])].sort((a, b) => {
      const startSort = String(a.startDate || "").localeCompare(String(b.startDate || ""));
      if (startSort !== 0) return startSort;
      return String(a.person || "").localeCompare(String(b.person || ""), undefined, { sensitivity: "base" });
    }),
    [schedule.ptoEntries]
  );
  const sortedRosterPeople = useMemo(
    () => [...schedule.people].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    [schedule.people]
  );
  const assignedRosterPeople = useMemo(() => {
    const assigned = new Set();
    schedule.fleets.forEach((fleet) => {
      SHIFT_OPTIONS.forEach((shift) => {
        (fleet.crews[shift] || []).forEach((person) => {
          const cleanPerson = String(person || "").trim().toLowerCase();
          if (cleanPerson) assigned.add(cleanPerson);
        });
      });
    });
    return assigned;
  }, [schedule.fleets]);
  const duplicateAssignments = useMemo(() => {
    const assignments = new Map();
    schedule.fleets.forEach((fleet) => {
      SHIFT_OPTIONS.forEach((shift) => {
        (fleet.crews[shift] || []).forEach((person) => {
          const cleanPerson = String(person || "").trim();
          if (!cleanPerson) return;
          const key = cleanPerson.toLowerCase();
          const existing = assignments.get(key) || { person: cleanPerson, spots: [] };
          existing.spots.push(config.hideFleets ? `${shift} Shift` : `${fleet.label} ${shift} Shift`);
          assignments.set(key, existing);
        });
      });
    });
    return Array.from(assignments.values()).filter((item) => item.spots.length > 1);
  }, [config.hideFleets, schedule.fleets]);

  const unlockPage = (event) => {
    event.preventDefault();
    if (password !== PUMPDOWN_SCHEDULE_PASSWORD) {
      setPassword("");
      setPasswordError("Incorrect password");
      return;
    }
    window.sessionStorage.setItem(config.accessKey, "true");
    setIsUnlocked(true);
    setPassword("");
    setPasswordError("");
  };

  const lockPage = () => {
    window.sessionStorage.removeItem(config.accessKey);
    setIsUnlocked(false);
    setPassword("");
  };

  const updateSchedule = (updater) => {
    setSchedule((prev) => normalizeSchedule(typeof updater === "function" ? updater(prev) : updater, config));
  };

  const updateField = (key, value) => updateSchedule((prev) => ({ ...prev, [key]: value }));

  const confirmRemoval = (message) => {
    if (typeof window === "undefined") return true;
    return window.confirm(message);
  };

  const showAssignmentWarning = (message) => {
    if (assignmentWarningTimeoutRef.current) {
      window.clearTimeout(assignmentWarningTimeoutRef.current);
    }
    setAssignmentMessage(message);
    assignmentWarningTimeoutRef.current = window.setTimeout(() => setAssignmentMessage(""), 10000);
  };

  const findPersonAssignment = (person, except = {}) => {
    const cleanPerson = String(person || "").trim().toLowerCase();
    if (!cleanPerson) return null;

    for (const fleet of schedule.fleets) {
      for (const shift of SHIFT_OPTIONS) {
        const crew = fleet.crews[shift] || [];
        for (let index = 0; index < crew.length; index += 1) {
          const crewPerson = String(crew[index] || "").trim().toLowerCase();
          const isSameSlot = fleet.id === except.fleetId && shift === except.shift && index === except.index;
          if (crewPerson === cleanPerson && !isSameSlot) {
            return { fleet: fleet.label, shift, index };
          }
        }
      }
    }

    return null;
  };

  const addFleet = () => {
    updateSchedule((prev) => ({
      ...prev,
      fleets: [...prev.fleets, getBlankFleet(prev.fleets.length + 1)],
    }));
  };

  const removeFleet = (fleetId) => {
    const fleet = schedule.fleets.find((item) => item.id === fleetId);
    if (!confirmRemoval(`Are you sure you want to remove ${fleet?.label || "this fleet"}?`)) return;

    updateSchedule((prev) => {
      if (prev.fleets.length <= 1) return prev;
      return { ...prev, fleets: prev.fleets.filter((fleet) => fleet.id !== fleetId) };
    });
  };

  const updateFleetLabel = (fleetId, value) => {
    updateSchedule((prev) => ({
      ...prev,
      fleets: prev.fleets.map((fleet) => (fleet.id === fleetId ? { ...fleet, label: value } : fleet)),
    }));
  };

  const updateCrewPerson = (fleetId, shift, index, value) => {
    const existingAssignment = findPersonAssignment(value, { fleetId, shift, index });
    if (existingAssignment) {
      const targetFleet = schedule.fleets.find((fleet) => fleet.id === fleetId);
      const assignedSpot = config.hideFleets ? `${existingAssignment.shift} Shift` : `${existingAssignment.fleet} ${existingAssignment.shift} Shift`;
      const requestedSpot = config.hideFleets ? `${shift} Shift` : `${targetFleet?.label || "this fleet"} ${shift} Shift`;
      showAssignmentWarning(`Cannot assign ${value} to ${requestedSpot}. ${value} is already assigned to ${assignedSpot}. Please remove ${value} from ${assignedSpot} to continue.`);
      return;
    }

    updateSchedule((prev) => ({
      ...prev,
      fleets: prev.fleets.map((fleet) => {
        if (fleet.id !== fleetId) return fleet;
        const crew = [...fleet.crews[shift]];
        crew[index] = value;
        return { ...fleet, crews: { ...fleet.crews, [shift]: crew } };
      }),
    }));
  };

  const addCrewSlot = (fleetId, shift) => {
    updateSchedule((prev) => ({
      ...prev,
      fleets: prev.fleets.map((fleet) => {
        if (fleet.id !== fleetId) return fleet;
        return { ...fleet, crews: { ...fleet.crews, [shift]: [...fleet.crews[shift], ""] } };
      }),
    }));
  };

  const removeCrewSlot = (fleetId, shift, index) => {
    const fleet = schedule.fleets.find((item) => item.id === fleetId);
    const person = fleet?.crews?.[shift]?.[index];
    const target = person
      ? `${person} from ${fleet?.label || "this fleet"} ${shift} Shift`
      : `this empty ${shift} Shift slot from ${fleet?.label || "this fleet"}`;
    if (!confirmRemoval(`Are you sure you want to remove ${target}?`)) return;

    updateSchedule((prev) => ({
      ...prev,
      fleets: prev.fleets.map((fleet) => {
        if (fleet.id !== fleetId) return fleet;
        const nextCrew = fleet.crews[shift].filter((_, crewIndex) => crewIndex !== index);
        return { ...fleet, crews: { ...fleet.crews, [shift]: nextCrew.length ? nextCrew : [""] } };
      }),
    }));
  };

  const addPersonToRoster = () => {
    const person = newPerson.trim();
    if (!person) return;
    updateSchedule((prev) => ({
      ...prev,
      people: Array.from(new Set([...prev.people, person])).sort((a, b) => a.localeCompare(b)),
    }));
    setNewPerson("");
  };

  const removePersonFromRoster = (person) => {
    if (!confirmRemoval(`Are you sure you want to remove ${person} from the roster? This will also clear them from any assigned shifts and PTO/vacation entries.`)) return;

    updateSchedule((prev) => ({
      ...prev,
      people: prev.people.filter((item) => item !== person),
      ptoEntries: (prev.ptoEntries || []).filter((entry) => entry.person !== person),
      fleets: prev.fleets.map((fleet) => ({
        ...fleet,
        crews: SHIFT_OPTIONS.reduce((acc, shift) => {
          acc[shift] = fleet.crews[shift].map((crewPerson) => (crewPerson === person ? "" : crewPerson));
          return acc;
        }, {}),
      })),
    }));
  };

  const addPtoEntry = () => {
    updateSchedule((prev) => ({
      ...prev,
      ptoEntries: [...(prev.ptoEntries || []), getBlankPtoEntry()],
    }));
  };

  const updatePtoEntry = (id, key, value) => {
    const currentEntry = schedule.ptoEntries?.find((entry) => entry.id === id);

    if (key === "startDate") {
      if (value && value < todayInputValue) {
        showAssignmentWarning("PTO / Vacation start date cannot be in the past.");
        return;
      }

      updateSchedule((prev) => ({
        ...prev,
        ptoEntries: (prev.ptoEntries || []).map((entry) => {
          if (entry.id !== id) return entry;
          const nextEndDate = !entry.endDate || entry.endDate < value ? value : entry.endDate;
          return { ...entry, startDate: value, endDate: nextEndDate };
        }),
      }));
      return;
    }

    if (key === "endDate") {
      const startDate = currentEntry?.startDate || todayInputValue;
      if (value && value < startDate) {
        showAssignmentWarning("PTO / Vacation end date cannot be before the start date.");
        return;
      }
    }

    updateSchedule((prev) => ({
      ...prev,
      ptoEntries: (prev.ptoEntries || []).map((entry) => (
        entry.id === id ? { ...entry, [key]: value } : entry
      )),
    }));
  };

  const removePtoEntry = (id) => {
    const entry = schedule.ptoEntries?.find((item) => item.id === id);
    const person = entry?.person || "this PTO entry";
    if (!confirmRemoval(`Are you sure you want to remove PTO/vacation time for ${person}?`)) return;

    updateSchedule((prev) => ({
      ...prev,
      ptoEntries: (prev.ptoEntries || []).filter((entry) => entry.id !== id),
    }));
  };

  const downloadSchedulePdf = (view) => {
    const safeDate = getTodayDateValue();
    if (view === "today") {
      const startDate = dateToInput(selectedRotationStart);
      const endDate = dateToInput(selectedRotationEnd);
      downloadPdf(`${config.filePrefix}-quick-reference-${startDate}-to-${endDate}.pdf`, buildTodayPdf(selectedRotationStart, selectedRotationEnd, selectedOnRows, selectedOffRows, config));
      setDownloadMessage("Quick Reference PDF downloaded");
    }
    if (view === "personnel") {
      downloadPdf(`${config.filePrefix}-personnel-line-up-${safeDate}.pdf`, buildPersonnelPdf(schedule.fleets, config));
      setDownloadMessage("Personnel Line Up PDF downloaded");
    }
    if (view === "pto") {
      downloadPdf(`${config.filePrefix}-pto-vacation-${safeDate}.pdf`, buildPtoPdf(schedule.ptoEntries || [], schedule.fleets, config));
      setDownloadMessage("PTO / Vacation PDF downloaded");
    }
    if (view === "year") {
      downloadPdf(`${config.filePrefix}-year-view-${selectedYear}.pdf`, buildYearPdf(selectedYear, schedule, yearMonths, config));
      setDownloadMessage("Year View PDF downloaded");
    }
    window.setTimeout(() => setDownloadMessage(""), 10000);
  };

  const renderPersonSelect = (fleet, shift, person, index) => (
    <div key={`${fleet.id}-${shift}-${index}`} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
      <select
        style={{ ...compactSelect, flex: 1, minWidth: 0 }}
        value={person}
        onChange={(event) => updateCrewPerson(fleet.id, shift, index, event.target.value)}
      >
        <option value="">Open slot</option>
        {sortedRosterPeople.map((rosterPerson) => (
          <option key={rosterPerson} value={rosterPerson}>{rosterPerson}</option>
        ))}
      </select>
      {fleet.crews[shift].length > 1 ? (
        <button type="button" onClick={() => removeCrewSlot(fleet.id, shift, index)} style={{ ...removeActionButton, padding: "8px 10px", borderRadius: 10 }}>
          Remove
        </button>
      ) : null}
    </div>
  );

  const renderFleetEditor = (fleet) => (
    <div key={fleet.id} style={{ ...refinedCard, boxShadow: "none" }}>
      {!config.hideFleets ? <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ flex: "1 1 220px" }}>
          <label style={label}>Fleet Name</label>
          <input style={compactInput} value={fleet.label} onChange={(event) => updateFleetLabel(fleet.id, event.target.value)} />
        </div>
        {schedule.fleets.length > 1 ? (
          <button type="button" onClick={() => removeFleet(fleet.id)} style={{ ...removeActionButton, borderRadius: 10 }}>
            Remove Fleet
          </button>
        ) : null}
      </div> : null}

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
        {SHIFT_OPTIONS.map((shift) => {
          const tone = config.shiftTones[shift];
          return (
            <div key={shift} style={{ border: `1px solid ${tone.border}`, background: tone.background, borderRadius: 12, padding: 12 }}>
              <div style={{ color: tone.color, fontWeight: 800, marginBottom: 10 }}>{shift} Shift</div>
              {fleet.crews[shift].map((person, index) => renderPersonSelect(fleet, shift, person, index))}
              <button type="button" onClick={() => addCrewSlot(fleet.id, shift)} style={{ ...addActionButton, width: "100%", borderRadius: 10 }}>
                Add Person Slot
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderTodayList = (title, rowsToRender, emptyText, summaryLines = []) => (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, background: "#ffffff", overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <h3 style={{ margin: 0, color: "#111827", fontSize: 17 }}>{title}</h3>
          <span style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>{rowsToRender.length} {config.hideFleets ? "shifts" : "crews"}</span>
        </div>
        {summaryLines.length ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 9 }}>
            {summaryLines.map((line) => (
              <span key={line} style={{ border: "1px solid #cbd5e1", background: "#ffffff", color: "#334155", borderRadius: 999, padding: "4px 8px", fontSize: 12, fontWeight: 900 }}>
                {line}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ display: "grid", gap: 10, padding: 12 }}>
        {rowsToRender.length ? rowsToRender.map((rowItem) => {
          const tone = config.shiftTones[rowItem.shift];
          return (
            <div key={`${rowItem.fleetId}-${rowItem.shift}-${title}`} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 11, background: "#ffffff" }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : config.hideFleets ? "90px minmax(0, 1fr)" : "90px 78px minmax(0, 1fr)", gap: 10, alignItems: "center" }}>
                {!config.hideFleets ? <strong style={{ color: "#111827", fontSize: 14 }}>{rowItem.fleet}</strong> : null}
                <span style={{ border: `1px solid ${tone.border}`, background: tone.background, color: tone.color, borderRadius: 999, padding: "4px 8px", fontSize: 12, fontWeight: 900, textAlign: "center" }}>
                  {rowItem.shift} Shift
                </span>
                <span style={{ color: "#475569", fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>{rowItem.crew}</span>
              </div>
              {rowItem.vacationDetails.length ? (
                <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 12, fontWeight: 900 }}>
                  PTO / Vacation: {rowItem.vacationDetails.join(", ")}
                </div>
              ) : null}
            </div>
          );
        }) : (
          <div style={{ color: "#64748b", fontWeight: 700, padding: 4 }}>{emptyText}</div>
        )}
      </div>
    </div>
  );

  const renderYearMonth = (month) => (
    <div key={month.monthIndex} style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#ffffff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <h3 style={{ margin: 0, color: "#111827", fontSize: 16 }}>{month.monthName}</h3>
        <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>{selectedYear}</span>
      </div>
      <div style={{ padding: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 5, marginBottom: 5 }}>
          {WEEKDAY_LABELS.map((weekday) => (
            <div key={weekday} style={{ textAlign: "center", color: "#64748b", fontSize: 11, fontWeight: 800 }}>
              {weekday.slice(0, 3)}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 5 }}>
          {getCalendarWeeks(month.dates).flatMap((week, weekIndex) =>
            week.map((date, dayIndex) => {
              if (!date) {
                return <div key={`${month.monthIndex}-${weekIndex}-${dayIndex}-blank`} style={{ minHeight: 68, borderRadius: 8, background: "#f8fafc", border: "1px solid #eef2f7" }} />;
              }

              const isToday = dateToInput(date) === getTodayDateValue();
              return (
                <div
                  key={dateToInput(date)}
                  style={{
                    minHeight: 68,
                    borderRadius: 8,
                    border: isToday ? "2px solid #2563eb" : "1px solid #e2e8f0",
                    padding: 5,
                    background: "#ffffff",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ color: "#111827", fontSize: 12, fontWeight: 900, marginBottom: 5 }}>{date.getDate()}</div>
                  <div style={{ display: "grid", gap: 3 }}>
                    {SHIFT_OPTIONS.map((shift) => {
                      const status = getShiftStatusForDate(date, shift, schedule, config);
                      const tone = config.shiftTones[shift];
                      return (
                        <div
                          key={shift}
                          title={`${shift} Shift - ${status} - ${formatFullDate(date)}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 4,
                            borderRadius: 6,
                            border: `1px solid ${status === "ON" || config.hideFleets ? tone.border : "#cbd5e1"}`,
                            background: status === "ON" || config.hideFleets ? tone.background : "#f1f5f9",
                            color: status === "ON" || config.hideFleets ? tone.color : "#64748b",
                            opacity: config.hideFleets && status === "OFF" ? 0.62 : 1,
                            fontSize: 10,
                            fontWeight: 900,
                            lineHeight: 1,
                            padding: "3px 4px",
                          }}
                        >
                          <span>{shift}</span>
                          <span>{status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  if (!isUnlocked) {
    return (
      <div style={{ background: "linear-gradient(180deg, #f3f7fc 0%, #f8fafc 100%)", minHeight: "100vh", padding: isMobile ? 12 : 18, color: "#111827", colorScheme: "light" }}>
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "left" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <button type="button" onClick={onBack} style={{ ...mutedButton, flex: isMobile ? "1 1 100%" : "none" }}>
              Back to Fleet Report
            </button>
            {onOpenTickets ? (
              <button type="button" onClick={onOpenTickets} style={{ ...mutedButton, flex: isMobile ? "1 1 100%" : "none" }}>
                Pumpdown Tickets
              </button>
            ) : null}
            {onOpenPumpdownSchedule ? (
              <button type="button" onClick={onOpenPumpdownSchedule} style={{ ...mutedButton, flex: isMobile ? "1 1 100%" : "none" }}>
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
                {config.title}
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
            <button type="submit" style={{ ...darkButton, marginTop: 14, width: "100%" }}>
              Unlock Page
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "linear-gradient(180deg, #f3f7fc 0%, #f8fafc 45%, #f8fafc 100%)", minHeight: "100vh", padding: isMobile ? 12 : 18, color: "#111827", colorScheme: "light" }}>
      {assignmentMessage ? (
        <div
          role="alert"
          style={{
            position: "fixed",
            zIndex: 1000,
            right: isMobile ? 12 : 24,
            bottom: isMobile ? 12 : 24,
            left: isMobile ? 12 : "auto",
            maxWidth: isMobile ? "none" : 520,
            border: "1px solid #fca5a5",
            background: "#fff1f2",
            color: "#991b1b",
            borderRadius: 14,
            boxShadow: "0 18px 42px rgba(127, 29, 29, 0.20)",
            padding: 14,
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 800, lineHeight: 1.45 }}>
              {assignmentMessage}
            </div>
            <button
              type="button"
              onClick={() => setAssignmentMessage("")}
              style={{
                border: "1px solid #fca5a5",
                background: "#ffffff",
                color: "#991b1b",
                WebkitTextFillColor: "#991b1b",
                borderRadius: 10,
                padding: "5px 9px",
                cursor: "pointer",
                fontWeight: 900,
              }}
              aria-label="Close assignment warning"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
      <div style={{ maxWidth: 1260, margin: "0 auto", textAlign: "left" }}>
        <div style={{ ...refinedCard, marginBottom: 16, padding: isMobile ? 14 : 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
              <button type="button" onClick={onBack} style={{ ...mutedButton, flex: isMobile ? 1 : "none" }}>
                Back to Fleet Report
              </button>
              {onOpenTickets ? (
                <button type="button" onClick={onOpenTickets} style={{ ...mutedButton, flex: isMobile ? 1 : "none" }}>
                  Pumpdown Tickets
                </button>
              ) : null}
              {onOpenPumpdownSchedule ? (
                <button type="button" onClick={onOpenPumpdownSchedule} style={{ ...mutedButton, flex: isMobile ? 1 : "none" }}>
                  Pumpdown Schedule
                </button>
              ) : null}
              {onOpenTorqueTestSchedule ? (
                <button type="button" onClick={onOpenTorqueTestSchedule} style={{ ...mutedButton, flex: isMobile ? 1 : "none" }}>
                  Torque &amp; Test Schedule
                </button>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
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
              {config.heading}
            </h1>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ ...notificationBase, ...notificationStyles[syncMessageType] }}>{syncMessage}</span>
            </div>
          </div>
          {downloadMessage ? (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
              <div style={{ ...notificationBase, ...notificationStyles.success }}>{downloadMessage}</div>
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={refinedCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, color: "#111827" }}>On Today / Upcoming Weeks</h2>
                <div style={{ marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                  {config.rotationDays}-day rotation {formatDateRange(selectedRotationStart, selectedRotationEnd)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => downloadSchedulePdf("today")} style={pdfButton}>
                  Download Quick Reference PDF
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {quickReferenceTabs.map((tab) => (
                <button
                  key={tab.index}
                  type="button"
                  onClick={() => setSelectedWeekOffset(tab.index)}
                  style={{
                    ...pageButton,
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: selectedWeekOffset === tab.index ? "#dbeafe" : "#ffffff",
                    border: selectedWeekOffset === tab.index ? "2px solid #2563eb" : "1px solid #cbd5e1",
                    color: "#111827",
                    WebkitTextFillColor: "#111827",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", alignItems: "start" }}>
              {renderTodayList("On", selectedOnRows, "No crews are marked on.", selectedOnChangeSummaries)}
              {renderTodayList("Off", selectedOffRows, "No crews are marked off.", selectedOffChangeSummaries)}
            </div>
          </div>

          <div style={refinedCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, color: "#111827" }}>Personnel Line Up</h2>
                <div style={{ marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                  {config.hideFleets ? "Edit each shift's roster names and crew slots here." : "Edit fleets, shifts, roster names, and crew slots here."}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => downloadSchedulePdf("personnel")} style={pdfButton}>
                  Download Line Up PDF
                </button>
                {!config.hideFleets ? (
                  <button type="button" onClick={addFleet} style={{ ...addActionButton, borderRadius: 10 }}>
                    Add Fleet
                  </button>
                ) : null}
              </div>
            </div>

            <div style={{ ...section, marginTop: 0, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap", marginBottom: 12 }}>
                <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                  <label style={label}>Add Person to Roster</label>
                  <input
                    style={compactInput}
                    value={newPerson}
                    onChange={(event) => setNewPerson(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addPersonToRoster();
                      }
                    }}
                  />
                </div>
                <button type="button" onClick={addPersonToRoster} style={{ ...addActionButton, borderRadius: 10 }}>
                  Add Person
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxHeight: 160, overflowY: "auto", paddingRight: 2 }}>
                {sortedRosterPeople.map((person) => {
                  const isAssigned = assignedRosterPeople.has(String(person || "").trim().toLowerCase());
                  return (
                    <div
                      key={person}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        border: isAssigned ? "1px solid #e2e8f0" : "1px solid #facc15",
                        borderRadius: 999,
                        padding: "6px 8px 6px 10px",
                        background: isAssigned ? "#ffffff" : "#fef9c3",
                      }}
                    >
                      <span style={{ color: "#111827", fontWeight: 700, fontSize: 13 }}>{person}</span>
                      {!isAssigned ? (
                        <span style={{ color: "#854d0e", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>
                          Unassigned
                        </span>
                      ) : null}
                      <button type="button" onClick={() => removePersonFromRoster(person)} style={{ ...rosterButton, padding: "4px 7px", borderRadius: 999 }}>
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {duplicateAssignments.length ? (
              <div style={{ ...notificationBase, ...notificationStyles.error, borderRadius: 12, alignItems: "flex-start", marginBottom: 14, display: "flex" }}>
                Duplicate assignments: {duplicateAssignments.map((item) => `${item.person} (${item.spots.join(", ")})`).join("; ")}
              </div>
            ) : null}

            <div style={{ ...section, marginTop: 0, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, color: "#111827" }}>PTO / Vacation</h3>
                <div style={{ marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 700 }}>Vacation conflicts show in red on the quick reference.</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => downloadSchedulePdf("pto")} style={pdfButton}>
                  Download PTO PDF
                </button>
                <button type="button" onClick={addPtoEntry} style={{ ...addActionButton, borderRadius: 10 }}>
                  Add PTO / Vacation
                </button>
              </div>
            </div>

              <div style={{ display: "grid", gap: 10 }}>
                {sortedPtoEntries.length ? sortedPtoEntries.map((entry) => (
                  <div key={entry.id} style={{ display: "grid", gap: 10, gridTemplateColumns: isMobile ? "1fr" : "minmax(180px, 1.2fr) minmax(140px, 0.8fr) minmax(140px, 0.8fr) minmax(180px, 1fr) auto", alignItems: "end", border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 12, padding: 12 }}>
                    <div>
                      <label style={label}>Person</label>
                      <select style={compactSelect} value={entry.person} onChange={(event) => updatePtoEntry(entry.id, "person", event.target.value)}>
                        <option value="">Select person</option>
                        {sortedRosterPeople.map((person) => (
                          <option key={person} value={person}>{person}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={label}>Start</label>
                      <input style={compactInput} type="date" min={todayInputValue} value={entry.startDate} onChange={(event) => updatePtoEntry(entry.id, "startDate", event.target.value)} />
                    </div>
                    <div>
                      <label style={label}>End</label>
                      <input style={compactInput} type="date" min={entry.startDate || todayInputValue} value={entry.endDate} onChange={(event) => updatePtoEntry(entry.id, "endDate", event.target.value)} />
                    </div>
                    <div>
                      <label style={label}>Note</label>
                      <input style={compactInput} value={entry.note} onChange={(event) => updatePtoEntry(entry.id, "note", event.target.value)} placeholder="PTO, vacation, etc." />
                    </div>
                    <button type="button" onClick={() => removePtoEntry(entry.id)} style={{ ...removeActionButton, borderRadius: 10 }}>
                      Remove
                    </button>
                  </div>
                )) : (
                  <div style={{ color: "#64748b", fontWeight: 700 }}>No PTO or vacation time added.</div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {schedule.fleets.map(renderFleetEditor)}
            </div>
          </div>

          <div style={refinedCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, color: "#111827" }}>Year View</h2>
                <div style={{ marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 700 }}>Full-year A/B/C shift calendar.</div>
              </div>
              <button type="button" onClick={() => downloadSchedulePdf("year")} style={pdfButton}>
                Download Year View PDF
              </button>
            </div>

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile || config.hideFleets ? "1fr" : "minmax(0, 1fr) 260px", alignItems: "end", marginBottom: 14 }}>
              <div>
                <label style={label}>Year</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {availableYears.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => updateField("selectedYear", year)}
                      style={{
                        ...pageButton,
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: selectedYear === year ? "#dbeafe" : "#ffffff",
                        border: selectedYear === year ? "2px solid #2563eb" : "1px solid #cbd5e1",
                        color: "#111827",
                        WebkitTextFillColor: "#111827",
                      }}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
              {!config.hideFleets ? (
                <div>
                  <label style={label}>A Shift Off Start</label>
                  <input style={input} type="date" value={schedule.anchorDate} onChange={(event) => updateField("anchorDate", event.target.value)} />
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
              {SHIFT_OPTIONS.map((shift) => {
                const tone = config.shiftTones[shift];
                return (
                  <span key={shift} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: tone.color, fontSize: 13, fontWeight: 800 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, background: tone.background, border: `1px solid ${tone.border}` }} />
                    {shift} Shift
                  </span>
                );
              })}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#334155", fontSize: 13, fontWeight: 800 }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, background: "#eff6ff", border: "2px solid #2563eb" }} />
                Today
              </span>
            </div>

            <div style={{ display: "grid", gap: 14, gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(360px, 1fr))" }}>
              {yearMonths.map(renderYearMonth)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TorqueTestSchedulePage(props) {
  return <PumpdownSchedulePage {...props} variant="torqueTest" />;
}
