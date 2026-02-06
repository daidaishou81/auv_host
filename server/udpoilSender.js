// buoyancyControlSender.js
const dgram = require('dgram');

// UDP 服务器配置（与第一个文件保持一致）
const UDP_HOST = '192.168.0.101';
const UDP_PORT = 8003;

// 协议常量
const HEADER = 0xAABB;
const VERSION = 0x01;
const FOOTER = 0xEEFF;
const MESSAGE_ID = 0xB0A00005; // 浮力调节消息ID

/**
 * 创建浮力调节数据包
 * @param {number} command - 控制命令：0x01启动浮力调节，0x00停止浮力调节
 * @param {number} frontPulse - 前油囊修正脉冲（有符号整数）
 * @param {number} rearPulse - 后油囊修正脉冲（有符号整数）
 * @returns {Buffer} 打包后的二进制数据
 */
function createBuoyancyControlPacket(command, frontPulse, rearPulse) {
    // 验证输入参数
    if (command !== 0x00 && command !== 0x01) {
        throw new Error('命令参数错误：必须为0x00(停止)或0x01(启动)');
    }
    
    if (!Number.isInteger(frontPulse) || !Number.isInteger(rearPulse)) {
        throw new Error('脉冲参数必须为整数');
    }

    // 创建消息参数缓冲区 (1字节命令 + 4字节前脉冲 + 4字节后脉冲 = 9字节)
    const paramsBuffer = Buffer.alloc(9);
    
    // 写入命令
    paramsBuffer.writeUInt8(command, 0);
    
    // 写入前油囊修正脉冲（有符号32位整数，大端）
    paramsBuffer.writeInt32BE(frontPulse, 1);
    
    // 写入后油囊修正脉冲（有符号32位整数，大端）
    paramsBuffer.writeInt32BE(rearPulse, 5);

    // 计算消息长度 (消息ID 4字节 + 参数 9字节 = 13字节)
    const messageLength = 13;

    // 创建完整消息缓冲区
    // 帧头(2) + 版本(1) + 消息长度(2) + 消息ID(4) + 参数(9) + 校验和(1) + 帧尾(2) = 21字节
    const messageBuffer = Buffer.alloc(21);
    
    let pos = 0;
    
    // 帧头 (2字节)
    messageBuffer.writeUInt16BE(HEADER, pos);
    pos += 2;
    
    // 版本号 (1字节)
    messageBuffer.writeUInt8(VERSION, pos);
    pos += 1;
    
    // 消息长度 (2字节，大端)
    messageBuffer.writeUInt16BE(messageLength, pos);
    pos += 2;
    
    // 消息ID (4字节，大端)
    messageBuffer.writeUInt32BE(MESSAGE_ID, pos);
    pos += 4;
    
    // 消息参数 (9字节)
    paramsBuffer.copy(messageBuffer, pos);
    pos += paramsBuffer.length;
    
    // 计算校验和 (从帧头到校验和前一字节)
    let checksum = 0;
    for (let i = 0; i < pos; i++) {
        checksum ^= messageBuffer[i];
    }
    messageBuffer.writeUInt8(checksum, pos);
    pos += 1;
    
    // 帧尾 (2字节，大端)
    messageBuffer.writeUInt16BE(FOOTER, pos);
    
    return messageBuffer;
}

/**
 * 发送浮力调节指令到UDP设备
 * @param {number} command - 控制命令：0x01启动浮力调节，0x00停止浮力调节
 * @param {number} frontPulse - 前油囊修正脉冲
 * @param {number} rearPulse - 后油囊修正脉冲
 * @param {function} callback - 回调函数，接收错误信息和发送结果
 */
function sendBuoyancyControl(command, frontPulse, rearPulse, callback) {
    try {
        // 创建数据包
        const packet = createBuoyancyControlPacket(command, frontPulse, rearPulse);
        
        // 创建UDP客户端
        const client = dgram.createSocket('udp4');
        
        // 发送数据包
        client.send(packet, UDP_PORT, UDP_HOST, (err) => {
            if (err) {
                callback(err, null);
                client.close();
            } else {
                const result = {
                    command: command === 0x01 ? '启动浮力调节' : '停止浮力调节',
                    frontPulse: frontPulse,
                    rearPulse: rearPulse,
                    packetSize: packet.length,
                    timestamp: new Date().toISOString()
                };
                callback(null, result);
                
                // 记录发送日志
                logPacketData(packet, command, frontPulse, rearPulse);
            }
            
            // 延迟关闭连接，确保数据发送完成
            setTimeout(() => {
                client.close();
            }, 100);
        });
        
        // 错误处理
        client.on('error', (err) => {
            callback(err, null);
            client.close();
        });
        
    } catch (error) {
        callback(error, null);
    }
}

/**
 * 记录数据包信息到日志文件
 */
function logPacketData(packet, command, frontPulse, rearPulse) {
    const fs = require('fs');
    const path = require('path');
    
    const logDir = path.join(__dirname, 'buoyancy_logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `buoyancy_control_${timestamp}.log`;
    const filepath = path.join(logDir, filename);
    
    let content = `浮力调节指令数据包\n`;
    content += `时间: ${new Date().toLocaleString()}\n`;
    content += `命令: ${command === 0x01 ? '启动浮力调节 (0x01)' : '停止浮力调节 (0x00)'}\n`;
    content += `前油囊修正脉冲: ${frontPulse}\n`;
    content += `后油囊修正脉冲: ${rearPulse}\n`;
    content += `数据包大小: ${packet.length} 字节\n\n`;
    
    content += `原始数据 (十六进制):\n`;
    const hexString = packet.toString('hex');
    for (let i = 0; i < hexString.length; i += 32) {
        content += hexString.slice(i, i + 32) + '\n';
    }
    
    content += `\n原始数据 (十进制):\n`;
    for (let i = 0; i < packet.length; i += 16) {
        const line = Array.from(packet.slice(i, i + 16))
            .map(byte => byte.toString().padStart(3, '0'))
            .join(' ');
        content += line + '\n';
    }
    
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`浮力调节数据包已记录: ${filepath}`);
}

// 使用示例和测试函数
function testBuoyancyControl() {
    console.log('测试浮力调节功能...');
    
    // 测试1：启动浮力调节，前油囊+100脉冲，后油囊-50脉冲
    sendBuoyancyControl(0x01, 100, -50, (err, result) => {
        if (err) {
            console.error('测试1失败:', err.message);
        } else {
            console.log('测试1成功:', result);
        }
    });
    
    // 测试2：停止浮力调节
    setTimeout(() => {
        sendBuoyancyControl(0x00, 0, 0, (err, result) => {
            if (err) {
                console.error('测试2失败:', err.message);
            } else {
                console.log('测试2成功:', result);
            }
        });
    }, 1000);
}

// 导出模块接口
module.exports = {
    sendBuoyancyControl,
    createBuoyancyControlPacket,
    COMMAND: {
        START: 0x01,    // 启动浮力调节
        STOP: 0x00      // 停止浮力调节
    }
};

