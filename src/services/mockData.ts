/**
 * 模擬資料初始化
 * 用於開發和測試
 */

import { nanoid } from 'nanoid';
import { db } from './db/database';
import type { User, Project, Task, View, UserRole, ViewType } from '@/types';
import { getViewRepository } from './repositories';

/**
 * 預設模擬用戶
 */
const MOCK_USERS: Omit<User, 'createdAt' | 'updatedAt'>[] = [
  {
    userId: 'admin1',
    name: '系統管理員',
    email: 'admin@example.com',
    role: 'admin' as UserRole,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
  },
  {
    userId: 'owner1',
    name: '王專案經理',
    email: 'owner@example.com',
    role: 'user' as UserRole,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner',
  },
  {
    userId: 'member1',
    name: '張開發者',
    email: 'member1@example.com',
    role: 'user' as UserRole,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member1',
  },
  {
    userId: 'member2',
    name: '李設計師',
    email: 'member2@example.com',
    role: 'user' as UserRole,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member2',
  },
  {
    userId: 'user1',
    name: '陳使用者',
    email: 'user@example.com',
    role: 'user' as UserRole,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
  },
];

/**
 * 初始化模擬資料
 */
export async function initMockData(): Promise<void> {
  // 檢查是否已初始化
  const isInitialized = await db.isInitialized();
  if (isInitialized) {
    console.log('Mock data already initialized');
    return;
  }

  console.log('Initializing mock data...');

  // 初始化用戶
  const users = MOCK_USERS.map((user) => ({
    ...user,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  await db.users.bulkAdd(users);

  // 初始化專案
  const projects: Project[] = [
    {
      projectId: nanoid(8),
      name: '網站重構專案',
      description: '公司官網全面改版，採用現代化技術架構',
      ownerId: 'owner1',
      memberIds: ['member1', 'member2'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
      settings: {
        allowMemberInvite: true,
        taskNumberPrefix: 'WEB',
      },
    },
    {
      projectId: nanoid(8),
      name: '行動應用開發',
      description: '開發 iOS 和 Android 雙平台應用程式',
      ownerId: 'member1',
      memberIds: ['owner1', 'member2', 'user1'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
      settings: {
        allowMemberInvite: false,
        taskNumberPrefix: 'APP',
      },
    },
    {
      projectId: nanoid(8),
      name: '資料分析平台',
      description: '建立內部資料分析和報表系統',
      ownerId: 'admin1',
      memberIds: ['owner1', 'member1'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
      settings: {
        allowMemberInvite: true,
        taskNumberPrefix: 'DATA',
      },
    },
  ];
  await db.projects.bulkAdd(projects);

  // 初始化任務
  const tasks: Task[] = [];
  const taskStatuses = ['todo', 'inProgress', 'done', 'todo', 'inProgress'];
  const taskPriorities = ['low', 'medium', 'high', 'urgent', 'medium'];
  const assignees = ['member1', 'member2', 'owner1', null, 'member1'];

  for (const project of projects) {
    // 為每個專案建立 5-8 個任務
    const taskCount = 5 + Math.floor(Math.random() * 4);

    for (let i = 0; i < taskCount; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 10) - 5);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 14) + 1);

      const task: Task = {
        taskId: nanoid(12),
        projectId: project.projectId,
        title: `任務 ${i + 1}: ${getRandomTaskTitle()}`,
        description: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `這是專案「${project.name}」的第 ${i + 1} 個任務。需要完成相關的開發和測試工作。`,
                },
              ],
            },
          ],
        },
        statusId: taskStatuses[i % taskStatuses.length] || 'todo',
        assigneeId: assignees[i % assignees.length] || '',
        priorityId: taskPriorities[i % taskPriorities.length] || 'low',
        startDateTime: startDate,
        endDateTime: endDate,
        parentTaskId: null,
        order: i,
        level: 0,
        creatorId: project.ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
        customFields: [],
        tags: getRandomTags(),
        progress: Math.floor(Math.random() * 101),
      };
      tasks.push(task);

      // 為部分任務建立子任務
      if (i < 2) {
        for (let j = 0; j < 2; j++) {
          const subTask: Task = {
            ...task,
            taskId: nanoid(12),
            title: `  └─ 子任務 ${j + 1}: ${getRandomSubTaskTitle()}`,
            parentTaskId: task.taskId,
            level: 1,
            order: j,
            startDateTime: new Date(startDate.getTime() + j * 24 * 60 * 60 * 1000),
            endDateTime: new Date(endDate.getTime() - (2 - j) * 24 * 60 * 60 * 1000),
          };
          tasks.push(subTask);
        }
      }
    }
  }
  await db.tasks.bulkAdd(tasks);

  // 初始化視圖
  const viewRepo = getViewRepository();
  const views: View[] = [];

  // 為 All Tasks 建立預設視圖
  views.push({
    viewId: nanoid(),
    projectId: 'all',
    name: '所有任務',
    type: 'list' as ViewType,
    isDeletable: false,
    isPersonal: false,
    creatorId: 'admin1',
    config: viewRepo.getDefaultConfig('list' as ViewType, true),
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 為每個專案建立預設視圖
  for (const project of projects) {
    // Dashboard 視圖
    views.push({
      viewId: nanoid(),
      projectId: project.projectId,
      name: '儀表板',
      type: 'dashboard' as ViewType,
      isDeletable: false,
      isPersonal: false,
      creatorId: project.ownerId,
      config: viewRepo.getDefaultConfig('dashboard' as ViewType),
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // List 視圖
    views.push({
      viewId: nanoid(),
      projectId: project.projectId,
      name: '列表',
      type: 'list' as ViewType,
      isDeletable: false,
      isPersonal: false,
      creatorId: project.ownerId,
      config: viewRepo.getDefaultConfig('list' as ViewType),
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Board 視圖（可刪除）
    views.push({
      viewId: nanoid(),
      projectId: project.projectId,
      name: '看板',
      type: 'board' as ViewType,
      isDeletable: true,
      isPersonal: false,
      creatorId: project.ownerId,
      config: viewRepo.getDefaultConfig('board' as ViewType),
      order: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  await db.views.bulkAdd(views);

  console.log('Mock data initialized successfully');
  const stats = await db.getStats();
  console.log('Database stats:', stats);
}

/**
 * 清空所有模擬資料
 */
export async function clearMockData(): Promise<void> {
  await db.clearAllData();
  console.log('All mock data cleared');
}

/**
 * 重置模擬資料
 */
export async function resetMockData(): Promise<void> {
  await clearMockData();
  await initMockData();
}

// 輔助函數

function getRandomTaskTitle(): string {
  const titles = [
    '設計系統架構',
    '實作用戶介面',
    '撰寫單元測試',
    '優化效能',
    '修復錯誤',
    '更新文檔',
    '程式碼審查',
    '部署到測試環境',
    '資料庫遷移',
    '整合第三方服務',
    'API 開發',
    '使用者體驗改善',
  ];
  return titles[Math.floor(Math.random() * titles.length)] || '';
}

function getRandomSubTaskTitle(): string {
  const titles = ['準備相關資料', '初步設計', '程式碼實作', '測試驗證', '文檔更新', '審核確認'];
  return titles[Math.floor(Math.random() * titles.length)] || '';
}

function getRandomTags(): string[] {
  const allTags = [
    '前端',
    '後端',
    '設計',
    '測試',
    '文檔',
    '緊急',
    '重要',
    'API',
    'UI/UX',
    '資料庫',
  ];
  const tagCount = Math.floor(Math.random() * 3);
  const tags: string[] = [];

  for (let i = 0; i < tagCount; i++) {
    const tag = allTags[Math.floor(Math.random() * allTags.length)];
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags;
}

/**
 * 取得模擬用戶列表
 */
export function getMockUsers(): Array<Omit<User, 'createdAt' | 'updatedAt'>> {
  return MOCK_USERS;
}
