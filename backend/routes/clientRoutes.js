const express = require("express");

const router = express.Router();

const clientController = require(
  "../controllers/clientController"
);

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const roleMiddleware = require(
  "../middleware/roleMiddleware"
);

/* =========================================================
   AUTHENTIFICATION GLOBALE

   Toutes les routes /api/clients/*
   nécessitent un utilisateur authentifié.
========================================================= */

router.use(authMiddleware);

/* =========================================================
   PROFIL DU CLIENT CONNECTÉ

   IMPORTANT :
   Les routes "/me" doivent absolument rester
   AVANT les routes dynamiques "/:id".

   Sinon Express pourrait considérer "me"
   comme un identifiant client.
========================================================= */

/* ---------------------------------------------------------
   RÉCUPÉRER SON PROPRE PROFIL

   GET /api/clients/me

   Accessible uniquement :
   - client

   Sécurité :
   Le client_id n'est jamais fourni par le frontend.
   Le controller retrouve le client depuis req.user.
--------------------------------------------------------- */

router.get(
  "/me",

  roleMiddleware(
    "client"
  ),

  clientController.getMyProfile
);

/* ---------------------------------------------------------
   MODIFIER SON PROPRE PROFIL

   PUT /api/clients/me

   Accessible uniquement :
   - client

   Champs autorisés côté controller :
   - first_name
   - last_name
   - company_name
   - phone
   - address
   - city
   - province
   - postal_code

   Champs non modifiables par le client :
   - id
   - user_id
   - client_id
   - company_id
   - role
   - email
   - notes
--------------------------------------------------------- */

router.put(
  "/me",

  roleMiddleware(
    "client"
  ),

  clientController.updateMyProfile
);

/* =========================================================
   ADMIN / DISPATCHER
========================================================= */

/* ---------------------------------------------------------
   RÉCUPÉRER TOUS LES CLIENTS

   GET /api/clients

   Accessible :
   - super_admin
   - dispatcher
--------------------------------------------------------- */

router.get(
  "/",

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  clientController.getClients
);

/* ---------------------------------------------------------
   CRÉER UN CLIENT

   POST /api/clients

   Accessible :
   - super_admin
   - dispatcher
--------------------------------------------------------- */

router.post(
  "/",

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  clientController.createClient
);

/* =========================================================
   ROUTES AVEC ID CLIENT

   IMPORTANT :
   Ces routes restent APRÈS "/me".
========================================================= */

/* ---------------------------------------------------------
   RÉCUPÉRER UN CLIENT PAR ID

   GET /api/clients/:id

   Accessible :
   - super_admin
   - dispatcher
--------------------------------------------------------- */

router.get(
  "/:id",

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  clientController.getClient
);

/* ---------------------------------------------------------
   MODIFIER UN CLIENT PAR ID

   PUT /api/clients/:id

   Accessible :
   - super_admin
   - dispatcher
--------------------------------------------------------- */

router.put(
  "/:id",

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  clientController.updateClient
);

/* ---------------------------------------------------------
   SUPPRIMER UN CLIENT

   DELETE /api/clients/:id

   Accessible uniquement :
   - super_admin
--------------------------------------------------------- */

router.delete(
  "/:id",

  roleMiddleware(
    "super_admin"
  ),

  clientController.deleteClient
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;