"""把工作区改动拆成两个 commit：
   1) 用户之前搁置的「回复可见」锁定段处理（本来就在工作区里，不是我改的）
   2) 本次 v2.12.0 的全部改动

做法不走 git apply（会有 CRLF 隐患），而是：
   - 用 git show 取 HEAD 版本，纯文本插入那 6 行 → 写成 commit 1 的内容
   - 再把最终文件（备份）整体拷回来 → 写成 commit 2 的内容
最后用 sha256 校验落盘内容与备份一致。
"""
import hashlib
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')
REPO = r'C:\Users\28956\WorkBuddy\2026-08-14-22-59-08'
TARGET = 'linux.sb-ai-reply.user.js'
BACKUP = os.path.join(REPO, '.tmp-backup', 'final-v2.12.0.user.js')
ANCHOR = "      if (tag === 'br') { out.push('\\n'); return; }"
BLOCK = (
    "      // 「回复可见」锁定段：服务端在渲染时就把它替换成了提示（HTML 里没有正文，无内容可读）。\n"
    "      // 把锁定提示（🔒 回复后可见…）换成对模型更有信息量的标记，否则模型会把提示当正文。\n"
    "      if (tag === 'section' && n.classList.contains('nb-editor-reply-visible-locked')) {\n"
    "        out.push('\\n[🔒 此段内容设置了回复本主题后才可见，当前看不到]\\n');\n"
    "        return;\n"
    "      }\n"
)

os.chdir(REPO)


def sh(*args):
    return subprocess.run(list(args), capture_output=True, text=True, encoding='utf-8')


def sha(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


backup_hash = sha(BACKUP)
print('备份 sha256 = %s' % backup_hash[:16])

head = sh('git', 'show', 'HEAD:' + TARGET).stdout
assert 'nb-editor-reply-visible-locked' not in head, 'HEAD 里居然已经有这段了，中止'
n = head.count(ANCHOR)
assert n == 1, '锚点出现 %d 次（应为 1 次），中止' % n
staged1 = head.replace(ANCHOR, BLOCK + ANCHOR)
assert len(staged1) == len(head) + len(BLOCK), '插入长度不符，中止'
print('commit1 内容构造完成：%d → %d 字节' % (len(head.encode('utf-8')), len(staged1.encode('utf-8'))))

newline = '\r\n' if '\r\n' in head else '\n'
print('换行符：%s' % ('CRLF' if newline == '\r\n' else 'LF'))

with open(TARGET, 'w', encoding='utf-8', newline='') as f:
    f.write(staged1)

print('\n--- commit 1 ---')
print(sh('git', 'add', TARGET).stderr or '(add ok)')
r = sh('git', 'commit', '-m',
       'feat: 帖子正文里的「回复可见」锁定段改成明确标记\n\n'
       '服务端渲染时就把该段替换成了锁定提示（HTML 里没有正文，读不到内容），\n'
       '原来会被模型当成正文来附和。现在替换成「此段内容设置了回复本主题后才可见」的标记。\n\n'
       '（这段改动此前一直滞留在工作区未提交，本次单独入库，与 v2.12.0 的改动分开。）')
print(r.stdout.strip() or r.stderr.strip())

print('\n--- commit 2 ---')
with open(BACKUP, 'rb') as src, open(TARGET, 'wb') as dst:
    dst.write(src.read())
now = sha(TARGET)
print('拷回后 sha256 = %s  一致：%s' % (now[:16], now == backup_hash))
assert now == backup_hash, '落盘内容与备份不一致，中止'
print(sh('git', 'add', TARGET, '_verify').stderr or '(add ok)')
r = sh('git', 'commit', '-m',
       'feat: v2.12.0 —— 悬浮标可拖动 + 适配「LINUX SB 液态玻璃质感」脚本\n\n'
       '悬浮标：\n'
       '- 可拖动，位置持久化（GM 键 fabPos），越界与窗口缩放自动钳回视口\n'
       '- 右键复位到右下角默认锚点；拖拽用一次性标志位与单击区分，不会吃掉真实点击\n'
       '- 面板跟随悬浮标弹出：上→下→左→右挑第一个放得下的位置，保证不压住悬浮标\n\n'
       '适配液态玻璃脚本 v1.7.5（三处实测冲突）：\n'
       '- 默认位置右移 84px，避让该脚本固定在 right/bottom:24px 的 46×46 设置悬浮球\n'
       '  （原先完全重叠，本站悬浮标 z-index 更高，把那颗齿轮压掉半边点不动）\n'
       '- 对 html.lsb-scrolling * { pointer-events:none !important } 单点豁免，\n'
       '  否则滚动停止后的 120ms 内悬浮标点不动也拖不动\n'
       '- 覆盖该脚本 button:not(.nb-editor-btn){…!important} 的全站按钮统一规范，\n'
       '  保住「水它」底色与选中态、模式切换选中态、主/停止按钮颜色、目标评论高亮；\n'
       '  悬浮标改用 --lsb-* 令牌配色，修掉深色模式下白底白字读不出来的问题\n'
       '所有适配规则都挂在 html.lsb-ready 下，未安装该脚本时零副作用\n\n'
       '顺带修复：getBoundingClientRect 含 hover transform 导致存取坐标偏 1~3px\n\n'
       '验证：_verify/ 仿真帖子页 + 本机 Chrome 加载两份脚本真身，37/37 + 17/17 通过')
print(r.stdout.strip() or r.stderr.strip())

print('\n--- 校验 ---')
print(sh('git', 'status', '--short').stdout or '(工作区干净)')
print(sh('git', 'log', '--oneline', '-3').stdout)
