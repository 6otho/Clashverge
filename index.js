const express = require('express');
const axios = require('axios');
const yaml = require('js-yaml');
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

    // 尝试 Base64 解码，如果解码后出现乱码则认为不是 Base64 编码
    let decodedData;
    try {
      decodedData = Buffer.from(rawData, 'base64').toString('utf-8');
      if (/�/.test(decodedData)) {
        decodedData = rawData;
      }
    } catch (e) {
      decodedData = rawData;
    }

    // 先尝试将解码后的数据当作 YAML 配置文件来解析
    let configFromYaml;
    try {
      configFromYaml = yaml.load(decodedData);
      if (
        typeof configFromYaml === 'object' &&
        configFromYaml !== null &&
        (configFromYaml.proxies || configFromYaml.port || configFromYaml['mixed-port'])
      ) {
        // 如果配置中存在 mixed-port 字段，则替换为 port
        if (configFromYaml['mixed-port'] !== undefined) {
          configFromYaml.port = configFromYaml['mixed-port'];
          delete configFromYaml['mixed-port'];
        }
        res.set('Content-Type', 'text/yaml');
        return res.send(yaml.dump(configFromYaml));
      }
    } catch (err) {
      // 如果解析失败，则说明不是完整的 YAML 配置文件，进入下面自定义格式处理
    }

    // 自定义格式：假设每行一个节点，字段以 | 分隔
    const proxies = decodedData
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split('|');
        if (parts.length < 5) return null;
        const [type, server, port, cipher, password] = parts;
        return {
          name: `${server}-${port}`,
          type: type || 'ss',
          server,
          port: parseInt(port),
          cipher: cipher || 'aes-256-gcm',
          password
        };
      })
      .filter(item => item !== null);

    // 生成新版 Clash 配置文件
    const config = {
      port: 7890,
      'socks-port': 7891,
      'allow-lan': true,
      mode: 'Rule',
      'log-level': 'info',
      proxies: proxies,
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
        'D
