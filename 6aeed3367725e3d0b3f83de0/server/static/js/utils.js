/**
 * 工具函数
 */
const Utils = (function() {

    /**
     * 生成唯一 ID
     */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 格式化日期 YYYY-MM-DD
     */
    function formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 格式化日期时间 YYYY-MM-DD HH:mm
     */
    function formatDateTime(date) {
        const d = new Date(date);
        const dateStr = formatDate(d);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${dateStr} ${hours}:${minutes}`;
    }

    /**
     * 获取今天的日期字符串
     */
    function today() {
        return formatDate(new Date());
    }

    /**
     * 获取本周的日期范围（周一到周日）
     */
    function getWeekDates(date = new Date(), weekStartsOn = 1) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = (day - weekStartsOn + 7) % 7;
        const monday = new Date(d);
        monday.setDate(d.getDate() - diff);

        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            dates.push(formatDate(date));
        }
        return dates;
    }

    /**
     * 获取星期几的中文名称
     */
    function getWeekdayName(dateStr) {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const d = new Date(dateStr);
        return days[d.getDay()];
    }

    /**
     * 计算两个日期之间的天数差
     */
    function daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * 判断是否是今天
     */
    function isToday(dateStr) {
        return formatDate(new Date()) === dateStr;
    }

    /**
     * 显示 Toast 提示
     */
    function toast(message, type = 'info', duration = 2500) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * 显示确认对话框
     */
    function confirm(message, title = '确认') {
        return new Promise((resolve) => {
            showModal({
                title,
                content: `<p>${message}</p>`,
                footer: `
                    <button class="btn" id="confirmCancel">取消</button>
                    <button class="btn btn-danger" id="confirmOk">确认</button>
                `,
                onMount: (modal) => {
                    document.getElementById('confirmCancel').onclick = () => {
                        closeModal(modal);
                        resolve(false);
                    };
                    document.getElementById('confirmOk').onclick = () => {
                        closeModal(modal);
                        resolve(true);
                    };
                }
            });
        });
    }

    /**
     * 显示模态框
     */
    function showModal(options) {
        const container = document.getElementById('modalContainer');
        if (!container) return null;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <span class="modal-title">${options.title || ''}</span>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">${options.content || ''}</div>
                ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
            </div>
        `;

        container.appendChild(overlay);

        // 关闭按钮
        overlay.querySelector('.modal-close').onclick = () => closeModal(overlay);
        // 点击背景关闭（如果允许）
        if (options.closeOnBackdrop !== false) {
            overlay.onclick = (e) => {
                if (e.target === overlay) closeModal(overlay);
            };
        }

        // 挂载回调
        if (typeof options.onMount === 'function') {
            options.onMount(overlay);
        }

        return overlay;
    }

    /**
     * 关闭模态框
     */
    function closeModal(modal) {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }

    /**
     * 转义 HTML 防止 XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 下载文件
     */
    function downloadFile(content, filename, type = 'application/json') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 读取文件内容
     */
    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    /**
     * 防抖
     */
    function debounce(fn, delay = 300) {
        let timer = null;
        return function(...args) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    /**
     * 简单的 HTML 模板渲染
     */
    function html(strings, ...values) {
        let result = strings[0];
        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            if (Array.isArray(value)) {
                result += value.join('');
            } else if (value == null) {
                result += '';
            } else {
                result += value;
            }
            result += strings[i + 1];
        }
        return result;
    }

    return {
        generateId,
        formatDate,
        formatDateTime,
        today,
        getWeekDates,
        getWeekdayName,
        daysBetween,
        isToday,
        toast,
        confirm,
        showModal,
        closeModal,
        escapeHtml,
        downloadFile,
        readFile,
        debounce,
        html
    };
})();
