// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract ICourseAllocation {
    // 教师结构体
    struct Teacher {
        uint256 id;
        string name;
        address addr;
        uint256[] assignedCourses;
        uint256[] reallyAssignedCourses;
        uint256 suitabilityWeight;
        uint256 transferCourseCoins;
        uint256 value;
        mapping(uint256 => uint256) courseSuitabilities;
        mapping(uint256 => uint256) coursePreferences;
    }

    // 智能体结构体
    struct Agent {
        uint256 id;
        string name;
        address addr;
        uint256 value;
        uint256[] assignedCourses;
        mapping(uint256 => uint256) courseSuitabilities;
    }

    // 课程结构体
    struct Course {
        uint256 id;
        string name;
        uint256 importance;
        uint256[] assignedTeacherId;
        uint256[] assignedAgentId;
        bool isAgentSuitable;
    }

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

    // 老师ID存储数组
    uint256[] public teacherIds;

    // 智能体ID存储数组
    uint256[] public agentIds;

    // 课程ID存储数组
    uint256[] public courseIds;

    // 班级ID存储数组
    uint256[] public classIds;

    // 事件
    // event CourseImportanceSet(uint256 indexed courseId, uint256 importance);
    // event SuitabilityUpdated(uint256 indexed courseId, uint256 suitability);
    // event PreferenceUpdated(uint256 indexed teacherId, uint256 indexed courseId, uint256 preference);
    // event ProposalCreated(uint256 proposalId, uint256 indexed courseId, uint256[] teacherIds); // 提案创建
    // event MachineProposal(uint256 proposalId, uint256 indexed courseId, uint256[] teacherIds, uint256[] teacherCounts); // 提案创建
    // event CourseAssignedToTeacher(uint256 indexed courseId, uint256 indexed teacherId); // 课程分配给老师

    // 构造函数，初始化管理员
    constructor() {}

    // 修饰符：仅教师可访问
    modifier onlyTeacher() {
        require(
            addressToTeacherId[msg.sender] != 0,
            "Only registered teachers can call this function"
        );
        _;
    }

    // 设置教师ID
    function setTeacherId(address teacherAddress, uint256 _TeacherId) public {
        addressToTeacherId[teacherAddress] = _TeacherId;
        teachers[_TeacherId].id = _TeacherId;
        teacherIds.push(_TeacherId);
    }

    // 设置教师是否存在
    function removeTeacher(uint256 teacherId) public onlyTeacher {
        teachers[teacherId].id = 0;
        // 从 teacherIds 数组中移除教师 ID
        for (uint256 i = 0; i < teacherIds.length; i++) {
            if (teacherIds[i] == teacherId) {
                // 将要移除的教师 ID 位置的元素替换为数组中最后一个元素
                teacherIds[i] = teacherIds[teacherIds.length - 1];
                // 移除数组中的最后一个元素
                teacherIds.pop();
                break;
            }
        }
    }

    // 设置教师姓名
    function setTeacherName(
        uint256 teacherId,
        string calldata _name
    ) public onlyTeacher {
        teachers[teacherId].name = _name;
    }

    // 设置教师地址
    function setTeacherAddress(
        uint256 teacherId,
        address _teacherAddress
    ) public onlyTeacher {
        teachers[teacherId].addr = _teacherAddress;
    }

    // 设置教师已分配课程
    function addTeacherAssignedCourses(
        uint256 teacherId,
        uint256 _assignedCourses
    ) public {
        teachers[teacherId].assignedCourses.push(_assignedCourses);
    }

    // 设置教师已分配课程
    function addTeacherReallyAssignedCourses(
        uint256 teacherId,
        uint256 _assignedCourses
    ) public {
        teachers[teacherId].reallyAssignedCourses.push(_assignedCourses);
    }

    // 移除教师已分配课程
    function removeTeacherAssignedCourses(
        uint256 teacherId,
        uint256 _assignedCourses
    ) public {
        bool found = false;
        uint256 indexToRemove;

        // 遍历数组，找到课程 ID 的位置
        for (
            uint256 i = 0;
            i < teachers[teacherId].assignedCourses.length;
            i++
        ) {
            if (teachers[teacherId].assignedCourses[i] == _assignedCourses) {
                found = true;
                indexToRemove = i;
                break;
            }
        }

        // 如果找到了课程 ID
        if (found) {
            // 将要移除的课程位置的元素替换为数组中最后一个元素
            teachers[teacherId].assignedCourses[indexToRemove] = teachers[
                teacherId
            ].assignedCourses[teachers[teacherId].assignedCourses.length - 1];
            // 移除数组中的最后一个元素
            teachers[teacherId].assignedCourses.pop();
        } else {
            // 如果没有找到课程 ID，可以抛出一个错误或者进行其他处理
            revert("Course not found");
        }
    }

    // 移除教师已分配课程
    function removeTeacherReallyAssignedCourses(
        uint256 teacherId,
        uint256 _assignedCourses
    ) public {
        bool found = false;
        uint256 indexToRemove;

        // 遍历数组，找到课程 ID 的位置
        for (
            uint256 i = 0;
            i < teachers[teacherId].reallyAssignedCourses.length;
            i++
        ) {
            if (teachers[teacherId].reallyAssignedCourses[i] == _assignedCourses) {
                found = true;
                indexToRemove = i;
                break;
            }
        }

        // 如果找到了课程 ID
        if (found) {
            // 将要移除的课程位置的元素替换为数组中最后一个元素
            teachers[teacherId].reallyAssignedCourses[indexToRemove] = teachers[
                teacherId
            ].reallyAssignedCourses[teachers[teacherId].reallyAssignedCourses.length - 1];
            // 移除数组中的最后一个元素
            teachers[teacherId].reallyAssignedCourses.pop();
        } else {
            // 如果没有找到课程 ID，可以抛出一个错误或者进行其他处理
            revert("Course not found");
        }
    }

    // 设置教师适合程度权重
    function setTeacherSuitabilityWeight(
        uint256 teacherId,
        uint256 _suitabilityWeight
    ) public onlyTeacher {
        teachers[teacherId].suitabilityWeight = _suitabilityWeight;
    }

    // 设置教师换课币数量
    function setTeacherTransferCourseCoins(
        uint256 teacherId,
        uint256 _transferCourseCoins
    ) public onlyTeacher {
        teachers[teacherId].transferCourseCoins = _transferCourseCoins;
    }

    // 设置教师工资
    function setTeacherValue(
        uint256 teacherId,
        uint256 _value
    ) public onlyTeacher {
        teachers[teacherId].value = _value;
    }

    // 设置教师工资
    function setAgentValue(uint256 agentId, uint256 _value) public {
        agents[agentId].value = _value;
    }

    // 设置教师对所有课程的适合程度
    function setAllTeacherCourseSuitability(
        uint256 teacherId,
        uint256[] calldata _suitabilities
    ) public onlyTeacher {
        require(
            _suitabilities.length == courseIds.length,
            "When setting the suitability level of courses, it is necessary to have an equal number of courses"
        );
        for (
            uint256 courseIndex = 0;
            courseIndex < courseIds.length;
            courseIndex++
        ) {
            teachers[teacherId].courseSuitabilities[
                courseIds[courseIndex]
            ] = _suitabilities[courseIndex];
        }
    }

    // 设置教师对课程的适合程度
    function setTeacherCourseSuitability(
        uint256 teacherId,
        uint256 courseId,
        uint256 _suitability
    ) public {
        teachers[teacherId].courseSuitabilities[courseId] = _suitability;
    }

    // 设置教师对所有课程的偏好程度
    function setAllTeacherCoursePreferences(
        uint256 teacherId,
        uint256[] calldata _preferences
    ) public onlyTeacher {
        require(
            _preferences.length == courseIds.length,
            "When setting the preference level of courses, it is necessary to have an equal number of courses"
        );
        for (
            uint256 courseIndex = 0;
            courseIndex < courseIds.length;
            courseIndex++
        ) {
            teachers[teacherId].coursePreferences[
                courseIds[courseIndex]
            ] = _preferences[courseIndex];
        }
    }

    // 设置教师对课程的偏好程度
    function setTeacherCoursePreferences(
        uint256 teacherId,
        uint256 courseId,
        uint256 _preference
    ) public onlyTeacher {
        teachers[teacherId].coursePreferences[courseId] = _preference;
    }

    // 设置智能体ID
    function setAgentId(address agentAddress, uint256 _agentId) public {
        addressToAgentId[agentAddress] = _agentId;
        agents[_agentId].id = _agentId;
        agentIds.push(_agentId);
    }

    // 移除智能体
    function removeAgent(uint256 agentId) public {
        agents[agentId].id = 0;
        // 从 agentIds 数组中移除智能体 ID
        for (uint256 i = 0; i < agentIds.length; i++) {
            if (agentIds[i] == agentId) {
                // 将要移除的智能体 ID 位置的元素替换为数组中最后一个元素
                agentIds[i] = agentIds[agentIds.length - 1];
                // 移除数组中的最后一个元素
                agentIds.pop();
                break;
            }
        }
    }

    // 设置智能体姓名
    function setAgentName(uint256 agentId, string calldata _name) public {
        agents[agentId].name = _name;
    }

    // 设置智能体地址
    function setAgentAddress(uint256 agentId, address _agentAddress) public {
        agents[agentId].addr = _agentAddress;
    }

    // 添加智能体已分配课程
    function addAgentAssignedCourses(
        uint256 agentId,
        uint256 _assignedCourses
    ) public {
        agents[agentId].assignedCourses.push(_assignedCourses);
    }

    // 移除智能体已分配课程
    function removeAgentAssignedCourses(
        uint256 agentId,
        uint256 _assignedCourses
    ) public {
        bool found = false;
        uint256 indexToRemove;

        // 遍历数组，找到课程 ID 的位置
        for (uint256 i = 0; i < agents[agentId].assignedCourses.length; i++) {
            if (agents[agentId].assignedCourses[i] == _assignedCourses) {
                found = true;
                indexToRemove = i;
                break;
            }
        }

        // 如果找到了课程 ID
        if (found) {
            // 将要移除的课程位置的元素替换为数组中最后一个元素
            agents[agentId].assignedCourses[indexToRemove] = agents[agentId]
                .assignedCourses[agents[agentId].assignedCourses.length - 1];
            // 移除数组中的最后一个元素
            agents[agentId].assignedCourses.pop();
        } else {
            // 如果没有找到课程 ID，可以抛出一个错误或者进行其他处理
            revert("Course not found");
        }
    }

    // 设置智能体对课程的适合程度
    function setAgentCourseSuitability(
        uint256 agentId,
        uint256 _courseId,
        uint256 _suitability
    ) public {
        agents[agentId].courseSuitabilities[_courseId] = _suitability;
    }

    // 设置智能体对课程的适合程度
    function setAllAgentCourseSuitability(
        uint256 agentId,
        uint256[] calldata _suitabilities
    ) public {
        require(
            _suitabilities.length == courseIds.length,
            "When setting the suitability level of courses, it is necessary to have an equal number of courses"
        );
        for (
            uint256 courseIndex = 0;
            courseIndex < courseIds.length;
            courseIndex++
        ) {
            agents[agentId].courseSuitabilities[
                courseIds[courseIndex]
            ] = _suitabilities[courseIndex];
        }
    }

    // 设置班级ID
    function setClassId(address classAddress, uint256 _id) public {
        addressToClassId[classAddress] = _id;
        classIds.push(_id);
    }

    // 移除班级
    function removeClass(uint256 classId) public {
        // 从 classIds 数组中移除智能体 ID
        for (uint256 i = 0; i < classIds.length; i++) {
            if (classIds[i] == classId) {
                // 将要移除的班级 ID 位置的元素替换为数组中最后一个元素
                classIds[i] = classIds[classIds.length - 1];
                // 移除数组中的最后一个元素
                classIds.pop();
                break;
            }
        }
    }

    // 设置课程ID
    function setCourseId(uint256 courseId) public {
        courses[courseId].id = courseId;
        courseIds.push(courseId);
    }

    // 移除课程
    function removeCourse(uint256 courseId) public {
        // 从 classIds 数组中移除智能体 ID
        for (uint256 i = 0; i < courseIds.length; i++) {
            if (courseIds[i] == courseId) {
                // 将要移除的班级 ID 位置的元素替换为数组中最后一个元素
                courseIds[i] = courseIds[courseIds.length - 1];
                // 移除数组中的最后一个元素
                courseIds.pop();
                break;
            }
        }
    }

    // 设置课程名称
    function setCourseName(uint256 courseId, string calldata _name) public {
        courses[courseId].name = _name;
    }

    // 设置课程重要性
    function setCourseImportance(uint256 courseId, uint256 _importance) public {
        courses[courseId].importance = _importance;
    }

    // 管理员设置课程重要程度
    function setAllCourseImportance(uint256[] memory _importances) public {
        require(
            _importances.length == courseIds.length,
            "must update all course suitability"
        );
        // 更新课程适合度
        for (
            uint256 courseIndex = 0;
            courseIndex < courseIds.length;
            courseIndex++
        ) {
            courses[courseIds[courseIndex]].importance = _importances[
                courseIndex
            ];
        }
    }

    // 添加课程分配的教师ID
    function addCourseAssignedTeacherId(
        uint256 courseId,
        uint256 _teacherId
    ) public {
        courses[courseId].assignedTeacherId.push(_teacherId);
    }

    // 添加课程分配的智能体ID
    function addCourseAssignedAgentId(
        uint256 courseId,
        uint256 _agentId
    ) public {
        courses[courseId].assignedAgentId.push(_agentId);
    }

    // 移除课程已分配的老师
    function removeCourseAssignedTeacherId(
        uint256 courseId,
        uint256 _teacherId
    ) public {
        bool found = false;
        uint256 indexToRemove;

        // 遍历数组，找到课程 ID 的位置
        for (
            uint256 i = 0;
            i < courses[courseId].assignedTeacherId.length;
            i++
        ) {
            if (courses[courseId].assignedTeacherId[i] == _teacherId) {
                found = true;
                indexToRemove = i;
                break;
            }
        }

        // 如果找到了课程 ID
        if (found) {
            // 将要移除的课程位置的元素替换为数组中最后一个元素
            courses[courseId].assignedTeacherId[indexToRemove] = courses[
                courseId
            ].assignedTeacherId[courses[courseId].assignedTeacherId.length - 1];
            // 移除数组中的最后一个元素
            courses[courseId].assignedTeacherId.pop();
        } else {
            // 如果没有找到课程 ID，可以抛出一个错误或者进行其他处理
            revert("Course not found");
        }
    }

    // 移除课程已分配的智能体
    function removeCourseAssignedAgentId(
        uint256 courseId,
        uint256 _agentId
    ) public {
        bool found = false;
        uint256 indexToRemove;

        // 遍历数组，找到课程 ID 的位置
        for (uint256 i = 0; i < courses[courseId].assignedAgentId.length; i++) {
            if (courses[courseId].assignedAgentId[i] == _agentId) {
                found = true;
                indexToRemove = i;
                break;
            }
        }

        // 如果找到了课程 ID
        if (found) {
            // 将要移除的课程位置的元素替换为数组中最后一个元素
            courses[courseId].assignedAgentId[indexToRemove] = courses[courseId]
                .assignedAgentId[courses[courseId].assignedAgentId.length - 1];
            // 移除数组中的最后一个元素
            courses[courseId].assignedAgentId.pop();
        } else {
            // 如果没有找到课程 ID，可以抛出一个错误或者进行其他处理
            revert("Course not found");
        }
    }

    // 设置课程是否适合智能体
    function setCourseIsAgentSuitable(
        uint256 courseId,
        bool _isAgentSuitable
    ) public {
        courses[courseId].isAgentSuitable = _isAgentSuitable;
    }

    // 设置教师计数器
    function setTeacherCount(uint256 _teacherCount) public {
        teacherCount = _teacherCount;
    }

    // 设置智能体计数器
    function setAgentCount(uint256 _agentCount) public {
        agentCount = _agentCount;
    }

    // 设置班级计数器
    function setClassCount(uint256 _classCount) public {
        classCount = _classCount;
    }

    // 设置课程计数器
    function setCourseCount(uint256 _courseCount) public {
        courseCount = _courseCount;
    }

    // 获取教师对课程的适合程度
    function getTeacherSuitability(
        uint256 _teacherId,
        uint256 courseId
    ) public view returns (uint256) {
        return teachers[_teacherId].courseSuitabilities[courseId];
    }

    // 获取智能体对课程的适合程度
    function getAgentSuitability(
        uint256 _agentId,
        uint256 courseId
    ) public view returns (uint256) {
        return agents[_agentId].courseSuitabilities[courseId];
    }

    // 获取教师对课程的偏好程度
    function getPreference(
        uint256 _teacherId,
        uint256 courseId
    ) public view returns (uint256) {
        return teachers[_teacherId].coursePreferences[courseId];
    }

    // 获取老师分配的课程
    function getTeacherAssignedCourses(
        uint256 _teacherId
    ) public view returns (uint256[] memory) {
        return teachers[_teacherId].assignedCourses;
    }

    // 获取老师真正分配的课程
    function getTeacherReallyAssignedCourses(
        uint256 _teacherId
    ) public view returns (uint256[] memory) {
        return teachers[_teacherId].reallyAssignedCourses;
    }

    // 获取智能体分配的课程
    function getAgentAssignedCourses(
        uint256 _agentId
    ) public view returns (uint256[] memory) {
        return agents[_agentId].assignedCourses;
    }

    // 获取课程被分配给的老师
    function getCoursesAssignedTeacher(
        uint256 _courseId
    ) public view returns (uint256[] memory) {
        return courses[_courseId].assignedTeacherId;
    }

    // 获取课程被分配给的智能体
    function getCoursesAssignedAgent(
        uint256 _courseId
    ) public view returns (uint256[] memory) {
        return courses[_courseId].assignedAgentId;
    }

    function getTeacherIds() public view returns (uint256[] memory) {
        return teacherIds;
    }

    function getAgentIds() public view returns (uint256[] memory) {
        return agentIds;
    }

    function getCourseIds() public view returns (uint256[] memory) {
        return courseIds;
    }

    function getClassIds() public view returns (uint256[] memory) {
        return classIds;
    }
}
