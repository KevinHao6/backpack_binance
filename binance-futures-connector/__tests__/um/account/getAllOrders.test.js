const MissingParameterError = require('../../../src/error/missingParameterError')
const { nockMock, UMFuturesClient } = require('../../testUtils/testSetup')
const { mockResponse } = require('../../testUtils/mockData')

describe('#getAllOrders', () => {
  describe('throw MissingParameterError', () => {
    it('missing symbol', () => {
      expect(() => {
        UMFuturesClient.getAllOrders()
      }).toThrow(MissingParameterError)
    })
  })

  it('should return orders', () => {
    const symbol = 'BTCUSDT'
    nockMock(UMFuturesClient.baseURL)(`/fapi/v1/allOrders?symbol=${symbol}`)(
      mockResponse
    )

    return UMFuturesClient.getAllOrders(symbol).then((response) => {
      expect(response).toBeDefined()
      expect(response.data).toEqual(mockResponse)
    })
  })
})
