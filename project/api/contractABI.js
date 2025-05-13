const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// 获取合约ABI信息的API端点
router.get('/contract-abi', (req, res) => {
  try {
    // 读取合约ABI文件
    const contractABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../build/contracts/ICourseAllocation.json'), 'utf8')).abi;
    const voteABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../build/contracts/Vote.json'), 'utf8')).abi;
    const studentVoteABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../build/contracts/IStudentVote.json'), 'utf8')).abi;
    const teacherVoteABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../build/contracts/TeacherVote.json'), 'utf8')).abi;
    
    res.json({
      code: 0,
      data: {
        courseAllocationABI: contractABI,
        voteABI: voteABI,
        studentVoteABI: studentVoteABI,
        teacherVoteABI: teacherVoteABI
      }
    });
  } catch (error) {
    console.error('获取合约ABI时出错:', error);
    res.status(500).json({ code: -1, message: '获取合约ABI失败: ' + error.message });
  }
});

module.exports = router; 