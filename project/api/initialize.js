const express = require('express');
const router = express.Router();
const { initializeData } = require('./register');

// 初始化系统数据API端点
router.post('/initialize', async (req, res) => {
  try {
    console.log('开始初始化系统数据...');
    // 调用register.js中的initializeData函数进行真正的初始化
    await initializeData();
    console.log('系统数据初始化成功!');
    res.json({ code: 0, message: '系统数据初始化成功' });
  } catch (error) {
    console.error('初始化系统数据时出错:', error);
    res.status(500).json({ code: -1, message: '初始化系统数据失败: ' + error.message });
  }
});

module.exports = router; 