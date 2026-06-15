import React, { useEffect, useMemo, useState } from "react";
import {
  addActionButton,
  card,
  input,
  label,
  notificationBase,
  notificationStyles,
  removeActionButton,
  selectInput,
} from "../fleetReport/config";

const AUDIT_PASSWORD = "1775";
const ACCESS_KEY = "fleetAuditUnlocked";
const STORAGE_KEY = "fleetAuditDraft";
const PHOTO_MAX_SIZE = 1280;
const PHOTO_QUALITY = 0.78;

const sectionItems = (...groups) =>
  groups.flatMap(([group, items]) => items.map((text) => ({ group, text })));

const truckAndTractorItems = sectionItems(
  ["Equipment", [
    "PMs up to date in T3",
    "PM intervals correct in T3",
    "Equipment clean and organized",
    "Toolbox clean and organized",
    "Toolbox free of unnecessary items",
    "Inventory accounted for (DOT triangles, first aid kit, fuel card)",
    "Sticker kit consistent",
  ]],
  ["Compliance", [
    "DOT compliance current",
    "Fire extinguisher inspected",
    "QR codes/documentation correct",
  ]],
  ["Reliability", [
    "Mechanical issues documented",
    "Spare critical components available",
  ]],
  ["Customer Readiness", [
    "Equipment clean and professional",
    "No leaks/damage",
  ]]
);

const pumpItems = sectionItems(
  ["Equipment", [
    "PMs up to date in T3",
    "PM intervals correct in T3",
    "Pump parameters set",
    "Equipment clean and organized",
    "Hose fittings standardized",
    "Sticker kit consistent",
  ]],
  ["Compliance", [
    "Pump iron certification in date",
    "Pressure transducer calibration certifications current",
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
      "HSI Pump Down classes completed",
      "Proficiency tests created and implemented",
      "All personnel have proper PPE",
      "DISA / ISN fit-for-duty current",
      "JSAs completed and followed",
      "Safety meetings being conducted",
    ],
  },
  {
    id: "personnel",
    title: "Personnel",
    accent: "#2563eb",
    items: [
      "Full crew coverage",
      "Operational training current",
      "Right personnel assigned to correct fleet",
      "Supervisors assigned",
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
        "Daily reports submitted and information correctly input",
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
        "Iron standardized",
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
        "Equipment clean and professional",
        "No leaks/damage",
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
      "Turnaround/redress process followed",
      "On-the-job reporting accurate",
      "Test pit process followed",
      "Inventory (filters/parts) stocked",
      "Morning briefings conducted",
      "Timesheets accurate",
      "Ticketing accurate",
      "Tickets match job execution",
      "Teams chat properly named",
      "Proper personnel in Teams chat",
      "JSA filled out and sent in Teams chat daily",
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

const getReadinessSummarySection = (equipment) => ({
  id: "overall-readiness-summary",
  title: "Overall Readiness Summary",
  accent: "#2563eb",
  items: [
    "Safety Ready",
    "Personnel Ready",
    ...equipment.trucks.map((_, index) => `Truck ${index + 1} Ready`),
    ...equipment.tractors.map((_, index) => `Tractor ${index + 1} Ready`),
    ...equipment.pumps.map((_, index) => `Pump ${index + 1} Ready`),
    "Command Center Ready",
    "Iron Trailer Ready",
    "Operations Ready",
  ],
});

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
    getReadinessSummarySection(equipment),
  ];
};

const normalizeSectionState = (section, storedSection = {}) => ({
  unitNumber: normalizeText(storedSection.unitNumber),
  items: section.items.map((_, index) => {
    const storedItem = Array.isArray(storedSection.items) ? storedSection.items[index] : {};
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

const loadStoredAudit = () => {
  if (typeof window === "undefined") return makeInitialAudit();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeAudit(JSON.parse(stored)) : makeInitialAudit();
  } catch (error) {
    console.error("Unable to load fleet audit draft", error);
    return makeInitialAudit();
  }
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

const escapeHtmlWithBreaks = (value) => escapeHtml(value).replace(/\n/g, "<br>");

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
  return { answered, needsAttention, pass, notApplicable, total: items.length };
};

const getStatusTone = (status) =>
  statusOptions.find((option) => option.value === status) || {
    color: "#475569",
    background: "#f8fafc",
    border: "#cbd5e1",
  };

const buildPrintableHtml = (audit) => {
  const auditSections = getAuditSections(audit);
  const metaRows = [
    ["Audit Date", formatDate(audit.date)],
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
  );

  const sectionHtml = auditSections
    .map((section) => {
      const sectionState = getSectionState(section, audit.sections);
      const rows = section.items
        .map((auditItem, index) => {
          const item = sectionState.items[index] || emptyItem();
          const tone = getStatusTone(item.status);
          const group = getAuditItemGroup(auditItem);
          const action = [
            item.notes ? escapeHtmlWithBreaks(item.notes) : "",
            item.owner ? `Owner: ${escapeHtml(item.owner)}` : "",
            item.dueDate ? `Due: ${escapeHtml(formatDate(item.dueDate))}` : "",
          ]
            .filter(Boolean)
            .join("<br>");

          return `
            <tr>
              <td>${group ? `<span class="group">${escapeHtml(group)}</span>` : ""}${escapeHtml(getAuditItemText(auditItem))}</td>
              <td><span style="color: ${tone.color}; border-color: ${tone.border}; background: ${tone.background};" class="status">${escapeHtml(item.status || "Open")}</span></td>
              <td>${action || "&nbsp;"}</td>
            </tr>
          `;
        })
        .join("");

      const photoHtml = sectionState.photos?.length
        ? `
          <div class="photos">
            ${sectionState.photos
              .map(
                (photo) => `
                  <figure>
                    <img src="${photo.src}" alt="${escapeHtml(photo.name)}">
                    <figcaption>${escapeHtml(photo.name)}</figcaption>
                  </figure>
                `
              )
              .join("")}
          </div>
        `
        : "";

      return `
        <section class="audit-section">
          <h2 style="border-color: ${section.accent};">${escapeHtml(section.title)}</h2>
          ${section.unitLabel ? `<div class="unit-line"><strong>${escapeHtml(section.unitLabel)}:</strong> ${escapeHtml(section.unitNumber)}</div>` : ""}
          <table>
            <thead>
              <tr>
                <th>Audit Item</th>
                <th>Status</th>
                <th>Notes / Action</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          ${photoHtml}
        </section>
      `;
    })
    .join("");

  const actionsHtml = actionRows.length
    ? `
      <section class="audit-section">
        <h2>Deficiency Action List</h2>
        <table>
          <thead>
            <tr>
              <th>Section</th>
              <th>Item</th>
              <th>Owner</th>
              <th>Due</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${actionRows
              .map(({ section, item, index }) => `
                <tr>
                  <td>${escapeHtml(section.title)}</td>
                  <td>${escapeHtml(getAuditItemLabel(section.items[index]))}</td>
                  <td>${escapeHtml(item.owner)}</td>
                  <td>${escapeHtml(formatDate(item.dueDate))}</td>
                  <td>${escapeHtml(item.notes)}</td>
                </tr>
              `)
              .join("")}
          </tbody>
        </table>
      </section>
    `
    : "";

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Fleet ${escapeHtml(audit.fleet)} Pumpdown Fleet Readiness Audit</title>
        <style>
          @page { size: letter; margin: 0.45in; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            line-height: 1.35;
          }
          h1 {
            margin: 0 0 6px;
            font-size: 20px;
            letter-spacing: 0;
          }
          h2 {
            margin: 0 0 8px;
            padding-left: 8px;
            border-left: 4px solid #111827;
            font-size: 14px;
          }
          .header {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 16px;
            align-items: start;
            border-bottom: 2px solid #111827;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            margin: 12px 0;
          }
          .summary div, .meta div {
            border: 1px solid #cbd5e1;
            padding: 6px;
            min-height: 34px;
          }
          .summary strong, .meta strong {
            display: block;
            color: #475569;
            font-size: 8px;
            text-transform: uppercase;
          }
          .summary span {
            display: block;
            font-size: 14px;
            font-weight: 700;
          }
          .meta {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
          }
          .audit-section {
            break-inside: avoid;
            margin: 14px 0 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 6px;
            vertical-align: top;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            font-size: 8px;
            text-transform: uppercase;
            text-align: left;
          }
          th:nth-child(1), td:nth-child(1) { width: 40%; }
          th:nth-child(2), td:nth-child(2) { width: 18%; }
          th:nth-child(3), td:nth-child(3) { width: 42%; }
          .status {
            display: inline-block;
            border: 1px solid;
            border-radius: 999px;
            padding: 2px 6px;
            font-weight: 700;
            white-space: nowrap;
          }
          .group {
            display: block;
            color: #475569;
            font-size: 8px;
            font-weight: 700;
            margin-bottom: 2px;
            text-transform: uppercase;
          }
          .unit-line {
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            margin: 0 0 8px;
            padding: 6px;
          }
          .unit-line strong {
            color: #475569;
            font-size: 8px;
            text-transform: uppercase;
          }
          .photos {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin-top: 8px;
          }
          figure {
            margin: 0;
            break-inside: avoid;
          }
          img {
            display: block;
            width: 100%;
            max-height: 260px;
            object-fit: contain;
            border: 1px solid #cbd5e1;
          }
          figcaption {
            color: #475569;
            font-size: 8px;
            margin-top: 3px;
          }
          .notes {
            border: 1px solid #cbd5e1;
            padding: 8px;
            min-height: 44px;
            white-space: pre-wrap;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <header class="header">
          <div>
            <h1>PUMPDOWN FLEET READINESS AUDIT</h1>
            <div>Generated ${escapeHtml(formatDate(getTodayDateValue()))}</div>
          </div>
          <div style="text-align: right; font-weight: 700;">Fleet ${escapeHtml(audit.fleet)}</div>
        </header>

        <div class="meta">
          ${metaRows.map(([key, value]) => `<div><strong>${escapeHtml(key)}</strong>${escapeHtml(value)}</div>`).join("")}
        </div>

        ${actionsHtml}
        ${sectionHtml}

        <script>
          const printReport = () => window.setTimeout(() => window.print(), 300);
          const images = Array.from(document.images);
          if (!images.length) {
            printReport();
          } else {
            Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => {
              image.onload = resolve;
              image.onerror = resolve;
            }))).then(printReport);
          }
        </script>
      </body>
    </html>
  `;
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
  const auditSections = useMemo(() => getAuditSections(audit), [audit]);
  const auditEquipment = useMemo(
    () => normalizeEquipment(audit.equipment, audit.sections),
    [audit.equipment, audit.sections]
  );

  useEffect(() => {
    if (auditSections.some((section) => section.id === activeSectionId)) return;
    setActiveSectionId(auditSections[0]?.id || "safety");
  }, [activeSectionId, auditSections]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(audit));
      } catch (error) {
        console.error("Unable to save fleet audit draft", error);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [audit]);

  const sectionStats = useMemo(
    () =>
      auditSections.reduce((acc, section) => {
        acc[section.id] = getSectionStats(getSectionState(section, audit.sections).items);
        return acc;
      }, {}),
    [audit.sections, auditSections]
  );

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
    window.localStorage.removeItem(STORAGE_KEY);
    showMessage("Audit form cleared");
  };

  const generatePdf = () => {
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      showMessage("Allow pop-ups to generate the PDF", "error");
      return;
    }

    reportWindow.document.open();
    reportWindow.document.write(buildPrintableHtml(audit));
    reportWindow.document.close();
    reportWindow.focus();
    showMessage("PDF report opened");
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
              <button type="button" onClick={generatePdf} style={{ ...darkButton, flex: isMobile ? 1 : "none", padding: "9px 10px" }}>
                Generate PDF
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
