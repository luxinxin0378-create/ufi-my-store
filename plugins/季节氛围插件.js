<script>
/* ============================================================
 *  UFI-TOOLS 季节氛围插件  —— 核心层
 *  数据 / 工具 / 日期与场景判定
 * ============================================================ */
(function () {
  'use strict';

  var NAME = 'ufi-season-mood';
  var VER = '1.0.0';
  var STORE_KEY = 'ufi_season_mood_cfg_v1';

  /* ---------------- 内置日历数据（2024-2035） ----------------
   * CAL.l: 农历节日完整日期 {年:{spring:'YYYY-MM-DD',...}}
   * CAL.j: 关键节气 MMDD {年:{立春:'MMDD',...}}；小寒/大寒为次年 1 月
   * 由寿星天文历(sxtwl)离线计算，无需联网
   * -------------------------------------------------------- */
  var CAL = {"l":{"2024":{"spring_eve":"2025-01-28","spring":"2024-02-10","lantern":"2024-02-24","dragonboat":"2024-06-10","qixi":"2024-08-10","midautumn":"2024-09-17","chongyang":"2024-10-11"},"2025":{"spring_eve":"2026-02-16","spring":"2025-01-29","lantern":"2025-02-12","dragonboat":"2025-05-31","qixi":"2025-08-29","midautumn":"2025-10-06","chongyang":"2025-10-29"},"2026":{"spring_eve":"2027-02-05","spring":"2026-02-17","lantern":"2026-03-03","dragonboat":"2026-06-19","qixi":"2026-08-19","midautumn":"2026-09-25","chongyang":"2026-10-18"},"2027":{"spring_eve":"2028-01-25","spring":"2027-02-06","lantern":"2027-02-20","dragonboat":"2027-06-09","qixi":"2027-08-08","midautumn":"2027-09-15","chongyang":"2027-10-08"},"2028":{"spring_eve":"2029-02-12","spring":"2028-01-26","lantern":"2028-02-09","dragonboat":"2028-05-28","qixi":"2028-08-26","midautumn":"2028-10-03","chongyang":"2028-10-26"},"2029":{"spring_eve":"2030-02-02","spring":"2029-02-13","lantern":"2029-02-27","dragonboat":"2029-06-16","qixi":"2029-08-16","midautumn":"2029-09-22","chongyang":"2029-10-16"},"2030":{"spring_eve":"2031-01-22","spring":"2030-02-03","lantern":"2030-02-17","dragonboat":"2030-06-05","qixi":"2030-08-05","midautumn":"2030-09-12","chongyang":"2030-10-05"},"2031":{"spring_eve":"2032-02-10","spring":"2031-01-23","lantern":"2031-02-06","dragonboat":"2031-06-24","qixi":"2031-08-24","midautumn":"2031-10-01","chongyang":"2031-10-24"},"2032":{"spring_eve":"2033-01-30","spring":"2032-02-11","lantern":"2032-02-25","dragonboat":"2032-06-12","qixi":"2032-08-12","midautumn":"2032-09-19","chongyang":"2032-10-12"},"2033":{"spring_eve":"2034-02-18","spring":"2033-01-31","lantern":"2033-02-14","dragonboat":"2033-06-01","qixi":"2033-08-01","midautumn":"2033-09-08","chongyang":"2033-10-01"},"2034":{"spring_eve":"2035-02-07","spring":"2034-02-19","lantern":"2034-03-05","dragonboat":"2034-06-20","qixi":"2034-08-20","midautumn":"2034-09-27","chongyang":"2034-10-20"},"2035":{"spring_eve":"2036-01-27","spring":"2035-02-08","lantern":"2035-02-22","dragonboat":"2035-06-10","qixi":"2035-08-10","midautumn":"2035-09-16","chongyang":"2035-10-09"}},"j":{"2024":{"立春":"0204","清明":"0404","谷雨":"0419","立夏":"0505","夏至":"0621","大暑":"0722","立秋":"0807","白露":"0907","秋分":"0922","霜降":"1023","立冬":"1107","小雪":"1122","大雪":"1206","冬至":"1221","小寒":"0105","大寒":"0120"},"2025":{"立春":"0203","清明":"0404","谷雨":"0420","立夏":"0505","夏至":"0621","大暑":"0722","立秋":"0807","白露":"0907","秋分":"0923","霜降":"1023","立冬":"1107","小雪":"1122","大雪":"1207","冬至":"1221","小寒":"0105","大寒":"0120"},"2026":{"立春":"0204","清明":"0405","谷雨":"0420","立夏":"0505","夏至":"0621","大暑":"0723","立秋":"0807","白露":"0907","秋分":"0923","霜降":"1023","立冬":"1107","小雪":"1122","大雪":"1207","冬至":"1222","小寒":"0105","大寒":"0120"},"2027":{"立春":"0204","清明":"0405","谷雨":"0420","立夏":"0506","夏至":"0621","大暑":"0723","立秋":"0808","白露":"0908","秋分":"0923","霜降":"1023","立冬":"1107","小雪":"1122","大雪":"1207","冬至":"1222","小寒":"0106","大寒":"0120"},"2028":{"立春":"0204","清明":"0404","谷雨":"0419","立夏":"0505","夏至":"0621","大暑":"0722","立秋":"0807","白露":"0907","秋分":"0922","霜降":"1023","立冬":"1107","小雪":"1122","大雪":"1206","冬至":"1221","小寒":"0105","大寒":"0120"},"2029":{"立春":"0203","清明":"0404","谷雨":"0420","立夏":"0505","夏至":"0621","大暑":"0722","立秋":"0807","白露":"0907","秋分":"0923","霜降":"1023","立冬":"1107","小雪":"1122","大雪":"1207","冬至":"1221","小寒":"0105","大寒":"0120"},"2030":{"立春":"0204","清明":"0405","谷雨":"0420","立夏":"0505","夏至":"0621","大暑":"0723","立秋":"0807","白露":"0907","秋分":"0923","霜降":"1023","立冬":"1107","小雪":"1122","大雪":"1207","冬至":"1222","小寒":"0105","大寒":"0120"},"2031":{"立春":"0204","清明":"0405","谷雨":"0420","立夏":"0506","夏至":"0621","大暑":"0723","立秋":"0808","白露":"0908","秋分":"0923","霜降":"1023","立冬":"1107","小雪":"1122","大雪":"1207","冬至":"1222","小寒":"0106","大寒":"0120"},"2032":{"立春":"0204","清明":"0404","谷雨":"0419","立夏":"0505","夏至":"0621","大暑":"0722","立秋":"0807","白露":"0907","秋分":"0922","霜降":"1023","立冬":"1107","小雪":"1122","大雪":"1206","冬至":"1221","小寒":"0105","大寒":"0120"},"2033":{"立春":"0203","清明":"0404","谷雨":"0420","立夏":"0505","夏至":"0621","大暑":"0722","立秋":"0807","白露":"0907","秋分":"0923","霜降":"1023","立冬":"1107","小雪":"1122","大雪":"1207","冬至":"1221","小寒":"0105","大寒":"0120"},"2034":{"立春":"0204","清明":"0405","谷雨":"0420","立夏":"0505","夏至":"0621","大暑":"0723","立秋":"0807","白露":"0907","秋分":"0923","霜降":"1023","立冬":"1107","小雪":"1122","大雪":"1207","冬至":"1222","小寒":"0105","大寒":"0120"},"2035":{"立春":"0204","清明":"0405","谷雨":"0420","立夏":"0505","夏至":"0621","大暑":"0723","立秋":"0807","白露":"0908","秋分":"0923","霜降":"1023","立冬":"1107","小雪":"1122","大雪":"1207","冬至":"1222","小寒":"0106","大寒":"0120"}}};

  var LUNAR_FEST = ['spring_eve', 'spring', 'lantern', 'dragonboat', 'qixi', 'midautumn', 'chongyang'];

  function getYearData(y) { return CAL.l[y] || null; }
  function getJqData(y) { return CAL.j[y] || null; }

  /* ---------- 工具 ---------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function rndInt(a, b) { return Math.floor(rnd(a, b + 1)); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function md(d) { return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }

  /* 一年中的第几天（用于区间比较） */
  function dayOfYear(d) {
    var start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }

  function mmddToDate(y, mmdd) {
    var mm = parseInt(mmdd.substr(0, 2), 10);
    var dd = parseInt(mmdd.substr(2, 2), 10);
    // 月份 < 3 的节气（小寒/大寒）属于次年 1 月
    var yy = mm < 3 ? y + 1 : y;
    return new Date(yy, mm - 1, dd);
  }

  /* 公历固定节日: [月-日, 场景id, 持续天数, 中文名, emoji] */
  var SOLAR_FEST = [
    ['01-01', 'newyear', 1, '元旦', '🎊'],
    ['02-14', 'valentine', 1, '情人节', '💗'],
    ['03-08', 'womensday', 1, '女神节', '🌸'],
    ['04-01', 'fool', 1, '愚人节', '❓'],
    ['05-01', 'labor', 1, '劳动节', '🎉'],
    ['05-20', 'love520', 1, '520', '💗'],
    ['06-01', 'children', 1, '儿童节', '🎈'],
    ['09-10', 'teacher', 1, '教师节', '🌟'],
    ['10-01', 'national', 7, '国庆节', '🇨🇳'],
    ['10-24', 'coder', 1, '程序员节', '👨‍💻'],
    ['10-31', 'halloween', 1, '万圣节', '🎃'],
    ['11-11', 'shopping', 1, '双十一', '📦'],
    ['12-24', 'christmas', 2, '平安夜·圣诞', '🎄'],
    ['12-31', 'newyeareve', 1, '跨年夜', '🎆']
  ];

  /* 农历节日 -> 场景（持续天数） */
  var LUNAR_FEST_MAP = {
    spring_eve: ['springeve', 1, '除夕', '🧨'],
    spring: ['springfest', 7, '春节', '🏮'],
    lantern: ['lantern', 1, '元宵节', '🏮'],
    dragonboat: ['dragonboat', 1, '端午节', '🛶'],
    qixi: ['qixi', 1, '七夕', '💫'],
    midautumn: ['midautumn', 1, '中秋节', '🌕'],
    chongyang: ['chongyang', 1, '重阳节', '🌼']
  };

  /* 节气氛围：节气当天起 3 天内生效（括号内为天数） */
  var JQ_MOOD = {
    '立春': ['sprout', 3, '立春', '🌱'],
    '清明': ['rain', 4, '清明', '☔'],
    '谷雨': ['rain', 3, '谷雨', '🌧️'],
    '立夏': ['fluff', 3, '立夏', '🍃'],
    '夏至': ['sun', 3, '夏至', '🍉'],
    '大暑': ['heat', 3, '大暑', '🔥'],
    '立秋': ['leaf', 3, '立秋', '🍂'],
    '白露': ['dew', 3, '白露', '💧'],
    '秋分': ['leaf', 3, '秋分', '🍁'],
    '霜降': ['frost', 3, '霜降', '❄️'],
    '立冬': ['snow', 3, '立冬', '⛄'],
    '小雪': ['snow', 3, '小雪', '🌨️'],
    '大雪': ['blizzard', 3, '大雪', '❄️'],
    '冬至': ['dumpling', 3, '冬至', '🥟'],
    '小寒': ['blizzard', 3, '小寒', '🧊'],
    '大寒': ['blizzard', 3, '大寒', '🧊']
  };

  var SEASON_NAME = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

  /* ---------------- 场景判定 ---------------- */
  /* 返回 { id, kind:'festival'|'jieqi'|'season', title, icon, season, tip } */
  function resolveScene(now, cfg) {
    var y = now.getFullYear();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1) 生日（最高优先级，用户自定义）
    if (cfg.birthday && cfg.birthday === md(now)) {
      return mkScene('birthday', 'festival', '生日快乐', '🎂', currentSeason(today), '今天是个特别的日子，愿你岁岁平安');
    }

    // 2) 农历节日（查本年 + 上一年，处理跨年除夕）
    var lunarHit = null;
    [y, y - 1].forEach(function (yy) {
      if (lunarHit) return;
      var d = getYearData(yy);
      if (!d) return;
      for (var i = 0; i < LUNAR_FEST.length; i++) {
        var key = LUNAR_FEST[i];
        var dateStr = d[key];
        if (!dateStr) continue;
        var map = LUNAR_FEST_MAP[key];
        var da = dateStr.split('-');
        var start = new Date(+da[0], +da[1] - 1, +da[2]);
        var end = new Date(start.getTime() + (map[1] - 1) * 86400000);
        if (today >= start && today <= end) {
          lunarHit = mkScene(map[0], 'festival', map[2], map[3], currentSeason(today), FEST_TIP[map[0]] || '');
          break;
        }
      }
    });
    if (lunarHit) return lunarHit;

    // 3) 公历节日
    for (var i = 0; i < SOLAR_FEST.length; i++) {
      var f = SOLAR_FEST[i];
      var fm = parseInt(f[0].substr(0, 2), 10) - 1;
      var fd = parseInt(f[0].substr(3, 2), 10);
      var st = new Date(y, fm, fd);
      var en = new Date(st.getTime() + (f[2] - 1) * 86400000);
      if (today >= st && today <= en) {
        return mkScene(f[1], 'festival', f[3], f[4], currentSeason(today), FEST_TIP[f[1]] || '');
      }
    }

    // 4) 节气氛围
    var jqHit = null;
    [y, y - 1].forEach(function (yy) {
      if (jqHit) return;
      var d = getJqData(yy);
      if (!d) return;
      for (var name in d) {
        var mood = JQ_MOOD[name];
        if (!mood) continue;
        var st = mmddToDate(yy, d[name]);
        var en = new Date(st.getTime() + (mood[1] - 1) * 86400000);
        if (today >= st && today <= en) {
          jqHit = mkScene(mood[0], 'jieqi', mood[2], mood[3], SEASON_OF_JQ[name], JQ_TIP[name] || '');
          break;
        }
      }
    });
    if (jqHit) return jqHit;

    // 5) 四季（按立春/立夏/立秋/立冬精确划分）
    var s = currentSeason(today);
    return mkScene(s, 'season', SEASON_NAME[s] + '季', SEASON_ICON[s], s, SEASON_TIP[s]);
  }

  var SEASON_OF_JQ = {
    '立春': 'spring', '清明': 'spring', '谷雨': 'spring', '立夏': 'summer', '夏至': 'summer', '大暑': 'summer',
    '立秋': 'autumn', '白露': 'autumn', '秋分': 'autumn', '霜降': 'autumn', '立冬': 'winter', '小雪': 'winter',
    '大雪': 'winter', '冬至': 'winter', '小寒': 'winter', '大寒': 'winter'
  };
  var SEASON_ICON = { spring: '🌸', summer: '🍃', autumn: '🍂', winter: '❄️' };
  var SEASON_TIP = {
    spring: '春风有信，花开有期',
    summer: '蝉鸣夏日，长风万里',
    autumn: '一叶知秋，岁月沉香',
    winter: '岁末天寒，愿君安康'
  };
  var JQ_TIP = {
    '立春': '东风解冻，万物复苏', '清明': '清明时节雨纷纷', '谷雨': '雨生百谷，润物无声',
    '立夏': '绿树浓阴夏日长', '夏至': '日长之至，蝉鸣荷香', '大暑': '赤日几时过，清风无处寻',
    '立秋': '乳鸦啼散玉屏空，一枕新凉一扇风', '白露': '露从今夜白，月是故乡明', '秋分': '金气秋分，风清露冷',
    '霜降': '霜叶红于二月花', '立冬': '细雨生寒未有霜', '小雪': '花雪随风不厌看', '大雪': '千山鸟飞绝，万径人踪灭',
    '冬至': '冬至大如年，人间小团圆', '小寒': '霜鹰近北首，雏鹊思南飞', '大寒': '旧雪未及消，新雪又拥户'
  };
  var FEST_TIP = {
    newyear: '新年伊始，万象更新', springeve: '辞旧迎新，阖家团圆', springfest: '爆竹声中一岁除，春风送暖入屠苏',
    lantern: '火树银花不夜天', dragonboat: '粽叶飘香，龙舟竞渡', qixi: '金风玉露一相逢，便胜却人间无数',
    midautumn: '但愿人长久，千里共婵娟', chongyang: '遥知兄弟登高处，遍插茱萸少一人',
    national: '山河锦绣，国泰民安', christmas: 'Jingle bells, jingle bells', halloween: '不给糖就捣蛋',
    coder: 'Hello World · 1024', valentine: '愿有岁月可回首', children: '童心未泯，一切皆甜',
    teacher: '桃李满天下，春晖遍四方', labor: '劳动最光荣', newyeareve: '旧岁已展千重锦，新年更进百尺竿',
    shopping: '购物车已满，理智尚存', love520: '今晚的月色真美', womensday: '愿你自在如风', fool: '今天说的话，都别当真',
    birthday: '生日快乐，岁岁年年'
  };

  function mkScene(id, kind, title, icon, season, tip) {
    return { id: id, kind: kind, title: title, icon: icon, season: season, tip: tip };
  }

  /* 由节气表精确判定季节；无数据时按月份兜底 */
  function currentSeason(today) {
    var y = today.getFullYear();
    var d = getJqData(y);
    if (d && d['立春'] && d['立夏'] && d['立秋'] && d['立冬']) {
      var sp = mmddToDate(y, d['立春']);
      var su = mmddToDate(y, d['立夏']);
      var au = mmddToDate(y, d['立秋']);
      var wi = mmddToDate(y, d['立冬']);
      if (today >= wi) return 'winter';
      if (today >= au) return 'autumn';
      if (today >= su) return 'summer';
      if (today >= sp) return 'spring';
      return 'winter';
    }
    var m = today.getMonth() + 1;
    if (m >= 3 && m <= 5) return 'spring';
    if (m >= 6 && m <= 8) return 'summer';
    if (m >= 9 && m <= 11) return 'autumn';
    return 'winter';
  }

  /* ---------------- 下一个节日倒计时 ---------------- */
  function nextFestival(now) {
    var list = [];
    var y = now.getFullYear();
    var today = new Date(y, now.getMonth(), now.getDate());
    [y - 1, y, y + 1].forEach(function (yy) {
      var d = getYearData(yy);
      if (!d) return;
      LUNAR_FEST.forEach(function (key) {
        var dateStr = d[key];
        if (!dateStr) return;
        var map = LUNAR_FEST_MAP[key];
        var da = dateStr.split('-');
        list.push({ date: new Date(+da[0], +da[1] - 1, +da[2]), name: map[2], icon: map[3] });
      });
      SOLAR_FEST.forEach(function (f) {
        list.push({
          date: new Date(yy, parseInt(f[0].substr(0, 2), 10) - 1, parseInt(f[0].substr(3, 2), 10)),
          name: f[3], icon: f[4]
        });
      });
    });
    list.sort(function (a, b) { return a.date - b.date; });
    for (var i = 0; i < list.length; i++) {
      var diff = Math.round((list[i].date - today) / 86400000);
      if (diff > 0) { list[i].days = diff; return list[i]; }
      if (diff === 0) { list[i].days = 0; return list[i]; }
    }
    return null;
  }

  /* ---------------- 昼夜 ---------------- */
  function dayPhase(now) {
    var h = now.getHours();
    if (h >= 6 && h < 17) return 'day';
    if (h >= 17 && h < 19) return 'dusk';
    return 'night';
  }

/* ============================================================
 *  场景定义层
 *  emit: 粒子组；bg: 背景元素；burst: 点击迸发类型
 *  motion: fall 下落 / rise 上升 / drift 游走 / sweep 横掠 / float 漂浮
 * ============================================================ */

  /* ---------- 通用快捷构造 ---------- */
  function E(g, n, o) {
    o = o || {};
    return {
      t: o.t || 'emoji', g: g, n: n,
      motion: o.motion || 'fall',
      size: o.size || [16, 26],
      vy: o.vy || [30, 70],
      vx: o.vx || [-10, 10],
      sway: o.sway || [8, 26],
      spin: o.spin === undefined ? 1 : o.spin,
      alpha: o.alpha || [0.7, 1],
      life: o.life || 0,
      phase: o.phase || null
    };
  }
  function P(t, n, o) {
    o = o || {};
    return {
      t: t, n: n, g: o.g || null,
      motion: o.motion || 'fall',
      size: o.size || [2, 5],
      vy: o.vy || [40, 90],
      vx: o.vx || [-10, 10],
      sway: o.sway || [10, 30],
      alpha: o.alpha || [0.5, 1],
      life: o.life || 0,
      phase: o.phase || null
    };
  }

  var SCENES = {
    /* ---------------- 四季 ---------------- */
    spring: {
      emit: [
        E(['🌸', '🌺', '🌷', '💮'], 26, { motion: 'fall', size: [14, 24], vy: [25, 55], sway: [14, 34], spin: 1.1 }),
        E(['🍃'], 8, { motion: 'fall', size: [12, 20], vy: [30, 60], sway: [18, 40] }),
        P('fluff', 24, { motion: 'float', size: [2, 4], vy: [-6, 14], sway: [6, 16] })
      ],
      burst: 'petal', accent: '#ff9ec4'
    },
    summer: {
      emit: [
        P('sparkle', 16, { motion: 'float', size: [8, 20], vy: [-8, 10], sway: [4, 12] }),
        P('bubble', 10, { motion: 'rise', size: [4, 12], vy: [-18, -40] }),
        E(['🍃'], 6, { motion: 'fall', size: [12, 20], vy: [20, 45] }),
        P('firefly', 22, { motion: 'drift', size: [2, 3.4], phase: 'night' })
      ],
      bg: ['sunbeam'], burst: 'star', accent: '#7fd8ff'
    },
    autumn: {
      emit: [
        E(['🍂', '🍁', '🥀'], 22, { motion: 'fall', size: [16, 30], vy: [35, 85], sway: [20, 50], spin: 1.6 }),
        E(['🌾'], 5, { motion: 'fall', size: [14, 22], vy: [30, 60], sway: [16, 36] })
      ],
      burst: 'leaf', accent: '#e0913a'
    },
    winter: {
      emit: [
        P('snow', 70, { motion: 'fall', size: [1.6, 4], vy: [25, 60], sway: [8, 24] })
      ],
      bg: ['snowground'], burst: 'snow', accent: '#a8d8ff'
    },

    /* ---------------- 节气氛围 ---------------- */
    sprout: {
      emit: [
        E(['🌱', '🌿', '🌸'], 20, { motion: 'fall', size: [14, 24], vy: [22, 50], sway: [12, 30] }),
        P('fluff', 18, { motion: 'float', size: [2, 4], vy: [-4, 12] })
      ], burst: 'petal', accent: '#8fdc8f'
    },
    rain: {
      emit: [
        P('rain', 110, { motion: 'fall', size: [8, 18], vy: [380, 620], vx: [40, 70] }),
        E(['🍃'], 5, { motion: 'fall', size: [12, 20], vy: [40, 70], sway: [14, 30] })
      ],
      bg: ['ripple'], burst: 'ripple', accent: '#6fa8dc'
    },
    fluff: {
      emit: [
        P('fluff', 40, { motion: 'float', size: [2, 5], vy: [-8, 16], sway: [8, 20] }),
        E(['🍃', '🌿'], 8, { motion: 'fall', size: [12, 22], vy: [25, 55] })
      ], bg: ['sunbeam'], burst: 'star', accent: '#b6e36b'
    },
    sun: {
      emit: [
        P('sparkle', 20, { motion: 'float', size: [10, 26], vy: [-6, 8], sway: [4, 10] }),
        E(['🍉', '🍦'], 6, { motion: 'fall', size: [16, 26], vy: [20, 45], sway: [10, 24] })
      ], bg: ['sunbeam'], burst: 'star', accent: '#ffd166'
    },
    heat: {
      emit: [
        P('sparkle', 14, { motion: 'float', size: [12, 28], vy: [-10, 6], alpha: [0.15, 0.4] }),
        E(['🔥', '🍉'], 5, { motion: 'fall', size: [16, 26], vy: [16, 40] })
      ], burst: 'star', accent: '#ff8c42'
    },
    leaf: {
      emit: [
        E(['🍂', '🍁'], 24, { motion: 'fall', size: [16, 30], vy: [35, 90], sway: [22, 55], spin: 1.8 })
      ], burst: 'leaf', accent: '#d98324'
    },
    dew: {
      emit: [
        E(['🍂', '🍁'], 16, { motion: 'fall', size: [16, 28], vy: [30, 70], sway: [18, 42] }),
        P('dew', 20, { motion: 'fall', size: [2, 4], vy: [10, 30], alpha: [0.3, 0.7] })
      ], burst: 'leaf', accent: '#9fc5e8'
    },
    frost: {
      emit: [
        P('frost', 26, { motion: 'fall', size: [3, 7], vy: [12, 34], sway: [8, 20], alpha: [0.35, 0.8] }),
        E(['🍁'], 12, { motion: 'fall', size: [14, 26], vy: [28, 60], sway: [16, 38] })
      ], burst: 'snow', accent: '#cfe9ff'
    },
    snow: {
      emit: [P('snow', 60, { motion: 'fall', size: [1.6, 3.8], vy: [22, 55], sway: [8, 22] })],
      bg: ['snowground'], burst: 'snow', accent: '#bfe3ff'
    },
    blizzard: {
      emit: [
        P('snow', 110, { motion: 'fall', size: [2, 5], vy: [70, 150], sx: 1, sway: [4, 12] })
      ],
      bg: ['snowground'], burst: 'snow', accent: '#d8ecff'
    },
    dumpling: {
      emit: [
        P('snow', 45, { motion: 'fall', size: [1.6, 3.6], vy: [25, 55], sway: [8, 22] }),
        E(['🥟', '🍲'], 8, { motion: 'fall', size: [16, 26], vy: [30, 60], sway: [10, 24] })
      ], bg: ['snowground'], burst: 'dumpling', accent: '#ffe0b2'
    },

    /* ---------------- 传统节日 ---------------- */
    springeve: {
      emit: [
        E(['🧨', '🧧'], 12, { motion: 'fall', size: [16, 26], vy: [35, 75], sway: [10, 26] }),
        E(['🏮'], 6, { motion: 'rise', size: [22, 34], vy: [-18, -34], sway: [10, 24], spin: 0.3 }),
        P('firework', 1, { motion: 'na' })
      ],
      bg: ['lanternrow'], burst: 'firework', accent: '#ff5a4d'
    },
    springfest: {
      emit: [
        E(['🧧', '🧨', '💰'], 10, { motion: 'fall', size: [16, 26], vy: [35, 80], sway: [10, 26] }),
        E(['🏮'], 7, { motion: 'rise', size: [20, 32], vy: [-16, -32], sway: [8, 22], spin: 0.3 }),
        E(['🌸', '🌺'], 10, { motion: 'fall', size: [14, 22], vy: [25, 50], sway: [12, 30] }),
        P('firework', 1, { motion: 'na' })
      ],
      bg: ['lanternrow'], burst: 'firework', accent: '#ff6b5a'
    },
    lantern: {
      emit: [
        E(['🏮', '🎏'], 14, { motion: 'rise', size: [20, 34], vy: [-18, -38], sway: [10, 26], spin: 0.25 }),
        E(['🥣', '🍡'], 5, { motion: 'fall', size: [16, 24], vy: [30, 60], sway: [10, 22] }),
        P('firework', 1, { motion: 'na' })
      ],
      bg: ['lanternrow'], burst: 'firework', accent: '#ffb347'
    },
    dragonboat: {
      emit: [
        E(['🛶', '🐉'], 3, { motion: 'sweep', size: [26, 40], vx: [60, 110] }),
        E(['🎋', '🌿'], 10, { motion: 'fall', size: [14, 24], vy: [30, 60], sway: [12, 28] })
      ],
      bg: ['wave'], burst: 'ripple', accent: '#4caf7d'
    },
    qixi: {
      emit: [
        E(['💗', '💕'], 14, { motion: 'rise', size: [14, 24], vy: [-16, -34], sway: [8, 20] }),
        E(['🐦', '🕊️'], 4, { motion: 'sweep', size: [18, 28], vx: [50, 90] })
      ],
      bg: ['stars', 'magpie'], burst: 'heart', accent: '#c792ea'
    },
    midautumn: {
      emit: [
        E(['🌼', '🌾'], 10, { motion: 'fall', size: [12, 20], vy: [22, 48], sway: [10, 26] }),
        E(['🐰'], 2, { motion: 'drift', size: [22, 32] })
      ],
      bg: ['moon', 'cloud', 'stars'], burst: 'star', accent: '#ffd98a'
    },
    chongyang: {
      emit: [
        E(['🌼', '🍂', '🍁'], 18, { motion: 'fall', size: [14, 26], vy: [30, 70], sway: [16, 38] })
      ], burst: 'leaf', accent: '#e8b64c'
    },

    /* ---------------- 公历 / 洋节 ---------------- */
    newyear: {
      emit: [
        P('confetti', 40, { motion: 'fall', size: [4, 9], vy: [40, 110], sway: [10, 30], spin: 2 }),
        E(['🎊', '🎉'], 8, { motion: 'rise', size: [16, 26], vy: [-20, -40], sway: [10, 22] }),
        P('firework', 1, { motion: 'na' })
      ], burst: 'firework', accent: '#ffd166'
    },
    newyeareve: {
      emit: [
        P('confetti', 34, { motion: 'fall', size: [4, 9], vy: [40, 110], sway: [10, 30], spin: 2 }),
        P('firework', 1, { motion: 'na' })
      ], bg: ['countdown'], burst: 'firework', accent: '#ffd166'
    },
    valentine: {
      emit: [
        E(['💗', '💖', '💝', '💕'], 20, { motion: 'rise', size: [14, 26], vy: [-18, -40], sway: [10, 24] }),
        E(['🌹'], 4, { motion: 'fall', size: [16, 24], vy: [25, 50], sway: [10, 22] })
      ], burst: 'heart', accent: '#ff7eb3'
    },
    love520: {
      emit: [
        E(['💗', '💘', '💞'], 18, { motion: 'rise', size: [14, 26], vy: [-18, -38], sway: [10, 24] })
      ], burst: 'heart', accent: '#ff8fab'
    },
    womensday: {
      emit: [
        E(['🌸', '🌷', '💐'], 20, { motion: 'fall', size: [14, 24], vy: [25, 55], sway: [14, 32] })
      ], burst: 'petal', accent: '#f7a8c4'
    },
    fool: {
      emit: [
        E(['❓', '❗', '😂', '🤪', '🙃'], 18, { motion: 'fall', size: [16, 28], vy: [25, 60], sway: [16, 40], spin: 1.4 })
      ], burst: 'question', accent: '#b39ddb'
    },
    labor: {
      emit: [
        P('confetti', 30, { motion: 'fall', size: [4, 9], vy: [40, 100], sway: [10, 28], spin: 2 }),
        E(['🎉', '⭐'], 6, { motion: 'rise', size: [14, 24], vy: [-18, -34] })
      ], burst: 'confetti', accent: '#ffd54f'
    },
    children: {
      emit: [
        E(['🎈', '🍭', '🧸'], 12, { motion: 'rise', size: [18, 30], vy: [-18, -38], sway: [12, 28], spin: 0.4 }),
        P('bubble', 16, { motion: 'rise', size: [4, 13], vy: [-16, -36] })
      ], burst: 'balloon', accent: '#7fd1ff'
    },
    teacher: {
      emit: [
        E(['🌟', '📚', '✏️', '🌻'], 14, { motion: 'rise', size: [14, 24], vy: [-14, -30], sway: [8, 20] })
      ], burst: 'star', accent: '#ffd97d'
    },
    national: {
      emit: [
        E(['🇨🇳'], 8, { motion: 'fall', size: [18, 28], vy: [30, 60], sway: [10, 24], spin: 0.3 }),
        P('confetti', 26, { motion: 'fall', size: [4, 9], vy: [40, 100], sway: [10, 28], spin: 2 }),
        P('firework', 1, { motion: 'na' })
      ], bg: ['flagrow'], burst: 'firework', accent: '#e5432f'
    },
    coder: {
      emit: [P('code', 0, { motion: 'na' })],
      bg: ['matrix'], burst: 'code', accent: '#39ff88'
    },
    halloween: {
      emit: [
        E(['🎃', '👻'], 8, { motion: 'fall', size: [18, 30], vy: [30, 65], sway: [12, 28] }),
        E(['🦇'], 5, { motion: 'sweep', size: [20, 32], vx: [80, 140] })
      ], burst: 'pumpkin', accent: '#ff8c1a'
    },
    shopping: {
      emit: [
        E(['📦', '💰', '🛍️'], 14, { motion: 'fall', size: [16, 28], vy: [35, 80], sway: [10, 26] })
      ], burst: 'parcel', accent: '#ff7043'
    },
    christmas: {
      emit: [
        P('snow', 55, { motion: 'fall', size: [1.6, 4], vy: [25, 58], sway: [8, 22] }),
        E(['🎄'], 3, { motion: 'drift', size: [24, 38] }),
        E(['🎁', '🦌', '🔔'], 7, { motion: 'fall', size: [16, 28], vy: [30, 65], sway: [10, 26] })
      ], bg: ['snowground'], burst: 'snow', accent: '#7bd389'
    },
    birthday: {
      emit: [
        E(['🎂', '🎁'], 5, { motion: 'drift', size: [24, 36] }),
        E(['🎈'], 10, { motion: 'rise', size: [18, 30], vy: [-18, -36], sway: [12, 28], spin: 0.4 }),
        P('confetti', 32, { motion: 'fall', size: [4, 9], vy: [40, 110], sway: [10, 30], spin: 2 })
      ], burst: 'confetti', accent: '#ffb3d1'
    }
  };

  /* 场景中文名（用于面板列表） */
  var SCENE_LABEL = {
    spring: '🌸 春天', summer: '🍃 夏天', autumn: '🍂 秋天', winter: '❄️ 冬天',
    sprout: '🌱 立春', rain: '☔ 雨纷纷', fluff: '🍃 初夏飞絮', sun: '🍉 夏至', heat: '🔥 大暑',
    leaf: '🍁 落叶', dew: '💧 白露', frost: '❄️ 霜降', snow: '🌨️ 小雪', blizzard: '🧊 暴雪', dumpling: '🥟 冬至',
    springeve: '🧨 除夕', springfest: '🏮 春节', lantern: '🏮 元宵', dragonboat: '🛶 端午',
    qixi: '💫 七夕', midautumn: '🌕 中秋', chongyang: '🌼 重阳',
    newyear: '🎊 元旦', newyeareve: '🎆 跨年夜', valentine: '💗 情人节', love520: '💗 520',
    womensday: '🌸 女神节', fool: '❓ 愚人节', labor: '🎉 劳动节', children: '🎈 儿童节',
    teacher: '🌟 教师节', national: '🇨🇳 国庆', coder: '👨‍💻 1024', halloween: '🎃 万圣节',
    shopping: '📦 双十一', christmas: '🎄 圣诞', birthday: '🎂 生日'
  };

  /* 面板中「手动预览」的场景分组 */
  var SCENE_GROUPS = [
    { name: '四季', list: ['spring', 'summer', 'autumn', 'winter'] },
    { name: '节气', list: ['sprout', 'rain', 'fluff', 'sun', 'heat', 'leaf', 'dew', 'frost', 'snow', 'blizzard', 'dumpling'] },
    { name: '传统节日', list: ['springeve', 'springfest', 'lantern', 'dragonboat', 'qixi', 'midautumn', 'chongyang'] },
    { name: '公历节日', list: ['newyear', 'newyeareve', 'valentine', 'love520', 'womensday', 'fool', 'labor', 'children', 'teacher', 'national', 'coder', 'halloween', 'shopping', 'christmas', 'birthday'] }
  ];

/* ============================================================
 *  渲染层：粒子系统 / 背景元素 / 烟花 / 数字雨
 * ============================================================ */

  var EMOJI_FONT = '"Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji","EmojiOne Color","Android Emoji",sans-serif';

  var cvs, ctx, W = 0, H = 0, DPR = 1;
  var groups = [];        // 粒子组
  var loose = [];         // 临时粒子（点击迸发 / 爆炸）
  var rockets = [];       // 烟花弹
  var ripples = [];       // 雨滴涟漪
  var groundSeg = [];     // 积雪
  var starsArr = [];      // 星空
  var meteors = [];       // 流星
  var cloudsArr = [];     // 云
  var beamsArr = [];      // 光斑
  var auroraT = 0;
  var nextFw = 0;         // 下次烟花时间
  var nextMeteor = 0;
  var GROUND_SEG = 48;
  var GROUND_MAX = 16;
  var sceneStartAt = 0;
  var bgList = [];
  var curAccent = '#ffffff';

  function initCanvas() {
    cvs = document.createElement('canvas');
    cvs.id = 'ufi_season_canvas';
    var st = cvs.style;
    st.position = 'fixed';
    st.left = '0'; st.top = '0';
    st.width = '100%'; st.height = '100%';
    st.pointerEvents = 'none';
    st.zIndex = '2147483000';
    document.body.appendChild(cvs);
    ctx = cvs.getContext('2d');
    resize();
    window.addEventListener('resize', resize, false);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 300); }, false);
  }

  function resize() {
    if (!cvs) return;
    DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    W = window.innerWidth; H = window.innerHeight;
    cvs.width = Math.floor(W * DPR);
    cvs.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildStars();
    buildClouds();
    buildBeams();
  }

  function buildStars() {
    starsArr.length = 0;
    var n = Math.min(90, Math.round(W * H / 14000));
    for (var i = 0; i < n; i++) {
      starsArr.push({
        x: Math.random() * W, y: Math.random() * H * 0.75,
        r: rnd(0.4, 1.3), p: Math.random() * 6.28, s: rnd(0.6, 2.2)
      });
    }
  }
  function buildClouds() {
    cloudsArr.length = 0;
    for (var i = 0; i < 3; i++) {
      cloudsArr.push({ x: Math.random() * W, y: rnd(H * 0.08, H * 0.32), s: rnd(0.6, 1.4), v: rnd(4, 12) });
    }
  }
  function buildBeams() {
    beamsArr.length = 0;
    for (var i = 0; i < 3; i++) {
      beamsArr.push({ x: Math.random() * W, y: Math.random() * H * 0.6, r: rnd(70, 170), v: rnd(6, 16), a: rnd(0.05, 0.12) });
    }
  }

  /* ---------------- 粒子生成 ---------------- */
  function makeParticle(cfg, init) {
    var isFall = cfg.motion === 'fall';
    var isRise = cfg.motion === 'rise';
    var isSweep = cfg.motion === 'sweep';
    var p = {
      type: cfg.t, glyph: cfg.g ? pick(cfg.g) : null,
      size: rnd(cfg.size[0], cfg.size[1]),
      alpha: rnd(cfg.alpha[0], cfg.alpha[1]),
      rot: Math.random() * 6.28, vr: rnd(-1, 1) * (cfg.spin || 0),
      vx: rnd(cfg.vx[0], cfg.vx[1]), vy: rnd(cfg.vy[0], cfg.vy[1]),
      swA: rnd(cfg.sway[0], cfg.sway[1]), swF: rnd(0.6, 1.6), ph: Math.random() * 6.28,
      ang: Math.random() * 6.28, life: 0, maxLife: cfg.life || 0,
      x: 0, y: 0, dir: Math.random() < 0.5 ? -1 : 1, seed: Math.random()
    };
    if (isSweep) {
      p.dir = p.vx >= 0 ? 1 : -1;
      p.vx = Math.abs(p.vx) * (p.dir);
      p.x = p.dir > 0 ? -rnd(40, W * 0.5) : W + rnd(40, W * 0.5);
      p.y = rnd(H * 0.1, H * 0.7);
      p.vy = 0;
    } else if (cfg.motion === 'drift') {
      p.x = Math.random() * W; p.y = Math.random() * H;
      p.vx = rnd(-14, 14); p.vy = rnd(-14, 14);
    } else if (isRise) {
      p.x = Math.random() * W;
      p.y = init ? rnd(-H * 0.2, H * 1.1) : H + rnd(10, 120);
      p.vy = -Math.abs(p.vy);
    } else if (isFall) {
      p.x = Math.random() * W;
      p.y = init ? rnd(-H * 0.3, H) : -rnd(20, H * 0.5);
      p.vy = Math.abs(p.vy);
    } else { // float
      p.x = Math.random() * W; p.y = Math.random() * H;
    }
    return p;
  }

  function buildScene(scene, phase, density) {
    groups = []; loose = []; rockets = []; ripples = [];
    groundSeg = new Array(GROUND_SEG);
    for (var i = 0; i < GROUND_SEG; i++) groundSeg[i] = 0;
    sceneStartAt = Date.now();
    hasFirework = false;
    var def = SCENES[scene.id] || SCENES[scene.season] || SCENES.spring;
    curAccent = def.accent || '#ffffff';

    bgList = (def.bg || []).slice();
    if (phase === 'night' && bgList.indexOf('stars') < 0 && scene.id !== 'coder') bgList.push('stars');
    if (phase === 'night' && scene.season === 'winter' && bgList.indexOf('aurora') < 0) bgList.push('aurora');

    var areaK = clamp((W * H) / (400 * 780), 0.6, 2.2);
    (def.emit || []).forEach(function (cfg) {
      if (cfg.phase && cfg.phase !== phase) return;
      var n = Math.round(cfg.n * density * areaK);
      if (cfg.t === 'code') { bgList.push('matrix'); return; }
      if (cfg.t === 'firework') { nextFw = 0.6; hasFirework = true; return; }
      if (n <= 0) return;
      var arr = [];
      for (var i = 0; i < n; i++) arr.push(makeParticle(cfg, true));
      groups.push({ cfg: cfg, list: arr });
    });
    if (bgList.indexOf('matrix') >= 0) buildMatrix();
  }

  /* ---------------- 更新 ---------------- */
  function update(dt, t) {
    var wind = windX;
    for (var gi = 0; gi < groups.length; gi++) {
      var g = groups[gi], cfg = g.cfg, list = g.list;
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        p.ph += p.swF * dt;
        switch (cfg.motion) {
          case 'fall':
            p.y += p.vy * dt;
            p.x += (p.vx + Math.cos(p.ph) * p.swA + wind * 0.35) * dt;
            p.rot += p.vr * dt;
            if (p.y - p.size > H) {
              onHitBottom(p);
              p.y = -rnd(10, 80); p.x = Math.random() * W;
              if (cfg.t === 'emoji' && cfg.g) p.glyph = pick(cfg.g);
            }
            break;
          case 'rise':
            p.y += p.vy * dt;
            p.x += (p.vx + Math.cos(p.ph) * p.swA + wind * 0.3) * dt;
            p.rot += p.vr * dt;
            if (p.y + p.size < -10) { p.y = H + rnd(10, 100); p.x = Math.random() * W; }
            break;
          case 'sweep':
            p.x += p.vx * dt;
            p.y += Math.sin(p.ph) * 18 * dt * 6;
            if (p.dir > 0 && p.x - p.size > W + 40) { p.x = -rnd(40, 200); p.y = rnd(H * 0.08, H * 0.75); }
            if (p.dir < 0 && p.x + p.size < -40) { p.x = W + rnd(40, 200); p.y = rnd(H * 0.08, H * 0.75); }
            break;
          case 'drift':
            p.ang += rnd(-1, 1) * dt * 2;
            p.x += Math.cos(p.ang) * 16 * dt + wind * dt * 0.2;
            p.y += Math.sin(p.ang) * 12 * dt;
            if (p.x < -30) p.x = W + 20; if (p.x > W + 30) p.x = -20;
            if (p.y < -30) p.y = H + 20; if (p.y > H + 30) p.y = -20;
            break;
          default: // float
            p.y += p.vy * dt;
            p.x += (Math.cos(p.ph) * p.swA * 0.5 + wind * 0.2) * dt;
            if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
            if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
            if (p.x < -20) p.x = W + 10; if (p.x > W + 20) p.x = -10;
        }
        if (p.x < -60) p.x = W + 40;
        if (p.x > W + 60) p.x = -40;
      }
    }

    /* 临时粒子 */
    for (var i = loose.length - 1; i >= 0; i--) {
      var p = loose[i];
      p.life += dt;
      if (p.type === 'ring') {
        p.r += (p.vr || 160) * dt; p.vr *= 0.92;
        if (p.life > p.maxLife) loose.splice(i, 1);
        continue;
      }
      p.px = p.x; p.py = p.y;
      p.vy += (p.g === undefined ? 120 : p.g) * dt;
      p.vx *= 0.985;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.life > p.maxLife || p.y > H + 60) loose.splice(i, 1);
    }

    /* 烟花 */
    if (bgList.indexOf('firework') >= 0 || rockets.length) { }
    if (hasFirework) {
      nextFw -= dt;
      if (nextFw <= 0) {
        launchRocket();
        nextFw = rnd(1.4, 3.4);
      }
    }
    for (var i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i];
      r.y += r.vy * dt; r.x += r.vx * dt; r.vy += 60 * dt;
      if (r.y <= r.ty || r.vy >= -20) { boom(r.x, r.y, r.color); rockets.splice(i, 1); }
    }

    /* 涟漪 */
    for (var i = ripples.length - 1; i >= 0; i--) {
      var rp = ripples[i];
      rp.r += 40 * dt; rp.a -= dt * 1.6;
      if (rp.a <= 0) ripples.splice(i, 1);
    }

    /* 流星 */
    if (bgList.indexOf('stars') >= 0) {
      nextMeteor -= dt;
      if (nextMeteor <= 0 && meteors.length < 2) {
        var mx = rnd(W * 0.1, W * 0.9), my = rnd(0, H * 0.3);
        var ang = rnd(2.4, 2.8);
        meteors.push({ x: mx, y: my, vx: Math.cos(ang) * rnd(320, 520), vy: -Math.sin(ang) * rnd(320, 520), life: 0 });
        nextMeteor = rnd(6, 16);
      }
    }
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i]; m.life += dt;
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.life > 1.4) meteors.splice(i, 1);
    }

    /* 云 & 光斑 */
    for (var i = 0; i < cloudsArr.length; i++) {
      cloudsArr[i].x += cloudsArr[i].v * dt;
      if (cloudsArr[i].x > W + 160) cloudsArr[i].x = -160;
    }
    for (var i = 0; i < beamsArr.length; i++) {
      beamsArr[i].x += beamsArr[i].v * dt;
      if (beamsArr[i].x > W + 200) beamsArr[i].x = -200;
    }
    auroraT += dt * 0.35;

    /* 数字雨 */
    if (matrixCols.length) updateMatrix(dt);
  }

  function onHitBottom(p) {
    if (bgList.indexOf('snowground') >= 0 && (p.type === 'snow' || p.type === 'frost')) {
      var seg = clamp(Math.floor(p.x / W * GROUND_SEG), 0, GROUND_SEG - 1);
      groundSeg[seg] = Math.min(GROUND_MAX, groundSeg[seg] + 0.16);
    }
    if (p.type === 'rain' && ripples.length < 26) {
      ripples.push({ x: p.x, y: H - rnd(0, 6), r: 1, a: 0.55 });
    }
  }

  /* ---------------- 绘制 ---------------- */
  function draw(t, phase) {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < bgList.length; i++) {
      var fn = BG[bgList[i]];
      if (fn) fn(t, phase);
    }
    for (var gi = 0; gi < groups.length; gi++) {
      var g = groups[gi];
      for (var i = 0; i < g.list.length; i++) drawP(g.list[i], t);
    }
    for (var i = 0; i < loose.length; i++) drawP(loose[i], t);
    for (var i = 0; i < rockets.length; i++) {
      var r = rockets[i];
      ctx.fillStyle = r.color;
      ctx.beginPath(); ctx.arc(r.x, r.y, 2, 0, 6.283); ctx.fill();
    }
    /* 涟漪 */
    ctx.lineWidth = 1;
    for (var i = 0; i < ripples.length; i++) {
      var rp = ripples[i];
      ctx.strokeStyle = 'rgba(180,215,255,' + Math.max(0, rp.a) + ')';
      ctx.beginPath(); ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.32, 0, 0, 6.283); ctx.stroke();
    }
    /* 流星 */
    for (var i = 0; i < meteors.length; i++) {
      var m = meteors[i];
      var a = clamp(1 - Math.abs(m.life - 0.5) * 2.2, 0, 1);
      var grd = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 0.12, m.y - m.vy * 0.12);
      grd.addColorStop(0, 'rgba(255,255,255,' + a + ')');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grd; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * 0.12, m.y - m.vy * 0.12); ctx.stroke();
    }
    /* 暗角 */
    drawVignette(phase);
  }

  function drawP(p, t) {
    var a = p.alpha;
    if (p.maxLife) a = p.alpha * clamp(1 - p.life / p.maxLife, 0, 1);
    if (a <= 0.01) return;
    ctx.globalAlpha = a;
    switch (p.type) {
      case 'emoji':
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.font = Math.round(p.size) + 'px ' + EMOJI_FONT;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.glyph, 0, 0);
        ctx.restore();
        break;
      case 'snow':
        ctx.fillStyle = '#ffffff';
        if (p.size > 3) drawFlake(p.x, p.y, p.size, p.rot);
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.283); ctx.fill(); }
        break;
      case 'frost':
        ctx.strokeStyle = 'rgba(220,240,255,0.9)'; ctx.lineWidth = 1;
        drawFlake(p.x, p.y, p.size, p.rot, true);
        break;
      case 'rain':
        ctx.strokeStyle = 'rgba(190,220,255,0.55)';
        ctx.lineWidth = p.size > 13 ? 1.6 : 1.1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        ctx.stroke();
        break;
      case 'fluff':
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.283); ctx.fill();
        break;
      case 'dew':
        ctx.fillStyle = 'rgba(180,220,255,0.85)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * 0.7, p.size, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.arc(p.x - p.size * 0.25, p.y - p.size * 0.3, p.size * 0.22, 0, 6.283); ctx.fill();
        break;
      case 'bubble':
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.283); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.22, 0, 6.283); ctx.fill();
        break;
      case 'sparkle':
        var g2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        g2.addColorStop(0, 'rgba(255,250,220,0.55)');
        g2.addColorStop(1, 'rgba(255,250,220,0)');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.283); ctx.fill();
        break;
      case 'firefly':
        var pulse = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(t * 2 + p.seed * 6.28)), 2);
        var g3 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4.5);
        g3.addColorStop(0, 'rgba(255,255,150,' + (0.9 * pulse) + ')');
        g3.addColorStop(0.4, 'rgba(190,255,120,' + (0.35 * pulse) + ')');
        g3.addColorStop(1, 'rgba(190,255,120,0)');
        ctx.fillStyle = g3;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 4.5, 0, 6.283); ctx.fill();
        break;
      case 'confetti':
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color || (p.glyph || '#ffd166');
        ctx.fillRect(-p.size * 0.5, -p.size * 1.6, p.size, p.size * 3.2);
        ctx.restore();
        break;
      case 'spark':
        ctx.fillStyle = p.color || '#fff';
        ctx.strokeStyle = p.color || '#fff';
        if (p.px !== undefined) {
          ctx.lineWidth = Math.max(1, p.size * 0.8);
          ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.8, p.size * 0.7), 0, 6.283); ctx.fill();
        break;
      case 'ring':
        ctx.strokeStyle = p.color || 'rgba(255,255,255,.85)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.stroke();
        break;
      case 'codechar':
        ctx.font = '13px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(80,255,150,' + clamp(1 - p.life / p.maxLife, 0, 1) + ')';
        ctx.fillText(p.glyph, p.x, p.y);
        break;
      case 'flash':
        var fa = clamp(1 - p.life / p.maxLife, 0, 1);
        var fg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 90);
        fg.addColorStop(0, 'rgba(255,255,255,' + (0.5 * fa) + ')');
        fg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(p.x, p.y, 90, 0, 6.283); ctx.fill();
        break;
      default:
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFlake(x, y, r, rot, stroke) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (stroke) ctx.beginPath();
    for (var i = 0; i < 3; i++) {
      var a = i * Math.PI / 3;
      var dx = Math.cos(a) * r, dy = Math.sin(a) * r;
      if (stroke) { ctx.moveTo(-dx, -dy); ctx.lineTo(dx, dy); }
      else {
        ctx.beginPath(); ctx.moveTo(-dx, -dy); ctx.lineTo(dx, dy); ctx.lineWidth = Math.max(1, r * 0.35); ctx.stroke();
      }
    }
    if (stroke) ctx.stroke();
    ctx.restore();
  }

  function drawVignette(phase) {
    if (vignetteAlpha <= 0) return;
    var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.78);
    var col = phase === 'night' ? '10,18,40' : (phase === 'dusk' ? '60,28,10' : '255,255,255');
    if (phase === 'day') return;
    g.addColorStop(0, 'rgba(' + col + ',0)');
    g.addColorStop(1, 'rgba(' + col + ',' + vignetteAlpha + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  /* ---------------- 背景元素 ---------------- */
  var BG = {
    stars: function (t) {
      for (var i = 0; i < starsArr.length; i++) {
        var s = starsArr[i];
        var a = 0.25 + 0.55 * Math.abs(Math.sin(t * s.s + s.p));
        ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
    },
    aurora: function (t) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var k = 0; k < 3; k++) {
        var base = H * (0.12 + k * 0.06);
        var g = ctx.createLinearGradient(0, base - 60, 0, base + 90);
        var hue = 150 + k * 35;
        g.addColorStop(0, 'hsla(' + hue + ',80%,60%,0)');
        g.addColorStop(0.5, 'hsla(' + hue + ',80%,60%,0.10)');
        g.addColorStop(1, 'hsla(' + hue + ',80%,60%,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, base);
        for (var x = 0; x <= W; x += 24) {
          var y = base + Math.sin(x * 0.006 + auroraT + k) * 22 + Math.sin(x * 0.013 - auroraT * 1.4) * 12;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, base + 120); ctx.lineTo(0, base + 120); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },
    moon: function (t) {
      var mx = W * 0.78, my = H * 0.16, r = Math.min(W, H) * 0.075;
      var g = ctx.createRadialGradient(mx, my, r * 0.6, mx, my, r * 3.4);
      g.addColorStop(0, 'rgba(255,246,214,0.30)');
      g.addColorStop(1, 'rgba(255,246,214,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(mx, my, r * 3.4, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,250,224,0.92)';
      ctx.beginPath(); ctx.arc(mx, my, r, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(226,214,180,0.5)';
      ctx.beginPath(); ctx.arc(mx - r * 0.3, my - r * 0.2, r * 0.22, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + r * 0.28, my + r * 0.25, r * 0.16, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + r * 0.1, my - r * 0.45, r * 0.12, 0, 6.283); ctx.fill();
    },
    cloud: function (t) {
      ctx.fillStyle = 'rgba(230,240,255,0.10)';
      for (var i = 0; i < cloudsArr.length; i++) {
        var c = cloudsArr[i];
        for (var j = 0; j < 4; j++) {
          ctx.beginPath();
          ctx.ellipse(c.x + j * 34 * c.s, c.y + Math.sin(j) * 8, (38 - j * 4) * c.s, 15 * c.s, 0, 0, 6.283);
          ctx.fill();
        }
      }
    },
    sunbeam: function (t) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < beamsArr.length; i++) {
        var b = beamsArr[i];
        var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, 'rgba(255,240,190,' + b.a + ')');
        g.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fill();
      }
      ctx.restore();
    },
    snowground: function () {
      var any = false;
      for (var i = 0; i < GROUND_SEG; i++) if (groundSeg[i] > 0.2) { any = true; break; }
      if (!any) return;
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.beginPath();
      ctx.moveTo(0, H);
      var step = W / (GROUND_SEG - 1);
      for (var i = 0; i < GROUND_SEG; i++) ctx.lineTo(i * step, H - groundSeg[i]);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(210,235,255,0.55)';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (var i = 0; i < GROUND_SEG; i++) ctx.lineTo(i * step, H - groundSeg[i] * 0.55);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    },
    lanternrow: function (t) {
      var n = Math.max(4, Math.floor(W / 110));
      ctx.strokeStyle = 'rgba(255,220,160,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 16);
      for (var x = 0; x <= W; x += 20) ctx.lineTo(x, 16 + Math.sin(x * 0.03) * 6);
      ctx.stroke();
      for (var i = 0; i < n; i++) {
        var x = (i + 0.5) * (W / n);
        var sw = Math.sin(t * 1.2 + i) * 4;
        var y = 26 + Math.sin(x * 0.03) * 6 + Math.abs(sw);
        ctx.save(); ctx.translate(x + sw, y);
        ctx.fillStyle = 'rgba(226,54,44,0.85)';
        ctx.beginPath(); ctx.ellipse(0, 10, 11, 14, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,196,60,0.9)';
        ctx.fillRect(-4, -3, 8, 3); ctx.fillRect(-4, 22, 8, 3);
        ctx.strokeStyle = 'rgba(255,196,60,0.85)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(0, 25); ctx.lineTo(0, 36); ctx.stroke();
        ctx.restore();
      }
    },
    flagrow: function (t) {
      var n = Math.max(6, Math.floor(W / 60));
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 14);
      for (var x = 0; x <= W; x += 20) ctx.lineTo(x, 14 + Math.sin(x * 0.03) * 5);
      ctx.stroke();
      for (var i = 0; i < n; i++) {
        var x = (i + 0.5) * (W / n);
        var y = 16 + Math.sin(x * 0.03) * 5;
        var sw = Math.sin(t * 2 + i * 0.6) * 2;
        ctx.fillStyle = 'rgba(229,67,47,0.85)';
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + 20, y + 4 + sw); ctx.lineTo(x, y + 18);
        ctx.closePath(); ctx.fill();
      }
    },
    magpie: function (t) {
      ctx.strokeStyle = 'rgba(255,235,200,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W * 0.12, H * 0.92);
      ctx.quadraticCurveTo(W * 0.5, H * 0.42, W * 0.88, H * 0.92);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 6;
      ctx.stroke();
    },
    wave: function (t) {
      for (var k = 0; k < 2; k++) {
        ctx.fillStyle = k ? 'rgba(80,190,160,0.10)' : 'rgba(60,160,140,0.14)';
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (var x = 0; x <= W; x += 16) {
          ctx.lineTo(x, H - 26 - k * 12 + Math.sin(x * 0.02 + t * (1 + k) + k) * (6 + k * 3));
        }
        ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      }
    },
    ripple: function () { },
    countdown: function (t) {
      var now = new Date();
      var end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(end.getTime() + 86400000);
      var s = Math.max(0, Math.floor((end - now) / 1000));
      var hh = pad2(Math.floor(s / 3600)), mm = pad2(Math.floor(s % 3600 / 60)), ss = pad2(s % 60);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 15px ' + EMOJI_FONT + ',sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText('🎆 距新年 ' + hh + ':' + mm + ':' + ss, W / 2, 40);
    },
    matrix: function () { drawMatrix(); }
  };

  /* ---------------- 数字雨 ---------------- */
  var matrixCols = [];
  var matrixChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ{}[]()<>/\\|=+-*&^%$#@!日本語';
  function buildMatrix() {
    matrixCols = [];
    var step = 16;
    for (var x = 4; x < W; x += step) {
      matrixCols.push({ x: x, y: rnd(-H, 0), sp: rnd(70, 200), len: rndInt(6, 18) });
    }
  }
  function updateMatrix(dt) {
    for (var i = 0; i < matrixCols.length; i++) {
      var c = matrixCols[i];
      c.y += c.sp * dt;
      if (c.y - c.len * 16 > H) { c.y = rnd(-260, -40); c.sp = rnd(70, 200); c.len = rndInt(6, 18); }
    }
  }
  function drawMatrix() {
    ctx.font = '14px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = 0; i < matrixCols.length; i++) {
      var c = matrixCols[i];
      for (var j = 0; j < c.len; j++) {
        var y = c.y - j * 16;
        if (y < -10 || y > H + 10) continue;
        var a = 1 - j / c.len;
        ctx.fillStyle = j === 0 ? 'rgba(210,255,225,' + a + ')' : 'rgba(60,255,140,' + (a * 0.65) + ')';
        ctx.fillText(matrixChars[(Math.random() * matrixChars.length) | 0], c.x, y);
      }
    }
  }

  /* ---------------- 烟花 ---------------- */
  var hasFirework = false;
  function launchRocket() {
    var tx = rnd(W * 0.15, W * 0.85), ty = rnd(H * 0.15, H * 0.45);
    var hue = rndInt(0, 360);
    rockets.push({
      x: tx + rnd(-20, 20), y: H + 6, ty: ty,
      vx: rnd(-14, 14), vy: -Math.sqrt(2 * 260 * (H - ty)) * rnd(0.75, 0.85),
      color: 'hsl(' + hue + ',90%,65%)'
    });
  }
  function capLoose() {
    if (loose.length > 700) loose.splice(0, loose.length - 700);
  }

  function boom(x, y, color) {
    color = color || ('hsl(' + rndInt(0, 360) + ',90%,65%)');
    var big = perfK > 0.6;
    var n = big ? 52 : 30;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * 6.283 + rnd(-0.12, 0.12);
      var sp = rnd(80, 230) * (big ? 1 : 0.85);
      loose.push({
        type: 'spark', x: x, y: y, px: x, py: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: rnd(1.6, 3.2), g: 110, life: 0, maxLife: rnd(1.0, 1.9),
        alpha: 1, vr: 0, color: i % 6 === 0 ? '#ffffff' : color
      });
    }
    loose.push({ type: 'ring', x: x, y: y, r: 6, vr: 230, life: 0, maxLife: 0.5, alpha: 0.9, color: color });
    loose.push({ type: 'flash', x: x, y: y, size: 0, life: 0, maxLife: 0.28, alpha: 0.6, vx: 0, vy: 0, vr: 0 });
    capLoose();
  }

  /* ---------------- 点击迸发 ---------------- */
  function burst(type, x, y) {
    var def = SCENES[curScene ? curScene.id : 'spring'] || SCENES.spring;
    type = type || def.burst || 'star';
    // 特殊类型：整段效果，不进入逐粒子循环
    if (type === 'firework') { boom(x, clamp(y, H * 0.08, H * 0.62), 'hsl(' + rndInt(0, 360) + ',90%,65%)'); return; }
    if (type === 'ripple') { ripples.push({ x: x, y: y, r: 2, a: 0.7 }); return; }
    if (type === 'code') {
      for (var k = 0; k < 12; k++) {
        loose.push({
          type: 'codechar', x: x + rnd(-34, 34), y: y + rnd(-12, 12),
          vx: rnd(-24, 24), vy: rnd(50, 130), size: 13, life: 0, maxLife: 0.95, alpha: 1, vr: 0,
          glyph: matrixChars[(Math.random() * matrixChars.length) | 0]
        });
      }
      loose.push({ type: 'ring', x: x, y: y, r: 4, vr: 150, life: 0, maxLife: 0.4, alpha: 0.7, color: '#39ff88' });
      capLoose();
      return;
    }
    var n = Math.max(8, Math.round((perfK > 0.6 ? 20 : 12) * (cfg.density || 1)));
    for (var i = 0; i < n; i++) {
      var a = (i / n) * 6.283 + rnd(-0.2, 0.2);
      var sp = rnd(55, 200);
      var p = {
        type: 'spark', x: x, y: y, px: x, py: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
        size: rnd(1.6, 3), g: 130, life: 0, maxLife: rnd(0.5, 1.1), alpha: 1, vr: 0
      };
      switch (type) {
        case 'petal': p.type = 'emoji'; p.glyph = pick(['🌸', '🌺', '💮']); p.size = rnd(14, 22); p.vy -= 30; p.vr = rnd(-3, 3); break;
        case 'leaf': p.type = 'emoji'; p.glyph = pick(['🍂', '🍁']); p.size = rnd(16, 26); p.vr = rnd(-4, 4); break;
        case 'snow': p.type = 'snow'; p.size = rnd(2, 4.5); p.vy *= 0.6; p.g = 60; break;
        case 'heart': p.type = 'emoji'; p.glyph = pick(['💗', '💖', '💕']); p.size = rnd(14, 22); p.g = -20; break;
        case 'star': p.color = 'rgba(255,240,180,1)'; p.size = rnd(1.6, 3); break;
        case 'confetti': p.type = 'confetti'; p.color = pick(['#ffd166', '#ef476f', '#06d6a0', '#4cc9f0', '#f78c6b']); p.size = rnd(3, 6); p.vr = rnd(-8, 8); break;
        case 'question': p.type = 'emoji'; p.glyph = pick(['❓', '❗', '😂']); p.size = rnd(16, 26); p.vr = rnd(-3, 3); break;
        case 'balloon': p.type = 'emoji'; p.glyph = pick(['🎈', '🍭']); p.size = rnd(18, 26); p.g = -30; break;
        case 'pumpkin': p.type = 'emoji'; p.glyph = pick(['🎃', '👻']); p.size = rnd(18, 28); break;
        case 'parcel': p.type = 'emoji'; p.glyph = pick(['📦', '💰']); p.size = rnd(16, 26); break;
        case 'dumpling': p.type = 'emoji'; p.glyph = '🥟'; p.size = rnd(16, 24); break;
        default: p.color = curAccent;
      }
      loose.push(p);
    }
    loose.push({ type: 'ring', x: x, y: y, r: 3, vr: 130, life: 0, maxLife: 0.35, alpha: 0.55, color: curAccent });
    capLoose();
  }

/* ============================================================
 *  UI 层：角落挂件 + 控制面板
 * ============================================================ */

  var widget, pill, panel, panelOpen = false, dragState = null, lpTimer = null;
  var uiPos = null;
  var SNAP_MARGIN = 8;
  var liveBd = null;   // 生日输入框的「未提交」临时内容，跨面板重建保留

  function injectStyle() {
    var s = document.createElement('style');
    s.textContent = [
      '#ufi_season_widget{position:fixed;z-index:2147483400;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none;}',
      '#ufi_season_widget *{box-sizing:border-box;}',
      '#ufi_season_widget.ufs-dragging{transition:none !important;}',
      '.ufs-pill.ufs-dragging{transform:scale(1.08);box-shadow:0 8px 26px rgba(0,0,0,.4);cursor:grabbing;}',
      '.ufs-pill.ufs-snapping{transition:left .22s cubic-bezier(.22,.61,.36,1),top .22s cubic-bezier(.22,.61,.36,1);}',
      '.ufs-pill.ufs-grabhint{animation:ufsgrab .9s ease-in-out infinite;}',
      '@keyframes ufsgrab{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}',
      '.ufs-pill{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:22px;',
      'background:rgba(28,32,48,.62);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
      'color:#fff;font-size:12px;line-height:1.2;box-shadow:0 4px 16px rgba(0,0,0,.25);',
      'border:1px solid rgba(255,255,255,.14);cursor:pointer;transition:transform .16s,opacity .2s;white-space:nowrap;}',
      '.ufs-pill:active{transform:scale(.94);}',
      '.ufs-dot{width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.35);',
      'box-shadow:0 0 0 1px rgba(0,0,0,.12);cursor:pointer;}',
      '.ufs-panel{position:absolute;width:262px;max-width:min(280px,calc(100vw - 28px));max-height:min(64vh,calc(100vh - 28px));overflow-y:auto;',
      'background:rgba(24,27,42,.90);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);',
      'border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:12px;color:#eaeaf2;',
      'font-size:12px;box-shadow:0 12px 40px rgba(0,0,0,.4);animation:ufsfade .18s ease;touch-action:pan-y;}',
      '.ufs-bd-row{display:flex;gap:6px;align-items:center;}',
      '.ufs-bd-row .ufs-inp{flex:1;min-width:0;}',
      '.ufs-savebd{flex:0 0 auto;padding:6px 12px;border-radius:9px;background:linear-gradient(135deg,#6ea8fe,#a06bff);border-color:transparent;color:#fff;font-weight:600;}',
      '.ufs-savebd:active{transform:scale(.95);}',
      '.ufs-bd-hint{margin-top:5px;font-size:11px;line-height:1.5;opacity:.7;}',
      '.ufs-bd-hint.ufs-ok{color:#7ee787;opacity:.95;}',
      '.ufs-bd-hint.ufs-err{color:#ff9b9b;opacity:.95;}',
      '@keyframes ufsfade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
      '.ufs-hd{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;margin-bottom:2px;}',
      '.ufs-tip{opacity:.72;font-size:11px;line-height:1.5;margin:4px 0 10px;}',
      '.ufs-row{margin:9px 0;}',
      '.ufs-lb{opacity:.6;font-size:11px;margin-bottom:5px;}',
      '.ufs-btns{display:flex;flex-wrap:wrap;gap:5px;}',
      '.ufs-b{padding:5px 9px;border-radius:9px;border:1px solid rgba(255,255,255,.14);',
      'background:rgba(255,255,255,.06);color:#e6e6f0;font-size:11px;cursor:pointer;transition:.15s;}',
      '.ufs-b:hover{background:rgba(255,255,255,.14);}',
      '.ufs-b.on{background:linear-gradient(135deg,#6ea8fe,#a06bff);border-color:transparent;color:#fff;font-weight:600;}',
      '.ufs-chips{max-height:132px;overflow-y:auto;padding-right:2px;}',
      '.ufs-inp{width:100%;padding:6px 8px;border-radius:9px;border:1px solid rgba(255,255,255,.16);',
      'background:rgba(255,255,255,.07);color:#fff;font-size:12px;outline:none;}',
      '.ufs-ft{margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.1);',
      'display:flex;justify-content:space-between;align-items:center;opacity:.55;font-size:10px;}',
      '.ufs-tip-box{margin-top:8px;padding:7px 9px;border-radius:10px;background:rgba(255,255,255,.06);',
      'font-size:11px;line-height:1.55;opacity:.85;}',
      '.ufs-welcome{position:fixed;right:14px;bottom:64px;z-index:2147483500;background:rgba(30,34,52,.92);',
      'color:#fff;padding:9px 13px;border-radius:12px;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,.3);',
      'animation:ufsfade .3s ease;pointer-events:none;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;}'
    ].join('');
    document.head.appendChild(s);
  }

  /* 判断事件目标是否落在控制面板内部 */
  function inPanel(t) {
    while (t && t !== widget) {
      if (t.classList && t.classList.contains('ufs-panel')) return true;
      t = t.parentNode;
    }
    return false;
  }

  /* 宽松解析生日：接受 8-15 / 08/15 / 8.15 / 8月15 等，统一成 MM-DD；非法返回 null */
  function normalizeBd(v) {
    if (!v) return '';
    v = v.replace(/[年月日\s]/g, '').replace(/[./]/g, '-');
    var m = v.match(/^(\d{1,2})-(\d{1,2})$/);
    if (!m) return null;
    var mm = parseInt(m[1], 10), dd = parseInt(m[2], 10);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return (mm < 10 ? '0' + mm : '' + mm) + '-' + (dd < 10 ? '0' + dd : '' + dd);
  }

  /* 提交生日：校验 -> 保存 -> 刷新场景；非法给提示，空则清空 */
  function saveBirthday() {
    var bd = document.getElementById('ufs_bd');
    var hint = document.getElementById('ufs_bd_hint');
    if (!bd) return;
    var raw = bd.value.trim();
    var norm = normalizeBd(raw);
    if (norm) {
      cfg.birthday = norm; liveBd = norm; saveCfg(); applyCfg();
      if (hint) { hint.textContent = '已设置：' + norm; hint.className = 'ufs-bd-hint ufs-ok'; hint.style.display = ''; }
    } else if (!raw) {
      cfg.birthday = ''; liveBd = ''; saveCfg(); applyCfg();
      if (hint) hint.style.display = 'none';
    } else {
      if (hint) { hint.textContent = '格式不对，请按 MM-DD（如 08-15）'; hint.className = 'ufs-bd-hint ufs-err'; hint.style.display = ''; }
    }
  }

  function buildWidget() {
    widget = document.createElement('div');
    widget.id = 'ufi_season_widget';
    document.body.appendChild(widget);
    applyPos();
    renderWidget();

    widget.addEventListener('pointerdown', function (e) {
      // 点在控制面板内部（按钮/输入框/空白/滑动）都不触发胶囊拖拽，交给面板自身处理
      if (inPanel(e.target)) return;
      if (e.target.classList && e.target.classList.contains('ufs-b')) return;
      if (e.target.tagName === 'INPUT') return;
      try { e.preventDefault(); } catch (err) { }
      dragState = { sx: e.clientX, sy: e.clientY, ox: uiPos.x, oy: uiPos.y, moved: false, dragging: false };
      widget.setPointerCapture && widget.setPointerCapture(e.pointerId);
      // 轻微抖动提示「可按住拖动」
      var p = widget.querySelector('.ufs-pill');
      if (p && !cfg.mini) p.classList.add('ufs-grabhint');
      // 长按进入拖拽态：避免轻点误触
      lpTimer = setTimeout(function () {
        if (!dragState) return;
        dragState.dragging = true;
        closePanel();
        var pp = widget.querySelector('.ufs-pill');
        if (pp) { pp.classList.remove('ufs-grabhint'); pp.classList.add('ufs-dragging'); }
      }, 300);
    });
    widget.addEventListener('pointermove', function (e) {
      if (!dragState) return;
      var dx = e.clientX - dragState.sx, dy = e.clientY - dragState.sy;
      if (Math.abs(dx) + Math.abs(dy) > 12) dragState.moved = true;
      // 快速拖动也立即进入拖拽态
      if (dragState.moved && !dragState.dragging) {
        dragState.dragging = true;
        closePanel();
        clearTimeout(lpTimer);
        var pp = widget.querySelector('.ufs-pill');
        if (pp) { pp.classList.remove('ufs-grabhint'); pp.classList.add('ufs-dragging'); }
      }
      if (dragState.dragging) {
        uiPos.x = dragState.ox + dx; uiPos.y = dragState.oy + dy;
        applyPos();
      }
    });
    widget.addEventListener('pointerup', function () {
      if (!dragState) return;
      clearTimeout(lpTimer);
      var wasDragging = dragState.dragging, moved = dragState.moved;
      var p = widget.querySelector('.ufs-pill');
      if (p) p.classList.remove('ufs-dragging', 'ufs-grabhint', 'ufs-snapping');
      dragState = null;
      if (wasDragging) {
        if (moved) snapToEdge();
        saveCfg();
        return;
      }
      // 视作点击
      if (cfg.mini) { cfg.mini = false; saveCfg(); renderWidget(); return; }
      togglePanel();
    });
    widget.addEventListener('pointercancel', function () {
      clearTimeout(lpTimer);
      var p = widget.querySelector('.ufs-pill');
      if (p) p.classList.remove('ufs-dragging', 'ufs-grabhint', 'ufs-snapping');
      dragState = null;
    });

    window.addEventListener('resize', function () {
      applyPos();
      if (panelOpen) positionPanel();
    });
  }

  function applyPos() {
    var w = widget ? (widget.offsetWidth || 60) : 60;
    var h = widget ? (widget.offsetHeight || 32) : 32;
    uiPos.x = clamp(uiPos.x, 6, Math.max(6, window.innerWidth - w - 6));
    uiPos.y = clamp(uiPos.y, 6, Math.max(6, window.innerHeight - h - 6));
    widget.style.left = uiPos.x + 'px';
    widget.style.top = uiPos.y + 'px';
  }

  /* 松手后按开关把胶囊吸附到最近的边（左右吸附 x，上下吸附 y） */
  function snapToEdge() {
    if (!cfg.snap) return;
    var w = widget.offsetWidth || 60, h = widget.offsetHeight || 32;
    var W = window.innerWidth, H = window.innerHeight, M = SNAP_MARGIN;
    var leftX = M, rightX = Math.max(M, W - w - M);
    var topY = M, bottomY = Math.max(M, H - h - M);
    uiPos.x = (uiPos.x - leftX) <= (rightX - uiPos.x) ? leftX : rightX;
    uiPos.y = (uiPos.y - topY) <= (bottomY - uiPos.y) ? topY : bottomY;
    applyPos();
    var p = widget.querySelector('.ufs-pill');
    if (p) {
      p.classList.add('ufs-snapping');
      setTimeout(function () { p && p.classList.remove('ufs-snapping'); }, 260);
    }
  }

  function renderWidget() {
    if (!widget) return;
    if (cfg.mini) {
      widget.innerHTML = '<div class="ufs-dot" title="季节氛围"></div>';
      return;
    }
    var s = curScene || {};
    var nf = nextFest;
    var sub = nf ? (nf.days === 0 ? '今天 ' + nf.name : '距' + nf.name + ' ' + nf.days + '天') : '';
    widget.innerHTML =
      '<div class="ufs-pill"><span style="font-size:15px">' + (s.icon || '🍃') + '</span>' +
      '<span>' + (s.title || '') + '</span>' +
      (sub ? '<span style="opacity:.6;font-size:11px">· ' + sub + '</span>' : '') + '</div>' +
      (panelOpen ? panelHTML() : '');
    if (panelOpen) { bindPanel(); positionPanel(); }
  }

  function togglePanel() {
    panelOpen = !panelOpen;
    renderWidget();
  }

  /* 收起面板（拖动胶囊时） */
  function closePanel() {
    if (!panelOpen) return;
    panelOpen = false;
    var p = document.getElementById('ufs_panel');
    if (p && p.parentNode) p.parentNode.removeChild(p);
  }

  function panelHTML() {
    var s = curScene || {};
    var modeBtn = function (v, label) { return '<div class="ufs-b ' + (cfg.mode === v ? 'on' : '') + '" data-mode="' + v + '">' + label + '</div>'; };
    var denBtn = function (v, label) { return '<div class="ufs-b ' + (cfg.density === v ? 'on' : '') + '" data-den="' + v + '">' + label + '</div>'; };
    var phBtn = function (v, label) { return '<div class="ufs-b ' + (cfg.phase === v ? 'on' : '') + '" data-ph="' + v + '">' + label + '</div>'; };

    var chips = '';
    SCENE_GROUPS.forEach(function (g) {
      chips += '<div class="ufs-lb" style="margin-top:7px">' + g.name + '</div><div class="ufs-btns">';
      g.list.forEach(function (id) {
        chips += '<div class="ufs-b ' + (cfg.mode === 'manual' && cfg.scene === id ? 'on' : '') + '" data-scene="' + id + '">' +
          (SCENE_LABEL[id] || id) + '</div>';
      });
      chips += '</div>';
    });

    var now = new Date();
    return '<div class="ufs-panel" id="ufs_panel">' +
      '<div class="ufs-hd"><span style="font-size:19px">' + (s.icon || '') + '</span><span>' + (s.title || '') + '</span></div>' +
      '<div class="ufs-tip">' + (s.tip || '') + '</div>' +
      '<div class="ufs-row"><div class="ufs-lb">跟随</div><div class="ufs-btns">' +
      modeBtn('auto', '自动（按日期）') + modeBtn('manual', '手动指定') + '</div></div>' +
      (cfg.mode === 'manual' ? '<div class="ufs-row"><div class="ufs-lb">选择场景</div><div class="ufs-chips">' + chips + '</div></div>' : '') +
      '<div class="ufs-row"><div class="ufs-lb">特效强度</div><div class="ufs-btns">' +
      denBtn(0, '关闭') + denBtn(0.5, '弱') + denBtn(1, '中') + denBtn(1.7, '强') + '</div></div>' +
      '<div class="ufs-row"><div class="ufs-lb">时段</div><div class="ufs-btns">' +
      phBtn('auto', '自动') + phBtn('day', '白天') + phBtn('dusk', '黄昏') + phBtn('night', '夜晚') + '</div></div>' +
      '<div class="ufs-row"><div class="ufs-lb">靠边吸附</div><div class="ufs-btns">' +
      '<div class="ufs-b ' + (cfg.snap ? 'on' : '') + '" data-snap="1">开</div>' +
      '<div class="ufs-b ' + (cfg.snap ? '' : 'on') + '" data-snap="0">关</div></div></div>' +
      '<div class="ufs-row"><div class="ufs-lb">生日（选填，当天自动放蛋糕）</div>' +
      '<div class="ufs-bd-row">' +
      '<input class="ufs-inp" id="ufs_bd" placeholder="MM-DD，如 08-15" value="' + (liveBd !== null ? liveBd : (cfg.birthday || '')) + '">' +
      '<div class="ufs-b ufs-savebd" id="ufs_savebd" data-act="savebd">保存</div></div>' +
      '<div class="ufs-bd-hint ' + (cfg.birthday ? 'ufs-ok' : '') + '"' + (cfg.birthday ? '' : ' style="display:none"') + ' id="ufs_bd_hint">' +
      (cfg.birthday ? '已设置：' + cfg.birthday : '') + '</div></div>' +
      '<div class="ufs-tip-box">👆 点击页面任意处会有惊喜；长按不放来一场「暴走」<br>📌 长按胶囊可拖动，松手自动吸附到最近的边</div>' +
      '<div class="ufs-row"><div class="ufs-btns">' +
      '<div class="ufs-b" data-act="mini">隐藏为小点</div>' +
      '<div class="ufs-b" data-act="reset">恢复默认</div></div></div>' +
      '<div class="ufs-ft"><span>季节氛围 v' + VER + '</span><span>' + (now.getMonth() + 1) + '月' + now.getDate() + '日</span></div>' +
      '</div>';
  }

  /* 根据胶囊位置和视口大小，把面板放到不溢出的一边 */
  function positionPanel() {
    var p = document.getElementById('ufs_panel');
    if (!p || !widget) return;
    var r = widget.getBoundingClientRect();
    var W = window.innerWidth, H = window.innerHeight, m = 8;
    var spaceR = Math.max(0, W - r.right - m);
    var spaceL = Math.max(0, r.left - m);
    var spaceB = Math.max(0, H - r.bottom - m);
    var spaceA = Math.max(0, r.top - m);

    var openRight = spaceR >= spaceL;   // 默认向右展开
    var openBelow = spaceB >= spaceA;   // 默认向下展开

    // 先让面板按 CSS 宽度渲染，再读实际尺寸
    p.style.width = '';
    p.style.maxWidth = Math.min(280, Math.max(210, openRight ? spaceR : spaceL)) + 'px';
    p.style.maxHeight = Math.min(460, Math.max(160, openBelow ? spaceB : spaceA)) + 'px';

    p.style.left = 'auto'; p.style.right = 'auto';
    p.style.top = 'auto'; p.style.bottom = 'auto';

    if (openRight) p.style.left = '0';
    else p.style.right = '0';
    if (openBelow) p.style.top = (r.height + 8) + 'px';
    else p.style.bottom = (r.height + 8) + 'px';
  }

  function bindPanel() {
    var el = document.getElementById('ufs_panel');
    if (!el) return;
    el.addEventListener('click', function (e) {
      var t = e.target;
      if (!t.classList || !t.classList.contains('ufs-b')) return;
      if (t.dataset.act === 'savebd') return; // 保存按钮单独绑定，走 saveBirthday
      if (t.dataset.mode) { cfg.mode = t.dataset.mode; if (cfg.mode === 'manual' && !cfg.scene) cfg.scene = curScene.id; }
      else if (t.dataset.scene) { cfg.scene = t.dataset.scene; cfg.mode = 'manual'; }
      else if (t.dataset.den) cfg.density = parseFloat(t.dataset.den);
      else if (t.dataset.ph) cfg.phase = t.dataset.ph;
      else if (t.dataset.snap !== undefined) { cfg.snap = t.dataset.snap === '1'; }
      else if (t.dataset.act === 'mini') { cfg.mini = true; panelOpen = false; }
      else if (t.dataset.act === 'reset') { resetCfg(); liveBd = null; }
      saveCfg(); applyCfg(); renderWidget();
    });
    var bd = document.getElementById('ufs_bd');
    if (bd) {
      // 实时同步，保证跨面板重建后输入内容不丢
      bd.addEventListener('input', function () { liveBd = bd.value; });
      // 失焦时校验并自动保存（合法即写入），但不重建面板以免打断「保存」点击
      bd.addEventListener('blur', function () {
        liveBd = bd.value;
        var norm = normalizeBd(bd.value.trim());
        if (norm) {
          cfg.birthday = norm; liveBd = norm; saveCfg();
          var hint = document.getElementById('ufs_bd_hint');
          if (hint) { hint.textContent = '已设置：' + norm; hint.className = 'ufs-bd-hint ufs-ok'; hint.style.display = ''; }
        } else if (bd.value.trim()) {
          var hint2 = document.getElementById('ufs_bd_hint');
          if (hint2) { hint2.textContent = '格式不对，请按 MM-DD（如 08-15）'; hint2.className = 'ufs-bd-hint ufs-err'; hint2.style.display = ''; }
        }
      });
      bd.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    }
    // 「保存」按钮直接绑定，避免被面板重建影响
    var sb = document.getElementById('ufs_savebd');
    if (sb) sb.addEventListener('click', saveBirthday);
  }

  function showWelcome() {
    if (cfg.welcomed) return;
    var d = document.createElement('div');
    d.className = 'ufs-welcome';
    d.innerHTML = '🎉 季节氛围插件已启用，点这个胶囊可以切换场景';
    document.body.appendChild(d);
    setTimeout(function () { d.style.transition = 'opacity .6s'; d.style.opacity = '0'; }, 4200);
    setTimeout(function () { d.parentNode && d.parentNode.removeChild(d); }, 5000);
    cfg.welcomed = true; saveCfg();
  }

/* ============================================================
 *  主控层：配置 / 循环 / 交互 / 启动
 * ============================================================ */

  var DEFAULT_CFG = {
    mode: 'auto',      // auto | manual
    scene: null,       // 手动场景 id
    density: 1,        // 0 / 0.5 / 1 / 1.7
    phase: 'auto',     // auto | day | dusk | night
    birthday: '',
    mini: false,
    welcomed: false,
    snap: true,
    x: null, y: null
  };
  var cfg = {};
  var curScene = null, nextFest = null, curPhase = 'day';
  var perfK = 1, windX = 0, vignetteAlpha = 0.12;
  var raf = null, lastT = 0, fpsAcc = 0, fpsCnt = 0, lastCheck = 0;
  var raging = false, rageTimer = null, downAt = 0, downPt = null;
  var lastDateKey = '';

  var MANUAL_SEASON = {
    spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter',
    sprout: 'spring', rain: 'spring', fluff: 'summer', sun: 'summer', heat: 'summer',
    leaf: 'autumn', dew: 'autumn', frost: 'winter', snow: 'winter', blizzard: 'winter', dumpling: 'winter'
  };

  function loadCfg() {
    cfg = {};
    for (var k in DEFAULT_CFG) cfg[k] = DEFAULT_CFG[k];
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        for (var k2 in o) if (k2 in cfg) cfg[k2] = o[k2];
      }
    } catch (e) { }
    uiPos = {
      x: cfg.x === null ? window.innerWidth - 130 : cfg.x,
      y: cfg.y === null ? window.innerHeight - 96 : cfg.y
    };
  }
  function saveCfg() {
    cfg.x = Math.round(uiPos.x); cfg.y = Math.round(uiPos.y);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cfg)); } catch (e) { }
  }
  function resetCfg() {
    var w = cfg.welcomed;
    cfg = {}; for (var k in DEFAULT_CFG) cfg[k] = DEFAULT_CFG[k];
    cfg.welcomed = w;
    uiPos = { x: window.innerWidth - 130, y: window.innerHeight - 96 };
    panelOpen = false;
    applyPos();
  }

  /* 计算当前应展示的场景与时段 */
  function applyCfg() {
    var now = new Date();
    if (cfg.mode === 'manual' && cfg.scene) {
      var lb = (SCENE_LABEL[cfg.scene] || cfg.scene).split(' ');
      var icon = lb.shift();
      var title = lb.join(' ') || cfg.scene;
      var season = MANUAL_SEASON[cfg.scene] || currentSeason(now);
      curScene = mkScene(cfg.scene, 'manual', title, icon, season, FEST_TIP[cfg.scene] || '手动预览中');
    } else {
      curScene = resolveScene(now, cfg);
    }
    curPhase = cfg.phase === 'auto' ? dayPhase(now) : cfg.phase;
    nextFest = nextFestival(now);
    vignetteAlpha = curPhase === 'night' ? 0.16 : (curPhase === 'dusk' ? 0.1 : 0);
    hasFirework = false;

    if (cfg.density <= 0) {
      groups = []; loose = []; rockets = []; matrixCols = [];
      ctx && ctx.clearRect(0, 0, W, H);
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    } else {
      buildScene(curScene, curPhase, cfg.density * perfK);
      if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(loop); }
    }
    renderWidget();
  }

  /* ---------------- 主循环 ---------------- */
  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = (now - lastT) / 1000;
    lastT = now;
    if (dt > 0.08) dt = 0.08;
    var t = now / 1000;

    update(dt, t);
    draw(t, curPhase);

    /* 风场衰减 */
    windX *= Math.pow(0.02, dt);
    if (Math.abs(windX) < 0.5) windX = 0;

    /* 帧率监控 -> 自动降载 */
    fpsAcc += dt; fpsCnt++;
    if (fpsAcc >= 1.6) {
      var fps = fpsCnt / fpsAcc;
      fpsAcc = 0; fpsCnt = 0;
      if (fps < 34 && perfK > 0.42) {
        perfK = Math.max(0.42, perfK - 0.18);
        buildScene(curScene, curPhase, cfg.density * perfK);
      } else if (fps > 55 && perfK < 1) {
        perfK = Math.min(1, perfK + 0.12);
        buildScene(curScene, curPhase, cfg.density * perfK);
      }
    }

    /* 每 20s 校准一次日期 / 时段（跨天、跨点自动切换） */
    if (now - lastCheck > 20000) {
      lastCheck = now;
      var n2 = new Date();
      var key = md(n2) + '-' + (cfg.phase === 'auto' ? dayPhase(n2) : cfg.phase);
      if (key !== lastDateKey) { lastDateKey = key; applyCfg(); }
    }
  }

  function start() { if (!raf && cfg.density > 0) { lastT = performance.now(); raf = requestAnimationFrame(loop); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  /* ---------------- 交互 ---------------- */
  function bindInteract() {
    var moveAccum = 0, scrolled = false;

    /* 取消「暴走」：清定时器 + 停喷发 */
    function cancelRage() {
      if (rageTimer) { clearTimeout(rageTimer); rageTimer = null; }
      if (raging) { raging = false; windX = 0; }
      scrolled = true;
    }

    document.addEventListener('pointerdown', function (e) {
      if (widget && widget.contains(e.target)) return;
      downAt = Date.now();
      downPt = { x: e.clientX, y: e.clientY };
      moveAccum = 0; scrolled = false;
      if (!rageTimer) {
        rageTimer = setTimeout(function () {
          rageTimer = null;
          /* 520ms 时若手指明显移动过 / 页面滚动过 → 视作滑动，不进入暴走 */
          if (moveAccum < 14 && !scrolled) {
            raging = true;
            windX = Math.random() < 0.5 ? -260 : 260;
            var iv = setInterval(function () {
              if (!raging) { clearInterval(iv); return; }
              burst(null, rnd(W * 0.1, W * 0.9), rnd(H * 0.15, H * 0.7));
            }, 110);
          }
        }, 520);
      }
    }, true);

    document.addEventListener('pointerup', function (e) {
      cancelRage();
      if (!downPt) return;
      var dx = e.clientX - downPt.x, dy = e.clientY - downPt.y;
      if (Date.now() - downAt < 480 && Math.abs(dx) + Math.abs(dy) < 22) burst(null, e.clientX, e.clientY);
      downPt = null;
    }, true);

    document.addEventListener('pointermove', function (e) {
      if (downPt) {
        moveAccum += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
      }
      if (e.movementX !== undefined && !raging) {
        windX = clamp(windX + e.movementX * 6, -180, 180);
      }
    }, { passive: true });

    /* 上滑/下滑时浏览器会改走滚动手势，立即取消暴走，避免一直爆炸 */
    document.addEventListener('scroll', function () { scrolled = true; cancelRage(); }, { passive: true, capture: true });
    document.addEventListener('touchmove', function () { scrolled = true; cancelRage(); }, { passive: true, capture: true });
    document.addEventListener('pointercancel', cancelRage, true);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { stop(); cancelRage(); } else { start(); }
    });

    window.addEventListener('resize', function () {
      if (cfg.density > 0) buildScene(curScene, curPhase, cfg.density * perfK);
    });
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    try {
      loadCfg();
      initCanvas();
      injectStyle();
      buildWidget();
      applyCfg();
      bindInteract();
      lastDateKey = md(new Date()) + '-' + curPhase;
      showWelcome();
      /* 供预览页调用 */
      window.__UFISOUL__ = {
        set: function (key, val) { cfg[key] = val; saveCfg(); applyCfg(); },
        get: function () { return cfg; },
        scene: function () { return curScene; },
        burst: burst,
        version: VER,
        scenes: SCENE_LABEL,
        _debug: function () { return { cal: CAL, scene: curScene, raging: raging }; }
      };
    } catch (e) {
      if (window.console) console.error('[季节氛围插件]', e);
    }
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);

})();

</script>
