# 小木棒洗衣 · 门店前端

面向洗衣门店员工和管理员的 Vue 3 Web/Electron 客户端，与门店后端配合完成日常业务操作。

## 主要功能

- 门店收衣、价格计算、会员卡与收款记录
- 本机挂单、返洗开单、收衣凭证和衣物标签打印
- 装车送厂、订单回店、逐件扫码与自动上架
- 手机号/取衣码快速取件，支持部分取件
- 衣物查询、补打标签、补收附件和异常回店
- 取衣通知、类别价格维护、营业与收入统计
- 管理员诊断中心与 RabbitMQ 消息任务查看

## 技术栈

Vue 3、Vite 6、Vue Router、Pinia、Element Plus、Axios、Electron。

## 本地运行

要求：Node.js 18+，并先启动端口 `8080` 的门店后端。

```bash
npm install
npm run dev
```

开发地址：<http://localhost:5173>。Vite 会将 `/api` 代理到 `http://localhost:8080`。

如需 Electron 桌面模式：

```bash
npm run electron:dev
```

## 构建

```bash
npm run build
npm run electron:pack
```

Web 产物位于 `dist/`，Windows 安装程序位于 `release/`。桌面版通过 `.env.desktop` 配置 API；Web 生产环境默认使用同域 `/api`。

## 使用说明

- 登录账号由门店后端管理员维护，本仓库不提供生产默认密码。
- 挂单保存在当前电脑浏览器的本地存储中，不会提前生成订单或扣款。
- 公网部署应使用 HTTPS；代码保留了 HTTP 测试环境所需的本地请求 ID 回退。

## 相关仓库

- [门店后端](https://github.com/Easonnnn0038/laundry-backend)
- [工厂后端](https://github.com/Easonnnn0038/laundryfactory_b)
- [工厂前端](https://github.com/Easonnnn0038/laundryfactory_f)
