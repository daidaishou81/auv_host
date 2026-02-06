class ProtocolParser {
    static parse(buffer) {
        // 验证帧头 (0xAABB)
        if (buffer.readUInt16BE(0) !== 0xAABB) {
            throw new Error('无效帧头');
        }
        
          //  console.log(" 验证数据 ");
        // 验证帧尾 (0xEEFF)
        if (buffer.readUInt16BE(buffer.length - 2) !== 0xEEFF) {
            throw new Error('无效帧尾');
        }
        
        // 解析基本字段
        const version = buffer.readUInt8(2);
        const messageLength = buffer.readUInt16BE(3);
        const messageId = buffer.readUInt32BE(5);
        const paramLength = messageLength - 12; // 总长度 - 帧头(2) - 版本(1) - 长度(2) - ID(4) - 校验(1) - 帧尾(2)
        const params = buffer.slice(9, 9 + paramLength);
        const checksum = buffer.readUInt8(9 + paramLength);

        // 计算校验和
        const calculatedChecksum = ProtocolParser.calculateChecksum(buffer.slice(0, buffer.length - 3));
        if (checksum !== calculatedChecksum) {
            throw new Error(`校验和错误: 收到${checksum}, 计算${calculatedChecksum}`);
        }
        
        // 根据消息ID解析参数
        let data = {
            timestamp: Date.now(),
            messageId: messageId.toString(16).toUpperCase(),
            rawData: buffer.toString('hex')
        };
        
        switch (messageId) {
            case 0xA0B00000: // 艇体状态上报
                data = { ...data, ...ProtocolParser.parseHullStatus(params) };
                // 转换为Web端所需格式
                data = ProtocolParser.convertToWebFormat(data, params);
              //  console.log(" 上报数据 ",data);
                break;
            default:
                data.unhandled = true;
                data.paramLength = paramLength;
        }

        return data;
    }

    // 转换为Web端兼容的数据格式
    static convertToWebFormat(parsedData, params) {
        
        let tgps;
        
  
        // console.log("parsedData.Heartbeat",parsedData.Throw_away.Heartbeat);
        // console.log("parsedData.Time_remaining",parsedData.Throw_away.Time_remaining);
        // console.log( "parsedData.attitude.yaw",parsedData.attitude.yaw);
        return {
            type:'normal',
            timestamp: parsedData.timestamp,
            deviceId: parsedData.deviceId,
            lat: parsedData.gps.lat,
            lng: parsedData.gps.lon,
            heading: parsedData.attitude.yaw,
            stateMachine:parsedData.stateMachine,
            speed: parsedData.Inertial_guidance.speed,
            Inertial_guidance_state:parsedData.Inertial_guidance.state,
            signal: null, // 暂无
            depth: parsedData.depth,
            faultCode:parsedData.faultCode,
            g_altitude:parsedData.galtitude,
            Brushlessmotor_position:parsedData.Brushlessmotor_position,
            Throw_away: {
                Throw_away_Heartbeat:parsedData.Throw_away.Heartbeat,
                Throw_away_Time_remaining:parsedData.Throw_away.Time_remaining
            },
            Pullwire:{
                value1  :  parsedData.Pullwire_displacement.Value1,
                value2  :  parsedData.Pullwire_displacement.Value2
            },
            Rudder:{
                left   : parsedData.Rudder_angle.a,
                right  : parsedData.Rudder_angle.b,
                bottom : parsedData.Rudder_angle.c,
                top    : parsedData.Rudder_angle.d,
                thruster :parsedData.thruster.speed
            },
            load_Power:{
                load_Power1 :parsedData.load1_Power,
                load_Power2 :parsedData.load2_Power,
                load_Power3 :parsedData.load3_Power
            },
            // 设备状态映射
            videoStatusMap: { 
                connected: params.readUInt8(36) === 1,
                connectedTime: new Date().toLocaleTimeString(),
                disconnectedTime: new Date().toLocaleTimeString()
            },
            beidouStatusMap: { 
                connected: parsedData.gps.lat !== 0 && parsedData.gps.lng !== 0,
                connectedTime: new Date().toLocaleTimeString(),
                disconnectedTime: new Date().toLocaleTimeString()
            },
            acousticStatusMap: { 
                connected: params.readUInt8(45) === 1,
                connectedTime: new Date().toLocaleTimeString(),
                disconnectedTime: new Date().toLocaleTimeString()
            },
            battery: parsedData.battery.level
        };
    }

    static calculateChecksum(buffer) {
        let checksum = 0;
        for (let i = 0; i < buffer.length; i++) {
            checksum ^= buffer.readUInt8(i);
        }
        return checksum;
    }

    static parseHullStatus(params) {

    // console.log("aaaaaaaaaa",params.slice(36,38));
        return {
            deviceType: "AUV",
            deviceId: "auv1",
            position: {
                x: params.readInt16BE(0) * 0.1,
                y: params.readInt16BE(2) * 0.1,
                z: params.readInt16BE(4) * 0.1
            },
            faultCode: params.readUInt32BE(6),
            stateMachine: params.readUInt8(10),
            depth: params.readUInt16BE(11) * 0.1,
            galtitude: params.readUInt16BE(13) * 0.1,
            attitude: {
                yaw: params.readInt16BE(15)* (180 / 32768) ,
                pitch: params.readInt16BE(17) * (180 / 32768),
                roll: params.readInt16BE(19) * (180 / 32768)
            },
            battery: {
                level: params.readUInt8(21),
                voltage: params.readUInt16BE(22) * 0.1,
                tempFront: params.readUInt8(24),
                tempRear: params.readUInt8(25)
            },
            temperature: {
                electronics: params.readUInt8(26)
            },
            Buoyancy_adjustment_system: params.readUInt8(27),
            gps: {
                lat: params.readFloatBE(28),
                lon: params.readFloatBE(32)
            },
            load1_Power: params.readUInt8(36),
            load2_Power: params.readUInt8(37),
            load3_Power: params.readUInt8(38),
            Throw_away: {
                Heartbeat: params.readFloatBE(39),
                Time_remaining: params.readUInt16BE(40)
            },
            Inertial_guidance: {
                state: params.readUInt8(42),
                speed: params.readUInt8(43)/20
            },
            DVL: {
                state: params.readFloatBE(44)
            },
            acoustic: {
                state: params.readFloatBE(45),
                value: params.readFloatBE(46)
            },
            Beidou: {
                state: params.readFloatBE(47),
                value: params.readFloatBE(48)
            },
            Rudder_angle: {
                a: params.readInt16BE(49)*0.1,
                b: params.readInt16BE(51)*0.1,
                c: params.readInt16BE(53)*0.1,
                d: params.readInt16BE(55)*0.1
            },
            thruster: {
                speed: params.readInt16BE(57)
            },
            Pullwire_displacement: {
                Value1: params.readInt16BE(59),
                Value2: params.readInt16BE(61)
            },
            Brushlessmotor_position: params.readInt16BE(63),
            Waterleak: params.readUInt16BE(65)
        };
    }
}

module.exports = ProtocolParser;