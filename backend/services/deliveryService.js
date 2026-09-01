const cloudinary = require("../config/cloudinary");

/* =========================================================
   UPLOAD BUFFER VERS CLOUDINARY
========================================================= */

function uploadBuffer(
  buffer,
  {
    folder,
    publicId,
  } = {}
) {
  return new Promise((resolve, reject) => {
    if (!buffer) {
      return reject(
        new Error("Aucun fichier reçu.")
      );
    }

    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder:
            folder ||
            "glory-solutions/delivery-proofs",

          public_id:
            publicId || undefined,

          resource_type: "image",

          overwrite: false,

          unique_filename: true,

          use_filename: false,
        },

        (error, result) => {
          if (error) {
            return reject(error);
          }

          return resolve(result);
        }
      );

    uploadStream.end(buffer);
  });
}

/* =========================================================
   PHOTO DE LIVRAISON
========================================================= */

async function uploadDeliveryPhoto(
  file,
  orderId
) {
  if (!file?.buffer) {
    throw new Error(
      "La photo de livraison est manquante."
    );
  }

  const result = await uploadBuffer(
    file.buffer,
    {
      folder:
        `glory-solutions/delivery-proofs/order-${orderId}/photos`,
    }
  );

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

/* =========================================================
   SIGNATURE
========================================================= */

async function uploadDeliverySignature(
  file,
  orderId
) {
  if (!file?.buffer) {
    throw new Error(
      "La signature est manquante."
    );
  }

  const result = await uploadBuffer(
    file.buffer,
    {
      folder:
        `glory-solutions/delivery-proofs/order-${orderId}/signatures`,
    }
  );

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

/* =========================================================
   UPLOAD PHOTO + SIGNATURE
========================================================= */

async function uploadDeliveryProofFiles({
  photo,
  signature,
  orderId,
}) {
  if (!orderId) {
    throw new Error(
      "L'identifiant de commande est obligatoire."
    );
  }

  if (!photo) {
    throw new Error(
      "La photo de livraison est obligatoire."
    );
  }

  if (!signature) {
    throw new Error(
      "La signature est obligatoire."
    );
  }

  const [
    photoResult,
    signatureResult,
  ] = await Promise.all([
    uploadDeliveryPhoto(
      photo,
      orderId
    ),

    uploadDeliverySignature(
      signature,
      orderId
    ),
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