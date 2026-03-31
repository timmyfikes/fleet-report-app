import React, { useMemo, useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const input = {
  width: "100%",
  padding: "10px",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  fontSize: 16,
  boxSizing: "border-box",
};

const section = {
  borderTop: "1px solid #d1d5db",
  paddingTop: 18,
  marginTop: 18,
};

const row = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

const label = {
  display: "block",
  fontWeight: 600,
  marginBottom: 6,
};

const getStatusColors = (status) => {
  if (status === "OK") return { background: "#dcfce7", border: "1px solid #86efac", color: "#166534" };
  if (status === "DUE") return { background: "#fef9c3", border: "1px solid #fde047", color: "#854d0e" };
  if (status === "OVERDUE") return { background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b" };
  return { background: "#fff", border: "1px solid #e5e7eb", color: "#111827" };
};

const blankRental = () => ({ unit: "", status: "Active", description: "" });
const blankChemical = () => ({ chemical: "", amount: "" });
const blankTruckPm = () => ({ truck: "", miles: "", dueAt: "", qcDue: "", status: "OK" });
const blankTractorPm = () => ({ tractor: "", miles: "", hours: "", dueAt: "", status: "OK" });
const blankPumpPm = () => ({ pump: "", hours: "", fuelAirDue: "", oilDue: "", pm1000Due: "", status: "OK" });

const createInitialState = (fleet = "1") => ({
  date: new Date().toISOString().slice(0, 10),
  fleet,
  shift: "Day",
  employees: {
    dayOperator: "",
    dayAssistant: "",
    nightOperator: "",
    nightAssistant: "",
  },
  pumpUnits: ["", "", ""],
  tractors: ["", "", ""],
  trailers: ["", "", "", "", "", "", "", "", ""],
  ironPackage: '2"',
  dayTrucks: [""],
  nightTrucks: [""],
  chemicalSkids: [""],
  rentalEquipment: [blankRental(), blankRental()],
  misc: {
    bleedOff: "",
    containments: "",
    restraints: "",
  },
  thirdParty: {
    acidTransportProvider: "",
    acidTransportUnit: "",
  },
  wsChemicals: [blankChemical(), blankChemical(), blankChemical()],
  fuel: {
    tankUnit: "",
    trailer: "",
    strap: "",
  },
  pm: {
    trucks: [blankTruckPm(), blankTruckPm()],
    tractors: [blankTractorPm(), blankTractorPm(), blankTractorPm()],
    pumps: [blankPumpPm(), blankPumpPm(), blankPumpPm()],
  },
  partsNeeded: Array(10).fill(""),
  issues: Array(10).fill(""),
});

const fleetTabs = ["1", "2", "3", "4", "5", "6", "7"];

function SavedReportView({ report }) {
  if (!report) return null;

  const renderPmCard = (title, item, keyName) => {
    const statusColors = getStatusColors(item.status);
    return (
      <div style={{ ...statusColors, padding: 10, borderRadius: 10, marginBottom: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
        <div><strong>{keyName}:</strong> {item[keyName.toLowerCase()] || "—"}</div>
        {item.miles ? <div><strong>Current Miles:</strong> {item.miles}</div> : null}
        {item.hours ? <div><strong>Current Hours:</strong> {item.hours}</div> : null}
        {item.dueAt ? <div><strong>Service Due At:</strong> {item.dueAt}</div> : null}
        {item.qcDue ? <div><strong>QC Due Date:</strong> {item.qcDue}</div> : null}
        {item.fuelAirDue ? <div><strong>Fuel / Air Filters Due At:</strong> {item.fuelAirDue}</div> : null}
        {item.oilDue ? <div><strong>Oil Filters Due At:</strong> {item.oilDue}</div> : null}
        {item.pm1000Due ? <div><strong>1000 HR PM Due At:</strong> {item.pm1000Due}</div> : null}
        <div><strong>Status:</strong> {item.status}</div>
      </div>
    );
  };

  return (
    <div style={{ fontSize: 14, lineHeight: 1.6 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>🔧 END-OF-SHIFT INVENTORY & PM REPORT</div>
      <div><strong>Date:</strong> {report.date}</div>
      <div><strong>Fleet #:</strong> {report.fleet}</div>
      <div><strong>Shift:</strong> {report.shift}</div>

      <div style={{ marginTop: 12, fontWeight: 700 }}>Employees</div>
      <div>Day Shift Operator: {report.employees.dayOperator}</div>
      <div>Day Shift Assistant: {report.employees.dayAssistant}</div>
      <div>Night Shift Operator: {report.employees.nightOperator}</div>
      <div>Night Shift Assistant: {report.employees.nightAssistant}</div>

      <div style={{ marginTop: 12, fontWeight: 700 }}>🚛 Equipment Inventory</div>
      <div><strong>Pump Units:</strong> {report.pumpUnits.filter(Boolean).join(", ") || "—"}</div>
      <div><strong>Tractors:</strong> {report.tractors.filter(Boolean).join(", ") || "—"}</div>
      <div><strong>Support Trailers / Floats:</strong> {report.trailers.filter(Boolean).join(", ") || "—"}</div>
      <div><strong>Iron Package:</strong> {report.ironPackage}</div>
      <div><strong>Day Shift Truck(s):</strong> {report.dayTrucks.filter(Boolean).join(", ") || "—"}</div>
      <div><strong>Night Shift Truck(s):</strong> {report.nightTrucks.filter(Boolean).join(", ") || "—"}</div>
      <div><strong>Chem Add / Chemical Skid(s):</strong> {report.chemicalSkids.filter(Boolean).join(", ") || "—"}</div>

      <div style={{ marginTop: 12, fontWeight: 700 }}>Rental Equipment</div>
      {report.rentalEquipment.map((item, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <div><strong>Unit #:</strong> {item.unit || "—"} | <strong>Status:</strong> {item.status}</div>
          <div><strong>Description:</strong> {item.description || "—"}</div>
        </div>
      ))}

      <div style={{ marginTop: 12, fontWeight: 700 }}>⚠️ Miscellaneous Equipment</div>
      <div><strong>Bleed Off #:</strong> {report.misc.bleedOff || "—"}</div>
      <div><strong># of Containments:</strong> {report.misc.containments || "—"}</div>
      <div><strong>Restraints:</strong> {report.misc.restraints || "—"}</div>

      <div style={{ marginTop: 12, fontWeight: 700 }}>⚠️ Third Party Equipment</div>
      <div><strong>Acid Transport Provider:</strong> {report.thirdParty.acidTransportProvider || "—"}</div>
      <div><strong>Acid Transport Unit #:</strong> {report.thirdParty.acidTransportUnit || "—"}</div>

      <div style={{ marginTop: 12, fontWeight: 700 }}>🧪 WS Chemicals On Hand</div>
      {report.wsChemicals.map((item, i) => (
        <div key={i}>• {item.chemical || "—"} | Amount: {item.amount || "—"}</div>
      ))}

      <div style={{ marginTop: 12, fontWeight: 700 }}>⛽ Fuel Status</div>
      <div><strong>Tank Unit #:</strong> {report.fuel.tankUnit || "—"} | <strong>Trailer #:</strong> {report.fuel.trailer || "—"}</div>
      <div><strong>Fuel Strap Reading:</strong> {report.fuel.strap || "—"}</div>

      <div style={{ marginTop: 12, fontWeight: 700 }}>🛠 Scheduled Maintenance (PM Status)</div>
      <div style={{ marginTop: 8, fontWeight: 700 }}>🛻 Trucks</div>
      {report.pm.trucks.map((item, i) => (
        <div key={i}>{renderPmCard(`Truck ${i + 1}`, item, "Truck")}</div>
      ))}

      <div style={{ marginTop: 8, fontWeight: 700 }}>🚜 Tractors</div>
      {report.pm.tractors.map((item, i) => (
        <div key={i}>{renderPmCard(`Tractor ${i + 1}`, item, "Tractor")}</div>
      ))}

      <div style={{ marginTop: 8, fontWeight: 700 }}>🪛 Pumps</div>
      {report.pm.pumps.map((item, i) => (
        <div key={i}>{renderPmCard(`Pump ${i + 1}`, item, "Pump")}</div>
      ))}

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
}

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
      acc[fleet] = createInitialState(fleet);
      return acc;
    }, {})
  );
  const [savedReports, setSavedReports] = useState([]);

useEffect(() => {
  loadReports();
}, []);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);

  const form = fleetForms[activeFleet];
  const visibleSavedReports = savedReports.filter((report) => String(report.fleet) === String(activeFleet));

  const updateFleetForm = (updater) => {
    setFleetForms((prev) => ({
      ...prev,
      [activeFleet]: updater(prev[activeFleet]),
    }));
  };

  const updateField = (key, value) => updateFleetForm((prev) => ({ ...prev, [key]: value }));
  const updateNested = (group, key, value) => updateFleetForm((prev) => ({ ...prev, [group]: { ...prev[group], [key]: value } }));

  const updateArray = (key, index, value) => {
    updateFleetForm((prev) => {
      const next = [...prev[key]];
      next[index] = value;
      return { ...prev, [key]: next };
    });
  };

  const updateEmployee = (key, value) => updateFleetForm((prev) => ({ ...prev, employees: { ...prev.employees, [key]: value } }));

  const updateRental = (index, key, value) => {
    updateFleetForm((prev) => {
      const next = [...prev.rentalEquipment];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, rentalEquipment: next };
    });
  };

  const updateChemical = (index, key, value) => {
    updateFleetForm((prev) => {
      const next = [...prev.wsChemicals];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, wsChemicals: next };
    });
  };

  const updatePm = (group, index, key, value) => {
    updateFleetForm((prev) => {
      const nextGroup = [...prev.pm[group]];
      nextGroup[index] = { ...nextGroup[index], [key]: value };
      return { ...prev, pm: { ...prev.pm, [group]: nextGroup } };
    });
  };

  const summary = useMemo(() => {
    return `🔧 END-OF-SHIFT INVENTORY & PM REPORT\nDate: ${form.date}\nFleet #: ${form.fleet}\nShift: ${form.shift}\n\nEmployees:\nDay Shift Operator: ${form.employees.dayOperator}\nDay Shift Assistant: ${form.employees.dayAssistant}\nNight Shift Operator: ${form.employees.nightOperator}\nNight Shift Assistant: ${form.employees.nightAssistant}\n\nPump Units:\n• FPU-${form.pumpUnits[0]}\n• FPU-${form.pumpUnits[1]}\n• FPU-${form.pumpUnits[2]}\n\nTractors:\n• RT-${form.tractors[0]}\n• RT-${form.tractors[1]}\n• RT-${form.tractors[2]}\n\nSupport Trailers / Floats:\n• ${form.trailers[0]}\n• ${form.trailers[1]}\n• ${form.trailers[2]}\n• ${form.trailers[3]}\n• ${form.trailers[4]}\n• ${form.trailers[5]}
• ${form.trailers[6]}
• ${form.trailers[7]}
• ${form.trailers[8]}\n\nIron Package: ${form.ironPackage}\n\nIssues / Notes / Follow-Ups:\n• ${form.issues[0]}\n• ${form.issues[1]}`;
  }, [form]);

  const loadReports = async () => {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  setSavedReports(data.map((r) => ({ id: r.id, ...r.report_data, fleet: r.fleet })));
};

const saveReport = async () => {
  const { error } = await supabase.from("reports").insert([
    {
      fleet: form.fleet,
      report_data: form,
    },
  ]);

  if (error) {
    alert("Error saving report");
    console.error(error);
    return;
  }

  loadReports();
};

  const loadLastReport = () => {
    const lastForFleet = savedReports.find((report) => String(report.fleet) === String(activeFleet));
    if (!lastForFleet) return;
    updateFleetForm(() => ({ ...lastForFleet, id: undefined, date: new Date().toISOString().slice(0, 10), fleet: activeFleet }));
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteReport = async (reportId) => {
  if (deletePassword !== "1775") {
    setDeleteMessage("Wrong password");
    return;
  }

  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId);

  if (error) {
    console.error(error);
    setDeleteMessage("Error deleting report");
    return;
  }

  loadReports();

  if (selectedReport?.id === reportId) setSelectedReport(null);

  setDeleteMessage("Report deleted");
  setDeletePassword("");
};

  const viewSavedReport = (report) => {
    setSelectedReport(report);
  };

  const loadSavedReport = (report) => {
    setActiveFleet(String(report.fleet));
    setFleetForms((prev) => ({
      ...prev,
      [String(report.fleet)]: { ...report, id: undefined },
    }));
    setSelectedReport(null);
  };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: 16 }}>
      <div style={{ maxWidth: 1050, margin: "0 auto" }}>
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {fleetTabs.map((fleet) => (
              <button
                key={fleet}
                onClick={() => setActiveFleet(fleet)}
                style={{
                  ...input,
                  width: "auto",
                  padding: "10px 14px",
                  cursor: "pointer",
                  border: activeFleet === fleet ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: activeFleet === fleet ? "#dbeafe" : "#ffffff",
                  color: "#111827",
                  fontWeight: 700,
                }}
              >
                Fleet {fleet}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/3/3a/Logo_placeholder.png" alt="WS Energy" style={{ height: 40, borderRadius: 8 }} />
            <h1 style={{ margin: 0, fontSize: 28 }}>🔧 END-OF-SHIFT INVENTORY & PM REPORT</h1>
          </div>
          <p style={{ color: "#475569", marginBottom: 0 }}>Exact template version. Fill it out once, then use load last report and only change what changed.</p>
        </div>

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
                  <option>Day</option>
                  <option>Night</option>
                </select>
              </div>
            </div>

            <div style={section}>
              <h3>Employees</h3>
              <div style={row}>
                <div><label style={label}>Day Shift Operator</label><input style={input} value={form.employees.dayOperator} onChange={(e) => updateEmployee("dayOperator", e.target.value)} /></div>
                <div><label style={label}>Day Shift Assistant</label><input style={input} value={form.employees.dayAssistant} onChange={(e) => updateEmployee("dayAssistant", e.target.value)} /></div>
                <div><label style={label}>Night Shift Operator</label><input style={input} value={form.employees.nightOperator} onChange={(e) => updateEmployee("nightOperator", e.target.value)} /></div>
                <div><label style={label}>Night Shift Assistant</label><input style={input} value={form.employees.nightAssistant} onChange={(e) => updateEmployee("nightAssistant", e.target.value)} /></div>
              </div>
            </div>

            <div style={section}>
              <h3>🚛 EQUIPMENT INVENTORY</h3>
              <div style={row}>
                <div>
                  <label style={label}>Pump Units</label>
                  {form.pumpUnits.map((v, i) => (
                    <input key={i} style={{ ...input, marginBottom: 8 }} placeholder="FPU-_____" value={v} onChange={(e) => updateArray("pumpUnits", i, e.target.value)} />
                  ))}
                </div>
                <div>
                  <label style={label}>Tractors</label>
                  {form.tractors.map((v, i) => (
                    <input key={i} style={{ ...input, marginBottom: 8 }} placeholder="RT-_____" value={v} onChange={(e) => updateArray("tractors", i, e.target.value)} />
                  ))}
                </div>
                <div>
                  <label style={label}>Support Trailers / Floats</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div>
                      {form.trailers.slice(0, 3).map((v, i) => {
                        let placeholder = "";
                        if (i === 0) placeholder = "CT-_____";
                        else placeholder = "FLT-_____";
                        return (
                          <input
                            key={i}
                            style={{ ...input, marginBottom: 8 }}
                            placeholder={placeholder}
                            value={v}
                            onChange={(e) => updateArray("trailers", i, e.target.value)}
                          />
                        );
                      })}
                    </div>
                    <div>
                      {form.trailers.slice(3, 6).map((v, i) => (
                        <input
                          key={i + 3}
                          style={{ ...input, marginBottom: 8 }}
                          placeholder="C-_____"
                          value={v}
                          onChange={(e) => updateArray("trailers", i + 3, e.target.value)}
                        />
                      ))}
                    </div>
                    <div>
                      {form.trailers.slice(6, 9).map((v, i) => (
                        <input
                          key={i + 6}
                          style={{ ...input, marginBottom: 8 }}
                          placeholder={i === 0 ? "MIT-_____" : "C-_____"}
                          value={v}
                          onChange={(e) => updateArray("trailers", i + 6, e.target.value)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ ...row, marginTop: 8 }}>
                <div>
                  <label style={label}>Iron Package</label>
                  <select style={input} value={form.ironPackage} onChange={(e) => updateField("ironPackage", e.target.value)}>
                    <option value={'2"'}>2”</option>
                    <option value={'3"'}>3”</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={section}>
              <div style={row}>
                <div>
                  <h3>Day Shift Truck(s)</h3>
                  {form.dayTrucks.map((v, i) => (
                    <input key={i} style={{ ...input, marginBottom: 8 }} placeholder="Truck #_____" value={v} onChange={(e) => updateArray("dayTrucks", i, e.target.value)} />
                  ))}
                </div>
                <div>
                  <h3>Night Shift Truck(s)</h3>
                  {form.nightTrucks.map((v, i) => (
                    <input key={i} style={{ ...input, marginBottom: 8 }} placeholder="Truck #_____" value={v} onChange={(e) => updateArray("nightTrucks", i, e.target.value)} />
                  ))}
                </div>
              </div>
            </div>

            <div style={section}>
              <h3>Chem Add / Chemical Skid(s)</h3>
              {form.chemicalSkids.map((v, i) => (
                <input key={i} style={{ ...input, marginBottom: 8 }} placeholder="Chemical Skid #_____" value={v} onChange={(e) => updateArray("chemicalSkids", i, e.target.value)} />
              ))}
            </div>

            <div style={section}>
              <h3>Rental Equipment</h3>
              {form.rentalEquipment.map((item, i) => (
                <div key={i} style={{ ...card, marginBottom: 10, padding: 12 }}>
                  <div style={row}>
                    <div><label style={label}>Unit #</label><input style={input} value={item.unit} onChange={(e) => updateRental(i, "unit", e.target.value)} /></div>
                    <div><label style={label}>Status</label><select style={input} value={item.status} onChange={(e) => updateRental(i, "status", e.target.value)}><option>Active</option><option>Standby</option></select></div>
                  </div>
                  <div style={{ marginTop: 8 }}><label style={label}>Description</label><input style={input} value={item.description} onChange={(e) => updateRental(i, "description", e.target.value)} /></div>
                </div>
              ))}
            </div>

            <div style={section}>
              <h3>⚠️ MISCELLANEOUS EQUIPMENT</h3>
              <div style={row}>
                <div><label style={label}>Bleed Off #</label><input style={input} value={form.misc.bleedOff} onChange={(e) => updateNested("misc", "bleedOff", e.target.value)} /></div>
                <div><label style={label}># of Containments</label><input style={input} value={form.misc.containments} onChange={(e) => updateNested("misc", "containments", e.target.value)} /></div>
                <div>
  <label style={label}>Restraints</label>
  <select
    style={input}
    value={form.misc.restraints}
    onChange={(e) => updateNested("misc", "restraints", e.target.value)}
  >
    <option value="">Select</option>
    <option value="Yes">Yes</option>
    <option value="No">No</option>
  </select>
</div>
              </div>
            </div>

            <div style={section}>
              <h3>⚠️ THIRD PARTY EQUIPMENT</h3>
              <div style={row}>
                <div><label style={label}>Acid Transport Provider</label><input style={input} value={form.thirdParty.acidTransportProvider} onChange={(e) => updateNested("thirdParty", "acidTransportProvider", e.target.value)} /></div>
                <div><label style={label}>Acid Transport Unit #</label><input style={input} value={form.thirdParty.acidTransportUnit} onChange={(e) => updateNested("thirdParty", "acidTransportUnit", e.target.value)} /></div>
              </div>
            </div>

            <div style={section}>
              <h3>🧪 WS CHEMICALS ON HAND</h3>
              {form.wsChemicals.map((item, i) => (
                <div key={i} style={{ ...row, marginBottom: 8 }}>
                  <div><label style={label}>Chemical</label><input style={input} value={item.chemical} onChange={(e) => updateChemical(i, "chemical", e.target.value)} /></div>
                  <div><label style={label}>Amount</label><input style={input} value={item.amount} onChange={(e) => updateChemical(i, "amount", e.target.value)} /></div>
                </div>
              ))}
            </div>

            <div style={section}>
              <h3>⛽ FUEL STATUS</h3>
              <div style={row}>
                <div><label style={label}>Tank Unit #</label><input style={input} value={form.fuel.tankUnit} onChange={(e) => updateNested("fuel", "tankUnit", e.target.value)} /></div>
                <div><label style={label}>Trailer #</label><input style={input} value={form.fuel.trailer} onChange={(e) => updateNested("fuel", "trailer", e.target.value)} /></div>
                <div><label style={label}>Fuel Strap Reading</label><input style={input} value={form.fuel.strap} onChange={(e) => updateNested("fuel", "strap", e.target.value)} /></div>
              </div>
            </div>

            <div style={section}>
              <h3>🛠 SCHEDULED MAINTENANCE (PM STATUS)</h3>
              <h4>🛻 TRUCKS</h4>
              {form.pm.trucks.map((item, i) => {
                const statusColors = getStatusColors(item.status);
                return (
                  <div key={i} style={{ ...card, ...statusColors, marginBottom: 10, padding: 12 }}>
                    <div style={row}>
                      <div><label style={label}>Truck #</label><input style={input} value={item.truck} onChange={(e) => updatePm("trucks", i, "truck", e.target.value)} /></div>
                      <div><label style={label}>Current Miles</label><input style={input} value={item.miles} onChange={(e) => updatePm("trucks", i, "miles", e.target.value)} /></div>
                      <div><label style={label}>Service Due At</label><input style={input} value={item.dueAt} onChange={(e) => updatePm("trucks", i, "dueAt", e.target.value)} /></div>
                      <div><label style={label}>QC Due Date</label><input style={input} value={item.qcDue} onChange={(e) => updatePm("trucks", i, "qcDue", e.target.value)} /></div>
                      <div><label style={label}>Status</label><select style={input} value={item.status} onChange={(e) => updatePm("trucks", i, "status", e.target.value)}><option>OK</option><option>DUE</option><option>OVERDUE</option></select></div>
                    </div>
                  </div>
                );
              })}

              <h4>🚜 TRACTORS</h4>
              {form.pm.tractors.map((item, i) => {
                const statusColors = getStatusColors(item.status);
                return (
                  <div key={i} style={{ ...card, ...statusColors, marginBottom: 10, padding: 12 }}>
                    <div style={row}>
                      <div><label style={label}>Tractor #</label><input style={input} value={item.tractor} onChange={(e) => updatePm("tractors", i, "tractor", e.target.value)} /></div>
                      <div><label style={label}>Current Miles</label><input style={input} value={item.miles} onChange={(e) => updatePm("tractors", i, "miles", e.target.value)} /></div>
                      <div><label style={label}>Current Hours</label><input style={input} value={item.hours} onChange={(e) => updatePm("tractors", i, "hours", e.target.value)} /></div>
                      <div><label style={label}>Next Service Due At</label><input style={input} value={item.dueAt} onChange={(e) => updatePm("tractors", i, "dueAt", e.target.value)} /></div>
                      <div><label style={label}>Status</label><select style={input} value={item.status} onChange={(e) => updatePm("tractors", i, "status", e.target.value)}><option>OK</option><option>DUE</option><option>OVERDUE</option></select></div>
                    </div>
                  </div>
                );
              })}

              <h4>🪛 PUMPS</h4>
              {form.pm.pumps.map((item, i) => {
                const statusColors = getStatusColors(item.status);
                return (
                  <div key={i} style={{ ...card, ...statusColors, marginBottom: 10, padding: 12 }}>
                    <div style={row}>
                      <div><label style={label}>Pump #</label><input style={input} value={item.pump} onChange={(e) => updatePm("pumps", i, "pump", e.target.value)} /></div>
                      <div><label style={label}>Current Hours</label><input style={input} value={item.hours} onChange={(e) => updatePm("pumps", i, "hours", e.target.value)} /></div>
                      <div><label style={label}>Fuel / Air Filters Due At</label><input style={input} value={item.fuelAirDue} onChange={(e) => updatePm("pumps", i, "fuelAirDue", e.target.value)} /></div>
                      <div><label style={label}>Oil Filters Due At</label><input style={input} value={item.oilDue} onChange={(e) => updatePm("pumps", i, "oilDue", e.target.value)} /></div>
                      <div><label style={label}>1000 HR PM Due At</label><input style={input} value={item.pm1000Due} onChange={(e) => updatePm("pumps", i, "pm1000Due", e.target.value)} /></div>
                      <div><label style={label}>Status</label><select style={input} value={item.status} onChange={(e) => updatePm("pumps", i, "status", e.target.value)}><option>OK</option><option>DUE</option><option>OVERDUE</option></select></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={section}>
              <h3>🛢️ OIL / PARTS / SUPPLIES NEEDED</h3>
              {form.partsNeeded.map((v, i) => (
                <input key={i} style={{ ...input, marginBottom: 8 }} value={v} onChange={(e) => updateArray("partsNeeded", i, e.target.value)} />
              ))}
            </div>

            <div style={section}>
              <h3>⚠️ ISSUES / NOTES / FOLLOW-UPS</h3>
              {form.issues.map((v, i) => (
                <input key={i} style={{ ...input, marginBottom: 8 }} value={v} onChange={(e) => updateArray("issues", i, e.target.value)} />
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
              <button onClick={saveReport} style={{ ...input, width: "auto", cursor: "pointer", background: "#111827", color: "white", border: "none", padding: "12px 16px" }}>Save Report</button>
              <button onClick={loadLastReport} style={{ ...input, width: "auto", cursor: "pointer", background: "#e2e8f0", border: "none", padding: "12px 16px" }}>Load Last Report</button>
              <button onClick={copySummary} style={{ ...input, width: "auto", cursor: "pointer", background: "#dbeafe", border: "none", padding: "12px 16px" }}>Copy Summary</button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <div style={card}>
              <h3 style={{ marginTop: 0 }}>{selectedReport ? "Saved Report View" : "Preview"}</h3>
              {selectedReport ? (
                <SavedReportView report={selectedReport} />
              ) : (
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, margin: 0 }}>{summary}</pre>
              )}
            </div>

            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Saved Reports – Fleet {activeFleet}</h3>
              <div style={{ marginBottom: 12 }}>
                <label style={label}>Delete Password</label>
                <input
                  style={input}
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter password to delete"
                />
                {deleteMessage ? (
                  <div style={{ marginTop: 6, fontSize: 14, color: deleteMessage === "Wrong password" ? "#b91c1c" : "#166534" }}>
                    {deleteMessage}
                  </div>
                ) : null}
              </div>

              {visibleSavedReports.length === 0 ? (
                <p style={{ color: "#64748b" }}>No saved reports yet.</p>
              ) : (
                visibleSavedReports.map((r) => (
                  <div key={r.id} style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10, marginTop: 10 }}>
                    <strong>Fleet {r.fleet || "No Fleet"}</strong>
                    <div>{r.shift} shift • {r.date}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      <button
                        onClick={() => viewSavedReport(r)}
                        style={{
                          background: "#dbeafe",
                          color: "#1d4ed8",
                          border: "1px solid #93c5fd",
                          borderRadius: 10,
                          padding: "8px 10px",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        View Report
                      </button>
                      <button
                        onClick={() => loadSavedReport(r)}
                        style={{
                          background: "#dcfce7",
                          color: "#166534",
                          border: "1px solid #86efac",
                          borderRadius: 10,
                          padding: "8px 10px",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Load This Report
                      </button>
                      <button
                        onClick={() => deleteReport(r.id)}
                        style={{
                          background: "#fee2e2",
                          color: "#991b1b",
                          border: "1px solid #fca5a5",
                          borderRadius: 10,
                          padding: "8px 10px",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Delete Report
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
