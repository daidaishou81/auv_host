/**
 * 船体状态数据包解析器 - 用于解析自定义二进制协议数据
 * 协议格式: AA BB 01 [长度高字节] [长度低字节] A0 B0 00 00 [40字节参数] [校验和] EE FF
 */
const dgram = require('dgram');

/**
 * 解析船体状态数据包
 * @param {Buffer} buffer - 二进制数据包
 * @returns {Object|null} 解析后的数据对象，解析失败返回null
 */
function parseHullStatusPacket(buffer) {
    try {
        // 基本长度检查
        if (buffer.length < 52) { // 9字节头 + 40字节参数 + 3字节尾 = 52字节
            console.error('数据包长度不足');
            return null;
        }

        // 检查帧头
        if (buffer[0] !== 0xAA || buffer[1] !== 0xBB) {
            console.error('无效的帧头');
            return null;
        }

        // 检查帧尾
        if (buffer[buffer.length - 2] !== 0xEE || buffer[buffer.length - 1] !== 0xFF) {
            console.error('无效的帧尾');
            return null;
        }

        // 验证校验和
        const checksum = buffer[buffer.length - 3];
        let calculatedChecksum = 0;
        for (let i = 0; i < buffer.length - 3; i++) {
            calculatedChecksum ^= buffer[i];
        }

        if (calculatedChecksum !== checksum) {
            console.error('校验和验证失败', { checksum, calculatedChecksum });
            return null;
        }

        // 解析数据长度
        const dataLength = (buffer[3] << 8) | buffer[4];
        if (buffer.length !== dataLength) {
            console.error('数据长度不匹配', { expected: dataLength, actual: buffer.length });
            return null;
        }

        // 解析参数部分（从第9字节开始，共40字节）
        const paramsOffset = 9;
        
        // 使用DataView进行字节序安全的读取
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        
        const result = {
            // 1. 经度 (float, 4字节)
            longitude: view.getFloat32(paramsOffset, false), // 大端字节序
            
            // 2. 纬度 (float, 4字节)
            latitude: view.getFloat32(paramsOffset + 4, false),
            
            // 3. 深度 (int16, 0.1米精度)
            depth: view.getInt16(paramsOffset + 8, false) / 10.0,
            
            // 4. 温度 (int16, 0.1度精度)
            temperature: view.getInt16(paramsOffset + 10, false) / 10.0,
            
            // 5. 速度 (int16, 0.1节精度)
            speedKnots: view.getInt16(paramsOffset + 12, false) / 10.0,
            
            // 6. 航向 (int16, 0.1度精度)
            course: view.getInt16(paramsOffset + 14, false) / 10.0,
            
            // 7. 偏航角 (int16, 0.1度精度)
            yaw: view.getInt16(paramsOffset + 16, false) / 10.0,
            
            // 8. 俯仰角 (int16, 0.1度精度)
            pitch: view.getInt16(paramsOffset + 18, false) / 10.0,
            
            // 9. 横滚角 (int16, 0.1度精度)
            roll: view.getInt16(paramsOffset + 20, false) / 10.0,
            
            // 10. 左水平舵角 (int16, 0.1度精度)
            rudderHorizontalLeft: view.getInt16(paramsOffset + 22, false) / 10.0,
            
            // 11. 右水平舵角 (int16, 0.1度精度)
            rudderHorizontalRight: view.getInt16(paramsOffset + 24, false) / 10.0,
            
            // 12. 垂直舵角 (int16, 0.1度精度)
            rudderVertical: view.getInt16(paramsOffset + 26, false) / 10.0,
            
            // 13. 船风角 (int16, 0.1度精度)
            boatWindAngle: view.getInt16(paramsOffset + 28, false) / 10.0,
            
            // 14. 帆编码器角度 (int16, 0.1度精度)
            sailEncoderAngle: view.getInt16(paramsOffset + 30, false) / 10.0,
            
            // 15. 绝对风向 (int16, 0.1度精度)
            absoluteWindDirection: view.getInt16(paramsOffset + 32, false) / 10.0,
            
            // 16. 风速 (int16, 0.1m/s精度)
            windSpeed: view.getInt16(paramsOffset + 34, false) / 10.0,
            
            // 17. 预留字段 (4字节)
            reserved: buffer.slice(paramsOffset + 36, paramsOffset + 40),
            
            // 原始数据
            raw: buffer,
            
            // 解析时间戳
            parsedAt: new Date().toISOString()
        };

        // 计算速度 (米/秒)
        result.speedMps = result.speedKnots * 0.514444;
        
        // 生成位置字符串
        result.positionString = `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`;
        
        // 生成状态摘要
        result.statusSummary = {
            position: result.positionString,
            depth: `${result.depth.toFixed(1)} m`,
            speed: `${result.speedKnots.toFixed(1)} knots (${result.speedMps.toFixed(1)} m/s)`,
            heading: `${result.course.toFixed(1)}°`,
            attitude: `Yaw: ${result.yaw.toFixed(1)}°, Pitch: ${result.pitch.toFixed(1)}°, Roll: ${result.roll.toFixed(1)}°`,
            temperature: `${result.temperature.toFixed(1)}°C`,
            wind: `${result.windSpeed.toFixed(1)} m/s from ${result.absoluteWindDirection.toFixed(1)}°`
        };

        return result;
    } catch (error) {
        console.error('船体状态数据解析失败:', error.message);
        return null;
    }
}

/**
 * 创建UDP服务器监听船体状态数据
 * @param {number} port - 监听端口
 * @param {Function} onDataCallback - 数据回调函数
 * @param {WebSocket.Server} wss - WebSocket服务器（可选）
 * @returns {dgram.Socket} UDP服务器实例
 */
function createHullStatusUdpServer(port,wss, onDataCallback) {
    const udpServer = dgram.createSocket('udp4');
    
    udpServer.on('message', (msg, rinfo) => {
        try {
            // 解析数据包
            const result = parseHullStatusPacket(msg);
            
            if (result) {
               // console.log('解析到的船体状态数据:', result.statusSummary);
                
            
                // 如果有回调函数，则调用
                if (onDataCallback) {
                    onDataCallback(result);
                }
                console.log("guangbo1");
                // 通过WebSocket发送到Web端
                if (wss) {
                    const hullStatusWithType = {
                        type: 'sailboat_Status',
                        sailboat_Status:{...result},
                      //  processedTimestamp: Date.now()
                    };
                    
                    // 广播给所有连接的Web客户端
                    wss.clients.forEach(client => {
                        if (client.readyState === require('ws').OPEN) {
                            client.send(JSON.stringify(hullStatusWithType));
                        }
                    });
                    console.log("guangbo");
                }
            }
        } catch (error) {
            console.error('处理UDP数据时出错:', error.message);
        }
    });
    
    udpServer.on('listening', () => {
        const address = udpServer.address();
        console.log(`船体状态UDP服务器监听端口 ${address.address}:${address.port}`);
        console.log(`等待接收船体状态数据...`);
    });
    
    udpServer.on('error', (err) => {
        console.error(`船体状态UDP服务器错误:\n${err.stack}`);
        udpServer.close();
    });
    
    // 绑定端口
    udpServer.bind({
    address:"192.168.1.4",
    port:port
    });
    
    return udpServer;
}

/**
 * 创建心跳包（用于测试或主动请求数据）
 * @returns {Buffer} 心跳包二进制数据
 */
function createHeartbeatPacket() {
    const packet = Buffer.alloc(12);
    
    // 帧头
    packet[0] = 0xAA;
    packet[1] = 0xBB;
    packet[2] = 0x01; // 版本
    packet[3] = 0x00; // 长度高字节
    packet[4] = 0x0C; // 长度低字节 (12)
    packet[5] = 0xB0;
    packet[6] = 0xA0;
    packet[7] = 0x00;
    packet[8] = 0x03;
    
    // 计算校验和
    let checksum = 0;
    for (let i = 0; i < 9; i++) {
        checksum ^= packet[i];
    }
    packet[9] = checksum;
    
    // 帧尾
    packet[10] = 0xEE;
    packet[11] = 0xFF;
    
    return packet;
}

/**
 * 测试函数 - 解析示例数据包
 */
function testParse() {
    // 创建示例数据包（模拟实际数据）
    const testPacket = Buffer.alloc(52);
    
    // 填充帧头
    testPacket[0] = 0xAA;
    testPacket[1] = 0xBB;
    testPacket[2] = 0x01;
    testPacket[3] = 0x00; // 长度高字节 (52)
    testPacket[4] = 0x34; // 长度低字节 (52)
    testPacket[5] = 0xA0;
    testPacket[6] = 0xB0;
    testPacket[7] = 0x00;
    testPacket[8] = 0x00;
    
    // 填充参数部分
    const view = new DataView(testPacket.buffer);
    
    // 设置示例数据
    view.setFloat32(9, 113.553908, false);   // 经度
    view.setFloat32(13, 22.308414, false);    // 纬度
    view.setInt16(17, 150, false);           // 深度 15.0米
    view.setInt16(19, 250, false);           // 温度 25.0度
    view.setInt16(21, 50, false);            // 速度 5.0节
    view.setInt16(23, 1800, false);          // 航向 180.0度
    view.setInt16(25, 50, false);            // 偏航角 5.0度
    view.setInt16(27, -20, false);           // 俯仰角 -2.0度
    view.setInt16(29, 100, false);           // 横滚角 10.0度
    view.setInt16(31, 200, false);           // 左水平舵角 20.0度
    view.setInt16(33, 200, false);           // 右水平舵角 20.0度
    view.setInt16(35, 0, false);             // 垂直舵角 0度
    view.setInt16(37, 450, false);           // 船风角 45.0度
    view.setInt16(39, 300, false);           // 帆编码器角度 30.0度
    view.setInt16(41, 900, false);           // 绝对风向 90.0度
    view.setInt16(43, 100, false);           // 风速 10.0 m/s
    
    // 计算校验和
    let checksum = 0;
    for (let i = 0; i < 49; i++) {
        checksum ^= testPacket[i];
    }
    testPacket[49] = checksum;
    
    // 帧尾
    testPacket[50] = 0xEE;
    testPacket[51] = 0xFF;
    
    // 解析测试
    const result = parseHullStatusPacket(testPacket);
    console.log('测试解析结果:', result);
    
    return result;
}

module.exports = {
    parseHullStatusPacket,
    createHullStatusUdpServer,
    createHeartbeatPacket,
    testParse
};