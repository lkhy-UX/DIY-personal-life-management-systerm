/**
 * 每周计划模块
 */
const WeeklyModule = (function() {
    const name = '每周计划';
    let currentWeekOffset = 0; // 0=本周, -1=上周, 1=下周

    async function render(container) {
        const weekStartsOn = await SettingsModule.getSetting('weekStartsOn');
        const today = new Date();
        const weekStart = new Date(today);
        const day = weekStart.getDay();
        const diff = (day - weekStartsOn + 7) % 7;
        weekStart.setDate(today.getDate() - diff + currentWeekOffset * 7);

        const weekDates = Utils.getWeekDates(weekStart, weekStartsOn);
        const allTasks = await DB.getAll('weeklyTasks');
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

        const isCurrentWeek = currentWeekOffset === 0;

        container.innerHTML = `
            <div class="page-header">
                <div>
                    <div class="page-title-lg">📅 每周计划</div>
                    <div class="text-sm text-muted mt-8">${weekDates[0]} ~ ${weekDates[6]}</div>
                </div>
                <div class="flex gap-8">
                    <button class="btn" id="prevWeek">← 上一周</button>
                    <button class="btn" id="thisWeek" ${isCurrentWeek ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>本周</button>
                    <button class="btn" id="nextWeek">下一周 →</button>
                    <button class="btn btn-primary" id="addTaskBtn">+ 新建任务</button>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:12px;">
                ${weekDates.map(date => {
                    const isToday = Utils.isToday(date);
                    const weekday = Utils.getWeekdayName(date);
                    const tasks = tasksByDate[date] || [];
                    return `
                        <div class="card day-column" data-date="${date}" style="padding:12px;min-height:400px;">
                            <div style="font-weight:600;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);${isToday ? 'color:var(--primary);' : ''}">
                                ${weekday}
                                <div class="text-sm ${isToday ? '' : 'text-muted'}">${date.slice(5)}</div>
                            </div>
                            <div class="task-list drop-zone" data-date="${date}">
                                ${tasks.length === 0 ? `
                                    <div class="empty-state" style="padding:20px 0;">
                                        <div class="empty-state-text text-sm">暂无任务</div>
                                    </div>
                                ` : tasks.map(task => renderTaskItem(task)).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        // 绑定事件
        document.getElementById('prevWeek').onclick = () => {
            currentWeekOffset--;
            render(container);
        };
        document.getElementById('nextWeek').onclick = () => {
            currentWeekOffset++;
            render(container);
        };
        document.getElementById('thisWeek').onclick = () => {
            currentWeekOffset = 0;
            render(container);
        };
        document.getElementById('addTaskBtn').onclick = () => showTaskModal(null, weekDates[0]);

        // 任务操作
        container.querySelectorAll('.task-item-el').forEach(el => {
            const taskId = parseInt(el.getAttribute('data-id'));
            // 勾选
            el.querySelector('.checkbox').onclick = async (e) => {
                e.stopPropagation();
                const task = await DB.get('weeklyTasks', taskId);
                task.completed = !task.completed;
                await DB.put('weeklyTasks', task);
                render(container);
                window.dispatchEvent(new CustomEvent('dataChanged'));
            };
            // 编辑
            el.querySelector('.edit-btn').onclick = async (e) => {
                e.stopPropagation();
                const task = await DB.get('weeklyTasks', taskId);
                showTaskModal(task, task.date);
            };
            // 删除
            el.querySelector('.delete-btn').onclick = async (e) => {
                e.stopPropagation();
                const confirmed = await Utils.confirm('确定删除这个任务吗？');
                if (confirmed) {
                    await DB.remove('weeklyTasks', taskId);
                    Utils.toast('已删除', 'success');
                    render(container);
                    window.dispatchEvent(new CustomEvent('dataChanged'));
                }
            };
            // 拖拽
            el.setAttribute('draggable', 'true');
            el.addEventListener('dragstart', (e) => {
                el.classList.add('dragging');
                e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'weekly', id: taskId }));
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
                    if (data.source === 'weekly') {
                        const task = await DB.get('weeklyTasks', data.id);
                        task.date = date;
                        await DB.put('weeklyTasks', task);
                        render(container);
                        window.dispatchEvent(new CustomEvent('dataChanged'));
                        Utils.toast('已移动到 ' + date, 'success');
                    } else if (data.source === 'tasks') {
                        // 从任务汇总拖过来
                        const srcTask = await DB.get('tasks', data.id);
                        const newTask = {
                            title: srcTask.title,
                            description: srcTask.description || '',
                            date: date,
                            priority: srcTask.priority || 'mid',
                            completed: false,
                            sortOrder: Date.now(),
                            source: 'tasks'
                        };
                        await DB.add('weeklyTasks', newTask);
                        // 同时更新源任务关联
                        srcTask.sourceId = newTask.id;
                        srcTask.source = 'weekly';
                        srcTask.date = date;
                        await DB.put('tasks', srcTask);
                        render(container);
                        window.dispatchEvent(new CustomEvent('dataChanged'));
                        Utils.toast('已添加到每周计划', 'success');
                    }
                } catch (err) {
                    console.error(err);
                }
            });
        });
    }

    function renderTaskItem(task) {
        const priorityClass = task.priority === 'high' ? 'tag-high' : task.priority === 'low' ? 'tag-low' : 'tag-mid';
        const priorityText = task.priority === 'high' ? '高' : task.priority === 'low' ? '低' : '中';
        return `
            <div class="task-item-el draggable list-item ${task.completed ? 'completed' : ''}" data-id="${task.id}"
                 style="background:var(--bg-card);border:1px solid var(--border);margin-bottom:8px;padding:8px 10px;border-radius:var(--radius);">
                <div style="display:flex;align-items:flex-start;gap:8px;">
                    <div class="checkbox ${task.completed ? 'checked' : ''}"></div>
                    <div style="flex:1;min-width:0;">
                        <div class="truncate ${task.completed ? 'text-muted;text-decoration:line-through;' : ''}" style="font-size:13px;">${Utils.escapeHtml(task.title)}</div>
                        <div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;">
                            <span class="tag ${priorityClass}" style="font-size:10px;">${priorityText}</span>
                        </div>
                    </div>
                    <button class="edit-btn" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;font-size:12px;">✎</button>
                    <button class="delete-btn" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;font-size:12px;">✕</button>
                </div>
            </div>
        `;
    }

    function showTaskModal(task, defaultDate) {
        const isEdit = !!task;
        const modal = Utils.showModal({
            title: isEdit ? '编辑任务' : '新建任务',
            content: `
                <div class="form-group">
                    <label class="form-label">任务名称</label>
                    <input type="text" class="form-input" id="taskTitle" value="${task ? Utils.escapeHtml(task.title) : ''}" placeholder="输入任务名称" />
                </div>
                <div class="form-group">
                    <label class="form-label">日期</label>
                    <input type="date" class="form-input" id="taskDate" value="${task ? task.date : defaultDate}" />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">优先级</label>
                        <select class="form-select" id="taskPriority">
                            <option value="high" ${task && task.priority === 'high' ? 'selected' : ''}>高</option>
                            <option value="mid" ${!task || task.priority === 'mid' ? 'selected' : ''}>中</option>
                            <option value="low" ${task && task.priority === 'low' ? 'selected' : ''}>低</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">预计时长（分钟）</label>
                        <input type="number" class="form-input" id="taskDuration" value="${task ? (task.duration || '') : ''}" placeholder="可选" min="0" />
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">备注</label>
                    <textarea class="form-textarea" id="taskDesc" placeholder="可选">${task ? Utils.escapeHtml(task.description || '') : ''}</textarea>
                </div>
            `,
            footer: `
                <button class="btn" id="cancelTaskBtn">取消</button>
                <button class="btn btn-primary" id="saveTaskBtn">${isEdit ? '保存' : '创建'}</button>
            `,
            onMount: () => {
                document.getElementById('cancelTaskBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveTaskBtn').onclick = async () => {
                    const title = document.getElementById('taskTitle').value.trim();
                    if (!title) {
                        Utils.toast('请输入任务名称', 'warning');
                        return;
                    }
                    const date = document.getElementById('taskDate').value;
                    const priority = document.getElementById('taskPriority').value;
                    const duration = parseInt(document.getElementById('taskDuration').value) || null;
                    const description = document.getElementById('taskDesc').value;

                    const taskData = {
                        title,
                        date,
                        priority,
                        duration,
                        description,
                        completed: task ? task.completed : false,
                        sortOrder: task ? task.sortOrder : Date.now(),
                        source: 'weekly'
                    };

                    if (isEdit) {
                        taskData.id = task.id;
                        await DB.put('weeklyTasks', taskData);
                        Utils.toast('已保存', 'success');
                    } else {
                        await DB.add('weeklyTasks', taskData);
                        Utils.toast('已创建', 'success');
                    }

                    Utils.closeModal(modal);
                    // 重新渲染
                    const content = document.getElementById('mainContent');
                    render(content);
                    window.dispatchEvent(new CustomEvent('dataChanged'));
                };
            }
        });
    }

    // 对外暴露方法
    function getWeekTasks(weekStartDate, weekStartsOn = 1) {
        const weekDates = Utils.getWeekDates(weekStartDate, weekStartsOn);
        return DB.getAll('weeklyTasks').then(tasks => 
            tasks.filter(t => weekDates.includes(t.date))
        );
    }

    function resetWeekOffset() {
        currentWeekOffset = 0;
    }

    return {
        name,
        render,
        getWeekTasks,
        resetWeekOffset
    };
})();
