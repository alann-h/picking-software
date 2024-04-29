import OAuthClient from 'intuit-oauth'
import config from '../config.json'
import excelToJson from 'convert-excel-to-json'
import fs from 'fs-extra'
import { InputError, AccessError } from './error'
import { v4 as uuidv4 } from 'uuid'

const clientId = config.CLIENT_ID
const clientSecret = config.CLIENT_SECRET
const redirectUri = config.REDIRECT_URI
const databasePath = './database.json'

/***************************************************************
                      Auth Functions
***************************************************************/

function initializeOAuthClient () {
  return new OAuthClient({
    clientId,
    clientSecret,
    environment: 'sandbox',
    redirectUri
  })
}

export function getAuthUri (req) {
  const oauthClient = initializeOAuthClient()
  const authUri = oauthClient.authorizeUri({ scope: [OAuthClient.scopes.Accounting], state: 'intuit-test' })

  return Promise.resolve(authUri)
}

function getBaseURL (oauthClient) {
  return oauthClient.environment === 'sandbox' ? OAuthClient.environment.sandbox : OAuthClient.environment.production
}

function getCompanyId (oauthClient) {
  return oauthClient.getToken().realmId
}

export function handleCallback (req) {
  const oauthClient = initializeOAuthClient()

  return oauthClient.createToken(req.url)
    .then(function (authResponse) {
      const token = authResponse.getToken()
      const userId = uuidv4()

      saveUser(userId, token)
      return userId
    })
    .catch(function (e) {
      console.error(e)
      return new AccessError('Could not create token.')
    })
}

function saveUser (userId, token) {
  const database = readDatabase(databasePath)
  database.users[userId] = token
  writeDatabase(databasePath, database)
}

async function getOAuthClient (userId) {
  if (userId) {
    try {
      const userToken = await getUserToken(userId)
      if (userToken) {
        const oauthClient = initializeOAuthClient()
        oauthClient.setToken(userToken)
        return oauthClient
      }
    } catch (error) {
      console.error('Error getting OAuth client:', error)
    }
  }
  return null
}

export function getUserToken (userId) {
  return new Promise((resolve, reject) => {
    if (!userId) {
      return reject(new InputError('User Id is not valid'))
    }

    const database = readDatabase(databasePath)
    const userToken = database.users[userId]
    if (!userToken) {
      return reject(new InputError('User not found'))
    }

    if (!userToken.access_token || !userToken.refresh_token) {
      return reject(new AccessError('Token not found for user'))
    }

    const oauthClient = initializeOAuthClient()
    oauthClient.setToken(userToken)

    if (oauthClient.isAccessTokenValid()) {
      return resolve(userToken)
    }

    if (!oauthClient.token.isRefreshTokenValid()) {
      deleteUserToken(userId)
      return reject(new AccessError('The Refresh token is invalid, please reauthenticate.'))
    }

    oauthClient.refreshUsingToken(userToken.refresh_token)
      .then(response => {
        const newToken = response.getToken()
        saveUser(userId, newToken)
        resolve(newToken)
      })
      .catch(error => {
        console.error(`Error refreshing token for user ${userId}: ${error}`)
        reject(new AccessError('Failed to refresh token'))
      })
  })
}

function deleteUserToken (userId) {
  const database = readDatabase(databasePath)
  delete database.users[userId]
  writeDatabase(databasePath, database)
}

/***************************************************************
                       Quote Functions
***************************************************************/

export async function getFilteredEstimates (searchField, searchTerm, userId) {
  try {
    const oauthClient = await getOAuthClient(userId)
    if (!oauthClient) {
      throw new Error('OAuth client could not be initialized')
    }

    const companyID = getCompanyId(oauthClient)
    const baseURL = getBaseURL(oauthClient)
    let isPrivateNote = false
    let query
    if (searchField === 'DocNumber') {
      query = `SELECT * FROM estimate WHERE DocNumber = '${searchTerm}'`
    } else if (searchField === 'PrivateNote') {
      query = 'SELECT * FROM estimate'
      isPrivateNote = true
    }

    const estimateResponse = await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${companyID}/query?query=${query}&minorversion=69`
    })

    const responseData = JSON.parse(estimateResponse.text())
    const filteredEstimates = filterEstimates(responseData, isPrivateNote, searchTerm, oauthClient)
    return filteredEstimates
  } catch (error) {
    throw new AccessError('Wrong input or quote with this Id does not exist')
  }
}

function filterEstimates (responseData, isPrivateNote, searchTerm, oauthClient) {
  function hasPrivateNoteMatching (estimate, searchTerm) {
    return estimate.PrivateNote && estimate.PrivateNote.toLowerCase().includes(searchTerm.toLowerCase())
  }

  const filteredEstimatesPromises = responseData.QueryResponse.Estimate.filter(function (estimate) {
    if (isPrivateNote) {
      return hasPrivateNoteMatching(estimate, searchTerm)
    } else {
      return true
    }
  }).map(function (estimate) {
    return new Promise((resolve) => {
      Promise.all(estimate.Line.map(function (line) {
        if (line.DetailType === 'SubTotalLineDetail') {
          return Promise.resolve(null)
        }

        const Description = line.Description
        const itemRef = line.SalesItemLineDetail && line.SalesItemLineDetail.ItemRef
        const itemValue = itemRef.value

        return getSKUFromId(itemValue, oauthClient).then(itemSKU => {
          return {
            [Description]: {
              SKU: itemSKU,
              Qty: line.SalesItemLineDetail && line.SalesItemLineDetail.Qty
            }
          }
        })
      })).then(productObjects => {
        // Merge all product objects into a single object
        const productInfo = productObjects.reduce((acc, productObj) => {
          return { ...acc, ...productObj }
        }, {})
        const customerRef = estimate.CustomerRef
        resolve({
          // Id: estimate.Id, dont think i need this
          quoteNumber: estimate.DocNumber,
          customer: customerRef.name,
          productInfo,
          totalAmount: '$' + estimate.TotalAmt
        })
      })
    })
  })

  return Promise.all(filteredEstimatesPromises)
}

function getSKUFromId (itemValue, oauthClient) {
  const query = `SELECT * from Item WHERE Id = '${itemValue}'`
  const companyID = getCompanyId(oauthClient)
  const baseURL = getBaseURL(oauthClient)

  return new Promise((resolve, reject) => {
    oauthClient.makeApiCall({ url: `${baseURL}v3/company/${companyID}/query?query=${query}&minorversion=69` })
      .then(function (response) {
        const responseData = JSON.parse(response.text())
        if (responseData.QueryResponse && responseData.QueryResponse.Item && responseData.QueryResponse.Item.length > 0) {
          resolve(responseData.QueryResponse.Item[0].Sku)
        } else {
          resolve(null)
        }
      })
      .catch(e => {
        console.error(e)
        reject(e)
      })
  })
}

export function processFile (filePath) {
  return new Promise((resolve, reject) => {
    try {
      const excelData = excelToJson({
        sourceFile: filePath,
        header: { rows: 1 },
        columnToKey: { '*': '{{columnHeader}}' }
      })

      const database = readDatabase(databasePath)
      // clears db in order to ensure the list is correct (theres probably a better way to avoid duplicates and find removed items)
      // but since my db isnt too big it is okay
      database.products = {} // Initialize as an empty object

      for (const key in excelData) {
        if (Object.prototype.hasOwnProperty.call(excelData, key)) {
          const products = excelData[key]
          products.forEach(product => {
            const productInfo = {
              name: product.Name
            }
            database.products[product.Barcode] = productInfo
          })
        }
      }

      writeDatabase(databasePath, database)

      fs.remove(filePath, err => {
        if (err) {
          reject(err)
        } else {
          resolve('Products uploaded successfully')
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}

export function estimateToDB (estimate) {
  return new Promise((resolve, reject) => {
    try {
      const quote = estimate.quote
      const estimateInfo = {
        customer: quote.customer,
        productInfo: quote.productInfo,
        totalAmount: quote.totalAmount
      }
      const database = readDatabase(databasePath)
      if (!database.quotes[quote.quoteNumber]) {
        database.quotes[quote.quoteNumber] = estimateInfo
        writeDatabase(databasePath, database)
        resolve()
      } else {
        reject(new AccessError('Quote already exists'))
      }
    } catch (error) {
      reject(error)
    }
  })
}

// checks if estimate exists in database if it is return it or else return null
export function estimateExists (docNumber) {
  const database = readDatabase(databasePath)
  if (database.quotes[docNumber]) {
    return database.quotes[docNumber]
  }
  return null
}

export function processBarcode (barcode, quoteId, newQty) {
  return new Promise((resolve, reject) => {
    getProductName(barcode)
      .then(productName => {
        const database = readDatabase(databasePath)
        const estimate = database.quotes[quoteId]

        if (estimate && estimate.productInfo[productName]) {
          let qty = estimate.productInfo[productName].Qty
          if (qty === 0 || (qty - newQty) < 0) {
            return resolve({ productName, updatedQty: 0 })
          }
          qty = qty - newQty
          estimate.productInfo[productName].Qty = qty
          writeDatabase(databasePath, database)
          resolve({ productName, updatedQty: qty })
        } else {
          reject(new InputError('Quote number is invalid or scanned product does not exist on quote'))
        }
      })
      .catch(error => {
        reject(error)
      })
  })
}

export function getProductName (barcode) {
  return new Promise((resolve, reject) => {
    try {
      const database = readDatabase(databasePath)
      const productName = database.products[barcode].name
      if (productName === null) {
        reject(new InputError('This product does not exist within the database'))
      } else {
        resolve(productName)
      }
    } catch (error) {
      reject(new InputError(error))
    }
  })
}

function readDatabase (databasePath) {
  try {
    const data = fs.readFileSync(databasePath, 'utf8')
    return JSON.parse(data)
  } catch {
    throw new AccessError('Cannot access database')
  }
}

function writeDatabase (databasePath, data) {
  try {
    fs.writeFileSync(databasePath, JSON.stringify(data, null, 2))
  } catch {
    throw new AccessError('Cannot write to database')
  }
}
