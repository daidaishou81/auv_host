/**
 * GNRMC数据解析器 - 用于解析NMEA格式的GPS定位数据
 * 输入: NMEA格式字符串 (例如: "$GNRMC,084305.00,A,2230.8414543,N,11355.3908081,E,0.028,,100924,,,A,V*18")
 * 输出: 解析后的JSON对象
 */
const dgram = require('dgram');
const WebSocket = require('ws'); // 需要安装ws包: npm install ws

function parseGNRMC(nmeaSentence) {
    try {
        // 验证校验和
        // if (!validateChecksum(nmeaSentence)) {
        //     console.error('NMEA校验和验证失败');
        //     return null;
        // }

        // 提取数据部分
        const dataPart = nmeaSentence.split('$GNRMC,')[1].split('*')[0];
        const fields = dataPart.split(',');
        
        // 检查基本数据完整性
        if (fields.length < 12) {
            console.error('GNRMC数据字段不完整');
            return null;
        }

        // 解析各个字段
        const result = {
            // 时间 (UTC)
            GNRMCtime: parseTime(fields[0]),
            
            // 状态 A=有效, V=无效
            GNRMCstatus: fields[1],
            GNRMCisValid: fields[1] === 'A',
            
            // 纬度
            GNRMClatitude: parseLatitude(fields[2], fields[3]),
            GNRMClatitudeRaw: fields[2],
            GNRMClatDirection: fields[3],
            
            // 经度
            GNRMClongitude: parseLongitude(fields[4], fields[5]),
            GNRMClongitudeRaw: fields[4],
            GNRMClonDirection: fields[5],
            
            // 速度 (节)
            GNRMCspeedKnots: parseFloat(fields[6]) || 0,
            
            // 地面航向 (度)
            GNRMCcourse: parseFloat(fields[7]) || 0,
            
            // 日期
            GNRMCdate: parseDate(fields[8]),
            
            // 磁偏角
            GNRMCmagneticVariation: parseMagneticVariation(fields[9], fields[10]),
            
            // 模式指示
            GNRMCmode: fields[11] || 'N',
            
            // 原始数据
            GNRMCraw: nmeaSentence
        };

        // 计算速度 (米/秒)
        result.speedMps = result.speedKnots * 0.514444;
        
        // 生成完整的时间戳
        result.timestamp = combineDateTime(result.date, result.time);

        return result;
    } catch (error) {
        console.error('GNRMC数据解析失败:', error.message);
        return null;
    }
}

/**
 * 验证NMEA语句的校验和
 */
function validateChecksum(nmeaSentence) {
    try {
        const parts = nmeaSentence.split('*');
        if (parts.length < 2) return false;
        
        const data = parts[0].substring(1); // 去掉开头的$
        const checksum = parseInt(parts[1], 16);
        
        let calculatedChecksum = 0;
        for (let i = 0; i < data.length; i++) {
            calculatedChecksum ^= data.charCodeAt(i);
        }
        console.log("checksum",checksum,"calculatedChecksum",calculatedChecksum);
        return calculatedChecksum === checksum;
    } catch (error) {
        return false;
    }
}

/**
 * 解析时间字段 (格式: hhmmss.ss)
 */
function parseTime(timeStr) {
    if (!timeStr) return null;
    
    const hours = parseInt(timeStr.substring(0, 2));
    const minutes = parseInt(timeStr.substring(2, 4));
    const seconds = parseFloat(timeStr.substring(4));
    
    return {
        hours: hours,
        minutes: minutes,
        seconds: seconds,
        string: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2)}`
    };
}

/**
 * 解析纬度 (格式: ddmm.mmmmm)
 */
function parseLatitude(latStr, direction) {
    if (!latStr || !direction) return null;
    
    const degrees = parseInt(latStr.substring(0, 2));
    const minutes = parseFloat(latStr.substring(2));
    let decimal = degrees + minutes / 60;
    
    // 南纬为负值
    if (direction === 'S') {
        decimal = -decimal;
    }
    
    return parseFloat(decimal.toFixed(8));
}

/**
 * 解析经度 (格式: dddmm.mmmmm)
 */
function parseLongitude(lonStr, direction) {
    if (!lonStr || !direction) return null;
    
    const degrees = parseInt(lonStr.substring(0, 3));
    const minutes = parseFloat(lonStr.substring(3));
    let decimal = degrees + minutes / 60;
    
    // 西经为负值
    if (direction === 'W') {
        decimal = -decimal;
    }
    
    return parseFloat(decimal.toFixed(8));
}

/**
 * 解析日期 (格式: ddmmyy)
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    const day = parseInt(dateStr.substring(0, 2));
    const month = parseInt(dateStr.substring(2, 4));
    const year = 2000 + parseInt(dateStr.substring(4, 6)); // 假设是2000年之后的日期
    
    return {
        day: day,
        month: month,
        year: year,
        string: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    };
}

/**
 * 解析磁偏角
 */
function parseMagneticVariation(variationStr, direction) {
    if (!variationStr || !direction) return null;
    
    let variation = parseFloat(variationStr);
    if (direction === 'W') {
        variation = -variation;
    }
    
    return variation;
}

/**
 * 合并日期和时间生成完整的时间戳
 */
function combineDateTime(dateObj, timeObj) {
    if (!dateObj || !timeObj) return null;
    
    const dateTime = new Date(
        dateObj.year,
        dateObj.month - 1, // 月份从0开始
        dateObj.day,
        timeObj.hours,
        timeObj.minutes,
        Math.floor(timeObj.seconds),
        Math.round((timeObj.seconds - Math.floor(timeObj.seconds)) * 1000)
    );
    
    return dateTime.toISOString();
}

/**
 * 主处理函数
 */
function GNRMCData(input) {
    const result = parseGNRMC(input);
    return result;
}

/**
 * 创建UDP服务器监听23端口
 */
function createGNRMCUdpServer(onDataCallback, wss) {
    const udpServer = dgram.createSocket('udp4');
    
    udpServer.on('message', (msg, rinfo) => {
        try {
            // 将Buffer转换为字符串
            const dataStr = msg.toString('ascii').trim();
            //console.log(dataStr);·
            // 检查是否为有效的GNRMC格式
            if (dataStr.startsWith('$GNRMC')) {
                // 解析数据
                const result = GNRMCData(dataStr);
                
                if (result) {
                 //   console.log('解析到的GNRMC数据:', result);
                    
                    // 如果有回调函数，则调用
                    if (onDataCallback) {
                        onDataCallback(result);
                    }
                    
                    // 通过WebSocket发送到Web端
                    if (wss) {
                        const gnrmcDataWithType = {
                            type: 'gnrmc',
                            ...result,
                            processedTimestamp: Date.now()
                        };
                        
                        // 广播给所有连接的Web客户端
                        wss.clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify(gnrmcDataWithType));
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error('处理UDP数据时出错:', error.message);
        }
    });
    
    udpServer.on('listening', () => {
        const address = udpServer.address();
        console.log(`GNRMC UDP服务器监听26端口 ${address.address}:${address.port}`);
        console.log(`等待从192.168.0.240接收GNRMC数据...`);
    });
    
    udpServer.on('error', (err) => {
        console.error(`GNRMC UDP服务器错误:\n${err.stack}`);
        udpServer.close();
    });
    
    // 绑定23端口
    udpServer.bind({
    address:"192.168.0.241",
    port:26
    });
    return udpServer;
}

module.exports = {
    GNRMCData,
    parseGNRMC,
    createGNRMCUdpServer
};