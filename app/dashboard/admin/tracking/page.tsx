"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Crosshair, Footprints, MapPin, Navigation, RefreshCw, Truck } from "lucide-react";
import styles from "./tracking.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.glorysolutions.ca";

type Loc = {
  id:number; driver_id:number; order_id?:number|null; latitude:number|string; longitude:number|string;
  speed?:number|string|null; heading?:number|string|null; accuracy?:number|string|null; recorded_at:string;
  driver_first_name?:string|null; driver_last_name?:string|null; driver_phone?:string|null;
  vehicle_name?:string|null; vehicle_plate?:string|null; order_number?:string|null;
  freshness?:{is_fresh?:boolean;age_seconds?:number|null};
};

type HistoryPoint={latitude:number|string;longitude:number|string;recorded_at:string;speed?:number|string|null};

function getToken(){ if(typeof window==="undefined") return ""; return localStorage.getItem("glory_token")||sessionStorage.getItem("glory_token")||localStorage.getItem("token")||sessionStorage.getItem("token")||""; }
function n(v:unknown){const x=Number(v);return Number.isFinite(x)?x:null}
function mode(speed:unknown){const s=n(speed); if(s===null)return "Position"; if(s>=3)return "En véhicule"; if(s>=0.35)return "À pied"; return "Arrêté"}
function age(date:string){const s=Math.max(0,Math.floor((Date.now()-new Date(date).getTime())/1000)); return s<60?`${s}s`:s<3600?`${Math.floor(s/60)} min`:`${Math.floor(s/3600)} h`;}

export default function TrackingPage(){
 const [locations,setLocations]=useState<Loc[]>([]); const [selected,setSelected]=useState<number|null>(null); const [history,setHistory]=useState<HistoryPoint[]>([]);
 const [error,setError]=useState(""); const [loading,setLoading]=useState(true); const mapHost=useRef<HTMLDivElement|null>(null); const mapRef=useRef<any>(null); const layerRef=useRef<any>(null);
 const api=useCallback(async(path:string)=>{const r=await fetch(API+path,{headers:{Authorization:`Bearer ${getToken()}`},cache:"no-store"}); const j=await r.json().catch(()=>({})); if(!r.ok)throw new Error(j.message||`HTTP ${r.status}`); return j;},[]);
 const load=useCallback(async()=>{try{setError("");const j=await api("/api/tracking/drivers");const rows=Array.isArray(j.locations)?j.locations:[];setLocations(rows);if(selected===null&&rows[0])setSelected(Number(rows[0].driver_id));}catch(e){setError(e instanceof Error?e.message:"Impossible de charger le GPS.")}finally{setLoading(false)}},[api,selected]);
 useEffect(()=>{load();const id=setInterval(load,7000);return()=>clearInterval(id)},[load]);
 useEffect(()=>{if(!selected){setHistory([]);return} let dead=false; const run=async()=>{try{const j=await api(`/api/tracking/drivers/${selected}/history?limit=300`);if(!dead)setHistory((j.locations||j.history||j.data||[]).slice().reverse())}catch{}};run();const id=setInterval(run,10000);return()=>{dead=true;clearInterval(id)}},[selected,api]);
 const current=useMemo(()=>locations.find(x=>Number(x.driver_id)===selected)||null,[locations,selected]);
 useEffect(()=>{let cancelled=false;(async()=>{if(!mapHost.current)return; const L=(await import("leaflet")).default; if(cancelled)return; if(!mapRef.current){mapRef.current=L.map(mapHost.current,{zoomControl:true}).setView([45.5019,-73.5674],11);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(mapRef.current)} if(layerRef.current)layerRef.current.remove(); const group=L.layerGroup().addTo(mapRef.current);layerRef.current=group; const valid=locations.filter(x=>n(x.latitude)!==null&&n(x.longitude)!==null); for(const x of valid){const lat=n(x.latitude)!,lng=n(x.longitude)!; const fresh=x.freshness?.is_fresh!==false; const icon=L.divIcon({className:"",html:`<div style="width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:${fresh?'#111827':'#6b7280'};color:white;border:3px solid white;box-shadow:0 3px 12px #0004;font-size:17px">${(n(x.speed)||0)>=3?'🚚':(n(x.speed)||0)>=.35?'🚶':'📍'}</div>`,iconSize:[34,34],iconAnchor:[17,17]}); const marker=L.marker([lat,lng],{icon}).addTo(group);marker.bindPopup(`<b>${x.driver_first_name||''} ${x.driver_last_name||''}</b><br>${mode(x.speed)}<br>GPS ${Math.round(n(x.accuracy)||0)} m<br>${age(x.recorded_at)}`);marker.on('click',()=>setSelected(Number(x.driver_id)));}
 if(current&&history.length){const pts=history.map(p=>[n(p.latitude),n(p.longitude)]).filter(p=>p[0]!==null&&p[1]!==null) as [number,number][];if(pts.length>1)L.polyline(pts,{weight:5,opacity:.75}).addTo(group);}
 if(current){const lat=n(current.latitude),lng=n(current.longitude);if(lat!==null&&lng!==null)mapRef.current.setView([lat,lng],16)} else if(valid.length){const bounds=L.latLngBounds(valid.map(x=>[n(x.latitude)!,n(x.longitude)!]));mapRef.current.fitBounds(bounds.pad(.2))}
 })();return()=>{cancelled=true}},[locations,current,history]);
 useEffect(()=>()=>{if(mapRef.current){mapRef.current.remove();mapRef.current=null}},[]);
 return <main className={styles.page}>
  <header className={styles.header}><div><Link href="/dashboard/admin/dispatch" className={styles.back}><ArrowLeft size={18}/> Dispatch</Link><h1>GPS live chauffeurs</h1><p>Position téléphone/Zebra, déplacement à pied ou en véhicule et chemin réellement parcouru.</p></div><button className={styles.refresh} onClick={load}><RefreshCw size={17}/> Actualiser</button></header>
  {error&&<div className={styles.error}>{error}</div>}
  <section className={styles.grid}><aside className={styles.sidebar}>{loading&&<div className={styles.empty}>Chargement…</div>}{!loading&&!locations.length&&<div className={styles.empty}>Aucune position GPS reçue.</div>}{locations.map(x=>{const active=Number(x.driver_id)===selected;const s=n(x.speed)||0;return <button key={x.driver_id} onClick={()=>setSelected(Number(x.driver_id))} className={`${styles.driver} ${active?styles.active:""}`}><div className={styles.driverTop}><strong>{x.driver_first_name||"Chauffeur"} {x.driver_last_name||`#${x.driver_id}`}</strong><span className={x.freshness?.is_fresh===false?styles.stale:styles.live}>{x.freshness?.is_fresh===false?"ANCIEN":"LIVE"}</span></div><div className={styles.meta}>{s>=3?<Truck size={16}/>:s>=.35?<Footprints size={16}/>:<MapPin size={16}/>} {mode(x.speed)} · {age(x.recorded_at)}</div><div className={styles.meta}><Crosshair size={16}/> précision {Math.round(n(x.accuracy)||0)} m {x.vehicle_plate?`· ${x.vehicle_plate}`:""}</div></button>})}</aside>
   <div className={styles.mapWrap}><div ref={mapHost} className={styles.map}/>{current&&<div className={styles.overlay}><div><b>{current.driver_first_name} {current.driver_last_name}</b><span>{mode(current.speed)} · mise à jour il y a {age(current.recorded_at)}</span></div><div><Navigation size={16}/> {history.length} points dans le chemin affiché</div>{current.order_number&&<div>Commande active : <b>{current.order_number}</b></div>}</div>}</div>
  </section>
  <p className={styles.note}>Le suivi continue tant que le navigateur/app garde l’accès GPS. Sur téléphone, le système d’exploitation peut suspendre le GPS d’une page web lorsque l’écran est verrouillé; un suivi permanent en arrière-plan exige une application mobile/native dédiée.</p>
 </main>
}
