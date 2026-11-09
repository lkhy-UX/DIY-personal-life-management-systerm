/**
 * 主应用入口
 */
const App = (function() {

    // 导航配置
    const navConfig = [
        {
            group: '总览',
            items: [
                { route: 'home', icon: '🏠', label: '首页总览', module: HomeModule }
            ]
        },
        {
            group: '计划与任务',
            items: [
                { route: 'weekly', icon: '📅', label: '每周计划', module: WeeklyModule },
                { route: 'tasks', icon: '✅', label: '任务汇总', module: TasksModule, badgeKey: 'tasks' }
            ]
        },
        {
            group: '生活管理',
            items: [
                { route: 'health', icon: '💪', label: '健康计划', module: HealthModule },
                { route: 'diet', icon: '🥗', label: '饮食计划', module: DietModule },
                { route: 'items', icon: '📦', label: '物品使用说明', module: ItemsModule, badgeKey: 'items' },
                { route: 'storage', icon: '🗄️', label: '物品收纳', module: StorageModule }
            ]
        },
        {
            group: '知识与工作',
            items: [
                { route: 'knowledge', icon: '🧠', label: '问题思考', module: KnowledgeModule },
                { route: 'info', icon: '📋', label: '信息整理', module: InfoModule },
                { route: 'dev', icon: '💻', label: '开发工作', module: DevModule, badgeKey: 'dev' }
            ]
        },
        {
            group: '系统',
            items: [
                { route: 'settings', icon: '⚙️', label: '数据与设置', module: SettingsModule }
            ]
        }
    ];

    /**
     * 渲染侧边栏
     */
    function renderSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = navConfig.map(group => `
            <div class="nav-group">
                <div class="nav-group-label">${group.group}</div>
                ${group.items.map(item => `
                    <div class="nav-item" data-route="${item.route}">
                        <span class="nav-icon">${item.icon}</span>
                        <span class="nav-label">${item.label}</span>
                        ${item.badgeKey ? `<span class="nav-badge" data-badge="${item.badgeKey}" style="display:none;">0</span>` : ''}
                    </div>
                `).join('')}
            </div>
        `).join('');

        // 绑定导航点击事件
        sidebar.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = () => {
                const route = item.getAttribute('data-route');
                Router.navigate(route);
            };
        });
    }

    /**
     * 更新导航角标
     */
    async function updateBadges() {
        const badges = {
            tasks: await TasksModule.getPendingCount(),
            dev: await DevModule.getPendingCount(),
            items: await ItemsModule.getPendingCount()
        };

        document.querySelectorAll('.nav-badge').forEach(badge => {
            const key = badge.getAttribute('data-badge');
            const count = badges[key] || 0;
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        });

        // 顶部提醒总数
        const total = Object.values(badges).reduce((a, b) => a + b, 0);
        const reminderBadge = document.getElementById('reminderBadge');
        if (reminderBadge) {
            if (total > 0) {
                reminderBadge.textContent = total > 99 ? '99+' : total;
                reminderBadge.style.display = 'flex';
            } else {
                reminderBadge.style.display = 'none';
            }
        }
    }

    /**
     * 注册所有路由
     */
    function registerRoutes() {
        navConfig.forEach(group => {
            group.items.forEach(item => {
                Router.register(item.route, item.module);
            });
        });
    }

    /**
     * 绑定顶部工具栏事件
     */
    function bindTopbarEvents() {
        // 快速备忘
        const quickMemoInput = document.getElementById('quickMemoInput');
        if (quickMemoInput) {
            quickMemoInput.onkeydown = async (e) => {
                if (e.key === 'Enter' && quickMemoInput.value.trim()) {
                    await TasksModule.addQuickMemo(quickMemoInput.value.trim());
                    quickMemoInput.value = '';
                    Utils.toast('已保存到任务汇总', 'success');
                    updateBadges();
                    // 如果当前在任务汇总或首页，刷新
                    if (Router.getCurrent() === 'tasks' || Router.getCurrent() === 'home') {
                        const content = document.getElementById('mainContent');
                        const module = navConfig.flatMap(g => g.items).find(i => i.route === Router.getCurrent())?.module;
                        if (module) module.render(content);
                    }
                }
            };
        }

        // 设置按钮
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.onclick = () => Router.navigate('settings');
        }

        // 提醒按钮
        const reminderBtn = document.getElementById('reminderBtn');
        if (reminderBtn) {
            reminderBtn.onclick = () => {
                // 跳转到任务汇总或者物品说明
                Router.navigate('tasks');
            };
        }
    }

    /**
     * 初始化应用
     */
    async function init() {
        try {
            // 初始化数据库
            await DB.init();

            // 渲染侧边栏
            renderSidebar();

            // 注册路由
            registerRoutes();

            // 绑定顶部工具栏
            bindTopbarEvents();

            // 初始化路由
            Router.init();

            // 更新角标
            updateBadges();

            // 监听数据变化，更新角标
            window.addEventListener('dataChanged', () => {
                updateBadges();
            });

            // 监听设置变化
            window.addEventListener('settingsChanged', () => {
                // 重新渲染当前页面
                const currentRoute = Router.getCurrent();
                const content = document.getElementById('mainContent');
                const module = navConfig.flatMap(g => g.items).find(i => i.route === currentRoute)?.module;
                if (module && content) module.render(content);
            });

            console.log('App initialized successfully');
            window.dispatchEvent(new CustomEvent('appReady'));

        } catch (error) {
            console.error('Failed to initialize app:', error);
            Utils.toast('初始化失败: ' + error.message, 'error');
        }
    }

    return {
        init,
        updateBadges,
        navConfig
    };
})();

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
} else {
    App.init();
}
