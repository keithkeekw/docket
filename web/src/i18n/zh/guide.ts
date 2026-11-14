export const guide: Record<string, string> = {
  // Page frame and contents
  'Everything Docket can do, from capture to the Logbook.': 'Docket 的全部功能，从记录到日志。',
  Contents: '目录',
  'Guide Contents': '指南目录',

  // Section headings
  'Getting Started': '快速开始',
  'Capturing Tasks': '记录任务',
  Priorities: '优先级',
  'Lists and Views': '列表与视图',
  'Task Details': '任务详情',
  'AI Features': 'AI 功能',
  'Data and Privacy': '数据与隐私',

  // Getting Started
  'Docket is a local task manager. Everything is stored on this machine, and the sidebar is your map: Dashboard, Inbox, Today, All Tasks, Reviews, Logbook, projects and Settings.':
    'Docket 是一款本地任务管理器。所有数据都保存在这台机器上，侧边栏就是你的地图：仪表板、收件箱、今天、所有任务、回顾、日志、项目和设置。',
  'The circular buttons at the top right choose the language and a Light, Dark or Automatic theme; on a phone, a third one opens this guide. The floating arrow at the bottom right returns a long page to the top.':
    '右上角的圆形按钮可以切换语言，以及选择浅色、深色或自动主题；在手机上，第三个按钮可打开本指南。右下角的悬浮箭头可将长页面返回顶部。',
  'At the bottom of the sidebar, the gear opens Settings, the “i” opens About, the book opens this guide, and the panel icon collapses the sidebar to a narrow icon rail; the same icon expands it again.':
    '侧边栏底部的齿轮图标可打开设置，“i”图标可打开关于页面，书本图标可打开本指南，面板图标可将侧边栏收起为窄图标栏；再次点击同一图标即可展开。',
  'The About page shows the version you are running. Check for a newer version and install it from there; a red dot on the “i” icon in the sidebar means an update is waiting. On a phone, open About from the bottom of Settings.':
    '关于页面显示你正在使用的版本，并可在那里检查和安装新版本；侧边栏“i”图标上的红点表示有可用更新。在手机上，请从设置页面底部打开关于页面。',
  'You can also press': '也可以按',
  'to toggle it.': '进行切换。',

  // Capturing Tasks
  Press: '按',
  'anywhere to open Quick Capture, or use the capture bar on the Dashboard. Type naturally and Docket picks out the details for you.':
    '可在任意位置打开快速记录，或使用仪表板上的记录栏。自然输入，Docket 会为你提取细节。',
  '“Call the plumber tomorrow p1” — title, date and priority.':
    '“明天叫水管工 p1”——标题、日期和优先级。',
  '“Pay rent every month at 9am” — title, repeat and time.':
    '“每月 9 点交房租”——标题、重复和时间。',
  '“Team sync every Monday” — weekly task anchored to Monday.':
    '“每周一团队同步”——锚定到周一的每周任务。',
  '“Review invoices every 2 weeks” — a two-week interval.': '“每 2 周审核发票”——两周的间隔。',
  'Enter saves straight away. From a project or a Kanban column, the new task lands in that project or status. For a preview of AI-parsed work, press':
    '按 Enter 会立即保存。在项目或看板列中，新任务会落在该项目或状态里。如果想预览 AI 解析结果，请按',
  'instead: nothing is created until you confirm the proposal.':
    '即可；在你确认提案之前不会创建任何内容。',

  // Priorities
  'Every task has one of three priorities. They are a lens for deciding what to do next — they do not change due dates or move tasks automatically.':
    '每个任务都有三种优先级之一。它们是决定下一步做什么的视角——不会改变截止日期，也不会自动移动任务。',
  'P1 — Urgent, do next': 'P1 —— 紧急，接下来就做',
  'Something that needs attention now: a deadline today, a blocked colleague, or work that becomes expensive if it waits.':
    '需要立刻关注的事：今天到期、同事被阻塞，或拖延代价会变高的工作。',
  'P2 — Important, plan it in': 'P2 —— 重要，安排进计划',
  'Work that matters this week but is not on fire. Schedule it around your P1s.':
    '本周重要但还不紧急的工作。围绕 P1 安排它。',
  'P3 — Normal, the default': 'P3 —— 普通，默认级别',
  'Everything else. New tasks start here unless you say otherwise; keep them here until a date or a person makes them urgent.':
    '其他所有事。除非另行指定，新任务都从这里开始；在某个日期或某个人让它变紧急之前，就让它们待在这里。',
  'Type priorities naturally during capture (“pay rent tomorrow p1”), or pick one in the task drawer. The All Tasks filters and Table view can sort or narrow by priority. A useful rule: if everything is P1, nothing is.':
    '记录时自然输入优先级（“明天交房租 p1”），或在任务抽屉中选择。所有任务的筛选器和表格视图可以按优先级排序或缩小范围。一条有用的规则：如果一切都是 P1，那就没有 P1。',

  // Lists and Views
  'shows work with no project, in List or Table view.': '显示没有项目的任务，支持列表和表格视图。',
  'combines overdue work with everything due today.': '将逾期工作和今天到期的所有事项合并在一起。',
  'and projects offer List, Table and Kanban. Table columns sort; Kanban cards drag between statuses.':
    '和项目提供列表、表格和看板视图。表格列可以排序；看板卡片可在状态之间拖动。',
  'In List view, drag the six-dot handle beside a task to change its order.':
    '在列表视图中，拖动任务旁的六点手柄可调整顺序。',
  'The Select Tasks button (a ticked box) starts bulk selection. Selection uses round checkboxes so it never looks like marking a task done; the trash icon deletes the batch and the Undo bar brings it back.':
    '“选择任务”按钮（带勾的方框）可开始批量选择。选择时使用圆形复选框，避免与标记完成混淆；垃圾桶图标会删除整批任务，撤销栏可以将其恢复。',
  'A completed task stays in the list for three seconds while it fades, then moves to the Logbook.':
    '已完成的任务会在列表中停留三秒并淡出，然后移入日志。',

  // Logbook
  'Finished work lives in the Logbook. Every row is checked and struck through. Uncheck one to reactivate it: the task clears its completion date, returns to its old collection and leaves the Logbook.':
    '完成的工作都存放在日志里。每一行都已勾选并划掉。取消勾选即可重新激活：任务会清除完成日期，回到原来的集合，并离开日志。',
  'To handle many records at once, use the Select Tasks button above the list. Tick individual rows or Select All, then choose Restore Selected (the curved arrow) to reopen them all, or Delete Selected (the trash icon) to remove them. Deleting asks for confirmation and can be undone from the Undo bar.':
    '如需一次处理多条记录，请使用列表上方的“选择任务”按钮。勾选单独的行或“全选”，然后选择“恢复所选”（弯曲箭头）将它们全部重新打开，或选择“删除所选”（垃圾桶图标）将其移除。删除前会请求确认，并可在撤销栏中撤销。',

  // Dashboard
  'The review card shows the latest Daily or Weekly review, with buttons to regenerate it or open the full Reviews page.':
    '回顾卡片显示最新的每日或每周回顾，并提供重新生成或打开完整回顾页面的按钮。',
  'Tasks are grouped into Overdue, Today and Inbox · Unsorted. The table icon in the corner of the card opens the full list.':
    '任务分为已逾期、今天和收件箱 · 未分类。卡片角落的表格图标可打开完整列表。',
  'The month calendar highlights days with tasks due; use the arrows to look at another month. Point at a highlighted day (or Tab to it) to see that day’s tasks, and click one to open it.':
    '月历会高亮有任务到期的日期；用箭头查看其他月份。将鼠标指向高亮的日期（或用 Tab 键移到该日期）即可查看当天的任务，点击其中一项即可打开。',
  'The small New Project button sits below the project cards.':
    '小巧的“新建项目”按钮位于项目卡片下方。',
  'The Rearrange Cards button (the dotted grid beside the capture bar) turns on drag handles. Cards sit in two columns: drop a card on the top or bottom half of another to place it above or below, or in a column’s empty space to send it to the bottom. A blue line or “Drop here” shows where it will land. The Review card stays across the top, and the layout is remembered on this device.':
    '“重新排列卡片”按钮（记录栏旁的点阵图标）会显示拖动手柄。卡片分为两列：把卡片放到另一张卡片的上半部或下半部，即可放在其上方或下方；放到某列的空白处则会移到该列底部。蓝色线条或“放到这里”会提示落点。回顾卡片始终横跨顶部，布局会保存在本设备上。',
  'Active Projects show progress and the next due task. A project at 100% offers an':
    '进行中的项目会显示进度和下一个到期任务。进度达到 100% 的项目会显示',
  'button, moving it to Archived Projects.': '按钮，点击后移入已归档项目。',
  // Projects
  'Create a project from the sidebar or Dashboard, then give it a description, target date and optional milestones. The project screen gathers its tasks and progress. Projects can be archived when finished or deleted; deleted projects keep their tasks and move them to the Inbox.':
    '从侧边栏或仪表板创建项目，然后填写描述、目标日期和可选的里程碑。项目页面会汇总它的任务和进度。项目可以在完成后归档或删除；删除项目时任务会保留并移入收件箱。',
  'Drag the milestone pills to reorder them, and double-click one to rename it. Selecting a milestone shows Rename, Delete and Complete icons at the right of the toolbar. Deleting asks for confirmation, moves the milestone’s tasks to the Inbox with a notice saying how many moved, and can be undone.':
    '拖动里程碑标签即可重新排序，双击标签可重命名。选中某个里程碑后，工具栏右侧会显示重命名、删除和完成图标。删除前会请求确认，里程碑中的任务会移到收件箱，并弹出提示告知移动了多少个任务；此操作可以撤销。',
  'The Timeline icon in the project header charts every milestone by the start and end dates of its tasks. The chart begins at the earliest start date in the first milestone, so at least one task there needs a start date, and it runs to the latest end date in the last milestone when one is set.':
    '项目标题栏中的时间线图标会按任务的开始和结束日期绘制每个里程碑。图表从第一个里程碑中最早的开始日期起算，因此其中至少要有一个任务设置了开始日期；如果最后一个里程碑设置了结束日期，图表会延伸到其中最晚的结束日期。',
  'An open task whose start date or due date falls after the project’s target date is highlighted in red on the project screen, in List, Table and Kanban views.':
    '未完成任务的开始日期或截止日期晚于项目目标日期时，项目页面会在列表、表格和看板视图中以红色突出显示该任务。',
  'You can also ask the assistant to create a project. It asks whether to generate milestones; if so, it asks for a short description and, when the idea is still vague, a few quick questions (never more than four) before proposing the project and its milestones for you to confirm.':
    '你也可以让助手创建项目。它会先询问是否自动生成里程碑；如果需要，会请你提供简短描述，若想法仍不够清晰，还会再问几个简短问题（最多四个），然后提出项目及其里程碑供你确认。',
  Use: '使用',
  'Exclude this project from AI': '“将该项目排除在 AI 之外”',
  'when its name and tasks should never be sent to an AI provider.':
    '即可让项目的名称和任务永远不发送给 AI 提供商。',

  // Task Details
  'Click any task title to open the drawer. It contains:':
    '点击任意任务标题即可打开任务抽屉。其中包含：',
  'Title, notes (Markdown that formats inside the editor as you type), project, milestone, status, priority, due date, due time, estimate and repeat.':
    '标题、备注（Markdown 会在编辑器内随输入实时格式化）、项目、里程碑、状态、优先级、截止日期、截止时间、预估和重复。',
  'Start Date and End Date are when you plan to work on the task; the Due Date is the deadline it must be finished by. The end cannot be before the start, and a repeating task moves its plan forward with its due date.':
    '开始日期和结束日期表示你计划处理该任务的时间段；截止日期则是必须完成任务的最后期限。结束日期不能早于开始日期，重复任务的计划日期会随截止日期一起顺延。',
  'A checklist with optional AI generation, links, tags and file uploads (up to 10 MB each). AI checklists read the task title, notes and readable attachments — text files and Word .doc/.docx — as context; binary files are skipped.':
    '清单（可用 AI 生成）、链接、标签和文件上传（每个不超过 10 MB）。AI 清单会把任务标题、备注和可读取的附件（文本文件和 Word .doc/.docx）作为上下文；二进制文件会被跳过。',
  'Download or remove uploaded files; every delete asks for confirmation first.':
    '下载或移除已上传的文件；每次删除前都会先请求确认。',
  'Save, delete, or undo the last destructive action from the Undo bar.':
    '保存、删除，或从撤销栏撤销上一次破坏性操作。',

  // AI Features
  'The assistant opens with': '按',
  ', or with the': '，或点击每个页面右下角的',
  'button in the bottom-right corner of every screen. It can answer questions about your work and propose changes; proposals are previewed before anything is written.':
    '按钮即可打开助手。它可以回答关于你工作的问题并提出修改建议；任何内容写入前都会先预览提案。',
  'When you ask it to add a task, it first asks which project (or the Inbox) it belongs to. All of its buttons are icons: hover one to see its name.':
    '当你让它添加任务时，它会先询问任务属于哪个项目（或收件箱）。助手的所有按钮都是图标：将鼠标悬停在图标上即可看到名称。',
  'Other AI features include:': '其他 AI 功能包括：',
  'Capture — turn text into one or more proposed tasks.': '记录——把文本转换为一个或多个建议任务。',
  'Breakdown — turn a project into milestones and tasks.': '拆解——把一个项目拆成里程碑和任务。',
  'Summarize — a prose status summary on a project screen.':
    '总结——在项目页面生成一段文字状态摘要。',
  'Checklist generation inside a task.': '在任务内生成清单。',
  'Daily and weekly reviews, written on the schedule set in Settings → Reviews or on demand with the sparkle button on the Reviews page.':
    '每日和每周回顾，按设置 → 回顾中的计划自动生成，也可以在回顾页面点击闪光按钮随时生成。',
  'Chat with your tasks, projects and reviews.': '与你的任务、项目和回顾对话。',
  'Configure a provider and model for each feature in': '在以下位置为每项功能配置提供商和模型：',
  'Settings → AI': '设置 → AI',
  '. Paste each provider’s API key there too (DeepSeek, OpenRouter, OpenAI, Google Gemini, Anthropic Claude, Mistral or Alibaba Qwen); keys stay on this computer and are never shown in full.':
    '。也在那里粘贴各提供商的 API 密钥（DeepSeek、OpenRouter、OpenAI、Google Gemini、Anthropic Claude、Mistral 或阿里云通义千问）；密钥只保存在本机，且绝不会完整显示。',
  'A key takes effect as soon as it is saved, with no restart, and the model box then suggests that provider’s models.':
    '密钥保存后立即生效，无需重启，模型输入框随后会推荐该提供商的模型。',
  'Prompt Management': '提示词管理',
  'lets you edit the instructions behind each feature or reset them to the built-in defaults.':
    '让你可以编辑每项功能背后的指令，或将它们重置为内置默认值。',

  // Keyboard Shortcuts
  'for the full cheat sheet at any time. Every configurable binding can be changed in Settings → Key Bindings.':
    '可随时查看完整快捷键表。所有可配置的绑定都可以在设置 → 键盘绑定中修改。',

  // Settings
  Statuses: '状态',
  '— rename, recategorise and reorder the columns used by Kanban and the status picker.':
    '——重命名、重新分类并调整看板和状态选择器中各列的排序。',
  'Key Bindings': '键盘绑定',
  '— click a shortcut to record a new one.': '——点击一个快捷键即可录制新的绑定。',
  AI: 'AI',
  '— paste, replace or remove each provider’s API key, then choose a provider and model per feature.':
    '——粘贴、更换或移除各提供商的 API 密钥，然后为每项功能选择提供商和模型。',
  '— read, edit and reset the system prompts.': '——查看、编辑并重置系统提示词。',
  '— turn scheduled reviews on or off, pick Daily or Weekly, and set the time (and, for Weekly, the day).':
    '——开启或关闭定时回顾，选择每日或每周，并设置时间（每周回顾还可选择星期几）。',
  '— add up to three world clocks, shown under the date on the Dashboard.':
    '——最多添加三个世界时钟，显示在仪表板的日期下方。',
  Privacy: '隐私',
  '— see which projects are excluded from AI.': '——查看哪些项目被排除在 AI 之外。',
  Data: '数据',
  '— create and restore backups, and export everything as JSON or Markdown.':
    '——创建和恢复备份，并将所有内容导出为 JSON 或 Markdown。',

  // Data and Privacy
  'Docket runs on this machine. Tasks, projects, settings and reviews live in the local SQLite database; uploaded files are kept beside it. Nothing is synced to a cloud service.':
    'Docket 在这台机器上运行。任务、项目、设置和回顾都保存在本地 SQLite 数据库中；上传的文件存放在它旁边。不会同步到任何云服务。',
  'Backups are complete copies of the database. Export gives you a portable JSON or Markdown copy. If AI is not configured, it is never called.':
    '备份是数据库的完整副本。导出会生成可移植的 JSON 或 Markdown 副本。如果没有配置 AI，就永远不会调用它。',
  'API keys saved in Settings → AI are left out of every export. Backups are whole-database copies, so they do include saved keys: keep backup files private.':
    '保存在设置 → AI 中的 API 密钥不会出现在任何导出文件中。备份是整个数据库的副本，因此会包含已保存的密钥：请妥善保管备份文件。',
  'for the Command Palette. The cursor starts in its search box: type to jump to any page, project or action, and after two letters it also finds matching tasks.':
    '打开命令面板。光标会直接位于搜索框中：输入即可跳转到任意页面、项目或操作，输入两个字符后还会搜索匹配的任务。',
  'Need to get back to work?': '需要回去继续工作？',
  'Return to the Dashboard': '返回仪表板',
};
