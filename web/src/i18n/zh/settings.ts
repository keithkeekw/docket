/**
 * Settings screen copy. Keys are the English source strings rendered by
 * SettingsRoute; status categories and shortcut labels are included because
 * the screen renders them directly.
 */
export const settings: Record<string, string> = {
  // Prompt labels come from the server; translate their display names.
  'Project Summary': '项目摘要',

  // Page shell
  'How the app behaves on this machine. Everything is stored locally.':
    '应用在这台设备上的运行方式。所有内容都只保存在本地。',

  // Statuses
  Statuses: '状态',
  'The order here is the order of Kanban columns and the status picker. A status in use cannot be deleted until its tasks move to another one.':
    '这里的顺序即看板列和状态选择器的顺序。正在使用的状态需先将任务移到其他状态后才能删除。',
  'Add Status': '添加状态',
  Category: '分类',
  Unused: '未使用',
  'Move Up': '上移',
  'Move Down': '下移',
  'Delete Status': '删除状态',
  'Move its tasks to another status first': '请先将其任务移到其他状态',
  'Status name: {name}': '状态名称：{name}',
  'Category for {name}': '{name}的分类',
  'Move {name} up': '将 {name} 上移',
  'Move {name} down': '将 {name} 下移',
  'Delete status {name}': '删除状态 {name}',
  '“{name}” will be deleted from the status picker and Kanban columns.':
    '“{name}”将从状态选择器和看板列中删除。',
  'Could not add the status': '无法添加状态',
  'Could not reorder statuses': '无法重新排序状态',
  'Could not rename the status': '无法重命名状态',
  'Could not update the status': '无法更新状态',
  'Could not delete the status': '无法删除状态',

  // Status categories (Kanban and picker)
  Open: '未开始',
  Active: '进行中',

  // Key bindings
  'Key Bindings': '快捷键',
  'Keyboard shortcuts available in the app. Click a configurable shortcut to change it.':
    '应用中可用的键盘快捷键。点击可自定义的快捷键即可更改。',
  'Reset All': '全部重置',
  'Include a modifier key (⌘ / Ctrl) to avoid conflicts.': '请包含修饰键（⌘ / Ctrl）以避免冲突。',
  'Already used by “{name}”.': '已被“{name}”占用。',
  'Press keys… (Esc to cancel)': '请按下按键…（Esc 取消）',
  'Click to Change': '点击更改',
  custom: '自定义',
  'Reset to Default': '恢复默认',

  // Shortcut labels and descriptions
  'AI Capture': 'AI 记录',
  'Parse the capture text with AI': '用 AI 解析记录内容',
  'Collapse / Expand Sidebar': '折叠 / 展开侧边栏',
  'Toggle the sidebar between full width and the icon rail': '在整个侧边栏与图标栏之间切换',
  'Ask Assistant': '呼叫助手',
  'Open the assistant drawer from anywhere': '在任意位置打开助手面板',
  'Command Palette': '命令面板',
  'Search and jump to pages, projects and actions': '搜索并跳转到页面、项目和操作',
  'Keyboard Shortcuts': '键盘快捷键',
  'Show the full list of shortcuts in an overlay': '在浮层中显示完整快捷键列表',
  'Open the capture dialog from anywhere': '在任意位置打开记录对话框',
  'Save Capture': '保存记录',
  'Save the task directly from the capture dialog': '直接从记录对话框保存任务',
  'Close Dialog': '关闭对话框',
  'Dismiss the active dialog or modal': '关闭当前对话框或模态框',
  'Kanban Drag': '看板拖拽',
  'Start or drop a card when using keyboard in Kanban view': '在用键盘操作看板时拿起或放下卡片',
  'Go to Dashboard': '前往仪表板',
  'Open the Dashboard': '打开仪表板',
  'Go to Inbox': '前往收件箱',
  'Open the Inbox': '打开收件箱',
  'Go to Today': '前往今天',
  'Open Today': '打开今天',
  'Go to All Tasks': '前往所有任务',
  'Open the All Tasks list': '打开所有任务列表',
  'Go to Reviews': '前往回顾',
  'Open Reviews': '打开回顾',
  'Go to Logbook': '前往日志',
  'Open the Logbook': '打开日志',
  'Go to Settings': '前往设置',
  'Open Settings': '打开设置',

  // AI
  AI: 'AI',
  'Nothing leaves this machine until a feature below is configured and its provider has a key. Keys are read from':
    '只有下方功能完成配置且其提供商已设置密钥时，才会向外部发送数据。密钥在服务器启动时从',
  'at server start and are never shown here.': '文件读取，且永远不会显示在这里。',
  Configured: '已配置',
  'Not Configured': '未配置',
  Feature: '功能',
  Provider: '提供商',
  Model: '模型',
  'Provider for {feature}': '{feature}的提供商',
  'Model for {feature}': '{feature}的模型',
  'Loading models…': '正在加载模型…',
  'e.g. deepseek-chat': '例如 deepseek-chat',
  'Enter a model for {feature}, or set it to Not Configured.':
    '请为{feature}填写模型，或将其设为未配置。',
  'AI settings saved.': 'AI 设置已保存。',
  'Could not save the AI settings': '无法保存 AI 设置',
  'Save AI Settings': '保存 AI 设置',
  or: '或',
  to: '到',
  'and restart the server.': '并重启服务器。',
  Breakdown: '拆解',
  Summarize: '总结',
  Chat: '对话',

  // Prompt management
  'Prompt Management': '提示词管理',
  'Every system prompt the app sends to a model. Edit one below; changes apply to the next AI request.':
    '应用发送给模型的全部系统提示词。可在下方编辑，修改将在下一次 AI 请求时生效。',
  'Prompt saved.': '提示词已保存。',
  'Could not save the prompt': '无法保存提示词',
  'Reset Prompt': '重置提示词',
  '“{name}” will revert to the built-in prompt.': '“{name}”将恢复为内置提示词。',
  'Prompt reset to default.': '提示词已恢复默认。',
  'Could not reset the prompt': '无法重置提示词',
  Customized: '已自定义',
  '{name} prompt': '{name}提示词',
  'Save Prompt': '保存提示词',
  'Resetting…': '正在重置…',
  '{count} characters': '{count} 个字符',

  // Clocks
  Clocks: '时钟',
  'Up to three world clocks, shown beneath the date on the Dashboard.':
    '最多三个世界时钟，显示在仪表板日期下方。',
  'Enter a time zone, for example Asia/Tokyo.': '请输入时区，例如 Asia/Tokyo。',
  '“{name}” is not a valid IANA time zone.': '“{name}”不是有效的 IANA 时区。',
  'That time zone is already on the list.': '该时区已在列表中。',
  'You can add up to {total} time zones.': '最多只能添加 {total} 个时区。',
  'Remove Clock': '移除时钟',
  '{name} will be removed from the Dashboard.': '{name} 将从仪表板中移除。',
  'Remove clock': '移除时钟',
  'Remove {name}': '移除 {name}',
  'Add a time zone': '添加时区',
  'IANA name, for example Asia/Tokyo. {count} of {total} used.':
    'IANA 名称，例如 Asia/Tokyo。已使用 {count}/{total}。',
  'Maximum of {total} time zones reached. Remove one to add another.':
    '已达到 {total} 个时区的上限。移除一个后才能添加新的。',

  // Privacy
  Privacy: '隐私',
  'Excluded projects and their tasks are left out of every AI request. Change it in a project’s settings.':
    '被排除的项目及其任务不会出现在任何 AI 请求中。可在项目的设置中更改。',
  'No projects are excluded.': '没有被排除的项目。',

  // Data, backup and restore
  Data: '数据',
  'Backups are whole copies of the database, kept in': '备份是数据库的完整副本，保存在',
  '. Restoring replaces every project, task and setting with the copy you pick.':
    '。恢复会用你选择的副本替换所有项目、任务和设置。',
  'Backing up…': '正在备份…',
  'Backup Now': '立即备份',
  'No backups yet.': '还没有备份。',
  '{count} backup available.': '有 {count} 个可用备份。',
  '{count} backups available.': '有 {count} 个可用备份。',
  'Backup created: {file}': '已创建备份：{file}',
  'Could not create a backup': '无法创建备份',
  'Restored from {file}. A safety copy of the previous data is kept as {safety}.':
    '已从 {file} 恢复。原有数据的安全副本保留为 {safety}。',
  'Could not restore that backup': '无法恢复该备份',
  Download: '下载',
  'Restoring…': '正在恢复…',
  'Confirm Restore': '确认恢复',
  Restore: '恢复',

  // Export
  'A full copy of your projects, tasks, reviews and settings — for keeping outside the app. Keys are never included.':
    '项目、任务、回顾和设置的完整副本 —— 用于在应用之外留存。不包含任何密钥。',
  'Export JSON': '导出 JSON',
  'Export Markdown': '导出 Markdown',

  // About & Updates
  'About & Updates': '关于与更新',
  'Check GitHub Releases and install a newer version from here.':
    '检查 GitHub Releases，并在此安装新版本。',
  'Current version: {version}': '当前版本：{version}',
  'Repository: {repository}': '仓库：{repository}',
  'Last checked {time}': '上次检查：{time}',
  'Checking…': '检查中…',
  'Check for Updates': '检查更新',
  'Could not check GitHub Releases: {message}': '无法检查 GitHub Releases：{message}',
  'Updating to {version}…': '正在更新到 {version}…',
  'Updating…': '更新中…',
  'The app will restart and reload when it is ready.': '应用将在准备就绪后重启并自动刷新。',
  'The update is taking longer than expected. Check the terminal running Docket.':
    '更新耗时超出预期，请检查运行 Docket 的终端。',
  'The update failed.': '更新失败。',
  'Update Docket': '更新 Docket',
  'Docket will update to {version} and restart. Save your work before continuing.':
    'Docket 将更新到 {version} 并重启，请先保存工作。',
  Update: '更新',
  'Release notes': '版本说明',
  "You're on the latest release.": '你正在使用最新版本。',
  'No releases have been published yet.': '尚未发布任何版本。',
  'Version {version} is available.': '发现新版本 {version}。',
  'Update to {version}': '更新到 {version}',
  'Could not start the update.': '无法启动更新。',
};
