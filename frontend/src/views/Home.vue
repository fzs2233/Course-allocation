<template>
  <div class="home-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <h1>课程分配系统</h1>
        </div>
      </template>
      <div v-if="!isConnected" class="connect-section">
        <el-alert
          v-if="connectError"
          :title="connectError"
          type="error"
          show-icon
          :closable="false"
          style="margin-bottom: 20px;"
        />
        <el-button type="primary" @click="connectMetaMask" :loading="connecting">
          连接 MetaMask 钱包
        </el-button>
      </div>
      <div v-else class="init-section">
        <p>当前钱包地址: {{ account }}</p>
        <div class="action-buttons">
          <el-button 
            type="success" 
            @click="initializeData"
            :loading="initializing"
            :disabled="initialized"
          >
            一键初始化系统数据
          </el-button>
          <el-button type="info" @click="$router.push('/about')">关于系统</el-button>
          
          <!-- 添加查看课程重要程度和智能体适合程度的按钮 -->
          <el-button 
            type="primary" 
            @click="getCourseImportance"
            :loading="loadingCourseData"
            :disabled="!initialized"
          >
            查看课程重要程度
          </el-button>
          
          <!-- 添加查看教师对课程适合程度的按钮 -->
          <el-button 
            type="warning" 
            @click="getTeacherSuitability"
            :loading="loadingTeacherData"
            :disabled="!initialized"
          >
            查看教师适合程度
          </el-button>
        </div>
        <el-result 
          v-if="initialized" 
          icon="success" 
          title="初始化成功" 
          sub-title="系统数据已成功初始化，可以开始使用系统功能"
        />
        
        <!-- 课程重要程度和智能体适合程度数据表格 -->
        <div v-if="courseData.length > 0" class="data-table-container">
          <h2>课程重要程度和智能体适合程度</h2>
          <el-table :data="courseData" border style="width: 100%">
            <el-table-column prop="课程ID" label="课程ID" width="100" />
            <el-table-column prop="重要程度" label="重要程度" width="120" />
            <el-table-column prop="智能体1对课程的适合程度" label="智能体1适合程度" />
            <el-table-column prop="智能体2对课程的适合程度" label="智能体2适合程度" />
          </el-table>
        </div>
        
        <!-- 教师对课程适合程度数据表格 -->
        <div v-if="teacherData.length > 0" class="data-table-container">
          <h2>教师对课程适合程度</h2>
          <el-table :data="teacherData" border style="width: 100%">
            <el-table-column prop="课程ID" label="课程ID" width="80" />
            <el-table-column prop="课程名称" label="课程名称" width="200" />
            <el-table-column 
              v-for="(_, index) in getTeacherColumns()" 
              :key="index"
              :prop="'教师' + (index + 1) + ' suit'"
              :label="'教师' + (index + 1)"
            />
          </el-table>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { ethers } from 'ethers'
import api from '../api'

// 导入合约配置
import contractConfig from '../contractConfig'

export default {
  name: 'HomeView',
  setup() {
    const store = useStore()
    const connecting = ref(false)
    const initializing = ref(false)
    const initialized = ref(false)
    const connectError = ref('')
    const loadingCourseData = ref(false)
    const loadingTeacherData = ref(false)
    const courseData = ref([])
    const teacherData = ref([])

    // 获取教师列数（动态生成表头）
    const getTeacherColumns = () => {
      if (teacherData.value.length === 0) return []
      
      // 从第一个课程数据中提取教师数量
      const firstCourse = teacherData.value[0]
      const teacherCount = Object.keys(firstCourse).filter(key => key.includes('教师') && key.includes('suit')).length
      
      return Array(teacherCount).fill(0)
    }

    // 从Vuex获取状态
    const account = computed(() => store.state.account)
    const isConnected = computed(() => store.getters.isConnected)

    // 连接MetaMask
    const connectMetaMask = async () => {
      connecting.value = true
      connectError.value = ''
      
      try {
        const account = await store.dispatch('connectWallet')
        if (!account) {
          connectError.value = '连接钱包失败，请确保已安装MetaMask并已登录'
        }
      } catch (error) {
        console.error('连接钱包错误:', error)
        connectError.value = '连接钱包时发生错误: ' + error.message
      } finally {
        connecting.value = false
      }
    }

    // 初始化系统数据
    const initializeData = async () => {
      initializing.value = true
      try {
        // 检查网络是否为Ganache (ID 1337)
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const network = await provider.getNetwork()
        
        if (network.chainId !== 1337) {
          alert('请连接到Ganache网络')
          initializing.value = false
          return
        }

        // 调用后端API初始化数据
        const response = await api.initializeData()
        console.log('初始化结果:', response)
        
        if (response.code === 0) {
          initialized.value = true
          store.commit('setInitialized', true)
        } else {
          alert('初始化失败: ' + response.message)
        }
      } catch (error) {
        console.error('初始化系统数据错误:', error)
        alert('初始化系统数据时发生错误: ' + error.message)
      } finally {
        initializing.value = false
      }
    }
    
    // 获取课程重要程度和智能体适合程度
    const getCourseImportance = async () => {
      loadingCourseData.value = true
      try {
        const response = await api.getCourseImportance()
        console.log('课程重要程度数据:', response)
        
        if (response.code === 0) {
          courseData.value = response.data
        } else {
          alert('获取课程重要程度失败: ' + response.message)
        }
      } catch (error) {
        console.error('获取课程重要程度错误:', error)
        alert('获取课程重要程度时发生错误: ' + error.message)
      } finally {
        loadingCourseData.value = false
      }
    }
    
    // 获取教师对课程适合程度
    const getTeacherSuitability = async () => {
      loadingTeacherData.value = true
      try {
        const response = await api.getTeacherSuitability()
        console.log('教师对课程适合程度数据:', response)
        
        if (response.code === 0) {
          teacherData.value = response.data
        } else {
          alert('获取教师对课程适合程度失败: ' + response.message)
        }
      } catch (error) {
        console.error('获取教师对课程适合程度错误:', error)
        alert('获取教师对课程适合程度时发生错误: ' + error.message)
      } finally {
        loadingTeacherData.value = false
      }
    }

    // 组件挂载时执行
    onMounted(async () => {
      // 如果已经有MetaMask连接，则自动连接
      if (window.ethereum && window.ethereum.selectedAddress) {
        await connectMetaMask()
      }
    })

    return {
      connectMetaMask,
      initializeData,
      getCourseImportance,
      getTeacherSuitability,
      getTeacherColumns,
      courseData,
      teacherData,
      account,
      isConnected,
      connecting,
      initializing,
      initialized,
      loadingCourseData,
      loadingTeacherData,
      connectError
    }
  }
}
</script>

<style scoped>
.home-container {
  max-width: 800px;
  margin: 50px auto;
  padding: 0 20px;
}

.card-header {
  display: flex;
  justify-content: center;
  align-items: center;
}

.connect-section, .init-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px 0;
}

.action-buttons {
  display: flex;
  gap: 15px;
  margin: 20px 0;
}

.data-table-container {
  margin-top: 30px;
  width: 100%;
}

.data-table-container h2 {
  margin-bottom: 15px;
  text-align: center;
}
</style> 