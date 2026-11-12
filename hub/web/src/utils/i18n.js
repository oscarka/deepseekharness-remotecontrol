// Bilingual (zh / en) auto-detection, manual switcher, and DOM/string translator for DSH Remote Control Hub

const EXACT_ZH_TO_EN = {
  // Auth & Preview Toolbar
  '🔒 DSH 远控总控台': '🔒 DSH Remote Control Hub',
  'DSH 远控控制台登录': 'DSH Remote Control Hub',
  '💻 电脑首次接入': '💻 First-Time Computer Setup',
  '电脑首次接入': 'First-Time Computer Setup',
  '：输入部署时设置的管理密码 (': ': Enter the admin password (',
  '📱 手机免密登录': '📱 Phone Passwordless Login',
  '手机免密登录': 'Phone Passwordless Login',
  '：直接扫电脑网页上的二维码，或输入 6 位配对码': ': Scan the QR code on your computer screen, or enter the 6-digit code',
  '输入管理密码 (HUB_TOKEN) 或 6 位配对码...': 'Enter HUB_TOKEN password or 6-digit pairing code...',
  '🔓 解锁进入总控台': '🔓 Unlock Control Hub',
  '视图体验：': 'View Mode:',
  '📱 iPhone 手机视图': '📱 iPhone Mobile View',
  '🖥️ 电脑双栏同屏视图': '🖥️ Desktop Split View',
  '📲 想收锁屏通知？点底部分享': '📲 Want lock-screen alerts? Tap Share',
  '→ 添加到主屏幕': '→ Add to Home Screen',
  '，再从桌面图标打开': ', then open from Home Screen',
  '知道了': 'Got it',
  '操作成功': 'Done',
  '⬇️ 最新消息': '⬇️ Latest',
  '连接中...': 'Connecting...',
  '⚡ 极速': '⚡ Turbo',
  '新建对话': 'New Task',
  '⚠️ 网络连接中断，正在自动重连…': '⚠️ Connection lost, reconnecting…',
  '点此立即重试': 'Tap to retry',
  '搜索对话标题、项目或内容...': 'Search sessions, projects, or messages...',
  '对话': 'Sessions',
  '项目文件': 'Files',
  '设备与设置': 'Settings',
  '‹ 返回': '‹ Back',
  '选择一个会话': 'Select a Session',
  '点击左侧任意对话开始遥控': 'Select any session on the left to start remote control',
  '💬 对话流': '💬 Chat',
  '📂 项目代码': '📂 Code',
  '📂 文件速览': '📂 Files',
  '👈 点击任意会话查看详细对话与思考过程': '👈 Select any session to view full transcript & thinking steps',
  '🟢 AI 正在电脑上执行任务...': '🟢 AI is executing on your computer...',
  '⏹ 立即停止': '⏹ Stop Now',
  '从手机相册上传截图或照片': 'Upload screenshot or photo from phone',
  '语音输入（点击说话，再点停止）': 'Voice input (tap to speak, tap again to stop)',
  '语音输入': 'Voice input',
  '发指令或点左侧🖼️传截图...': 'Type a message or tap 🖼️ to attach screenshots...',
  '切换遥控的电脑': 'Switch Connected Computer',
  '✨ 新建远程对话任务': '✨ New Remote AI Task',
  '2. 选择执行引擎 (Harness / IDE)': '2. Select AI Engine (Harness / IDE)',
  '3. 选择项目文件夹（免手敲路径）': '3. Select Project Folder',
  '4. 任务指令（支持截图或语音）': '4. Task Prompt (Screenshots or Voice)',
  '🖼️ 传截图': '🖼️ Screenshot',
  '🔍 检查运行状态': '🔍 Check Status',
  '🧪 跑测试修 Bug': '🧪 Run Tests & Fix Bugs',
  '📦 总结代码改动': '📦 Summarize Git Diff',
  '输入你想让电脑执行的任务，或点击右上角🖼️传截图...': 'Describe the task for your computer, or tap 🖼️ to attach screenshots...',
  '🚀 立即在电脑上启动任务': '🚀 Launch Task on Computer',
  '会话操作': 'Session Actions',
  '📂 当前项目文件速览': '📂 Project Files',
  '📦 跨电脑一键迁移向导': '📦 Cross-Computer Migration Wizard',
  '⚡ 极速实时同步 (Rust + SSE) 指南': '⚡ Turbo Real-Time Sync (Rust + SSE) Guide',
  '🔗 端到端加密分享已生成': '🔗 E2EE Share Link Ready',
  '📱 添加新手机（6 位配对码）': '📱 Phone QR / 6-Digit Pairing Login',
  '当前浏览器限制自动写入剪贴板，请点下方按钮或长按文本框全选复制：':
    'Browser blocked auto-copy. Tap the button below or long-press the text box to copy:',
  '📋 点击复制': '📋 Copy to Clipboard',
  '请输入部署时设置的 HUB_TOKEN 密码，或在新手机输入 6 位一次性配对码':
    'Enter your HUB_TOKEN password, or a 6-digit one-time pairing code',
  '输入访问密码或 6 位配对码...': 'Enter password or 6-digit pairing code...',
  '解锁进入控制台': 'Unlock Console',
  '💡 提示：已登录的手机可在「设置 → 添加新手机」生成 3 分钟有效的 6 位配对码。':
    '💡 Tip: On a logged-in device, open Settings → Phone QR Login to generate a 3-min pairing code.',
  '⚠️ 网络连接中断，正在自动重连… 点此立即重试':
    '⚠️ Connection lost, reconnecting… Tap to retry now',
  '⚠️ 当前手机网络已断开，恢复网络后将自动重连':
    '⚠️ Offline. Will reconnect automatically when network is back',
  '🔄 正在重新连接总控台…': '🔄 Reconnecting to Control Hub…',
  '预览模式:': 'View Mode:',
  '📱 手机单列视图 (iPhone 16 Pro)': '📱 Phone View (iPhone 16 Pro)',
  '🖥️ 电脑自适应双栏视图': '🖥️ Desktop Split View',
  '无模拟器外框 · 在真实手机打开即全屏': 'Frameless · Fullscreen on mobile',
  '📲 把「DSH 远控」添加到主屏幕，才能开启 iPhone 锁屏通知：点 Safari 底部':
    '📲 Add "DSH Remote" to Home Screen for iPhone lock-screen push: tap Safari',
  '分享': 'Share',
  '添加到主屏幕': 'Add to Home Screen',
  '我知道了': 'Got it',

  // TopBar & BottomTabs
  '切换或查看已连接电脑': 'Switch or view connected computers',
  '未接入电脑 (0)': 'No Computer Connected (0)',
  '🦀 极速实时': '🦀 Rust Turbo',
  '⚡ 极速实时': '⚡ Turbo Live',
  '⚠️ 需开权限': '⚠️ Needs Permission',
  '🚀 点此提速': '🚀 Boost Speed',
  '查看或开启极速实时同步模式': 'View or enable Turbo real-time sync',
  '新建远程 AI 任务': 'New remote AI task',
  '＋ 新建': '＋ New',
  '搜索会话、项目或回复内容...': 'Search sessions, projects, or replies...',
  '清除搜索': 'Clear search',
  '会话': 'Sessions',
  '文件': 'Files',
  '设置': 'Settings',

  // Chat Stage
  '返回列表': 'Back',
  '切换电脑': 'Switch Host',
  '正在加载对话...': 'Loading conversation...',
  '💬 对话': '💬 Chat',
  '📂 代码': '📂 Code',
  '查看当前项目文件': 'Browse project files',
  '📂 文件': '📂 Files',
  '更多操作': 'More actions',
  '⬇ 最新消息': '⬇ Latest',
  '🟢 AI 正在思考与执行任务...': '🟢 AI is thinking & executing tools...',
  '⚡ 支持底部直接输入「实时插话」或': '⚡ Type below to steer live, or',
  '⏹ 紧急停止': '⏹ Stop Now',
  '上传截图或照片': 'Upload screenshot or photo',
  '语音输入（点击开始说话）': 'Voice input (tap to speak)',
  '发指令继续对话...': 'Send a message to continue...',
  '发送': 'Send',
  '⚡ 插话': '⚡ Steer',
  '🟢 执行中': '🟢 Running',
  '👀 仅观察': '👀 Observe',
  '👀 当前会话为观察模式（仅支持查看对话记录）': '👀 Observe-only mode (view transcript only)',
  '⏳ 当前后端正在执行中（不支持实时插话，可点击上方停止）':
    '⏳ Task running (live steering not supported on this backend; tap Stop above)',
  '⚡ 实时插话 (Steer)：补充指令将立即注入...':
    '⚡ Live Steer: your instruction will be injected immediately...',
  '📋 复制最新回复全文': '📋 Copy Latest Reply',
  '▶ 继续执行下一步': '▶ Continue next step',
  '🔍 查看 git status 与改动': '🔍 Check git status & diff',
  '🧪 运行测试验证': '🧪 Run tests & verify',
  '📋 一键复制全文': '📋 Copy Full Reply',
  '✅ 已复制全文': '✅ Copied',
  '⚙️ 正在思考与执行工具调用...': '⚙️ Thinking and running tools...',
  '点击查看详情 ▾': 'View details ▾',
  '执行完毕': 'Done',
  '查看改动': 'View Diff',
  '跳过 / 取消': 'Skip / Cancel',
  '提交选择 ↵': 'Submit Choice ↵',
  '⏳ 正在提交...': '⏳ Submitting...',
  '⏳ 正在同步...': '⏳ Syncing...',
  '⏳ 处理中...': '⏳ Processing...',
  '✅ 允许执行': '✅ Approve',
  '✕ 拒绝': '✕ Deny',
  '可多选': 'Multi-select',
  '请选择一项': 'Please select an option',
  '请做出选择以继续': 'Please make a selection to continue',
  '📄 查看完整方案内容 (点击展开)': '📄 View full plan details (tap to expand)',
  '或者直接输入自定义回答 / 补充说明...': 'Or type a custom answer / note...',
  '⏳ 排队中（电脑上线后执行）': '⏳ Queued (runs when computer is online)',
  '✕ 取消': '✕ Cancel',
  '⚠️ 电脑超过 10 分钟未上线，该指令已超时未执行':
    '⚠️ Computer offline for >10m; command expired',

  // Sessions List & Onboarding
  '📱 手机扫码登录': '📱 Phone QR Login',
  '📱 扫码': '📱 QR',
  '＋ 新建远程对话': '＋ New Remote Task',
  '电脑已接入，还没有对话记录': 'Computer connected! No sessions yet',
  '你可以直接在远程电脑上启动第一个任务，或点击「手机扫码登录」在手机上打开':
    'Start a task on your computer or tap "Phone QR Login" to open on your phone',
  '🔍 暂无匹配的对话记录': '🔍 No matching sessions found',
  '↺ 清除筛选条件': '↺ Clear filters',
  '去选择 ›': 'Select ›',
  '跳过': 'Skip',
  '✓ 允许': '✓ Allow',
  '拒绝': 'Deny',
  '立即切换 ›': 'Switch ›',
  '⏳ 同步电脑中...': '⏳ Syncing...',
  '⚠️ 选择待重试': '⚠️ Retry Choice',
  '⚠️ 审批待重试': '⚠️ Retry Approval',
  '⏳ 待你选择': '⏳ Needs Input',
  '⏳ 待你授权': '⏳ Needs Approval',
  '● 运行中': '● Running',
  '🔵 已出结论': '🔵 Completed',
  '⚠️ 中断待继续': '⚠️ Interrupted',
  '已置顶': 'Pinned',
  '正在思考与执行任务...': 'Thinking and running task...',
  '等待你批准工具执行': 'Waiting for tool approval',
  '等待你做出选择': 'Waiting for your selection',
  '点击查看对话详情': 'Tap to view conversation',
  '未命名会话': 'Untitled Session',
  '默认工作区': 'Default Workspace',
  '📁 默认工作区': '📁 Default Workspace',
  '➕ 添加电脑': '➕ Add Computer',
  '📋 复制命令': '📋 Copy Cmd',
  '💻 本机未接入 · 3 步开启手机远控': '💻 Connect Your Computer in 3 Steps',
  '➕ 添加电脑（凭配对码加入，无需主密码）': '➕ Add Computer (Join via enrollment code)',
  '每台电脑独立凭证可单机吊销；有效期内可连加多台电脑':
    'Each computer gets an isolated revocable token; connect multiple hosts with one code',
  '🔄 换码': '🔄 New Code',
  '▴ 收起': '▴ Collapse',
  '▾ 详情': '▾ Details',
  '当前电脑配对码': 'Enrollment Code',
  '剩余有效期': 'Valid For',
  '本码已加入': 'Joined Hosts',
  '在电脑终端执行这一行命令（自动安装、自动连上、开机自启）：':
    'Run this 1-line command in your computer terminal (auto-installs & starts on login):',
  '📋 复制一行安装命令': '📋 Copy 1-Line Install Command',
  '📋 已克隆仓库用此条': '📋 Copy Local Repo Command',

  // Settings Tab
  '添加电脑与手机扫码登录': 'Add Computer & Phone QR Login',
  '暂未检测到在线电脑，请复制上方「添加电脑」命令在终端执行':
    'No computer connected yet. Copy the 1-line command above and run it in your terminal.',
  '🎯 主控': '🎯 Primary',
  '🚫 已吊销': '🚫 Revoked',
  '供电与电量': 'Power & Battery',
  '网络与延迟': 'Network & Latency',
  '会话与存储': 'Sessions & Storage',
  '同步与系统': 'Sync & OS',
  '电源直供': 'AC Power',
  '供电正常': 'Power OK',
  '🟣 DSH · ✅ 远控+审批': '🟣 DSH · ✅ Control + Approve',
  '⚡ Antigravity · ✅ 远控+审批': '⚡ Antigravity · ✅ Control + Approve',
  '🎯 飞书当前主控': '🎯 Active Primary',
  '切飞书到这台': 'Set as Primary',
  '🔔 飞书通知: 开': '🔔 Host Alerts: ON',
  '🔕 飞书通知: 关': '🔕 Host Alerts: OFF',
  '⚡ 极速详情': '⚡ Turbo Status',
  '🚀 一键提速': '🚀 Enable Turbo',
  '🔄 一键升级': '🔄 1-Click Upgrade',
  '⏳ 正在升级重启...': '⏳ Upgrading & Restarting...',
  '🔄 检查/重装更新': '🔄 Check / Reinstall Update',
  '恢复接入': 'Restore Access',
  '🚫 吊销凭证': '🚫 Revoke Token',
  '各后端功能边界（诚实矩阵）': 'Supported AI Tools & Capability Matrix',
  '后端': 'Backend',
  '看会话': 'View',
  '发指令': 'Prompt',
  '停止': 'Stop',
  '手机审批': 'Approve',
  '实时插话': 'Steer',
  '计划中': 'Planned',
  '外观与显示模式': 'Appearance & Language',
  '界面语言 / Language': 'Language / 界面语言',
  '自动识别浏览器语言或手动切换': 'Auto-detected from browser or switch manually',
  '深色 / 浅色主题': 'Theme Mode',
  '自动或手动切换外观': 'Switch between System, Light, and Dark mode',
  '跟随系统': 'System',
  '☀️ 浅色': '☀️ Light',
  '🌙 深色': '🌙 Dark',
  '多电脑协同与一键迁移': 'Multi-Host Session Migration',
  '跨电脑一键迁移会话': '1-Click Cross-Host Session Migration',
  '将源电脑 ~/.dsh 会话打包同步至目标电脑并可选清理源机':
    'Package and sync ~/.dsh sessions from source computer to target computer',
  '📦 打开迁移向导': '📦 Migration Wizard',
  '🌐 打开': '🌐 Open',
  '📋 复制完整解密链接': '📋 Copy Decrypt Link',
  '🗑️ 销毁': '🗑️ Delete',
  '暂无加密分享记录。可在任意会话右上角「⋯ → 生成 AES-256 端到端加密回放链接」创建。':
    'No encrypted shares yet. Tap "⋯ → Generate AES-256 Encrypted Share Link" in any session.',
  '手机锁屏通知 (iOS 16.4+ Web Push)': 'Lock-Screen Notifications (iOS 16.4+ Web Push)',
  '启用 iPhone 锁屏实时推送': 'Enable iPhone Lock-Screen Push',
  '当任意电脑有待审批、任务完成或异常时直接弹窗':
    'Get instant lock-screen alerts when any computer needs approval or finishes a task',
  '正在检测本机推送状态…': 'Checking push subscription status…',
  '📲 开启推送': '📲 Enable Push',
  '🔔 测试': '🔔 Test Push',
  '关闭本机推送': 'Disable Push',
  'iPhone 需先在 Safari「分享 → 添加到主屏幕」，再从桌面图标打开本页开启，才能收到锁屏通知':
    'On iPhone, tap Safari "Share → Add to Home Screen" first, then open from Home Screen to enable push.',
  '隐私与访问密码保护': 'Security & Access Control',
  '添加新手机（6 位免密配对码）': 'Pair New Phone (QR / 6-Digit Code)',
  '生成 3 分钟有效的一次性 6 位字母/数字配对码，新手机免输长密码直接解锁':
    'Generate a 3-minute QR & 6-digit code to sign in on your phone without typing a password',
  '📱 生成配对码': '📱 Show QR / Code',
  '修改总控台访问密码': 'Change Control Hub Password',
  '随时更换访问密钥，防止未授权访问': 'Rotate your HUB_TOKEN password at any time',
  '🔑 修改密码': '🔑 Change Password',
  '锁定当前浏览器': 'Lock Current Browser',
  '清除本机浏览器缓存的登录凭证': 'Clear saved credentials on this browser',
  '🔒 立即锁定': '🔒 Lock Now',
  '还没有设备登记推送': 'No devices registered for push yet',
  '本机：✅ 已开启锁屏推送': 'This device: ✅ Lock-screen push enabled',
  '本机：未开启（点下方「开启推送」）': 'This device: Not enabled (tap "Enable Push" below)',
  '本机：当前浏览器不支持锁屏推送（iPhone 需从主屏幕 App 打开）':
    'This device: Web Push unsupported in this tab (open from Home Screen on iPhone)',

  // Sheets & Modals
  '切换连接的电脑': 'Switch Connected Computer',
  '🌐 全部电脑汇总': '🌐 All Computers Combined',
  '当前视图 ✓': 'Active ✓',
  '当前设备 ✓': 'Active ✓',
  '切换 ›': 'Switch ›',
  '✨ 新建远程 AI 任务': '✨ New Remote AI Task',
  '1. 选择执行电脑': '1. Select Target Computer',
  '1.5 选择 AI 编程工具': '1.5 Select AI Coding Tool',
  '2. 选择工作区目录': '2. Select Workspace Directory',
  '3. 任务指令': '3. Task Prompt',
  '📎 上传截图': '📎 Add Screenshot',
  '🎤 语音输入': '🎤 Voice Input',
  '🎤 语音': '🎤 Voice',
  '🎙️ 语音': '🎙️ Voice',
  '⌨️ 打字': '⌨️ Type',
  '切换为微信式按住说话': 'Switch to Hold-to-Talk voice mode',
  '切换为键盘打字输入': 'Switch to keyboard typing mode',
  '🎙️ 按住 说话': '🎙️ Hold to Talk',
  '🎙️ 按住 说话（实时插话）': '🎙️ Hold to Talk (Live Steer)',
  '🟢 松开 立即发送': '🟢 Release to Send',
  '🔴 松开 取消发送': '🔴 Release to Cancel',
  '🔵 松开 填入输入框改字': '🔵 Release to Edit Text',
  '⏳ AI 执行中（暂不可说话）': '⏳ AI Running (Voice Locked)',
  '👀 当前为观察模式（仅查看）': '👀 Observe-Only Mode',
  '正在听你说话…': 'Listening…',
  '左滑取消': 'Slide Left: Cancel',
  '右滑改字': 'Slide Right: Edit',
  '松开 立即发送': 'Release to Send',
  '松开手指，取消发送': 'Release to Cancel',
  '松开手指，填入输入框修改': 'Release to Edit Text',
  '正在发送…': 'Sending…',
  '正在转文字…': 'Converting to text…',
  '已取消语音': 'Voice cancelled',
  '👆 请按住按钮说话，松开立即发送': '👆 Hold button to speak, release to send',
  '🎙️ 未听到说话内容，请按住重试': '🎙️ No speech heard, hold and try again',
  '✍️ 已转为文字，修改后点「发送」即可': '✍️ Converted to text — edit and tap Send',
  '⏳ 当前会话正在执行或为观察模式，暂不可说话':
    '⏳ Session is running or observe-only; voice unavailable right now',
  '🎙️ 请在浏览器地址栏允许麦克风权限后再按住说话':
    '🎙️ Allow microphone permission in the address bar, then hold to talk',
  '🎙️ 麦克风正被其他后台软件占用，请先关闭后再试':
    '🎙️ Microphone is busy in another app; close it and retry',
  '⏹ 停止': '⏹ Stop',
  '⏹ 停止听写': '⏹ Stop Dictation',
  '⏹ 已关闭语音输入': '⏹ Voice input stopped',
  '🎙️ 正在听写，请直接说话（再点「⏹」立即关闭）':
    '🎙️ Listening… Speak now (tap ⏹ to stop)',
  '🔴 正在听写… 请直接说话（再点下方「⏹」结束）':
    '🔴 Listening… Speak now (tap ⏹ below to stop)',
  '🔴 正在持续听写… 停顿不会断，说完点「⏹」或直接「发送」':
    '🔴 Continuous dictation… Pauses will not stop; tap ⏹ or Send when done',
  '🎙️ 正在持续听写，说完点「⏹」或直接发送':
    '🎙️ Continuous dictation active; tap ⏹ or Send when done',
  'ℹ️ 长时间未检测到新语音，已自动关闭麦克风':
    'ℹ️ Mic auto-closed after 60s of silence',
  '⏳ 当前会话正在执行或为观察模式，暂不可语音输入':
    '⏳ Session is running or observe-only; voice input unavailable right now',
  '🎙️ 桌面图标模式受苹果限制无法直接识别：请用 Safari 打开，或点输入框用键盘右下角「🎤」说话':
    '🎙️ Home Screen mode blocks direct speech API on iOS: open in Safari, or tap 🎤 on your keyboard',
  '🎙️ 当前浏览器不支持直接语音识别，请点输入框用系统键盘「🎤」说话':
    '🎙️ Browser speech input unavailable; please tap 🎤 on your system keyboard',
  '🎙️ 未开启麦克风权限：请在浏览器地址栏允许麦克风后重试':
    '🎙️ Mic permission denied: allow microphone in the address bar and retry',
  '🎙️ 未开启麦克风权限：请在地址栏允许麦克风':
    '🎙️ Mic permission denied: allow microphone in the address bar',
  '🎙️ 麦克风正被其他后台语音软件占用，请先关闭后台语音后再点「🎤」':
    '🎙️ Microphone is in use by another background app; close it and tap 🎤 again',
  '🎙️ 麦克风被后台软件占用，请关闭后再试':
    '🎙️ Microphone is busy in another app; close it and retry',
  '🎙️ 当前无法直接启动语音识别，请点输入框用系统键盘「🎤」说话':
    '🎙️ Unable to start speech recognition directly; please use system keyboard 🎤',
  'ℹ️ 未检测到说话声，可再点「🎤」重试': 'ℹ️ No speech detected; tap 🎤 to retry',
  '🛠️ 检查 git status 并跑测试': '🛠️ Check git status & run tests',
  '📦 总结最近一次 commit 改动': '📦 Summarize latest commit changes',
  '🔍 排查当前目录报错日志': '🔍 Diagnose errors in current project',
  '描述你要让远程 AI 执行的开发任务（可点上方上传截图）...':
    'Describe the coding task for your remote AI agent (you can also attach screenshots)...',
  '输入你想让电脑执行的任务，或点击下方传截图/语音输入...':
    'Describe the task to run on your remote computer, or attach screenshots/voice below...',
  '📁 项目工作区': '📁 Project Workspaces',
  '💻 执行电脑': '💻 Target Computer',
  '⚡ 执行引擎': '⚡ AI Engine',
  '⚠️ 暂无在线电脑': '⚠️ No Computer Online',
  '选择模型': 'Select Model',
  '🤖 默认模型': '🤖 Default Model',
  '🖼️ 截图': '🖼️ Screenshot',
  '📁 选择项目文件夹': '📁 Select Project Folder',
  '搜索项目名称或路径...': 'Search project name or path...',
  '未找到匹配的项目文件夹': 'No matching project folder found',
  '全部 ▾': 'All ▾',
  '🚀 立即在远程电脑启动': '🚀 Launch on Remote Computer',
  '🚀 立即在远程电脑启动任务': '🚀 Launch Task on Remote Computer',
  '📂 项目文件速览': '📂 Project Files',
  '关闭': 'Close',
  '‹ 返回目录': '‹ Back to folder',
  '‹ 返回文件列表': '‹ Back to files',
  '🏠 根目录': '🏠 Root',
  '目录': 'Folder',
  '📎 插入到输入框': '📎 Quote in Chat',
  '💬 让 AI 分析': '💬 Ask AI',
  '📋 复制': '📋 Copy',
  '还没有接入电脑': 'No Computer Connected Yet',
  '请先在电脑终端执行一行安装命令接入本机，即可远程浏览项目代码与文件':
    'Run the 1-line enrollment command in your computer terminal to browse project files remotely.',
  '👉 去查看一行接入命令': '👉 View 1-Line Setup Command',
  '🔗 端到端加密分享链接已就绪': '🔗 E2EE Share Link Ready',
  '📋 复制加密链接': '📋 Copy Encrypted Link',
  '🌐 打开预览': '🌐 Open Preview',
  '📱 手机扫码 / 6 位配对码登录': '📱 Phone QR / 6-Digit Pairing Login',
  '扫码网址:': 'Scan URL:',
  '📋 复制免密链接': '📋 Copy Direct Login Link',
  '🔄 重新生成': '🔄 Regenerate',
  '正在生成 6 位免密配对码…': 'Generating 6-digit pairing code…',
  '📋 复制内容': '📋 Copy Content',
  '当前浏览器限制了自动写入剪贴板，请点下方按钮或长按文本框复制：':
    'Auto-copy was blocked by the browser. Tap the button below or long-press to copy:',
  '📋 点此复制选中文本': '📋 Copy Selected Text',
  '⚡ 极速实时模式 (Rust 原生加速)': '⚡ Turbo Real-Time Mode (Rust Native)',
  '📦 跨电脑一键迁移会话': '📦 Cross-Computer Session Migration',
  '保存标题': 'Save Title',
  '📌 取消置顶此对话': '📌 Unpin Conversation',
  '📌 置顶此对话（固定在列表最顶部）': '📌 Pin Conversation to Top',
  '🔗 生成 AES-256 端到端加密回放链接': '🔗 Create AES-256 Encrypted Share Link',
  '🗑️ 删除此条会话记录': '🗑️ Delete Conversation',
  '⚠️ 再次点击确认彻底删除': '⚠️ Tap Again to Confirm Delete',
  '🤖 选择 AI 模型': '🤖 Select AI Model',
  '切换当前对话使用的 AI 模型': 'Switch the AI model for this conversation',
  '不强制覆盖，沿用该会话在电脑端已选的模型配置': 'Use the default model configured on your computer',
  '当前已选 ✓': 'Selected ✓',
  '选择 ›': 'Select ›',
  '🤖 默认模型 ▾': '🤖 Default ▾',
  '切换 AI 模型': 'Switch AI Model',
  '选择新建对话使用的 AI 模型': 'Select AI Model for New Conversation',
};

const REGEX_ZH_TO_EN = [
  [/^🤖 选择模型 · (.+)$/, '🤖 Select Model · $1'],
  [/^✨ 跟随电脑端当前默认 \((.+)\)$/, '✨ Computer Default ($1)'],
  [/^🤖 默认 \((.+)\)$/, '🤖 Default ($1)'],
  [/^🤖 默认 · (.+)$/, '🤖 Default · $1'],
  [/^全部 \((\d+)\) ▾$/, 'All ($1) ▾'],
  [/^全部电脑 \((\d+)\)$/, 'All Computers ($1)'],
  [/^已接入电脑 \((\d+) 台 · 点击卡片展开详情\)$/, 'Connected Computers ($1 · tap card for details)'],
  [/^端到端加密分享记录 \((\d+)\)$/, 'Encrypted Share History ($1)'],
  [/^(\d+)\/(\d+) 台设备在线$/, '$1/$2 computers online'],
  [/^一屏混排查看 (\d+) 台电脑共 (\d+) 条会话$/, 'Unified view of $2 sessions across $1 computers'],
  [/^(\d+) 条会话 · 🎯 飞书当前主控$/, '$1 sessions · 🎯 Primary Host'],
  [/^(\d+) 条会话 · 在线待命$/, '$1 sessions · Online'],
  [/^(\d+) 条会话 · 离线 \((.+)\)$/, '$1 sessions · Offline ($2)'],
  [/^⏳ (\d+)m有效 · 已连 (\d+) 台 · 点此展开命令$/, '⏳ $1m left · $2 joined · tap to expand'],
  [/^⏳ (\d+) 分钟$/, '⏳ $1 min'],
  [/^💻 (\d+) 台$/, '💻 $1 joined'],
  [/^💬 (\d+) 会话$/, '💬 $1 sessions'],
  [/^💬 (\d+) 会话 \($/, '💬 $1 sessions ('],
  [/^(\d+) 运行中$/, '$1 running'],
  [/^(\d+) 条 · (\d+) 运行 · (.+)$/, '$1 sessions · $2 running · $3'],
  [/^⚪ 离线 \((.+)\)$/, '⚪ Offline ($1)'],
  [/^⏳ (\d+) 条排队$/, '⏳ $1 queued'],
  [/^共 (\d+) 字$/, '$1 chars'],
  [/^💭 思考过程 · 共 (\d+) 步 \(点击展开\)$/, '💭 Thinking · $1 steps (tap to expand)'],
  [/^💭 思考过程 \(点击展开\)$/, '💭 Thinking process (tap to expand)'],
  [/^🔧 执行过程 · 共 (\d+) 次工具调用 \((.+)\) \(点击展开\)$/, '🔧 Executed $1 tool calls ($2) (tap to expand)'],
  [/^⬆️ 为保证秒开已省略前 (\d+) 条早先记录 · 点击加载完整历史$/, '⬆️ $1 earlier messages omitted for speed · Tap to load full history'],
  [/^✅ 已加载全部历史对话（共 (\d+) 条）$/, '✅ All $1 messages loaded'],
  [/^⏳ 有效期剩余 (\d+) 秒（扫码或输入一次后即刻生效）$/, '⏳ Expires in $1s (single-use QR or 6-digit code)'],
  [/^⚠️ 该二维码\/配对码已过期，请点击下方重新生成$/, '⚠️ Code expired. Tap Regenerate below'],
  [/^\((\d+) 条对话\)(.*)$/, (_, count, rest) => {
    const r = String(rest || '')
      .replace('· 👀 仅观测', '· 👀 Observe-only')
      .replace('· 🔵 可续聊', '· 🔵 Resumable');
    return `(${count} msgs)${r}`;
  }],
  [/^(.*)\((\d+) 条对话\)(.*)$/, (_, prefix, count, rest) => {
    const r = String(rest || '')
      .replace('· 👀 仅观测', '· 👀 Observe-only')
      .replace('· 🔵 可续聊', '· 🔵 Resumable');
    return `${prefix}(${count} msgs)${r}`;
  }],
  [/^发指令通过 (.+) CLI 继续对话\.\.\.$/, 'Send a prompt to resume via $1 CLI...'],
  [/^📂 查看【(.+)】项目文件夹$/, '📂 Browse [$1] Project Files'],
  [/^⏳ 等待你确认工具调用：(.+)$/, '⏳ Waiting for tool approval: $1'],
  [/^💬 \[(.+)\] (.+)等待你做出选择$/, '💬 [$1] $2Waiting for your choice'],
  [/^⏳ \[(.+)\] (.+)等待你批准工具执行$/, '⏳ [$1] $2Waiting for tool approval'],
  [/^💬 \[(.+)\] (.+)正在同步你的选择到电脑端\.\.\.$/, '💬 [$1] $2Syncing your choice to computer...'],
  [/^⏳ \[(.+)\] (.+)正在同步审批到电脑端\.\.\.$/, '⏳ [$1] $2Syncing approval to computer...'],
  [/^💬 \[(.+)\]「(.+)」待你选择$/, '💬 [$1] "$2" needs your choice'],
  [/^⏳ \[(.+)\]「(.+)」待你审批$/, '⏳ [$1] "$2" needs approval'],
  [/^🔋 (\d+)% · 充放电正常$/, '🔋 $1% · Battery OK'],
  [/^🔋 (\d+)% · 正在充电$/, '🔋 $1% · Charging'],
  [/^🔋 (\d+)% · 已充满$/, '🔋 $1% · Fully Charged'],
  [/^🔋 (\d+)% · 电池供电(.*)$/, '🔋 $1% · On Battery$2'],
  [/^🪫 (\d+)% · 低电量(.*)$/, '🪫 $1% · Low Battery$2'],
  [/^📶 Wi-Fi \((.+)\) · (\d+)ms$/, '📶 Wi-Fi ($1) · $2ms'],
  [/^📶 Wi-Fi (\d+)ms$/, '📶 Wi-Fi $1ms'],
  [/^🌐 有线\/局域网 \((.+)\) · (\d+)ms$/, '🌐 LAN ($1) · $2ms'],
  [/^🌐 局域网 (\d+)ms$/, '🌐 LAN $1ms'],
  [/^🔒 指纹 $/, '🔒 Fingerprint '],
  [/^ · 🔑 独立凭证 \((.+)\)$/, ' · 🔑 Dedicated Token ($1)'],
  [/^ · 🔑 管理员凭证$/, ' · 🔑 Admin Token'],
  [/^同步序号 #(\d+)$/, 'Sync #$1'],
  [/^⬆️ 可升 v(.+)$/, '⬆️ Update to v$1'],
  [/^v(.+) 最新$/, 'v$1 Latest'],
  [/^🔄 一键升级 \(v(.+)\)$/, '🔄 Upgrade (v$1)'],
  [/^DSH 远控总控台 v(.+) · 构建 $/, 'DSH Remote Control Hub v$1 · Build '],
  [/^ · 云端启动于 (.+)$/, ' · Started $1'],
  [/^刚刚$/, 'just now'],
  [/^(\d+)\s*秒前$/, '$1s ago'],
  [/^(\d+)\s*分钟前$/, '$1m ago'],
  [/^(\d+)\s*小时前$/, '$1h ago'],
  [/^(\d+)\s*天前$/, '$1d ago'],
];

export function getLangPref() {
  try {
    if (typeof location !== 'undefined' && location.search) {
      const params = new URLSearchParams(location.search);
      const qLang = (params.get('lang') || '').trim().toLowerCase();
      if (qLang === 'en' || qLang === 'zh') {
        try { localStorage.setItem('dsh_lang_pref', qLang); } catch {}
        return qLang;
      }
    }
    if (typeof localStorage !== 'undefined') {
      const saved = (localStorage.getItem('dsh_lang_pref') || '').trim().toLowerCase();
      if (saved === 'en' || saved === 'zh') return saved;
    }
    if (typeof navigator !== 'undefined' && navigator.language) {
      const nav = String(navigator.language).toLowerCase();
      if (nav.startsWith('zh')) return 'zh';
      return 'en';
    }
  } catch {}
  return 'zh';
}

export function setLangPreference(nextLang) {
  const norm = nextLang === 'en' ? 'en' : 'zh';
  try {
    localStorage.setItem('dsh_lang_pref', norm);
  } catch {}
  return norm;
}

export function translateZhStringToEn(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  if (EXACT_ZH_TO_EN[trimmed]) {
    const lead = raw.match(/^\s*/)?.[0] || '';
    const tail = raw.match(/\s*$/)?.[0] || '';
    return lead + EXACT_ZH_TO_EN[trimmed] + tail;
  }
  for (const [pattern, replacement] of REGEX_ZH_TO_EN) {
    if (pattern.test(trimmed)) {
      const lead = raw.match(/^\s*/)?.[0] || '';
      const tail = raw.match(/\s*$/)?.[0] || '';
      const out = typeof replacement === 'function'
        ? trimmed.replace(pattern, replacement)
        : trimmed.replace(pattern, replacement);
      return lead + out + tail;
    }
  }
  // Substring replacements for compound strings
  let out = raw;
  const compoundPairs = [
    ['🎉 电脑已接入！第 ⑥ 步：点右侧生成二维码，用手机相机扫一扫即可免输密码直接遥控',
      '🎉 Computer connected! Next step: tap "Phone QR Login" on the right and scan with your phone camera'],
    ['电脑已接入！第 ⑥ 步', 'Computer connected! Next step'],
    ['：点右侧生成二维码，用', ': tap the button on the right and scan with your '],
    ['手机相机扫一扫', 'phone camera'],
    ['即可免输密码直接遥控', ' for instant passwordless control'],
    ['① 终端执行命令', '① Run 1-Line Command'],
    ['复制下方一行命令', 'Paste in computer terminal'],
    ['② 自动连上刷新', '② Auto-Connects Live'],
    ['无需重启或手填', 'Zero manual config'],
    ['③ 手机扫码遥控', '③ Scan QR on Phone'],
    ['免输密码直接进', 'Instant passwordless login'],
    ['用手机相机直接', 'Point your phone camera at the '],
    ['扫下方二维码', 'QR code below'],
    ['即可免输密码登录（也可在手机端输入 6 位码）：', ' for instant login (or enter the 6-digit code):'],
    ['📡 局域网自动修正', '📡 LAN IP Auto-Detected'],
    ['：你当前在电脑上用 ', ': You opened this page via '],
    [' 打开（手机扫 localhost 会连不上），已自动将二维码切换为本机局域网地址 ',
      ' (which phones cannot reach). Switched QR code to your LAN IP '],
    ['。请确保手机与电脑连同一 Wi-Fi，或在下方改为公网/隧道地址：',
      '. Keep phone & computer on the same Wi-Fi, or enter a public URL below:'],
    ['⚠️ 注意', '⚠️ Note'],
    [' 打开，手机无法直接访问 localhost！请在下方把地址改为电脑的局域网 IP（如 ',
      ' — phones cannot reach localhost! Change the URL below to your computer LAN IP (e.g. '],
    ['）或公网域名后再扫码：', ') or public domain before scanning:'],
    ['全部 ', 'All '],
    ['🟢 运行中 ', '🟢 Running '],
    ['🔵 已出结论 ', '🔵 Completed '],
    ['🧑 我: ', '🧑 Me: '],
    ['⚡ 极速', '⚡ Turbo'],
    ['🐢 轮询', '🐢 Polling'],
    ['🔵 看会话/发指令', '🔵 View & Prompt'],
    ['👀 观察模式', '👀 Observe-only'],
    ['⚪ 未安装', '⚪ Not installed'],
    ['🔓 解锁成功', '🔓 Unlocked'],
    ['🔓 扫码登录成功', '🔓 QR login successful'],
    ['🔓 配对解锁成功', '🔓 Paired & unlocked'],
    ['🔒 已锁定当前浏览器', '🔒 Browser locked'],
    ['📋 已复制到剪贴板', '📋 Copied to clipboard'],
    ['📋 手机免密登录链接已复制', '📋 Direct phone login link copied'],
    ['📋 一行接入命令已复制！到电脑终端粘贴回车即可', '📋 1-line command copied! Paste and run in your terminal'],
    ['📋 本地仓库接入命令已复制', '📋 Local repo command copied'],
  ];
  for (const [zhSub, enSub] of compoundPairs) {
    if (out.includes(zhSub)) {
      out = out.split(zhSub).join(enSub);
    }
  }
  return out;
}

let domHasEnTranslation = false;

export function applyLangToDom(root = typeof document !== 'undefined' ? document.body : null, lang = getLangPref()) {
  if (!root || typeof document === 'undefined') return;
  const isEn = lang === 'en';
  if (document.documentElement) {
    document.documentElement.setAttribute('lang', isEn ? 'en' : 'zh-CN');
  }

  // Update language toggle buttons
  document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
    btn.textContent = isEn ? '🌐 中文' : '🌐 EN';
    btn.setAttribute('title', isEn ? 'Switch to Chinese (切换中文)' : 'Switch to English');
  });

  // Fast path: in default Chinese mode (when DOM has never been translated to English),
  // skip full-DOM walks and never mutate focused input attributes during SSE updates.
  if (!isEn && !domHasEnTranslation) {
    return;
  }
  domHasEnTranslation = isEn;

  // Translate element attributes (placeholder, title)
  const attrEls = root.querySelectorAll('[placeholder], [title]');
  attrEls.forEach(el => {
    if (el.hasAttribute('placeholder')) {
      const cur = el.getAttribute('placeholder') || '';
      if (el.dataset.origPlaceholder === undefined) {
        el.dataset.origPlaceholder = cur;
      } else if (/[\u4e00-\u9fa5]/.test(cur) && cur !== el.dataset.origPlaceholder) {
        el.dataset.origPlaceholder = cur;
      }
      const orig = el.dataset.origPlaceholder;
      const target = isEn ? translateZhStringToEn(orig) : orig;
      if (cur !== target && document.activeElement !== el) {
        el.setAttribute('placeholder', target);
      }
    }
    if (el.hasAttribute('title') && !el.hasAttribute('data-lang-toggle')) {
      const cur = el.getAttribute('title') || '';
      if (el.dataset.origTitle === undefined) {
        el.dataset.origTitle = cur;
      } else if (/[\u4e00-\u9fa5]/.test(cur) && cur !== el.dataset.origTitle) {
        el.dataset.origTitle = cur;
      }
      const orig = el.dataset.origTitle;
      const target = isEn ? translateZhStringToEn(orig) : orig;
      if (cur !== target) el.setAttribute('title', target);
    }
  });

  // Walk text nodes
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let node = walker.nextNode();
  while (node) {
    const parentTag = node.parentElement?.tagName;
    if (parentTag !== 'SCRIPT' && parentTag !== 'STYLE' && parentTag !== 'CODE' && parentTag !== 'PRE') {
      const curVal = node.nodeValue || '';
      if (node.__origZh === undefined) {
        node.__origZh = curVal;
      } else if (!isEn && curVal !== node.__origZh && /[\u4e00-\u9fa5]/.test(curVal)) {
        // Dynamic update happened while in zh mode
        node.__origZh = curVal;
      } else if (isEn && /[\u4e00-\u9fa5]/.test(curVal)) {
        // Dynamic update wrote fresh Chinese text while in en mode
        node.__origZh = curVal;
      }
      const orig = node.__origZh;
      const target = isEn ? translateZhStringToEn(orig) : orig;
      if (curVal !== target) {
        node.nodeValue = target;
      }
    }
    node = walker.nextNode();
  }
}
