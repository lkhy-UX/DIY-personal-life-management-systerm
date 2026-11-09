/**
 * 问题思考模块（知识库）
 */
const KnowledgeModule = (function() {
    const name = '问题思考';
    let currentCategoryId = null; // null = 全部
    let searchKeyword = '';

    async function render(container) {
        const categories = await DB.getAll('knowledgeCategories');
        categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        const allItems = await DB.getAll('knowledgeItems');
        let items = allItems;

        // 分类筛选
        if (currentCategoryId) {
            items = items.filter(i => i.categoryId === currentCategoryId);
        }

        // 搜索筛选
        if (searchKeyword) {
            const kw = searchKeyword.toLowerCase();
            items = items.filter(i =>
                i.title.toLowerCase().includes(kw) ||
                (i.content && i.content.toLowerCase().includes(kw))
            );
        }

        // 排序：星标在前，然后按更新时间倒序
        items.sort((a, b) => {
            if (a.starred !== b.starred) return b.starred ? 1 : -1;
            return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        });

        // 预计算每个分类的数量
        const isShowingAll = !searchKeyword && !currentCategoryId;
        const catCounts = {};
        categories.forEach(c => {
            catCounts[c.id] = allItems.filter(i => i.categoryId === c.id).length;
        });

        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-lg">🧠 问题思考</div>
                <div class="flex gap-8">
                    <input type="text" class="form-input" id="knowledgeSearch" placeholder="搜索问题..." style="width:220px;" value="${Utils.escapeHtml(searchKeyword)}" />
                    <button class="btn btn-primary" id="addKnowledgeBtn">+ 新问题</button>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:220px 1fr;gap:16px;">
                <div class="card" style="padding:12px;align-self:start;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);">
                        <span style="font-weight:600;">分类</span>
                        <button class="btn btn-outline btn-sm" id="addCategoryBtn" style="padding:2px 8px;font-size:12px;">+ 新建</button>
                    </div>
                    <div>
                        <div class="category-item ${currentCategoryId === null ? 'active' : ''}" data-id="" style="padding:8px 10px;border-radius:var(--radius);cursor:pointer;${currentCategoryId === null ? 'background:var(--bg-muted);color:var(--primary);' : ''}">
                            📁 全部问题 <span style="float:right;color:var(--text-muted);font-size:12px;">${allItems.length}</span>
                        </div>
                        ${categories.map(c => `
                            <div class="category-item ${currentCategoryId === c.id ? 'active' : ''}" data-id="${c.id}" style="padding:8px 10px;border-radius:var(--radius);cursor:pointer;display:flex;justify-content:space-between;align-items:center;${currentCategoryId === c.id ? 'background:var(--bg-muted);color:var(--primary);' : ''}">
                                <span>${Utils.escapeHtml(c.name)}</span>
                                <div style="display:flex;align-items:center;gap:4px;">
                                    ${isShowingAll ? `<span style="font-size:12px;color:var(--text-muted);">${catCounts[c.id] || 0}</span>` : ''}
                                    <button class="edit-cat-btn" data-id="${c.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:12px;padding:0 2px;">✎</button>
                                    <button class="delete-cat-btn" data-id="${c.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:12px;padding:0 2px;">✕</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="card">
                    ${items.length === 0 ? `
                        <div class="empty-state" style="padding:40px 0;">
                            <div class="empty-state-icon">🧠</div>
                            <div class="empty-state-text">还没有问题记录</div>
                            <div class="text-sm text-muted mt-8">点击右上角"+ 新问题"开始记录</div>
                        </div>
                    ` : `
                        <div>
                            ${items.map(item => renderKnowledgeItem(item, categories)).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        // 搜索
        const searchInput = document.getElementById('knowledgeSearch');
        searchInput.oninput = Utils.debounce(() => {
            searchKeyword = searchInput.value.trim();
            render(container);
        }, 300);

        // 新增问题
        document.getElementById('addKnowledgeBtn').onclick = () => showItemModal();

        // 分类点击
        container.querySelectorAll('.category-item').forEach(el => {
            el.onclick = (e) => {
                if (e.target.classList.contains('edit-cat-btn') || e.target.classList.contains('delete-cat-btn')) {
                    return;
                }
                const id = el.getAttribute('data-id');
                currentCategoryId = id ? parseInt(id) : null;
                render(container);
            };
        });

        // 新建分类
        document.getElementById('addCategoryBtn').onclick = () => showCategoryModal();

        // 编辑分类
        container.querySelectorAll('.edit-cat-btn').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-id'));
                const cat = await DB.get('knowledgeCategories', id);
                showCategoryModal(cat);
            };
        });

        // 删除分类
        container.querySelectorAll('.delete-cat-btn').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-id'));
                const confirmed = await Utils.confirm('确定删除这个分类吗？该分类下的问题不会被删除。');
                if (confirmed) {
                    await DB.remove('knowledgeCategories', id);
                    if (currentCategoryId === id) currentCategoryId = null;
                    Utils.toast('已删除', 'success');
                    render(container);
                }
            };
        });

        // 问题项事件
        container.querySelectorAll('.knowledge-item').forEach(el => {
            const id = parseInt(el.getAttribute('data-id'));
            el.onclick = async () => {
                const item = await DB.get('knowledgeItems', id);
                showItemModal(item);
            };
            // 星标点击
            const starBtn = el.querySelector('.star-btn');
            if (starBtn) {
                starBtn.onclick = async (e) => {
                    e.stopPropagation();
                    const item = await DB.get('knowledgeItems', id);
                    item.starred = !item.starred;
                    item.updatedAt = new Date().toISOString();
                    await DB.put('knowledgeItems', item);
                    render(container);
                };
            }
        });
    }

    function renderKnowledgeItem(item, categories) {
        const cat = categories.find(c => c.id === item.categoryId);
        const date = item.updatedAt || item.createdAt;
        const dateStr = date ? date.slice(0, 10) : '';

        return `
            <div class="knowledge-item list-item" data-id="${item.id}" style="padding:14px 16px;border-bottom:1px solid var(--border-light);cursor:pointer;">
                <div style="display:flex;gap:10px;align-items:flex-start;">
                    <button class="star-btn" style="background:none;border:none;cursor:pointer;font-size:16px;padding:0;flex-shrink:0;">
                        ${item.starred ? '⭐' : '☆'}
                    </button>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                            <span style="font-weight:500;">${Utils.escapeHtml(item.title)}</span>
                            ${cat ? `<span class="tag" style="font-size:11px;">${Utils.escapeHtml(cat.name)}</span>` : ''}
                            <span class="tag ${item.status === 'solved' ? 'tag-success' : 'tag-warning'}" style="font-size:11px;">
                                ${item.status === 'solved' ? '已解决' : '思考中'}
                            </span>
                        </div>
                        ${item.content ? `
                            <div class="text-sm text-muted" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.5;">
                                ${Utils.escapeHtml(item.content)}
                            </div>
                        ` : ''}
                        <div class="text-xs text-muted" style="margin-top:6px;">${dateStr}</div>
                    </div>
                </div>
            </div>
        `;
    }

    function showItemModal(item) {
        const isEdit = !!item;
        const modal = Utils.showModal({
            title: isEdit ? '编辑问题' : '新问题',
            size: 'large',
            content: `
                <div class="form-group">
                    <label class="form-label">问题标题</label>
                    <input type="text" class="form-input" id="kItemTitle" value="${item ? Utils.escapeHtml(item.title) : ''}" placeholder="一句话描述问题" />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">分类</label>
                        <select class="form-select" id="kItemCategory">
                            <option value="">未分类</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">状态</label>
                        <select class="form-select" id="kItemStatus">
                            <option value="thinking" ${item?.status === 'thinking' ? 'selected' : ''}>思考中</option>
                            <option value="solved" ${item?.status === 'solved' ? 'selected' : ''}>已解决</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">重要性</label>
                        <div style="display:flex;align-items:center;height:36px;">
                            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" id="kItemStarred" ${item?.starred ? 'checked' : ''} />
                                <span>⭐ 星标</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">思考过程/解决方案</label>
                    <textarea class="form-textarea" id="kItemContent" placeholder="详细记录思考过程、分析思路、解决方案..." style="min-height:200px;">${item?.content || ''}</textarea>
                </div>
            `,
            footer: `
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    ${isEdit ? `<button class="btn btn-danger btn-sm" id="deleteItemBtn">删除</button>` : '<span></span>'}
                    <div style="display:flex;gap:8px;">
                        <button class="btn" id="cancelItemBtn">取消</button>
                        <button class="btn btn-primary" id="saveItemBtn">${isEdit ? '保存' : '创建'}</button>
                    </div>
                </div>
            `,
            onMount: async () => {
                // 加载分类选项
                const categories = await DB.getAll('knowledgeCategories');
                categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
                const select = document.getElementById('kItemCategory');
                categories.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    if (item && item.categoryId === c.id) opt.selected = true;
                    select.appendChild(opt);
                });

                document.getElementById('cancelItemBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveItemBtn').onclick = async () => {
                    const title = document.getElementById('kItemTitle').value.trim();
                    if (!title) {
                        Utils.toast('请输入问题标题', 'warning');
                        return;
                    }
                    const catVal = document.getElementById('kItemCategory').value;
                    const data = {
                        title,
                        categoryId: catVal ? parseInt(catVal) : null,
                        status: document.getElementById('kItemStatus').value,
                        starred: document.getElementById('kItemStarred').checked,
                        content: document.getElementById('kItemContent').value,
                        updatedAt: new Date().toISOString()
                    };
                    if (isEdit) {
                        data.id = item.id;
                        data.createdAt = item.createdAt;
                        await DB.put('knowledgeItems', data);
                        Utils.toast('已保存', 'success');
                    } else {
                        data.createdAt = new Date().toISOString();
                        await DB.add('knowledgeItems', data);
                        Utils.toast('已创建', 'success');
                    }
                    Utils.closeModal(modal);
                    const content = document.getElementById('mainContent');
                    render(content);
                };

                if (isEdit) {
                    document.getElementById('deleteItemBtn').onclick = async () => {
                        const confirmed = await Utils.confirm('确定删除这个问题吗？');
                        if (confirmed) {
                            await DB.remove('knowledgeItems', item.id);
                            Utils.toast('已删除', 'success');
                            Utils.closeModal(modal);
                            const content = document.getElementById('mainContent');
                            render(content);
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
                    <input type="text" class="form-input" id="catName" value="${category ? Utils.escapeHtml(category.name) : ''}" placeholder="例如: 技术问题" />
                </div>
                <div class="form-group">
                    <label class="form-label">图标（emoji）</label>
                    <input type="text" class="form-input" id="catIcon" value="${category?.icon || ''}" placeholder="例如: 💻" maxlength="4" />
                </div>
            `,
            footer: `
                <button class="btn" id="cancelCatBtn">取消</button>
                <button class="btn btn-primary" id="saveCatBtn">${isEdit ? '保存' : '创建'}</button>
            `,
            onMount: () => {
                document.getElementById('cancelCatBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveCatBtn').onclick = async () => {
                    const name = document.getElementById('catName').value.trim();
                    if (!name) {
                        Utils.toast('请输入分类名称', 'warning');
                        return;
                    }
                    const data = {
                        name,
                        icon: document.getElementById('catIcon').value,
                        sortOrder: category ? category.sortOrder : Date.now()
                    };
                    if (isEdit) {
                        data.id = category.id;
                        await DB.put('knowledgeCategories', data);
                        Utils.toast('已保存', 'success');
                    } else {
                        await DB.add('knowledgeCategories', data);
                        Utils.toast('已创建', 'success');
                    }
                    Utils.closeModal(modal);
                    const content = document.getElementById('mainContent');
                    render(content);
                };
            }
        });
    }

    async function getPendingCount() {
        const items = await DB.getAll('knowledgeItems');
        return items.filter(i => i.starred).length;
    }

    return {
        name,
        render,
        getPendingCount
    };
})();
