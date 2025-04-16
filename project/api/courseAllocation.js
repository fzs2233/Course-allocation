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
let currentName = "account_0";

// 格式化为北京时间
const options = { 
    timeZone: 'Asia/Shanghai', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
};

// 自动为老师分配课程（适合度≥50且意愿≥60）并更新结构体
async function init_TeacherCourses() {
    const allocationResults = [];
    const teacherIds = (await contract.getTeacherIds()).map(id => id.toNumber());
    const courseIds = (await contract.getCourseIds()).map(id => id.toNumber());

    for (const courseId of courseIds) {
        const course = await contract.courses(courseId);
        let assignedAgent = await contract.getCoursesAssignedAgent(courseId);
        if (assignedAgent.length !== 0) continue; // 跳过智能体专属课程

        for (const teacherId of teacherIds) {
            const suitability = (await contract.getTeacherSuitability(teacherId, courseId)).toNumber();
            const preference = (await contract.getPreference(teacherId, courseId)).toNumber();

            if (suitability >= 50 && preference >= 60) {
                await contract.addTeacherAssignedCourses(teacherId, courseId);
                await contract.addCourseAssignedTeacherId(courseId, teacherId);
                allocationResults.push({ teacherId, courseId });
            }
        }
    }

    let transferCourseNumbers = await contract.transferCourseNumbers();
    transferCourseNumbers = transferCourseNumbers.toNumber();
    // 记录第一次转移课程的开始时间
    if (transferCourseNumbers === 0){
        // 设置开始时间
        let transferCourseStartDate = Math.floor(Date.now() / 1000);
        let transferCourseEndDate = transferCourseStartDate + 86400;

        await contract.settransferCourseStartTime(transferCourseStartDate);
        await contract.settransferCourseEndTime(transferCourseEndDate);
        // 打印允许换课的开始时间和结束时间
        const formattedStartDate = new Date(transferCourseStartDate * 1000).toLocaleString('zh-CN', options);
        const formattedEndDate = new Date(transferCourseEndDate * 1000).toLocaleString('zh-CN', options);
        console.log("允许换课的开始时间（北京时间）:", formattedStartDate);
        console.log("允许换课的结束时间（北京时间）:", formattedEndDate);
    }
    return allocationResults;
}

// //为Agent分配课程 （适合度≥50
// async function init_AgentCourses_old() {
//     const allocationResults = [];
//     const agentIds = (await contract.getAgentIds()).map(id => id.toNumber());
//     const courseIds = (await contract.getCourseIds()).map(id => id.toNumber());

//     for (const courseIdz of courseIds) {
//         const course = await contract.courses(courseId);
//         if (!course.isAgentSuitable) continue; // 只处理智能体专属课程

//         let max_Cost_effectivenes = 0;
//         let selectAgent = 0;
//         for (const agentId of agentIds) {
//             const suitability = (await contract.getAgentSuitability(agentId, courseId)).toNumber();
//             let agent = await contract.agents(agentId);
//             let value = agent.value;
//             value = value.toNumber();
//             if (suitability >= 50) { 
//                 if( (suitability / value) > max_Cost_effectivenes){
//                     max_Cost_effectivenes = suitability / value;
//                     selectAgent = agentId;
//                 }
//             }
//         }
//         if(selectAgent > 0){
//             await contract.addAgentAssignedCourses(selectAgent, courseId);
//             await contract.addCourseAssignedAgentId(courseId, selectAgent);
//             allocationResults.push({ selectAgent, courseId });
//         }
//     }
//     return allocationResults;
// }

async function init_AgentCourses() {
    const allocationResults = [];
    const agentIds = (await contract.getAgentIds()).map(id => id.toNumber());
    const courseIds = (await contract.getCourseIds()).map(id => id.toNumber());

    for (const courseId of courseIds) {
        const course = await contract.courses(courseId);

        let suitableAgents = [];
        
        // 找出所有适合度 >= 80 的智能体
        for (const agentId of agentIds) {
            const suitability = (await contract.getAgentSuitability(agentId, courseId)).toNumber();
            if (suitability >= 80) {
                suitableAgents.push({ agentId, suitability });
            }
        }

        // 如果只有一个适合的智能体，直接分配
        if (suitableAgents.length === 1) {
            const { agentId } = suitableAgents[0];
            await contract.addAgentAssignedCourses(agentId, courseId);
            await contract.addCourseAssignedAgentId(courseId, agentId);
            allocationResults.push({ agentId, courseId });
        }
        // 如果有两个适合的智能体，选择性价比最高的
        else if (suitableAgents.length === 2) {
            let maxCostEffectiveness = 0;
            let selectedAgentId = 0;
            // 选择性价比最高的智能体
            for (const { agentId, suitability } of suitableAgents) {
                let agent = await contract.agents(agentId);
                let value = agent.value.toNumber();
                if (value > 0) {
                    let costEffectiveness = suitability / value;
                    if (costEffectiveness > maxCostEffectiveness) {
                        maxCostEffectiveness = costEffectiveness;
                        selectedAgentId = agentId;
                    }
                }
            }
            let agentId=0;
            agentId = selectedAgentId;
            // 分配给性价比最高的智能体
            if (agentId > 0) {
                await contract.addAgentAssignedCourses(agentId, courseId);
                await contract.addCourseAssignedAgentId(courseId, agentId);
                allocationResults.push({ agentId, courseId });
            }
        }
    }

    return allocationResults;
}


async function printAssignments() { //查看目前的课程分配情况
    const courseIds = (await contract.getCourseIds()).map(id => id.toNumber());
    const assignments = [];

    for (const courseId of courseIds) {
        // 获取课程基础信息（id, name, importance）
        const course = await contract.courses(courseId);
        const courseName = course[1];
        const importance = course[2].toNumber();

        // 获取分配的教师和智能体ID
        const assignedTeachers = (await contract.getCoursesAssignedTeacher(courseId)).map(t => t.toNumber());
        const assignedAgents = (await contract.getCoursesAssignedAgent(courseId)).map(a => a.toNumber());

        // 构建分配信息
        let assignedTo = [];
        if (assignedTeachers.length > 0) {
            assignedTo.push(`教师: ${assignedTeachers.join(', ')}`);
        }
        if (assignedAgents.length > 0) {
            assignedTo.push(`智能体: ${assignedAgents.join(', ')}`);
        }
        if (assignedTo.length === 0) {
            assignedTo.push('Unassigned');
        }

        assignments.push({
            "课程ID": courseId,
            "课程名": courseName,
            "课程重要程度": importance,
            "分配对象": assignedTo.join(' | ')
        });
    }
    
    // 打印表格
    console.log('\n目前课程的分配情况:');
    console.table(assignments);
    return assignments;
}

/**
 * 获取指定教师的课程性价比数据（适合度/工资）
 * @param {number} targetTeacherId - 要查询的教师ID
 * @returns {Promise<{code: number, data?: {teacherId: number, salary: number, costPerformance: number[]}, message?: string}>}
 */
async function getTeacherCostPerformance(targetTeacherId) { //获取某个教师的性价比数组
    try {
        // 参数验证
        if (!Number.isInteger(targetTeacherId) || targetTeacherId <= 0) {
            throw new Error('教师ID必须为正整数');
        }

        // 获取课程ID列表
        const courseIds = (await contract.getCourseIds())
            .map(id => id.toNumber())
            .sort((a, b) => a - b);

        // 获取教师工资
        const salary = (await contract.teachers(targetTeacherId)).value.toNumber();
        if (salary === 0) throw new Error('教师工资不能为0');

        // 获取所有课程的适合度
        const suitabilities = await Promise.all(
            courseIds.map(courseId => 
                contract.getTeacherSuitability(targetTeacherId, courseId)
            )
        );

        // 计算性价比数组
        const costPerformance = suitabilities.map(s => 
            Number((s.toNumber() / salary).toFixed(4))
        );

        // 控制台输出
        console.log(`\n教师 ${targetTeacherId} 的课程性价比：`);
        courseIds.forEach((courseId, index) => {
            console.log(`课程 ${courseId}: ${costPerformance[index]}`);
        });

        return {
            code: 0,
            data: {
                teacherId: targetTeacherId,
                salary,
                costPerformance
            }
        };

    } catch (error) {
        // 错误处理
        let code = -1;
        if (error.message.includes("revert")) code = 404;  // 教师不存在
        if (error.message.includes("invalid arrayify")) code = 400;  // 数据格式错误

        console.error(`错误：${error.message}`);
        return { code, message: error.message };
    }
}

/**
 * 获取指定教师的课程性价比数据（适合度/工资）
 * @param {number} targetAgentId - 要查询的教师ID
 * @returns {Promise<{code: number, data?: {agentId: number, salary: number, costPerformance: number[]}, message?: string}>}
 */
async function getAgentCostPerformance(targetAgentId) { //获取某个智能体的性价比数组
    try {
        // 参数验证
        if (!Number.isInteger(targetAgentId) || targetAgentId <= 0) {
            throw new Error('ID必须为正整数');
        }

        // 获取课程ID列表
        const courseIds = (await contract.getCourseIds())
            .map(id => id.toNumber())
            .sort((a, b) => a - b);

        // 获取智能体工资
        const salary = (await contract.agents(targetAgentId)).value.toNumber();
        if (salary === 0) throw new Error('智能体工资不能为0');

        // 获取所有课程的适合度
        const suitabilities = await Promise.all(
            courseIds.map(courseId => 
                contract.getAgentSuitability(targetAgentId, courseId)
            )
        );

        // 计算性价比数组
        const costPerformance = suitabilities.map(s => 
            Number((s.toNumber() / salary).toFixed(4))
        );

        // 控制台输出
        console.log(`\n智能体 ${targetAgentId} 的课程性价比：`);
        courseIds.forEach((courseId, index) => {
            console.log(`课程 ${courseId}: ${costPerformance[index]}`);
        });

        return {
            code: 0,
            data: {
                agentId: targetAgentId,
                salary,
                costPerformance
            }
        };

    } catch (error) {
        // 错误处理
        let code = -1;
        if (error.message.includes("revert")) code = 404;  // 教师不存在
        if (error.message.includes("invalid arrayify")) code = 400;  // 数据格式错误

        console.error(`错误：${error.message}`);
        return { code, message: error.message };
    }
}

// 获取智能体最不擅长的智能体课程
async function getLeastSuitableAgentCourse() {
    let leastSuitableCourseId = -1;
    let minSuitability = 1000000;
    let course;
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => id.toNumber());
    for (let i = 0; i < courseIds.length; i++) {
        let courseId = courseIds[i];
        course = await contract.courses(courseId)
        let AssignedAgentCourses = await contract.getCoursesAssignedAgent(courseId);
        if (AssignedAgentCourses.length == 0) {
            continue;
        }
        let suitability = 10000;
        if (AssignedAgentCourses.length == 1) {
            let agentId = AssignedAgentCourses[0];
            agentId = agentId.toNumber();
            suitability = await contract.getAgentSuitability(agentId, courseId);
            suitability = suitability.toNumber();
        }else if(AssignedAgentCourses.length > 1){
            return {
                code: -1,
                message: "课程 " + courseId + " 拥有者超过一个"
            }
        }
        if (suitability < minSuitability) {
            minSuitability = suitability;
            leastSuitableCourseId = courseId;
        }
        
    }

    return {
        code: 0,
        message: "成功获取最不重要的智能体课程",
        data: Number(leastSuitableCourseId)
    }
}

// 给没有课程的老师创建投票提案
async function checkAndCreateProposalForTeacher(){
    let teacherWithoutCourse = [];
    // 遍历所有老师，找到没有课程的老师
    let teacherIds = await contract.getTeacherIds();
    teacherIds = teacherIds.map(id => id.toNumber());

    for (let index = 0; index < teacherIds.length; index++) {
        let teacherId = teacherIds[index];
        let assignedCourses = await contract.getTeacherReallyAssignedCourses(teacherId);
        if (assignedCourses.length == 0) {
            teacherWithoutCourse.push(teacherId);
        }
    }
    // console.log("teacherWithoutCourse: ", teacherWithoutCourse);
    if (teacherWithoutCourse.length == 0) {
        // 所有老师都有课程，结束
        return {
            code: 0,
            message: "所有老师都有课程"
        };
    }

    let candidateCourse = -1;
    // 获取没有分配老师的课程作为候选课程
    // 获取所有课程的ID
    let courseIds = await contract.getCourseIds();
    courseIds = courseIds.map(id => id.toNumber());

    // 创建一个数组来存储课程ID和它们的重要程度
    let coursesWithImportance = [];

    // 遍历每个课程ID，获取课程的重要程度
    for (let i = 0; i < courseIds.length; i++) {
        let courseId = courseIds[i];
        let course = await contract.courses(courseId);
        let courseImportance = Number(course.importance);
        coursesWithImportance.push({
            courseId: courseId,
            importance: courseImportance
        });
    }

    // 按照重要程度对课程进行排序（降序）
    coursesWithImportance.sort((a, b) => b.importance - a.importance);

    // 提取排序后的课程ID
    courseIds = coursesWithImportance.map(item => item.courseId);

    for(let courseId of courseIds){
        let teachers = await contract.getCoursesAssignedTeacher(courseId);
        let agents = await contract.getCoursesAssignedAgent(courseId);
        if(teachers.length + agents.length == 0) {
            candidateCourse = courseId;
            break;
        }
    }
    // console.log(`candidateCourse: ${candidateCourse}`)
    // 没有再获取智能体的课程
    
    if(candidateCourse == -1) {
        candidateCourse = await getLeastSuitableAgentCourse();
        candidateCourse = candidateCourse.data;
    }
    // console.log(`candidateCourse: ${candidateCourse}`)

    if(teacherWithoutCourse.length == 1 && candidateCourse != -1) {
        // 只有一个没有课程的老师，直接分配
        console.log(await assignCourseToTeacherWithoutCourse(candidateCourse, teacherWithoutCourse[0]));
        return {
            code: 0,
            message: `课程 ${candidateCourse} 已经分配给了老师 ${teacherWithoutCourse[0]}, 现在所有老师都有课程了`
        }
    }
    
    let tx = await voteContract.createChooseTeacherProposal("create Conflict Proposal", candidateCourse, teacherWithoutCourse, 9);//7老师+2班级
    let receipt = await tx.wait();
    const event = receipt.events.find(event => event.event === "ProposalCreated");
    let { proposalId, description } = event.args;
    proposalId = proposalId.toNumber();
    
    // 创建班级提案
    let txClass = await classContract.createProposal("createProposal", candidateCourse, teacherWithoutCourse, proposalId);
    let receiptClass = await txClass.wait();
    const eventClass = receiptClass.events.find(event => event.event === "ProposalCreated");
    let { classProposalId, classDescription } = eventClass.args;
    
    classProposalId = classProposalId.toNumber();
    return {
        code: 0,
        message: "成功为没有课程的老师创建提案",
        proposalId: proposalId,
        classProposalId: classProposalId,
        candidateCourse: candidateCourse,
        teacherWithoutCourse: teacherWithoutCourse
    }
}

// 学生评分 (allreadfinished, To test functional)
/**
 * 根据学生平均成绩更改教师或智能体的课程适合度
 * @param {number[]} courseAverageScore - 课程平均成绩数组
 * @returns {Promise<{code: number, message: string}>} - 返回操作结果的对象，包含状态码和消息
 */
async function changeSuitabilitybyStudent(courseAverageScore) {
    let courses = await contract.getCourseIds();
    courses = courses.map(id => id.toNumber());
    let Index = 0;
    for(let courseId of courses){
        let assignedTeacher = await contract.getCoursesAssignedTeacher(courseId);
        let assignedAgent = await contract.getCoursesAssignedAgent(courseId);
        // 检查课程是否只分配给了一个教师或智能体
        if(assignedTeacher.length + assignedAgent.length != 1){
            return{
                code: -1,
                message: `course ${courseId} must be assigned to one teacher`
            }
        }
        if(assignedTeacher.length != 0){
            let teacherId = assignedTeacher[0];
            // 根据学生平均成绩更新教师的课程适合度
            await contract.setTeacherCourseSuitability(teacherId, courseId, courseAverageScore[Index]);
        }else{
            let agentId = assignedAgent[0];
            // 根据学生平均成绩更新智能体的课程适合度
            await contract.setAgentCourseSuitability(agentId, courseId, courseAverageScore[Index]);
        }
        Index++;
    }
    return{
        code: 0,
        message: `All teacher/agent suitability have been changed by student average score successfully`
    }
}

// 把智能体课程分给老师 (allreadfinished, To test functional)
async function assignCourseToTeacherWithoutCourse(courseId, teacherId) {
    let assignedTeacher = await contract.getCoursesAssignedTeacher(courseId);
    let assignedAgent = await contract.getCoursesAssignedAgent(courseId);
    if(assignedTeacher.length + assignedAgent.length > 1){
        return{
            code: -1,
            message: `course ${courseId} must be assigned to one or zero teacher`
        }
    }
    if(assignedTeacher.length == 1){
        let result = await removeTeacherCourse(assignedTeacher[0], courseId);
        if (result.code!== 0) {
            console.log(result.message);
        }
    }else if(assignedAgent.length == 1){
        let result = await removeAgentCourse(assignedAgent[0], courseId);
        if (result.code!== 0) {
            console.log(result.message);
        }
    }
    let result = await AssignedTeacherReallyCourse(teacherId, courseId);
    if (result.code!== 0) {
        console.log(result.message);
    }
    
    return{
        code: 0,
        message: `Course ${courseId} has been assigned to teacher ${teacherId} successfully`
    }
    
}

// 结束投票并分配课程
async function endProposalAndAssignCourseforWithoutteacher(proposalId) {
    // 获取投票结果
    let [teacherId, courseId, teacherIds, teacherIdsVoteCount] = await voteContract.endVoteChooseCourse(proposalId);

    // 创建投票结果表格
    let tableData = teacherIds.map((teacherId, index) => ({
        老师ID: Number(teacherId),
        票数: Number(teacherIdsVoteCount[index])
    }));
    // console.table(tableData);
    // 找出最大票数
    const maxVotes = Math.max(...teacherIdsVoteCount.map(v => v.toNumber()));
    
    // 找出所有获得最大票数的老师
    const maxVoteTeachers = teacherIds.filter((teacherId, index) => 
        teacherIdsVoteCount[index].toNumber() === maxVotes
    ).map(id => id.toNumber());

    if (maxVoteTeachers.length === 1) {
        // 如果只有一个最大票数的老师，分配课程
        const result = await assignCourseToTeacherWithoutCourse(courseId, maxVoteTeachers[0]);
        if (result.code !== 0) {
            console.log(result.message);
        }
        console.log("Course assigned successfully");

        return {
            code: 0,
            message: `Proposal ${proposalId} has been finished and course has been assigned to teacher ${maxVoteTeachers[0]} successfully`
        };
    } else {
        // 如果有多个最大票数的老师，重新创建提案
        let result = await createNewProposal(courseId, maxVoteTeachers);
        return result;
    }
}

// 为老师分配课程
async function AssignedTeacherCourse(teacherId, courseId){
    // 获取教师已分配的课程
    let courses = await contract.getTeacherAssignedCourses(teacherId);
    courses = courses.map(id => id.toNumber());

    // 判断 courseId 是否在 courses 数组中
    if (courses.includes(courseId)) {
        // console.log(`Course ${courseId} is assigned to teacher ${teacherId}`);
        return {
            code: -1,
            message: `Course ${courseId} Already Assigned to teacher ${teacherId}`,
        };
    }
    await contract.addTeacherAssignedCourses(teacherId, courseId);
    await contract.addCourseAssignedTeacherId(courseId, teacherId);
    return {
        code: 0,
        message: `Course ${courseId} Assigned to teacher ${teacherId} successfully`,
    };
}

// 为老师真正分配课程
async function AssignedTeacherReallyCourse(teacherId, courseId){
    // 获取教师已分配的课程
    let courses = await contract.getTeacherReallyAssignedCourses(teacherId);
    courses = courses.map(id => id.toNumber());

    // 判断 courseId 是否在 courses 数组中
    if (courses.includes(courseId)) {
        // console.log(`Course ${courseId} is assigned to teacher ${teacherId}`);
        return {
            code: -1,
            message: `Course ${courseId} Already Assigned to teacher ${teacherId}`,
        };
    }
    await contract.addTeacherReallyAssignedCourses(teacherId, courseId);
    await contract.addCourseAssignedTeacherId(courseId, teacherId);
    return {
        code: 0,
        message: `Course ${courseId} Really Assigned to teacher ${teacherId} successfully`,
    };
}

// 给智能体分配课程
async function AssignedAgentCourse(agentId, courseId){
    // 获取教师已分配的课程
    let courses = await contract.getAgentAssignedCourses(agentId);
    courses = courses.map(id => id.toNumber());

    // 判断 courseId 是否在 courses 数组中
    if (courses.includes(courseId)) {
        // console.log(`Course ${courseId} is assigned to agent ${agentId}`);
        return {
            code: -1,
            message: `Course ${courseId} Already Assigned to agent ${agentId}`,
        };
    }
    await contract.addAgentAssignedCourses(agentId, courseId);
    await contract.addCourseAssignedAgentId(courseId, agentId);

    return {
        code: 0,
        message: `Course ${courseId} Assigned to agent ${agentId} successfully`,
    };
}

// 为老师移除课程
async function removeTeacherCourse(teacherId, courseId){
    // 获取教师已分配的课程
    let courses = await contract.getTeacherAssignedCourses(teacherId);
    courses = courses.map(id => id.toNumber());

    // 判断 courseId 是否在 courses 数组中
    if (!courses.includes(courseId)) {
        // console.log(`Course ${courseId} is not assigned to teacher ${teacherId}`);
        return {
            code: -1,
            message: `Course ${courseId} not Assigned to teacher ${teacherId}`,
        };
    }
    await contract.removeTeacherAssignedCourses(teacherId, courseId);
    await contract.removeCourseAssignedTeacherId(courseId, teacherId);

    return {
        code: 0,
        message: `Course ${courseId} removed from teacher ${teacherId} successfully`,
    };
}

// 为智能体移除课程
async function removeAgentCourse(agentId, courseId){    // 获取教师已分配的课程
    let courses = await contract.getAgentAssignedCourses(agentId);
    courses = courses.map(id => id.toNumber());
    courseId = Number(courseId);
    // 判断 courseId 是否在 courses 数组中
    
    if (!courses.includes(courseId)) {
        // console.log(`Course ${courseId} is not assigned to agent ${agentId}`);
        return {
            code: -1,
            message: `Course ${courseId} not Assigned to agent ${agentId}`,
        };
    }
    await contract.removeCourseAssignedAgentId(courseId, agentId);
    await contract.removeAgentAssignedCourses(agentId, courseId);
    
    return {
        code: 0,
        message: `Course ${courseId} removed from agent ${agentId} successfully`,
    };
}

async function switchAcount(Index){
    currentSigner = provider.getSigner(Index);
    contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
}

// 创建冲突提案
async function createConflictProposal() {
    let courseIds = await contract.getCourseIds();
    let courses = [];
    let candidateId = [];
    let selectedCourseId = 0;
    for (let courseIndex = 0; courseIndex < courseIds.length; courseIndex++) {
        let course = await contract.courses(courseIds[courseIndex]);
        // 将 importance 属性转换为数字
        course.importance = course.importance.toNumber();
        courses.push(course);
    }
    // 按照 importance 属性对课程进行排序（降序）
    courses.sort((a, b) => b.importance - a.importance);
    for (let courseIndex = 0; courseIndex < courses.length; courseIndex++){
        let courseId = courses[courseIndex].id;
        courseId = courseId.toNumber();
        
        let teachers = await contract.getCoursesAssignedTeacher(courseId);
        teachers = teachers.map(id => id.toNumber());

        if (teachers.length > 1){
            selectedCourseId = courseId;

            let candidateTeachers = [];

            for(let teacherIndex = 0; teacherIndex < teachers.length; teacherIndex++){
                let teacherId = teachers[teacherIndex];
                let reallyTeacher = await contract.getTeacherReallyAssignedCourses(teacherId);
                if(reallyTeacher.length < 2){
                    candidateTeachers.push(teacherId);
                }else{
                    await removeTeacherCourse(teacherId, courseId);
                }
            }
            candidateId = candidateTeachers;
            break;
        }
    }
    if(candidateId.length === 1){
        // 冲突提案只有一个候选老师，直接分配
        await contract.addTeacherReallyAssignedCourses(candidateId[0], selectedCourseId);
        return {
            code: 0,
            message: `候选老师只有 ${candidateId[0]}，课程 ${selectedCourseId} 分配给老师 ${candidateId[0]}`
        }
    }else if(candidateId.length === 0){
        return{
            code: 0,
            message: `没有冲突或者所有的候选老师都已经拥有两门课程了，这门课程无法创建冲突提案，课程 ${selectedCourseId} 被置为未分配老师状态`
        }
    }
    let tx = await voteContract.createChooseTeacherProposal("create Conflict Proposal", selectedCourseId, candidateId, 9);//7老师+2班级
    let receipt = await tx.wait();
    const event = receipt.events.find(event => event.event === "ProposalCreated");
    let { proposalId, description } = event.args;
    proposalId = proposalId.toNumber();
    
    // 创建班级提案
    let txClass = await classContract.createProposal("createProposal", selectedCourseId, candidateId, proposalId);
    let receiptClass = await txClass.wait();
    const eventClass = receiptClass.events.find(event => event.event === "ProposalCreated");
    let { classProposalId, classDescription } = eventClass.args;
    
    classProposalId = classProposalId.toNumber();
    return {
        code: 0,
        message: `Create Conflict Proposal successfully, Proposal Id: ${proposalId}`,
        messageClass: `Create Conflict Proposal in class successfully, Proposal Id: ${classProposalId}`,
        proposalId: proposalId,
        classProposalId: classProposalId,
        selectedCourseId : selectedCourseId,
        candidateTeacherId : candidateId
    };
}

// 教师投票
async function teacherVote(teacherAddress, proposalId, voteForId){
    await voteContract.voteChooseTeacher(teacherAddress, proposalId, voteForId);
    let teacherId = await contract.addressToTeacherId(teacherAddress);
    return {
        code: 0,
        message: `teacher ${teacherId} Vote for teacher ${voteForId} successfully`,
    }
}

// 智能体投票
async function agentVote(agentAddress, proposalId){
    // 计算每个老师的分数
    let [voteIds, courseId] = await voteContract.getVotedIds(proposalId);
    voteIds = voteIds.map(id => id.toNumber());
    courseId = Number(courseId);
    // console.log(voteIds)
    let max_Score = 0;
    let chooseId = 0;
    let scoreType = await contract.ScoreTypeChioce();
    let scoreTypePrint;
    if(scoreType === "Cost-effectiveness"){
        scoreTypePrint = "性价比"
    }else if(scoreType === "Suitability&Preference"){
        scoreTypePrint = "能力意愿的加权分数"
    }
    
    for(let candidateIndex = 0; candidateIndex < voteIds.length; candidateIndex++){
        let candidateId = voteIds[candidateIndex];
        let currentScore = (await getCompareScore(candidateId, courseId, scoreType)).data;
        console.log(max_Score, currentScore, chooseId)
        if(currentScore > max_Score){
            max_Score = currentScore;
            chooseId = candidateId;
        }
    }
    console.log(`检测您为智能体，已为您选择${scoreTypePrint}最高的教师 ${chooseId} 进行投票`)
    await voteContract.voteChooseTeacher(agentAddress, proposalId, chooseId);
    let agentId = await contract.addressToAgentId(agentAddress);
    return {
        code: 0,
        message: `agent ${agentId} Vote for teacher ${chooseId} successfully`,
    }
}

// 结束冲突投票
async function endConfictProposal(proposalId) {
    // 获取投票结果
    let [winningTeacherId, courseId, teacherIds, teacherIdsVoteCount] = await voteContract.endVoteChooseCourse(proposalId);
    winningTeacherId = winningTeacherId.toNumber();
    courseId = courseId.toNumber();

    // 创建投票结果表格
    let tableData = teacherIds.map((teacherId, index) => ({
        老师ID: Number(teacherId),
        票数: Number(teacherIdsVoteCount[index])
    }));
    console.table(tableData);

    // 找出最大票数
    const maxVotes = Math.max(...teacherIdsVoteCount.map(v => v.toNumber()));
    
    // 找出所有获得最大票数的老师
    const maxVoteTeachers = teacherIds.filter((teacherId, index) => 
        teacherIdsVoteCount[index].toNumber() === maxVotes
    ).map(id => id.toNumber());

    if (maxVoteTeachers.length === 1) {
        // 如果只有一个最大票数的老师，结束提案
        const winningTeacherId = maxVoteTeachers[0];

        // 获取所有分配给该课程的老师
        let allTeacher = await contract.getCoursesAssignedTeacher(courseId);
        allTeacher = allTeacher.map(id => id.toNumber());

        // 移除其他老师的课程分配
        for (let teacherId of allTeacher) {
            if (teacherId !== winningTeacherId) {
                await removeTeacherCourse(teacherId, courseId);
            }
        }

        // 分配课程给获胜老师
        await contract.addTeacherReallyAssignedCourses(winningTeacherId, courseId);

        return {
            code: 0,
            message: `End Conflict Proposal successfully, Winning Teacher Id: ${winningTeacherId}, Course Id: ${courseId}`
        };
    } else {
        // 如果有多个最大票数的老师，移除票数不是最大的老师，并重新创建提案
        let allTeacher = await contract.getCoursesAssignedTeacher(courseId);
        allTeacher = allTeacher.map(id => id.toNumber());

        // 移除票数不是最大的老师的课程分配
        for (let teacherId of allTeacher) {
            const teacherIndex = teacherIds.findIndex(id => id.toNumber() === teacherId);
            if (teacherIndex !== -1 && teacherIdsVoteCount[teacherIndex].toNumber() < maxVotes) {
                await removeTeacherCourse(teacherId, courseId);
            }
        }

        // 创建新提案
        const result = await createNewProposal(courseId, maxVoteTeachers);
        return result
    }
}

// 重新创建提案函数
async function createNewProposal(selectedCourseId, candidateId) {
    let tx = await voteContract.createChooseTeacherProposal("create Conflict Proposal", selectedCourseId, candidateId, 9);//7老师+2班级
    let receipt = await tx.wait();
    const event = receipt.events.find(event => event.event === "ProposalCreated");
    let { proposalId, description } = event.args;
    proposalId = proposalId.toNumber();
    
    // 创建班级提案
    let txClass = await classContract.createProposal("createProposal", selectedCourseId, candidateId, proposalId);
    let receiptClass = await txClass.wait();
    const eventClass = receiptClass.events.find(event => event.event === "ProposalCreated");
    let { classProposalId, classDescription } = eventClass.args;
    
    classProposalId = classProposalId.toNumber();
    return {
        code: 0,
        message: `Teachers have equal votes, Create new Proposal successfully, Proposal Id: ${proposalId}`,
        classMessage: `Teachers have equal votes, Create new Proposal in class successfully, Proposal Id: ${classProposalId}`,
        proposalId: proposalId,
        classProposalId : classProposalId,
        candidateTeacherId : candidateId
    };
}

/**
 * 转移课程给性价比更高的目标
 * @param {number} courseId - 要转移的课程ID
 * @param {number} targetId - 目标老师/智能体ID
 * @param {string} targetType - 目标类型 ("teacher" 或 "agent")
 * @returns {Promise<{code: number, message: string}>}
 */
async function transferCourse(courseId, targetId) {
    try {
        let nowTime = new Date();
        let transferCourseEndTime = await contract.transferCourseEndTime();
        transferCourseEndTime = transferCourseEndTime.toNumber(); // 获取秒级时间戳
        
        // 将秒级时间戳转换为毫秒级时间戳
        transferCourseEndTime = transferCourseEndTime * 1000;
        
        // 获取当前时间的毫秒级时间戳
        const nowTimeMs = nowTime.getTime();
        
        // 格式化时间用于日志输出
        const formattedTransferCourseEndTime = new Date(transferCourseEndTime).toLocaleString('zh-CN', options);
        console.log(`换课的结束时间是: ${formattedTransferCourseEndTime}`);
        
        // 获取计算分数的类型
        let scoreType = await contract.ScoreTypeChioce();
        let scoreTypePrint;
        if (scoreType === "Cost-effectiveness") {
            scoreTypePrint = "性价比";
        } else if (scoreType === "Suitability&Preference") {
            scoreTypePrint = "能力意愿的加权分数";
        }
        
        // 比较当前时间与换课结束时间
        if (nowTimeMs >= transferCourseEndTime) {
            return {
                code: -1,
                message: "转移课程的允许时间已经结束了！"
            };
        } else {
            const formattedNowTime = nowTime.toLocaleString('zh-CN', options);
            console.log(`现在的时间是${formattedNowTime}，允许换课`);
        }

        // 获取当前分配者信息
        const currentTeachers = await contract.getCoursesAssignedTeacher(courseId);
        const currentAssigned = currentTeachers.map(id => id.toNumber());
        const currentAddress = await currentSigner.getAddress();

        // 验证调用者是当前分配者
        const senderTeacherId = (await contract.addressToTeacherId(currentAddress)).toNumber();
        const isCurrentHolder = currentAssigned.includes(senderTeacherId);
        let coins = (await contract.teachers(senderTeacherId)).transferCourseCoins;
        coins = coins.toNumber();
        if (coins < 2) {
            return{
                code: -1,
                message: `当前转移课程币的数量为 ${coins}, 无法实现转移课程`
            }
        }

        if (!isCurrentHolder) {
            return{
                code: -1,
                message: "只有当前课程拥有者才可以转移课程"
            }
        }

        // 获取目标适合度
        let targetSuitability = (await contract.getTeacherSuitability(targetId, courseId)).toNumber();

        // 检查目标适合度是否大于50
        if (targetSuitability <= 50) {
            return{
                code: -1,
                message: "目标老师适合程度必须大于50"
            }
        }

        // 获取当前分配者分数
        let currentPerf;
        if (senderTeacherId !== 0) {
            currentPerf = (await getCompareScore(senderTeacherId, courseId, scoreType)).data;
        }

        // 获取目标分数
        let targetPerf = (await getCompareScore(targetId, courseId, scoreType)).data;

        // 验证分数提升
        if (targetPerf <= currentPerf) {
            return{
                code: -1,
                message: `目标${scoreTypePrint}需大于当前值（当前: ${currentPerf.toFixed(2)}, 目标: ${targetPerf.toFixed(2)}）`
            }
        }

        // 执行转移
        if (senderTeacherId !== 0) {
            await removeTeacherCourse(senderTeacherId, courseId);
        } else {
            await removeAgentCourse(senderAgentId, courseId);
        }
        await AssignedTeacherCourse(targetId, courseId);

        

        // 将给课的人的币数量-2，获得课的人币数量+1
        let senderCoins = (await contract.teachers(senderTeacherId)).transferCourseCoins;
        senderCoins = senderCoins.toNumber() -2;
        await contract.setTeacherTransferCourseCoins(senderTeacherId, senderCoins);
        let targetCoins = (await contract.teachers(targetId)).transferCourseCoins;
        targetCoins = targetCoins.toNumber() + 1;
        await contract.setTeacherTransferCourseCoins(targetId, targetCoins);

        let transferCourseNumbers = await contract.transferCourseNumbers();
        transferCourseNumbers = transferCourseNumbers.toNumber();
        transferCourseNumbers++;
        console.log(`给课次数: ${transferCourseNumbers}`)
        await contract.settransferCourseNumbers(transferCourseNumbers);
        // 返回转移情况
        return { 
            code: 0, 
            message: `课程 ${courseId} 已从 ${senderTeacherId || senderAgentId} 转移至教师 ${targetId}`,
            performanceImprovement: (targetPerf - currentPerf).toFixed(2),
            targetSuitability: targetSuitability,
            senderCoins: `给课老师的换课剩余币数量: ${senderCoins}`,
            targetCoins: `被给课老师的换课剩余币数量: ${targetCoins}`,
            scoreTypePrint: scoreTypePrint
        };

    } catch (error) {
        console.error("转移失败:", error.message);
        return { 
            code: -1, 
            message: error.message,
            errorDetails: error.stack 
        };
    }
}

async function preprocessConflictCourses() {
    try {
        let nowTime = Math.floor(Date.now() / 1000);
        await contract.settransferCourseEndTime(nowTime);
        console.log(`转移课程已结束`);
        
        const courseIds = (await contract.getCourseIds()).map(id => id.toNumber());
        let successCount = 0;
        let skippedCourses = 0;
        let failedCourses = 0;
        let scoreType = await contract.ScoreTypeChioce();
        // 串行处理所有课程
        for (const courseId of courseIds) {
            try {
                const [teachers, agents] = await Promise.all([
                    contract.getCoursesAssignedTeacher(courseId),
                    contract.getCoursesAssignedAgent(courseId)
                ]);

                // 检查无冲突条件
                if (teachers.length === 1 && agents.length === 0) {
                    const teacherId = teachers[0].toNumber();
                    let existingCourses = await contract.getTeacherReallyAssignedCourses(teacherId);
                    console.log(`courseId: ${courseId} TeacherId: ${teacherId}`)
                    // 检查课程数量限制
                    if (existingCourses.length < 2) {
                        const tx = await contract.addTeacherReallyAssignedCourses(teacherId, courseId);
                        await tx.wait();
                        
                    } else {
                        await contract.removeTeacherAssignedCourses(teacherId, courseId);
                        await contract.removeCourseAssignedTeacherId(courseId, teacherId);
                        // 获取当前课程的 score
                        let currentScore = (await getCompareScore(teacherId, courseId, scoreType)).data;
                        existingCourses = existingCourses.map(id => id.toNumber());

                        // 获取所有现有课程的 score 并存储
                        const coursesWithScores = [];
                        for (const existCourseId of existingCourses) {
                            let courseScore = (await getCompareScore(teacherId, existCourseId, scoreType)).data;
                            coursesWithScores.push({
                                courseId: existCourseId,
                                score: courseScore
                            });
                            await contract.removeTeacherAssignedCourses(teacherId, existCourseId);
                            await contract.removeTeacherReallyAssignedCourses(teacherId, existCourseId);
                            await contract.removeCourseAssignedTeacherId(existCourseId, teacherId);
                        }

                        // 添加当前课程到列表中
                        coursesWithScores.push({
                            courseId: courseId,
                            score: currentScore
                        });
                        // 按照 score 降序排序
                        coursesWithScores.sort((a, b) => b.score - a.score);
                        // 选出最大的两个 courseId
                        const topTwoCourses = coursesWithScores.slice(0, 2).map(item => item.courseId);
                        for(let courseId of topTwoCourses){
                            await contract.addTeacherAssignedCourses(teacherId, courseId);
                            await contract.addTeacherReallyAssignedCourses(teacherId, courseId);
                            await contract.addCourseAssignedTeacherId(courseId, teacherId);
                        }
                    }
                    successCount++;
                } else {
                    skippedCourses++;
                }
            } catch (error) {
                console.error(`处理课程 ${courseId} 时出错:`, error);
                failedCourses++;
            }
        }

        console.log(`预处理完成，成功分配 ${successCount} 个课程，跳过 ${skippedCourses} 个课程，失败 ${failedCourses} 个课程`);
        return { code: 0, message: "预处理完成" };
    } catch (error) {
        console.error("处理失败:", error);
        return { code: -1, message: error.message };
    }
}

// 设定比较的分数
async function getCompareScore(teacherId, courseId, scoreType){
    let teacher = await contract.teachers(teacherId);
    if(scoreType === "Cost-effectiveness"){
        let salary = teacher.value;
        salary = salary.toNumber();
        let suitability = await contract.getTeacherSuitability(teacherId, courseId);
        suitability = suitability.toNumber();
        let CostEffectiveness = suitability/salary;
        // console.log(teacherId, courseId)
        // console.log(`计算出来的分数为 ${CostEffectiveness}`)
        return {
            code: 0,
            message: "Cost-effectiveness",
            data: CostEffectiveness
        }
    }else if(scoreType === "Suitability&Preference"){
        let totalTeacherWeight = await contract.totalWeight();
        totalTeacherWeight = totalTeacherWeight.toNumber();
        let totalClassWeight = await classContract.getClassWeight();
        let totalWeight = totalTeacherWeight + totalClassWeight.toNumber();
        let currentWeight = totalWeight - (teacher.suitabilityWeight).toNumber();
        let courseSuitability = await contract.getTeacherSuitability(teacherId, courseId);
        let coursePreference = await contract.getPreference(teacherId, courseId);
        let teacherCount = Number(await contract.teacherCount());
        let classCount = Number(await contract.classCount());
        let teacherScore = (currentWeight * courseSuitability + (10 * (teacherCount + classCount -1) - currentWeight) * coursePreference)/60;
        return {
            code: 0,
            message: "Suitability&Preference",
            data: teacherScore
        }
    }
}

async function proposalForCoursesWithoutAssigned(){
    let selectedCourseId = 0;
    let isCreate = false;
    let candidateTeacher = [];
    let courseIds = (await contract.getCourseIds()).map(id => id.toNumber());
    
    // 创建一个数组来存储课程ID和它们的重要程度
    let coursesWithImportance = [];

    // 遍历每个课程ID，获取课程的重要程度
    for (let i = 0; i < courseIds.length; i++) {
        let courseId = courseIds[i];
        let course = await contract.courses(courseId);
        let courseImportance = Number(course.importance);
        coursesWithImportance.push({
            courseId: courseId,
            importance: courseImportance
        });
    }

    // 按照重要程度对课程进行排序（降序）
    coursesWithImportance.sort((a, b) => b.importance - a.importance);

    // 提取排序后的课程ID
    courseIds = coursesWithImportance.map(item => item.courseId);
    for(const courseId of courseIds){
        const [teachers, agents] = await Promise.all([
            contract.getCoursesAssignedTeacher(courseId),
            contract.getCoursesAssignedAgent(courseId)
        ]);
        if(teachers.length === 0 && agents.length === 0){
            selectedCourseId = courseId;
            let teacherIds = await contract.getTeacherIds();
            for(let teacherId of teacherIds){
                let assignedCourse = await contract.getTeacherReallyAssignedCourses(teacherId);
                if(assignedCourse.length < 2){
                    candidateTeacher.push(teacherId);
                }
            }
            isCreate = true;
            break;
        }
    }
    if(!isCreate) return{
        code : 0,
        message : "All Courses Assigned"
    }

    if(candidateTeacher.length == 1 && selectedCourseId != -1) {
        // 只有一个没有课程的老师，直接分配
        console.log(await assignCourseToTeacherWithoutCourse(selectedCourseId, candidateTeacher[0]));
        return {
            code: 0,
            message: `课程 ${selectedCourseId} 已经分配给了老师 ${candidateTeacher[0]}, 现在所有课程都有老师了`
        }
    }
    
    candidateTeacher = candidateTeacher.map(id => id.toNumber());
    // 创建提案
    let tx = await voteContract.createChooseTeacherProposal("create Conflict Proposal", selectedCourseId, candidateTeacher, 9);//7老师+2班级
    let receipt = await tx.wait();
    const event = receipt.events.find(event => event.event === "ProposalCreated");
    let { proposalId, description } = event.args;
    proposalId = proposalId.toNumber();
    
    // 创建班级提案
    let txClass = await classContract.createProposal("createProposal", selectedCourseId, candidateTeacher, proposalId);
    let receiptClass = await txClass.wait();
    const eventClass = receiptClass.events.find(event => event.event === "ProposalCreated");
    let { classProposalId, classDescription } = eventClass.args;
    
    classProposalId = classProposalId.toNumber();
    return {
        code: 0,
        message: "成功为没有老师的课程创建提案",
        proposalId: proposalId,
        classProposalId: classProposalId,
        selectedCourseId: selectedCourseId,
        candidateTeacher: candidateTeacher
    }
}

async function checkCourseConflicts() {
    const courseIds = await contract.getCourseIds();
    let conflictCourses = [];
    
    for (const courseId of courseIds) {
        // 同时获取教师和智能体分配情况
        const [teachers, agents] = await Promise.all([
            contract.getCoursesAssignedTeacher(courseId),
            contract.getCoursesAssignedAgent(courseId)
        ]);

        // 冲突条件：教师或智能体被分配超过1人
        const hasTeacherConflict = teachers.length > 1;
        const hasMixedConflict = teachers.length > 0 && agents.length > 0;
        if (hasTeacherConflict || hasMixedConflict) {
            conflictCourses.push({
                courseId,
                teacherCount: teachers.length,
                teacherIds: teachers.map(id => Number(id)),
                agentCount: agents.length
            });
        }
    }

    if (conflictCourses.length === 0) return '无课程冲突';

    // 生成详细冲突报告
    return conflictCourses.map(conflict => 
        `课程 ${conflict.courseId} 冲突：${conflict.teacherCount}位教师,分别是 ${conflict.teacherIds.join(', ')}`
    ).join('\n');
}

async function switchCurrentSigner_courseAllocation(newAddress, newCurrentName){
    currentSigner = provider.getSigner(newAddress);
    contract = new ethers.Contract(contractAddress, contractABI, currentSigner);
    voteContract = new ethers.Contract(voteAddress, voteABI, currentSigner);
    classContract = new ethers.Contract(classContractAddress, classABI, currentSigner);
    currentName = newCurrentName;
}
module.exports = {
    switchCurrentSigner_courseAllocation,
    init_TeacherCourses,
    init_AgentCourses,
    getTeacherCostPerformance,
    getAgentCostPerformance,
    printAssignments,
    transferCourse, // 给课
    checkCourseConflicts, // 查看课程冲突情况
    preprocessConflictCourses, // 冲突提案前的预处理
    createConflictProposal, // 创建冲突提案
    endConfictProposal,
    checkAndCreateProposalForTeacher, // 给没有课程的老师投票选择课程
    proposalForCoursesWithoutAssigned, // 为没有被分配的课程创建提案
    endProposalAndAssignCourseforWithoutteacher, // 为没有老师的课程分配老师
    teacherVote,
    agentVote
}