const { ethers } = require("ethers");
const fs = require("fs");
require('dotenv').config({ path: './interact/.env' });
const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:7545");

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
    switchCurrentSigner_courseAllocation,
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


async function switchThisUser(userType, userName, userId=-1) {
    let userResult = await switchUser_auto(userType, userName, userId);
    if(userResult.code === 0){
        currentName = userResult.currentName;
        currentType = userResult.currentType;
        let currentAddress = userResult.currentAddress;
        await switchCurrentSigner_newinteract(userType, currentAddress, currentName);
        await switchCurrentSigner_studentClass(currentAddress, currentName);
        await switchCurrentSigner_courseAllocation(currentAddress, currentName);
        await switchCurrentSigner_everyTest(currentAddress, currentName);
        await switchCurrentSigner_test1(currentAddress);
        await switchCurrentSigner_courseScore(currentAddress);
    }
} 

async function switchCurrentSigner_everyTest(newAddress, newCurrentName) {
    currentSigner = provider.getSigner(newAddress);
    currentName = newCurrentName;
    contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    teacherVoteContract = new ethers.Contract(teacherVoteAddress, teacherVoteABI, currentSigner);
}

async function main() {
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => Number(id)); // 转换为数字数组
    await giveExamineScore(1, [95,86,85,83,75,70,68,67,97,87]);
    await giveExamineScore(2, [93,88,87,73,65,70,78,67,87,87]);
    await giveExamineScore(3, [85,76,95,73,55,40,78,87,77,67]);
    await giveExamineScore(4, [75,56,65,93,75,70,48,67,87,67]);
    await giveExamineScore(5, [75,46,55,63,65,74,62,63,91,84]);
    await giveExamineScore(6, [85,66,88,63,85,80,78,67,57,67]);
    await giveExamineScore(7, [75,86,75,73,74,60,88,67,77,65]);
    await giveExamineScore(8, [85,76,65,63,55,60,64,67,57,67]);
    await giveExamineScore(9, [73,86,85,83,85,60,68,87,77,57]);
    await giveExamineScore(10, [74,76,45,53,65,50,78,67,67,77]);

    await switchThisUser("Student", "student_1");
    await studentGiveScore([95,86,85,83,75,70,68,67,97,87]);
    await switchThisUser("Student", "student_2");
    await studentGiveScore([93,88,87,73,65,70,78,67,87,87]);
    await switchThisUser("Student", "student_3");
    await studentGiveScore([85,76,95,73,55,40,78,87,77,67]);
    await switchThisUser("Student", "student_4");
    await studentGiveScore([75,56,65,93,75,70,48,67,87,67]);
    await switchThisUser("Student", "student_5");
    await studentGiveScore([75,46,55,63,65,74,62,63,91,84]);
    await switchThisUser("Student", "student_6");
    await studentGiveScore([85,66,88,63,85,80,78,67,57,67]);
    await switchThisUser("Student", "student_7");
    await studentGiveScore([75,86,75,73,74,60,88,67,77,65]);
    await switchThisUser("Student", "student_8");
    await studentGiveScore([85,76,65,63,55,60,64,67,57,67]);
    await switchThisUser("Student", "student_9");
    await studentGiveScore([73,86,85,83,85,60,68,87,77,57]);
    await switchThisUser("Student", "student_10");
    await studentGiveScore([74,76,45,53,65,50,78,67,67,77]);

    await switchThisUser("Class", "class_1");
    await endClassStudentGiveScore();
    await switchThisUser("Class", "class_2");
    await endClassStudentGiveScore();

    let courses;
    await switchThisUser("Teacher", "teacher_1");
    courses = await contract.getTeacherReallyAssignedCourses(1);
    await teacherGiveScore(new Array(10 - courses.length).fill(100));
    await switchThisUser("Teacher", "teacher_2");
    courses = await contract.getTeacherReallyAssignedCourses(2);
    await teacherGiveScore(new Array(10 - courses.length).fill(90));
    await switchThisUser("Teacher", "teacher_3");
    courses = await contract.getTeacherReallyAssignedCourses(3);
    await teacherGiveScore(new Array(10 - courses.length).fill(80));
    await switchThisUser("Teacher", "teacher_4");
    courses = await contract.getTeacherReallyAssignedCourses(4);
    await teacherGiveScore(new Array(10 - courses.length).fill(70));
    await switchThisUser("Teacher", "teacher_5");
    courses = await contract.getTeacherReallyAssignedCourses(5);
    await teacherGiveScore(new Array(10 - courses.length).fill(60));
    
    await switchThisUser("Supervisor", "supervisor_1");
    await supervisorGiveScore([80, 80, 80, 80, 80, 80, 80, 80, 80, 80]);
    await switchThisUser("Supervisor", "supervisor_2");
    await supervisorGiveScore([70, 70, 70, 70, 70, 70, 70, 70, 70, 70]);
    
    await calculateTotalScore();
    await printAllScore();
}

main()
