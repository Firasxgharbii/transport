"use strict";

const db = require("../config/db");
const DispatchRouteModel = require("../models/dispatchRouteModel");

function positiveId(value) {
  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0
    ? number
    : null;
}

exports.createRoute = async (req, res) => {
  try {
    if (!positiveId(req.user?.id ?? req.user?.user_id)) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié.",
      });
    }

    const {
      driver_id,
      vehicle_id,
      scheduled_date,
      sector,
      stop_ids,
      notes,
    } = req.body || {};

    if (Array.isArray(stop_ids) && stop_ids.length === 0) {
      const result = await DispatchRouteModel.createDraftRoute(db, {
        sector,
        scheduled_date,
        notes,
      });
      return res.status(201).json({
        ...result,
        success: true,
        message: "Route brouillon créée. Ajoutez des missions avant de la confier au chauffeur.",
      });
    }

    if (!positiveId(driver_id)) {
      return res.status(400).json({
        success: false,
        message: "Sélectionne un chauffeur valide.",
      });
    }

    if (!positiveId(vehicle_id)) {
      return res.status(400).json({
        success: false,
        message: "Sélectionne un véhicule valide.",
      });
    }

    if (
      typeof scheduled_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date)
    ) {
      return res.status(400).json({
        success: false,
        message: "Date invalide. Format attendu : AAAA-MM-JJ.",
      });
    }

    if (
      !Array.isArray(stop_ids) ||
      stop_ids.length < 1 ||
      stop_ids.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Sélectionne entre 1 et 100 missions.",
      });
    }

    const parsedStopIds = stop_ids.map(positiveId);

    if (
      parsedStopIds.some(id => id === null) ||
      new Set(parsedStopIds).size !== parsedStopIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Missions invalides ou sélectionnées en double.",
      });
    }

    const result = await DispatchRouteModel.createRoute(db, {
      driver_id: positiveId(driver_id),
      vehicle_id: positiveId(vehicle_id),
      scheduled_date,
      sector,
      stop_ids: parsedStopIds,
      notes: typeof notes === "string"
        ? notes.slice(0, 5000)
        : null,
    });

    return res.status(201).json({
      ...result,
      success: true,
      message: "Route créée et missions regroupées avec succès.",
    });

  } catch (error) {
    console.error("Erreur création route :", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Impossible de créer la route.",
    });
  }
};


/* CONSULTATION DES ROUTES */

exports.getRoutes = async (req, res) => {
  try {
    const routes = await DispatchRouteModel.getRoutes(db, {
      date: req.query.date,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
    });

    return res.json({
      success: true,
      total: routes.length,
      routes
    });
  } catch (error) {
    console.error("Erreur liste routes :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de charger les routes."
    });
  }
};

exports.getArchivedRoutes = async (req, res) => {
  try {
    const routes = await DispatchRouteModel.getArchivedRoutes(db);
    return res.json({ success: true, total: routes.length, routes });
  } catch (error) {
    console.error("Erreur archive routes :", error);
    return res.status(500).json({ success: false, message: "Impossible de charger l’archive des routes." });
  }
};


exports.getArchivedRouteById = async (req, res) => {
  try {
    const archiveId = positiveId(req.params.archiveId);

    if (!archiveId) {
      return res.status(400).json({
        success: false,
        message: "Identifiant d'archive invalide."
      });
    }

    const archive =
      await DispatchRouteModel.getArchivedRouteById(
        db,
        archiveId
      );

    if (!archive) {
      return res.status(404).json({
        success: false,
        message: "Archive introuvable."
      });
    }

    return res.json({
      success: true,
      archive,
      route: archive.route
    });

  } catch (error) {
    console.error("Erreur détail archive route :", error);

    return res.status(500).json({
      success: false,
      message:
        "Impossible de charger l'archive de la route."
    });
  }
};

exports.getRouteById = async (req, res) => {
  try {
    const routeId = positiveId(req.params.routeId);

    if (!routeId) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de route invalide."
      });
    }

    const route = await DispatchRouteModel.getRouteById(
      db,
      routeId
    );

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route introuvable."
      });
    }

    return res.json({
      success: true,
      route
    });
  } catch (error) {
    console.error("Erreur détail route :", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de charger les stops."
    });
  }
};

exports.getSectors = async (req, res) => {
  try { res.json({success: true, sectors: await DispatchRouteModel.listSectors(db)}); }
  catch (error) { console.error("Liste secteurs:", error); res.status(500).json({success: false, message: "Impossible de charger les secteurs."}); }
};
exports.createSector = async (req, res) => {
  try { const sector = await DispatchRouteModel.createSector(db, req.body || {}); res.status(201).json({success: true, sector}); }
  catch (error) { console.error("Création secteur:", error); res.status(error.code === "ER_DUP_ENTRY" ? 409 : 400).json({success: false, message: error.code === "ER_DUP_ENTRY" ? "Ce code secteur existe déjà." : error.message}); }
};

/* CONTRÔLE DE TOURNÉE V1 : mutations transactionnelles + historique */
const RouteControl = require("../models/routeControlModel");
const actorId = req => positiveId(req.user?.id ?? req.user?.user_id);
const routeAction = fn => async (req,res) => {
  try {
    if (!actorId(req)) return res.status(401).json({success:false,message:"Session invalide."});
    res.json(await fn(req));
  } catch(e) {
    console.error("Contrôle tournée:",e);
    res.status(400).json({success:false,message:e.message||"Action impossible."});
  }
};
exports.reorderRouteStops=routeAction(req=>RouteControl.reorder(db,req.params.routeId,actorId(req),req.body?.stop_ids));
function emitDispatchSync(req,payload){try{const io=req.app.get("io");if(!io)return;io.to("role:super_admin").to("role:dispatcher").emit("dispatch:sync",payload);io.emit("driver:tasks:sync",payload);}catch(error){console.warn("Socket sync dispatch:",error.message);}}
exports.detachRouteStop=routeAction(async req=>{const result=await RouteControl.detachStop(db,req.params.routeId,actorId(req),req.params.stopId,req.body?.reason);emitDispatchSync(req,{type:"route.stop.detached",...result,at:new Date().toISOString()});return result;});
exports.detachRouteOperation=routeAction(async req=>{const result=await RouteControl.detachOperation(db,req.params.routeId,actorId(req),req.params.stopId,req.params.operationId,req.body?.reason);emitDispatchSync(req,{type:"route.operation.detached",...result,at:new Date().toISOString()});return result;});
exports.reopenRouteStop=routeAction(req=>RouteControl.reopen(db,req.params.routeId,actorId(req),req.params.stopId));
exports.routeHistory=routeAction(async req=>({success:true,history:await RouteControl.history(db,req.params.routeId)}));
exports.unassignedOperations=routeAction(async()=>({success:true,operations:await RouteControl.unassigned(db)}));

exports.availableRouteStops=routeAction(async()=>({success:true,stops:await RouteControl.availableStops(db)}));
exports.routeChoices=routeAction(async()=>({success:true,routes:await RouteControl.routeChoices(db)}));
exports.assignRouteStop=routeAction(req=>RouteControl.assignStop(db,req.params.routeId,actorId(req),req.body?.stop_id));

exports.assignIndividualOperation=routeAction(req=>RouteControl.assignOperation(db,req.params.routeId,actorId(req),req.body?.operation_id));
exports.assignRouteCrew=routeAction(req=>RouteControl.assignCrew(db,req.params.routeId,actorId(req),req.body?.driver_id,req.body?.vehicle_id));
exports.routeCrewChoices=routeAction(async()=>({success:true,...await RouteControl.crewChoices(db)}));

exports.assignOrderOperation=routeAction(req=>RouteControl.assignOrderOperation(db,req.params.routeId,actorId(req),req.params.orderId,req.params.operationType));
exports.groupRouteOperations=routeAction(req=>RouteControl.groupOperations(db,req.params.routeId,actorId(req),req.body?.operation_ids));
exports.completeRoute=routeAction(async req=>{const result=await RouteControl.completeRoute(db,req.params.routeId,actorId(req));emitDispatchSync(req,{type:'route.completed',...result,at:new Date().toISOString()});return result;});
exports.deleteRoute=routeAction(req=>RouteControl.deleteRoute(db,req.params.routeId,actorId(req)));

exports.routeRemovalHistory=routeAction(async req=>({success:true,history:await RouteControl.removalHistory(db,req.params.routeId,req.query?.limit)}));
exports.triageOperations=routeAction(async req=>({success:true,operations:await RouteControl.triage(db,req.query||{})}));

exports.detachRoutePackage=routeAction(async req=>{const result=await RouteControl.detachPackage(db,req.params.routeId,actorId(req),req.params.stopId,req.params.operationId,req.params.packageId,req.body?.reason);emitDispatchSync(req,{type:"route.package.detached",...result,at:new Date().toISOString()});return result;});
exports.correctRoutePackage=routeAction(async req=>{const result=await RouteControl.correctPackage(db,req.params.routeId,actorId(req),req.params.stopId,req.params.operationId,req.params.packageId,req.body?.status,req.body?.reason);emitDispatchSync(req,{type:"route.package.corrected",...result,at:new Date().toISOString()});return result;});
