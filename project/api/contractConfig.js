const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// 获取合约配置信息的API端点
router.get('/contract-config', (req, res) => {
  try {
    // 从interact/contractConfig.js读取合约配置
    const configPath = path.join(__dirname, '../interact/contractConfig.js');
    // 删除require缓存，确保每次都获取最新配置
    delete require.cache[require.resolve(configPath)];
    const contractConfig = require(configPath);
    
    res.json({
      success: true,
      data: contractConfig
    });
  } catch (error) {
    console.error('获取合约配置出错:', error);
    res.status(500).json({
      success: false,
      message: '获取合约配置出错'
    });
  }
});

module.exports = router; 