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

async function uploadDeliveryPhoto(file, orderId) {
  const safeOrderId = normalizePositiveId(orderId, "orderId");
  validateImageFile(file, "La photo de livraison");

  const result = await uploadBuffer(file.buffer, {
    folder: `glory-solutions/delivery-proofs/order-${safeOrderId}/photos`,
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

async function uploadDeliverySignature(file, orderId) {
  const safeOrderId = normalizePositiveId(orderId, "orderId");
  validateImageFile(file, "La signature");

  const result = await uploadBuffer(file.buffer, {
    folder: `glory-solutions/delivery-proofs/order-${safeOrderId}/signatures`,
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
}) {
  const safeOrderId = normalizePositiveId(orderId, "orderId");

  if (!photo && !signature) {
    throw new Error(
      "Une photo ou une signature doit être fournie comme preuve de livraison.",
    );
  }

  const [photoResult, signatureResult] = await Promise.all([
    photo ? uploadDeliveryPhoto(photo, safeOrderId) : Promise.resolve(null),
    signature
      ? uploadDeliverySignature(signature, safeOrderId)
      : Promise.resolve(null),
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