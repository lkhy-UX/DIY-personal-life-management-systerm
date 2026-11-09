# 个人工作台 - 服务端版本

数据保存在服务器硬盘的 `data.json` 文件中，支持多台电脑访问时数据同步。

## 目录结构

```
server/
├── app.py              # Flask 后端
├── requirements.txt    # Python 依赖
├── data.json           # 数据文件（运行后自动生成）
└── static/             # 前端静态文件
    ├── index.html
    ├── css/
    └── js/
        ├── db.js           # API 数据层（替换了 IndexedDB 版本）
        ├── utils.js
        ├── router.js
        ├── app.js
        └── modules/        # 所有功能模块
```

## 部署步骤

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动服务

```bash
python app.py
```

服务启动后访问：`http://服务器IP:5000`

### 3. 后台运行（Linux）

使用 nohup：

```bash
nohup python app.py > app.log 2>&1 &
```

或使用 systemd 管理。

## 数据说明

- 所有数据保存在 `data.json` 文件中
- 备份：直接复制 `data.json` 文件即可
- 恢复：把备份的 `data.json` 放回同目录即可

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/data` | 获取所有数据 |
| GET | `/api/:store` | 获取某个表的所有记录 |
| GET | `/api/:store/:id` | 获取单条记录 |
| POST | `/api/:store` | 新增记录，返回新ID |
| PUT | `/api/:store/:id` | 更新记录 |
| DELETE | `/api/:store/:id` | 删除记录 |
| POST | `/api/import` | 全量导入 |
| GET | `/api/export` | 全量导出 |

## 从本地版迁移数据

1. 打开本地版，进入"数据与设置" → 导出数据，下载 JSON 文件
2. 部署服务端版本后，进入"数据与设置" → 导入数据，上传刚才的文件
