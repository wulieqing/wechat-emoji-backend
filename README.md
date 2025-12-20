# wxcloudrun-express

[![GitHub license](https://img.shields.io/github/license/WeixinCloud/wxcloudrun-express)](https://github.com/WeixinCloud/wxcloudrun-express)
![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/WeixinCloud/wxcloudrun-express/express)
![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/WeixinCloud/wxcloudrun-express/sequelize)

微信云托管 Node.js Express 框架模版，实现简单的计数器读写接口，使用云托管 MySQL 读写、记录计数值。

![](https://qcloudimg.tencent-cloud.cn/raw/be22992d297d1b9a1a5365e606276781.png)

## 快速开始

前往 [微信云托管快速开始页面](https://cloud.weixin.qq.com/cloudrun/onekey)，选择相应语言的模板，根据引导完成部署。

## 本地调试
下载代码在本地调试，请参考[微信云托管本地调试指南](https://developers.weixin.qq.com/miniprogram/dev/wxcloudrun/src/guide/debug/)

## 实时开发
代码变动时，不需要重新构建和启动容器，即可查看变动后的效果。请参考[微信云托管实时开发指南](https://developers.weixin.qq.com/miniprogram/dev/wxcloudrun/src/guide/debug/dev.html)

## Dockerfile最佳实践
请参考[如何提高项目构建效率](https://developers.weixin.qq.com/miniprogram/dev/wxcloudrun/src/scene/build/speed.html)

## 项目结构说明

```
.
├── Dockerfile
├── README.md
├── container.config.json
├── db.js
├── index.js
├── index.html
├── package.json
```

- `index.js`：项目入口，实现主要的读写 API
- `db.js`：数据库相关实现，使用 `sequelize` 作为 ORM
- `index.html`：首页代码
- `package.json`：Node.js 项目定义文件
- `container.config.json`：模板部署「服务设置」初始化配置（二开请忽略）
- `Dockerfile`：容器配置文件

## 服务 API 文档

### `GET /api/count`

获取当前计数

#### 请求参数

无

#### 响应结果

- `code`：错误码
- `data`：当前计数值

##### 响应结果示例

```json
{
  "code": 0,
  "data": 42
}
```

#### 调用示例

```
curl https://<云托管服务域名>/api/count
```

### `POST /api/count`

更新计数，自增或者清零

#### 请求参数

- `action`：`string` 类型，枚举值
  - 等于 `"inc"` 时，表示计数加一
  - 等于 `"clear"` 时，表示计数重置（清零）

##### 请求参数示例

```
{
  "action": "inc"
}
```

#### 响应结果

- `code`：错误码
- `data`：当前计数值

##### 响应结果示例

```json
{
  "code": 0,
  "data": 42
}
```

#### 调用示例

```
curl -X POST -H 'content-type: application/json' -d '{"action": "inc"}' https://<云托管服务域名>/api/count
```

## 环境变量配置

### 微信云托管环境变量配置（生产环境）

**重要**：如果您使用微信云托管构建发布，环境变量需要在**微信云托管控制台**的「服务设置」中配置，而不是通过 `.env` 文件。

#### 配置步骤

1. **登录微信云托管控制台**
   - 访问 [微信云托管控制台](https://cloud.weixin.qq.com/)
   - 选择对应的环境和服务

2. **进入服务设置**
   - 在服务列表中，点击目标服务
   - 进入「服务设置」页面
   - 找到「环境变量」配置项

3. **配置环境变量**
   
   可以通过以下两种方式配置：
   
   **方式一：键值对方式**
   - 点击「添加环境变量」
   - 分别输入环境变量的键（Key）和值（Value）
   
   **方式二：JSON 方式**
   - 选择 JSON 格式输入
   - 输入符合 JSON 格式的环境变量配置：
   ```json
   {
     "MYSQL_USERNAME": "your_username",
     "MYSQL_PASSWORD": "your_password",
     "MYSQL_ADDRESS": "host:port",
     "WEIXIN_TOKEN": "your_token",
     "WEIXIN_COOKIE": "your_cookie",
     "WEIXIN_FINGERPRINT": "your_fingerprint",
     "WEIXIN_MINIPROGRAM_APPID": "your_appid",
     "COS_BUCKET": "your_bucket",
     "COS_REGION": "ap-beijing",
     "LOG_FORMAT": "tiny",
     "NODE_ENV": "production"
   }
   ```

4. **保存并发布**
   - 完成配置后，点击「保存」
   - 新的环境变量将在下次发布时生效

#### 必需的环境变量

以下环境变量是应用正常运行所必需的，**必须**在控制台配置：

| 环境变量 | 说明 | 获取方式 |
|---------|------|---------|
| `MYSQL_USERNAME` | MySQL 数据库用户名 | 在云托管控制台 MySQL 页面查看 |
| `MYSQL_PASSWORD` | MySQL 数据库密码 | 在云托管控制台 MySQL 页面查看 |
| `MYSQL_ADDRESS` | MySQL 数据库地址，格式：`host:port` | 在云托管控制台 MySQL 页面查看，例如：`mysql.example.com:3306` |

#### 可选的环境变量

以下环境变量有默认值，可根据业务需要配置：

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `PORT` | 服务器监听端口 | `80` |
| `WEIXIN_TOKEN` | 微信 Token | 空字符串 |
| `WEIXIN_COOKIE` | 微信 Cookie | 空字符串 |
| `WEIXIN_FINGERPRINT` | 微信 Fingerprint | 空字符串 |
| `WEIXIN_REFERER` | 微信 Referer | 有默认值 |
| `WEIXIN_MINIPROGRAM_APPID` | 小程序 AppID | 空字符串 |
| `COS_BUCKET` | 腾讯云 COS 存储桶名称 | 空字符串 |
| `COS_REGION` | 腾讯云 COS 地域（如：`ap-beijing`、`ap-shanghai`） | 空字符串 |
| `LOG_FORMAT` | 日志格式（可选值：`combined`、`common`、`dev`、`short`、`tiny`） | `tiny` |
| `NODE_ENV` | 运行环境（`development` 或 `production`） | `development` |

#### 注意事项

1. **环境变量生效时机**：修改环境变量后，需要重新发布服务才能生效
2. **敏感信息保护**：环境变量中的敏感信息（如密码、Token）不会在代码中暴露
3. **数据库信息获取**：如果使用云托管内 MySQL，可以在控制台 MySQL 页面获取 `MYSQL_USERNAME`、`MYSQL_PASSWORD`、`MYSQL_ADDRESS` 的值

### 本地开发环境配置

如果您需要在本地调试，可以使用 `.env` 文件：

1. **复制环境变量模板文件**：
   ```bash
   cp .env.example .env
   ```

2. **编辑 `.env` 文件**，填入实际的环境变量值（参考 `.env.example` 文件中的说明）

3. **启动应用**：
   ```bash
   npm start
   ```

**注意**：`.env` 文件仅用于本地开发，不会被提交到代码仓库。生产环境的环境变量必须在微信云托管控制台配置。


## License

[MIT](./LICENSE)
