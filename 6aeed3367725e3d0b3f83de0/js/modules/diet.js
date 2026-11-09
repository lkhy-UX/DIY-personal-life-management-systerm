/**
 * 饮食计划模块
 */
const DietModule = (function() {
    const name = '饮食计划';
    let currentTab = 'records';

    async function render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-lg">🥗 饮食计划</div>
                <button class="btn btn-primary" id="dietAddBtn">+ 新增</button>
            </div>

            <div class="tabs">
                <div class="tab ${currentTab === 'records' ? 'active' : ''}" data-tab="records">每日饮食</div>
                <div class="tab ${currentTab === 'shopping' ? 'active' : ''}" data-tab="shopping">买菜清单</div>
                <div class="tab ${currentTab === 'recipes' ? 'active' : ''}" data-tab="recipes">常用菜谱</div>
                <div class="tab ${currentTab === 'foods' ? 'active' : ''}" data-tab="foods">食品营养库</div>
            </div>

            <div id="dietContent"></div>
        `;

        container.querySelectorAll('.tab').forEach(tab => {
            tab.onclick = () => {
                currentTab = tab.getAttribute('data-tab');
                render(container);
            };
        });

        document.getElementById('dietAddBtn').onclick = () => {
            if (currentTab === 'records') showRecordModal();
            else if (currentTab === 'shopping') showShoppingItemModal();
            else if (currentTab === 'recipes') showRecipeModal();
            else if (currentTab === 'foods') showFoodModal();
        };

        const content = document.getElementById('dietContent');
        if (currentTab === 'records') await renderRecords(content);
        else if (currentTab === 'shopping') await renderShopping(content);
        else if (currentTab === 'recipes') await renderRecipes(content);
        else if (currentTab === 'foods') await renderFoods(content);
    }

    // ========== 每日饮食记录 ==========
    async function renderRecords(container) {
        const records = await DB.getAll('dietRecords');
        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 按日期分组
        const byDate = {};
        records.forEach(r => {
            if (!byDate[r.date]) byDate[r.date] = [];
            byDate[r.date].push(r);
        });

        const dates = Object.keys(byDate).sort().reverse();

        container.innerHTML = `
            ${dates.length === 0 ? `
                <div class="card">
                    <div class="empty-state">
                        <div class="empty-state-icon">🍽️</div>
                        <div class="empty-state-text">还没有饮食记录</div>
                        <div class="text-sm text-muted mt-8">点击右上角"+ 新增"开始记录</div>
                    </div>
                </div>
            ` : dates.map(date => {
                const dayRecords = byDate[date];
                const totalCalories = dayRecords.reduce((sum, r) => sum + (r.calories || 0), 0);
                return `
                    <div class="card" style="margin-bottom:12px;">
                        <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                            <div style="font-weight:600;">
                                ${date} <span class="text-sm text-muted">(${Utils.getWeekdayName(date)})</span>
                            </div>
                            <div style="font-size:14px;color:var(--primary);font-weight:500;">${totalCalories} kcal</div>
                        </div>
                        <div>
                            ${dayRecords.map(r => renderRecordItem(r)).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        `;

        // 绑定事件
        container.querySelectorAll('.diet-record-item').forEach(el => {
            const id = parseInt(el.getAttribute('data-id'));
            el.querySelector('.edit-btn').onclick = async (e) => {
                e.stopPropagation();
                const record = await DB.get('dietRecords', id);
                showRecordModal(record);
            };
            el.querySelector('.delete-btn').onclick = async (e) => {
                e.stopPropagation();
                const confirmed = await Utils.confirm('确定删除这条记录吗？');
                if (confirmed) {
                    await DB.remove('dietRecords', id);
                    Utils.toast('已删除', 'success');
                    renderRecords(container);
                }
            };
        });
    }

    function renderRecordItem(record) {
        const mealLabels = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };
        return `
            <div class="diet-record-item list-item" data-id="${record.id}" style="padding:12px 16px;border-bottom:1px solid var(--border-light);">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <div style="flex:1;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                            <span class="tag" style="font-size:11px;">${mealLabels[record.meal] || '其他'}</span>
                            <span style="font-weight:500;">${Utils.escapeHtml(record.foodName)}</span>
                        </div>
                        ${record.notes ? `<div class="text-sm text-muted">${Utils.escapeHtml(record.notes)}</div>` : ''}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="color:var(--primary);font-size:14px;">${record.calories || 0} kcal</span>
                        <button class="edit-btn" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;">✎</button>
                        <button class="delete-btn" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;">✕</button>
                    </div>
                </div>
            </div>
        `;
    }

    function showRecordModal(record) {
        const isEdit = !!record;
        const modal = Utils.showModal({
            title: isEdit ? '编辑饮食记录' : '新增饮食记录',
            content: `
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">日期</label>
                        <input type="date" class="form-input" id="dietDate" value="${record ? record.date : Utils.today()}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">餐次</label>
                        <select class="form-select" id="dietMeal">
                            <option value="breakfast" ${record?.meal === 'breakfast' ? 'selected' : ''}>早餐</option>
                            <option value="lunch" ${record?.meal === 'lunch' ? 'selected' : ''}>午餐</option>
                            <option value="dinner" ${record?.meal === 'dinner' ? 'selected' : ''}>晚餐</option>
                            <option value="snack" ${record?.meal === 'snack' ? 'selected' : ''}>加餐</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">食物名称</label>
                    <input type="text" class="form-input" id="dietFood" value="${record ? Utils.escapeHtml(record.foodName) : ''}" placeholder="例如: 番茄炒蛋" />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">热量 (kcal)</label>
                        <input type="number" class="form-input" id="dietCalories" value="${record?.calories || ''}" min="0" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">份量</label>
                        <input type="text" class="form-input" id="dietPortion" value="${record?.portion || ''}" placeholder="例如: 一碗" />
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">备注</label>
                    <textarea class="form-textarea" id="dietNotes" placeholder="可选">${record?.notes || ''}</textarea>
                </div>
            `,
            footer: `
                <button class="btn" id="cancelDietBtn">取消</button>
                <button class="btn btn-primary" id="saveDietBtn">${isEdit ? '保存' : '创建'}</button>
            `,
            onMount: () => {
                document.getElementById('cancelDietBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveDietBtn').onclick = async () => {
                    const date = document.getElementById('dietDate').value;
                    const foodName = document.getElementById('dietFood').value.trim();
                    if (!date || !foodName) {
                        Utils.toast('请填写日期和食物名称', 'warning');
                        return;
                    }
                    const data = {
                        date,
                        meal: document.getElementById('dietMeal').value,
                        foodName,
                        calories: parseInt(document.getElementById('dietCalories').value) || 0,
                        portion: document.getElementById('dietPortion').value,
                        notes: document.getElementById('dietNotes').value
                    };
                    if (isEdit) {
                        data.id = record.id;
                        await DB.put('dietRecords', data);
                        Utils.toast('已保存', 'success');
                    } else {
                        await DB.add('dietRecords', data);
                        Utils.toast('已创建', 'success');
                    }
                    Utils.closeModal(modal);
                    const content = document.getElementById('dietContent');
                    await renderRecords(content);
                };
            }
        });
    }

    // ========== 买菜清单 ==========
    async function renderShopping(container) {
        const items = await DB.getAll('shoppingList');
        items.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return (b.sortOrder || 0) - (a.sortOrder || 0);
        });

        const pending = items.filter(i => !i.completed).length;

        container.innerHTML = `
            <div class="card">
                <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-weight:600;">
                        待购买 <span style="color:var(--primary);">${pending}</span> 项
                    </div>
                    ${items.length > 0 ? `<button class="btn btn-outline btn-sm" id="clearCompletedBtn">清除已完成</button>` : ''}
                </div>
                ${items.length === 0 ? `
                    <div class="empty-state" style="padding:30px 0;">
                        <div class="empty-state-icon">🛒</div>
                        <div class="empty-state-text">买菜清单为空</div>
                        <div class="text-sm text-muted mt-8">点击右上角"+ 新增"添加食材</div>
                    </div>
                ` : `
                    <div>
                        ${items.map(item => `
                            <div class="list-item shopping-item" data-id="${item.id}" style="padding:12px 16px;border-bottom:1px solid var(--border-light);display:flex;align-items:center;gap:10px;${item.completed ? 'opacity:0.5;' : ''}">
                                <div class="checkbox ${item.completed ? 'checked' : ''}" onclick="DietModule._toggleShopping(${item.id})" style="flex-shrink:0;"></div>
                                <div style="flex:1;">
                                    <div style="${item.completed ? 'text-decoration:line-through;color:var(--text-muted);' : ''}">${Utils.escapeHtml(item.name)}</div>
                                    ${item.quantity ? `<div class="text-sm text-muted">${Utils.escapeHtml(item.quantity)}</div>` : ''}
                                </div>
                                <div style="display:flex;gap:4px;">
                                    <button class="edit-btn" onclick="DietModule._editShopping(${item.id})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;">✎</button>
                                    <button class="delete-btn" onclick="DietModule._deleteShopping(${item.id})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;">✕</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;

        const clearBtn = document.getElementById('clearCompletedBtn');
        if (clearBtn) {
            clearBtn.onclick = async () => {
                const confirmed = await Utils.confirm('确定清除所有已完成的项目吗？');
                if (confirmed) {
                    const all = await DB.getAll('shoppingList');
                    for (const item of all) {
                        if (item.completed) await DB.remove('shoppingList', item.id);
                    }
                    Utils.toast('已清除', 'success');
                    renderShopping(container);
                }
            };
        }
    }

    async function toggleShopping(id) {
        const item = await DB.get('shoppingList', id);
        item.completed = !item.completed;
        await DB.put('shoppingList', item);
        const content = document.getElementById('dietContent');
        await renderShopping(content);
    }

    function showShoppingItemModal(item) {
        const isEdit = !!item;
        const modal = Utils.showModal({
            title: isEdit ? '编辑项目' : '新增项目',
            content: `
                <div class="form-group">
                    <label class="form-label">名称</label>
                    <input type="text" class="form-input" id="shopName" value="${item ? Utils.escapeHtml(item.name) : ''}" placeholder="例如: 西红柿" />
                </div>
                <div class="form-group">
                    <label class="form-label">数量</label>
                    <input type="text" class="form-input" id="shopQty" value="${item?.quantity || ''}" placeholder="例如: 2斤" />
                </div>
            `,
            footer: `
                <button class="btn" id="cancelShopBtn">取消</button>
                <button class="btn btn-primary" id="saveShopBtn">${isEdit ? '保存' : '添加'}</button>
            `,
            onMount: () => {
                document.getElementById('cancelShopBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveShopBtn').onclick = async () => {
                    const name = document.getElementById('shopName').value.trim();
                    if (!name) {
                        Utils.toast('请输入名称', 'warning');
                        return;
                    }
                    const data = {
                        name,
                        quantity: document.getElementById('shopQty').value,
                        completed: item ? item.completed : false,
                        sortOrder: item ? item.sortOrder : Date.now()
                    };
                    if (isEdit) {
                        data.id = item.id;
                        await DB.put('shoppingList', data);
                        Utils.toast('已保存', 'success');
                    } else {
                        await DB.add('shoppingList', data);
                        Utils.toast('已添加', 'success');
                    }
                    Utils.closeModal(modal);
                    const content = document.getElementById('dietContent');
                    await renderShopping(content);
                };
            }
        });
    }

    async function editShopping(id) {
        const item = await DB.get('shoppingList', id);
        showShoppingItemModal(item);
    }

    async function deleteShopping(id) {
        const confirmed = await Utils.confirm('确定删除这个项目吗？');
        if (confirmed) {
            await DB.remove('shoppingList', id);
            Utils.toast('已删除', 'success');
            const content = document.getElementById('dietContent');
            await renderShopping(content);
        }
    }

    // ========== 常用菜谱 ==========
    async function renderRecipes(container) {
        const recipes = await DB.getAll('recipes');
        recipes.sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));

        container.innerHTML = `
            <div class="card">
                <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;">
                    共 ${recipes.length} 道菜谱
                </div>
                ${recipes.length === 0 ? `
                    <div class="empty-state" style="padding:30px 0;">
                        <div class="empty-state-icon">📖</div>
                        <div class="empty-state-text">还没有菜谱</div>
                        <div class="text-sm text-muted mt-8">点击右上角"+ 新增"添加菜谱</div>
                    </div>
                ` : `
                    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:8px;padding:12px;">
                        ${recipes.map(r => `
                            <div class="list-item" data-id="${r.id}" style="padding:12px;border:1px solid var(--border);border-radius:var(--radius);">
                                <div style="font-weight:500;margin-bottom:6px;">${Utils.escapeHtml(r.name)}</div>
                                ${r.calories ? `<div class="text-sm" style="margin-bottom:4px;">🔥 ${r.calories} kcal/份</div>` : ''}
                                ${r.ingredients ? `<div class="text-sm text-muted" style="margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">食材: ${Utils.escapeHtml(r.ingredients)}</div>` : ''}
                                <div style="display:flex;justify-content:flex-end;gap:4px;">
                                    <button class="edit-btn" onclick="DietModule._editRecipe(${r.id})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;">✎</button>
                                    <button class="delete-btn" onclick="DietModule._deleteRecipe(${r.id})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;">✕</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    }

    function showRecipeModal(recipe) {
        const isEdit = !!recipe;
        const modal = Utils.showModal({
            title: isEdit ? '编辑菜谱' : '新增菜谱',
            content: `
                <div class="form-group">
                    <label class="form-label">菜名</label>
                    <input type="text" class="form-input" id="recipeName" value="${recipe ? Utils.escapeHtml(recipe.name) : ''}" placeholder="例如: 番茄炒蛋" />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">分类</label>
                        <select class="form-select" id="recipeCategory">
                            <option value="家常菜" ${recipe?.category === '家常菜' ? 'selected' : ''}>家常菜</option>
                            <option value="早餐" ${recipe?.category === '早餐' ? 'selected' : ''}>早餐</option>
                            <option value="汤羹" ${recipe?.category === '汤羹' ? 'selected' : ''}>汤羹</option>
                            <option value="主食" ${recipe?.category === '主食' ? 'selected' : ''}>主食</option>
                            <option value="其他" ${recipe?.category === '其他' ? 'selected' : ''}>其他</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">热量/份</label>
                        <input type="number" class="form-input" id="recipeCalories" value="${recipe?.calories || ''}" min="0" />
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">食材</label>
                    <textarea class="form-textarea" id="recipeIngredients" placeholder="一行一个，例如: 西红柿 2个">${recipe?.ingredients || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">做法步骤</label>
                    <textarea class="form-textarea" id="recipeSteps" placeholder="一行一个步骤" style="min-height:100px;">${recipe?.steps || ''}</textarea>
                </div>
            `,
            footer: `
                <button class="btn" id="cancelRecipeBtn">取消</button>
                <button class="btn btn-primary" id="saveRecipeBtn">${isEdit ? '保存' : '创建'}</button>
            `,
            onMount: () => {
                document.getElementById('cancelRecipeBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveRecipeBtn').onclick = async () => {
                    const name = document.getElementById('recipeName').value.trim();
                    if (!name) {
                        Utils.toast('请输入菜名', 'warning');
                        return;
                    }
                    const data = {
                        name,
                        category: document.getElementById('recipeCategory').value,
                        calories: parseInt(document.getElementById('recipeCalories').value) || 0,
                        ingredients: document.getElementById('recipeIngredients').value,
                        steps: document.getElementById('recipeSteps').value,
                        sortOrder: recipe ? recipe.sortOrder : Date.now()
                    };
                    if (isEdit) {
                        data.id = recipe.id;
                        await DB.put('recipes', data);
                        Utils.toast('已保存', 'success');
                    } else {
                        await DB.add('recipes', data);
                        Utils.toast('已创建', 'success');
                    }
                    Utils.closeModal(modal);
                    const content = document.getElementById('dietContent');
                    await renderRecipes(content);
                };
            }
        });
    }

    async function editRecipe(id) {
        const recipe = await DB.get('recipes', id);
        showRecipeModal(recipe);
    }

    async function deleteRecipe(id) {
        const confirmed = await Utils.confirm('确定删除这个菜谱吗？');
        if (confirmed) {
            await DB.remove('recipes', id);
            Utils.toast('已删除', 'success');
            const content = document.getElementById('dietContent');
            await renderRecipes(content);
        }
    }

    // ========== 食品营养库 ==========
    async function renderFoods(container) {
        const foods = await DB.getAll('foods');
        foods.sort((a, b) => a.name.localeCompare(b.name, 'zh'));

        container.innerHTML = `
            <div class="card">
                <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;">
                    共 ${foods.length} 种食物
                </div>
                ${foods.length === 0 ? `
                    <div class="empty-state" style="padding:30px 0;">
                        <div class="empty-state-icon">🥦</div>
                        <div class="empty-state-text">还没有食物数据</div>
                        <div class="text-sm text-muted mt-8">点击右上角"+ 新增"添加食物营养信息</div>
                    </div>
                ` : `
                    <div style="max-height:500px;overflow-y:auto;">
                        <table style="width:100%;border-collapse:collapse;">
                            <thead style="position:sticky;top:0;background:var(--bg-card);z-index:1;">
                                <tr style="border-bottom:1px solid var(--border);">
                                    <th style="padding:10px 16px;text-align:left;font-size:13px;font-weight:500;color:var(--text-muted);">食物</th>
                                    <th style="padding:10px 16px;text-align:right;font-size:13px;font-weight:500;color:var(--text-muted);">热量(kcal)</th>
                                    <th style="padding:10px 16px;text-align:right;font-size:13px;font-weight:500;color:var(--text-muted);">蛋白质(g)</th>
                                    <th style="padding:10px 16px;text-align:right;font-size:13px;font-weight:500;color:var(--text-muted);">碳水(g)</th>
                                    <th style="padding:10px 16px;text-align:right;font-size:13px;font-weight:500;color:var(--text-muted);">脂肪(g)</th>
                                    <th style="padding:10px 16px;text-align:center;font-size:13px;font-weight:500;color:var(--text-muted);">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${foods.map(f => `
                                    <tr style="border-bottom:1px solid var(--border-light);">
                                        <td style="padding:10px 16px;">${Utils.escapeHtml(f.name)}</td>
                                        <td style="padding:10px 16px;text-align:right;">${f.calories || 0}</td>
                                        <td style="padding:10px 16px;text-align:right;">${f.protein || 0}</td>
                                        <td style="padding:10px 16px;text-align:right;">${f.carbs || 0}</td>
                                        <td style="padding:10px 16px;text-align:right;">${f.fat || 0}</td>
                                        <td style="padding:10px 16px;text-align:center;">
                                            <button class="edit-btn" onclick="DietModule._editFood(${f.id})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;margin:0 2px;">✎</button>
                                            <button class="delete-btn" onclick="DietModule._deleteFood(${f.id})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;margin:0 2px;">✕</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;
    }

    function showFoodModal(food) {
        const isEdit = !!food;
        const modal = Utils.showModal({
            title: isEdit ? '编辑食物' : '新增食物',
            content: `
                <div class="form-group">
                    <label class="form-label">食物名称</label>
                    <input type="text" class="form-input" id="foodName" value="${food ? Utils.escapeHtml(food.name) : ''}" placeholder="例如: 米饭" />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">热量 (kcal/100g)</label>
                        <input type="number" class="form-input" id="foodCal" value="${food?.calories || ''}" min="0" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">蛋白质 (g)</label>
                        <input type="number" step="0.1" class="form-input" id="foodProtein" value="${food?.protein || ''}" min="0" />
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">碳水 (g)</label>
                        <input type="number" step="0.1" class="form-input" id="foodCarbs" value="${food?.carbs || ''}" min="0" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">脂肪 (g)</label>
                        <input type="number" step="0.1" class="form-input" id="foodFat" value="${food?.fat || ''}" min="0" />
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">份量说明</label>
                    <input type="text" class="form-input" id="foodServing" value="${food?.serving || ''}" placeholder="例如: 一碗约150g" />
                </div>
            `,
            footer: `
                <button class="btn" id="cancelFoodBtn">取消</button>
                <button class="btn btn-primary" id="saveFoodBtn">${isEdit ? '保存' : '添加'}</button>
            `,
            onMount: () => {
                document.getElementById('cancelFoodBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveFoodBtn').onclick = async () => {
                    const name = document.getElementById('foodName').value.trim();
                    if (!name) {
                        Utils.toast('请输入食物名称', 'warning');
                        return;
                    }
                    const data = {
                        name,
                        calories: parseFloat(document.getElementById('foodCal').value) || 0,
                        protein: parseFloat(document.getElementById('foodProtein').value) || 0,
                        carbs: parseFloat(document.getElementById('foodCarbs').value) || 0,
                        fat: parseFloat(document.getElementById('foodFat').value) || 0,
                        serving: document.getElementById('foodServing').value
                    };
                    if (isEdit) {
                        data.id = food.id;
                        await DB.put('foods', data);
                        Utils.toast('已保存', 'success');
                    } else {
                        await DB.add('foods', data);
                        Utils.toast('已添加', 'success');
                    }
                    Utils.closeModal(modal);
                    const content = document.getElementById('dietContent');
                    await renderFoods(content);
                };
            }
        });
    }

    async function editFood(id) {
        const food = await DB.get('foods', id);
        showFoodModal(food);
    }

    async function deleteFood(id) {
        const confirmed = await Utils.confirm('确定删除这个食物吗？');
        if (confirmed) {
            await DB.remove('foods', id);
            Utils.toast('已删除', 'success');
            const content = document.getElementById('dietContent');
            await renderFoods(content);
        }
    }

    // ========== 对外方法 ==========
    async function getPendingCount() {
        const items = await DB.getAll('shoppingList');
        return items.filter(i => !i.completed).length;
    }

    return {
        name,
        render,
        getPendingCount,
        _toggleShopping: toggleShopping,
        _editShopping: editShopping,
        _deleteShopping: deleteShopping,
        _editRecipe: editRecipe,
        _deleteRecipe: deleteRecipe,
        _editFood: editFood,
        _deleteFood: deleteFood
    };
})();
