/**
 * 简单的前端路由系统
 * 使用 hash 路由，不需要服务器支持
 */
const Router = (function() {
    const routes = {};
    let currentRoute = null;
    let currentParams = {};

    /**
     * 注册路由
     * @param {string} path - 路由路径，如 'home', 'weekly'
     * @param {object} module - 模块对象，必须有 render 方法
     */
    function register(path, module) {
        routes[path] = module;
    }

    /**
     * 导航到指定路由
     */
    function navigate(path, params = {}) {
        const hash = `#${path}`;
        if (window.location.hash !== hash) {
            window.location.hash = hash;
        } else {
            // hash 相同但可能参数变了，手动触发
            handleRoute();
        }
        currentParams = params;
    }

    /**
     * 获取当前路由参数
     */
    function getParams() {
        return currentParams;
    }

    /**
     * 获取当前路由
     */
    function getCurrent() {
        return currentRoute;
    }

    /**
     * 处理路由变化
     */
    function handleRoute() {
        const hash = window.location.hash.slice(1) || 'home';
        const path = hash.split('?')[0];
        const module = routes[path];

        if (module) {
            currentRoute = path;
            // 更新页面标题
            const pageTitleEl = document.getElementById('pageTitle');
            if (pageTitleEl && module.name) {
                pageTitleEl.textContent = module.name;
            }
            // 更新导航高亮
            updateNavActive(path);
            // 渲染模块
            const content = document.getElementById('mainContent');
            if (content && typeof module.render === 'function') {
                content.innerHTML = '';
                module.render(content, currentParams);
            }
            // 触发路由变更事件
            window.dispatchEvent(new CustomEvent('routeChanged', { detail: { path, params: currentParams } }));
        } else {
            // 未找到路由，跳转到首页
            navigate('home');
        }
    }

    /**
     * 更新导航栏激活状态
     */
    function updateNavActive(path) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const route = item.getAttribute('data-route');
            if (route === path) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * 初始化路由
     */
    function init() {
        window.addEventListener('hashchange', handleRoute);
        // 初始加载
        handleRoute();
    }

    return {
        register,
        navigate,
        getParams,
        getCurrent,
        init
    };
})();
