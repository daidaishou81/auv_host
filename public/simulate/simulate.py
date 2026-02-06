import socket
import struct
import time
import random

# UDP服务器配置
UDP_HOST = '192.168.0.201'  # 服务器IP地址
UDP_PORT = 18003  # 服务器端口


def calculate_checksum(data):
    """计算校验和（按字节异或）"""
    checksum = 0
    for byte in data:
        checksum ^= byte
    return checksum


def create_hull_status_report():
    """创建艇体状态上报数据包"""
    # 协议固定部分
    header = bytes.fromhex('AA BB')  # 帧头
    version = bytes([0x01])  # 版本号
    message_id = bytes.fromhex('A0 B0 00 00')  # 消息ID

    # 参数部分 (44字节)
    params = bytearray(44)

    # 填充模拟数据
    # 位置 (X, Y, Z)
    struct.pack_into('>h', params, 0, int(random.uniform(-100, 100) * 10))  # X (单位0.1m)
    struct.pack_into('>h', params, 2, int(random.uniform(-100, 100) * 10))  # Y
    struct.pack_into('>h', params, 4, int(random.uniform(-50, 0) * 10))  # Z

    # 故障码 (随机0-3种故障)
    fault_code = random.choice([
        0x00000000,
        0x00000001,  # 定位心跳丢失
        0x00000002,  # DVL心跳丢失
        0x00000004,  # 深度高度计心跳丢失
        0x00000001 | 0x00000002  # 组合故障
    ])
    struct.pack_into('>I', params, 6, fault_code)

    # 状态机 (0-5)
    params[10] = random.randint(0, 5)

    # 深度和高度
    struct.pack_into('>H', params, 11, int(random.uniform(5, 50) * 10))  # 深度 (0.1m)
    struct.pack_into('>H', params, 13, int(random.uniform(1, 10) * 10))  # 高度 (0.1m)

    # 姿态 (偏航角、俯仰角、横滚角)
    struct.pack_into('>h', params, 15, int(random.uniform(0, 30) * (65536 / 180)))  # 偏航角
    struct.pack_into('>h', params, 17, int(random.uniform(-10, 10) * (65536 / 180)))  # 俯仰角
    struct.pack_into('>h', params, 19, int(random.uniform(-5, 5) * (65536 / 180)))  # 横滚角

    # 电池信息
    params[21] = random.randint(50, 100)  # 电量百分比
    struct.pack_into('>H', params, 22, random.randint(450, 500))  # 电压 (0.1V)
    params[24] = random.randint(20, 30)  # 电池前温度
    params[25] = random.randint(20, 30)  # 电池后温度

    # 电子舱温度
    params[26] = random.randint(25, 35)

    # GPS位置 (模拟深圳附近海域)
    struct.pack_into('>f', params, 28, 22.5432 + random.uniform(-0.01, 0.01))  # 纬度
    struct.pack_into('>f', params, 32, 114.1234 + random.uniform(-0.01, 0.01))  # 经度

    # 设备状态
    params[36] = random.randint(0, 1)  # 载荷1断电情况
    params[37] = random.randint(0, 1)  # 载荷2断电情况
    params[38] = random.randint(0, 1)  # 载荷3断电情况
    params[39] = random.randint(0, 1)  # 抛载状态
    struct.pack_into('>H', params, 40, random.randint(0, 100))  # 抛载剩余时间
    params[42] = random.randint(0, 1)  # 惯导状态
    params[43] = random.randint(0, 1)  # 惯导合速度

    # 计算消息长度 (帧头到帧尾的总长度)
    # 固定部分长度: 帧头(2) + 版本(1) + 长度字段(2) + 消息ID(4) + 参数(44) + 校验(1) + 帧尾(2) = 56字节
    message_length = struct.pack('>H', 56)

    # 构造未加校验和的数据包
    packet_without_checksum = header + version + message_length + message_id + bytes(params)

    # 计算校验和
    checksum = calculate_checksum(packet_without_checksum)

    # 添加校验和和帧尾
    full_packet = packet_without_checksum + bytes([checksum]) + bytes.fromhex('EE FF')

    return full_packet


def send_heartbeat():
    """创建并发送心跳包"""
    header = bytes.fromhex('AA BB')
    version = bytes([0x01])
    message_length = struct.pack('>H', 12)  # 心跳包固定长度
    message_id = bytes.fromhex('B0 A0 00 03')  # 心跳消息ID

    # 构造未加校验和的数据包
    packet_without_checksum = header + version + message_length + message_id

    # 计算校验和
    checksum = calculate_checksum(packet_without_checksum)

    # 添加校验和和帧尾
    full_packet = packet_without_checksum + bytes([checksum]) + bytes.fromhex('EE FF')

    return full_packet

def real():
     full_packet = bytes.fromhex('AA BB 01 00 4E A0 B0 00 00 00 00 00 00 00 00 00 80 00 01 00 00 00 00 64 00 00 00 00 00 00 42 01 E0 64 0A 14 00 41 F0 00 00 42 DE 00 00 10 04 0C 00 00 3C 00 00 00 00 00 00 00 00 32 00 32 00 32 00 32 00 00 00 1E 00 1E 00 00 00 7B EE FF')
     return full_packet


def main():
    """主函数：发送模拟数据到UDP服务器"""
    try:
        # 创建UDP套接字
        client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        print(f"准备发送数据到UDP服务器 {UDP_HOST}:{UDP_PORT}")

        # 持续发送数据
        packet_count = 0
        while True:
            packet = real()
            print(f"发送艇体状态包 ({len(packet)}字节)")

            # 发送数据
            client_socket.sendto(packet, (UDP_HOST, UDP_PORT))

            # 随机间隔0.5-2秒
            time.sleep(random.uniform(0.5, 2))

    except Exception as e:
        print(f"发送数据时发生错误: {e}")
    except KeyboardInterrupt:
        print("\n模拟器已停止")
    finally:
        client_socket.close()


if __name__ == "__main__":
    main()