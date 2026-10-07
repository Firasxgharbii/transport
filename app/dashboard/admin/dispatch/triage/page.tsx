"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, PackageSearch, RefreshCw, ScanLine, TriangleAlert } from "lucide-react";
import styles from "./triage.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.glorysolutions.ca";

type Op = { operation_id:number; order_id:number; operation_type:string; operation_status:string; order_number:string; order_status:string; stop_id:number|null; address:string|null; city:string|null; postal_code:string|null; route_id:number|null; route_code:string|null; triage_scanned_at:string|null; scanned_code:string|null; triage_package_count:number; package_count:number; driver_id:number|null; vehicle_id:number|null };
type RouteChoice={id:number;route_code:string;scheduled_date:string|null;status:string;driver_id:number|null;vehicle_id:number|null};
type Driver={id:number;availability_status:string};
type Vehicle={id:number;status:string;driver_id:number|null};
type ScanResult={success:boolean;duplicate?:boolean;message:string;package?:{id:number;order_id:number;barcode:string;current_status:string}};

function token(){return localStorage.getItem("glory_token")||sessionStorage.getItem("glory_token")||localStorage.getItem("token")||sessionStorage.getItem("token")||""}
async function api<T>(path:string,options:RequestInit={}):Promise<T>{const res=await fetch(API+path,{...options,cache:"no-store",headers:{Authorization:`Bearer ${token()}`,Accept:"application/json",...(options.body?{"Content-Type":"application/json"}:{}),...options.headers}});const j=await res.json().catch(()=>({}));if(!res.ok)throw new Error(j.message||`Erreur ${res.status}`);return j as T}

export default function Triage(){
  const [ops,setOps]=useState<Op[]>([]),[routes,setRoutes]=useState<RouteChoice[]>([]),[drivers,setDrivers]=useState<Driver[]>([]),[vehicles,setVehicles]=useState<Vehicle[]>([]);
  const [q,setQ]=useState(""),[date,setDate]=useState(""),[code,setCode]=useState(""),[busy,setBusy]=useState<number|null>(null),[scanning,setScanning]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState<{kind:"ok"|"warn";text:string}|null>(null);
  const [routeByOp,setRouteByOp]=useState<Record<number,string>>({}),[driverByOp,setDriverByOp]=useState<Record<number,string>>({}),[vehicleByOp,setVehicleByOp]=useState<Record<number,string>>({});
  const inputRef=useRef<HTMLInputElement>(null);

  const load=useCallback(async()=>{setError("");const p=new URLSearchParams();if(q)p.set("q",q);if(date)p.set("date",date);try{const [t,r,c]=await Promise.all([api<{operations:Op[]}>(`/api/dispatch/triage?${p}`),api<{routes:RouteChoice[]}>("/api/dispatch/route-choices"),api<{drivers:Driver[];vehicles:Vehicle[]}>("/api/dispatch/route-crew-choices")]);setOps(t.operations||[]);setRoutes(r.routes||[]);setDrivers(c.drivers||[]);setVehicles(c.vehicles||[])}catch(e){setError(e instanceof Error?e.message:"Erreur de chargement")}},[q,date]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{inputRef.current?.focus()},[]);

  const stats=useMemo(()=>({all:ops.length,packages:ops.reduce((n,x)=>n+Number(x.triage_package_count||0),0),free:ops.filter(x=>!x.route_id).length,routed:ops.filter(x=>x.route_id).length}),[ops]);

  async function submitScan(e?:FormEvent){e?.preventDefault();const clean=code.trim();if(!clean)return;setScanning(true);setError("");setNotice(null);try{const r=await api<ScanResult>("/api/dispatch/warehouse/scan",{method:"POST",body:JSON.stringify({scanned_code:clean,scan_type:"warehouse_in",scan_source:"manual",device_type:"admin_triage"})});setNotice({kind:r.duplicate?"warn":"ok",text:r.message});setCode("");await load()}catch(e){setError(e instanceof Error?e.message:"Scan refusé")}finally{setScanning(false);setTimeout(()=>inputRef.current?.focus(),50)}}

  async function assign(op:Op){const routeId=Number(routeByOp[op.operation_id]||0);if(!routeId){setError("Choisis une route avant l’affectation.");return}setBusy(op.operation_id);setError("");setNotice(null);try{const driverRaw=driverByOp[op.operation_id],vehicleRaw=vehicleByOp[op.operation_id];if(driverRaw!==undefined||vehicleRaw!==undefined){await api(`/api/dispatch/routes/${routeId}/crew`,{method:"PATCH",body:JSON.stringify({driver_id:driverRaw?Number(driverRaw):null,vehicle_id:vehicleRaw?Number(vehicleRaw):null})})}await api(`/api/dispatch/routes/${routeId}/operations/assign`,{method:"POST",body:JSON.stringify({operation_id:op.operation_id})});setNotice({kind:"ok",text:`${op.order_number} affectée à la route.`});await load()}catch(e){setError(e instanceof Error?e.message:"Affectation impossible")}finally{setBusy(null)}}

  return <main className={styles.page}>
    <header className={styles.header}><div><small>GLORY SOLUTIONS · ENTREPÔT</small><h1>Triage</h1><p>Le scan ici confirme l’entrée physique du colis à l’entrepôt avant sa livraison.</p></div><Link href="/dashboard/admin/dispatch">← Dispatch</Link></header>

    <section className={styles.scanner}>
      <div className={styles.scannerTitle}><div className={styles.scanIcon}><ScanLine size={25}/></div><div><h2>Scanner l’entrée au triage</h2><p>Scanne le code du colis ou la référence Glory. Un doublon est détecté automatiquement.</p></div></div>
      <form onSubmit={submitScan} className={styles.scanForm}><input ref={inputRef} value={code} onChange={e=>setCode(e.target.value)} placeholder="Ex. GLY-2026-000053-P01" autoComplete="off"/><button disabled={scanning||!code.trim()}>{scanning?<RefreshCw className={styles.spin} size={18}/>:<PackageSearch size={18}/>} {scanning?"Validation…":"Valider l’entrée"}</button></form>
      <div className={styles.hint}><Camera size={15}/> Lecteur USB/Bluetooth : garde le curseur dans le champ puis scanne. Le scanner envoie généralement Entrée automatiquement.</div>
    </section>

    {notice&&<div className={notice.kind==="ok"?styles.success:styles.warning}>{notice.kind==="ok"?<CheckCircle2 size={18}/>:<TriangleAlert size={18}/>} {notice.text}</div>}
    {error&&<div className={styles.error}><TriangleAlert size={18}/> {error}</div>}

    <section className={styles.stats}><article><b>{stats.all}</b><span>Commandes au triage</span></article><article><b>{stats.packages}</b><span>Colis présents</span></article><article><b>{stats.free}</b><span>À affecter</span></article><article><b>{stats.routed}</b><span>Déjà planifiées</span></article></section>

    <section className={styles.filters}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Commande, code, route ou adresse…"/><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><button onClick={()=>void load()}><RefreshCw size={16}/> Actualiser</button></section>

    <section className={styles.queue}><div className={styles.queueTitle}><div><h2>En attente au triage</h2><p>Uniquement les commandes dont au moins un colis a reçu un scan warehouse_in accepté.</p></div><b>{ops.length}</b></div>
      {ops.length===0?<div className={styles.empty}><PackageSearch size={30}/><strong>Aucun colis en attente</strong><span>Les colis apparaîtront ici après leur scan d’entrée.</span></div>:ops.map(op=><article className={styles.card} key={op.operation_id}>
        <div className={styles.order}><div><strong>{op.order_number||`#${op.order_id}`}</strong><span>{op.triage_package_count}/{op.package_count} colis au triage</span></div><b className={styles.badge}>En attente au triage</b></div>
        <div className={styles.meta}><span><small>Dernier scan</small><b>{op.scanned_code||"—"}</b></span><span><small>Entrée</small><b>{op.triage_scanned_at?new Date(op.triage_scanned_at).toLocaleString("fr-CA"):"—"}</b></span><span><small>Livraison</small><b>{op.address||"Adresse à confirmer"}</b></span><span><small>Planification</small><b>{op.route_id?(op.route_code||`Route #${op.route_id}`):"Non assignée"}</b></span></div>
        <div className={styles.assign}>
          <select value={routeByOp[op.operation_id]??""} onChange={e=>setRouteByOp(v=>({...v,[op.operation_id]:e.target.value}))} disabled={!!op.route_id}><option value="">Choisir une route</option>{routes.map(r=><option key={r.id} value={r.id}>{r.route_code} · {r.scheduled_date||"sans date"}</option>)}</select>
          <select value={driverByOp[op.operation_id]??""} onChange={e=>setDriverByOp(v=>({...v,[op.operation_id]:e.target.value}))} disabled={!!op.route_id}><option value="">Chauffeur de la route</option>{drivers.map(d=><option key={d.id} value={d.id}>Chauffeur #{d.id} · {d.availability_status}</option>)}</select>
          <select value={vehicleByOp[op.operation_id]??""} onChange={e=>setVehicleByOp(v=>({...v,[op.operation_id]:e.target.value}))} disabled={!!op.route_id}><option value="">Véhicule de la route</option>{vehicles.map(v=><option key={v.id} value={v.id}>Véhicule #{v.id}</option>)}</select>
          {op.route_id?<Link href={`/dashboard/admin/dispatch/routes/${op.route_id}`}>Voir la route</Link>:<button disabled={busy===op.operation_id} onClick={()=>void assign(op)}>{busy===op.operation_id?"Affectation…":"Affecter à la livraison"}</button>}
          <Link className={styles.secondary} href={`/dashboard/admin/orders/${op.order_id}`}>Commande</Link>
        </div>
      </article>)}
    </section>
  </main>
}
