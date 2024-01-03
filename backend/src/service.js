import OAuthClient from 'intuit-oauth'
import config from '../config.json'

const clientId = config.CLIENT_ID
const clientSecret = config.CLIENT_SECRET
const redirectUri = config.REDIRECT_URI
let oauthClient = initializeOAuthClient()
let oauthToken = null
let filteredEstimates = null

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
      console.log(oauthToken)
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

export function getFilteredEstimates (req) {
  // Retrieve the Estimate Number or PrivateNote entered by the user from query parameters
  const searchField = req.query.searchField // 'DocNumber' or 'PrivateNote'
  const searchTerm = req.query.estimateNumber // The search term entered by the user

  const companyID = oauthClient.getToken().realmId
  const url = oauthClient.environment === 'sandbox' ? OAuthClient.environment.sandbox : OAuthClient.environment.production
  let isPrivateNote = false
  let query
  // Define the base query
  if (searchField === 'DocNumber') {
    query = "SELECT * FROM estimate WHERE DocNumber = '" + searchTerm + "'"
  } else if (searchField === 'PrivateNote') {
    query = 'SELECT * FROM estimate'
    isPrivateNote = true
  }
  // Make an API call to retrieve estimates based on the modified query
  oauthClient.makeApiCall({ url: url + 'v3/company/' + companyID + '/query?query=' + query })
    .then(function (estimateResponse) {
      const responseData = JSON.parse(estimateResponse.text())
      filteredEstimates = filterEstimates(responseData, isPrivateNote, searchTerm)
      return filteredEstimates
    })
    .catch(function (e) {
      console.error(e)
      return e
    })
}

function filterEstimates (responseData, isPrivateNote, searchTerm) {
  // Function to check if a given estimate's PrivateNote contains the searchTerm
  function hasPrivateNoteMatching (estimate, searchTerm) {
    // Check if PrivateNote contains the searchTerm (case insensitive)
    return estimate.PrivateNote && estimate.PrivateNote.toLowerCase().includes(searchTerm.toLowerCase())
  }

  // Extract the desired fields from each estimate
  const filteredEstimates = responseData.QueryResponse.Estimate.filter(function (estimate) {
    // If isPrivateNote is true, filter estimates based on PrivateNote
    if (isPrivateNote) {
      return hasPrivateNoteMatching(estimate, searchTerm)
    } else {
      // Otherwise, assume filtering by DocNumber
      return true
    }
  }).map(function (estimate) {
    let filteredLines = estimate.Line.map(function (line) {
      if (line.DetailType === 'SubTotalLineDetail') {
        return null // Skip this line
      }

      const Description = line.Description
      // var itemRef = line.SalesItemLineDetail && line.SalesItemLineDetail.ItemRef;
      // var itemName = itemRef.name;
      // var itemValue = itemRef.value;

      // var itemSKU = getSKUFromId(itemValue);
      const lineDetail = line.SalesItemLineDetail
      const qty = lineDetail && lineDetail.Qty

      return {
        // SKU: itemSKU,
        Name: Description,
        Qty: qty
      }
    })
    // Remove null elements (subtotal line items) from the filtered lines
    filteredLines = filteredLines.filter(function (line) {
      return line !== null
    })

    const customerRef = estimate.CustomerRef

    return {
      Id: estimate.Id,
      QuoteNumber: estimate.DocNumber,
      Customer: customerRef.name,
      TotalAmount: '$' + estimate.TotalAmt,
      ProductInfo: filteredLines
    }
  })
  return filteredEstimates
}
