"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, CircleAlert, CircleCheck, Info, RefreshCw, Search, TriangleAlert } from "lucide-react";
import styles from "./notifications.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.glorysolutions.ca";
type Level = "info" | "success" | "warning" | "urgent";
type N = { id:number; type?:string; level?:Level; title:string; message:string; entity_type?:string|null; entity_id?:number|null; action_url?:string|null; is_read?:number|boolean; read_at?:string|null; email_sent?:number|boolean; created_at?:string|null };
function token(){ return typeof window === "undefined" ? "" : (localStorage.getItem("glory_token") || localStorage.getItem("token") || ""); }
function unread(n:N){ return n.is_read === 0 || n.is_read === false || n.is_read == null; }
function date(v?:string|null){ if(!v)return "—"; const d=new Date(v); return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("fr-CA",{dateStyle:"medium",timeStyle:"short"}).format(d); }
const iconMap={info:Info,success:CircleCheck,warning:TriangleAlert,urgent:CircleAlert};

export default function NotificationsPage(){
 const [items,setItems]=useState<N[]>([]), [loading,setLoading]=useState(true), [error,setError]=useState("");
 const [query,setQuery]=useState(""), [level,setLevel]=useState(""), [state,setState]=useState("all");
 const load=useCallback(async()=>{ setLoading(true);setError(""); try{ const r=await fetch(`${API_URL}/api/notifications?limit=100&offset=0`,{headers:{Authorization:`Bearer ${token()}`},cache:"no-store"}); const j=await r.json(); if(!r.ok||j.success===false) throw new Error(j.message||"Chargement impossible"); setItems(Array.isArray(j.notifications)?j.notifications:Array.isArray(j.data)?j.data:[]); }catch(e){setError(e instanceof Error?e.message:"Chargement impossible");}finally{setLoading(false);} },[]);
 useEffect(()=>{void load();},[load]);
 const filtered=useMemo(()=>items.filter(n=>{ const q=query.trim().toLowerCase(); return (!q || `${n.title} ${n.message} ${n.type||""} ${n.entity_type||""} ${n.entity_id||""}`.toLowerCase().includes(q)) && (!level||n.level===level) && (state==="all"||(state==="unread"?unread(n):!unread(n))); }),[items,query,level,state]);
 const unreadCount=items.filter(unread).length;
 async function mark(id:number){ const r=await fetch(`${API_URL}/api/notifications/${id}/read`,{method:"PATCH",headers:{Authorization:`Bearer ${token()}`}}); if(r.ok)setItems(v=>v.map(n=>n.id===id?{...n,is_read:1,read_at:new Date().toISOString()}:n)); }
 async function markAll(){ const r=await fetch(`${API_URL}/api/notifications/read-all`,{method:"PATCH",headers:{Authorization:`Bearer ${token()}`}}); if(r.ok)setItems(v=>v.map(n=>({...n,is_read:1,read_at:n.read_at||new Date().toISOString()}))); }
 return <main className={styles.page}>
  <header className={styles.hero}><div><span className={styles.eyebrow}><Bell size={16}/> CENTRE DE NOTIFICATIONS</span><h1>Notifications</h1><p>Historique complet des événements opérationnels, alertes et actions à traiter.</p></div><div className={styles.heroActions}><button onClick={()=>void load()}><RefreshCw size={17}/> Actualiser</button><button className={styles.primary} onClick={()=>void markAll()} disabled={!unreadCount}><CheckCheck size={17}/> Tout marquer comme lu</button></div></header>
  <section className={styles.stats}><article><strong>{items.length}</strong><span>Total</span></article><article><strong>{unreadCount}</strong><span>Non lues</span></article><article><strong>{items.filter(n=>n.level==="urgent").length}</strong><span>Urgentes</span></article><article><strong>{items.filter(n=>Boolean(n.email_sent)).length}</strong><span>Emails envoyés</span></article></section>
  <section className={styles.filters}><label><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher une commande, route, chauffeur, message…"/></label><select value={level} onChange={e=>setLevel(e.target.value)}><option value="">Tous les niveaux</option><option value="urgent">Urgent</option><option value="warning">Avertissement</option><option value="success">Succès</option><option value="info">Information</option></select><select value={state} onChange={e=>setState(e.target.value)}><option value="all">Toutes</option><option value="unread">Non lues</option><option value="read">Lues</option></select></section>
  {loading?<div className={styles.empty}>Chargement des notifications…</div>:error?<div className={styles.error}>{error}</div>:filtered.length===0?<div className={styles.empty}>Aucune notification pour ces filtres.</div>:<section className={styles.list}>{filtered.map(n=>{const Icon=iconMap[n.level||"info"];return <article key={n.id} className={`${styles.item} ${unread(n)?styles.unread:""}`}><div className={`${styles.icon} ${styles[n.level||"info"]}`}><Icon size={21}/></div><div className={styles.body}><div className={styles.top}><div><span className={styles.type}>{n.type||"Général"}</span><h2>{n.title}</h2></div><time>{date(n.created_at)}</time></div><p>{n.message}</p><div className={styles.meta}>{n.entity_type&&<span>{n.entity_type}{n.entity_id?` #${n.entity_id}`:""}</span>}<span>{Boolean(n.email_sent)?"Email envoyé":"Notification plateforme"}</span>{!unread(n)&&<span>Lue {date(n.read_at)}</span>}</div><div className={styles.actions}>{n.action_url&&<Link href={n.action_url} onClick={()=>void mark(n.id)}>Ouvrir l’élément lié →</Link>}{unread(n)&&<button onClick={()=>void mark(n.id)}>Marquer comme lue</button>}</div></div></article>})}</section>}
 </main>;
}
