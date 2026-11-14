/**
 * Copy for the task drawer and the app's dialogs (project, capture, proposal,
 * chat, notes editor). Keys are the English source strings used by `t()`.
 */
export const dialogs: Record<string, string> = {
  // Task drawer: shell and validation
  'A task needs a title.': '任务需要一个标题。',
  'Estimate must be a whole number of minutes.': '预估必须是整数分钟。',
  'Could not save the task': '无法保存任务',
  'Could not delete the task': '无法删除任务',
  'Delete Task': '删除任务',
  '“{title}” and its checklist, links, files and tags will be deleted.':
    '“{title}”及其清单、链接、文件和标签都将被删除。',
  'Task “{title}” deleted': '任务“{title}”已删除',
  'to close': '关闭',

  // Task drawer: fields
  'Current Project': '当前项目',
  'Due Time': '截止时间',
  'Estimate (Minutes)': '预估（分钟）',
  'Blank means no estimate.': '留空表示不预估。',
  "Weekly repeats on the due date's weekday.": '每周重复将按截止日期所在的星期几进行。',
  'Add notes… Markdown works as you type.': '添加备注… 输入时即可使用 Markdown。',
  'Markdown is formatted inside the box as you type.': '输入时 Markdown 会在框内即时格式化。',
  'Deleting…': '删除中…',

  // Task drawer: repetition presets
  'Does Not Repeat': '不重复',
  Daily: '每日',
  Weekly: '每周',
  'Every 2 Weeks': '每两周',
  Monthly: '每月',

  // Task drawer: checklist
  'Generation failed': '生成失败',
  'Delete Checklist Item': '删除清单项',
  '“{title}” will be removed from this checklist.': '“{title}”将从这个清单中移除。',
  'Delete Item': '删除条目',
  'Could not delete the item': '无法删除该条目',
  'Uses the task title, notes and readable attachments (txt, md, csv, json, doc, docx). File text is sent to your AI provider.':
    '使用任务标题、备注和可读取的附件（txt、md、csv、json、doc、docx）。文件文本会发送给你的 AI 提供商。',
  'Generating…': '生成中…',
  'Auto-Generate': '自动生成',
  'Mark "{title}" as not done': '将“{title}”标记为未完成',
  'Mark "{title}" as done': '将“{title}”标记为完成',
  'Delete checklist item {title}': '删除清单项 {title}',
  'Add Checklist Item': '添加清单项',

  // Task drawer: links
  'Could not add the link': '无法添加链接',
  'Could not remove the link': '无法移除链接',
  'Delete Link': '删除链接',
  '“{label}” will be removed from this task.': '“{label}”将从这个任务中移除。',
  'Remove link {label}': '移除链接 {label}',
  'Link URL': '链接地址',
  'Badge Label': '徽标文字',
  'Blank derives it from the URL.': '留空则根据网址生成。',
  'Add Link': '添加链接',

  // Task drawer: tags
  Tags: '标签',
  'Remove Tag': '移除标签',
  '“{tag}” will be removed from this task.': '“{tag}”将从这个任务中移除。',
  'Could not remove the tag': '无法移除标签',
  'Remove tag {tag}': '移除标签 {tag}',
  'Add Tag': '添加标签',
  'Tags are created on the fly.': '标签会即时创建。',

  // Task drawer: attachments
  'Could not upload the file': '无法上传文件',
  'Could not remove the file': '无法移除文件',
  'Delete File': '删除文件',
  '“{filename}” will be permanently deleted from this task.': '“{filename}”将从此任务中永久删除。',
  'Remove {filename}': '移除 {filename}',
  'File Upload': '上传文件',
  'Up to {size} MB per file.': '每个文件最大 {size} MB。',
  'Uploading…': '上传中…',

  // Project dialog
  'A project needs a name.': '项目需要一个名称。',
  'Could not create the project': '无法创建项目',
  'Could not save the project': '无法保存项目',
  'Could not update the project': '无法更新项目',
  'Could not delete the project': '无法删除项目',
  'A project groups related tasks and milestones.': '项目用于归集相关任务和里程碑。',
  'Target Date': '目标日期',
  'Optional.': '可选。',
  'Creating…': '创建中…',
  'Create Project': '创建项目',
  'Edit Project': '编辑项目',
  'This project is archived.': '此项目已归档。',
  'Changes save to this project.': '更改会保存到此项目。',
  'Exclude This Project from AI': '将该项目排除在 AI 之外',
  'Restore Project': '恢复项目',
  'Archive Project': '归档项目',
  'Delete Project': '删除项目',
  '“{name}” will be deleted. Its tasks move to the Inbox and its milestones are removed.':
    '“{name}”将被删除。其任务会移入收件箱，里程碑将被移除。',
  'Project “{name}” deleted': '项目“{name}”已删除',

  // Project dialog: milestones
  Milestones: '里程碑',
  'No milestones yet. They are optional.': '还没有里程碑（可选）。',
  'Could not add the milestone': '无法添加里程碑',
  'Could not reorder milestones': '无法重新排序里程碑',
  'Could not update the milestone': '无法更新里程碑',
  'Could not delete the milestone': '无法删除里程碑',
  'Could not rename': '无法重命名',
  'Delete Milestone': '删除里程碑',
  '“{name}” will be removed. Its tasks stay in the project.':
    '“{name}”将被移除。其任务会保留在项目中。',
  'Milestone name: {name}': '里程碑名称：{name}',
  'Move {name} up': '上移 {name}',
  'Move {name} down': '下移 {name}',
  'Delete milestone {name}': '删除里程碑 {name}',
  Up: '上移',
  Down: '下移',

  // Capture dialog
  'Could not reach the AI provider': '无法连接 AI 提供商',
  'Saves to this project.': '保存到此项目。',
  'Saves to the Inbox.': '保存到收件箱。',
  'What needs doing?': '需要做什么？',
  'Task Title': '任务标题',
  'Open Settings': '打开设置',
  'to add': '添加',
  'for AI': 'AI 解析',
  'Thinking…': '正在思考…',
  'Add to Inbox': '添加到收件箱',
  'Add multiple tasks': '连续添加多个任务',
  'Added “{title}”.': '已添加“{title}”。',

  // Proposal modal
  'Could not add those tasks': '无法添加这些任务',
  'Could not discard the proposal': '无法放弃该建议',
  'Discard Proposal': '放弃建议',
  'This proposal will be discarded and nothing will be added.':
    '此建议将被放弃，不会添加任何内容。',
  'Proposed Plan': '建议计划',
  'Proposed Tasks': '建议任务',
  'Parsed by: {feature} model': '由{feature}模型解析',
  'Change in Settings': '在设置中更改',
  Breakdown: '拆解',
  Chat: '对话',
  'New Task': '新任务',
  Move: '移动',
  'New Milestone': '新里程碑',
  '{count} of {total} task will be added.': '将添加 {count} 个，共 {total} 个任务。',
  '{count} of {total} tasks will be added.': '将添加 {count} 个，共 {total} 个任务。',
  '{count} of {total} item will be added.': '将添加 {count} 个，共 {total} 个条目。',
  '{count} of {total} items will be added.': '将添加 {count} 个，共 {total} 个条目。',
  'Include "{title}"': '包含“{title}”',
  untitled: '无标题',
  Link: '链接',
  'Title for proposed task {index}': '建议任务 {index} 的标题',
  'Enter to add · Esc to cancel · nothing is saved until you confirm':
    'Enter 添加 · Esc 取消 · 确认前不会保存任何内容',
  'Discarding…': '放弃中…',
  Discard: '放弃',
  'Adding…': '添加中…',
  'Add {count} task': '添加 {count} 个任务',
  'Add {count} tasks': '添加 {count} 个任务',
  'Add {count} item': '添加 {count} 个条目',
  'Add {count} items': '添加 {count} 个条目',

  // Chat drawer
  'Could not reach the assistant': '无法联系助手',
  Assistant: '助手',
  'Answers from your tasks, projects and reviews.': '基于你的任务、项目和回顾作答。',
  'Ask things like “what is overdue?”, “how is Onboarding going?” or “add a task to follow up with the vendor on Friday”.':
    '可以这样问：“有哪些任务逾期了？”“Onboarding 进展如何？”或者“添加一个周五跟进供应商的任务”。',
  Message: '消息',
  'Ask the assistant…': '向助手提问…',
  Send: '发送',
  'Enter to send · Shift Enter for a new line': 'Enter 发送 · Shift+Enter 换行',

  // Notes editor
  'Add notes…': '添加备注…',
  'Saves to {milestone}.': '保存到 {milestone}。',
};
