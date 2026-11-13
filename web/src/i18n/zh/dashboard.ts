/**
 * Dashboard, its cards and the capture bar. Keys are the English source
 * strings used by `t()`; shared words such as "Today" or "Loading…" live in
 * `common.ts`.
 */
export const dashboard: Record<string, string> = {
  // Page header and summary line
  '{count} due today': '{count} 个今日到期',
  '{count} overdue': '{count} 个已逾期',
  '{count} in inbox': '{count} 个待整理',
  'Nothing due': '暂无到期任务',
  'Inbox · Unsorted': '收件箱 · 未分类',
  'Ask Assistant': '询问助手',
  'Done Rearranging': '完成排列',
  'Rearrange Cards': '排列卡片',
  'Drag the cards by their handle to rearrange them. The order is saved on this device.':
    '拖动卡片上的手柄即可重新排列，顺序会保存在本设备上。',

  // Cards
  Review: '回顾',
  Calendar: '日历',
  'Active Projects': '进行中的项目',
  'Open in Table': '在表格中打开',
  'No active projects.': '没有进行中的项目。',
  'Enjoy it while it lasts — an empty list is the only list that never needs a status update.':
    '趁现在享受一下吧——空列表是唯一永远不需要更新状态的列表。',

  // Capture bar
  'What needs doing?': '需要做什么？',
  'Could not save the task': '无法保存该任务',

  // Calendar
  'Previous Month': '上个月',
  'Next Month': '下个月',
  '{count} task due': '{count} 个任务到期',
  '{count} tasks due': '{count} 个任务到期',
  'Highlighted days have tasks due · today is the filled cell.':
    '有任务到期的日期会高亮 · 实心单元格是今天。',

  // Year progress
  '{year} Progress': '{year} 年度进度',
  '{year} progress': '{year} 年进度',
  '{percent}% · {count} day left': '{percent}% · 还剩 {count} 天',
  '{percent}% · {count} days left': '{percent}% · 还剩 {count} 天',
  '{percent}% of {year}': '{year} 年已完成 {percent}%',

  // Review card
  'Generated {when} · {model}': '生成于 {when} · {model}',
  'Regenerate Review': '重新生成回顾',
  'Regenerating Review': '正在重新生成回顾',
  'Open Review': '打开回顾',

  // Project card
  'No milestone yet': '暂无里程碑',
  '{name} progress': '{name}进度',
  '{done} of {total} task': '{done}/{total} 个任务',
  '{done} of {total} tasks': '{done}/{total} 个任务',
  'Next: {title}': '下一个：{title}',
  'Project Complete': '项目已完成',
  'Archiving…': '归档中…',

  // Dashboard card reordering
  'Move {title}': '移动{title}',
  'Drag to Reorder': '拖动排序',
};
