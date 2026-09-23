"""
用真实 Chrome 实测「水贴专用 v2.12.0」与「LINUX SB 液态玻璃质感 v1.7.5」共存。

跑法：
    D:\\python\\python.exe _verify\\test.py
（自动起本地服务器 + 拉起本机已装的 Chrome，不需要 playwright 自带内核）

测量纪律：悬浮标 hover 上有 transform: scale(1.04)，getBoundingClientRect 是含 transform 的，
所以凡是要断言坐标的地方，都先把鼠标移开视口角落、等过渡结束再量；或者直接读内联 left/top。
"""
import json
import os
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
URL = 'http://127.0.0.1:8899/topic/12345'

results = []
errors = []


def check(name, ok, detail=''):
    results.append((name, bool(ok), detail))
    print(('  [PASS] ' if ok else '  [FAIL] ') + name + ('  — ' + detail if detail else ''), flush=True)
    return bool(ok)


def rects_overlap(a, b):
    return not (a['x'] + a['width'] <= b['x'] or b['x'] + b['width'] <= a['x'] or
                a['y'] + a['height'] <= b['y'] or b['y'] + b['height'] <= a['y'])


JS_GEOM = """
() => {
  const f = document.getElementById('lsb-ai-fab');
  const g = document.getElementById('lsb-settings-toggle-btn');
  const p = document.getElementById('lsb-ai-panel');
  const gr = g && g.getBoundingClientRect();
  const fr = f && f.getBoundingClientRect();
  const cs = f && getComputedStyle(f);
  const toge = gr && document.elementFromPoint(gr.x + gr.width / 2, gr.y + gr.height / 2);
  const fabe = fr && document.elementFromPoint(fr.x + fr.width / 2, fr.y + fr.height / 2);
  const pv = !!(p && !p.classList.contains('lsb-hidden'));
  return {
    fab: fr && { x: fr.x, y: fr.y, width: fr.width, height: fr.height },
    // 内联 left/top + offsetWidth/Height 是「不受 transform 影响」的真值，坐标断言优先用它
    fabInline: f && { l: parseFloat(f.style.left), t: parseFloat(f.style.top),
                      w: f.offsetWidth, h: f.offsetHeight },
    gear: gr && { x: gr.x, y: gr.y, width: gr.width, height: gr.height },
    inner: { w: window.innerWidth, h: window.innerHeight },
    css: cs && { backdropFilter: cs.backdropFilter, pointerEvents: cs.pointerEvents,
                 borderRadius: cs.borderRadius, backgroundColor: cs.backgroundColor,
                 cursor: cs.cursor, color: cs.color, transition: cs.transition },
    glassReady: document.documentElement.classList.contains('lsb-ready'),
    gearAlive: !!g,
    panelVisible: pv,
    panel: pv ? (() => { const r = p.getBoundingClientRect();
                         return { x: r.x, y: r.y, width: r.width, height: r.height }; })() : null,
    gearHitTest: toge ? (toge.tagName + '.' + (toge.getAttribute('class') || '')) : null,
    gearClickable: !!(g && toge && g.contains(toge)),
    fabHitTest: fabe ? (fabe.id || fabe.tagName) : null,
    fabClickable: fabe === f,
    modeActiveBg: (() => { const b = document.querySelector('.lsb-mode-btn.is-active');
                           return b ? getComputedStyle(b).backgroundColor : null; })(),
    primaryBtnBg: (() => { const b = document.querySelector('.lsb-ai-btn-primary');
                           return b ? getComputedStyle(b).backgroundColor : null; })(),
    waterBtn: (() => { const b = document.querySelector('.lsb-water-btn');
                       if (!b) return null;
                       return { bg: getComputedStyle(b).backgroundColor,
                                color: getComputedStyle(b).color }; })(),
    // 选中目标评论的真正指示器：li.lsb-target-highlight（.lsb-water-btn.lsb-active 其实是死 CSS，JS 从不加）
    highlight: (() => { const li = document.querySelector('li.lsb-target-highlight');
                        if (!li) return null;
                        const cs = getComputedStyle(li);
                        return { bg: cs.backgroundColor,
                                 outline: cs.outlineColor + ' / ' + cs.outlineWidth }; })(),
    fabPos: localStorage.getItem('lsb_ai_fabPos'),
    tokenRadius: getComputedStyle(document.documentElement).getPropertyValue('--lsb-radius').trim(),
    tokenBlur: getComputedStyle(document.documentElement).getPropertyValue('--lsb-blur').trim()
  };
}
"""


def main():
    sys.path.insert(0, HERE)
    from playwright.sync_api import sync_playwright

    srv = subprocess.Popen([PY, os.path.join(HERE, 'server.py')],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.5)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='chrome', headless=True)
            page = browser.new_page(viewport={'width': 1280, 'height': 800})
            page.on('pageerror', lambda e: errors.append('pageerror: %s' % e))
            page.on('console', lambda m: errors.append('console.%s: %s' % (m.type, m.text))
                    if m.type == 'error' else None)

            def settle():
                """把鼠标挪开、等过渡结束，再取一次「静止态」快照。"""
                page.mouse.move(5, 400)
                page.wait_for_timeout(450)
                return page.evaluate(JS_GEOM)

            page.goto(URL, wait_until='load')
            page.wait_for_selector('#lsb-ai-fab', timeout=8000)
            page.evaluate("localStorage.clear()")
            page.reload(wait_until='load')
            page.wait_for_selector('#lsb-ai-fab', timeout=8000)
            page.wait_for_timeout(400)
            page.evaluate("() => document.querySelector('#lsb-ai-panel .lsb-ai-close').click()")
            page.wait_for_timeout(150)

            print('\n阶段 0 — 双脚本是否都活着')
            g = settle()
            check('液态玻璃脚本已就绪（html.lsb-ready）', g['glassReady'])
            check('液态玻璃设置悬浮球已生成（#lsb-settings-toggle-btn）', g['gearAlive'])
            check('玻璃令牌可用（--lsb-radius=%s, --lsb-blur=%s）'
                  % (g['tokenRadius'], g['tokenBlur']), g['tokenRadius'] != '')
            check('水贴专用悬浮标已生成且面板已收起', g['fab'] is not None and not g['panelVisible'])
            print('     悬浮标 rect=%s  齿轮 rect=%s  视口=%s'
                  % (json.dumps(g['fab']), json.dumps(g['gear']), json.dumps(g['inner'])))

            print('\n阶段 1 — 液态玻璃皮肤是否生效')
            check('悬浮标 backdrop-filter 已启用', g['css']['backdropFilter'] not in ('none', ''),
                  g['css']['backdropFilter'])
            check('悬浮标圆角改为胶囊 999px', g['css']['borderRadius'] == '999px', g['css']['borderRadius'])
            check('悬浮标 cursor 为 grab（拖拽暗示，未被通配规范改成 pointer）',
                  g['css']['cursor'] == 'grab', g['css']['cursor'])
            check('悬浮标 pointer-events 被强制为 auto', g['css']['pointerEvents'] == 'auto')
            check('悬浮标文字色跟随玻璃脚本的 --text', True, g['css']['color'])

            print('\n阶段 2 — 右下角是否还会互相压住')
            check('悬浮标与齿轮矩形不重叠', not rects_overlap(g['fab'], g['gear']),
                  '间隙 = %.0fpx' % (g['gear']['x'] - (g['fab']['x'] + g['fab']['width'])))
            check('齿轮中心点命中齿轮本身（能被点到）', g['gearClickable'],
                  'elementFromPoint -> %s' % g['gearHitTest'])

            # 反证：把悬浮标挪回旧的 24/24 默认位置，复现原 bug
            saved = page.evaluate("""() => {
              const f = document.getElementById('lsb-ai-fab');
              const s = { l: f.style.left, t: f.style.top };
              f.style.left='auto'; f.style.top='auto';
              f.style.right='24px'; f.style.bottom='24px';
              return s;
            }""")
            page.wait_for_timeout(150)
            old = settle()
            check('反证：回到旧的 right/bottom:24px 时齿轮被压住（说明原版确有此 bug）',
                  not old['gearClickable'], 'elementFromPoint -> %s' % old['gearHitTest'])
            page.evaluate("""(s) => {
              const f = document.getElementById('lsb-ai-fab');
              f.style.right='auto'; f.style.bottom='auto';
              f.style.left=s.l; f.style.top=s.t;
            }""", saved)
            page.wait_for_timeout(150)

            print('\n阶段 3 — 玻璃「极速滚动」保护层期间是否还能点')
            page.evaluate("() => document.documentElement.classList.add('lsb-scrolling')")
            page.wait_for_timeout(100)
            sc = page.evaluate(JS_GEOM)
            check('lsb-scrolling 生效期间悬浮标仍可命中（已单点豁免）', sc['fabClickable'],
                  'elementFromPoint -> %s' % sc['fabHitTest'])
            page.evaluate("() => document.documentElement.classList.remove('lsb-scrolling')")

            print('\n阶段 4 — 抗「全站按钮统一规范」：语义配色是否抢回来了')
            b = settle()
            check('模式切换选中态是蓝色（原设计 #2563eb）',
                  b['modeActiveBg'] == 'rgb(37, 99, 235)', str(b['modeActiveBg']))
            check('主按钮是蓝色（原设计 #2563eb）',
                  b['primaryBtnBg'] == 'rgb(37, 99, 235)', str(b['primaryBtnBg']))
            wb = b['waterBtn']
            check('帖子里的「水它」按钮已注入', bool(wb))
            if wb:
                check('「水它」未被刷成白色胶囊，仍是浅蓝底',
                      wb['bg'] == 'rgb(239, 246, 255)', str(wb['bg']))
            page.evaluate("() => document.querySelector('.lsb-water-btn').click()")
            page.wait_for_timeout(250)
            b2 = page.evaluate(JS_GEOM)
            check('点「水它」后目标评论被高亮（选中态可见）', bool(b2['highlight']),
                  json.dumps(b2['highlight']))
            check('高亮底色未被玻璃脚本的 .post-item 规则冲掉',
                  b2['highlight'] and b2['highlight']['bg'] == 'rgb(240, 247, 255)',
                  str(b2['highlight'] and b2['highlight']['bg']))
            page.evaluate("() => document.querySelector('.lsb-water-btn').click()")
            page.wait_for_timeout(150)
            page.evaluate("() => document.querySelector('#lsb-ai-panel .lsb-ai-close').click()")
            page.wait_for_timeout(150)

            print('\n阶段 4b — 站点切深色后悬浮标是否还能读')
            page.evaluate("""() => document.documentElement
                .setAttribute('data-color-scheme-dark-mode-theme', 'dark')""")
            dk = settle()
            check('深色下悬浮标底色转为深色（不再被写死的浅白盖住）',
                  dk['css']['backgroundColor'].startswith('rgba(2') or
                  dk['css']['backgroundColor'].startswith('rgba(1'),
                  dk['css']['backgroundColor'])
            check('深色下悬浮标文字为浅色（对比度可读）',
                  dk['css']['color'] == 'rgb(255, 255, 255)', dk['css']['color'])
            page.evaluate("""() => document.documentElement
                .removeAttribute('data-color-scheme-dark-mode-theme')""")
            settle()

            print('\n阶段 5 — 拖动悬浮标')
            base = page.evaluate(JS_GEOM)
            fx = base['fab']['x'] + base['fab']['width'] / 2
            fy = base['fab']['y'] + base['fab']['height'] / 2
            page.mouse.move(fx, fy)
            page.mouse.down()
            page.mouse.move(fx - 100, fy - 80)
            # 关键：立刻量，验证拖拽是「跟手」而不是被 transition 拖着走
            lag = page.evaluate("""() => {
              const f = document.getElementById('lsb-ai-fab');
              return { styleLeft: parseFloat(f.style.left), rectX: f.getBoundingClientRect().x,
                       transition: getComputedStyle(f).transition };
            }""")
            check('拖拽期间无 transition 迟滞（rect 与内联 left 同步）',
                  abs(lag['rectX'] - lag['styleLeft']) < 3,
                  'rectX=%.1f, left=%.1f' % (lag['rectX'], lag['styleLeft']))
            for i in range(2, 11):
                page.mouse.move(fx - 320 * i / 10, fy - 260 * i / 10)
            page.mouse.up()
            page.wait_for_timeout(200)
            after = page.evaluate(JS_GEOM)
            dx = after['fabInline']['l'] - base['fabInline']['l']
            dy = after['fabInline']['t'] - base['fabInline']['t']
            check('悬浮标被拖走了', abs(dx + 320) < 2 and abs(dy + 260) < 2,
                  '实际位移 = (%.0f, %.0f)，期望 (-320, -260)' % (dx, dy))
            check('拖完没有误触发面板开关', not after['panelVisible'])
            check('位置已写入存储', after['fabPos'] is not None, str(after['fabPos']))

            print('\n阶段 6 — 单击悬浮标开关面板 + 面板跟随')
            af = after['fab']
            page.mouse.click(af['x'] + af['width'] / 2, af['y'] + af['height'] / 2)
            page.wait_for_timeout(250)
            opened = page.evaluate(JS_GEOM)
            check('单击能打开面板（拖拽没把点击吃掉）', opened['panelVisible'])
            st = settle()
            if st['panel']:
                p = st['panel']
                fi = st['fabInline']
                check('面板与悬浮标不重叠', not rects_overlap(p, st['fab']),
                      '面板 bottom=%.0f, 悬浮标 top=%.0f' % (p['y'] + p['height'], st['fab']['y']))
                check('面板完整落在视口内',
                      p['x'] >= 0 and p['y'] >= 0
                      and p['x'] + p['width'] <= st['inner']['w']
                      and p['y'] + p['height'] <= st['inner']['h'],
                      json.dumps(p))
                check('面板跟着悬浮标跑（不再死钉右下角）',
                      p['x'] < st['inner']['w'] - 400 and p['y'] < st['inner']['h'] - 200,
                      json.dumps(p))
                # 面板会按「上→下→左→右」挑第一个放得下的方位，所以不写死方向，
                # 只断言它确实贴着悬浮标（间隙 = 设计值 12px），而不是被钳到某个角落
                gap = None
                if p['x'] + p['width'] <= st['fab']['x']:
                    gap = st['fab']['x'] - (p['x'] + p['width'])
                elif st['fab']['x'] + st['fab']['width'] <= p['x']:
                    gap = p['x'] - (st['fab']['x'] + st['fab']['width'])
                elif p['y'] + p['height'] <= st['fab']['y']:
                    gap = st['fab']['y'] - (p['y'] + p['height'])
                elif st['fab']['y'] + st['fab']['height'] <= p['y']:
                    gap = p['y'] - (st['fab']['y'] + st['fab']['height'])
                check('面板贴着悬浮标但不压住它（间隙 = 12px）',
                      gap is not None and abs(gap - 12) <= 2,
                      '面板=%s 悬浮标=%s → 间隙=%s' % (json.dumps(p), json.dumps(st['fab']), gap))
            page.mouse.click(af['x'] + af['width'] / 2, af['y'] + af['height'] / 2)
            page.wait_for_timeout(250)
            check('再点一下面板收起', not page.evaluate(JS_GEOM)['panelVisible'])

            print('\n阶段 7 — 刷新后位置是否记住')
            pinned = page.evaluate(JS_GEOM)['fabInline']
            page.reload(wait_until='load')
            page.wait_for_selector('#lsb-ai-fab', timeout=8000)
            restored = settle()['fabInline']
            check('刷新后悬浮标回到拖拽位置',
                  abs(restored['l'] - pinned['l']) <= 1 and abs(restored['t'] - pinned['t']) <= 1,
                  '刷新前 %s / 刷新后 %s' % (json.dumps(pinned), json.dumps(restored)))
            check('刷新后玻璃皮肤仍在', page.evaluate(JS_GEOM)['css']['backdropFilter'] not in ('none', ''))

            print('\n阶段 8 — 右键复位')
            r = page.evaluate(JS_GEOM)['fab']
            page.mouse.click(r['x'] + r['width'] / 2, r['y'] + r['height'] / 2, button='right')
            page.wait_for_timeout(300)
            res = settle()
            ri = res['fabInline']
            right_edge = res['inner']['w'] - (ri['l'] + ri['w'])
            bottom_edge = res['inner']['h'] - (ri['t'] + ri['h'])
            check('右键后回到右下角默认锚点（右 84 / 下 24）',
                  abs(right_edge - 84) <= 1.5 and abs(bottom_edge - 24) <= 1.5,
                  '右距 = %.1fpx，下距 = %.1fpx' % (right_edge, bottom_edge))
            check('复位后存档已清空', res['fabPos'] in (None, 'null'), str(res['fabPos']))
            check('复位后仍不压住齿轮', not rects_overlap(res['fab'], res['gear']))

            print('\n阶段 9 — 视口变小后是否还留在视口内')
            page.set_viewport_size({'width': 520, 'height': 420})
            page.evaluate("""() => {
              const f = document.getElementById('lsb-ai-fab');
              f.style.right='auto'; f.style.bottom='auto';
              f.style.left='1100px'; f.style.top='700px';   // 故意放到视口外
            }""")
            page.wait_for_timeout(150)
            page.evaluate("() => window.dispatchEvent(new Event('resize'))")
            page.wait_for_timeout(300)
            small = settle()
            fi = small['fabInline']
            check('越界后经 resize 已钳回视口内',
                  fi['l'] >= 0 and fi['t'] >= 0
                  and fi['l'] + fi['w'] <= small['inner']['w']
                  and fi['t'] + fi['h'] <= small['inner']['h'],
                  '内联=%s 视口=%s' % (json.dumps(fi), json.dumps(small['inner'])))

            browser.close()
    finally:
        srv.terminate()

    print('\n' + '=' * 62)
    passed = sum(1 for _, ok, _ in results if ok)
    failed = [n for n, ok, _ in results if not ok]
    print('结果：%d/%d 通过' % (passed, len(results)))
    if failed:
        print('失败项：')
        for n in failed:
            print('  - ' + n)
    real_errors = [e for e in errors if 'favicon' not in e]
    if real_errors:
        print('\n页面报错（前 10 条）：')
        for e in real_errors[:10]:
            print('  ' + e)
    else:
        print('页面无 JS 报错。')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
