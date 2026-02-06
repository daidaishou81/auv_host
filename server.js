const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const auth = require('./server/auth');
const ProtocolParser = require('./server/protocolParser');
const SimpleQueue = require('./server/messageQueue');
const createUDPServer = require('./server/udpServer');
const setupWebSocket = require('./server/websocket');
const coordinateConverter = require('./server/coordinateConverter');
const Beidou = require('./server/bdDataParser.js');
const manual = require('./server/manualControl.js');
const voiceupd = require('./server/udpvoice.js')
const voicesend = require('./server/voicesend.js')
const beidouposition = require('./server/beidouPositioning.js');
const sailboatstuatus = require('./server/sailboat_Status.js');
const DRPR_receive = require('./server/DRPR_receive');
const app = express();
const server = http.createServer(app);
// 在创建WebSocket服务器之后立即设置处理
const wss = new WebSocket.Server({ 
    server,
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 立即设置WebSocket处理
setupWebSocket(wss);
// 初始化认证模块
auth.initializeDatabase((err) => {
    if (err) {
        console.error('数据库初始化失败:', err);
        process.exit(1);
    }
    
    console.log('数据库初始化完成');
    app.use('/auth', auth.router);
    // 设置WebSocket处理
    
});

// 创建消息队列（只处理UDP消息广播）发送给web端auv的状态参数
const messageQueue = new SimpleQueue((parsedData) => {
   // console.log("fasong ",parsedData);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(parsedData));
        }
    });
});



// 创建udp服务器
createUDPServer(messageQueue);


//在创建北斗UDP服务器时添加回调
voiceupd.createUdpServer(null, wss);
Beidou.createUdpServer23(null, wss);
beidouposition.createGNRMCUdpServer(null, wss);
DRPR_receive.createUdpServer7788(null,wss);
sailboatstuatus.createHullStatusUdpServer(8008, wss,(data) => {
    console.log('接收到船体状态数据:', data.statusSummary);
});

//console.log(Beidou.BeidouData(sentence));
// 提供静态文件服务
app.use(express.static('public'));

// 启动服务器
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
//voicesend.startTimedSending();
//const alphabetPayload = voicesend.createAlphabetPayload();
//voicesend.sendRemoteCommand(alphabetPayload);
//const sentence = "$BDTCI,4204986,4204990,2,142204,2,0,3A642B500000000000000A01F35B41EC036542EE74F5*40";

// server.listen(PORT, '192.168.0.201', () => {
//     console.log(`服务器运行在 http://192.168.0.201:${PORT}`);
// });
// const sentence = "$BDTCI,4204986,4204990,2,111143,2,0,FE24003100000000000006006E5141F0DF0242F3FBDC*31";
// const hexData = "A5 5A 01 29 7A BB 52 1B 6A A5 B4 7D 00 00 06 00 00 00 A9 4F F2 11 89 76 B6 48 16 00 64 00 E4 06 5C 48 14 00 64 00 78 1F 7E";
// //console.log(Beidou.BeidouData(sentence));
// // 转换为Buffer
// function hexToBuffer(hexStr) {
//   return Buffer.from(hexStr.replace(/\s+/g, '').toUpperCase(), 'hex');
// }
// const buffer = hexToBuffer(hexData);
// const frame = voiceupd.parseUdpData(buffer);
// if (frame.error) {
//   console.error('解析错误:', frame.error, frame.details);
//   // 可添加错误恢复逻辑
// } else {
//   console.log('解析结果:', frame);
//   messageQueue.enqueue(frame); // 添加到消息队列，发送到Web端
// }

//manual.manualControl();