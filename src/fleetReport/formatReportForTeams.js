import {
  getTruckPmStatus,
  getTractorPmStatus,
  getPumpPmStatus,
  getGeneratorPmStatus,
  isRealTruckUnit,
} from "./config";

export const formatReportForTeams = (report) => {
  if (!report) return "";

  const lines = [];
  const employees = report.employees || {};
  const misc = report.misc || {};
  const acidTransports = report.thirdParty?.acidTransports || [];
  const wsChemicals = report.wsChemicals || [];
  const fuelEntries = report.fuel?.entries || [];
  const pm = report.pm || {};

  const bold = (text) =>
    String(text)
      .split("")
      .map((char) => {
        const code = char.codePointAt(0);
        if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d400 + (code - 65));
        if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d41a + (code - 97));
        if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7ce + (code - 48));
        return char;
      })
      .join("");

  const pushSection = (title) => {
    if (lines.length) {
      lines.push("");
      lines.push("────────────────────");
      lines.push("");
    }
    lines.push(title);
  };

  const pushList = (items, emptyText = "• None") => {
    if (!items.length) {
      lines.push(emptyText);
      return;
    }
    items.forEach((item) => lines.push(`• ${item}`));
  };

  const pushPmBlock = (title, rows) => {
    lines.push(`• ${title}`);
    rows.forEach((row) => lines.push(`↳ ${row}`));
    lines.push("");
  };

  const statusEmoji = (status) => {
    if (status === "OVERDUE") return "🟥";
    if (status === "DUE") return "🟨";
    return "🟩";
  };

  const pushLabeledSubList = (label, items) => {
    lines.push(`• ${label}`);
    if (!items.length) {
      lines.push("↳ None");
      lines.push("");
      return;
    }
    items.forEach((item) => lines.push(`↳ ${item}`));
    lines.push("");
  };

  lines.push(`🔧 ${bold("END-OF-SHIFT INVENTORY & PM REPORT")}`);
  lines.push(`📅 ${bold("Date:")} ${report.date || "—"}`);
  lines.push(`🚩 ${bold("Fleet #:")} ${report.fleet || "—"}`);
  lines.push(`🌗 ${bold("Shift:")} ${report.shift || "—"}`);

  pushSection(`👥 ${bold("Employees")}`);
  lines.push(`• ${bold("Day Shift Operator:")} ${employees.dayOperator || "—"}`);
  lines.push(`• ${bold("Day Shift Assistants:")} ${(employees.dayAssistants || []).filter(Boolean).join(", ") || "—"}`);
  lines.push(`• ${bold("Night Shift Operator:")} ${employees.nightOperator || "—"}`);
  lines.push(`• ${bold("Night Shift Assistants:")} ${(employees.nightAssistants || []).filter(Boolean).join(", ") || "—"}`);

  pushSection(`🚛 ${bold("Equipment Inventory")}`);
  pushLabeledSubList(
    bold("Pump Units:"),
    (report.pumpUnits || []).filter(Boolean)
  );
  pushLabeledSubList(
    bold("Tractors:"),
    (report.tractors || []).filter(Boolean)
  );
  pushLabeledSubList(
    bold("Command Centers:"),
    (report.commandCenters || [])
      .filter((cc) => cc?.unit)
      .map((cc) => {
        const details = [
          cc.starlink ? `${bold("Starlink:")} ${cc.starlink}` : null,
          cc.radio ? `${bold("Full Radio Set:")} ${cc.radio}` : null,
        ]
          .filter(Boolean)
          .join(" | ");
        return `${cc.unit}${details ? ` (${details})` : ""}`;
      })
  );
  pushLabeledSubList(
    bold("Support Trailers / Floats:"),
    (report.trailers || []).map((t) => `${t?.prefix || ""}${t?.number || ""}`).filter(Boolean)
  );
  if (lines[lines.length - 1] === "") lines.pop();
  lines.push(`• ${bold("Iron Package:")} ${report.ironPackage || "—"}${report.ironPackageSource ? ` (${report.ironPackageSource})` : ""}`);
  lines.push("");
  pushLabeledSubList(
    bold("Day Shift Truck(s):"),
    (report.dayTrucks || []).filter(isRealTruckUnit)
  );
  pushLabeledSubList(
    bold("Night Shift Truck(s):"),
    (report.nightTrucks || []).filter(isRealTruckUnit)
  );
  pushLabeledSubList(
    bold("Chem Add / Chemical Skid(s):"),
    (report.chemicalSkids || []).filter(Boolean)
  );
  if (lines[lines.length - 1] === "") lines.pop();

  pushSection(`📦 ${bold("Rental Equipment")}`);
  pushList(
    (report.rentalEquipment || [])
      .filter((item) => item.unit || item.description || item.rentedFrom)
      .map((item) => {
        const description = item.description === "Other" ? item.descriptionOther || "—" : item.description || "—";
        const rentedFrom = item.rentedFrom === "Other" ? item.rentedFromOther || "—" : item.rentedFrom || "—";
        return `${bold("Unit:")} ${item.unit || "—"} | ${bold("Status:")} ${item.status || "—"} | ${bold("Description:")} ${description} | ${bold("Rented From:")} ${rentedFrom}`;
      })
  );

  pushSection(`⚠️ ${bold("Miscellaneous Equipment")}`);
  pushList(
    [
      misc.bleedOffSkid ? `${bold("Bleed Off Skid:")} ${misc.bleedOffSkid}` : null,
      misc.bleedOffValveManifoldUnit ? `${bold("Bleed Off Valve Manifold Unit:")} ${misc.bleedOffValveManifoldUnit}` : null,
      misc.containmentCount ? `${bold("# of Containments:")} ${misc.containmentCount}` : null,
      misc.restraintsType ? `${bold("Restraint Type:")} ${misc.restraintsType}` : null,
      misc.ponyPump === "Yes" ? `${bold("Hydraulic Pony Pump:")} Yes` : null,
      misc.fuelCube === "Yes" ? `${bold("WS Fuel Cube:")} Yes` : null,
    ].filter(Boolean)
  );

  pushSection(`🧪 ${bold("Acid Equipment")}`);
  pushList(
    acidTransports
      .filter((t) => t.provider || t.unit || t.strap)
      .map((t) => `${bold("Provider:")} ${t.provider || "—"} | ${bold("Unit:")} ${t.unit || "—"} | ${bold("Current Strap:")} ${t.strap ? `${t.strap} in` : "—"}`)
  );

  pushSection(`🧪 ${bold("WS Chemicals On Hand")}`);
  pushList(
    wsChemicals
      .filter((item) => item.chemical || item.amount)
      .map((item) => `${bold("Chemical:")} ${item.chemical === "Other" ? item.chemicalOther || "—" : item.chemical || "—"} | ${bold("Amount:")} ${item.amount ? `${item.amount} gallons` : "—"}`)
  );

  pushSection(`⛽ ${bold("Fuel Status")}`);
  pushList(
    fuelEntries
      .filter((entry) => entry.tankUnit || entry.trailer || entry.strap)
      .map((entry) => {
        const left = [entry.tankUnit ? `${bold("Tank Unit #:")} ${entry.tankUnit}` : null, entry.trailer ? `${bold("Trailer #:")} ${entry.trailer}` : null].filter(Boolean).join(" | ");
        const right = entry.strap ? `${bold("Fuel Strap Reading:")} ${entry.strap} inches` : null;
        return [left, right].filter(Boolean).join(" | ");
      })
  );

  pushSection(`🛠 ${bold("Scheduled Maintenance (PM Status)")}`);
  const pmBlocks = [];

  (pm.trucks || []).forEach((item, i) => {
    if (!item?.truck) return;
    const status = getTruckPmStatus(item, report.date);
    pmBlocks.push({
      title: `🛻 ${statusEmoji(status)} ${bold(`Truck ${i + 1}:`)} ${item.truck}`,
      rows: [
        `${bold("Status:")} ${status}`,
        `${bold("Current Miles:")} ${item.miles || "—"}`,
        `${bold("Current Engine Hours:")} ${item.engineHours || "—"}`,
        `${bold("Miles Service Due At:")} ${item.dueAt || "—"}`,
        `${bold("Engine Hours Service Due At:")} ${item.engineHoursDueAt || "—"}`,
        `${bold("QC Due Date:")} ${item.qcDue || "—"}`,
      ],
    });
  });

  (pm.tractors || []).forEach((item, i) => {
    if (!item?.tractor) return;
    const status = getTractorPmStatus(item, report.date);
    pmBlocks.push({
      title: `🚜 ${statusEmoji(status)} ${bold(`Tractor ${i + 1}:`)} ${item.tractor}`,
      rows: [
        `${bold("Status:")} ${status}`,
        `${bold("Current Miles:")} ${item.miles || "—"}`,
        `${bold("Current Hours:")} ${item.hours || "—"}`,
        `${bold("Miles Service Due At:")} ${item.dueAt || "—"}`,
        `${bold("Hours Service Due At:")} ${item.hoursDueAt || "—"}`,
        `${bold("QC Due Date:")} ${item.qcDue || "—"}`,
      ],
    });
  });

  (pm.pumps || []).forEach((item, i) => {
    if (!item?.pump) return;
    const status = getPumpPmStatus(item);
    pmBlocks.push({
      title: `🪛 ${statusEmoji(status)} ${bold(`Pump ${i + 1}:`)} ${item.pump}`,
      rows: [
        `${bold("Status:")} ${status}`,
        `${bold("Current Hours:")} ${item.hours || "—"}`,
        `${bold("Fuel / Air Filters Due At:")} ${item.fuelAirDue || "—"}`,
        `${bold("Oil Filters Due At:")} ${item.oilDue || "—"}`,
        `${bold("1000 HR PM Due At:")} ${item.pm1000Due || "—"}`,
      ],
    });
  });

  (pm.generators || []).forEach((item, i) => {
    if (!item?.unit) return;
    pmBlocks.push({
      title: `⚡ ${bold(`Generator ${i + 1}:`)} ${item.unit}`,
      rows: [
        `${bold("Status:")} ${getGeneratorPmStatus(item)}`,
        `${bold("Current Hours:")} ${item.hours || "—"}`,
        `${bold("Hours PM Due At:")} ${item.dueAt || "—"}`,
      ],
    });
  });

  if (!pmBlocks.length) {
    lines.push("• None");
  } else {
    pmBlocks.forEach((block) => pushPmBlock(block.title, block.rows));
    if (lines[lines.length - 1] === "") lines.pop();
  }

  pushSection(`🛢️ ${bold("Oil / Parts / Supplies Needed")}`);
  pushList((report.partsNeeded || []).filter(Boolean));

  pushSection(`⚠️ ${bold("Issues / Notes / Follow-Ups")}`);
  pushList((report.issues || []).filter(Boolean));

  return lines.join("\n");
};
