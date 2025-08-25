const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const dotenv = require("dotenv")


dotenv.config()


const authRoutes = require("./routes/auth")
const fileRoutes = require("./routes/files")

const app = express()


app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


app.use("/api/auth", authRoutes)
app.use("/api/files", fileRoutes)


app.get("/api/health", (req, res) => {
  res.json({ message: "File sharing backend is running!" })
})


app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
})


app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  })
})


mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/filesharing")
  .then(() => {
    console.log("Connected to MongoDB")


    const PORT = process.env.PORT || 5000
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error)
    process.exit(1)
  })

module.exports = app
