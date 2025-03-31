const { ethers } = require("ethers");
const fs = require("fs");
require('dotenv').config({ path: './interact/.env' });
const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:7545");
const inquirer = require('inquirer');

// 读取 JSON 文件
const contractData = JSON.parse(fs.readFileSync("./build/contracts/ICourseAllocation.json", "utf8"));
const voteData = JSON.parse(fs.readFileSync("./build/contracts/Vote.json", "utf8"));
const classData = JSON.parse(fs.readFileSync("./build/contracts/IStudentVote.json", "utf8"));

// 提取合约地址和 ABI
const contractAddress = process.env.contractAddress;
const voteAddress = process.env.VotingContractAddress;
const classContractAddress = process.env.classAddress;
const contractABI = contractData.abi;
const voteABI = voteData.abi;
const classABI = classData.abi;

// 设置提供者（使用 Infura 或本地节点）
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

// 当前登录的账户
let currentSigner = provider.getSigner(0);
let currentName = "account_0";
// 创建合约实例
let contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
let voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
let classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);


// [保留原有的合约初始化代码...]
const  {
    initializeData,
    init_TeacherCourses,
    init_AgentCourses,
    getTeacherCostPerformance,
    getAgentCostPerformance,
    printAssignments,
    machineVoting,
    transferCourse,
    checkCourseConflicts,
    preprocessConflictCourses,
    createConflictProposal
} = require("../api/courseAllocation.js");

/* 交互菜单系统 */
async function mainMenu() {
  const choices = [
    { name: '切换用户', value: 'switchUser'},
    { name: '初始化课程分配', value: 'initAllocation' },
    { name: '查看课程分配情况', value: 'viewAssignments' },
    { name: '创建课程提案', value: 'createProposal' },
    { name: '执行机器投票', value: 'machineVote' },
    { name: '查询教师性价比', value: 'teacherCost' },
    { name: '转移课程所有权', value: 'transferCourse' },
    { name: '处理课程冲突', value: 'resolveConflict' },
    { name: '退出', value: 'exit' }
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: `[${currentName}] 请您选择操作:`,
      choices
    }
  ]);
  console.log(action);
  switch (action) {
    case'switchUser':
      await switchUser();
      break;
    case 'initAllocation':
      await handleInitAllocation();
      break;
    case 'viewAssignments':
      await printAssignments();
      break;
    case 'createProposal':
      await handleCreateProposal();
      break;
    case 'machineVote':
      await machineVoting();
      break;
    case 'teacherCost':
      await handleCostPerformance();
      break;
    case 'transferCourse':
      await handleTransferCourse();
      break;
    case 'resolveConflict':
      await handleConflictResolution();
      break;
    case 'exit':
      process.exit();
  }

  mainMenu(); // 循环显示菜单
}

async function switchUser(){
    const { userType, userName } = await inquirer.prompt([
        {
          type: 'list',
          name: 'userType',
          message: '您的身份类型:',
          choices: [
            { name: '教师', value: 'Teacher' },
            { name: '智能体', value: 'Agent' },
            { name: '班级', value: 'Class' },
            { name: '学生', value: 'Student' },
          ]
        },
        {
          type: 'string',
          name: 'userName',
          message: '输入您的姓名:',
        }
      ]);

    let teacherIds = await contract.getTeacherIds();
    let agentIds = await contract.getAgentIds();
    let classIds = await classContract.getClassIds();
    let studentIds = await classContract.getStudentIds();
    teacherIds = teacherIds.map( id => id.toNumber() );
    agentIds = agentIds.map( id => id.toNumber() );
    classIds = classIds.map( id => id.toNumber() );
    studentIds = studentIds.map( id => id.toNumber() );

    // 按身份类型进行验证
    if (userType === 'Teacher') {
        await loginWithIdentity('Teacher', teacherIds, userName, '切换为教师');
    } else if (userType === 'Agent') {
        await loginWithIdentity('Agent', agentIds, userName, '切换为智能体');
    } else if (userType === 'Class') {
        await loginWithIdentity('Class', classIds, userName, '切换为班级');
    } else if (userType === 'Student') {
        await loginWithIdentity('Student', studentIds, userName, '切换为学生');
    } else {
        console.log('未知身份类型');
    }

}

// 登录通用函数
async function loginWithIdentity(identityType, ids, userName, message) {
    for (const id of ids) {
        const user = await contract[identityType.toLowerCase() + 's'](id);
        if (user.name === userName) {
            currentSigner = provider.getSigner(id);
            contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
            voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
            classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
            currentName = user.name;
            console.log(`${message} ${user.name} 成功`);
            return true;
        }
    }
    return false;
}

/* 处理初始化分配 */
async function handleInitAllocation() {
  const { type } = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: '选择初始化类型:',
      choices: [
        { name: '教师课程分配', value: 'teacher' },
        { name: '智能体课程分配', value: 'agent' }
      ]
    }
  ]);

  try {
    const result = type === 'teacher' 
      ? await init_TeacherCourses()
      : await init_AgentCourses();
    
    console.log('分配结果:');
    console.table(result);
  } catch (error) {
    console.error('初始化失败:', error);
  }
}

/* 处理性价比查询 */
async function handleCostPerformance() {
  const { targetType, targetId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'targetType',
      message: '查询对象类型:',
      choices: [
        { name: '教师', value: 'teacher' },
        { name: '智能体', value: 'agent' }
      ]
    },
    {
      type: 'number',
      name: 'targetId',
      message: '输入查询对象ID:',
      validate: input => input > 0 || 'ID必须大于0'
    }
  ]);

  try {
    const result = targetType === 'teacher'
      ? await getTeacherCostPerformance(targetId)
      : await getAgentCostPerformance(targetId);
    
    if (result.code === 0) {
      console.table(result.data.costPerformance.map((cp, i) => ({
        课程ID: i+1,
        性价比: cp.toFixed(4)
      })));
    } else {
      console.error('查询失败:', result.message);
    }
  } catch (error) {
    console.error('查询错误:', error);
  }
}

/* 处理课程转移 */
async function handleTransferCourse() {
  const answers = await inquirer.prompt([
    {
      type: 'number',
      name: 'courseId',
      message: '输入要转移的课程ID (1-10):',
      validate: input => input >= 1 && input <= 10 || '请输入1-10的课程ID'
    },
    {
      type: 'list',
      name: 'targetType',
      message: '转移目标类型:',
      choices: [
        { name: '教师', value: 'teacher' },
        { name: '智能体', value: 'agent' }
      ]
    },
    {
      type: 'number',
      name: 'targetId',
      message: '输入目标对象ID:',
      validate: input => input > 0 || 'ID必须大于0'
    }
  ]);

  try {
    const result = await transferCourse(
      answers.courseId,
      answers.targetId,
      answers.targetType
    );
    
    console.log(result.message);
    if (result.performanceImprovement) {
      console.log(`性价比提升: ${result.performanceImprovement}`);
    }
  } catch (error) {
    console.error('转移失败:', error.message);
  }
}

/* 处理冲突解决 */
async function handleConflictResolution() {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '选择冲突处理方式:',
      choices: [
        { name: '自动检测并处理冲突', value: 'auto' },
        { name: '手动创建冲突提案', value: 'manual' }
      ]
    }
  ]);

  if (action === 'auto') {
    const conflicts = await checkCourseConflicts();
    console.log(conflicts);
    if (conflicts !== '无课程冲突') {
      await preprocessConflictCourses();
    }
  } else {
    const result = await createConflictProposal();
    console.log(`已创建冲突提案 ID: ${result.proposalId}`);
  }
}

// 启动交互
console.log('=== 课程分配管理系统 ===');

async function begin(){
    // await initializeData();
    mainMenu();
}
begin();
