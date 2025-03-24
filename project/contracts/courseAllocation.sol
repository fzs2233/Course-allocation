// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {IVote} from "./VoteInterface.sol";
import {StudentVote} from "./IStudentVote.sol";


contract CourseAllocation {
    
    // 教师结构体
    struct Teacher {
        uint256 id;
        string name;
        // 教师账户地址
        address addr;
        // 已经分配的课程
        uint256[] assignedCourses;
        // 对适合程度的权重
        uint256 suitabilityWeight;
        // 教师对每门课的适合程度
        mapping(uint256 => uint256) courseSuitability;
        // 教师对每门课的偏好程度
        mapping(uint256 => uint256) coursePreferences;
    }

    // 智能体结构体
    struct Agent {
        uint256 id;
        string name;
        // 教师账户地址
        address addr;
        // 已经分配的课程
        uint256[] assignedCourses;
        // 教师对每门课的适合程度
        mapping(uint256 => uint256) courseSuitability;
    }

    
    // 课程结构体
    struct Course {
        // 课是否存在
        bool isexist;
        uint256 id;
        string name;
        // 课程重要性
        uint256 importance;
        // 分配给的教师ID
        uint256 assignedTeacherId;
        // 是否分配给智能体
        bool isAssignedAgent;
        //是否适合智能体
        bool isAgentSuitable;
    }

    // 管理员地址
    address public admin;

    // 教师映射：地址 => 教师ID
    mapping(address => uint256) public addressToTeacherId;

    // 智能体映射：地址 => 智能体ID
    mapping(address => uint256) public addressToAgentId;

    // 班级映射：地址 => 班级ID
    mapping(address => uint256) public addressToClassId;

    // 教师映射：ID => 教师结构体
    mapping(uint256 => Teacher) public teachers;

    // 智能体映射：ID => 智能体结构体
    mapping(uint256 => Agent) public agents;

    // 课程映射：ID => 课程结构体
    mapping(uint256 => Course) public courses;

    // 教师ID计数器
    uint256 public teacherCount;

    // 智能体ID计数器
    uint256 public agentCount;

    // 班级ID计数器
    uint256 public classCount;

    // 课程ID计数器
    uint256 public courseCount;

    // 投票合约的地址
    address votingContractAddress;

    // 班级投票合约的地址
    address classvotingAddress;

    // 投票合约对象
    IVote Vote;
    // 班级投票
    StudentVote studentVote;

    // 事件
    event CourseImportanceSet(uint256 indexed courseId, uint256 importance);
    event SuitabilityUpdated(uint256 indexed courseId, uint256 suitability);
    event PreferenceUpdated(uint256 indexed teacherId, uint256 indexed courseId, uint256 preference);
    event ProposalCreated(uint256 proposalId, uint256 indexed courseId, uint256[] teacherIds); // 提案创建
    event MachineProposal(uint256 proposalId, uint256 indexed courseId, uint256[] teacherIds, uint256[] teacherCounts); // 提案创建
    event CourseAssignedToTeacher(uint256 indexed courseId, uint256 indexed teacherId); // 课程分配给老师
    
    // 构造函数，初始化管理员
    constructor() {
        admin = msg.sender;
    }

    // 修饰符：仅管理员可访问
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    // 修饰符：仅教师可访问
    modifier onlyTeacher() {
        require(addressToTeacherId[msg.sender] != 0, "Only registered teachers can call this function");
        _;
    }

    function getcourse(uint256 courseId) public view returns (Course memory) {
        return courses[courseId];
    }

    // 设置提案投票合约地址
    function setVotingContractAddress(address _votingContractAddress) external onlyAdmin {
        votingContractAddress = _votingContractAddress;
        Vote = IVote(votingContractAddress);
    }

    // 设置班级提案投票合约地址
    function setclassVotingContract(address _votingContractAddress) external onlyAdmin {
        classvotingAddress = _votingContractAddress;
        studentVote = StudentVote(classvotingAddress);
    }

    // 管理员初始化课程
    function initializeCourse(string memory _name, bool _isAgentSuitable) public onlyAdmin {
        courseCount++;
        courses[courseCount].id = courseCount;
        courses[courseCount].name = _name;
        courses[courseCount].isAgentSuitable = _isAgentSuitable;
        courses[courseCount].isexist = true;
        courses[courseCount].isAssignedAgent = false;
    }

    // 管理员设置课程重要程度
    function setAllCourseImportance(uint256[] memory _importances) public onlyAdmin {
        require(_importances.length == courseCount, "must update all course suitability");
        // 更新课程适合度
        uint256 suitabilityIndex = 0; // 用于跟踪 _suitabilities 的索引
        for (uint256 i = 1; i <= courseCount; i++) {
            if (!courses[i].isexist) continue; // 如果课程不存在，跳过
            courses[i].importance = _importances[suitabilityIndex];
            suitabilityIndex++;
        }
    }

    // 管理员设置课程重要程度
    function setCourseImportance(uint256 _courseId, uint256 _importance) public onlyAdmin {
        require(_courseId <= courseCount, "Course does not exist");
        courses[_courseId].importance = _importance;
        emit CourseImportanceSet(_courseId, _importance);
    }

    // 教师注册账户
    function registerTeacher(string memory _name) public {
        require(addressToTeacherId[msg.sender] == 0, "Teacher already registered");
        teacherCount++;
        addressToTeacherId[msg.sender] = teacherCount;
        teachers[teacherCount].id = teacherCount;
        teachers[teacherCount].name = _name;
        teachers[teacherCount].addr = msg.sender;
        Vote.registerVoter(msg.sender);
    }

    // 注册班级
    function registerClass() public {
        classCount++;
        addressToClassId[msg.sender] = classCount;
        Vote.registerVoter(msg.sender);
    }

    // 智能体注册账户
    function registerAgent(string memory _name) public {
        require(addressToAgentId[msg.sender] == 0, "Agent already registered");
        agentCount++;
        addressToAgentId[msg.sender] = agentCount;
        agents[agentCount].id = agentCount;
        agents[agentCount].name = _name;
        agents[agentCount].addr = msg.sender;
    }

    // 教师修改课程适合程度的权重
    function updateSuitabilityWeight(uint256 _suitabilityWeight) public onlyTeacher {
        uint256 teacherId = addressToTeacherId[msg.sender];
        teachers[teacherId].suitabilityWeight = _suitabilityWeight;
    }

    // 教师批量修改课程适合程度
    function updateTeacherAllSuitability(uint256[] memory _suitabilities) public {
        require(_suitabilities.length == courseCount, "must update all course suitability");
        uint256 teacherId = addressToTeacherId[msg.sender];
        // 更新课程适合度
        uint256 suitabilityIndex = 0; // 用于跟踪 _suitabilities 的索引
        for (uint256 i = 1; i <= courseCount; i++) {
            if (!courses[i].isexist) continue; // 如果课程不存在，跳过
            teachers[teacherId].courseSuitability[i] = _suitabilities[suitabilityIndex];
            suitabilityIndex++;
        }
    }

    // 智能体批量修改课程适合程度
    function updateAgentAllSuitability(uint256[] memory _suitabilities) public {
        require(_suitabilities.length == courseCount, "must update all course suitability");
        uint256 agentId = addressToAgentId[msg.sender];
        // 更新课程适合度
        uint256 suitabilityIndex = 0; // 用于跟踪 _suitabilities 的索引
        for (uint256 i = 1; i <= courseCount; i++) {
            if (!courses[i].isexist) continue; // 如果课程不存在，跳过
            agents[agentId].courseSuitability[i] = _suitabilities[suitabilityIndex];
            suitabilityIndex++;
        }
    }

    // 教师批量修改课程偏好程度
    function updateAllCoursepreferences(uint256[] memory _preferences) public onlyTeacher {
        require(_preferences.length == courseCount, "must update all course preference");
        uint256 teacherId = addressToTeacherId[msg.sender];
        // 更新课程偏好程度
        uint256 preferenceIndex = 0; // 用于跟踪 _preferences 的索引
        for (uint256 i = 1; i <= courseCount; i++) {
            if (!courses[i].isexist) continue; // 如果课程不存在，跳过
            teachers[teacherId].coursePreferences[i] = _preferences[preferenceIndex];
            preferenceIndex++;
        }
    }

    // // 教师修改课程适合程度
    // function updateCourseSuitability(uint256 _courseId, uint256 _suitability) public onlyTeacher {
    //     require(_courseId <= courseCount, "Course does not exist");
    //     uint256 teacherId = addressToTeacherId[msg.sender];
    //     teachers[teacherId].courseSuitability[_courseId] = _suitability;
    //     emit SuitabilityUpdated(_courseId, _suitability);
    // }

    // // 教师修改课程偏好程度
    // function updateCoursePreference(uint256 _courseId, uint256 _preference) public onlyTeacher {
    //     require(_courseId <= courseCount, "Course does not exist");
    //     uint256 teacherId = addressToTeacherId[msg.sender];
    //     teachers[teacherId].coursePreferences[teacherId] = _preference;
    //     emit PreferenceUpdated(teacherId, _courseId, _preference);
    // }


    // 获取所有课程的重要程度
    function getAllCourseImportance() public view returns (uint256[] memory) {
        uint256[] memory importanceArray = new uint256[](courseCount);
        uint256 index = 0;

        for (uint256 i = 1; i <= courseCount; i++) {
            if (courses[i].isexist) {
                importanceArray[index] = courses[i].importance;
                index++;
            }
        }
        return importanceArray;
    }

    // 获取教师已分配课程
    function getTeacherAssignedCourses() public view returns (uint256[] memory) {
        uint256 _teacherId = addressToTeacherId[msg.sender];
        return teachers[_teacherId].assignedCourses;
    }

    function getAgentAssignedCourses() public view returns (uint256[] memory) {
        uint256 _agentId = addressToAgentId[msg.sender];
        return agents[_agentId].assignedCourses;
    }

    // // 获取课程适合程度
    // function getCourseSuitability(uint256 _courseId) public view returns (uint256) {
    //     uint256 teacherId = addressToTeacherId[msg.sender];
    //     return teachers[teacherId].courseSuitability[_courseId];
    // }

    // 获取课程适合程度
    function getteacherCourseSuitability(uint256 _teacherId, uint256 _courseId) public view returns (uint256) {
        return teachers[_teacherId].courseSuitability[_courseId];
    }
    function getagentCourseSuitability(uint256 _agentId, uint256 _courseId) public view returns (uint256) {
        return agents[_agentId].courseSuitability[_courseId];
    }

    // 管理员调用，为适合智能体的课程分配智能体教师
    function allocateAgentCourses() public onlyAdmin {
        uint256 allocatedCount = 0;

        // 遍历所有课程，找到适合智能体的课程
        for (uint256 courseId = 1; courseId <= courseCount; courseId++) {
            if (!courses[courseId].isAgentSuitable || courses[courseId].assignedTeacherId != 0 || !courses[courseId].isexist) continue;

            uint256 bestAgentId = 0;
            uint256 maxSuitability = 0;

            // 遍历所有教师，找到最适合的智能体教师
            for (uint256 agentId = 1; agentId <= agentCount; agentId++) {
                Agent storage agent = agents[agentId];
                if (agent.assignedCourses.length >= 2) continue; // 跳过非智能体或已满额的教师

                uint256 suitability = agent.courseSuitability[courseId];
                if (suitability > maxSuitability) {
                    maxSuitability = suitability;
                    bestAgentId = agentId;
                }
            }

            // 分配课程给最适合的智能体教师
            if (bestAgentId != 0) {
                courses[courseId].assignedTeacherId = bestAgentId;
                courses[courseId].isAssignedAgent = true;
                agents[bestAgentId].assignedCourses.push(courseId);
                allocatedCount++;
            }

        }
    }

    // 管理员调用，创建提案
    function createProposalForCourse() public onlyAdmin {
        uint256 highestImportance = 0;
        uint256 selectedCourseId = 0;

        // 遍历所有课程，找到尚未分配且重要程度最高的课程
        for (uint256 courseId = 1; courseId <= courseCount; courseId++) {
            if (courses[courseId].assignedTeacherId == 0 && courses[courseId].importance > highestImportance) {
                highestImportance = courses[courseId].importance;
                selectedCourseId = courseId;
            }
        }

        require(selectedCourseId != 0, "No suitable course found");

        uint256[] memory candidateTeachers = new uint256[](teacherCount);
        uint256 candidateCount = 0; 

        // 遍历所有教师，筛选出适合的教师
        for (uint256 teacherId = 1; teacherId <= teacherCount; teacherId++) {
            if (teachers[teacherId].assignedCourses.length < 2) {
                // 将教师ID和偏好程度作为元组存储
                candidateTeachers[candidateCount] = teacherId;
                candidateCount++;
            }
        }
        // 按偏好程度排序，选择前二名
        if (candidateTeachers.length > 0) {
            // 冒泡排序
            for (uint256 i = 0; i < candidateCount; i++) {
                for (uint256 j = i + 1; j < candidateCount; j++) {
                    uint256 teacherId1 = candidateTeachers[i];
                    uint256 teacherId2 = candidateTeachers[j];
                    uint256 preference1 = teachers[teacherId1].coursePreferences[selectedCourseId];
                    uint256 preference2 = teachers[teacherId2].coursePreferences[selectedCourseId];
                    if (preference1 < preference2) {
                        // 交换
                        uint256 temp = candidateTeachers[i];
                        candidateTeachers[i] = candidateTeachers[j];
                        candidateTeachers[j] = temp;
                    }
                }
            }

            // 对符合条件的老师进行排序
            // 取前二名
            uint256[] memory topThreeTeachers = new uint256[](2);
            for (uint256 i = 0; i < 2 && i < candidateTeachers.length; i++) {
                if(candidateTeachers[i] != 0){
                    topThreeTeachers[i] = candidateTeachers[i]; // 这里2是候选老师的数量
                }
            }

            // 调用提案投票合约的创建提案功能
            uint256 proposalId = Vote.createChooseTeacherProposal("createProposal", selectedCourseId, topThreeTeachers, 7);
            emit ProposalCreated(proposalId, selectedCourseId, topThreeTeachers);
            uint256 studentProposalId = studentVote.createProposal("createProposal", selectedCourseId, topThreeTeachers);
            emit ProposalCreated(studentProposalId, selectedCourseId, topThreeTeachers);
        }
    }

    event samescore(uint256[] maxScoreTeachers, uint256[] preferences);
    // 管理员调用，创建提案
    function machineVoting() public onlyAdmin {
        // 找到未分配且重要性最高的课程
        uint256 highestImportance;
        uint256 selectedCourseId;
        for (uint256 courseId = 1; courseId <= courseCount; courseId++) {
            if (courses[courseId].assignedTeacherId == 0 && courses[courseId].importance > highestImportance) {
                highestImportance = courses[courseId].importance;
                selectedCourseId = courseId;
            }
        }
        require(selectedCourseId != 0, "No suitable course found");

        // 计算教师总权重和候选教师数量
        uint256 totalWeight;

        uint256 classweights = studentVote.getClassWeight();

        totalWeight += classweights;


        for (uint256 teacherId = 1; teacherId <= teacherCount; teacherId++) {
            totalWeight += teachers[teacherId].suitabilityWeight;
        }

        // 找到对课程评分最高的教师
        uint256 highestScore;
        uint256 selectedTeacherId;
        uint256 maxCoursePreferences;
        for (uint256 teacherId = 1; teacherId <= teacherCount; teacherId++) {
            Teacher storage teacher = teachers[teacherId];
            if (teacher.assignedCourses.length < 2) {
                uint256 teacherWeight = totalWeight - teacher.suitabilityWeight;
                uint256 score = teacherWeight * teacher.courseSuitability[selectedCourseId] + 
                                (10 * (teacherCount + classCount - 1) - teacherWeight) * teacher.coursePreferences[selectedCourseId];
                
                if (score > highestScore) {
                    highestScore = score;
                    selectedTeacherId = teacherId;
                    maxCoursePreferences = teacher.coursePreferences[selectedCourseId];
                } else if (score == highestScore) {
                    uint256 currentPreferences = teacher.coursePreferences[selectedCourseId];
                    if (currentPreferences > maxCoursePreferences) {
                        maxCoursePreferences = currentPreferences;
                        selectedTeacherId = teacherId;
                    }
                }
            }
        }

        require(selectedTeacherId != 0, "No suitable teacher found for the course");

        emit CourseAssignedToTeacher(selectedCourseId, selectedTeacherId);
        uint256 proposalId = Vote.createMachineVoteProposal("MachineProposal", selectedCourseId, getCandidateTeachers(), getTeachersScores(selectedCourseId));
        studentVote.createProposal("createProposal", selectedCourseId, getCandidateTeachers());
        emit MachineProposal(proposalId, selectedCourseId, getCandidateTeachers(), getTeachersScores(selectedCourseId));
        // 创建提案并分配课程
        assignCourseToTeacher(selectedCourseId, selectedTeacherId);

    }

    function getCandidateTeachers() internal view returns (uint256[] memory) {
        uint256[] memory candidateTeachers = new uint256[](teacherCount);
        uint256 count;
        for (uint256 teacherId = 1; teacherId <= teacherCount; teacherId++) {
            if (teachers[teacherId].assignedCourses.length < 2) {
                candidateTeachers[count] = teacherId;
                count++;
            }
        }
        return candidateTeachers;
    }

    function getTeachersScores(uint256 courseId) internal view returns (uint256[] memory) {
        uint256[] memory teachersScores = new uint256[](teacherCount);
        uint256 totalWeight;

        totalWeight += studentVote.getClassWeight();
        for (uint256 teacherId = 1; teacherId <= teacherCount; teacherId++) {
            if (teachers[teacherId].assignedCourses.length < 2) {
                totalWeight += teachers[teacherId].suitabilityWeight;
            }
        }
        for (uint256 teacherId = 1; teacherId <= teacherCount; teacherId++) {
            if (teachers[teacherId].assignedCourses.length < 2) {
                uint256 teacherWeight = totalWeight - teachers[teacherId].suitabilityWeight;
                uint256 score = teacherWeight * teachers[teacherId].courseSuitability[courseId] + 
                                (10 * (teacherCount + classCount - 1) - teacherWeight) * teachers[teacherId].coursePreferences[courseId];
                teachersScores[teacherId - 1] = score;
            }
        }
        return teachersScores;
    }

    // 查看候选教师票数
    function getVoteIdToCount(uint256 proposalId, uint256 teacherId) view external returns (uint256){
        return Vote.getVoteIdToCount(proposalId, teacherId);
    }

    // 查看候选教师
    function getCandidateTeacher(uint256 proposalId) view external returns (uint256[] memory, uint256){
        (uint256[] memory votedIds, uint256 result) = Vote.getVotedIds(proposalId);
        return (votedIds, result);
    }

    // 为课程投票选择教师
    function voteForTeacher(uint256 proposalId, uint256 teacherId) external onlyTeacher {
        Vote.voteChooseTeacher(msg.sender, proposalId, teacherId);
    }
    event endClassVote(uint256 proposalId, uint256 winningTeacherId);
    // 为课程投票选择教师
    function classvoteForTeacher(uint256 proposalId) external returns (uint256){
        (uint256 winningTeacherId, ) = studentVote.getProposalResults(msg.sender, proposalId);
        emit endClassVote(proposalId, winningTeacherId);
        Vote.voteChooseTeacher(msg.sender, proposalId, winningTeacherId);
        return winningTeacherId;
    }

    // 为没有课程的教师选择课程
    function voteChooseCourse(uint256 proposalId, uint256 courseId) external onlyTeacher {
        Vote.voteChooseCourse(msg.sender, proposalId, courseId);
    }

    // 结束投票并分配课程
    function endProposalAndAssignCourse(uint256 proposalId) external onlyAdmin returns (uint256, uint256){
        // 调用提案投票合约的结束投票功能
        (uint256 winningTeacherId, uint256 courseId) = Vote.endVoteChooseTeacher(proposalId);

        // 将课程分配给获胜的教师
        assignCourseToTeacher(courseId, winningTeacherId);

        // 记录事件
        emit CourseAssignedToTeacher(courseId, winningTeacherId);

        return (courseId, winningTeacherId);
    }

    // 结束投票并分配课程
    function endProposalAndAssignCourseforWithoutteacher(uint256 proposalId) external onlyAdmin returns (uint256, uint256){
        // 调用提案投票合约的结束投票功能
        (uint256 teacherId, uint256 courseId) = Vote.endVoteChooseCourse(proposalId);

        // 将课程分配给获胜的教师
        assignCourseToTeacherWithoutCourse(courseId, teacherId);

        // 记录事件
        emit CourseAssignedToTeacher(courseId, teacherId);

        return (courseId, teacherId);
    }

    // 分配课程给教师
    function assignCourseToTeacher(uint256 courseId, uint256 teacherId) internal {
        require(courses[courseId].assignedTeacherId == 0, "Course already assigned");
        courses[courseId].assignedTeacherId = teacherId;
        courses[courseId].isAssignedAgent = false;
        teachers[teacherId].assignedCourses.push(courseId);
    }

    // 分配课程给教师
    function assignCourseToTeacherWithoutCourse(uint256 courseId, uint256 teacherId) internal {
        // 如果课程已经被分配给某个智能体
        if (courses[courseId].assignedTeacherId != 0) {
            // 从原来的智能体那里移除这门课程
            removeCourseFromTeacher(courses[courseId].assignedTeacherId, courseId);
        }

        // 将课程分配给新的老师
        assignCourseToTeacher(courseId, teacherId);
    }

    // 辅助函数：从老师那里移除课程
    function removeCourseFromTeacher(uint256 agentId, uint256 courseId) internal {
        courses[courseId].assignedTeacherId = 0;
        uint256[] storage assignedCourses = agents[agentId].assignedCourses;
        for (uint256 i = 0; i < assignedCourses.length; i++) {
            if (assignedCourses[i] == courseId) {
                // 找到课程位置，移除该课程
                assignedCourses[i] = assignedCourses[assignedCourses.length - 1];
                assignedCourses.pop();
                break;
            }
        }
    }

    // 检查是否有老师没有课程，并为没有课程的老师创建提案
    function checkAndCreateProposalForTeacher() external onlyAdmin{
        uint256[] memory teacherWithoutCourse = new uint256[](teacherCount);
        uint256 Index;
        // 遍历所有老师，找到没有课程的老师
        for (uint256 i = 1; i <= teacherCount; i++) {
            if (teachers[i].assignedCourses.length == 0) {
                teacherWithoutCourse[Index] = i;
                Index++;
            }
        }

        if (teacherWithoutCourse.length == 0) {
            // 所有老师都有课程，结束
            require(teacherWithoutCourse.length != 0, "Teacher all have course");
            return;
        }

        // 获取所有智能体的课程作为候选课程
        uint256 candidateCourse = getLeastSuitableAgentCourse();
        // 创建提案
        uint256 proposalId = Vote.createChooseTeacherProposal("Create proposals for teachers without courses", candidateCourse, teacherWithoutCourse, 7);
        uint256 studentProposalId = studentVote.createProposal("createProposal", candidateCourse, teacherWithoutCourse);
        emit ProposalCreated(proposalId, candidateCourse, teacherWithoutCourse);
        emit ProposalCreated(studentProposalId, candidateCourse, teacherWithoutCourse);
    }

    // 检查是否有老师没有课程，并为没有课程的老师创建提案
    function checkAndMachineVoteForTeacher() external onlyAdmin{
        uint256[] memory teacherWithoutCourse = new uint256[](teacherCount);
        uint256 Index;
        // 遍历所有老师，找到没有课程的老师
        for (uint256 i = 1; i <= teacherCount; i++) {
            if (teachers[i].assignedCourses.length == 0) {
                teacherWithoutCourse[Index] = i;
                Index++;
            }
        }

        if (teacherWithoutCourse.length == 0) {
            // 所有老师都有课程，结束
            require(teacherWithoutCourse.length != 0, "Teacher all have course");
            return;
        }

        // 获取所有智能体的课程作为被分配的课程
        uint256 candidateCourses = getLeastSuitableAgentCourse();

        // 计算教师总权重和候选教师数量
        uint256 totalWeight;
        uint256 classweights = studentVote.getClassWeight();

        totalWeight += classweights;

        for (uint256 teacherId = 1; teacherId <= teacherCount; teacherId++) {
            totalWeight += teachers[teacherId].suitabilityWeight;
        }

        // 找到对课程评分最高的教师
        // 找到对课程评分最高的教师
        uint256 highestScore;
        uint256 selectedTeacherId;
        uint256 maxCoursePreferences;
        for (uint256 i = 0; i < teacherWithoutCourse.length; i++) {
            Teacher storage teacher = teachers[teacherWithoutCourse[i]];
            if (teacher.assignedCourses.length < 2) {
                uint256 teacherWeight = totalWeight - teacher.suitabilityWeight;
                uint256 score = teacherWeight * teacher.courseSuitability[candidateCourses] + 
                                (10 * (teacherCount + classCount - 1) - teacherWeight) * teacher.coursePreferences[candidateCourses];
                
                if (score > highestScore) {
                    highestScore = score;
                    selectedTeacherId = teacherWithoutCourse[i];
                    maxCoursePreferences = teacher.coursePreferences[candidateCourses];
                } else if (score == highestScore) {
                    uint256 currentPreferences = teacher.coursePreferences[candidateCourses];
                    if (currentPreferences > maxCoursePreferences) {
                        maxCoursePreferences = currentPreferences;
                        selectedTeacherId = teacherWithoutCourse[i];
                    }
                }
            }
        }

        require(selectedTeacherId != 0, "No suitable teacher found for the course");

        emit CourseAssignedToTeacher(candidateCourses, selectedTeacherId);
        uint256 proposalId = Vote.createMachineVoteProposal("MachineProposal", candidateCourses, teacherWithoutCourse, getTeachersScores(candidateCourses));
        emit MachineProposal(proposalId, candidateCourses, teacherWithoutCourse, getTeachersScores(candidateCourses));
        // 创建提案并分配课程
        assignCourseToTeacherWithoutCourse(candidateCourses, selectedTeacherId);
    }

    // 获取对智能体适合程度最低的课程
    function getLeastSuitableAgentCourse() internal view returns (uint256) {
        uint256 leastSuitableCourseId = 0;
        uint256 minSuitability = type(uint256).max;

        for (uint256 i = 1; i <= courseCount; i++) {
            if (courses[i].isAgentSuitable) {
                uint256 _agentId = courses[i].assignedTeacherId;
                uint256 suitability = agents[_agentId].courseSuitability[i];
                if (suitability < minSuitability) {
                    minSuitability = suitability;
                    leastSuitableCourseId = i;
                }
            }
        }

        return leastSuitableCourseId;
    }
    
    function changeSuitabilitybyStudent(uint256[] memory averageScore) public onlyAdmin{
        for(uint256 i = 1; i <= courseCount; i++) {
            if(courses[i].isAssignedAgent){
                uint256 agentId = courses[i].assignedTeacherId;
                agents[agentId].courseSuitability[i] = averageScore[i-1];
            }else{
                uint256 teacherId = courses[i].assignedTeacherId;
                teachers[teacherId].courseSuitability[i] = averageScore[i-1];
            }
        }
    }
}