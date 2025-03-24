const { ethers } = require("ethers");
const fs = require("fs");
require('dotenv').config({ path:'./interact/.env' });
// 读取 JSON 文件
const contractData = JSON.parse(fs.readFileSync("./build/contracts/CourseAllocation.json","utf8"));
const classData = JSON.parse(fs.readFileSync("./build/contracts/IStudentVote.json","utf8"));
// 提取合约地址和 ABI
const contractAddress = process.env.contractAddress;
const classContractAddress = process.env.classAddress;
const contractABI = contractData.abi;
const classABI = classData.abi;
// 设置提供者（使用 Infura 或本地节点）
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");

let admin = provider.getSigner(0); // 管理员登录



async function main() {
    // 创建合约实例
    let contract = new ethers.Contract(contractAddress,contractABI,admin);
    await contract.setVotingContractAddress(process.env.VotingContractAddress);
    await contract.setclassVotingContract(process.env.classAddress);
    // 初始化课程
    await contract.initializeCourse("c1",true);
    await contract.initializeCourse("c2",true);
    await contract.initializeCourse("c3",true);
    await contract.initializeCourse("c4",false);
    await contract.initializeCourse("c5",false);
    await contract.initializeCourse("c6",false);
    await contract.initializeCourse("c7",false);
    await contract.initializeCourse("c8",false);
    await contract.initializeCourse("c9",false);
    await contract.initializeCourse("c10",false);
    // 设置课程重要程度
    await contract.setAllCourseImportance([3,7,1,9,5,2,8,4,6,10])
    console.log("已经正确初始化课程并且设定重要程度");
    let allCourseImportance = await contract.getAllCourseImportance();
    for (let i = 0; i < allCourseImportance.length; i++) {
        // 将 BigNumber 转换为普通的数字或字符串
        let importanceValue = allCourseImportance[i].toNumber(); // 或者使用 .toString()
        console.log(`课程 ${i + 1} 的重要程度: ${importanceValue}`);
    }

    // 智能体注册
    let agent_1 = provider.getSigner(1);
    contract = new ethers.Contract(contractAddress,contractABI,agent_1); // 智能体1登录
    await contract.registerAgent('agent_1');
    await contract.updateAgentAllSuitability([85,94,99,27,48,34,37,42,46,14]);
    console.log("智能体1注册并设定课程适合程度");

    let agent_2 = provider.getSigner(2);
    contract = new ethers.Contract(contractAddress,contractABI,agent_2); // 智能体2登录
    await contract.registerAgent('agent_2');
    await contract.updateAgentAllSuitability([93,86,100,47,24,36,32,45,16,34]);
    console.log("智能体2注册并设定课程适合程度");
    
    admin = provider.getSigner(0); // 管理员登录
    contract = new ethers.Contract(contractAddress,contractABI,admin)
    await contract.allocateAgentCourses();
    console.log("已经为智能体初始化课程");

    agent_1 = provider.getSigner(1);
    contract = new ethers.Contract(contractAddress,contractABI,agent_1); // 智能体1登录
    let allocateCourse = await contract.getAgentAssignedCourses();
    allocateCourse = allocateCourse.map(id => parseInt(id._hex,16));
    console.log("智能体1所分配的课程：",allocateCourse);

    agent_2 = provider.getSigner(2);
    contract = new ethers.Contract(contractAddress,contractABI,agent_2); // 智能体1登录
    allocateCourse = await contract.getAgentAssignedCourses();
    allocateCourse = allocateCourse.map(id => parseInt(id._hex,16));
    console.log("智能体2所分配的课程：",allocateCourse);

    // 教师注册
    let teacher_1 = provider.getSigner(3);
    contract = new ethers.Contract(contractAddress,contractABI,teacher_1); // 教师3登录
    await contract.registerTeacher('teacher_1');
    await contract.updateTeacherAllSuitability([26,44,65,88,100,37,79,92,14,87]);
    await contract.updateAllCoursepreferences([35,54,76,27,93,48,64,17,86,100]);
    await contract.updateSuitabilityWeight(3);
    console.log("教师1注册并分配课程教学能力和意愿");

    let teacher_2 = provider.getSigner(4);
    contract = new ethers.Contract(contractAddress,contractABI,teacher_2); // 教师4登录
    await contract.registerTeacher('teacher_2');
    await contract.updateTeacherAllSuitability([11,32,53,74,95,26,67,88,100,43]);
    await contract.updateAllCoursepreferences([35,74,17,95,57,23,88,46,64,100]);
    await contract.updateSuitabilityWeight(4);
    console.log("教师2注册并分配课程教学能力和意愿");

    let teacher_3 = provider.getSigner(5);
    contract = new ethers.Contract(contractAddress,contractABI,teacher_3); // 教师5登录
    await contract.registerTeacher('teacher_3');
    await contract.updateTeacherAllSuitability([32,11,64,43,88,27,74,92,58,100]);
    await contract.updateAllCoursepreferences([51,32,83,14,95,76,27,100,45,67]);
    await contract.updateSuitabilityWeight(5);
    console.log("教师3注册并分配课程教学能力和意愿");

    let teacher_4 = provider.getSigner(6);
    contract = new ethers.Contract(contractAddress,contractABI,teacher_4); // 教师6登录
    await contract.registerTeacher('teacher_4');
    await contract.updateTeacherAllSuitability([43,24,35,56,77,18,99,80,61,100]);
    await contract.updateAllCoursepreferences([22,63,44,95,16,87,38,79,57,100]);
    await contract.updateSuitabilityWeight(6);
    console.log("教师4注册并分配课程教学能力和意愿");

    let teacher_5 = provider.getSigner(7);
    contract = new ethers.Contract(contractAddress,contractABI,teacher_5); // 教师7登录
    await contract.registerTeacher('teacher_5');
    await contract.updateTeacherAllSuitability([22,43,14,35,66,87,58,79,95,100]);
    await contract.updateAllCoursepreferences([43,14,75,35,56,97,28,89,69,100]);
    await contract.updateSuitabilityWeight(7);
    console.log("教师5注册并分配课程教学能力和意愿");

    // 班级1注册投票者
    let class1 = provider.getSigner(8);
    contract = new ethers.Contract(contractAddress,contractABI,class1); // 班级1登录
    await contract.registerClass();
    classContract = new ethers.Contract(classContractAddress,classABI,class1); // 班级1登录
    await classContract.addClass("class_1");

    let student1 = provider.getSigner(10);
    contract = new ethers.Contract(contractAddress,contractABI,student1);
    classContract = new ethers.Contract(classContractAddress,classABI,student1);
    await classContract.registerStudent(1, "student_1");
    let student2 = provider.getSigner(11);
    contract = new ethers.Contract(contractAddress,contractABI,student2);
    classContract = new ethers.Contract(classContractAddress,classABI,student2);
    await classContract.registerStudent(1, "student_2");

    class1 = provider.getSigner(8);
    contract = new ethers.Contract(contractAddress,contractABI,class1); // 班级1登录
    classContract = new ethers.Contract(classContractAddress,classABI,class1); // 班级1登录

    for (let i = 3; i <= 25; i++) {
        const studentName = `Student_${i}`; // 学生姓名
        await classContract.addStudentToClass(studentName);
    }
    console.log("班级1学生注册完毕");

    let studentId = await classContract.getStudent();
    studentId = studentId.map(id => parseInt(id._hex,16));
    console.log("班级1的学生：",studentId);

    // 班级2注册投票者
    let class2 = provider.getSigner(9);
    contract = new ethers.Contract(contractAddress,contractABI,class2); // 班级2登录
    await contract.registerClass();
    classContract = new ethers.Contract(classContractAddress,classABI,class2); // 班级2登录
    await classContract.addClass("class_2");

    let student26 = provider.getSigner(12);
    contract = new ethers.Contract(contractAddress,contractABI,student26);
    classContract = new ethers.Contract(classContractAddress,classABI,student26);
    await classContract.registerStudent(2, "student_26");
    let student27 = provider.getSigner(13);
    contract = new ethers.Contract(contractAddress,contractABI,student27);
    classContract = new ethers.Contract(classContractAddress,classABI,student27);
    await classContract.registerStudent(2, "student_27");

    class2 = provider.getSigner(9);
    contract = new ethers.Contract(contractAddress,contractABI,class2); // 班级2登录
    classContract = new ethers.Contract(classContractAddress,classABI,class2); // 班级2登录
    for (let i = 28; i <= 50; i++) {
        const studentName = `Student_${i}`; // 学生姓名
        await classContract.addStudentToClass(studentName);
    }
    console.log("班级2学生注册完毕");
    let studentId2 = await classContract.getStudent();
    studentId2 = studentId2.map(id => parseInt(id._hex,16));
    console.log("班级2的学生：",studentId2);

    
};

main();


