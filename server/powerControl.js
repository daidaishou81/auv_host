const dgram = require('dgram');
const fs = require('fs');
const path = require('path');

// UDP 配置
const UDP_HOST = '192.168.0.101';
const UDP_PORT = 8003;

// 协议常量
const HEADER = 0xAABB;
const VERSION = 0x01;
const FOOTER = 0xEEFF;
const POWER_ON_MSG_ID = 0xB0A00002; // 上电消息ID
const POWER_OFF_MSG_ID = 0xB0A00003; // 断电消息ID

// 设备代码映射表
const DEVICE_CODES = {
    'DE1': 0x00,
    'DE2': 0x01,
    'DE3': 0x02,
    'DE4': 0x03,
    'DE5': 0x04,
    'DE6': 0x05,
    'DE7': 0x06,
    'DE8': 0x07,
    'DE9': 0x08,
    'DE10': 0x09,
    'DE11': 0x0A,
    'DE12': 0x0B,
    'DE13': 0x0C,
    'DE14': 0x0D,
    'DE15': 0x0E,
    'DE16': 0x0F,
    'DE17': 0x10,
    'DE18': 0x11,
    'DE19': 0x12,
    'DE20': 0x13,
    'DE21': 0x14,
    'DE22': 0x15,
    'DE23': 0x16,
    'DE24': 0x17,
    'DE25': 0x18,
    'DE26': 0x1A,
    'DE27': 0x1B,
    'DE28': 0x1C,
    'mission_end': 0x20,
    'mission_start': 0x21,
    'change_to_return': 0x22,
    'change_to_dockseek': 0x23
};

/**
 * 创建上断电控制数据包
 * @param {number} deviceCode - 设备代码
 * @param {boolean} isPowerOn - 是否为上电指令
 * @returns {Buffer} 打包后的二进制数据
 */
function createPowerControlPacket(deviceCode, isPowerOn) {
    const messageBuffer = Buffer.alloc(2 + 1 + 2 + 4 + 1 + 1 + 2);
    
    let pos = 0;
    
    // 帧头
    messageBuffer.writeUInt16BE(HEADER, pos);
    pos += 2;
    
    // 版本号
    messageBuffer.writeUInt8(VERSION, pos);
    pos += 1;
    
    // 消息长度
    messageBuffer.writeUInt16BE(0x000D, pos);
    pos += 2;
    
    // 消息ID
    const messageId = POWER_ON_MSG_ID ;
    messageBuffer.writeUInt32BE(messageId, pos);
    pos += 4;
    
    // 设备代码
    messageBuffer.writeUInt8(deviceCode, pos);
    pos += 1;
    console.log(deviceCode);
    // 计算校验和
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
 * 存储发送的数据包到日志文件
 * @param {Buffer} packet - 数据包
 * @param {string} deviceName - 设备名称
 * @param {boolean} isPowerOn - 是否为上电指令
 */
function storePacketData(packet, deviceName, isPowerOn) {
    const logDir = path.join(__dirname, 'power_control_logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `power_control_${timestamp}_${deviceName}_${isPowerOn ? 'on' : 'off'}.txt`;
    const filepath = path.join(logDir, filename);
    
    let content = `Power Control Packet Data Log\n`;
    content += `Timestamp: ${new Date().toLocaleString()}\n`;
    content += `Device: ${deviceName}\n`;
    content += `Operation: ${isPowerOn ? 'Power On' : 'Power Off'}\n`;
    content += `Packet size: ${packet.length} bytes\n\n`;
    
    content += `Raw Packet Data (Hex):\n`;
    content += packet.toString('hex') + '\n\n';
    
    content += `Raw Packet Data (Decimal):\n`;
    for (let i = 0; i < packet.length; i += 16) {
        const line = Array.from(packet.slice(i, i + 16))
            .map(byte => byte.toString().padStart(3, '0'))
            .join(' ');
        content += line + '\n';
    }
    
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Packet data saved to: ${filepath}`);
    
    const summaryLogPath = path.join(logDir, 'power_control_summary.log');
    const summaryEntry = `[${new Date().toLocaleString()}] Device: ${deviceName} | ` +
                         `Operation: ${isPowerOn ? 'Power On' : 'Power Off'} | ` +
                         `Size: ${packet.length} bytes\n`;
    
    fs.appendFileSync(summaryLogPath, summaryEntry, 'utf8');
}

/**
 * 发送上断电控制指令
 * @param {string} deviceName - 设备名称
 * @param {boolean} isPowerOn - 是否为上电指令
 */
function sendPowerControl(deviceName, isPowerOn) {
    const deviceCode = DEVICE_CODES[deviceName];
    
    if (deviceCode === undefined) {
        console.log(`未知设备: ${deviceName}`);
        return;
    }
    
    const packet = createPowerControlPacket(deviceCode, isPowerOn);
    const client = dgram.createSocket('udp4');
    
    // 存储数据包信息
   // storePacketData(packet, deviceName, isPowerOn);
    
    // 监听错误事件
    client.on('error', (err) => {
        console.log(`UDP客户端错误: ${err.message}`);
        client.close();
    });
    
    // 发送数据包
    client.send(packet, UDP_PORT, UDP_HOST, (err) => {
        if (err) {
            console.log(`发送错误: ${err.message}`);
        } else {
            console.log(`已发送${isPowerOn ? '上电' : '断电'}指令到设备: ${deviceName}`);
        }
        client.close();
    });
}

module.exports = {
    sendPowerControl,
    DEVICE_CODES
};