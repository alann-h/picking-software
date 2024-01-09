import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import morgan from 'morgan'
import { getAuthUri, handleCallback, getFilteredEstimates, processFile, estimateToDB, estimateExists } from './service.js'
import config from '../config.json'
import swaggerUi from 'swagger-ui-express'
import swaggerDocument from '../swagger.json'
import multer from 'multer'

const app = express()

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(morgan(':method :url :status'))

const upload = multer({ dest: process.cwd() })

let oauthToken = null
const databasePath = 'database.json'

/***************************************************************
                       User Auth Functions
***************************************************************/

app.get('/authUri', (req, res) => {
  getAuthUri()
    .then(authUri => res.send(authUri))
    .catch(error => res.status(500).json({ error: error.message }))
})

app.get('/callback', (req, res) => {
  handleCallback(req)
    .then(token => {
      oauthToken = token
      res.send('Token received and stored successfully.')
    })
    .catch(error => {
      console.error(error)
      res.status(500).json({ error: error.message })
    })
})

app.get('/retrieveToken', function (req, res) {
  res.send(oauthToken)
})

/***************************************************************
                       Quote Functions
***************************************************************/

app.get('/estimates', (req, res) => {
  const searchField = req.query.searchField // 'DocNumber' or 'PrivateNote'
  const estimateNumber = req.query.estimateNumber // The estimate number entered by the user
  let quote = estimateExists(estimateNumber, databasePath)
  if (quote != null) {
    res.send(JSON.stringify(quote, null, 2))
    return
  }
  getFilteredEstimates(searchField, estimateNumber)
    .then(estimate => {
      quote = JSON.stringify(estimate[0], null, 2)
      estimateToDB(quote, databasePath)
      res.send(quote)
    })
    .catch(error => {
      console.error(error)
      res.status(500).json({ error: error.message })
    })
})

app.post('/upload', upload.single('input'), (req, res) => {
  if (!req.file || req.file.filename === null || req.file.filename === 'undefined') {
    return res.status(400).json('No File')
  }

  const filePath = process.cwd() + '/' + req.file.filename

  processFile(filePath, databasePath)
    .then(message => {
      res.status(200).json(message)
    })
    .catch(error => {
      console.error('Error processing file:', error)
      res.status(500).json({ error: error.message })
    })
})

// app.get('/productScan', (req, res) => {
//   const barcode = req.query.barcode

// })

/***************************************************************
                       Running Server
***************************************************************/
app.get('/', (req, res) => res.redirect('/docs'))

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

const port = config.BACKEND_PORT
const server = app.listen(port, () => {
  console.log(`Backend is now listening on port ${port}!`)
  console.log(`For API docs, navigate to http://localhost:${port}`)
})

export default server
