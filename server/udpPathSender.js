//const MAX_TIME = 0; // -1表示开启任务

const dgram = require('dgram');
const coordinateConverter = require('./coordinateConverter');
const fs = require('fs');
const path = require('path');

// UDP 服务器配置
const UDP_HOST = '192.168.0.101';
const UDP_PORT = 8003;

// 协议常量
const HEADER = 0xAABB;
const VERSION = 0x01;
const FOOTER = 0xEEFF;
const MESSAGE_ID = 0xB0A0100; // 固定任务ID
const MAX_TIME = -1; // -1表示开启任务

/**
 * 将浮点数转换为协议要求的16位有符号整数格式
 * @param {number} value - 浮点数值
 * @param {number} scale - 缩放因子 (默认为10)
 * @returns {number} 转换后的16位整数
 */
function floatToInt16(value, scale = 10) {
    const scaled = Math.round(value * scale);
    return Math.max(Math.min(scaled, 32767), -32768);
}

/**
 * 创建任务数据包
 * @param {Array} points - 路径点数组
 * @param {number} totalPackets - 总包数
 * @param {number} currentPacket - 当前包序号
 * @returns {Buffer} 打包后的二进制数据
 */
function createTaskPacket(points, totalPackets, currentPacket) {
    const packetHeader = Buffer.alloc(2);
    packetHeader.writeUInt16BE(HEADER);
    
    const packetFooter = Buffer.alloc(2);
    packetFooter.writeUInt16BE(FOOTER);
    
    // 创建消息参数缓冲区
    const paramsBuffer = Buffer.alloc(4 + points.length * 12); // 4字节头 + 每个点12字节
    console.log(paramsBuffer.length);
    // 写入包信息
    paramsBuffer.writeUInt8(totalPackets, 0);      // 总包数
    paramsBuffer.writeUInt8(currentPacket, 1);     // 当前包序号
    console.log("time",points[0].time/5 + 32817);
    // 写入最大时间 (2字节有符号大端)
    let time =  points[0].time/5 + 32817;
    paramsBuffer.writeUInt16BE(time, 2);
    
    // 写入路径点数据
    let offset = 4;
    for (const point of points) { 
         const snedx = (point.x* 10) + 32817;
          const snedy = (point.y* 10) + 32817;
          const sneddepth = (point.depth* 10) + 32817;
          const snedphi = (point.phi* 10) + 32817;
          const sendspeed = (point.speed* 10) + 32817;
          const snedmode = (point.mode* 10) + 32817;
           console.log([snedx,snedy]);
        paramsBuffer.writeUInt16BE(toUShort(snedx), offset);      // x坐标
        paramsBuffer.writeUInt16BE(toUShort(snedy), offset + 2);  // y坐标
        paramsBuffer.writeUInt16BE(toUShort(sneddepth), offset + 4); // 深度
        paramsBuffer.writeUInt16BE(toUShort(snedphi), offset + 6);    // phi
        paramsBuffer.writeUInt16BE(toUShort(sendspeed), offset + 8);  // 速度
        paramsBuffer.writeUInt16BE(toUShort(snedmode), offset + 10);  // 模式
       
        offset += 12;
    }
    
    // 计算消息长度 (消息ID + 参数长度)
    const messageLength = 12+ paramsBuffer.length;
    console.log(paramsBuffer.length);
    console.log("changdu ",messageLength);
    // 创建完整消息缓冲区
    const messageBuffer = Buffer.alloc(
        2 + 1 + 2 + 4 + paramsBuffer.length + 1 + 2
    );
    
    let pos = 0;
    // 帧头
    packetHeader.copy(messageBuffer, pos);
    pos += 2;
    
    // 版本号
    messageBuffer.writeUInt8(VERSION, pos++);
    
    // 消息长度
    messageBuffer.writeUInt16BE(messageLength, pos);
    pos += 2;
    
    // 消息ID
    messageBuffer.writeUInt32BE(MESSAGE_ID, pos);
    pos += 4;
    
    // 消息参数
    paramsBuffer.copy(messageBuffer, pos);
    pos += paramsBuffer.length;
    
    // 计算校验和 (从帧头到校验和前一字节)
    let checksum = 0;
    for (let i = 0; i < pos; i++) {
        checksum ^= messageBuffer[i];
    }
    messageBuffer.writeUInt8(checksum, pos++);
    
    // 帧尾
    packetFooter.copy(messageBuffer, pos);
    
    return messageBuffer;
}

/**
 * 发送路径数据到UDP设备
 * @param {Array} pathPoints - 原始路径点数组
 */
function sendPathToDevice(pathPoints) {
    // 转换坐标
    const convertedPoints = coordinateConverter.convertPathPoints(pathPoints);
    
    // 检查点数量
    if (convertedPoints.length === 0) {
        console.error('错误: 没有有效的路径点数据');
        return;
    }
    
    // 计算所需包数 (每包最多100个点)
    const MAX_POINTS_PER_PACKET = 100;
    const totalPackets = Math.ceil(convertedPoints.length / MAX_POINTS_PER_PACKET);
    
    // 创建UDP客户端
    const client = dgram.createSocket('udp4');
    
    // 分包发送
    for (let i = 0; i < totalPackets; i++) {
        const startIdx = i * MAX_POINTS_PER_PACKET;
        const endIdx = Math.min(startIdx + MAX_POINTS_PER_PACKET, convertedPoints.length);
        const packetPoints = convertedPoints.slice(startIdx, endIdx);
        
        // 创建数据包
        const packet = createTaskPacket(packetPoints, totalPackets, i);
       storePacketData(packet, i, totalPackets, packetPoints);
        // 发送数据包
        client.send(packet, UDP_PORT, UDP_HOST, (err) => {
            if (err) {
                console.error(`UDP发送错误: ${err.message}`);
                client.close();
            } else {
                console.log(`发送包 ${i+1}/${totalPackets}, 包含 ${packetPoints.length} 个点`);
            }
        });
    }
    
    // 设置超时关闭连接
    setTimeout(() => {
        client.close();
        console.log('UDP连接已关闭');
    }, 1000);
}


 // 存储发送的数据包到txt文件
function storePacketData(packet, packetIndex, totalPackets, points) {
    // 创建存储目录（如果不存在）
    const logDir = path.join(__dirname, 'packet_logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    // 生成文件名（包含时间戳和包序号）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `packet_${timestamp}_${packetIndex+1}_of_${totalPackets}.txt`;
    const filepath = path.join(logDir, filename);
    
    // 创建文件内容
    let content = `UDP Packet Data Log\n`;
    content += `Timestamp: ${new Date().toLocaleString()}\n`;
    content += `Packet: ${packetIndex + 1} of ${totalPackets}\n`;
    content += `Points in packet: ${points.length}\n`;
    content += `Packet size: ${packet.length} bytes\n\n`;
    
    // 添加点数据信息
    content += `Points Data:\n`;
    points.forEach((point, index) => {
        content += `Point ${index + 1}: x=${point.x}, y=${point.y}, depth=${point.depth}, `;
        content += `phi=${point.phi}, speed=${point.speed}, mode=${point.mode}, time=${point.time}\n`;
    });
    
    content += `\nRaw Packet Data (Hex):\n`;
    
    // 将Buffer转换为十六进制字符串，每16字节一行
    const hexString = packet.toString('hex');
    for (let i = 0; i < hexString.length; i += 32) {
        content += hexString.slice(i, i + 32) + '\n';
    }
    
    content += `\nRaw Packet Data (Decimal):\n`;
    
    // 将Buffer转换为十进制数组，每16个字节一行
    for (let i = 0; i < packet.length; i += 16) {
        const line = Array.from(packet.slice(i, i + 16))
            .map(byte => byte.toString().padStart(3, '0'))
            .join(' ');
        content += line + '\n';
    }
    
    // 写入文件
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Packet data saved to: ${filepath}`);
    
    // 同时追加到汇总日志文件
    const summaryLogPath = path.join(logDir, 'packets_summary.log');
    const summaryEntry = `[${new Date().toLocaleString()}] Packet ${packetIndex + 1}/${totalPackets} | ` +
                         `Points: ${points.length} | Size: ${packet.length} bytes\n`;
    
    fs.appendFileSync(summaryLogPath, summaryEntry, 'utf8');
}
function toUShort(value) {
  if (value < 0 || value > 65535) {
    throw new RangeError('Value must be between 0 and 65535');
  }
  const buffer = new ArrayBuffer(2);
  const view = new Uint16Array(buffer);
  view[0] = value;
  return view[0];
}
module.exports = {
    sendPathToDevice
};