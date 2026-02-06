// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'my-server',
    script: 'server.js',
    watch: false,
    exec_mode: 'fork',
    node_args: '--max-semi-space-size=64 --max-old-space-size=4096'
    // 其他配置...
  }]
};