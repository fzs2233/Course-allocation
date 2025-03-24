// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface IVote {
    // 核心功能接口
    function registerVoter(address _voter) external; // 注册投票者
    function createChooseTeacherProposal(string memory _description, uint256 _voteforID, uint256[] memory _votedIds,uint256 _totalVote) external returns (uint256); // 创建提案
    function createMachineVoteProposal(string memory _description, uint256 _voteforID, uint256[] memory _votedIds, uint256[] memory _votedCounts) external returns (uint256); // 创建提案
    function createChooseCourseProposal(string memory _description, uint256 _voteforID, uint256[] memory _votedIds,uint256 _totalVote) external returns (uint256); // 创建提案
    function voteChooseTeacher(address voter, uint256 _proposalId, uint256 _voteId) external; // 投票
    function voteChooseCourse(address voter, uint256 _proposalId, uint256 _voteId) external; // 投票
    function endVoteChooseTeacher(uint256 _proposalId) external view returns (uint256, uint256); // 结束投票
    function endVoteChooseCourse(uint256 _proposalId) external view returns (uint256, uint256); // 结束投票
    
    // 查询接口
    function getVotedIds(uint256 _proposalId) external view returns (uint256[] memory, uint256); // 获取某个提案被投票的选项的ids
    function getVoteIdToCount(uint256 _proposalId, uint256 _voteId) external view returns (uint256); // 获取某个提案某个选项的票数
}
