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

    let tx = await contract.checkAndCreateProposalForTeacher();
    let receipt = await tx.wait();
    let event = receipt.events.find(event => event.event === "ProposalCreated");
    if (event) {
        let { proposalId, courseId, teacherIds} = event.args;
        proposalId = parseInt(proposalId._hex, 16);
        courseId = parseInt(courseId._hex, 16);
        teacherIds = teacherIds.map(id => parseInt(id._hex, 16));
        let saveId = [];
        let index=0;
        for(let i = 0; i < teacherIds.length; i++){
            if(teacherIds[i]!=0){
                saveId[index] = teacherIds[i];
                index++;
            }
        }
        console.log(`Proposal ID ${proposalId}`);
        console.log(`course ID ${courseId}`);
        console.log(`Candidate Teacher ID ${saveId}`);
    }

    let proposalId = 8;

    let [votedIds, result] = await contract.getCandidateTeacher(proposalId);
    votedIds = votedIds.map(id => parseInt(id._hex, 16));
    result = parseInt(result._hex, 16);
    console.log("Teachers IDs:", votedIds);
    console.log("course ID:", result);

    
    // 班级1、班级2对教师投票
    contract = new ethers.Contract(contractAddress, contractABI, class1)
    classContract = new ethers.Contract(classContractAddress, classABI, class1);
    // 班级1对教师投票
    for (let j = 1; j <= 25; j++) {
        await classContract.vote(j,8,votedIds[0]);
    }
    console.log("班级 1 对教师的投票已结束");
    await contract.classvoteForTeacher(8);

    contract = new ethers.Contract(contractAddress, contractABI, class2)
    classContract = new ethers.Contract(classContractAddress, classABI, class2);
    // 班级2对教师投票
    for (let j = 26; j <= 50; j++) {
        await classContract.vote(j,8,votedIds[0]);
    }
    console.log("班级 2 对教师的投票已结束");
    await contract.classvoteForTeacher(8);

    // 所有人选择第一个候选教师投票
    let teachers = [teacher_1, teacher_2, teacher_3, teacher_4, teacher_5];
    let teacherNames = ["teacher_1", "teacher_2", "teacher_3", "teacher_4", "teacher_5"];
    for (let j = 0; j < teachers.length; j++) {
        const teacher = teachers[j];
        contract = new ethers.Contract(contractAddress, contractABI, teacher);
        const teacherName = teacherNames[j];
        await contract.voteForTeacher(8, votedIds[0]);
        console.log(`教师 ${teacherName} 对提案 ${8} 进行了投票`);
    }

    // 查看所有候选人和他们的票数
    contract = new ethers.Contract(contractAddress, contractABI, admin);
    [votedIds, result] = await contract.getCandidateTeacher(8);
    votedIds = votedIds.map(id => parseInt(id._hex, 16));
    // 创建一个数组来存储结果
    let results = [];

    // 使用 for 循环获取每个人的票数
    for (let k = 0; k < votedIds.length; k++) {
        let voteCount = await contract.getVoteIdToCount(8, votedIds[k]);
        results.push({ id: votedIds[k], count: voteCount });
    }

    // 以表格形式打印结果
    console.log('Teacher ID'.padEnd(15) + 'Vote Count'.padEnd(15));

    for (let result of results) {
        console.log('--------------------------------');
        console.log(`${result.id.toString().padEnd(15)}${result.count.toString().padEnd(15)}`);
    }

    tx = await contract.endProposalAndAssignCourseforWithoutteacher(proposalId);
    // 等待交易确认
    receipt = await tx.wait();
    // 提取事件日志中的返回值
    event = receipt.events.find(event => event.event === "CourseAssignedToTeacher");
    if (event) {
        const { courseId, teacherId } = event.args;
        console.log("Course ID:", courseId.toString());
        console.log("Winning Teacher ID:", teacherId.toString());
        
    }
    console.log("\n");
    
    teachers = [agent_1, agent_2, teacher_1, teacher_2, teacher_3, teacher_4, teacher_5];
    teacherNames = ["agent_1", "agent_2", "teacher_1", "teacher_2", "teacher_3", "teacher_4", "teacher_5"];
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
    console.log("\n");




    
    console.log("班级一的学生设置学生评分")
    contract = new ethers.Contract(contractAddress, contractABI, class1)
    classContract = new ethers.Contract(classContractAddress, classABI, class1);
    let studentCount = await classContract.getStudentofClass();
    console.log(`学生的数量：${studentCount.length}`);
    
    for (let i = 0; i < studentCount.length; i++) {
        let studentId = studentCount[i];
        // 生成随机的 suitability 数组
        const suitability = generateRandomSuitability();
        
        // 调用合约方法设置评分
        await classContract.setCourseSuitability(studentId, suitability);
        console.log(`Student ${studentId} 已经设置对每门课程的评分!`);
    }

    console.log("班级二的学生设置学生评分")
    contract = new ethers.Contract(contractAddress, contractABI, class2)
    classContract = new ethers.Contract(classContractAddress, classABI, class2);
    studentCount = await classContract.getStudentofClass();
    console.log(`学生的数量：${studentCount.length}`);
    
    for (let i = 0; i < studentCount.length; i++) {
        let studentId = studentCount[i];
        // 生成随机的 suitability 数组
        const suitability = generateRandomSuitability();
        
        // 调用合约方法设置评分
        await classContract.setCourseSuitability(studentId, suitability);
        console.log(`Student ${studentId} 已经设置对每门课程的评分!`);
    }
    console.log("\n")
    console.log("通过学生评分修改教师对应课程的适合程度")
    contract = new ethers.Contract(contractAddress, contractABI, admin)
    classContract = new ethers.Contract(classContractAddress, classABI, admin);
    let suitability = await classContract.getAverageSuitability();
    
    let teacherChangeSuitability = [];
    let agentChangeSuitability = [];
    let teacherSuitability = [];
    let agentSuitability = [];
    let teacherCourseIds = [];
    let agentCourseIds = [];
    let teacherIds = [];
    let agentIds = [];
    let courseCount = await contract.courseCount();
    for(let i = 1; i <= courseCount; i++){
        
        let course = await contract.getcourse(i);
        let isAgent = await course.isAssignedAgent;
        let teacherId = await course.assignedTeacherId;
        if(!isAgent){
            teacherCourseIds.push(i);
            teacherIds.push(teacherId);
            teacherChangeSuitability.push(suitability[i-1]);

            let _teacherSuitability = await contract.getteacherCourseSuitability(teacherId, i);
            teacherSuitability.push(_teacherSuitability);
        }else{
            agentCourseIds.push(i);
            agentIds.push(teacherId);
            agentChangeSuitability.push(suitability[i-1]);

            let _agentSuitability = await contract.getagentCourseSuitability(teacherId, i);
            agentSuitability.push(_agentSuitability);
        }
    }

    let teacherResults = [];
        
    // 使用 for 循环获取每个人的票数
    for (let i = 0; i < teacherIds.length; i++) {
        teacherResults.push({id: teacherIds[i], courseId: teacherCourseIds[i], count: teacherSuitability[i], changeCount: teacherChangeSuitability[i]});
    }

    teacherResults.sort((a, b) => {
        if (a.id !== b.id) {
            return a.id - b.id; // 按照 id 升序排列
        } else {
            return a.courseId - b.courseId; // 按照 courseId 升序排列
        }
    });

    let agentResults = [];
        
    // 使用 for 循环获取每个人的票数
    for (let i = 0; i < agentIds.length; i++) {
        agentResults.push({ id: agentIds[i], courseId: agentCourseIds[i], count: agentSuitability[i], changeCount: agentChangeSuitability[i]});
    }

    agentResults.sort((a, b) => {
        if (a.id !== b.id) {
            return a.id - b.id; // 按照 id 升序排列
        } else {
            return a.courseId - b.courseId; // 按照 courseId 升序排列
        }
    });

    console.log('Teacher ID'.padEnd(15) + 'courseId'.padEnd(15)+ 'score'.padEnd(15)+ 'changedScore'.padEnd(15));
    for (let result of teacherResults) {
        console.log('----------------------------------------------------');
        console.log(`${result.id.toString().padEnd(15)}${result.courseId.toString().padEnd(15)}${result.count.toString().padEnd(15)}${result.changeCount.toString().padEnd(15)}`);
    }
    console.log("\n");
    console.log('Agent ID'.padEnd(15) + 'courseId'.padEnd(15)+ 'score'.padEnd(15)+ 'changedScore'.padEnd(15));
    for (let result of agentResults) {
        console.log('---------------------------------------------------');
        console.log(`${result.id.toString().padEnd(15)}${result.courseId.toString().padEnd(15)}${result.count.toString().padEnd(15)}${result.changeCount.toString().padEnd(15)}`);
    }
    await contract.changeSuitabilitybyStudent(suitability);
};

function generateRandomSuitability() {
    const suitability = [];
    for (let i = 0; i < 10; i++) {
        // 生成 70 到 100 之间的随机整数
        suitability.push(Math.floor(Math.random() * 31) + 70);
    }
    return suitability;
}
main();