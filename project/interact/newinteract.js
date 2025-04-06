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
const teacherVoteData = JSON.parse(fs.readFileSync("./build/contracts/TeacherVote.json", "utf8"));

// 提取合约地址和 ABI
const contractAddress = process.env.contractAddress;
const voteAddress = process.env.VotingContractAddress;
const classContractAddress = process.env.classAddress;
const teacherVoteAddress = process.env.teachervoteAddress;
const contractABI = contractData.abi;
const voteABI = voteData.abi;
const classABI = classData.abi;
const teacherVoteABI = teacherVoteData.abi;


// 设置提供者（使用 Infura 或本地节点）
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

// 当前登录的账户
let currentSigner = provider.getSigner(0);
let currentName = "account_0";
let currentType = "account";
// 创建合约实例
let contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
let voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
let classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
let teacherVoteContract = new ethers.Contract(teacherVoteAddress, teacherVoteABI, currentSigner);


// [保留原有的合约初始化代码...]
const {
    init_TeacherCourses,
    switchCurrentSigner,
    init_AgentCourses,
    getTeacherCostPerformance,
    getAgentCostPerformance,
    printAssignments,
    transferCourse,
    checkCourseConflicts,
    preprocessConflictCourses,
    createConflictProposal,
    checkAndCreateProposalForTeacher, // 给没有课程的老师投票选择课程
    proposalForCoursesWithoutAssigned, // 为没有被分配的课程创建提案
    endConfictProposal,
    endProposalAndAssignCourseforWithoutteacher,
    teacherVote,
    agentVote
} = require("../api/courseAllocation.js");

const {
    switchCurrentSigner_studentClass,
    studentVote,
    endClassProposal_interact
} = require("../api/studentClass.js");

const {
    initializeData,
    switchUser,
    register
} = require("../api/register.js");

const {
  createProposal,
  init_teacherVote,
  executeProposal,
  switchAccount
} = require("../api/test1.js");

/* 交互菜单系统 */
async function mainMenu() {
    const choices = [
      { name: '一键初始化数据', value: 'initializeData'},
      { name: '切换用户', value: 'switchUser'},
      { name: '注册教师/智能体/班级/学生', value: 'register'}, 
      { name: '📌 创建课程提案（教师）', value: 'createTeacherProposal' },
      { name: '🗳️ 教师评分并投票', value: 'init_teacherVote' },
      { name: '✅ 执行教师提案', value: 'executeTeacherProposal' },
      { name: '初始化课程分配', value: 'initAllocation' },
      { name: '查看课程分配情况', value: 'viewAssignments' },
      { name: '查看课程冲突情况', value: 'checkCourseConflicts' },
      { name: '转移课程所有权', value: 'transferCourse' },
      { name: '冲突提案前的预处理', value: 'preprocessConflictCourses' },
      { name: '创建冲突提案', value: 'createConflictProposal' },
      { name: '为没有课程的老师创建提案', value: 'checkAndCreateProposalForTeacher' },
      { name: '为没有老师的课程创建提案', value: 'proposalForCoursesWithoutAssigned' },
      { name: '为提案投票', value: 'voteForProposal' },
      { name: '结束提案投票', value: 'endProposal' },
      { name: '查询教师性价比', value: 'teacherCost' },
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

    switch (action) {
      case'initializeData':
          await initializeData();
          break;
      case'switchUser':
          // console.log(contract)
          let userResult = await switchUser();
          if(userResult.code === 0){
              [currentType, currentSigner, contract, voteContract, classContract, currentName] = userResult.data;
              await switchCurrentSigner(currentSigner, contract, voteContract, classContract, currentName);
              await switchCurrentSigner_studentClass(currentSigner, contract, voteContract, classContract, currentName);
              const accountIndex = parseInt(currentName.split('_')[1]); // 从 account_2 提取 2
              if (!isNaN(accountIndex)) {
                  await switchAccount(accountIndex); // 调用 test1.js 的 switchAccount(index)
              }
              console.log(currentName)
          }
          break;
      case'register':
          [currentName, currentType] = await register();
          break;
      case 'createTeacherProposal':
        await createProposal();
        break;
      case 'init_teacherVote':
        await init_teacherVote();
        break;
      case 'executeTeacherProposal':
        await executeProposal();
        break;
      case 'initAllocation':
          await handleInitAllocation();
          break;
      case 'viewAssignments':
          await printAssignments();
          break;
      case 'checkCourseConflicts':
          console.log(await checkCourseConflicts());
          break;
      case 'preprocessConflictCourses':
          await preprocessConflictCourses();
          break;
      case 'createConflictProposal':
          console.log(await createConflictProposal());
          break;
      case 'checkAndCreateProposalForTeacher':
          console.log(await checkAndCreateProposalForTeacher());
          break;
      case 'proposalForCoursesWithoutAssigned':
          console.log(await proposalForCoursesWithoutAssigned());
          break;
      case 'voteForProposal':
          await voteForProposal();
          break;
      case 'endProposal':
          await endProposal();
          break;
      case 'teacherCost':
          await handleCostPerformance();
          break;
      case 'transferCourse':
          await handleTransferCourse();
          break;
      case 'exit':
          process.exit();
    }

    mainMenu(); // 循环显示菜单
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

async function voteForProposal(){
    const {proposalId} = await inquirer.prompt([
        {
        type: 'number',
        name: 'proposalId',
        message: '输入您要投票的提案ID:',
        }
    ]);
    let [optionIds, voteForId] = await voteContract.getVotedIds(proposalId);
    optionIds = optionIds.map(id => id.toNumber());
    voteForId = voteForId.toNumber(); 

    if(currentType === 'Teacher' || currentType === 'Student'){
        const {choice} = await inquirer.prompt([
            {
            type: 'list',
            name: 'choice',
            message: '请选择您要投票的教师ID:',
            choices: optionIds
            }
        ]);
        let currentAddress = await currentSigner.getAddress();
        if(currentType === 'Teacher'){
            console.log(await teacherVote(currentAddress, proposalId, choice));
        }else{
            console.log(await studentVote(currentAddress, proposalId, choice));
        }
    }else if(currentType === 'Agent'){
      console.log(`检测您为智能体，已为您选择性价比最高的教师进行投票`)
      await agentVote();
    }else if(currentType === 'Class'){
      console.log(`班级不允许投票`)
    }

}

async function endProposal(){
    const {proposalType} = await inquirer.prompt([
      {
        type: 'list',
        name: 'proposalType',
        message: '请输入您要结束的提案类型:',
        choices: [
            {name: "结束冲突提案", value: 'endConfilct'},
            {name: "结束为没课老师分配课程的提案", value: 'endWithoutCourse'},
            {name: "结束为没有老师的课程分配老师的提案", value: 'endWithoutTeacher'},
            {name: "结束班级提案", value: 'endClass'},
        ]
      }
    ]);
    const { proposalId } = await inquirer.prompt([
        {
        type: 'number',
        name: 'proposalId',
        message: '请输入要结束的提案Id: ',
        }
    ]);
    if(proposalType === 'endConfilct'){
        console.log(await endConfictProposal(proposalId));  // 结束冲突提案
    }else if(proposalType === 'endClass'){
        await endClassProposal_interact(proposalId); 
    }else{
        await endProposalAndAssignCourseforWithoutteacher(proposalId);
    }
}

// 启动交互
console.log('=== 课程分配管理系统 ===');
async function begin(){
  mainMenu();
}
begin();
