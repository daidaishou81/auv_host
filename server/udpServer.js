const dgram = require('dgram');

function createUDPServer(messageQueue) {
    const UDP_PORT = 18003;
    const UDP_HOST = '192.168.0.202';
    
    const udpServer = dgram.createSocket('udp4');
    
    udpServer.on('message', (data, rinfo) => {
       // console.log(`UDP客户端连接: ${rinfo.address}:${rinfo.port}`);
       // console.log(data);
        let buffer = data;
        
        while (buffer.length > 0) {
            if (buffer.length < 4) return;
            
            if (buffer.readUInt16BE(0) !== 0xAABB) {
                buffer = buffer.slice(1);
                continue;
            }
            const messageLength = buffer.readUInt16BE(3);
            if (messageLength < 11 || messageLength > 1024) {
                buffer = buffer.slice(2);
                console.error(`无效消息长度: ${messageLength}`);
                continue;
            }
            
            const totalPacketLength = messageLength;
            if (buffer.length < totalPacketLength) {
                return;
            }
            
            const packet = buffer.slice(0, totalPacketLength);
            buffer = buffer.slice(totalPacketLength);
            if (packet.readUInt16BE(totalPacketLength - 2) !== 0xEEFF) {
                console.error('无效帧尾，丢弃数据包');
                continue;
            }
            //console.log(" 收到数据数据 ");
            messageQueue.enqueue(packet);
        }
    });
    
    udpServer.on('error', (err) => {
        console.error(`UDP服务器错误: ${err.message}`);
    });
    
    udpServer.on('listening', () => {
        const address = udpServer.address();
        console.log(`UDP服务器监听 ${address.address}:${address.port}`);
    });

    udpServer.bind(UDP_PORT, UDP_HOST);

    return udpServer;
}

module.exports = createUDPServer;