import React, { memo } from "react";
import {
  getStatusColors,
  getTruckPmDetails,
  getTractorPmDetails,
  getPumpPmDetails,
  getGeneratorPmDetails,
  formatPmStatusLabel,
  isRealTruckUnit,
} from "./config";

export const SavedReportView = memo(function SavedReportView({ report }) {
  if (!report) return null;

  const renderPmCard = (title, item, keyName) => {
    const details = keyName === "Truck"
      ? getTruckPmDetails(item, report.date)
      : keyName === "Tractor"
        ? getTractorPmDetails(item, report.date)
        : keyName === "Pump"
          ? getPumpPmDetails(item)
          : keyName === "Generator"
            ? getGeneratorPmDetails(item)
            : { status: item.status, reasons: [] };
    const status = details.status;
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
        <div><strong>Status:</strong> {formatPmStatusLabel(details)}</div>
      </div>
    );
  };

  return (
    <div style={{ fontSize: 14, lineHeight: 1.6 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>🔧 END-OF-SHIFT INVENTORY & PM REPORT</div>
      <div><strong>Date:</strong> {report.date}</div>
      <div><strong>Fleet #:</strong> {report.fleet}</div>
      <div><strong>Shift:</strong> {report.shift}</div>

      <div style={{ marginTop: 12, fontWeight: 700 }}>👥 Employees</div>
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
          <strong>🛰️ Command Centers:</strong>
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
          <strong>🚛 Support Trailers / Floats:</strong> {report.trailers
            .map((unit) => `${unit.prefix || ""}${unit.number || ""}`)
            .filter(Boolean)
            .join(", ")}
        </div>
      ) : null}
      <div>
        <strong>🔩 Iron Package:</strong> {report.ironPackage || "—"}
        {report.ironPackageSource ? ` (${report.ironPackageSource})` : ""}
      </div>

      {report.dayTrucks.some(isRealTruckUnit) ? (
        <div><strong>🛻 Day Shift Truck(s):</strong> {report.dayTrucks.filter(isRealTruckUnit).join(", ")}</div>
      ) : null}
      {report.nightTrucks.some(isRealTruckUnit) ? (
        <div><strong>🚚 Night Shift Truck(s):</strong> {report.nightTrucks.filter(isRealTruckUnit).join(", ")}</div>
      ) : null}
      {report.chemicalSkids.some(Boolean) ? (
        <div><strong>🧪 Chem Add / Chemical Skid(s):</strong> {report.chemicalSkids.filter(Boolean).join(", ")}</div>
      ) : null}

      {report.rentalEquipment.some((item) => item.unit || item.description || item.rentedFrom) ? (
        <>
          <div style={{ marginTop: 12, fontWeight: 700 }}>📦 Rental Equipment</div>
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

      {(report.misc.bleedOffSkid || report.misc.bleedOffValveManifoldUnit || report.misc.containmentCount || report.misc.restraintsType || report.misc.ponyPump === "Yes" || report.misc.fuelCube === "Yes") ? (
        <>
          <div style={{ marginTop: 12, fontWeight: 700 }}>⚠️ Miscellaneous Equipment</div>
          {report.misc.bleedOffSkid ? <div><strong>Bleed Off Skid:</strong> {report.misc.bleedOffSkid}</div> : null}
          {report.misc.bleedOffValveManifoldUnit ? <div><strong>Bleed Off Valve Manifold Unit:</strong> {report.misc.bleedOffValveManifoldUnit}</div> : null}
          {report.misc.containmentCount ? <div><strong># of Containments:</strong> {report.misc.containmentCount}</div> : null}
          {report.misc.restraintsType ? <div><strong>Restraint Type:</strong> {report.misc.restraintsType}</div> : null}
          {report.misc.ponyPump === "Yes" ? <div><strong>Hydraulic Pony Pump:</strong> Yes</div> : null}
          {report.misc.fuelCube === "Yes" ? <div><strong>WS Fuel Cube:</strong> Yes</div> : null}
        </>
      ) : null}

      {report.thirdParty.acidTransports?.some((t) => t.provider || t.unit || t.strap) ? (
        <>
          <div style={{ marginTop: 12, fontWeight: 700 }}>🧪 Acid Equipment</div>
          {report.thirdParty.acidTransports.map((t, i) => {
            if (!(t.provider || t.unit || t.strap)) return null;
            return (
              <div key={i}>
                <strong>Provider:</strong> {t.provider || "—"} | <strong>Unit:</strong> {t.unit || "—"} | <strong>Current Strap:</strong> {t.strap ? `${t.strap} in` : "—"}
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
