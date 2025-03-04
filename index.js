const express = require('express');
const axios = require('axios');
const app = express();

app.get('/*', async (req, res) => {
  // 如果查询参数中存在 url 则优先使用
  let subUrl = req.query.url;
  if (!subUrl) {
    // 否则从请求路径中获取（去掉最前面的斜杠后进行 URL 解码）
    const encodedUrl = req.path.slice(1);
    if (!encodedUrl) {
      return res.status(400).send('请提供订阅链接（经过 URL 编码），例如：/https%3A%2F%2Flogin.djjc.cfd%2Fapi%2Fv1%2Fclient%2Fsubscribe%3Ftoken%3Dxxx');
    }
    subUrl = decodeURIComponent(encodedUrl);
  }

  try {
    // 从订阅链接获取原始数据
    const response = await axios.get(subUrl, {
      headers: { 'User-Agent': 'Clash Verge' } // 模拟 Clash 请求头
    });
    const rawData = response.data;

    // 如果订阅数据不是 Base64 编码，直接使用原始数据
    let decodedData;
    try {
      decodedData = Buffer.from(rawData, 'base64').toString('utf-8');
      // 检测解码后的数据是否出现乱码，如果有则说明原始数据可能并非 Base64 编码
      if (/�/.test(decodedData)) {
        decodedData = rawData;
      }
    } catch (e) {
      decodedData = rawData;
    }

    // 根据换行拆分订阅内容并解析为节点列表
    const proxies = decodedData.split('\n').filter(line => line.trim()).map(line => {
      const [type, server, port, cipher, password] = line.split('|'); // 根据实际格式调整分割规则
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
