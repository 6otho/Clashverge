FROM alpine:latest

# 安装 curl 和必要依赖
RUN apk add --no-cache curl

# 下载 Clash Verge 二进制文件（请替换为最新版本下载地址）
RUN curl -L -o /usr/local/bin/clash-verge https://github.com/Kr328/clash-verge/releases/download/v0.15.1/clash-verge-linux-amd64 && \
    chmod +x /usr/local/bin/clash-verge

# 建立配置目录
WORKDIR /root/.config/clash

# 将你的配置文件复制到镜像中（也可以采用挂载方式）
COPY config.json .

# 暴露必要端口（根据你配置中 external_controller 等）
EXPOSE 7890 9090

# 启动 Clash Verge，并指定配置文件路径
CMD ["clash-verge", "-f", "/root/.config/clash/config.json"]
