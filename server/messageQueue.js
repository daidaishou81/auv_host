const sqlite3 = require('sqlite3').verbose();
const ProtocolParser = require('./protocolParser');

class SimpleQueue {
    constructor(onMessageParsed) {
        this.queue = [];
        this.processing = false;
        this.errorQueue = [];
        this.interval = setInterval(() => this.processQueue(), 100);
        this.onMessageParsed = onMessageParsed; // 消息解析后的回调
    }

    enqueue(rawBuffer) {
        this.queue.push(rawBuffer);
    }

    processQueue() {
        if (this.processing || this.queue.length === 0) return;
         const data = this.queue.shift();
        this.processing = true;
        const rawBuffer = this.queue.shift();
        
        try {
             let parsedData;
            if (Buffer.isBuffer(data)) {
                // 如果是Buffer，需要解析
                parsedData = ProtocolParser.parse(data);
            } else {
                // 如果是对象，直接当作已解析的数据
                parsedData = data;
            }
            
            // 触发回调
            if (this.onMessageParsed) {
                this.onMessageParsed(parsedData);
            }
            
            // 存储到数据库
           // this.saveToDatabase(parsedData);
        } catch (error) {
            console.error('消息处理错误:', error);
            // // 保存解析失败的原始数据
            // this.errorQueue.push({
            //     timestamp: Date.now(),
            //     error: error.message,
            //     rawData: rawBuffer.toString('hex')
            // });
            // 错误队列长度限制
            if (this.errorQueue.length > 1000) this.errorQueue.shift();
        } finally {
            this.processing = false;
        }
    }

    saveToDatabase(data) {
        const db = new sqlite3.Database('auv_data.db', (err) => {
            if (err) {
                console.error('数据库连接错误:', err.message);
                return;
            }
        });

        // 创建表（如果不存在）
        db.run(`CREATE TABLE IF NOT EXISTS device_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            deviceId TEXT,
            data TEXT
        )`);

        // 创建错误数据表（如果不存在）
        db.run(`CREATE TABLE IF NOT EXISTS parse_errors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            error TEXT,
            raw_data TEXT
        )`);

        // 插入数据
        const stmt = db.prepare("INSERT INTO device_data (deviceId, data) VALUES (?, ?)");
        stmt.run(data.deviceId, JSON.stringify(data), (err) => {
            if (err) {
                console.error('数据插入错误:', err.message);
            }
        });

        stmt.finalize();
        db.close();
    }

    // 获取解析错误队列
    getErrors() {
        return this.errorQueue;
    }
}

module.exports = SimpleQueue;