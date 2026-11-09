/**
 * 测试脚本
 * 所有测试用例按阶段组织
 */
const Tests = (function() {

    let results = {};
    let totalPass = 0;
    let totalFail = 0;

    /**
     * 断言相等
     */
    function assertEqual(actual, expected, message) {
        if (actual === expected) {
            return { pass: true };
        }
        return { pass: false, message: message || `期望 ${expected}，实际 ${actual}` };
    }

    /**
     * 断言为真
     */
    function assertTrue(value, message) {
        if (value) return { pass: true };
        return { pass: false, message: message || '期望为真' };
    }

    /**
     * 断言数组包含
     */
    function assertContains(arr, item, message) {
        if (arr.includes(item)) return { pass: true };
        return { pass: false, message: message || `数组不包含 ${item}` };
    }

    /**
     * 运行单个测试用例
     */
    async function runTestCase(name, fn) {
        try {
            await fn();
            return { name, pass: true };
        } catch (e) {
            return { name, pass: false, error: e.message };
        }
    }

    /**
     * 运行一个阶段的测试
     */
    async function runPhase(phaseName, testCases) {
        const phaseResults = [];
        for (const [name, fn] of Object.entries(testCases)) {
            const result = await runTestCase(name, fn);
            phaseResults.push(result);
            if (result.pass) totalPass++;
            else totalFail++;
        }
        results[phaseName] = phaseResults;
        renderResults();
        return phaseResults;
    }

    /**
     * 渲染结果
     */
    function renderResults() {
        const container = document.getElementById('results');
        const summary = document.getElementById('summary');

        let html = '';
        for (const [phaseName, phaseResults] of Object.entries(results)) {
            const passCount = phaseResults.filter(r => r.pass).length;
            const failCount = phaseResults.filter(r => !r.pass).length;

            html += `
                <div class="test-result">
                    <div class="test-phase">${phaseName} (${passCount}/${phaseResults.length} 通过)</div>
                    ${phaseResults.map(r => `
                        <div class="test-case ${r.pass ? 'pass' : 'fail'}">
                            <span class="status">${r.pass ? '✓ 通过' : '✗ 失败'}</span>
                            <span>${r.name}</span>
                        </div>
                        ${r.error ? `<div class="test-error">${r.error}</div>` : ''}
                    `).join('')}
                </div>
            `;
        }

        container.innerHTML = html;

        const total = totalPass + totalFail;
        if (total === 0) {
            summary.className = 'test-summary';
            summary.textContent = '点击"运行所有测试"开始';
        } else if (totalFail === 0) {
            summary.className = 'test-summary all-pass';
            summary.textContent = `🎉 全部通过！${totalPass}/${total} 个测试通过`;
        } else {
            summary.className = 'test-summary has-fail';
            summary.textContent = `⚠️ 有失败用例：${totalPass} 通过，${totalFail} 失败，共 ${total} 个`;
        }
    }

    // ========== 阶段1：基础框架测试 ==========
    const phase1Tests = {
        'DB 初始化成功': async () => {
            await DB.init();
            assertTrue(DB.STORES, 'DB 对象应包含 STORES');
        },

        'DB 有所有存储定义': async () => {
            const requiredStores = [
                'settings', 'weeklyTasks', 'tasks', 'workouts', 'weights',
                'exercises', 'healthGoals', 'dietRecords', 'shoppingList',
                'recipes', 'foods', 'knowledgeCategories', 'knowledgeItems',
                'infoCategories', 'infoCards', 'mindmapNodes', 'devProjects',
                'devItems', 'devLogs', 'devNotes', 'devNextActions',
                'itemGuides', 'storageItems'
            ];
            for (const store of requiredStores) {
                assertTrue(DB.STORES[store], `缺少存储: ${store}`);
            }
        },

        'settings 表 CRUD': async () => {
            await DB.put('settings', { key: 'testKey', value: 'testValue' });
            const item = await DB.get('settings', 'testKey');
            assertEqual(item.value, 'testValue', '写入后读取的值应一致');
            await DB.remove('settings', 'testKey');
            const removed = await DB.get('settings', 'testKey');
            assertEqual(removed, undefined, '删除后应为 undefined');
        },

        'weeklyTasks 表 CRUD': async () => {
            const id = await DB.add('weeklyTasks', {
                title: '测试任务',
                date: Utils.today(),
                priority: 'high',
                completed: false,
                sortOrder: 1
            });
            assertTrue(id > 0, '新增应返回自增ID');
            const task = await DB.get('weeklyTasks', id);
            assertEqual(task.title, '测试任务', '读取的标题应一致');
            task.title = '修改后的任务';
            await DB.put('weeklyTasks', task);
            const updated = await DB.get('weeklyTasks', id);
            assertEqual(updated.title, '修改后的任务', '更新后的值应变化');
            await DB.remove('weeklyTasks', id);
            const deleted = await DB.get('weeklyTasks', id);
            assertEqual(deleted, undefined, '删除后应为 undefined');
        },

        'tasks 表 CRUD': async () => {
            const id = await DB.add('tasks', {
                title: '汇总任务',
                date: Utils.today(),
                source: 'weekly',
                status: 'pending',
                priority: 'mid',
                sortOrder: 1
            });
            assertTrue(id > 0, '新增应返回自增ID');
            const task = await DB.get('tasks', id);
            assertEqual(task.source, 'weekly', '来源字段应正确');
            await DB.remove('tasks', id);
        },

        '按索引查询': async () => {
            const today = Utils.today();
            const id1 = await DB.add('tasks', { title: 't1', date: today, source: 'weekly', status: 'pending', sortOrder: 1 });
            const id2 = await DB.add('tasks', { title: 't2', date: today, source: 'dev', status: 'pending', sortOrder: 2 });
            const id3 = await DB.add('tasks', { title: 't3', date: '2020-01-01', source: 'weekly', status: 'pending', sortOrder: 3 });

            const todayTasks = await DB.getByIndex('tasks', 'date', today);
            assertEqual(todayTasks.length, 2, '今日任务应有2条');

            const weeklyTasks = await DB.getByIndex('tasks', 'source', 'weekly');
            assertEqual(weeklyTasks.length, 2, 'weekly来源任务应有2条');

            // 清理
            await DB.remove('tasks', id1);
            await DB.remove('tasks', id2);
            await DB.remove('tasks', id3);
        },

        'getAll 获取全部': async () => {
            const before = (await DB.getAll('weeklyTasks')).length;
            const id1 = await DB.add('weeklyTasks', { title: 'a', date: Utils.today(), priority: 'mid', completed: false, sortOrder: 1 });
            const id2 = await DB.add('weeklyTasks', { title: 'b', date: Utils.today(), priority: 'mid', completed: false, sortOrder: 2 });
            const all = await DB.getAll('weeklyTasks');
            assertEqual(all.length, before + 2, '数量应增加2');
            await DB.remove('weeklyTasks', id1);
            await DB.remove('weeklyTasks', id2);
        },

        'Utils.formatDate 格式化日期': () => {
            const d = new Date(2026, 0, 7); // 2026-01-07
            assertEqual(Utils.formatDate(d), '2026-01-07');
        },

        'Utils.today 返回今天': () => {
            const today = Utils.today();
            const expected = Utils.formatDate(new Date());
            assertEqual(today, expected);
        },

        'Utils.getWeekDates 获取周日期': () => {
            const dates = Utils.getWeekDates(new Date(2026, 10, 7), 1); // 2026-11-07 周六
            assertEqual(dates.length, 7, '应有7天');
            assertEqual(dates[0], '2026-11-02', '第一天应为周一 11-02');
            assertEqual(dates[6], '2026-11-08', '最后一天应为周日 11-08');
        },

        'Utils.getWeekdayName 获取星期名': () => {
            assertEqual(Utils.getWeekdayName('2026-11-07'), '周六');
            assertEqual(Utils.getWeekdayName('2026-11-02'), '周一');
        },

        'Utils.escapeHtml 转义HTML': () => {
            const escaped = Utils.escapeHtml('<script>alert("xss")</script>');
            assertTrue(escaped.includes('&lt;'), '应转义小于号');
            assertTrue(escaped.includes('&gt;'), '应转义大于号');
        },

        'DB.clear 清空表': async () => {
            await DB.add('weeklyTasks', { title: 'will delete', date: Utils.today(), priority: 'mid', completed: false, sortOrder: 1 });
            await DB.clear('weeklyTasks');
            const all = await DB.getAll('weeklyTasks');
            assertEqual(all.length, 0, '清空后应为0');
        },

        'DB.exportAll 导出数据': async () => {
            await DB.put('settings', { key: 'exportTest', value: '123' });
            const data = await DB.exportAll();
            assertTrue(data.version, '应有版本号');
            assertTrue(data.exportTime, '应有导出时间');
            assertTrue(data.data, '应有数据对象');
            assertTrue(data.data.settings, '应有settings数据');
            await DB.remove('settings', 'exportTest');
        },

        'DB.importAll 导入数据': async () => {
            const testData = {
                version: 1,
                exportTime: new Date().toISOString(),
                data: {
                    settings: [
                        { key: 'importKey1', value: 'importValue1' },
                        { key: 'importKey2', value: 'importValue2' }
                    ],
                    weeklyTasks: [
                        { id: 9999, title: '导入测试', date: Utils.today(), priority: 'high', completed: false, sortOrder: 1 }
                    ]
                }
            };
            await DB.importAll(testData);
            const s1 = await DB.get('settings', 'importKey1');
            const s2 = await DB.get('settings', 'importKey2');
            const w = await DB.get('weeklyTasks', 9999);
            assertEqual(s1.value, 'importValue1', '导入的setting应正确');
            assertEqual(s2.value, 'importValue2', '导入的setting应正确');
            assertEqual(w.title, '导入测试', '导入的weeklyTask应正确');
            // 清理
            await DB.remove('settings', 'importKey1');
            await DB.remove('settings', 'importKey2');
            await DB.remove('weeklyTasks', 9999);
        }
    };

    // ========== 阶段2：数据与设置测试 ==========
    const phase2Tests = {
        '默认设置应有值': async () => {
            const settings = await SettingsModule.getSettings();
            assertTrue(settings.weekStartsOn !== undefined, '应有 weekStartsOn');
            assertTrue(settings.expiryReminderDays !== undefined, '应有 expiryReminderDays');
            assertTrue(settings.autoCarryOver !== undefined, '应有 autoCarryOver');
        },

        'getSetting 读取单个设置': async () => {
            const val = await SettingsModule.getSetting('weekStartsOn');
            assertTrue(val === 0 || val === 1, '值应为0或1');
        },

        'setSetting 修改设置': async () => {
            const original = await SettingsModule.getSetting('weekStartsOn');
            await SettingsModule.setSetting('weekStartsOn', 0);
            const val = await SettingsModule.getSetting('weekStartsOn');
            assertEqual(val, 0, '修改后应为0');
            // 恢复
            await SettingsModule.setSetting('weekStartsOn', original);
        },

        '导出功能应生成文件': async () => {
            const data = await DB.exportAll();
            assertTrue(data && data.data, '导出数据应包含data');
            assertTrue(Object.keys(data.data).length > 0, '应有多个表的数据');
        },

        '导入功能应覆盖数据': async () => {
            // 先加一条测试数据
            await DB.put('settings', { key: 'testBeforeImport', value: 'before' });
            const testData = {
                version: 1,
                exportTime: new Date().toISOString(),
                data: {
                    settings: [
                        { key: 'testAfterImport', value: 'after' }
                    ]
                }
            };
            await DB.importAll(testData);
            const before = await DB.get('settings', 'testBeforeImport');
            const after = await DB.get('settings', 'testAfterImport');
            assertEqual(before, undefined, '旧数据应被清除');
            assertEqual(after.value, 'after', '新数据应被写入');
            // 清理
            await DB.remove('settings', 'testAfterImport');
        },

        '导入无效格式应报错': async () => {
            try {
                await DB.importAll({ invalid: true });
                throw new Error('应抛出错误但没有');
            } catch (e) {
                assertTrue(e.message.includes('无效'), '错误消息应包含"无效"');
            }
        },

        'clearAll 清空所有数据': async () => {
            // 加一些数据
            await DB.put('settings', { key: 'clearTest', value: '1' });
            await DB.add('weeklyTasks', { title: 'clear', date: Utils.today(), priority: 'mid', completed: false, sortOrder: 1 });
            await DB.clearAll();
            const settings = await DB.getAll('settings');
            const weekly = await DB.getAll('weeklyTasks');
            // settings 可能有默认设置，所以只检查weekly
            assertEqual(weekly.length, 0, 'weeklyTasks应被清空');
        },

        'getStats 获取统计': async () => {
            const stats = await DB.getStats();
            assertTrue(typeof stats === 'object', '应返回对象');
            assertTrue('settings' in stats, '应有settings统计');
            assertTrue('weeklyTasks' in stats, '应有weeklyTasks统计');
        }
    };

    // ========== 阶段3：每周计划测试 ==========
    const phase3Tests = {
        'WeeklyModule 名称正确': () => {
            assertEqual(WeeklyModule.name, '每周计划');
        },

        'WeeklyModule.getWeekTasks 获取本周任务': async () => {
            const weekStartsOn = 1; // 周一开始
            const today = new Date();
            const weekDates = Utils.getWeekDates(today, weekStartsOn);

            // 添加3个本周任务
            const id1 = await DB.add('weeklyTasks', { title: '周任务1', date: weekDates[0], priority: 'high', completed: false, sortOrder: 1 });
            const id2 = await DB.add('weeklyTasks', { title: '周任务2', date: weekDates[3], priority: 'mid', completed: true, sortOrder: 2 });
            const id3 = await DB.add('weeklyTasks', { title: '周任务3', date: weekDates[6], priority: 'low', completed: false, sortOrder: 3 });
            // 添加1个非本周任务
            const nonWeekDate = new Date(weekDates[0]);
            nonWeekDate.setDate(nonWeekDate.getDate() - 7);
            const id4 = await DB.add('weeklyTasks', { title: '非本周任务', date: Utils.formatDate(nonWeekDate), priority: 'mid', completed: false, sortOrder: 4 });

            const weekTasks = await WeeklyModule.getWeekTasks(today, weekStartsOn);
            assertEqual(weekTasks.length, 3, '本周任务应有3个');

            // 清理
            await DB.remove('weeklyTasks', id1);
            await DB.remove('weeklyTasks', id2);
            await DB.remove('weeklyTasks', id3);
            await DB.remove('weeklyTasks', id4);
        },

        '周任务完成状态切换': async () => {
            const id = await DB.add('weeklyTasks', { title: '完成测试', date: Utils.today(), priority: 'mid', completed: false, sortOrder: 1 });
            let task = await DB.get('weeklyTasks', id);
            assertEqual(task.completed, false, '初始应为未完成');

            task.completed = true;
            await DB.put('weeklyTasks', task);
            task = await DB.get('weeklyTasks', id);
            assertEqual(task.completed, true, '切换后应为已完成');

            await DB.remove('weeklyTasks', id);
        },

        '周任务优先级设置': async () => {
            const idHigh = await DB.add('weeklyTasks', { title: '高优先级', date: Utils.today(), priority: 'high', completed: false, sortOrder: 1 });
            const idMid = await DB.add('weeklyTasks', { title: '中优先级', date: Utils.today(), priority: 'mid', completed: false, sortOrder: 2 });
            const idLow = await DB.add('weeklyTasks', { title: '低优先级', date: Utils.today(), priority: 'low', completed: false, sortOrder: 3 });

            const tHigh = await DB.get('weeklyTasks', idHigh);
            const tMid = await DB.get('weeklyTasks', idMid);
            const tLow = await DB.get('weeklyTasks', idLow);

            assertEqual(tHigh.priority, 'high');
            assertEqual(tMid.priority, 'mid');
            assertEqual(tLow.priority, 'low');

            await DB.remove('weeklyTasks', idHigh);
            await DB.remove('weeklyTasks', idMid);
            await DB.remove('weeklyTasks', idLow);
        },

        'WeeklyModule.resetWeekOffset 重置周偏移': () => {
            WeeklyModule.resetWeekOffset();
            assertTrue(true, '应能正常调用');
        },

        '周任务按日期筛选正确': async () => {
            const weekStartsOn = 1;
            const today = new Date();
            const weekDates = Utils.getWeekDates(today, weekStartsOn);

            const ids = [];
            for (let i = 0; i < 7; i++) {
                const id = await DB.add('weeklyTasks', {
                    title: `任务${i}`,
                    date: weekDates[i],
                    priority: 'mid',
                    completed: false,
                    sortOrder: i
                });
                ids.push(id);
            }

            const weekTasks = await WeeklyModule.getWeekTasks(today, weekStartsOn);
            assertEqual(weekTasks.length, 7, '一周应有7个任务');

            // 验证日期都在周内
            for (const task of weekTasks) {
                assertTrue(weekDates.includes(task.date), `任务日期 ${task.date} 应在周内`);
            }

            // 清理
            for (const id of ids) {
                await DB.remove('weeklyTasks', id);
            }
        },

        '周任务描述和时长字段': async () => {
            const id = await DB.add('weeklyTasks', {
                title: '完整任务',
                date: Utils.today(),
                priority: 'high',
                completed: false,
                sortOrder: 1,
                description: '这是任务描述',
                duration: 60
            });
            const task = await DB.get('weeklyTasks', id);
            assertEqual(task.description, '这是任务描述', '描述应正确');
            assertEqual(task.duration, 60, '时长应为60分钟');
            await DB.remove('weeklyTasks', id);
        }
    };

    // ========== 阶段4：任务汇总测试 ==========
    const phase4Tests = {
        'TasksModule 名称正确': () => {
            assertEqual(TasksModule.name, '任务汇总');
        },

        'addQuickMemo 添加快速备忘': async () => {
            const before = await TasksModule.getPendingCount();
            const id = await TasksModule.addQuickMemo('测试快速备忘');
            assertTrue(id > 0, '应返回ID');
            const after = await TasksModule.getPendingCount();
            assertEqual(after, before + 1, '待办数应加1');

            const task = await DB.get('tasks', id);
            assertEqual(task.title, '测试快速备忘', '标题应正确');
            assertEqual(task.source, 'uncategorized', '来源应为待分类');
            assertEqual(task.status, 'pending', '状态应为待处理');

            await DB.remove('tasks', id);
        },

        'getPendingCount 获取待处理数': async () => {
            // 清空测试任务
            const all = await DB.getAll('tasks');
            for (const t of all) {
                await DB.remove('tasks', t.id);
            }

            const id1 = await DB.add('tasks', { title: '待办1', date: Utils.today(), source: 'weekly', status: 'pending', sortOrder: 1 });
            const id2 = await DB.add('tasks', { title: '待办2', date: Utils.today(), source: 'dev', status: 'pending', sortOrder: 2 });
            const id3 = await DB.add('tasks', { title: '已完成', date: Utils.today(), source: 'weekly', status: 'completed', sortOrder: 3 });

            const count = await TasksModule.getPendingCount();
            assertEqual(count, 2, '待处理任务应为2个');

            await DB.remove('tasks', id1);
            await DB.remove('tasks', id2);
            await DB.remove('tasks', id3);
        },

        '任务状态切换': async () => {
            const id = await DB.add('tasks', { title: '状态测试', date: Utils.today(), source: 'weekly', status: 'pending', sortOrder: 1 });
            let task = await DB.get('tasks', id);
            assertEqual(task.status, 'pending', '初始状态应为pending');

            task.status = 'completed';
            await DB.put('tasks', task);
            task = await DB.get('tasks', id);
            assertEqual(task.status, 'completed', '切换后应为completed');

            await DB.remove('tasks', id);
        },

        'carryOverUnfinished 自动顺延': async () => {
            const today = Utils.today();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = Utils.formatDate(yesterday);

            // 创建一个昨天未完成的任务
            const id = await DB.add('tasks', {
                title: '顺延测试',
                date: yesterdayStr,
                source: 'weekly',
                status: 'pending',
                sortOrder: 1,
                carryOver: false
            });

            const changed = await TasksModule.carryOverUnfinished();
            assertTrue(changed, '应有数据被修改');

            const task = await DB.get('tasks', id);
            assertEqual(task.date, today, '日期应顺延到今天');
            assertEqual(task.carryOver, true, '应标记为顺延');

            await DB.remove('tasks', id);
        },

        '已完成任务不顺延': async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = Utils.formatDate(yesterday);

            const id = await DB.add('tasks', {
                title: '已完成不顺延',
                date: yesterdayStr,
                source: 'weekly',
                status: 'completed',
                sortOrder: 1
            });

            await TasksModule.carryOverUnfinished();
            const task = await DB.get('tasks', id);
            assertEqual(task.date, yesterdayStr, '已完成任务日期不应变化');

            await DB.remove('tasks', id);
        },

        '任务来源字段多样': async () => {
            const sources = ['weekly', 'dev', 'health', 'items', 'uncategorized'];
            const ids = [];
            for (const src of sources) {
                const id = await DB.add('tasks', {
                    title: `${src}任务`,
                    date: Utils.today(),
                    source: src,
                    status: 'pending',
                    sortOrder: ids.length
                });
                ids.push(id);
            }

            const all = await DB.getAll('tasks');
            const srcTasks = all.filter(t => sources.includes(t.source));
            assertEqual(srcTasks.length, sources.length, '各来源任务都应存在');

            for (const id of ids) {
                await DB.remove('tasks', id);
            }
        },

        '任务优先级和时长': async () => {
            const id = await DB.add('tasks', {
                title: '完整任务',
                date: Utils.today(),
                source: 'weekly',
                status: 'pending',
                priority: 'high',
                duration: 90,
                description: '任务描述',
                sortOrder: 1
            });
            const task = await DB.get('tasks', id);
            assertEqual(task.priority, 'high');
            assertEqual(task.duration, 90);
            assertEqual(task.description, '任务描述');
            await DB.remove('tasks', id);
        }
    };

    // ========== 阶段5：健康计划测试 ==========
    const phase5Tests = {
        'HealthModule 名称正确': () => {
            assertEqual(HealthModule.name, '健康计划');
        },

        '运动记录 CRUD': async () => {
            const id = await DB.add('workouts', {
                date: Utils.today(),
                type: '力量训练',
                duration: 60,
                notes: '今天状态不错',
                exercises: [
                    { name: '卧推', sets: 4, reps: 10, rest: 90 }
                ]
            });
            assertTrue(id > 0, '应返回ID');

            const workout = await DB.get('workouts', id);
            assertEqual(workout.type, '力量训练');
            assertEqual(workout.duration, 60);
            assertEqual(workout.exercises.length, 1);
            assertEqual(workout.exercises[0].name, '卧推');

            // 更新
            workout.duration = 75;
            await DB.put('workouts', workout);
            const updated = await DB.get('workouts', id);
            assertEqual(updated.duration, 75);

            await DB.remove('workouts', id);
            const deleted = await DB.get('workouts', id);
            assertEqual(deleted, undefined);
        },

        '体重记录 CRUD': async () => {
            const id = await DB.add('weights', { date: Utils.today(), value: 68.5 });
            assertTrue(id > 0);

            const weight = await DB.get('weights', id);
            assertEqual(weight.value, 68.5);

            weight.value = 67.8;
            await DB.put('weights', weight);
            const updated = await DB.get('weights', id);
            assertEqual(updated.value, 67.8);

            await DB.remove('weights', id);
        },

        'getLatestWeight 获取最新体重': async () => {
            const today = new Date();
            const d1 = new Date(today); d1.setDate(d1.getDate() - 5);
            const d2 = new Date(today); d2.setDate(d2.getDate() - 2);
            const d3 = new Date(today); d3.setDate(d3.getDate() - 1);

            const id1 = await DB.add('weights', { date: Utils.formatDate(d1), value: 70.0 });
            const id2 = await DB.add('weights', { date: Utils.formatDate(d2), value: 69.0 });
            const id3 = await DB.add('weights', { date: Utils.formatDate(d3), value: 68.5 });

            const latest = await HealthModule.getLatestWeight();
            assertEqual(latest, 68.5, '最新体重应为68.5');

            await DB.remove('weights', id1);
            await DB.remove('weights', id2);
            await DB.remove('weights', id3);
        },

        'getWeekWorkoutCount 获取本周运动次数': async () => {
            const weekStartsOn = await SettingsModule.getSetting('weekStartsOn');
            const weekDates = Utils.getWeekDates(new Date(), weekStartsOn);

            // 添加3个本周运动
            const id1 = await DB.add('workouts', { date: weekDates[0], type: '跑步', duration: 30, exercises: [] });
            const id2 = await DB.add('workouts', { date: weekDates[2], type: '力量训练', duration: 60, exercises: [] });
            const id3 = await DB.add('workouts', { date: weekDates[4], type: '瑜伽', duration: 45, exercises: [] });

            // 添加1个非本周运动
            const lastWeek = new Date(weekDates[0]);
            lastWeek.setDate(lastWeek.getDate() - 7);
            const id4 = await DB.add('workouts', { date: Utils.formatDate(lastWeek), type: '跑步', duration: 30, exercises: [] });

            const count = await HealthModule.getWeekWorkoutCount();
            assertEqual(count, 3, '本周运动应为3次');

            await DB.remove('workouts', id1);
            await DB.remove('workouts', id2);
            await DB.remove('workouts', id3);
            await DB.remove('workouts', id4);
        },

        '动作库 CRUD': async () => {
            const id = await DB.add('exercises', {
                name: '卧推',
                target: '胸部',
                defaultSets: 4,
                defaultReps: 10,
                defaultRest: 90,
                notes: '注意肩胛骨收紧',
                sortOrder: 1
            });
            assertTrue(id > 0);

            const ex = await DB.get('exercises', id);
            assertEqual(ex.name, '卧推');
            assertEqual(ex.target, '胸部');
            assertEqual(ex.defaultSets, 4);

            ex.defaultSets = 5;
            await DB.put('exercises', ex);
            const updated = await DB.get('exercises', id);
            assertEqual(updated.defaultSets, 5);

            await DB.remove('exercises', id);
            const deleted = await DB.get('exercises', id);
            assertEqual(deleted, undefined);
        },

        '健康目标读写': async () => {
            await DB.put('healthGoals', { key: 'weeklyWorkouts', value: 5 });
            await DB.put('healthGoals', { key: 'targetWeight', value: 65.0 });

            const g1 = await DB.get('healthGoals', 'weeklyWorkouts');
            const g2 = await DB.get('healthGoals', 'targetWeight');
            assertEqual(g1.value, 5);
            assertEqual(g2.value, 65.0);

            await DB.remove('healthGoals', 'weeklyWorkouts');
            await DB.remove('healthGoals', 'targetWeight');
        },

        '运动记录按日期排序': async () => {
            const today = new Date();
            const d1 = new Date(today); d1.setDate(d1.getDate() - 3);
            const d2 = new Date(today); d2.setDate(d2.getDate() - 1);
            const d3 = today;

            const id1 = await DB.add('workouts', { date: Utils.formatDate(d1), type: 'A', duration: 30, exercises: [] });
            const id2 = await DB.add('workouts', { date: Utils.formatDate(d2), type: 'B', duration: 45, exercises: [] });
            const id3 = await DB.add('workouts', { date: Utils.formatDate(d3), type: 'C', duration: 60, exercises: [] });

            const all = await DB.getAll('workouts');
            all.sort((a, b) => new Date(b.date) - new Date(a.date)); // 倒序，最新的在前

            assertEqual(all[0].type, 'C', '第一个应该是最新的');
            assertEqual(all[2].type, 'A', '最后一个应该是最早的');

            await DB.remove('workouts', id1);
            await DB.remove('workouts', id2);
            await DB.remove('workouts', id3);
        },

        'getPendingCount 返回0': async () => {
            const count = await HealthModule.getPendingCount();
            assertEqual(count, 0, '健康模块待处理数应为0');
        }
    };

    // ========== 阶段6：饮食计划测试 ==========
    const phase6Tests = {
        'DietModule 名称正确': () => {
            assertEqual(DietModule.name, '饮食计划');
        },

        '饮食记录 CRUD': async () => {
            const id = await DB.add('dietRecords', {
                date: Utils.today(),
                meal: 'lunch',
                foodName: '番茄炒蛋',
                calories: 300,
                portion: '一碗',
                notes: '少放盐'
            });
            assertTrue(id > 0);
            const record = await DB.get('dietRecords', id);
            assertEqual(record.foodName, '番茄炒蛋');
            assertEqual(record.meal, 'lunch');
            assertEqual(record.calories, 300);

            record.calories = 350;
            await DB.put('dietRecords', record);
            const updated = await DB.get('dietRecords', id);
            assertEqual(updated.calories, 350);

            await DB.remove('dietRecords', id);
            const deleted = await DB.get('dietRecords', id);
            assertEqual(deleted, undefined);
        },

        '买菜清单 CRUD 和勾选': async () => {
            const id = await DB.add('shoppingList', {
                name: '西红柿',
                quantity: '2斤',
                completed: false,
                sortOrder: 1
            });
            assertTrue(id > 0);
            const item = await DB.get('shoppingList', id);
            assertEqual(item.name, '西红柿');
            assertEqual(item.completed, false);

            // 勾选
            item.completed = true;
            await DB.put('shoppingList', item);
            const checked = await DB.get('shoppingList', id);
            assertEqual(checked.completed, true);

            await DB.remove('shoppingList', id);
        },

        'getPendingCount 待购买数': async () => {
            const id1 = await DB.add('shoppingList', { name: 'A', completed: false, sortOrder: 1 });
            const id2 = await DB.add('shoppingList', { name: 'B', completed: false, sortOrder: 2 });
            const id3 = await DB.add('shoppingList', { name: 'C', completed: true, sortOrder: 3 });

            const count = await DietModule.getPendingCount();
            assertEqual(count, 2, '待购买应为2项');

            await DB.remove('shoppingList', id1);
            await DB.remove('shoppingList', id2);
            await DB.remove('shoppingList', id3);
        },

        '菜谱 CRUD': async () => {
            const id = await DB.add('recipes', {
                name: '番茄炒蛋',
                category: '家常菜',
                calories: 300,
                ingredients: '西红柿2个\n鸡蛋3个',
                steps: '1. 炒蛋\n2. 炒番茄\n3. 混合',
                sortOrder: 1
            });
            assertTrue(id > 0);
            const recipe = await DB.get('recipes', id);
            assertEqual(recipe.name, '番茄炒蛋');
            assertEqual(recipe.category, '家常菜');
            assertTrue(recipe.steps.includes('炒蛋'), '应包含步骤');

            await DB.remove('recipes', id);
        },

        '食品营养库 CRUD': async () => {
            const id = await DB.add('foods', {
                name: '米饭',
                calories: 116,
                protein: 2.6,
                carbs: 25.9,
                fat: 0.3,
                serving: '一碗约150g'
            });
            assertTrue(id > 0);
            const food = await DB.get('foods', id);
            assertEqual(food.name, '米饭');
            assertEqual(food.calories, 116);
            assertEqual(food.protein, 2.6);
            assertEqual(food.carbs, 25.9);

            await DB.remove('foods', id);
        },

        '饮食记录按日期分组统计': async () => {
            const today = Utils.today();
            const id1 = await DB.add('dietRecords', { date: today, meal: 'breakfast', foodName: '包子', calories: 200 });
            const id2 = await DB.add('dietRecords', { date: today, meal: 'lunch', foodName: '米饭', calories: 400 });
            const id3 = await DB.add('dietRecords', { date: today, meal: 'dinner', foodName: '面条', calories: 300 });

            const all = await DB.getAll('dietRecords');
            const todayRecords = all.filter(r => r.date === today);
            const totalCal = todayRecords.reduce((s, r) => s + (r.calories || 0), 0);
            assertEqual(todayRecords.length, 3, '今日应有3条记录');
            assertEqual(totalCal, 900, '总热量应为900');

            await DB.remove('dietRecords', id1);
            await DB.remove('dietRecords', id2);
            await DB.remove('dietRecords', id3);
        },

        '买菜清单排序（未完成在前）': async () => {
            const id1 = await DB.add('shoppingList', { name: '已完成', completed: true, sortOrder: 1 });
            const id2 = await DB.add('shoppingList', { name: '未完成', completed: false, sortOrder: 2 });

            const items = await DB.getAll('shoppingList');
            items.sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                return (b.sortOrder || 0) - (a.sortOrder || 0);
            });

            assertEqual(items[0].name, '未完成', '第一个应该是未完成的');
            assertEqual(items[1].name, '已完成', '第二个应该是已完成的');

            await DB.remove('shoppingList', id1);
            await DB.remove('shoppingList', id2);
        }
    };

    // ========== 阶段7：问题思考测试 ==========
    const phase7Tests = {
        'KnowledgeModule 名称正确': () => {
            assertEqual(KnowledgeModule.name, '问题思考');
        },

        '分类 CRUD': async () => {
            const id = await DB.add('knowledgeCategories', {
                name: '技术问题',
                icon: '💻',
                sortOrder: 1
            });
            assertTrue(id > 0);
            const cat = await DB.get('knowledgeCategories', id);
            assertEqual(cat.name, '技术问题');
            assertEqual(cat.icon, '💻');

            cat.name = '技术问题(改)';
            await DB.put('knowledgeCategories', cat);
            const updated = await DB.get('knowledgeCategories', id);
            assertEqual(updated.name, '技术问题(改)');

            await DB.remove('knowledgeCategories', id);
            const deleted = await DB.get('knowledgeCategories', id);
            assertEqual(deleted, undefined);
        },

        '问题记录 CRUD': async () => {
            const id = await DB.add('knowledgeItems', {
                title: '如何优化性能',
                categoryId: null,
                status: 'thinking',
                starred: false,
                content: '分析了几个方案，待验证',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            assertTrue(id > 0);
            const item = await DB.get('knowledgeItems', id);
            assertEqual(item.title, '如何优化性能');
            assertEqual(item.status, 'thinking');
            assertEqual(item.starred, false);

            item.status = 'solved';
            item.starred = true;
            await DB.put('knowledgeItems', item);
            const updated = await DB.get('knowledgeItems', id);
            assertEqual(updated.status, 'solved');
            assertEqual(updated.starred, true);

            await DB.remove('knowledgeItems', id);
        },

        'getPendingCount 返回星标数': async () => {
            const id1 = await DB.add('knowledgeItems', { title: '星标1', starred: true, status: 'thinking', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            const id2 = await DB.add('knowledgeItems', { title: '星标2', starred: true, status: 'solved', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            const id3 = await DB.add('knowledgeItems', { title: '非星标', starred: false, status: 'thinking', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

            const count = await KnowledgeModule.getPendingCount();
            assertEqual(count, 2, '星标问题应有2个');

            await DB.remove('knowledgeItems', id1);
            await DB.remove('knowledgeItems', id2);
            await DB.remove('knowledgeItems', id3);
        },

        '问题按分类筛选': async () => {
            const catId = await DB.add('knowledgeCategories', { name: '技术', sortOrder: 1 });
            const id1 = await DB.add('knowledgeItems', { title: '技术问题A', categoryId: catId, status: 'thinking', starred: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            const id2 = await DB.add('knowledgeItems', { title: '技术问题B', categoryId: catId, status: 'solved', starred: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            const id3 = await DB.add('knowledgeItems', { title: '其他问题', categoryId: null, status: 'thinking', starred: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

            const all = await DB.getAll('knowledgeItems');
            const techItems = all.filter(i => i.categoryId === catId);
            assertEqual(techItems.length, 2, '技术分类下应有2个问题');

            await DB.remove('knowledgeCategories', catId);
            await DB.remove('knowledgeItems', id1);
            await DB.remove('knowledgeItems', id2);
            await DB.remove('knowledgeItems', id3);
        },

        '星标问题排序优先': async () => {
            const id1 = await DB.add('knowledgeItems', { title: '普通问题', starred: false, status: 'thinking', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            const id2 = await DB.add('knowledgeItems', { title: '星标问题', starred: true, status: 'thinking', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

            const items = await DB.getAll('knowledgeItems');
            items.sort((a, b) => {
                if (a.starred !== b.starred) return b.starred ? 1 : -1;
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            });

            assertEqual(items[0].title, '星标问题', '星标应排在前面');
            assertEqual(items[1].title, '普通问题', '普通应排在后面');

            await DB.remove('knowledgeItems', id1);
            await DB.remove('knowledgeItems', id2);
        },

        '问题有创建和更新时间': async () => {
            const id = await DB.add('knowledgeItems', {
                title: '时间测试',
                status: 'thinking',
                starred: false,
                content: 'test',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-02T00:00:00.000Z'
            });
            const item = await DB.get('knowledgeItems', id);
            assertTrue(item.createdAt.includes('2026'), '应有创建时间');
            assertTrue(item.updatedAt.includes('2026'), '应有更新时间');
            assertTrue(item.updatedAt > item.createdAt, '更新时间应晚于创建时间');
            await DB.remove('knowledgeItems', id);
        }
    };

    // ========== 阶段8: 信息整理 ==========
    const phase8Tests = {
        '信息分类CRUD': async function() {
            const id = await DB.add('infoCategories', { name: 'test分类', sortOrder: 1 });
            assertTrue(id > 0, '新增应返回ID');
            const cat = await DB.get('infoCategories', id);
            assertEqual(cat.name, 'test分类', '名称应正确');
            cat.name = '修改后';
            await DB.put('infoCategories', cat);
            const updated = await DB.get('infoCategories', id);
            assertEqual(updated.name, '修改后', '修改应生效');
            await DB.remove('infoCategories', id);
            const deleted = await DB.get('infoCategories', id);
            assertEqual(deleted, null, '删除后应不存在');
        },
        '信息卡片CRUD': async function() {
            const id = await DB.add('infoCards', {
                title: '测试卡片',
                summary: '摘要',
                content: '详细内容',
                important: true,
                tags: 'tag1,tag2',
                createdAt: new Date().toISOString()
            });
            assertTrue(id > 0, '新增应返回ID');
            const card = await DB.get('infoCards', id);
            assertEqual(card.title, '测试卡片', '标题应正确');
            assertTrue(card.important, '重要标记应正确');
            assertEqual(card.summary, '摘要', '摘要应正确');
            card.title = '修改标题';
            await DB.put('infoCards', card);
            const updated = await DB.get('infoCards', id);
            assertEqual(updated.title, '修改标题', '修改应生效');
            await DB.remove('infoCards', id);
            const deleted = await DB.get('infoCards', id);
            assertEqual(deleted, null, '删除后应不存在');
        },
        '信息卡片分类关联': async function() {
            const catId = await DB.add('infoCategories', { name: '技术', sortOrder: 1 });
            const cardId = await DB.add('infoCards', {
                title: '技术卡片',
                categoryId: catId,
                important: false,
                createdAt: new Date().toISOString()
            });
            const card = await DB.get('infoCards', cardId);
            assertEqual(card.categoryId, catId, '应关联到分类');
            const all = await DB.getAll('infoCards');
            const filtered = all.filter(c => c.categoryId === catId);
            assertTrue(filtered.length >= 1, '按分类筛选应有结果');
            await DB.remove('infoCards', cardId);
            await DB.remove('infoCategories', catId);
        },
        '信息卡片重要性排序': async function() {
            const id1 = await DB.add('infoCards', { title: '普通', important: false, createdAt: new Date().toISOString() });
            const id2 = await DB.add('infoCards', { title: '重要', important: true, createdAt: new Date().toISOString() });
            const cards = await DB.getAll('infoCards');
            cards.sort((a, b) => {
                if (a.important !== b.important) return b.important ? 1 : -1;
                return 0;
            });
            assertEqual(cards[0].important, true, '重要的应排在前面');
            assertEqual(cards[0].title, '重要', '重要卡片应在前');
            await DB.remove('infoCards', id1);
            await DB.remove('infoCards', id2);
        },
        '思维导图节点CRUD': async function() {
            const id = await DB.add('mindmapNodes', {
                text: '中心节点',
                x: 400,
                y: 250,
                parentId: null,
                color: '#3b82f6'
            });
            assertTrue(id > 0, '新增应返回ID');
            const node = await DB.get('mindmapNodes', id);
            assertEqual(node.text, '中心节点', '文字应正确');
            assertEqual(node.x, 400, 'x坐标应正确');
            assertEqual(node.parentId, null, '根节点父ID为null');
            node.text = '修改后';
            await DB.put('mindmapNodes', node);
            const updated = await DB.get('mindmapNodes', id);
            assertEqual(updated.text, '修改后', '修改应生效');
            await DB.remove('mindmapNodes', id);
            const deleted = await DB.get('mindmapNodes', id);
            assertEqual(deleted, null, '删除后应不存在');
        },
        '思维导图父子关系': async function() {
            const parentId = await DB.add('mindmapNodes', {
                text: '父节点', x: 200, y: 200, parentId: null, color: '#3b82f6'
            });
            const childId = await DB.add('mindmapNodes', {
                text: '子节点', x: 350, y: 200, parentId: parentId, color: '#10b981'
            });
            const child = await DB.get('mindmapNodes', childId);
            assertEqual(child.parentId, parentId, '子节点应关联父节点');
            const all = await DB.getAll('mindmapNodes');
            const children = all.filter(n => n.parentId === parentId);
            assertEqual(children.length, 1, '应找到1个子节点');
            assertEqual(children[0].text, '子节点', '子节点文字正确');
            await DB.remove('mindmapNodes', childId);
            await DB.remove('mindmapNodes', parentId);
        },
        'InfoModule模块存在且可渲染': async function() {
            assertTrue(typeof InfoModule !== 'undefined', 'InfoModule应定义');
            assertEqual(InfoModule.name, '信息整理', '模块名称正确');
            assertTrue(typeof InfoModule.render === 'function', '应有render方法');
            const container = document.createElement('div');
            container.id = 'testInfoContainer';
            document.body.appendChild(container);
            try {
                await InfoModule.render(container);
                assertTrue(container.innerHTML.includes('信息整理'), '渲染应包含标题');
                assertTrue(container.innerHTML.includes('卡片视图'), '应包含卡片视图标签');
                assertTrue(container.innerHTML.includes('思维导图'), '应包含思维导图标签');
            } finally {
                document.body.removeChild(container);
            }
        },
        'InfoModule待办计数': async function() {
            const id1 = await DB.add('infoCards', { title: '普通', important: false, createdAt: new Date().toISOString() });
            const id2 = await DB.add('infoCards', { title: '重要', important: true, createdAt: new Date().toISOString() });
            const count = await InfoModule.getPendingCount();
            assertEqual(count, 1, '重要卡片数应为1');
            await DB.remove('infoCards', id1);
            await DB.remove('infoCards', id2);
        }
    };

    // ========== 阶段9: 开发工作 ==========
    const phase9Tests = {
        '开发项目CRUD': async function() {
            const id = await DB.add('devProjects', {
                name: '测试项目',
                status: 'developing',
                techStack: 'Vue, Node.js',
                description: '项目描述',
                repoUrl: 'https://github.com/test',
                createdAt: new Date().toISOString()
            });
            assertTrue(id > 0, '新增应返回ID');
            const project = await DB.get('devProjects', id);
            assertEqual(project.name, '测试项目', '名称应正确');
            assertEqual(project.status, 'developing', '状态应正确');
            assertEqual(project.techStack, 'Vue, Node.js', '技术栈应正确');
            project.status = 'completed';
            await DB.put('devProjects', project);
            const updated = await DB.get('devProjects', id);
            assertEqual(updated.status, 'completed', '状态修改应生效');
            await DB.remove('devProjects', id);
            const deleted = await DB.get('devProjects', id);
            assertEqual(deleted, null, '删除后应不存在');
        },
        '项目状态枚举': async function() {
            const statuses = ['planning', 'developing', 'testing', 'completed', 'paused'];
            const ids = [];
            for (let i = 0; i < statuses.length; i++) {
                const id = await DB.add('devProjects', {
                    name: `项目${i}`,
                    status: statuses[i],
                    createdAt: new Date().toISOString()
                });
                ids.push(id);
            }
            const all = await DB.getAll('devProjects');
            assertEqual(all.length >= 5, true, '应有5个项目');
            const devProjects = all.filter(p => p.status === 'developing');
            assertTrue(devProjects.length >= 1, '应有开发中的项目');
            for (const id of ids) await DB.remove('devProjects', id);
        },
        '代码片段CRUD': async function() {
            const id = await DB.add('codeSnippets', {
                title: '数组去重',
                language: 'javascript',
                description: 'JS数组去重方法',
                code: '[...new Set(arr)]',
                createdAt: new Date().toISOString()
            });
            assertTrue(id > 0, '新增应返回ID');
            const snippet = await DB.get('codeSnippets', id);
            assertEqual(snippet.title, '数组去重', '标题应正确');
            assertEqual(snippet.language, 'javascript', '语言应正确');
            assertEqual(snippet.code, '[...new Set(arr)]', '代码应正确');
            snippet.title = '修改后的标题';
            await DB.put('codeSnippets', snippet);
            const updated = await DB.get('codeSnippets', id);
            assertEqual(updated.title, '修改后的标题', '修改应生效');
            await DB.remove('codeSnippets', id);
            const deleted = await DB.get('codeSnippets', id);
            assertEqual(deleted, null, '删除后应不存在');
        },
        '开发笔记CRUD': async function() {
            const id = await DB.add('devNotes', {
                title: 'React Hooks心得',
                tags: 'react, hooks',
                content: 'useEffect的使用心得...',
                createdAt: new Date().toISOString()
            });
            assertTrue(id > 0, '新增应返回ID');
            const note = await DB.get('devNotes', id);
            assertEqual(note.title, 'React Hooks心得', '标题应正确');
            assertEqual(note.tags, 'react, hooks', '标签应正确');
            note.content = '更新后的内容';
            await DB.put('devNotes', note);
            const updated = await DB.get('devNotes', id);
            assertEqual(updated.content, '更新后的内容', '修改应生效');
            await DB.remove('devNotes', id);
            const deleted = await DB.get('devNotes', id);
            assertEqual(deleted, null, '删除后应不存在');
        },
        'DevModule模块存在且可渲染': async function() {
            assertTrue(typeof DevModule !== 'undefined', 'DevModule应定义');
            assertEqual(DevModule.name, '开发工作', '模块名称正确');
            assertTrue(typeof DevModule.render === 'function', '应有render方法');
            const container = document.createElement('div');
            container.id = 'testDevContainer';
            document.body.appendChild(container);
            try {
                await DevModule.render(container);
                assertTrue(container.innerHTML.includes('开发工作'), '渲染应包含标题');
                assertTrue(container.innerHTML.includes('项目'), '应包含项目标签');
                assertTrue(container.innerHTML.includes('代码片段'), '应包含代码片段标签');
                assertTrue(container.innerHTML.includes('开发笔记'), '应包含开发笔记标签');
            } finally {
                document.body.removeChild(container);
            }
        },
        'DevModule待办计数': async function() {
            const id1 = await DB.add('devProjects', { name: '已完成', status: 'completed', createdAt: new Date().toISOString() });
            const id2 = await DB.add('devProjects', { name: '开发中', status: 'developing', createdAt: new Date().toISOString() });
            const id3 = await DB.add('devProjects', { name: '开发中2', status: 'developing', createdAt: new Date().toISOString() });
            const count = await DevModule.getPendingCount();
            assertEqual(count, 2, '开发中项目数应为2');
            await DB.remove('devProjects', id1);
            await DB.remove('devProjects', id2);
            await DB.remove('devProjects', id3);
        }
    };

    // ========== 阶段10: 物品使用说明 ==========
    const phase10Tests = {
        '物品使用说明CRUD': async function() {
            const id = await DB.add('itemGuides', {
                name: '洗衣机',
                brand: '海尔',
                model: 'XQG100',
                content: '使用说明内容',
                createdAt: new Date().toISOString()
            });
            assertTrue(id > 0, '新增应返回ID');
            const item = await DB.get('itemGuides', id);
            assertEqual(item.name, '洗衣机', '名称应正确');
            assertEqual(item.brand, '海尔', '品牌应正确');
            assertEqual(item.model, 'XQG100', '型号应正确');
            item.name = '修改后的名称';
            await DB.put('itemGuides', item);
            const updated = await DB.get('itemGuides', id);
            assertEqual(updated.name, '修改后的名称', '修改应生效');
            await DB.remove('itemGuides', id);
            const deleted = await DB.get('itemGuides', id);
            assertEqual(deleted, null, '删除后应不存在');
        },
        '物品保修日期': async function() {
            const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
            const pastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
            const id1 = await DB.add('itemGuides', { name: '保修期内', warrantyExpire: futureDate, createdAt: new Date().toISOString() });
            const id2 = await DB.add('itemGuides', { name: '已过保', warrantyExpire: pastDate, createdAt: new Date().toISOString() });
            const items = await DB.getAll('itemGuides');
            assertEqual(items.length >= 2, true, '应有2个物品');
            const activeWarranty = items.filter(i => i.warrantyExpire && new Date(i.warrantyExpire) > new Date());
            assertTrue(activeWarranty.length >= 1, '应有在保物品');
            await DB.remove('itemGuides', id1);
            await DB.remove('itemGuides', id2);
        },
        'ItemsModule模块存在且可渲染': async function() {
            assertTrue(typeof ItemsModule !== 'undefined', 'ItemsModule应定义');
            assertEqual(ItemsModule.name, '物品使用说明', '模块名称正确');
            assertTrue(typeof ItemsModule.render === 'function', '应有render方法');
            const container = document.createElement('div');
            container.id = 'testGuideContainer';
            document.body.appendChild(container);
            try {
                await ItemsModule.render(container);
                assertTrue(container.innerHTML.includes('物品使用说明'), '渲染应包含标题');
                assertTrue(container.innerHTML.includes('分类'), '应包含分类');
            } finally {
                document.body.removeChild(container);
            }
        },
        '物品使用说明待办计数（临期保修）': async function() {
            const now = new Date();
            const soon = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
            const far = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
            const past = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
            const id1 = await DB.add('itemGuides', { name: '临期', warrantyExpire: soon, createdAt: now.toISOString() });
            const id2 = await DB.add('itemGuides', { name: '远期', warrantyExpire: far, createdAt: now.toISOString() });
            const id3 = await DB.add('itemGuides', { name: '已过期', warrantyExpire: past, createdAt: now.toISOString() });
            const count = await ItemsModule.getPendingCount();
            assertEqual(count, 1, '临期保修物品数应为1');
            await DB.remove('itemGuides', id1);
            await DB.remove('itemGuides', id2);
            await DB.remove('itemGuides', id3);
        }
    };

    // ========== 阶段11: 物品收纳 ==========
    const phase11Tests = {
        '存放位置CRUD': async function() {
            const id = await DB.add('storageLocations', { name: '主卧衣柜', note: '上层', sortOrder: 1 });
            assertTrue(id > 0, '新增应返回ID');
            const loc = await DB.get('storageLocations', id);
            assertEqual(loc.name, '主卧衣柜', '名称应正确');
            assertEqual(loc.note, '上层', '备注应正确');
            loc.name = '修改后位置';
            await DB.put('storageLocations', loc);
            const updated = await DB.get('storageLocations', id);
            assertEqual(updated.name, '修改后位置', '修改应生效');
            await DB.remove('storageLocations', id);
            const deleted = await DB.get('storageLocations', id);
            assertEqual(deleted, null, '删除后应不存在');
        },
        '收纳物品CRUD': async function() {
            const id = await DB.add('storageItems', {
                name: '冬季外套',
                quantity: 3,
                description: '黑色长款羽绒服',
                tags: '衣物,冬季',
                createdAt: new Date().toISOString()
            });
            assertTrue(id > 0, '新增应返回ID');
            const item = await DB.get('storageItems', id);
            assertEqual(item.name, '冬季外套', '名称应正确');
            assertEqual(item.quantity, 3, '数量应正确');
            assertEqual(item.description, '黑色长款羽绒服', '描述应正确');
            item.quantity = 5;
            await DB.put('storageItems', item);
            const updated = await DB.get('storageItems', id);
            assertEqual(updated.quantity, 5, '数量修改应生效');
            await DB.remove('storageItems', id);
            const deleted = await DB.get('storageItems', id);
            assertEqual(deleted, null, '删除后应不存在');
        },
        '物品与位置关联': async function() {
            const locId = await DB.add('storageLocations', { name: '书房', sortOrder: 1 });
            const itemId = await DB.add('storageItems', {
                name: '笔记本电脑',
                locationId: locId,
                quantity: 1,
                createdAt: new Date().toISOString()
            });
            const item = await DB.get('storageItems', itemId);
            assertEqual(item.locationId, locId, '应关联到位置');
            const all = await DB.getAll('storageItems');
            const filtered = all.filter(i => i.locationId === locId);
            assertTrue(filtered.length >= 1, '按位置筛选应有结果');
            await DB.remove('storageItems', itemId);
            await DB.remove('storageLocations', locId);
        },
        'StorageModule模块存在且可渲染': async function() {
            assertTrue(typeof StorageModule !== 'undefined', 'StorageModule应定义');
            assertEqual(StorageModule.name, '物品收纳', '模块名称正确');
            assertTrue(typeof StorageModule.render === 'function', '应有render方法');
            const container = document.createElement('div');
            container.id = 'testStorageContainer';
            document.body.appendChild(container);
            try {
                await StorageModule.render(container);
                assertTrue(container.innerHTML.includes('物品收纳'), '渲染应包含标题');
                assertTrue(container.innerHTML.includes('存放位置'), '应包含存放位置');
            } finally {
                document.body.removeChild(container);
            }
        },
        'StorageModule待办计数': async function() {
            const id1 = await DB.add('storageItems', { name: '物品A', quantity: 1, createdAt: new Date().toISOString() });
            const id2 = await DB.add('storageItems', { name: '物品B', quantity: 5, createdAt: new Date().toISOString() });
            const id3 = await DB.add('storageItems', { name: '物品C', quantity: 1, createdAt: new Date().toISOString() });
            const count = await StorageModule.getPendingCount();
            assertEqual(count, 2, '数量<=1的物品数应为2');
            await DB.remove('storageItems', id1);
            await DB.remove('storageItems', id2);
            await DB.remove('storageItems', id3);
        }
    };

    // ========== 阶段12: 首页总览 ==========
    const phase12Tests = {
        'HomeModule模块存在且可渲染': async function() {
            assertTrue(typeof HomeModule !== 'undefined', 'HomeModule应定义');
            assertEqual(HomeModule.name, '首页', '模块名称正确');
            assertTrue(typeof HomeModule.render === 'function', '应有render方法');
        },
        '首页渲染包含统计卡片': async function() {
            const container = document.createElement('div');
            container.id = 'testHomeContainer';
            document.body.appendChild(container);
            try {
                await HomeModule.render(container);
                assertTrue(container.innerHTML.includes('你好'), '应包含问候语');
                assertTrue(container.innerHTML.includes('今日待办任务'), '应包含今日待办');
                assertTrue(container.innerHTML.includes('本周计划'), '应包含本周计划');
                assertTrue(container.innerHTML.includes('星标问题'), '应包含星标问题');
                assertTrue(container.innerHTML.includes('进行中项目'), '应包含进行中项目');
                assertTrue(container.innerHTML.includes('重要信息'), '应包含重要信息');
                assertTrue(container.innerHTML.includes('收纳物品'), '应包含收纳物品');
            } finally {
                document.body.removeChild(container);
            }
        },
        '首页数据统计正确': async function() {
            const today = Utils.formatDate(new Date());
            // 添加测试数据
            const taskId = await DB.add('tasks', { title: '测试任务', date: today, status: 'pending', priority: 'high', createdAt: new Date().toISOString() });
            const weeklyId = await DB.add('weeklyTasks', { title: '周任务', dayIndex: 1, createdAt: new Date().toISOString() });
            const cardId = await DB.add('infoCards', { title: '重要卡片', important: true, createdAt: new Date().toISOString() });
            const projId = await DB.add('devProjects', { name: '进行中项目', status: 'developing', createdAt: new Date().toISOString() });
            const knowId = await DB.add('knowledgeItems', { title: '星标问题', starred: true, createdAt: new Date().toISOString() });
            const storageId = await DB.add('storageItems', { name: '测试物品', quantity: 2, createdAt: new Date().toISOString() });

            const container = document.createElement('div');
            container.id = 'testHomeContainer2';
            document.body.appendChild(container);
            try {
                await HomeModule.render(container);
                const html = container.innerHTML;
                assertTrue(html.includes('>1<') || html.includes('>1</div>'), '应显示1个今日待办');
                assertTrue(html.includes('进行中项目'), '应包含进行中项目模块');
            } finally {
                document.body.removeChild(container);
                await DB.remove('tasks', taskId);
                await DB.remove('weeklyTasks', weeklyId);
                await DB.remove('infoCards', cardId);
                await DB.remove('devProjects', projId);
                await DB.remove('knowledgeItems', knowId);
                await DB.remove('storageItems', storageId);
            }
        },
        '首页包含快捷入口': async function() {
            const container = document.createElement('div');
            container.id = 'testHomeContainer3';
            document.body.appendChild(container);
            try {
                await HomeModule.render(container);
                const quickStats = container.querySelectorAll('.quick-stat');
                assertTrue(quickStats.length >= 6, '应有至少6个快捷入口卡片');
            } finally {
                document.body.removeChild(container);
            }
        }
    };

    // ========== 运行所有测试 ==========
    async function runAll() {
        totalPass = 0;
        totalFail = 0;
        results = {};

        await DB.init();

        // 先清空测试残留数据
        await cleanupTestData();

        await runPhase('阶段1: 基础框架 (DB + Utils)', phase1Tests);
        await runPhase('阶段2: 数据与设置', phase2Tests);
        await runPhase('阶段3: 每周计划', phase3Tests);
        await runPhase('阶段4: 任务汇总', phase4Tests);
        await runPhase('阶段5: 健康计划', phase5Tests);
        await runPhase('阶段6: 饮食计划', phase6Tests);
        await runPhase('阶段7: 问题思考', phase7Tests);
        await runPhase('阶段8: 信息整理', phase8Tests);
        await runPhase('阶段9: 开发工作', phase9Tests);
        await runPhase('阶段10: 物品使用说明', phase10Tests);
        await runPhase('阶段11: 物品收纳', phase11Tests);
        await runPhase('阶段12: 首页总览', phase12Tests);

        // 清理
        await cleanupTestData();
    }

    async function runPhase1() {
        await DB.init();
        await cleanupTestData();
        totalPass = 0;
        totalFail = 0;
        results = {};
        await runPhase('阶段1: 基础框架 (DB + Utils)', phase1Tests);
        await cleanupTestData();
    }

    async function runPhase2() {
        await DB.init();
        await cleanupTestData();
        totalPass = 0;
        totalFail = 0;
        results = {};
        await runPhase('阶段2: 数据与设置', phase2Tests);
        await cleanupTestData();
    }

    async function runPhase3() {
        await DB.init();
        await cleanupTestData();
        totalPass = 0;
        totalFail = 0;
        results = {};
        await runPhase('阶段3: 每周计划', phase3Tests);
        await cleanupTestData();
    }

    async function runPhase4() {
        await DB.init();
        await cleanupTestData();
        totalPass = 0;
        totalFail = 0;
        results = {};
        await runPhase('阶段4: 任务汇总', phase4Tests);
        await cleanupTestData();
    }

    async function runPhase5() {
        await DB.init();
        await cleanupTestData();
        totalPass = 0;
        totalFail = 0;
        results = {};
        await runPhase('阶段5: 健康计划', phase5Tests);
        await cleanupTestData();
    }

    async function runPhase6() {
        await DB.init();
        await cleanupTestData();
        totalPass = 0;
        totalFail = 0;
        results = {};
        await runPhase('阶段6: 饮食计划', phase6Tests);
        await cleanupTestData();
    }

    async function runPhase7() {
        await DB.init();
        await cleanupTestData();
        totalPass = 0;
        totalFail = 0;
        results = {};
        await runPhase('阶段7: 问题思考', phase7Tests);
        await cleanupTestData();
    }

    async function runPhase8() {
        await DB.init();
        await cleanupTestData();
        totalPass = 0;
        totalFail = 0;
        results = {};
        await runPhase('阶段8: 信息整理', phase8Tests);
        await cleanupTestData();
    }

    async function runPhase9() {
        await DB.init();
        await cleanupTestData();
        totalPass = 0;
        totalFail = 0;
        results = {};
        await runPhase('阶段9: 开发工作', phase9Tests);
        await cleanupTestData();
    }

    async function runPhase10() {
        await DB.init();
        await cleanupTestData();
        totalPass = 0;
        totalFail = 0;
        results = {};
        await runPhase('阶段10: 物品使用说明', phase10Tests);
        await cleanupTestData();
    }

    async function runPhase11() {
        await DB.init();
        await cleanupTestData();
        totalPass = 0;
        totalFail = 0;
        results = {};
        await runPhase('阶段11: 物品收纳', phase11Tests);
        await cleanupTestData();
    }

    async function runPhase12() {
        await DB.init();
        await cleanupTestData();
        totalPass = 0;
        totalFail = 0;
        results = {};
        await runPhase('阶段12: 首页总览', phase12Tests);
        await cleanupTestData();
    }

    async function cleanupTestData() {
        // 清理可能残留的测试数据
        try {
            const allSettings = await DB.getAll('settings');
            for (const s of allSettings) {
                if (s.key.startsWith('test') || s.key.startsWith('import') || s.key.startsWith('clear')) {
                    await DB.remove('settings', s.key);
                }
            }
            // 清理周任务
            const weeklyTasks = await DB.getAll('weeklyTasks');
            for (const t of weeklyTasks) {
                await DB.remove('weeklyTasks', t.id);
            }
            // 清理任务汇总
            const tasks = await DB.getAll('tasks');
            for (const t of tasks) {
                await DB.remove('tasks', t.id);
            }
            // 清理健康相关
            const workouts = await DB.getAll('workouts');
            for (const w of workouts) await DB.remove('workouts', w.id);
            const weights = await DB.getAll('weights');
            for (const w of weights) await DB.remove('weights', w.id);
            const exercises = await DB.getAll('exercises');
            for (const e of exercises) await DB.remove('exercises', e.id);
            const goals = await DB.getAll('healthGoals');
            for (const g of goals) await DB.remove('healthGoals', g.key);
            // 清理饮食相关
            const dietRecords = await DB.getAll('dietRecords');
            for (const d of dietRecords) await DB.remove('dietRecords', d.id);
            const shoppingList = await DB.getAll('shoppingList');
            for (const s of shoppingList) await DB.remove('shoppingList', s.id);
            const recipes = await DB.getAll('recipes');
            for (const r of recipes) await DB.remove('recipes', r.id);
            const foods = await DB.getAll('foods');
            for (const f of foods) await DB.remove('foods', f.id);
            // 清理问题思考相关
            const knowledgeCats = await DB.getAll('knowledgeCategories');
            for (const c of knowledgeCats) await DB.remove('knowledgeCategories', c.id);
            const knowledgeItems = await DB.getAll('knowledgeItems');
            for (const i of knowledgeItems) await DB.remove('knowledgeItems', i.id);
            // 清理信息整理相关
            const infoCats = await DB.getAll('infoCategories');
            for (const c of infoCats) await DB.remove('infoCategories', c.id);
            const infoCards = await DB.getAll('infoCards');
            for (const c of infoCards) await DB.remove('infoCards', c.id);
            const mindmapNodes = await DB.getAll('mindmapNodes');
            for (const n of mindmapNodes) await DB.remove('mindmapNodes', n.id);
            // 清理开发工作相关
            const devProjects = await DB.getAll('devProjects');
            for (const p of devProjects) await DB.remove('devProjects', p.id);
            const codeSnippets = await DB.getAll('codeSnippets');
            for (const s of codeSnippets) await DB.remove('codeSnippets', s.id);
            const devNotes = await DB.getAll('devNotes');
            for (const n of devNotes) await DB.remove('devNotes', n.id);
            // 清理物品使用说明相关
            const itemGuides = await DB.getAll('itemGuides');
            for (const i of itemGuides) await DB.remove('itemGuides', i.id);
            // 清理物品收纳相关
            const storageCats = await DB.getAll('storageCategories');
            for (const c of storageCats) await DB.remove('storageCategories', c.id);
            const storageLocs = await DB.getAll('storageLocations');
            for (const l of storageLocs) await DB.remove('storageLocations', l.id);
            const storageItems = await DB.getAll('storageItems');
            for (const i of storageItems) await DB.remove('storageItems', i.id);
        } catch (e) {
            // 忽略
        }
    }

    async function clearAllData() {
        const confirmed = await Utils.confirm('确定要清空所有数据吗？');
        if (confirmed) {
            await DB.clearAll();
            Utils.toast('数据已清空', 'success');
        }
    }

    /**
     * 初始化测试页面
     */
    function init() {
        document.getElementById('runAllBtn').onclick = runAll;
        document.getElementById('runPhase1Btn').onclick = runPhase1;
        document.getElementById('runPhase2Btn').onclick = runPhase2;
        document.getElementById('runPhase3Btn').onclick = runPhase3;
        document.getElementById('runPhase4Btn').onclick = runPhase4;
        document.getElementById('runPhase5Btn').onclick = runPhase5;
        document.getElementById('runPhase6Btn').onclick = runPhase6;
        document.getElementById('runPhase7Btn').onclick = runPhase7;
        document.getElementById('runPhase8Btn').onclick = runPhase8;
        document.getElementById('runPhase9Btn').onclick = runPhase9;
        document.getElementById('runPhase10Btn').onclick = runPhase10;
        document.getElementById('runPhase11Btn').onclick = runPhase11;
        document.getElementById('runPhase12Btn').onclick = runPhase12;
        document.getElementById('clearTestDataBtn').onclick = clearAllData;
    }

    return {
        init,
        runAll,
        runPhase1,
        runPhase2,
        runPhase3,
        runPhase4,
        runPhase5,
        runPhase6,
        runPhase7,
        runPhase8,
        runPhase9,
        runPhase10,
        runPhase11,
        runPhase12
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Tests.init);
} else {
    Tests.init();
}
