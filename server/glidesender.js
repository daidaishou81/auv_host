const dgram = require('dgram');

// 配置参数 - 根据实际设备调整
const CONFIG = {
    // UDP配置
    UDP_SERVER_IP: '192.168.0.101',  // UDP服务器IP地址
    UDP_SERVER_PORT: 8003,           // UDP服务器端口号
};

// 协议常量
const HEADER = 0xAABB;
const VERSION = 0x01;
const FOOTER = 0xEEFF;
const GLIDE_MSG_ID = 0xB0A00006; // 滑行任务下发消息ID

/**
 * 创建滑行任务数据包
 * @param {Object} glideData - 滑行任务数据对象
 * @param {number} glideData.maxDropTime - 最大抛载时间（秒）
 * @param {Array} glideData.points - 滑行任务点数组
 * @returns {Buffer} 打包后的二进制数据
 */
function createGlidePacket(glideData) {
    const maxDropTime = glideData.maxDropTime || 0;
    const points = glideData.points || [];
    const pointCount = points.length;
    
    // 计算消息长度：2字节（最大抛载时间） + 6字节 * N（每个任务点）
    const messageParamLength = 2 + 6 * pointCount;
    
    // 总缓冲区长度：帧头2 + 版本1 + 消息长度2 + 消息ID4 + 消息参数 + 校验1 + 帧尾2
    const totalLength = 2 + 1 + 2 + 4 + messageParamLength + 1 + 2;
    const messageBuffer = Buffer.alloc(totalLength);
    
    let pos = 0;
    
    // 帧头
    messageBuffer.writeUInt16BE(HEADER, pos);
    pos += 2;
    
    // 版本号
    messageBuffer.writeUInt8(VERSION, pos);
    pos += 1;
    
    // 消息长度 (消息ID4字节 + 消息参数长度)
    messageBuffer.writeUInt16BE(totalLength, pos);
    pos += 2;
    
    // 消息ID
    messageBuffer.writeUInt32BE(GLIDE_MSG_ID, pos);
    pos += 4;
    
    // 消息参数
    // 1. 最大抛载时间 (2字节)
    messageBuffer.writeUInt16BE(maxDropTime, pos);
    pos += 2;
    
    // 2. 任务点数据 (6字节 * N)
    points.forEach(point => {
        
        messageBuffer.writeInt16BE(point.depth*10, pos);
        pos += 2;
        
        // yaw: Short, lsb: 0.01弧度
        messageBuffer.writeInt16BE(point.heading*100, pos);
        pos += 2;
        
        // front_pos: Uchar (0-255)
    
        messageBuffer.writeUInt8(point.frontTank, pos);
        pos += 1;
        
        messageBuffer.writeUInt8(point.rearTank , pos);
        pos += 1;
    });
    
    // 计算校验和（从帧头到校验和前一字节）
    let checksum = 0;
    for (let i = 0; i < pos; i++) {
        checksum ^= messageBuffer[i];
    }
    messageBuffer.writeUInt8(checksum, pos);
    pos += 1;
    
    // 帧尾
    messageBuffer.writeUInt16BE(FOOTER, pos);
    
    return messageBuffer;
}

/**
 * 发送滑行任务指令
 * @param {Object} glideData - 滑行任务数据
 */
function sendGlideTask(glideData) {
    try {
        const packet = createGlidePacket(glideData);
        const udpClient = dgram.createSocket('udp4');
        
        udpClient.send(packet, CONFIG.UDP_SERVER_PORT, CONFIG.UDP_SERVER_IP, (err) => {
            if (err) {
                console.error('滑行任务UDP发送失败:', err.message);
            } else {
                console.log(`滑行任务发送成功 | 目标: ${CONFIG.UDP_SERVER_IP}:${CONFIG.UDP_SERVER_PORT}`);
                console.log(`发送了 ${glideData.points.length} 个滑行任务点`);
            }
            udpClient.close();
        });
        
        // 错误处理
        udpClient.on('error', (err) => {
            console.error('UDP客户端错误:', err.message);
            udpClient.close();
        });
        
    } catch (error) {
        console.error('创建或发送滑行任务包时出错:', error.message);
    }
}

module.exports = {
    sendGlideTask,
    createGlidePacket
};