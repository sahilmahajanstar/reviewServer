import Exif from 'exif'
import bodyParser from 'body-parser'
import cors from 'cors'
import exif from 'exif'
import express from 'express'
import fs from 'fs'
import multer from 'multer'
import path from 'path'

const app = express()
let folderLen = 1
const port = 5000

app.use(
  cors({
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200,
  })
)

bodyParser.urlencoded({ extended: true })
app.use(bodyParser.json({}))

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

var storage = multer.diskStorage({
  filename: function (req, file, callback) {
    callback(
      null,
      file.fieldname + '-' + Date.now() + path.extname(file.originalname)
    )
  },
})

var upload = multer({ storage: storage }).array('images', 15)

app.get('/', function (_, res) {
  res.sendFile(__dirname + '/index.html')
})

app.use(express.static('upload'))
app.use(express.static('public'))

app.post('/upload', upload, function (req, res) {
  const geoPos = req.body.geoPos
  const files: Express.Multer.File[] = req.files as Express.Multer.File[]
  if (!files?.length) {
      res.send({
        status: 'error',
        data: { message: 'file not found' },
      })
      return
  }
  const geoPosParse = JSON.parse(geoPos || {})
  const folderName= `folder${folderLen++}`
  const folder = path.join(__dirname, `/upload/${folderName}`)
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true })
  const imageMetadata: any = { deviceLocation: geoPosParse, images: [] }
  const exif = new Exif.ExifImage()
  for (let i = 0; i < files.length; i++) {
    const file: Express.Multer.File = files[i]
    const name =
      file.fieldname + '-' + Date.now() + path.extname(file.originalname)
    const result = fs.readFileSync(file.path)
    exif.loadImage(result, (_, data) => {
      imageMetadata.images.push({
        size: file.size,
        mimeType: file.mimetype,
        name: name,
        folder: folderName,
        geoPos: {
          lat: data?.gps.GPSDestLatitudeRef || geoPosParse?.lat,
          long: data?.gps.GPSDestLongitudeRef || geoPosParse?.long,
        },
      })
    })
    fs.writeFileSync(path.join(folder, name), result)
    storage._removeFile(req, file, () => {
      //   clear inmemory image store
      console.log('remove')
    })
  }
  fs.writeFileSync(
    path.join(folder, 'info.json'),
    JSON.stringify(imageMetadata)
  )

  res.send({
    status: 'success',
    data: {
      message: 'data uploaded',
    },
  })
})

app.get('/read', upload, function (req, res) {
  const mainPath = path.join(__dirname, 'upload')
  const dir = fs.readdirSync(mainPath)
  let images:any[] = []
  for (let i = 0; i < dir.length; i++) {
    const json = fs.readFileSync(
      path.join(mainPath, dir[i], 'info.json'),
      'utf-8'
    )
    const parseObj = JSON.parse(json||'{}')
    images = images.concat(parseObj.images)
  }
  console.log(images);
  
  res.send({
    status: 'success',
    data: images
  })
})