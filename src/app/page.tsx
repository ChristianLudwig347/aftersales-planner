"use client";
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, startOfWeek, addHours, isSameDay } from "date-fns";
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
import { CalendarDays, ClipboardList, Clock, Package, Settings, Sparkles, Wrench, Phone, Mail } from "lucide-react";

// --------- mock data ---------
const bays = [
  { id: "bay-1", name: "Hebebühne 1" },
  { id: "bay-2", name: "Hebebühne 2" },
  { id: "bay-3", name: "Diagnose" },
];

const technicians = [
  { id: "t1", name: "Alex F.", skills: ["HV", "Diagnose"], hourlyRate: 78 },
  { id: "t2", name: "Mara K.", skills: ["Mechanik"], hourlyRate: 64 },
  { id: "t3", name: "Jörg P.", skills: ["Karosserie"], hourlyRate: 60 },
];

const initialWorkOrders = [
  {
    id: "WO-10234",
    status: "IN_PROGRESS",
    customer: { name: "Klaus Meier", phone: "+49 171 123456", email: "k.meier@example.com" },
    vehicle: { vin: "WDB1234567890", make: "Mercedes", model: "C‑Klasse", year: 2019, mileage: 62450 },
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
      technicianId: "t2",
    },
    notes: "Kunde wartet vor Ort. Reifen sind eingelagert.",
  },
  {
    id: "WO-10257",
    status: "AWAITING_APPROVAL",
    customer: { name: "Sabine R.", phone: "+49 160 888888", email: "sabine.r@example.com" },
    vehicle: { vin: "WAUZZZ8V8JA000000", make: "Audi", model: "A3", year: 2018, mileage: 80120 },
    items: [
      { id: "I3", op: "Klima‑Diagnose", plannedMin: 45 },
    ],
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
  { label: "No‑Show‑Rate", value: "2,1%", desc: "7 Tage rollierend" },
  { label: "Durchlaufzeit", value: "6,2 h", desc: "ø je Auftrag" },
  { label: "Teileverfügbarkeit", value: "91%", desc: "lagernd/reserviert" },
];

// --------- small helpers ---------
const hours = Array.from({ length: 10 }, (_, i) => 8 + i); // 8–17 Uhr

function slotEnd(startHour: number, durationMin: number) {
  const h = startHour + Math.floor(durationMin / 60);
  const m = durationMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function bayName(id: string) {
  return bays.find((b) => b.id === id)?.name ?? id;
}
function techName(id: string) {
  return technicians.find((t) => t.id === id)?.name ?? id;
}

// --------- components ---------
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

function WorkOrderMini({ wo, onOpen }: { wo: any; onOpen: () => void }) {
  const color = wo.status === "AWAITING_APPROVAL" ? "bg-yellow-100" : wo.status === "IN_PROGRESS" ? "bg-blue-100" : "bg-emerald-100";
  return (
    <motion.div layout onClick={onOpen} whileHover={{ scale: 1.01 }} className={cn("cursor-pointer rounded-xl p-3 text-xs", color)}>
      <div className="flex items-center justify-between font-medium">
        <span>{wo.id}</span>
        <Badge variant="secondary">{wo.status.replaceAll("_", " ")}</Badge>
      </div>
      <div className="mt-1 text-sm">{wo.customer.name} • {wo.vehicle.make} {wo.vehicle.model}</div>
      <div className="text-muted-foreground">{format(wo.appointment.date, "EEE dd.MM.", { locale: de })} {String(wo.appointment.startHour).padStart(2, "0")}:00–{slotEnd(wo.appointment.startHour, wo.appointment.durationMin)} • {bayName(wo.appointment.bayId)}</div>
    </motion.div>
  );
}

function CalendarGrid({ date, workOrders, onOpen }: { date: Date; workOrders: any[]; onOpen: (wo: any) => void }) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const cellBase = "border border-muted/30 min-h-[88px] p-2";

  return (
    <div className="overflow-auto rounded-2xl border">
      <div className="grid grid-cols-[160px_repeat(5,1fr)]">
        <div className="sticky left-0 z-10 bg-muted/30 p-2 text-sm font-medium">Ressource</div>
        {days.map((d, idx) => (
          <div key={idx} className="bg-muted/30 p-2 text-sm font-medium">
            {format(d, "EEE dd.MM.", { locale: de })}
          </div>
        ))}
        {bays.map((bay) => (
          <React.Fragment key={bay.id}>
            <div className="sticky left-0 z-10 bg-background p-2 font-medium">{bay.name}</div>
            {days.map((d, col) => (
              <div key={`${bay.id}-${col}`} className={cellBase}>
                <div className="grid grid-cols-5 gap-1 text-[11px] text-muted-foreground">
                  {hours.map((h) => (
                    <div key={h} className="border border-dashed rounded p-1 text-center">{h}:00</div>
                  ))}
                </div>
                <div className="mt-2 space-y-2">
                  {workOrders.filter(wo => wo.appointment.bayId === bay.id && isSameDay(wo.appointment.date, d)).map((wo) => (
                    <WorkOrderMini key={wo.id} wo={wo} onOpen={() => onOpen(wo)} />
                  ))}
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function WorkOrderDrawer({ wo, onChange, onClose }: { wo: any | null; onChange: (w: any) => void; onClose: () => void }) {
  const [local, setLocal] = useState<any>(wo);
  React.useEffect(() => setLocal(wo), [wo]);
  if (!wo) return null;

  function update(path: string, val: any) {
    const next = { ...local };
    const segs = path.split(".");
    let obj: any = next;
    for (let i = 0; i < segs.length - 1; i++) obj = obj[segs[i]];
    obj[segs.at(-1)!] = val;
    setLocal(next);
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }} className="fixed right-0 top-0 z-50 h-full w-[440px] overflow-auto border-l bg-background p-4 shadow-xl">
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
                <div className="text-sm text-muted-foreground">{wo.vehicle.make} {wo.vehicle.model} • {wo.vehicle.year} • {wo.vehicle.vin}</div>
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
                  <div className="mb-1 text-xs text-muted-foreground">Techniker</div>
                  <Select value={local?.appointment.technicianId} onValueChange={(v) => update("appointment.technicianId", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {technicians.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Hebebühne</div>
                  <Select value={local?.appointment.bayId} onValueChange={(v) => update("appointment.bayId", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {bays.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
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
                  <Input type="number" value={local?.appointment.durationMin} onChange={(e) => update("appointment.durationMin", Number(e.target.value))} />
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

function CreateQuickOrder({ onCreate }: { onCreate: (wo: any) => void }) {
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [bayId, setBayId] = useState(bays[0].id);
  const [technicianId, setTechnicianId] = useState(technicians[0].id);
  const [startHour, setStartHour] = useState(10);
  const [durationMin, setDurationMin] = useState(60);

  function submit() {
    const wo = {
      id: `WO-${Math.floor(10000 + Math.random() * 89999)}`,
      status: "IN_PROGRESS",
      customer: { name: customer || "Neukunde", phone: "", email: "" },
      vehicle: { vin: "", make: vehicle || "Fahrzeug", model: "", year: 2020, mileage: 0 },
      items: [{ id: "I0", op: "Allgemeine Diagnose", plannedMin: durationMin }],
      parts: [],
      appointment: { date: new Date(), startHour, durationMin, bayId, technicianId },
      notes: "Schnellauftrag erstellt.",
    };
    onCreate(wo);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Neuen Auftrag anlegen</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Schnellauftrag</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Kunde</div>
              <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="z. B. Max Mustermann"/>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Fahrzeug</div>
              <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="z. B. VW Golf"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Hebebühne</div>
              <Select value={bayId} onValueChange={setBayId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {bays.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Techniker</div>
              <Select value={technicianId} onValueChange={setTechnicianId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
            <Button onClick={submit}>Anlegen</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AftersalesPrototype() {
  const [view, setView] = useState("calendar");
  const [today] = useState(new Date());
  const [workOrders, setWorkOrders] = useState<any[]>(initialWorkOrders);
  const [selected, setSelected] = useState<any | null>(null);

  const todaysWO = useMemo(() => workOrders.filter(w => isSameDay(w.appointment.date, today)), [workOrders, today]);

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
                  <CardTitle>Offene Freigaben</CardTitle>
                  <CardDescription>Aufträge, die auf Kundenfreigabe warten</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {workOrders.filter(w => w.status === "AWAITING_APPROVAL").map((wo) => (
                    <div key={wo.id} className="flex items-center justify-between rounded-xl border p-3">
                      <div>
                        <div className="font-medium">{wo.id} • {wo.customer.name}</div>
                        <div className="text-sm text-muted-foreground">{wo.vehicle.make} {wo.vehicle.model} • {format(wo.appointment.date, "dd.MM.", { locale: de })} {wo.appointment.startHour}:00</div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setSelected(wo)}>Details</Button>
                        <Button onClick={() => { wo.status = "IN_PROGRESS"; setWorkOrders([...workOrders]); }}>Freigabe erfassen</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {view === "calendar" && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold flex items-center gap-2"><CalendarDays className="h-5 w-5"/> Woche {format(today, "w", { locale: de })}</div>
                <div className="flex gap-2">
                  <CreateQuickOrder onCreate={(wo) => setWorkOrders([wo, ...workOrders])} />
                  <Button variant="outline" onClick={() => setView("dashboard")}>Zum Dashboard</Button>
                </div>
              </div>
              <CalendarGrid date={today} workOrders={workOrders} onOpen={(wo) => setSelected(wo)} />
            </>
          )}

          {view === "parts" && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Teile – Schnellübersicht</CardTitle>
                <CardDescription>Reservierungen & Mindestbestände (Demo)</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                {workOrders.flatMap(w => w.parts.map((p: any) => ({ ...p, for: w.id }))).map((p: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border p-2">
                    <div>
                      <div className="font-medium">{p.name} • {p.sku}</div>
                      <div className="text-muted-foreground">Auftrag {p.for}</div>
                    </div>
                    <Badge variant={p.reserved ? "default" : "secondary"}>{p.reserved ? "reserviert" : "offen"}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {view === "settings" && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Einstellungen</CardTitle>
                <CardDescription>Demo‑Einstellungen (ohne Persistenz)</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 max-w-md">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Öffnungszeit Start</div>
                    <Select defaultValue="8"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{hours.map(h => <SelectItem key={h} value={String(h)}>{h}:00</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Öffnungszeit Ende</div>
                    <Select defaultValue="17"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{hours.map(h => <SelectItem key={h} value={String(h)}>{h}:00</SelectItem>)}</SelectContent></Select>
                  </div>
                </div>
                <Button disabled>Speichern (Demo)</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <WorkOrderDrawer
        wo={selected}
        onChange={(next) => setWorkOrders(workOrders.map(w => w.id === next.id ? next : w))}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
