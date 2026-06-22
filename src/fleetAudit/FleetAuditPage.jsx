import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addActionButton,
  card,
  input,
  label,
  notificationBase,
  notificationStyles,
  removeActionButton,
  selectInput,
  supabase,
} from "../fleetReport/config";

const AUDIT_PASSWORD = "1775";
const ACCESS_KEY = "fleetAuditUnlocked";
const STORAGE_KEY = "fleetAuditDraft";
const AUTOSAVE_STORAGE_KEY = "fleetAuditAutosave";
const AUDITS_TABLE = "fleet_audits";
const PHOTO_MAX_SIZE = 1280;
const PHOTO_QUALITY = 0.78;
const AUTOSAVE_INTERVAL_MS = 15000;
const DOCX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOCX_PAGE_WIDTH = 12240;
const DOCX_PAGE_HEIGHT = 15840;
const DOCX_MARGIN = 648;
const DOCX_CONTENT_WIDTH = DOCX_PAGE_WIDTH - DOCX_MARGIN * 2;
const EMUS_PER_INCH = 914400;

const sectionItems = (...groups) =>
  groups.flatMap(([group, items]) => items.map((text) => ({ group, text })));

const truckAndTractorItems = sectionItems(
  ["Equipment", [
    "PMs up to date in T3",
    "PM intervals correct in T3",
    "PM Window sticker present and accurate",
    "Equipment clean and organized",
    "Toolbox clean and organized",
    "Toolbox free of unnecessary items",
    "Inventory accounted for (DOT triangles, first aid kit, fuel card)",
    "Sticker kit consistent",
  ]],
  ["Compliance", [
    "Fire extinguisher inspected",
    "QR codes/documentation correct",
  ]],
  ["Reliability", [
    "Mechanical issues documented",
    "Spare critical components available",
  ]],
  ["Customer Readiness", [
    "No leaks/damage",
  ]]
);

const pumpItems = sectionItems(
  ["Equipment", [
    "PMs up to date in T3",
    "PM intervals correct in T3",
    "Equipment clean and organized",
    "Hose fittings standardized",
    "Sticker kit consistent",
  ]],
  ["Compliance", [
    "Pump iron certification in date",
    "QR codes/documentation correct",
  ]],
  ["Reliability", [
    "Pump within normal parameters and pump parameter kickouts set",
    "Mechanical issues documented",
    "Spare critical components available",
    "Downtime causes tracked",
    "Repeat failures addressed",
  ]],
  ["Customer Readiness", [
    "Meets customer requirements",
    "Equipment clean and professional",
    "No leaks/damage",
  ]]
);

const baseAuditSections = [
  {
    id: "safety",
    title: "Safety",
    accent: "#dc2626",
    items: [
      "Proficiency tests created and implemented",
      "All personnel have proper PPE",
      "HSI classes up to date for all personnel",
      "JSAs completed and followed",
      "Safety meetings being conducted",
    ],
  },
  {
    id: "personnel",
    title: "Personnel",
    accent: "#2563eb",
    items: [
      "Assigned and dedicated crew coverage",
      "All personnel proficient on current job task",
      "New hires onboarded properly",
      "Lead operator assigned",
      "Crew understands customer expectations",
    ],
  },
];

const equipmentTemplates = {
  trucks: {
    key: "trucks",
    idPrefix: "truck",
    singular: "Truck",
    unitLabel: "Truck Unit #",
    items: truckAndTractorItems,
    accents: ["#0f766e", "#7c3aed", "#0891b2", "#b45309"],
    legacyIds: ["truck-1", "truck-2"],
  },
  tractors: {
    key: "tractors",
    idPrefix: "tractor",
    singular: "Tractor",
    unitLabel: "Tractor Unit #",
    items: truckAndTractorItems,
    accents: ["#b45309", "#0891b2", "#7c3aed", "#0f766e"],
    legacyIds: ["tractor-1", "tractor-2"],
  },
  pumps: {
    key: "pumps",
    idPrefix: "pump",
    singular: "Pump",
    unitLabel: "Pump Unit #",
    items: pumpItems,
    accents: ["#4f46e5", "#16a34a", "#ea580c", "#2563eb"],
    legacyIds: ["pump-1", "pump-2"],
  },
};

const fixedEquipmentSections = [
  {
    id: "command-center",
    title: "Command Center",
    accent: "#ea580c",
    unitLabel: "Command Center Unit #",
    items: sectionItems(
      ["Equipment", [
        "Starlink operational",
        "Screens operational",
        "Storage organized",
        "Laptops operational",
        "AnyDesk installed and functioning",
        "Equipment clean and organized",
        "Inventory accounted for and all stickers present",
        "Radios accounted for and stickered",
        "Laptops accounted for and stickered",
        "Transducers accounted for",
        "Cables accounted for",
        "Run boxes accounted for and stickered",
      ]],
      ["Data Integrity", [
        "T3 data accurate",
        "Job data captured correctly",
        "Data syncing properly",
      ]],
      ["Standardization", [
        "Command center standardized",
        "Labeling consistent",
      ]]
    ),
  },
  {
    id: "iron-trailer",
    title: "Iron Trailer",
    accent: "#be123c",
    unitLabel: "Iron Trailer Unit #",
    items: sectionItems(
      ["Equipment", [
        "Iron organized and secured",
        "Iron loadout adequate for job task",
        "Equipment clean and organized",
      ]],
      ["Compliance", [
        "All iron certifications in date",
        "QR codes/documentation correct",
      ]],
      ["Processes", [
        "Iron redress process followed",
        "Bad iron exchange process followed",
      ]],
      ["Customer Readiness", [
        "No damage",
      ]]
    ),
  },
];

const trailingAuditSections = [
  {
    id: "operations-processes",
    title: "Operations / Processes",
    accent: "#0d9488",
    items: [
      "Load-out prep process followed",
      "Turnaround processes followed",
      "Test pit process followed",
      "Inventory (filters/parts) stocked",
      "Timesheets accurate",
      "Tickets match job execution",
      "Teams chat properly named",
      "Proper personnel in Teams chat",
      "JSA filled out and sent in Teams chat daily",
      "Daily reports submitted and information correctly input",
    ],
  },
  {
    id: "accountability",
    title: "Accountability",
    accent: "#334155",
    items: [
      "Deficiencies assigned",
      "Deadlines established",
      "Follow-up process in place",
    ],
  },
];

const getAuditItemText = (item) => (typeof item === "string" ? item : item.text);
const getAuditItemGroup = (item) => (typeof item === "string" ? "" : item.group || "");
const getAuditItemLabel = (item) => {
  const group = getAuditItemGroup(item);
  const text = getAuditItemText(item);
  return group ? `${group} - ${text}` : text;
};
const getAuditItemKey = (item, index) => `${getAuditItemLabel(item)}-${index}`;

const statusOptions = [
  { value: "Pass", label: "Pass", color: "#166534", background: "#dcfce7", border: "#86efac" },
  { value: "Needs Attention", label: "Attention", color: "#991b1b", background: "#fee2e2", border: "#fca5a5" },
  { value: "N/A", label: "N/A", color: "#475569", background: "#f1f5f9", border: "#cbd5e1" },
];

const emptyItem = () => ({ status: "", notes: "", owner: "", dueDate: "" });
const normalizeText = (value) => String(value ?? "");
const getAuditSectionActionLabel = (section) => {
  const unitNumber = normalizeText(section?.unitNumber).trim();
  return unitNumber ? `${section.title} - ${unitNumber}` : section.title;
};

const makeEquipmentSectionId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createInitialEquipment = () => ({
  trucks: [{ id: "truck-1", unitNumber: "" }],
  tractors: [{ id: "tractor-1", unitNumber: "" }],
  pumps: [{ id: "pump-1", unitNumber: "" }],
});

const sectionHasData = (section) => {
  if (!section || typeof section !== "object") return false;
  if (normalizeText(section.unitNumber).trim()) return true;
  if (Array.isArray(section.photos) && section.photos.length) return true;
  return Array.isArray(section.items) && section.items.some((item) =>
    item?.status || item?.notes || item?.owner || item?.dueDate
  );
};

const normalizeEquipmentList = (storedList, template, storedSections = {}) => {
  const normalizedStoredList = Array.isArray(storedList)
    ? storedList
        .filter((unit) => unit && typeof unit === "object")
        .map((unit, index) => ({
          id: normalizeText(unit.id) || `${template.idPrefix}-${index + 1}`,
          unitNumber: normalizeText(unit.unitNumber),
        }))
    : [];

  if (normalizedStoredList.length) return normalizedStoredList;

  const legacyUnits = template.legacyIds
    .filter((legacyId, index) => index === 0 || sectionHasData(storedSections[legacyId]))
    .map((legacyId) => ({
      id: legacyId,
      unitNumber: normalizeText(storedSections[legacyId]?.unitNumber),
    }));

  return legacyUnits.length ? legacyUnits : [{ id: `${template.idPrefix}-1`, unitNumber: "" }];
};

const normalizeEquipment = (storedEquipment = {}, storedSections = {}) => ({
  trucks: normalizeEquipmentList(storedEquipment.trucks, equipmentTemplates.trucks, storedSections),
  tractors: normalizeEquipmentList(storedEquipment.tractors, equipmentTemplates.tractors, storedSections),
  pumps: normalizeEquipmentList(storedEquipment.pumps, equipmentTemplates.pumps, storedSections),
});

const buildEquipmentSections = (equipment) =>
  Object.values(equipmentTemplates).flatMap((template) =>
    (equipment[template.key] || []).map((unit, index) => ({
      id: unit.id,
      title: `${template.singular} ${index + 1}`,
      accent: template.accents[index % template.accents.length],
      items: template.items,
      equipmentKey: template.key,
      equipmentIndex: index,
      unitLabel: template.unitLabel,
      unitNumber: unit.unitNumber,
    }))
  );

const getAuditSections = (audit) => {
  const equipment = normalizeEquipment(audit?.equipment, audit?.sections);

  return [
    ...baseAuditSections,
    ...buildEquipmentSections(equipment),
    ...fixedEquipmentSections.map((section) => ({
      ...section,
      unitNumber: normalizeText(audit?.sections?.[section.id]?.unitNumber),
    })),
    ...trailingAuditSections,
  ];
};

const getStoredAuditItem = (section, storedItems, index) => {
  if (!Array.isArray(storedItems)) return {};

  const hasLegacyRemovedItem = storedItems.length > section.items.length;
  if (hasLegacyRemovedItem && section.id === "safety") {
    return storedItems[index + 1] || {};
  }

  if (hasLegacyRemovedItem && section.equipmentKey === "pumps") {
    return storedItems[index < 6 ? index : index + 1] || {};
  }

  return storedItems[index] || {};
};

const normalizeSectionState = (section, storedSection = {}) => ({
  unitNumber: normalizeText(storedSection.unitNumber),
  items: section.items.map((_, index) => {
    const storedItem = getStoredAuditItem(section, storedSection.items, index);
    return {
      ...emptyItem(),
      ...(storedItem || {}),
      status: normalizeText(storedItem?.status),
      notes: normalizeText(storedItem?.notes),
      owner: normalizeText(storedItem?.owner),
      dueDate: normalizeText(storedItem?.dueDate),
    };
  }),
  photos: Array.isArray(storedSection.photos)
    ? storedSection.photos
        .filter((photo) => photo?.src)
        .map((photo, index) => ({
          id: normalizeText(photo.id) || `${section.id}-photo-${index}`,
          name: normalizeText(photo.name) || `Photo ${index + 1}`,
          src: normalizeText(photo.src),
        }))
    : [],
});

const buildSectionState = (sections, storedSections = {}) =>
  sections.reduce((acc, section) => {
    acc[section.id] = normalizeSectionState(section, storedSections[section.id] || {});
    return acc;
  }, {});

const getSectionState = (section, storedSections = {}) =>
  normalizeSectionState(section, storedSections[section.id] || {});

const getTodayDateValue = () => {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const makeInitialAudit = () => {
  const equipment = createInitialEquipment();
  const sections = getAuditSections({ equipment, sections: {} });

  return {
    date: getTodayDateValue(),
    fleet: "1",
    customer: "",
    auditor: "",
    dayShiftOperator: "",
    nightShiftOperator: "",
    equipment,
    sections: buildSectionState(sections),
  };
};

const normalizeAudit = (stored) => {
  const initial = makeInitialAudit();
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return initial;
  const equipment = normalizeEquipment(stored.equipment, stored.sections);
  const sections = getAuditSections({ equipment, sections: stored.sections || {} });

  return {
    date: normalizeText(stored.date) || initial.date,
    fleet: normalizeText(stored.fleet) || initial.fleet,
    customer: normalizeText(stored.customer),
    auditor: normalizeText(stored.auditor),
    dayShiftOperator: normalizeText(stored.dayShiftOperator),
    nightShiftOperator: normalizeText(stored.nightShiftOperator),
    equipment,
    sections: buildSectionState(sections, stored.sections || {}),
  };
};

const makeStoredAuditPayload = (draft) =>
  JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    audit: draft,
  });

let warnedAuditPhotoStorageFallback = false;

const isStorageQuotaError = (error) =>
  error?.name === "QuotaExceededError" ||
  error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
  error?.code === 22 ||
  error?.code === 1014;

const makeTextOnlyAuditDraft = (draft) => ({
  ...draft,
  sections: Object.fromEntries(
    Object.entries(draft?.sections || {}).map(([sectionId, section]) => [
      sectionId,
      {
        ...section,
        photos: [],
      },
    ])
  ),
});

const persistStoredAudit = (storageKey, draft, errorLabel) => {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(storageKey, makeStoredAuditPayload(draft));
    return true;
  } catch (error) {
    if (!isStorageQuotaError(error)) {
      console.error(errorLabel, error);
      return false;
    }
  }

  try {
    window.localStorage.setItem(storageKey, makeStoredAuditPayload(makeTextOnlyAuditDraft(draft)));
    if (!warnedAuditPhotoStorageFallback) {
      warnedAuditPhotoStorageFallback = true;
      console.warn("Fleet audit draft was too large for local storage, so a text-only backup was saved.");
    }
    return true;
  } catch (fallbackError) {
    console.error(errorLabel, fallbackError);
    return false;
  }
};

const parseStoredAuditPayload = (stored) => {
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    if (parsed?.audit && typeof parsed === "object" && !Array.isArray(parsed)) {
      const savedAt = Date.parse(parsed.savedAt || "");
      return {
        audit: parsed.audit,
        savedAt: Number.isFinite(savedAt) ? savedAt : 0,
      };
    }

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { audit: parsed, savedAt: 0 };
    }
  } catch (error) {
    console.error("Unable to load fleet audit draft", error);
  }

  return null;
};

const loadStoredAudit = () => {
  if (typeof window === "undefined") return makeInitialAudit();

  const candidates = [STORAGE_KEY, AUTOSAVE_STORAGE_KEY]
    .map((key) => parseStoredAuditPayload(window.localStorage.getItem(key)))
    .filter(Boolean)
    .sort((a, b) => b.savedAt - a.savedAt);

  return candidates[0]?.audit ? normalizeAudit(candidates[0].audit) : makeInitialAudit();
};

const persistAuditDraft = (draft) => {
  return persistStoredAudit(STORAGE_KEY, draft, "Unable to save fleet audit draft");
};

const persistAuditAutosave = (draft) => {
  return persistStoredAudit(AUTOSAVE_STORAGE_KEY, draft, "Unable to autosave fleet audit");
};

const normalizeSavedAuditRow = (row) => {
  const audit = normalizeAudit(row?.audit_data);
  return {
    id: row.id,
    audit,
    date: row.audit_date || audit.date || "",
    fleet: String(row.fleet ?? audit.fleet ?? ""),
    customer: row.customer ?? audit.customer ?? "",
    auditor: row.auditor ?? audit.auditor ?? "",
    createdAt: row.created_at || "",
  };
};

const makePhotoId = () => `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const resizeImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const originalSrc = String(reader.result || "");
      const image = new Image();

      image.onerror = () => {
        resolve({
          id: makePhotoId(),
          name: file.name || "Supporting photo",
          src: originalSrc,
        });
      };

      image.onload = () => {
        const scale = Math.min(1, PHOTO_MAX_SIZE / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");

        if (!context) {
          resolve({
            id: makePhotoId(),
            name: file.name || "Supporting photo",
            src: originalSrc,
          });
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve({
          id: makePhotoId(),
          name: file.name || "Supporting photo",
          src: canvas.toDataURL("image/jpeg", PHOTO_QUALITY),
        });
      };

      image.src = originalSrc;
    };

    reader.readAsDataURL(file);
  });

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value) => {
  if (!value) return "";
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getSectionStats = (items) => {
  const answered = items.filter((item) => item.status).length;
  const needsAttention = items.filter((item) => item.status === "Needs Attention").length;
  const pass = items.filter((item) => item.status === "Pass").length;
  const notApplicable = items.filter((item) => item.status === "N/A").length;
  const total = items.length;
  const open = total - answered;
  const applicable = total - notApplicable;
  const score = applicable ? Math.round((pass / applicable) * 100) : 100;
  return { answered, needsAttention, pass, notApplicable, open, applicable, score, total };
};

const getScoreTone = (score) => {
  if (score >= 90) return { label: "Ready", color: "#166534", background: "#dcfce7", border: "#86efac" };
  if (score >= 75) return { label: "Needs Follow-up", color: "#854d0e", background: "#fef9c3", border: "#fde047" };
  return { label: "Not Ready", color: "#991b1b", background: "#fee2e2", border: "#fca5a5" };
};

const getAuditScore = (sectionStats) => {
  const totals = Object.values(sectionStats).reduce(
    (acc, stats) => ({
      total: acc.total + stats.total,
      answered: acc.answered + stats.answered,
      pass: acc.pass + stats.pass,
      needsAttention: acc.needsAttention + stats.needsAttention,
      notApplicable: acc.notApplicable + stats.notApplicable,
      open: acc.open + stats.open,
      applicable: acc.applicable + stats.applicable,
    }),
    { total: 0, answered: 0, pass: 0, needsAttention: 0, notApplicable: 0, open: 0, applicable: 0 }
  );
  const score = totals.applicable ? Math.round((totals.pass / totals.applicable) * 100) : 100;
  const completion = totals.total ? Math.round((totals.answered / totals.total) * 100) : 0;

  return {
    ...totals,
    score,
    completion,
    tone: getScoreTone(score),
  };
};

const getStatusTone = (status) =>
  statusOptions.find((option) => option.value === status) || {
    color: "#475569",
    background: "#f8fafc",
    border: "#cbd5e1",
  };

const getAuditDocumentData = (audit) => {
  const auditSections = getAuditSections(audit);
  const auditDateLabel = formatDate(audit.date) || "No date";
  const metaRows = [
    ["Audit Date", auditDateLabel],
    ["Fleet", audit.fleet === "yard" ? "Yard / Shop" : `Fleet ${audit.fleet}`],
    ["Customer", audit.customer],
    ["Auditor", audit.auditor],
    ["Day Shift Operator", audit.dayShiftOperator],
    ["Night Shift Operator", audit.nightShiftOperator],
  ];

  const actionRows = auditSections.flatMap((section) =>
    (audit.sections[section.id]?.items || [])
      .map((item, index) => ({ item, index, section }))
      .filter(({ item }) => item.status === "Needs Attention")
  ).sort((first, second) => {
    const firstOwner = normalizeText(first.item.owner).trim();
    const secondOwner = normalizeText(second.item.owner).trim();

    if (!firstOwner && secondOwner) return 1;
    if (firstOwner && !secondOwner) return -1;

    const ownerCompare = firstOwner.localeCompare(secondOwner, undefined, { sensitivity: "base" });
    if (ownerCompare) return ownerCompare;

    const sectionCompare = getAuditSectionActionLabel(first.section).localeCompare(getAuditSectionActionLabel(second.section), undefined, { sensitivity: "base" });
    if (sectionCompare) return sectionCompare;

    return getAuditItemLabel(first.section.items[first.index]).localeCompare(getAuditItemLabel(second.section.items[second.index]), undefined, { sensitivity: "base" });
  });

  return { auditSections, auditDateLabel, metaRows, actionRows };
};

const docxText = (value) => escapeHtml(value);
const docxColor = (value) => String(value || "").replace("#", "").toUpperCase() || "111827";

const docxRunProperties = ({ bold = false, size = 18, color = "111827" } = {}) => {
  const props = [
    bold ? "<w:b/>" : "",
    color ? `<w:color w:val="${docxColor(color)}"/>` : "",
    size ? `<w:sz w:val="${size}"/>` : "",
  ].filter(Boolean).join("");
  return props ? `<w:rPr>${props}</w:rPr>` : "";
};

const docxParagraph = (text, options = {}) => {
  const {
    bold = false,
    size = 18,
    color = "111827",
    keepNext = false,
    align = "",
    spacingAfter = 80,
  } = options;
  const paragraphProps = [
    keepNext ? "<w:keepNext/>" : "",
    align ? `<w:jc w:val="${align}"/>` : "",
    spacingAfter !== null ? `<w:spacing w:after="${spacingAfter}"/>` : "",
  ].filter(Boolean).join("");
  const lines = String(text ?? "").split(/\r?\n/);
  const textXml = lines.map((line, index) =>
    `${index ? "<w:br/>" : ""}<w:t xml:space="preserve">${docxText(line)}</w:t>`
  ).join("");

  return `<w:p>${paragraphProps ? `<w:pPr>${paragraphProps}</w:pPr>` : ""}<w:r>${docxRunProperties({ bold, size, color })}${textXml}</w:r></w:p>`;
};

const docxCell = (content, width, options = {}) => {
  const { fill = "", vAlign = "top" } = options;
  const body = Array.isArray(content) ? content.join("") : content;
  const properties = [
    `<w:tcW w:w="${width}" w:type="dxa"/>`,
    vAlign ? `<w:vAlign w:val="${vAlign}"/>` : "",
    fill ? `<w:shd w:fill="${docxColor(fill)}"/>` : "",
    `<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>`,
  ].filter(Boolean).join("");

  return `<w:tc><w:tcPr>${properties}</w:tcPr>${body || docxParagraph("")}</w:tc>`;
};

const docxTable = (rows, widths, options = {}) => {
  const { border = "single" } = options;
  const borderXml = border === "none"
    ? ""
    : `<w:tblBorders><w:top w:val="single" w:sz="4" w:color="CBD5E1"/><w:left w:val="single" w:sz="4" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:color="CBD5E1"/><w:insideH w:val="single" w:sz="4" w:color="CBD5E1"/><w:insideV w:val="single" w:sz="4" w:color="CBD5E1"/></w:tblBorders>`;
  const grid = widths.map((width) => `<w:gridCol w:w="${width}"/>`).join("");
  const body = rows.map((row) => {
    const rowProps = [
      row.header ? "<w:tblHeader/>" : "",
      "<w:cantSplit/>",
    ].filter(Boolean).join("");
    const cells = row.cells.map((cell, index) => docxCell(cell.content, widths[index], cell)).join("");
    return `<w:tr><w:trPr>${rowProps}</w:trPr>${cells}</w:tr>`;
  }).join("");

  return `<w:tbl><w:tblPr><w:tblW w:w="${DOCX_CONTENT_WIDTH}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${borderXml}</w:tblPr><w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>`;
};

const docxStatusFill = (status) => getStatusTone(status).background;

const docxActionText = (item) =>
  [
    item.notes || "",
    item.owner ? `Owner: ${item.owner}` : "",
    item.dueDate ? `Due: ${formatDate(item.dueDate)}` : "",
  ].filter(Boolean).join("\n");

const docxDataUrlToBytes = (src) => {
  const match = String(src || "").match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const extension = mime === "image/png" ? "png" : mime === "image/jpeg" || mime === "image/jpg" ? "jpg" : "";
  if (!extension) return null;

  const binary = window.atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return { bytes, extension, mime };
};

const getDocxImageExtension = (mime) => {
  const normalizedMime = String(mime || "").toLowerCase();
  if (normalizedMime.includes("png")) return "png";
  if (normalizedMime.includes("jpeg") || normalizedMime.includes("jpg")) return "jpg";
  return "";
};

const docxImageToBytes = async (src) => {
  const dataUrlBytes = docxDataUrlToBytes(src);
  if (dataUrlBytes) return dataUrlBytes;

  const response = await fetch(src);
  if (!response.ok) return null;

  const mime = response.headers.get("content-type") || "";
  const extension = getDocxImageExtension(mime || src);
  if (!extension) return null;

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    extension,
    mime,
  };
};

const docxImageDimensions = (src) =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({
      width: image.naturalWidth || image.width || 800,
      height: image.naturalHeight || image.height || 600,
    });
    image.onerror = () => resolve({ width: 800, height: 600 });
    image.src = src;
  });

const docxImageSize = (width, height) => {
  const maxWidth = Math.round(3.45 * EMUS_PER_INCH);
  const maxHeight = Math.round(2.75 * EMUS_PER_INCH);
  const originalWidth = Math.max(1, width) * 9525;
  const originalHeight = Math.max(1, height) * 9525;
  const scale = Math.min(maxWidth / originalWidth, maxHeight / originalHeight, 1);
  return {
    cx: Math.max(1, Math.round(originalWidth * scale)),
    cy: Math.max(1, Math.round(originalHeight * scale)),
  };
};

const docxLogoImageSize = (width, height) => {
  const maxWidth = Math.round(1.85 * EMUS_PER_INCH);
  const maxHeight = Math.round(0.75 * EMUS_PER_INCH);
  const originalWidth = Math.max(1, width) * 9525;
  const originalHeight = Math.max(1, height) * 9525;
  const scale = Math.min(maxWidth / originalWidth, maxHeight / originalHeight, 1);
  return {
    cx: Math.max(1, Math.round(originalWidth * scale)),
    cy: Math.max(1, Math.round(originalHeight * scale)),
  };
};

const docxDrawing = ({ relationshipId, name, cx, cy, id, align = "", spacingAfter = 40 }) => `
  <w:p>
    <w:pPr>${align ? `<w:jc w:val="${align}"/>` : ""}<w:spacing w:after="${spacingAfter}"/></w:pPr>
    <w:r>
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="${cx}" cy="${cy}"/>
          <wp:effectExtent l="0" t="0" r="0" b="0"/>
          <wp:docPr id="${id}" name="${docxText(name)}"/>
          <wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>
          <a:graphic>
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic>
                <pic:nvPicPr><pic:cNvPr id="${id}" name="${docxText(name)}"/><pic:cNvPicPr/></pic:nvPicPr>
                <pic:blipFill><a:blip r:embed="${relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
                <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  </w:p>
`;

const docxCrcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

const docxCrc32 = (bytes) => {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = docxCrcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const docxUint16 = (value) => {
  const bytes = new Uint8Array(2);
  bytes[0] = value & 0xff;
  bytes[1] = (value >>> 8) & 0xff;
  return bytes;
};

const docxUint32 = (value) => {
  const bytes = new Uint8Array(4);
  bytes[0] = value & 0xff;
  bytes[1] = (value >>> 8) & 0xff;
  bytes[2] = (value >>> 16) & 0xff;
  bytes[3] = (value >>> 24) & 0xff;
  return bytes;
};

const docxConcatBytes = (parts) => {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
};

const docxStringBytes = (value) => new TextEncoder().encode(value);

const docxZipBlob = (files) => {
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = docxStringBytes(file.path);
    const dataBytes = typeof file.data === "string" ? docxStringBytes(file.data) : file.data;
    const crc = docxCrc32(dataBytes);
    const localHeader = docxConcatBytes([
      docxUint32(0x04034b50),
      docxUint16(20),
      docxUint16(0),
      docxUint16(0),
      docxUint16(dosTime),
      docxUint16(dosDate),
      docxUint32(crc),
      docxUint32(dataBytes.length),
      docxUint32(dataBytes.length),
      docxUint16(nameBytes.length),
      docxUint16(0),
      nameBytes,
    ]);
    const centralHeader = docxConcatBytes([
      docxUint32(0x02014b50),
      docxUint16(20),
      docxUint16(20),
      docxUint16(0),
      docxUint16(0),
      docxUint16(dosTime),
      docxUint16(dosDate),
      docxUint32(crc),
      docxUint32(dataBytes.length),
      docxUint32(dataBytes.length),
      docxUint16(nameBytes.length),
      docxUint16(0),
      docxUint16(0),
      docxUint16(0),
      docxUint16(0),
      docxUint32(0),
      docxUint32(offset),
      nameBytes,
    ]);

    localParts.push(localHeader, dataBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  });

  const centralOffset = offset;
  const centralDirectory = docxConcatBytes(centralParts);
  const endRecord = docxConcatBytes([
    docxUint32(0x06054b50),
    docxUint16(0),
    docxUint16(0),
    docxUint16(files.length),
    docxUint16(files.length),
    docxUint32(centralDirectory.length),
    docxUint32(centralOffset),
    docxUint16(0),
  ]);

  return new Blob([docxConcatBytes([...localParts, centralDirectory, endRecord])], { type: DOCX_CONTENT_TYPE });
};

const getAuditDocxFileName = (audit) => {
  const date = audit.date || "no-date";
  const fleet = audit.fleet === "yard" ? "yard" : `fleet-${audit.fleet || "unknown"}`;
  return `pumpdown-readiness-audit-${fleet}-${date}.docx`.replace(/[^a-z0-9._-]+/gi, "-");
};

const buildAuditDocxBlob = async (audit, logoSrc = "") => {
  const { auditSections, auditDateLabel, metaRows, actionRows } = getAuditDocumentData(audit);
  const auditScore = getAuditScore(
    auditSections.reduce((acc, section) => {
      acc[section.id] = getSectionStats(getSectionState(section, audit.sections).items);
      return acc;
    }, {})
  );
  const mediaFiles = [];
  const imageRelationships = [];
  let imageIndex = 1;

  const addImage = async (src, name, getSize = docxImageSize) => {
    const data = await docxImageToBytes(src);
    if (!data) return null;
    const dimensions = await docxImageDimensions(src);
    const size = getSize(dimensions.width, dimensions.height);
    const relationshipId = `rId${imageIndex}`;
    mediaFiles.push({
      path: `word/media/image${imageIndex}.${data.extension}`,
      data: data.bytes,
    });
    imageRelationships.push({
      id: relationshipId,
      target: `media/image${imageIndex}.${data.extension}`,
    });
    imageIndex += 1;
    return { relationshipId, name: name || `Image ${imageIndex}`, ...size, id: imageIndex + 1000 };
  };

  const logoImage = logoSrc ? await addImage(logoSrc, "WS Energy Services logo", docxLogoImageSize) : null;
  const documentParts = [
    docxTable(
      [
        {
          cells: [
            {
              content: [
                docxParagraph("PUMPDOWN FLEET READINESS AUDIT", { bold: true, size: 30, spacingAfter: 60 }),
                docxParagraph(`Audit Date ${auditDateLabel}`, { size: 18, spacingAfter: 20 }),
              ],
            },
            {
              content: logoImage ? docxDrawing({ ...logoImage, align: "right", spacingAfter: 0 }) : docxParagraph(""),
            },
          ],
        },
      ],
      [7600, 3344],
      { border: "none" }
    ),
    docxTable(
      [
        {
          cells: metaRows.slice(0, 3).map(([key, value]) => ({
            content: [
              docxParagraph(key, { bold: true, size: 14, color: "475569", spacingAfter: 20 }),
              docxParagraph(value || "", { size: 18, spacingAfter: 20 }),
            ],
            fill: "F8FAFC",
          })),
        },
        {
          cells: metaRows.slice(3, 6).map(([key, value]) => ({
            content: [
              docxParagraph(key, { bold: true, size: 14, color: "475569", spacingAfter: 20 }),
              docxParagraph(value || "", { size: 18, spacingAfter: 20 }),
            ],
            fill: "F8FAFC",
          })),
        },
      ],
      [3648, 3648, 3648]
    ),
    docxParagraph("Automatic Readiness Score", { bold: true, size: 22, keepNext: true, spacingAfter: 60 }),
    docxTable(
      [
        {
          cells: [
            {
              content: [
                docxParagraph(`${auditScore.score}%`, { bold: true, size: 28, color: auditScore.tone.color, spacingAfter: 20 }),
                docxParagraph(auditScore.tone.label, { bold: true, size: 16, color: auditScore.tone.color, spacingAfter: 20 }),
              ],
              fill: auditScore.tone.background,
            },
            {
              content: docxParagraph(`${auditScore.pass} pass / ${auditScore.applicable} applicable`, { size: 16, spacingAfter: 20 }),
              fill: "F8FAFC",
            },
            {
              content: docxParagraph(`${auditScore.needsAttention} attention / ${auditScore.open} open`, { size: 16, spacingAfter: 20 }),
              fill: "F8FAFC",
            },
            {
              content: docxParagraph(`${auditScore.completion}% complete`, { size: 16, spacingAfter: 20 }),
              fill: "F8FAFC",
            },
          ],
        },
      ],
      [2736, 2736, 2736, 2736]
    ),
  ];

  const addPhoto = async (photo) => {
    return addImage(photo.src, photo.name || `Photo ${imageIndex}`, docxImageSize);
  };

  if (actionRows.length) {
    documentParts.push(docxParagraph("Deficiency Action List", { bold: true, size: 24, keepNext: true, spacingAfter: 80 }));
    documentParts.push(docxTable(
      [
        {
          header: true,
          cells: ["Section", "Item", "Owner", "Due", "Notes"].map((heading) => ({
            content: docxParagraph(heading, { bold: true, size: 14, color: "334155", spacingAfter: 20 }),
            fill: "F1F5F9",
          })),
        },
        ...actionRows.map(({ section, item, index }) => ({
          cells: [
            { content: docxParagraph(getAuditSectionActionLabel(section), { size: 16, spacingAfter: 20 }) },
            { content: docxParagraph(getAuditItemLabel(section.items[index]), { size: 16, spacingAfter: 20 }) },
            { content: docxParagraph(item.owner || "", { size: 16, spacingAfter: 20 }) },
            { content: docxParagraph(formatDate(item.dueDate), { size: 16, spacingAfter: 20 }) },
            { content: docxParagraph(item.notes || "", { size: 16, spacingAfter: 20 }) },
          ],
        })),
      ],
      [1800, 3000, 1800, 1600, 2744]
    ));
  }

  for (const section of auditSections) {
    const sectionState = getSectionState(section, audit.sections);
    documentParts.push(docxParagraph(section.title, { bold: true, size: 24, color: section.accent, keepNext: true, spacingAfter: 80 }));
    if (section.unitLabel) {
      documentParts.push(docxParagraph(`${section.unitLabel}: ${section.unitNumber || ""}`, { bold: true, size: 16, color: "475569", keepNext: true, spacingAfter: 80 }));
    }

    documentParts.push(docxTable(
      [
        {
          header: true,
          cells: ["Audit Item", "Status", "Notes / Action"].map((heading) => ({
            content: docxParagraph(heading, { bold: true, size: 14, color: "334155", spacingAfter: 20 }),
            fill: "F1F5F9",
          })),
        },
        ...section.items.map((auditItem, index) => {
          const item = sectionState.items[index] || emptyItem();
          const group = getAuditItemGroup(auditItem);
          return {
            cells: [
              {
                content: [
                  group ? docxParagraph(group, { bold: true, size: 14, color: "475569", spacingAfter: 20 }) : "",
                  docxParagraph(getAuditItemText(auditItem), { size: 16, spacingAfter: 20 }),
                ],
              },
              {
                content: docxParagraph(item.status || "Open", { bold: true, size: 16, spacingAfter: 20 }),
                fill: docxStatusFill(item.status),
              },
              {
                content: docxParagraph(docxActionText(item), { size: 16, spacingAfter: 20 }),
              },
            ],
          };
        }),
      ],
      [4400, 1800, 4744]
    ));

    const photos = sectionState.photos || [];
    if (photos.length) {
      documentParts.push(docxParagraph("Supporting Pictures", { bold: true, size: 18, keepNext: true, spacingAfter: 60 }));
      for (let index = 0; index < photos.length; index += 2) {
        const rowPhotos = photos.slice(index, index + 2);
        const cells = [];
        for (const photo of rowPhotos) {
          const image = await addPhoto(photo);
          cells.push({
            content: image
              ? [
                docxDrawing(image),
                docxParagraph(photo.name || "Supporting photo", { size: 14, color: "475569", align: "center", spacingAfter: 20 }),
              ]
              : docxParagraph(photo.name || "Supporting photo", { size: 14, color: "475569", spacingAfter: 20 }),
          });
        }
        if (cells.length === 1) cells.push({ content: docxParagraph("") });
        documentParts.push(docxTable([{ cells }], [5472, 5472], { border: "none" }));
      }
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
      <w:body>
        ${documentParts.join("")}
        <w:sectPr>
          <w:pgSz w:w="${DOCX_PAGE_WIDTH}" w:h="${DOCX_PAGE_HEIGHT}"/>
          <w:pgMar w:top="${DOCX_MARGIN}" w:right="${DOCX_MARGIN}" w:bottom="${DOCX_MARGIN}" w:left="${DOCX_MARGIN}" w:header="360" w:footer="360" w:gutter="0"/>
        </w:sectPr>
      </w:body>
    </w:document>`;
  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      ${imageRelationships.map((relationship) => `<Relationship Id="${relationship.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${relationship.target}"/>`).join("")}
    </Relationships>`;

  return docxZipBlob([
    {
      path: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
          <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
          <Default Extension="xml" ContentType="application/xml"/>
          <Default Extension="jpg" ContentType="image/jpeg"/>
          <Default Extension="jpeg" ContentType="image/jpeg"/>
          <Default Extension="png" ContentType="image/png"/>
          <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        </Types>`,
    },
    {
      path: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
        </Relationships>`,
    },
    { path: "word/document.xml", data: documentXml },
    { path: "word/_rels/document.xml.rels", data: documentRels },
    ...mediaFiles,
  ]);
};

const downloadDocxBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function FleetAuditPage({ isMobile, onBack, wsEnergyLogo }) {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(ACCESS_KEY) === "true";
  });
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [audit, setAudit] = useState(loadStoredAudit);
  const [activeSectionId, setActiveSectionId] = useState("safety");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [savedAudits, setSavedAudits] = useState([]);
  const [auditsLoading, setAuditsLoading] = useState(true);
  const [isSavingAudit, setIsSavingAudit] = useState(false);
  const [isBuildingAuditDocx, setIsBuildingAuditDocx] = useState(false);
  const [deletingAuditId, setDeletingAuditId] = useState(null);
  const latestAuditRef = useRef(audit);
  const auditSections = useMemo(() => getAuditSections(audit), [audit]);
  const auditEquipment = useMemo(
    () => normalizeEquipment(audit.equipment, audit.sections),
    [audit.equipment, audit.sections]
  );

  const fetchSavedAudits = useCallback(async () => {
    if (!supabase) {
      setSavedAudits([]);
      setAuditsLoading(false);
      return;
    }

    setAuditsLoading(true);
    const { data, error } = await supabase
      .from(AUDITS_TABLE)
      .select("id, audit_date, fleet, customer, auditor, audit_data, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setSavedAudits([]);
      setAuditsLoading(false);
      return;
    }

    setSavedAudits((data || []).map(normalizeSavedAuditRow));
    setAuditsLoading(false);
  }, []);

  useEffect(() => {
    if (auditSections.some((section) => section.id === activeSectionId)) return;
    setActiveSectionId(auditSections[0]?.id || "safety");
  }, [activeSectionId, auditSections]);

  useEffect(() => {
    fetchSavedAudits();
  }, [fetchSavedAudits]);

  useEffect(() => {
    latestAuditRef.current = audit;
    persistAuditDraft(audit);
  }, [audit]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const autosaveCurrentAudit = () => {
      persistAuditAutosave(latestAuditRef.current);
    };

    autosaveCurrentAudit();
    const intervalId = window.setInterval(autosaveCurrentAudit, AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;

    const saveCurrentDraft = () => {
      persistAuditDraft(latestAuditRef.current);
      persistAuditAutosave(latestAuditRef.current);
    };
    const saveOnVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveCurrentDraft();
    };

    window.addEventListener("pagehide", saveCurrentDraft);
    document.addEventListener("visibilitychange", saveOnVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", saveCurrentDraft);
      document.removeEventListener("visibilitychange", saveOnVisibilityChange);
    };
  }, [audit]);

  const sectionStats = useMemo(
    () =>
      auditSections.reduce((acc, section) => {
        acc[section.id] = getSectionStats(getSectionState(section, audit.sections).items);
        return acc;
      }, {}),
    [audit.sections, auditSections]
  );
  const auditScore = useMemo(() => getAuditScore(sectionStats), [sectionStats]);

  const activeSection = auditSections.find((section) => section.id === activeSectionId) || auditSections[0];
  const activeSectionState = getSectionState(activeSection, audit.sections);

  const pageButton = {
    ...input,
    width: "auto",
    cursor: "pointer",
    fontWeight: 800,
  };

  const darkButton = {
    ...pageButton,
    background: "#111827",
    border: "none",
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
  };

  const mutedButton = {
    ...pageButton,
    background: "#e2e8f0",
    border: "none",
    color: "#111827",
    WebkitTextFillColor: "#111827",
  };

  const unlockPage = (event) => {
    event.preventDefault();
    if (password !== AUDIT_PASSWORD) {
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

  const showMessage = (nextMessage, type = "success") => {
    setMessage(nextMessage);
    setMessageType(type);
    window.setTimeout(() => setMessage(""), 5000);
  };

  const updateAuditField = (key, value) => {
    setAudit((prev) => ({ ...prev, [key]: value }));
  };

  const updateAuditItem = (sectionId, itemIndex, key, value) => {
    setAudit((prev) => {
      const section = prev.sections[sectionId] || { items: [], photos: [] };
      const items = [...section.items];
      items[itemIndex] = { ...emptyItem(), ...(items[itemIndex] || {}), [key]: value };

      if (key === "status" && value !== "Needs Attention") {
        items[itemIndex].owner = "";
        items[itemIndex].dueDate = "";
      }

      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionId]: { ...section, items },
        },
      };
    });
  };

  const updateSectionUnitNumber = (section, value) => {
    setAudit((prev) => {
      const nextSections = {
        ...prev.sections,
        [section.id]: {
          ...getSectionState(section, prev.sections),
          unitNumber: value,
        },
      };

      if (!section.equipmentKey) {
        return { ...prev, sections: nextSections };
      }

      const equipmentList = prev.equipment?.[section.equipmentKey] || [];
      const nextEquipmentList = equipmentList.map((unit) =>
        unit.id === section.id ? { ...unit, unitNumber: value } : unit
      );

      return {
        ...prev,
        equipment: {
          ...prev.equipment,
          [section.equipmentKey]: nextEquipmentList,
        },
        sections: nextSections,
      };
    });
  };

  const addEquipmentUnit = (equipmentKey) => {
    const template = equipmentTemplates[equipmentKey];
    if (!template) return;
    const nextUnit = { id: makeEquipmentSectionId(template.idPrefix), unitNumber: "" };

    setAudit((prev) => {
      const equipment = normalizeEquipment(prev.equipment, prev.sections);
      const nextEquipment = {
        ...equipment,
        [equipmentKey]: [...equipment[equipmentKey], nextUnit],
      };
      const nextSection = buildEquipmentSections(nextEquipment).find((section) => section.id === nextUnit.id);

      return {
        ...prev,
        equipment: nextEquipment,
        sections: {
          ...prev.sections,
          [nextUnit.id]: nextSection ? normalizeSectionState(nextSection) : { unitNumber: "", items: [], photos: [] },
        },
      };
    });

    window.setTimeout(() => setActiveSectionId(nextUnit.id), 0);
  };

  const removeEquipmentUnit = (section) => {
    const template = equipmentTemplates[section.equipmentKey];
    if (!template) return;

    setAudit((prev) => {
      const equipment = normalizeEquipment(prev.equipment, prev.sections);
      const currentList = equipment[section.equipmentKey] || [];
      if (currentList.length <= 1) {
        showMessage(`At least one ${template.singular.toLowerCase()} is required`, "warning");
        return prev;
      }

      const nextEquipment = {
        ...equipment,
        [section.equipmentKey]: currentList.filter((unit) => unit.id !== section.id),
      };
      const nextSections = { ...prev.sections };
      delete nextSections[section.id];

      window.setTimeout(() => {
        const fallbackId = getAuditSections({ ...prev, equipment: nextEquipment, sections: nextSections })[0]?.id || "safety";
        setActiveSectionId(fallbackId);
      }, 0);

      return {
        ...prev,
        equipment: nextEquipment,
        sections: nextSections,
      };
    });
  };

  const addPhotos = async (sectionId, files) => {
    const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) return;

    setIsProcessingPhotos(true);
    try {
      const photos = await Promise.all(imageFiles.map((file) => resizeImage(file)));
      setAudit((prev) => {
        const section = prev.sections[sectionId] || { items: [], photos: [] };
        return {
          ...prev,
          sections: {
            ...prev.sections,
            [sectionId]: {
              ...section,
              photos: [...(section.photos || []), ...photos].slice(0, 8),
            },
          },
        };
      });
      showMessage("Photos added");
    } catch (error) {
      console.error("Unable to add photos", error);
      showMessage("Unable to add photos", "error");
    } finally {
      setIsProcessingPhotos(false);
    }
  };

  const removePhoto = (sectionId, photoId) => {
    setAudit((prev) => {
      const section = prev.sections[sectionId] || { items: [], photos: [] };
      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionId]: {
            ...section,
            photos: (section.photos || []).filter((photo) => photo.id !== photoId),
          },
        },
      };
    });
  };

  const clearForm = () => {
    if (typeof window !== "undefined" && !window.confirm("Clear this audit form?")) return;
    const nextAudit = makeInitialAudit();
    setAudit(nextAudit);
    setActiveSectionId("safety");
    persistAuditDraft(nextAudit);
    showMessage("Audit form cleared");
  };

  const downloadAuditDocx = async (auditToDownload = audit) => {
    if (isBuildingAuditDocx) return;
    setIsBuildingAuditDocx(true);
    try {
      const normalizedAudit = normalizeAudit(auditToDownload);
      const blob = await buildAuditDocxBlob(normalizedAudit, wsEnergyLogo);
      downloadDocxBlob(blob, getAuditDocxFileName(normalizedAudit));
      showMessage("Audit DOCX downloaded");
    } catch (error) {
      console.error("Unable to build audit DOCX", error);
      showMessage("Audit DOCX failed", "error");
    } finally {
      setIsBuildingAuditDocx(false);
    }
  };

  const saveCompletedAudit = async () => {
    if (isSavingAudit) return;

    if (!supabase) {
      showMessage("Supabase is not connected", "error");
      return;
    }

    setIsSavingAudit(true);
    const normalizedAudit = normalizeAudit(audit);
    if (!normalizedAudit.date || !normalizedAudit.fleet) {
      setIsSavingAudit(false);
      showMessage("Audit date and fleet are required", "error");
      return;
    }

    const payload = {
      audit_date: normalizedAudit.date,
      fleet: normalizedAudit.fleet,
      customer: normalizedAudit.customer,
      auditor: normalizedAudit.auditor,
      day_shift_operator: normalizedAudit.dayShiftOperator,
      night_shift_operator: normalizedAudit.nightShiftOperator,
      audit_data: normalizedAudit,
    };

    const { data: matchingAudits, error: matchError } = await supabase
      .from(AUDITS_TABLE)
      .select("id, updated_at, created_at")
      .eq("audit_date", payload.audit_date)
      .eq("fleet", payload.fleet)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (matchError) {
      console.error(matchError);
      setIsSavingAudit(false);
      showMessage("Audit save failed", "error");
      return;
    }

    const existingAudit = matchingAudits?.[0];
    const duplicateIds = (matchingAudits || []).slice(1).map((savedAudit) => savedAudit.id).filter(Boolean);
    const saveRequest = existingAudit
      ? supabase.from(AUDITS_TABLE).update(payload).eq("id", existingAudit.id)
      : supabase.from(AUDITS_TABLE).insert(payload);

    const { error } = await saveRequest;

    if (error) {
      console.error(error);
      setIsSavingAudit(false);
      showMessage("Audit save failed", "error");
      return;
    }

    if (duplicateIds.length) {
      const { error: duplicateDeleteError } = await supabase
        .from(AUDITS_TABLE)
        .delete()
        .in("id", duplicateIds);

      if (duplicateDeleteError) {
        console.error(duplicateDeleteError);
      }
    }

    await fetchSavedAudits();
    setIsSavingAudit(false);
    showMessage(existingAudit ? "Completed audit updated" : "Completed audit saved");
  };

  const loadSavedAudit = (savedAudit) => {
    const nextAudit = normalizeAudit(savedAudit.audit);
    setAudit(nextAudit);
    setActiveSectionId("safety");
    persistAuditDraft(nextAudit);
    showMessage("Saved audit loaded");
  };

  const removeSavedAudit = async (savedAudit) => {
    if (!supabase || !savedAudit?.id || deletingAuditId) return;

    const auditName = [
      savedAudit.fleet ? `Fleet ${savedAudit.fleet}` : "saved audit",
      savedAudit.customer,
      formatDate(savedAudit.date),
    ].filter(Boolean).join(" - ");

    if (typeof window !== "undefined" && !window.confirm(`Remove ${auditName}?`)) return;

    setDeletingAuditId(savedAudit.id);
    const { error } = await supabase
      .from(AUDITS_TABLE)
      .delete()
      .eq("id", savedAudit.id);

    if (error) {
      console.error(error);
      setDeletingAuditId(null);
      showMessage("Audit remove failed", "error");
      return;
    }

    setSavedAudits((currentAudits) => currentAudits.filter((auditItem) => auditItem.id !== savedAudit.id));
    setDeletingAuditId(null);
    showMessage("Saved audit removed");
  };

  if (!isUnlocked) {
    return (
      <div style={{ background: "linear-gradient(180deg, #edf5f8 0%, #f8fafc 100%)", minHeight: "100vh", padding: isMobile ? 12 : 18, color: "#111827", colorScheme: "light" }}>
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "left" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <button type="button" onClick={onBack} style={{ ...mutedButton, flex: isMobile ? "1 1 100%" : "none" }}>
              Back to Fleet Report
            </button>
          </div>
          <form onSubmit={unlockPage} style={{ ...card, borderRadius: 8, padding: isMobile ? 18 : 24 }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <img
                src={wsEnergyLogo}
                alt="WS Energy Services logo"
                style={{ width: isMobile ? 130 : 180, height: "auto", objectFit: "contain", marginBottom: 10 }}
              />
              <h1 style={{ margin: 0, fontSize: isMobile ? 24 : 32, lineHeight: 1.2, color: "#111827" }}>
                Pumpdown Fleet Readiness Audit
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
    <div style={{ background: "linear-gradient(180deg, #edf5f8 0%, #f8fafc 42%, #f8fafc 100%)", minHeight: "100vh", padding: isMobile ? 10 : 18, color: "#111827", colorScheme: "light" }}>
      {message ? (
        <div
          role="alert"
          style={{
            position: "fixed",
            zIndex: 1000,
            right: isMobile ? 10 : 24,
            bottom: isMobile ? 10 : 24,
            left: isMobile ? 10 : "auto",
            ...notificationBase,
            ...notificationStyles[messageType],
          }}
        >
          {message}
        </div>
      ) : null}

      <div style={{ maxWidth: 1180, margin: "0 auto", textAlign: "left" }}>
        <header style={{ ...card, borderRadius: 8, marginBottom: 12, padding: isMobile ? 12 : 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, width: isMobile ? "100%" : "auto" }}>
              <button type="button" onClick={onBack} style={{ ...mutedButton, flex: isMobile ? 1 : "none", padding: "9px 10px" }}>
                Back
              </button>
              <button type="button" onClick={lockPage} style={{ ...removeActionButton, flex: isMobile ? "0 0 86px" : "none", padding: "9px 10px" }}>
                Lock
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, width: isMobile ? "100%" : "auto" }}>
              <button type="button" onClick={clearForm} style={{ ...mutedButton, flex: isMobile ? 1 : "none", padding: "9px 10px" }}>
                Clear
              </button>
              <button
                type="button"
                onClick={saveCompletedAudit}
                disabled={isSavingAudit}
                style={{ ...addActionButton, flex: isMobile ? 1 : "none", padding: "9px 10px", opacity: isSavingAudit ? 0.7 : 1 }}
              >
                {isSavingAudit ? "Saving..." : "Save Audit"}
              </button>
              <button
                type="button"
                onClick={() => downloadAuditDocx(audit)}
                disabled={isBuildingAuditDocx}
                style={{ ...darkButton, flex: isMobile ? 1 : "none", padding: "9px 10px", opacity: isBuildingAuditDocx ? 0.65 : 1 }}
              >
                {isBuildingAuditDocx ? "Building DOCX..." : "Download DOCX"}
              </button>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 14 }}>
            <img
              src={wsEnergyLogo}
              alt="WS Energy Services logo"
              style={{ width: isMobile ? 122 : 178, height: "auto", display: "block", margin: "0 auto 8px", objectFit: "contain" }}
            />
            <h1 style={{ margin: 0, fontSize: isMobile ? 23 : 32, lineHeight: 1.15, color: "#111827" }}>
              Pumpdown Fleet Readiness Audit
            </h1>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1.2fr repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
            <div style={{ border: `1px solid ${auditScore.tone.border}`, borderRadius: 8, background: auditScore.tone.background, padding: 10 }}>
              <div style={{ color: auditScore.tone.color, fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>Readiness Score</div>
              <div style={{ color: auditScore.tone.color, fontSize: isMobile ? 24 : 30, fontWeight: 900, lineHeight: 1 }}>
                {auditScore.score}%
              </div>
              <div style={{ color: auditScore.tone.color, fontSize: 12, fontWeight: 800, marginTop: 3 }}>{auditScore.tone.label}</div>
            </div>
            {[
              ["Pass", auditScore.pass],
              ["Attention", auditScore.needsAttention],
              ["Open", auditScore.open],
            ].map(([title, value]) => (
              <div key={title} style={{ border: "1px solid #dbe4ee", borderRadius: 8, background: "#f8fafc", padding: 10 }}>
                <div style={{ color: "#64748b", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{title}</div>
                <div style={{ color: "#111827", fontSize: isMobile ? 20 : 24, fontWeight: 900, lineHeight: 1.1 }}>{value}</div>
                <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700, marginTop: 3 }}>
                  {title === "Pass" ? `${auditScore.applicable} applicable` : `${auditScore.completion}% complete`}
                </div>
              </div>
            ))}
          </div>
        </header>

        <section style={{ ...card, borderRadius: 8, marginBottom: 12, padding: isMobile ? 12 : 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 10 }}>
            <div>
              <label style={label}>Audit Date</label>
              <input style={input} type="date" value={audit.date || ""} onChange={(event) => updateAuditField("date", event.target.value)} />
            </div>
            <div>
              <label style={label}>Fleet</label>
              <select style={selectInput} value={audit.fleet || "1"} onChange={(event) => updateAuditField("fleet", event.target.value)}>
                <option value="1">Fleet 1</option>
                <option value="2">Fleet 2</option>
                <option value="3">Fleet 3</option>
                <option value="4">Fleet 4</option>
                <option value="5">Fleet 5</option>
                <option value="6">Fleet 6</option>
                <option value="7">Fleet 7</option>
                <option value="yard">Yard / Shop</option>
              </select>
            </div>
            <div>
              <label style={label}>Customer</label>
              <input style={input} value={audit.customer || ""} onChange={(event) => updateAuditField("customer", event.target.value)} />
            </div>
            <div>
              <label style={label}>Auditor</label>
              <input style={input} value={audit.auditor || ""} onChange={(event) => updateAuditField("auditor", event.target.value)} />
            </div>
            <div>
              <label style={label}>Day Shift Operator</label>
              <input style={input} value={audit.dayShiftOperator || ""} onChange={(event) => updateAuditField("dayShiftOperator", event.target.value)} />
            </div>
            <div>
              <label style={label}>Night Shift Operator</label>
              <input style={input} value={audit.nightShiftOperator || ""} onChange={(event) => updateAuditField("nightShiftOperator", event.target.value)} />
            </div>
          </div>
        </section>

        <section style={{ ...card, borderRadius: 8, marginBottom: 12, padding: isMobile ? 12 : 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 10 }}>
            <div>
              <h2 style={{ margin: 0, color: "#111827", fontSize: isMobile ? 18 : 22, lineHeight: 1.2 }}>
                Equipment Units
              </h2>
              <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700, marginTop: 3 }}>
                Add each truck, tractor, and pump, then enter command center and iron trailer units.
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {Object.values(equipmentTemplates).map((template) => {
              const units = auditEquipment[template.key] || [];
              return (
                <div key={template.key} style={{ border: "1px solid #dbe4ee", borderRadius: 8, background: "#f8fafc", padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <h3 style={{ margin: 0, color: "#111827", fontSize: 15 }}>
                      {template.singular}s
                    </h3>
                    <button
                      type="button"
                      onClick={() => addEquipmentUnit(template.key)}
                      style={{ ...addActionButton, padding: "7px 9px", borderRadius: 8, fontSize: 12 }}
                    >
                      Add
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {units.map((unit, index) => {
                      const section = auditSections.find((item) => item.id === unit.id);
                      const sectionState = section ? getSectionState(section, audit.sections) : { unitNumber: unit.unitNumber || "" };
                      return (
                        <div key={unit.id} style={{ display: "grid", gap: 7 }}>
                          <label style={{ ...label, marginBottom: 0 }}>{template.singular} {index + 1} Unit #</label>
                          <div style={{ display: "flex", gap: 8 }}>
                            <input
                              style={{ ...input, flex: 1 }}
                              value={sectionState.unitNumber || ""}
                              onChange={(event) => {
                                if (section) updateSectionUnitNumber(section, event.target.value);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => section && removeEquipmentUnit(section)}
                              disabled={units.length <= 1}
                              style={{
                                ...removeActionButton,
                                padding: "7px 9px",
                                borderRadius: 8,
                                fontSize: 12,
                                opacity: units.length <= 1 ? 0.5 : 1,
                                cursor: units.length <= 1 ? "not-allowed" : "pointer",
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {fixedEquipmentSections.map((section) => {
              const sectionState = getSectionState(section, audit.sections);
              return (
                <div key={section.id} style={{ border: "1px solid #dbe4ee", borderRadius: 8, background: "#f8fafc", padding: 10 }}>
                  <h3 style={{ margin: "0 0 8px", color: "#111827", fontSize: 15 }}>
                    {section.title}
                  </h3>
                  <label style={{ ...label, marginBottom: 7 }}>{section.unitLabel}</label>
                  <input
                    style={input}
                    value={sectionState.unitNumber || ""}
                    onChange={(event) => updateSectionUnitNumber(section, event.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ ...card, borderRadius: 8, marginBottom: 12, padding: isMobile ? 12 : 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <div>
              <h2 style={{ margin: 0, color: "#111827", fontSize: isMobile ? 18 : 22, lineHeight: 1.2 }}>
                Completed Audits
              </h2>
              <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700, marginTop: 3 }}>
                Download or load audits saved to Supabase.
              </div>
            </div>
            <button type="button" onClick={fetchSavedAudits} style={{ ...mutedButton, padding: "8px 10px", fontSize: 13 }}>
              Refresh
            </button>
          </div>

          {!supabase ? (
            <div style={{ ...notificationBase, ...notificationStyles.warning }}>
              Supabase is not connected. Run the audit table SQL and check environment variables.
            </div>
          ) : auditsLoading ? (
            <p style={{ color: "#64748b", margin: 0 }}>Loading completed audits...</p>
          ) : savedAudits.length === 0 ? (
            <p style={{ color: "#64748b", margin: 0 }}>No completed audits saved yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {savedAudits.slice(0, 12).map((savedAudit) => (
                <div key={savedAudit.id} style={{ border: "1px solid #dbe4ee", borderRadius: 8, background: "#f8fafc", padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ color: "#111827", fontSize: 14, fontWeight: 900 }}>
                        Fleet {savedAudit.fleet || "No Fleet"} {savedAudit.customer ? `- ${savedAudit.customer}` : ""}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                        {formatDate(savedAudit.date) || "No date"} {savedAudit.auditor ? `• ${savedAudit.auditor}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
                      <button
                        type="button"
                        onClick={() => downloadAuditDocx(savedAudit.audit)}
                        disabled={isBuildingAuditDocx}
                        style={{ ...darkButton, flex: isMobile ? 1 : "none", padding: "8px 10px", fontSize: 13 }}
                      >
                        DOCX
                      </button>
                      <button
                        type="button"
                        onClick={() => loadSavedAudit(savedAudit)}
                        style={{ ...addActionButton, flex: isMobile ? 1 : "none", padding: "8px 10px", fontSize: 13 }}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSavedAudit(savedAudit)}
                        disabled={deletingAuditId === savedAudit.id}
                        style={{
                          ...removeActionButton,
                          flex: isMobile ? 1 : "none",
                          padding: "8px 10px",
                          fontSize: 13,
                          opacity: deletingAuditId === savedAudit.id ? 0.7 : 1,
                          cursor: deletingAuditId === savedAudit.id ? "wait" : "pointer",
                        }}
                      >
                        {deletingAuditId === savedAudit.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 5,
            background: "#f8fafc",
            border: "1px solid #dbe4ee",
            borderRadius: 8,
            padding: 8,
            marginBottom: 12,
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div style={{ display: "flex", gap: 8, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
            {auditSections.map((section) => {
              const stats = sectionStats[section.id];
              const isActive = section.id === activeSection.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSectionId(section.id)}
                  style={{
                    border: isActive ? `2px solid ${section.accent}` : "1px solid #cbd5e1",
                    background: isActive ? "#ffffff" : "#eef2f7",
                    color: "#111827",
                    borderRadius: 8,
                    padding: "9px 10px",
                    minWidth: isMobile ? 150 : 178,
                    cursor: "pointer",
                    textAlign: "left",
                    flex: "0 0 auto",
                    boxShadow: isActive ? "0 8px 18px rgba(15, 23, 42, 0.08)" : "none",
                  }}
                >
                  <span style={{ display: "block", fontWeight: 900, fontSize: 13, lineHeight: 1.15 }}>{section.title}</span>
                  <span style={{ display: "block", color: stats.needsAttention ? "#991b1b" : "#64748b", fontSize: 12, fontWeight: 800, marginTop: 4 }}>
                    {stats.answered}/{stats.total} {stats.needsAttention ? `- ${stats.needsAttention} attention` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <main style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 320px", gap: 12, alignItems: "start" }}>
          <section style={{ display: "grid", gap: 10 }}>
            <div style={{ border: `1px solid ${activeSection.accent}`, borderRadius: 8, background: "#ffffff", padding: isMobile ? 12 : 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <div>
                  <h2 style={{ margin: 0, color: "#111827", fontSize: isMobile ? 21 : 26, lineHeight: 1.15 }}>
                    {activeSection.title}
                  </h2>
                  <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                    {sectionStats[activeSection.id].answered}/{sectionStats[activeSection.id].total} complete
                  </div>
                </div>
                <label style={{ ...addActionButton, borderRadius: 8, padding: "9px 11px", margin: 0 }}>
                  {isProcessingPhotos ? "Adding..." : "Add Pictures"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={(event) => {
                      addPhotos(activeSection.id, event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>

              {activeSection.unitLabel ? (
                <div style={{ border: "1px solid #dbe4ee", borderRadius: 8, background: "#f8fafc", padding: 10, marginBottom: 10 }}>
                  <label style={label}>{activeSection.unitLabel}</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "stretch", flexWrap: isMobile ? "wrap" : "nowrap" }}>
                    <input
                      style={{ ...input, flex: "1 1 220px" }}
                      value={activeSectionState.unitNumber || ""}
                      onChange={(event) => updateSectionUnitNumber(activeSection, event.target.value)}
                    />
                    {activeSection.equipmentKey ? (
                      <button
                        type="button"
                        onClick={() => removeEquipmentUnit(activeSection)}
                        disabled={(auditEquipment[activeSection.equipmentKey] || []).length <= 1}
                        style={{
                          ...removeActionButton,
                          flex: isMobile ? "1 1 100%" : "0 0 auto",
                          opacity: (auditEquipment[activeSection.equipmentKey] || []).length <= 1 ? 0.5 : 1,
                          cursor: (auditEquipment[activeSection.equipmentKey] || []).length <= 1 ? "not-allowed" : "pointer",
                        }}
                      >
                        Remove {activeSection.title}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 10 }}>
                {activeSection.items.map((auditItem, index) => {
                  const item = activeSectionState.items[index] || emptyItem();
                  const itemGroup = getAuditItemGroup(auditItem);
                  return (
                    <article key={getAuditItemKey(auditItem, index)} style={{ border: "1px solid #dbe4ee", borderRadius: 8, background: "#f8fafc", padding: isMobile ? 10 : 12 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: activeSection.accent, color: "#ffffff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 900, flex: "0 0 auto" }}>
                          {index + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {itemGroup ? (
                            <div style={{ color: activeSection.accent, fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginBottom: 3 }}>
                              {itemGroup}
                            </div>
                          ) : null}
                          <h3 style={{ margin: itemGroup ? 0 : "4px 0 0", color: "#111827", fontSize: isMobile ? 15 : 16, lineHeight: 1.3, fontWeight: 800 }}>
                            {getAuditItemText(auditItem)}
                          </h3>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
                        {statusOptions.map((option) => {
                          const isSelected = item.status === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateAuditItem(activeSection.id, index, "status", isSelected ? "" : option.value)}
                              style={{
                                border: `1px solid ${isSelected ? option.border : "#cbd5e1"}`,
                                background: isSelected ? option.background : "#ffffff",
                                color: isSelected ? option.color : "#334155",
                                WebkitTextFillColor: isSelected ? option.color : "#334155",
                                borderRadius: 8,
                                minHeight: 44,
                                fontSize: 13,
                                fontWeight: 900,
                                cursor: "pointer",
                              }}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <label style={label}>Notes</label>
                        <textarea
                          style={{ ...input, minHeight: 72, resize: "vertical", lineHeight: 1.35 }}
                          value={item.notes || ""}
                          onChange={(event) => updateAuditItem(activeSection.id, index, "notes", event.target.value)}
                        />
                      </div>

                      {item.status === "Needs Attention" ? (
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginTop: 10 }}>
                          <div>
                            <label style={label}>Assigned To</label>
                            <input style={input} value={item.owner || ""} onChange={(event) => updateAuditItem(activeSection.id, index, "owner", event.target.value)} />
                          </div>
                          <div>
                            <label style={label}>Due Date</label>
                            <input style={input} type="date" value={item.dueDate || ""} onChange={(event) => updateAuditItem(activeSection.id, index, "dueDate", event.target.value)} />
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              {activeSectionState.photos?.length ? (
                <div style={{ marginTop: 14 }}>
                  <h3 style={{ margin: "0 0 8px", color: "#111827", fontSize: 16 }}>Supporting Pictures</h3>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                    {activeSectionState.photos.map((photo) => (
                      <figure key={photo.id} style={{ margin: 0, border: "1px solid #dbe4ee", borderRadius: 8, overflow: "hidden", background: "#ffffff" }}>
                        <img src={photo.src} alt={photo.name} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }} />
                        <figcaption style={{ padding: 7, color: "#475569", fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {photo.name}
                        </figcaption>
                        <button type="button" onClick={() => removePhoto(activeSection.id, photo.id)} style={{ ...removeActionButton, width: "100%", borderRadius: 0, borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
                          Remove
                        </button>
                      </figure>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <aside style={{ ...card, borderRadius: 8, padding: isMobile ? 12 : 14, position: isMobile ? "static" : "sticky", top: 92 }}>
            <h2 style={{ margin: "0 0 10px", color: "#111827", fontSize: 18 }}>Audit Summary</h2>
            <div style={{ border: `1px solid ${auditScore.tone.border}`, borderRadius: 8, background: auditScore.tone.background, padding: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <span style={{ color: auditScore.tone.color, fontSize: 13, fontWeight: 900 }}>Score</span>
                <span style={{ color: auditScore.tone.color, fontSize: 24, fontWeight: 900 }}>{auditScore.score}%</span>
              </div>
              <div style={{ color: auditScore.tone.color, fontSize: 12, fontWeight: 800 }}>
                {auditScore.tone.label} • {auditScore.pass}/{auditScore.applicable} pass • {auditScore.open} open
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {auditSections.map((section) => {
                const stats = sectionStats[section.id];
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSectionId(section.id)}
                    style={{
                      border: section.id === activeSection.id ? `2px solid ${section.accent}` : "1px solid #dbe4ee",
                      borderRadius: 8,
                      background: "#ffffff",
                      padding: 9,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "#111827", fontSize: 13, fontWeight: 900 }}>
                      <span>{section.title}</span>
                      <span>{stats.answered}/{stats.total}</span>
                    </span>
                    <span style={{ display: "block", width: "100%", height: 6, borderRadius: 999, background: "#e2e8f0", overflow: "hidden", marginTop: 7 }}>
                      <span style={{ display: "block", width: `${stats.total ? (stats.answered / stats.total) * 100 : 0}%`, height: "100%", background: stats.needsAttention ? "#dc2626" : section.accent }} />
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
