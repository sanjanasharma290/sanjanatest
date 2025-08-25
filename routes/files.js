const express = require("express")
const multer = require("multer")
const cloudinary = require("cloudinary").v2
const File = require("../models/File")
const User = require("../models/User")
const auth = require("../middleware/auth")
const sendEmail = require("../utils/sendEmail")

const router = express.Router()


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})


const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, 
  },
  fileFilter: (req, file, cb) => {

    cb(null, true)
  },
})

router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      })
    }

    
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "auto",
            folder: "file-sharing",
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          },
        )
        .end(req.file.buffer)
    })

    
    const expiryTime = new Date()
    expiryTime.setHours(expiryTime.getHours() + 1)

    
    const file = new File({
      filename: uploadResult.public_id,
      originalName: req.file.originalname,
      fileURL: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      uploadedBy: req.user.userId,
      expiryTime,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    })

    await file.save()

    
    const downloadLink = `${process.env.FRONTEND_URL || "http://localhost:5000"}/api/files/download/${file._id}`

    
    const user = await User.findById(req.user.userId)
    await sendEmail({
      to: user.email,
      subject: "File Upload Successful - Download Link",
      html: `
        <h2>File Upload Successful!</h2>
        <p>Hello ${user.name},</p>
        <p>Your file "<strong>${req.file.originalname}</strong>" has been uploaded successfully.</p>
        <p><strong>Download Link:</strong> <a href="${downloadLink}">${downloadLink}</a></p>
        <p><strong>Expires:</strong> ${expiryTime.toLocaleString()}</p>
        <p>This link will expire in 1 hour from upload time.</p>
        <br>
        <p>Best regards,<br>File Sharing Team</p>
      `,
    })

    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      file: {
        id: file._id,
        originalName: file.originalName,
        downloadLink,
        expiryTime: file.expiryTime,
        fileSize: file.fileSize,
      },
    })
  } catch (error) {
    console.error("Upload error:", error)
    res.status(500).json({
      success: false,
      message: "Error uploading file",
      error: error.message,
    })
  }
})


router.get("/download/:id", async (req, res) => {
  try {
    const fileId = req.params.id

  
    const file = await File.findById(fileId).populate("uploadedBy", "name email")

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      })
    }


    const currentTime = new Date()
    if (currentTime > file.expiryTime) {
      return res.status(410).json({
        success: false,
        message: "Download link has expired",
      })
    }

   
    file.downloadCount += 1
    await file.save()

   
    res.json({
      success: true,
      message: "File access granted",
      fileURL: file.fileURL,
      filename: file.originalName,
      downloadCount: file.downloadCount,
      uploadedBy: file.uploadedBy.name,
      expiryTime: file.expiryTime,
    })
  } catch (error) {
    console.error("Download error:", error)
    res.status(500).json({
      success: false,
      message: "Error accessing file",
    })
  }
})


router.get("/my-files", auth, async (req, res) => {
  try {
    const files = await File.find({ uploadedBy: req.user.userId }).sort({ createdAt: -1 }).select("-publicId")

    res.json({
      success: true,
      files: files.map((file) => ({
        id: file._id,
        originalName: file.originalName,
        downloadCount: file.downloadCount,
        expiryTime: file.expiryTime,
        createdAt: file.createdAt,
        isExpired: new Date() > file.expiryTime,
      })),
    })
  } catch (error) {
    console.error("Get files error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching files",
    })
  }
})

module.exports = router
