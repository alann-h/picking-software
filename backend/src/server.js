import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import morgan from 'morgan'
import { getAuthUri, handleCallback, getFilteredEstimates, processFile } from './service.js'
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
  const searchId = req.query.estimateNumber // The search ID entered by the user
  getFilteredEstimates(searchField, searchId)
    .then(estimate => {
      const quote = JSON.stringify(estimate, null, 2)
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
  const databasePath = 'database.json'

  processFile(filePath, databasePath)
    .then(message => {
      res.status(200).json(message)
    })
    .catch(error => {
      console.error('Error processing file:', error)
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
