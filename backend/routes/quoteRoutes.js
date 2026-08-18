const express = require("express");

const router = express.Router();

const {
  sendQuote,
} = require("../controllers/quoteController");

router.post("/", sendQuote);

module.exports = router;