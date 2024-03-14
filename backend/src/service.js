import OAuthClient from 'intuit-oauth'
import config from '../config.json'
import excelToJson from 'convert-excel-to-json'
import fs from 'fs-extra'
import { InputError, AccessError } from './error'
import { v4 as uuidv4 } from '.uuid'

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

function getBaseURL (oauthClient) {
  return oauthClient.environment === 'sandbox' ? OAuthClient.environment.sandbox : OAuthClient.environment.production
}

function getCompanyId (oauthClient) {
  return oauthClient.getToken().realmId
}

export function getAuthUri (req) {
  const oauthClient = initializeOAuthClient()
  const authUri = oauthClient.authorizeUri({ scope: [OAuthClient.scopes.Accounting], state: 'intuit-test' })

  req.session.oauthClient = oauthClient.getToken()
  return Promise.resolve(authUri)
}

export function handleCallback (req) {
  const oauthClient = initializeOAuthClient()

  return oauthClient.createToken(req.url)
    .then(function (authResponse) {
      const token = authResponse.getToken()
      const userId = uuidv4()

      req.session.userId = userId

      saveUser(userId, token)
      return token
    })
    .catch(function (e) {
      console.error(e)
      return new AccessError('Could not create token.')
    })
}

function saveUser (userId, token) {
  const userToken = {
    realmId: token.realmId,
    token_type: token.token_type,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    x_refresh_token_expires_in: token.x_refresh_token_expires_in
  }
  const database = readDatabase(databasePath)
  database.users[userId] = userToken
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
      reject(new InputError('User Id is not valid'))
    } else {
      const database = readDatabase(databasePath)
      const userToken = database.users[userId]

      if (!userToken) {
        reject(new InputError('User not found'))
      } else if (!userToken.access_token || !userToken.refresh_token) {
        reject(new AccessError('Token not found for user'))
      } else {
        resolve(userToken)
      }
    }
  })
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

export function estimateToDB (estimateString) {
  const estimate = JSON.parse(estimateString)

  const estimateInfo = {
    customer: estimate.customer,
    productInfo: estimate.productInfo,
    totalAmount: estimate.totalAmount
    // status: true
  }
  const database = readDatabase(databasePath)
  if (!database.quotes[estimate.quoteNumber]) {
    database.quotes[estimate.quoteNumber] = estimateInfo
    writeDatabase(databasePath, database)
  }
}
// checks if estimate exists in database if it is return it or else return null
export function estimateExists (docNumber) {
  const database = readDatabase(databasePath)
  if (database.quotes[docNumber]) {
    return database.quotes[docNumber]
  }
  return null
}

export function processBarcode (barcode, docNumber, newQty) {
  return new Promise((resolve, reject) => {
    try {
      const database = readDatabase(databasePath)
      const productName = database.products[barcode].name
      if (productName === null) reject(new InputError('This product does not exists within the database'))
      const estimate = database.quotes[docNumber]

      if (estimate && estimate.productInfo[productName]) {
        let qty = estimate.productInfo[productName].Qty
        if (qty === 0 || (qty - newQty) < 0) reject(new InputError('The new quantity is below 0'))
        qty = qty - newQty
        estimate.productInfo[productName].Qty = qty
        writeDatabase(databasePath, database)
        resolve('Successfully scanned product')
      } else {
        reject(new InputError('Quote number is invalid or scanned product does not exist on quote'))
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
