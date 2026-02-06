/**
 * 监控数据解析器 - 用于解析DRPR/DAPR监控数据中的SNR和距离
 * 输入: JSON格式的监控数据 (例如: UDP端口7788接收的数据)
 * 输出: 解析后的JSON对象，包含SNR和距离信息
 */

const dgram = require('dgram');
const WebSocket = require('ws'); // 需要安装: npm install ws

function parseMonitorData(jsonData) {
    try {
        // 解析JSON数据
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        
        // 提取SNR和距离信息
        return {
            // 基本信息
            deviceId: "auv1",
            device_type: data.device_type || 'unknown',
            ip_address: data.ip_address || '',
            device_ip: data.device_ip || data.ip_address || '',
            channel: data.channel || 0,
            timestamp: data.timestamp || new Date().toISOString(),
            
            // SNR信息
            snr: data.snr || null,
            snr_raw: typeof data.snr === 'number' ? data.snr.toString() : (data.snr || 'N/A'),
            
            // 距离信息
            distance: data.distance || null,
            distance_raw: typeof data.distance === 'number' ? data.distance.toString() : (data.distance || 'N/A'),
            
            // 信号质量评估
            signal_quality: data.signal_quality || '未知',
            
            // RSRP信息（可选）
            rsrp_main: data.rsrp_main || null,
            rsrp_secondary: data.rsrp_secondary || null,
            rsrp_avg: data.rsrp_avg || null,
            
            // 功率信息（可选）
            power: data.power || null,
            
            // 原始数据（用于调试）
            raw_data: data.raw_line || data.raw_data || ''
        };
    } catch (error) {
        console.error('数据解析失败:', error.message);
        return null;
    }
}



// 增强的数据解析
function parseEnhancedMonitorData(jsonData) {
    const basicData = parseMonitorData(jsonData);
    if (!basicData) return null;
    
    // 添加增强信息
    return {
        ...basicData,
    
    };
}

// 主处理函数
function MonitorData(input) {
    const result = parseEnhancedMonitorData(input);
    
    // 打印解析结果
    if (result) {
        console.log(`[${result.local_time}] 设备: ${result.device_ip} (${result.device_type.toUpperCase()})`);
        console.log(`  通道: ${result.channel}, SNR: ${result.snr !== null ? result.snr + 'dB' : 'N/A'} (${result.snr_quality})`);
        console.log(`  距离: ${result.distance !== null ? result.distance : 'N/A'} (${result.distance_status})`);
        console.log(`  信号质量: ${result.signal_quality}, 信号强度: ${result.signal_strength}`);
        console.log(`  RSRP主: ${result.rsrp_main || 'N/A'}, RSRP次: ${result.rsrp_secondary || 'N/A'}`);
        console.log(`  功率: ${result.power || 'N/A'}`);
    }
    
    return result;
}

// 创建UDP服务器监听7788端口
function createUdpServer7788(onDataCallback, wss) {
    const udpServer = dgram.createSocket('udp4');
    
    udpServer.on('message', (msg, rinfo) => {
        try {
            // 将Buffer转换为字符串
            const dataStr = msg.toString('utf-8').trim();
            
            // 检查是否为有效的JSON格式
            if (dataStr.startsWith('{') && dataStr.endsWith('}')) {
                // 解析数据
                const result = MonitorData(dataStr);
                
                // 如果有回调函数，则调用
                if (onDataCallback && result) {
                    onDataCallback(result);
                }
                
                // 通过WebSocket发送到Web端
                if (wss && result) {
                    // 添加类型标识，方便前端识别
                    const monitorDataWithType = {
                        type: 'DRPR_receive',
                        data_type: 'snr_distance',
                        tc_snr:{...result}
                    };
                    
                    // 广播给所有连接的Web客户端
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify(monitorDataWithType));
                        }
                    });
                }
            } else {
                console.log(`[${new Date().toLocaleTimeString()}] 收到非JSON数据: ${dataStr.substring(0, 100)}...`);
            }
        } catch (error) {
            console.error('处理UDP数据时出错:', error.message);
        }
    });
    
    udpServer.on('listening', () => {
        const address = udpServer.address();
        console.log(`UDP服务器监听 ${address.address}:${address.port} 端口`);
        console.log('等待接收监控数据...');
    });
    
    udpServer.on('error', (err) => {
        console.error(`UDP服务器错误: ${err.stack}`);
        udpServer.close();
    });
    
    // 绑定7788端口
    udpServer.bind({
        address: "192.168.0.202", // 监听所有网络接口
        port: 7788
    });
    
    return udpServer;
}

// 导出模块
module.exports = {
    MonitorData,
    parseMonitorData,
    parseEnhancedMonitorData,
    createUdpServer7788,
};