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
        </div>
        <el-result 
          v-if="initialized" 
          icon="success" 
          title="初始化成功" 
          sub-title="系统数据已成功初始化，可以开始使用系统功能"
        />
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
      account,
      isConnected,
      connecting,
      initializing,
      initialized,
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
</style> 