async function autoVote_teacherWithoutCourse(proposal){
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

async function autoVote_conflictProposal(proposal){
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
            let length = proposal.candidateTeacherId.length;
            let random_chioce = Math.floor(Math.random() * length);
            console.log(await voteForProposal(proposalId, proposal.candidateTeacherId[random_chioce]));
        }
    }
    for (let i = 1; i <= 2; i++) {
        let voteCounts = proposal.candidateTeacherId.reduce((acc, teacher) => {
            acc[teacher] = 0; // 初始化每个教师的票数为 0
            return acc;
        }, {});
        
        for (let j = 1; j <= 5; j++) {
            await switchThisUser('Student', `student_${j + (i - 1) * 5}`);
            let randomChoice;
            if(j!==5){
                let length = proposal.candidateTeacherId.length;
                randomChoice = proposal.candidateTeacherId[Math.floor(Math.random() * length)];
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

async function autoVote_coursesWithoutTeacher(proposal){
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
            let length = proposal.candidateTeacher.length;
            let random_chioce = Math.floor(Math.random() * length);
            console.log(await voteForProposal(proposalId, proposal.candidateTeacher[random_chioce]));
        }
    }
    for (let i = 1; i <= 2; i++) {
        let voteCounts = proposal.candidateTeacher.reduce((acc, teacher) => {
            acc[teacher] = 0; // 初始化每个教师的票数为 0
            return acc;
        }, {});
        
        for (let j = 1; j <= 5; j++) {
            await switchThisUser('Student', `student_${j + (i - 1) * 5}`);
            let randomChoice;
            if(j!==5){
                let length = proposal.candidateTeacher.length;
                randomChoice = proposal.candidateTeacher[Math.floor(Math.random() * length)];
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

async function initData(){
    await contract.setAllTeacherCourseSuitability(1, [60,61,62,74,52,68,89,96,57,93]);
    await contract.setAllTeacherCoursePreferences(1, [65,64,66,62,63,48,44,40,46,40]);

    await contract.setAllTeacherCourseSuitability(2, [71,62,73,64,85,76,77,78,75,63]);
    await contract.setAllTeacherCoursePreferences(2, [35,44,47,55,47,63,68,66,64,60]);

    await contract.setAllTeacherCourseSuitability(3, [62,61,74,73,78,77,64,72,58,70]);
    await contract.setAllTeacherCoursePreferences(3, [31,42,43,34,55,46,47,40,45,37]);

    await contract.setAllTeacherCourseSuitability(4, [73,64,65,66,97,68,79,80,81,63]);
    await contract.setAllTeacherCoursePreferences(4, [42,33,24,45,26,27,28,39,47,10]);

    await contract.setAllTeacherCourseSuitability(5, [62,83,84,75,100,77,71,72,73,74]);
    await contract.setAllTeacherCoursePreferences(5, [43,34,45,45,46,37,38,49,49,49]);


    await contract.setAllAgentCourseSuitability(1, [75,79,72,51,68,63,70,76,66,50]);
    await contract.setAllAgentCourseSuitability(2, [66,48,53,50,57,54,51,57,58,59]);

    await contract.setTeacherValue(1, 800);
    await contract.setTeacherValue(2, 1200);
    await contract.setTeacherValue(3, 1000);
    await contract.setTeacherValue(4, 1100);
    await contract.setTeacherValue(5, 1300);
}

async function main() {
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

    // 确定规则为能力和意愿加权
    await switchThisUser('Teacher', 'teacher_1');
    await createProposal();
    await init_teacherVote_auto(0, 0);
    await switchThisUser('Teacher', 'teacher_2');
    await init_teacherVote_auto(0, 0);
    await switchThisUser('Teacher', 'teacher_3');
    await init_teacherVote_auto(0, 0);
    await switchThisUser('Teacher', 'teacher_4');
    await init_teacherVote_auto(0, 1);
    await switchThisUser('Teacher', 'teacher_5');
    await init_teacherVote_auto(0, 0);
    await executeProposal_auto(0);

    // 初始化智能体课程分配
    await init_AgentCourses();
    // 初始化教师课程分配
    await init_TeacherCourses();
    // 查看课程分配情况
    await printAssignments();
    // 检查课程冲突
    await checkCourseConflicts(); // 没有冲突
    // 预处理冲突课程
    await preprocessConflictCourses();

    for(let k = 1; k <= 2; k++){
        // 为没有课程的老师创建提案
        let proposal = await checkAndCreateProposalForTeacher();
        console.log(proposal)
        await autoVote_teacherWithoutCourse(proposal)

        await switchThisUser('Teacher', `teacher_1`);
        await endProposal(`other`, proposal.proposalId);
        await printAssignments_gains();
    }
    console.log(await checkAndCreateProposalForTeacher());
    await printAssignments_gains();

    for(let k = 1; k <= 2; k++){
        // 为没有课程的老师创建提案
        let proposal = await proposalForCoursesWithoutAssigned();
        console.log(proposal)
        await autoVote_coursesWithoutTeacher(proposal)

        await switchThisUser('Teacher', `teacher_1`);
        await endProposal(`other`, proposal.proposalId);
        await printAssignments_gains();
    }
    console.log(await proposalForCoursesWithoutAssigned());
    await printAssignments_gains();
}
// 调用主函数
main().catch(console.error);