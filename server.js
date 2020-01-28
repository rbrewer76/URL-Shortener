'use strict';

const express = require("express")
const mongo = require("mongodb")
const mongoose = require("mongoose")
const dns = require("dns")
const app = express()

// Basic Configuration 
const port = process.env.PORT || 3000
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true })

/*
// is there a connection to the DB?
setTimeout(() => {
  console.log("mongoose connected: " + mongoose.connection.readyState)}, 2000)
*/

// Middleware
const cors = require("cors")
const bodyParser = require("body-parser")

app.use(cors())
app.use(bodyParser.urlencoded({extended: "false"}))
app.use(bodyParser.json())


const urlSchema = new mongoose.Schema({
  originalUrl: {type: String, required: true},
  shortUrl: {type: String, required: true}
})


const urlMap = mongoose.model("urlMap", urlSchema)

app.listen(port, () => {
  console.log('Node.js listening ...')
})


app.use("/public", express.static(process.cwd() + "/public"))


app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/views/index.html")
})


app.get("/api/shorturl/:shortenedUrl", (req, res) => {
  // accept a shortURL and redirect to the website
  const link = req.params.shortenedUrl

  urlMap.findOne({"shortUrl": link}).then(data => {
    if (data === null) 
      res.json({ error: "Invalid ShortUrl"});
    else 
      res.redirect("http://" + data.originalUrl)
  })
})


app.post("/api/shorturl/new", (req, res) => {
  // Make a new shortURL entry OR retrieve one that already exists
  const url = req.body.url

  // strip http & https from urls so they will be resolvable
  const strippedUrl = url.replace(/^https?\:\/\//i, "")
  let shortUrl = ""
  
  dns.lookup(strippedUrl, (err, addresses, family) => {
    console.log(strippedUrl + " : " + addresses)
    if (err)
      res.json({error: "invalid URL"})  
    else {
      // The URL is good, search for the website in the DB 
      urlMap.findOne({"originalUrl": strippedUrl}).then(data => {
        if (data !== null) 
          shortUrl = data.shortUrl
        else {
          // Website not found, create a new link and save it to the DB
          shortUrl = genShortUrl()
          createUrlRecord(strippedUrl, shortUrl)
        }
        res.json({"original_url": strippedUrl,"short_url": shortUrl})
      })
    } 
  })
})


const createUrlRecord = (strippedUrl, shortUrl) => {
  const newUrlRecord = new urlMap({"originalUrl": strippedUrl, "shortUrl": shortUrl})
  
  newUrlRecord.save((err, data) => {
    if (err)
      return console.err(err)
  })
}


const genShortUrl = (length=8) => {
  // 62 characters
  const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let shortUrl = ""

  // Make a random 10 character link
  for(let i = 0; i < length; i++ )
    shortUrl += characters.charAt(Math.floor(Math.random() * characters.length))

  return shortUrl
}  