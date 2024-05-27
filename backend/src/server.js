import express from 'express'

import bodyParser from 'body-parser'
import cors from 'cors'
import morgan from 'morgan'
import {
  getAuthUri, handleCallback, getFilteredEstimates,
  processFile, estimateToDB, estimateExists, processBarcode,
  getUserToken, getProductName, fetchCustomers, saveCustomers
} from './service.js'
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

/***************************************************************
                       User Auth Functions
***************************************************************/
app.get('/authUri', (req, res) => {
  getAuthUri(req)
    .then(authUri => {
      res.send(JSON.stringify(authUri))
    })
    .catch(error => res.status(error.statusCode || 500).json({ error: error.message }))
})

app.get('/callback', (req, res) => {
  handleCallback(req)
    .then(userId => {
      res.redirect(`http://localhost:3000/oauth/callback?userId=${userId}`) // redirects to frontend dashboard with userId
    })
    .catch(error => {
      console.error(error)
      res.status(error.statusCode || 500).json({ error: error.message })
    })
})

app.get('/retrieveToken/:userId', function (req, res) {
  const userId = req.params.userId
  getUserToken(userId)
    .then(token => res.send(token))
    .catch(error => {
      res.status(error.statusCode || 500).json({ error: error.message })
    })
})

app.get('/verifyUser/:userId', (req, res) => {
  const userId = req.params.userId
  getUserToken(userId)
    .then(userToken => {
      res.json({ isValid: true, accessToken: userToken.access_token })
    })
    .catch(error => {
      res.status(error.statusCode || 500).json({ isValid: false, error: error.message })
    })
})

/***************************************************************
                       Quote Functions
***************************************************************/
app.get('/getCustomers/:userId', (req, res) => {
  const userId = req.params.userId
  fetchCustomers(userId)
    .then(data => {
      res.json(data)
    })
    .catch(error => {
      res.status(error.statusCode || 500).json({ error: error.message })
    })
})

app.post('/saveCustomers', (req, res) => {
  const customers = req.body
  saveCustomers(customers)
    .then(() => {
      res.status(200).json({ message: 'Quote saved successfully in database' })
    })
    .catch((error) => {
      console.error(error)
      res.status(error.statusCode || 500).json({ error: error.message })
    })
})

// saves quote to the database
app.post('/saveQuote', (req, res) => {
  const quote = req.body
  estimateToDB(quote)
    .then(() => {
      res.status(200).json({ message: 'Quote saved successfully in database' })
    })
    .catch((error) => {
      console.error(error)
      res.status(error.statusCode || 500).json({ error: error.message })
    })
})

// Gathers quote information from either the local database or from the actual API
app.get('/estimate/:quoteId/:userId', (req, res) => {
  const { quoteId, userId } = req.params
  const { searchField } = req.query // searchField can either be 'DocNumber' or 'PrivateNote'
  let quote = estimateExists(quoteId)
  if (quote != null) {
    res.json({
      source: 'database',
      data: quote
    })
    return
  }

  getFilteredEstimates(searchField, quoteId, userId)
    .then(estimate => {
      quote = estimate[0]
      res.json({
        source: 'api',
        data: quote
      })
    })
    .catch(error => {
      console.error(error)
      res.status(error.statusCode || 500).json({ error: error.message })
    })
})

app.post('/upload', upload.single('input'), (req, res) => {
  if (!req.file || req.file.filename === null || req.file.filename === 'undefined') {
    return res.status(403).json('No File')
  }

  const filePath = process.cwd() + '/' + req.file.filename

  processFile(filePath)
    .then(data => {
      res.status(200).json(data)
    })
    .catch(error => {
      console.error('Error processing file:', error)
      res.status(error.statusCode || 500).json({ error: error.message })
    })
})

app.post('/productScan', (req, res) => {
  const { barcode, quoteId, newQty } = req.body
  processBarcode(barcode, quoteId, newQty)
    .then(message => {
      res.status(200).json(message)
    })
    .catch(error => {
      console.error('Error finding product in quote:', error)
      res.status(error.statusCode || 500).json({ error: error.message })
    })
})

app.get('/barcodeToName/:barcode', (req, res) => {
  const { barcode } = req.params

  getProductName(barcode)
    .then(productName => {
      res.json({ productName })
    })
    .catch(error => {
      res.status(error.statusCode || 500).json({ error: error.message })
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
