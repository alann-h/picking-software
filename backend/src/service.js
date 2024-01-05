import OAuthClient from 'intuit-oauth'
import config from '../config.json'
import excelToJson from 'convert-excel-to-json'
import fs from 'fs-extra'

const clientId = config.CLIENT_ID
const clientSecret = config.CLIENT_SECRET
const redirectUri = config.REDIRECT_URI
let oauthClient = initializeOAuthClient()
let oauthToken = null

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
    console.error('OAuth client is not initialized.')
    return
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
      .catch(function (e) {
        console.error(e)
        reject(e)
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
        return getSKUFromId(itemValue).then(itemSKU => ({
          SKU: itemSKU,
          Name: Description,
          Qty: line.SalesItemLineDetail && line.SalesItemLineDetail.Qty
        }))
      })).then(filteredLines => {
        filteredLines = filteredLines.filter(line => line !== null)
        const customerRef = estimate.CustomerRef

        resolve({
          Id: estimate.Id,
          QuoteNumber: estimate.DocNumber,
          Customer: customerRef.name,
          TotalAmount: '$' + estimate.TotalAmt,
          ProductInfo: filteredLines
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

export function processFile (filePath, databasePath) {
  return new Promise((resolve, reject) => {
    try {
      const excelData = excelToJson({
        sourceFile: filePath,
        header: { rows: 1 },
        columnToKey: { '*': '{{columnHeader}}' }
      })

      const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'))
      if (!database.products) {
        database.products = []
      }

      for (const key in excelData) {
        if (Object.prototype.hasOwnProperty.call(excelData, key)) {
          const products = excelData[key]
          products.forEach(product => {
            database.products.push(product)
          })
        }
      }

      fs.writeFileSync(databasePath, JSON.stringify(database, null, 2))
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
