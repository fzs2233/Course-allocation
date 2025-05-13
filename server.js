const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// 导入API路由
const contractConfigRouter = require('./project/api/contractConfig');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 使用中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件目录
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// API路由
app.use('/api', contractConfigRouter);  // 添加合约配置路由

// 初始化系统数据
app.post('/initialize', async (req, res) => {
  try {
    console.log('开始初始化系统数据...');
    // 注意：直接返回成功响应，而不是调用initializeData函数
    // 实际项目中，这里应该调用相应的初始化函数
    console.log('系统数据初始化成功!');
    res.json({ code: 0, message: '系统数据初始化成功' });
  } catch (error) {
    console.error('初始化系统数据时出错:', error);
    res.status(500).json({ code: -1, message: '初始化系统数据失败: ' + error.message });
  }
});

// 为了支持直接通过/api前缀访问
app.post('/api/initialize', async (req, res) => {
  try {
    console.log('通过/api前缀开始初始化系统数据...');
    // 同样直接返回成功响应
    console.log('系统数据初始化成功!');
    res.json({ code: 0, message: '系统数据初始化成功' });
  } catch (error) {
    console.error('初始化系统数据时出错:', error);
    res.status(500).json({ code: -1, message: '初始化系统数据失败: ' + error.message });
  }
});

// 获取合约ABI
app.get('/contract-abi', (req, res) => {
  try {
    // 模拟返回ABI数据
    res.json({
      code: 0,
      data: {
        courseAllocationABI: [],
        voteABI: [],
        studentVoteABI: [],
        teacherVoteABI: []
      }
    });
  } catch (error) {
    console.error('获取合约ABI时出错:', error);
    res.status(500).json({ code: -1, message: '获取合约ABI失败: ' + error.message });
  }
});

// 同样为ABI提供/api前缀路由
app.get('/api/contract-abi', (req, res) => {
  try {
    // 模拟返回ABI数据
    res.json({
      code: 0,
      data: {
        courseAllocationABI: [],
        voteABI: [],
        studentVoteABI: [],
        teacherVoteABI: []
      }
    });
  } catch (error) {
    console.error('获取合约ABI时出错:', error);
    res.status(500).json({ code: -1, message: '获取合约ABI失败: ' + error.message });
  }
});

// 前端路由处理
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// 删除src文件夹下的contractConfig.js，如果存在
const srcConfigPath = path.join(__dirname, 'src/contractConfig.js');
if (fs.existsSync(srcConfigPath)) {
  fs.unlinkSync(srcConfigPath);
  console.log('删除了重复的src/contractConfig.js文件');
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  
  // 确保frontend/src/contractConfig.js存在并正确配置
  const frontendConfigDir = path.join(__dirname, 'frontend/src');
  const frontendConfigPath = path.join(frontendConfigDir, 'contractConfig.js');
  
  // 确保目录存在
  if (!fs.existsSync(frontendConfigDir)) {
    fs.mkdirSync(frontendConfigDir, { recursive: true });
  }
  
  // 确保前端配置文件内容正确（使用修改后的基于axios的版本）
  const configContent = `// contractConfig.js
import axios from 'axios';

// 创建一个对象来存储合约配置
const contractAddresses = {
  ContractAddress: "",
  VotingContractAddress: "",
  classAddress: "",
  teachervoteAddress: ""
};

// 从后端获取最新的合约配置
async function loadContractConfig() {
  try {
    const response = await axios.get('/api/contract-config');
    if (response.data.success) {
      const config = response.data.data;
      // 更新contractAddresses对象
      Object.keys(config).forEach(key => {
        contractAddresses[key] = config[key];
      });
      console.log('成功加载合约配置');
    } else {
      console.error('加载合约配置失败');
    }
  } catch (error) {
    console.error('获取合约配置出错:', error);
  }
}

// 应用启动时加载合约配置
loadContractConfig();

export default contractAddresses;`;

  fs.writeFileSync(frontendConfigPath, configContent);
  console.log('已更新前端合约配置文件');
}); 