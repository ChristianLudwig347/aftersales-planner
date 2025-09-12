"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, ClipboardList, Package, Settings, Sparkles, Wrench, Phone, Mail } from "lucide-react";

/* ----------------------------------------------------------------
   Mitarbeiter / Kapazität
----------------------------------------------------------------- */
const BASE_MINUTES_PER_DAY = 8 * 60; // 480
const BASE_AW_PER_DAY = 96;
const AW_PER_MIN = BASE_AW_PER_DAY / BASE_MINUTES_PER_DAY; // 0.2

type EmployeeCategory = "MECH" | "BODY" | "PREP";
const CATEGORY_LABEL: Record<EmployeeCategory, string> = {
  MECH: "Mechatronik",
  BODY: "Karosserie & Lack",
  PREP: "Aufbereitung",
};
const CATEGORIES: EmployeeCategory[] = ["MECH", "BODY", "PREP"];

type Employee = {
  id: string;
  name: string;
  performance: number; // 50..150 (%)
  category: EmployeeCategory;
};

function capacityFromPerformance(perfPct: number) {
  const minutes = Math.round((BASE_MINUTES_PER_DAY * (perfPct || 100)) / 100);
  const aw = Math.round((BASE_AW_PER_DAY * (perfPct || 100)) / 100);
  return { minutes, aw };
}

/* ----------------------------------------------------------------
   Mitarbeiter anlegen (Name + Leistungsgrad + Rubrik)
----------------------------------------------------------------- */
function CreateEmployee({ onCreate }: { onCreate: (e: Employee) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [performance, setPerformance] = useState<number>(100);
  const [category, setCategory] = useState<EmployeeCategory>("MECH");

  const { minutes, aw } = capacityFromPerformance(performance);

  function submit() {
    const perf = Math.max(50, Math.min(150, Number(performance) || 100));
    onCreate({
      id: `emp-${Math.floor(10000 + Math.random() * 89999)}`,
      name: name.trim() || "Neuer Mitarbeiter",
      performance: perf,
      category,
    });
    setOpen(false);
    setName("");
    setPerformance(100);
    setCategory("MECH");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>+ Mitarbeiter</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader><DialogTitle>Mitarbeiter hinzufügen</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Name</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Max Mustermann" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Leistungsgrad (%)</div>
              <Input
                type="number"
                min={50}
                max={150}
                step={5}
                value={performance}
                onChange={(e) => setPerformance(Number(e.target.value))}
              />
              <div className="mt-1 text-xs text-muted-foreground">
                Kapazität: <span className="font-medium">{minutes} Min</span> / <span className="font-medium">{aw} AW</span> pro Tag
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Rubrik</div>
              <Select value={category} onValueChange={(v) => setCategory(v as EmployeeCategory)}>
                <SelectTrigger><SelectValue placeholder="Rubrik wählen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MECH">Mechatronik</SelectItem>
                  <SelectItem value="BODY">Karosserie & Lack</SelectItem>
                  <SelectItem value="PREP">Aufbereitung</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={submit}>Hinzufügen</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------
   Mock-Aufträge (bestehende Demo-Daten)
----------------------------------------------------------------- */
const initialWorkOrders = [
  {
    id: "WO-10234",
    status: "IN_PROGRESS",
    customer: { name: "Klaus Meier", phone: "+49 171 123456", email: "k.meier@example.com" },
    vehicle: { vin: "WDB1234567890", make: "Mercedes", model: "C-Klasse", year: 2019, mileage: 62450 },
    items: [
      { id: "I1", op: "Bremsen VA wechseln", plannedMin: 90 },
      { id: "I2", op: "Service B", plannedMin: 60 },
    ],
    parts: [
      { sku: "A001", name: "Bremsbelag VA", qty: 1, reserved: true },
      { sku: "A002", name: "Ölfilter", qty: 1, reserved: false },
    ],
    appointment: {
      date: new Date(),
      startHour: 9,
      durationMin: 150,
      bayId: "bay-1",
      technicianId: "t2", // im Drawer einem Mitarbeiter zuordnen
    },
    notes: "Kunde wartet vor Ort. Reifen sind eingelagert.",
  },
  {
    id: "WO-10257",
    status: "AWAITING_APPROVAL",
    customer: { name: "Sabine R.", phone: "+49 160 888888", email: "sabine.r@example.com" },
    vehicle: { vin: "WAUZZZ8V8JA000000", make: "Audi", model: "A3", year: 2018, mileage: 80120 },
    items: [{ id: "I3", op: "Klima-Diagnose", plannedMin: 45 }],
    parts: [],
    appointment: {
      date: addDays(new Date(), 1),
      startHour: 11,
      durationMin: 45,
      bayId: "bay-3",
      technicianId: "t1",
    },
    notes: "Kostenvoranschlag versendet – wartet auf Freigabe.",
  },
];

const kpis = [
  { label: "Auslastung heute", value: "78%", desc: "+4% vs. gestern" },
  { label: "No-Show-Rate", value: "2,1%", desc: "7 Tage rollierend" },
  { label: "Durchlaufzeit", value: "6,2 h", desc: "ø je Auftrag" },
  { label: "Teileverfügbarkeit", value: "91%", desc: "lagernd/reserviert" },
];

/* ----------------------------------------------------------------
   Helper
----------------------------------------------------------------- */
const hours = Array.from({ length: 10 }, (_, i) => 8 + i); // 8–17 Uhr
function slotEnd(startHour: number, durationMin: number) {
  const h = startHour + Math.floor(durationMin / 60);
  const m = durationMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function empName(id: string, employees: Employee[]) {
  return employees.find((e) => e.id === id)?.name ?? "—";
}

/* ----------------------------------------------------------------
   UI-Atoms
----------------------------------------------------------------- */
function StatCard({ label, value, desc }: { label: string; value: string; desc?: string }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {desc ? <CardContent className="pt-0 text-sm text-muted-foreground">{desc}</CardContent> : null}
    </Card>
  );
}

function TopBar({ onQuickAdd }: { onQuickAdd: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Wrench className="h-6 w-6" />
        <h1 className="text-xl font-semibold">Aftersales Planner</h1>
        <Badge variant="secondary" className="rounded-full">MVP</Badge>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Suche: Kunde, VIN, Auftrag…" className="w-72" />
        <Button onClick={onQuickAdd}><Sparkles className="mr-2 h-4 w-4"/>Schnellauftrag</Button>
      </div>
    </div>
  );
}

function LeftNav({ view, setView }: { view: string; setView: (v: string) => void }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: <ClipboardList className="h-4 w-4" /> },
    { id: "calendar", label: "Kalender", icon: <CalendarDays className="h-4 w-4" /> },
    { id: "parts", label: "Teile", icon: <Package className="h-4 w-4" /> },
    { id: "settings", label: "Einstellungen", icon: <Settings className="h-4 w-4" /> },
  ];
  return (
    <div className="w-56 shrink-0">
      <div className="sticky top-0 space-y-1">
        {items.map((it) => (
          <Button
            key={it.id}
            variant={view === it.id ? "default" : "ghost"}
            className={cn("w-full justify-start gap-2 rounded-xl", view === it.id && "shadow")}
            onClick={() => setView(it.id)}
          >
            {it.icon}
            {it.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/* Auftrag-Karte */
function WorkOrderMini({ wo, onOpen, employees }: { wo: any; onOpen: () => void; employees: Employee[] }) {
  const color =
    wo.status === "AWAITING_APPROVAL" ? "bg-yellow-100" :
    wo.status === "IN_PROGRESS" ? "bg-blue-100" : "bg-emerald-100";
  return (
    <motion.div layout onClick={onOpen} whileHover={{ scale: 1.01 }} className={cn("cursor-pointer rounded-xl p-3 text-xs", color)}>
      <div className="flex items-center justify-between font-medium">
        <span>{wo.id}</span>
        <Badge variant="secondary">{wo.status.replaceAll("_", " ")}</Badge>
      </div>
      <div className="mt-1 text-sm">{wo.customer.name} • {wo.vehicle.make} {wo.vehicle.model}</div>
      <div className="text-muted-foreground">
        {String(wo.appointment.startHour).padStart(2, "0")}:00–{slotEnd(wo.appointment.startHour, wo.appointment.durationMin)} • {empName(wo.appointment.technicianId, employees)}
      </div>
    </motion.div>
  );
}

/* ----------------------------------------------------------------
   Kalender: Ressourcen = Rubriken, Zellen zeigen "freie AW" (Ampelfarbe)
----------------------------------------------------------------- */
function CalendarGrid({
  date,
  workOrders,
  employees,
  onOpen,
}: {
  date: Date;
  workOrders: any[];
  employees: Employee[];
  onOpen: (wo: any) => void;
}) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const cellBase = "border border-muted/30 min-h-[120px] p-2";

  const empById = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees]);

  function dailyCapacityAwFor(category: EmployeeCategory) {
    return employees
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + capacityFromPerformance(e.performance).aw, 0);
  }

  function usedAwOn(day: Date, category: EmployeeCategory) {
    const usedMin = workOrders.reduce((acc, w) => {
      if (!isSameDay(w.appointment.date, day)) return acc;
      const emp = empById[w.appointment.technicianId];
      if (!emp || emp.category !== category) return acc;
      return acc + (w.appointment.durationMin || 0);
    }, 0);
    return Math.round(usedMin * AW_PER_MIN);
  }

  function capColorClass(pctFree: number) {
    if (pctFree < 0.05) return "bg-red-100 text-red-700 border-red-200";
    if (pctFree < 0.20) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }

  return (
    <div className="overflow-auto rounded-2xl border">
      <div className="grid grid-cols-[200px_repeat(5,1fr)]">
        <div className="sticky left-0 z-10 bg-muted/30 p-2 text-sm font-medium">Rubrik</div>
        {days.map((d, idx) => (
          <div key={idx} className="bg-muted/30 p-2 text-sm font-medium">
            {format(d, "EEE dd.MM.", { locale: de })}
          </div>
        ))}

        {CATEGORIES.map((cat) => (
          <div key={cat} className="contents">
            <div className="sticky left-0 z-10 bg-background p-2 font-medium">{CATEGORY_LABEL[cat]}</div>

            {days.map((d, col) => {
              const capAw = dailyCapacityAwFor(cat);
              const usedAw = usedAwOn(d, cat);
              const freeAw = Math.max(0, capAw - usedAw);
              const pctFree = capAw > 0 ? freeAw / capAw : 1;

              return (
                <div key={`${cat}-${col}`} className={cellBase}>
                  {/* Badge (ohne Stunden-Skala) */}
                  <div className="flex items-center justify-between">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border", capColorClass(pctFree))}>
                      <span>frei:</span>
                      <b>{freeAw} AW</b>
                      <span className="opacity-70">({usedAw}/{capAw})</span>
                    </span>
                  </div>

                  {/* Aufträge dieser Rubrik & dieses Tages */}
                  <div className="mt-2 space-y-2">
                    {workOrders
                      .filter(wo => isSameDay(wo.appointment.date, d))
                      .filter(wo => {
                        const emp = empById[wo.appointment.technicianId];
                        return !!emp && emp.category === cat;
                      })
                      .map((wo) => (
                        <WorkOrderMini key={wo.id} wo={wo} onOpen={() => onOpen(wo)} employees={employees} />
                      ))}

                    {employees.filter(e => e.category === cat).length === 0 && (
                      <div className="text-[12px] text-muted-foreground">
                        Keine Mitarbeiter in dieser Rubrik angelegt.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
   Drawer: Techniker-Auswahl aus Mitarbeitern
----------------------------------------------------------------- */
function WorkOrderDrawer({
  wo, onChange, onClose, employees,
}: {
  wo: any | null;
  onChange: (w: any) => void;
  onClose: () => void;
  employees: Employee[];
}) {
  const [local, setLocal] = useState<any>(wo);
  useEffect(() => setLocal(wo), [wo]);
  if (!wo) return null;

  function update(path: string, val: any) {
    const next = { ...local };
    const segs = path.split(".");
    let obj: any = next;
    for (let i = 0; i < segs.length - 1; i++) obj = obj[segs[i]];
    obj[segs.at(-1)!] = val;
    setLocal(next);
  }

  const hasEmployees = employees.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        className="fixed right-0 top-0 z-50 h-full w-[440px] overflow-auto border-l bg-background p-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{wo.id} • {wo.customer.name}</h3>
          <Button variant="ghost" onClick={onClose}>Schließen</Button>
        </div>

        <Tabs defaultValue="details" className="mt-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="items">Arbeiten</TabsTrigger>
            <TabsTrigger value="parts">Teile</TabsTrigger>
          </TabsList>

        <TabsContent value="details" className="space-y-3">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Kunde & Fahrzeug</CardTitle>
              <CardDescription>Kontakt & Fahrzeugdaten</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2"><Phone className="h-4 w-4"/><span>{wo.customer.phone}</span></div>
                <div className="flex items-center gap-2"><Mail className="h-4 w-4"/><span>{wo.customer.email}</span></div>
              </div>
              <div className="text-sm text-muted-foreground">
                {wo.vehicle.make} {wo.vehicle.model} • {wo.vehicle.year} • {wo.vehicle.vin}
              </div>
              <Textarea
                value={local?.notes ?? ""}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Anmerkungen zur Annahme, Besonderheiten…"
              />
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Termin & Dispo</CardTitle>
              <CardDescription>Ressourcen & Zeiten</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 items-center text-sm">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Techniker (aus Mitarbeiterliste)</div>
                <Select
                  value={String(local?.appointment.technicianId ?? "")}
                  onValueChange={(v) => update("appointment.technicianId", v)}
                  disabled={!hasEmployees}
                >
                  <SelectTrigger><SelectValue placeholder={hasEmployees ? "Mitarbeiter wählen" : "Erst Mitarbeiter anlegen"} /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} • {CATEGORY_LABEL[e.category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Start (Stunde)</div>
                <Select value={String(local?.appointment.startHour)} onValueChange={(v) => update("appointment.startHour", Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {hours.map((h) => <SelectItem key={h} value={String(h)}>{h}:00</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Dauer (Minuten)</div>
                <Input
                  type="number"
                  value={local?.appointment.durationMin}
                  onChange={(e) => update("appointment.durationMin", Number(e.target.value))}
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
                <Button onClick={() => { onChange(local); onClose(); }}>Speichern</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-3">
          {wo.items.map((it: any) => (
            <Card key={it.id} className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{it.op}</CardTitle>
                <CardDescription>Geplant: {it.plannedMin} min</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="parts" className="space-y-3">
          {wo.parts.length === 0 && (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">Keine Teile reserviert</CardTitle>
                <CardDescription>Fügen Sie benötigte Teile hinzu.</CardDescription>
              </CardHeader>
            </Card>
          )}
          {wo.parts.map((p: any) => (
            <Card key={p.sku} className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.name} • {p.sku}</CardTitle>
                <CardDescription>Menge {p.qty} • {p.reserved ? "reserviert" : "offen"}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>
        </Tabs>
      </motion.div>
    </AnimatePresence>
  );
}

/* Schnellauftrag: Techniker aus Mitarbeitern */
function CreateQuickOrder({ onCreate, employees }: { onCreate: (wo: any) => void; employees: Employee[] }) {
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [technicianId, setTechnicianId] = useState<string>(employees[0]?.id ?? "");
  const [startHour, setStartHour] = useState(10);
  const [durationMin, setDurationMin] = useState(60);

  useEffect(() => {
    if (!technicianId && employees[0]?.id) setTechnicianId(employees[0].id);
  }, [employees]);

  function submit() {
    const wo = {
      id: `WO-${Math.floor(10000 + Math.random() * 89999)}`,
      status: "IN_PROGRESS",
      customer: { name: customer || "Neukunde", phone: "", email: "" },
      vehicle: { vin: "", make: vehicle || "Fahrzeug", model: "", year: 2020, mileage: 0 },
      items: [{ id: "I0", op: "Allgemeine Diagnose", plannedMin: durationMin }],
      parts: [],
      appointment: { date: new Date(), startHour, durationMin, bayId: "", technicianId },
      notes: "Schnellauftrag erstellt.",
    };
    onCreate(wo);
    setOpen(false);
    setCustomer(""); setVehicle("");
    setDurationMin(60);
  }

  const hasEmployees = employees.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Neuen Auftrag anlegen</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader><DialogTitle>Schnellauftrag</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Kunde</div>
              <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="z. B. Max Mustermann"/>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Fahrzeug</div>
              <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="z. B. VW Golf"/>
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Techniker</div>
            <Select value={technicianId} onValueChange={setTechnicianId} disabled={!hasEmployees}>
              <SelectTrigger><SelectValue placeholder={hasEmployees ? "Mitarbeiter wählen" : "Erst Mitarbeiter anlegen"} /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} • {CATEGORY_LABEL[e.category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Start (Stunde)</div>
              <Select value={String(startHour)} onValueChange={(v) => setStartHour(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {hours.map((h) => <SelectItem key={h} value={String(h)}>{h}:00</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Dauer (Minuten)</div>
              <Input type="number" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))}/>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={submit} disabled={!hasEmployees}>Anlegen</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------
   Seite
----------------------------------------------------------------- */
export default function AftersalesPrototype() {
  const [view, setView] = useState("calendar");
  const [today] = useState(new Date());
  const [workOrders, setWorkOrders] = useState<any[]>(initialWorkOrders);
  const [selected, setSelected] = useState<any | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  // beim Laden: Mitarbeiter aus localStorage holen
useEffect(() => {
  try {
    const raw = localStorage.getItem("employees");
    if (raw) setEmployees(JSON.parse(raw));
  } catch {}
}, []);

// bei Änderungen: Mitarbeiter in localStorage sichern
useEffect(() => {
  try {
    localStorage.setItem("employees", JSON.stringify(employees));
  } catch {}
}, [employees]);


  /* Dashboard: Auslastung heute je Rubrik (bleibt wie gehabt) */
  const utilizationByCategory = useMemo(() => {
    const cats: Record<EmployeeCategory, { capMin: number; capAw: number; usedMin: number; usedAw: number }> = {
      MECH: { capMin: 0, capAw: 0, usedMin: 0, usedAw: 0 },
      BODY: { capMin: 0, capAw: 0, usedMin: 0, usedAw: 0 },
      PREP: { capMin: 0, capAw: 0, usedMin: 0, usedAw: 0 },
    };
    for (const e of employees) {
      const cap = capacityFromPerformance(e.performance);
      cats[e.category].capMin += cap.minutes;
      cats[e.category].capAw += cap.aw;
    }
    const empById = Object.fromEntries(employees.map(e => [e.id, e]));
    for (const w of workOrders) {
      if (!isSameDay(w.appointment.date, today)) continue;
      const emp = empById[w.appointment.technicianId];
      if (!emp) continue;
      cats[emp.category].usedMin += w.appointment.durationMin || 0;
    }
    for (const c of Object.values(cats)) c.usedAw = Math.round(c.usedMin * AW_PER_MIN);
    return cats;
  }, [employees, workOrders, today]);

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      <TopBar onQuickAdd={() => setView("calendar")} />

      <div className="mt-4 flex gap-4">
        <LeftNav view={view} setView={setView} />

        <div className="flex-1 space-y-4">
          {view === "dashboard" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {kpis.map((k) => <StatCard key={k.label} label={k.label} value={k.value} desc={k.desc} />)}
              </div>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Kapazität heute je Rubrik</CardTitle>
                  <CardDescription>Bezugsgröße: 8 h / 96 AW pro Mitarbeiter (Leistungsgrad-bereinigt)</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  {CATEGORIES.map(cat => {
                    const row = utilizationByCategory[cat];
                    const pct = row.capMin > 0 ? Math.min(100, Math.round((row.usedMin / row.capMin) * 100)) : 0;
                    return (
                      <div key={cat} className="rounded-xl border p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{CATEGORY_LABEL[cat]}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.usedMin} / {row.capMin} Min • {row.usedAw} / {row.capAw} AW
                          </div>
                        </div>
                        <div className="mt-2 h-2 w-full rounded bg-muted">
                          <div className="h-2 rounded bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{pct}% belegt</div>
                      </div>
                    );
                  })}
                  {employees.length === 0 && (
                    <div className="text-xs text-muted-foreground">
                      Noch keine Mitarbeiter angelegt – füge in den <b>Einstellungen</b> Mitarbeiter hinzu.
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {view === "calendar" && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5"/> Woche {format(today, "w", { locale: de })}
                </div>
                <div className="flex gap-2">
                  <CreateQuickOrder employees={employees} onCreate={(wo) => setWorkOrders([wo, ...workOrders])} />
                  <Button variant="outline" onClick={() => setView("dashboard")}>Zum Dashboard</Button>
                </div>
              </div>
              <CalendarGrid date={today} workOrders={workOrders} employees={employees} onOpen={(wo) => setSelected(wo)} />
            </>
          )}

          {view === "parts" && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Teile – Schnellübersicht</CardTitle>
                <CardDescription>Reservierungen & Mindestbestände (Demo)</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                {workOrders
                  .flatMap(w => w.parts.map((p: any) => ({ ...p, for: w.id })))
                  .map((p: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border p-2">
                      <div>
                        <div className="font-medium">{p.name} • {p.sku}</div>
                        <div className="text-muted-foreground">Auftrag {p.for}</div>
                      </div>
                      <Badge variant={p.reserved ? "default" : "secondary"}>
                        {p.reserved ? "reserviert" : "offen"}
                      </Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {view === "settings" && (
            <>
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Einstellungen</CardTitle>
                  <CardDescription>Demo-Einstellungen (ohne Persistenz)</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 max-w-md">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="mb-1 text-xs text-muted-foreground">Öffnungszeit Start</div>
                      <Select defaultValue="8">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{hours.map(h => <SelectItem key={h} value={String(h)}>{h}:00</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-muted-foreground">Öffnungszeit Ende</div>
                      <Select defaultValue="17">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{hours.map(h => <SelectItem key={h} value={String(h)}>{h}:00</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button disabled>Speichern (Demo)</Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl mt-4">
                <CardHeader className="flex items-center justify-between">
                  <div>
                    <CardTitle>Mitarbeiter</CardTitle>
                    <CardDescription>8 h / 96 AW pro Tag • Leistungsgrad-bereinigt</CardDescription>
                  </div>
                  <CreateEmployee onCreate={(e) => setEmployees([...employees, e])} />
                </CardHeader>
                <CardContent className="grid gap-2">
                  {employees.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Noch keine Mitarbeiter angelegt.</div>
                  ) : (
                    employees.map((e) => {
                      const cap = capacityFromPerformance(e.performance);
                      return (
                        <div key={e.id} className="flex items-center justify-between rounded-xl border p-2 text-sm">
                          <div>
                            <div className="font-medium">{e.name}</div>
                            <div className="text-muted-foreground">
                              Kapazität: {cap.minutes} Min / {cap.aw} AW pro Tag
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{CATEGORY_LABEL[e.category]}</Badge>
                            <Badge>{e.performance}%</Badge>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <WorkOrderDrawer
        wo={selected}
        onChange={(next) => setWorkOrders(workOrders.map(w => w.id === next.id ? next : w))}
        onClose={() => setSelected(null)}
        employees={employees}
      />
    </div>
  );
}
