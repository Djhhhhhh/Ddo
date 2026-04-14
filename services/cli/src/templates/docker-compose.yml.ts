/**
 * Docker Compose 配置模板
 */

import type { DdoConfig } from '../types';
import { prettyPath } from '../utils/paths';

/**
 * 生成 Docker Compose 配置内容
 */
export function generateDockerCompose(config: DdoConfig): string {
  const mysqlDataPath = prettyPath(`${config.dataDir}/data/mysql`);

  const compose = {
    version: '3.8',
    services: {
      mysql: {
        image: 'mysql:8.0',
        container_name: 'ddo-mysql',
        restart: 'unless-stopped',
        ports: [`${config.database.port}:3306`],
        environment: {
          MYSQL_ROOT_PASSWORD: config.database.password,
          MYSQL_DATABASE: config.database.name,
          MYSQL_USER: config.database.user,
          MYSQL_PASSWORD: config.database.password,
          TZ: 'Asia/Shanghai',
        },
        volumes: [`${mysqlDataPath}:/var/lib/mysql`],
        command: [
          '--default-authentication-plugin=mysql_native_password',
          '--character-set-server=utf8mb4',
          '--collation-server=utf8mb4_unicode_ci',
        ],
        healthcheck: {
          test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost', '-u', 'root', `-p${config.database.password}`],
          interval: '5s',
          timeout: '3s',
          retries: 5,
          start_period: '30s',
        },
      },
    },
  };

  // 手动生成 YAML 以控制格式
  return `version: "3.8"

services:
  mysql:
    image: mysql:8.0
    container_name: ddo-mysql
    restart: unless-stopped
    ports:
      - "${config.database.port}:3306"
    environment:
      MYSQL_ROOT_PASSWORD: ${config.database.password}
      MYSQL_DATABASE: ${config.database.name}
      MYSQL_USER: ${config.database.user}
      MYSQL_PASSWORD: ${config.database.password}
      TZ: Asia/Shanghai
    volumes:
      - "${mysqlDataPath}:/var/lib/mysql"
    command:
      - --default-authentication-plugin=mysql_native_password
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${config.database.password}"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 30s
`;
}
