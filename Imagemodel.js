require("dotenv").config();
const mongoose = require("mongoose");

const imageSchema = mongoose.Schema(
  {
    name: { type: String },
    price: { type: Number },
    img_url: {
      type: String,
    },
  },
  { timestamps: true }
);

const Images = mongoose.model("Images", imageSchema);

module.exports = Images;
