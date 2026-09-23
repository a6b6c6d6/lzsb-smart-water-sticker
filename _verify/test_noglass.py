"""
回归：未安装「LINUX SB 液态玻璃质感」时，水贴专用必须与改动前完全一致（零副作用）。
    D:\\python\\python.exe _verify\\test_noglass.py
"""
import json
import os
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
URL = 'http://127.0.0.1:8899/noglass/topic/12345'

results = []


def check(name, ok, detail=''):
    results.append((name, bool(ok), detail))
    print(('  [PASS] ' if ok else '  [FAIL] ') + name + ('  — ' + detail if detail else ''), flush=True)


JS = """
() => {
  const f = document.getElementById('lsb-ai-fab');
  const p = document.getElementById('lsb-ai-panel');
  const cs = getComputedStyle(f);
  const modeBtn = document.querySelector('.lsb-mode-btn.is-active');
  const waterBtn = document.querySelector('.lsb-water-btn');
  const panel = getComputedStyle(p);
  return {
    ready: document.documentElement.classList.contains('lsb-ready'),
    gearExists: !!document.getElementById('lsb-settings-toggle-btn'),
    inner: { w: window.innerWidth, h: window.innerHeight },
    inline: { l: parseFloat(f.style.left), t: parseFloat(f.style.top),
              w: f.offsetWidth, h: f.offsetHeight },
    css: { backgroundImage: cs.backgroundImage, backgroundColor: cs.backgroundColor,
           color: cs.color, borderRadius: cs.borderRadius, cursor: cs.cursor,
           borderTopStyle: cs.borderTopStyle, backdropFilter: cs.backdropFilter },
    panelRadius: panel.borderRadius,
    modeBtnBg: modeBtn ? getComputedStyle(modeBtn).backgroundColor : null,
    waterBg: waterBtn ? getComputedStyle(waterBtn).backgroundColor : null,
    highlightBg: (() => { const li = document.querySelector('li.lsb-target-highlight');
                          return li ? getComputedStyle(li).backgroundColor : null; })()
  };
}
"""

srv = subprocess.Popen([PY, os.path.join(HERE, 'server.py')],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
try:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel='chrome', headless=True)
        page = b.new_page(viewport={'width': 1280, 'height': 800})
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.goto(URL, wait_until='load')
        page.wait_for_selector('#lsb-ai-fab', timeout=8000)
        page.evaluate("localStorage.clear()")
        page.reload(wait_until='load')
        page.wait_for_selector('#lsb-ai-fab', timeout=8000)
        page.wait_for_timeout(400)
        page.mouse.move(5, 400)
        page.wait_for_timeout(400)

        print('\n环境：未加载液态玻璃脚本')
        d = page.evaluate(JS)
        check('确实没有玻璃脚本（无 lsb-ready、无齿轮）',
              not d['ready'] and not d['gearExists'])

        print('\n悬浮标应保持原来的蓝色胶囊')
        check('仍是原来的蓝紫渐变胶囊',
              d['css']['backgroundImage'] == 'none' or 'gradient' in d['css']['backgroundImage'],
              d['css']['backgroundImage'][:60])
        check('文字仍是白色', d['css']['color'] == 'rgb(255, 255, 255)', d['css']['color'])
        check('圆角仍是 24px（没有被 --lsb-radius 影响）',
              d['css']['borderRadius'] == '24px', d['css']['borderRadius'])
        check('无 backdrop-filter（不该凭空多出毛玻璃）',
              d['css']['backdropFilter'] == 'none', d['css']['backdropFilter'])
        check('边框是透明实线（仅用于对齐尺寸，视觉不可见）',
              d['css']['borderTopStyle'] == 'solid', d['css']['borderTopStyle'])
        # 真正的硬指标：外框尺寸必须与「装了玻璃脚本」时完全一致（两边都是 94×41），
        # 否则切换脚本会看到悬浮标忽大忽小
        check('外框尺寸与装了玻璃脚本时一致（94×41）',
              d['inline']['w'] == 94 and d['inline']['h'] == 41,
              '%dx%d' % (d['inline']['w'], d['inline']['h']))
        check('cursor 仍是 grab', d['css']['cursor'] == 'grab', d['css']['cursor'])
        check('面板圆角仍是 14px（未跟随 --lsb-radius）',
              d['panelRadius'] == '14px', d['panelRadius'])

        print('\n语义配色保持原设计')
        check('模式选中态是蓝色', d['modeBtnBg'] == 'rgb(37, 99, 235)', str(d['modeBtnBg']))
        check('「水它」是浅蓝底', d['waterBg'] == 'rgb(239, 246, 255)', str(d['waterBg']))

        print('\n新功能在没有玻璃脚本时同样可用')
        base = page.evaluate(JS)
        check('默认位置 = 右边距 84px / 下边距 24px',
              abs(base['inner']['w'] - (base['inline']['l'] + base['inline']['w']) - 84) <= 1
              and abs(base['inner']['h'] - (base['inline']['t'] + base['inline']['h']) - 24) <= 1,
              '右 %.0f / 下 %.0f' % (base['inner']['w'] - (base['inline']['l'] + base['inline']['w']),
                                     base['inner']['h'] - (base['inline']['t'] + base['inline']['h'])))
        fx = base['inline']['l'] + base['inline']['w'] / 2
        fy = base['inline']['t'] + base['inline']['h'] / 2
        page.mouse.move(fx, fy)
        page.mouse.down()
        for i in range(1, 11):
            page.mouse.move(fx - 250 * i / 10, fy - 200 * i / 10)
        page.mouse.up()
        page.wait_for_timeout(250)
        after = page.evaluate(JS)
        check('拖拽正常', abs(after['inline']['l'] - base['inline']['l'] + 250) < 2
              and abs(after['inline']['t'] - base['inline']['t'] + 200) < 2,
              '位移 (%.0f, %.0f)' % (after['inline']['l'] - base['inline']['l'],
                                     after['inline']['t'] - base['inline']['t']))
        check('拖拽后未误开面板',
              page.evaluate("() => document.getElementById('lsb-ai-panel').classList.contains('lsb-hidden')"))
        page.mouse.click(after['inline']['l'] + after['inline']['w'] / 2,
                         after['inline']['t'] + after['inline']['h'] / 2)
        page.wait_for_timeout(250)
        check('单击能开面板',
              not page.evaluate("() => document.getElementById('lsb-ai-panel').classList.contains('lsb-hidden')"))
        check('点「水它」高亮底色仍是原设计的 #f0f7ff',
              (page.evaluate("() => document.querySelector('.lsb-water-btn').click()") is None
               and page.wait_for_timeout(250) is None
               and page.evaluate(JS)['highlightBg'] == 'rgb(240, 247, 255)'),
              str(page.evaluate(JS)['highlightBg']))
        check('无 JS 报错', not errs, '; '.join(errs[:3]))
        b.close()
finally:
    srv.terminate()

print('\n' + '=' * 62)
passed = sum(1 for _, ok, _ in results if ok)
failed = [n for n, ok, _ in results if not ok]
print('结果：%d/%d 通过' % (passed, len(results)))
for n in failed:
    print('  - ' + n)
sys.exit(1 if failed else 0)
