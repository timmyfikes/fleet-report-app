// Keep maintenance readings attached to equipment identities, never row positions.
export function reconcilePm(form) {
  const pm = form.pm || {};
  const rows = (units, existing, key, defaults) => units.map((unit) => ({
    ...defaults,
    ...(unit ? existing?.find((item) => item?.[key] === unit) : null),
    [key]: unit || "",
  }));
  const trucks = [form.dayTrucks?.[0], form.nightTrucks?.[0],
    ...(form.dayTrucks || []).slice(1), ...(form.nightTrucks || []).slice(1)]
    .map((unit) => /^C-\d+$/.test(unit || "") ? unit : "");
  const generators = [];
  if (form.tractors?.includes("RT-13")) generators.push("RT-13");
  if (form.commandCenters?.some((cc) => cc?.unit === "CT-007")) generators.push("CT-007");
  return { ...form, pm: {
    ...pm,
    trucks: rows(trucks, pm.trucks, "truck", { miles: "", dueAt: "", engineHours: "", engineHoursDueAt: "", qcDue: "", status: "OK" }),
    tractors: rows(form.tractors || [], pm.tractors, "tractor", { miles: "", dueAt: "", hours: "", hoursDueAt: "", qcDue: "", status: "OK" }),
    pumps: rows(form.pumpUnits || [], pm.pumps, "pump", { hours: "", fuelAirDue: "", oilDue: "", pm1000Due: "", status: "OK" }),
    generators: rows(generators, pm.generators, "unit", { hours: "", dueAt: "", status: "OK" }),
  } };
}
