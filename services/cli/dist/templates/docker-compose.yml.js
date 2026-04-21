"use strict";
/**
 * Docker Compose 配置模板
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDockerCompose = generateDockerCompose;
/**
 * 生成 Docker Compose 配置内容
 */
function generateDockerCompose(config) {
    return `version: "3.8"

services:
  # 当前默认使用本地 SQLite 文件数据库，无需数据库容器。
  # 如需为其他服务补在充容器，可此文件中继续扩展。
  placeholder:
    image: alpine:3.20
    container_name: ddo-placeholder
    command: ["sh", "-c", "echo Ddo uses SQLite at ${config.database.path} by default && sleep infinity"]
`;
}
//# sourceMappingURL=docker-compose.yml.js.map