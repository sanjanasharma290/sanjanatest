const mongoose = require("mongoose")
const cloudinary = require("cloudinary")
const File = require("../models/File")
require("dotenv").config()


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

async function cleanupExpiredFiles() {
  try {
   
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("Connected to MongoDB")

    
    const expiredFiles = await File.find({
      expiryTime: { $lt: new Date() },
    })

    console.log(`Found ${expiredFiles.length} expired files`)

    
    for (const file of expiredFiles) {
      try {
        
        await cloudinary.uploader.destroy(file.publicId)
        console.log(`Deleted from Cloudinary: ${file.publicId}`)

        
        await File.findByIdAndDelete(file._id)
        console.log(`Deleted from database: ${file.originalName}`)
      } catch (error) {
        console.error(`Error deleting file ${file.originalName}:`, error)
      }
    }

    console.log("Cleanup completed")
    process.exit(0)
  } catch (error) {
    console.error("Cleanup error:", error)
    process.exit(1)
  }
}


cleanupExpiredFiles()
