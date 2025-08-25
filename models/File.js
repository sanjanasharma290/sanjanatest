const mongoose = require("mongoose")

const fileSchema = new mongoose.Schema(
  {
    filename: {
        
      type: String,
      required: [true, "Filename is required"],
      trim: true,
    },
    originalName: {
      type: String,
      required: [true, "Original filename is required"],
    },
    fileURL: {

      type: String,
      required: [true, "File URL is required"],
    },
    publicId: {

      type: String,
      required: [true, "Cloudinary public ID is required"],
    },
    uploadedBy: {

      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader is required"],
    },
    expiryTime: {

      type: Date,
      required: [true, "Expiry time is required"],
      index: { expireAfterSeconds: 0 },
    },
    downloadCount: {

      type: Number,
      default: 0,
      min: 0,
    },
    fileSize: {

      type: Number,
      required: true,
    },
    mimeType: {

      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

fileSchema.index({ uploadedBy: 1, createdAt: -1 })

  fileSchema.index({ expiryTime: 1 })

module.exports = mongoose.model("File", fileSchema)
