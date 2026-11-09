/**
 * 物品使用说明模块
 */
const ItemsModule = (function() {
    const name = '物品使用说明';
    let currentCategoryId = null;
    let searchKeyword = '';

    async function render(container) {
        const categories = await DB.getAll('storageCategories');
        categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        let items = await DB.getAll('itemGuides');
        if (currentCategoryId) {
            items = items.filter(i => i.categoryId === currentCategoryId);
        }
        if (searchKeyword) {
            const kw = searchKeyword.toLowerCase();
            items = items.filter(i =>
                i.name.toLowerCase().includes(kw) ||
                (i.content && i.content.toLowerCase().includes(kw))
            );
        }
        items.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-lg">📖 物品使用说明</div>
                <div class="flex gap-8">
                    <input type="text" class="form-input" id="guideSearch" placeholder="搜索物品..." style="width:200px;" value="${Utils.escapeHtml(searchKeyword)}" />
                    <button class="btn btn-primary" id="addGuideBtn">+ 新增物品</button>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:200px 1fr;gap:16px;">
                <div class="card" style="padding:12px;align-self:start;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);">
                        <span style="font-weight:600;">分类</span>
                        <button class="btn btn-outline btn-sm" id="addGuideCatBtn" style="padding:2px 8px;font-size:12px;">+ 新建</button>
                    </div>
                    <div>
                        <div class="category-item ${currentCategoryId === null ? 'active' : ''}" data-id="" style="padding:8px 10px;border-radius:var(--radius);cursor:pointer;${currentCategoryId === null ? 'background:var(--bg-muted);color:var(--primary);' : ''}">
                            📦 全部物品
                        </div>
                        ${categories.map(c => `
                            <div class="category-item" data-id="${c.id}" style="padding:8px 10px;border-radius:var(--radius);cursor:pointer;${currentCategoryId === c.id ? 'background:var(--bg-muted);color:var(--primary);' : ''}">
                                ${Utils.escapeHtml(c.name)}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="card">
                    ${items.length === 0 ? `
                        <div class="empty-state" style="padding:60px 0;">
                            <div class="empty-state-icon">📖</div>
                            <div class="empty-state-text">还没有物品记录</div>
                            <div class="text-sm text-muted mt-8">记录家电、数码、工具等的使用说明和保修信息</div>
                        </div>
                    ` : `
                        <div style="padding:16px;">
                            ${items.map(item => renderGuideItem(item, categories)).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        // 搜索
        const searchInput = document.getElementById('guideSearch');
        searchInput.oninput = Utils.debounce(() => {
            searchKeyword = searchInput.value;
            render(container);
        }, 300);

        // 分类点击
        container.querySelectorAll('.category-item[data-id]').forEach(el => {
            el.onclick = () => {
                const id = el.getAttribute('data-id');
                currentCategoryId = id ? parseInt(id) : null;
                render(container);
            };
        });

        // 新增分类
        document.getElementById('addGuideCatBtn').onclick = () => showCategoryModal();

        // 新增物品
        document.getElementById('addGuideBtn').onclick = () => showGuideModal();

        // 物品点击编辑
        container.querySelectorAll('.guide-item').forEach(el => {
            el.onclick = async () => {
                const id = parseInt(el.getAttribute('data-id'));
                const item = await DB.get('itemGuides', id);
                showGuideModal(item);
            };
        });
    }

    function renderGuideItem(item, categories) {
        const cat = categories.find(c => c.id === item.categoryId);
        return `
            <div class="guide-item list-item" data-id="${item.id}" style="padding:14px;margin-bottom:8px;border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer;">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;">
                    <div style="font-weight:600;">${Utils.escapeHtml(item.name)}</div>
                    ${cat ? `<span class="text-xs" style="padding:2px 8px;border-radius:12px;background:var(--bg-muted);">${Utils.escapeHtml(cat.name)}</span>` : ''}
                </div>
                ${item.brand ? `<div class="text-sm text-muted" style="margin-bottom:4px;">品牌：${Utils.escapeHtml(item.brand)}</div>` : ''}
                ${item.model ? `<div class="text-sm text-muted" style="margin-bottom:4px;">型号：${Utils.escapeHtml(item.model)}</div>` : ''}
                ${item.warrantyExpire ? `
                    <div class="text-sm" style="color:${new Date(item.warrantyExpire) < new Date() ? 'var(--danger)' : 'var(--success)'};">
                        🛡 保修至 ${item.warrantyExpire.slice(0, 10)}
                    </div>
                ` : ''}
                ${item.purchaseDate ? `<div class="text-xs text-muted mt-4">📅 购买于 ${item.purchaseDate.slice(0, 10)}</div>` : ''}
            </div>
        `;
    }

    function showCategoryModal(category) {
        const isEdit = !!category;
        const modal = Utils.showModal({
            title: isEdit ? '编辑分类' : '新建分类',
            content: `
                <div class="form-group">
                    <label class="form-label">分类名称</label>
                    <input type="text" class="form-input" id="guideCatName" value="${category ? Utils.escapeHtml(category.name) : ''}" />
                </div>
            `,
            footer: `
                <button class="btn" id="cancelGuideCatBtn">取消</button>
                <button class="btn btn-primary" id="saveGuideCatBtn">${isEdit ? '保存' : '创建'}</button>
            `,
            onMount: () => {
                document.getElementById('cancelGuideCatBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveGuideCatBtn').onclick = async () => {
                    const name = document.getElementById('guideCatName').value.trim();
                    if (!name) {
                        Utils.toast('请输入名称', 'warning');
                        return;
                    }
                    const data = { name, sortOrder: category ? category.sortOrder : Date.now() };
                    if (isEdit) {
                        data.id = category.id;
                        await DB.put('storageCategories', data);
                    } else {
                        await DB.add('storageCategories', data);
                    }
                    Utils.toast('已保存', 'success');
                    Utils.closeModal(modal);
                    const main = document.getElementById('mainContent');
                    render(main);
                };
            }
        });
    }

    function showGuideModal(item) {
        const isEdit = !!item;
        const modal = Utils.showModal({
            title: isEdit ? '编辑物品' : '新增物品',
            size: 'large',
            content: `
                <div class="form-group">
                    <label class="form-label">物品名称</label>
                    <input type="text" class="form-input" id="guideName" value="${item ? Utils.escapeHtml(item.name) : ''}" />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">分类</label>
                        <select class="form-select" id="guideCategory">
                            <option value="">未分类</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">品牌</label>
                        <input type="text" class="form-input" id="guideBrand" value="${item?.brand || ''}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">型号</label>
                        <input type="text" class="form-input" id="guideModel" value="${item?.model || ''}" />
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">购买日期</label>
                        <input type="date" class="form-input" id="guidePurchaseDate" value="${item?.purchaseDate?.slice(0, 10) || ''}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">保修到期</label>
                        <input type="date" class="form-input" id="guideWarranty" value="${item?.warrantyExpire?.slice(0, 10) || ''}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">购买价格</label>
                        <input type="number" class="form-input" id="guidePrice" value="${item?.price || ''}" placeholder="¥" />
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">使用说明 / 注意事项</label>
                    <textarea class="form-textarea" id="guideContent" style="min-height:150px;" placeholder="记录使用说明、注意事项、常用操作等">${item?.content || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">购买链接 / 说明书链接</label>
                    <input type="text" class="form-input" id="guideLink" value="${item?.link || ''}" placeholder="可选" />
                </div>
            `,
            footer: `
                <div style="display:flex;justify-content:space-between;">
                    ${isEdit ? `<button class="btn btn-danger btn-sm" id="deleteGuideBtn">删除</button>` : '<span></span>'}
                    <div style="display:flex;gap:8px;">
                        <button class="btn" id="cancelGuideBtn">取消</button>
                        <button class="btn btn-primary" id="saveGuideBtn">${isEdit ? '保存' : '创建'}</button>
                    </div>
                </div>
            `,
            onMount: async () => {
                const categories = await DB.getAll('storageCategories');
                const select = document.getElementById('guideCategory');
                categories.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    if (item && item.categoryId === c.id) opt.selected = true;
                    select.appendChild(opt);
                });

                document.getElementById('cancelGuideBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveGuideBtn').onclick = async () => {
                    const name = document.getElementById('guideName').value.trim();
                    if (!name) {
                        Utils.toast('请输入物品名称', 'warning');
                        return;
                    }
                    const catVal = document.getElementById('guideCategory').value;
                    const purchaseDate = document.getElementById('guidePurchaseDate').value;
                    const warranty = document.getElementById('guideWarranty').value;
                    const price = document.getElementById('guidePrice').value;

                    const data = {
                        name,
                        categoryId: catVal ? parseInt(catVal) : null,
                        brand: document.getElementById('guideBrand').value,
                        model: document.getElementById('guideModel').value,
                        purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : null,
                        warrantyExpire: warranty ? new Date(warranty).toISOString() : null,
                        price: price ? parseFloat(price) : null,
                        content: document.getElementById('guideContent').value,
                        link: document.getElementById('guideLink').value,
                        updatedAt: new Date().toISOString()
                    };
                    if (isEdit) {
                        data.id = item.id;
                        data.createdAt = item.createdAt;
                        await DB.put('itemGuides', data);
                    } else {
                        data.createdAt = new Date().toISOString();
                        await DB.add('itemGuides', data);
                    }
                    Utils.toast('已保存', 'success');
                    Utils.closeModal(modal);
                    const main = document.getElementById('mainContent');
                    render(main);
                };
                if (isEdit) {
                    document.getElementById('deleteGuideBtn').onclick = async () => {
                        const confirmed = await Utils.confirm('确定删除这个物品记录吗？');
                        if (confirmed) {
                            await DB.remove('itemGuides', item.id);
                            Utils.toast('已删除', 'success');
                            Utils.closeModal(modal);
                            const main = document.getElementById('mainContent');
                            render(main);
                        }
                    };
                }
            }
        });
    }

    async function getPendingCount() {
        const items = await DB.getAll('itemGuides');
        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        return items.filter(i => {
            if (!i.warrantyExpire) return false;
            const expire = new Date(i.warrantyExpire);
            return expire >= now && expire <= thirtyDaysLater;
        }).length;
    }

    return {
        name,
        render,
        getPendingCount
    };
})();
