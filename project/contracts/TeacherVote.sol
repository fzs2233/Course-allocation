// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./Vote.sol";
import "./ICourseAllocation.sol";

contract TeacherVote is Vote {
    ICourseAllocation public courseAllocation;

    // // 映射：存储每个教师、每个智能体、每门课程的适合度评分
    // mapping(uint256 => mapping(uint256 => mapping(uint256 => uint256))) public teacherAgentSuitability;

    // 新增本地选项存储
    mapping(uint256 => uint256[]) private _proposalOptions; //存储每个提案的投票选项

    struct ProposalBase {
        uint256 courseId; //由于父合约用到，所以保留
        uint256 suitabilityProposalId;
        bool executed;
        uint256 agreeCount;
        uint256 disagreeCount;
    }

    mapping(uint256 => ProposalBase) public proposals;
    mapping(uint256 => mapping(address => bool)) public suitabilityVotes;
    // mapping(uint256 => mapping(uint256 => uint256[])) public teacherScores;        // 暂存老师评分的数组

    uint256 public proposalCount;

    event NewCombinedProposal(
        uint256 indexed proposalId,
        uint256 indexed courseId,
        uint256 suitabilityProposalId
    );
    event ProposalExecuted(uint256 indexed proposalId, string Choice);

    modifier onlyTeacher() {
        require(
            courseAllocation.addressToTeacherId(msg.sender) != 0,
            "Only teachers can call this"
        );
        _;
    }

    constructor(address _courseAllocationAddress) Vote() {
        courseAllocation = ICourseAllocation(_courseAllocationAddress);
    }

    function setCourseAllocation(address _addr) external {
        courseAllocation = ICourseAllocation(_addr);
    }

    function createCombinedProposal(
        uint256 courseId
    ) external onlyTeacher returns (uint256) {
        // 定义投票选项值
        uint256[] memory options = new uint256[](2);
        options[0] = 1; // 反对选项值
        options[1] = 2; // 赞成选项值

        // 调用父合约创建提案
        uint256 suitabilityProposalId = createChooseTeacherProposal(
            string(abi.encodePacked("Course ", courseId)),
            courseId,
            options,
            type(uint256).max
        );

        // 存储选项到本地映射
        _proposalOptions[suitabilityProposalId] = options;

        // 初始化合并提案
        proposalCount++;
        proposals[proposalCount] = ProposalBase({
            courseId: courseId,
            suitabilityProposalId: suitabilityProposalId,
            executed: false,
            agreeCount: 0,
            disagreeCount: 0
        });

        emit NewCombinedProposal(
            proposalCount,
            courseId,
            suitabilityProposalId
        );
        return proposalCount;
    }

    function submitCombinedVote(
        uint256 proposalId,
        uint256 suitabilityOptionIndex
    ) external onlyTeacher {
        ProposalBase storage p = proposals[proposalId];
        require(p.courseId != 0, "Invalid proposal");
        require(!p.executed, "Proposal executed");

        // 验证教师身份
        uint256 teacherId = courseAllocation.addressToTeacherId(msg.sender);
        require(teacherId != 0, "Unregistered teacher");

        // 处理投票逻辑
        require(suitabilityOptionIndex < 2, "Invalid option index (0-1)");
        require(!suitabilityVotes[proposalId][msg.sender], "Already voted");

        if (suitabilityOptionIndex == 1) {
            p.agreeCount++;
        } else {
            p.disagreeCount++;
        }
        suitabilityVotes[proposalId][msg.sender] = true;

        // 从本地存储获取选项值
        uint256 optionValue = _proposalOptions[p.suitabilityProposalId][
            suitabilityOptionIndex
        ];

        // 调用父合约投票
        super.voteChooseTeacher(
            msg.sender,
            p.suitabilityProposalId,
            optionValue
        );
    }

    // // 函数：允许某个老师为某个智能体的所有课程设置适合度评分
    // function setTeacherSuitabilityForAllCourses(
    //     uint256 _teacherId,
    //     uint256 _agentId,
    //     uint256[] memory _courseIds,  // 多门课程的 ID 数组
    //     uint256[] memory _suitabilities  // 每门课程的适合度评分数组
    // ) public {
    //     require(_courseIds.length == _suitabilities.length, unicode"课程和适合度评分数组长度不匹配");

    //     // 存储每个教师的评分
    //     for (uint256 i = 0; i < _courseIds.length; i++) {
    //         uint256 suitability = _suitabilities[i];

    //         // 确保适合度评分在0到100之间
    //         require(suitability >= 0 && suitability <= 100, unicode"适合度评分无效");

    //         // 将评分存储在 teacherScores 中
    //         teacherScores[_teacherId][_agentId].push(suitability);
    //     }
    // }

    // // 函数：计算五个老师对智能体所有课程的平均适合度评分并保存
    // function saveAverageSuitability(uint256 _agentId, uint256[] memory _courseIds) public {
    //     uint256 numTeachers = 5;  // 假设五个老师为智能体评分
    //     uint256[] memory averageSuitabilities = new uint256[](_courseIds.length);

    //     // 计算每门课程的平均适合度评分
    //     for (uint256 j = 0; j < _courseIds.length; j++) {
    //         uint256 totalSuitability = 0;

    //         for (uint256 teacherId = 0; teacherId < numTeachers; teacherId++) {
    //             uint256[] memory scores = teacherScores[teacherId][_agentId];
    //             totalSuitability += scores[j];  // 累加每个老师对课程的评分
    //         }

    //         // 计算平均适合度评分
    //         uint256 averageSuitability = totalSuitability / numTeachers;
    //         averageSuitabilities[j] = averageSuitability;
    //     }

    //     // 使用 setAllAgentCourseSuitability 函数保存适合度评分
    //     courseAllocation.setAllAgentCourseSuitability(_agentId, averageSuitabilities);
    // }

    function executeProposal(uint256 proposalId) external {
        ProposalBase storage p = proposals[proposalId];
        require(p.courseId != 0, "Invalid proposal");
        require(!p.executed, "Already executed");

        // 获取投票结果
        (uint256 winningOption, ) = endVote(p.suitabilityProposalId);

        string memory Choice;
        if (winningOption == 2) {
            Choice = "Cost-effectiveness";
        } else Choice = "Suitability&Preference";

        // 更新课程状态
        courseAllocation.setScoreType(Choice);

        p.executed = true;
        emit ProposalExecuted(proposalId, Choice);
    }

    function endVote(
        uint256 _proposalId
    ) public view returns (uint256, uint256) {
        ProposalBase storage p = proposals[_proposalId];

        // 计算最终的投票选项：如果同意投票数大于反对投票数，选择 "适合"
        uint256 winningOption = (p.agreeCount > p.disagreeCount) ? 2 : 1; // 2 代表适合，1 代表不适合  1性价比 2suit preference
        return (winningOption, p.agreeCount + p.disagreeCount); // 返回选项和总票数
    }

    function getVoteDetails(
        uint256 proposalId
    ) external view returns (uint256 agree, uint256 disagree, uint256 total) {
        ProposalBase memory p = proposals[proposalId];
        return (p.agreeCount, p.disagreeCount, p.agreeCount + p.disagreeCount);
    }
}
