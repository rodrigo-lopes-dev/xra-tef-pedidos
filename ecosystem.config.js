module.exports = {
  apps: [{
    name: 'xra-autopay-pedidos',
    script: 'backend/dist/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 2930,
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '512M',
  }],
};
