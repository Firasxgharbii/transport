const multer = require("multer");

const storage =
  multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize:
      10 * 1024 * 1024,
  },

  fileFilter: (
    req,
    file,
    callback,
  ) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ];

    if (
      !allowedTypes.includes(
        file.mimetype,
      )
    ) {
      return callback(
        new Error(
          "Format d'image non autorisé.",
        ),
      );
    }

    callback(null, true);
  },
});

module.exports = upload;