import OAuthClient from 'intuit-oauth'
import fs from 'fs'
import config from '../config.json'

const clientId = config.CLIENT_ID
const clientSecret = config.CLIENT_SECRET
const redirectUri = config.REDIRECT_URI

function generateRandomUserId () {
  return Math.floor(10000 + Math.random() * 90000).toString()
}
/***************************************************************
                       Auth Functions
***************************************************************/

export function getAuthUri (req) {
  const oauthClient = new OAuthClient({
    clientId,
    clientSecret,
    environment: req.query.json.environment,
    redirectUri
  })
  return Promise.resolve(oauthClient.authorizeUri({ scope: [OAuthClient.scopes.Accounting], state: 'intuit-test' }))
}

export function handleCallback (req) {
  const oauthClient = new OAuthClient({
    clientId,
    clientSecret,
    redirectUri
  })

  return oauthClient.createToken(req.url)
    .then(authResponse => {
      const token = authResponse.getJson()
      const userId = generateRandomUserId()
      storeUserId(userId)
      return token
    })
}

function storeUserId (userId) {
  const dbPath = '../database.json'
  return new Promise((resolve, reject) => {
    fs.readFile(dbPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading database.json:', err)
        reject(err)
        return
      }

      const db = JSON.parse(data)
      db.users = db.users || {}
      db.users[userId] = { /* any additional user data */ }

      fs.writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8', writeErr => {
        if (writeErr) {
          console.error('Error writing to database.json:', writeErr)
          reject(writeErr)
          return
        }
        resolve()
      })
    })
  })
}
