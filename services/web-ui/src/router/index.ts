import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'help',
    component: () => import('@/views/Help/HelpView.vue')
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/Dashboard/DashboardView.vue')
  },
  {
    path: '/mcp',
    name: 'mcp',
    component: () => import('@/views/MCP/MCPView.vue')
  },
  {
    path: '/timer',
    name: 'timer',
    component: () => import('@/views/Timer/TimerView.vue')
  },
  {
    path: '/knowledge',
    name: 'knowledge',
    component: () => import('@/views/Knowledge/KnowledgePage.vue')
  },
  {
    path: '/config',
    name: 'config',
    component: () => import('@/views/Config/ConfigView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
