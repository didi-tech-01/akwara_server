require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const Images = require("./Imagemodel");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

//parse application/json
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

const uploadImage = (file) => {
  return new Promise((resolve, reject) => {
    // Determine the folder structure based on whether it's a member or not
    const folder = `Akwara`;
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );

    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};

const getPublicIdFromUrl = (url) => {
  const splitUrl = url.split("/");
  const filename = splitUrl[splitUrl.length - 1];
  return filename.split(".")[0]; // Remove file extension
};

app.get("/posted_images", async (req, res) => {
  try {
    const theImages = await Images.find();
    res.status(200).json({ status: true, data: theImages });
  } catch (error) {
    res.status(401).json({ status: true, message: error?.message });
  }
});

app.post("/add_image", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(401).json({ status: true, message: "add image" });
    }
    const uploadedImageUrl = await uploadImage(file);

    let newImage = new Images({
      name: req.body.name,
      price: req.body.price,
      img_url: uploadedImageUrl,
    });

    newImage = await newImage.save();
    return res.status(200).json({ status: true, message: "Image added" });
  } catch (error) {
    res.status(401).json({ status: true, message: error?.message });
  }
});

app.delete("/remove_image/:id", async (req, res) => {
  try {
    //confirm the image exsit
    const findTheImage = await Images.findById(req.params.id);
    if (!findTheImage) {
      return res
        .status(401)
        .json({ status: true, message: "Image to remove doesn't exist" });
    }
    const publicId = getPublicIdFromUrl(findTheImage.img_url);
    await cloudinary.uploader.destroy(publicId);

    //delete from the database
    await Images.findOneAndDelete({ img_url: findTheImage.img_url });
    res.status(200).json({ status: true, message: "Image deleted" });
  } catch (error) {
    res.status(401).json({ status: true, message: error?.message });
  }
});


// Update isOutstock field
app.patch("/update_isoutstock/:id", async (req, res) => {
  try {
    const { isOutstock } = req.body;
    if (typeof isOutstock !== "boolean") {
      return res.status(400).json({ status: false, message: "Invalid value for isOutstock" });
    }

    const updatedImage = await Images.findByIdAndUpdate(
      req.params.id,
      { isOutstock: isOutstock },
      { new: true } // Returns the updated document
    );

    if (!updatedImage) {
      return res.status(404).json({ status: false, message: "Image not found" });
    }

    res.status(200).json({ status: true, message: "Image updated", data: updatedImage });
  } catch (error) {
    res.status(500).json({ status: false, message: error?.message });
  }
});


//ini my database
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "Akwara",
  })
  .then(() => {
    console.log("Database Connection is ready...");
  })
  .catch((err) => {
    console.log(err);
  });

app.listen(process.env.PORT || 8000, function () {
  console.log(`App is listening on port ${process.env.PORT || 8000}`);
});
