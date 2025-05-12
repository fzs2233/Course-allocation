const { ethers } = require("ethers");
const fs = require("fs");
require('dotenv').config({ path: './interact/.env.visible' });
const inquirer = require('inquirer');
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
    printAssignments,
} = require("../api/courseAllocation.js");

const {
    getMachineRatingPython
} = require("../api/api_py.js");

// 老师互评,一次把除自己外所有课程的分数都填好
async function giveScoreByTeacher(teacherAddress, courseIds, scores) {
    for (let i = 0; i < scores.length; i++) {
        if(scores[i]>scoreMax || scores[i]<0) {
            return {
                code: -1,
                message: "有分数超出范围",
                data: {
                    scoreIndex: i,
                    score: scores[i]
                }
            }
        }
    }
    
    let teacherId = await contract.addressToTeacherId(teacherAddress);
    if(teacherId==0) {
        return {
            code: -1,
            message: "当前账户不是老师" 
        } 
    }
    if(courseIds.length != scores.length) {
        console.log("输入的分数数量与互评的课程数量不匹配");
        return {
            code: -1,
            message: "输入的分数数量与互评的课程数量不匹配"
        };
    }
    for (let i = 0; i < courseIds.length; i++) {
        await contract.addTeacherScores(courseIds[i], teacherId, scores[i]);
    }
    return {
        code: 0,
        message: "老师互评成功"
    };
}

// 智能体自评,一次把自己所有课程的分数都填好
async function giveScoreByAgentSelf(AgentAddress, scores) {
    for (let i = 0; i < scores.length; i++) {
        if(scores[i]>scoreMax || scores[i]<0) {
            return {
                code: -1,
                message: "有分数超出范围",
                data: {
                    scoreIndex: i,
                    score: scores[i]
                }
            }
        }
    }
    let agentId = await contract.addressToAgentId(AgentAddress);
    if(agentId==0) {
        return {
            code: -1,
            message: "当前账户不是智能体"
        } 
    }
    let reallyAssignedCourses = await contract.getAgentAssignedCourses(agentId);
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
        message: "智能体自评成功"
    };
}

// 学期结束后学生考试分数
async function examineScore(courseId, scores) {
    let studentIds = await classContract.getStudentIds();
    if (scores.length !== studentIds.length) {
        return {
            code: -1,
            message: `输入的分数数量${scores.length}与学生数量${studentIds.length}不匹配`
        }; 
    }
    for (let i = 0; i < scores.length; i++) {
        await classContract.setStudentCourseScore(studentIds[i], courseId, scores[i]);
        thisStudentCourseScore = await classContract.getStudentCourseScore(studentIds[i], courseId);
        // console.log(`学生Id:${studentIds[i]} 课程Id:${courseId} 考试分数:${thisStudentCourseScore}`);
    } 
    return {
        code: 0,
        message: "考试分数录入成功"
    }
}

// 学生打分 一次给所有课程评分
async function giveScoreStudent(scores, courseIds) {
    await classContract.studentSetCourseSuitability(scores, courseIds)
}

// 等这个班级全部打分完毕后调用，学生打分总结到班级(在那个分数结构体中)
async function giveScoreStudentToClass(classAddress, courseId) {
    
    let classId = await classContract.addressToClassId(classAddress);
    classId = Number(classId); // 转换为数字类型，因为返回的是BigNumber类型
    if(classId==0) {
        return {
            code: -1,
            message: "--------当前账户不是班级---------"
        }
    }
    let studentIds = await classContract.getStudents();
    studentIds = studentIds.map(id => Number(id));
    
    // 遍历studentIds，找到classId对应的学生评分，将其加入到classContract的classScores中
    let thisStudentScore;
    let thisStudentCourseScore;
    let totalScore = 0;
    let studentScores = [];
    // console.log("学生：",studentIds);
    for (let i = 0; i < studentIds.length; i++) {
        thisStudentScore = await classContract.getStudentCourseSuitability(studentIds[i], courseId);
        thisStudentCourseScore = await classContract.getStudentCourseScore(studentIds[i], courseId);
        studentScores.push({
            thisStudentScore: Number(thisStudentScore),
            thisStudentCourseScore: Number(thisStudentCourseScore)
        });
    }
    studentScores.sort((a, b) => a.thisStudentCourseScore - b.thisStudentCourseScore); // 按考试分数升序排序
    // 去除前35%和后35%的数
    let number = studentScores.length * 0.35; // 去掉35%的数before和after
    let before = Math.floor(number); // 向下取整
    // console.log("去掉前35%和后35%的个数：",before);
    // console.log("学生分数前：",studentScores);
    studentScores = studentScores.slice(before, studentScores.length - before);
    // console.log("学生分数后：",studentScores);
    // 计算平均值
    for (let i = 0; i < studentScores.length; i++) {
        totalScore += studentScores[i].thisStudentScore * studentScores[i].thisStudentCourseScore;  
    }

    totalScore /= studentScores.reduce((sum, item) => sum + item.thisStudentCourseScore, 0) || 1; // 防止除以0;
    // console.log(`长度为:${studentScores.length} 课程Id:${courseId} 班级Id:${classId} 平均分数:${totalScore}`);
    let result = await giveScoreByClass(courseId, classId, totalScore);
    if (result.code !== 0) {
        return result; // 如果返回错误，直接返回错误信息
    }
    return {
        code: 0,
        message: `班级评价成功, 长度为:${studentScores.length} 课程Id:${courseId} 班级Id:${classId} 平均分数:${totalScore}`,
        data: totalScore
    }
}

// 班级评价
async function giveScoreByClass(courseId, classId, score) {
    if(score>scoreMax || score<0) {
        return {
            code: -1,
            message: "--------------分数超出范围0-100---------------",
            data: score
        }
    }
    let result = await contract.getGiveScoreClassIdExists(courseId, classId);
    if (result > 0) {
        return {
            code: -1,
            message: `班级已经评价过了`,
            data: score
        }; 
    }
    score = Math.round(score);
    await contract.addCourseClassScores(courseId, classId, score);
    return {
        code: 0,
        message: `班级评价成功`,
        data: score
    };
}

// 督导评价,给某一门课程评分
async function giveScoreBySupervisor(supervisorAddress, courseId, score) {
    if(score>scoreMax || score<0) {
        return {
            code: -1,
            message: "-----------分数超出范围-------------"
        }
    }
    let supervisorId = await contract.addressToSupervisorId(supervisorAddress);
    if(supervisorId==0) {
        return {
            code: -1,
            message: "----------当前账户不是督导-----------"
        }
    }
    let supervisorScore = await contract.getGiveScoreSupervisorIdExists(courseId, supervisorId);
    if (supervisorScore > 0) {
        return {
            code: -1,
            message: "----------督导已经评价过了-------------"
        }
    }
    await contract.addCourseSupervisorScores(courseId, supervisorId, score);// 设置课程的督导评分
    await contract.setSupervisorsCourseScore(supervisorId, courseId, score);// 设置督导评价分数
    
    return {
        code: 0,
        message: "督导评价成功" 
    }
}

// 计算课程总分数
async function calculateCourseTotalScore(courseId) {
    // 看当前课程的老师是不是教师而不是智能体
    let AssignedTeacher = await contract.getCoursesAssignedTeacher(courseId);
    let AssignedAgent;
    let type = "Teacher";
    if (AssignedTeacher.length != 1) {
        AssignedAgent = await contract.getCoursesAssignedAgent(courseId);
        if (AssignedAgent.length!= 1) {
            return {
                code: -1,
                message: `课程${courseId}没有分配老师或智能体`
            } 
        }
        type = "Agent";
    }
    let teacherScores = await contract.getTeacherScores(courseId); // 一个数组 
    let classScores = await contract.getCourseClassScores(courseId);  // 一个数组
    let supervisorScores = await contract.getCourseSupervisorScores(courseId); // 一个数组
    // 计算老师互评平均分
    let teacherScoreAvg = 0;
    for (let i = 0; i < teacherScores.length; i++) {
        teacherScoreAvg += Number(teacherScores[i]);
    }
    teacherScoreAvg /= teacherScores.length!== 0? teacherScores.length : 1;
    // 计算机器评分
    let machineScore = (await contract.courseScores(courseId)).machineScore;
    machineScore = Number(machineScore);
    // 计算班级的平均分数
    let classScoreAvg = 0;
    let classCount = 0;
    // 计算分数的平均值, 把评分为0的去掉
    for (let i = 0; i < classScores.length; i++) {
        if(classScores[i] > 0) {
            classScoreAvg += Number(classScores[i]);
            classCount++;
        }
    }
    classScoreAvg /= classCount !== 0 ? classCount : 1;
    
    // 计算督导的平均分数
    let supervisorScoreAvg = 0;
    for (let i = 0; i < supervisorScores.length; i++) {
        supervisorScoreAvg += Number(supervisorScores[i]);
    }
    supervisorScoreAvg /= supervisorScores.length !== 0 ? supervisorScores.length : 1;
    // 计算总加权后分数
    let totalScore = teacherScoreAvg * 0.2 + classScoreAvg * 0.3 + supervisorScoreAvg * 0.3 + machineScore * 0.2;
    let typeId = 0;
    let suitAfter = 0;
    // 通过分数改变适合程度
    if (type == "Teacher") {
        let teacherId = AssignedTeacher[0];
        let suitOriginal = await contract.getTeacherSuitability(teacherId, courseId);
        suitAfter = suitOriginal * 0.5 + totalScore * 0.5; // 范围0-100
        let suitAfter_1 = Math.round(suitAfter);
        let totalScore_1 = Math.round(totalScore);
        await contract.setCourseTotalScore(courseId, totalScore_1);
        await contract.setTeacherCourseSuitability(teacherId, courseId, suitAfter_1);
        typeId = teacherId;
    }else {
        let agentId = AssignedAgent[0];
        let suitOriginal = await contract.getAgentSuitability(agentId, courseId);
        suitAfter = suitOriginal * 0.5 + totalScore * 0.5; // 范围0-100
        let suitAfter_1 = Math.round(suitAfter);
        let totalScore_1 = Math.round(totalScore);
        await contract.setCourseTotalScore(courseId, totalScore_1);
        await contract.setAgentCourseSuitability(agentId, courseId, suitAfter_1);
        typeId = agentId;
    }
    // console.log(`classScoreAvg:${classScoreAvg.toFixed(2)}, supervisorScoreAvg:${supervisorScoreAvg.toFixed(2)}, teacherScoreAvg:${teacherScoreAvg.toFixed(2)}, machineScore:${machineScore.toFixed(2)}, totalScore:${totalScore.toFixed(2)}, suitAfter:${suitAfter.toFixed(2)}`)
    return {
        code: 0,
        message: `课程Id:${courseId}  ${type}Id:${typeId}  适合程度:${suitAfter}`,
        data: suitAfter.toFixed(2),
        classScoreAvg: classScoreAvg.toFixed(2),
        supervisorScoreAvg: supervisorScoreAvg.toFixed(2),
        teacherScoreAvg: teacherScoreAvg.toFixed(2),
        machineScore: machineScore.toFixed(2),
        totalScore: totalScore.toFixed(2),
    };
}

async function switchCurrentSigner_courseScore(address){
    currentSigner = provider.getSigner(address);
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
}

async function main() {
    // await initializeData(); 
    // // 自动分配课程
    // await init_TeacherCourses(); // 初始化课程分配
    // await init_AgentCourses(); // 初始化智能体课程分配
    // await printAssignments(); // 打印课程分配情况
    // console.log(await checkCourseConflicts()); // 检查课程冲突情况
    // await preprocessConflictCourses(); // 冲突预处理
    // // 打印目前冲突情况
    // console.log(await checkCourseConflicts());
    // await printAssignments(); 
    // console.log(await createConflictProposal()); // 创建冲突提案
    // await Promise.all([
    //     studentVote("0xA6Ac36B7629D23F39Faf603615371Ca58631b191", 1, 3), // 学生投票
    //     studentVote("0xaf6f381cD2fC9aA2f5335Fe3b295fb726464eACC", 1, 3), // 学生投票
    //     studentVote("0xfDc0C25E65C9A64b44475A9d4510921dc39566E9", 1, 4), // 学生投票

    //     studentVote("0xe635D18E73B1D86A5Faf1d0E0b57126821EacE52", 1, 3), // 学生投票
    //     studentVote("0xA3857CBf7BF664cF80543EB6Ce1e6689c161C80A", 1, 4), // 学生投票
    //     studentVote("0xbB4e364BfDF39C6f33286E3b0A4b46a288831A3C", 1, 4), // 学生投票

    //     teacherVote("0xE859517A7D96Ff9C74E498312f2C31f3CB29b496", 1, 3), // 教师投票
    //     teacherVote("0xE692805941ae5b683B50727157CC384d2DABDE26", 1, 4), // 教师投票
    //     teacherVote("0x5d48aE60f80Ca87590124002ED83A22735139BC1", 1, 3), // 教师投票
    //     teacherVote("0x7887407A409c921AFC315714c068aA4A14B8F303", 1, 4), // 教师投票
    //     teacherVote("0x46141B13870144d78c0fE44E08B2B530D1ef1671", 1, 3), // 教师投票

    //     agentVote("0x961F688D3a00BD64C12c2cbb34119D329df7A789", 1), // 智能体投票
    //     agentVote("0x9dcCf23262B81C636648d6A759eEA0A9FdA420cC", 1), // 智能体投票

    //     teacherVote("0xbD76a0aEc7f46D10AAE6d1664D4ccD27408F06F3", 1, 3), // 班级投票
    //     teacherVote("0xf65699E3cB26F132843649BB11fCA45Af95CC199", 1, 4), // 班级投票
    // ]);
    // let currentAddress = "0xbD76a0aEc7f46D10AAE6d1664D4ccD27408F06F3";
    // currentSigner = provider.getSigner(currentAddress);
    // contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    // voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
    // classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    // switchCurrentSigner_studentClass(currentSigner, contract, voteContract, classContract, currentAddress);
    // console.log(await endClassProposal_interact(1));

    // currentAddress = "0xf65699E3cB26F132843649BB11fCA45Af95CC199";
    // currentSigner = provider.getSigner(currentAddress);
    // contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    // voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
    // classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    // switchCurrentSigner_studentClass(currentSigner, contract, voteContract, classContract, currentAddress);
    // console.log(await endClassProposal_interact(1));

    // console.log(await endConfictProposal(1));  // 结束冲突提案
    // await printAssignments(); // 打印课程分配情况

    // console.log(await createConflictProposal()); // 创建冲突提案

    // await Promise.all([
        // studentVote("0xA6Ac36B7629D23F39Faf603615371Ca58631b191", 2, 3), // 学生投票
        // studentVote("0xaf6f381cD2fC9aA2f5335Fe3b295fb726464eACC", 2, 3), // 学生投票
        // studentVote("0xfDc0C25E65C9A64b44475A9d4510921dc39566E9", 2, 4), // 学生投票

        // studentVote("0xe635D18E73B1D86A5Faf1d0E0b57126821EacE52", 2, 3), // 学生投票
        // studentVote("0xA3857CBf7BF664cF80543EB6Ce1e6689c161C80A", 2, 4), // 学生投票
        // studentVote("0xbB4e364BfDF39C6f33286E3b0A4b46a288831A3C", 2, 4), // 学生投票

        // teacherVote("0xE859517A7D96Ff9C74E498312f2C31f3CB29b496", 2, 3), // 教师投票
        // teacherVote("0xE692805941ae5b683B50727157CC384d2DABDE26", 2, 4), // 教师投票
        // teacherVote("0x5d48aE60f80Ca87590124002ED83A22735139BC1", 2, 3), // 教师投票
        // teacherVote("0x7887407A409c921AFC315714c068aA4A14B8F303", 2, 4), // 教师投票
        // teacherVote("0x46141B13870144d78c0fE44E08B2B530D1ef1671", 2, 3), // 教师投票

        // agentVote("0x961F688D3a00BD64C12c2cbb34119D329df7A789", 2), // 智能体投票
        // agentVote("0x9dcCf23262B81C636648d6A759eEA0A9FdA420cC", 2), // 智能体投票

        // teacherVote("0xbD76a0aEc7f46D10AAE6d1664D4ccD27408F06F3", 2, 3), // 班级投票
        // teacherVote("0xf65699E3cB26F132843649BB11fCA45Af95CC199", 2, 4), // 班级投票
    // ]);
    // currentAddress = "0xbD76a0aEc7f46D10AAE6d1664D4ccD27408F06F3";
    // currentSigner = provider.getSigner(currentAddress);
    // contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    // voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
    // classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    // await switchCurrentSigner_studentClass(currentSigner, contract, voteContract, classContract, currentAddress);
    // console.log(await endClassProposal_interact(2));

    // currentAddress = "0xf65699E3cB26F132843649BB11fCA45Af95CC199";
    // currentSigner = provider.getSigner(currentAddress);
    // contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    // voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
    // classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    // await switchCurrentSigner_studentClass(currentSigner, contract, voteContract, classContract, currentAddress);
    // console.log(await endClassProposal_interact(2));

    // console.log(await endConfictProposal(2));  // 结束冲突提案
    // await printAssignments(); // 打印课程分配情况


    // console.log(await checkAndCreateProposalForTeacher());
    // await Promise.all([
    //     studentVote("0xA6Ac36B7629D23F39Faf603615371Ca58631b191", 3, 3), // 学生投票
    //     studentVote("0xaf6f381cD2fC9aA2f5335Fe3b295fb726464eACC", 3, 3), // 学生投票
    //     studentVote("0xfDc0C25E65C9A64b44475A9d4510921dc39566E9", 3, 5), // 学生投票

    //     studentVote("0xe635D18E73B1D86A5Faf1d0E0b57126821EacE52", 3, 3), // 学生投票
    //     studentVote("0xA3857CBf7BF664cF80543EB6Ce1e6689c161C80A", 3, 5), // 学生投票
    //     studentVote("0xbB4e364BfDF39C6f33286E3b0A4b46a288831A3C", 3, 5), // 学生投票

    //     teacherVote("0xE859517A7D96Ff9C74E498312f2C31f3CB29b496", 3, 3), // 教师投票
    //     teacherVote("0xE692805941ae5b683B50727157CC384d2DABDE26", 3, 5), // 教师投票
    //     teacherVote("0x5d48aE60f80Ca87590124002ED83A22735139BC1", 3, 5), // 教师投票
    //     teacherVote("0x7887407A409c921AFC315714c068aA4A14B8F303", 3, 5), // 教师投票
    //     teacherVote("0x46141B13870144d78c0fE44E08B2B530D1ef1671", 3, 3), // 教师投票

    //     agentVote("0x961F688D3a00BD64C12c2cbb34119D329df7A789", 3), // 智能体投票
    //     agentVote("0x9dcCf23262B81C636648d6A759eEA0A9FdA420cC", 3), // 智能体投票

    //     teacherVote("0xbD76a0aEc7f46D10AAE6d1664D4ccD27408F06F3", 3, 3), // 班级投票
    //     teacherVote("0xf65699E3cB26F132843649BB11fCA45Af95CC199", 3, 5), // 班级投票
    // ]);
    // await endProposalAndAssignCourseforWithoutteacher(3);

    // console.log(await checkAndCreateProposalForTeacher());

    // console.log(await proposalForCoursesWithoutAssigned());
    // await printAssignments(); // 打印课程分配情况

    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => Number(id)); // 转换为数字数组
    console.log(courseIds);
    
    currentSigner = provider.getSigner("0xA6Ac36B7629D23F39Faf603615371Ca58631b191");
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    await giveScoreStudent([100, 100, 100, 100, 100, 100, 100, 100, 100, 100],courseIds); // 学生打分
    
    currentSigner = provider.getSigner("0xaf6f381cD2fC9aA2f5335Fe3b295fb726464eACC");
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    await giveScoreStudent([80, 80, 80, 80, 80, 80, 80, 80, 80, 80],courseIds); // 学生打分

    currentSigner = provider.getSigner("0xfDc0C25E65C9A64b44475A9d4510921dc39566E9");
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    await giveScoreStudent([50, 50, 50, 50, 50, 50, 50, 50, 50, 50],courseIds); // 学生打分

    currentSigner = provider.getSigner("0xe635D18E73B1D86A5Faf1d0E0b57126821EacE52");
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    await giveScoreStudent([100, 100, 100, 100, 100, 100, 100, 100, 100, 100],courseIds); // 学生打分

    currentSigner = provider.getSigner("0xA3857CBf7BF664cF80543EB6Ce1e6689c161C80A");
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    await giveScoreStudent([70, 70, 70, 70, 70, 70, 70, 70, 70, 70],courseIds); // 学生打分

    currentSigner = provider.getSigner("0xbB4e364BfDF39C6f33286E3b0A4b46a288831A3C");
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    await giveScoreStudent([50, 50, 50, 50, 50, 50, 50, 50, 50, 50],courseIds); // 学生打分
    
    // 遍历课程
    for (let i = 0; i < courseIds.length; i++) {
        currentSigner = provider.getSigner("0xbD76a0aEc7f46D10AAE6d1664D4ccD27408F06F3");
        classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
        await giveScoreStudentToClass("0xbD76a0aEc7f46D10AAE6d1664D4ccD27408F06F3", courseIds[i]); // 班级评分
        currentSigner = provider.getSigner("0xf65699E3cB26F132843649BB11fCA45Af95CC199");
        classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
        await giveScoreStudentToClass("0xf65699E3cB26F132843649BB11fCA45Af95CC199", courseIds[i]); // 班级评分
    }

    for (let i = 0; i < courseIds.length; i++) {
        let classScores = await contract.getCourseClassScores(courseIds[i]); // 班级评分
        console.log(`课程 ${courseIds[i]} 的班级评分: ${classScores}`); // 打印班级评分
    }
    // 老师评分
    await printAssignments(); // 打印课程分配情况
    await giveScoreByAgentSelf("0x961F688D3a00BD64C12c2cbb34119D329df7A789", [100, 100]); // 智能体自评
    await giveScoreByAgentSelf("0x9dcCf23262B81C636648d6A759eEA0A9FdA420cC", [90]); // 智能体自评
    await giveScoreByMyself("0xE859517A7D96Ff9C74E498312f2C31f3CB29b496", [80, 80]); // 老师自评
    await giveScoreByMyself("0xE692805941ae5b683B50727157CC384d2DABDE26", [70]); // 老师自评
    await giveScoreByMyself("0x5d48aE60f80Ca87590124002ED83A22735139BC1", [60]); // 老师自评
    await giveScoreByMyself("0x7887407A409c921AFC315714c068aA4A14B8F303", [50,50]); // 老师自评
    await giveScoreByMyself("0x46141B13870144d78c0fE44E08B2B530D1ef1671", [40]); // 老师自评

    // 打印老师评分
    for (let i = 0; i < courseIds.length; i++) {
        let courseScores = await contract.courseScores(courseIds[i]);
        let teacherScore = courseScores.selfScore; // 自己评价的分数
        console.log(`课程 ${courseIds[i]} 的老师自己评分: ${teacherScore}`); 
    }

    // 督导评分
    for (let i = 0; i < courseIds.length; i++) {
        await giveScoreBySupervisor("0x7a149a83C6775abFdc1A73Fa8b321b1841b5a84d", courseIds[i], 80);
        await giveScoreBySupervisor("0x198a310896B403779DC663fE73F18eF5941d9163", courseIds[i], 70);
    }
    // 打印督导评分
    for (let i = 0; i < courseIds.length; i++) {
        let supervisorScores = await contract.getCourseSupervisorScores(courseIds[i]); // 督导评分
        console.log(`课程 ${courseIds[i]} 的督导评分: ${supervisorScores}`); // 打印督导评分
    }

    // 计算课程总分数
    for (let i = 0; i < courseIds.length; i++) {
        let result = await calculateCourseTotalScore(courseIds[i]); // 计算课程总分数
        console.log(result);
    }
    for (let i = 0; i < courseIds.length; i++) {
        let courseScores = await contract.courseScores(courseIds[i]);
        let totalScore = courseScores.totalScore; // 总分数
        console.log(`课程 ${courseIds[i]} 的总评分: ${totalScore}`); 
    }
}

async function machineRating(){
    let { courseId } = await inquirer.prompt([
        {
          type: 'number',
          name: 'courseId',
          message: `请输入课程ID:`,
        }
    ])

    let studentIds = await classContract.getStudentIds();
    studentIds = studentIds.map(id => id.toNumber());
    
    // 获取所有学生的成绩
    let courseScores = [];
    for(let studentId of studentIds){
        let score = Number(await classContract.getStudentCourseScore(studentId, courseId));
        courseScores.push(score);
    }
    // console.log(courseScores)
    // 获取课程难度
    let courseDifficulty = Number((await contract.courses(courseId)).courseDifficulty);
    let machineRate = await getMachineRatingPython(courseScores, courseDifficulty);
    await contract.setmachineScore(courseId, machineRate);
    // console.log(`The machine rating for course ${courseId} is ${machineRate}`)
    return {
        code: 0,
        message: `The machine rating for course ${courseId} is ${machineRate}`
    }

}

async function machineRating_auto(courseId){
    let studentIds = await classContract.getStudentIds();
    studentIds = studentIds.map(id => id.toNumber());
    
    // 获取所有学生的成绩
    let courseScores = [];
    for(let studentId of studentIds){
        let score = Number(await classContract.getStudentCourseScore(studentId, courseId));
        courseScores.push(score);
    }
    // console.log(courseScores)
    // 获取课程难度
    let courseDifficulty = Number((await contract.courses(courseId)).courseDifficulty);
    let machineRate = await getMachineRatingPython(courseScores, courseDifficulty);
    await contract.setmachineScore(courseId, machineRate);
    // console.log(`The machine rating for course ${courseId} is ${machineRate}`)
    return {
        code: 0,
        message: `The machine rating for course ${courseId} is ${machineRate}`,
        machineRate: machineRate
    }

}

module.exports = {
    giveScoreByTeacher,
    giveScoreByAgentSelf,
    giveScoreStudent,
    giveScoreStudentToClass,
    giveScoreBySupervisor,
    calculateCourseTotalScore,
    switchCurrentSigner_courseScore,
    examineScore,
    machineRating,
    machineRating_auto
};
// main();