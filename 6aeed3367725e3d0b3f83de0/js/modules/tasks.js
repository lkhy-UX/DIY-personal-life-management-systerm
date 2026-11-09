/**
 * 任务汇总模块
 */
const TasksModule = (function() {
    const name = '任务汇总';
    let currentDayOffset = 0; // 0=今天, -1=昨天, 1=明天

    async function render(container) {
        const weekStartsOn = await SettingsModule.getSetting('weekStartsOn');
        const autoCarryOver = await SettingsModule.getSetting('autoCarryOver');
        const today = new Date();
        const weekDates = Utils.getWeekDates(today, weekStartsOn);

        // 执行自动顺延
        if (autoCarryOver) {
            await carryOverUnfinished();
        }

        const allTasks = await DB.getAll('tasks');
        const weekTasks = allTasks.filter(t => weekDates.includes(t.date));

        // 按日期分组
        const tasksByDate = {};
        weekDates.forEach(d => tasksByDate[d] = []);
        weekTasks.forEach(t => {
            if (tasksByDate[t.date]) {
                tasksByDate[t.date].push(t);
            }
        });

        // 按排序顺序排序
        Object.keys(tasksByDate).forEach(date => {
            tasksByDate[date].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        });

        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-lg">✅ 任务汇总</div>
                <div class="flex gap-8">
                    <select class="form-select" id="filterSource" style="width:auto;">
                        <option value="">全部来源</option>
                        <option value="weekly">每周计划</option>
                        <option value="dev">开发工作</option>
                        <option value="health">健康计划</option>
                        <option value="items">物品提醒</option>
                        <option value="uncategorized">待分类</option>
                    </select>
                    <button class="btn btn-primary">+ 新建任务</button>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 260px;gap:20px;">
                <div>
                    <div class="tabs" id="dayTabs">
                        ${weekDates.map(date => {
                            const isToday = Utils.isToday(date);
                            const weekday = Utils.getWeekdayName(date);
                            const tasks = tasksByDate[date] || [];
                            const completedCount = tasks.filter(t => t.status === 'completed').length;
                            return `
                                <div class="day-tab tab ${isToday ? 'active' : ''}" data-date="${date}">
                                    ${weekday}
                                    <div style="font-size:12px;font-weight:400;">${date.slice(5)} · ${completedCount}/${tasks.length}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <div id="dayTaskList">
                        ${renderDayTasks(tasksByDate[Utils.today()] || [], Utils.today())}
                    </div>
                </div>

                <div>
                    <div class="card" style="padding:16px;">
                        <div style="font-weight:600;margin-bottom:12px;">📊 今日完成情况</div>
                        <div id="dayStats">${renderDayStats(tasksByDate[Utils.today()] || [])}</div>
                    </div>
                </div>
            </div>
        `;

        // Tab 切换
        container.querySelectorAll('.day-tab').forEach(tab => {
            tab.onclick = () => {
                container.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const date = tab.getAttribute('data-date');
                document.getElementById('dayTaskList').innerHTML = renderDayTasks(tasksByDate[date] || [], date);
                document.getElementById('dayStats').innerHTML = renderDayStats(tasksByDate[date] || []);
                bindTaskEvents(container);
            };
        });

        bindTaskEvents(container);
    }

    function renderDayTasks(tasks, date) {
        if (tasks.length === 0) {
            return `
                <div class="card">
                    <div class="empty-state">
                        <div class="empty-state-icon">📝</div>
                        <div class="empty-state-text">今天还没有任务</div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="card">
                <div class="task-list drop-zone" data-date="${date}">
                    ${tasks.map(task => renderTaskItem(task)).join('')}
                </div>
            </div>
        `;
    }

    function renderTaskItem(task) {
        const priorityClass = task.priority === 'high' ? 'tag-high' : task.priority === 'low' ? 'tag-low' : 'tag-mid';
        const priorityText = task.priority === 'high' ? '高' : task.priority === 'low' ? '低' : '中';
        const sourceLabels = {
            weekly: '每周计划',
            dev: '开发工作',
            health: '健康计划',
            items: '物品提醒',
            uncategorized: '待分类'
        };
        const sourceClass = 'tag-' + (task.source || 'uncategorized');
        const isCompleted = task.status === 'completed';
        const isDelayed = task.status === 'delayed';
        const isCanceled = task.status === 'canceled';

        return `
            <div class="task-item-el draggable list-item" data-id="${task.id}" data-source="${task.source}"
                 style="padding:12px;border-bottom:1px solid var(--border-light);gap:10px;${isCompleted ? 'opacity:0.6;' : ''}${isDelayed ? 'border-left:3px solid var(--warning);' : ''}">
                <div class="checkbox ${isCompleted ? 'checked' : ''}"></div>
                <div style="flex:1;min-width:0;">
                    <div class="truncate font-medium" style="${isCompleted ? 'text-decoration:line-through;color:var(--text-muted);' : ''}">${Utils.escapeHtml(task.title)}</div>
                    <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
                        <span class="tag ${sourceClass}" style="font-size:10px;">${sourceLabels[task.source] || '待分类'}</span>
                        <span class="tag ${priorityClass}" style="font-size:10px;">${priorityText}</span>
                        ${task.startTime && task.endTime ? `<span class="tag" style="font-size:10px;background:var(--bg-muted);color:var(--text-secondary);">🕐 ${task.startTime}-${task.endTime}</span>` : ''}
                        ${task.duration ? `<span class="tag" style="font-size:10px;background:var(--bg-muted);color:var(--text-secondary);">⏱ ${task.duration}min</span>` : ''}
                        ${task.carryOver ? `<span class="tag" style="font-size:10px;background:#FEF3C7;color:#D97706;">顺延</span>` : ''}
                    </div>
                </div>
                <div style="display:flex;gap:4px;">
                    <button class="edit-btn" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px;">✎</button>
                    <button class="delete-btn" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px;">✕</button>
                </div>
            </div>
        `;
    }

    function renderDayStats(tasks) {
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        const rate = total > 0 ? Math.round(completed / total * 100) : 0;

        // 时间分配
        const sourceMinutes = {};
        tasks.forEach(t => {
            if (t.duration) {
                const source = t.source || 'uncategorized';
                sourceMinutes[source] = (sourceMinutes[source] || 0) + t.duration;
            }
        });
        const totalMinutes = Object.values(sourceMinutes).reduce((a, b) => a + b, 0);

        const sourceLabels = {
            weekly: '每周计划',
            dev: '开发工作',
            health: '健康计划',
            diet: '饮食计划',
            items: '物品提醒',
            uncategorized: '待分类'
        };

        return `
            <div style="margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span class="text-sm text-muted">完成率</span>
                    <span class="font-semibold" style="color:var(--primary);">${rate}%</span>
                </div>
                <div style="height:8px;background:var(--bg-muted);border-radius:4px;overflow:hidden;">
                    <div style="height:100%;width:${rate}%;background:var(--primary);border-radius:4px;transition:width 0.3s;"></div>
                </div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:13px;">
                <span class="text-muted">已完成 / 总计</span>
                <span class="font-medium">${completed} / ${total}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:13px;">
                <span class="text-muted">顺延任务</span>
                <span style="color:var(--warning);">${tasks.filter(t => t.carryOver).length} 项</span>
            </div>

            <div style="border-top:1px solid var(--border);padding-top:12px;">
                <div style="font-weight:500;margin-bottom:10px;font-size:13px;">⏱ 时间分配</div>
                ${Object.keys(sourceMinutes).length === 0 ? `
                    <div class="text-sm text-muted">暂无时间数据</div>
                ` : Object.entries(sourceMinutes).map(([source, mins]) => {
                    const pct = totalMinutes > 0 ? Math.round(mins / totalMinutes * 100) : 0;
                    return `
                        <div style="margin-bottom:8px;">
                            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                                <span class="text-muted">${sourceLabels[source] || source}</span>
                                <span>${mins}分钟</span>
                            </div>
                            <div style="height:4px;background:var(--bg-muted);border-radius:2px;">
                                <div style="height:100%;width:${pct}%;background:var(--primary);border-radius:2px;"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:8px;padding-top:8px;border-top:1px dashed var(--border);">
                    <span class="text-muted">总计</span>
                    <span class="font-medium">${totalMinutes}分钟</span>
                </div>
            </div>
        `;
    }

    function bindTaskEvents(container) {
        // 任务操作
        container.querySelectorAll('.task-item-el').forEach(el => {
            const taskId = parseInt(el.getAttribute('data-id'));
            // 勾选
            el.querySelector('.checkbox').onclick = async (e) => {
                e.stopPropagation();
                const task = await DB.get('tasks', taskId);
                task.status = task.status === 'completed' ? 'pending' : 'completed';
                await DB.put('tasks', task);
                // 重新渲染整个页面
                render(container);
                window.dispatchEvent(new CustomEvent('dataChanged'));
            };
            // 拖拽
            el.setAttribute('draggable', 'true');
            el.addEventListener('dragstart', (e) => {
                el.classList.add('dragging');
                e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'tasks', id: taskId }));
            });
            el.addEventListener('dragend', () => {
                el.classList.remove('dragging');
            });
        });

        // 拖放区域
        container.querySelectorAll('.drop-zone').forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });
            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });
            zone.addEventListener('drop', async (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                const date = zone.getAttribute('data-date');
                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    if (data.source === 'tasks') {
                        const task = await DB.get('tasks', data.id);
                        task.date = date;
                        task.carryOver = false;
                        await DB.put('tasks', task);
                        render(container);
                        window.dispatchEvent(new CustomEvent('dataChanged'));
                        Utils.toast('已移动到 ' + date, 'success');
                    } else if (data.source === 'weekly') {
                        const srcTask = await DB.get('weeklyTasks', data.id);
                        const newTask = {
                            title: srcTask.title,
                            description: srcTask.description || '',
                            date: date,
                            priority: srcTask.priority || 'mid',
                            duration: srcTask.duration || null,
                            status: srcTask.completed ? 'completed' : 'pending',
                            source: 'weekly',
                            sourceId: srcTask.id,
                            sortOrder: Date.now()
                        };
                        await DB.add('tasks', newTask);
                        render(container);
                        window.dispatchEvent(new CustomEvent('dataChanged'));
                        Utils.toast('已添加到任务汇总', 'success');
                    }
                } catch (err) {
                    console.error(err);
                }
            });
        });
    }

    // 自动顺延未完成任务
    async function carryOverUnfinished() {
        const today = Utils.today();
        const allTasks = await DB.getAll('tasks');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = Utils.formatDate(yesterday);

        let changed = false;
        for (const task of allTasks) {
            if (task.date < yesterdayStr && task.status === 'pending' && !task.carryOver) {
                // 移到今天并标记顺延
                task.date = today;
                task.carryOver = true;
                task.sortOrder = Date.now() + Math.random();
                await DB.put('tasks', task);
                changed = true;
            } else if (task.date === today && task.status !== 'pending') {
                task.carryOver = false;
                await DB.put('tasks', task);
                changed = true;
            }
        }
        return changed;
    }

    // 添加快速备忘
    async function addQuickMemo(text) {
        const task = {
            title: text,
            description: '',
            date: Utils.today(),
            priority: 'mid',
            status: 'pending',
            source: 'uncategorized',
            sortOrder: Date.now()
        };
        const id = await DB.add('tasks', task);
        window.dispatchEvent(new CustomEvent('dataChanged'));
        return id;
    }

    // 获取待处理任务数
    async function getPendingCount() {
        const tasks = await DB.getAll('tasks');
        return tasks.filter(t => t.status === 'pending').length;
    }

    return {
        name,
        render,
        addQuickMemo,
        getPendingCount,
        carryOverUnfinished
    };
})();
