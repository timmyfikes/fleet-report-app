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
const STORAGE_KEY = "pumpdownScheduleDraft";
const BACKUP_STORAGE_KEY = "pumpdownScheduleDraftBackup";
const ACCESS_KEY = "pumpdownScheduleUnlocked";
const SHARED_SCHEDULE_TABLE = "pumpdown_schedule_state";
const SHARED_SCHEDULE_ID = "current";
const SHARED_SAVE_DELAY_MS = 700;
const DEFAULT_ANCHOR_DATE = "2026-01-07";
const CYCLE_DAYS = 21;
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

const formatPdfDate = (value) =>
  value ? dateFromInput(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

const positiveMod = (value, divisor) => ((value % divisor) + divisor) % divisor;

const getDayOffset = (date, anchorDate) =>
  Math.round((dateFromInput(dateToInput(date)).getTime() - dateFromInput(anchorDate).getTime()) / DAY_MS);

const getShiftStatusForDate = (date, shift, anchorDate) => {
  const cycleDay = positiveMod(getDayOffset(date, anchorDate), CYCLE_DAYS);
  if (shift === "A") return cycleDay <= 6 ? "OFF" : "ON";
  if (shift === "B") return cycleDay >= 7 && cycleDay <= 13 ? "OFF" : "ON";
  return cycleDay >= 14 ? "OFF" : "ON";
};

const getNextChangeDate = (shift, fromDate, anchorDate) => {
  const currentStatus = getShiftStatusForDate(fromDate, shift, anchorDate);
  for (let i = 1; i <= CYCLE_DAYS; i += 1) {
    const candidate = addDays(fromDate, i);
    if (getShiftStatusForDate(candidate, shift, anchorDate) !== currentStatus) return candidate;
  }
  return fromDate;
};

const getCrewNames = (crew = []) => crew.filter(Boolean).join(" / ") || "Open";

const isPtoEntryActiveOnDate = (entry, date) => {
  if (!entry?.person || !entry.startDate) return false;
  const dateTime = dateFromInput(dateToInput(date)).getTime();
  const startTime = dateFromInput(entry.startDate).getTime();
  const endTime = dateFromInput(entry.endDate || entry.startDate).getTime();
  return dateTime >= Math.min(startTime, endTime) && dateTime <= Math.max(startTime, endTime);
};

const getPtoEntriesForDate = (ptoEntries, date) =>
  ptoEntries.filter((entry) => isPtoEntryActiveOnDate(entry, date));

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

const createInitialSchedule = () => ({
  anchorDate: DEFAULT_ANCHOR_DATE,
  selectedYear: DEFAULT_SELECTED_YEAR,
  people: defaultPeople,
  fleets: workbookFleets.map((fleet, index) => normalizeFleet({ ...fleet, id: `fleet-${index + 1}` }, index)),
  ptoEntries: [],
});

const normalizeSchedule = (schedule) => {
  const initial = createInitialSchedule();
  if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) return initial;

  const fleets = Array.isArray(schedule.fleets) && schedule.fleets.length
    ? schedule.fleets.map(normalizeFleet)
    : initial.fleets;
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
    selectedYear: Number(schedule.selectedYear) || initial.selectedYear,
    people,
    fleets,
    ptoEntries,
  };
};

const loadStoredSchedule = () => {
  if (typeof window === "undefined") return createInitialSchedule();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return createInitialSchedule();
    return normalizeSchedule(JSON.parse(stored));
  } catch (error) {
    console.error("Unable to load pumpdown schedule", error);
    return createInitialSchedule();
  }
};

const saveScheduleToLocalStorage = (schedule) => {
  if (typeof window === "undefined") return;

  try {
    const nextDraft = JSON.stringify(schedule);
    const currentDraft = window.localStorage.getItem(STORAGE_KEY);
    if (currentDraft && currentDraft !== nextDraft) {
      window.localStorage.setItem(BACKUP_STORAGE_KEY, currentDraft);
    }
    window.localStorage.setItem(STORAGE_KEY, nextDraft);
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

const getOffShiftForDate = (date, anchorDate) =>
  SHIFT_OPTIONS.find((shift) => getShiftStatusForDate(date, shift, anchorDate) === "OFF") || "";

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

const buildTodayPdf = (todayDate, onTodayRows, offTodayRows) => {
  const page = createPdfPage();
  const margin = 28;
  const gap = 16;
  const tableWidth = (page.width - margin * 2 - gap) / 2;
  const headerHeight = 22;
  const availableHeight = page.height - 112;
  const maxRows = Math.max(onTodayRows.length, offTodayRows.length, 1);
  const rowHeight = Math.max(15, Math.min(28, (availableHeight - headerHeight) / maxRows));
  const columns = [
    { label: "Fleet", width: 50 },
    { label: "Shift", width: 45 },
    { label: "Personnel / PTO", width: tableWidth - 180, maxLines: 3, size: 7.4 },
    { label: "Next Change", width: 85 },
  ];

  const drawTodayTable = (title, rows, x, y) => {
    drawText(page, title, x, y, { size: 13, bold: true });
    const tableY = y + 20;
    drawTableHeader(page, columns, x, tableY, headerHeight);
    rows.forEach((row, index) => {
      drawTableRow(page, columns, row.values, x, tableY + headerHeight + index * rowHeight, rowHeight, row.hasPto ? "#fff1f2" : index % 2 === 0 ? "#ffffff" : "#f8fafc");
    });
  };

  const makeTodayRow = (row, changeText) => ({
    hasPto: row.vacationDetails.length > 0,
    values: [
      row.fleet,
      `${row.shift} Shift`,
      [row.crew, row.vacationDetails.length ? `PTO: ${row.vacationDetails.join("; ")}` : ""].filter(Boolean).join(" | "),
      changeText,
    ],
  });

  drawText(page, "Pumpdown On Today", margin, 28, { size: 18, bold: true });
  drawText(page, `Date: ${formatFullDate(todayDate)}`, margin, 52, { size: 10, color: "#475569" });
  drawTodayTable(
    "On Today",
    onTodayRows.map((row) => makeTodayRow(row, formatShortDate(row.changeDate))),
    margin,
    82
  );
  drawTodayTable(
    "Off Today",
    offTodayRows.map((row) => makeTodayRow(row, `Returns ${formatShortDate(row.changeDate)}`)),
    margin + tableWidth + gap,
    82
  );

  return buildPdfDocument([page]);
};

const buildPtoPdf = (ptoEntries, fleets) => {
  const sortedEntries = [...(ptoEntries || [])].sort((a, b) => {
    const startSort = String(a.startDate || "").localeCompare(String(b.startDate || ""));
    if (startSort !== 0) return startSort;
    return String(a.person || "").localeCompare(String(b.person || ""));
  });
  const writer = createPdfWriter("Pumpdown PTO / Vacation", `${sortedEntries.length} entries`);
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
            .map(() => `${fleet.label} ${shift} Shift`)
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

const buildPersonnelPdf = (fleets) => {
  const writer = createPdfWriter("Pumpdown Personnel Line Up", `${fleets.length} fleets`);
  const columns = [
    { label: "Fleet", width: 90 },
    { label: "A Shift", width: 210 },
    { label: "B Shift", width: 210 },
    { label: "C Shift", width: 210 },
  ];
  const rows = fleets.map((fleet) => [
    fleet.label,
    getCrewNames(fleet.crews.A),
    getCrewNames(fleet.crews.B),
    getCrewNames(fleet.crews.C),
  ]);

  drawDataTable(writer, "Personnel Line Up", columns, rows);
  return buildPdfDocument(writer.pages);
};

const buildYearPdf = (year, anchorDate, yearMonths) => {
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

  drawText(page, `Pumpdown Year View ${year}`, margin, 26, { size: 18, bold: true });
  drawText(page, `A Shift Off Start: ${anchorDate}`, margin, 50, { size: 9.5, color: "#475569" });
  drawText(page, "Calendar cells show the shift that is OFF. The other two shifts are ON.", page.width - margin, 50, { size: 8.4, color: "#475569", align: "right" });

  SHIFT_OPTIONS.forEach((shift, index) => {
    const tone = shiftTone[shift];
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

        const offShift = getOffShiftForDate(date, anchorDate);
        const tone = shiftTone[offShift] || shiftTone.A;
        const isToday = dateToInput(date) === getTodayDateValue();
        drawText(page, String(date.getDate()), cellX + 2, cellY + 2, { size: 5.5, bold: true, color: "#334155" });
        drawRect(page, cellX + 2, cellY + 9, cellWidth - 4, Math.max(7, cellHeight - 11), {
          fill: tone.background,
          stroke: isToday ? "#2563eb" : tone.border,
          lineWidth: isToday ? 1 : 0.45,
        });
        drawText(page, offShift, cellX + cellWidth / 2, cellY + 10.5, { size: 6.4, bold: true, color: tone.color, align: "center" });
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

export function PumpdownSchedulePage({ isMobile, onBack, onOpenTickets, wsEnergyLogo }) {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(ACCESS_KEY) === "true";
  });
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [schedule, setSchedule] = useState(loadStoredSchedule);
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
          .eq("id", SHARED_SCHEDULE_ID)
          .maybeSingle();

        if (error) throw error;
        if (ignore) return;

        if (data?.schedule && typeof data.schedule === "object" && Object.keys(data.schedule).length) {
          const sharedSchedule = normalizeSchedule(data.schedule);
          lastSharedUpdatedAtRef.current = data.updated_at || "";
          skipNextSharedSaveRef.current = true;
          setSchedule(sharedSchedule);
          saveScheduleToLocalStorage(sharedSchedule);
          setCanSaveSharedSchedule(true);
          setSyncMessage("Shared schedule loaded");
          setSyncMessageType("success");
          return;
        }

        const localSchedule = normalizeSchedule(initialScheduleRef.current);
        setSchedule(localSchedule);
        saveScheduleToLocalStorage(localSchedule);
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
  }, []);

  useEffect(() => {
    const normalized = normalizeSchedule(schedule);
    saveScheduleToLocalStorage(normalized);

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
            id: SHARED_SCHEDULE_ID,
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
  }, [canSaveSharedSchedule, hasLoadedSharedSchedule, schedule]);

  useEffect(() => {
    if (!supabase || !hasLoadedSharedSchedule) return undefined;

    const channel = supabase
      .channel("pumpdown-schedule-state-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: SHARED_SCHEDULE_TABLE,
          filter: `id=eq.${SHARED_SCHEDULE_ID}`,
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

          const remoteSchedule = normalizeSchedule(nextRow.schedule);
          lastSharedUpdatedAtRef.current = remoteUpdatedAt;
          skipNextSharedSaveRef.current = true;
          setSchedule(remoteSchedule);
          saveScheduleToLocalStorage(remoteSchedule);
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
  }, [hasLoadedSharedSchedule]);

  const selectedYear = Number(schedule.selectedYear) || DEFAULT_SELECTED_YEAR;
  const availableYears = useMemo(
    () => Array.from(new Set([...YEAR_OPTIONS, selectedYear])).sort((a, b) => a - b),
    [selectedYear]
  );
  const yearMonths = useMemo(() => getYearDates(selectedYear), [selectedYear]);
  const todayDate = useMemo(() => dateFromInput(getTodayDateValue()), []);
  const selectedReferenceDate = useMemo(
    () => addDays(todayDate, selectedWeekOffset * 7),
    [selectedWeekOffset, todayDate]
  );

  const getRowsForDate = useMemo(() => (date) => {
    const rows = [];
    schedule.fleets.forEach((fleet) => {
      SHIFT_OPTIONS.forEach((shift) => {
        const status = getShiftStatusForDate(date, shift, schedule.anchorDate);
        const crewList = fleet.crews[shift] || [];
        const ptoEntries = getPtoEntriesForDate(schedule.ptoEntries || [], date);
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
          changeDate: getNextChangeDate(shift, date, schedule.anchorDate),
        });
      });
    });
    return rows;
  }, [schedule.anchorDate, schedule.fleets, schedule.ptoEntries]);

  const todayRows = useMemo(() => getRowsForDate(todayDate), [getRowsForDate, todayDate]);
  const selectedReferenceRows = useMemo(
    () => getRowsForDate(selectedReferenceDate),
    [getRowsForDate, selectedReferenceDate]
  );

  const onTodayRows = useMemo(() => todayRows.filter((item) => item.status === "ON"), [todayRows]);
  const offTodayRows = useMemo(() => todayRows.filter((item) => item.status === "OFF"), [todayRows]);
  const selectedOnRows = useMemo(() => selectedReferenceRows.filter((item) => item.status === "ON"), [selectedReferenceRows]);
  const selectedOffRows = useMemo(() => selectedReferenceRows.filter((item) => item.status === "OFF"), [selectedReferenceRows]);
  const sortedRosterPeople = useMemo(
    () => [...schedule.people].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    [schedule.people]
  );
  const duplicateAssignments = useMemo(() => {
    const assignments = new Map();
    schedule.fleets.forEach((fleet) => {
      SHIFT_OPTIONS.forEach((shift) => {
        (fleet.crews[shift] || []).forEach((person) => {
          const cleanPerson = String(person || "").trim();
          if (!cleanPerson) return;
          const key = cleanPerson.toLowerCase();
          const existing = assignments.get(key) || { person: cleanPerson, spots: [] };
          existing.spots.push(`${fleet.label} ${shift} Shift`);
          assignments.set(key, existing);
        });
      });
    });
    return Array.from(assignments.values()).filter((item) => item.spots.length > 1);
  }, [schedule.fleets]);

  const unlockPage = (event) => {
    event.preventDefault();
    if (password !== PUMPDOWN_SCHEDULE_PASSWORD) {
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

  const updateSchedule = (updater) => {
    setSchedule((prev) => normalizeSchedule(typeof updater === "function" ? updater(prev) : updater));
  };

  const updateField = (key, value) => updateSchedule((prev) => ({ ...prev, [key]: value }));

  const confirmRemoval = (message) => {
    if (typeof window === "undefined") return true;
    return window.confirm(message);
  };

  const showAssignmentWarning = (message) => {
    setAssignmentMessage(message);
    window.setTimeout(() => setAssignmentMessage(""), 10000);
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
      showAssignmentWarning(`${value} is already assigned to ${existingAssignment.fleet} ${existingAssignment.shift} Shift.`);
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
      downloadPdf(`pumpdown-on-today-${safeDate}.pdf`, buildTodayPdf(todayDate, onTodayRows, offTodayRows));
      setDownloadMessage("On Today PDF downloaded");
    }
    if (view === "personnel") {
      downloadPdf(`pumpdown-personnel-line-up-${safeDate}.pdf`, buildPersonnelPdf(schedule.fleets));
      setDownloadMessage("Personnel Line Up PDF downloaded");
    }
    if (view === "pto") {
      downloadPdf(`pumpdown-pto-vacation-${safeDate}.pdf`, buildPtoPdf(schedule.ptoEntries || [], schedule.fleets));
      setDownloadMessage("PTO / Vacation PDF downloaded");
    }
    if (view === "year") {
      downloadPdf(`pumpdown-year-view-${selectedYear}.pdf`, buildYearPdf(selectedYear, schedule.anchorDate, yearMonths));
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
      <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ flex: "1 1 220px" }}>
          <label style={label}>Fleet Name</label>
          <input style={compactInput} value={fleet.label} onChange={(event) => updateFleetLabel(fleet.id, event.target.value)} />
        </div>
        {schedule.fleets.length > 1 ? (
          <button type="button" onClick={() => removeFleet(fleet.id)} style={{ ...removeActionButton, borderRadius: 10 }}>
            Remove Fleet
          </button>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
        {SHIFT_OPTIONS.map((shift) => {
          const tone = shiftTone[shift];
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

  const renderTodayList = (title, rowsToRender, emptyText) => (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, background: "#ffffff", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <h3 style={{ margin: 0, color: "#111827", fontSize: 17 }}>{title}</h3>
        <span style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>{rowsToRender.length} crews</span>
      </div>
      <div style={{ display: "grid", gap: 10, padding: 12 }}>
        {rowsToRender.length ? rowsToRender.map((rowItem) => {
          const tone = shiftTone[rowItem.shift];
          return (
            <div key={`${rowItem.fleetId}-${rowItem.shift}-${title}`} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 11, background: "#ffffff" }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "90px 78px minmax(0, 1fr)", gap: 10, alignItems: "center" }}>
                <strong style={{ color: "#111827", fontSize: 14 }}>{rowItem.fleet}</strong>
                <span style={{ border: `1px solid ${tone.border}`, background: tone.background, color: tone.color, borderRadius: 999, padding: "4px 8px", fontSize: 12, fontWeight: 900, textAlign: "center" }}>
                  {rowItem.shift} Shift
                </span>
                <span style={{ color: "#475569", fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>{rowItem.crew}</span>
              </div>
              {rowItem.status === "OFF" ? (
                <div style={{ marginTop: 8, color: "#64748b", fontSize: 12, fontWeight: 800 }}>
                  Returns {formatShortDate(rowItem.changeDate)}
                </div>
              ) : null}
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
                      const status = getShiftStatusForDate(date, shift, schedule.anchorDate);
                      const tone = shiftTone[shift];
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
                            border: `1px solid ${status === "ON" ? tone.border : "#cbd5e1"}`,
                            background: status === "ON" ? tone.background : "#f1f5f9",
                            color: status === "ON" ? tone.color : "#64748b",
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
          </div>
          <form onSubmit={unlockPage} style={{ ...refinedCard, padding: isMobile ? 18 : 24 }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <img
                src={wsEnergyLogo}
                alt="WS Energy Services logo"
                style={{ width: isMobile ? 130 : 180, height: "auto", objectFit: "contain", marginBottom: 10 }}
              />
              <h1 style={{ margin: 0, fontSize: isMobile ? 24 : 32, lineHeight: 1.2, color: "#111827" }}>
                Pumpdown Schedule
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
              Pumpdown 14/7 Schedule
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
          {assignmentMessage ? (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
              <div style={{ ...notificationBase, ...notificationStyles.error }}>{assignmentMessage}</div>
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={refinedCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, color: "#111827" }}>On Today / Upcoming Weeks</h2>
                <div style={{ marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                  Quick reference for {formatFullDate(selectedReferenceDate)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => downloadSchedulePdf("today")} style={pdfButton}>
                  Download Today PDF
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {Array.from({ length: 6 }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedWeekOffset(index)}
                  style={{
                    ...pageButton,
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: selectedWeekOffset === index ? "#dbeafe" : "#ffffff",
                    border: selectedWeekOffset === index ? "2px solid #2563eb" : "1px solid #cbd5e1",
                    color: "#111827",
                    WebkitTextFillColor: "#111827",
                  }}
                >
                  {index === 0 ? "Today" : `+${index} Week${index > 1 ? "s" : ""}`}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", alignItems: "start" }}>
              {renderTodayList("On", selectedOnRows, "No crews are marked on.")}
              {renderTodayList("Off", selectedOffRows, "No crews are marked off.")}
            </div>
          </div>

          <div style={refinedCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, color: "#111827" }}>Personnel Line Up</h2>
                <div style={{ marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 700 }}>Edit fleets, shifts, roster names, and crew slots here.</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => downloadSchedulePdf("personnel")} style={pdfButton}>
                  Download Line Up PDF
                </button>
                <button type="button" onClick={addFleet} style={{ ...addActionButton, borderRadius: 10 }}>
                  Add Fleet
                </button>
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
                {sortedRosterPeople.map((person) => (
                  <div key={person} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #e2e8f0", borderRadius: 999, padding: "6px 8px 6px 10px", background: "#ffffff" }}>
                    <span style={{ color: "#111827", fontWeight: 700, fontSize: 13 }}>{person}</span>
                    <button type="button" onClick={() => removePersonFromRoster(person)} style={{ ...rosterButton, padding: "4px 7px", borderRadius: 999 }}>
                      Remove
                    </button>
                  </div>
                ))}
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
                {(schedule.ptoEntries || []).length ? (schedule.ptoEntries || []).map((entry) => (
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
                      <input style={compactInput} type="date" value={entry.startDate} onChange={(event) => updatePtoEntry(entry.id, "startDate", event.target.value)} />
                    </div>
                    <div>
                      <label style={label}>End</label>
                      <input style={compactInput} type="date" value={entry.endDate} onChange={(event) => updatePtoEntry(entry.id, "endDate", event.target.value)} />
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

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 260px", alignItems: "end", marginBottom: 14 }}>
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
              <div>
                <label style={label}>A Shift Off Start</label>
                <input style={input} type="date" value={schedule.anchorDate} onChange={(event) => updateField("anchorDate", event.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
              {SHIFT_OPTIONS.map((shift) => {
                const tone = shiftTone[shift];
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
