/**
 * AUV数据解析器 - 用于解析NMEA格式的AUV状态数据
 * 输入: NMEA格式字符串 (例如: "$BDTCI,...*31")
 * 输出: 解析后的JSON对象
 */
const dgram = require('dgram');
const { type } = require('os');

function parseAuvData(nmeaSentence) {
    try {
        // 提取十六进制数据部分
        const dataPart = nmeaSentence.split('$BDTCI,')[1].split('*')[0];
        const fields = dataPart.split(',');
        const hexStr = fields[fields.length - 1];
        
      
        
        // 将十六进制转换为字节数组
        const byteData = Buffer.from(hexStr, 'hex');
       
        // 解析各个数据项
        return {
            
            // 位置数据 (16位整数)
            Beidou_pos_x: (byteData[0] << 8) | byteData[1],
            Beidou_pos_y: (byteData[2] << 8) | byteData[3],
            
            // 错误代码 (32位整数)
            Beidou_auv_e_code: (byteData[4] << 24) | (byteData[5] << 16) | (byteData[6] << 8) | byteData[7],
            
            // 当前状态 (8位整数)
            Beidou_current_state: byteData[8],
            
            // 深度和高度 (16位整数)
            Beidou_depth: (byteData[9] << 8) | byteData[10],
            Beidou_altitude: (byteData[11] << 8) | byteData[12],
            
            // 电池电量 (8位整数，百分比)
            Beidou_battery_soc: byteData[13],
            
            // GPS纬度 (float32)
            Beidou_gps_lat: parseFloat(parseFloat(Buffer.from(byteData.subarray(14, 18)).readFloatBE().toFixed(6))),
            
            // GPS经度 (float32)
            Beidou_gps_lon: parseFloat(parseFloat(Buffer.from(byteData.subarray(18, 22)).readFloatBE().toFixed(6)))
        };
    } catch (error) {
        console.error('数据解析失败:', error.message);
        return null;
    }
}

// 输入输出接口示例
function BeidouData(input) {

    const result = parseAuvData(input);
   
    return result 
}

// 创建UDP服务器监听23端口
function createUdpServer23(onDataCallback, wss)  {
    const udpServer = dgram.createSocket('udp4');
    
    udpServer.on('message', (msg, rinfo) => {
        try {
            
            // 将Buffer转换为字符串
            const dataStr = msg.toString('ascii').trim();
          

            // 检查是否为有效的NMEA格式
            if (dataStr.startsWith('$BDTCI') ) {
                // 解析数据
                const result = BeidouData(dataStr);
                 console.log(result);
                 // 如果有回调函数，则调用
            if (onDataCallback) {
                     onDataCallback(result);
                 }
                 // 新增：通过WebSocket发送到Web端
         if (wss) {
                    // 添加类型标识，方便前端识别
                    const beidouDataWithType = {
                        type: 'beidou',
                        ...result,
                        timestamp: Date.now()
                    };
                    
                    // 广播给所有连接的Web客户端
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify(beidouDataWithType));
                        }
                    });
            } 
        }   
        } catch (error) {
            console.error('处理UDP数据时出错:', error.message);
        }
    });
    
    udpServer.on('listening', () => {
        const address = udpServer.address();
        console.log(`UDP服务器监听23端口 ${address.address}:${address.port}`);
    });
    
    udpServer.on('error', (err) => {
        console.error(`UDP服务器错误:\n${err.stack}`);
        udpServer.close();
    });
    
    // 绑定23端口
 
    udpServer.bind({
    address:"192.168.0.241",
    port:23
    });
    return udpServer;
}

module.exports = {
    BeidouData,
    createUdpServer23
};