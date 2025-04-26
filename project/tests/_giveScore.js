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

async function printtable(courseIds, scores, mode, id, type){
    let tableData = scores.map((score, index) => ({
        '课程ID': courseIds[index],
        [mode]: score,
    }));
    console.log(`${type}${id} 的${mode}如下表所示`)
    console.table(tableData)
}

async function main() {
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => Number(id)); // 转换为数字数组
    // 创建投票结果表格
    
    let examineScore = new Array(10).fill(0);
    for(let i = 0; i < examineScore.length; i++){
        // 随机生成60-100以内的数字
        examineScore[i] = Math.floor(Math.random() * 41) + 60;
    }
    await giveExamineScore(1, examineScore);
    let scores = examineScore
    printtable(courseIds, scores, '课程成绩', 1, '学生')

    examineScore = new Array(10).fill(0);
    for(let i = 0; i < examineScore.length; i++){
        // 随机生成60-100以内的数字
        examineScore[i] = Math.floor(Math.random() * 41) + 60;
    }
    await giveExamineScore(2, examineScore);
    scores = examineScore
    printtable(courseIds, scores, '课程成绩', 2, '学生')

    examineScore = new Array(10).fill(0);
    for(let i = 0; i < examineScore.length; i++){
        // 随机生成60-100以内的数字
        examineScore[i] = Math.floor(Math.random() * 41) + 60;
    }
    await giveExamineScore(3, examineScore);
    scores = examineScore
    printtable(courseIds, scores, '课程成绩', 3, '学生')

    examineScore = new Array(10).fill(0);
    for(let i = 0; i < examineScore.length; i++){
        // 随机生成60-100以内的数字
        examineScore[i] = Math.floor(Math.random() * 41) + 60;
    }
    await giveExamineScore(4, examineScore);
    scores = examineScore
    printtable(courseIds, scores, '课程成绩', 4, '学生')

    examineScore = new Array(10).fill(0);
    for(let i = 0; i < examineScore.length; i++){
        // 随机生成60-100以内的数字
        examineScore[i] = Math.floor(Math.random() * 41) + 60;
    }
    await giveExamineScore(5, examineScore);
    scores = examineScore
    printtable(courseIds, scores, '课程成绩', 5, '学生')

    examineScore = new Array(10).fill(0);
    for(let i = 0; i < examineScore.length; i++){
        // 随机生成60-100以内的数字
        examineScore[i] = Math.floor(Math.random() * 41) + 60;
    }
    await giveExamineScore(6, examineScore);
    scores = examineScore
    printtable(courseIds, scores, '课程成绩', 6, '学生')

    examineScore = new Array(10).fill(0);
    for(let i = 0; i < examineScore.length; i++){
        // 随机生成60-100以内的数字
        examineScore[i] = Math.floor(Math.random() * 41) + 60;
    }
    await giveExamineScore(7, examineScore);
    scores = examineScore
    printtable(courseIds, scores, '课程成绩', 7, '学生')

    examineScore = new Array(10).fill(0);
    for(let i = 0; i < examineScore.length; i++){
        // 随机生成60-100以内的数字
        examineScore[i] = Math.floor(Math.random() * 41) + 60;
    }
    await giveExamineScore(8, examineScore);
    scores = examineScore
    printtable(courseIds, scores, '课程成绩', 8, '学生')

    examineScore = new Array(10).fill(0);
    for(let i = 0; i < examineScore.length; i++){
        // 随机生成60-100以内的数字
        examineScore[i] = Math.floor(Math.random() * 41) + 60;
    }
    await giveExamineScore(9, examineScore);
    scores = examineScore
    printtable(courseIds, scores, '课程成绩', 9, '学生')

    examineScore = new Array(10).fill(0);
    for(let i = 0; i < examineScore.length; i++){
        // 随机生成60-100以内的数字
        examineScore[i] = Math.floor(Math.random() * 41) + 60;
    }
    await giveExamineScore(10, examineScore);
    scores = examineScore
    printtable(courseIds, scores, '课程成绩', 10, '学生')

    let studentScores = new Array(10).fill(0);
    for(let i = 0; i < studentScores.length; i++){
        // 随机生成60-100以内的数字
        studentScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await switchThisUser("Student", "student_1");
    await studentGiveScore(studentScores);
    scores = studentScores
    printtable(courseIds, scores, '课程评分', 1, '学生')

    studentScores = new Array(10).fill(0);
    for(let i = 0; i < studentScores.length; i++){
        // 随机生成60-100以内的数字
        studentScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await switchThisUser("Student", "student_2");
    await studentGiveScore(studentScores);
    scores = studentScores
    printtable(courseIds, scores, '课程评分', 2, '学生')

    studentScores = new Array(10).fill(0);
    for(let i = 0; i < studentScores.length; i++){
        // 随机生成60-100以内的数字
        studentScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await switchThisUser("Student", "student_3");
    await studentGiveScore(studentScores);
    scores = studentScores
    printtable(courseIds, scores, '课程评分', 3, '学生')

    studentScores = new Array(10).fill(0);
    for(let i = 0; i < studentScores.length; i++){
        // 随机生成60-100以内的数字
        studentScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await switchThisUser("Student", "student_4");
    await studentGiveScore(studentScores);
    scores = studentScores
    printtable(courseIds, scores, '课程评分', 4, '学生')

    studentScores = new Array(10).fill(0);
    for(let i = 0; i < studentScores.length; i++){
        // 随机生成60-100以内的数字
        studentScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await switchThisUser("Student", "student_5");
    await studentGiveScore(studentScores);
    scores = studentScores
    printtable(courseIds, scores, '课程评分', 5, '学生')

    studentScores = new Array(10).fill(0);
    for(let i = 0; i < studentScores.length; i++){
        // 随机生成60-100以内的数字
        studentScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await switchThisUser("Student", "student_6");
    await studentGiveScore(studentScores);
    scores = studentScores
    printtable(courseIds, scores, '课程评分', 6, '学生')

    studentScores = new Array(10).fill(0);
    for(let i = 0; i < studentScores.length; i++){
        // 随机生成60-100以内的数字
        studentScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await switchThisUser("Student", "student_7");
    await studentGiveScore(studentScores);
    scores = studentScores
    printtable(courseIds, scores, '课程评分', 7, '学生')

    await switchThisUser("Student", "student_8");
    studentScores = new Array(10).fill(0);
    for(let i = 0; i < studentScores.length; i++){
        // 随机生成60-100以内的数字
        studentScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await studentGiveScore(studentScores);
    scores = studentScores
    printtable(courseIds, scores, '课程评分', 8, '学生')

    await switchThisUser("Student", "student_9");
    studentScores = new Array(10).fill(0);
    for(let i = 0; i < studentScores.length; i++){
        // 随机生成60-100以内的数字
        studentScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await studentGiveScore(studentScores);
    scores = studentScores
    printtable(courseIds, scores, '课程评分', 9, '学生')

    await switchThisUser("Student", "student_10");
    studentScores = new Array(10).fill(0);
    for(let i = 0; i < studentScores.length; i++){
        // 随机生成60-100以内的数字
        studentScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await studentGiveScore(studentScores);
    scores = studentScores
    printtable(courseIds, scores, '课程评分', 10, '学生')


    await switchThisUser("Class", "class_1");
    await endClassStudentGiveScore();
    await switchThisUser("Class", "class_2");
    await endClassStudentGiveScore();

    let courses;
    await switchThisUser("Teacher", "teacher_1");
    courses = await contract.getTeacherReallyAssignedCourses(1);
    courses = courses.map(id => Number(id));
    let result = courseIds.filter(item => !courses.includes(item));
    let teacherScores = new Array(10 - courses.length).fill(0);
    for(let i = 0; i < teacherScores.length; i++){
        // 随机生成60-100以内的数字
        teacherScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await teacherGiveScore(teacherScores);
    printtable(result, teacherScores, '课程评分', 1, '教师')

    await switchThisUser("Teacher", "teacher_2");
    courses = await contract.getTeacherReallyAssignedCourses(2);
    courses = courses.map(id => Number(id));
    result = courseIds.filter(item => !courses.includes(item))
    teacherScores = new Array(10 - courses.length).fill(0);
    for(let i = 0; i < teacherScores.length; i++){
        // 随机生成60-100以内的数字
        teacherScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await teacherGiveScore(teacherScores);
    printtable(result, teacherScores, '课程评分', 2, '教师')

    await switchThisUser("Teacher", "teacher_3");
    courses = await contract.getTeacherReallyAssignedCourses(3);
    courses = courses.map(id => Number(id));
    result = courseIds.filter(item => !courses.includes(item))
    teacherScores = new Array(10 - courses.length).fill(0);
    for(let i = 0; i < teacherScores.length; i++){
        // 随机生成60-100以内的数字
        teacherScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await teacherGiveScore(teacherScores);
    printtable(result, teacherScores, '课程评分', 3, '教师')

    await switchThisUser("Teacher", "teacher_4");
    courses = await contract.getTeacherReallyAssignedCourses(4);
    courses = courses.map(id => Number(id));
    result = courseIds.filter(item => !courses.includes(item))
    teacherScores = new Array(10 - courses.length).fill(0);
    for(let i = 0; i < teacherScores.length; i++){
        // 随机生成60-100以内的数字
        teacherScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await teacherGiveScore(teacherScores);
    printtable(result, teacherScores, '课程评分', 4, '教师')

    await switchThisUser("Teacher", "teacher_5");
    courses = await contract.getTeacherReallyAssignedCourses(5);
    courses = courses.map(id => Number(id));
    result = courseIds.filter(item => !courses.includes(item))
    teacherScores = new Array(10 - courses.length).fill(0);
    for(let i = 0; i < teacherScores.length; i++){
        // 随机生成60-100以内的数字
        teacherScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await teacherGiveScore(teacherScores);
    printtable(result, teacherScores, '课程评分', 5, '教师')
    
    await switchThisUser("Supervisor", "supervisor_1");
    let supervisorScores = new Array(10).fill(0);
    for(let i = 0; i < supervisorScores.length; i++){
        // 随机生成60-100以内的数字
        supervisorScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await supervisorGiveScore(supervisorScores);
    printtable(courseIds, supervisorScores, '课程评分', 1, '督导')

    await switchThisUser("Supervisor", "supervisor_2");
    supervisorScores = new Array(10).fill(0);
    for(let i = 0; i < supervisorScores.length; i++){
        // 随机生成60-100以内的数字
        supervisorScores[i] = Math.floor(Math.random() * 41) + 60;
    }
    await supervisorGiveScore(supervisorScores);
    printtable(courseIds, supervisorScores, '课程评分', 2, '督导')

    let machineRatings = []
    for(let i = 1; i <= 10; i++){
        machineRatings.push((await machineRating_auto(i)).machineRate);
    }
    let table = courseIds.map((courseId, index) => ({
        '课程ID': courseId,
        '机器评分': machineRatings[index]
    }))
    console.table(table)
    await calculateTotalScore();
    await printAssignments_gains();
    await printAllScore();
}

main()
