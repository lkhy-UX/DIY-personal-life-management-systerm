/**
 * IndexedDB 数据层
 * 封装所有数据库操作，提供 Promise 风格的 API
 */
const DB = (function() {
    const DB_NAME = 'PersonalAppDB';
    const DB_VERSION = 3;

    // 所有数据存储（表）的定义
    const STORES = {
        // 设置
        settings: { keyPath: 'key' },
        // 每周计划任务
        weeklyTasks: { keyPath: 'id', autoIncrement: true },
        // 任务汇总
        tasks: { keyPath: 'id', autoIncrement: true },
        // 健康 - 运动记录
        workouts: { keyPath: 'id', autoIncrement: true },
        // 健康 - 体重记录
        weights: { keyPath: 'id', autoIncrement: true },
        // 健康 - 动作库
        exercises: { keyPath: 'id', autoIncrement: true },
        // 健康 - 目标
        healthGoals: { keyPath: 'key' },
        // 饮食 - 每日记录
        dietRecords: { keyPath: 'id', autoIncrement: true },
        // 饮食 - 买菜清单
        shoppingList: { keyPath: 'id', autoIncrement: true },
        // 饮食 - 菜谱
        recipes: { keyPath: 'id', autoIncrement: true },
        // 饮食 - 食品营养库
        foods: { keyPath: 'id', autoIncrement: true },
        // 问题思考 - 分类
        knowledgeCategories: { keyPath: 'id', autoIncrement: true },
        // 问题思考 - 问题记录
        knowledgeItems: { keyPath: 'id', autoIncrement: true },
        // 信息整理 - 分类
        infoCategories: { keyPath: 'id', autoIncrement: true },
        // 信息整理 - 卡片
        infoCards: { keyPath: 'id', autoIncrement: true },
        // 信息整理 - 思维导图节点
        mindmapNodes: { keyPath: 'id', autoIncrement: true },
        // 开发工作 - 项目
        devProjects: { keyPath: 'id', autoIncrement: true },
        // 开发工作 - 代码片段
        codeSnippets: { keyPath: 'id', autoIncrement: true },
        // 开发工作 - 条目（Bug/需求/功能/技术问题）
        devItems: { keyPath: 'id', autoIncrement: true },
        // 开发工作 - 日志
        devLogs: { keyPath: 'id', autoIncrement: true },
        // 开发工作 - 技术笔记
        devNotes: { keyPath: 'id', autoIncrement: true },
        // 开发工作 - 下一步行动
        devNextActions: { keyPath: 'id', autoIncrement: true },
        // 物品使用说明
        itemGuides: { keyPath: 'id', autoIncrement: true },
        // 物品收纳 - 分类/位置
        storageCategories: { keyPath: 'id', autoIncrement: true },
        storageLocations: { keyPath: 'id', autoIncrement: true },
        // 物品收纳
        storageItems: { keyPath: 'id', autoIncrement: true },
    };

    let db = null;
    let initPromise = null;

    /**
     * 初始化数据库
     */
    function init() {
        if (initPromise) return initPromise;

        initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                // 创建所有存储
                for (const [name, config] of Object.entries(STORES)) {
                    if (!database.objectStoreNames.contains(name)) {
                        const store = database.createObjectStore(name, {
                            keyPath: config.keyPath,
                            autoIncrement: config.autoIncrement || false
                        });

                        // 添加常用索引
                        if (name === 'weeklyTasks') {
                            store.createIndex('date', 'date', { unique: false });
                        }
                        if (name === 'tasks') {
                            store.createIndex('date', 'date', { unique: false });
                            store.createIndex('source', 'source', { unique: false });
                            store.createIndex('status', 'status', { unique: false });
                        }
                        if (name === 'workouts') {
                            store.createIndex('date', 'date', { unique: false });
                        }
                        if (name === 'weights') {
                            store.createIndex('date', 'date', { unique: false });
                        }
                        if (name === 'dietRecords') {
                            store.createIndex('date', 'date', { unique: false });
                        }
                        if (name === 'knowledgeItems') {
                            store.createIndex('categoryId', 'categoryId', { unique: false });
                        }
                        if (name === 'infoCards') {
                            store.createIndex('categoryId', 'categoryId', { unique: false });
                        }
                        if (name === 'devItems') {
                            store.createIndex('projectId', 'projectId', { unique: false });
                            store.createIndex('type', 'type', { unique: false });
                        }
                        if (name === 'devLogs') {
                            store.createIndex('projectId', 'projectId', { unique: false });
                        }
                        if (name === 'devNotes') {
                            store.createIndex('projectId', 'projectId', { unique: false });
                        }
                        if (name === 'devNextActions') {
                            store.createIndex('projectId', 'projectId', { unique: false });
                        }
                        if (name === 'itemGuides') {
                            store.createIndex('category', 'category', { unique: false });
                        }
                        if (name === 'storageItems') {
                            store.createIndex('location', 'location', { unique: false });
                        }
                    }
                }
            };
        });

        return initPromise;
    }

    /**
     * 获取事务
     */
    function getStore(storeName, mode = 'readonly') {
        if (!db) throw new Error('数据库未初始化');
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    /**
     * 将 IDBRequest 包装为 Promise
     */
    function promisify(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取所有数据
     */
    function getAll(storeName) {
        const store = getStore(storeName);
        return promisify(store.getAll());
    }

    /**
     * 根据 ID 获取单条数据
     */
    function get(storeName, id) {
        const store = getStore(storeName);
        return promisify(store.get(id));
    }

    /**
     * 添加数据
     */
    function add(storeName, data) {
        const store = getStore(storeName, 'readwrite');
        return promisify(store.add(data));
    }

    /**
     * 更新数据
     */
    function put(storeName, data) {
        const store = getStore(storeName, 'readwrite');
        return promisify(store.put(data));
    }

    /**
     * 删除数据
     */
    function remove(storeName, id) {
        const store = getStore(storeName, 'readwrite');
        return promisify(store.delete(id));
    }

    /**
     * 清空存储
     */
    function clear(storeName) {
        const store = getStore(storeName, 'readwrite');
        return promisify(store.clear());
    }

    /**
     * 按索引查询
     */
    function getByIndex(storeName, indexName, value) {
        const store = getStore(storeName);
        const index = store.index(indexName);
        return promisify(index.getAll(value));
    }

    /**
     * 批量添加数据
     */
    function bulkAdd(storeName, items) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            items.forEach(item => store.add(item));

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * 批量写入数据（覆盖式）
     */
    function bulkPut(storeName, items) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            items.forEach(item => store.put(item));

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * 导出所有数据
     */
    async function exportAll() {
        const data = {};
        for (const storeName of Object.keys(STORES)) {
            data[storeName] = await getAll(storeName);
        }
        return {
            version: DB_VERSION,
            exportTime: new Date().toISOString(),
            data
        };
    }

    /**
     * 导入所有数据（覆盖）
     */
    async function importAll(exportData) {
        if (!exportData || !exportData.data) {
            throw new Error('无效的备份文件格式');
        }

        // 清空所有存储
        for (const storeName of Object.keys(STORES)) {
            await clear(storeName);
        }

        // 写入新数据
        for (const [storeName, items] of Object.entries(exportData.data)) {
            if (STORES[storeName] && items && items.length > 0) {
                await bulkPut(storeName, items);
            }
        }

        return true;
    }

    /**
     * 清空所有数据
     */
    async function clearAll() {
        for (const storeName of Object.keys(STORES)) {
            await clear(storeName);
        }
        return true;
    }

    /**
     * 获取数据统计
     */
    async function getStats() {
        const stats = {};
        for (const storeName of Object.keys(STORES)) {
            const store = getStore(storeName);
            stats[storeName] = await promisify(store.count());
        }
        return stats;
    }

    return {
        init,
        getAll,
        get,
        add,
        put,
        remove,
        clear,
        getByIndex,
        bulkAdd,
        bulkPut,
        exportAll,
        importAll,
        clearAll,
        getStats,
        STORES
    };
})();
