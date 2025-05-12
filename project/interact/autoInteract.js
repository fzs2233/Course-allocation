const { ethers } = require("ethers");
const fs = require("fs");
require('dotenv').config({ path: './interact/.env.visible' });
const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:7545");
const inquirer = require('inquirer');

// 读取 JSON 文件
const contractData = JSON.parse(fs.readFileSync("./build/contracts/ICourseAllocation.json", "utf8"));
const voteData = JSON.parse(fs.readFileSync("./build/contracts/Vote.json", "utf8"));
const classData = JSON.parse(fs.readFileSync("./build/contracts/IStudentVote.json", "utf8"));
const teacherVoteData = JSON.parse(fs.readFileSync("./build/contracts/TeacherVote.json", "utf8"));

// 提取合约地址和 ABI
// const contractAddress = process.env.contractAddress;
// const voteAddress = process.env.VotingContractAddress;
// const classContractAddress = process.env.classAddress;
// const teacherVoteAddress = process.env.teachervoteAddress;


const {
  ContractAddress,
  VotingContractAddress,
  classAddress,
  teachervoteAddress
} = require("../interact/contractConfig");
const contractAddress = ContractAddress;
const voteAddress = VotingContractAddress;
const classContractAddress =classAddress;
const teacherVoteAddress =teachervoteAddress;


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
    switchCurrentSigner_courseAllocation,
    init_AgentCourses,
    getTeacherCostPerformance,
    getAgentCostPerformance,
    getCompareScore,
    getCompareScore_agent,
    printAssignments,
    printAssignments_gains,
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
    register,
    getTeacherCourseSuitabilityByPython
} = require("../api/register.js");

const {
  createProposal,
  init_teacherVote,
  executeProposal,
  switchCurrentSigner_test1,
  setTeacherSuitabilityForAllCourses,
  saveAverageSuitability,
  setImportanceForAllCourses,
  setDifficultyForAllCourses,
  saveAverageImportance,
  saveAverageDifficulty
} = require("../api/test1.js");

const {
    giveScoreByTeacher,
    giveScoreByAgentSelf,
    giveScoreStudent,
    giveScoreStudentToClass,
    giveScoreBySupervisor,
    calculateCourseTotalScore,
    switchCurrentSigner_courseScore,
    examineScore,
    machineRating
} = require("../api/courseScore.js");

/* 交互菜单系统 */
async function mainMenu() {
    const choices = [
      { name: '一键初始化数据', value: 'initializeData'},
      { name: '画像评分算法计算老师对课程的适合程度', value: 'getTeacherCourseSuitabilityByPython'},
      { name: '🔑切换用户', value: 'switchUser'},
      { name: '注册教师/智能体/班级/学生', value: 'register'}, 
      { name: '📝创建确定规则的提案', value: 'createTeacherProposal' },
      { name: '教师投票', value: 'init_teacherVote' },
      { name: '🛑执行教师提案', value: 'executeTeacherProposal' },
      { name: '教师给课程的重要程度打分', value: 'setImportance' },
      { name: '查看并保存课程的重要程度', value: 'saveImportance' },
      { name: '教师给课程的困难程度打分', value: 'setDifficulty' },
      { name: '查看并保存课程的困难程度', value: 'saveDifficulty' },
      { name: '教师给智能体对课程的适合程度打分', value: 'setTeacherSuitabilityForAllCourses' },
      { name: '查看并保存智能体对课程的适合程度', value: 'saveAverageSuitabilityInteract' },
      { name: '查看课程重要程度和智能体对课程的适合程度', value: 'checkCourseImportance' }, 
      { name: '初始化课程分配', value: 'initAllocation' },
      { name: '🔍查看课程分配情况', value: 'viewAssignments' },
      { name: '🔄转移课程所有权', value: 'transferCourse' },
      { name: '⚡查看课程冲突情况', value: 'checkCourseConflicts' },
      { name: '⚡冲突提案前的预处理', value: 'preprocessConflictCourses' },
      { name: '⚡创建冲突提案', value: 'createConflictProposal' },
      { name: '📝为没有课程的老师创建提案', value: 'checkAndCreateProposalForTeacher' },
      { name: '📝为没有老师的课程创建提案', value: 'proposalForCoursesWithoutAssigned' },
      { name: '📥为提案投票', value: 'voteForProposal' },
      { name: '🛑结束提案投票', value: 'endProposal' },
      { name: '查询教师性价比', value: 'teacherCost' },
      { name: '录入学生考试分数', value: 'giveExamineScore'},
      { name: '学生打分', value: 'studentGiveScore'},
      { name: '打印学生考试和评价分数', value: 'printStudentExamAndEvaluateScore' },
      { name: '总结班级学生打分', value:'endClassStudentGiveScore'},
      { name: '老师互评', value:'teacherGiveScore'},
     // { name: '智能体自评', value:'agentGiveScore'},
      { name: '督导评分', value:'supervisorGiveScore'},
      { name: '机器评分', value:'machineRating'},
      { name: '计算课程总分数', value: 'calculateTotalScore' },
      { name: '打印所有课程的总分数', value: 'printAllScore' },
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
      case'getTeacherCourseSuitabilityByPython':
            let addr = await currentSigner.getAddress();
            let teacherId = (await contract.addressToTeacherId(addr)).toNumber();
            await getTeacherCourseSuitabilityByPython(teacherId);
            break;
      case'switchUser':
          // console.log(contract)
          let userResult = await switchUser();
          if(userResult.code === 0){
              currentName = userResult.currentName;
              currentType = userResult.currentType;
              let currentAddress = userResult.currentAddress;
              await switchCurrentSigner_newinteract(currentAddress, currentName);
              await switchCurrentSigner_studentClass(currentAddress, currentName);
              await switchCurrentSigner_courseAllocation(currentAddress, currentName);
              await switchCurrentSigner_test1(currentAddress);
              await switchCurrentSigner_courseScore(currentAddress);
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
      case 'setImportance':
        await set_ImportanceForAllCourses();
        break;
      case 'saveImportance':
        await save_AverageImportance();
        break;
     case 'setDifficulty':
        await set_DifficultyForAllCourses();
        break;
      case 'saveDifficulty':
        await save_AverageDifficulty();
        break;
      case 'setTeacherSuitabilityForAllCourses':
        await setSuitabilityForAllCoursesInteract();
        break;
      case 'saveAverageSuitabilityInteract':
        await saveAverageSuitabilityInteract();
        break;
      case 'executeTeacherProposal':
        await executeProposal();
        break;
      case 'checkCourseImportance':
          await checkCourseImportance();
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
      case 'giveExamineScore':
          await giveExamineScore();
          break;
      case 'transferCourse':
          await handleTransferCourse();
          break;
      case 'studentGiveScore':
          await studentGiveScore();
          break;
      case 'printStudentExamAndEvaluateScore':
          await printStudentExamAndEvaluateScore();
          break;
      case'endClassStudentGiveScore':
          await endClassStudentGiveScore();
          break;
      case 'teacherGiveScore':
          await teacherGiveScore();
          break;
      case 'agentGiveScore':
          await agentGiveScore();
          break;
      case 'supervisorGiveScore':
          await supervisorGiveScore();
          break;
      case 'machineRating':
          console.log(await machineRating());
          break;
      case 'calculateTotalScore':
          await calculateTotalScore();
          break;
      case 'printAllScore':
          await printAllScore();
          break;
      case 'exit':
          process.exit();
    }

    mainMenu(); // 循环显示菜单
}

async function setTeacherPerference(numbers){

    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => Number(id)); // 转换为数字数组
    // const { numbers } = await inquirer.prompt([
    //     {
    //       type: 'input',
    //       name: 'numbers',
    //       message: `请输入${courseIds.length}个0-100的对课程的意愿（以英文逗号分隔）:`,
    //       filter: (input) => {  // 处理输入格式
    //         return input.split(',')
    //                     .map(item => item.trim())  // 移除空格
    //                     .map(Number);  // 转为数字
    //       },
    //       validate: (input) => {  // 验证输入有效性
    //         if (input.length !== courseIds.length) return `请输入 ${courseIds.length} 个数字`;
    //         const isValid = input.every(num => !isNaN(num)) && input.every(num => num >= 0 && num <= 100);
    //         return isValid || '请输入有效的数字（如 1,2,3）';
    //       }
    //     }
    //   ])
    let teacherId = await contract.addressToTeacherId(await currentSigner.getAddress());
    await contract.setAllTeacherCoursePreferences(teacherId, numbers);
    console.log(`已经成功设置教师${teacherId} 对所有课程的意愿！`)
    return {
        code: 0,
        message: `已经成功设置教师${teacherId} 对所有课程的意愿！`
    }
}

// 学生自己评分，一次性给所有课程评分
async function studentGiveScore(numbers) {
    // 调用之前记得先转换为学生账户
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => Number(id)); // 转换为数字数组
    // const { numbers } = await inquirer.prompt([
    //     {
    //       type: 'input',
    //       name: 'numbers',
    //       message: `请输入${courseIds.length}个0-100的数字评分（以英文逗号分隔）:`,
    //       filter: (input) => {  // 处理输入格式
    //         return input.split(',')
    //                     .map(item => item.trim())  // 移除空格
    //                     .map(Number);  // 转为数字
    //       },
    //       validate: (input) => {  // 验证输入有效性
    //         if (input.length !== courseIds.length) return `请输入 ${courseIds.length} 个数字`;
    //         const isValid = input.every(num => !isNaN(num)) && input.every(num => num >= 0 && num <= 100);
    //         return isValid || '请输入有效的数字（如 1,2,3）';
    //       }
    //     }
    //   ])
    await giveScoreStudent(numbers,courseIds); // 学生打分
}

// 总结班级学生评分，一次一个班级，所有课程
async function endClassStudentGiveScore() {
    // 调用之前记得先转换为班级账户,两个班级记得都调用一次
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => Number(id)); // 转换为数字数组
    let addr = await currentSigner.getAddress();
    let result;
    let print_flag = false;
    for (let i = 0; i < courseIds.length; i++) {
        result = await giveScoreStudentToClass(addr, courseIds[i]); // 总结班级评分
        if (result.code === -1 && !print_flag) {
          print_flag = true;
          console.log(result.message); // 打印错误信息
        }
    }
    if (result.code === 0) {
        classScores = []
        for (let i = 0; i < courseIds.length; i++) {
            classScores.push( (await contract.getCourseClassScores(courseIds[i])).map(id => Number(id)) ); // 班级评分
            // console.log(`课程 ${courseIds[i]} 的班级评分: ${classScores}`); // 打印班级评分
        }
        let table = classScores.map((score, index) => ({
            '课程ID': courseIds[index],
            '班级评分': score
        }))
        console.table(table)
    }
}

// 老师互评，一次性全部课程
async function teacherGiveScore(numbers) {
    // 调用前记得先切换教师账户,而且记得先打印分配情况，看老师有几门课
    let addr = await currentSigner.getAddress();
    let teacherId = await contract.addressToTeacherId(addr); // 老师id
    if (teacherId === 0) {
        console.log("当前账户不是教师");
        return;
    }
    let reallyAssignedcourseIds = await contract.getTeacherReallyAssignedCourses(teacherId); // 老师课程
    reallyAssignedcourseIds = reallyAssignedcourseIds.map(id => Number(id)); // 转换为数字数组
    let removeSet = new Set(reallyAssignedcourseIds); // 转换为集合
    let courseIds = await contract.getCourseIds(); // 所有课程
    courseIds = courseIds.map(id => Number(id)); // 转换为数字数组
    courseIds = courseIds.filter(id => !removeSet.has(id)); // 过滤掉自己的课程

    // const { numbers } = await inquirer.prompt([
    //     {
    //       type: 'input',
    //       name: 'numbers',
    //       message: `请输入${courseIds.length}个0-100的数字评分（以英文逗号分隔）:`,
    //       filter: (input) => {  // 处理输入格式
    //         return input.split(',')
    //                     .map(item => item.trim())  // 移除空格
    //                     .map(Number);  // 转为数字
    //       },
    //       validate: (input) => {  // 验证输入有效性
    //         console.log(input.length, courseIds.length);
    //         if (input.length !== courseIds.length) return `请输入 ${courseIds.length} 个数字`;
    //         const isValid = input.every(num => !isNaN(num)) && input.every(num => num >= 0 && num <= 100);
    //         return isValid || '请输入有效的数字（如 1,2,3）';
    //       }
    //     }
    //   ])
    
    await giveScoreByTeacher(addr, courseIds, numbers); // 老师自评
}

async function agentGiveScore(numbers) {
    // 调用前记得先切换智能体账户,而且记得先打印分配情况，看智能体有几门课
    let addr = await currentSigner.getAddress();
    let agentId = await contract.addressToAgentId(addr); // 智能体id
    if (agentId === 0) {
        console.log("当前账户不是智能体");
        return; 
    }
    let courseIds = await contract.getAgentAssignedCourses(agentId); // 智能体课程
    courseIds = courseIds.map(id => Number(id)); // 转换为数字数组
    // const { numbers } = await inquirer.prompt([
    //     {
    //       type: 'input',
    //       name: 'numbers',
    //       message: `请输入${courseIds.length}个0-100的数字评分（以英文逗号分隔）:`,
    //       filter: (input) => {  // 处理输入格式
    //         return input.split(',')
    //                     .map(item => item.trim())  // 移除空格
    //                     .map(Number);  // 转为数字
    //       },
    //       validate: (input) => {  // 验证输入有效性
    //         if (input.length !== courseIds.length) return `请输入 ${courseIds.length} 个数字`;
    //         const isValid = input.every(num => !isNaN(num)) && input.every(num => num >= 0 && num <= 100); // 确保数字在0-100范围内
    //         return isValid || '请输入有效的数字（如 1,2,3）';
    //       }
    //     }
    //   ])
    
    await giveScoreByAgentSelf(addr, numbers); // 智能体自评
}

async function supervisorGiveScore(numbers) {
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => Number(id)); // 转换为数字数组
    // const { numbers } = await inquirer.prompt([
    //     {
    //       type: 'input',
    //       name: 'numbers',
    //       message: `请输入${courseIds.length}个0-100的数字评分（以英文逗号分隔）:`,
    //       filter: (input) => {  // 处理输入格式
    //         return input.split(',')
    //                     .map(item => item.trim())  // 移除空格
    //                     .map(Number);  // 转为数字
    //       },
    //       validate: (input) => {  // 验证输入有效性
    //         if (input.length !== courseIds.length) return `请输入 ${courseIds.length} 个数字`;
    //         const isValid = input.every(num => !isNaN(num)) && input.every(num => num >= 0 && num <= 100);
    //         return isValid || '请输入有效的数字（如 1,2,3）';
    //       }
    //     }
    //   ])
    let addr = await currentSigner.getAddress();
    let print_flag = false;
    for (let i = 0; i < courseIds.length; i++) {
        let result = await giveScoreBySupervisor(addr, courseIds[i], numbers[i]);
        if (result.code !== 0 && !print_flag) {
          print_flag = true;
          console.log(result.message); // 打印错误信息
          break; // 退出循环 
        }
    }
}

async function calculateTotalScore() {
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => Number(id)); // 转换为数字数组
    let suitAfter = []
    let classScoreAvg = []
    let supervisorScoreAvg = []
    let teacherScoreAvg = []
    let machineScore = []
    let totalScore = []
    for (let i = 0; i < courseIds.length; i++) {
        let result = await calculateCourseTotalScore(courseIds[i]); // 计算课程总分
        suitAfter.push(result.data)
        classScoreAvg.push(result.classScoreAvg)
        supervisorScoreAvg.push(result.supervisorScoreAvg)
        teacherScoreAvg.push(result.teacherScoreAvg)
        machineScore.push(result.machineScore)
        totalScore.push(result.totalScore)
        if (result.code === -1) {
          console.log(result.message); // 打印错误信息
          break; // 退出循环
        } 
    }
    let tableData = courseIds.map((courseId, index) => ({
        '课程ID': courseId,
        'classScoreAvg': classScoreAvg[index],
        'supervisorScoreAvg': supervisorScoreAvg[index],
        'teacherScoreAvg': teacherScoreAvg[index],
        'machineScore': machineScore[index],
        'totalScore': totalScore[index],
        'suitAfter': suitAfter[index],
    }));
    console.table(tableData)
}

async function printAllScore() {
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => Number(id)); // 转换为数字数组
    let studentIds = await classContract.getStudentIds(); // 学生id
    studentIds = studentIds.map(id => Number(id)); // 转换为数字数组
    let assignments = [];
    let costTotal = 0;
    let totalGain = 0;
    for (let i = 0; i < courseIds.length; i++) {
        let courseScores = await contract.courseScores(courseIds[i]);

        let teacherScore = await contract.getTeacherScores(courseIds[i]); // 互评分数
        teacherScore = teacherScore.map(Number);
        let machineScore = courseScores.machineScore; // 机器评分
        machineScore = Number(machineScore);
        let classScore = await contract.getCourseClassScores(courseIds[i]); // 班级评分
        classScore = classScore.map(Number);
        let supervisorScore = await contract.getCourseSupervisorScores(courseIds[i]); // 督导评分
        supervisorScore = supervisorScore.map(Number);
        let totalScore = Number(courseScores.totalScore);  // 总分
        
        // 获取分配的教师和智能体ID
        const assignedTeachers = (await contract.getCoursesAssignedTeacher(courseIds[i])).map(t => t.toNumber());
        const assignedAgents = (await contract.getCoursesAssignedAgent(courseIds[i])).map(a => a.toNumber());

        // 构建分配信息
        let assignedTo = [];
        if (assignedTeachers.length > 0) {
            assignedTo.push(`教师: ${assignedTeachers.join(', ')}`);
        }
        if (assignedAgents.length > 0) {
            assignedTo.push(`智能体: ${assignedAgents.join(', ')}`);
        }
        if (assignedTo.length === 0) {
            assignedTo.push('Unassigned');
        }

        //计算这门课的学生平均分
        let studentScoresTotal = 0;
        for (let j = 0; j < studentIds.length; j++) {
            studentScoresTotal += Number(await classContract.getStudentCourseScore(studentIds[j], courseIds[i])); // 学生评分
        }
        let studentScoresAvg = studentScoresTotal / studentIds.length; // 学生平均分
        studentScoresAvg = studentScoresAvg.toFixed(2); // 保留两位小数
        let salary = 0;
        let gain_weight = 0;
        if(assignedTeachers.length > 0) {
            let teacher = await contract.teachers(assignedTeachers[0]); // 老师
            salary = Number(teacher.value); // 工资
            gain_weight = (await getCompareScore(assignedTeachers[0], courseIds[i], "Suitability&Preference")).data;
        }else if(assignedAgents.length > 0) {
            let agent = await contract.agents(assignedAgents[0]); // 智能体
            salary = Number(agent.value); // 工资
            gain_weight = (await getCompareScore_agent(assignedAgents[0], courseIds[i], "Suitability&Preference")).data;
        }

        costTotal += salary;
        totalGain += gain_weight;
        assignments.push({
            "课程ID": courseIds[i],
            "分配对象": assignedTo.join(' | '),
            "老师或智能体互评分": teacherScore.join(', '),
            "机器评分": machineScore,
            "学生平均成绩": studentScoresAvg,
            "班级评分": classScore.join(', '),
            "督导评分": supervisorScore.join(', '),
            "薪水": salary,
            "能力意愿加权":gain_weight,
            "总分": totalScore,
            "性价比":Math.round(gain_weight/salary*1000),
            "实际性价比":Math.round(totalScore/salary*1000)
        });
        // console.log(`课程 ${courseIds[i]} 的评分: 自评 ${teacherScore}, 学生 ${classScore}, 督导 ${supervisorScore}, 总分 ${totalScore}`); // 打印评分 
    }
    console.log('\n目前课程的评分情况:');
    console.table(assignments); // 打印表格
    // let totalCostEffectiveness;
    // let totalSuitAndPrefer;
    // totalCostEffectiveness = Math.round(totalGain / costTotal * 1000);
    // console.log(`总体性价比:`, totalCostEffectiveness);
    // totalSuitAndPrefer = Math.round(totalGain / assignments.length);
    // console.log(`能力意愿加权均值:`, totalSuitAndPrefer);
}

function formatNumber(num) {
    return String(num).padStart(3, ' ');
  }

// 打印学生考试和评价分数
async function printStudentExamAndEvaluateScore() {
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => Number(id)); // 转换为数字数组
    let assignments = [];
    let studentIds = await classContract.getStudentIds(); // 学生id
    studentIds = studentIds.map(id => Number(id)); // 转换为数字数组
    for (let i = 0; i < courseIds.length; i++) {
        let courseId = courseIds[i];
        let object = {};
        object["课程ID"] = courseId;
        for (let j = 0; j < studentIds.length; j++) {
            thisStudentScore = await classContract.getStudentCourseSuitability(studentIds[j], courseId);
            thisStudentCourseScore = await classContract.getStudentCourseScore(studentIds[j], courseId);
            let key = "student_" + studentIds[j];

            object[key] = formatNumber(thisStudentCourseScore) + "," + formatNumber(thisStudentScore);
        }
        assignments.push(object);
    }
    console.log('\n目前课程的学生考试和评价情况:');
    console.table(assignments); // 打印表格
}

// 查看课程重要程度，输出表格
async function checkCourseImportance() {
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => Number(id)); // 转换为数字数组
    let assignments = [];
    for (let i = 0; i < courseIds.length; i++) {
        let importance = Number(await contract.getCourseImportance(courseIds[i])); // 查看课程重要程度
        let suit1 = Number(await contract.getAgentSuitability(1,courseIds[i])); // 查看智能体对课程的适合程度
        let suit2 = Number(await contract.getAgentSuitability(2,courseIds[i])); // 查看智能体对课程的适合程度
        assignments.push({
            "课程ID": courseIds[i],
            "重要程度": importance,
             "智能体1对课程的适合程度": suit1,
             "智能体2对课程的适合程度": suit2
        })
    }
    console.log('\n目前课程的重要程度:');
    console.table(assignments); // 打印表格
}

async function giveExamineScore(courseId,scores) {
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => Number(id)); // 转换为数字数组
    let studentIds = await classContract.getStudentIds(); // 学生id
    studentIds = studentIds.map(id => Number(id)); // 转换为数字数组
    // const { courseId,scores } = await inquirer.prompt([
    //     {
    //       type: 'number',
    //       name: 'courseId',
    //       message: `请输入要打分的courseId:`, 
    //       default: 1,
    //       validate: input => courseIds.includes(input) || `请输入正确的courseId, 范围为${courseIds.join(', ')}`
    //     },
    //     {
    //       type: 'input',
    //       name: 'scores',
    //       message: `请输入${studentIds.length}个要打分的分数(0-100):`, 
    //       filter: (input) => {  // 处理输入格式
    //         return input.split(',')
    //                    .map(item => item.trim())  // 移除空格
    //                    .map(Number);  // 转为数字
    //       },
    //       validate: (input) => {  // 验证输入有效性
    //         if (input.length!== studentIds.length) return `请输入 ${studentIds.length} 个数字`;
    //         const isValid = input.every(num =>!isNaN(num)) && input.every(num => num >= 0 && num <= 100); // 确保数字在0-100范围内
    //         return isValid || '请输入有效的数字（如 1,2,3）';
    //       }
    //     }
    // ])
    let result = await examineScore(courseId, scores); // 学生打分
    if(result.code === -1){
        console.log(result.message); // 打印错误信息
    }
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
async function handleCostPerformance(targetType, targetId) {
    // const { targetType, targetId } = await inquirer.prompt([
    //     {
    //     type: 'list',
    //     name: 'targetType',
    //     message: '查询对象类型:',
    //     choices: [
    //         { name: '教师', value: 'teacher' },
    //         { name: '智能体', value: 'agent' }
    //     ]
    //     },
    //     {
    //     type: 'number',
    //     name: 'targetId',
    //     message: '输入查询对象ID:',
    //     validate: input => input > 0 || 'ID必须大于0'
    //     }
    // ]);

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
async function handleTransferCourse(courseId,targetId) {
    // const answers = await inquirer.prompt([
    //     {
    //     type: 'number',
    //     name: 'courseId',
    //     message: '输入要转移的课程ID (1-10):',
    //     validate: input => input >= 1 && input <= 10 || '请输入1-10的课程ID'
    //     },
    //     {
    //     type: 'number',
    //     name: 'targetId',
    //     message: '输入目标对象ID:',
    //     validate: input => input > 0 || 'ID必须大于0'
    //     }
    // ]);

    try {
        const result = await transferCourse(
        courseId,
        targetId
        );
        
        console.log(result.message);
        if (result.performanceImprovement) {
            console.log(`${result.scoreTypePrint}提升: ${result.performanceImprovement}`);
            console.log(result.senderCoins);
            console.log(result.targetCoins);
            // 打印课程分配情况
            await printAssignments_gains();
        }
    } catch (error) {
        console.error('转移失败:', error.message);
    }
}

async function voteForProposal(proposalId,choice=-1){
    // const {proposalId} = await inquirer.prompt([
    //     {
    //     type: 'number',
    //     name: 'proposalId',
    //     message: '输入您要投票的提案ID:',
    //     }
    // ]);
    let [optionIds, voteForId] = await voteContract.getVotedIds(proposalId);
    optionIds = optionIds.map(id => id.toNumber());
    voteForId = voteForId.toNumber(); 

    if(currentType === 'Teacher' || currentType === 'Student'){
        // const {choice} = await inquirer.prompt([
        //     {
        //     type: 'list',
        //     name: 'choice',
        //     message: '请选择您要投票的教师ID:',
        //     choices: optionIds
        //     }
        // ]);
        let currentAddress = await currentSigner.getAddress();
        if(currentType === 'Teacher'){
            return(await teacherVote(currentAddress, proposalId, choice));
        }else{
            return(await studentVote(currentAddress, proposalId, choice));
        }
    }else if(currentType === 'Agent'){
      let currentAddress = await currentSigner.getAddress();
      return(await agentVote(currentAddress, proposalId));
    }else if(currentType === 'Class'){
      console.log(`班级不允许投票`)
      return{
        code: -1,
        message: `班级不允许投票`
      }
    }

}

async function endProposal(proposalType, proposalId){
    // const {proposalType} = await inquirer.prompt([
    //   {
    //     type: 'list',
    //     name: 'proposalType',
    //     message: '请输入您要结束的提案类型:',
    //     choices: [
    //         {name: "结束冲突提案", value: 'endConfilct'},
    //         {name: "结束为没有课程的教师发起的提案", value: 'endWithoutCourse'},
    //         {name: "结束为没有教师的课程发起的提案", value: 'endWithoutTeacher'},
    //         {name: "结束班级提案", value: 'endClass'},
    //     ]
    //   }
    // ]);
    // const { proposalId } = await inquirer.prompt([
    //     {
    //     type: 'number',
    //     name: 'proposalId',
    //     message: '请输入要结束的提案Id: ',
    //     }
    // ]);
    if(proposalType === 'endConfilct'){
        console.log(await endConfictProposal(proposalId));  // 结束冲突提案
    }else if(proposalType === 'endClass'){
        await endClassProposal_interact(proposalId); 
    }else{
        console.log(await endProposalAndAssignCourseforWithoutteacher(proposalId));
    }
}


async function switchCurrentSigner_newinteract(userType, newAddress, newCurrentName){
    currentType = userType;
    currentSigner = provider.getSigner(newAddress);
    currentName = newCurrentName;
    contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    teacherVoteContract = new ethers.Contract(teacherVoteAddress, teacherVoteABI, currentSigner);
}

// 为所有课程设置适合度评分
async function setSuitabilityForAllCoursesInteract(agentId, suitabilities) {
    // 获取当前用户的教师ID（无需手动输入）
    let teacherId = await contract.addressToTeacherId(await currentSigner.getAddress());

    // 确保当前账户是教师
    if (teacherId == 0) {
        console.log("当前账户不是教师");
        return;
    }

    // const { agentId, suitabilities } = await inquirer.prompt([
    //     { type: 'number', name: 'agentId', message: '请输入智能体ID:' },
    //     {
    //         type: 'input',
    //         name: 'suitabilities',
    //         message: '请输入适合度评分（以英文逗号分隔）:',
    //         filter: (input) => input.split(',').map(score => Number(score))
    //     }
    // ]);

    // 固定课程ID 1,2,3,4,5,6,7,8,9,10
    const courseIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // 调用设置适合度评分的函数
    await setTeacherSuitabilityForAllCourses(teacherId, agentId, courseIds, suitabilities);
    console.log('✅ 已为所有课程设置适合度评分');
}



// 计算并保存平均适合度评分
async function saveAverageSuitabilityInteract(agentId) {

    // 固定课程ID 1,2,3,4,5,6,7,8,9,10
    const courseIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    await saveAverageSuitability(agentId, courseIds);
    //console.log('✅ 已计算并保存平均适合度评分');
}


// 为所有课程设置重要程度评分
async function set_ImportanceForAllCourses(suitabilities) {
    // 获取当前用户的教师ID（无需手动输入）
    let teacherId = await contract.addressToTeacherId(await currentSigner.getAddress());

    // 确保当前账户是教师
    if (teacherId == 0) {
        console.log("当前账户不是教师");
        return;
    }

    // const { agentId, suitabilities } = await inquirer.prompt([
    //     {
    //         type: 'input',
    //         name: 'suitabilities',
    //         message: '请输入重要程度评分（以英文逗号分隔）:',
    //         filter: (input) => input.split(',').map(score => Number(score))
    //     }
    // ]);

    // 固定课程ID 1,2,3,4,5,6,7,8,9,10
    const courseIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // 调用设置适合度评分的函数
    await setImportanceForAllCourses(teacherId,  courseIds, suitabilities);
    console.log('✅ 已为所有课程设置重要程度');
}

// 计算并保存平均重要程度评分
async function save_AverageImportance() {

    const courseIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    await saveAverageImportance(courseIds);

}


// 为所有课程设置困难程度程度评分
async function set_DifficultyForAllCourses(Difficulties) {
    // 获取当前用户的教师ID（无需手动输入）
    let teacherId = await contract.addressToTeacherId(await currentSigner.getAddress());

    // 确保当前账户是教师
    if (teacherId == 0) {
        console.log("当前账户不是教师");
        return;
    }

    // const { agentId, Difficulties } = await inquirer.prompt([
    //     {
    //         type: 'input',
    //         name: 'Difficulties',
    //         message: '请输入重要程度评分（以英文逗号分隔）:',
    //         filter: (input) => input.split(',').map(score => Number(score))
    //     }
    // ]);

    // 固定课程ID 1,2,3,4,5,6,7,8,9,10
    const courseIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // 调用设置适合度评分的函数
    await setDifficultyForAllCourses(teacherId,  courseIds, Difficulties);
    console.log('✅ 已为所有课程设置难度');
}

// 计算并保存平均困难程度评分
async function save_AverageDifficulty() {

    const courseIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    await saveAverageDifficulty(courseIds);

}

module.exports = {
    studentGiveScore,
    endClassStudentGiveScore,
    teacherGiveScore,
    agentGiveScore,
    supervisorGiveScore,
    calculateTotalScore,
    printAllScore,
    printStudentExamAndEvaluateScore,
    checkCourseImportance,
    giveExamineScore,
    handleInitAllocation,
    handleCostPerformance,
    handleTransferCourse,
    voteForProposal,
    endProposal,
    switchCurrentSigner_newinteract,
    setSuitabilityForAllCoursesInteract,
    saveAverageSuitabilityInteract,
    set_ImportanceForAllCourses,
    set_DifficultyForAllCourses,
    save_AverageDifficulty,
    save_AverageImportance
};
