const { ethers } = require("ethers");
const fs = require("fs");
require('dotenv').config({ path: './interact/.env' });
const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:7545");

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
// 创建合约实例
let contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
let voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
let classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
const scoreMax = 100;

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


// 老师自评,一次把自己所有课程的分数都填好
async function giveScoreByMyself(teacherAddress, scores) {
    if(scores>scoreMax || scores<0) {
        return {
            code: -1,
            message: "分数超出范围"
        }
    }
    let teacherId = await contract.addressToTeacherId(teacherAddress);
    let reallyAssignedCourses = await contract.getTeacherReallyAssignedCourses(teacherId);
    if(reallyAssignedCourses.length != scores.length) {
        console.log("输入的分数数量与分配的课程数量不匹配");
        return {
            code: -1,
            message: "输入的分数数量与分配的课程数量不匹配"
        };
    }
    for (let i = 0; i < reallyAssignedCourses.length; i++) {
        await contract.setCourseSelfScore(reallyAssignedCourses[i], scores[i]);
    }
    return {
        code: 0,
        message: "自评成功"
    };
}

// 学生打分 一次给所有课程评分
async function giveScoreStudent(scores) {
    await classContract.studentSetCourseSuitability(scores)
}

// 等这个班级全部打分完毕后调用，学生打分总结到班级(在那个分数结构体中)
async function giveScoreStudentToClass(classAddress, courseId) {
    let classId = await classContract.addressToClassId(classAddress);
    let studentIds = await classContract.getStudents();
    // 遍历studentIds，找到classId对应的学生评分，将其加入到classContract的classScores中
    let thisStudentScore;
    let totalScore = 0;
    let studentScores = [];
    for (let i = 0; i < studentIds.length; i++) {
        thisStudentScore = await classContract.getStudentCourseSuitability(studentIds[i], courseId);
        studentScores.push(thisStudentScore);
    }
    studentScores.sort((a, b) => a - b); // 升序排序
    // 去除前35%和后35%的数
    let number = studentScores.length * 0.35; // 去掉35%的数before和after
    let before = Math.floor(number); // 向下取整
    studentScores = studentScores.slice(before, classScores.length - before);
    // 计算平均值
    for (let i = 0; i < studentScores.length; i++) {
        totalScore += studentScores[i];  
    }
    totalScore /= studentIds.length;
    giveScoreByClass(courseId, classId, totalScore);
}

// 班级评价
async function giveScoreByClass(courseId, classId, score) {
    if(score>scoreMax || score<0) {
        return {
            code: -1,
            message: "分数超出范围"
        }
    }
    let courseId = await contract.addressToClassId(courseAddress);
    await contract.addCourseClassScores(courseId, classId, score);
    return {
        code: 0,
        message: "班级评价成功"
    };
}

// 督导评价,给某一门课程评分
async function giveScoreBySupervisor(supervisorAddress, courseId, scores) {
    if(scores>scoreMax || scores<0) {
        return {
            code: -1,
            message: "分数超出范围"
        }
    }
    let supervisorId = await contract.addressToSupervisorId(supervisorAddress);
    await contract.setSupervisorsCourseScore(supervisorId, courseId, scores);// 设置督导评价分数
    await contract.addCourseSupervisorScores(courseId, supervisorId, scores);// 设置课程的督导评分
    return {
        code: 0,
        message: "督导评价成功" 
    }
}

// 计算课程总分数
async function calculateCourseTotalScore(courseId) {
    // 看当前课程的老师是不是教师而不是智能体
    let AssignedTeacher = await contract.getCoursesAssignedTeacher(courseId);
    if (AssignedTeacher.length != 1) {
        console.log("当前课程的老师不是教师");
        return {
            code: -1,
            message: "当前课程的老师不是教师"
        };
    }
    let courseScores = await contract.courseScores(courseId);
    let classScores = await contract.getCourseClassScores(courseId);  // 一个数组
    let supervisorScores = await contract.getCourseSupervisorScores(courseId); // 一个数组
    let selfScore = courseScores.selfScore;
    // 计算班级的平均分数
    let classScoreAvg = 0;
    // 计算分数的平均值
    for (let i = 0; i < classScores.length; i++) {
        classScoreAvg += classScores[i]; 
    }
    classScoreAvg /= classScores.length;
    // 计算督导的平均分数
    let supervisorScoreAvg = 0;
    for (let i = 0; i < supervisorScores.length; i++) {
        supervisorScoreAvg += supervisorScores[i];
    }
    supervisorScoreAvg /= supervisorScores.length;
    // 计算总加权后分数
    let totalScore = selfScore * 0.3 + classScoreAvg * 0.3 + supervisorScoreAvg * 0.4;

    // 通过分数改变适合程度
    let teacherId = AssignedTeacher[0];
    let suitOriginal = await contract.getTeacherSuitability(teacherId, courseId);
    let suitAfter = suitOriginal * 0.5 + totalScore * 0.5; // 范围0-100
    await contract.setTeacherCourseSuitability(teacherId, courseId, suitAfter);
    
    return {
        code: 0,
        message: "计算课程总分数成功",
        data: totalScore
    };
}

async function main() {
    await initializeData(); 
}