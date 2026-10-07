"use strict";
const Workflow=require("../services/orderWorkflowService");
function validId(v){const n=Number(v);return Number.isSafeInteger(n)&&n>0?n:null;}
const REASONS=new Set(["missing","not_loaded","damaged","wrong_label","client_absent","client_refused","access_impossible","address_invalid","cancelled","technical_failed","other"]);
const BUSINESS_TIMEZONE=process.env.APP_TIMEZONE||process.env.BUSINESS_TIMEZONE||"America/Toronto";
function businessDay(v){try{return new Intl.DateTimeFormat("en-CA",{timeZone:BUSINESS_TIMEZONE,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(v));}catch(_){return new Date(v).toISOString().slice(0,10);}}
const GEOFENCE_RADIUS_METERS=Math.max(25,Math.min(2000,Number(process.env.GEOFENCE_RADIUS_METERS||150)||150));
function haversineMeters(aLat,aLng,bLat,bLng){
  const vals=[aLat,aLng,bLat,bLng].map(Number); if(vals.some(v=>!Number.isFinite(v)))return null;
  const [lat1,lon1,lat2,lon2]=vals,rad=Math.PI/180,dLat=(lat2-lat1)*rad,dLon=(lon2-lon1)*rad;
  const x=Math.sin(dLat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

async function ensureRun(c,taskId,driverId){
  await c.query(`INSERT INTO driver_stop_runs(dispatch_task_id,driver_id) VALUES(?,?) ON DUPLICATE KEY UPDATE updated_at=updated_at`,[taskId,driverId]);
}
async function taskOwned(c,driverId,taskId){
  const [r]=await c.query(`SELECT * FROM dispatch_tasks WHERE id=? AND driver_id=? AND status<>'cancelled' LIMIT 1`,[taskId,driverId]); return r[0]||null;
}
async function operationsFor(c,driverId,task){
  const [ops]=await c.query(`SELECT op.id operation_id,op.order_id,op.operation_type,op.status operation_status,o.order_number,o.pickup_address,o.delivery_address,o.signature_required,o.contact_name,o.contact_phone,o.notes,(SELECT os.latitude FROM order_stops os WHERE os.order_id=op.order_id AND os.stop_type=op.operation_type ORDER BY os.stop_order,os.id LIMIT 1) expected_latitude,(SELECT os.longitude FROM order_stops os WHERE os.order_id=op.order_id AND os.stop_type=op.operation_type ORDER BY os.stop_order,os.id LIMIT 1) expected_longitude,(SELECT CONCAT_WS(', ',os.address,os.city,os.province,os.postal_code) FROM order_stops os WHERE os.order_id=op.order_id AND os.stop_type=op.operation_type ORDER BY os.stop_order,os.id LIMIT 1) expected_address FROM order_operations op JOIN orders o ON o.id=op.order_id WHERE op.dispatch_task_id=? AND op.driver_id=? AND op.operation_type=? AND op.status<>'cancelled' ORDER BY op.id`,[task.id,driverId,task.task_type]);
  for(const op of ops){
    const [pkgs]=await c.query(`SELECT p.id,p.order_id,p.barcode,p.package_number,p.package_type,p.description,p.weight,p.weight_unit,p.current_status,CASE WHEN EXISTS(SELECT 1 FROM scan_events se LEFT JOIN scan_cancellations sc ON sc.scan_event_id=se.id WHERE se.package_id=p.id AND se.operation_id=? AND se.driver_id=? AND se.scan_status='accepted' AND se.scan_type=? AND sc.id IS NULL) THEN 1 ELSE 0 END scanned,e.id exception_id,e.reason exception_reason,e.comment exception_comment,e.proof_url exception_proof_url,e.created_at exception_at FROM order_packages p LEFT JOIN driver_package_exceptions e ON e.package_id=p.id AND e.operation_id=? AND e.driver_id=? WHERE p.order_id=? AND NOT EXISTS(SELECT 1 FROM operation_package_exclusions ox WHERE ox.operation_id=? AND ox.package_id=p.id AND ox.active=1) ORDER BY p.package_number,p.id`,[op.operation_id,driverId,task.task_type,op.operation_id,driverId,op.order_id,op.operation_id]);
    const [proofs]=await c.query(`SELECT id,proof_type,recipient_first_name,recipient_last_name,latitude,longitude,accuracy,cloudinary_url,cloudinary_public_id,closure_address,created_at,CASE WHEN proof_data IS NULL AND cloudinary_url IS NULL THEN 0 ELSE 1 END has_proof FROM driver_delivery_proofs WHERE dispatch_task_id=? AND operation_id=? AND driver_id=? LIMIT 1`,[task.id,op.operation_id,driverId]);
    op.packages=pkgs; op.proof=proofs[0]||null; op.total_packages=pkgs.length; op.scanned_packages=pkgs.filter(p=>Number(p.scanned)===1).length; op.justified_packages=pkgs.filter(p=>p.exception_id).length;
  } return ops;
}
async function getDriverDispatchTaskById(c,driverId,taskId){
  driverId=validId(driverId);taskId=validId(taskId);if(!driverId||!taskId)throw new Error('Identifiant invalide.');
  const task=await taskOwned(c,driverId,taskId);if(!task)return null; await ensureRun(c,taskId,driverId);
  const operations=await operationsFor(c,driverId,task);
  const [runs]=await c.query(`SELECT * FROM driver_stop_runs WHERE dispatch_task_id=? AND driver_id=? LIMIT 1`,[taskId,driverId]);
  const [events]=await c.query(`SELECT se.id,se.order_id,se.package_id,se.operation_id,se.scanned_code,se.scan_status,se.latitude,se.longitude,se.accuracy,se.scan_source,se.notes,se.scanned_at,p.barcode,p.package_number FROM scan_events se LEFT JOIN order_packages p ON p.id=se.package_id WHERE se.driver_id=? AND se.operation_id IN (SELECT id FROM order_operations WHERE dispatch_task_id=? AND driver_id=?) ORDER BY se.scanned_at DESC,se.id DESC LIMIT 200`,[driverId,taskId,driverId]);
  const all=operations.flatMap(o=>o.packages); const treated=all.filter(p=>Number(p.scanned)===1||p.exception_id).length;
  const target=operations.find(o=>o.expected_latitude!=null&&o.expected_longitude!=null); return {...task,run:runs[0]||null,operations,orders:operations.map(o=>({id:o.order_id,order_id:o.order_id,order_number:o.order_number,operation_id:o.operation_id,signature_required:o.signature_required,notes:o.notes,packages:o.packages})),expected_location:target?{latitude:Number(target.expected_latitude),longitude:Number(target.expected_longitude),address:target.expected_address||task.address||null,tolerance_meters:GEOFENCE_RADIUS_METERS}:null,total_orders:operations.length,total_packages:all.length,scanned_packages:all.filter(p=>Number(p.scanned)===1).length,justified_packages:all.filter(p=>p.exception_id).length,treated_packages:treated,remaining_packages:Math.max(0,all.length-treated),events};
}
async function getDriverDispatchTasks(c,driverId){
  driverId=validId(driverId);if(!driverId)throw new Error('Identifiant chauffeur invalide.');
  const [rows]=await c.query(`SELECT dt.*,COALESCE(r.execution_status,CASE WHEN dt.status='completed' THEN 'completed' WHEN dt.status='in_progress' THEN 'in_progress' ELSE 'todo' END) execution_status,r.closed_at
  FROM dispatch_tasks dt
  LEFT JOIN driver_stop_runs r
    ON r.dispatch_task_id=dt.id AND r.driver_id=dt.driver_id
  WHERE dt.driver_id=?
    AND dt.status <> 'cancelled'
    AND (
      COALESCE(
        r.execution_status,
        CASE
          WHEN dt.status='completed' THEN 'completed'
          WHEN dt.status='in_progress' THEN 'in_progress'
          ELSE 'todo'
        END
      ) IN ('completed','partial')
      OR EXISTS (
        SELECT 1
        FROM order_operations op
        WHERE op.dispatch_task_id=dt.id
          AND op.driver_id=?
          AND op.operation_type=dt.task_type
          AND op.status<>'cancelled'
      )
    )
  ORDER BY
    CASE COALESCE(r.execution_status,'todo')
      WHEN 'in_progress' THEN 0
      WHEN 'todo' THEN 1
      WHEN 'failed' THEN 2
      WHEN 'partial' THEN 3
      WHEN 'completed' THEN 4
      ELSE 5
    END,
    dt.scheduled_date,
    dt.stop_position,
    dt.scheduled_time,
    dt.id`,[driverId,driverId]);
  // V5 : les stops terminés restent visibles dans l'application chauffeur
  // jusqu'à la fin de la journée métier, puis restent dans l'historique.
  const today=businessDay(new Date());
  const visible=rows.filter(row=>{
    const st=String(row.execution_status||'');
    if(!['completed','partial'].includes(st)) return true;
    return row.closed_at && businessDay(row.closed_at)===today;
  });
  const out=[];for(const row of visible){const d=await getDriverDispatchTaskById(c,driverId,row.id);if(d)out.push({...d,execution_status:row.execution_status,closed_at:row.closed_at});}return out;
}
async function startStop(c,driverId,taskId,p={}){
  const task=await taskOwned(c,driverId,taskId);if(!task)return null;
  const [active]=await c.query(`SELECT dsr.dispatch_task_id FROM driver_stop_runs dsr JOIN dispatch_tasks dt ON dt.id=dsr.dispatch_task_id WHERE dsr.driver_id=? AND dsr.execution_status='in_progress' AND dt.status='in_progress' AND dsr.dispatch_task_id<>? LIMIT 1`,[driverId,taskId]);
  if(active[0]) throw Object.assign(new Error(`Un autre stop (#${active[0].dispatch_task_id}) est déjà en cours. Fermez-le ou remettez-le en attente avant d'en démarrer un autre.`),{statusCode:409});
  await ensureRun(c,taskId,driverId);await c.query(`UPDATE driver_stop_runs SET execution_status='in_progress',started_at=COALESCE(started_at,NOW()),start_latitude=?,start_longitude=?,start_accuracy=? WHERE dispatch_task_id=? AND driver_id=?`,[p.latitude??null,p.longitude??null,p.accuracy??null,taskId,driverId]);await c.query(`UPDATE dispatch_tasks SET status='in_progress' WHERE id=? AND status IN('pending','assigned')`,[taskId]);await c.query(`UPDATE order_operations SET status='in_progress' WHERE dispatch_task_id=? AND driver_id=? AND operation_type=? AND status IN('pending','assigned')`,[taskId,driverId,task.task_type]);return getDriverDispatchTaskById(c,driverId,taskId);}
async function saveException(c,driverId,taskId,packageId,p={}){const task=await taskOwned(c,driverId,taskId);if(!task) return null;packageId=validId(packageId);if(!packageId||!REASONS.has(p.reason))throw Object.assign(new Error('Raison invalide.'),{statusCode:400});if((p.reason==='other'||p.reason==='technical_failed'||p.reason==='cancelled')&&!String(p.comment||'').trim())throw Object.assign(new Error('Une justification détaillée est obligatoire.'),{statusCode:400});if(p.reason==='technical_failed'&&!String(p.exception_proof_url||'').trim())throw Object.assign(new Error('Une photo est obligatoire pour un échec technique.'),{statusCode:400});const [r]=await c.query(`SELECT p.id,p.order_id,op.id operation_id FROM order_packages p JOIN order_operations op ON op.order_id=p.order_id WHERE p.id=? AND op.dispatch_task_id=? AND op.driver_id=? AND op.operation_type=? LIMIT 1`,[packageId,taskId,driverId,task.task_type]);if(!r[0])throw Object.assign(new Error('Ce colis ne fait pas partie de ce stop.'),{statusCode:404});await c.query(`INSERT INTO driver_package_exceptions(dispatch_task_id,operation_id,order_id,package_id,driver_id,reason,comment,latitude,longitude,accuracy,proof_url,proof_public_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE reason=VALUES(reason),comment=VALUES(comment),latitude=VALUES(latitude),longitude=VALUES(longitude),accuracy=VALUES(accuracy),proof_url=VALUES(proof_url),proof_public_id=VALUES(proof_public_id),updated_at=CURRENT_TIMESTAMP`,[taskId,r[0].operation_id,r[0].order_id,packageId,driverId,p.reason,String(p.comment||'').trim()||null,p.latitude??null,p.longitude??null,p.accuracy??null,p.exception_proof_url??null,p.exception_proof_public_id??null]);return getDriverDispatchTaskById(c,driverId,taskId);}
async function saveProof(c,driverId,taskId,operationId,p={}){const task=await taskOwned(c,driverId,taskId);if(!task)return null;if(task.task_type!=='delivery')throw Object.assign(new Error('Aucune preuve de livraison n’est requise pour un ramassage.'),{statusCode:400});operationId=validId(operationId);const [r]=await c.query(`SELECT op.id,op.order_id,o.signature_required FROM order_operations op JOIN orders o ON o.id=op.order_id WHERE op.id=? AND op.dispatch_task_id=? AND op.driver_id=? AND op.operation_type=? LIMIT 1`,[operationId,taskId,driverId,task.task_type]);const op=r[0];if(!op)throw Object.assign(new Error('Commande introuvable dans ce stop.'),{statusCode:404});const type=Number(op.signature_required)===1?'signature':'photo';if(!String(p.proof_data||'').startsWith('data:image/'))throw Object.assign(new Error(type==='signature'?'Signature obligatoire.':'Photo obligatoire.'),{statusCode:400});if(type==='signature'&&(!String(p.recipient_first_name||'').trim()||!String(p.recipient_last_name||'').trim()))throw Object.assign(new Error('Prénom et nom du destinataire obligatoires.'),{statusCode:400});if(String(p.proof_data).length>6_000_000)throw Object.assign(new Error('Preuve trop volumineuse.'),{statusCode:413});await c.query(`INSERT INTO driver_delivery_proofs(dispatch_task_id,operation_id,order_id,driver_id,proof_type,recipient_first_name,recipient_last_name,proof_data,latitude,longitude,accuracy,cloudinary_url,cloudinary_public_id,closure_address) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE proof_type=VALUES(proof_type),recipient_first_name=VALUES(recipient_first_name),recipient_last_name=VALUES(recipient_last_name),proof_data=VALUES(proof_data),latitude=VALUES(latitude),longitude=VALUES(longitude),accuracy=VALUES(accuracy),cloudinary_url=VALUES(cloudinary_url),cloudinary_public_id=VALUES(cloudinary_public_id),closure_address=VALUES(closure_address),updated_at=CURRENT_TIMESTAMP`,[taskId,operationId,op.order_id,driverId,type,String(p.recipient_first_name||'').trim()||null,String(p.recipient_last_name||'').trim()||null,p.proof_data,p.latitude??null,p.longitude??null,p.accuracy??null,p.cloudinary_url??null,p.cloudinary_public_id??null,p.closure_address??null]);return getDriverDispatchTaskById(c,driverId,taskId);}
async function getProof(c,driverId,taskId,operationId){const [r]=await c.query(`SELECT proof_type,recipient_first_name,recipient_last_name,proof_data,cloudinary_url,cloudinary_public_id,closure_address,latitude,longitude,accuracy,created_at,updated_at FROM driver_delivery_proofs WHERE dispatch_task_id=? AND operation_id=? AND driver_id=? LIMIT 1`,[taskId,operationId,driverId]);return r[0]||null;}
async function syncRouteStatus(conn, routeId){
  const rid=validId(routeId); if(!rid)return;
  const [rows]=await conn.query(`SELECT status FROM dispatch_tasks WHERE route_id=? AND status<>'cancelled'`,[rid]);
  if(!rows.length){await conn.query(`UPDATE dispatch_routes SET status='draft' WHERE id=? AND status<>'cancelled'`,[rid]);return;}
  const statuses=rows.map(x=>String(x.status||''));
  // La route reste réutilisable tant que le Dispatch ne la termine pas explicitement.
  // Finir le dernier stop ne termine donc jamais automatiquement la route.
  const [[route]]=await conn.query(`SELECT driver_id,vehicle_id,status FROM dispatch_routes WHERE id=? LIMIT 1`,[rid]);
  if(!route || ['completed','cancelled'].includes(String(route.status||''))) return;
  let next=(route.driver_id||route.vehicle_id)?'assigned':'draft';
  if(statuses.some(x=>x==='in_progress')) next='in_progress';
  await conn.query(`UPDATE dispatch_routes SET status=? WHERE id=? AND status NOT IN ('completed','cancelled')`,[next,rid]);
}
async function closeStop(c,driverId,taskId,p={}){
  const d=await getDriverDispatchTaskById(c,driverId,taskId);
  if(!d)return null;
  if(d.remaining_packages>0)throw Object.assign(new Error(`Fermeture impossible : ${d.remaining_packages} colis ne sont ni scannés ni justifiés.`),{statusCode:409});
  if(d.task_type==='delivery'){
    for(const op of d.operations){
      // Une commande entièrement en incident n'a pas besoin d'une preuve de livraison réussie.
      const successful=op.packages.some(pkg=>Number(pkg.scanned)===1);
      if(successful && !op.proof)throw Object.assign(new Error(`Preuve manquante pour ${op.order_number}.`),{statusCode:409});
      if(successful && Number(op.signature_required)===1&&op.proof?.proof_type!=='signature')throw Object.assign(new Error(`Signature obligatoire pour ${op.order_number}.`),{statusCode:409});
      if(successful && Number(op.signature_required)!==1&&op.proof?.proof_type!=='photo')throw Object.assign(new Error(`Photo obligatoire pour ${op.order_number}.`),{statusCode:409});
    }
  }
  let geofence=null;
  if(d.task_type==='delivery'){
    const successfulOps=d.operations.filter(op=>op.packages.some(pkg=>Number(pkg.scanned)===1));
    const checks=successfulOps.filter(op=>op.expected_latitude!=null&&op.expected_longitude!=null).map(op=>({order_number:op.order_number,address:op.expected_address||op.delivery_address||null,distance_meters:haversineMeters(p.latitude,p.longitude,op.expected_latitude,op.expected_longitude)}));
    if(checks.length){
      if(p.latitude==null||p.longitude==null)throw Object.assign(new Error('GPS précis obligatoire pour confirmer cette livraison.'),{statusCode:409});
      const far=checks.filter(x=>x.distance_meters==null||x.distance_meters>GEOFENCE_RADIUS_METERS);
      geofence={tolerance_meters:GEOFENCE_RADIUS_METERS,checks,outside:far.length>0,override:false};
      if(far.length){
        const reason=String(p.geofence_override_reason||'').trim();
        if(p.geofence_override!==true||reason.length<10){
          const worst=Math.max(...far.map(x=>Number(x.distance_meters||0)));
          throw Object.assign(new Error(`Vous êtes hors de la zone de livraison (${Math.round(worst)} m; tolérance ${GEOFENCE_RADIUS_METERS} m). Une justification d'au moins 10 caractères est obligatoire pour forcer la fermeture.`),{statusCode:409,code:'GEOFENCE_OUTSIDE'});
        }
        geofence.override=true; geofence.override_reason=reason;
      }
    }
  }
  const conn=typeof c.getConnection==='function'?await c.getConnection():c;
  const release=conn!==c&&typeof conn.release==='function';
  try{
    await conn.beginTransaction();
    const hasExceptions=d.operations.some(op=>op.packages.some(pkg=>pkg.exception_id));
    const runStatus=hasExceptions?'partial':'completed';
    await conn.query(`UPDATE driver_stop_runs SET execution_status=?,closed_at=NOW(),close_latitude=?,close_longitude=?,close_accuracy=?,close_address=? WHERE dispatch_task_id=? AND driver_id=?`,[runStatus,p.latitude??null,p.longitude??null,p.accuracy??null,String(p.address||'').slice(0,500)||null,taskId,driverId]);
    if(geofence){try{await conn.query(`INSERT INTO operational_audit_log(entity_type,entity_id,action,route_id,dispatch_task_id,driver_id,vehicle_id,metadata) VALUES('stop',?,'delivery_geofence_check',?,?,?,?,?)`,[taskId,d.route_id||null,taskId,driverId,d.vehicle_id||null,JSON.stringify({...geofence,close_latitude:p.latitude??null,close_longitude:p.longitude??null,close_accuracy:p.accuracy??null,close_address:p.address||null})]);}catch(e){if(e&&e.code!=='ER_NO_SUCH_TABLE')throw e;}}
    await conn.query(`UPDATE dispatch_tasks SET status='completed' WHERE id=?`,[taskId]);

    const packageStatus=Workflow.packageStatusAfterStop(d.task_type);
    const normalOrderStatus=Workflow.statusAfterStop(d.task_type);
    for(const op of d.operations){
      const opHasExceptions=op.packages.some(pkg=>pkg.exception_id);
      const opHasSuccessfulScans=op.packages.some(pkg=>Number(pkg.scanned)===1);
      if(packageStatus){
        await conn.query(`UPDATE order_packages p
          SET p.current_status=?
          WHERE p.order_id=?
            AND EXISTS (
              SELECT 1
              FROM scan_events se
              LEFT JOIN scan_cancellations sc
                ON sc.scan_event_id=se.id
              WHERE se.package_id=p.id
                AND se.operation_id=?
                AND se.driver_id=?
                AND se.scan_status='accepted'
                AND se.scan_type=?
                AND sc.id IS NULL
            )`,[packageStatus,op.order_id,op.operation_id,driverId,d.task_type]);
      }
      /*
       * WORKFLOW MULTI-COLIS
       *
       * - Tous les colis réussis ont déjà reçu leur propre current_status.
       * - Une exception sur un autre colis ne doit jamais bloquer ces colis.
       * - Si au moins un colis a réussi, la commande continue son workflow.
       * - La commande globale ne devient "incident" que lorsqu'aucun colis
       *   de cette opération n'a réussi.
       *
       * L'état "partial" reste porté par driver_stop_runs et par l'audit.
       */
      const effectiveOrderStatus =
        opHasSuccessfulScans
          ? normalOrderStatus
          : (opHasExceptions ? 'incident' : normalOrderStatus);

      const operationStatus='completed';
      await conn.query(`UPDATE order_operations SET status=?,completed_at=COALESCE(completed_at,NOW()) WHERE id=?`,[operationStatus,op.operation_id]);
      if(effectiveOrderStatus){
        await Workflow.transitionOrderStatus(conn,{
          orderId:op.order_id,nextStatus:effectiveOrderStatus,
          action:d.task_type==='pickup'?'pickup_completed':'delivery_completed',
          comment:
            opHasExceptions && opHasSuccessfulScans
              ? `${d.task_type==='pickup'?'Ramassage':'Livraison'} partiel(le) au stop #${taskId}. Certains colis ont réussi et continuent leur workflow; les colis en incident restent bloqués individuellement.`
              : opHasExceptions
                ? `${d.task_type==='pickup'?'Ramassage':'Livraison'} fermé(e) en incident au stop #${taskId}. Aucun colis de cette opération n'a réussi.`
                : (d.task_type==='pickup'
                    ? `Ramassage complété au stop #${taskId}. Commande maintenant À livrer.`
                    : `Livraison complétée au stop #${taskId}. Commande terminée.`),
          routeId:d.route_id||null,dispatchTaskId:taskId,driverId,vehicleId:d.vehicle_id||null,
          metadata:{execution_status:opHasExceptions?'partial':'completed',close_address:p.address||null,latitude:p.latitude??null,longitude:p.longitude??null,accuracy:p.accuracy??null,successful_scan:opHasSuccessfulScans}
        });
      }
    }
    await syncRouteStatus(conn,d.route_id);
    await conn.commit();
  }catch(e){try{await conn.rollback();}catch(_e){}throw e;}finally{if(release)conn.release();}
  return getDriverDispatchTaskById(c,driverId,taskId);
}
module.exports={getDriverDispatchTasks,getDriverDispatchTaskById,startStop,saveException,saveProof,getProof,closeStop};
