"use client";
import useSWR from "swr";
import { useState } from "react";

const fetcher = (u: string) => fetch(u).then(r => r.json());
const daysUntil = (d: string | Date) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

export default function MaintenancePanel({ assetId }: { assetId: string }) {
 const { data, mutate } = useSWR(`/api/assets/${assetId}/maintenance`, fetcher);
 const tasks = data?.tasks ?? [];
 const [title, setTitle] = useState("");
 const [startDate, setStartDate] = useState("");
 const [frequencyMonths, setFrequencyMonths] = useState(6);
 const [notes, setNotes] = useState("");

 async function createTask(e: React.FormEvent) {
 e.preventDefault();
 await fetch(`/api/assets/${assetId}/maintenance`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ title, notes, startDate, frequencyMonths }),
 });
 setTitle(""); setNotes(""); setStartDate(""); setFrequencyMonths(6);
 mutate();
 }
 async function completeTask(id: string) {
 await fetch(`/api/maintenance/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete" }) });
 mutate();
 }
 async function removeTask(id: string) {
 await fetch(`/api/maintenance/${id}`, { method: "DELETE" });
 mutate();
 }

 return (
 <section className="mt-8 space-y-4">
 <h2 className="text-xl font-semibold">Maintenance</h2>

 <form onSubmit={createTask} className="grid gap-2 md:grid-cols-4">
 <input className="border-border rounded p-2 md:col-span-2" placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} required />
 <input className="border-border rounded p-2" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
 <input className="border-border rounded p-2" type="number" min={1} value={frequencyMonths} onChange={e => setFrequencyMonths(Number(e.target.value))} placeholder="Frequency (months)" />
 <input className="border-border rounded p-2 md:col-span-4" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
 <button type="submit" className="px-3 py-2 rounded bg-black text-white w-fit">Add Task</button>
 </form>

 <table className="w-full border-border">
 <thead>
 <tr className="text-left">
 <th className="p-2">Title</th>
 <th className="p-2">Next Due</th>
 <th className="p-2">Days</th>
 <th className="p-2">Frequency</th>
 <th className="p-2">Actions</th>
 </tr>
 </thead>
 <tbody>
 {tasks.map((t: any) => {
 const dueDays = t.nextDueAt ? daysUntil(t.nextDueAt) : null;
 const dueSoon = typeof dueDays === "number" && dueDays <= 30;
 return (
 <tr key={t.id} className={`border-t ${dueSoon ? "bg-yellow-50" : ""}`}>
 <td className="p-2">{t.title}</td>
 <td className="p-2">{t.nextDueAt ? new Date(t.nextDueAt).toLocaleDateString() : "—"}</td>
 <td className="p-2">{dueDays ?? "—"}</td>
 <td className="p-2">{t.frequencyMonths} mo</td>
 <td className="p-2 flex gap-2">
 <button type="button" onClick={() => completeTask(t.id)} className="underline">Mark Done</button>
 <button type="button" onClick={() => removeTask(t.id)} className="underline text-red-600">Delete</button>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </section>
 );
}