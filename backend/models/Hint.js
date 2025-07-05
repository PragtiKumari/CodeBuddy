const mongoose = require("mongoose");

const hintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },
  hint: {
    type: String,
    required: true,
  }
});

module.exports = mongoose.model("Hint", hintSchema);
