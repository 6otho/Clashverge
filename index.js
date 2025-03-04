const express = require('express');
const axios = require('axios');
const app = express();

app.get('/', async (req, res) => {
  const subUrl = req.query.url; // 从 URL 参数获取订阅链接
  if (!subUrl) {
    return res.status(400).send('请提供订阅链接，例如 ?url=你的订阅地址');
  }

  try {
    // 从订阅链接获取原始数据
    const response = await axios.get(subUrl, {
      headers: { 'User-Agent': 'Clash Verge' } // 模拟 Clash 请求头
    });
    const rawData = response.data;

    // 假设订阅是 Base64 编码的节点列表（常见格式），解码并转为 YAML
    const decodedData = Buffer.from(rawData, 'base64').toString('utf-8');
    const proxies = decodedData.split('\n').filter(line => line.trim()).map(line => {
      const [type, server, port, cipher, password] = line.split('|'); // 根据实际格式调整
      return {
        name: `${server}-${port}`,
        type: type || 'ss',
        server,
        port: parseInt(port),
        cipher: cipher || 'aes-256-gcm',
        password
      };
    });

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
      rules: [
        'DOMAIN-SUFFIX,google.com,Auto',
        'GEOIP,CN,DIRECT',
        'MATCH,Auto'
      ]
    };

    res.set('Content-Type', 'text/yaml');
    res.send(require('js-yaml').dump(config));
  } catch (error) {
    res.status(500).send(`转换失败：${error.message}`);
  }
});

module.exports = app;
