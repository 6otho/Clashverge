const express = require('express');
const axios = require('axios');
const yaml = require('js-yaml');
const app = express();

app.get('/', async (req, res) => {
  const subUrl = req.query.url;
  if (!subUrl) {
    return res.status(400).send('请提供订阅链接，例如 ?url=你的订阅地址');
  }

  try {
    const response = await axios.get(subUrl, { headers: { 'User-Agent': 'Clash Verge' } });
    const rawData = response.data;

    // 解码 Base64 数据
    const decodedData = Buffer.from(rawData, 'base64').toString('utf-8');
    const lines = decodedData.split('\n').filter(line => line.trim());

    // 解析 Shadowsocks URL
    const proxies = lines.map(line => {
      if (line.startsWith('ss://')) {
        try {
          const url = new URL(line);
          const [cipher, password] = Buffer.from(url.username, 'base64').toString('utf-8').split(':');
          return {
            name: `${url.hostname}:${url.port}`,
            type: 'ss',
            server: url.hostname,
            port: parseInt(url.port),
            cipher: cipher || 'aes-256-gcm',
            password: password
          };
        } catch (error) {
          console.error('解析失败:', line, error);
          return null;
        }
      }
      return null;
    }).filter(proxy => proxy !== null);

    if (proxies.length === 0) {
      return res.status(500).send('未能解析到任何代理信息');
    }

    // 生成 Clash Verge YAML 配置
    const config = {
      port: 7890,
      'socks-port': 7891,
      'allow-lan': true,
      mode: 'Rule',
      'log-level': 'info',
      proxies,
      'proxy-groups': [
        {
          name: 'Auto',
          type: 'url-test',
          proxies: proxies.map(p => p.name),
          url: 'http://www.gstatic.com/generate_204',
          interval: 300
        }
      ],
      rules: ['MATCH,Auto']
    };

    res.set('Content-Type', 'text/yaml');
    res.send(yaml.dump(config));
  } catch (error) {
    res.status(500).send(`转换失败：${error.message}`);
  }
});

module.exports = app;
