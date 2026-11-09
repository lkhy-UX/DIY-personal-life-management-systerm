/**
 * 数据层 - 服务端 API 版本
 * 接口与 IndexedDB 版本完全一致，其他模块无需修改
 * 数据保存在服务端的 data.json 文件中
 */
const DB = (function() {
    const API_BASE = '/api';

    let initPromise = null;

    /**
     * 初始化（首次从服务端拉取全量数据做缓存，提高读取速度）
     */
    function init() {
        if (initPromise) return initPromise;
        initPromise = fetch(`${API_BASE}/data`)
            .then(r => r.json())
            .then(() => {
                // 初始化成功，无需缓存，直接走API
                return true;
            })
            .catch(err => {
                console.error('DB init error:', err);
                throw err;
            });
        return initPromise;
    }

    /**
     * 通用 fetch 封装
     */
    async function _request(url, options = {}) {
        const opts = {
            headers: { 'Content-Type': 'application/json' },
            ...options
        };
        if (options.body && typeof options.body !== 'string') {
            opts.body = JSON.stringify(options.body);
        }
        const res = await fetch(url, opts);
        if (!res.ok) {
            if (res.status === 404) return null;
            throw new Error(`HTTP ${res.status}`);
        }
        const text = await res.text();
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }

    /**
     * 获取所有数据
     */
    async function getAll(store) {
        const data = await _request(`${API_BASE}/${store}`);
        return data || [];
    }

    /**
     * 根据 ID 获取单条记录
     */
    async function get(store, id) {
        return await _request(`${API_BASE}/${store}/${id}`);
    }

    /**
     * 新增一条记录，返回自增 ID
     */
    async function add(store, item) {
        const id = await _request(`${API_BASE}/${store}`, {
            method: 'POST',
            body: item
        });
        return id;
    }

    /**
     * 更新一条记录（根据 id）
     */
    async function put(store, item) {
        await _request(`${API_BASE}/${store}/${item.id}`, {
            method: 'PUT',
            body: item
        });
        return item.id;
    }

    /**
     * 根据 ID 删除
     */
    async function remove(store, id) {
        await _request(`${API_BASE}/${store}/${id}`, {
            method: 'DELETE'
        });
    }

    /**
     * 清空某个 store
     */
    async function clear(store) {
        await _request(`${API_BASE}/${store}/clear`, {
            method: 'POST'
        });
    }

    /**
     * 批量新增
     */
    async function bulkAdd(store, items) {
        const ids = [];
        for (const item of items) {
            const id = await add(store, item);
            ids.push(id);
        }
        return ids;
    }

    /**
     * 全量导入（覆盖）
     */
    async function importAll(data) {
        await _request(`${API_BASE}/import`, {
            method: 'POST',
            body: data
        });
    }

    /**
     * 全量导出
     */
    async function exportAll() {
        return await _request(`${API_BASE}/export`);
    }

    /**
     * 清空所有数据
     */
    async function clearAll() {
        const stores = [
            'settings', 'weeklyTasks', 'tasks', 'workouts', 'weights',
            'exercises', 'healthGoals', 'dietRecords', 'shoppingList',
            'recipes', 'foods', 'knowledgeCategories', 'knowledgeItems',
            'infoCategories', 'infoCards', 'mindmapNodes', 'devProjects',
            'codeSnippets', 'devItems', 'devLogs', 'devNotes', 'devNextActions',
            'itemGuides', 'storageCategories', 'storageLocations', 'storageItems'
        ];
        for (const store of stores) {
            await clear(store);
        }
    }

    return {
        init,
        getAll,
        get,
        add,
        put,
        remove,
        clear,
        bulkAdd,
        importAll,
        exportAll,
        clearAll
    };
})();
