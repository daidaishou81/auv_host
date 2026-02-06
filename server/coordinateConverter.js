// server/coordinateConverter.js
const turf = require('@turf/turf');

// 固定的参考点坐标
const FIXED_REFERENCE_POINT = {
    lat: 22.373987,
     lng: 113.611778
};
//新安江 lat: 29.487764,
//   lng: 119.216713
//珠海    lat: 22.373987,
    // lng: 113.611778

/**
 * 将经纬度转换为相对坐标（以固定参考点为原点）
 * @param {number} lat - 目标纬度（度）
 * @param {number} lon - 目标经度（度）
 * @returns {Object} 包含x和y坐标的对象（单位：米）
 */
function convertToRelativeCoords(lat, lon) {
    // 验证参数是否为有效数字
    if (typeof lat !== 'number' || typeof lon !== 'number' || 
        isNaN(lat) || isNaN(lon)) {
        console.error('Invalid coordinates provided:', {lat, lon});
        return { x: 0, y: 0 };
    }
    
    try {
        // 创建参考点和目标点的Turf点对象
        const refPoint = turf.point([FIXED_REFERENCE_POINT.lng, FIXED_REFERENCE_POINT.lat]);
        const targetPoint = turf.point([lon, lat]);
        //targetPoint =  turf.point([121.99191, 30.108829]);
        // 计算从参考点到目标点的方位角（角度制）
        let bearing = turf.bearing(refPoint ,targetPoint);
         let adjustedBearing = (90 - bearing) % 360;
        if (adjustedBearing < 0) {adjustedBearing += 360;}
        //console.log("jiaodu",adjustedBearing);
        // 计算两点间的距离（米）
        const distance = turf.distance(targetPoint,refPoint,  { units: 'meters' });
        //console.log("juli",distance);
        // 将极坐标转换为笛卡尔坐标
        const angleRad = adjustedBearing * Math.PI / 180;
        //console.log("angleRad",angleRad);
        const x = distance * Math.sin(angleRad);
        const y = distance * Math.cos(angleRad);
        
        return { x, y };
    } catch (error) {
        console.error('Error in coordinate conversion:', error);
        return { x: 0, y: 0 };
    }
}

/**
 * 转换一组经纬度点为相对坐标（以固定参考点为原点）
 * @param {Array} points - 路径点数组，格式: [{lat, lng, ...}, ...]
 * @returns {Array} 转换后的点数组，添加了x, y相对坐标
 */
function convertPathPoints(points) {
    if (!points || points.length === 0) return [];
    
    return points.map((point, index) => {
        // 验证当前点坐标
        if (typeof point.lat !== 'number' || typeof point.lng !== 'number' ||
            isNaN(point.lat) || isNaN(point.lng)) {
            console.error('Invalid point coordinates at index', index, ':', point);
            return {
                ...point,
                x: 0,
                y: 0
            };
        }
        
        const { x, y } = convertToRelativeCoords(
            point.lat,
            point.lng
        );
        
        return {
            ...point,
            x: parseFloat(x.toFixed(3)), // 保留3位小数
            y: parseFloat(y.toFixed(3))
        };
    });
}

module.exports = {
    convertPathPoints
};