"""把工作区改动按 hunk 拆成两份 patch：一份是用户之前搁置的改动，一份是本次版本改动。"""
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')
REPO = r'C:\Users\28956\WorkBuddy\2026-08-14-22-59-08'
TARGET = 'linux.sb-ai-reply.user.js'
OUT = os.path.join(os.environ.get('TEMP', '.'), 'lsb_split')

os.makedirs(OUT, exist_ok=True)
os.chdir(REPO)

diff = subprocess.run(['git', 'diff', '-U3', '--', TARGET],
                      capture_output=True, text=True, encoding='utf-8').stdout

lines = diff.split('\n')
header, hunks, cur = [], [], None
for ln in lines:
    if ln.startswith('@@'):
        if cur is not None:
            hunks.append(cur)
        cur = [ln]
    elif cur is None:
        header.append(ln)
    else:
        cur.append(ln)
if cur is not None:
    hunks.append(cur)
if hunks and hunks[-1] and hunks[-1][-1] == '':
    hunks[-1] = hunks[-1][:-1]

MINE_MARK = 'nb-editor-reply-visible-locked'
other, mine = [], []
for h in hunks:
    body = '\n'.join(h)
    (other if MINE_MARK in body else mine).append(h)
    print('  hunk %-24s -> %s' % (h[0][:24], '搁置改动' if MINE_MARK in body else '本次改动'))

def dump(path, hunk_list):
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(header).rstrip('\n') + '\n')
        for h in hunk_list:
            f.write('\n'.join(h) + '\n')

dump(os.path.join(OUT, 'other.patch'), other)
dump(os.path.join(OUT, 'mine.patch'), mine)
print('\npatch 写到 %s' % OUT)
print('  other.patch: %d 个 hunk' % len(other))
print('  mine.patch : %d 个 hunk' % len(mine))
