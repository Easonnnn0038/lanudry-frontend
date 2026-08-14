小木棒洗衣门店管理系统 - 前端桌面客户端
基于 Vue 3 + Vite + Electron 的洗衣门店管理系统桌面端，提供收衣登记、会员卡办理、订单跟踪、暂存管理、首页数据统计等一体化门店操作界面。

技术栈
技术	版本	说明
Vue	3.5.13	前端框架（Composition API + <script setup>）
Vue Router	4.5.0	路由管理
Pinia	2.3.0	状态管理
Element Plus	2.9.1	UI 组件库
Axios	1.7.9	HTTP 客户端
Vite	6.0.5	构建工具
Electron	33.2.1	桌面壳（可选）
项目结构

laundry-frontend/
├── electron/
│   ├── main.js                   # Electron 主进程
│   └── preload.js                # 预加载脚本
├── src/
│   ├── api/                      # API 接口封装
│   │   ├── request.js            # Axios 实例（拦截器、Token注入）
│   │   ├── auth.js               # 登录认证接口
│   │   └── index.js              # 业务接口汇总（客户、会员卡、订单、类别、照片）
│   ├── components/
│   │   └── SideMenu.vue          # 侧边栏菜单
│   ├── router/
│   │   └── index.js              # 路由配置与导航守卫
│   ├── stores/
│   │   ├── auth.js               # 登录态 Pinia store（token、用户信息）
│   │   └── permission.js         # 权限 store
│   ├── styles/
│   │   └── global.css            # 全局样式
│   ├── utils/
│   │   └── index.js              # 工具方法（格式化、照片URL）
│   ├── views/
│   │   ├── components/
│   │   │   └── ReceiptPreview.vue # 收衣收据打印预览组件
│   │   ├── Login.vue             # 登录页
│   │   ├── Main.vue              # 主布局（侧边栏 + 内容区）
│   │   ├── Dashboard.vue         # 首页统计看板
│   │   ├── StoreReceive.vue      # 门店收衣（核心流程：5步骤）
│   │   └── StoreStaging.vue      # 暂存订单管理（送厂/回店/取衣）
│   ├── App.vue
│   └── main.js
├── index.html
├── package.json
├── vite.config.js                # Vite 配置（代理、打包）
└── .npmrc
环境要求
Node.js 18+（推荐 20.x LTS）
npm 9+ 或 pnpm 8+
后端服务正常运行：http://localhost:8080
快速开始
1. 安装依赖


# 进入项目目录
cd laundry-frontend

# 安装依赖
npm install
国内用户建议先配置镜像：



npm config set registry https://registry.npmmirror.com
2. 启动开发服务器（浏览器模式）


npm run dev
启动后访问：http://localhost:5173

Vite 开发服务器已配置代理：

/api/** → 转发到 http://localhost:8080 （后端接口）
/photos/** → 转发到 http://localhost:8080 （照片静态资源）
3. （可选）启动 Electron 桌面模式


# 同时启动 Vite + Electron 窗口
npm run electron:dev
4. 打包构建


# 仅前端静态文件打包（输出到 dist/）
npm run build

# 前端构建后启动 Electron 正式模式（用于打包安装包前调试）
npm run electron:build
默认登录账号
用户名	密码	角色
admin	admin123	管理员
employee1	emp123	员工
employee2	emp123	员工
功能模块说明
1. 登录页 (Login.vue)
左右分栏布局（左侧欢迎图 + 右侧登录表单）
账号密码校验 → JWT Token 存储到 Pinia + localStorage
登录成功后根据角色跳转首页
2. 首页看板 (Dashboard.vue)
今日订单数、待取衣件数、本月营收统计
最近订单列表（最近 10 条收衣记录）
数据实时刷新按钮
3. 门店收衣 (StoreReceive.vue) - 核心流程
采用 5 步步骤条引导操作：

步骤	内容	关键校验
① 客户信息	手机号查询老客户 / 录入新客户姓名地址	11 位有效手机号、必填姓名
② 会员卡	老客户显示卡信息/充值；新客户勾选办卡	无卡需先勾选"收衣同时办卡"才能办卡
③ 衣物明细	按类别添加衣物，修改单价/数量，生成每件衣物条码	至少 1 件衣物
④ 瑕疵拍照	拍照或上传瑕疵照片，支持标注瑕疵类型和备注	可选
⑤ 收款	自动计算原价/折扣/加急费/办卡充值/卡扣/补差	办卡/补差必须选择支付方式
收款金额计算逻辑


原价合计 totalAmount
  → 折扣后 actualAmount（按会员卡折扣率 / 固定会员价）
    → 加急费 urgentSurcharge（加急订单：actualAmount × 20%）
      → 应付洗衣费 payableAmount = actualAmount + urgentSurcharge

应收合计 totalReceivable：
  ├─ 使用卡扣支付时 = 办卡金额 + 充值金额 + 补差金额
  └─ 不使用卡扣时 = payableAmount + 办卡金额 + 充值金额

卡扣优先顺序：
  1. 有卡且勾选卡扣 → 余额足够：全额卡扣；余额不足：扣光 + 补差
  2. 办卡成功 / 绑定卡后 → 默认勾选"使用会员卡余额支付"
收据打印预览 (ReceiptPreview.vue)
门店信息、客户信息、会员卡、衣物明细（含条码图）
原价、折扣、加急费、办卡/充值、卡扣、实收、欠款完整展示
支持 A4 尺寸打印（调用浏览器打印）
4. 暂存订单管理 (StoreStaging.vue)
列表视图：展示待送厂/运输中/已回店的订单
筛选：状态、货架号、客户姓名、客户手机号
订单详情弹窗：
衣物明细、瑕疵照片查看
送厂记录、回店记录
批量送厂（选择多条 → 录入工厂批次号）
回店上架（逐件录入货架号）
通知取衣 / 完成取衣
关键工具方法 (src/utils/index.js)
方法	说明
fmt(val)	金额格式化（保留 2 位小数）
dateFmt(val, pattern)	日期格式化（默认 yyyy-MM-dd HH:mm:ss）
photoUrl(relativePath)	照片绝对 URL 生成（自动拼接后端地址）
API 封装 (src/api/)
所有请求通过 request.js 的 Axios 实例统一处理：

请求拦截器：自动携带 Authorization: Bearer <token>
响应拦截器：统一处理 401（跳转登录）、业务错误（ElMessage 提示）、二进制 Blob（照片下载）
基础 URL 前缀：/api
开发配置
修改后端地址
编辑 vite.config.js：

server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:8080',  // 修改为你的后端地址
      changeOrigin: true
    },
    '/photos': {
      target: 'http://localhost:8080',
      changeOrigin: true
    }
  }
}
修改打包后静态资源路径
编辑 vite.config.js 的 base 字段（默认 './'，用于 Electron 内嵌）：



base: './',  // 部署到 Web 服务器子目录时改成对应路径
常用命令速查


npm run dev              # 开发模式（浏览器）
npm run build            # 打包生产静态文件（dist/）
npm run preview          # 本地预览打包结果
npm run electron         # 仅打开 Electron 窗口（需 Vite 已在运行）
npm run electron:dev     # 开发模式 + Electron 窗口
npm run electron:build   # 打包静态文件 + 用生产模式开 Electron
相关仓库
后端项目：laundry-backend
