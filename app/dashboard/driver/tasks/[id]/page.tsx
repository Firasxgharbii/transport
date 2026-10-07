"use client";
import DriverLiveTracking from "@/app/components/DriverLiveTracking";
import {useCallback,useEffect,useRef,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import {ArrowLeft,Camera,CheckCircle2,MapPin,Package,RefreshCw,ScanLine,Signature,TriangleAlert} from "lucide-react";
const API=process.env.NEXT_PUBLIC_API_URL||"https://api.glorysolutions.ca";
const REASONS=[['missing','Colis manquant'],['not_loaded','Colis non chargé dans le véhicule'],['damaged','Colis endommagé'],['wrong_label','Mauvais colis / mauvaise étiquette'],['client_absent','Client absent'],['client_refused','Refus du client'],['access_impossible','Accès impossible'],['address_invalid','Adresse introuvable ou incorrecte'],['other','Autre raison']];

function beep(ok:boolean){
 try{
  const AudioCtx=(window.AudioContext||(window as any).webkitAudioContext);
  const a=new AudioCtx();

  if(a.state==='suspended') a.resume().catch(()=>{});

  const tone=(
   freq:number,
   start:number,
   dur:number,
   type:OscillatorType='square',
   volume=.75
  )=>{
   const o=a.createOscillator();
   const g=a.createGain();

   o.type=type;
   o.frequency.setValueAtTime(freq,a.currentTime+start);

   g.gain.setValueAtTime(.0001,a.currentTime+start);
   g.gain.exponentialRampToValueAtTime(
    volume,
    a.currentTime+start+.008
   );
   g.gain.setValueAtTime(
    volume,
    a.currentTime+start+Math.max(.01,dur-.035)
   );
   g.gain.exponentialRampToValueAtTime(
    .0001,
    a.currentTime+start+dur
   );

   o.connect(g);
   g.connect(a.destination);

   o.start(a.currentTime+start);
   o.stop(a.currentTime+start+dur);
  };

  if(ok){
   // POSITIF : deux bips aigus et nets
   tone(1250,0,.13,'square',.75);
   tone(1650,.16,.16,'square',.85);
  }else{
   // NEGATIF : trois bips graves, plus longs
   tone(330,0,.20,'sawtooth',.85);
   tone(240,.23,.22,'sawtooth',.90);
   tone(170,.48,.30,'square',.95);
  }

  setTimeout(()=>a.close().catch(()=>{}),1100);
 }catch{}
}
function token(){return localStorage.getItem('glory_token')||sessionStorage.getItem('glory_token')||localStorage.getItem('token')||sessionStorage.getItem('token')||''}
function distanceMeters(aLat:any,aLng:any,bLat:any,bLng:any){const v=[aLat,aLng,bLat,bLng].map(Number);if(v.some(x=>!Number.isFinite(x)))return null;const [la1,lo1,la2,lo2]=v,r=Math.PI/180,dla=(la2-la1)*r,dlo=(lo2-lo1)*r,x=Math.sin(dla/2)**2+Math.cos(la1*r)*Math.cos(la2*r)*Math.sin(dlo/2)**2;return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function gps():Promise<any>{return new Promise(r=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>r({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy}),()=>r({}),{enableHighAccuracy:true,timeout:10000,maximumAge:5000}):r({}));}
async function addressOf(p:any){if(!p.latitude)return '';try{const x=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${p.latitude}&lon=${p.longitude}`);const j=await x.json();return j.display_name||''}catch{return ''}}
export default function StopPage(){const {id}=useParams();const router=useRouter();const [m,setM]=useState<any>(null),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[code,setCode]=useState(''),[reason,setReason]=useState<Record<number,string>>({}),[comment,setComment]=useState<Record<number,string>>({}),[geo,setGeo]=useState<any>(null),[proofState,setProofState]=useState<Record<number,{state:string,message:string}>>({});const canvas=useRef<Record<number,HTMLCanvasElement|null>>({});
 const scanInputRef=useRef<HTMLInputElement|null>(null);
 const scanLock=useRef(false);
 const lastScan=useRef<{code:string;at:number}>({code:'',at:0});
 const lastPosition=useRef<any>({});

 const focusScanner=useCallback(()=>{
  window.setTimeout(()=>{
   try{
    scanInputRef.current?.focus({preventScroll:true});
   }catch{}
  },40);
 },[]);

 const setPackageScannedLocal=useCallback(
  (packageId:number,scanned:boolean)=>{
   setM((prev:any)=>{
    if(!prev)return prev;

    let found=false;

    const operations=(prev.operations||[]).map((op:any)=>{
     const packages=(op.packages||[]).map((pkg:any)=>{
      if(Number(pkg.id)!==Number(packageId))return pkg;

      found=true;

      return {
       ...pkg,
       scanned:scanned?1:0
      };
     });

     return {...op,packages};
    });

    if(!found)return prev;

    let scannedCount=0;
    let treatedCount=0;

    for(const op of operations){
     for(const pkg of op.packages||[]){
      if(Number(pkg.scanned)===1){
       scannedCount++;
      }

      if(
       Number(pkg.scanned)===1 ||
       pkg.exception_id
      ){
       treatedCount++;
      }
     }
    }

    const total=Number(prev.total_packages||0);

    return {
     ...prev,
     operations,
     scanned_packages:scannedCount,
     treated_packages:treatedCount,
     remaining_packages:Math.max(
      0,
      total-treatedCount
     )
    };
   });
  },
  []
 );
 const call=useCallback(async(path:string,init:any={})=>{const r=await fetch(API+path,{...init,headers:{Authorization:`Bearer ${token()}`,'Content-Type':'application/json',...(init.headers||{})},cache:'no-store'});let j:any={};try{j=await r.json()}catch{}if(r.status===401){router.replace('/login');throw new Error('Session expirée.')}if(!r.ok||j.success===false)throw new Error(j.message||'Erreur');return j},[router]);
 const load=useCallback(async()=>{try{setErr('');setM((await call(`/api/drivers/me/dispatch-tasks/${id}`)).task)}catch(e:any){setErr(e.message)}},[call,id]);useEffect(()=>{
  load();

  // Pas de rechargement automatique pendant l'exécution du stop.
  // Sur les terminaux Zebra, le refresh périodique pouvait interrompre
  // la saisie du destinataire et la signature.
},[load]);useEffect(()=>{if(!navigator.geolocation)return;const w=navigator.geolocation.watchPosition(p=>{lastPosition.current={latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,gps_age_ms:0}},()=>{},{enableHighAccuracy:true,maximumAge:15000,timeout:10000});return()=>navigator.geolocation.clearWatch(w)},[]);
 async function start(){setBusy(true);try{const p=await gps();setM((await call(`/api/drivers/me/dispatch-tasks/${id}/start`,{method:'POST',body:JSON.stringify(p)})).task)}catch(e:any){setErr(e.message)}finally{setBusy(false)}}
 async function scan(){
  const scanned=code.trim();

  if(!scanned){
   focusScanner();
   return;
  }

  if(scanLock.current)return;

  const now=Date.now();

  /*
   * Anti double-Enter du Zebra.
   * Très court : le chauffeur doit pouvoir enchaîner
   * rapidement plusieurs colis différents.
   */
  if(
   lastScan.current.code===scanned &&
   now-lastScan.current.at<650
  ){
   setCode('');
   focusScanner();
   return;
  }

  scanLock.current=true;
  lastScan.current={
   code:scanned,
   at:now
  };

  setBusy(true);
  setErr('');

  try{
   const pos=lastPosition.current||{};

   const r=await call(
    '/api/drivers/me/scan',
    {
     method:'POST',
     body:JSON.stringify({
      scanned_code:scanned,
      scan_type:'auto',
      scan_source:'zebra',
      ...pos
     })
    }
   );

   const targetTaskId=Number(
    r?.task?.id ??
    r?.task_id ??
    r?.dispatch_task_id ??
    r?.operation?.dispatch_task_id
   );

   const currentTaskId=Number(id);

   /*
    * Le code appartient réellement à un autre stop.
    */
   if(
    Number.isSafeInteger(targetTaskId) &&
    targetTaskId>0 &&
    targetTaskId!==currentTaskId
   ){
    setCode('');
    beep(true);

    router.replace(
     `/dashboard/driver/tasks/${targetTaskId}`
    );

    return;
   }

   /*
    * Mise à jour immédiate sans recharger toute la page.
    */
   const packageId=Number(
    r?.package?.id ??
    r?.package_id ??
    r?.event?.package_id
   );

   if(
    Number.isSafeInteger(packageId) &&
    packageId>0
   ){
    setPackageScannedLocal(
     packageId,
     true
    );
   }else if(
    r?.task &&
    Number(r.task.id)===currentTaskId
   ){
    /*
     * Si le backend fournit déjà le stop complet,
     * on l'utilise directement.
     */
    setM(r.task);
   }else{
    /*
     * Fallback seulement.
     * Ce n'est plus le fonctionnement normal.
     */
    await load();
   }

   setCode('');
   beep(true);

  }catch(e:any){
   setCode('');
   beep(false);

   setErr(
    e?.message ||
    "Impossible de traiter ce code-barres."
   );

  }finally{
   scanLock.current=false;
   setBusy(false);
   focusScanner();
  }
 }

 async function resetStopScans(){
  if(busy||!started||done)return;
  const confirmed=window.confirm(`Réinitialiser TOUS les scans de ce stop ?\n\nTous les colis scannés redeviendront non scannés. Le stop reviendra à son état initial et l'historique sera conservé.`);
  if(!confirmed){focusScanner();return;}
  const why=window.prompt("Raison de la réinitialisation :","Erreur de scan / recommencer le stop");
  if(!why||why.trim().length<3){setErr("La raison est obligatoire.");focusScanner();return;}
  setBusy(true);setErr('');
  try{
   await call(`/api/drivers/me/dispatch-tasks/${id}/scans/reset`,{method:'POST',body:JSON.stringify({reason:why.trim()})});
   const fresh=await call(`/api/drivers/me/dispatch-tasks/${id}`);setM(fresh.task);setCode('');lastScan.current={code:'',at:0};beep(true);
  }catch(e:any){beep(false);setErr(e?.message||"Impossible de réinitialiser les scans.");}
  finally{setBusy(false);focusScanner();}
 }

 async function exception(pkg:any){setBusy(true);try{const p=await gps(),r=reason[pkg.id];setM((await call(`/api/drivers/me/dispatch-tasks/${id}/packages/${pkg.id}/exception`,{method:'PUT',body:JSON.stringify({reason:r,comment:comment[pkg.id]||'',...p})})).task)}catch(e:any){setErr(e.message)}finally{setBusy(false)}}

 async function checkDeliveryZone(requireOverride=false):Promise<any>{
  const p=await gps();
  if(p.latitude==null||p.longitude==null){setGeo({state:'error',message:'Position GPS obligatoire pour la preuve de livraison.'});throw new Error('Position GPS obligatoire. Activez la localisation puis réessayez.');}
  const address=await addressOf(p), target=m?.expected_location;
  if(!target){const out={state:'unknown',message:'Adresse non géocodée : contrôle de distance indisponible.',position:p,address,override:false};setGeo(out);return out;}
  const dist=distanceMeters(p.latitude,p.longitude,target.latitude,target.longitude),tol=Number(target.tolerance_meters||150),outside=dist!=null&&dist>tol;
  let overrideReason='';
  if(outside&&requireOverride){
   const why=window.prompt(`⚠️ Vous êtes à environ ${Math.round(dist!)} m de l’adresse de livraison.\nTolérance : ${tol} m.\n\nRapprochez-vous de l’adresse ou indiquez une justification pour continuer :`,'');
   if(!why||why.trim().length<10){const out={state:'outside',message:`Vous êtes trop loin de l’adresse : ${Math.round(dist!)} m (tolérance ${tol} m).`,distance:dist,tolerance:tol,position:p,address};setGeo(out);throw new Error("Preuve bloquée hors zone : justification d'au moins 10 caractères obligatoire.");}
   overrideReason=why.trim();
  }
  const out={state:outside?'outside':'inside',message:outside?`Hors zone · ${Math.round(dist!)} m de l’adresse prévue`:`✓ Vous êtes à l’adresse · ${Math.round(dist||0)} m`,distance:dist,tolerance:tol,position:p,address,override:outside,overrideReason};setGeo(out);return out;
 }

 async function compressDeliveryPhoto(file:File):Promise<string>{
  if(!file){
   throw new Error("Aucune photo sélectionnée.");
  }

  if(!String(file.type||'').startsWith('image/')){
   throw new Error("Le fichier sélectionné n'est pas une image.");
  }

  const objectUrl=URL.createObjectURL(file);

  try{
   const img=await new Promise<HTMLImageElement>((resolve,reject)=>{
    const image=new Image();

    image.onload=()=>resolve(image);
    image.onerror=()=>reject(
     new Error("Impossible de lire la photo.")
    );

    image.src=objectUrl;
   });

   const MAX_SIDE=1800;

   let width=img.naturalWidth||img.width;
   let height=img.naturalHeight||img.height;

   if(!width||!height){
    throw new Error("Dimensions de photo invalides.");
   }

   if(width>MAX_SIDE || height>MAX_SIDE){
    const ratio=Math.min(
     MAX_SIDE/width,
     MAX_SIDE/height
    );

    width=Math.round(width*ratio);
    height=Math.round(height*ratio);
   }

   const c=document.createElement('canvas');

   c.width=width;
   c.height=height;

   const ctx=c.getContext('2d');

   if(!ctx){
    throw new Error(
     "Compression photo indisponible sur cet appareil."
    );
   }

   ctx.drawImage(
    img,
    0,
    0,
    width,
    height
   );

   /*
    * JPEG 82% :
    * qualité suffisante pour une preuve de livraison
    * tout en évitant les photos téléphone de plusieurs Mo.
    */
   let quality=.82;
   let data=c.toDataURL('image/jpeg',quality);

   /*
    * Le backend accepte actuellement max 6 000 000
    * caractères de proof_data.
    * On garde une marge de sécurité.
    */
   while(
    data.length>5_200_000 &&
    quality>.45
   ){
    quality-=.08;
    data=c.toDataURL(
     'image/jpeg',
     quality
    );
   }

   if(data.length>5_200_000){
    throw new Error(
     "La photo reste trop volumineuse. Reprenez-la avec une résolution plus faible."
    );
   }

   return data;

  }finally{
   URL.revokeObjectURL(objectUrl);
  }
 }

 async function photo(op:any,file:File){
  const opId=Number(op.operation_id);

  if(!file)return;

  setBusy(true);
  setErr('');

  setProofState(x=>({
   ...x,
   [opId]:{
    state:'processing',
    message:'Préparation de la photo…'
   }
  }));

  try{
   /*
    * 1. Compression locale avant réseau.
    */
   const proofData=
    await compressDeliveryPhoto(file);

   setProofState(x=>({
    ...x,
    [opId]:{
     state:'gps',
     message:'Photo capturée ✓ · Vérification GPS…'
    }
   }));

   /*
    * 2. Contrôle GPS / géofence.
    */
   const z=
    await checkDeliveryZone(true);

   const position=z.position||{};
   const address=z.address||'';

   setProofState(x=>({
    ...x,
    [opId]:{
     state:'uploading',
     message:'GPS validé ✓ · Envoi de la photo…'
    }
   }));

   /*
    * 3. Enregistrement backend + Cloudinary.
    */
   const response=await call(
    `/api/drivers/me/dispatch-tasks/${id}/operations/${opId}/proof`,
    {
     method:'PUT',
     body:JSON.stringify({
      proof_data:proofData,
      ...position,
      address,
      geofence_override:
       z.override===true,
      geofence_override_reason:
       z.overrideReason||''
     })
    }
   );

   if(!response?.task){
    throw new Error(
     "La photo a été envoyée mais le serveur n'a pas retourné le stop mis à jour."
    );
   }

   setM(response.task);

   setProofState(x=>({
    ...x,
    [opId]:{
     state:'success',
     message:'Photo enregistrée ✓'
    }
   }));

   beep(true);

  }catch(e:any){
   const message=
    e?.message ||
    "Impossible d'enregistrer la photo de livraison.";

   setProofState(x=>({
    ...x,
    [opId]:{
     state:'error',
     message
    }
   }));

   setErr(message);
   beep(false);

  }finally{
   setBusy(false);
  }
 }
 function prepCanvas(opId:number,c:HTMLCanvasElement|null){if(!c)return;canvas.current[opId]=c;const ctx=c.getContext('2d');if(!ctx)return;ctx.lineWidth=3;ctx.lineCap='round';let down=false;const pos=(e:PointerEvent)=>{const r=c.getBoundingClientRect();return[(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};c.onpointerdown=e=>{down=true;const [x,y]=pos(e);ctx.beginPath();ctx.moveTo(x,y);c.setPointerCapture(e.pointerId)};c.onpointermove=e=>{if(!down)return;const [x,y]=pos(e);ctx.lineTo(x,y);ctx.stroke()};c.onpointerup=()=>down=false;}
 async function signature(op:any){const first=(document.getElementById(`first-${op.operation_id}`) as HTMLInputElement)?.value.trim()||'',last=(document.getElementById(`last-${op.operation_id}`) as HTMLInputElement)?.value.trim()||'',c=canvas.current[op.operation_id];if(!first||!last){setErr("Le prénom et le nom du destinataire sont obligatoires.");return}if(!c)return;setBusy(true);try{const z=await checkDeliveryZone(true),p=z.position,address=z.address;setM((await call(`/api/drivers/me/dispatch-tasks/${id}/operations/${op.operation_id}/proof`,{method:'PUT',body:JSON.stringify({proof_data:c.toDataURL('image/png'),recipient_first_name:first,recipient_last_name:last,...p,address,geofence_override:z.override===true,geofence_override_reason:z.overrideReason||''})})).task);beep(true);setErr('')}catch(e:any){beep(false);setErr(e.message)}finally{setBusy(false)}}
 const missingProof=()=>m?.task_type==='delivery'&&(m.operations||[]).some((op:any)=>(op.packages||[]).some((p:any)=>Number(p.scanned)===1)&&!op.proof);
 async function close(){if(m.remaining_packages>0){setErr(`${m.remaining_packages} colis restent à scanner ou justifier.`);return}if(missingProof()){setErr("La preuve de livraison obligatoire n'est pas encore enregistrée pour toutes les commandes réussies.");return}setBusy(true);try{const p=await gps(),address=await addressOf(p);let extra:any={};if(m.task_type==='delivery'&&m.expected_location&&p.latitude!=null&&p.longitude!=null){const dist=distanceMeters(p.latitude,p.longitude,m.expected_location.latitude,m.expected_location.longitude),tol=Number(m.expected_location.tolerance_meters||150);if(dist!=null&&dist>tol){const why=window.prompt(`Vous êtes à environ ${Math.round(dist)} m du point de livraison (tolérance ${tol} m).\n\nExpliquez pourquoi vous confirmez quand même la livraison :`,'');if(!why||why.trim().length<10){setErr("Livraison hors zone : justification d'au moins 10 caractères obligatoire.");return}extra={geofence_override:true,geofence_override_reason:why.trim()};}}await call(`/api/drivers/me/dispatch-tasks/${id}/close`,{method:'POST',body:JSON.stringify({...p,address,...extra})});router.replace('/dashboard/driver')}catch(e:any){setErr(e.message)}finally{setBusy(false)}}
 if(!m)return <main style={{padding:24}}><DriverLiveTracking/><button onClick={()=>router.push('/dashboard/driver')}>Retour</button><p>{err||'Chargement…'}</p></main>;
 const total=Number(m.total_packages||0),treated=Number(m.treated_packages||0),done=m.run?.execution_status==='completed'||m.run?.execution_status==='partial',started=m.run?.execution_status==='in_progress'&&!!m.run?.started_at,proofMissing=missingProof();
 return <main style={{minHeight:'100dvh',background:'#f5f6f8',padding:'18px 12px 70px',color:'#15171a'}}><div style={{maxWidth:900,margin:'auto'}}>
 <div style={{display:'flex',justifyContent:'space-between',gap:8}}><button onClick={()=>router.push('/dashboard/driver')} style={B}><ArrowLeft size={17}/> Mes stops</button><button onClick={load} style={B}><RefreshCw size={17}/> Actualiser</button></div>
 <section style={C}><small style={{fontWeight:800,color:'#d9043d'}}>{m.task_type==='pickup'?'RAMASSAGE':'LIVRAISON'} · STOP #{m.id}</small><h1 style={{margin:'8px 0'}}>Stop {m.stop_position?`#${m.stop_position}`:''}</h1><p><MapPin size={16}/> {[m.address,m.city,m.province,m.postal_code].filter(Boolean).join(', ')}</p><p><b>Statut :</b> {m.run?.execution_status||m.status} · <b>{treated}/{total}</b> colis traités</p>{m.task_type==='delivery'&&m.expected_location&&<p style={{background:'#eef6ff',padding:10,borderRadius:9}}><b>Zone de livraison :</b> ±{m.expected_location.tolerance_meters} m autour du point prévu · {m.expected_location.address||`${m.expected_location.latitude}, ${m.expected_location.longitude}`}</p>}{m.expected_location&&<a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${m.expected_location.latitude},${m.expected_location.longitude}`)}`} target="_blank" rel="noreferrer" style={{...P,textDecoration:'none',marginRight:8}}>Navigation vers le stop</a>}{!m.run?.started_at&&!done&&<button disabled={busy} onClick={start} style={P}>Commencer le stop</button>}</section>
 {err&&<div style={{...C,borderColor:'#e63946',color:'#a4131b'}}><TriangleAlert size={18}/> {err}</div>}
 {!done&&!started&&<section style={{...C,borderColor:'#f59e0b',background:'#fffbeb'}}><h2><ScanLine size={20}/> Scanner</h2><p style={{marginBottom:0,fontWeight:700}}>Commencez le stop avant de scanner les colis.</p></section>}

 {started&&!done&&<section style={C}>
  <h2><ScanLine size={20}/> Scanner un colis</h2>

  <p style={{fontWeight:800,fontSize:18}}>
   📦 {treated} / {total} colis traités
  </p>

  <div style={{display:'flex',gap:8}}>
   <input
    ref={scanInputRef}
    autoFocus
    autoComplete="off"
    autoCapitalize="off"
    spellCheck={false}
    value={code}
    onChange={e=>setCode(e.target.value)}
    onKeyDown={e=>{
     if(e.key==='Enter'){
      e.preventDefault();
      e.stopPropagation();
      scan();
     }
    }}
    placeholder="Scanner Zebra / saisir le code-barres"
    style={I}
   />

   <button
    disabled={busy}
    onClick={scan}
    style={P}
   >
    Scanner
   </button>
  </div>

  {started&&treated>0&&<button type="button" disabled={busy} onClick={resetStopScans} style={{...B,width:'100%',marginTop:12,color:'#b42318',borderColor:'#f1aeb5',background:'#fff5f5',fontWeight:800}}>↶ Réinitialiser tous les scans du stop</button>}

 </section>}
 {m.task_type==='delivery'&&!done&&<section style={{...C,borderColor:geo?.state==='outside'?'#f59e0b':geo?.state==='inside'?'#16a34a':'#d9dde3'}}><h2><MapPin size={20}/> Position de livraison</h2><p>{geo?.message||'Vérifiez votre position avant de prendre la photo ou la signature.'}</p>{geo?.distance!=null&&<p><b>Distance :</b> {Math.round(geo.distance)} m · <b>Tolérance :</b> {geo.tolerance} m{geo?.position?.accuracy!=null?` · GPS ±${Math.round(geo.position.accuracy)} m`:''}</p>}<button disabled={busy} onClick={()=>checkDeliveryZone(false).catch((e:any)=>setErr(e.message))} style={B}>Actualiser ma position</button>{m.expected_location&&<a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${m.expected_location.latitude},${m.expected_location.longitude}`)}`} target="_blank" rel="noreferrer" style={{...P,textDecoration:'none',marginLeft:8}}>Ouvrir la navigation</a>}</section>}
 {(m.operations||[]).map((op:any)=><section key={op.operation_id} style={C}><h2>{op.order_number||`Commande #${op.order_id||op.operation_id}`}</h2><p><b>Opération :</b> {m.task_type==='pickup'?'Ramassage':'Livraison'} · <b>{op.total_packages}</b> unité(s) · {m.task_type==='pickup'?'Scan seulement — aucune preuve requise':Number(op.signature_required)===1?'Signature + prénom + nom obligatoires':'Photo obligatoire'}</p>{op.notes&&<p style={{background:'#fff7ed',padding:10,borderRadius:9}}><b>Instructions particulières :</b> {op.notes}</p>}{(op.packages||[]).map((p:any)=><div key={p.id} style={{padding:'12px 0',borderTop:'1px solid #eee'}}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><span><Package size={15}/> <b>{p.barcode||`Colis #${p.id}`}</b></span><span style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
 {Number(p.scanned)===1?
  <>
   <b style={{color:'#15803d'}}>✓ Scanné</b>
   
  </>
  :
  p.exception_id?
   <b style={{color:'#b45309'}}>⚠ Justifié</b>
  :
   <span>À traiter</span>
 }
</span></div><div style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:7,fontSize:14,color:'#555'}}><span><b>Type :</b> {p.package_type==='pallet'?'Palette':'Colis'}</span><span><b>Poids :</b> {p.weight!=null&&p.weight!==''?`${p.weight} ${p.weight_unit||'lb'}`:'—'}</span></div>{Number(p.scanned)!==1&&!p.exception_id&&!done&&started&&<div style={{display:'grid',gap:7,marginTop:9}}><select value={reason[p.id]||''} onChange={e=>setReason(x=>({...x,[p.id]:e.target.value}))} style={I}><option value="">Signaler un problème…</option>{REASONS.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select>{reason[p.id]==='other'&&<input style={I} placeholder="Commentaire obligatoire" value={comment[p.id]||''} onChange={e=>setComment(x=>({...x,[p.id]:e.target.value}))}/>}<button disabled={!reason[p.id]||busy} onClick={()=>exception(p)} style={B}>Enregistrer l'exception</button></div>}{p.exception_id&&<small>Raison : {REASONS.find(x=>x[0]===p.exception_reason)?.[1]||p.exception_reason}{p.exception_comment?` — ${p.exception_comment}`:''}</small>}</div>)}
 {m.task_type==='delivery'&&<div style={{marginTop:18,paddingTop:14,borderTop:'2px solid #eee'}}><h3>{Number(op.signature_required)===1?<><Signature size={18}/> Signature du destinataire</>:<><Camera size={18}/> Photo de livraison</>}</h3>{op.proof?<p><CheckCircle2 size={17}/> Preuve enregistrée {op.proof.recipient_first_name?`— ${op.proof.recipient_first_name} ${op.proof.recipient_last_name}`:''}</p>:!done&&started&&(Number(op.signature_required)===1?<div style={{display:'grid',gap:8}}><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><input id={`first-${op.operation_id}`} style={I} placeholder="Prénom obligatoire"/><input id={`last-${op.operation_id}`} style={I} placeholder="Nom obligatoire"/></div><canvas ref={c=>prepCanvas(op.operation_id,c)} width={700} height={220} style={{width:'100%',height:180,border:'1px solid #bbb',borderRadius:10,background:'#fff',touchAction:'none'}}/><button disabled={busy} onClick={()=>signature(op)} style={P}>Enregistrer signature</button></div>:<div style={{display:'grid',gap:8}}>
 <input
  type="file"
  accept="image/*"
  capture="environment"
  disabled={busy}
  onChange={e=>{
   const file=e.target.files?.[0];
   if(file)photo(op,file);
   e.currentTarget.value='';
  }}
 />
 <p style={{
  fontSize:13,
  margin:0,
  color:
   proofState[op.operation_id]?.state==='error'
    ?'#b42318'
    :proofState[op.operation_id]?.state==='success'
    ?'#15803d'
    :'#666'
 }}>
  {proofState[op.operation_id]?.message||
   'Prenez une photo de livraison. Elle sera optimisée automatiquement avant l’envoi.'}
 </p>
</div>)}</div>}</section>)}
 {started&&!done&&<section style={C}><button disabled={busy||m.remaining_packages>0||proofMissing} onClick={close} style={{...P,width:'100%',opacity:(m.remaining_packages>0||proofMissing)?.5:1}}>{m.task_type==='pickup'?'Confirmer le ramassage':'Confirmer la livraison'}</button>{m.remaining_packages>0&&<p style={{textAlign:'center'}}>Impossible de fermer : {m.remaining_packages} colis restent à scanner ou justifier.</p>}{proofMissing&&<p style={{textAlign:'center'}}>Impossible de fermer : preuve de livraison obligatoire manquante.</p>}</section>}
 {done&&<section style={C}><h2><CheckCircle2/> Stop {m.run.execution_status==='partial'?'partiel':'complété'}</h2><p>Fermé : {m.run.closed_at||'—'}</p><p>GPS : {m.run.close_latitude||'—'}, {m.run.close_longitude||'—'}</p><p>{m.run.close_address||''}</p></section>}
 </div></main>}
const C:React.CSSProperties={background:'#fff',border:'1px solid #e1e4e8',borderRadius:16,padding:18,marginTop:14,boxShadow:'0 4px 18px rgba(0,0,0,.04)'};const B:React.CSSProperties={display:'inline-flex',alignItems:'center',gap:7,padding:'11px 14px',border:'1px solid #d9dde3',borderRadius:10,background:'#fff',fontWeight:700};const P:React.CSSProperties={...B,background:'#17191d',color:'#fff',borderColor:'#17191d'};const I:React.CSSProperties={width:'100%',padding:'12px',border:'1px solid #cfd4da',borderRadius:9,fontSize:16};