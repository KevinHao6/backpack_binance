## 使用教程

#### 1、下载软件依赖库
下载代码后，打开终端或者CMD窗口，
输入：
`cd 你的文件夹路径`
然后输入：
`npm install`

然后再去这个文件夹安装必要库
`cd binance-futures-connector`

`npm install @binance/futures-connector`

返回上一层到backpack_binance-main
`cd ..`


#### 2、Config设置
拿到api key和 api secret key后在 config文件夹下的runner.json输入
同时支持http和socks5的ip代理，直接输入就可以，
ip格式：`http://${username}:${password}@${ip}:${port}`或者`socks5://${username}:${password}@${ip}:{port}`;
币安需要白名单,记得添加ip到百名单

交易对默认是 SOL_USDC, SOLUSDC

BACKPACK 交易对可选择 SOL_USDC, PYTH_USDC, JTO_USDC, JUP_USDC

BINANCE  交易对可选择 SOLUSDC, PYTHUSDT, JTOUSDT, JUPUSDT
#### 3、改等待时间
main.js 里84行`await delay(10000);`, 决定了持仓时间，默认10秒只是为了测试，建议先自己测试一下,然后再调高点来防女巫，也可以吃空单的资金费率来拉低点成本
1小时为3600s=3600000ms

#### 4、运行程序
使用前请检查代码
运行前确保backpack有usdc，币安合约账户有usdc

运行代码
`node main.js`


后续会更新方案2，两个backpack分别持有sol和usdc, 一个交易所买入sol,另一个卖出sol，重复交易，同时
在币安开空持仓的sol的数量，但是有被女巫风险

方案3，直接单交易所刷，买完直接卖，最不推荐

有问题可以联系twitter:https://twitter.com/Kiki29184101
