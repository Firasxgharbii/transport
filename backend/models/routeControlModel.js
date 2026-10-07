"use strict";

const id = v => Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
const allowed = new Set(["pending", "assigned"]);

async function transaction(db, routeId, actor, action) {
  const route = id(routeId);
  if (!route || !id(actor)) throw new Error("Identifiant invalide.");
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[r]] = await conn.query("SELECT * FROM dispatch_routes WHERE id=? FOR UPDATE", [route]);
    if (!r) throw new Error("Tournée introuvable.");
    const [stops] = await conn.query("SELECT * FROM dispatch_tasks WHERE route_id=? ORDER BY stop_position,id FOR UPDATE", [route]);
    const result = await action(conn, r, stops);
    await conn.commit();
    return result;
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}
async function log(conn, route, actor, action, details) {
  await conn.query("INSERT INTO dispatch_route_activity (route_id,user_id,action,details) VALUES (?,?,?,?)", [route,actor,action,JSON.stringify(details)]);
}
async function saveRemovalAudit(conn, payload) {
  try {
    await conn.query(
      `INSERT INTO dispatch_route_removal_history
       (route_id,stop_id,operation_id,order_id,operation_type,actor_user_id,
        previous_operation_status,restored_operation_status,previous_driver_id,
        previous_vehicle_id,previous_scheduled_date,reason,details)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [payload.route_id,payload.stop_id,payload.operation_id,payload.order_id,payload.operation_type,
       payload.actor_user_id,payload.previous_operation_status,payload.restored_operation_status,
       payload.previous_driver_id,payload.previous_vehicle_id,payload.previous_scheduled_date,
       payload.reason||"manual_detach",JSON.stringify(payload.details||{})]
    );
  } catch (error) {
    if (error && error.code === "ER_NO_SUCH_TABLE") throw new Error("Migration 008 manquante : exécutez 008_route_removal_history.sql.");
    throw error;
  }
}
const restoredStatus = status => status === "assigned" ? "pending" : status;

async function normalize(conn, stops) {
  for (let i=0;i<stops.length;i++) await conn.query("UPDATE dispatch_tasks SET stop_position=? WHERE id=?", [i+1,stops[i].id]);
}
async function reorder(db, routeId, actor, ids) {
  return transaction(db,routeId,actor,async(conn,r,stops)=>{
    if (!Array.isArray(ids) || ids.length!==stops.length || ids.some(v=>!id(v)) || new Set(ids.map(Number)).size!==ids.length || ids.some(v=>!stops.some(s=>s.id===Number(v)))) throw new Error("La liste doit contenir exactement tous les stops de la tournée.");
    const ordered=ids.map(v=>stops.find(s=>s.id===Number(v)));
    await normalize(conn,ordered);
    await log(conn,r.id,actor,"stops.reordered",{before:stops.map(s=>s.id),after:ordered.map(s=>s.id)});
    return {success:true};
  });
}
async function detachStop(db,routeId,actor,stopId,reason="manual_detach") {
  return transaction(db,routeId,actor,async(conn,r,stops)=>{
    const stop=stops.find(s=>s.id===id(stopId));
    if (!stop) throw new Error("Stop absent de cette tournée.");
    if (!allowed.has(stop.status)) throw new Error("Stop déjà commencé : retrait bloqué pour préserver les preuves.");
    const [ops]=await conn.query("SELECT id,status,order_id,operation_type,driver_id,vehicle_id,scheduled_date FROM order_operations WHERE dispatch_task_id=? FOR UPDATE",[stop.id]);
    if (ops.some(op=>!allowed.has(op.status))) throw new Error("Une opération a commencé : retrait bloqué.");
    for (const op of ops) {
      const restored=restoredStatus(op.status);
      await saveRemovalAudit(conn,{route_id:r.id,stop_id:stop.id,operation_id:op.id,order_id:op.order_id,operation_type:op.operation_type,actor_user_id:actor,previous_operation_status:op.status,restored_operation_status:restored,previous_driver_id:op.driver_id,previous_vehicle_id:op.vehicle_id,previous_scheduled_date:op.scheduled_date,reason,details:{scope:"stop",previous_stop_status:stop.status}});
      await conn.query("UPDATE order_operations SET status=?,driver_id=NULL,vehicle_id=NULL,scheduled_date=NULL WHERE id=?",[restored,op.id]);
    }
    await conn.query("UPDATE dispatch_tasks SET route_id=NULL,stop_position=NULL,driver_id=NULL,vehicle_id=NULL WHERE id=?",[stop.id]);
    await normalize(conn,stops.filter(s=>s.id!==stop.id));
    await log(conn,r.id,actor,"stop.detached",{stop_id:stop.id,operation_ids:ops.map(op=>op.id),restored_statuses:ops.map(op=>({operation_id:op.id,from:op.status,to:restoredStatus(op.status)})),sync:"immediate"});
    return {success:true,operations:ops.length,route_id:r.id,stop_id:stop.id};
  });
}
async function detachOperation(db,routeId,actor,stopId,operationId,reason="manual_detach") {
  return transaction(db,routeId,actor,async(conn,r,stops)=>{
    const stop=stops.find(s=>s.id===id(stopId));
    if (!stop || !allowed.has(stop.status)) throw new Error("Stop absent ou déjà commencé.");
    const [ops]=await conn.query("SELECT id,status,order_id,operation_type,driver_id,vehicle_id,scheduled_date FROM order_operations WHERE dispatch_task_id=? FOR UPDATE",[stop.id]);
    const op=ops.find(o=>o.id===id(operationId));
    if (!op || !allowed.has(op.status)) throw new Error("Opération absente ou déjà commencée.");
    const restored=restoredStatus(op.status);
    await saveRemovalAudit(conn,{route_id:r.id,stop_id:stop.id,operation_id:op.id,order_id:op.order_id,operation_type:op.operation_type,actor_user_id:actor,previous_operation_status:op.status,restored_operation_status:restored,previous_driver_id:op.driver_id,previous_vehicle_id:op.vehicle_id,previous_scheduled_date:op.scheduled_date,reason,details:{scope:"operation",empty_stop_removed:ops.length===1,previous_stop_status:stop.status}});
    await conn.query("UPDATE order_operations SET dispatch_task_id=NULL,status=?,driver_id=NULL,vehicle_id=NULL,scheduled_date=NULL WHERE id=?",[restored,op.id]);
    if (ops.length===1) {
      await conn.query("UPDATE dispatch_tasks SET route_id=NULL,stop_position=NULL,driver_id=NULL,vehicle_id=NULL WHERE id=?",[stop.id]);
      await normalize(conn,stops.filter(s=>s.id!==stop.id));
    }
    await log(conn,r.id,actor,"operation.detached",{stop_id:stop.id,operation_id:op.id,order_id:op.order_id,previous_status:op.status,restored_status:restored,empty_stop_removed:ops.length===1,sync:"immediate"});
    return {success:true,route_id:r.id,stop_id:stop.id,operation_id:op.id,order_id:op.order_id,restored_status:restored};
  });
}
async function removalHistory(db,routeId,limit=300) {
  const route=id(routeId); if(!route) throw new Error("Route invalide.");
  const safeLimit=Math.max(1,Math.min(1000,Number(limit)||300));
  const [rows]=await db.query(`SELECT h.*,o.order_number FROM dispatch_route_removal_history h LEFT JOIN orders o ON o.id=h.order_id WHERE h.route_id=? ORDER BY h.id DESC LIMIT ${safeLimit}`,[route]);
  return rows;
}
async function triage(db,filters={}) {
  // Le Triage physique contient uniquement les colis ayant réellement reçu
  // un warehouse_in accepté et qui ne sont pas encore sortis/livrés.
  const where=[
    "op.operation_type='delivery'",
    "op.status IN ('pending','assigned')",
    `EXISTS (
      SELECT 1 FROM scan_events sin
      WHERE sin.order_id=o.id AND sin.scan_type='warehouse_in' AND sin.scan_status='accepted'
    )`,
    `EXISTS (
      SELECT 1 FROM order_packages p
      WHERE p.order_id=o.id AND p.current_status='warehouse_in'
    )`
  ],args=[];
  if(filters.route_id){where.push("dr.id=?");args.push(id(filters.route_id));}
  if(filters.status){where.push("op.status=?");args.push(String(filters.status));}
  if(filters.date){where.push("DATE(latest_in.scanned_at)=?");args.push(String(filters.date));}
  if(filters.q){where.push("(o.order_number LIKE ? OR o.delivery_address LIKE ? OR dr.route_code LIKE ? OR latest_in.scanned_code LIKE ?)");const q=`%${String(filters.q).slice(0,120)}%`;args.push(q,q,q,q);}
  const [rows]=await db.query(`
    SELECT
      op.id operation_id,op.order_id,op.operation_type,op.status operation_status,
      op.driver_id,op.vehicle_id,op.scheduled_date,o.order_number,o.status order_status,
      dt.id stop_id,dt.status stop_status,COALESCE(dt.address,o.delivery_address) address,
      dt.city,dt.postal_code,dt.stop_position,dr.id route_id,dr.route_code,dr.status route_status,
      dr.scheduled_date route_date,latest_in.scanned_at triage_scanned_at,latest_in.scanned_code,
      (SELECT COUNT(*) FROM order_packages pc WHERE pc.order_id=o.id AND pc.current_status='warehouse_in') triage_package_count,
      (SELECT COUNT(*) FROM order_packages pc2 WHERE pc2.order_id=o.id) package_count
    FROM order_operations op
    JOIN orders o ON o.id=op.order_id
    JOIN (
      SELECT se.order_id,MAX(se.id) last_scan_id
      FROM scan_events se
      WHERE se.scan_type='warehouse_in' AND se.scan_status='accepted'
      GROUP BY se.order_id
    ) triage_idx ON triage_idx.order_id=o.id
    JOIN scan_events latest_in ON latest_in.id=triage_idx.last_scan_id
    LEFT JOIN dispatch_tasks dt ON dt.id=op.dispatch_task_id
    LEFT JOIN dispatch_routes dr ON dr.id=dt.route_id
    WHERE ${where.join(" AND ")}
    ORDER BY latest_in.scanned_at DESC,op.id DESC LIMIT 800`,args);
  return rows;
}

async function reopen(db,routeId,actor,stopId) {
  return transaction(db,routeId,actor,async(conn,r,stops)=>{
    const stop=stops.find(s=>s.id===id(stopId));
    if (!stop || stop.status!=="completed") throw new Error("Seul un stop terminé peut être réouvert.");
    await conn.query("UPDATE dispatch_tasks SET status='in_progress' WHERE id=?",[stop.id]);
    await log(conn,r.id,actor,"stop.reopened",{stop_id:stop.id,previous_status:stop.status,preserved_evidence:true});
    return {success:true};
  });
}
async function history(db,routeId) {
  const [rows]=await db.query("SELECT id,route_id,user_id,action,details,created_at FROM dispatch_route_activity WHERE route_id=? ORDER BY id DESC LIMIT 200",[id(routeId)]);
  return rows;
}
async function unassigned(db) {
  const [rows]=await db.query(`SELECT op.id AS operation_id,op.order_id,op.operation_type,op.status,o.order_number,o.pickup_address,o.delivery_address,dt.id AS stop_id FROM order_operations op INNER JOIN orders o ON o.id=op.order_id LEFT JOIN dispatch_tasks dt ON dt.id=op.dispatch_task_id WHERE op.operation_type IN ('pickup','delivery') AND op.status IN ('pending','assigned') AND (op.dispatch_task_id IS NULL OR dt.route_id IS NULL) ORDER BY op.id DESC LIMIT 500`);
  return rows;
}

// Affectation de missions existantes : une tournée peut contenir N missions.
// Ne jamais changer le dispatch_task_id d'une opération déjà scannée.
async function availableStops(db) {
  const [rows] = await db.query(`
    SELECT dt.id, dt.task_type, dt.address, dt.city, dt.postal_code,
           dt.status, dt.driver_id, dt.vehicle_id,
           COUNT(op.id) AS operation_count
    FROM dispatch_tasks dt
    INNER JOIN order_operations op ON op.dispatch_task_id = dt.id
      AND op.operation_type = dt.task_type
    WHERE dt.route_id IS NULL AND dt.status IN ('pending','assigned')
    GROUP BY dt.id, dt.task_type, dt.address, dt.city, dt.postal_code,
             dt.status, dt.driver_id, dt.vehicle_id
    HAVING SUM(op.status NOT IN ('pending','assigned')) = 0
    ORDER BY dt.id DESC LIMIT 500
  `);
  return rows;
}
async function routeChoices(db) {
  const [rows] = await db.query(`SELECT id,route_code,scheduled_date,status,driver_id,vehicle_id
    FROM dispatch_routes WHERE status IN ('draft','assigned','in_progress') ORDER BY scheduled_date DESC,id DESC LIMIT 300`);
  return rows;
}
async function assignStop(db, targetId, actor, stopId) {
  const target = id(targetId), stop = id(stopId);
  if (!target || !stop || !id(actor)) throw new Error('Identifiant invalide.');
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Lock the stop first, so concurrent dispatchers cannot assign it twice.
    const [[task]] = await conn.query('SELECT * FROM dispatch_tasks WHERE id=? FOR UPDATE',[stop]);
    if (!task) throw new Error('Mission introuvable.');
    if (!allowed.has(task.status)) throw new Error('Mission commencée : déplacement interdit.');
    const routeIds = [...new Set([target, ...(task.route_id ? [Number(task.route_id)] : [])])].sort((a,b)=>a-b);
    const [routes] = await conn.query(`SELECT * FROM dispatch_routes WHERE id IN (${routeIds.map(()=>'?').join(',')}) ORDER BY id FOR UPDATE`,routeIds);
    const dest = routes.find(r=>r.id===target);
    if (!dest || !['draft','assigned','in_progress'].includes(dest.status)) throw new Error('Tournée cible absente, terminée ou annulée.');
    const source = task.route_id ? routes.find(r=>r.id===Number(task.route_id)) : null;
    if (source && !['draft','assigned'].includes(source.status)) throw new Error('Tournée source déjà commencée : déplacement interdit.');
    if (source && source.id===target) throw new Error('Cette mission est déjà dans cette tournée.');
    const [ops] = await conn.query('SELECT id,status,operation_type,driver_id,vehicle_id FROM order_operations WHERE dispatch_task_id=? ORDER BY id FOR UPDATE',[stop]);
    if (!ops.length || ops.some(o=>!allowed.has(o.status) || o.operation_type!==task.task_type)) throw new Error('Opérations absentes, commencées ou de type incompatible : mission non déplacée.');
    if (!source && ((task.driver_id && dest.driver_id && Number(task.driver_id)!==Number(dest.driver_id)) || (task.vehicle_id && dest.vehicle_id && Number(task.vehicle_id)!==Number(dest.vehicle_id)))) throw new Error('Mission déjà affectée à un autre chauffeur ou véhicule : désaffectez-la depuis son planning avant de la déplacer.');
    if (!source && ops.some(o=>(o.driver_id && dest.driver_id && Number(o.driver_id)!==Number(dest.driver_id)) || (o.vehicle_id && dest.vehicle_id && Number(o.vehicle_id)!==Number(dest.vehicle_id)))) throw new Error('Une opération est affectée à un autre chauffeur ou véhicule.');
    const [positions] = await conn.query('SELECT id FROM dispatch_tasks WHERE route_id=? ORDER BY stop_position,id FOR UPDATE',[target]);
    const driver = dest.driver_id || null, vehicle = dest.vehicle_id || null;
    // IMPORTANT : l'affectation à une route ne change jamais le statut métier.
    // Route/équipe = planification opérationnelle ; status = action réelle du chauffeur.
    await conn.query('UPDATE dispatch_tasks SET route_id=?,stop_position=?,driver_id=?,vehicle_id=?,scheduled_date=? WHERE id=?',[target,positions.length+1,driver,vehicle,dest.scheduled_date,stop]);
    await conn.query('UPDATE order_operations SET driver_id=?,vehicle_id=?,scheduled_date=? WHERE dispatch_task_id=?',[driver,vehicle,dest.scheduled_date,stop]);
    if (source) {
      const [remaining] = await conn.query('SELECT id FROM dispatch_tasks WHERE route_id=? ORDER BY stop_position,id FOR UPDATE',[source.id]);
      await normalize(conn,remaining);
      await log(conn,source.id,actor,'stop.moved.out',{stop_id:stop,to_route_id:target,operation_ids:ops.map(o=>o.id)});
    }
    await log(conn,target,actor,'stop.assigned',{stop_id:stop,from_route_id:source?.id||null,operation_ids:ops.map(o=>o.id)});
    await conn.commit();
    return {success:true,stop_id:stop,route_id:target,operations:ops.length};
  } catch(e) {await conn.rollback();throw e;}
  finally {conn.release();}
}

// Affecter une seule opération : créer un stop indépendant pour conserver le type
// pickup/delivery exigé par le scanner. Aucun scan existant n'est déplacé.
async function assignOperation(db, routeId, actor, operationId) {
  const route=id(routeId), opId=id(operationId);
  if (!route || !opId || !id(actor)) throw new Error('Identifiant invalide.');
  const conn=await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[r]]=await conn.query('SELECT * FROM dispatch_routes WHERE id=? FOR UPDATE',[route]);
    if (!r || !['draft','assigned','in_progress'].includes(r.status)) throw new Error('Tournée absente, terminée ou annulée.');
    const [[op]]=await conn.query(`SELECT op.*,o.pickup_address,o.delivery_address,o.client_id,
      o.pickup_date,o.delivery_date,o.pickup_time,o.delivery_time
      FROM order_operations op JOIN orders o ON o.id=op.order_id WHERE op.id=? FOR UPDATE`,[opId]);
    if (!op || !['pickup','delivery'].includes(op.operation_type) || !allowed.has(op.status)) throw new Error('Opération absente, terminée ou déjà commencée.');
    if (op.dispatch_task_id) {
      const [[existing]]=await conn.query('SELECT * FROM dispatch_tasks WHERE id=? FOR UPDATE',[op.dispatch_task_id]);
      if (!existing || existing.route_id!==null) throw new Error('Opération déjà affectée à une tournée : retirez-la de son stop avant réaffectation.');
      const [[count]]=await conn.query('SELECT COUNT(*) AS n FROM order_operations WHERE dispatch_task_id=?',[existing.id]);
      if (Number(count.n)>1) throw new Error('Opération déjà regroupée : retirez-la du groupe avant affectation individuelle.');
    }
    if (op.driver_id && r.driver_id && Number(op.driver_id)!==Number(r.driver_id)) throw new Error('Opération déjà attribuée à un autre chauffeur.');
    if (op.vehicle_id && r.vehicle_id && Number(op.vehicle_id)!==Number(r.vehicle_id)) throw new Error('Opération déjà attribuée à un autre véhicule.');
    const type=op.operation_type;
    const address=type==='pickup'?op.pickup_address:op.delivery_address;
    if (!String(address||'').trim()) throw new Error('Adresse manquante sur la commande.');
    const [stops]=await conn.query('SELECT id FROM dispatch_tasks WHERE route_id=? ORDER BY stop_position,id FOR UPDATE',[route]);
    const status=r.driver_id && r.vehicle_id?'assigned':'pending';
    const [created]=await conn.query(`INSERT INTO dispatch_tasks
      (task_type,client_id,driver_id,vehicle_id,address,scheduled_date,scheduled_time,status,route_id,stop_position)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,[type,op.client_id,r.driver_id,r.vehicle_id,address,r.scheduled_date,
        type==='pickup'?op.pickup_time:op.delivery_time,status,route,stops.length+1]);
    await conn.query(`UPDATE order_operations SET dispatch_task_id=?,driver_id=?,vehicle_id=?,scheduled_date=?,status=? WHERE id=?`,
      [created.insertId,r.driver_id,r.vehicle_id,r.scheduled_date,status,opId]);
    await log(conn,route,actor,'operation.assigned.individually',{operation_id:opId,order_id:op.order_id,stop_id:created.insertId});
    await conn.commit();return {success:true,stop_id:created.insertId,operation_id:opId};
  } catch(e) {await conn.rollback();throw e;} finally {conn.release();}
}

// Les réaffectations sont limitées aux tournées et opérations non commencées.
async function assignCrew(db,routeId,actor,driverInput,vehicleInput) {
  const route=id(routeId),driver=id(driverInput),vehicle=id(vehicleInput);
  if(!route || !id(actor)) throw new Error('Identifiant invalide.');
  if(driverInput!=null && driverInput!=='' && !driver) throw new Error('Chauffeur invalide.');
  if(vehicleInput!=null && vehicleInput!=='' && !vehicle) throw new Error('Véhicule invalide.');
  const conn=await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[r]]=await conn.query('SELECT * FROM dispatch_routes WHERE id=? FOR UPDATE',[route]);
    if(!r || !['draft','assigned'].includes(r.status)) throw new Error('Tournée absente ou déjà commencée.');
    if(driver){const [[d]]=await conn.query('SELECT id,availability_status FROM drivers WHERE id=? FOR UPDATE',[driver]);if(!d||d.availability_status==='offline')throw new Error('Chauffeur introuvable ou hors ligne.');}
    if(vehicle){const [[v]]=await conn.query('SELECT id,driver_id,status FROM vehicles WHERE id=? FOR UPDATE',[vehicle]);if(!v||v.status!=='available'||(v.driver_id&&driver&&Number(v.driver_id)!==driver))throw new Error('Véhicule indisponible ou lié à un autre chauffeur.');}
    const [stops]=await conn.query('SELECT id,status FROM dispatch_tasks WHERE route_id=? FOR UPDATE',[route]);
    if(stops.some(s=>!allowed.has(s.status)))throw new Error('Une mission a commencé : réaffectation bloquée.');
    const [ops]=await conn.query(`SELECT op.id,op.status FROM order_operations op JOIN dispatch_tasks dt ON dt.id=op.dispatch_task_id WHERE dt.route_id=? FOR UPDATE`,[route]);
    if(ops.some(o=>!allowed.has(o.status)))throw new Error('Une opération a commencé : réaffectation bloquée.');
    const routeStatus=driver?'assigned':'draft';
    await conn.query('UPDATE dispatch_routes SET driver_id=?,vehicle_id=?,status=? WHERE id=?',[driver,vehicle,routeStatus,route]);
    // Changer le chauffeur de la route transfère tous les stops non commencés au nouveau
    // chauffeur, sans modifier leurs statuts métier ni ceux des opérations.
    await conn.query('UPDATE dispatch_tasks SET driver_id=?,vehicle_id=? WHERE route_id=?',[driver,vehicle,route]);
    await conn.query(`UPDATE order_operations op JOIN dispatch_tasks dt ON dt.id=op.dispatch_task_id SET op.driver_id=?,op.vehicle_id=? WHERE dt.route_id=?`,[driver,vehicle,route]);
    await log(conn,route,actor,'route.crew.updated',{old_driver_id:r.driver_id,new_driver_id:driver,old_vehicle_id:r.vehicle_id,new_vehicle_id:vehicle});
    await conn.commit();return {success:true,route_id:route};
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}
async function crewChoices(db){
  const [drivers]=await db.query("SELECT id,availability_status FROM drivers WHERE availability_status <> 'offline' ORDER BY id");
  const [vehicles]=await db.query("SELECT id,status,driver_id FROM vehicles WHERE status='available' ORDER BY id");
  return {drivers,vehicles};
}


async function assignOrderOperation(db, routeId, actor, orderId, operationType) {
  const route=id(routeId), order=id(orderId), type=String(operationType||'').toLowerCase();
  if(!route || !order || !id(actor) || !['pickup','delivery'].includes(type)) throw new Error('Commande, route ou type invalide.');
  const [rows]=await db.query(`SELECT op.id AS operation_id,op.dispatch_task_id,dt.route_id,dt.status AS stop_status
    FROM order_operations op LEFT JOIN dispatch_tasks dt ON dt.id=op.dispatch_task_id
    WHERE op.order_id=? AND op.operation_type=? ORDER BY op.id DESC LIMIT 1`,[order,type]);
  if(!rows.length) throw new Error(type==='pickup'?'Aucun ramassage trouvé pour cette commande.':'Aucune livraison trouvée pour cette commande.');
  const op=rows[0];
  if(op.dispatch_task_id) return assignStop(db,route,actor,op.dispatch_task_id);
  return assignOperation(db,route,actor,op.operation_id);
}

async function completeRoute(db, routeId, actor) {
  const route=id(routeId); if(!route||!id(actor)) throw new Error('Identifiant invalide.');
  const conn=await db.getConnection();
  try{
    await conn.beginTransaction();
    const [[r]]=await conn.query('SELECT * FROM dispatch_routes WHERE id=? FOR UPDATE',[route]);
    if(!r) throw new Error('Route introuvable.');
    if(r.status==='completed') { await conn.commit(); return {success:true,route_id:route,status:'completed'}; }
    if(r.status==='cancelled') throw new Error('Une route annulée ne peut pas être terminée.');
    const [active]=await conn.query(`SELECT id,status FROM dispatch_tasks WHERE route_id=? AND status NOT IN ('completed','cancelled') FOR UPDATE`,[route]);
    if(active.length) throw new Error(`Impossible de terminer la route : ${active.length} stop(s) sont encore actifs.`);
    await conn.query(`UPDATE dispatch_routes SET status='completed' WHERE id=?`,[route]);
    await log(conn,route,actor,'route.completed.manually',{completed_stops_only:true});
    await conn.commit(); return {success:true,route_id:route,status:'completed'};
  }catch(e){await conn.rollback();throw e}finally{conn.release()}
}

async function deleteRoute(db, routeId, actor) {
  const route=id(routeId);
  if(!route || !id(actor)) throw new Error('Identifiant invalide.');
  const conn=await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[r]]=await conn.query('SELECT * FROM dispatch_routes WHERE id=? FOR UPDATE',[route]);
    if(!r) throw new Error('Route introuvable.');
    if(!['draft','assigned'].includes(r.status)) throw new Error('Une route commencée, terminée ou annulée ne peut pas être supprimée.');
    const [stops]=await conn.query('SELECT id,status FROM dispatch_tasks WHERE route_id=? ORDER BY stop_position,id FOR UPDATE',[route]);
    if(stops.some(s=>!allowed.has(s.status))) throw new Error('Suppression bloquée : au moins un stop a déjà commencé.');
    if(stops.length){
      const ids=stops.map(s=>s.id);
      const ph=ids.map(()=>'?').join(',');
      const [ops]=await conn.query(`SELECT id,status FROM order_operations WHERE dispatch_task_id IN (${ph}) FOR UPDATE`,ids);
      if(ops.some(o=>!allowed.has(o.status))) throw new Error('Suppression bloquée : au moins une opération a déjà commencé.');
      await conn.query(`UPDATE order_operations SET driver_id=NULL,vehicle_id=NULL,scheduled_date=NULL WHERE dispatch_task_id IN (${ph})`,ids);
      await conn.query('UPDATE dispatch_tasks SET route_id=NULL,stop_position=NULL,driver_id=NULL,vehicle_id=NULL WHERE route_id=?',[route]);
    }
    await conn.query('DELETE FROM dispatch_route_activity WHERE route_id=?',[route]);
    await conn.query('DELETE FROM dispatch_routes WHERE id=?',[route]);
    await conn.commit();
    return {success:true,route_id:route,detached_stops:stops.length};
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}

async function groupOperations(db,routeId,actor,operationIds){
  const route=id(routeId); const ids=Array.isArray(operationIds)?[...new Set(operationIds.map(id).filter(Boolean))]:[];
  if(!route||!id(actor)||ids.length<2) throw new Error('Sélectionne au moins deux commandes à regrouper.');
  const conn=await db.getConnection();
  try{
    await conn.beginTransaction();
    const [[r]]=await conn.query('SELECT * FROM dispatch_routes WHERE id=? FOR UPDATE',[route]);
    if(!r||!['draft','assigned'].includes(r.status)) throw new Error('La route est absente ou déjà commencée.');
    const ph=ids.map(()=>'?').join(',');
    const [ops]=await conn.query(`SELECT op.id,op.order_id,op.operation_type,op.status,op.dispatch_task_id,dt.address,dt.route_id,dt.status task_status FROM order_operations op JOIN dispatch_tasks dt ON dt.id=op.dispatch_task_id WHERE op.id IN (${ph}) ORDER BY op.id FOR UPDATE`,ids);
    if(ops.length!==ids.length) throw new Error('Une ou plusieurs commandes sont introuvables dans les stops.');
    if(ops.some(o=>Number(o.route_id)!==route)) throw new Error('Toutes les commandes doivent appartenir à cette route.');
    if(ops.some(o=>!allowed.has(o.status)||!allowed.has(o.task_status))) throw new Error('Regroupement impossible : une commande ou un stop a déjà commencé.');
    if(new Set(ops.map(o=>o.operation_type)).size!==1) throw new Error('Ramassages et livraisons ne peuvent pas être regroupés ensemble.');
    const norm=v=>String(v||'').trim().replace(/\s+/g,' ').toLowerCase();
    if(new Set(ops.map(o=>norm(o.address))).size!==1) throw new Error('Les commandes doivent avoir exactement la même adresse.');
    const taskIds=[...new Set(ops.map(o=>Number(o.dispatch_task_id)))];
    const targetTask=Math.min(...taskIds);
    await conn.query(`UPDATE order_operations SET dispatch_task_id=? WHERE id IN (${ph})`,[targetTask,...ids]);
    const sourceTasks=taskIds.filter(x=>x!==targetTask);
    for(const source of sourceTasks){
      const [[left]]=await conn.query('SELECT COUNT(*) total FROM order_operations WHERE dispatch_task_id=?',[source]);
      if(Number(left.total)===0) await conn.query('DELETE FROM dispatch_tasks WHERE id=? AND route_id=?',[source,route]);
    }
    const [remaining]=await conn.query('SELECT id FROM dispatch_tasks WHERE route_id=? ORDER BY stop_position,id FOR UPDATE',[route]);
    await normalize(conn,remaining);
    await log(conn,route,actor,'operations.grouped',{operation_ids:ids,target_stop_id:targetTask,removed_empty_stops:sourceTasks});
    await conn.commit();
    return {success:true,stop_id:targetTask,operation_ids:ids};
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}

async function detachPackage(db,routeId,actor,stopId,operationId,packageId,reason){
 const route=id(routeId), stop=id(stopId), op=id(operationId), pkg=id(packageId), why=String(reason||'').trim();
 if(!route||!stop||!op||!pkg||!id(actor)||why.length<3) throw new Error('Route, stop, colis et justification sont obligatoires.');
 const conn=await db.getConnection();
 try{await conn.beginTransaction();
  const [[row]]=await conn.query(`SELECT p.id package_id,p.order_id,p.current_status,op.id operation_id,op.operation_type,op.status operation_status,dt.id stop_id,dt.status stop_status,dt.route_id FROM order_packages p JOIN order_operations op ON op.order_id=p.order_id JOIN dispatch_tasks dt ON dt.id=op.dispatch_task_id WHERE p.id=? AND op.id=? AND dt.id=? AND dt.route_id=? FOR UPDATE`,[pkg,op,stop,route]);
  if(!row) throw new Error('Ce colis ne fait pas partie de cette opération/route.');
  if(!['pending','assigned'].includes(row.operation_status)||!['pending','assigned'].includes(row.stop_status)) throw new Error('Le stop a déjà commencé. Utilise une correction après scan plutôt qu’un retrait de route.');
  await conn.query(`INSERT INTO operation_package_exclusions(operation_id,package_id,route_id,dispatch_task_id,actor_user_id,reason,previous_package_status,active) VALUES(?,?,?,?,?,?,?,1) ON DUPLICATE KEY UPDATE route_id=VALUES(route_id),dispatch_task_id=VALUES(dispatch_task_id),actor_user_id=VALUES(actor_user_id),reason=VALUES(reason),previous_package_status=VALUES(previous_package_status),active=1,created_at=CURRENT_TIMESTAMP,restored_at=NULL,restored_by_user_id=NULL,restore_reason=NULL`,[op,pkg,route,stop,actor,why,row.current_status]);
  await conn.query(`INSERT INTO package_status_audit(package_id,order_id,operation_id,dispatch_task_id,route_id,actor_type,actor_id,action,from_status,to_status,reason,metadata) VALUES(?,?,?,?,?,'dispatch',?,'REMOVED_FROM_ROUTE',?,?,?,?)`,[pkg,row.order_id,op,stop,route,actor,row.current_status,row.current_status,why,JSON.stringify({operation_type:row.operation_type})]);
  await log(conn,route,actor,'package.removed',{stop_id:stop,operation_id:op,package_id:pkg,reason:why,previous_status:row.current_status});
  await conn.commit();return {success:true,route_id:route,stop_id:stop,operation_id:op,package_id:pkg};
 }catch(e){await conn.rollback();throw e}finally{conn.release()}
}
async function correctPackage(db,routeId,actor,stopId,operationId,packageId,toStatus,reason){
 const route=id(routeId),stop=id(stopId),op=id(operationId),pkg=id(packageId),why=String(reason||'').trim(),next=String(toStatus||'').trim();
 if(!route||!stop||!op||!pkg||!id(actor)||why.length<3) throw new Error('Colis et justification sont obligatoires.');
 if(!['incident','created','picked_up','warehouse_in','warehouse_storage','warehouse_out','out_for_delivery','delivered'].includes(next)) throw new Error('Statut colis invalide.');
 const conn=await db.getConnection();try{await conn.beginTransaction();
  const [[row]]=await conn.query(`SELECT p.order_id,p.current_status FROM order_packages p JOIN order_operations op ON op.order_id=p.order_id JOIN dispatch_tasks dt ON dt.id=op.dispatch_task_id WHERE p.id=? AND op.id=? AND dt.id=? AND dt.route_id=? FOR UPDATE`,[pkg,op,stop,route]);if(!row)throw new Error('Colis introuvable dans ce stop.');
  await conn.query('UPDATE order_packages SET current_status=? WHERE id=?',[next,pkg]);
  await conn.query(`INSERT INTO package_status_audit(package_id,order_id,operation_id,dispatch_task_id,route_id,actor_type,actor_id,action,from_status,to_status,reason) VALUES(?,?,?,?,?,'dispatch',?,'CORRECTED',?,?,?)`,[pkg,row.order_id,op,stop,route,actor,row.current_status,next,why]);
  await log(conn,route,actor,'package.corrected',{stop_id:stop,operation_id:op,package_id:pkg,from_status:row.current_status,to_status:next,reason:why});await conn.commit();return {success:true,package_id:pkg,from_status:row.current_status,to_status:next};
 }catch(e){await conn.rollback();throw e}finally{conn.release()}
}

module.exports={detachPackage,correctPackage,reorder,detachStop,detachOperation,reopen,history,unassigned,availableStops,routeChoices,assignStop,assignOperation,assignOrderOperation,groupOperations,completeRoute,deleteRoute,assignCrew,crewChoices,removalHistory,triage};
