const cloudinary = require("../config/cloudinary");

/* =========================================================
   CONFIGURATION / SÉCURITÉ
========================================================= */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function normalizePositiveId(value, fieldName = "id") {
  const raw = String(value ?? "").trim();

  if (!/^[1-9]\d*$/.test(raw)) {
    throw new Error(`${fieldName} invalide.`);
  }

  const id = Number(raw);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`${fieldName} invalide.`);
  }

  return id;
}

function validateImageFile(file, label) {
  if (!file?.buffer || !Buffer.isBuffer(file.buffer)) {
    throw new Error(`${label} manquante ou invalide.`);
  }

  if (file.buffer.length === 0) {
    throw new Error(`${label} vide.`);
  }

  const size = Number(file.size || file.buffer.length);

  if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE) {
    throw new Error(`${label} dépasse la taille maximale autorisée de 10 Mo.`);
  }

  const mimetype = String(file.mimetype || "").toLowerCase();

  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimetype)) {
    throw new Error(
      `${label} doit être une image JPG, PNG, WEBP, HEIC ou HEIF.`,
    );
  }

  return file;
}

/* =========================================================
   UPLOAD BUFFER VERS CLOUDINARY
========================================================= */

function uploadBuffer(
  buffer,
  {
    folder,
    publicId,
  } = {},
) {
  return new Promise((resolve, reject) => {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      return reject(new Error("Aucun fichier valide reçu."));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder || "glory-solutions/delivery-proofs",
        public_id: publicId || undefined,
        resource_type: "image",
        overwrite: false,
        unique_filename: true,
        use_filename: false,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result?.secure_url || !result?.public_id) {
          return reject(
            new Error("Cloudinary n'a pas retourné un résultat valide."),
          );
        }

        return resolve(result);
      },
    );

    uploadStream.on("error", reject);
    uploadStream.end(buffer);
  });
}

/* =========================================================
   PHOTO DE LIVRAISON
========================================================= */

async function uploadDeliveryPhoto(file, orderId, context = {}) {
  const safeOrderId = normalizePositiveId(orderId, "orderId");
  validateImageFile(file, "La photo de livraison");

  const result = await uploadBuffer(file.buffer, {
    folder: context.folder || `glory-solutions/delivery-proofs/order-${safeOrderId}/photos`,
    publicId: context.publicId || undefined,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width || null,
    height: result.height || null,
    format: result.format || null,
    bytes: result.bytes || file.buffer.length,
  };
}

/* =========================================================
   SIGNATURE
========================================================= */

async function uploadDeliverySignature(file, orderId, context = {}) {
  const safeOrderId = normalizePositiveId(orderId, "orderId");
  validateImageFile(file, "La signature");

  const result = await uploadBuffer(file.buffer, {
    folder: context.folder || `glory-solutions/delivery-proofs/order-${safeOrderId}/signatures`,
    publicId: context.publicId || undefined,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width || null,
    height: result.height || null,
    format: result.format || null,
    bytes: result.bytes || file.buffer.length,
  };
}

/* =========================================================
   UPLOAD PREUVE DE LIVRAISON

   IMPORTANT :
   - la règle métier "signature OU photo obligatoire" est validée
     dans orderController.js à partir de orders.signature_required ;
   - ce service accepte donc photo seule, signature seule, ou les deux ;
   - au moins un fichier doit être présent.
========================================================= */

async function uploadDeliveryProofFiles({
  photo = null,
  signature = null,
  orderId,
  orderNumber = null,
  taskId = null,
  operationId = null,
  packageId = null,
  driverId = null,
  category = "delivery",
}) {
  const safeOrderId = normalizePositiveId(orderId, "orderId");

  if (!photo && !signature) {
    throw new Error(
      "Une photo ou une signature doit être fournie comme preuve de livraison.",
    );
  }

  const safeOrderNumber = String(orderNumber || `order-${safeOrderId}`).trim().replace(/[^A-Za-z0-9_-]+/g, "-");
  const safeCategory = String(category || "delivery").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const parts = [
    taskId ? `stop-${normalizePositiveId(taskId, "taskId")}` : null,
    operationId ? `operation-${normalizePositiveId(operationId, "operationId")}` : null,
    packageId ? `package-${normalizePositiveId(packageId, "packageId")}` : null,
    driverId ? `driver-${normalizePositiveId(driverId, "driverId")}` : null,
    stamp,
  ].filter(Boolean);
  const baseName = parts.join("_");
  const root = `glory-solutions/orders/${safeOrderNumber}`;

  const [photoResult, signatureResult] = await Promise.all([
    photo ? uploadDeliveryPhoto(photo, safeOrderId, {
      folder: `${root}/${safeCategory}/${safeCategory === "delivery" ? "photos" : "evidence"}`,
      publicId: `${baseName}_photo`,
    }) : Promise.resolve(null),
    signature ? uploadDeliverySignature(signature, safeOrderId, {
      folder: `${root}/${safeCategory}/signatures`,
      publicId: `${baseName}_signature`,
    }) : Promise.resolve(null),
  ]);

  return {
    photo: photoResult,
    signature: signatureResult,
  };
}

module.exports = {
  uploadBuffer,
  uploadDeliveryPhoto,
  uploadDeliverySignature,
  uploadDeliveryProofFiles,
};