const {
  sendMail,
} = require("../config/mailer");

/* =========================================================
   HELPERS
========================================================= */

function value(data) {
  if (
    data === undefined ||
    data === null ||
    String(data).trim() === ""
  ) {
    return "Non renseigné";
  }

  return String(data).trim();
}

function yesNo(data) {
  return data ? "Oui" : "Non";
}

function escapeHtml(data) {
  return value(data)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================================================
   NOM DU SERVICE
========================================================= */

function getServiceLabel(serviceType) {
  const services = {
    transport:
      "Transport et livraison",

    "transport-automobile":
      "Transport automobile",

    "demenagement-residentiel":
      "Déménagement résidentiel",

    "demenagement-commercial":
      "Déménagement commercial",

    entreposage:
      "Entreposage",

    conteneur:
      "Déchargement de conteneur",
  };

  return (
    services[serviceType] ||
    value(serviceType)
  );
}

/* =========================================================
   FORMATER LA DATE
========================================================= */

function formatDate(date) {
  if (!date) {
    return "Non renseigné";
  }

  const parsedDate =
    new Date(`${date}T12:00:00`);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return value(date);
  }

  return new Intl.DateTimeFormat(
    "fr-CA",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  ).format(parsedDate);
}

/* =========================================================
   LIGNE EMAIL
========================================================= */

function emailRow(
  label,
  data,
  options = {}
) {
  const {
    important = false,
  } = options;

  return `
    <tr>
      <td
        style="
          width: 38%;
          padding: 13px 16px;
          border-bottom: 1px solid #eeeeee;
          color: #777777;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.5;
          vertical-align: top;
        "
      >
        ${escapeHtml(label)}
      </td>

      <td
        style="
          padding: 13px 16px;
          border-bottom: 1px solid #eeeeee;
          color: ${
            important
              ? "#dc143c"
              : "#171717"
          };
          font-family: Arial, Helvetica, sans-serif;
          font-size: ${
            important
              ? "15px"
              : "14px"
          };
          font-weight: ${
            important
              ? "900"
              : "700"
          };
          line-height: 1.5;
          vertical-align: top;
          word-break: break-word;
        "
      >
        ${escapeHtml(data)}
      </td>
    </tr>
  `;
}

/* =========================================================
   SECTION EMAIL
========================================================= */

function emailSection({
  number,
  title,
  rows,
}) {
  return `
    <table
      width="100%"
      border="0"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      style="
        width: 100%;
        margin: 0 0 24px;
        border: 1px solid #e7e7e7;
        border-radius: 12px;
        border-collapse: separate;
        border-spacing: 0;
        overflow: hidden;
        background: #ffffff;
      "
    >
      <tr>
        <td
          colspan="2"
          style="
            padding: 15px 18px;
            background: #171717;
          "
        >
          <table
            width="100%"
            border="0"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
          >
            <tr>
              <td
                style="
                  width: 42px;
                  color: #dc143c;
                  font-family: Arial, Helvetica, sans-serif;
                  font-size: 11px;
                  font-weight: 900;
                  letter-spacing: 1px;
                "
              >
                ${number}
              </td>

              <td
                style="
                  color: #ffffff;
                  font-family: Arial, Helvetica, sans-serif;
                  font-size: 12px;
                  font-weight: 900;
                  letter-spacing: 1px;
                  text-transform: uppercase;
                "
              >
                ${escapeHtml(title)}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${rows}
    </table>
  `;
}

/* =========================================================
   CONTROLLER
========================================================= */

exports.sendQuote = async (
  req,
  res
) => {
  try {
    const {
      serviceType,

      customer = {},

      origin = {},

      destination = {},

      requestedDate,

      deliveryOptions = {},

      merchandise = {},

      vehicle = {},

      moving = {},

      storage = {},

      additionalInformation,
    } = req.body || {};

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      !serviceType ||
      !customer.name ||
      !customer.email ||
      !customer.phone
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Le service, le nom, le courriel et le téléphone sont obligatoires.",
        });
    }

    const service =
      getServiceLabel(
        serviceType
      );

    const formattedRequestedDate =
      formatDate(
        requestedDate
      );

    /* =====================================================
       SECTION 01 — CLIENT
    ===================================================== */

    const customerSection =
      emailSection({
        number: "01",

        title:
          "Coordonnées du client",

        rows: [
          emailRow(
            "Nom complet",
            customer.name,
            {
              important: true,
            }
          ),

          emailRow(
            "Entreprise",
            customer.company
          ),

          emailRow(
            "Téléphone",
            customer.phone
          ),

          emailRow(
            "Courriel",
            customer.email
          ),

          emailRow(
            "Adresse",
            customer.address
          ),

          emailRow(
            "Ville",
            customer.city
          ),

          emailRow(
            "Province",
            customer.province
          ),

          emailRow(
            "Code postal",
            customer.postalCode
          ),
        ].join(""),
      });

    /* =====================================================
       SECTION 02 — DÉPART
    ===================================================== */

    const originSection =
      emailSection({
        number: "02",

        title:
          "Adresse de départ",

        rows: [
          emailRow(
            "Contact",
            origin.name
          ),

          emailRow(
            "Adresse",
            origin.address,
            {
              important: true,
            }
          ),

          emailRow(
            "Ville",
            origin.city
          ),

          emailRow(
            "Province",
            origin.province
          ),

          emailRow(
            "Code postal",
            origin.postalCode
          ),

          emailRow(
            "Téléphone",
            origin.phone
          ),
        ].join(""),
      });

    /* =====================================================
       SECTION 03 — DESTINATION
    ===================================================== */

    const destinationSection =
      serviceType !==
      "entreposage"
        ? emailSection({
            number: "03",

            title:
              "Adresse de destination",

            rows: [
              emailRow(
                "Destinataire",
                destination.name
              ),

              emailRow(
                "Adresse",
                destination.address,
                {
                  important: true,
                }
              ),

              emailRow(
                "Ville",
                destination.city
              ),

              emailRow(
                "Province",
                destination.province
              ),

              emailRow(
                "Code postal",
                destination.postalCode
              ),

              emailRow(
                "Téléphone",
                destination.phone
              ),

              emailRow(
                "Courriel",
                destination.email
              ),
            ].join(""),
          })
        : "";

    /* =====================================================
       SECTION SERVICE
    ===================================================== */

    let serviceDetailsSection =
      "";

    /* =============================
       TRANSPORT / CONTENEUR
    ============================= */

    if (
      serviceType ===
        "transport" ||
      serviceType ===
        "conteneur"
    ) {
      serviceDetailsSection =
        emailSection({
          number: "04",

          title:
            "Informations sur la marchandise",

          rows: [
            emailRow(
              "Quantité de palettes",
              merchandise.palletQuantity
            ),

            emailRow(
              "Dimensions",
              merchandise.dimensions
            ),

            emailRow(
              "Description",
              merchandise.description
            ),

            emailRow(
              "Poids total",
              merchandise.weight
            ),

            emailRow(
              "Tailgate",
              yesNo(
                merchandise.tailgate
              )
            ),

            emailRow(
              "Dock à dock",
              yesNo(
                merchandise.dockToDock
              )
            ),

            emailRow(
              "Manutention",
              yesNo(
                merchandise.handling
              )
            ),
          ].join(""),
        });
    }

    /* =============================
       TRANSPORT AUTOMOBILE
    ============================= */

    if (
      serviceType ===
      "transport-automobile"
    ) {
      serviceDetailsSection =
        emailSection({
          number: "04",

          title:
            "Informations sur le véhicule",

          rows: [
            emailRow(
              "Nombre de véhicules",
              vehicle.quantity
            ),

            emailRow(
              "Année",
              vehicle.year
            ),

            emailRow(
              "Marque",
              vehicle.make
            ),

            emailRow(
              "Modèle",
              vehicle.model
            ),

            emailRow(
              "État du véhicule",
              vehicle.condition
            ),

            emailRow(
              "Type de transport",
              vehicle.transportType
            ),
          ].join(""),
        });
    }

    /* =============================
       DÉMÉNAGEMENT
    ============================= */

    if (
      serviceType ===
        "demenagement-residentiel" ||
      serviceType ===
        "demenagement-commercial"
    ) {
      serviceDetailsSection =
        emailSection({
          number: "04",

          title:
            "Informations sur le déménagement",

          rows: [
            emailRow(
              "Type de propriété",
              moving.propertyType
            ),

            emailRow(
              "Nombre de pièces",
              moving.roomQuantity
            ),

            emailRow(
              "Étage au départ",
              moving.originFloor
            ),

            emailRow(
              "Étage à destination",
              moving.destinationFloor
            ),

            emailRow(
              "Ascenseur au départ",
              yesNo(
                moving.originElevator
              )
            ),

            emailRow(
              "Ascenseur à destination",
              yesNo(
                moving.destinationElevator
              )
            ),

            emailRow(
              "Service d’emballage",
              yesNo(
                moving.packingRequired
              )
            ),

            emailRow(
              "Démontage / remontage",
              yesNo(
                moving.furnitureDisassembly
              )
            ),
          ].join(""),
        });
    }

    /* =============================
       ENTREPOSAGE
    ============================= */

    if (
      serviceType ===
      "entreposage"
    ) {
      serviceDetailsSection =
        emailSection({
          number: "03",

          title:
            "Informations sur l’entreposage",

          rows: [
            emailRow(
              "Durée estimée",
              storage.duration
            ),

            emailRow(
              "Volume estimé",
              storage.estimatedVolume
            ),

            emailRow(
              "Date de début",
              formatDate(
                storage.startDate
              )
            ),

            emailRow(
              "Température contrôlée",
              yesNo(
                storage.climateControlled
              )
            ),
          ].join(""),
        });
    }

    /* =====================================================
       DATE ET OPTIONS
    ===================================================== */

    const optionsSection =
      emailSection({
        number:
          serviceType ===
          "entreposage"
            ? "04"
            : "05",

        title:
          "Date et options",

        rows: [
          emailRow(
            "Date souhaitée",
            formattedRequestedDate,
            {
              important: true,
            }
          ),

          emailRow(
            "Livraison le lendemain",
            yesNo(
              deliveryOptions.nextDay
            )
          ),

          emailRow(
            "Livraison le jour même",
            yesNo(
              deliveryOptions.sameDay
            )
          ),
        ].join(""),
      });

    /* =====================================================
       INFORMATIONS SUPPLÉMENTAIRES
    ===================================================== */

    const notesSection = `
      <table
        width="100%"
        border="0"
        cellpadding="0"
        cellspacing="0"
        role="presentation"
        style="
          width: 100%;
          margin: 0 0 25px;
          border: 1px solid #e7e7e7;
          border-radius: 12px;
          border-collapse: separate;
          border-spacing: 0;
          overflow: hidden;
          background: #ffffff;
        "
      >
        <tr>
          <td
            style="
              padding: 15px 18px;
              background: #171717;
              color: #ffffff;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 12px;
              font-weight: 900;
              letter-spacing: 1px;
              text-transform: uppercase;
            "
          >
            Informations supplémentaires
          </td>
        </tr>

        <tr>
          <td
            style="
              padding: 22px;
              color: #444444;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 14px;
              line-height: 1.75;
              white-space: pre-wrap;
            "
          >
            ${escapeHtml(
              additionalInformation
            )}
          </td>
        </tr>
      </table>
    `;

    /* =====================================================
       EMAIL HTML COMPLET
    ===================================================== */

    const html = `
      <!doctype html>

      <html lang="fr">

        <head>
          <meta
            charset="UTF-8"
          />

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />

          <title>
            Nouvelle soumission Glory Solutions
          </title>
        </head>

        <body
          style="
            margin: 0;
            padding: 0;
            background: #f4f4f5;
            font-family: Arial, Helvetica, sans-serif;
          "
        >

          <table
            width="100%"
            border="0"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="
              width: 100%;
              background: #f4f4f5;
            "
          >

            <tr>

              <td
                align="center"
                style="
                  padding: 35px 12px;
                "
              >

                <table
                  width="760"
                  border="0"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                  style="
                    width: 100%;
                    max-width: 760px;
                    background: #ffffff;
                    border-radius: 18px;
                    overflow: hidden;
                    box-shadow:
                      0 15px 45px
                      rgba(0,0,0,.10);
                  "
                >

                  <!-- =========================
                       HEADER
                  ========================== -->

                  <tr>

                    <td
                      style="
                        padding: 38px 40px;
                        background: #dc143c;
                      "
                    >

                      <table
                        width="100%"
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >

                        <tr>

                          <td>

                            <div
                              style="
                                margin-bottom: 10px;
                                color: #ffffff;
                                font-family: Arial, Helvetica, sans-serif;
                                font-size: 12px;
                                font-weight: 900;
                                letter-spacing: 3px;
                                text-transform: uppercase;
                              "
                            >
                              GLORY SOLUTIONS
                            </div>

                            <div
                              style="
                                color: #ffffff;
                                font-family: Arial, Helvetica, sans-serif;
                                font-size: 30px;
                                font-weight: 900;
                                line-height: 1.15;
                              "
                            >
                              Nouvelle demande
                              <br />
                              de soumission
                            </div>

                            <div
                              style="
                                margin-top: 12px;
                                color: rgba(255,255,255,.82);
                                font-family: Arial, Helvetica, sans-serif;
                                font-size: 12px;
                                line-height: 1.5;
                              "
                            >
                              Demande reçue depuis
                              glorysolutions.ca
                            </div>

                          </td>

                        </tr>

                      </table>

                    </td>

                  </tr>

                  <!-- =========================
                       RÉSUMÉ
                  ========================== -->

                  <tr>

                    <td
                      style="
                        padding:
                          30px
                          40px
                          10px;
                      "
                    >

                      <table
                        width="100%"
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                        style="
                          width: 100%;
                          border: 1px solid #ffd0da;
                          border-radius: 12px;
                          border-collapse: separate;
                          border-spacing: 0;
                          overflow: hidden;
                          background: #fff7f9;
                        "
                      >

                        <tr>

                          <td
                            style="
                              padding:
                                20px
                                22px;
                            "
                          >

                            <div
                              style="
                                margin-bottom: 6px;
                                color: #dc143c;
                                font-family: Arial, Helvetica, sans-serif;
                                font-size: 10px;
                                font-weight: 900;
                                letter-spacing: 1.4px;
                                text-transform: uppercase;
                              "
                            >
                              Service demandé
                            </div>

                            <div
                              style="
                                color: #171717;
                                font-family: Arial, Helvetica, sans-serif;
                                font-size: 21px;
                                font-weight: 900;
                                line-height: 1.25;
                              "
                            >
                              ${escapeHtml(
                                service
                              )}
                            </div>

                          </td>

                        </tr>

                      </table>

                    </td>

                  </tr>

                  <!-- =========================
                       CONTACT RAPIDE
                  ========================== -->

                  <tr>

                    <td
                      style="
                        padding:
                          15px
                          40px
                          5px;
                      "
                    >

                      <table
                        width="100%"
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                        style="
                          background: #171717;
                          border-radius: 12px;
                        "
                      >

                        <tr>

                          <td
                            style="
                              padding:
                                18px
                                20px;
                            "
                          >

                            <div
                              style="
                                margin-bottom: 4px;
                                color: #999999;
                                font-size: 10px;
                                font-weight: 800;
                                letter-spacing: 1px;
                                text-transform: uppercase;
                              "
                            >
                              Client
                            </div>

                            <div
                              style="
                                color: #ffffff;
                                font-size: 16px;
                                font-weight: 900;
                              "
                            >
                              ${escapeHtml(
                                customer.name
                              )}
                            </div>

                          </td>

                          <td
                            style="
                              padding:
                                18px
                                20px;
                            "
                          >

                            <div
                              style="
                                margin-bottom: 4px;
                                color: #999999;
                                font-size: 10px;
                                font-weight: 800;
                                letter-spacing: 1px;
                                text-transform: uppercase;
                              "
                            >
                              Téléphone
                            </div>

                            <div
                              style="
                                color: #ffffff;
                                font-size: 14px;
                                font-weight: 800;
                              "
                            >
                              ${escapeHtml(
                                customer.phone
                              )}
                            </div>

                          </td>

                        </tr>

                      </table>

                    </td>

                  </tr>

                  <!-- =========================
                       CONTENU
                  ========================== -->

                  <tr>

                    <td
                      style="
                        padding:
                          25px
                          40px
                          35px;
                      "
                    >

                      ${customerSection}

                      ${originSection}

                      ${destinationSection}

                      ${serviceDetailsSection}

                      ${optionsSection}

                      ${notesSection}

                    </td>

                  </tr>

                  <!-- =========================
                       BOUTONS
                  ========================== -->

                  <tr>

                    <td
                      align="center"
                      style="
                        padding:
                          0
                          40px
                          40px;
                      "
                    >

                      <table
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >

                        <tr>

                          <td
                            align="center"
                            style="
                              padding-right: 8px;
                            "
                          >

                            <a
                              href="mailto:${escapeHtml(
                                customer.email
                              )}"
                              style="
                                display: inline-block;
                                padding:
                                  15px
                                  24px;
                                background: #dc143c;
                                color: #ffffff;
                                border-radius: 8px;
                                font-family: Arial, Helvetica, sans-serif;
                                font-size: 11px;
                                font-weight: 900;
                                letter-spacing: .8px;
                                text-decoration: none;
                                text-transform: uppercase;
                              "
                            >
                              Répondre au client
                            </a>

                          </td>

                          <td
                            align="center"
                            style="
                              padding-left: 8px;
                            "
                          >

                            <a
                              href="tel:${escapeHtml(
                                customer.phone
                              )}"
                              style="
                                display: inline-block;
                                padding:
                                  14px
                                  24px;
                                border: 1px solid #171717;
                                background: #ffffff;
                                color: #171717;
                                border-radius: 8px;
                                font-family: Arial, Helvetica, sans-serif;
                                font-size: 11px;
                                font-weight: 900;
                                letter-spacing: .8px;
                                text-decoration: none;
                                text-transform: uppercase;
                              "
                            >
                              Appeler le client
                            </a>

                          </td>

                        </tr>

                      </table>

                    </td>

                  </tr>

                  <!-- =========================
                       FOOTER
                  ========================== -->

                  <tr>

                    <td
                      style="
                        padding:
                          28px
                          40px;
                        background: #171717;
                        text-align: center;
                      "
                    >

                      <div
                        style="
                          margin-bottom: 5px;
                          color: #ffffff;
                          font-family: Arial, Helvetica, sans-serif;
                          font-size: 12px;
                          font-weight: 900;
                          letter-spacing: 2px;
                        "
                      >
                        GLORY SOLUTIONS
                      </div>

                      <div
                        style="
                          color: #999999;
                          font-family: Arial, Helvetica, sans-serif;
                          font-size: 11px;
                          line-height: 1.6;
                        "
                      >
                        Soumission reçue automatiquement
                        depuis glorysolutions.ca
                      </div>

                    </td>

                  </tr>

                </table>

              </td>

            </tr>

          </table>

        </body>

      </html>
    `;

    /* =====================================================
       VERSION TEXTE
    ===================================================== */

    const text = `
GLORY SOLUTIONS
NOUVELLE DEMANDE DE SOUMISSION

SERVICE
${service}

DATE SOUHAITÉE
${formattedRequestedDate}


CLIENT
Nom : ${value(customer.name)}
Entreprise : ${value(customer.company)}
Téléphone : ${value(customer.phone)}
Courriel : ${value(customer.email)}
Adresse : ${value(customer.address)}
Ville : ${value(customer.city)}
Province : ${value(customer.province)}
Code postal : ${value(customer.postalCode)}


DÉPART
Contact : ${value(origin.name)}
Adresse : ${value(origin.address)}
Ville : ${value(origin.city)}
Province : ${value(origin.province)}
Code postal : ${value(origin.postalCode)}
Téléphone : ${value(origin.phone)}


DESTINATION
Destinataire : ${value(destination.name)}
Adresse : ${value(destination.address)}
Ville : ${value(destination.city)}
Province : ${value(destination.province)}
Code postal : ${value(destination.postalCode)}
Téléphone : ${value(destination.phone)}
Courriel : ${value(destination.email)}


INFORMATIONS SUPPLÉMENTAIRES
${value(additionalInformation)}
    `.trim();

    /* =====================================================
       ENVOI EMAIL
    ===================================================== */

    await sendMail({
      to:
        process.env
          .QUOTE_EMAIL ||
        "contact@glorysolutions.ca",

      replyTo:
        customer.email,

      subject:
        `Soumission | ${service} | ${customer.name}`,

      html,

      text,
    });

    /* =====================================================
       SUCCÈS
    ===================================================== */

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Votre demande de soumission a été envoyée avec succès.",
      });
  } catch (error) {
    console.error(
      "❌ Erreur lors de l’envoi de la soumission :",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Impossible d’envoyer la demande de soumission pour le moment.",
      });
  }
};