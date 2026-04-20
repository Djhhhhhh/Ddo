<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import Modal from '@/components/ui/Modal.vue'
import StatCard from '@/components/StatCard.vue'
import RagChat from '@/components/Knowledge/RagChat.vue'
import * as knowledgeApi from '@/api/knowledge'
import type { Knowledge, CreateKnowledgeRequest, WordCloudItem } from '@/api/types'

const knowledgeList = ref<Knowledge[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const loading = ref(false)

// Search & Filter
const searchKeyword = ref('')
const selectedCategory = ref('')
const selectedTag = ref('')

// Word cloud data
const categoryCloud = ref<WordCloudItem[]>([])
const tagCloud = ref<WordCloudItem[]>([])

// All unique categories and tags from list
const allCategories = computed(() => {
  const cats = new Set<string>()
  knowledgeList.value.forEach(k => { if (k.category) cats.add(k.category) })
  return [{ label: '全部', value: '' }, ...Array.from(cats).map(c => ({ label: c, value: c }))]
})

const allTags = computed(() => {
  const tags = new Set<string>()
  knowledgeList.value.forEach(k => k.tags?.forEach(t => tags.add(t)))
  return [{ label: '全部', value: '' }, ...Array.from(tags).map(t => ({ label: t, value: t }))]
})

// Modal states
const showDetail = ref(false)
const selectedKnowledge = ref<Knowledge | null>(null)
const showCreateForm = ref(false)
const showDeleteConfirm = ref(false)

// Create form
const createForm = ref<CreateKnowledgeRequest>({
  title: '',
  content: '',
  category: '',
  tags: [],
  source: ''
})
const createTagsInput = ref('')
const createLoading = ref(false)

// Load knowledge list
async function loadKnowledge() {
  loading.value = true
  try {
    const res = await knowledgeApi.listKnowledge({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value,
      category: selectedCategory.value,
      tag: selectedTag.value
    })
    knowledgeList.value = res.data.items
    total.value = res.data.total

    // Build word cloud data
    const catCounts = new Map<string, number>()
    const tagCounts = new Map<string, number>()
    knowledgeList.value.forEach(k => {
      if (k.category) {
        catCounts.set(k.category, (catCounts.get(k.category) || 0) + 1)
      }
      k.tags?.forEach(t => {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1)
      })
    })
    categoryCloud.value = Array.from(catCounts.entries()).map(([name, value]) => ({ name, value }))
    tagCloud.value = Array.from(tagCounts.entries()).map(([name, value]) => ({ name, value }))
  } catch (e) {
    console.error('Failed to load knowledge:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadKnowledge)

// Pagination
const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    loadKnowledge()
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    loadKnowledge()
  }
}

// Search with keyword filter
async function handleSearch() {
  currentPage.value = 1
  await loadKnowledge()
}

// Reset filters
function resetFilters() {
  searchKeyword.value = ''
  selectedCategory.value = ''
  selectedTag.value = ''
  currentPage.value = 1
  loadKnowledge()
}

// View detail
async function viewDetail(item: Knowledge) {
  try {
    const res = await knowledgeApi.getKnowledge(item.uuid)
    selectedKnowledge.value = res.data.knowledge
    showDetail.value = true
  } catch (e) {
    selectedKnowledge.value = item
    showDetail.value = true
  }
}

// Create knowledge
async function submitCreate() {
  if (!createForm.value.title || !createForm.value.content) return
  createLoading.value = true
  try {
    const payload = {
      title: createForm.value.title,
      content: createForm.value.content,
      source: 'web'
    }
    await knowledgeApi.createKnowledge(payload)
    showCreateForm.value = false
    createForm.value = { title: '', content: '', category: '', tags: [], source: '' }
    createTagsInput.value = ''
    await loadKnowledge()
  } catch (e) {
    console.error('Failed to create knowledge:', e)
  } finally {
    createLoading.value = false
  }
}

// Delete knowledge
async function deleteKnowledge() {
  if (!selectedKnowledge.value) return
  try {
    await knowledgeApi.deleteKnowledge(selectedKnowledge.value.uuid)
    showDeleteConfirm.value = false
    showDetail.value = false
    selectedKnowledge.value = null
    await loadKnowledge()
  } catch (e) {
    console.error('Failed to delete:', e)
  }
}

// Format date
function formatDate(date?: string) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// Get word cloud item style based on value
function getWordCloudStyle(item: WordCloudItem, maxValue: number) {
  const scale = maxValue > 0 ? item.value / maxValue : 0
  const fontSize = 12 + scale * 16 // 12px to 28px
  const opacity = 0.4 + scale * 0.6 // 0.4 to 1.0
  return {
    fontSize: `${fontSize}px`,
    opacity: opacity,
    fontWeight: scale > 0.5 ? '500' : '400'
  }
}

const maxCategoryValue = computed(() => Math.max(...categoryCloud.value.map(c => c.value), 1))
const maxTagValue = computed(() => Math.max(...tagCloud.value.map(t => t.value), 1))
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <h1 class="font-display text-3xl font-medium text-gray-900">知识库</h1>
        <Button variant="black" @click="showCreateForm = true">+ 新增词条</Button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="总条目" :value="total" subtitle="条目总数" />
        <StatCard title="分类" :value="categoryCloud.length" subtitle="分类数" />
        <StatCard title="标签" :value="tagCloud.length" subtitle="标签数" />
      </div>
    </div>

    <!-- Main Content - Split Layout -->
    <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
      <!-- Left Panel - Knowledge List & Filters -->
      <div class="xl:col-span-3 space-y-4">
        <!-- Search & Filter Bar -->
        <Card class="!p-5">
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="flex-1">
              <Input
                v-model="searchKeyword"
                placeholder="搜索标题或内容..."
                class="w-full"
                @keydown.enter="handleSearch"
              />
            </div>
            <div class="flex gap-2">
              <Select
                v-model="selectedCategory"
                :options="allCategories"
                placeholder="分类"
                class="w-36"
                @update:modelValue="handleSearch"
              />
              <Select
                v-model="selectedTag"
                :options="allTags"
                placeholder="标签"
                class="w-36"
                @update:modelValue="handleSearch"
              />
              <Button variant="gray" @click="handleSearch">搜索</Button>
              <Button v-if="searchKeyword || selectedCategory || selectedTag" variant="white" @click="resetFilters">
                重置
              </Button>
            </div>
          </div>
        </Card>

        <!-- Knowledge List -->
        <Card>
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-medium text-gray-900">知识列表</h3>
            <span class="text-sm text-gray-500">共 {{ total }} 条</span>
          </div>

          <div v-if="loading" class="text-center py-8 text-gray-500">加载中...</div>
          <div v-else-if="knowledgeList.length === 0" class="text-center py-8 text-gray-500">
            暂无知识条目
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="item in knowledgeList"
              :key="item.uuid"
              class="p-4 bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
              style="border-radius: 12px;"
              @click="viewDetail(item)"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <h4 class="font-medium text-gray-900 mb-1 truncate">{{ item.title }}</h4>
                  <p class="text-sm text-gray-500 line-clamp-2 mb-2">{{ item.content }}</p>
                  <div class="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span v-if="item.category" class="px-2 py-0.5 bg-gray-200 rounded-full">
                      {{ item.category }}
                    </span>
                    <span v-for="tag in item.tags?.slice(0, 3)" :key="tag" class="px-2 py-0.5 bg-gray-100 rounded-full">
                      {{ tag }}
                    </span>
                    <span v-if="item.tags && item.tags.length > 3" class="text-gray-500">
                      +{{ item.tags.length - 3 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div v-if="totalPages > 1" class="flex items-center justify-center gap-4 pt-4 border-t border-gray-200">
              <Button variant="gray" :disabled="currentPage === 1" @click="prevPage">← 上一页</Button>
              <span class="text-sm text-gray-500">{{ currentPage }} / {{ totalPages }}</span>
              <Button variant="gray" :disabled="currentPage >= totalPages" @click="nextPage">下一页 →</Button>
            </div>
          </div>
        </Card>
      </div>

      <!-- Right Panel - Sidebar -->
      <div class="space-y-4">
        <!-- Category & Tag Clouds -->
        <Card>
          <h3 class="font-medium text-gray-900 mb-3">分类分布</h3>
          <div v-if="categoryCloud.length === 0" class="text-sm text-gray-500 py-2 text-center">
            暂无分类数据
          </div>
          <div v-else class="flex flex-wrap gap-2">
            <span
              v-for="item in categoryCloud"
              :key="item.name"
              class="cursor-pointer px-2 py-1 text-xs bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
              style="border-radius: 9999px;"
              @click="selectedCategory = item.name; handleSearch()"
            >
              {{ item.name }} ({{ item.value }})
            </span>
          </div>
        </Card>

        <Card>
          <h3 class="font-medium text-gray-900 mb-3">标签分布</h3>
          <div v-if="tagCloud.length === 0" class="text-sm text-gray-500 py-2 text-center">
            暂无标签数据
          </div>
          <div v-else class="flex flex-wrap gap-2">
            <span
              v-for="item in tagCloud"
              :key="item.name"
              class="cursor-pointer px-2 py-1 text-xs bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
              style="border-radius: 9999px;"
              @click="selectedTag = item.name; handleSearch()"
            >
              {{ item.name }} ({{ item.value }})
            </span>
          </div>
        </Card>

        <!-- RAG Chat -->
        <Card class="h-[calc(100vh-180px)]">
          <RagChat />
        </Card>
      </div>
    </div>

    <!-- Detail Modal -->
    <Modal v-model="showDetail" :title="selectedKnowledge?.title || '知识详情'">
      <div v-if="selectedKnowledge" class="space-y-4">
        <div v-if="selectedKnowledge.category">
          <label class="block text-sm font-medium text-gray-500 mb-1">分类</label>
          <p class="text-gray-900">{{ selectedKnowledge.category }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-500 mb-1">内容</label>
          <p class="text-gray-900 whitespace-pre-wrap">{{ selectedKnowledge.content }}</p>
        </div>
        <div v-if="selectedKnowledge.tags?.length">
          <label class="block text-sm font-medium text-gray-500 mb-1">标签</label>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="tag in selectedKnowledge.tags"
              :key="tag"
              class="px-2 py-1 bg-gray-100 text-gray-600 text-sm"
              style="border-radius: 9999px;"
            >
              {{ tag }}
            </span>
          </div>
        </div>
        <div v-if="selectedKnowledge.source">
          <label class="block text-sm font-medium text-gray-500 mb-1">来源</label>
          <p class="text-gray-900">{{ selectedKnowledge.source }}</p>
        </div>
        <div class="flex gap-4 text-xs text-gray-400">
          <span>创建: {{ formatDate(selectedKnowledge.created_at) }}</span>
          <span>更新: {{ formatDate(selectedKnowledge.updated_at) }}</span>
        </div>
        <div class="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <Button variant="gray" @click="showDeleteConfirm = true">删除</Button>
          <Button variant="white" @click="showDetail = false">关闭</Button>
        </div>
      </div>
    </Modal>

    <!-- Create Form Modal -->
    <Modal v-model="showCreateForm" title="新增知识库词条" class="max-w-2xl">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
          <Input v-model="createForm.title" placeholder="输入知识标题" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">内容 *</label>
          <textarea
            v-model="createForm.content"
            placeholder="输入知识内容..."
            class="w-full h-32 bg-white border border-gray-200 outline-none p-4 text-sm"
            style="border-radius: 12px;"
          />
        </div>
        <div class="flex justify-end gap-2 pt-4">
          <Button variant="gray" @click="showCreateForm = false">取消</Button>
          <Button
            variant="black"
            :loading="createLoading"
            :disabled="!createForm.title || !createForm.content"
            @click="submitCreate"
          >
            创建
          </Button>
        </div>
      </div>
    </Modal>

    <!-- Delete Confirm Modal -->
    <Modal v-model="showDeleteConfirm" title="确认删除">
      <div class="text-center py-4">
        <p class="text-gray-700 mb-4">确定要删除 "{{ selectedKnowledge?.title }}" 吗？</p>
        <p class="text-sm text-gray-500">此操作不可撤销。</p>
      </div>
      <div class="flex justify-center gap-4">
        <Button variant="gray" @click="showDeleteConfirm = false">取消</Button>
        <Button variant="black" @click="deleteKnowledge">确认删除</Button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
