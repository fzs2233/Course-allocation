const { ethers } = require("ethers");
const fs = require("fs");
require('dotenv').config({ path: './interact/.env' });
const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:7545");
const inquirer = require('inquirer');

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
let currentName = "account_0";
// 创建合约实例
let contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
let voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
let classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);

// 创建课程
async function initializeCourse(name, Importance, IsAgentSuitable) {
    let courseCount = await contract.courseCount();
    courseCount = courseCount.toNumber();
    courseCount = courseCount + 1;
    // console.log(courseCount);
    await contract.setCourseCount(courseCount);
    await contract.setCourseId(courseCount);
    await contract.setCourseName(courseCount, name);
    await contract.setCourseImportance(courseCount, Importance);
    await contract.setCourseIsAgentSuitable(courseCount, IsAgentSuitable);

    return {
        code: 0,
        message: "Course initialized successfully",
        courseId: courseCount
    };
}


// 创建教师
async function registerTeacher(name, addr) {
    let isregister = await contract.addressToTeacherId(addr);
    isregister = isregister.toNumber();
    if(isregister!=0){
        console.log("该教师已经注册")
        return {
            code: -1,
            message: "Teacher Already Registered",
        };
    }
    let teacherCount = await contract.teacherCount();
    teacherCount = teacherCount.toNumber();
    teacherCount = teacherCount + 1;
    // console.log(teacherCount);
    await contract.setTeacherCount(teacherCount);
    await contract.setTeacherId(addr, teacherCount);
    await contract.setTeacherName(teacherCount, name);
    await contract.setTeacherAddress(teacherCount, addr);
    await voteContract.registerVoter(addr);
    return {
        code: 0,
        message: "Teacher Registered successfully",
        courseId: teacherCount
    };
}

// 注册班级
async function registerClass(name, addr) {
    let isregister = await contract.addressToClassId(addr);//新注册的话 返回值是0
    isregister = isregister.toNumber();
    if(isregister!=0){
        console.log("该班级已经注册")
        return {
            code: -1,
            message: "Class Already Registered",
        };
    }
    let classCount = await contract.classCount();
    classCount = classCount.toNumber();
    classCount = classCount + 1;
    // console.log(classCount);
    await contract.setClassCount(classCount);
    await contract.setClassId(addr, classCount);
    await voteContract.registerVoter(addr);
    await classContract.addClass(name, addr);
    return {
        code: 0,
        message: "Class Registered successfully",
        courseId: classCount
    };
}

// 创建智能体
async function registerAgent(name, addr) {
    let isregister = await contract.addressToAgentId(addr);
    isregister = isregister.toNumber();
    if(isregister!=0){
        console.log("该智能体已经注册")
        return {
            code: -1,
            message: "Agent Already Registered",
        };
    }
    let agentCount = await contract.agentCount();
    agentCount = agentCount.toNumber();
    agentCount = agentCount + 1;
    // console.log(agentCount);
    await contract.setAgentCount(agentCount);
    await contract.setAgentId(addr, agentCount);
    await contract.setAgentName(agentCount, name);
    await contract.setAgentAddress(agentCount, addr);
    await voteContract.registerVoter(addr);
    return {
        code: 0,
        message: "Agent Registered successfully",
        courseId: agentCount
    };
}

// 注册学生
async function registerStudent(classId, name, addr) {
    let isregister = await classContract.addressToStudentId(addr);//新注册的话 返回值是0
    isregister = isregister.toNumber();
    if(isregister!=0){
        console.log("该学生已经注册")
        return {
            code: -1,
            message: "Student Already Registered",
        };
    }
    let studentCount = await classContract.studentCount();
    studentCount = studentCount.toNumber();
    studentCount = studentCount + 1;
    await classContract.registerStudent(classId, name, addr);
    return {
        code: 0,
        message: "student Registered successfully",
        courseId: studentCount
    };
}

async function register(){
    const { registerType, Name } = await inquirer.prompt([
        {
          type: 'list',
          name: 'registerType',
          message: '您的要注册身份类型:',
          choices: [
            { name: '教师', value: 'Teacher' },
            { name: '智能体', value: 'Agent' },
            { name: '班级', value: 'Class' },
            { name: '学生', value: 'Student' },
          ]
        },
        {
          type: 'input',
          name: 'Name',
          message: '输入您的姓名:',
        }
    ]);
    let addr = await currentSigner.getAddress();
    // console.log(addr);
    if(registerType === 'Student') {
        const {classId} = await inquirer.prompt([
            {
            type: 'number',
            name: 'classId',
            message: '输入您的班级 ID:',
            }
        ])
        await registerStudent(classId, Name, addr);
    }else if(registerType === 'Teacher'){
        await registerTeacher(Name, addr);
    }else if(registerType === 'Agent'){
        await registerAgent(Name, addr);
    }else if(registerType === 'Class'){
        await registerClass(Name, addr);
    }
    currentName = Name;
    return Name;
}

async function switchUser(){
    
    const { userType } = await inquirer.prompt([
        {
          type: 'list',
          name: 'userType',
          message: '您的身份类型:',
          choices: [
            { name: '教师', value: 'Teacher' },
            { name: '智能体', value: 'Agent' },
            { name: '班级', value: 'Class' },
            { name: '学生', value: 'Student' },
            { name: '未注册', value: 'NoRegister' },
          ]
        }
    ]);
    let userName = "user";
    let userId = -1;
    if(userType != 'NoRegister'){
        userName = await inquirer.prompt([
            {
              type: 'input',
              name: 'userName',
              message: `输入您的姓名:`,
            }
        ]);
    }
    else{
        userId = await inquirer.prompt([
            {
              type: 'number',
              name: 'userId',
              message: `输入您的账户Id:`,
            }
        ]);
    }
    userId = userId.userId;
    userName = userName.userName;
    // 按身份类型进行验证
    if (userType === 'Teacher') {
        let teacherIds = await contract.getTeacherIds();
        teacherIds = teacherIds.map( id => id.toNumber() );
        const [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName] = await loginWithIdentity('Teacher', teacherIds, userName, '切换为教师');
        if(!nowCurrentSigner){
            console.log('不存在这个老师')
            return {
                code:-1,
                message: "不存在这个老师"
            }
        }
        [currentSigner, contract, voteContract, classContract, currentName] = [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName]
        return{
            code: 0,
            data: [currentSigner, contract, voteContract, classContract, currentName]
        }
    } else if (userType === 'Agent') {
        let agentIds = await contract.getAgentIds();
        agentIds = agentIds.map( id => id.toNumber() );
        const [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName]  = await loginWithIdentity('Agent', agentIds, userName, '切换为智能体');
        if(!nowCurrentSigner){
            console.log('不存在这个智能体')
            return {
                code:-1,
                message: "不存在这个智能体"
            }
        }
        [currentSigner, contract, voteContract, classContract, currentName] = [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName]
        return{
            code: 0,
            data: [currentSigner, contract, voteContract, classContract, currentName]
        }
    } else if (userType === 'Class') {
        let classIds = await classContract.getClassIds();
        classIds = classIds.map( id => id.toNumber() );
        const [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName]  = await loginWithIdentity('Class', classIds, userName, '切换为班级');
        if(!nowCurrentSigner){
            console.log('不存在这个班级')
            return {
                code:-1,
                message: "不存在这个班级"
            }
        }
        [currentSigner, contract, voteContract, classContract, currentName] = [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName]
        return{
            code: 0,
            data: [currentSigner, contract, voteContract, classContract, currentName]
        }
    } else if (userType === 'Student') {
        let studentIds = await classContract.getStudentIds();
        studentIds = studentIds.map( id => id.toNumber() );
        const [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName]  = await loginWithIdentity('Student', studentIds, userName, '切换为学生');
        if(!nowCurrentSigner){
            console.log('不存在这个学生')
            return {
                code:-1,
                message: "不存在这个学生"
            }
        }
        [currentSigner, contract, voteContract, classContract, currentName] = [ nowCurrentSigner,nowContract,nowVoteContract,nowClassContract,nowCurrentName]
        return{
            code: 0,
            data: [currentSigner, contract, voteContract, classContract, currentName]
        }
    } else {
        currentSigner = provider.getSigner(userId);
        contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
        voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
        classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
        currentName = `account_${userId}`
        return [currentSigner, contract, voteContract, classContract, currentName]
    }
}

// 登录通用函数
async function loginWithIdentity(identityType, ids, userName, message) {
    for (const id of ids) {
        const user = await contract[identityType.toLowerCase() + 's'](id);
        if (user.name === userName) {
            currentSigner = provider.getSigner(id);
            contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
            voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
            classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
            currentName = user.name;
            console.log(`${message} ${user.name} 成功`);
            return [currentSigner,contract,voteContract,classContract,currentName];
        }
    }
    return [false, false, false, false, false];
}


async function initializeData() {
    const accounts = await web3.eth.getAccounts();
    // 初始化课程
    console.log("Initializing courses...");
    await initializeCourse("c1", 3, true);
    await initializeCourse("c2", 7, true);
    await initializeCourse("c3", 1, true);
    await initializeCourse("c4", 9, false);
    await initializeCourse("c5", 5, false);
    await initializeCourse("c6", 2, false);
    await initializeCourse("c7", 8, false);
    await initializeCourse("c8", 4, false);
    await initializeCourse("c9", 6, false);
    await initializeCourse("c10", 10, false);
    // 注册教师
    console.log("Registering teachers...");
    await switchAcount(1);
    await registerTeacher("teacher_1", accounts[1]);
    await contract.setTeacherValue(1, 800);
    await contract.setTeacherSuitabilityWeight(1,1);
    await contract.setAllTeacherCourseSuitability(1, [26,44,65,88,40,37,79,92,14,87]);
    await contract.setAllTeacherCoursePreferences(1, [35,54,76,80,93,48,64,17,86,70]);

    await switchAcount(2);
    await registerTeacher("teacher_2", accounts[2]);
    await contract.setTeacherValue(2, 1000);
    await contract.setTeacherSuitabilityWeight(2,2);
    await contract.setAllTeacherCourseSuitability(2, [51,32,53,34,85,26,37,48,55,43]);
    await contract.setAllTeacherCoursePreferences(2, [35,74,17,95,57,23,88,46,64,60]);

    await switchAcount(3);
    await registerTeacher("teacher_3", accounts[3]);
    await contract.setTeacherSuitabilityWeight(3,3);
    await contract.setTeacherValue(3, 1500);
    await contract.setAllTeacherCourseSuitability(3, [32,31,54,43,68,27,44,72,58,30]);
    await contract.setAllTeacherCoursePreferences(3, [51,32,83,14,95,76,27,70,45,67]);

    await switchAcount(4);
    await registerTeacher("teacher_4", accounts[4]);
    await contract.setTeacherValue(4, 1200);
    await contract.setTeacherSuitabilityWeight(4,4);
    await contract.setAllTeacherCourseSuitability(4, [43,24,35,36,67,18,39,80,61,33]);
    await contract.setAllTeacherCoursePreferences(4, [22,63,44,85,66,87,38,79,57,60]);

    await switchAcount(5);
    await registerTeacher("teacher_5", accounts[5]);
    await contract.setTeacherSuitabilityWeight(5,5);
    await contract.setTeacherValue(5, 1100);
    await contract.setAllTeacherCourseSuitability(5, [22,43,44,35,36,37,31,32,33,34]);
    await contract.setAllTeacherCoursePreferences(5, [43,14,75,35,56,67,28,59,59,79]);

    // 注册智能体
    console.log("Registering agents...");
    await switchAcount(6);
    await registerAgent("Agent_1", accounts[6]);
    await contract.setAllAgentCourseSuitability(1, [85,94,68,27,48,34,37,42,46,14]);
    await contract.setAgentValue(1,1000);

    await switchAcount(7);
    await registerAgent("Agent_2", accounts[7]);
    await contract.setAllAgentCourseSuitability(2, [43,86,90,47,24,36,32,45,16,34]);
    await contract.setAgentValue(2,1200);

    // 注册班级
    console.log("Registering classes...");
    await switchAcount(8);
    await registerClass("Class_1", accounts[8]);
    for (let i = 1; i <= 25; i++) {
        const studentName = `Student_${i}`; // 学生姓名
        await classContract.addStudentToClass(studentName);
    }
    console.log("班级1学生注册完毕");


    await switchAcount(9);
    await registerClass("Class_2", accounts[9]);
    for (let i = 26; i <= 50; i++) {
        const studentName = `Student_${i}`; // 学生姓名
        await classContract.addStudentToClass(studentName);
    }
    console.log("班级2学生注册完毕");

}

async function switchAcount(Index){
    currentSigner = provider.getSigner(Index);
    contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
}

module.exports = {
    initializeData,
    initializeCourse,
    register,
    switchUser
}