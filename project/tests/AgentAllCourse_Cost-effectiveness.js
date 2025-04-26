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
    switchCurrentSigner_newinteract,
    checkCourseImportance,
    voteForProposal,
    endProposal
} = require("../interact/autoInteract.js");

async function switchCurrentSigner_nowTestjs(newAddress, newCurrentName){
    currentSigner = provider.getSigner(newAddress);
    currentName = newCurrentName;
    contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    teacherVoteContract = new ethers.Contract(teacherVoteAddress, teacherVoteABI, currentSigner);
}

async function initData(){
    await contract.setAllTeacherCourseSuitability(1, [26,44,65,88,40,37,79,92,14,87]);
    await contract.setAllTeacherCoursePreferences(1, [35,54,76,80,93,48,64,17,86,70]);

    await contract.setAllTeacherCourseSuitability(2, [51,32,53,34,85,26,37,48,55,43]);
    await contract.setAllTeacherCoursePreferences(2, [35,74,17,95,57,23,88,46,64,60]);

    await contract.setAllTeacherCourseSuitability(3, [32,31,54,43,68,27,44,72,58,30]);
    await contract.setAllTeacherCoursePreferences(3, [51,32,83,14,95,76,27,70,45,67]);

    await contract.setAllTeacherCourseSuitability(4, [43,24,35,36,67,18,39,80,61,33]);
    await contract.setAllTeacherCoursePreferences(4, [22,63,44,85,66,87,38,79,57,60]);

    await contract.setAllTeacherCourseSuitability(5, [22,43,44,35,100,37,31,32,33,34]);
    await contract.setAllTeacherCoursePreferences(5, [43,14,75,35,46,67,28,59,59,79]);


    await contract.setAllAgentCourseSuitability(1, [75,99,72,91,88,73,70,76,86,100]);
    await contract.setAllAgentCourseSuitability(2, [86,98,93,90,87,94,91,97,88,99]);
}
async function switchThisUser(userType, userName, userId = -1) {
    let userResult = await switchUser_auto(userType, userName, userId);
    if(userResult.code === 0){
        currentName = userResult.currentName;
        currentType = userResult.currentType;
        let currentAddress = userResult.currentAddress;
        await switchCurrentSigner_newinteract(userType, currentAddress, currentName);
        await switchCurrentSigner_studentClass(currentAddress, currentName);
        await switchCurrentSigner_courseAllocation(currentAddress, currentName);
        await switchCurrentSigner_test1(currentAddress);
        await switchCurrentSigner_courseScore(currentAddress);
        await switchCurrentSigner_nowTestjs(currentAddress, currentName);
    }
} 

async function autoVote(proposal){
    let proposalId = proposal.proposalId;
    let classProposalId = proposal.classProposalId;
    // 智能体投票
    await switchThisUser('Agent', 'agent_1');
    let result = await voteForProposal(proposalId);
    console.log(result)
    let str = result.message;
    let startIndex = str.indexOf('teacher ') + 'teacher '.length;
    let endIndex = str.indexOf(' successfully');
    let chooseId = str.substring(startIndex, endIndex);
    console.log(chooseId);

    await switchThisUser('Agent', 'agent_2');
    await voteForProposal(proposalId);
    // 教师投票
    for (let i = 1; i <= 5; i++) {
        await switchThisUser('Teacher', `teacher_${i}`);
        if(i == 1 || i ==3 || i==5){
            console.log(await voteForProposal(proposalId, chooseId));
        }else{
            let length = proposal.teacherWithoutCourse.length;
            let random_chioce = Math.floor(Math.random() * length);
            console.log(await voteForProposal(proposalId, proposal.teacherWithoutCourse[random_chioce]));
        }
    }
    for (let i = 1; i <= 2; i++) {
        let voteCounts = proposal.teacherWithoutCourse.reduce((acc, teacher) => {
            acc[teacher] = 0; // 初始化每个教师的票数为 0
            return acc;
        }, {});
        
        for (let j = 1; j <= 5; j++) {
            await switchThisUser('Student', `student_${j + (i - 1) * 5}`);
            let randomChoice;
            if(j!==5){
                let length = proposal.teacherWithoutCourse.length;
                randomChoice = proposal.teacherWithoutCourse[Math.floor(Math.random() * length)];
                // console.log(randomChoice)
            }else{
                // 获取当前票数最多的教师及其票数
                let maxVotes = 0;
                let maxTeachers = [];
                for (const teacher in voteCounts) {
                    if (voteCounts[teacher] > maxVotes) {
                        maxVotes = voteCounts[teacher];
                        maxTeachers = [teacher];
                    } else if (voteCounts[teacher] === maxVotes) {
                        maxTeachers.push(teacher);
                    }
                }
            
                // 选择票数最高的老师投票
                if (maxTeachers.length > 0) {
                    let randomIndex = Math.floor(Math.random() * maxTeachers.length);
                    // console.log(randomIndex)
                    randomChoice = Number(maxTeachers[randomIndex]);
                    // console.log(randomChoice)
                }
            }
            
            // 投票并更新票数统计
            const voteResult = await voteForProposal(classProposalId, randomChoice);
            console.log(voteResult);
        
            // 更新票数统计
            voteCounts[randomChoice]++;
        }
        await switchThisUser('Class', `class_${i}`, 0);
        await endProposal('endClass', classProposalId)
    }
}
async function begin(){
    await initializeData();
    await switchThisUser('Teacher', 'teacher_1');
    await initData();
    // 设置课程重要程度
    await set_ImportanceForAllCourses([1,7,1,10,5,2,8,4,8,10]);
    await switchThisUser('Teacher', 'teacher_2');
    await set_ImportanceForAllCourses([3,9,1,9,7,1,7,6,6,10]);
    await switchThisUser('Teacher', 'teacher_3');
    await set_ImportanceForAllCourses([4,6,1,8,5,2,7,3,5,10]);
    await switchThisUser('Teacher', 'teacher_4');
    await set_ImportanceForAllCourses([5,8,1,9,5,4,8,4,4,10]);
    await switchThisUser('Teacher', 'teacher_5');
    await set_ImportanceForAllCourses([2,5,1,9,3,1,10,3,7,10]);
    
    await save_AverageImportance();
    await checkCourseImportance();

    // 确定规则为性价比
    await switchThisUser('Teacher', 'teacher_1');
    await createProposal();
    await init_teacherVote_auto(0, 1);
    await switchThisUser('Teacher', 'teacher_2');
    await init_teacherVote_auto(0, 1);
    await switchThisUser('Teacher', 'teacher_3');
    await init_teacherVote_auto(0, 0);
    await switchThisUser('Teacher', 'teacher_4');
    await init_teacherVote_auto(0, 1);
    await switchThisUser('Teacher', 'teacher_5');
    await init_teacherVote_auto(0, 0);
    await executeProposal_auto(0);

    // 初始化智能体课程分配
    await init_AgentCourses();
    // 查看课程分配情况
    await printAssignments();

    for(let k = 1; k <= 4; k++){
        // 为没有课程的老师创建提案
        let proposal = await checkAndCreateProposalForTeacher();
        console.log(proposal)
        await autoVote(proposal)

        await switchThisUser('Teacher', `teacher_1`);
        await endProposal(`other`, proposal.proposalId);
        await printAssignments()
    }
    await switchThisUser('Teacher', `teacher_1`);
    let proposal = await checkAndCreateProposalForTeacher();
    console.log(proposal)
    await printAssignments();
}
begin();
// node tests/AgentAllCourse_Cost-effectiveness.js