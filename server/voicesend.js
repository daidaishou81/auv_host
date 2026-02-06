
const dgram = require('dgram');

// CRC8校验实现 (与接收端保持一致)
function crc8(data, polynomial = 0x07) {
    let crc = 0x00;
    for (let byte of data) {
        crc ^= byte;
        for (let i = 0; i < 8; i++) {
            if (crc & 0x80) {
                crc = (crc << 1) ^ polynomial;
            } else {
                crc <<= 1;
            }
            crc &= 0xFF;
        }
    }
    return crc;
}

// 生成时间戳 (4字节，32位) - 大端格式
function generateTimestamp() {
    const now = new Date();
    
    // 将时间转换为二进制位
    let timestamp = 0;
    
    // 月份: 4位 (1-12)
    const month = now.getMonth() + 1;
    timestamp |= (month & 0x0F) << 28;
    
    // 日期: 5位 (1-31)
    const day = now.getDate();
    timestamp |= (day & 0x1F) << 23;
    
    // 小时: 5位 (0-23)
    const hour = now.getHours();
    timestamp |= (hour & 0x1F) << 18;
    
    // 分钟: 6位 (0-59)
    const minute = now.getMinutes();
    timestamp |= (minute & 0x3F) << 12;
    
    // 秒: 6位 (0-59)
    const second = now.getSeconds();
    timestamp |= (second & 0x3F) << 6;
    
    // 毫秒: 6位 (0-999，精度15.625ms)
    const millisecond = now.getMilliseconds();
    const msPrecision = Math.floor(millisecond / 15.625) & 0x3F;
    timestamp |= msPrecision;
    
    return timestamp;
}

// 创建上行数据帧 (类型 0x04)
function createUplinkFrame(data = null) {
    // 帧结构: 总长度38字节
    // 帧头: 2字节 (0xA55A)
    // 帧类型: 1字节 (0x04)
    // 帧长度: 1字节 (整个帧的长度，38字节)
    // 数据区: 32字节 (包含4字节时间戳 + 28字节用户数据)
    // CRC8: 1字节
    // 帧尾: 1字节 (0x7E)
    
    const frameLength = 2 + 1 + 1 + 32 + 1 + 1; // 总长度38字节
    
    // 创建缓冲区
    const buffer = Buffer.alloc(frameLength);
    
    // 帧头 (2字节)
    buffer.writeUInt16BE(0xA55A, 0);
    
    // 帧类型 (1字节) - 上行数据帧
    buffer.writeUInt8(0x04, 2);
    
    // 帧长度 (1字节)
    buffer.writeUInt8(frameLength, 3);
    
    // 数据区 (32字节)
    const dataStart = 4; // 数据区起始位置
    
    // 1. 前4字节为时间戳
    const timestamp = generateTimestamp();
    buffer.writeUInt32BE(0, dataStart);
    
    // 2. 剩余28字节为用户数据
    const userDataStart = dataStart + 4; // 用户数据起始位置
    const maxUserDataLength = 28; // 最多28字节用户数据
    
    if (data && data.length <= maxUserDataLength) {
        // 如果有提供数据，填充到用户数据区
        for (let i = 0; i < data.length; i++) {
            buffer.writeUInt8(data[i], userDataStart + i);
        }
        // 剩余部分填充0
        for (let i = data.length; i < maxUserDataLength; i++) {
            buffer.writeUInt8(0x00, userDataStart + i);
        }
    } else {
        // 默认填充测试数据
        for (let i = 0; i < maxUserDataLength; i++) {
            buffer.writeUInt8( 1 , userDataStart + i); // 填充1-28的循环
        }
    }
    
    // 计算CRC8 (从帧长度字节到数据区末尾)
    const crcData = buffer.slice(3, frameLength - 2); // 从位置3到倒数第2个字节
    const crc = crc8(crcData);
    buffer.writeUInt8(crc, frameLength - 2);
    
    // 帧尾 (1字节)
    buffer.writeUInt8(0x7E, frameLength - 1);
    
    return buffer;
}

// 发送UDP数据包
function sendUplinkData(host = '192.168.0.167', port = 8080, customData = null) {
    const client = dgram.createSocket('udp4');
    
    // 创建上行数据帧
    const frame = createUplinkFrame(customData);
    
    client.send(frame, port, host, (err) => {
        if (err) {
            console.error('发送UDP数据失败:', err);
            client.close();
            return;
        }
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false, fractionalSecondDigits: 3 });
        
        console.log(`[${timeStr}] 上行数据帧已发送到 ${host}:${port}`);
        console.log('帧内容 (十六进制):', frame.toString('hex').toUpperCase());
        
        // 显示帧结构详情
        console.log('\n帧结构详情 (总长度38字节):');
        console.log(`帧头: 0x${frame.readUInt16BE(0).toString(16).toUpperCase()}`);
        console.log(`帧类型: 0x${frame.readUInt8(2).toString(16).toUpperCase()} (上行数据帧)`);
        console.log(`帧长度: ${frame.readUInt8(3)} 字节`);
        
        // 解析数据区
        const dataStart = 4;
        const timestamp = frame.readUInt32BE(dataStart);
        const userData = frame.slice(dataStart + 4, dataStart + 32);
        
        console.log(`时间戳(数据区前4字节): 0x${timestamp.toString(16).toUpperCase()}`);
        console.log(`用户数据(28字节): ${userData.toString('hex').toUpperCase()}`);
        console.log(`CRC8: 0x${frame.readUInt8(36).toString(16).toUpperCase()}`);
        console.log(`帧尾: 0x${frame.readUInt8(37).toString(16).toUpperCase()}`);
        console.log('----------------------------------------');
        
        client.close();
    });
    
    client.on('error', (err) => {
        console.error('UDP客户端错误:', err);
        client.close();
    });
}

// 定时发送函数
function startTimedSending(host = '192.168.0.167', port = 8080, customData = null, interval = 5000) {
    console.log('========================================');
    console.log('UDP上行数据帧定时发送器 (总长度38字节)');
    console.log('========================================');
    console.log(`目标地址: ${host}:${port}`);
    console.log(`发送间隔: ${interval}ms (${interval/1000}秒)`);
    console.log(`帧结构: 2(帧头)+1(类型)+1(长度)+32(数据区)+1(CRC8)+1(帧尾)=38字节`);
    console.log(`数据区: 4字节时间戳 + 28字节用户数据`);
    
    if (customData) {
        console.log(`自定义数据: ${Buffer.from(customData).toString('hex').toUpperCase()}`);
    }
    
    console.log('开始定时发送...');
    console.log('========================================\n');
    
    // 立即发送第一次
    sendUplinkData(host, port, customData);
    
    // 设置定时器，每隔interval毫秒发送一次
    const timerId = setInterval(() => {
        sendUplinkData(host, port, customData);
    }, interval);
    
    // 返回定时器ID，以便可以停止它
    return timerId;
}

// 命令行使用
if (require.main === module) {
    const args = process.argv.slice(2);
    let host = '127.0.0.1';
    let port = 1122;
    let customData = null;
    let interval = 5000; // 默认5秒
    
    // 解析命令行参数
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-h' && args[i + 1]) {
            host = args[i + 1];
            i++;
        } else if (args[i] === '-p' && args[i + 1]) {
            port = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '-d' && args[i + 1]) {
            // 自定义数据 (十六进制字符串，如 "A1B2C3")
            const hexData = args[i + 1];
            customData = [];
            for (let j = 0; j < hexData.length; j += 2) {
                const byteStr = hexData.substr(j, 2);
                if (byteStr.length === 2) {
                    customData.push(parseInt(byteStr, 16));
                }
            }
            // 限制用户数据最多28字节
            if (customData.length > 28) {
                console.log(`警告: 用户数据超过28字节，将只取前28字节`);
                customData = customData.slice(0, 28);
            }
            i++;
        } else if (args[i] === '-i' && args[i + 1]) {
            // 设置发送间隔（毫秒）
            interval = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '-t') {
            // 单次发送模式（不启用定时器）
            console.log('UDP上行数据帧单次发送模式 (总长度38字节)');
            console.log('========================================');
            console.log(`目标地址: ${host}:${port}`);
            
            if (customData) {
                console.log(`自定义数据: ${Buffer.from(customData).toString('hex').toUpperCase()}`);
            }
            
            console.log('');
            sendUplinkData(host, port, customData);
            return; // 退出程序
        } else if (args[i] === '--help') {
            console.log('UDP上行数据帧发送器 - 总长度38字节');
            console.log('帧结构: 2(帧头)+1(类型)+1(长度)+32(数据区)+1(CRC8)+1(帧尾)=38字节');
            console.log('数据区: 4字节时间戳 + 28字节用户数据\n');
            console.log('用法: node voicesend.js [选项]');
            console.log('选项:');
            console.log('  -h <host>     目标主机地址 (默认: 127.0.0.1)');
            console.log('  -p <port>     目标端口 (默认: 1122)');
            console.log('  -d <hexdata>  自定义数据 (十六进制字符串，最多28字节，如 "A1B2C3")');
            console.log('  -i <interval> 发送间隔 (毫秒，默认: 5000)');
            console.log('  -t            单次发送模式 (不启用定时器)');
            console.log('  --help        显示帮助信息');
            return;
        }
    }
    
    // 启动定时发送
    const timerId = startTimedSending(host, port, customData, interval);
    
    // 处理程序退出
    process.on('SIGINT', () => {
        console.log('\n接收到中断信号，停止定时发送...');
        clearInterval(timerId);
        console.log('程序已停止');
        process.exit(0);
    });
}

// 模块导出
module.exports = {
    createUplinkFrame,
    sendUplinkData,
    startTimedSending,
    crc8,
    generateTimestamp
};