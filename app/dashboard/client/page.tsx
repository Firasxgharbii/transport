"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./dashboard.module.css";

type Order={id:number;order_number?:string|null;status?:string|null;pickup_address?:string|null;delivery_address?:string|null;pickup_date?:string|null;delivery_date?:string|null;package_count?:number|string|null;created_at?:string|null};
const labels:Record<string,string>={pending:"En attente",assigned:"Planifiée",pickup_in_progress:"Ramassage en cours",picked_up:"Ramassée",warehouse_in:"Reçue à l’entrepôt",warehouse_storage:"En entrepôt",warehouse_out:"En transit",out_for_delivery:"En livraison",delivery_in_progress:"Livraison en cours",arrived:"Arrivée",delivered:"Livrée",completed:"Terminée",cancelled:"Annulée",incident:"Incident"};
const norm=(v?:string|null)=>String(v||"").trim().toLowerCase();
const date=(v?:string|null)=>{if(!v)return "—";const d=new Date(v);return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat("fr-CA",{dateStyle:"medium"}).format(d)};
const done=(s?:string|null)=>["delivered","completed"].includes(norm(s));
const active=(s?:string|null)=>!["delivered","completed","cancelled"].includes(norm(s));

export default function ClientDashboardPage(){
 const [orders,setOrders]=useState<Order[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let cancelled=false;(async()=>{try{const token=localStorage.getItem("glory_token")||"";if(!token){location.href="/login";return}const base=process.env.NEXT_PUBLIC_API_URL||"";const r=await fetch(`${base}/api/orders/my`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});const p=await r.json().catch(()=>null);if(!r.ok)throw new Error(p?.message||"Impossible de charger vos commandes.");if(!cancelled)setOrders(Array.isArray(p?.orders)?p.orders:Array.isArray(p?.data)?p.data:[])}catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Une erreur est survenue.")}finally{if(!cancelled)setLoading(false)}})();return()=>{cancelled=true}},[]);
 const stats=useMemo(()=>({total:orders.length,active:orders.filter(o=>active(o.status)).length,done:orders.filter(o=>done(o.status)).length,incident:orders.filter(o=>norm(o.status)==="incident").length}),[orders]);
 const recent=useMemo(()=>[...orders].sort((a,b)=>new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime()).slice(0,6),[orders]);
 return <main className={styles.clientProPage}>
   <section className={styles.clientProHero}><div><span>GLORY SOLUTIONS · ESPACE CLIENT</span><h1>Suivi de vos expéditions</h1><p>Une vue simple et à jour de vos commandes, colis et livraisons.</p></div><Link href="/dashboard/client/requests" className={styles.clientProPrimary}>Nouvelle demande</Link></section>
   {error&&<div className={styles.clientProError}>{error}</div>}
   <section className={styles.clientProStats}>
    <div><span>Commandes</span><strong>{loading?"—":stats.total}</strong></div><div><span>En cours</span><strong>{loading?"—":stats.active}</strong></div><div><span>Terminées</span><strong>{loading?"—":stats.done}</strong></div><div><span>Incidents</span><strong>{loading?"—":stats.incident}</strong></div>
   </section>
   <section className={styles.clientProPanel}><header><div><span>ACTIVITÉ RÉCENTE</span><h2>Mes commandes</h2></div><Link href="/dashboard/client/orders">Voir toutes les commandes →</Link></header>
   {loading?<div className={styles.clientProEmpty}>Chargement…</div>:recent.length===0?<div className={styles.clientProEmpty}>Aucune commande pour le moment.</div>:<div className={styles.clientProList}>{recent.map(o=><Link href={`/dashboard/client/orders/${o.id}`} key={o.id} className={styles.clientProOrder}><div className={styles.clientProOrderTop}><strong>{o.order_number||`Commande #${o.id}`}</strong><span data-status={norm(o.status)}>{labels[norm(o.status)]||o.status||"En attente"}</span></div><div className={styles.clientProRoute}><p><b>Ramassage</b>{o.pickup_address||"Adresse à confirmer"}</p><i>→</i><p><b>Livraison</b>{o.delivery_address||"Adresse à confirmer"}</p></div><div className={styles.clientProMeta}><span>{Number(o.package_count||0)} colis</span><span>Ramassage : {date(o.pickup_date)}</span><span>Livraison : {date(o.delivery_date)}</span></div></Link>)}</div>}
   </section>
 </main>
}
