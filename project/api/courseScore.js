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

// 老师自评
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

// 学生打分
async function giveScoreStudent(scores) {
    await classContract.studentSetCourseSuitability(scores)
}

// 等这个班级全部打分完毕，学生打分总结到班级(在那个分数结构体中)
async function giveScoreStudentToClass(classAddress, courseAddress) {
    let classId = await classContract.addressToClassId(classAddress);
    let courseId = await contract.addressToClassId(courseAddress);
    let thisClass = await classContract.classes(classId);
    let studentIds = await classContract.getStudents();
    // 遍历studentIds，找到classId对应的学生评分，将其加入到classContract的classScores中
    let thisStudentScore;
    let totalScore = 0;
    for (let i = 0; i < studentIds.length; i++) {
        thisStudentScore = await classContract.getStudentCourseSuitability(studentIds[i], courseId);
        totalScore += thisStudentScore;
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

// 督导评价
async function giveScoreBySupervisor(supervisorAddress, courseAddress, scores) {
    if(scores>scoreMax || scores<0) {
        return {
            code: -1,
            message: "分数超出范围"
        }
    }
    let courseId = await contract.addressToClassId(courseAddress);
    let supervisorId = await contract.addressToSupervisorId(supervisorAddress);
    await contract.setSupervisorsCourseScore(supervisorId, courseId, scores);// 设置督导评价分数
    await contract.addCourseSupervisorScores(courseId, supervisorId, scores);// 设置课程的督导评分
    return {
        code: 0,
        message: "督导评价成功" 
    }
}

// 计算课程总分数
async function calculateCourseTotalScore(courseAddress) {
    let courseId = await contract.addressToClassId(courseAddress);
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
    // 对classScores排序
    classScores.sort((a, b) => a - b); // 升序排序
    let number = classScores.length * 0.35; // 去掉35%的数before和after
    let before = Math.floor(number); // 向下取整
    // let after = Math.ceil(number); // 向上取整
    // 去掉35%最高分和最低分
    classScores = classScores.slice(before, classScores.length - before);
    // 计算剩余分数的平均值
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