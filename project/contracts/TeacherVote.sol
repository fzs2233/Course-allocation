// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./Vote.sol";
import "./CourseAllocation.sol";

contract TeacherVote is Vote {
    CourseAllocation public courseAllocation;

    constructor(address _courseAllocationAddress) {
        courseAllocation = CourseAllocation(_courseAllocationAddress);
    }

    // 课程评分提案结构
    struct CourseRatingProposal {
        uint256 courseId;
        uint256 totalRating;
        uint256 raterCount;
        bool isAgentSuitable;
        uint256 proposalId;
        bool executed;
        mapping(uint256 => uint256) teacherRatings;
    }

    mapping(uint256 => CourseRatingProposal) public proposals;
    uint256 public proposalCount;

    event NewRatingProposal(
        uint256 indexed proposalId,
        uint256 indexed courseId
    );
    event ProposalExecuted(
        uint256 indexed proposalId,
        uint256 avgImportance,
        bool isAgentSuitable
    );

    modifier onlyTeacher() {
        require(
            courseAllocation.addressToTeacherId(msg.sender) != 0,
            "Only teachers can call this"
        );
        _;
    }

    // 创建新课程评分提案（关键修改点）
    function createRatingProposal(
        uint256 courseId,
        bool proposedAgentSuitable
    ) external onlyTeacher returns (uint256) {
        require(
            courseAllocation.addressToTeacherId(msg.sender) != 0,
            "Invalid course"
        );

        // 手动创建二元选择选项 [1=反对, 2=赞成]
        uint256[] memory suitabilityOptions = new uint256[](2);
        suitabilityOptions[0] = 1; // 选项1表示反对
        suitabilityOptions[1] = 2; // 选项2表示赞成

        // 创建适合性投票提案（显式传递选项）
        uint256 suitabilityProposalId = createChooseTeacherProposal(
            string(abi.encodePacked("Agent Suitability for Course ", courseId)),
            courseId,
            suitabilityOptions,
            0 // 特殊标记表示需要全体老师投票
        );

        proposalCount++;
        CourseRatingProposal storage p = proposals[proposalCount];
        p.courseId = courseId;
        p.isAgentSuitable = proposedAgentSuitable;
        p.proposalId = suitabilityProposalId;

        emit NewRatingProposal(proposalCount, courseId);
        return proposalCount;
    }

    // 提交评分（保持不变）
    function submitRating(
        uint256 proposalId,
        uint256 rating
    ) external onlyTeacher {
        CourseRatingProposal storage p = proposals[proposalId];
        require(p.courseId != 0, "Invalid proposal");
        require(rating >= 1 && rating <= 10, "Rating 1-10 only");

        uint256 teacherId = courseAllocation.addressToTeacherId(msg.sender);
        require(p.teacherRatings[teacherId] == 0, "Already rated");

        p.teacherRatings[teacherId] = rating;
        p.totalRating += rating;
        p.raterCount++;
    }

    // 执行提案（修改结果判断逻辑）
    function executeProposal(uint256 proposalId) external {
        CourseRatingProposal storage p = proposals[proposalId];
        require(!p.executed, "Already executed");
        require(p.raterCount > 0, "No ratings submitted");

        // 1. 计算平均重要性
        uint256 avgImportance = p.totalRating / p.raterCount;

        // 2. 处理适合性投票结果（选项2表示赞成）
        (uint256 result, ) = endVoteChooseTeacher(p.proposalId);
        bool finalSuitability = result == 2; // 只有选项2被视作赞成

        // 3. 更新课程属性
        courseAllocation.setCourseProperties(
            p.courseId,
            avgImportance,
            finalSuitability
        );

        p.executed = true;
        emit ProposalExecuted(proposalId, avgImportance, finalSuitability);
    }

    // 获取评分（保持不变）
    function getTeacherRating(
        uint256 proposalId,
        uint256 teacherId
    ) public view returns (uint256) {
        return proposals[proposalId].teacherRatings[teacherId];
    }
}
