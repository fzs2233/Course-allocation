const { ethers } = require("ethers");
const fs = require("fs");
require('dotenv').config({ path:'./interact/.env' });
// 读取 JSON 文件
const contractData = JSON.parse(fs.readFileSync("./build/contracts/CourseAllocation.json", "utf8"));
const classData = JSON.parse(fs.readFileSync("./build/contracts/IStudentVote.json", "utf8"));
// 提取合约地址和 ABI
const contractAddress = process.env.contractAddress;
const classContractAddress = process.env.classAddress;
const contractABI = contractData.abi;
const classABI = classData.abi;
// 设置提供者（使用 Infura 或本地节点）
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

// 获取教师账户
let agent_1 = provider.getSigner(1); // 智能体1
let agent_2 = provider.getSigner(2); // 智能体2
let teacher_1 = provider.getSigner(3); // 教师1
let teacher_2 = provider.getSigner(4); // 教师2
let teacher_3 = provider.getSigner(5); // 教师3
let teacher_4 = provider.getSigner(6); // 教师4
let teacher_5 = provider.getSigner(7); // 教师5
let class1 = provider.getSigner(8); // 教师4
let class2 = provider.getSigner(9); // 教师5

let admin = provider.getSigner(0); // 管理员登录

async function main() {
    // 创建合约实例
    let contract = new ethers.Contract(contractAddress, contractABI, admin);
    await contract.setVotingContractAddress(process.env.VotingContractAddress);

    
    // 管理员创建第一个提案
    admin = provider.getSigner(0); // 管理员登录
    contract = new ethers.Contract(contractAddress,contractABI,admin);
    await contract.createProposalForCourse();
    console.log("已经创建提案");

    // 查看第一个提案的候选教师
    let [votedIds,result] = await contract.getCandidateTeacher(1);
    let convertedIds = votedIds.map(id => parseInt(id._hex,16));
    result = parseInt(result._hex,16);
    console.log("Teachers IDs:",convertedIds);
    console.log("course ID:",result);

    contract = new ethers.Contract(contractAddress,contractABI,class1)
    classContract = new ethers.Contract(classContractAddress,classABI,class1);
    // 班级1对教师投票
    for (let i = 1; i <= 25; i++) {
        await classContract.vote(i,1,1);
    }
    console.log("班级 1 对教师的投票已结束");
    await contract.classvoteForTeacher(1);

    contract = new ethers.Contract(contractAddress,contractABI,class2)
    classContract = new ethers.Contract(classContractAddress,classABI,class2);
    // 班级2对教师投票
    for (let i = 26; i <= 50; i++) {
        await classContract.vote(i,1,1);
    }
    console.log("班级 2 对教师的投票已结束");
    await contract.classvoteForTeacher(1);

    // 教师1对第一个提案投票
    contract = new ethers.Contract(contractAddress,contractABI,teacher_1); // 教师2登录
    await contract.voteForTeacher(1,1);
    console.log("教师1在提案 1 向教师 1 进行投票");

    // 教师2对第一个提案投票
    contract = new ethers.Contract(contractAddress,contractABI,teacher_2); // 教师2登录
    await contract.voteForTeacher(1,2);
    console.log("教师2在提案 1 向教师 2 进行投票");

    // 教师3对第一个提案投票
    contract = new ethers.Contract(contractAddress,contractABI,teacher_3); // 教师3登录
    await contract.voteForTeacher(1,1);
    console.log("教师3在提案 1 向教师 1 进行投票");
    
    // 教师4对第一个提案投票
    contract = new ethers.Contract(contractAddress,contractABI,teacher_4); // 教师4登录
    await contract.voteForTeacher(1,2);
    console.log("教师4在提案 1 向教师 2 进行了投票");
    
    // 教师5对第一个提案投票
    contract = new ethers.Contract(contractAddress,contractABI,teacher_5); // 教师5登录
    await contract.voteForTeacher(1,1);
    console.log("教师5在提案 1 向教师 1 进行了投票");
    
    // 查看所有候选人和他们的票数
    contract = new ethers.Contract(contractAddress,contractABI,admin);
    [votedIds,result] = await contract.getCandidateTeacher(1);
    votedIds = votedIds.map(id => parseInt(id._hex,16));
    // 创建一个数组来存储结果
    let results = [];

    // 使用 for 循环获取每个人的票数
    for (let i = 0; i < votedIds.length; i++) {
        let voteCount = await contract.getVoteIdToCount(1,votedIds[i]);
        results.push({ id: votedIds[i],count: voteCount });
    }

    // 以表格形式打印结果
    console.log('Teacher ID'.padEnd(15) + 'Vote Count'.padEnd(15));

    for (let result of results) {
        console.log('--------------------------------');
        console.log(`${result.id.toString().padEnd(15)}${result.count.toString().padEnd(15)}`);
    }
    // 管理员结束第一个提案并分配课程
    let tx = await contract.endProposalAndAssignCourse(1);
    // 等待交易确认
    let receipt = await tx.wait();
    // 提取事件日志中的返回值
    const event = receipt.events.find(event => event.event === "CourseAssignedToTeacher");
    if (event) {
        const { courseId,teacherId } = event.args;
        console.log("Course ID:",courseId.toString());
        console.log("Winning Teacher ID:",teacherId.toString());
    }

    // 使用 for 循环创建第 2 到第 7 个提案
    for (let i = 2; i <= 3; i++) {
        // 管理员创建提案
        admin = provider.getSigner(0); // 管理员登录
        contract = new ethers.Contract(contractAddress, contractABI, admin);
        await contract.createProposalForCourse();
        console.log(`已经创建提案 ${i}`);

        // 查看提案的候选教师
        let [votedIdsTemp, resultTemp] = await contract.getCandidateTeacher(i);
        let convertedIdsTemp = votedIdsTemp.map(id => parseInt(id._hex, 16));
        resultTemp = parseInt(resultTemp._hex, 16);
        console.log(`Teachers IDs for proposal ${i}:`, convertedIdsTemp);
        console.log(`course ID for proposal ${i}:`, resultTemp);

        // 班级1、班级2对教师投票
        contract = new ethers.Contract(contractAddress, contractABI, class1)
        classContract = new ethers.Contract(classContractAddress, classABI, class1);
        // 班级1对教师投票
        for (let j = 1; j <= 25; j++) {
            await classContract.vote(j,i,convertedIdsTemp[0]);
        }
        console.log("班级 1 对教师的投票已结束");
        await contract.classvoteForTeacher(i);
    
        contract = new ethers.Contract(contractAddress, contractABI, class2)
        classContract = new ethers.Contract(classContractAddress, classABI, class2);
        // 班级2对教师投票
        for (let j = 26; j <= 50; j++) {
            await classContract.vote(j,i,convertedIdsTemp[0]);
        }
        console.log("班级 2 对教师的投票已结束");
        await contract.classvoteForTeacher(i);

        // 所有人选择第一个候选教师投票
        const teachers = [teacher_1, teacher_2, teacher_3, teacher_4, teacher_5];
        const teacherNames = ["teacher_1", "teacher_2", "teacher_3", "teacher_4", "teacher_5"];
        for (let j = 0; j < teachers.length; j++) {
            const teacher = teachers[j];
            contract = new ethers.Contract(contractAddress, contractABI, teacher);
            const teacherName = teacherNames[j];
            await contract.voteForTeacher(i, convertedIdsTemp[0]); // 假设第一个候选教师的 ID 是 convertedIdsTemp[0]
            console.log(`教师 ${teacherName} 对提案 ${i} 进行了投票`);
        }

        // 查看所有候选人和他们的票数
        contract = new ethers.Contract(contractAddress, contractABI, admin);
        let [votedIds, result] = await contract.getCandidateTeacher(i);
        votedIds = votedIds.map(id => parseInt(id._hex, 16));
        // 创建一个数组来存储结果
        let results = [];

        // 使用 for 循环获取每个人的票数
        for (let k = 0; k < votedIds.length; k++) {
            let voteCount = await contract.getVoteIdToCount(i, votedIds[k]);
            results.push({ id: votedIds[k], count: voteCount });
        }

        // 以表格形式打印结果
        console.log('Teacher ID'.padEnd(15) + 'Vote Count'.padEnd(15));

        for (let result of results) {
            console.log('--------------------------------');
            console.log(`${result.id.toString().padEnd(15)}${result.count.toString().padEnd(15)}`);
        }

        tx = await contract.endProposalAndAssignCourse(i);
        // 等待交易确认
        receipt = await tx.wait();
        // 提取事件日志中的返回值
        const eventTemp = receipt.events.find(event => event.event === "CourseAssignedToTeacher");
        if (eventTemp) {
            const { courseId, teacherId } = eventTemp.args;
            console.log(`Course ID for proposal ${i}:`, courseId.toString());
            console.log(`Winning Teacher ID for proposal ${i}:`, teacherId.toString());
        }
        console.log("\n\n");
    }
    let teachers = [agent_1, agent_2, teacher_1, teacher_2, teacher_3, teacher_4, teacher_5];
    let teacherNames = ["agent_1", "agent_2", "teacher_1", "teacher_2", "teacher_3", "teacher_4", "teacher_5"];
    for (let i = 0; i < teachers.length; i++) {
        const teacher = teachers[i];
        contract = new ethers.Contract(contractAddress, contractABI, teacher);
        const teacherName = teacherNames[i];
        let allocateCourse;
        if(i==0 || i==1){
            allocateCourse = await contract.getAgentAssignedCourses();
        }else{
            allocateCourse = await contract.getTeacherAssignedCourses();
        }
        let allocationcourseNum = allocateCourse.map(id => parseInt(id._hex, 16));
        console.log(`${teacherName} 所分配的课程：`, allocationcourseNum)
    }

    console.log("\n\n");

};

main();