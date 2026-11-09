/**
 * 健康计划模块
 */
const HealthModule = (function() {
    const name = '健康计划';
    let currentTab = 'workouts';
    let weightRange = 30; // 体重趋势天数范围

    async function render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-lg">💪 健康计划</div>
                <button class="btn btn-primary" id="addBtn">+ 新增</button>
            </div>

            <div class="tabs">
                <div class="tab ${currentTab === 'workouts' ? 'active' : ''}" data-tab="workouts">运动记录</div>
                <div class="tab ${currentTab === 'weight' ? 'active' : ''}" data-tab="weight">体重趋势</div>
                <div class="tab ${currentTab === 'exercises' ? 'active' : ''}" data-tab="exercises">动作库</div>
                <div class="tab ${currentTab === 'goals' ? 'active' : ''}" data-tab="goals">目标</div>
            </div>

            <div id="healthContent"></div>
        `;

        // Tab 切换
        container.querySelectorAll('.tab').forEach(tab => {
            tab.onclick = () => {
                currentTab = tab.getAttribute('data-tab');
                render(container);
            };
        });

        // 新增按钮
        document.getElementById('addBtn').onclick = () => {
            if (currentTab === 'workouts') showWorkoutModal();
            else if (currentTab === 'weight') showWeightModal();
            else if (currentTab === 'exercises') showExerciseModal();
            else if (currentTab === 'goals') showGoalModal();
        };

        const content = document.getElementById('healthContent');
        if (currentTab === 'workouts') await renderWorkouts(content);
        else if (currentTab === 'weight') await renderWeight(content);
        else if (currentTab === 'exercises') await renderExercises(content);
        else if (currentTab === 'goals') await renderGoals(content);
    }

    // ========== 运动记录 ==========
    async function renderWorkouts(container) {
        const workouts = await DB.getAll('workouts');
        workouts.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (workouts.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="empty-state">
                        <div class="empty-state-icon">🏃</div>
                        <div class="empty-state-text">还没有运动记录</div>
                        <div class="text-sm text-muted mt-8">点击右上角"+ 新增"开始记录</div>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="card">
                <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;">
                    共 ${workouts.length} 条记录
                </div>
                <div>
                    ${workouts.map(w => renderWorkoutItem(w)).join('')}
                </div>
            </div>
        `;

        // 绑定事件
        container.querySelectorAll('.workout-item').forEach(el => {
            const id = parseInt(el.getAttribute('data-id'));
            el.querySelector('.edit-btn').onclick = async (e) => {
                e.stopPropagation();
                const workout = await DB.get('workouts', id);
                showWorkoutModal(workout);
            };
            el.querySelector('.delete-btn').onclick = async (e) => {
                e.stopPropagation();
                const confirmed = await Utils.confirm('确定删除这条运动记录吗？');
                if (confirmed) {
                    await DB.remove('workouts', id);
                    Utils.toast('已删除', 'success');
                    renderWorkouts(container);
                    window.dispatchEvent(new CustomEvent('dataChanged'));
                }
            };
        });
    }

    function renderWorkoutItem(workout) {
        const exercises = workout.exercises || [];
        return `
            <div class="workout-item list-item" data-id="${workout.id}" style="padding:12px 16px;border-bottom:1px solid var(--border-light);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div style="flex:1;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                            <span style="font-weight:600;">${Utils.escapeHtml(workout.type || '运动')}</span>
                            <span class="tag" style="font-size:11px;background:var(--bg-muted);">${workout.duration || 0}分钟</span>
                            <span class="text-sm text-muted">${workout.date}</span>
                        </div>
                        ${workout.notes ? `<div class="text-sm text-muted" style="margin-bottom:6px;">${Utils.escapeHtml(workout.notes)}</div>` : ''}
                        ${exercises.length > 0 ? `
                            <div style="font-size:12px;color:var(--text-muted);">
                                动作: ${exercises.map(e => Utils.escapeHtml(e.name)).join('、')}
                            </div>
                        ` : ''}
                    </div>
                    <div style="display:flex;gap:4px;">
                        <button class="edit-btn" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px;">✎</button>
                        <button class="delete-btn" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px;">✕</button>
                    </div>
                </div>
            </div>
        `;
    }

    function showWorkoutModal(workout) {
        const isEdit = !!workout;
        const exercises = workout?.exercises || [];
        let exerciseList = [...exercises];

        const modal = Utils.showModal({
            title: isEdit ? '编辑运动记录' : '新增运动记录',
            content: `
                <div class="form-group">
                    <label class="form-label">日期</label>
                    <input type="date" class="form-input" id="workoutDate" value="${workout ? workout.date : Utils.today()}" />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">运动类型</label>
                        <select class="form-select" id="workoutType">
                            <option value="力量训练" ${workout?.type === '力量训练' ? 'selected' : ''}>力量训练</option>
                            <option value="有氧运动" ${workout?.type === '有氧运动' ? 'selected' : ''}>有氧运动</option>
                            <option value="瑜伽" ${workout?.type === '瑜伽' ? 'selected' : ''}>瑜伽</option>
                            <option value="跑步" ${workout?.type === '跑步' ? 'selected' : ''}>跑步</option>
                            <option value="游泳" ${workout?.type === '游泳' ? 'selected' : ''}>游泳</option>
                            <option value="其他" ${workout?.type === '其他' ? 'selected' : ''}>其他</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">时长（分钟）</label>
                        <input type="number" class="form-input" id="workoutDuration" value="${workout?.duration || ''}" min="0" />
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">感受/备注</label>
                    <textarea class="form-textarea" id="workoutNotes" placeholder="可选">${workout?.notes || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">动作列表</label>
                    <div id="exerciseListContainer">
                        ${exerciseList.map((e, i) => renderExerciseRow(e, i)).join('')}
                    </div>
                    <button class="btn btn-outline btn-sm mt-8" id="addExerciseRowBtn">+ 添加动作</button>
                </div>
            `,
            footer: `
                <button class="btn" id="cancelWorkoutBtn">取消</button>
                <button class="btn btn-primary" id="saveWorkoutBtn">${isEdit ? '保存' : '创建'}</button>
            `,
            onMount: () => {
                function refreshExerciseList() {
                    document.getElementById('exerciseListContainer').innerHTML = 
                        exerciseList.map((e, i) => renderExerciseRow(e, i)).join('');
                    bindExerciseRowEvents();
                }

                function bindExerciseRowEvents() {
                    document.querySelectorAll('.exercise-row').forEach(row => {
                        const idx = parseInt(row.getAttribute('data-index'));
                        row.querySelector('.remove-exercise').onclick = () => {
                            exerciseList.splice(idx, 1);
                            refreshExerciseList();
                        };
                        row.querySelector('.ex-name').onchange = (e) => {
                            exerciseList[idx].name = e.target.value;
                        };
                        row.querySelector('.ex-sets').onchange = (e) => {
                            exerciseList[idx].sets = parseInt(e.target.value) || 0;
                        };
                        row.querySelector('.ex-reps').onchange = (e) => {
                            exerciseList[idx].reps = parseInt(e.target.value) || 0;
                        };
                        row.querySelector('.ex-rest').onchange = (e) => {
                            exerciseList[idx].rest = parseInt(e.target.value) || 0;
                        };
                    });
                }

                document.getElementById('addExerciseRowBtn').onclick = async () => {
                    // 从动作库选择
                    const allExercises = await DB.getAll('exercises');
                    if (allExercises.length > 0) {
                        const names = allExercises.map(e => e.name);
                        exerciseList.push({ name: names[0], sets: 3, reps: 10, rest: 60 });
                    } else {
                        exerciseList.push({ name: '新动作', sets: 3, reps: 10, rest: 60 });
                    }
                    refreshExerciseList();
                };

                bindExerciseRowEvents();

                document.getElementById('cancelWorkoutBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveWorkoutBtn').onclick = async () => {
                    const date = document.getElementById('workoutDate').value;
                    const type = document.getElementById('workoutType').value;
                    const duration = parseInt(document.getElementById('workoutDuration').value) || 0;
                    const notes = document.getElementById('workoutNotes').value;

                    if (!date) {
                        Utils.toast('请选择日期', 'warning');
                        return;
                    }

                    const data = {
                        date,
                        type,
                        duration,
                        notes,
                        exercises: exerciseList
                    };

                    if (isEdit) {
                        data.id = workout.id;
                        await DB.put('workouts', data);
                        Utils.toast('已保存', 'success');
                    } else {
                        await DB.add('workouts', data);
                        Utils.toast('已创建', 'success');
                    }

                    Utils.closeModal(modal);
                    const content = document.getElementById('healthContent');
                    await renderWorkouts(content);
                    window.dispatchEvent(new CustomEvent('dataChanged'));
                };
            }
        });
    }

    function renderExerciseRow(exercise, index) {
        return `
            <div class="exercise-row" data-index="${index}" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:8px;margin-bottom:8px;align-items:end;">
                <div>
                    <label class="form-label" style="font-size:12px;">动作名</label>
                    <input type="text" class="form-input ex-name" value="${Utils.escapeHtml(exercise.name || '')}" />
                </div>
                <div>
                    <label class="form-label" style="font-size:12px;">组数</label>
                    <input type="number" class="form-input ex-sets" value="${exercise.sets || 0}" min="0" />
                </div>
                <div>
                    <label class="form-label" style="font-size:12px;">次数</label>
                    <input type="number" class="form-input ex-reps" value="${exercise.reps || 0}" min="0" />
                </div>
                <div>
                    <label class="form-label" style="font-size:12px;">休息(秒)</label>
                    <input type="number" class="form-input ex-rest" value="${exercise.rest || 0}" min="0" />
                </div>
                <button class="btn btn-danger btn-sm remove-exercise" style="margin-bottom:0;">删</button>
            </div>
        `;
    }

    // ========== 体重趋势 ==========
    async function renderWeight(container) {
        const weights = await DB.getAll('weights');
        weights.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 按范围筛选
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - weightRange);
        const daysAgoStr = Utils.formatDate(daysAgo);
        const filtered = weights.filter(w => w.date >= daysAgoStr);

        container.innerHTML = `
            <div class="card" style="padding:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <div style="font-weight:600;">体重趋势</div>
                    <div class="tabs" style="gap:4px;">
                        <div class="tab ${weightRange === 7 ? 'active' : ''}" data-range="7" style="padding:4px 10px;font-size:12px;">7天</div>
                        <div class="tab ${weightRange === 30 ? 'active' : ''}" data-range="30" style="padding:4px 10px;font-size:12px;">30天</div>
                        <div class="tab ${weightRange === 90 ? 'active' : ''}" data-range="90" style="padding:4px 10px;font-size:12px;">90天</div>
                    </div>
                </div>

                <div id="weightChart" style="height:240px;margin-bottom:16px;">
                    ${renderWeightChart(filtered)}
                </div>

                <div style="display:flex;gap:16px;margin-bottom:16px;padding:12px;background:var(--bg-muted);border-radius:var(--radius);">
                    <div>
                        <div class="text-sm text-muted">最新体重</div>
                        <div style="font-size:20px;font-weight:600;color:var(--primary);">
                            ${weights.length > 0 ? weights[weights.length - 1].value.toFixed(1) : '--'} kg
                        </div>
                    </div>
                    <div>
                        <div class="text-sm text-muted">记录次数</div>
                        <div style="font-size:20px;font-weight:600;">${weights.length}</div>
                    </div>
                    ${filtered.length >= 2 ? `
                        <div>
                            <div class="text-sm text-muted">变化</div>
                            <div style="font-size:20px;font-weight:600;${filtered[filtered.length-1].value - filtered[0].value < 0 ? 'color:var(--success);' : 'color:var(--warning);'}">
                                ${(filtered[filtered.length-1].value - filtered[0].value).toFixed(1)} kg
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="card" style="margin-top:12px;">
                <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;">
                    记录列表
                </div>
                <div>
                    ${weights.length === 0 ? `
                        <div class="empty-state" style="padding:30px 0;">
                            <div class="empty-state-icon">⚖️</div>
                            <div class="empty-state-text">还没有体重记录</div>
                        </div>
                    ` : [...weights].reverse().map(w => `
                        <div class="list-item" data-id="${w.id}" style="padding:12px 16px;border-bottom:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <span style="font-weight:600;">${w.value.toFixed(1)} kg</span>
                                <span class="text-sm text-muted" style="margin-left:12px;">${w.date}</span>
                            </div>
                            <div style="display:flex;gap:4px;">
                                <button class="edit-btn" onclick="HealthModule._editWeight(${w.id})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px;">✎</button>
                                <button class="delete-btn" onclick="HealthModule._deleteWeight(${w.id})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px;">✕</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // 范围切换
        container.querySelectorAll('[data-range]').forEach(tab => {
            tab.onclick = () => {
                weightRange = parseInt(tab.getAttribute('data-range'));
                renderWeight(container);
            };
        });
    }

    function renderWeightChart(data) {
        if (data.length < 2) {
            return `
                <div style="height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-muted);">
                    至少需要2条记录才能显示趋势图
                </div>
            `;
        }

        const width = 600;
        const height = 200;
        const padding = { top: 20, right: 20, bottom: 30, left: 40 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        const values = data.map(d => d.value);
        const minVal = Math.min(...values) - 1;
        const maxVal = Math.max(...values) + 1;

        const points = data.map((d, i) => {
            const x = padding.left + (i / (data.length - 1)) * chartW;
            const y = padding.top + chartH - ((d.value - minVal) / (maxVal - minVal)) * chartH;
            return { x, y, value: d.value, date: d.date };
        });

        const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ',' + p.y).join(' ');
        const areaD = pathD + ` L${points[points.length-1].x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`;

        // Y轴刻度
        const yTicks = 4;
        const yLabels = [];
        for (let i = 0; i <= yTicks; i++) {
            const val = minVal + (maxVal - minVal) * (i / yTicks);
            const y = padding.top + chartH - (i / yTicks) * chartH;
            yLabels.push(`<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>
                <text x="${padding.left - 6}" y="${y + 4}" text-anchor="end" fill="#9ca3af" font-size="10">${val.toFixed(1)}</text>`);
        }

        // X轴标签
        const xLabelCount = Math.min(data.length, 6);
        const xLabels = [];
        for (let i = 0; i < xLabelCount; i++) {
            const idx = Math.floor(i * (data.length - 1) / (xLabelCount - 1 || 1));
            const p = points[idx];
            xLabels.push(`<text x="${p.x}" y="${height - 8}" text-anchor="middle" fill="#9ca3af" font-size="10">${p.date.slice(5)}</text>`);
        }

        return `
            <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:100%;">
                ${yLabels.join('')}
                <path d="${areaD}" fill="rgba(59, 130, 246, 0.1)"/>
                <path d="${pathD}" fill="none" stroke="#3b82f6" stroke-width="2"/>
                ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#fff" stroke="#3b82f6" stroke-width="2"/>`).join('')}
                ${xLabels.join('')}
            </svg>
        `;
    }

    function showWeightModal(weight) {
        const isEdit = !!weight;
        const modal = Utils.showModal({
            title: isEdit ? '编辑体重记录' : '新增体重记录',
            content: `
                <div class="form-group">
                    <label class="form-label">日期</label>
                    <input type="date" class="form-input" id="weightDate" value="${weight ? weight.date : Utils.today()}" />
                </div>
                <div class="form-group">
                    <label class="form-label">体重 (kg)</label>
                    <input type="number" step="0.1" class="form-input" id="weightValue" value="${weight ? weight.value : ''}" placeholder="例如: 68.5" />
                </div>
            `,
            footer: `
                <button class="btn" id="cancelWeightBtn">取消</button>
                <button class="btn btn-primary" id="saveWeightBtn">${isEdit ? '保存' : '创建'}</button>
            `,
            onMount: () => {
                document.getElementById('cancelWeightBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveWeightBtn').onclick = async () => {
                    const date = document.getElementById('weightDate').value;
                    const value = parseFloat(document.getElementById('weightValue').value);

                    if (!date || isNaN(value)) {
                        Utils.toast('请填写完整信息', 'warning');
                        return;
                    }

                    const data = { date, value };
                    if (isEdit) {
                        data.id = weight.id;
                        await DB.put('weights', data);
                        Utils.toast('已保存', 'success');
                    } else {
                        await DB.add('weights', data);
                        Utils.toast('已创建', 'success');
                    }

                    Utils.closeModal(modal);
                    const content = document.getElementById('healthContent');
                    await renderWeight(content);
                };
            }
        });
    }

    async function editWeight(id) {
        const weight = await DB.get('weights', id);
        showWeightModal(weight);
    }

    async function deleteWeight(id) {
        const confirmed = await Utils.confirm('确定删除这条体重记录吗？');
        if (confirmed) {
            await DB.remove('weights', id);
            Utils.toast('已删除', 'success');
            const content = document.getElementById('healthContent');
            await renderWeight(content);
        }
    }

    // ========== 动作库 ==========
    async function renderExercises(container) {
        const exercises = await DB.getAll('exercises');
        exercises.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        container.innerHTML = `
            <div class="card">
                <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;">
                    共 ${exercises.length} 个动作
                </div>
                ${exercises.length === 0 ? `
                    <div class="empty-state" style="padding:30px 0;">
                        <div class="empty-state-icon">🏋️</div>
                        <div class="empty-state-text">还没有动作</div>
                        <div class="text-sm text-muted mt-8">点击右上角"+ 新增"添加动作</div>
                    </div>
                ` : `
                    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:8px;padding:12px;">
                        ${exercises.map(e => `
                            <div class="list-item" data-id="${e.id}" style="padding:12px;border:1px solid var(--border);border-radius:var(--radius);">
                                <div style="display:flex;justify-content:space-between;align-items:start;">
                                    <div>
                                        <div style="font-weight:500;">${Utils.escapeHtml(e.name)}</div>
                                        ${e.target ? `<div class="text-sm text-muted" style="margin-top:4px;">${Utils.escapeHtml(e.target)}</div>` : ''}
                                        ${e.defaultSets ? `<div class="text-sm" style="margin-top:4px;">默认: ${e.defaultSets}组×${e.defaultReps || 10}次</div>` : ''}
                                    </div>
                                    <div style="display:flex;gap:4px;">
                                        <button class="edit-btn" onclick="HealthModule._editExercise(${e.id})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;">✎</button>
                                        <button class="delete-btn" onclick="HealthModule._deleteExercise(${e.id})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;">✕</button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    }

    function showExerciseModal(exercise) {
        const isEdit = !!exercise;
        const modal = Utils.showModal({
            title: isEdit ? '编辑动作' : '新增动作',
            content: `
                <div class="form-group">
                    <label class="form-label">动作名称</label>
                    <input type="text" class="form-input" id="exName" value="${exercise ? Utils.escapeHtml(exercise.name) : ''}" placeholder="例如: 卧推" />
                </div>
                <div class="form-group">
                    <label class="form-label">目标部位</label>
                    <input type="text" class="form-input" id="exTarget" value="${exercise?.target || ''}" placeholder="例如: 胸部" />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">默认组数</label>
                        <input type="number" class="form-input" id="exSets" value="${exercise?.defaultSets || 3}" min="1" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">默认次数</label>
                        <input type="number" class="form-input" id="exReps" value="${exercise?.defaultReps || 10}" min="1" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">休息(秒)</label>
                        <input type="number" class="form-input" id="exRest" value="${exercise?.defaultRest || 60}" min="0" />
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">备注</label>
                    <textarea class="form-textarea" id="exNotes" placeholder="动作要点、注意事项">${exercise?.notes || ''}</textarea>
                </div>
            `,
            footer: `
                <button class="btn" id="cancelExBtn">取消</button>
                <button class="btn btn-primary" id="saveExBtn">${isEdit ? '保存' : '创建'}</button>
            `,
            onMount: () => {
                document.getElementById('cancelExBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveExBtn').onclick = async () => {
                    const name = document.getElementById('exName').value.trim();
                    if (!name) {
                        Utils.toast('请输入动作名称', 'warning');
                        return;
                    }

                    const data = {
                        name,
                        target: document.getElementById('exTarget').value.trim(),
                        defaultSets: parseInt(document.getElementById('exSets').value) || 3,
                        defaultReps: parseInt(document.getElementById('exReps').value) || 10,
                        defaultRest: parseInt(document.getElementById('exRest').value) || 60,
                        notes: document.getElementById('exNotes').value,
                        sortOrder: exercise ? exercise.sortOrder : Date.now()
                    };

                    if (isEdit) {
                        data.id = exercise.id;
                        await DB.put('exercises', data);
                        Utils.toast('已保存', 'success');
                    } else {
                        await DB.add('exercises', data);
                        Utils.toast('已创建', 'success');
                    }

                    Utils.closeModal(modal);
                    const content = document.getElementById('healthContent');
                    await renderExercises(content);
                };
            }
        });
    }

    async function editExercise(id) {
        const exercise = await DB.get('exercises', id);
        showExerciseModal(exercise);
    }

    async function deleteExercise(id) {
        const confirmed = await Utils.confirm('确定删除这个动作吗？');
        if (confirmed) {
            await DB.remove('exercises', id);
            Utils.toast('已删除', 'success');
            const content = document.getElementById('healthContent');
            await renderExercises(content);
        }
    }

    // ========== 健康目标 ==========
    async function renderGoals(container) {
        const goalWeekly = await DB.get('healthGoals', 'weeklyWorkouts');
        const goalWeight = await DB.get('healthGoals', 'targetWeight');

        const weekCount = await getWeekWorkoutCount();
        const latestWeight = await getLatestWeight();

        container.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="card" style="padding:16px;">
                    <div style="font-weight:600;margin-bottom:12px;">🏃 每周运动目标</div>
                    <div style="font-size:32px;font-weight:700;color:var(--primary);margin-bottom:4px;">
                        ${weekCount} <span style="font-size:16px;font-weight:400;color:var(--text-muted);">/ ${goalWeekly?.value || 3} 次</span>
                    </div>
                    <div style="height:8px;background:var(--bg-muted);border-radius:4px;overflow:hidden;margin-bottom:12px;">
                        <div style="height:100%;width:${Math.min(100, weekCount / (goalWeekly?.value || 3) * 100)}%;background:var(--primary);border-radius:4px;"></div>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="HealthModule._editGoal('weeklyWorkouts')">修改目标</button>
                </div>

                <div class="card" style="padding:16px;">
                    <div style="font-weight:600;margin-bottom:12px;">⚖️ 体重目标</div>
                    <div style="font-size:32px;font-weight:700;color:var(--primary);margin-bottom:4px;">
                        ${latestWeight ? latestWeight.toFixed(1) : '--'} <span style="font-size:16px;font-weight:400;color:var(--text-muted);">/ ${goalWeight?.value || '--'} kg</span>
                    </div>
                    ${latestWeight && goalWeight ? `
                        <div class="text-sm" style="margin-bottom:12px;color:${latestWeight > goalWeight.value ? 'var(--warning)' : 'var(--success)'};">
                            距离目标还有 ${Math.abs(latestWeight - goalWeight.value).toFixed(1)} kg
                        </div>
                    ` : '<div style="margin-bottom:12px;height:20px;"></div>'}
                    <button class="btn btn-outline btn-sm" onclick="HealthModule._editGoal('targetWeight')">修改目标</button>
                </div>
            </div>
        `;
    }

    function showGoalModal(goalKey) {
        const labels = { weeklyWorkouts: '每周运动目标', targetWeight: '体重目标' };
        const units = { weeklyWorkouts: '次/周', targetWeight: 'kg' };

        const modal = Utils.showModal({
            title: '设置' + labels[goalKey],
            content: `
                <div class="form-group">
                    <label class="form-label">目标值 (${units[goalKey]})</label>
                    <input type="number" class="form-input" id="goalValue" step="${goalKey === 'targetWeight' ? '0.1' : '1'}" />
                </div>
            `,
            footer: `
                <button class="btn" id="cancelGoalBtn">取消</button>
                <button class="btn btn-primary" id="saveGoalBtn">保存</button>
            `,
            onMount: async () => {
                const existing = await DB.get('healthGoals', goalKey);
                if (existing) {
                    document.getElementById('goalValue').value = existing.value;
                }

                document.getElementById('cancelGoalBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveGoalBtn').onclick = async () => {
                    const value = parseFloat(document.getElementById('goalValue').value);
                    if (isNaN(value) || value <= 0) {
                        Utils.toast('请输入有效的目标值', 'warning');
                        return;
                    }

                    await DB.put('healthGoals', { key: goalKey, value });
                    Utils.toast('已保存', 'success');
                    Utils.closeModal(modal);
                    const content = document.getElementById('healthContent');
                    await renderGoals(content);
                };
            }
        });
    }

    // ========== 对外方法 ==========
    async function getWeekWorkoutCount() {
        const weekStartsOn = await SettingsModule.getSetting('weekStartsOn');
        const weekDates = Utils.getWeekDates(new Date(), weekStartsOn);
        const workouts = await DB.getAll('workouts');
        return workouts.filter(w => weekDates.includes(w.date)).length;
    }

    async function getLatestWeight() {
        const weights = await DB.getAll('weights');
        if (weights.length === 0) return null;
        weights.sort((a, b) => new Date(b.date) - new Date(a.date));
        return weights[0].value;
    }

    async function getPendingCount() {
        return 0; // 健康模块没有待处理提醒
    }

    return {
        name,
        render,
        getWeekWorkoutCount,
        getLatestWeight,
        getPendingCount,
        _editWeight: editWeight,
        _deleteWeight: deleteWeight,
        _editExercise: editExercise,
        _deleteExercise: deleteExercise,
        _editGoal: showGoalModal
    };
})();
