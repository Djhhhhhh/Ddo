/**
 * Ddo 项目 TODO List 应用
 * 基于 dev-workflow.md 的任务管理器
 */

// ==================== 初始任务数据 ====================
const defaultTasks = {
    p1: {
        title: 'Phase 1: 基础设施',
        subtitle: '阻塞项 - 必须按序完成',
        status: 'blocked',
        tasks: [
            // CLI 基础设施
            { id: 'p1-1', title: 'CLI: ddo init 实现', module: 'cli', status: 'pending', priority: 'high', notes: '创建目录结构 ~/.ddo/data/mysql/' },
            { id: 'p1-2', title: '创建 docker-compose.yml', module: 'other', status: 'pending', priority: 'high', notes: 'MySQL 8.0 容器配置' },
            { id: 'p1-3', title: '初始化数据目录 ~/.ddo/data/mysql/', module: 'cli', status: 'pending', priority: 'high', notes: '数据持久化目录' },
            { id: 'p1-4', title: '启动 MySQL 容器', module: 'other', status: 'pending', priority: 'high', notes: 'Docker Desktop 必须运行' },
            { id: 'p1-5', title: '生成 config.yaml 配置', module: 'cli', status: 'pending', priority: 'high', notes: '默认配置模板' },
            { id: 'p1-6', title: 'CLI: ddo start 实现', module: 'cli', status: 'pending', priority: 'high', notes: '服务启动、进程管理' },
            { id: 'p1-7', title: '进程管理 PID 文件', module: 'cli', status: 'pending', priority: 'high', notes: '记录服务进程ID' },
            { id: 'p1-8', title: '服务启动顺序控制', module: 'cli', status: 'pending', priority: 'medium', notes: 'MySQL -> server-go -> llm-py' },
            { id: 'p1-9', title: 'CLI: ddo stop 实现', module: 'cli', status: 'pending', priority: 'high', notes: '停止所有服务' },
            { id: 'p1-10', title: 'CLI: ddo status 实现', module: 'cli', status: 'pending', priority: 'medium', notes: '显示 MySQL 运行状态' },
            { id: 'p1-11', title: 'CLI: ddo logs 实现', module: 'cli', status: 'pending', priority: 'medium', notes: '查看服务日志' },
            { id: 'p1-12', title: '数据持久化验证', module: 'cli', status: 'pending', priority: 'high', notes: '删除容器后数据还在' }
        ]
    },
    p2: {
        title: 'Phase 2: 核心能力',
        subtitle: '可并行开发',
        status: 'pending',
        tasks: [
            // A组：CLI
            { id: 'p2-1', title: 'CLI: REPL 模式基础', module: 'cli', status: 'pending', priority: 'high', notes: '命令解析框架' },
            { id: 'p2-2', title: 'CLI: /chat 命令', module: 'cli', status: 'pending', priority: 'high', notes: '与 llm-py 交互' },
            { id: 'p2-3', title: 'CLI: /kb 命令', module: 'cli', status: 'pending', priority: 'high', notes: '知识库管理' },
            { id: 'p2-4', title: 'CLI: NLP 集成', module: 'cli', status: 'pending', priority: 'medium', notes: '自然语言理解' },

            // B组：llm-py
            { id: 'p2-5', title: 'llm-py: FastAPI 框架', module: 'llm', status: 'pending', priority: 'high', notes: '基础项目结构' },
            { id: 'p2-6', title: 'llm-py: OpenRouter 代理', module: 'llm', status: 'pending', priority: 'high', notes: 'Chat API 转发' },
            { id: 'p2-7', title: 'RAG Engine: Embedder', module: 'llm', status: 'pending', priority: 'high', notes: '文档嵌入' },
            { id: 'p2-8', title: 'RAG Engine: Retriever', module: 'llm', status: 'pending', priority: 'high', notes: '向量检索' },
            { id: 'p2-9', title: 'RAG Engine: Generator', module: 'llm', status: 'pending', priority: 'high', notes: '回答生成' },
            { id: 'p2-10', title: 'llm-py API 文档', module: 'llm', status: 'pending', priority: 'medium', notes: '/docs 自动文档' },

            // C组：server-go
            { id: 'p2-11', title: 'server-go: Gin 框架', module: 'server', status: 'pending', priority: 'high', notes: '基础项目结构' },
            { id: 'p2-12', title: 'server-go: MySQL 连接', module: 'server', status: 'pending', priority: 'high', notes: 'GORM 配置' },
            { id: 'p2-13', title: 'server-go: 健康检查 API', module: 'server', status: 'pending', priority: 'high', notes: '/health 端点' },
            { id: 'p2-14', title: 'server-go: 知识库 CRUD', module: 'server', status: 'pending', priority: 'high', notes: '知识库管理API' },
            { id: 'p2-15', title: 'server-go: 定时任务 API', module: 'server', status: 'pending', priority: 'medium', notes: 'Cron 调度、HTTP回调' },
            { id: 'p2-16', title: 'server-go: MCP 管理 API', module: 'server', status: 'pending', priority: 'medium', notes: 'MCP 服务管理' },
            { id: 'p2-17', title: 'server-go: BadgerDB 队列', module: 'server', status: 'pending', priority: 'medium', notes: '嵌入式消息队列' },

            // 接口联调
            { id: 'p2-18', title: 'B组/C组接口联调', module: 'other', status: 'pending', priority: 'high', notes: 'llm-py ↔ server-go' },
            { id: 'p2-19', title: 'CLI 端到端测试', module: 'cli', status: 'pending', priority: 'high', notes: '完整流程验证' }
        ]
    },
    p3: {
        title: 'Phase 3: 扩展层',
        subtitle: '最后完善',
        status: 'pending',
        tasks: [
            // Web Dashboard
            { id: 'p3-1', title: 'Web: Vue 3 框架', module: 'web', status: 'pending', priority: 'high', notes: 'Vite 项目结构' },
            { id: 'p3-2', title: 'Web: Dashboard 页面', module: 'web', status: 'pending', priority: 'high', notes: '主界面布局' },
            { id: 'p3-3', title: 'Web: API 对接', module: 'web', status: 'pending', priority: 'high', notes: 'Axios 配置' },
            { id: 'p3-4', title: 'Web: MCP/Timer 配置表单', module: 'web', status: 'pending', priority: 'medium', notes: '配置管理界面' },
            { id: 'p3-5', title: 'Web: 图表组件', module: 'web', status: 'pending', priority: 'medium', notes: '数据可视化' },

            // Electron Ding
            { id: 'p3-6', title: 'Electron: 主进程', module: 'web', status: 'pending', priority: 'high', notes: 'Electron 基础' },
            { id: 'p3-7', title: 'Electron: 灵动岛窗口', module: 'web', status: 'pending', priority: 'high', notes: '悬浮通知窗口' },
            { id: 'p3-8', title: 'Electron: 系统通知', module: 'web', status: 'pending', priority: 'medium', notes: 'native notification' },
            { id: 'p3-9', title: 'Electron: 常驻托盘', module: 'web', status: 'pending', priority: 'medium', notes: '系统托盘图标' },
            { id: 'p3-10', title: 'Electron: 定时任务弹窗', module: 'web', status: 'pending', priority: 'high', notes: 'Ding 通知' },

            // 集成测试
            { id: 'p3-11', title: 'Web 联调', module: 'other', status: 'pending', priority: 'high', notes: '前后端联调' },
            { id: 'p3-12', title: 'Ding 通知测试', module: 'other', status: 'pending', priority: 'medium', notes: 'Electron 通知测试' },
            { id: 'p3-13', title: '完整流程验证', module: 'other', status: 'pending', priority: 'high', notes: 'E2E 测试' },
            { id: 'p3-14', title: '跨平台测试', module: 'other', status: 'pending', priority: 'medium', notes: 'Win/Mac 双环境' }
        ]
    }
};

// ==================== 状态管理 ====================
let tasks = JSON.parse(JSON.stringify(defaultTasks));
let customTasks = [];

// 从 localStorage 加载
function loadFromStorage() {
    const saved = localStorage.getItem('ddo-tasks');
    const savedCustom = localStorage.getItem('ddo-custom-tasks');
    if (saved) {
        tasks = JSON.parse(saved);
    }
    if (savedCustom) {
        customTasks = JSON.parse(savedCustom);
    }
}

// 保存到 localStorage
function saveToStorage() {
    localStorage.setItem('ddo-tasks', JSON.stringify(tasks));
    localStorage.setItem('ddo-custom-tasks', JSON.stringify(customTasks));
}

// ==================== 渲染函数 ====================
function renderAll() {
    renderStats();
    renderProgress();
    renderPhases();
    renderCurrentFocus();
}

function renderStats() {
    let pending = 0, inProgress = 0, done = 0;

    Object.values(tasks).forEach(phase => {
        phase.tasks.forEach(task => {
            if (task.status === 'done') done++;
            else if (task.status === 'in-progress') inProgress++;
            else pending++;
        });
    });

    customTasks.forEach(task => {
        if (task.status === 'done') done++;
        else if (task.status === 'in-progress') inProgress++;
        else pending++;
    });

    const total = pending + inProgress + done;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-progress').textContent = inProgress;
    document.getElementById('stat-done').textContent = done;
    document.getElementById('stat-percent').textContent = percent + '%';
}

function renderProgress() {
    let total = 0, done = 0, inProgress = 0;

    Object.values(tasks).forEach(phase => {
        phase.tasks.forEach(task => {
            total++;
            if (task.status === 'done') done++;
            else if (task.status === 'in-progress') inProgress++;
        });
    });

    customTasks.forEach(task => {
        total++;
        if (task.status === 'done') done++;
        else if (task.status === 'in-progress') inProgress++;
    });

    const donePercent = total > 0 ? (done / total) * 100 : 0;
    const progressPercent = total > 0 ? (inProgress / total) * 100 : 0;

    const bar = document.getElementById('progress-bar');
    bar.innerHTML = `
        <div class="progress-segment done" style="width: ${donePercent}%"></div>
        <div class="progress-segment progress" style="width: ${progressPercent}%"></div>
    `;

    document.getElementById('progress-text').textContent = `${done}/${total} 完成`;
}

function renderPhases() {
    const container = document.getElementById('phases-container');
    container.innerHTML = '';

    const phaseOrder = ['p1', 'p2', 'p3'];
    const statusMap = {
        'blocked': { text: '阻塞', class: 'blocked' },
        'active': { text: '进行中', class: 'active' },
        'pending': { text: '待开始', class: 'pending' },
        'completed': { text: '已完成', class: 'completed' }
    };

    phaseOrder.forEach(phaseKey => {
        const phase = tasks[phaseKey];
        const status = statusMap[phase.status];

        // 按状态分组任务
        const inProgress = phase.tasks.filter(t => t.status === 'in-progress');
        const pending = phase.tasks.filter(t => t.status === 'pending');
        const done = phase.tasks.filter(t => t.status === 'done');

        const card = document.createElement('div');
        card.className = 'phase-card';
        card.innerHTML = `
            <div class="phase-header">
                <div class="phase-title">
                    <div class="phase-badge ${phaseKey}">${phaseKey.toUpperCase()}</div>
                    <div class="phase-info">
                        <h3>${phase.title}</h3>
                        <p>${phase.subtitle}</p>
                    </div>
                </div>
                <span class="phase-status ${status.class}">${status.text}</span>
            </div>
            <div class="phase-body">
                ${(phaseKey === 'p1' || phaseKey === 'p2') && inProgress.length > 0 ? renderTaskGroup('🚧 进行中', inProgress) : ''}
                ${pending.length > 0 ? renderTaskGroup('⏳ 待开始', pending, phaseKey) : ''}
                ${done.length > 0 ? renderTaskGroup('✅ 已完成', done) : ''}
            </div>
        `;
        container.appendChild(card);
    });

    // 自定义任务
    if (customTasks.length > 0) {
        const customPending = customTasks.filter(t => t.status === 'pending');
        const customProgress = customTasks.filter(t => t.status === 'in-progress');
        const customDone = customTasks.filter(t => t.status === 'done');

        if (customPending.length > 0 || customProgress.length > 0 || customDone.length > 0) {
            const customCard = document.createElement('div');
            customCard.className = 'phase-card';
            customCard.innerHTML = `
                <div class="phase-header">
                    <div class="phase-title">
                        <div class="phase-badge" style="background: #e0e7ff; color: #3730a3;">📌</div>
                        <div class="phase-info">
                            <h3>自定义任务</h3>
                            <p>额外添加的任务项</p>
                        </div>
                    </div>
                </div>
                <div class="phase-body">
                    ${customProgress.length > 0 ? renderTaskGroup('🚧 进行中', customProgress, null, true) : ''}
                    ${customPending.length > 0 ? renderTaskGroup('⏳ 待开始', customPending, null, true) : ''}
                    ${customDone.length > 0 ? renderTaskGroup('✅ 已完成', customDone, null, true) : ''}
                </div>
            `;
            container.appendChild(customCard);
        }
    }
}

function renderTaskGroup(title, taskList, phaseKey = null, isCustom = false) {
    return `
        <div class="task-group">
            <div class="group-title">${title} (${taskList.length})</div>
            <ul class="task-list">
                ${taskList.map(task => renderTaskItem(task, phaseKey, isCustom)).join('')}
            </ul>
        </div>
    `;
}

function renderTaskItem(task, phaseKey, isCustom = false) {
    const moduleColors = {
        'cli': 'module-cli',
        'llm': 'module-llm',
        'server': 'module-server',
        'web': 'module-web',
        'other': ''
    };

    const moduleNames = {
        'cli': 'CLI',
        'llm': 'llm-py',
        'server': 'server-go',
        'web': 'web-ui',
        'other': '其他'
    };

    const checkboxClass = task.status === 'done' ? 'checked' : (task.status === 'in-progress' ? 'in-progress' : '');
    const itemClass = task.status === 'done' ? 'done' : (task.status === 'in-progress' ? 'active-task' : '');
    const priorityTag = task.priority === 'high' ? '<span class="task-tag priority-high">高优先级</span>' : '';

    return `
        <li class="task-item ${itemClass}" data-id="${task.id}" data-custom="${isCustom}">
            <div class="checkbox ${checkboxClass}" onclick="toggleTaskStatus('${task.id}', ${isCustom})"></div>
            <div class="task-content">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                    <span class="task-tag ${moduleColors[task.module]}">${moduleNames[task.module]}</span>
                    ${priorityTag}
                    ${task.notes ? `<span class="task-tag">${task.notes}</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                ${task.status === 'pending' ? `<button class="action-btn play" onclick="startTask('${task.id}', ${isCustom})" title="开始任务">▶</button>` : ''}
                ${isCustom ? `<button class="action-btn" onclick="deleteCustomTask('${task.id}')" title="删除">🗑</button>` : ''}
            </div>
        </li>
    `;
}

function renderCurrentFocus() {
    const focusTasks = document.getElementById('focus-tasks');
    const focusSection = document.getElementById('focus-section');

    // 获取当前应该开始的任务 (Phase 1 pending 优先)
    const p1Pending = tasks.p1.tasks.filter(t => t.status === 'pending');
    const p1InProgress = tasks.p1.tasks.filter(t => t.status === 'in-progress');

    let focusList = [];

    // 如果 Phase 1 有进行中的任务，先显示
    if (p1InProgress.length > 0) {
        focusList = p1InProgress.slice(0, 3);
    }
    // 否则显示 Phase 1 待开始的任务
    else if (p1Pending.length > 0) {
        focusList = p1Pending.slice(0, 3);
    }
    // Phase 1 完成后，检查 Phase 2
    else {
        const p1Done = tasks.p1.tasks.every(t => t.status === 'done');
        if (p1Done) {
            const p2Pending = tasks.p2.tasks.filter(t => t.status === 'pending');
            const p2InProgress = tasks.p2.tasks.filter(t => t.status === 'in-progress');
            focusList = p2InProgress.length > 0 ? p2InProgress.slice(0, 3) : p2Pending.slice(0, 3);
        }
    }

    if (focusList.length === 0) {
        focusSection.style.display = 'none';
        return;
    }

    focusSection.style.display = 'block';
    focusTasks.innerHTML = focusList.map((task, index) => `
        <div class="focus-task">
            <div class="task-number">${index + 1}</div>
            <div class="task-info">
                <h4>${task.title}</h4>
                <p>${task.notes || '点击开始这项任务'}</p>
            </div>
            <button class="btn btn-primary" onclick="startTask('${task.id}', false)">
                ${task.status === 'in-progress' ? '继续' : '开始'}
            </button>
        </div>
    `).join('');
}

// ==================== 任务操作 ====================
function toggleTaskStatus(taskId, isCustom) {
    if (isCustom) {
        const task = customTasks.find(t => t.id === taskId);
        if (task) {
            task.status = task.status === 'done' ? 'pending' : 'done';
        }
    } else {
        Object.values(tasks).forEach(phase => {
            const task = phase.tasks.find(t => t.id === taskId);
            if (task) {
                task.status = task.status === 'done' ? 'pending' : 'done';
            }
        });
    }

    updatePhaseStatus();
    saveToStorage();
    renderAll();
    showToast('任务状态已更新');
}

function startTask(taskId, isCustom) {
    if (isCustom) {
        const task = customTasks.find(t => t.id === taskId);
        if (task) {
            task.status = 'in-progress';
        }
    } else {
        Object.values(tasks).forEach(phase => {
            const task = phase.tasks.find(t => t.id === taskId);
            if (task) {
                task.status = 'in-progress';
            }
        });
    }

    updatePhaseStatus();
    saveToStorage();
    renderAll();
    showToast('任务已开始，加油！💪');
}

function startNextTask() {
    // 找到 Phase 1 第一个待开始的任务
    const nextTask = tasks.p1.tasks.find(t => t.status === 'pending');
    if (nextTask) {
        startTask(nextTask.id, false);
    } else {
        // Phase 1 完成，找 Phase 2
        const p2Task = tasks.p2.tasks.find(t => t.status === 'pending');
        if (p2Task) {
            startTask(p2Task.id, false);
        } else {
            showToast('🎉 所有任务已完成！');
        }
    }
}

function updatePhaseStatus() {
    // Update Phase 1
    const p1Done = tasks.p1.tasks.every(t => t.status === 'done');
    const p1InProgress = tasks.p1.tasks.some(t => t.status === 'in-progress');
    if (p1Done) {
        tasks.p1.status = 'completed';
    } else if (p1InProgress || tasks.p1.tasks.some(t => t.status === 'done')) {
        tasks.p1.status = 'active';
    }

    // Update Phase 2
    if (p1Done) {
        const p2Done = tasks.p2.tasks.every(t => t.status === 'done');
        const p2InProgress = tasks.p2.tasks.some(t => t.status === 'in-progress');
        if (p2Done) {
            tasks.p2.status = 'completed';
        } else if (p2InProgress || tasks.p2.tasks.some(t => t.status === 'done')) {
            tasks.p2.status = 'active';
        }
    }

    // Update Phase 3
    const p2Done = tasks.p2.tasks.every(t => t.status === 'done');
    if (p1Done && p2Done) {
        const p3Done = tasks.p3.tasks.every(t => t.status === 'done');
        const p3InProgress = tasks.p3.tasks.some(t => t.status === 'in-progress');
        if (p3Done) {
            tasks.p3.status = 'completed';
        } else if (p3InProgress || tasks.p3.tasks.some(t => t.status === 'done')) {
            tasks.p3.status = 'active';
        }
    }
}

function resetAllTasks() {
    if (confirm('确定要重置所有任务进度吗？这将清除所有完成状态。')) {
        tasks = JSON.parse(JSON.stringify(defaultTasks));
        customTasks = [];
        saveToStorage();
        renderAll();
        showToast('所有进度已重置');
    }
}

// ==================== 自定义任务 ====================
function openModal() {
    document.getElementById('modal').classList.add('active');
    document.getElementById('task-name').focus();
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    document.getElementById('task-name').value = '';
    document.getElementById('task-notes').value = '';
}

function addTask() {
    const name = document.getElementById('task-name').value.trim();
    const phase = document.getElementById('task-phase').value;
    const module = document.getElementById('task-module').value;
    const notes = document.getElementById('task-notes').value.trim();

    if (!name) {
        alert('请输入任务名称');
        return;
    }

    const newTask = {
        id: 'custom-' + Date.now(),
        title: name,
        module: module,
        status: 'pending',
        priority: 'medium',
        notes: notes
    };

    customTasks.push(newTask);
    saveToStorage();
    renderAll();
    closeModal();
    showToast('任务已添加');
}

function deleteCustomTask(taskId) {
    if (confirm('确定要删除这个任务吗？')) {
        customTasks = customTasks.filter(t => t.id !== taskId);
        saveToStorage();
        renderAll();
        showToast('任务已删除');
    }
}

// ==================== 导出功能 ====================
function exportMarkdown() {
    let md = '# Ddo 项目开发进度\n\n';
    md += `生成时间: ${new Date().toLocaleString()}\n\n`;

    Object.entries(tasks).forEach(([key, phase]) => {
        const done = phase.tasks.filter(t => t.status === 'done').length;
        const total = phase.tasks.length;
        md += `## ${phase.title}\n\n`;
        md += `进度: ${done}/${total} (${Math.round(done/total*100)}%)\n\n`;

        phase.tasks.forEach(task => {
            const status = task.status === 'done' ? '✅' : (task.status === 'in-progress' ? '🚧' : '⬜');
            md += `- ${status} ${task.title}`;
            if (task.notes) md += ` - ${task.notes}`;
            md += '\n';
        });
        md += '\n';
    });

    if (customTasks.length > 0) {
        md += '## 自定义任务\n\n';
        customTasks.forEach(task => {
            const status = task.status === 'done' ? '✅' : (task.status === 'in-progress' ? '🚧' : '⬜');
            md += `- ${status} ${task.title}\n`;
        });
    }

    downloadFile('ddo-tasks.md', md, 'text/markdown');
    showToast('Markdown 已导出');
}

function exportJSON() {
    const data = {
        exportTime: new Date().toISOString(),
        phases: tasks,
        customTasks: customTasks
    };
    downloadFile('ddo-tasks.json', JSON.stringify(data, null, 2), 'application/json');
    showToast('JSON 已导出');
}

function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ==================== 工具函数 ====================
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
    if (e.ctrlKey && e.key === 'Enter') {
        if (document.getElementById('modal').classList.contains('active')) {
            addTask();
        }
    }
});

// 点击模态框外部关闭
document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeModal();
    }
});

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    updatePhaseStatus();
    renderAll();

    // 首次访问提示
    if (!localStorage.getItem('ddo-visited')) {
        showToast('👋 欢迎使用 Ddo 任务追踪系统！');
        localStorage.setItem('ddo-visited', 'true');
    }
});
