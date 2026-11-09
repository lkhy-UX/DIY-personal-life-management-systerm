/**
 * 信息整理模块
 */
const InfoModule = (function() {
    const name = '信息整理';
    let currentView = 'cards'; // cards / mindmap
    let currentCategoryId = null;

    async function render(container) {
        const categories = await DB.getAll('infoCategories');
        categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-lg">📋 信息整理</div>
                <div class="flex gap-8">
                    <div class="tabs" style="margin-bottom:0;border:none;">
                        <div class="tab ${currentView === 'cards' ? 'active' : ''}" data-view="cards">卡片视图</div>
                        <div class="tab ${currentView === 'mindmap' ? 'active' : ''}" data-view="mindmap">思维导图</div>
                    </div>
                    <button class="btn btn-primary" id="infoAddBtn">+ 新建</button>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:200px 1fr;gap:16px;">
                <div class="card" style="padding:12px;align-self:start;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);">
                        <span style="font-weight:600;">分类</span>
                        <button class="btn btn-outline btn-sm" id="addInfoCatBtn" style="padding:2px 8px;font-size:12px;">+ 新建</button>
                    </div>
                    <div>
                        <div class="category-item ${currentCategoryId === null ? 'active' : ''}" data-id="" style="padding:8px 10px;border-radius:var(--radius);cursor:pointer;${currentCategoryId === null ? 'background:var(--bg-muted);color:var(--primary);' : ''}">
                            📂 全部
                        </div>
                        ${categories.map(c => `
                            <div class="category-item info-cat ${currentCategoryId === c.id ? 'active' : ''}" data-id="${c.id}" style="padding:8px 10px;border-radius:var(--radius);cursor:pointer;display:flex;justify-content:space-between;align-items:center;${currentCategoryId === c.id ? 'background:var(--bg-muted);color:var(--primary);' : ''}">
                                <span>${Utils.escapeHtml(c.name)}</span>
                                <div style="display:flex;gap:2px;">
                                    <button class="edit-info-cat" data-id="${c.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:12px;">✎</button>
                                    <button class="delete-info-cat" data-id="${c.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:12px;">✕</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div id="infoContent" class="card" style="min-height:500px;"></div>
            </div>
        `;

        // 视图切换
        container.querySelectorAll('.tab[data-view]').forEach(tab => {
            tab.onclick = () => {
                currentView = tab.getAttribute('data-view');
                render(container);
            };
        });

        // 分类点击
        container.querySelectorAll('.category-item[data-id]').forEach(el => {
            el.onclick = (e) => {
                if (e.target.classList.contains('edit-info-cat') || e.target.classList.contains('delete-info-cat')) return;
                const id = el.getAttribute('data-id');
                currentCategoryId = id ? parseInt(id) : null;
                render(container);
            };
        });

        // 新增分类
        document.getElementById('addInfoCatBtn').onclick = () => showCategoryModal();

        // 编辑分类
        container.querySelectorAll('.edit-info-cat').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-id'));
                const cat = await DB.get('infoCategories', id);
                showCategoryModal(cat);
            };
        });

        // 删除分类
        container.querySelectorAll('.delete-info-cat').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-id'));
                const confirmed = await Utils.confirm('确定删除这个分类吗？该分类下的卡片不会被删除。');
                if (confirmed) {
                    await DB.remove('infoCategories', id);
                    if (currentCategoryId === id) currentCategoryId = null;
                    Utils.toast('已删除', 'success');
                    render(container);
                }
            };
        });

        // 新增按钮
        document.getElementById('infoAddBtn').onclick = () => {
            if (currentView === 'cards') showCardModal();
            else showMindmapNodeModal();
        };

        const content = document.getElementById('infoContent');
        if (currentView === 'cards') await renderCardsView(content);
        else await renderMindmapView(content);
    }

    // ========== 卡片视图 ==========
    async function renderCardsView(container) {
        let cards = await DB.getAll('infoCards');
        if (currentCategoryId) {
            cards = cards.filter(c => c.categoryId === currentCategoryId);
        }
        cards.sort((a, b) => {
            if (a.important !== b.important) return b.important ? 1 : -1;
            return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        });

        if (cards.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:60px 0;">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-text">还没有信息卡片</div>
                    <div class="text-sm text-muted mt-8">点击右上角"+ 新建"添加信息卡片</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="padding:16px;display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:12px;">
                ${cards.map(card => renderCardItem(card)).join('')}
            </div>
        `;

        container.querySelectorAll('.info-card').forEach(el => {
            const id = parseInt(el.getAttribute('data-id'));
            el.onclick = async () => {
                const card = await DB.get('infoCards', id);
                showCardModal(card);
            };
        });
    }

    function renderCardItem(card) {
        return `
            <div class="info-card list-item" data-id="${card.id}" style="padding:14px;border:1px solid ${card.important ? 'var(--warning)' : 'var(--border)'};border-radius:var(--radius-md);cursor:pointer;background:var(--bg-card);">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
                    <div style="font-weight:600;flex:1;min-width:0;word-break:break-word;">${Utils.escapeHtml(card.title)}</div>
                    ${card.important ? '<span style="color:var(--warning);font-size:14px;flex-shrink:0;">⭐</span>' : ''}
                </div>
                ${card.summary ? `
                    <div class="text-sm text-muted" style="margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;line-height:1.5;word-break:break-word;">
                        ${Utils.escapeHtml(card.summary)}
                    </div>
                ` : ''}
                <div class="text-xs text-muted" style="border-top:1px solid var(--border-light);padding-top:8px;">
                    ${card.updatedAt ? card.updatedAt.slice(0, 10) : card.createdAt?.slice(0, 10) || ''}
                </div>
            </div>
        `;
    }

    function showCardModal(card) {
        const isEdit = !!card;
        const modal = Utils.showModal({
            title: isEdit ? '编辑信息卡片' : '新建信息卡片',
            size: 'large',
            content: `
                <div class="form-group">
                    <label class="form-label">标题</label>
                    <input type="text" class="form-input" id="cardTitle" value="${card ? Utils.escapeHtml(card.title) : ''}" placeholder="信息标题" />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">分类</label>
                        <select class="form-select" id="cardCategory">
                            <option value="">未分类</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">标签</label>
                        <input type="text" class="form-input" id="cardTags" value="${card?.tags || ''}" placeholder="用逗号分隔" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">重要</label>
                        <div style="display:flex;align-items:center;height:36px;">
                            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" id="cardImportant" ${card?.important ? 'checked' : ''} />
                                <span>⭐ 重要</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">摘要</label>
                    <input type="text" class="form-input" id="cardSummary" value="${card?.summary || ''}" placeholder="一句话概括" />
                </div>
                <div class="form-group">
                    <label class="form-label">详细内容</label>
                    <textarea class="form-textarea" id="cardContent" placeholder="详细信息内容..." style="min-height:200px;">${card?.content || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">链接 / 来源</label>
                    <input type="text" class="form-input" id="cardSource" value="${card?.source || ''}" placeholder="可选" />
                </div>
            `,
            footer: `
                <div style="display:flex;justify-content:space-between;">
                    ${isEdit ? `<button class="btn btn-danger btn-sm" id="deleteCardBtn">删除</button>` : '<span></span>'}
                    <div style="display:flex;gap:8px;">
                        <button class="btn" id="cancelCardBtn">取消</button>
                        <button class="btn btn-primary" id="saveCardBtn">${isEdit ? '保存' : '创建'}</button>
                    </div>
                </div>
            `,
            onMount: async () => {
                // 加载分类
                const categories = await DB.getAll('infoCategories');
                const select = document.getElementById('cardCategory');
                categories.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    if (card && card.categoryId === c.id) opt.selected = true;
                    select.appendChild(opt);
                });

                document.getElementById('cancelCardBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveCardBtn').onclick = async () => {
                    const title = document.getElementById('cardTitle').value.trim();
                    if (!title) {
                        Utils.toast('请输入标题', 'warning');
                        return;
                    }
                    const catVal = document.getElementById('cardCategory').value;
                    const data = {
                        title,
                        categoryId: catVal ? parseInt(catVal) : null,
                        tags: document.getElementById('cardTags').value,
                        important: document.getElementById('cardImportant').checked,
                        summary: document.getElementById('cardSummary').value,
                        content: document.getElementById('cardContent').value,
                        source: document.getElementById('cardSource').value,
                        updatedAt: new Date().toISOString()
                    };
                    if (isEdit) {
                        data.id = card.id;
                        data.createdAt = card.createdAt;
                        await DB.put('infoCards', data);
                        Utils.toast('已保存', 'success');
                    } else {
                        data.createdAt = new Date().toISOString();
                        await DB.add('infoCards', data);
                        Utils.toast('已创建', 'success');
                    }
                    Utils.closeModal(modal);
                    const content = document.getElementById('infoContent');
                    await renderCardsView(content);
                };

                if (isEdit) {
                    document.getElementById('deleteCardBtn').onclick = async () => {
                        const confirmed = await Utils.confirm('确定删除这个卡片吗？');
                        if (confirmed) {
                            await DB.remove('infoCards', card.id);
                            Utils.toast('已删除', 'success');
                            Utils.closeModal(modal);
                            const content = document.getElementById('infoContent');
                            await renderCardsView(content);
                        }
                    };
                }
            }
        });
    }

    function showCategoryModal(category) {
        const isEdit = !!category;
        const modal = Utils.showModal({
            title: isEdit ? '编辑分类' : '新建分类',
            content: `
                <div class="form-group">
                    <label class="form-label">分类名称</label>
                    <input type="text" class="form-input" id="infoCatName" value="${category ? Utils.escapeHtml(category.name) : ''}" />
                </div>
            `,
            footer: `
                <button class="btn" id="cancelInfoCatBtn">取消</button>
                <button class="btn btn-primary" id="saveInfoCatBtn">${isEdit ? '保存' : '创建'}</button>
            `,
            onMount: () => {
                document.getElementById('cancelInfoCatBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveInfoCatBtn').onclick = async () => {
                    const name = document.getElementById('infoCatName').value.trim();
                    if (!name) {
                        Utils.toast('请输入名称', 'warning');
                        return;
                    }
                    const data = { name, sortOrder: category ? category.sortOrder : Date.now() };
                    if (isEdit) {
                        data.id = category.id;
                        await DB.put('infoCategories', data);
                    } else {
                        await DB.add('infoCategories', data);
                    }
                    Utils.toast('已保存', 'success');
                    Utils.closeModal(modal);
                    const main = document.getElementById('mainContent');
                    render(main);
                };
            }
        });
    }

    // ========== 思维导图 ==========
    async function renderMindmapView(container) {
        const nodes = await DB.getAll('mindmapNodes');

        if (nodes.length === 0) {
            // 创建根节点
            const rootId = await DB.add('mindmapNodes', {
                text: '中心主题',
                x: 400,
                y: 250,
                parentId: null,
                color: '#3b82f6'
            });
            nodes.push({ id: rootId, text: '中心主题', x: 400, y: 250, parentId: null, color: '#3b82f6' });
        }

        const width = 800;
        const height = 500;

        // 构建节点映射
        const nodeMap = {};
        nodes.forEach(n => { nodeMap[n.id] = n; });

        // 生成连接线
        const lines = [];
        nodes.forEach(n => {
            if (n.parentId && nodeMap[n.parentId]) {
                const parent = nodeMap[n.parentId];
                lines.push({ x1: parent.x, y1: parent.y, x2: n.x, y2: n.y, color: n.color || '#94a3b8' });
            }
        });

        container.innerHTML = `
            <div style="position:relative;width:100%;height:500px;overflow:auto;">
                <svg id="mindmapSvg" width="${width}" height="${height}" style="background:var(--bg-muted);border-radius:var(--radius-md);">
                    ${lines.map(l => `
                        <line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${l.color}" stroke-width="2" />
                    `).join('')}
                    ${nodes.map(n => `
                        <g class="mindmap-node" data-id="${n.id}" style="cursor:move;">
                            <rect x="${n.x - 60}" y="${n.y - 18}" width="120" height="36" rx="18" fill="${n.color || '#3b82f6'}" />
                            <text x="${n.x}" y="${n.y + 4}" text-anchor="middle" fill="white" font-size="13" style="pointer-events:none;">${Utils.escapeHtml(n.text)}</text>
                        </g>
                    `).join('')}
                </svg>
                <div style="position:absolute;top:10px;right:10px;display:flex;gap:6px;">
                    <button class="btn btn-outline btn-sm" id="addMindmapBtn">+ 添加节点</button>
                </div>
            </div>
            <div class="text-sm text-muted" style="margin-top:8px;padding:0 4px;">
                💡 提示：思维导图为简化版。点击节点编辑内容，添加子节点构建层级结构。
            </div>
        `;

        // 节点点击编辑
        container.querySelectorAll('.mindmap-node').forEach(el => {
            const id = parseInt(el.getAttribute('data-id'));
            el.style.cursor = 'pointer';
            el.onclick = async () => {
                const node = await DB.get('mindmapNodes', id);
                showMindmapNodeModal(node);
            };
        });

        const addBtn = document.getElementById('addMindmapBtn');
        if (addBtn) {
            addBtn.onclick = () => showMindmapNodeModal();
        }
    }

    function showMindmapNodeModal(node) {
        const isEdit = !!node;
        const modal = Utils.showModal({
            title: isEdit ? '编辑节点' : '添加节点',
            content: `
                <div class="form-group">
                    <label class="form-label">节点文字</label>
                    <input type="text" class="form-input" id="mindmapText" value="${node ? Utils.escapeHtml(node.text) : ''}" />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">父节点</label>
                        <select class="form-select" id="mindmapParent">
                            <option value="">无（根节点）</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">颜色</label>
                        <input type="color" class="form-input" id="mindmapColor" value="${node?.color || '#3b82f6'}" style="height:36px;padding:2px;" />
                    </div>
                </div>
            `,
            footer: `
                <div style="display:flex;justify-content:space-between;">
                    ${isEdit && node?.parentId !== null ? `<button class="btn btn-danger btn-sm" id="deleteMindmapBtn">删除</button>` : '<span></span>'}
                    <div style="display:flex;gap:8px;">
                        <button class="btn" id="cancelMindmapBtn">取消</button>
                        <button class="btn btn-primary" id="saveMindmapBtn">${isEdit ? '保存' : '添加'}</button>
                    </div>
                </div>
            `,
            onMount: async () => {
                const allNodes = await DB.getAll('mindmapNodes');
                const parentSelect = document.getElementById('mindmapParent');
                allNodes.forEach(n => {
                    if (isEdit && n.id === node.id) return; // 不能选自己
                    const opt = document.createElement('option');
                    opt.value = n.id;
                    opt.textContent = n.text;
                    if (node && node.parentId === n.id) opt.selected = true;
                    parentSelect.appendChild(opt);
                });

                document.getElementById('cancelMindmapBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveMindmapBtn').onclick = async () => {
                    const text = document.getElementById('mindmapText').value.trim();
                    if (!text) {
                        Utils.toast('请输入节点文字', 'warning');
                        return;
                    }
                    const parentVal = document.getElementById('mindmapParent').value;
                    const parentId = parentVal ? parseInt(parentVal) : null;
                    const color = document.getElementById('mindmapColor').value;

                    // 计算位置
                    let x = 400, y = 250;
                    if (parentId) {
                        const parent = await DB.get('mindmapNodes', parentId);
                        if (parent) {
                            // 子节点放在父节点右下方
                            const siblings = allNodes.filter(n => n.parentId === parentId && (!isEdit || n.id !== node.id));
                            const count = siblings.length;
                            x = parent.x + 160;
                            y = parent.y + (count - 1) * 50;
                        }
                    }

                    const data = {
                        text,
                        parentId,
                        color,
                        x: isEdit ? node.x : x,
                        y: isEdit ? node.y : y
                    };

                    if (isEdit) {
                        data.id = node.id;
                        await DB.put('mindmapNodes', data);
                        Utils.toast('已保存', 'success');
                    } else {
                        await DB.add('mindmapNodes', data);
                        Utils.toast('已添加', 'success');
                    }
                    Utils.closeModal(modal);
                    const content = document.getElementById('infoContent');
                    await renderMindmapView(content);
                };

                if (isEdit && node?.parentId !== null) {
                    document.getElementById('deleteMindmapBtn').onclick = async () => {
                        const confirmed = await Utils.confirm('确定删除这个节点吗？子节点不会被删除。');
                        if (confirmed) {
                            await DB.remove('mindmapNodes', node.id);
                            Utils.toast('已删除', 'success');
                            Utils.closeModal(modal);
                            const content = document.getElementById('infoContent');
                            await renderMindmapView(content);
                        }
                    };
                }
            }
        });
    }

    async function getPendingCount() {
        const cards = await DB.getAll('infoCards');
        return cards.filter(c => c.important).length;
    }

    return {
        name,
        render,
        getPendingCount
    };
})();
