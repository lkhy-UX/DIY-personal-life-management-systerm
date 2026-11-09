/**
 * 物品收纳模块
 */
const StorageModule = (function() {
    const name = '物品收纳';
    let currentLocationId = null;
    let searchKeyword = '';

    async function render(container) {
        const locations = await DB.getAll('storageLocations');
        locations.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        let items = await DB.getAll('storageItems');
        if (currentLocationId) {
            items = items.filter(i => i.locationId === currentLocationId);
        }
        if (searchKeyword) {
            const kw = searchKeyword.toLowerCase();
            items = items.filter(i =>
                i.name.toLowerCase().includes(kw) ||
                (i.description && i.description.toLowerCase().includes(kw))
            );
        }
        items.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-lg">📦 物品收纳</div>
                <div class="flex gap-8">
                    <input type="text" class="form-input" id="storageSearch" placeholder="搜索物品..." style="width:200px;" value="${Utils.escapeHtml(searchKeyword)}" />
                    <button class="btn btn-primary" id="addStorageBtn">+ 新增物品</button>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:220px 1fr;gap:16px;">
                <div class="card" style="padding:12px;align-self:start;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);">
                        <span style="font-weight:600;">存放位置</span>
                        <button class="btn btn-outline btn-sm" id="addLocationBtn" style="padding:2px 8px;font-size:12px;">+ 新建</button>
                    </div>
                    <div>
                        <div class="category-item ${currentLocationId === null ? 'active' : ''}" data-id="" style="padding:8px 10px;border-radius:var(--radius);cursor:pointer;${currentLocationId === null ? 'background:var(--bg-muted);color:var(--primary);' : ''}">
                            🏠 全部位置
                        </div>
                        ${locations.map(loc => `
                            <div class="category-item storage-loc" data-id="${loc.id}" style="padding:8px 10px;border-radius:var(--radius);cursor:pointer;display:flex;justify-content:space-between;align-items:center;${currentLocationId === loc.id ? 'background:var(--bg-muted);color:var(--primary);' : ''}">
                                <span>📍 ${Utils.escapeHtml(loc.name)}</span>
                                <div style="display:flex;gap:2px;">
                                    <button class="edit-loc-btn" data-id="${loc.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:12px;">✎</button>
                                    <button class="delete-loc-btn" data-id="${loc.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:12px;">✕</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="card">
                    ${items.length === 0 ? `
                        <div class="empty-state" style="padding:60px 0;">
                            <div class="empty-state-icon">📦</div>
                            <div class="empty-state-text">还没有物品</div>
                            <div class="text-sm text-muted mt-8">记录家中物品的存放位置，找东西不再翻箱倒柜</div>
                        </div>
                    ` : `
                        <div style="padding:16px;display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:12px;">
                            ${items.map(item => renderStorageItem(item, locations)).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        // 搜索
        const searchInput = document.getElementById('storageSearch');
        searchInput.oninput = Utils.debounce(() => {
            searchKeyword = searchInput.value;
            render(container);
        }, 300);

        // 位置点击
        container.querySelectorAll('.category-item[data-id]').forEach(el => {
            el.onclick = (e) => {
                if (e.target.classList.contains('edit-loc-btn') || e.target.classList.contains('delete-loc-btn')) return;
                const id = el.getAttribute('data-id');
                currentLocationId = id ? parseInt(id) : null;
                render(container);
            };
        });

        // 新增位置
        document.getElementById('addLocationBtn').onclick = () => showLocationModal();

        // 编辑位置
        container.querySelectorAll('.edit-loc-btn').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-id'));
                const loc = await DB.get('storageLocations', id);
                showLocationModal(loc);
            };
        });

        // 删除位置
        container.querySelectorAll('.delete-loc-btn').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-id'));
                const confirmed = await Utils.confirm('确定删除这个位置吗？该位置下的物品不会被删除。');
                if (confirmed) {
                    await DB.remove('storageLocations', id);
                    if (currentLocationId === id) currentLocationId = null;
                    Utils.toast('已删除', 'success');
                    render(container);
                }
            };
        });

        // 新增物品
        document.getElementById('addStorageBtn').onclick = () => showItemModal();

        // 物品点击编辑
        container.querySelectorAll('.storage-item').forEach(el => {
            el.onclick = async () => {
                const id = parseInt(el.getAttribute('data-id'));
                const item = await DB.get('storageItems', id);
                showItemModal(item);
            };
        });
    }

    function renderStorageItem(item, locations) {
        const loc = locations.find(l => l.id === item.locationId);
        return `
            <div class="storage-item list-item" data-id="${item.id}" style="padding:14px;border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer;background:var(--bg-card);">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
                    <div style="font-weight:600;">${Utils.escapeHtml(item.name)}</div>
                    ${item.quantity > 1 ? `<span class="text-xs" style="padding:1px 6px;border-radius:10px;background:var(--primary);color:white;">x${item.quantity}</span>` : ''}
                </div>
                ${item.description ? `
                    <div class="text-sm text-muted" style="margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                        ${Utils.escapeHtml(item.description)}
                    </div>
                ` : ''}
                <div class="text-xs text-muted" style="border-top:1px solid var(--border-light);padding-top:8px;">
                    ${loc ? `📍 ${Utils.escapeHtml(loc.name)}` : '📍 未分类'}
                </div>
            </div>
        `;
    }

    function showLocationModal(location) {
        const isEdit = !!location;
        const modal = Utils.showModal({
            title: isEdit ? '编辑位置' : '新建位置',
            content: `
                <div class="form-group">
                    <label class="form-label">位置名称</label>
                    <input type="text" class="form-input" id="locName" value="${location ? Utils.escapeHtml(location.name) : ''}" placeholder="如：主卧衣柜、厨房抽屉" />
                </div>
                <div class="form-group">
                    <label class="form-label">备注</label>
                    <input type="text" class="form-input" id="locNote" value="${location?.note || ''}" placeholder="可选" />
                </div>
            `,
            footer: `
                <button class="btn" id="cancelLocBtn">取消</button>
                <button class="btn btn-primary" id="saveLocBtn">${isEdit ? '保存' : '创建'}</button>
            `,
            onMount: () => {
                document.getElementById('cancelLocBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveLocBtn').onclick = async () => {
                    const name = document.getElementById('locName').value.trim();
                    if (!name) {
                        Utils.toast('请输入名称', 'warning');
                        return;
                    }
                    const data = { name, note: document.getElementById('locNote').value, sortOrder: location ? location.sortOrder : Date.now() };
                    if (isEdit) {
                        data.id = location.id;
                        await DB.put('storageLocations', data);
                    } else {
                        await DB.add('storageLocations', data);
                    }
                    Utils.toast('已保存', 'success');
                    Utils.closeModal(modal);
                    const main = document.getElementById('mainContent');
                    render(main);
                };
            }
        });
    }

    function showItemModal(item) {
        const isEdit = !!item;
        const modal = Utils.showModal({
            title: isEdit ? '编辑物品' : '新增物品',
            size: 'large',
            content: `
                <div class="form-group">
                    <label class="form-label">物品名称</label>
                    <input type="text" class="form-input" id="storageItemName" value="${item ? Utils.escapeHtml(item.name) : ''}" />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">存放位置</label>
                        <select class="form-select" id="storageItemLoc">
                            <option value="">未分类</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">数量</label>
                        <input type="number" class="form-input" id="storageItemQty" value="${item?.quantity || 1}" min="1" />
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">描述 / 备注</label>
                    <textarea class="form-textarea" id="storageItemDesc" placeholder="品牌、规格、购买日期等信息">${item?.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">标签</label>
                    <input type="text" class="form-input" id="storageItemTags" value="${item?.tags || ''}" placeholder="用逗号分隔" />
                </div>
            `,
            footer: `
                <div style="display:flex;justify-content:space-between;">
                    ${isEdit ? `<button class="btn btn-danger btn-sm" id="deleteStorageItemBtn">删除</button>` : '<span></span>'}
                    <div style="display:flex;gap:8px;">
                        <button class="btn" id="cancelStorageItemBtn">取消</button>
                        <button class="btn btn-primary" id="saveStorageItemBtn">${isEdit ? '保存' : '创建'}</button>
                    </div>
                </div>
            `,
            onMount: async () => {
                const locations = await DB.getAll('storageLocations');
                const select = document.getElementById('storageItemLoc');
                locations.forEach(loc => {
                    const opt = document.createElement('option');
                    opt.value = loc.id;
                    opt.textContent = loc.name;
                    if (item && item.locationId === loc.id) opt.selected = true;
                    select.appendChild(opt);
                });

                document.getElementById('cancelStorageItemBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveStorageItemBtn').onclick = async () => {
                    const name = document.getElementById('storageItemName').value.trim();
                    if (!name) {
                        Utils.toast('请输入物品名称', 'warning');
                        return;
                    }
                    const locVal = document.getElementById('storageItemLoc').value;
                    const qty = parseInt(document.getElementById('storageItemQty').value) || 1;

                    const data = {
                        name,
                        locationId: locVal ? parseInt(locVal) : null,
                        quantity: qty,
                        description: document.getElementById('storageItemDesc').value,
                        tags: document.getElementById('storageItemTags').value,
                        updatedAt: new Date().toISOString()
                    };
                    if (isEdit) {
                        data.id = item.id;
                        data.createdAt = item.createdAt;
                        await DB.put('storageItems', data);
                    } else {
                        data.createdAt = new Date().toISOString();
                        await DB.add('storageItems', data);
                    }
                    Utils.toast('已保存', 'success');
                    Utils.closeModal(modal);
                    const main = document.getElementById('mainContent');
                    render(main);
                };
                if (isEdit) {
                    document.getElementById('deleteStorageItemBtn').onclick = async () => {
                        const confirmed = await Utils.confirm('确定删除这个物品吗？');
                        if (confirmed) {
                            await DB.remove('storageItems', item.id);
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
        const items = await DB.getAll('storageItems');
        return items.filter(i => i.quantity <= 1).length;
    }

    return {
        name,
        render,
        getPendingCount
    };
})();
