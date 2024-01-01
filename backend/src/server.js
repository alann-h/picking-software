import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import morgan from 'morgan'
import { getAuthUri, handleCallback, getFilteredEstimates } from './service.js'
import config from '../config.json'
import swaggerUi from 'swagger-ui-express'
import swaggerDocument from '../swagger.json'

const app = express()

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(morgan(':method :url :status'))

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
  oauthToken = handleCallback(req)
  res.send('')
})

app.get('/retrieveToken', function (req, res) {
  res.send(oauthToken)
})
/***************************************************************
                       Quote Functions
***************************************************************/

app.get('/estimates', function (req, res) {
  getFilteredEstimates(req)
    .then(estimates => res.send(estimates))
    .catch(() => res.status(500).send('An error occurred while retrieving the estimate.'))
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
