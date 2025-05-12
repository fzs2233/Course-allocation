<template>
  <div class="about-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <h1>关于课程分配系统</h1>
        </div>
      </template>
      <div class="about-content">
        <h2>系统介绍</h2>
        <p>课程分配系统是一个基于区块链技术的教学资源分配平台，旨在提供公平、透明的课程分配机制。</p>
        
        <h2>主要功能</h2>
        <el-collapse>
          <el-collapse-item title="课程初始化" name="1">
            <p>可以创建课程，设置课程重要性和难度等属性。</p>
          </el-collapse-item>
          <el-collapse-item title="教师注册" name="2">
            <p>教师可以在系统中注册，设置研究方向、发表论文数量，以及课程偏好等信息。</p>
          </el-collapse-item>
          <el-collapse-item title="智能体支持" name="3">
            <p>系统支持智能体辅助教学，提高教学质量和效率。</p>
          </el-collapse-item>
          <el-collapse-item title="班级和学生管理" name="4">
            <p>班级管理员可以管理学生信息，包括学生成绩、课程选择等。</p>
          </el-collapse-item>
          <el-collapse-item title="督导评估" name="5">
            <p>督导可以对教师教学质量进行评估，提供客观、公正的教学质量反馈。</p>
          </el-collapse-item>
        </el-collapse>
        
        <div class="back-button">
          <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'AboutView'
}
</script>

<style scoped>
.about-container {
  max-width: 800px;
  margin: 50px auto;
  padding: 0 20px;
}

.card-header {
  display: flex;
  justify-content: center;
  align-items: center;
}

.about-content {
  text-align: left;
  padding: 0 20px;
}

.about-content h2 {
  margin-top: 20px;
  margin-bottom: 10px;
  color: #409EFF;
}

.back-button {
  margin-top: 30px;
  text-align: center;
}
</style> 