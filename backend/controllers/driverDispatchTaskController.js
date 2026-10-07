"use strict";

const db = require("../config/db");
const DriverModel = require("../models/driverModel");
const M = require("../models/driverDispatchTaskModel");
const OrderModel = require("../models/orderModel");
const { uploadDeliveryProofFiles } = require("../services/deliveryService");
const GEOFENCE_RADIUS_METERS = Math.max(25, Math.min(2000, Number(process.env.GEOFENCE_RADIUS_METERS || 150) || 150));
function distanceMeters(aLat,aLng,bLat,bLng){const v=[aLat,aLng,bLat,bLng].map(Number);if(v.some(x=>!Number.isFinite(x)))return null;const [la1,lo1,la2,lo2]=v,r=Math.PI/180,dla=(la2-la1)*r,dlo=(lo2-lo1)*r,x=Math.sin(dla/2)**2+Math.cos(la1*r)*Math.cos(la2*r)*Math.sin(dlo/2)**2;return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}

function id(v) {
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

async function driver(req) {
  const uid = id(req.user?.id || req.user?.user_id);
  return uid ? DriverModel.getDriverByUserId(uid) : null;
}

function fail(res, e, msg) {
  console.error("[DRIVER STOP]", e);
  const s = Number(e.statusCode);
  return res.status(s >= 400 && s < 600 ? s : 500).json({
    success: false,
    message: s >= 400 && s < 500 ? e.message : msg,
  });
}

function dataUrlToFile(dataUrl, label) {
  const raw = String(dataUrl || "");
  const match = /^data:(image\/(?:jpeg|png|webp|heic|heif));base64,([A-Za-z0-9+/=\r\n]+)$/i.exec(raw);
  if (!match) {
    const e = new Error(`${label} invalide.`);
    e.statusCode = 400;
    throw e;
  }

  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length) {
    const e = new Error(`${label} vide.`);
    e.statusCode = 400;
    throw e;
  }
  if (buffer.length > 10 * 1024 * 1024) {
    const e = new Error(`${label} dépasse 10 Mo.`);
    e.statusCode = 413;
    throw e;
  }

  const ext = match[1].split("/")[1].toLowerCase();
  return {
    buffer,
    size: buffer.length,
    mimetype: match[1].toLowerCase(),
    originalname: `${label.toLowerCase().replace(/\s+/g, "-")}.${ext}`,
  };
}

exports.getMyDispatchTasks = async (req, res) => {
  try {
    const d = await driver(req);
    if (!d) return res.status(403).json({ success: false, message: "Profil chauffeur introuvable." });
    return res.json({ success: true, tasks: await M.getDriverDispatchTasks(db, d.id) });
  } catch (e) { return fail(res, e, "Impossible de récupérer les stops."); }
};

exports.getMyDispatchTaskById = async (req, res) => {
  try {
    const d = await driver(req), taskId = id(req.params.taskId);
    if (!d) return res.status(403).json({ success: false, message: "Profil chauffeur introuvable." });
    const task = await M.getDriverDispatchTaskById(db, d.id, taskId);
    if (!task) return res.status(404).json({ success: false, message: "Stop introuvable." });
    return res.json({ success: true, task });
  } catch (e) { return fail(res, e, "Impossible de récupérer ce stop."); }
};

exports.startMyStop = async (req, res) => {
  try {
    const d = await driver(req);
    if (!d) return res.status(403).json({ success: false, message: "Profil chauffeur introuvable." });
    const task = await M.startStop(db, d.id, id(req.params.taskId), req.body || {});
    if (!task) return res.status(404).json({ success: false, message: "Stop introuvable." });
    return res.json({ success: true, task });
  } catch (e) { return fail(res, e, "Impossible de démarrer ce stop."); }
};

exports.savePackageException = async (req, res) => {
  try {
    const d = await driver(req);
    if (!d) return res.status(403).json({ success: false, message: "Profil chauffeur introuvable." });
    const taskId=id(req.params.taskId), packageId=id(req.params.packageId);
    const payload={...(req.body||{})};
    if(String(payload.reason||"")==="technical_failed"){
      const [rows]=await db.query(`SELECT p.order_id,o.order_number,op.id operation_id FROM order_packages p JOIN orders o ON o.id=p.order_id JOIN order_operations op ON op.order_id=p.order_id AND op.dispatch_task_id=? AND op.driver_id=? WHERE p.id=? LIMIT 1`,[taskId,d.id,packageId]);
      if(!rows[0]) return res.status(404).json({success:false,message:"Colis introuvable dans ce stop."});
      const file=dataUrlToFile(payload.proof_data,"Photo incident technique");
      const uploaded=await uploadDeliveryProofFiles({orderId:rows[0].order_id,orderNumber:rows[0].order_number,taskId,operationId:rows[0].operation_id,packageId,driverId:d.id,category:"failed",photo:file,signature:null});
      payload.exception_proof_url=uploaded?.photo?.url||null;
      payload.exception_proof_public_id=uploaded?.photo?.publicId||null;
      if(!payload.exception_proof_url) throw new Error("Cloudinary n'a pas retourné l'URL de la photo d'incident.");
    }
    const task = await M.saveException(db, d.id, taskId, packageId, payload);

    /*
     * Synchronisation immédiate de l'incident chauffeur.
     * L'exception détaillée reste dans driver_package_exceptions.
     * On ajoute également une trace lisible dans l'historique commande.
     */
    const [incidentRows] = await db.query(
      `SELECT
         p.order_id,
         o.order_number,
         op.id AS operation_id
       FROM order_packages p
       JOIN orders o
         ON o.id = p.order_id
       JOIN order_operations op
         ON op.order_id = p.order_id
        AND op.dispatch_task_id = ?
        AND op.driver_id = ?
       WHERE p.id = ?
       LIMIT 1`,
      [taskId, d.id, packageId]
    );

    const incident = incidentRows[0] || null;

    if (incident) {
      const reasonLabels = {
        missing: "Colis manquant",
        not_loaded: "Colis non chargé dans le véhicule",
        damaged: "Colis endommagé",
        wrong_label: "Mauvais colis / mauvaise étiquette",
        client_absent: "Client absent",
        client_refused: "Refus du client",
        access_impossible: "Accès impossible",
        address_invalid: "Adresse introuvable ou incorrecte",
        cancelled: "Annulé",
        technical_failed: "Échec technique",
        other: "Autre raison"
      };

      const reasonCode = String(payload.reason || "");
      const reasonLabel = reasonLabels[reasonCode] || reasonCode || "Incident";
      const detail = String(payload.comment || "").trim();

      const historyComment =
        `Incident chauffeur — ${reasonLabel}` +
        (detail ? ` — ${detail}` : "") +
        ` — Stop #${taskId}`;

      /*
       * On ne change PAS ici le statut global de la commande.
       * Le statut incident sera appliqué par le workflow de fermeture
       * lorsque la commande/stop sera réellement clôturé avec exception.
       *
       * Ici on ajoute seulement la traçabilité immédiate.
       */
      await db.query(
        `INSERT INTO order_status_history
           (order_id, status, changed_by, comment)
         VALUES (?, ?, ?, ?)`,
        [
          incident.order_id,
          "incident",
          req.user?.id || req.user?.user_id || null,
          historyComment
        ]
      );

      const io = req.app.get("io");

      if (io) {
        const syncPayload = {
          source: "driver_package_exception",
          action: "package_exception",
          order_id: incident.order_id,
          order_number: incident.order_number,
          operation_id: incident.operation_id,
          dispatch_task_id: taskId,
          package_id: packageId,
          driver_id: d.id,
          reason: reasonCode,
          reason_label: reasonLabel,
          comment: detail || null,
          occurred_at: new Date().toISOString()
        };

        io.to("role:super_admin")
          .to("role:dispatcher")
          .emit("dispatch:sync", syncPayload);

        io.emit("driver:tasks:sync", syncPayload);
      }
    }

    return res.json({
      success: true,
      task,
      exception_saved: true
    });
  } catch (e) { return fail(res, e, "Impossible d'enregistrer l'exception."); }
};

/*
 * Preuve chauffeur -> Cloudinary -> delivery_proofs + driver_delivery_proofs.
 * Le frontend continue d'envoyer proof_data en data:image/...;base64.
 */
exports.saveDeliveryProof = async (req, res) => {
  try {
    const d = await driver(req);
    if (!d) return res.status(403).json({ success: false, message: "Profil chauffeur introuvable." });

    const taskId = id(req.params.taskId);
    const operationId = id(req.params.operationId);
    if (!taskId || !operationId) {
      return res.status(400).json({ success: false, message: "Stop ou opération invalide." });
    }

    const [rows] = await db.query(
      `SELECT op.id, op.order_id, op.operation_type, o.signature_required, o.order_number, dt.route_id, dt.vehicle_id,
              (SELECT os.latitude FROM order_stops os WHERE os.order_id=op.order_id AND os.stop_type='delivery' ORDER BY os.stop_order,os.id LIMIT 1) expected_latitude,
              (SELECT os.longitude FROM order_stops os WHERE os.order_id=op.order_id AND os.stop_type='delivery' ORDER BY os.stop_order,os.id LIMIT 1) expected_longitude,
              (SELECT CONCAT_WS(', ',os.address,os.city,os.province,os.postal_code) FROM order_stops os WHERE os.order_id=op.order_id AND os.stop_type='delivery' ORDER BY os.stop_order,os.id LIMIT 1) expected_address
         FROM order_operations op
         JOIN orders o ON o.id = op.order_id
         JOIN dispatch_tasks dt ON dt.id = op.dispatch_task_id
        WHERE op.id = ?
          AND op.dispatch_task_id = ?
          AND op.driver_id = ?
          AND dt.driver_id = ?
          AND op.operation_type = 'delivery'
          AND op.status <> 'cancelled'
          AND dt.status <> 'cancelled'
        LIMIT 1`,
      [operationId, taskId, d.id, d.id]
    );

    const op = rows[0];
    if (!op) {
      return res.status(404).json({ success: false, message: "Livraison introuvable dans ce stop." });
    }

    let geofence = null;
    if (op.expected_latitude != null && op.expected_longitude != null) {
      if (req.body?.latitude == null || req.body?.longitude == null) {
        return res.status(409).json({ success:false, code:"GEOFENCE_GPS_REQUIRED", message:"Position GPS obligatoire avant d’enregistrer la preuve de livraison." });
      }
      const dist = distanceMeters(req.body.latitude, req.body.longitude, op.expected_latitude, op.expected_longitude);
      const outside = dist == null || dist > GEOFENCE_RADIUS_METERS;
      const reason = String(req.body?.geofence_override_reason || "").trim();
      if (outside && (req.body?.geofence_override !== true || reason.length < 10)) {
        return res.status(409).json({ success:false, code:"GEOFENCE_OUTSIDE", distance_meters:dist, tolerance_meters:GEOFENCE_RADIUS_METERS, message:`Vous êtes à environ ${Math.round(Number(dist||0))} m de l’adresse de livraison (tolérance ${GEOFENCE_RADIUS_METERS} m). Rapprochez-vous ou fournissez une justification d’au moins 10 caractères.` });
      }
      geofence={distance_meters:dist,tolerance_meters:GEOFENCE_RADIUS_METERS,outside,override:outside,override_reason:outside?reason:null,expected_latitude:Number(op.expected_latitude),expected_longitude:Number(op.expected_longitude),expected_address:op.expected_address||null,actual_latitude:Number(req.body.latitude),actual_longitude:Number(req.body.longitude),accuracy:req.body?.accuracy??null};
    }

    const signatureRequired = Number(op.signature_required) === 1;
    const proofData = String(req.body?.proof_data || "");
    const firstName = String(req.body?.recipient_first_name || "").trim();
    const lastName = String(req.body?.recipient_last_name || "").trim();

    if (signatureRequired && (!firstName || !lastName)) {
      return res.status(400).json({ success: false, message: "Prénom et nom du destinataire obligatoires." });
    }

    const file = dataUrlToFile(proofData, signatureRequired ? "Signature" : "Photo de livraison");

    const uploaded = await uploadDeliveryProofFiles({
      orderId: op.order_id,
      orderNumber: op.order_number,
      taskId,
      operationId,
      driverId: d.id,
      category: "delivery",
      photo: signatureRequired ? null : file,
      signature: signatureRequired ? file : null,
    });

    const signatureUrl = uploaded?.signature?.url || null;
    const photoUrl = uploaded?.photo?.url || null;

    if (signatureRequired && !signatureUrl) throw new Error("Cloudinary n'a pas retourné l'URL de signature.");
    if (!signatureRequired && !photoUrl) throw new Error("Cloudinary n'a pas retourné l'URL de photo.");

    // Conserve la preuve opérationnelle utilisée pour autoriser la fermeture du stop.
    const task = await M.saveProof(db, d.id, taskId, operationId, { ...(req.body || {}), cloudinary_url: signatureUrl || photoUrl, cloudinary_public_id: uploaded?.signature?.publicId || uploaded?.photo?.publicId || null, closure_address: req.body?.address || null });

    // Enregistre aussi la preuve canonique utilisée par Admin / Client / Commande.
    const proofId = await OrderModel.createDeliveryProof({
      order_id: op.order_id,
      driver_id: d.id,
      receiver_first_name: signatureRequired ? firstName : null,
      receiver_last_name: signatureRequired ? lastName : null,
      signature_url: signatureUrl,
      photo_url: photoUrl,
      notes: [
        `Preuve chauffeur - stop #${taskId} - opération #${operationId}`,
        `Chauffeur: ${[d.first_name,d.last_name].filter(Boolean).join(" ") || `#${d.id}`}`,
        req.body?.latitude != null && req.body?.longitude != null ? `GPS: ${req.body.latitude}, ${req.body.longitude}${req.body?.accuracy != null ? ` (±${req.body.accuracy}m)` : ""}` : null,
        geofence ? `Geofence: ${Math.round(Number(geofence.distance_meters||0))}m / ${geofence.tolerance_meters}m${geofence.override?` - OVERRIDE: ${geofence.override_reason}`:""}` : null,
      ].filter(Boolean).join(" | "),
    });

    if (geofence) {
      try {
        await db.query(`INSERT INTO operational_audit_log(entity_type,entity_id,action,route_id,dispatch_task_id,driver_id,vehicle_id,metadata) VALUES('delivery_proof',?,'delivery_proof_geofence_check',?,?,?,?,?)`,[proofId,op.route_id||null,taskId,d.id,op.vehicle_id||null,JSON.stringify({...geofence,order_id:op.order_id,operation_id:operationId,cloudinary_public_id:uploaded?.signature?.publicId||uploaded?.photo?.publicId||null})]);
      } catch (auditError) { if (auditError?.code !== 'ER_NO_SUCH_TABLE') throw auditError; }
    }

    return res.json({
      success: true,
      message: signatureRequired
        ? "Signature enregistrée sur Cloudinary et liée à la commande."
        : "Photo enregistrée sur Cloudinary et liée à la commande.",
      proof_id: proofId,
      proof: {
        order_id: Number(op.order_id),
        signature_url: signatureUrl,
        photo_url: photoUrl,
        receiver_first_name: signatureRequired ? firstName : null,
        receiver_last_name: signatureRequired ? lastName : null,
      },
      task,
    });
  } catch (e) {
    return fail(res, e, "Impossible d'enregistrer la preuve de livraison sur Cloudinary.");
  }
};

exports.getDeliveryProof = async (req, res) => {
  try {
    const d = await driver(req);
    if (!d) return res.status(403).json({ success: false, message: "Profil chauffeur introuvable." });
    const proof = await M.getProof(db, d.id, id(req.params.taskId), id(req.params.operationId));
    if (!proof) return res.status(404).json({ success: false, message: "Preuve introuvable." });
    return res.json({ success: true, proof });
  } catch (e) { return fail(res, e, "Impossible de récupérer la preuve."); }
};

exports.closeMyStop = async (req, res) => {
  try {
    const d = await driver(req);
    if (!d) return res.status(403).json({ success: false, message: "Profil chauffeur introuvable." });
    const taskId = id(req.params.taskId);
    const task = await M.closeStop(db, d.id, taskId, req.body || {});

    // Synchronisation immédiate après COMMIT :
    // Dispatch + application chauffeur rechargent leur état.
    try {
      const io = req.app.get("io");
      if (io) {
        const payload = {
          type: "stop_completed",
          task_id: taskId,
          driver_id: d.id,
          route_id: task?.route_id || null,
          at: new Date().toISOString()
        };

        io.to("role:super_admin")
          .to("role:dispatcher")
          .emit("dispatch:sync", payload);

        io.emit("driver:tasks:sync", payload);
      }
    } catch (socketError) {
      console.warn(
        "Socket sync fermeture stop:",
        socketError.message
      );
    }

    return res.json({ success: true, task });
  } catch (e) { return fail(res, e, "Impossible de fermer ce stop."); }
};
