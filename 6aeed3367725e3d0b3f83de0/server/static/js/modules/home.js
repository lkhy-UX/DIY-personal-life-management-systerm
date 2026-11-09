/**
 * 首页总览模块
 */
const HomeModule = (function() {
    const name = '首页';

    async function render(container) {
        const today = Utils.formatDate(new Date());

        // 获取各项数据
        const [weeklyTasks, allTasks, infoCards, devProjects, starKnowledges, storageItems] = await Promise.all([
            DB.getAll('weeklyTasks'),
            DB.getAll('tasks'),
            DB.getAll('infoCards'),
            DB.getAll('devProjects'),
            DB.getAll('knowledgeItems'),
            DB.getAll('storageItems')
        ]);

        const todayTasks = allTasks.filter(t => t.date === today);
        const pendingTasks = todayTasks.filter(t => t.status !== 'completed');
        const importantCards = infoCards.filter(c => c.important);
        const starItems = starKnowledges.filter(k => k.starred);
        const devInProgress = devProjects.filter(p => p.status === 'developing');

        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-lg">👋 你好</div>
                <div class="text-muted text-sm">${today} ${getWeekDay()}</div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-bottom:20px;">
                <div class="card quick-stat" data-nav="tasks" style="padding:20px;cursor:pointer;">
                    <div class="stat-icon" style="font-size:28px;margin-bottom:8px;">✅</div>
                    <div class="stat-number" style="font-size:28px;font-weight:700;">${pendingTasks.length}</div>
                    <div class="stat-label text-sm text-muted">今日待办任务</div>
                </div>
                <div class="card quick-stat" data-nav="weekly" style="padding:20px;cursor:pointer;">
                    <div class="stat-icon" style="font-size:28px;margin-bottom:8px;">📅</div>
                    <div class="stat-number" style="font-size:28px;font-weight:700;">${weeklyTasks.length}</div>
                    <div class="stat-label text-sm text-muted">本周计划</div>
                </div>
                <div class="card quick-stat" data-nav="knowledge" style="padding:20px;cursor:pointer;">
                    <div class="stat-icon" style="font-size:28px;margin-bottom:8px;">⭐</div>
                    <div class="stat-number" style="font-size:28px;font-weight:700;">${starItems.length}</div>
                    <div class="stat-label text-sm text-muted">星标问题</div>
                </div>
                <div class="card quick-stat" data-nav="dev" style="padding:20px;cursor:pointer;">
                    <div class="stat-icon" style="font-size:28px;margin-bottom:8px;">💻</div>
                    <div class="stat-number" style="font-size:28px;font-weight:700;">${devInProgress.length}</div>
                    <div class="stat-label text-sm text-muted">进行中项目</div>
                </div>
                <div class="card quick-stat" data-nav="info" style="padding:20px;cursor:pointer;">
                    <div class="stat-icon" style="font-size:28px;margin-bottom:8px;">📋</div>
                    <div class="stat-number" style="font-size:28px;font-weight:700;">${importantCards.length}</div>
                    <div class="stat-label text-sm text-muted">重要信息</div>
                </div>
                <div class="card quick-stat" data-nav="storage" style="padding:20px;cursor:pointer;">
                    <div class="stat-icon" style="font-size:28px;margin-bottom:8px;">📦</div>
                    <div class="stat-number" style="font-size:28px;font-weight:700;">${storageItems.length}</div>
                    <div class="stat-label text-sm text-muted">收纳物品</div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="card">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border);">
                        <span style="font-weight:600;">📝 今日待办</span>
                        <button class="btn btn-outline btn-sm" data-nav="tasks">查看全部</button>
                    </div>
                    ${pendingTasks.length === 0 ? `
                        <div class="text-sm text-muted text-center" style="padding:20px 0;">暂无待办任务</div>
                    ` : `
                        <div>
                            ${pendingTasks.slice(0, 5).map(t => `
                                <div class="list-item" style="padding:8px 0;border-bottom:1px solid var(--border-light);display:flex;gap:8px;align-items:center;">
                                    <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escapeHtml(t.title)}</span>
                                    <span class="text-xs" style="padding:1px 6px;border-radius:8px;background:var(--bg-muted);color:var(--text-muted);">${t.priority === 'high' ? '高' : t.priority === 'medium' ? '中' : '低'}</span>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <div class="card">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border);">
                        <span style="font-weight:600;">⭐ 星标问题</span>
                        <button class="btn btn-outline btn-sm" data-nav="knowledge">查看全部</button>
                    </div>
                    ${starItems.length === 0 ? `
                        <div class="text-sm text-muted text-center" style="padding:20px 0;">暂无星标问题</div>
                    ` : `
                        <div>
                            ${starItems.slice(0, 5).map(k => `
                                <div class="list-item" style="padding:8px 0;border-bottom:1px solid var(--border-light);">
                                    <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">⭐ ${Utils.escapeHtml(k.title)}</div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        // 快捷入口点击
        container.querySelectorAll('.quick-stat[data-nav]').forEach(el => {
            el.onclick = () => {
                const nav = el.getAttribute('data-nav');
                if (window.location.hash.startsWith('#/app')) {
                    window.location.hash = `#/app/${nav}`;
                }
            };
        });

        container.querySelectorAll('button[data-nav]').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const nav = btn.getAttribute('data-nav');
                if (window.location.hash.startsWith('#/app')) {
                    window.location.hash = `#/app/${nav}`;
                }
            };
        });
    }

    function getWeekDay() {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return days[new Date().getDay()];
    }

    return {
        name,
        render
    };
})();
