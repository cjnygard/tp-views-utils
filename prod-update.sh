pm2 delete tp-views && rm -r build && npm install && NODE_ENV=production npm run build && pm2 start process.json