const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const express = require('express');

const SALT_ROUNDS = 10;
const router = express.Router();
let db;

// 初始化数据库
function initializeDatabase(callback) {
    db = new sqlite3.Database('users.db', (err) => {
        if (err) {
            console.error('数据库连接错误:', err.message);
            return callback(err);
        }
        
        console.log('已连接到用户数据库');
        
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                type TEXT NOT NULL,
                controlled_device TEXT DEFAULT NULL
            )
        `, (err) => {
            if (err) {
                console.error('创建用户表错误:', err.message);
                return callback(err);
            }
            
            // 检查用户表是否为空
            db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
                if (err) {
                    console.error('查询用户数错误:', err.message);
                    return callback(err);
                }
                
                if (row.count === 0) {
                    createInitialUsers(callback);
                } else {
                    callback(null);
                }
            });
        });
    });
}

// 创建初始用户
function createInitialUsers(callback) {
    const users =  [
        { username: 'auv1', password: 'auv1pass', type: 'auv', controlled_device: 'auv1' },
        { username: 'auv2', password: 'auv2pass', type: 'auv', controlled_device: 'auv2' },
        { username: 'auv3', password: 'auv3pass', type: 'auv', controlled_device: 'auv3' },
        { username: 'sail1', password: 'sail1pass', type: 'sailboat', controlled_device: 'sailboat1' },
        { username: 'sail2', password: 'sail2pass', type: 'sailboat', controlled_device: 'sailboat2' },
        { username: 'admin', password: 'adpass', type: 'admin', controlled_device: '*' }
    ];
    
    let created = 0;
    
    users.forEach(user => {
        bcrypt.hash(user.password, SALT_ROUNDS, (err, hash) => {
            if (err) {
                console.error(`加密用户${user.username}密码错误:`, err.message);
                return;
            }
            
            db.run(
                "INSERT INTO users (username, password, type, controlled_device) VALUES (?, ?, ?,?)",
                [user.username, hash, user.type, user.controlled_device],
                (err) => {
                    if (err) {
                        console.error(`创建用户${user.username}错误:`, err.message);
                    } else {
                        console.log(`用户${user.username}创建成功`);
                    }
                    
                    created++;
                    if (created === users.length) {
                        callback(null);
                    }
                }
            );
        });
    });
}

// 登录路由
router.post('/login', express.json(), (req, res) => {
    const { username, password } = req.body;
    
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: '数据库错误' });
        }
        
        if (!user) {
            return res.status(401).json({ success: false, message: '用户不存在' });
        }
        
        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: '认证错误' });
            }
            
            if (!result) {
                return res.status(401).json({ success: false, message: '密码错误' });
            }
            
            // 返回用户信息（不包含密码）
            const { password, ...userData } = user;
            res.json({ success: true, 
                 user: {
                ...userData,
                controlled_device: user.controlled_device || user.type // 确保包含此字段
                } });
        });
    });
});

module.exports = {
    router,
    initializeDatabase
};