import OAuthClient from 'intuit-oauth'
import config from '../config.json'
import excelToJson from 'convert-excel-to-json'
import fs from 'fs-extra'
import { InputError, AccessError } from './error'

const clientId = config.CLIENT_ID
const clientSecret = config.CLIENT_SECRET
const redirectUri = config.REDIRECT_URI
let oauthClient = initializeOAuthClient()
let oauthToken = null
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

function getBaseURL () {
  return oauthClient.environment === 'sandbox' ? OAuthClient.environment.sandbox : OAuthClient.environment.production
}

function getCompanyId () {
  return oauthClient.getToken().realmId
}

export function getAuthUri () {
  if (!oauthClient) {
    oauthClient = initializeOAuthClient()
  }
  return Promise.resolve(oauthClient.authorizeUri({ scope: [OAuthClient.scopes.Accounting], state: 'intuit-test' }))
}

export function handleCallback (req) {
  if (!oauthClient) {
    return new AccessError('OAuth client is not initialized.')
  }

  return oauthClient.createToken(req.url)
    .then(function (authResponse) {
      oauthToken = JSON.stringify(authResponse.getJson(), null, 2)
      return oauthToken
    })
    .catch(function (e) {
      console.error(e)
      return e
    })
}

/***************************************************************
                       Quote Functions
***************************************************************/

export function getFilteredEstimates (searchField, searchTerm) {
  return new Promise((resolve, reject) => {
    const companyID = getCompanyId()
    const baseURL = getBaseURL()
    let isPrivateNote = false
    let query
    if (searchField === 'DocNumber') {
      query = `SELECT * FROM estimate WHERE DocNumber = '${searchTerm}'`
    } else if (searchField === 'PrivateNote') {
      query = 'SELECT * FROM estimate'
      isPrivateNote = true
    }
    oauthClient.makeApiCall({ url: `${baseURL}v3/company/${companyID}/query?query=${query}&minorversion=69` })
      .then(function (estimateResponse) {
        const responseData = JSON.parse(estimateResponse.text())
        const filteredEstimates = filterEstimates(responseData, isPrivateNote, searchTerm)
        resolve(filteredEstimates)
      })
      .catch(e => {
        reject(new AccessError('Wrong input or quote with this Id does not exist'))
      })
  })
}

function filterEstimates (responseData, isPrivateNote, searchTerm) {
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

        return getSKUFromId(itemValue).then(itemSKU => {
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

function getSKUFromId (itemValue) {
  const query = `SELECT * from Item WHERE Id = '${itemValue}'`
  const companyID = getCompanyId()
  const baseURL = getBaseURL()

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
    customer: estimate.name,
    productInfo: estimate.productInfo,
    totalAmount: estimate.totalAmount
    // status: true
  }
  const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'))
  if (!database.quotes[estimate.quoteNumber]) {
    database.quotes[estimate.quoteNumber] = estimateInfo
    writeDatabase(databasePath, database)
  }
}
// checks if estimate exists in database if it is return it or else return null
export function estimateExists (docNumber) {
  const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'))
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
