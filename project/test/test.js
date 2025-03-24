const instance = await teachingSchedule.deployed()
instance.addTeacher(0, "t1", "0x1EE2795f42BD4CD585DF085Bd307738ADe8A4Ed8")
instance.addTeacher(0, "t2", "0xECAe3e72a037485B6CC9c457DAC623CEC627BDae")
instance.addTeacher(0, "t3", "0xEEc343857BbC1A64e992A8F7598E052847E7c51E")
instance.addTeacher(0, "t4", "0x4df87dA02B219266f345AEa1eCF14b5B99C08ebC")
instance.addTeacher(0, "t5", "0x99A773F8492ED8C8103E98690CD949d9ab569Da2")
instance.addTeacher(1, "t6", "0x90f656c0058162C7548ac9b658Bf66d7B12d71de")
instance.addTeacher(1, "t7", "0x1189BD694ddF44D9B90D99FdcD21f2d5AB3D7C41")

instance.addCourse("c1")
instance.addCourse("c2")
instance.addCourse("c3")
instance.addCourse("c4")
instance.addCourse("c5")
instance.addCourse("c6")
instance.addCourse("c7")
instance.addCourse("c8")
instance.addCourse("c9")
instance.addCourse("c10")

instance.getCourseCount().then( count => {console.log(count.toString())})
instance.getAllCourses().then(([courseIds, courseNames]) => {console.log(courseIds); console.log(courseNames);});
instance.getAllCourses().then(result => { console.log(result[0]);console.log(result[1]);});

// 设置教师对课程的适合程度
// 教师1 (0x1EE2795f42BD4CD585DF085Bd307738ADe8A4Ed8)
instance.suitablityToTeacher(1, "0x1EE2795f42BD4CD585DF085Bd307738ADe8A4Ed8", 7);
instance.suitablityToTeacher(2, "0x1EE2795f42BD4CD585DF085Bd307738ADe8A4Ed8", 8);
instance.suitablityToTeacher(3, "0x1EE2795f42BD4CD585DF085Bd307738ADe8A4Ed8", 6);
instance.suitablityToTeacher(4, "0x1EE2795f42BD4CD585DF085Bd307738ADe8A4Ed8", 5);
instance.suitablityToTeacher(5, "0x1EE2795f42BD4CD585DF085Bd307738ADe8A4Ed8", 9);
instance.suitablityToTeacher(6, "0x1EE2795f42BD4CD585DF085Bd307738ADe8A4Ed8", 10);
instance.suitablityToTeacher(7, "0x1EE2795f42BD4CD585DF085Bd307738ADe8A4Ed8", 9);
instance.suitablityToTeacher(8, "0x1EE2795f42BD4CD585DF085Bd307738ADe8A4Ed8", 8);
instance.suitablityToTeacher(9, "0x1EE2795f42BD4CD585DF085Bd307738ADe8A4Ed8", 7);
instance.suitablityToTeacher(10, "0x1EE2795f42BD4CD585DF085Bd307738ADe8A4Ed8", 6);

// 教师2 (0xECAe3e72a037485B6CC9c457DAC623CEC627BDae)
instance.suitablityToTeacher(1, "0xECAe3e72a037485B6CC9c457DAC623CEC627BDae", 6);
instance.suitablityToTeacher(2, "0xECAe3e72a037485B6CC9c457DAC623CEC627BDae", 7);
instance.suitablityToTeacher(3, "0xECAe3e72a037485B6CC9c457DAC623CEC627BDae", 8);
instance.suitablityToTeacher(4, "0xECAe3e72a037485B6CC9c457DAC623CEC627BDae", 9);
instance.suitablityToTeacher(5, "0xECAe3e72a037485B6CC9c457DAC623CEC627BDae", 10);
instance.suitablityToTeacher(6, "0xECAe3e72a037485B6CC9c457DAC623CEC627BDae", 5);
instance.suitablityToTeacher(7, "0xECAe3e72a037485B6CC9c457DAC623CEC627BDae", 4);
instance.suitablityToTeacher(8, "0xECAe3e72a037485B6CC9c457DAC623CEC627BDae", 3);
instance.suitablityToTeacher(9, "0xECAe3e72a037485B6CC9c457DAC623CEC627BDae", 2);
instance.suitablityToTeacher(10, "0xECAe3e72a037485B6CC9c457DAC623CEC627BDae", 1);

// 教师3 (0xEEc343857BbC1A64e992A8F7598E052847E7c51E)
instance.suitablityToTeacher(1, "0xEEc343857BbC1A64e992A8F7598E052847E7c51E", 5);
instance.suitablityToTeacher(2, "0xEEc343857BbC1A64e992A8F7598E052847E7c51E", 4);
instance.suitablityToTeacher(3, "0xEEc343857BbC1A64e992A8F7598E052847E7c51E", 3);
instance.suitablityToTeacher(4, "0xEEc343857BbC1A64e992A8F7598E052847E7c51E", 2);
instance.suitablityToTeacher(5, "0xEEc343857BbC1A64e992A8F7598E052847E7c51E", 1);
instance.suitablityToTeacher(6, "0xEEc343857BbC1A64e992A8F7598E052847E7c51E", 10);
instance.suitablityToTeacher(7, "0xEEc343857BbC1A64e992A8F7598E052847E7c51E", 9);
instance.suitablityToTeacher(8, "0xEEc343857BbC1A64e992A8F7598E052847E7c51E", 8);
instance.suitablityToTeacher(9, "0xEEc343857BbC1A64e992A8F7598E052847E7c51E", 7);
instance.suitablityToTeacher(10, "0xEEc343857BbC1A64e992A8F7598E052847E7c51E", 6);

// 教师4 (0x4df87dA02B219266f345AEa1eCF14b5B99C08ebC)
instance.suitablityToTeacher(1, "0x4df87dA02B219266f345AEa1eCF14b5B99C08ebC", 4);
instance.suitablityToTeacher(2, "0x4df87dA02B219266f345AEa1eCF14b5B99C08ebC", 5);
instance.suitablityToTeacher(3, "0x4df87dA02B219266f345AEa1eCF14b5B99C08ebC", 7);
instance.suitablityToTeacher(4, "0x4df87dA02B219266f345AEa1eCF14b5B99C08ebC", 8);
instance.suitablityToTeacher(5, "0x4df87dA02B219266f345AEa1eCF14b5B99C08ebC", 6);
instance.suitablityToTeacher(6, "0x4df87dA02B219266f345AEa1eCF14b5B99C08ebC", 9);
instance.suitablityToTeacher(7, "0x4df87dA02B219266f345AEa1eCF14b5B99C08ebC", 10);
instance.suitablityToTeacher(8, "0x4df87dA02B219266f345AEa1eCF14b5B99C08ebC", 3);
instance.suitablityToTeacher(9, "0x4df87dA02B219266f345AEa1eCF14b5B99C08ebC", 2);
instance.suitablityToTeacher(10, "0x4df87dA02B219266f345AEa1eCF14b5B99C08ebC", 1);

// 教师5 (0x99A773F8492ED8C8103E98690CD949d9ab569Da2)
instance.suitablityToTeacher(1, "0x99A773F8492ED8C8103E98690CD949d9ab569Da2", 3);
instance.suitablityToTeacher(2, "0x99A773F8492ED8C8103E98690CD949d9ab569Da2", 2);
instance.suitablityToTeacher(3, "0x99A773F8492ED8C8103E98690CD949d9ab569Da2", 1);
instance.suitablityToTeacher(4, "0x99A773F8492ED8C8103E98690CD949d9ab569Da2", 10);
instance.suitablityToTeacher(5, "0x99A773F8492ED8C8103E98690CD949d9ab569Da2", 9);
instance.suitablityToTeacher(6, "0x99A773F8492ED8C8103E98690CD949d9ab569Da2", 8);
instance.suitablityToTeacher(7, "0x99A773F8492ED8C8103E98690CD949d9ab569Da2", 7);
instance.suitablityToTeacher(8, "0x99A773F8492ED8C8103E98690CD949d9ab569Da2", 6);
instance.suitablityToTeacher(9, "0x99A773F8492ED8C8103E98690CD949d9ab569Da2", 5);
instance.suitablityToTeacher(10, "0x99A773F8492ED8C8103E98690CD949d9ab569Da2", 4);

// 智能体1 (0x90f656c0058162C7548ac9b658Bf66d7B12d71de)
instance.suitablityToTeacher(1, "0x90f656c0058162C7548ac9b658Bf66d7B12d71de", 10);
instance.suitablityToTeacher(2, "0x90f656c0058162C7548ac9b658Bf66d7B12d71de", 9);
instance.suitablityToTeacher(3, "0x90f656c0058162C7548ac9b658Bf66d7B12d71de", 8);
instance.suitablityToTeacher(4, "0x90f656c0058162C7548ac9b658Bf66d7B12d71de", 1);
instance.suitablityToTeacher(5, "0x90f656c0058162C7548ac9b658Bf66d7B12d71de", 2);
instance.suitablityToTeacher(6, "0x90f656c0058162C7548ac9b658Bf66d7B12d71de", 3);
instance.suitablityToTeacher(7, "0x90f656c0058162C7548ac9b658Bf66d7B12d71de", 4);
instance.suitablityToTeacher(8, "0x90f656c0058162C7548ac9b658Bf66d7B12d71de", 5);
instance.suitablityToTeacher(9, "0x90f656c0058162C7548ac9b658Bf66d7B12d71de", 6);
instance.suitablityToTeacher(10, "0x90f656c0058162C7548ac9b658Bf66d7B12d71de", 7);

// 智能体2 (0x1189BD694ddF44D9B90D99FdcD21f2d5AB3D7C41)
instance.suitablityToTeacher(1, "0x1189BD694ddF44D9B90D99FdcD21f2d5AB3D7C41", 9);  // 适合智能体的课程
instance.suitablityToTeacher(2, "0x1189BD694ddF44D9B90D99FdcD21f2d5AB3D7C41", 10); // 适合智能体的课程
instance.suitablityToTeacher(3, "0x1189BD694ddF44D9B90D99FdcD21f2d5AB3D7C41", 8);  // 适合智能体的课程
instance.suitablityToTeacher(4, "0x1189BD694ddF44D9B90D99FdcD21f2d5AB3D7C41", 2);  // 不太适合
instance.suitablityToTeacher(5, "0x1189BD694ddF44D9B90D99FdcD21f2d5AB3D7C41", 1);  // 不太适合
instance.suitablityToTeacher(6, "0x1189BD694ddF44D9B90D99FdcD21f2d5AB3D7C41", 3);  // 不太适合
instance.suitablityToTeacher(7, "0x1189BD694ddF44D9B90D99FdcD21f2d5AB3D7C41", 4);  // 不太适合
instance.suitablityToTeacher(8, "0x1189BD694ddF44D9B90D99FdcD21f2d5AB3D7C41", 5);  // 不太适合
instance.suitablityToTeacher(9, "0x1189BD694ddF44D9B90D99FdcD21f2d5AB3D7C41", 6);  // 不太适合
instance.suitablityToTeacher(10, "0x1189BD694ddF44D9B90D99FdcD21f2d5AB3D7C41", 7); // 不太适合

instance.allocateCourse(1)
instance.allocateCourse(2)
instance.allocateCourse(3)
instance.allocateCourse(4)
instance.allocateCourse(5)
instance.allocateCourse(6)
instance.allocateCourse(7)
instance.allocateCourse(8)
instance.allocateCourse(9)
instance.allocateCourse(10)

instance.getAssignedCourses("0x1EE2795f42BD4CD585DF085Bd307738ADe8A4Ed8")
instance.getAssignedCourses("0xECAe3e72a037485B6CC9c457DAC623CEC627BDae")
instance.getAssignedCourses("0xEEc343857BbC1A64e992A8F7598E052847E7c51E")
instance.getAssignedCourses("0x4df87dA02B219266f345AEa1eCF14b5B99C08ebC")
instance.getAssignedCourses("0x99A773F8492ED8C8103E98690CD949d9ab569Da2")
instance.getAssignedCourses("0x90f656c0058162C7548ac9b658Bf66d7B12d71de")
instance.getAssignedCourses("0x1189BD694ddF44D9B90D99FdcD21f2d5AB3D7C41")
