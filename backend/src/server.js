import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import morgan from 'morgan'
import { getAuthUri, handleCallback } from './service.js'
import config from '../config.json'
import swaggerUi from 'swagger-ui-express'
import swaggerDocument from '../swagger.json'

const app = express()

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(morgan(':method :url :status'))

/***************************************************************
                       User Auth Functions
***************************************************************/

app.get('/authUri', (req, res) => {
  getAuthUri(req)
    .then(authUri => res.send(authUri))
    .catch(error => res.status(500).json({ error: error.message }))
})

app.get('/callback', (req, res) => {
  handleCallback(req)
    .then(token => res.json({ token }))
    .catch(error => res.status(500).json({ error: error.message }))
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
