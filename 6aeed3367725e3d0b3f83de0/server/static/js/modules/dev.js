/**
 * 开发工作模块
 */
const DevModule = (function() {
    const name = '开发工作';
    let currentTab = 'projects'; // projects / snippets / notes

    async function render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div class="page-title-lg">💻 开发工作</div>
                <div class="flex gap-8">
                    <div class="tabs" style="margin-bottom:0;border:none;">
                        <div class="tab ${currentTab === 'projects' ? 'active' : ''}" data-tab="projects">项目</div>
                        <div class="tab ${currentTab === 'snippets' ? 'active' : ''}" data-tab="snippets">代码片段</div>
                        <div class="tab ${currentTab === 'notes' ? 'active' : ''}" data-tab="notes">开发笔记</div>
                    </div>
                    <button class="btn btn-primary" id="devAddBtn">+ 新建</button>
                </div>
            </div>

            <div id="devContent" class="card" style="min-height:500px;"></div>
        `;

        // Tab切换
        container.querySelectorAll('.tab[data-tab]').forEach(tab => {
            tab.onclick = () => {
                currentTab = tab.getAttribute('data-tab');
                render(container);
            };
        });

        document.getElementById('devAddBtn').onclick = () => {
            if (currentTab === 'projects') showProjectModal();
            else if (currentTab === 'snippets') showSnippetModal();
            else showDevNoteModal();
        };

        const content = document.getElementById('devContent');
        if (currentTab === 'projects') await renderProjects(content);
        else if (currentTab === 'snippets') await renderSnippets(content);
        else await renderDevNotes(content);
    }

    // ========== 项目管理 ==========
    async function renderProjects(container) {
        const projects = await DB.getAll('devProjects');
        projects.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        if (projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:60px 0;">
                    <div class="empty-state-icon">📁</div>
                    <div class="empty-state-text">还没有项目</div>
                    <div class="text-sm text-muted mt-8">点击右上角"+ 新建"添加项目</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="padding:16px;">
                ${projects.map(p => renderProjectItem(p)).join('')}
            </div>
        `;

        container.querySelectorAll('.dev-project-item').forEach(el => {
            el.onclick = async () => {
                const id = parseInt(el.getAttribute('data-id'));
                const project = await DB.get('devProjects', id);
                showProjectModal(project);
            };
        });
    }

    function renderProjectItem(p) {
        const statusColors = {
            planning: '#94a3b8',
            developing: '#3b82f6',
            testing: '#f59e0b',
            completed: '#10b981',
            paused: '#ef4444'
        };
        const statusLabels = {
            planning: '规划中',
            developing: '开发中',
            testing: '测试中',
            completed: '已完成',
            paused: '已暂停'
        };
        const status = p.status || 'planning';
        return `
            <div class="dev-project-item list-item" data-id="${p.id}" style="padding:14px;margin-bottom:8px;border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer;">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
                    <div style="font-weight:600;font-size:15px;">${Utils.escapeHtml(p.name)}</div>
                    <span style="padding:2px 8px;border-radius:12px;font-size:12px;background:${statusColors[status]}20;color:${statusColors[status]};">
                        ${statusLabels[status]}
                    </span>
                </div>
                ${p.description ? `
                    <div class="text-sm text-muted" style="margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                        ${Utils.escapeHtml(p.description)}
                    </div>
                ` : ''}
                <div class="text-xs text-muted" style="display:flex;gap:12px;">
                    ${p.techStack ? `<span>🛠 ${Utils.escapeHtml(p.techStack)}</span>` : ''}
                    <span>📅 ${p.updatedAt ? p.updatedAt.slice(0, 10) : p.createdAt?.slice(0, 10) || ''}</span>
                </div>
            </div>
        `;
    }

    function showProjectModal(project) {
        const isEdit = !!project;
        const modal = Utils.showModal({
            title: isEdit ? '编辑项目' : '新建项目',
            size: 'large',
            content: `
                <div class="form-group">
                    <label class="form-label">项目名称</label>
                    <input type="text" class="form-input" id="projName" value="${project ? Utils.escapeHtml(project.name) : ''}" />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">状态</label>
                        <select class="form-select" id="projStatus">
                            <option value="planning" ${project?.status === 'planning' ? 'selected' : ''}>规划中</option>
                            <option value="developing" ${project?.status === 'developing' ? 'selected' : ''}>开发中</option>
                            <option value="testing" ${project?.status === 'testing' ? 'selected' : ''}>测试中</option>
                            <option value="completed" ${project?.status === 'completed' ? 'selected' : ''}>已完成</option>
                            <option value="paused" ${project?.status === 'paused' ? 'selected' : ''}>已暂停</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">技术栈</label>
                        <input type="text" class="form-input" id="projTech" value="${project?.techStack || ''}" placeholder="如：Vue, Node.js" />
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">项目描述</label>
                    <textarea class="form-textarea" id="projDesc" placeholder="项目简介...">${project?.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">仓库地址</label>
                    <input type="text" class="form-input" id="projRepo" value="${project?.repoUrl || ''}" placeholder="可选" />
                </div>
                <div class="form-group">
                    <label class="form-label">线上地址</label>
                    <input type="text" class="form-input" id="projLive" value="${project?.liveUrl || ''}" placeholder="可选" />
                </div>
            `,
            footer: `
                <div style="display:flex;justify-content:space-between;">
                    ${isEdit ? `<button class="btn btn-danger btn-sm" id="deleteProjBtn">删除</button>` : '<span></span>'}
                    <div style="display:flex;gap:8px;">
                        <button class="btn" id="cancelProjBtn">取消</button>
                        <button class="btn btn-primary" id="saveProjBtn">${isEdit ? '保存' : '创建'}</button>
                    </div>
                </div>
            `,
            onMount: () => {
                document.getElementById('cancelProjBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveProjBtn').onclick = async () => {
                    const name = document.getElementById('projName').value.trim();
                    if (!name) {
                        Utils.toast('请输入项目名称', 'warning');
                        return;
                    }
                    const data = {
                        name,
                        status: document.getElementById('projStatus').value,
                        techStack: document.getElementById('projTech').value,
                        description: document.getElementById('projDesc').value,
                        repoUrl: document.getElementById('projRepo').value,
                        liveUrl: document.getElementById('projLive').value,
                        updatedAt: new Date().toISOString()
                    };
                    if (isEdit) {
                        data.id = project.id;
                        data.createdAt = project.createdAt;
                        await DB.put('devProjects', data);
                    } else {
                        data.createdAt = new Date().toISOString();
                        await DB.add('devProjects', data);
                    }
                    Utils.toast('已保存', 'success');
                    Utils.closeModal(modal);
                    const content = document.getElementById('devContent');
                    await renderProjects(content);
                };
                if (isEdit) {
                    document.getElementById('deleteProjBtn').onclick = async () => {
                        const confirmed = await Utils.confirm('确定删除这个项目吗？');
                        if (confirmed) {
                            await DB.remove('devProjects', project.id);
                            Utils.toast('已删除', 'success');
                            Utils.closeModal(modal);
                            const content = document.getElementById('devContent');
                            await renderProjects(content);
                        }
                    };
                }
            }
        });
    }

    // ========== 代码片段 ==========
    async function renderSnippets(container) {
        const snippets = await DB.getAll('codeSnippets');
        snippets.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        if (snippets.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:60px 0;">
                    <div class="empty-state-icon">📝</div>
                    <div class="empty-state-text">还没有代码片段</div>
                    <div class="text-sm text-muted mt-8">点击右上角"+ 新建"保存常用代码</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="padding:16px;display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:12px;">
                ${snippets.map(s => renderSnippetItem(s)).join('')}
            </div>
        `;

        container.querySelectorAll('.snippet-item').forEach(el => {
            el.onclick = async () => {
                const id = parseInt(el.getAttribute('data-id'));
                const snippet = await DB.get('codeSnippets', id);
                showSnippetModal(snippet);
            };
        });
    }

    function renderSnippetItem(s) {
        return `
            <div class="snippet-item list-item" data-id="${s.id}" style="padding:12px;border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer;background:var(--bg-card);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <div style="font-weight:600;font-size:14px;">${Utils.escapeHtml(s.title)}</div>
                    <span style="font-size:11px;padding:1px 6px;border-radius:4px;background:var(--bg-muted);color:var(--text-muted);">
                        ${Utils.escapeHtml(s.language || 'text')}
                    </span>
                </div>
                ${s.description ? `
                    <div class="text-xs text-muted" style="margin-bottom:6px;">${Utils.escapeHtml(s.description)}</div>
                ` : ''}
                <pre style="margin:0;padding:8px;background:var(--bg-muted);border-radius:4px;font-size:11px;overflow:hidden;max-height:80px;color:var(--text-secondary);"><code>${Utils.escapeHtml(s.code?.slice(0, 200) || '')}</code></pre>
            </div>
        `;
    }

    function showSnippetModal(snippet) {
        const isEdit = !!snippet;
        const modal = Utils.showModal({
            title: isEdit ? '编辑代码片段' : '新建代码片段',
            size: 'large',
            content: `
                <div class="form-row">
                    <div class="form-group" style="flex:2;">
                        <label class="form-label">标题</label>
                        <input type="text" class="form-input" id="snippetTitle" value="${snippet ? Utils.escapeHtml(snippet.title) : ''}" />
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label class="form-label">语言</label>
                        <select class="form-select" id="snippetLang">
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="html">HTML</option>
                            <option value="css">CSS</option>
                            <option value="sql">SQL</option>
                            <option value="shell">Shell</option>
                            <option value="other">其他</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">描述</label>
                    <input type="text" class="form-input" id="snippetDesc" value="${snippet?.description || ''}" placeholder="可选" />
                </div>
                <div class="form-group">
                    <label class="form-label">代码</label>
                    <textarea class="form-textarea" id="snippetCode" style="font-family:monospace;font-size:13px;min-height:250px;" placeholder="粘贴代码...">${snippet?.code || ''}</textarea>
                </div>
            `,
            footer: `
                <div style="display:flex;justify-content:space-between;">
                    <div>
                        ${isEdit ? `<button class="btn btn-danger btn-sm" id="deleteSnippetBtn">删除</button>` : ''}
                        <button class="btn btn-outline btn-sm" id="copySnippetBtn">复制代码</button>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn" id="cancelSnippetBtn">取消</button>
                        <button class="btn btn-primary" id="saveSnippetBtn">${isEdit ? '保存' : '创建'}</button>
                    </div>
                </div>
            `,
            onMount: () => {
                if (snippet) {
                    document.getElementById('snippetLang').value = snippet.language || 'javascript';
                }
                document.getElementById('cancelSnippetBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('copySnippetBtn').onclick = () => {
                    const code = document.getElementById('snippetCode').value;
                    navigator.clipboard.writeText(code).then(() => {
                        Utils.toast('已复制', 'success');
                    });
                };
                document.getElementById('saveSnippetBtn').onclick = async () => {
                    const title = document.getElementById('snippetTitle').value.trim();
                    if (!title) {
                        Utils.toast('请输入标题', 'warning');
                        return;
                    }
                    const data = {
                        title,
                        language: document.getElementById('snippetLang').value,
                        description: document.getElementById('snippetDesc').value,
                        code: document.getElementById('snippetCode').value,
                        updatedAt: new Date().toISOString()
                    };
                    if (isEdit) {
                        data.id = snippet.id;
                        data.createdAt = snippet.createdAt;
                        await DB.put('codeSnippets', data);
                    } else {
                        data.createdAt = new Date().toISOString();
                        await DB.add('codeSnippets', data);
                    }
                    Utils.toast('已保存', 'success');
                    Utils.closeModal(modal);
                    const content = document.getElementById('devContent');
                    await renderSnippets(content);
                };
                if (isEdit) {
                    document.getElementById('deleteSnippetBtn').onclick = async () => {
                        const confirmed = await Utils.confirm('确定删除这个代码片段吗？');
                        if (confirmed) {
                            await DB.remove('codeSnippets', snippet.id);
                            Utils.toast('已删除', 'success');
                            Utils.closeModal(modal);
                            const content = document.getElementById('devContent');
                            await renderSnippets(content);
                        }
                    };
                }
            }
        });
    }

    // ========== 开发笔记 ==========
    async function renderDevNotes(container) {
        const notes = await DB.getAll('devNotes');
        notes.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        if (notes.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:60px 0;">
                    <div class="empty-state-icon">📓</div>
                    <div class="empty-state-text">还没有开发笔记</div>
                    <div class="text-sm text-muted mt-8">记录开发心得、踩坑经验、技术总结</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="padding:16px;">
                ${notes.map(n => renderDevNoteItem(n)).join('')}
            </div>
        `;

        container.querySelectorAll('.dev-note-item').forEach(el => {
            el.onclick = async () => {
                const id = parseInt(el.getAttribute('data-id'));
                const note = await DB.get('devNotes', id);
                showDevNoteModal(note);
            };
        });
    }

    function renderDevNoteItem(n) {
        return `
            <div class="dev-note-item list-item" data-id="${n.id}" style="padding:14px;margin-bottom:8px;border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer;">
                <div style="font-weight:600;margin-bottom:6px;">${Utils.escapeHtml(n.title)}</div>
                <div class="text-sm text-muted" style="margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.5;">
                    ${Utils.escapeHtml(n.content || '')}
                </div>
                <div class="text-xs text-muted">
                    ${n.tags ? `🏷 ${Utils.escapeHtml(n.tags)} · ` : ''}
                    📅 ${n.updatedAt ? n.updatedAt.slice(0, 10) : n.createdAt?.slice(0, 10) || ''}
                </div>
            </div>
        `;
    }

    function showDevNoteModal(note) {
        const isEdit = !!note;
        const modal = Utils.showModal({
            title: isEdit ? '编辑笔记' : '新建笔记',
            size: 'large',
            content: `
                <div class="form-group">
                    <label class="form-label">标题</label>
                    <input type="text" class="form-input" id="noteTitle" value="${note ? Utils.escapeHtml(note.title) : ''}" />
                </div>
                <div class="form-group">
                    <label class="form-label">标签</label>
                    <input type="text" class="form-input" id="noteTags" value="${note?.tags || ''}" placeholder="用逗号分隔" />
                </div>
                <div class="form-group">
                    <label class="form-label">内容</label>
                    <textarea class="form-textarea" id="noteContent" style="min-height:300px;" placeholder="记录你的开发心得...">${note?.content || ''}</textarea>
                </div>
            `,
            footer: `
                <div style="display:flex;justify-content:space-between;">
                    ${isEdit ? `<button class="btn btn-danger btn-sm" id="deleteNoteBtn">删除</button>` : '<span></span>'}
                    <div style="display:flex;gap:8px;">
                        <button class="btn" id="cancelNoteBtn">取消</button>
                        <button class="btn btn-primary" id="saveNoteBtn">${isEdit ? '保存' : '创建'}</button>
                    </div>
                </div>
            `,
            onMount: () => {
                document.getElementById('cancelNoteBtn').onclick = () => Utils.closeModal(modal);
                document.getElementById('saveNoteBtn').onclick = async () => {
                    const title = document.getElementById('noteTitle').value.trim();
                    if (!title) {
                        Utils.toast('请输入标题', 'warning');
                        return;
                    }
                    const data = {
                        title,
                        tags: document.getElementById('noteTags').value,
                        content: document.getElementById('noteContent').value,
                        updatedAt: new Date().toISOString()
                    };
                    if (isEdit) {
                        data.id = note.id;
                        data.createdAt = note.createdAt;
                        await DB.put('devNotes', data);
                    } else {
                        data.createdAt = new Date().toISOString();
                        await DB.add('devNotes', data);
                    }
                    Utils.toast('已保存', 'success');
                    Utils.closeModal(modal);
                    const content = document.getElementById('devContent');
                    await renderDevNotes(content);
                };
                if (isEdit) {
                    document.getElementById('deleteNoteBtn').onclick = async () => {
                        const confirmed = await Utils.confirm('确定删除这篇笔记吗？');
                        if (confirmed) {
                            await DB.remove('devNotes', note.id);
                            Utils.toast('已删除', 'success');
                            Utils.closeModal(modal);
                            const content = document.getElementById('devContent');
                            await renderDevNotes(content);
                        }
                    };
                }
            }
        });
    }

    async function getPendingCount() {
        const projects = await DB.getAll('devProjects');
        return projects.filter(p => p.status === 'developing').length;
    }

    return {
        name,
        render,
        getPendingCount
    };
})();
