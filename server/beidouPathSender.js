// beidouSimpleSender.js
const dgram = require('dgram');
const coordinateConverter = require('./coordinateConverter');
// 北斗UDP服务器配置
const BEIDOU_HOST = '192.168.0.102'; // 北斗模块IP
const BEIDOU_PORT = 8004; // 北斗模块端口

// 北斗协议常量
const BEIDOU_HEADER = '$CCTXA';
const BEIDOU_FOOTER = '*';

/**
 * 计算北斗消息的校验和
 * @param {string} message - 从$后到*前的消息内容
 * @returns {string} 两位十六进制校验和
 */
function calculateBeidouChecksum(message) {
    let checksum = 0;
    for (let i = 0; i < message.length; i++) {
        checksum ^= message.charCodeAt(i);
    }
    return checksum.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * 编码路径数据为北斗消息内容
 * @param {Array} points - 路径点数组，每个点包含longitude, latitude
 * @param {number} mode - 下发模式 (1:正常下发, 0:虚拟锚泊)
 * @returns {string} 编码后的十六进制内容
 */
function encodePathData(points, mode) {
    if (points.length === 0) return '';
    
    // 编码格式: 模式(1字节) + 点数(1字节) + 每个点(经度4字节Float32+纬度4字节Float32)
    const pointCount = Math.min(points.length, 10); // 最多10个点，避免超长
    
    const buffer = Buffer.alloc(2 + pointCount * 8);
    
    // 写入模式 (正常路径下发)
    buffer.writeUInt8(1, 0);
    
    // 写入点数
    buffer.writeUInt8(pointCount, 1);
    
    let offset = 2;
    for (let i = 0; i < pointCount; i++) {
        const point = points[i];
        
        // 编码经度 (4字节 Float32)
        buffer.writeFloatBE(point.x, offset);
        offset += 4;
        
        // 编码纬度 (4字节 Float32)
        buffer.writeFloatBE(point.y, offset);
        offset += 4;
    }
    
    return buffer.toString('hex').toUpperCase();
}

/**
 * 编码虚拟锚泊数据
 * @param {Object} anchorPoint - 锚泊点，包含longitude, latitude
 * @returns {string} 编码后的十六进制内容
 */
function encodeAnchorData(anchorPoint) {
    const buffer = Buffer.alloc(9); // 模式1字节 + 经纬度各4字节Float32
    
    // 虚拟锚泊模式标识
    buffer.writeUInt8(0, 0); // 模式0表示虚拟锚泊
    
    // 经度 (4字节 Float32)
    buffer.writeFloatBE(anchorPoint.x, 1);
    
    // 纬度 (4字节 Float32)
    buffer.writeFloatBE(anchorPoint.y, 5);
    
    console.log("虚拟锚泊数据缓冲区:", buffer);
    return buffer.toString('hex').toUpperCase();
}

/**
 * 发送北斗路径数据
 * @param {Array} points - 路径点数组，每个点包含longitude, latitude
 * @param {number} mode - 下发模式 (1:正常下发, 0:虚拟锚泊)
 * @param {string} receiverId - 接收方北斗ID
 */
function sendBeidouPath(points, mode, receiverId = '4204986') {
    if (!points || points.length === 0) {
        console.error('错误: 没有有效的路径点数据');
        return;
    }
    
    let messageContent = '';
    const convertedPoints = coordinateConverter.convertPathPoints(points);
    
    if (mode === 1) {
        // 正常下发模式
        console.log(`北斗正常下发模式，发送 ${points.length} 个路径点`);
        messageContent = encodePathData(convertedPoints, mode);
    } else if (mode === 0) {
        // 虚拟锚泊模式
        console.log('北斗虚拟锚泊模式，发送锚泊点');
        console.log("锚泊点数据:", points[0]);
        messageContent = encodeAnchorData(convertedPoints[0]);
        console.log("编码后的消息内容:", messageContent);
    } else {
        console.error('错误: 未知的下发模式', mode);
        return;
    }
    
    // 检查消息长度 (北斗编码最多78字节)
    const contentLength = messageContent.length / 2; // 字节数
    if (contentLength > 78) {
        console.warn('警告: 北斗消息长度超过限制，将被截断');
        // 重新编码，减少点数
        const reducedPoints = points.slice(0, Math.floor((78 - 2) / 8));
        messageContent = encodePathData(reducedPoints, mode);
    }
    
    // 构建北斗指令
    const commandContent = `${BEIDOU_HEADER},${receiverId},1,1,${messageContent}`;
    const checksum = calculateBeidouChecksum(commandContent.slice(1)); // 去掉$符号
    const fullCommand = `${commandContent}${BEIDOU_FOOTER}${checksum}`;
    
    console.log(`北斗指令: ${fullCommand}`);
    console.log(`数据长度: ${contentLength}字节, 模式: ${mode}`);
    
    // 通过UDP发送
    const client = dgram.createSocket('udp4');
    
    client.send(fullCommand, BEIDOU_PORT, BEIDOU_HOST, (err) => {
        if (err) {
            console.error('北斗UDP发送错误:', err.message);
        } else {
            console.log(`北斗指令发送成功 (模式: ${mode === 1 ? '正常下发' : '虚拟锚泊'})`);
        }
        client.close();
    });
    
    // 记录发送日志
    logBeidouSend(fullCommand, mode, points.length);
}

/**
 * 记录北斗发送日志
 * @param {string} command - 发送的指令
 * @param {number} mode - 下发模式
 * @param {number} pointCount - 点数
 */
function logBeidouSend(command, mode, pointCount) {
    const fs = require('fs');
    const path = require('path');
    
    const logDir = path.join(__dirname, 'beidou_logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `beidou_${timestamp}_mode${mode}.txt`;
    const filepath = path.join(logDir, filename);
    
    let content = `北斗指令发送日志\n`;
    content += `时间: ${new Date().toLocaleString()}\n`;
    content += `模式: ${mode === 1 ? '正常下发' : '虚拟锚泊'}\n`;
    content += `点数: ${pointCount}\n`;
    content += `指令: ${command}\n`;
    content += `数据解析:\n`;
    
    // 解析并显示发送的数据内容
    const hexData = command.match(/,[0-9A-F]+\*/)[0].slice(1, -1);
    const buffer = Buffer.from(hexData, 'hex');
    content += `模式字节: ${buffer.readUInt8(0)}\n`;
    
    if (mode === 1) {
        content += `点数字节: ${buffer.readUInt8(1)}\n`;
        let offset = 2;
        for (let i = 0; i < buffer.readUInt8(1); i++) {
            const lon = buffer.readFloatBE(offset);
            const lat = buffer.readFloatBE(offset + 4);
            content += `点${i + 1}: 经度=${lon}, 纬度=${lat}\n`;
            offset += 8;
        }
    } else {
        const lon = buffer.readFloatBE(1);
        const lat = buffer.readFloatBE(5);
        content += `锚点: 经度=${lon}, 纬度=${lat}\n`;
    }
    
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`北斗发送日志保存到: ${filepath}`);
}

module.exports = {
    sendBeidouPath,
    MODE: {
        NORMAL: 1,      // 正常下发
        ANCHOR: 0       // 虚拟锚泊
    }
};