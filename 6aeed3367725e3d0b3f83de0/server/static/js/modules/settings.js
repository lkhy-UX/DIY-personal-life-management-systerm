/**
 * 设置模块
 */
const SettingsModule = (function() {
    const name = '数据与设置';

    // 默认设置
    const defaults = {
        themeColor: '#4B3FE3',
        weekStartsOn: 1, // 1=周一, 0=周日
        expiryReminderDays: 7,
        autoCarryOver: true
    };

    async function getSettings() {
        const settings = {};
        for (const [key, value] of Object.entries(defaults)) {
            const item = await DB.get('settings', key);
            settings[key] = item ? item.value : value;
        }
        return settings;
    }

    async function getSetting(key) {
        const item = await DB.get('settings', key);
        return item ? item.value : defaults[key];
    }

    async function setSetting(key, value) {
        await DB.put('settings', { key, value });
    }

    async function render(container) {
        const settings = await getSettings();
        const stats = await DB.getStats();

        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-lg">⚙️ 数据与设置</div>
            </div>

            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">偏好设置</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">每周第一天</label>
                        <select class="form-select" id="settingWeekStart">
                            <option value="1" ${settings.weekStartsOn === 1 ? 'selected' : ''}>周一</option>
                            <option value="0" ${settings.weekStartsOn === 0 ? 'selected' : ''}>周日</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">保质期提醒提前天数</label>
                        <input type="number" class="form-input" id="settingExpiryDays" value="${settings.expiryReminderDays}" min="1" max="30" />
                    </div>
                    <div class="form-group">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                            <input type="checkbox" id="settingAutoCarryOver" ${settings.autoCarryOver ? 'checked' : ''} />
                            <span>未完成任务自动顺延到下一天</span>
                        </label>
                    </div>
                    <button class="btn btn-primary" id="saveSettingsBtn">保存设置</button>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">数据管理</div>
                    </div>
                    <div style="margin-bottom:16px;">
                        <div class="text-muted text-sm mb-8">导出所有数据为 JSON 文件，保存到本地作为备份</div>
                        <button class="btn" id="exportBtn">📤 导出备份</button>
                    </div>
                    <div style="margin-bottom:16px;">
                        <div class="text-muted text-sm mb-8">从备份文件恢复数据（将覆盖当前所有数据）</div>
                        <button class="btn" id="importBtn">📥 导入恢复</button>
                        <input type="file" id="importFile" accept=".json" style="display:none" />
                    </div>
                    <div>
                        <div class="text-muted text-sm mb-8">清空所有数据（不可恢复，请谨慎操作）</div>
                        <button class="btn btn-danger" id="clearDataBtn">🗑 清空所有数据</button>
                    </div>
                </div>
            </div>

            <div class="card mt-16">
                <div class="card-header">
                    <div class="card-title">数据统计</div>
                </div>
                <div class="grid-4">
                    ${Object.entries(stats).map(([name, count]) => `
                        <div style="text-align:center;padding:12px;background:var(--bg-muted);border-radius:var(--radius);">
                            <div style="font-size:24px;font-weight:600;color:var(--primary);">${count}</div>
                            <div class="text-sm text-muted mt-8">${storeNameToLabel(name)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // 绑定事件
        document.getElementById('saveSettingsBtn').onclick = async () => {
            await setSetting('weekStartsOn', parseInt(document.getElementById('settingWeekStart').value));
            await setSetting('expiryReminderDays', parseInt(document.getElementById('settingExpiryDays').value));
            await setSetting('autoCarryOver', document.getElementById('settingAutoCarryOver').checked);
            Utils.toast('设置已保存', 'success');
            window.dispatchEvent(new CustomEvent('settingsChanged'));
        };

        document.getElementById('exportBtn').onclick = async () => {
            try {
                const data = await DB.exportAll();
                const now = new Date();
                const filename = `personal-app-backup-${Utils.formatDate(now)}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}.json`;
                Utils.downloadFile(JSON.stringify(data, null, 2), filename);
                Utils.toast('备份导出成功', 'success');
            } catch (e) {
                Utils.toast('导出失败: ' + e.message, 'error');
            }
        };

        document.getElementById('importBtn').onclick = () => {
            document.getElementById('importFile').click();
        };

        document.getElementById('importFile').onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const confirmed = await Utils.confirm('导入将覆盖当前所有数据，是否继续？', '确认导入');
            if (!confirmed) {
                e.target.value = '';
                return;
            }

            try {
                const content = await Utils.readFile(file);
                const data = JSON.parse(content);
                await DB.importAll(data);
                Utils.toast('数据导入成功', 'success');
                // 重新渲染
                render(container);
                // 触发数据变化事件
                window.dispatchEvent(new CustomEvent('dataChanged'));
            } catch (err) {
                Utils.toast('导入失败: ' + err.message, 'error');
            }
            e.target.value = '';
        };

        document.getElementById('clearDataBtn').onclick = async () => {
            const confirmed = await Utils.confirm('确定要清空所有数据吗？此操作不可恢复！', '确认清空');
            if (!confirmed) return;

            const confirmed2 = await Utils.confirm('再次确认：真的要删除所有数据吗？', '再次确认');
            if (!confirmed2) return;

            try {
                await DB.clearAll();
                Utils.toast('数据已清空', 'success');
                render(container);
                window.dispatchEvent(new CustomEvent('dataChanged'));
            } catch (e) {
                Utils.toast('清空失败: ' + e.message, 'error');
            }
        };
    }

    function storeNameToLabel(name) {
        const labels = {
            settings: '设置',
            weeklyTasks: '每周任务',
            tasks: '任务汇总',
            workouts: '运动记录',
            weights: '体重记录',
            exercises: '动作库',
            healthGoals: '健康目标',
            dietRecords: '饮食记录',
            shoppingList: '买菜清单',
            recipes: '菜谱',
            foods: '食品库',
            knowledgeCategories: '知识分类',
            knowledgeItems: '知识条目',
            infoCategories: '信息分类',
            infoCards: '信息卡片',
            mindmapNodes: '导图节点',
            devProjects: '开发项目',
            devItems: '开发条目',
            devLogs: '开发日志',
            devNotes: '技术笔记',
            devNextActions: '下一步行动',
            itemGuides: '物品说明',
            storageItems: '收纳物品'
        };
        return labels[name] || name;
    }

    return {
        name,
        render,
        getSettings,
        getSetting,
        setSetting
    };
})();
