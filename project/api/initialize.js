const express = require('express');
const router = express.Router();
const { initializeData } = require('./register');
const { checkCourseImportance, checkTeacherSuitability } = require('../interact/newinteract');

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

// 获取课程重要程度和智能体适合程度API端点
router.get('/course-importance', async (req, res) => {
  try {
    console.log('获取课程重要程度和智能体适合程度...');
    const courseData = await checkCourseImportance();
    res.json({ code: 0, data: courseData });
  } catch (error) {
    console.error('获取课程重要程度时出错:', error);
    res.status(500).json({ code: -1, message: '获取课程重要程度失败: ' + error.message });
  }
});

// 获取教师对课程适合程度API端点
router.get('/teacher-suitability', async (req, res) => {
  try {
    console.log('获取教师对课程适合程度...');
    const teacherData = await checkTeacherSuitability();
    res.json({ code: 0, data: teacherData });
  } catch (error) {
    console.error('获取教师对课程适合程度时出错:', error);
    res.status(500).json({ code: -1, message: '获取教师对课程适合程度失败: ' + error.message });
  }
});

module.exports = router; 