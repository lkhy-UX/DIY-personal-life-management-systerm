"""
个人工作台 - Flask 服务端版本
数据保存在 data.json 文件中，支持多设备同步访问
"""
import json
import os
import time
import threading
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='static', static_url_path='')

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.json')
_lock = threading.Lock()

# 默认数据结构（所有 store 名称）
DEFAULT_STORES = [
    'settings', 'weeklyTasks', 'tasks', 'workouts', 'weights',
    'exercises', 'healthGoals', 'dietRecords', 'shoppingList',
    'recipes', 'foods', 'knowledgeCategories', 'knowledgeItems',
    'infoCategories', 'infoCards', 'mindmapNodes', 'devProjects',
    'codeSnippets', 'devItems', 'devLogs', 'devNotes', 'devNextActions',
    'itemGuides', 'storageCategories', 'storageLocations', 'storageItems'
]


def _load_data():
    """从 data.json 加载所有数据"""
    if not os.path.exists(DATA_FILE):
        data = {store: [] for store in DEFAULT_STORES}
        # 初始化自增ID计数器
        data['_counters'] = {store: 0 for store in DEFAULT_STORES}
        _save_data(data)
        return data
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    # 确保所有 store 都存在
    for store in DEFAULT_STORES:
        if store not in data:
            data[store] = []
    if '_counters' not in data:
        data['_counters'] = {}
    for store in DEFAULT_STORES:
        if store not in data['_counters']:
            # 根据现有数据计算最大ID
            items = data.get(store, [])
            if items:
                data['_counters'][store] = max(item.get('id', 0) for item in items)
            else:
                data['_counters'][store] = 0
    return data


def _save_data(data):
    """保存数据到 data.json"""
    tmp_file = DATA_FILE + '.tmp'
    with open(tmp_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp_file, DATA_FILE)


def _next_id(data, store):
    """生成下一个自增ID"""
    data['_counters'][store] = data['_counters'].get(store, 0) + 1
    return data['_counters'][store]


# ========== API 路由 ==========

@app.route('/api/data', methods=['GET'])
def get_all_data():
    """获取所有数据（用于初始化同步）"""
    with _lock:
        data = _load_data()
    # 移除内部字段
    public_data = {k: v for k, v in data.items() if not k.startswith('_')}
    return jsonify(public_data)


@app.route('/api/<store>', methods=['GET'])
def get_all(store):
    """获取某个 store 的所有数据"""
    if store.startswith('_'):
        return jsonify({'error': 'invalid store'}), 400
    with _lock:
        data = _load_data()
    items = data.get(store, [])
    return jsonify(items)


@app.route('/api/<store>/<int:item_id>', methods=['GET'])
def get_one(store, item_id):
    """获取单条记录"""
    if store.startswith('_'):
        return jsonify({'error': 'invalid store'}), 400
    with _lock:
        data = _load_data()
    items = data.get(store, [])
    item = next((i for i in items if i.get('id') == item_id), None)
    if item is None:
        return jsonify(None), 404
    return jsonify(item)


@app.route('/api/<store>', methods=['POST'])
def add_one(store):
    """新增一条记录"""
    if store.startswith('_'):
        return jsonify({'error': 'invalid store'}), 400
    body = request.get_json(force=True)
    with _lock:
        data = _load_data()
        if store not in data:
            data[store] = []
        new_id = _next_id(data, store)
        body['id'] = new_id
        data[store].append(body)
        _save_data(data)
    return jsonify(new_id), 201


@app.route('/api/<store>/<int:item_id>', methods=['PUT'])
def update_one(store, item_id):
    """更新一条记录"""
    if store.startswith('_'):
        return jsonify({'error': 'invalid store'}), 400
    body = request.get_json(force=True)
    with _lock:
        data = _load_data()
        items = data.get(store, [])
        for i, item in enumerate(items):
            if item.get('id') == item_id:
                body['id'] = item_id
                items[i] = body
                _save_data(data)
                return jsonify(item_id)
    return jsonify({'error': 'not found'}), 404


@app.route('/api/<store>/<int:item_id>', methods=['DELETE'])
def delete_one(store, item_id):
    """删除一条记录"""
    if store.startswith('_'):
        return jsonify({'error': 'invalid store'}), 400
    with _lock:
        data = _load_data()
        items = data.get(store, [])
        new_items = [i for i in items if i.get('id') != item_id]
        if len(new_items) == len(items):
            return jsonify({'error': 'not found'}), 404
        data[store] = new_items
        _save_data(data)
    return jsonify({'ok': True})


@app.route('/api/<store>/clear', methods=['POST'])
def clear_store(store):
    """清空某个 store 的所有数据"""
    if store.startswith('_'):
        return jsonify({'error': 'invalid store'}), 400
    with _lock:
        data = _load_data()
        data[store] = []
        _save_data(data)
    return jsonify({'ok': True})


@app.route('/api/import', methods=['POST'])
def import_data():
    """全量导入数据（用于迁移）"""
    body = request.get_json(force=True)
    with _lock:
        data = _load_data()
        for store, items in body.items():
            if store.startswith('_'):
                continue
            data[store] = items
            # 重新计算计数器
            if items:
                max_id = max(item.get('id', 0) for item in items)
                data['_counters'][store] = max_id
        _save_data(data)
    return jsonify({'ok': True})


@app.route('/api/export', methods=['GET'])
def export_data():
    """全量导出数据"""
    with _lock:
        data = _load_data()
    public_data = {k: v for k, v in data.items() if not k.startswith('_')}
    return jsonify(public_data)


# ========== 静态文件 ==========

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('static', path)


if __name__ == '__main__':
    print('=' * 50)
    print('个人工作台 - Flask 服务端版本')
    print(f'数据文件: {DATA_FILE}')
    print('访问地址: http://localhost:5000')
    print('=' * 50)
    app.run(host='0.0.0.0', port=5000, debug=False)
