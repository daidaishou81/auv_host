const ping = require('ping');
const dgram = require('dgram');

class DeviceChecker {
    constructor() {
        this.config = {
            UDP_SERVER_IP: '192.168.0.101',
            UDP_SERVER_PORT: 8003,
            PING_TIMEOUT: 3000, // 3秒超时
            PING_RETRIES: 2     // 重试次数
        };
    }

    /**
     * 检测设备连通性
     * @param {string} ip - 设备IP地址
     * @param {string} deviceId - 设备ID
     * @param {string} deviceName - 设备名称
     * @returns {Promise<Object>} 检测结果
     */
    async checkDevice(ip, deviceId, deviceName) {
        try {
            console.log(`开始检测设备: ${deviceName} (${ip})`);
            
            let isAlive = false;
            let responseTime = 0;
            let retries = this.config.PING_RETRIES;
            
            // 重试机制
            while (retries > 0 && !isAlive) {
                const res = await ping.promise.probe(ip, {
                    timeout: this.config.PING_TIMEOUT / 1000,
                    extra: ['-c', '2'] // 发送2个ping包
                });
                
                isAlive = res.alive;
                responseTime = res.time !== 'unknown' ? parseFloat(res.time) : 0;
                
                if (!isAlive) {
                    console.log(`设备 ${deviceName} 第${this.config.PING_RETRIES - retries + 1}次检测失败`);
                    retries--;
                    
                    if (retries > 0) {
                        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒后重试
                    }
                }
            }
            
            const result = {
                deviceId: deviceId,
                deviceName: deviceName,
                ip: ip,
                success: isAlive,
                responseTime: responseTime,
                timestamp: new Date().toISOString(),
                message: isAlive ? 
                    `设备 ${deviceName} 检测成功 (${responseTime}ms)` :
                    `设备 ${deviceName} 检测失败 - 无法连接到 ${ip}`
            };
            

            console.log(result.message);
            return result;
            
        } catch (error) {
            console.error(`检测设备 ${deviceName} 时发生错误:`, error);
            
            return {
                deviceId: deviceId,
                deviceName: deviceName,
                ip: ip,
                success: false,
                responseTime: 0,
                timestamp: new Date().toISOString(),
                message: `设备 ${deviceName} 检测异常: ${error.message}`
            };
        }
    }

    /**
     * 批量检测设备
     * @param {Array} devices - 设备列表
     * @returns {Promise<Array>} 所有设备的检测结果
     */
    async checkDevices(devices,wss) {
        try {
            const results = [];
            
            // 串行检测，避免同时ping太多设备
            for (const device of devices) {
                const result = await this.checkDevice(device.ip, device.id, device.name);
                results.push(result);
                
                // 设备间检测间隔
                await new Promise(resolve => setTimeout(resolve, 500));
              if (wss) {
                    // 添加类型标识，方便前端识别
                    const beidouDataWithType = {
                        type: 'self-check',
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
            
            return results;
            
        } catch (error) {
            console.error('批量检测设备时发生错误:', error);
            throw error;
        }
    }

    /**
     * 发送UDP检测指令（如果需要特殊协议检测）
     * @param {string} ip - 设备IP
     * @param {number} port - 设备端口
     * @param {Buffer} data - 发送的数据
     * @returns {Promise<Object>} UDP检测结果
     */
    async sendUDPCheck(ip, port, data) {
        return new Promise((resolve, reject) => {
            const client = dgram.createSocket('udp4');
            const timeout = 5000; // 5秒超时
            
            const timer = setTimeout(() => {
                client.close();
                resolve({
                    success: false,
                    message: 'UDP检测超时'
                });
            }, timeout);
            
            client.on('message', (msg, rinfo) => {
                clearTimeout(timer);
                client.close();
                
                resolve({
                    success: true,
                    message: '收到UDP响应',
                    data: msg.toString('hex'),
                    remoteInfo: rinfo
                });
            });
            
            client.on('error', (err) => {
                clearTimeout(timer);
                client.close();
                reject(err);
            });
            
            // 发送数据
            client.send(data, port, ip, (err) => {
                if (err) {
                    clearTimeout(timer);
                    client.close();
                    reject(err);
                }
            });
        });
    }
}

module.exports = new DeviceChecker();