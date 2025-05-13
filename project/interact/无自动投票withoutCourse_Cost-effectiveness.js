const { ethers } = require("ethers");
const fs = require("fs");
const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:7545");
const inquirer = require('inquirer');
const path = require('path');

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
} = require("./autoInteract.js");


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

// 创建一个主函数来封装所有顶层的await调用
async function main() {
    await initializeData();
    await switchThisUser("Teacher", "teacher_1");
    await contract.setAllTeacherCourseSuitability(1, [60,72,82,94,70,68,89,96,57,93]);
    await contract.setAllTeacherCoursePreferences(1, [55,54,46,20,53,48,44,40,46,40]);

    await contract.setAllTeacherCourseSuitability(2, [71,62,73,64,85,66,77,88,95,73]);
    await contract.setAllTeacherCoursePreferences(2, [35,44,47,55,47,43,48,46,44,40]);

    await contract.setAllTeacherCourseSuitability(3, [62,61,74,73,68,77,64,72,58,70]);
    await contract.setAllTeacherCoursePreferences(3, [31,42,43,34,55,46,47,40,45,37]);

    await contract.setAllTeacherCourseSuitability(4, [73,64,65,66,97,68,79,80,81,63]);
    await contract.setAllTeacherCoursePreferences(4, [42,33,24,45,26,27,28,39,47,10]);

    await contract.setAllTeacherCourseSuitability(5, [62,83,84,75,100,77,71,72,73,74]);
    await contract.setAllTeacherCoursePreferences(5, [43,34,45,45,46,37,38,49,49,49]);

    await contract.setAllAgentCourseSuitability(1, [75,79,72,51,68,63,70,76,66,50]);
    await contract.setAllAgentCourseSuitability(2, [66,48,53,50,57,54,51,57,58,59]);

    // 创建提案
    await createProposal();
    // 初始化投票
    await init_teacherVote_auto(0, 1);
    await switchThisUser("Teacher", "teacher_2");
    await init_teacherVote_auto(0, 1);
    await switchThisUser("Teacher", "teacher_3");
    await init_teacherVote_auto(0, 1);
    await switchThisUser("Teacher", "teacher_4");
    await init_teacherVote_auto(0, 0);
    await switchThisUser("Teacher", "teacher_5");
    await init_teacherVote_auto(0, 0);
    // 执行提案
    await executeProposal_auto(0); // Cost-effectiveness

    // 检查课程重要性和智能体适合程度
    await checkCourseImportance();

    // 初始化课程分配
    await init_AgentCourses();
    await init_TeacherCourses();

    // 查看分配情况
    await printAssignments(); // 都没有分配

    // 检查课程冲突
    await checkCourseConflicts(); // 没有冲突

    // 预处理冲突课程
    await preprocessConflictCourses();

    // 为没有课程的老师投票选择课程
    console.log(await checkAndCreateProposalForTeacher());
    // 投票
    await switchThisUser("Teacher", "teacher_1");
    await voteForProposal(1, 1);

    await switchThisUser("Teacher", "teacher_2");
    await voteForProposal(1, 2);

    await switchThisUser("Teacher", "teacher_3");
    await voteForProposal(1, 3);

    await switchThisUser("Teacher", "teacher_4");
    await voteForProposal(1, 4);

    await switchThisUser("Teacher", "teacher_5");
    await voteForProposal(1, 5);

    await switchThisUser("Agent", "agent_1");
    await voteForProposal(1);

    await switchThisUser("Agent", "agent_2");
    await voteForProposal(1);

    await switchThisUser("Student", "student_1");
    await voteForProposal(1, 1);

    await switchThisUser("Student", "student_2");
    await voteForProposal(1, 1);

    await switchThisUser("Student", "student_3");
    await voteForProposal(1, 1);

    await switchThisUser("Student", "student_4");    
    await voteForProposal(1, 2);

    await switchThisUser("Student", "student_5");
    await voteForProposal(1, 2);

    await switchThisUser("Student", "student_6");
    await voteForProposal(1, 3);

    await switchThisUser("Student", "student_7");
    await voteForProposal(1, 3);

    await switchThisUser("Student", "student_8");
    await voteForProposal(1, 3);

    await switchThisUser("Student", "student_9");
    await voteForProposal(1, 4);

    await switchThisUser("Student", "student_10");
    await voteForProposal(1, 5);

    // 结束提案
    await switchThisUser("Class", "class_1");
    await endProposal("endClass", 1);
    await switchThisUser("Class", "class_2");
    await endProposal("endClass", 1);

    await endProposal("endWithoutCourse",1);

    // 查看分配情况
    await printAssignments();
    // ---------------------------------------------------------------------------------------------------
    // 为没有课程的老师投票选择课程
    console.log(await checkAndCreateProposalForTeacher());
    // 投票
    await switchThisUser("Teacher", "teacher_1");
    await voteForProposal(2, 5);

    await switchThisUser("Teacher", "teacher_2");
    await voteForProposal(2, 2);

    await switchThisUser("Teacher", "teacher_3");
    await voteForProposal(2, 3);

    await switchThisUser("Teacher", "teacher_4");
    await voteForProposal(2, 4);

    await switchThisUser("Teacher", "teacher_5");
    await voteForProposal(2, 5);

    await switchThisUser("Agent", "agent_1");
    await voteForProposal(2);

    await switchThisUser("Agent", "agent_2");
    await voteForProposal(2);

    await switchThisUser("Student", "student_1");
    await voteForProposal(2, 5);

    await switchThisUser("Student", "student_2");
    await voteForProposal(2, 5);

    await switchThisUser("Student", "student_3");
    await voteForProposal(2, 2);

    await switchThisUser("Student", "student_4");    
    await voteForProposal(2, 2);

    await switchThisUser("Student", "student_5");
    await voteForProposal(2, 2);

    await switchThisUser("Student", "student_6");
    await voteForProposal(2, 3);

    await switchThisUser("Student", "student_7");
    await voteForProposal(2, 3);

    await switchThisUser("Student", "student_8");
    await voteForProposal(2, 3);

    await switchThisUser("Student", "student_9");
    await voteForProposal(2, 4);

    await switchThisUser("Student", "student_10");
    await voteForProposal(2, 4);

    // 结束提案
    await switchThisUser("Class", "class_1");
    await endProposal("endClass", 2);
    await switchThisUser("Class", "class_2");
    await endProposal("endClass", 2);

    await endProposal("endWithoutCourse",2);

    // 查看分配情况
    await printAssignments();

    // ------------------------------------------第三次---------------------------------------------------------
    // 为没有课程的老师投票选择课程
    console.log(await checkAndCreateProposalForTeacher());
    // 投票
    await switchThisUser("Teacher", "teacher_1");
    await voteForProposal(3, 2);

    await switchThisUser("Teacher", "teacher_2");
    await voteForProposal(3, 2);

    await switchThisUser("Teacher", "teacher_3");
    await voteForProposal(3, 3);

    await switchThisUser("Teacher", "teacher_4");
    await voteForProposal(3, 3);

    await switchThisUser("Teacher", "teacher_5");
    await voteForProposal(3, 4);

    await switchThisUser("Agent", "agent_1");
    await voteForProposal(3);

    await switchThisUser("Agent", "agent_2");
    await voteForProposal(3);

    await switchThisUser("Student", "student_1");
    await voteForProposal(3, 4);

    await switchThisUser("Student", "student_2");
    await voteForProposal(3, 4);

    await switchThisUser("Student", "student_3");
    await voteForProposal(3, 4);

    await switchThisUser("Student", "student_4");    
    await voteForProposal(3, 2);

    await switchThisUser("Student", "student_5");
    await voteForProposal(3, 2);

    await switchThisUser("Student", "student_6");
    await voteForProposal(3, 3);

    await switchThisUser("Student", "student_7");
    await voteForProposal(3, 3);

    await switchThisUser("Student", "student_8");
    await voteForProposal(3, 3);

    await switchThisUser("Student", "student_9");
    await voteForProposal(3, 4);

    await switchThisUser("Student", "student_10");
    await voteForProposal(3, 4);

    // 结束提案
    await switchThisUser("Class", "class_1");
    await endProposal("endClass", 3);
    await switchThisUser("Class", "class_2");
    await endProposal("endClass", 3);

    await endProposal("endWithoutCourse",3);

    // 查看分配情况
    await printAssignments();

    // ------------------------------------------第四次---------------------------------------------------------
    // 为没有课程的老师投票选择课程
    console.log(await checkAndCreateProposalForTeacher());
    // 投票
    await switchThisUser("Teacher", "teacher_1");
    await voteForProposal(4, 3);

    await switchThisUser("Teacher", "teacher_2");
    await voteForProposal(4, 3);

    await switchThisUser("Teacher", "teacher_3");
    await voteForProposal(4, 3);

    await switchThisUser("Teacher", "teacher_4");
    await voteForProposal(4, 4);

    await switchThisUser("Teacher", "teacher_5");
    await voteForProposal(4, 4);

    await switchThisUser("Agent", "agent_1");
    await voteForProposal(4);

    await switchThisUser("Agent", "agent_2");
    await voteForProposal(4);

    await switchThisUser("Student", "student_1");
    await voteForProposal(4, 4);

    await switchThisUser("Student", "student_2");
    await voteForProposal(4, 4);

    await switchThisUser("Student", "student_3");
    await voteForProposal(4, 4);

    await switchThisUser("Student", "student_4");    
    await voteForProposal(4, 2);

    await switchThisUser("Student", "student_5");
    await voteForProposal(4, 2);

    await switchThisUser("Student", "student_6");
    await voteForProposal(4, 3);

    await switchThisUser("Student", "student_7");
    await voteForProposal(4, 3);

    await switchThisUser("Student", "student_8");
    await voteForProposal(4, 3);

    await switchThisUser("Student", "student_9");
    await voteForProposal(4, 4);

    await switchThisUser("Student", "student_10");
    await voteForProposal(4, 4);

    // 结束提案
    await switchThisUser("Class", "class_1");
    await endProposal("endClass", 4);
    await switchThisUser("Class", "class_2");
    await endProposal("endClass", 4);

    await endProposal("endWithoutCourse",4);

    // 查看分配情况
    await printAssignments();

    // ------------------------------------------第五次---------------------------------------------------------
    // 为没有课程的老师投票选择课程
    console.log(await checkAndCreateProposalForTeacher());

    // 查看分配情况
    await printAssignments();

    // ------------------------------------------第六次---------------------------------------------------------
    // 为没有老师的课程创建提案
    console.log(await proposalForCoursesWithoutAssigned());

    // 投票
    await switchThisUser("Teacher", "teacher_1");
    await voteForProposal(5, 1);

    await switchThisUser("Teacher", "teacher_2");
    await voteForProposal(5, 2);

    await switchThisUser("Teacher", "teacher_3");
    await voteForProposal(5, 3);

    await switchThisUser("Teacher", "teacher_4");
    await voteForProposal(5, 4);

    await switchThisUser("Teacher", "teacher_5");
    await voteForProposal(5, 5);

    await switchThisUser("Agent", "agent_1");
    await voteForProposal(5);

    await switchThisUser("Agent", "agent_2");
    await voteForProposal(5);

    await switchThisUser("Student", "student_1");
    await voteForProposal(5, 1);

    await switchThisUser("Student", "student_2");
    await voteForProposal(5, 1);

    await switchThisUser("Student", "student_3");
    await voteForProposal(5, 1);

    await switchThisUser("Student", "student_4");    
    await voteForProposal(5, 2);

    await switchThisUser("Student", "student_5");
    await voteForProposal(5, 2);

    await switchThisUser("Student", "student_6");
    await voteForProposal(5, 3);

    await switchThisUser("Student", "student_7");
    await voteForProposal(5, 3);

    await switchThisUser("Student", "student_8");
    await voteForProposal(5, 3);

    await switchThisUser("Student", "student_9");
    await voteForProposal(5, 4);

    await switchThisUser("Student", "student_10");
    await voteForProposal(5, 5);

    // 结束提案
    await switchThisUser("Class", "class_1");
    await endProposal("endClass", 5);
    await switchThisUser("Class", "class_2");
    await endProposal("endClass", 5);

    await endProposal("endWithoutCourse",5);

    // 查看分配情况
    await printAssignments();

    // ------------------------------------------第七次---------------------------------------------------------
    // 为没有老师的课程创建提案
    console.log(await proposalForCoursesWithoutAssigned());

    // 投票
    await switchThisUser("Teacher", "teacher_1");
    await voteForProposal(6, 1);

    await switchThisUser("Teacher", "teacher_2");
    await voteForProposal(6, 2);

    await switchThisUser("Teacher", "teacher_3");
    await voteForProposal(6, 3);

    await switchThisUser("Teacher", "teacher_4");
    await voteForProposal(6, 4);

    await switchThisUser("Teacher", "teacher_5");
    await voteForProposal(6, 1);

    await switchThisUser("Agent", "agent_1");
    await voteForProposal(6);

    await switchThisUser("Agent", "agent_2");
    await voteForProposal(6);

    await switchThisUser("Student", "student_1");
    await voteForProposal(6, 1);

    await switchThisUser("Student", "student_2");
    await voteForProposal(6, 1);

    await switchThisUser("Student", "student_3");
    await voteForProposal(6, 2);

    await switchThisUser("Student", "student_4");    
    await voteForProposal(6, 2);

    await switchThisUser("Student", "student_5");
    await voteForProposal(6, 2);

    await switchThisUser("Student", "student_6");
    await voteForProposal(6, 3);

    await switchThisUser("Student", "student_7");
    await voteForProposal(6, 3);

    await switchThisUser("Student", "student_8");
    await voteForProposal(6, 3);

    await switchThisUser("Student", "student_9");
    await voteForProposal(6, 4);

    await switchThisUser("Student", "student_10");
    await voteForProposal(6, 1);

    // 结束提案
    await switchThisUser("Class", "class_1");
    await endProposal("endClass", 6);
    await switchThisUser("Class", "class_2");
    await endProposal("endClass", 6);

    await endProposal("endWithoutCourse",6);

    // 查看分配情况
    await printAssignments();

    // ------------------------------------------第八次---------------------------------------------------------
    // 为没有老师的课程创建提案
    console.log(await proposalForCoursesWithoutAssigned());

    // 投票
    await switchThisUser("Teacher", "teacher_1");
    await voteForProposal(7, 2);

    await switchThisUser("Teacher", "teacher_2");
    await voteForProposal(7, 2);

    await switchThisUser("Teacher", "teacher_3");
    await voteForProposal(7, 3);

    await switchThisUser("Teacher", "teacher_4");
    await voteForProposal(7, 3);

    await switchThisUser("Teacher", "teacher_5");
    await voteForProposal(7, 4);

    await switchThisUser("Agent", "agent_1");
    await voteForProposal(7);

    await switchThisUser("Agent", "agent_2");
    await voteForProposal(7);

    await switchThisUser("Student", "student_1");
    await voteForProposal(7, 1);

    await switchThisUser("Student", "student_2");
    await voteForProposal(7, 1);

    await switchThisUser("Student", "student_3");
    await voteForProposal(7, 2);

    await switchThisUser("Student", "student_4");    
    await voteForProposal(7, 2);

    await switchThisUser("Student", "student_5");
    await voteForProposal(7, 2);

    await switchThisUser("Student", "student_6");
    await voteForProposal(7, 3);

    await switchThisUser("Student", "student_7");
    await voteForProposal(7, 3);

    await switchThisUser("Student", "student_8");
    await voteForProposal(7, 4);

    await switchThisUser("Student", "student_9");
    await voteForProposal(7, 4);

    await switchThisUser("Student", "student_10");
    await voteForProposal(7, 4);

    // 结束提案
    await switchThisUser("Class", "class_1");
    await endProposal("endClass", 7);
    await switchThisUser("Class", "class_2");
    await endProposal("endClass", 7);

    await endProposal("endWithoutCourse",7);

    // 查看分配情况
    await printAssignments();

    // ------------------------------------------第九次---------------------------------------------------------
    // 为没有老师的课程创建提案
    console.log(await proposalForCoursesWithoutAssigned());

    // 投票
    await switchThisUser("Teacher", "teacher_1");
    await voteForProposal(8, 3);

    await switchThisUser("Teacher", "teacher_2");
    await voteForProposal(8, 3);

    await switchThisUser("Teacher", "teacher_3");
    await voteForProposal(8, 3);

    await switchThisUser("Teacher", "teacher_4");
    await voteForProposal(8, 4);

    await switchThisUser("Teacher", "teacher_5");
    await voteForProposal(8, 4);

    await switchThisUser("Agent", "agent_1");
    await voteForProposal(8);

    await switchThisUser("Agent", "agent_2");
    await voteForProposal(8);

    await switchThisUser("Student", "student_1");
    await voteForProposal(8, 3);

    await switchThisUser("Student", "student_2");
    await voteForProposal(8, 3);

    await switchThisUser("Student", "student_3");
    await voteForProposal(8, 3);

    await switchThisUser("Student", "student_4");    
    await voteForProposal(8, 3);

    await switchThisUser("Student", "student_5");
    await voteForProposal(8, 4);

    await switchThisUser("Student", "student_6");
    await voteForProposal(8, 3);

    await switchThisUser("Student", "student_7");
    await voteForProposal(8, 3);

    await switchThisUser("Student", "student_8");
    await voteForProposal(8, 4);

    await switchThisUser("Student", "student_9");
    await voteForProposal(8, 4);

    await switchThisUser("Student", "student_10");
    await voteForProposal(8, 4);

    // 结束提案
    await switchThisUser("Class", "class_1");
    await endProposal("endClass", 8);
    await switchThisUser("Class", "class_2");
    await endProposal("endClass", 8);

    await endProposal("endWithoutCourse",8);

    // 查看分配情况
    await printAssignments();

    // ------------------------------------------第十次---------------------------------------------------------
    // 为没有老师的课程创建提案
    console.log(await proposalForCoursesWithoutAssigned());
    // 查看分配情况
    await printAssignments();
}

// 调用主函数
main().catch(console.error);