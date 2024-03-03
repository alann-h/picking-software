import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import morgan from 'morgan'
import { getAuthUri, handleCallback, getFilteredEstimates, processFile, estimateToDB, estimateExists, processBarcode } from './service.js'
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

/***************************************************************
                       User Auth Functions
***************************************************************/

app.get('/authUri', (req, res) => {
  getAuthUri()
    .then(authUri => res.send(JSON.stringify(authUri)))
    .catch(error => res.status(500).json({ error: error.message }))
})

app.get('/callback', (req, res) => {
  handleCallback(req)
    .then(token => {
      oauthToken = token
      res.redirect('http://localhost:3000/oauth/callback')
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
// should spilit this into two functions one for getting the estimate and the other for putting the estimate in database
app.post('/estimates', (req, res) => {
  const { searchField, estimateNumber } = req.body // searchField can either be 'DocNumber' or 'PrivateNote
  let quote = estimateExists(estimateNumber)
  if (quote != null) {
    res.send(JSON.stringify(quote, null, 2))
    return
  }
  getFilteredEstimates(searchField, estimateNumber)
    .then(estimate => {
      quote = JSON.stringify(estimate[0], null, 2)
      estimateToDB(quote);
      res.send(quote);
    })
    .catch(error => {
      console.error(error)
      res.status(400).json({ error: error.message })
    })
})

app.post('/upload', upload.single('input'), (req, res) => {
  if (!req.file || req.file.filename === null || req.file.filename === 'undefined') {
    return res.status(400).json('No File')
  }

  const filePath = process.cwd() + '/' + req.file.filename

  processFile(filePath)
    .then(message => {
      res.status(200).json(message)
    })
    .catch(error => {
      console.error('Error processing file:', error)
      res.status(500).json({ error: error.message })
    })
})

app.post('/productScan', (req, res) => {
  const { barcode, docNumber, newQty } = req.body
  processBarcode(barcode, docNumber, newQty)
    .then(message => {
      res.status(200).json(message)
    })
    .catch(error => {
      console.error('Error finding product in quote:', error)
      res.status(500).json({ error: error.message })
    })
})

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
