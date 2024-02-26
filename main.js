"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//const backpack_client_1 = require("./backpack_client");
const config = require('./config/runner.json');
const HttpsProxyAgent = require('https-proxy-agent');
const SocksProxyAgent = require('socks5-https-client/lib/Agent');
const axios = require('axios');
const backpack_client_1 = require("./backpack_client");
const { sell_bn } = require('./binance_connector.js');
const { buy_bn } = require('./binance_connector.js');


function delay(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function findBestPrices(orderbook) {
    let lowestAskPrice = Infinity;
    let highestBidPrice = 0;

    // 遍历asks数组找到最低卖价
    for (let ask of orderbook.asks) {
        if (ask[0] < lowestAskPrice) {
            lowestAskPrice = ask[0];
        }
    }

    // 遍历bids数组找到最高买价
    for (let bid of orderbook.bids) {
        if (bid[0] > highestBidPrice) {
            highestBidPrice = bid[0];
        }
    }

    return {
        lowestAskPrice: lowestAskPrice,
        highestBidPrice: highestBidPrice
    };
}

const getorderbook = async (client) => {
    let orderbook = await client.Depth({ symbol: "SOL_USDC" });
    // console.log(orderbook);

    // 这里调用findBestPrices函数来获取最佳价格
    const bestPrices = findBestPrices(orderbook);

    // console.log(`最低卖单价格: ${bestPrices.lowestAskPrice}, 最高买单价格: ${bestPrices.highestBidPrice}`);

    // 返回最佳价格
    return bestPrices;
};

// 以前的findBestPrices函数代码应该在这里定义


async function init(client) {
    let userbalance = await client.Balance();
    if (userbalance.USDC.available > 5) {
        await buy_bp(client);

        console.log("等待10s");        
        await delay(10000);
        await sell_bp(client);
    }

}

//当前年份日期时分秒
function getNowFormatDate() {
    var date = new Date();
    var seperator1 = "-";
    var seperator2 = ":";
    var month = date.getMonth() + 1;
    var strDate = date.getDate();
    var strHour = date.getHours();
    var strMinute = date.getMinutes();
    var strSecond = date.getSeconds();
    if (month >= 1 && month <= 9) {
        month = "0" + month;
    }
    if (strDate >= 0 && strDate <= 9) {
        strDate = "0" + strDate;
    }
    if (strHour >= 0 && strHour <= 9) {
        strHour = "0" + strHour;
    }
    if (strMinute >= 0 && strMinute <= 9) {
        strMinute = "0" + strMinute;
    }
    if (strSecond >= 0 && strSecond <= 9) {
        strSecond = "0" + strSecond;
    }
    var currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate
        + " " + strHour + seperator2 + strMinute
        + seperator2 + strSecond;
    return currentdate;
}


const buy_bp = async (client) => {
    //取消所有未完成订单
    let GetOpenOrders = await client.GetOpenOrders({ symbol: "SOL_USDC" });
    if (GetOpenOrders.length > 0) {
        let CancelOpenOrders = await client.CancelOpenOrders({ symbol: "SOL_USDC" });
        console.log(getNowFormatDate(), "取消所有挂单,开始执行Maker单");
    } else {
        console.log(getNowFormatDate(), "无挂单,开始执行Maker单");
    }

    //获取账户信息
    let userbalance = await client.Balance();
    console.log(getNowFormatDate(), "账户信息:", userbalance);
 

    let order_status = "new";
    while (order_status != "Filled"){
        let bestPrices = await getorderbook(client);
        let buyprice = bestPrices.highestBidPrice;
        let amount = (userbalance.USDC.available - 2).toFixed(2)
        let quant = ((userbalance.USDC.available - 2) / buyprice).toFixed(2)
        console.log(getNowFormatDate(), `Maker Only买入挂单: 金额：${amount.toString()}USDC, 价格： ${buyprice}, sol数量: ${quant}`);
        let quantitys = quant.toString();
        let orderResultBid = await client.ExecuteOrder({
            orderType: "Limit",
            "postOnly": true,
            price: buyprice.toString(),
            quantity: quantitys,
            side: "Bid", //买
            symbol: "SOL_USDC",
            timeInForce: "GTC"
        })

        console.log(getNowFormatDate(), "订单id", orderResultBid.id, ",订单状态:", orderResultBid.status, ",3s内未成交则重新挂单");
        
        for (let i = 0; i < 10; i++) {
            await delay(300); // 每0.3秒检查一次
    
            // 重新获取订单历史以检查订单状态
            let orderHistory = await client.OrderHistory({ limit: 1 });
            let currentOrder = orderHistory.find(o => o.id === orderResultBid.id);
    
            // 检查是否找到订单并打印状态
            if (currentOrder) {
                if (currentOrder.status === "Filled") {
                    console.log(getNowFormatDate(), "买入成功");
                    // ... 成功处理 ...
                    order_status = "Filled";
                    break;
                }
            }
        }
        if (order_status == "new"){
            try {
                await client.CancelOpenOrders({ symbol: "SOL_USDC" });
                console.log(getNowFormatDate(), "未成交，取消订单并重新挂单");
            } catch (error) {
                console.error(getNowFormatDate(), "取消订单失败:", error.message);
            }
        }else if(order_status == "Filled"){
            await sell_bn("SOLUSDC", quant)
        }
    
    }

}


const sell_bp = async (client) => {
    // 取消所有未完成的卖单
    let GetOpenOrders = await client.GetOpenOrders({ symbol: "SOL_USDC" });
    if (GetOpenOrders.length > 0) {
        await client.CancelOpenOrders({ symbol: "SOL_USDC" });
        console.log(getNowFormatDate(), "取消所有挂单,开始执行Maker单");
    } else {
        console.log(getNowFormatDate(), "无挂单,开始执行Maker单");
    }

    // 获取账户信息
    let userbalance = await client.Balance();
    console.log(getNowFormatDate(), "账户信息:", userbalance);

    let order_status = "new";
    while (order_status != "Filled") {
        let bestPrices = await getorderbook(client);
        let sellprice = bestPrices.lowestAskPrice;
        let quant = (userbalance.SOL.available-0.01).toFixed(2);
        let quantitys = quant.toString();
        console.log(getNowFormatDate(), `Maker Only卖出挂单: 数量：${quantitys} SOL, 价格： ${sellprice}, sol数量: ${quant}`);

        let orderResultAsk = await client.ExecuteOrder({
            orderType: "Limit",
            "postOnly": true,
            price: sellprice.toString(),
            quantity: quantitys,
            side: "Ask", // 卖
            symbol: "SOL_USDC",
            timeInForce: "GTC"
        })

        console.log(getNowFormatDate(), "订单id", orderResultAsk.id, ",订单状态:", orderResultAsk.status, ",3s内未成交则重新挂单");

        for (let i = 0; i < 10; i++) {
            await delay(300); // 每0.3秒检查一次

            // 重新获取订单历史以检查订单状态
            let orderHistory = await client.OrderHistory({ limit: 1 });
            let currentOrder = orderHistory.find(o => o.id === orderResultAsk.id);

            // 检查是否找到订单并打印状态
            if (currentOrder) {
                if (currentOrder.status === "Filled") {
                    console.log(getNowFormatDate(), "卖出成功");
                    // ... 成功处理 ...
                    order_status = "Filled";
                    break;
                }
            }
        }
        if (order_status == "new") {
            try {
                await client.CancelOpenOrders({ symbol: "SOL_USDC" });
                console.log(getNowFormatDate(), "未成交，取消订单并重新挂单");
            } catch (error) {
                console.error(getNowFormatDate(), "取消订单失败:", error.message);
            }
        }else if(order_status == "Filled"){
            await buy_bn("SOLUSDC", quant)
        }
    }
}



(async () => {

    let backpackagent;
    const backpackApiKey = config.backpack.apiKey;
    const backpackApiSecret = config.backpack.apiSecret;
    const backpackProxy = config.backpack.proxy;
    if (backpackProxy.startsWith('socks5://')) {
        backpackagent = new SocksProxyAgent(backpackProxy);
    } else if (backpackProxy.startsWith('http://') || backpackProxy.startsWith('https://')) {
        backpackagent = new HttpsProxyAgent(backpackProxy);
    } else {
        console.error('Invalid proxy format');
    }

    const client = new backpack_client_1.BackpackClient(backpackApiSecret, backpackApiKey, { httpsAgent: backpackagent });

    init(client);
})();