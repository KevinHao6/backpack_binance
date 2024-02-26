const { UMFutures } = require('./binance-futures-connector/node_modules/@binance/futures-connector');
const config = require('./config/runner.json');

const binanceApiKey = config.binance.apiKey;
const binanceApiSecret = config.binance.apiSecret;
const binanceProxy = config.binance.proxy;

const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent }= require('https-proxy-agent');
let agent;

// http://lu5392194:Gl3fgO@156.242.110.157:7777
if (binanceProxy.startsWith('socks5://')) {
    agent = new SocksProxyAgent(binanceProxy);
} else if (binanceProxy.startsWith('http://') || binanceProxy.startsWith('https://')) {
    agent = new HttpsProxyAgent(binanceProxy);
} else {
    console.error('Invalid proxy format');
}

const umFuturesClient = new UMFutures(binanceApiKey, binanceApiSecret, {
  baseURL: 'https://fapi.binance.com',
  httpsAgent: agent
});


async function sell_bn(symbol, quant) {
    try {
        const response = await umFuturesClient.newOrder(symbol, 'SELL', 'MARKET', {
            quantity: quant,
            reduceOnly: false
        });
        console.log('Order Time: ' + new Date(response.data.updateTime).toLocaleString());
        console.log("币安持仓信息：");

        const positionResponse = await umFuturesClient.getPositionInformationV2();
        const solPosition = positionResponse.data.filter(pos => pos.symbol === 'SOLUSDC');
        if (solPosition.length > 0) {
            const position = solPosition[0];
            console.log(`交易对: ${position.symbol}, 持仓数量: ${position.positionAmt}, 入场价格: ${position.entryPrice}`);
        } else {
            console.log('No position found for SOLUSDC');
        }
    } catch (error) {
        console.error(error);
    }
}

async function buy_bn(symbol, quant) {
    try {
        const response = await umFuturesClient.newOrder(symbol, 'BUY', 'MARKET', {
            quantity: quant,
            reduceOnly: false
        });
        console.log('Order Time: ' + new Date(response.data.updateTime).toLocaleString());

        const positionResponse = await umFuturesClient.getPositionInformationV2();
        const position = positionResponse.data.filter(pos => pos.symbol === symbol);
        if (position.length > 0) {
            const positionDetails = position[0];
            console.log(`交易对: ${positionDetails.symbol}, 持仓数量: ${positionDetails.positionAmt}, 入场价格: ${positionDetails.entryPrice}`);
        } else {
            console.log(`No position found for ${symbol}`);
        }
    } catch (error) {
        console.error(error);
    }
}



module.exports = { buy_bn, sell_bn };