// 智能体分配完全部课程 且 区分了两种分数计算方式
await contract.setAllTeacherCourseSuitability(1, [26,44,65,88,40,37,79,92,14,87]);
await contract.setAllTeacherCoursePreferences(1, [35,54,76,80,93,48,64,17,86,70]);

await contract.setAllTeacherCourseSuitability(2, [51,32,53,34,85,26,37,48,55,43]);
await contract.setAllTeacherCoursePreferences(2, [35,74,17,95,57,23,88,46,64,60]);

await contract.setAllTeacherCourseSuitability(3, [32,31,54,43,68,27,44,72,58,30]);
await contract.setAllTeacherCoursePreferences(3, [51,32,83,14,95,76,27,70,45,67]);

await contract.setAllTeacherCourseSuitability(4, [43,24,35,36,67,18,39,80,61,33]);
await contract.setAllTeacherCoursePreferences(4, [22,63,44,85,66,87,38,79,57,60]);

await contract.setAllTeacherCourseSuitability(5, [22,43,44,35,100,37,31,32,33,34]);
await contract.setAllTeacherCoursePreferences(5, [43,14,75,35,46,67,28,59,59,79]);


await contract.setAllAgentCourseSuitability(1, [75,99,72,91,88,73,70,76,86,100]);
await contract.setAllAgentCourseSuitability(2, [86,98,93,90,87,94,91,97,88,99]);

// 老师都拥有全部课程
await contract.setAllTeacherCourseSuitability(1, [60,72,82,94,70,68,89,96,57,93]);
await contract.setAllTeacherCoursePreferences(1, [95,84,76,60,93,78,64,60,86,70]);

await contract.setAllTeacherCourseSuitability(2, [71,62,73,64,85,66,77,88,95,73]);
await contract.setAllTeacherCoursePreferences(2, [65,74,77,95,67,63,88,66,64,60]);

await contract.setAllTeacherCourseSuitability(3, [62,61,74,73,68,77,64,72,58,70]);
await contract.setAllTeacherCoursePreferences(3, [61,72,83,64,95,76,77,70,75,67]);

await contract.setAllTeacherCourseSuitability(4, [73,64,65,66,97,68,79,80,81,63]);
await contract.setAllTeacherCoursePreferences(4, [82,63,64,85,66,87,78,79,87,60]);

await contract.setAllTeacherCourseSuitability(5, [62,83,84,75,100,77,71,72,73,74]);
await contract.setAllTeacherCoursePreferences(5, [73,64,75,75,76,67,68,59,59,79]);


await contract.setAllAgentCourseSuitability(1, [75,79,72,51,68,63,70,76,66,50]);
await contract.setAllAgentCourseSuitability(2, [66,48,53,50,57,54,51,57,58,59]);
