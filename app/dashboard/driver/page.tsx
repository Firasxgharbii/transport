"use client";
import DriverLiveTracking from "@/app/components/DriverLiveTracking";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, CheckCircle2, ChevronRight, Clock3, LogOut,
  MapPin, Navigation, PackageCheck, RefreshCw, ScanLine, Truck,
  Wifi, WifiOff
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.glorysolutions.ca";
const GPS_SEND_INTERVAL_MS = 5000;

type Stop = {
  id: number;
  task_type: "pickup" | "delivery";
  status?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  stop_position?: number | null;
  route_id?: number | null;
  total_packages?: number;
  treated_packages?: number;
  remaining_packages?: number;
  orders?: Array<{
    id?: number;
    order_id?: number;
    order_number?: string;
    operation_id?: number;
    signature_required?: number | boolean;
    notes?: string | null;
    packages?: Array<{id:number; barcode?:string; package_type?:string; weight?:number|string|null; weight_unit?:string|null; scanned?:boolean|number; exception_id?:number|null}>;
  }>;
  run?: { execution_status?: string; started_at?: string; closed_at?: string };
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("glory_token") ||
    sessionStorage.getItem("glory_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") || "";
}

function stopStatus(s: Stop) {
  const v = s.run?.execution_status || s.status || "assigned";
  if (["completed","partial","delivered"].includes(v)) return "completed";
  if (["incident","exception","problem","failed","cancelled"].includes(v)) return "exception";
  if (["in_progress","started","pickup_in_progress","delivery_in_progress"].includes(v)) return "progress";
  return "pending";
}

function label(s: Stop) {
  const v = stopStatus(s);
  if (v === "completed") return "Terminé";
  if (v === "exception") return "Exception";
  if (v === "progress") return "En cours";
  return "À faire";
}

const card: React.CSSProperties = {
  background:"#fff", border:"1px solid #e5e7eb", borderRadius:16,
  padding:16, boxShadow:"0 4px 16px rgba(0,0,0,.04)"
};
const button: React.CSSProperties = {
  display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7,
  border:"1px solid #d7dbe0", background:"#fff", borderRadius:10,
  padding:"11px 14px", fontWeight:800, cursor:"pointer"
};

export default function DriverPage() {
  const router = useRouter();
  const [user,setUser] = useState<any>(null);
  const [driver,setDriver] = useState<any>(null);
  const [stops,setStops] = useState<Stop[]>([]);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [error,setError] = useState("");
  const [gpsActive,setGpsActive] = useState(false);
  const [showCompletedHistory,setShowCompletedHistory] = useState(false);
  const watchId = useRef<number|null>(null);
  const lastGps = useRef(0);
  const gpsBusy = useRef(false);

  const logout = useCallback(() => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    ["glory_token","token"].forEach(k => {
      localStorage.removeItem(k); sessionStorage.removeItem(k);
    });
    router.replace("/login");
  },[router]);

  const api = useCallback(async (path:string, init:RequestInit={}) => {
    const token=getToken();
    if(!token){ logout(); throw new Error("Session expirée."); }
    const r=await fetch(API_URL+path,{
      ...init, cache:"no-store",
      headers:{Accept:"application/json",Authorization:`Bearer ${token}`,...(init.body?{"Content-Type":"application/json"}:{}),...(init.headers||{})}
    });
    let j:any={}; try{j=await r.json()}catch{}
    if(r.status===401){logout();throw new Error("Session expirée.");}
    if(!r.ok || j.success===false) throw new Error(j.message||`Erreur API (${r.status})`);
    return j;
  },[logout]);

  const load = useCallback(async(silent=false)=>{
    try{
      if(!silent)setRefreshing(true);
      setError("");
      const [d,t]=await Promise.all([
        api("/api/drivers/me"),
        api("/api/drivers/me/dispatch-tasks")
      ]);
      setDriver(d.driver||d.data||null);
      const raw=Array.isArray(t.tasks)?t.tasks:Array.isArray(t.dispatch_tasks)?t.dispatch_tasks:Array.isArray(t.data)?t.data:[];
      setStops(raw.filter((x:any)=>Number(x.id)>0 && ["pickup","delivery"].includes(x.task_type))
        .map((x:any)=>({...x,id:Number(x.id),orders:Array.isArray(x.orders)?x.orders:[]}))
         .sort((a:any,b:any)=>{
          const rank=(x:any)=>{const st=stopStatus(x);return st==="progress"?0:st==="pending"?1:st==="exception"?2:3};
          return rank(a)-rank(b)||(Number(a.stop_position)||999999)-(Number(b.stop_position)||999999)||a.id-b.id;
        }));
    }catch(e:any){setError(e.message||"Impossible de charger la route.");}
    finally{setLoading(false);setRefreshing(false)}
  },[api]);

  useEffect(()=>{
    (async()=>{
      try{
        const me=await api("/api/auth/me");
        const u=me.user||me.data;
        if(!u || u.role!=="driver"){router.replace("/dashboard");return;}
        setUser(u); await load();
      }catch(e:any){setError(e.message);setLoading(false)}
    })();
  },[api,load,router]);

  useEffect(()=>{
    if(!user)return;
    const id=window.setInterval(()=>{if(document.visibilityState==="visible")void load(true)},8000);
    const focus=()=>void load(true);
    window.addEventListener("focus",focus);
    return()=>{clearInterval(id);window.removeEventListener("focus",focus)}
  },[user,load]);

  useEffect(()=>{
    if(!driver || !navigator.geolocation)return;
    watchId.current=navigator.geolocation.watchPosition(async p=>{
      setGpsActive(true);
      const now=Date.now();
      if(gpsBusy.current || now-lastGps.current<GPS_SEND_INTERVAL_MS)return;
      gpsBusy.current=true;lastGps.current=now;
      try{
        await api("/api/tracking/location",{method:"POST",body:JSON.stringify({
          latitude:p.coords.latitude,longitude:p.coords.longitude,
          accuracy:Number.isFinite(p.coords.accuracy)?p.coords.accuracy:null,
          speed:p.coords.speed,heading:p.coords.heading
        })});
      }catch{}finally{gpsBusy.current=false}
    },()=>setGpsActive(false),{enableHighAccuracy:true,maximumAge:3000,timeout:10000});
    return()=>{if(watchId.current!==null)navigator.geolocation.clearWatch(watchId.current)}
  },[driver,api]);

  const stats=useMemo(()=>({
    total:stops.length,
    progress:stops.filter(s=>stopStatus(s)==="progress").length,
    completed:stops.filter(s=>stopStatus(s)==="completed").length,
    exceptions:stops.filter(s=>stopStatus(s)==="exception").length
  }),[stops]);

  const activeStops = useMemo(
    () => stops.filter(s => stopStatus(s) !== "completed"),
    [stops]
  );

  const completedStops = useMemo(
    () => stops.filter(s => stopStatus(s) === "completed"),
    [stops]
  );

  const renderStop = (s: Stop, index: number, count: number) => {
    const packages=s.orders?.flatMap(o=>o.packages||[])||[];
    const treated=packages.filter((p:any)=>Number(p.scanned)===1||p.scanned===true||p.exception_id).length;
    const total=packages.length||Number(s.total_packages||0);
    const status=stopStatus(s);
    const address=[s.address,s.city,s.province,s.postal_code].filter(Boolean).join(", ");
    const isCompleted=status==="completed";

    return <article
      key={s.id}
      onClick={()=>router.push(`/dashboard/driver/tasks/${s.id}`)}
      style={{
        padding:"16px 18px",
        borderBottom:index<count-1?"1px solid #eee":"none",
        cursor:"pointer",
        display:"grid",
        gap:10,
        background:isCompleted?"#fbfefc":"#fff"
      }}
    >
      <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}>
        <div>
          <small style={{fontWeight:900,color:s.task_type==="pickup"?"#0f766e":"#b42318"}}>
            {s.task_type==="pickup"?"RAMASSAGE":"LIVRAISON"} · STOP {s.stop_position?`#${s.stop_position}`:`#${s.id}`}
          </small>

          <h3 style={{margin:"5px 0"}}>
            {address||"Adresse à confirmer"}
          </h3>
        </div>

        <span style={{
          fontWeight:900,
          fontSize:12,
          padding:"6px 9px",
          borderRadius:999,
          background:
            status==="completed"?"#dcfce7":
            status==="exception"?"#fee2e2":
            status==="progress"?"#dbeafe":
            "#f3f4f6",
          color:
            status==="completed"?"#166534":
            status==="exception"?"#991b1b":
            status==="progress"?"#1d4ed8":
            "#374151"
        }}>
          {isCompleted && <CheckCircle2 size={13} style={{verticalAlign:"middle",marginRight:4}}/>}
          {label(s)}
        </span>
      </div>

      <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:14,color:"#555"}}>
        <span>
          <PackageCheck size={15} style={{verticalAlign:"middle"}}/> {s.orders?.length||0} commande(s)
        </span>

        <span>
          <ScanLine size={15} style={{verticalAlign:"middle"}}/> {treated}/{total} unité(s) traitée(s)
        </span>

        {s.scheduled_time&&
          <span>
            <Clock3 size={15} style={{verticalAlign:"middle"}}/> {s.scheduled_time}
          </span>
        }

        {isCompleted && s.run?.closed_at &&
          <span style={{fontWeight:800,color:"#166534"}}>
            <CheckCircle2 size={15} style={{verticalAlign:"middle"}}/> Fermé {new Date(s.run.closed_at).toLocaleTimeString("fr-CA",{hour:"2-digit",minute:"2-digit"})}
          </span>
        }
      </div>

      {packages.length>0&&
        <div style={{
          display:"grid",
          gap:6,
          fontSize:14,
          background:isCompleted?"#f0fdf4":"#f8fafc",
          borderRadius:10,
          padding:10
        }}>
          {packages.map((p:any)=>
            <div key={p.id} style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
              <span><b>Type :</b> {p.package_type==="pallet"?"Palette":"Colis"}</span>
              <span><b>Poids :</b> {p.weight!=null&&p.weight!==""?`${p.weight} ${p.weight_unit||"lb"}`:"—"}</span>
            </div>
          )}
        </div>
      }

      {s.orders?.some((o:any)=>String(o.notes||"").trim())&&
        <div style={{fontSize:13,color:"#555"}}>
          <b>Instructions :</b> {s.orders?.map((o:any)=>o.notes).filter(Boolean).join(" · ")}
        </div>
      }

      <button
        style={{
          ...button,
          width:"100%",
          background:isCompleted?"#f0fdf4":"#17191d",
          color:isCompleted?"#166534":"#fff",
          borderColor:isCompleted?"#bbf7d0":"#17191d"
        }}
        onClick={e=>{
          e.stopPropagation();
          router.push(`/dashboard/driver/tasks/${s.id}`);
        }}
      >
        {isCompleted ? "Consulter le stop terminé" : "Ouvrir le stop"}
        <ChevronRight size={17}/>
      </button>
    </article>;
  };

  if(loading)return <main style={{minHeight:"100dvh",padding:24,background:"#f5f6f8"}}><DriverLiveTracking/><b>Chargement de votre route…</b></main>;

  return <main style={{minHeight:"100dvh",background:"#f5f6f8",color:"#17191d",padding:"18px 12px 70px"}}>
    <div style={{maxWidth:980,margin:"auto",display:"grid",gap:14}}>
      <header style={{...card,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div>
          <small style={{fontWeight:900,color:"#d9043d",letterSpacing:".08em"}}>GLORY SOLUTIONS · CHAUFFEUR</small>
          <h1 style={{margin:"6px 0 2px",fontSize:"clamp(25px,5vw,38px)"}}>Route du jour</h1>
          <p style={{margin:0,color:"#60646c"}}>{driver?.first_name||user?.first_name||"Chauffeur"} · {gpsActive?"GPS actif":"GPS à vérifier"}</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={button} disabled={refreshing} onClick={()=>load()}><RefreshCw size={17}/>{refreshing?"...":"Actualiser"}</button>
          <button style={button} onClick={logout}><LogOut size={17}/>Déconnexion</button>
        </div>
      </header>

      {error&&<div style={{...card,borderColor:"#ef4444",color:"#991b1b",display:"flex",gap:8}}><AlertTriangle size={19}/>{error}</div>}

      <section style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
        {[
          {
            title:"Total stops",
            value:stats.total,
            icon:<Navigation size={21}/>,
            action:null
          },
          {
            title:"En cours",
            value:stats.progress,
            icon:<Clock3 size={21}/>,
            action:null
          },
          {
            title:"Terminés",
            value:stats.completed,
            icon:<CheckCircle2 size={21}/>,
            action:()=>setShowCompletedHistory(true)
          },
          {
            title:"Exceptions",
            value:stats.exceptions,
            icon:<AlertTriangle size={21}/>,
            action:null
          }
        ].map((item:any)=>
          <button
            key={item.title}
            type="button"
            onClick={item.action || undefined}
            style={{
              ...card,
              appearance:"none",
              textAlign:"left",
              font:"inherit",
              color:"inherit",
              width:"100%",
              cursor:item.action?"pointer":"default",
              transition:"transform .15s ease, box-shadow .15s ease",
              ...(item.title==="Terminés" ? {
                borderColor:"#bbf7d0",
                background:"#f0fdf4"
              } : {})
            }}
          >
            <div style={{
              display:"flex",
              justifyContent:"space-between",
              alignItems:"center",
              color:item.title==="Terminés"?"#166534":"#666"
            }}>
              <b>{item.title}</b>
              {item.icon}
            </div>

            <strong style={{
              fontSize:30,
              display:"block",
              marginTop:8,
              color:item.title==="Terminés"?"#166534":"inherit"
            }}>
              {item.value}
            </strong>

            {item.title==="Terminés" &&
              <small style={{
                display:"block",
                marginTop:5,
                fontWeight:800,
                color:"#15803d"
              }}>
                Voir l'historique
              </small>
            }
          </button>
        )}
      </section>

      <section style={{display:"grid",gap:14}}>

        <div style={{...card,padding:0,overflow:"hidden"}}>
          <div style={{
            padding:"17px 18px",
            borderBottom:"1px solid #eee",
            display:"flex",
            justifyContent:"space-between",
            gap:8,
            alignItems:"center"
          }}>
            <div>
              <b style={{fontSize:20}}>En cours / À faire</b>
              <div style={{fontSize:13,color:"#6b7280"}}>
                Les stops actifs de votre route.
              </div>
            </div>

            <span style={{
              display:"inline-flex",
              alignItems:"center",
              gap:6,
              fontSize:13,
              fontWeight:800
            }}>
              {gpsActive?<Wifi size={16}/>:<WifiOff size={16}/>} GPS
            </span>
          </div>

          {activeStops.length===0
            ? <div style={{padding:28,textAlign:"center"}}>
                <CheckCircle2 size={34} style={{color:"#16a34a"}}/>
                <h3>Aucun stop actif</h3>
                <p style={{color:"#666",marginBottom:0}}>
                  Tous les stops actuellement disponibles sont terminés.
                </p>
              </div>
            : <div style={{display:"grid"}}>
                {activeStops.map((s,index)=>renderStop(s,index,activeStops.length))}
              </div>
          }
        </div>

        {completedStops.length>0 &&
          <div style={{
            ...card,
            padding:0,
            overflow:"hidden",
            borderColor:"#bbf7d0"
          }}>
            <div style={{
              padding:"17px 18px",
              borderBottom:"1px solid #dcfce7",
              background:"#f0fdf4"
            }}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <CheckCircle2 size={21} style={{color:"#16a34a"}}/>
                <b style={{fontSize:20,color:"#166534"}}>
                  Terminés aujourd'hui
                </b>
              </div>

              <div style={{
                fontSize:13,
                color:"#4b7358",
                marginTop:4
              }}>
                {completedStops.length} stop{completedStops.length>1?"s":""} terminé{completedStops.length>1?"s":""} · consultation seulement
              </div>
            </div>

            <div style={{display:"grid"}}>
              {completedStops.map((s,index)=>renderStop(s,index,completedStops.length))}
            </div>
          </div>
        }

        {stops.length===0 &&
          <div style={{...card,padding:28,textAlign:"center"}}>
            <Truck size={34}/>
            <h3>Aucun stop assigné</h3>
            <p style={{color:"#666"}}>
              Les nouveaux stops apparaîtront automatiquement après assignation dans le Dispatch.
            </p>
          </div>
        }

      </section>

      {showCompletedHistory &&
        <div
          role="dialog"
          aria-modal="true"
          onClick={()=>setShowCompletedHistory(false)}
          style={{
            position:"fixed",
            inset:0,
            zIndex:9999,
            background:"rgba(0,0,0,.48)",
            display:"flex",
            alignItems:"flex-end",
            justifyContent:"center",
            padding:0
          }}
        >
          <div
            onClick={e=>e.stopPropagation()}
            style={{
              width:"100%",
              maxWidth:700,
              maxHeight:"88dvh",
              overflowY:"auto",
              background:"#f5f6f8",
              borderRadius:"22px 22px 0 0",
              boxShadow:"0 -12px 40px rgba(0,0,0,.18)"
            }}
          >
            <div style={{
              position:"sticky",
              top:0,
              zIndex:2,
              background:"#fff",
              padding:"16px",
              borderBottom:"1px solid #e5e7eb",
              display:"flex",
              justifyContent:"space-between",
              alignItems:"center",
              gap:12
            }}>
              <div>
                <small style={{
                  color:"#15803d",
                  fontWeight:900,
                  letterSpacing:".06em"
                }}>
                  TRAÇABILITÉ CHAUFFEUR
                </small>

                <h2 style={{margin:"4px 0 0"}}>
                  Stops terminés
                </h2>
              </div>

              <button
                type="button"
                onClick={()=>setShowCompletedHistory(false)}
                style={button}
              >
                Fermer
              </button>
            </div>

            <div style={{padding:12,display:"grid",gap:10}}>
              {completedStops.length===0
                ? <div style={{
                    ...card,
                    textAlign:"center",
                    padding:30
                  }}>
                    <CheckCircle2 size={34} style={{color:"#16a34a"}}/>
                    <h3>Aucun stop terminé</h3>
                    <p style={{color:"#6b7280",marginBottom:0}}>
                      Les stops terminés aujourd'hui apparaîtront ici.
                    </p>
                  </div>

                : completedStops.map(s=>{
                    const address=[
                      s.address,
                      s.city,
                      s.province,
                      s.postal_code
                    ].filter(Boolean).join(", ");

                    const packages=
                      s.orders?.flatMap(o=>o.packages||[])||[];

                    return <article
                      key={s.id}
                      style={{
                        ...card,
                        borderColor:"#bbf7d0",
                        display:"grid",
                        gap:10
                      }}
                    >
                      <div style={{
                        display:"flex",
                        justifyContent:"space-between",
                        alignItems:"flex-start",
                        gap:10
                      }}>
                        <div>
                          <small style={{
                            fontWeight:900,
                            color:s.task_type==="pickup"
                              ? "#0f766e"
                              : "#b42318"
                          }}>
                            {s.task_type==="pickup"
                              ? "RAMASSAGE"
                              : "LIVRAISON"}
                            {" · "}
                            STOP {s.stop_position
                              ? `#${s.stop_position}`
                              : `#${s.id}`}
                          </small>

                          <h3 style={{margin:"5px 0"}}>
                            {address||"Adresse non disponible"}
                          </h3>
                        </div>

                        <span style={{
                          background:"#dcfce7",
                          color:"#166534",
                          padding:"6px 9px",
                          borderRadius:999,
                          fontSize:12,
                          fontWeight:900,
                          whiteSpace:"nowrap"
                        }}>
                          ✓ Terminé
                        </span>
                      </div>

                      <div style={{
                        display:"grid",
                        gap:5,
                        fontSize:13,
                        color:"#555"
                      }}>
                        <span>
                          <b>Commandes :</b> {s.orders?.length||0}
                        </span>

                        <span>
                          <b>Colis :</b> {packages.length||Number(s.total_packages||0)}
                        </span>

                        <span>
                          <b>Heure de fermeture :</b>{" "}
                          {s.run?.closed_at
                            ? new Date(s.run.closed_at).toLocaleString(
                                "fr-CA",
                                {
                                  hour:"2-digit",
                                  minute:"2-digit",
                                  year:"numeric",
                                  month:"2-digit",
                                  day:"2-digit"
                                }
                              )
                            : "—"}
                        </span>
                      </div>

                      <button
                        type="button"
                        style={{
                          ...button,
                          width:"100%",
                          background:"#f0fdf4",
                          color:"#166534",
                          borderColor:"#bbf7d0"
                        }}
                        onClick={()=>{
                          setShowCompletedHistory(false);
                          router.push(`/dashboard/driver/tasks/${s.id}`);
                        }}
                      >
                        Consulter le stop
                        <ChevronRight size={17}/>
                      </button>
                    </article>
                  })
              }
            </div>
          </div>
        </div>
      }

      <button style={{...button,width:"100%"}} onClick={()=>router.push("/dashboard/driver/scanner")}><ScanLine size={18}/> Scanner / saisir un code manuellement</button>
      <div style={{fontSize:12,color:"#777",textAlign:"center"}}><MapPin size={13}/> La position GPS reste transmise au système opérationnel pendant l'utilisation.</div>
    </div>
  </main>;
}