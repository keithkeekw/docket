/**
 * Chinese copy for the task views: list, table, kanban and the project
 * screens that host them. Keys are the English source strings used by `t()`.
 */
export const tasks: Record<string, string> = {
  // List actions
  'Select Tasks': '选择任务',
  'Auto-Assign Top 3': '自动分配前 3 项',
  'Drag to Reorder': '拖动调整顺序',
  'Reorder {title}': '调整“{title}”的顺序',
  '{count} selected': '已选择 {count} 项',
  'Delete Selected': '删除所选',
  'Delete Selected Tasks': '删除所选任务',
  'Delete Tasks': '删除任务',
  '{count} selected task will be deleted.': '将删除 {count} 个所选任务。',
  '{count} selected tasks will be deleted.': '将删除 {count} 个所选任务。',
  '{count} task deleted': '已删除 {count} 个任务',
  '{count} tasks deleted': '已删除 {count} 个任务',
  'Could not delete the tasks': '无法删除任务',
  'Select All': '全选',
  'Restore Selected': '恢复所选',
  '{count} task restored': '已恢复 {count} 个任务',
  '{count} tasks restored': '已恢复 {count} 个任务',
  'Could not restore the tasks': '无法恢复任务',
  'Could not reorder the tasks': '无法调整任务顺序',
  'No open tasks to assign.': '没有可分配的任务。',
  '{count} task set for today.': '已将 {count} 个任务安排到今天。',
  '{count} tasks set for today.': '已将 {count} 个任务安排到今天。',
  'Could not assign tasks to today': '无法将任务安排到今天',

  // Row and card meta
  'Select "{title}"': '选择“{title}”',
  'Estimate {value}': '预估 {value}',
  'Repeats {label}': '重复：{label}',
  '{done} of {total} checklist items done': '清单已完成 {done}/{total}',

  // Recurrence labels rendered in rows and the table
  Yearly: '每年',
  Custom: '自定义',

  // Table controls and footer
  'Group by': '分组',
  Nothing: '不分组',
  'sorted by {field}': '按{field}排序',
  '{label} (desc)': '{label}（降序）',
  'showing first {limit} of {total}': '仅显示前 {limit}/{total} 条',
  filtered: '已筛选',
  'Search Tasks': '搜索任务',
  'Clear Filters': '清除筛选',
  'No tasks match these filters.': '没有符合这些筛选条件的任务。',
  'Next 7 Days': '未来 7 天',
  Tag: '标签',

  // Filter chips
  Any: '不限',
  'No options': '没有选项',

  // View switcher
  'View mode': '视图切换',
  List: '列表',
  Table: '表格',
  Kanban: '看板',
  '{view} View': '{view}视图',

  // Milestone pill
  'Not Started': '未开始',
  '{done} of {total}': '{done} / {total}',

  // Page copy
  'Overdue work and anything due today.': '已逾期的工作以及今天到期的任务。',
  'Work that has no project yet.': '尚未归属项目的工作。',

  // Project screen
  'Summarizing…': '正在生成摘要…',
  'Archive this project?': '要归档这个项目吗？',
  'Archiving…': '归档中…',
  'Confirm Archive': '确认归档',
  'Break Down with AI': '用 AI 拆解',
  'Could not break down the project': '无法拆解该项目',
  'Could not generate summary': '无法生成摘要',
  'Target Date:': '目标日期：',
  'Not set': '未设置',
  'Showing: {value}': '显示：{value}',
  'all tasks': '所有任务',
  'No tasks in {project}.': '“{project}”中还没有任务。',
  'Copied!': '已复制！',

  // Archived projects
  'No archived projects.': '没有已归档的项目。',
  'Restore this project?': '要恢复这个项目吗？',
  '{count} task · {percent}% done': '共 {count} 个任务 · 已完成 {percent}%',
  '{count} tasks · {percent}% done': '共 {count} 个任务 · 已完成 {percent}%',
};
