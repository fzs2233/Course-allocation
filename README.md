# 课程分配系统

基于区块链技术的课程分配系统，使用Truffle框架和Vue.js前端开发。

## 系统架构

- 后端: Truffle + Solidity + Node.js
- 前端: Vue.js 3 + Element Plus
- 区块链: Ethereum (Ganache本地测试网络)

## 功能特点

- 课程初始化与管理
- 教师、智能体、班级、学生和督导的注册管理
- 基于智能合约的透明课程分配机制
- 用户友好的前端界面

## 安装与运行

### 前提条件

- Node.js v14+
- Truffle v5.0+
- Ganache (GUI或CLI)
- MetaMask浏览器插件

### 安装步骤

1. 克隆项目
```
git clone <项目仓库URL>
cd Course-allocation
```

2. 安装依赖
```
npm run setup
```

3. 启动Ganache
   - 打开Ganache应用
   - 创建一个新的工作区
   - 确保RPC服务器运行在`http://127.0.0.1:7545`

4. 编译和部署智能合约
```
cd project
truffle compile
truffle migrate --reset
```

5. 更新合约地址
   - 将合约部署后的地址更新到`frontend/src/contractConfig.js`文件中

### 运行项目

启动前端和后端服务:
```
# 启动后端服务器
node server.js

# 另一个终端中启动前端
cd frontend && npm run serve
```

或者使用npm脚本同时启动:
```
npm run dev
```

前端将在 http://localhost:8080 上运行，后端API在 http://localhost:3000 上运行。

## 使用说明

1. 连接MetaMask:
   - 在MetaMask中配置Ganache网络(RPC URL: http://127.0.0.1:7545, Chain ID: 1337)
   - 导入Ganache中的一个账户
   - 在前端页面点击"连接MetaMask钱包"

2. 初始化系统:
   - 连接钱包后点击"一键初始化系统数据"按钮
   - 系统将自动创建课程、教师和学生等数据

## 项目结构

```
Course-allocation/
├── frontend/               # 前端Vue项目
│   ├── public/             # 静态资源
│   └── src/                # 前端源码
│       ├── api/            # API接口
│       ├── assets/         # 资源文件
│       ├── components/     # 组件
│       ├── router/         # 路由
│       ├── store/          # Vuex状态管理
│       ├── utils/          # 工具函数
│       └── views/          # 页面视图
├── project/                # Truffle项目
│   ├── api/                # 后端API
│   ├── build/              # 编译后的合约
│   ├── contracts/          # 智能合约
│   ├── interact/           # 交互脚本
│   └── migrations/         # 部署脚本
├── server.js               # 后端服务器
└── package.json            # 项目配置
```

## 注意事项

- 本系统仅供教育和演示目的使用
- 在部署到生产环境前请进行安全审计
- 项目不再使用.env.visible配置文件，所有配置通过contractConfig.js处理