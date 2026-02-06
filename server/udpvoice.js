const dgram = require('dgram');
const fs = require('fs');
const path = require('path');

// CRC8校验实现 (多项式 x^8 + x^2 + x + 1 = 0x07)
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

// 解析时间戳 (4字节，32位) - 保持大端读取
function parseTimestamp(timestamp) {
    const bits = timestamp.toString(2).padStart(32, '0');
    return {
        month: parseInt(bits.substr(0, 4), 2),
        day: parseInt(bits.substr(4, 5), 2),
        hour: parseInt(bits.substr(9, 5), 2),
        minute: parseInt(bits.substr(14, 6), 2),
        second: parseInt(bits.substr(20, 6), 2),
        millisecond: parseInt(bits.substr(26, 6), 2) * 15.625 // 15.625ms精度
    };
}

// 帧解析器工厂 - 除时间戳外都改为大端读取
const parsers = {
    0x0F: (buffer) => { // 位置信息帧
        console.log("receive position");
        return {
            dataType: 'acoustic',
            type: 'position',
            timestamp: parseTimestamp(buffer.readUInt32BE(4)), // 时间戳保持大端
            usvId: buffer.readUInt8(8),
            latitude: buffer.readInt32LE(9) / 1e7,     // 改为大端
            longitude: buffer.readInt32LE(13) / 1e7,   // 改为大端
            depth: buffer.readUInt16LE(17) / 10,       // 改为大端
            velocity: buffer.readFloatLE(19),          // 改为大端
            heading: buffer.readFloatLE(23)            // 改为大端
        };
    },
    0x01: (buffer) => { // 状态信息帧
        console.log("receive status");
        return {
            dataType: 'acoustic',
            type: 'status',
            acoustic_timestamp: parseTimestamp(buffer.readUInt32BE(4)), // 时间戳保持大端
            acoustic_auvId: buffer.readUInt8(8),
            acoustic_status: buffer.readUInt8(9),
            acoustic_errorCode: buffer.readUInt32LE(10), // 改为大端
            acoustic_latitude: buffer.readInt32LE(14) / 1e7,  // 改为大端
            acoustic_longitude: buffer.readInt32LE(18) / 1e7, // 改为大端
            acoustic_depth: buffer.readUInt16LE(22) / 10,     // 改为大端
            acoustic_altitude: buffer.readUInt16LE(24) / 10,  // 改为大端
            acoustic_heading: buffer.readUInt16LE(26) / 10,   // 改为大端
            acoustic_battery: buffer.readUInt8(28)
        };
    },
    0x02: (buffer) => { // 心跳信息帧
        console.log("receive heartbeat");
        return {
            dataType: 'acoustic',
            type: 'heartbeat',
            acoustic_timestamp: parseTimestamp(buffer.readUInt32BE(4)), // 时间戳保持大端
            acoustic_latitude: buffer.readInt32LE(8) / 1e7,   // 改为大端
            acoustic_longitude: buffer.readInt32LE(12) / 1e7, // 改为大端
            acoustic_depth: buffer.readUInt16LE(16) / 10      // 改为大端
        };
    },
    0x03: (buffer) => { // 上行数据帧
        return {
            dataType: 'acoustic',
            type: 'uplink',
            rawData: Array.from(buffer.slice(4, 36)) // 32字节数据区
        };
    }
};

// 数据存储类
class DataStorage {
    constructor() {
        this.dataDir = path.join(__dirname, 'data');
        this.ensureDataDirectory();
        this.currentLogFile = this.getCurrentLogFileName();
        this.currentRawFile = this.getCurrentRawFileName();
    }

    // 确保数据目录存在
    ensureDataDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
            console.log(`数据目录已创建: ${this.dataDir}`);
        }
    }

    // 获取当前日志文件名（按日期）
    getCurrentLogFileName() {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        return path.join(this.dataDir, `udp_data_${dateStr}.json`);
    }

    // 获取当前原始数据文件名（按日期）
    getCurrentRawFileName() {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        return path.join(this.dataDir, `raw_udp_${dateStr}.bin`);
    }

    // 存储解析后的数据和原始UDP数据
    async saveData(parsedData, rawBuffer) {
        try {
            // 检查是否需要切换到新的日志文件（新的一天）
            const newLogFile = this.getCurrentLogFileName();
            const newRawFile = this.getCurrentRawFileName();
            
            if (newLogFile !== this.currentLogFile) {
                this.currentLogFile = newLogFile;
                console.log(`切换到新的日志文件: ${this.currentLogFile}`);
            }
            
            if (newRawFile !== this.currentRawFile) {
                this.currentRawFile = newRawFile;
                console.log(`切换到新的原始数据文件: ${this.currentRawFile}`);
            }

            // 保存解析后的数据到JSON文件
            await this.saveParsedData(parsedData);
            
            // 保存原始UDP数据到二进制文件
            await this.saveRawData(rawBuffer);

            return true;
        } catch (error) {
            console.error('存储数据失败:', error);
            return false;
        }
    }

    // 保存解析后的数据
    async saveParsedData(parsedData) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            receiveTime: Date.now(),
            ...parsedData
        };

        // 读取现有数据
        let existingData = [];
        if (fs.existsSync(this.currentLogFile)) {
            try {
                const fileContent = fs.readFileSync(this.currentLogFile, 'utf8');
                existingData = JSON.parse(fileContent);
            } catch (error) {
                console.error('读取现有数据文件失败，创建新文件:', error.message);
                existingData = [];
            }
        }

        // 添加新数据
        existingData.push(logEntry);

        // 保存数据（限制文件大小，避免过大）
        if (existingData.length > 10000) { // 限制最多10000条记录
            existingData = existingData.slice(-5000); // 保留最近5000条
        }

        // 写入文件
        fs.writeFileSync(this.currentLogFile, JSON.stringify(existingData, null, 2));
    }

    // 保存原始UDP数据（十六进制格式）
    async saveRawData(rawBuffer) {
        try {
            // 创建记录头：时间戳 + 数据长度
            const timestamp = new Date().toISOString();
            const header = Buffer.alloc(8);
            header.writeUInt32BE(Math.floor(Date.now() / 1000), 0); // 4字节时间戳（秒）
            header.writeUInt32BE(rawBuffer.length, 4); // 4字节数据长度
            
            // 将整个记录写入文件：头 + 原始数据
            const record = Buffer.concat([header, rawBuffer]);
            
            // 追加到原始数据文件
            fs.appendFileSync(this.currentRawFile, record);
            
            // 同时保存一份十六进制文本格式，便于查看
            await this.saveHexText(rawBuffer, timestamp);
            
        } catch (error) {
            console.error('保存原始数据失败:', error);
        }
    }

    // 保存十六进制文本格式（便于查看）
    async saveHexText(rawBuffer, timestamp) {
        try {
            const hexTextFile = path.join(this.dataDir, 'udp_hex_log.txt');
            const hexString = rawBuffer.toString('hex').toUpperCase();
            const hexWithSpaces = hexString.match(/.{1,2}/g).join(' ');
            const logLine = `${timestamp} | ${hexWithSpaces} | Length: ${rawBuffer.length}\n`;
            
            fs.appendFileSync(hexTextFile, logLine);
        } catch (error) {
            console.error('保存十六进制文本失败:', error);
        }
    }

    // 读取解析后的数据
    readData(date = null) {
        try {
            const logFile = date ? 
                path.join(this.dataDir, `udp_data_${date}.json`) : 
                this.currentLogFile;
            
            if (fs.existsSync(logFile)) {
                const fileContent = fs.readFileSync(logFile, 'utf8');
                return JSON.parse(fileContent);
            }
            return [];
        } catch (error) {
            console.error('读取数据失败:', error);
            return [];
        }
    }

    // 读取原始UDP数据
    readRawData(date = null) {
        try {
            const rawFile = date ? 
                path.join(this.dataDir, `raw_udp_${date}.bin`) : 
                this.currentRawFile;
            
            if (fs.existsSync(rawFile)) {
                return fs.readFileSync(rawFile);
            }
            return null;
        } catch (error) {
            console.error('读取原始数据失败:', error);
            return null;
        }
    }
}

// 主解析函数
function parseUdpData(buffer) {
    // 基本验证
    //console.log("buffer.length ", buffer.length);
    if (buffer.length < 6) return { error: '数据包过短' };
    if (buffer.readUInt16BE(0) !== 0xA55A) return { error: '帧头错误' };
    if (buffer[buffer.length - 1] !== 0x7E) return { error: '帧尾错误' };
    
    const frameType = buffer[2];
    const frameLength = buffer[3];
    if (frameLength !== buffer.length) return { error: '帧长度不匹配' };
    
    // CRC校验 (从帧长字节到数据区末尾)
    const crcData = buffer.slice(3, buffer.length - 2);
    const calculatedCRC = crc8(crcData);
    if (calculatedCRC !== buffer[buffer.length - 2]) return { error: 'CRC校验失败' };
    
    // 调用对应解析器
    const parser = parsers[frameType];
    if (!parser) return { error: `不支持的帧类型: 0x${frameType.toString(16)}` };
    
    try {
        return parser(buffer);
    } catch (e) {
        return { error: `解析失败: ${e.message}` };
    }
}

// 创建UDP服务器监听指定端口
function createUdpServer(onDataCallback, wss) {
    const udpServer = dgram.createSocket('udp4');
    const dataStorage = new DataStorage();
    
    udpServer.on('message', async (msg, rinfo) => {
        try {
            // 解析数据
            const result = parseUdpData(msg);
            console.log('收到UDP数据:', result);
            
            // 存储数据（只有解析成功的数据才存储）
            if (!result.error) {
                const saveResult = await dataStorage.saveData(result, msg);
                if (saveResult) {
                    console.log('数据已存储');
                }
            }
            
            // 如果有回调函数，则调用
            if (onDataCallback) {
                onDataCallback(result);
            }
            
            // 通过WebSocket发送到Web端
            if (wss) {
                // 添加类型标识，方便前端识别
                const beidouDataWithType = {
                    type: 'beidou',
                    ...result,
                    timestamp: Date.now()
                };
                
                // 广播给所有连接的Web客户端
                wss.clients.forEach(client => {
                    if (client.readyState === require('ws').OPEN) {
                        client.send(JSON.stringify(beidouDataWithType));
                    }
                });
            }
        } catch (error) {
            console.error('处理UDP数据时出错:', error.message);
        }
    });
    
    udpServer.on('listening', () => {
        const address = udpServer.address();
        console.log(`UDP服务器监听端口 ${address.address}:${address.port}`);
    });
    
    udpServer.on('error', (err) => {
        console.error(`UDP服务器错误:\n${err.stack}`);
        udpServer.close();
    });
    

    udpServer.bind(1122);
    
    return {
        udpServer,
        dataStorage // 暴露存储实例以便外部访问
    };
}

// 对外暴露解析函数和服务器控制
module.exports = {
    parseUdpData,
    createUdpServer,
    DataStorage, // 导出存储类
    onDataParsed: null // 输出接口注册点
};