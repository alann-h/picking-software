import express from 'express'
import session from 'express-session'
import bodyParser from 'body-parser'
import cors from 'cors'
import morgan from 'morgan'
import { getAuthUri, handleCallback, getFilteredEstimates, processFile, estimateToDB, estimateExists, processBarcode, getUserToken } from './service.js'
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

app.use(session({
  secret: 'Gold@nShore',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}))

/***************************************************************
                       User Auth Functions
***************************************************************/
app.get('/authUri', (req, res) => {
  getAuthUri(req)
    .then(authUri => {
      res.send(JSON.stringify(authUri))
    })
    .catch(error => res.status(500).json({ error: error.message }))
})

app.get('/callback', (req, res) => {
  handleCallback(req)
    .then(() => {
      const userId = req.session.userId
      res.redirect(`http://localhost:3000/oauth/callback?userId=${userId}`) // redirects to frontend dashboard with userId
    })
    .catch(error => {
      console.error(error)
      res.status(500).json({ error: error.message })
    })
})

app.get('/retrieveToken/:userId', function (req, res) {
  const userId = req.params.userId
  getUserToken(userId)
    .then(token => res.send(token))
    .catch(error => {
      res.status(500).json({ error: error.message })
    })
})

/***************************************************************
                       Quote Functions
***************************************************************/
// should spilit this into two functions one for getting the estimate and the other for putting the estimate in database
app.post('/estimates', (req, res) => {
  const { searchField, estimateNumber, userId } = req.body // searchField can either be 'DocNumber' or 'PrivateNote
  let quote = estimateExists(estimateNumber)
  if (quote != null) {
    res.send(JSON.stringify(quote, null, 2))
    return
  }
  getFilteredEstimates(searchField, estimateNumber, userId)
    .then(estimate => {
      quote = JSON.stringify(estimate[0], null, 2)
      estimateToDB(quote)
      res.send(quote)
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
