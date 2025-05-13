const { ethers } = require("ethers");
const fs = require("fs");
const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:7545");
const path = require('path');

// 读取 JSON 文件
const contractData = JSON.parse(fs.readFileSync(path.join(__dirname, '../build/contracts/ICourseAllocation.json'), "utf8"));
const voteData = JSON.parse(fs.readFileSync(path.join(__dirname, '../build/contracts/Vote.json'), "utf8"));
const classData = JSON.parse(fs.readFileSync(path.join(__dirname, '../build/contracts/IStudentVote.json'), "utf8"));
const teacherVoteData = JSON.parse(fs.readFileSync(path.join(__dirname, '../build/contracts/TeacherVote.json'), "utf8"));

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
    switchCurrentSigner_courseAllocation,
    init_AgentCourses,
    getTeacherCostPerformance,
    getAgentCostPerformance,
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
    switchUser_auto,
    register_auto,
    getTeacherCourseSuitabilityByPython
} = require("../api/register.js");

const {
  createProposal,
  init_teacherVote_auto,
  executeProposal_auto,
  switchCurrentSigner_test1,
  setTeacherSuitabilityForAllCourses,
  saveAverageSuitability,
  setImportanceForAllCourses,
  saveAverageImportance
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
    machineRating_auto
} = require("../api/courseScore.js");

const {
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
    save_AverageImportance
} = require("../interact/autoInteract.js");

async function main(){
    // for(let i = 1; i <= 10; i++){
    //     console.log(await machineRating_auto(i));
        
    // }
    // await calculateTotalScore();
    // await printAllScore();

    // let courseIds = await contract.getCourseIds();
    // courseIds = courseIds.map(id => Number(id)); // 转换为数字数组
    // let machineRatings = []
    // for(let i = 1; i <= 10; i++){
    //     machineRatings.push((await machineRating_auto(i)).machineRate);
    // }
    // let table = courseIds.map((courseId, index) => ({
    //     '课程ID': courseId,
    //     '机器评分': machineRatings[index]
    // }))
    // console.table(table)
    await printAllScore();
    // await calculateTotalScore();
    await printAssignments_gains();
}

main();