//<script>
/**
 * 猫猫配置可视化修改优化插件 v2.0/阿乐(苏打)全程AI开发
 * 功能：导入配置 → 按区域可视化编辑（全区域可编辑）→ 自定义代理规则 → 保存重启 / 导出配置
 * 适用：UFI-TOOLS 后台 + Mihomo/Clash 内核
 * 设计原则：区域文本块隔离编辑，不破坏未修改区域；自动备份；操作可回滚
 */
(async () => {
  'use strict';
  // ═══════════════════════════════════════════════════════════════
  // 常量
  // ═══════════════════════════════════════════════════════════════
  const CONFIG_PATH = '/data/clash/Proxy/config.yaml';
  const UPLOAD_DIR = '/data/data/com.minikano.f50_sms/files';
  const CUSTOM_RULE_START = '# ===== 猫猫配置编辑器-自定义规则开始(请勿手动删除此行) =====';
  const CUSTOM_RULE_END = '# ===== 猫猫配置编辑器-自定义规则结束(请勿手动删除此行) =====';
  const PLUGIN_PREFIX = 'mmce_';

  // ═══════════════════════════════════════════════════════════════
  // 通用工具
  // ═══════════════════════════════════════════════════════════════
  const checkAdvancedFunc = async () => {
    const res = await runShellWithRoot('whoami');
    return Boolean(res?.content && res.content.includes('root'));
  };

  const checkClashInstalled = async () => {
    const res = await runShellWithRoot(`ls -la ${CONFIG_PATH}`);
    return Boolean(res?.content && !res.content.includes('No such file'));
  };

  const createRandomString = (len = 8) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  };

  const escapeHtml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const askConfirm = (title, body, okText = '确认', cancelText = '取消') =>
    new Promise((resolve) => {
      const id = 'confirm_' + createRandomString(6);
      const { el, close } = createFixedToast(
        id,
        `<div style="pointer-events:all;width:90vw;max-width:520px;">
          <div class="title" style="margin:0">${title}</div>
          <div style="margin-top:10px;font-size:.72rem;line-height:1.75;color:#ccc;">${body}</div>
          <div style="margin-top:14px;text-align:right;display:flex;justify-content:flex-end;gap:10px;">
            <button class="cancel" style="font-size:.72rem;">${cancelText}</button>
            <button class="ok" style="font-size:.72rem;background:linear-gradient(135deg,#ff6b6b,#ee5a5a);color:white;">${okText}</button>
          </div>
        </div>`,
      );
      el.querySelector('.cancel')?.addEventListener('click', () => { close(); resolve(false); });
      el.querySelector('.ok')?.addEventListener('click', () => { close(); resolve(true); });
    });

  // ═══════════════════════════════════════════════════════════════
  // 状态
  // ═══════════════════════════════════════════════════════════════
  const state = {
    loaded: false,
    rawText: '',
    parsed: {},
    sections: {},
    customRules: [],
    isDirty: false,
    parseError: null,   // YAML 解析错误信息（null 表示无错误）
    rawEditMode: false, // 是否处于原始文本编辑模式（解析失败或用户手动切换）
  };

  // ═══════════════════════════════════════════════════════════════
  // YAML 解析器
  // ═══════════════════════════════════════════════════════════════
  const parseYAML = (text) => {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const root = {};
    const stack = [{ indent: -1, obj: root, isList: false, parentObj: null, key: null }];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.length - line.trimStart().length;

      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1];

      if (trimmed.startsWith('- ')) {
        const value = trimmed.slice(2).trim();
        if (!parent.isList) {
          if (parent.parentObj && parent.key !== null) {
            parent.parentObj[parent.key] = [];
            parent.obj = parent.parentObj[parent.key];
          }
          parent.isList = true;
        }
        const kvMatch = value.match(/^([^:]+(?::[^:\s]+)*):(?:\s+(.*))?$/);
        if (kvMatch && !value.startsWith('"') && !value.startsWith("'")) {
          const dict = {};
          const k = kvMatch[1].trim();
          const v = (kvMatch[2] || '').trim();
          if (v) dict[k] = parseScalar(v);
          parent.obj.push(dict);
          stack.push({ indent, obj: dict, isList: false, parentObj: parent.obj, key: parent.obj.length - 1 });
        } else {
          parent.obj.push(parseScalar(value));
        }
        continue;
      }

      let colonIdx = -1;
      for (let ci = trimmed.length - 1; ci >= 0; ci--) {
        if (trimmed[ci] === ':' && (ci === trimmed.length - 1 || trimmed[ci + 1] === ' ')) {
          colonIdx = ci;
          break;
        }
      }
      if (colonIdx === -1) continue;
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();

      if (parent.isList) {
        const currentDict = parent.obj[parent.obj.length - 1];
        if (value) {
          currentDict[key] = parseScalar(value);
        } else {
          currentDict[key] = {};
          stack.push({ indent, obj: currentDict[key], isList: false, parentObj: currentDict, key: key });
        }
      } else {
        if (value) {
          parent.obj[key] = parseScalar(value);
        } else {
          parent.obj[key] = {};
          stack.push({ indent, obj: parent.obj[key], isList: false, parentObj: parent.obj, key: key });
        }
      }
    }
    return root;
  };

  const parseScalar = (val) => {
    if (val === 'true' || val === 'True' || val === 'TRUE') return true;
    if (val === 'false' || val === 'False' || val === 'FALSE') return false;
    if (val === 'null' || val === '~' || val === '') return null;
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      return val.slice(1, -1);
    }
    if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
    return val;
  };

  // YAML 序列化
  const stringifyYAML = (obj, indent = 0) => {
    const spaces = '  '.repeat(indent);
    let result = '';

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'object' && item !== null) {
          const keys = Object.keys(item);
          if (keys.length === 0) {
            result += `${spaces}-\n`;
          } else {
            const firstKey = keys[0];
            const firstVal = item[firstKey];
            if (typeof firstVal === 'object' && firstVal !== null) {
              result += `${spaces}- ${firstKey}:\n${stringifyYAML(firstVal, indent + 1)}`;
            } else {
              result += `${spaces}- ${firstKey}: ${scalarToYAML(firstVal)}\n`;
            }
            for (let i = 1; i < keys.length; i++) {
              const k = keys[i];
              const v = item[k];
              if (typeof v === 'object' && v !== null) {
                result += `${spaces}  ${k}:\n${stringifyYAML(v, indent + 2)}`;
              } else {
                result += `${spaces}  ${k}: ${scalarToYAML(v)}\n`;
              }
            }
          }
        } else {
          result += `${spaces}- ${scalarToYAML(item)}\n`;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value) && value.length === 0) {
            result += `${spaces}${key}: []\n`;
          } else if (!Array.isArray(value) && Object.keys(value).length === 0) {
            result += `${spaces}${key}: {}\n`;
          } else {
            result += `${spaces}${key}:\n${stringifyYAML(value, indent + 1)}`;
          }
        } else {
          result += `${spaces}${key}: ${scalarToYAML(value)}\n`;
        }
      }
    }
    return result;
  };

  const scalarToYAML = (val) => {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return String(val);
    const str = String(val);
    // 仅在 YAML 语法真正有歧义时加引号
    const needsQuote = str === ''
      || /\n/.test(str)
      || /^[&*!|>'"%@`#{}\[\],;]/.test(str)
      || /:\s/.test(str)    // 冒号后接空格（如 "key: value" 形式的值）
      || /\s#/.test(str)    // 空格后接井号（注释）
      || /^(true|false|null|yes|no|on|off|~)$/i.test(str)
      || /^\s|\s$/.test(str);
    if (needsQuote) return `"${str.replace(/"/g, '\\"')}"`;
    return str;
  };

  // ═══════════════════════════════════════════════════════════════
  // 配置解析与重建
  // ═══════════════════════════════════════════════════════════════
  const parseConfig = (text) => {
    state.rawText = text;
    state.parseError = null;
    state.rawEditMode = false;
    try {
      state.parsed = parseYAML(text);
    } catch (e) {
      state.parsed = {};
      state.parseError = e.message || String(e);
      state.rawEditMode = true;
    }
    state.customRules = extractCustomRules(text);
    // 从 parsed.rules 中移除已提取的自定义规则，避免重复
    if (state.customRules.length > 0 && Array.isArray(state.parsed.rules)) {
      const customSet = new Set(state.customRules);
      state.parsed.rules = state.parsed.rules.filter(r => !customSet.has(r));
    }
    state.sections = splitSections(text);
    state.loaded = true;
    state.isDirty = false;
  };

  const extractCustomRules = (text) => {
    const start = text.indexOf(CUSTOM_RULE_START);
    const end = text.indexOf(CUSTOM_RULE_END);
    if (start === -1 || end === -1 || start >= end) return [];
    const block = text.slice(start + CUSTOM_RULE_START.length, end);
    return block.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#') && l.startsWith('- '))
      .map(l => l.slice(2).trim());
  };

  const splitSections = (text) => {
    const sections = {};
    const topKeys = ['allow-lan', 'cmfa-plugin', 'dns', 'external-controller', 'external-ui',
      'external-ui-url', 'find-process-mode', 'geodata-mode', 'hc', 'keep-alive-idle',
      'keep-alive-interval', 'log-level', 'mixed-port', 'mode', 'ntp', 'proxy-groups',
      'proxy-providers', 'rp1', 'rule-providers', 'rules', 'secret', 'sniffer',
      'tcp-concurrent', 'tproxy-port', 'unified-delay', 'use'];
    const lines = text.split('\n');
    let currentKey = null;
    let currentLines = [];
    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_-]+):/);
      if (match && topKeys.includes(match[1])) {
        if (currentKey) sections[currentKey] = currentLines.join('\n');
        currentKey = match[1];
        currentLines = [line];
      } else if (currentKey) {
        currentLines.push(line);
      }
    }
    if (currentKey) sections[currentKey] = currentLines.join('\n');
    return sections;
  };

  const rebuildConfigText = () => {
    // 从 parsed 重建，自定义规则嵌入到 rules 列表末尾（带标记注释）
    const config = JSON.parse(JSON.stringify(state.parsed));
    const parts = [];
    const orderedKeys = ['mixed-port', 'mode', 'log-level', 'secret', 'allow-lan',
      'external-controller', 'external-ui', 'external-ui-url', 'find-process-mode',
      'geodata-mode', 'tcp-concurrent', 'tproxy-port', 'unified-delay',
      'keep-alive-idle', 'keep-alive-interval', 'cmfa-plugin', 'dns', 'ntp',
      'sniffer', 'hc', 'proxy-providers', 'proxy-groups', 'rule-providers',
      'rules', 'use', 'rp1'];

    for (const key of orderedKeys) {
      if (config[key] === undefined) continue;
      if (key === 'rules' && state.customRules.length > 0) {
        // rules 特殊处理：先序列化普通规则，再追加自定义规则标记块（作为 rules 列表的延续，需2空格缩进）
        const rulesList = Array.isArray(config.rules) ? config.rules : [];
        let rulesStr = stringifyYAML({ rules: rulesList }).trimEnd();
        rulesStr += '\n' + CUSTOM_RULE_START + '\n';
        for (const r of state.customRules) {
          rulesStr += '  - ' + r + '\n';
        }
        rulesStr += CUSTOM_RULE_END;
        parts.push(rulesStr);
      } else {
        parts.push(stringifyYAML({ [key]: config[key] }).trimEnd());
      }
    }
    for (const key of Object.keys(config)) {
      if (!orderedKeys.includes(key)) {
        parts.push(stringifyYAML({ [key]: config[key] }).trimEnd());
      }
    }
    return parts.join('\n') + '\n';
  };

  // ═══════════════════════════════════════════════════════════════
  // 设备操作
  // ═══════════════════════════════════════════════════════════════
  const loadConfigFromDevice = async () => {
    const res = await runShellWithRoot(`timeout 5s awk '{print}' ${CONFIG_PATH}`);
    if (!res?.success || !res.content) throw new Error('读取配置失败');
    return res.content;
  };

  const backupConfig = async () => {
    const ts = Date.now();
    const backupFile = `${UPLOAD_DIR}/mm_config_backup_${ts}.yaml`;
    await runShellWithRoot(`cp ${CONFIG_PATH} ${backupFile}`);
    createToast(`已备份到 uploads/mm_config_backup_${ts}.yaml`, 'green', 4000);
    return ts;
  };

  const saveConfigToDevice = async () => {
    const text = rebuildConfigText();
    const ts = Date.now();
    const backupFile = `${UPLOAD_DIR}/mm_config_backup_${ts}.yaml`;
    await runShellWithRoot(`cp ${CONFIG_PATH} ${backupFile}`);

    const tempFile = `${UPLOAD_DIR}/mm_config_temp_${ts}.yaml`;
    await runShellWithRoot(`cat > ${tempFile} << 'YAMLEOF'\n${text}\nYAMLEOF`);
    await runShellWithRoot(`mv ${tempFile} ${CONFIG_PATH}`);
    return ts;
  };

  const restartClash = async () => {
    await runShellWithRoot('pkill -f Clash.Core || true');
    await new Promise(r => setTimeout(r, 1000));
    await runShellWithRoot(`cd /data/clash/Proxy && nohup ./Clash.Core -d . > /data/clash/Proxy/clash.log 2>&1 &`);
    createToast('内核已重启', 'green', 3000);
  };

  // ═══════════════════════════════════════════════════════════════
  // UI 构建
  // ═══════════════════════════════════════════════════════════════
  const buildSectionHeader = (title, icon) => {
    return `<div class="title" style="margin:8px 0;font-size:.85rem;">
      <strong>${icon} ${escapeHtml(title)}</strong>
    </div>`;
  };

  const buildStatusBar = () => `
    <div id="${PLUGIN_PREFIX}status_bar" style="padding:8px 12px;border-radius:8px;background:rgba(255,255,255,.04);font-size:.72rem;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
      <span>状态：<span id="${PLUGIN_PREFIX}status_text" style="color:#ff9f43;">未加载配置</span></span>
      <span id="${PLUGIN_PREFIX}dirty_indicator" style="color:#ff6b6b;display:none;">⚠ 有未保存的修改</span>
    </div>
  `;

  const buildActionBar = () => `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      <button id="${PLUGIN_PREFIX}btn_load" class="btn" style="font-size:.72rem;">📂 读取当前配置</button>
      <button id="${PLUGIN_PREFIX}btn_import" class="btn" style="font-size:.72rem;">📥 导入配置文件</button>
      <button id="${PLUGIN_PREFIX}btn_export" class="btn" style="font-size:.72rem;background:linear-gradient(135deg,#4dabf7,#339af0);color:white;">💾 导出配置</button>
      <button id="${PLUGIN_PREFIX}btn_validate" class="btn" style="font-size:.72rem;background:linear-gradient(135deg,#ffd43b,#fab005);color:#333;">✅ 验证配置</button>
      <button id="${PLUGIN_PREFIX}btn_save" class="btn" style="font-size:.72rem;background:linear-gradient(135deg,#51cf66,#37b24d);color:white;">💾 保存并重启</button>
      <button id="${PLUGIN_PREFIX}btn_backup" class="btn" style="font-size:.72rem;">📋 备份配置</button>
      <button id="${PLUGIN_PREFIX}btn_raw" class="btn" style="font-size:.72rem;">📝 查看原始配置</button>
    </div>
    <input type="file" id="${PLUGIN_PREFIX}file_input" accept=".yaml,.yml,.txt" style="display:none;">
  `;

  const buildBasicSection = () => `
    <div id="${PLUGIN_PREFIX}section_basic" style="display:none;">
      ${buildSectionHeader('基础设置', '⚙️')}
      <div style="padding:10px;border-radius:8px;background:rgba(255,255,255,.03);font-size:.72rem;">
        <div id="${PLUGIN_PREFIX}basic_fields" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"></div>
      </div>
    </div>
  `;

  const buildDNSSection = () => `
    <div id="${PLUGIN_PREFIX}section_dns" style="display:none;">
      ${buildSectionHeader('DNS 配置', '🌐')}
      <div style="padding:10px;border-radius:8px;background:rgba(255,255,255,.03);font-size:.72rem;">
        <div id="${PLUGIN_PREFIX}dns_content"></div>
      </div>
    </div>
  `;

  const buildProviderSection = () => `
    <div id="${PLUGIN_PREFIX}section_providers" style="display:none;">
      ${buildSectionHeader('代理提供者（订阅链接）', '🔗')}
      <div style="padding:10px;border-radius:8px;background:rgba(255,255,255,.03);font-size:.72rem;">
        <div id="${PLUGIN_PREFIX}providers_list"></div>
        <button id="${PLUGIN_PREFIX}btn_add_provider" class="btn" style="font-size:.7rem;margin-top:8px;">+ 添加订阅链接</button>
      </div>
    </div>
  `;

  const buildRuleProviderSection = () => `
    <div id="${PLUGIN_PREFIX}section_rule_providers" style="display:none;">
      ${buildSectionHeader('规则集（rule-providers）', '📚')}
      <div style="padding:10px;border-radius:8px;background:rgba(255,255,255,.03);font-size:.72rem;">
        <div id="${PLUGIN_PREFIX}rule_providers_list"></div>
        <button id="${PLUGIN_PREFIX}btn_add_rule_provider" class="btn" style="font-size:.7rem;margin-top:8px;">+ 添加规则集</button>
      </div>
    </div>
  `;

  const buildRulesSection = () => `
    <div id="${PLUGIN_PREFIX}section_rules" style="display:none;">
      ${buildSectionHeader('代理规则（rules）', '📋')}
      <div style="padding:10px;border-radius:8px;background:rgba(255,255,255,.03);font-size:.72rem;">
        <div style="margin-bottom:8px;color:#aaa;">共 <span id="${PLUGIN_PREFIX}rules_count">0</span> 条规则（含自定义规则）</div>
        <div id="${PLUGIN_PREFIX}rules_list" style="max-height:400px;overflow-y:auto;"></div>
        <button id="${PLUGIN_PREFIX}btn_add_rule" class="btn" style="font-size:.7rem;margin-top:8px;">+ 添加规则</button>
      </div>
    </div>
  `;

  const buildCustomSection = () => `
    <div id="${PLUGIN_PREFIX}section_custom" style="display:none;">
      ${buildSectionHeader('自定义规则', '✨')}
      <div style="padding:10px;border-radius:8px;background:rgba(255,255,255,.03);font-size:.72rem;">
        <div style="display:grid;grid-template-columns:120px 1fr 120px auto;gap:8px;align-items:center;margin-bottom:10px;">
          <select id="${PLUGIN_PREFIX}custom_type" style="padding:6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.7rem;">
            <option value="domain">域名 (DOMAIN-SUFFIX)</option>
            <option value="ip">IP/IP段 (IP-CIDR)</option>
            <option value="keyword">关键词 (DOMAIN-KEYWORD)</option>
          </select>
          <input id="${PLUGIN_PREFIX}custom_value" type="text" placeholder="输入内容，如 google.com / 1.1.1.1 / baidu" style="padding:6px 8px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.7rem;">
          <select id="${PLUGIN_PREFIX}custom_policy" style="padding:6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.7rem;">
            <option value="选择节点">选择节点</option>
            <option value="国内网站">国内网站</option>
            <option value="DIRECT">DIRECT 直连</option>
            <option value="REJECT">REJECT 拦截</option>
          </select>
          <button id="${PLUGIN_PREFIX}btn_add_custom" class="btn" style="font-size:.7rem;white-space:nowrap;">+ 添加</button>
        </div>
        <div id="${PLUGIN_PREFIX}custom_list" style="margin-top:8px;"></div>
        <div id="${PLUGIN_PREFIX}custom_empty" style="color:#888;text-align:center;padding:12px;">暂无自定义规则，在上方添加</div>
      </div>
    </div>
  `;

  const buildProxyGroupSection = () => `
    <div id="${PLUGIN_PREFIX}section_groups" style="display:none;">
      ${buildSectionHeader('代理组（proxy-groups）', '👥')}
      <div style="padding:10px;border-radius:8px;background:rgba(255,255,255,.03);font-size:.72rem;">
        <div id="${PLUGIN_PREFIX}groups_list"></div>
        <button id="${PLUGIN_PREFIX}btn_add_group" class="btn" style="font-size:.7rem;margin-top:8px;">+ 添加代理组</button>
      </div>
    </div>
  `;

  const buildRawEditSection = () => `
    <div id="${PLUGIN_PREFIX}section_raw" style="display:none;">
      ${buildSectionHeader('原始文本编辑（修复模式）', '🛠️')}
      <div style="padding:10px;border-radius:8px;background:rgba(255,107,107,.06);border:1px solid rgba(255,107,107,.15);font-size:.72rem;margin-bottom:10px;">
        <div style="color:#ff6b6b;margin-bottom:6px;">⚠ 当配置 YAML 解析失败时，可在此手动编辑修复，编辑后点击「重新解析」恢复可视化编辑。</div>
        <div id="${PLUGIN_PREFIX}raw_error_msg" style="color:#ff9f43;font-family:monospace;font-size:.68rem;white-space:pre-wrap;word-break:break-all;display:none;"></div>
      </div>
      <textarea id="${PLUGIN_PREFIX}raw_editor" rows="30" style="width:100%;padding:10px;border-radius:8px;background:rgba(0,0,0,.4);color:#0f0;border:1px solid #333;font-family:monospace;font-size:.7rem;box-sizing:border-box;resize:vertical;line-height:1.5;"></textarea>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
        <button id="${PLUGIN_PREFIX}btn_reparse" class="btn" style="font-size:.72rem;background:linear-gradient(135deg,#51cf66,#37b24d);color:white;">🔄 重新解析</button>
        <button id="${PLUGIN_PREFIX}btn_validate_raw" class="btn" style="font-size:.72rem;">✅ 验证 YAML</button>
      </div>
    </div>
  `;

  const buildSectionNav = () => `
    <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;">
      <button class="${PLUGIN_PREFIX}nav_btn btn active" data-section="basic" style="font-size:.68rem;padding:4px 10px;">基础设置</button>
      <button class="${PLUGIN_PREFIX}nav_btn btn" data-section="dns" style="font-size:.68rem;padding:4px 10px;">DNS</button>
      <button class="${PLUGIN_PREFIX}nav_btn btn" data-section="providers" style="font-size:.68rem;padding:4px 10px;">订阅链接</button>
      <button class="${PLUGIN_PREFIX}nav_btn btn" data-section="rule_providers" style="font-size:.68rem;padding:4px 10px;">规则集</button>
      <button class="${PLUGIN_PREFIX}nav_btn btn" data-section="rules" style="font-size:.68rem;padding:4px 10px;">代理规则</button>
      <button class="${PLUGIN_PREFIX}nav_btn btn" data-section="custom" style="font-size:.68rem;padding:4px 10px;background:rgba(81,207,102,.2);">✨自定义规则</button>
      <button class="${PLUGIN_PREFIX}nav_btn btn" data-section="groups" style="font-size:.68rem;padding:4px 10px;">代理组</button>
      <button class="${PLUGIN_PREFIX}nav_btn btn" data-section="raw" style="font-size:.68rem;padding:4px 10px;background:rgba(255,107,107,.15);color:#ff6b6b;">🛠️原始编辑</button>
    </div>
  `;

  // ═══════════════════════════════════════════════════════════════
  // 渲染各区域
  // ═══════════════════════════════════════════════════════════════
  const getProxyGroupNames = () => {
    const groups = state.parsed['proxy-groups'];
    if (!Array.isArray(groups)) return [];
    return groups.map(g => g.name).filter(Boolean);
  };

  const renderBasicSection = () => {
    const container = document.getElementById(`${PLUGIN_PREFIX}basic_fields`);
    if (!container) return;
    const fields = [
      { key: 'mixed-port', label: '混合代理端口', type: 'number' },
      { key: 'mode', label: '代理模式', type: 'select', options: ['rule', 'global', 'direct'] },
      { key: 'log-level', label: '日志级别', type: 'select', options: ['info', 'debug', 'warning', 'error', 'silent'] },
      { key: 'secret', label: '面板密码', type: 'text' },
      { key: 'external-controller', label: '面板监听地址', type: 'text' },
      { key: 'allow-lan', label: '允许局域网', type: 'select', options: ['true', 'false'] },
      { key: 'tcp-concurrent', label: 'TCP并发', type: 'select', options: ['true', 'false'] },
      { key: 'unified-delay', label: '统一延迟测试', type: 'select', options: ['true', 'false'] },
      { key: 'geodata-mode', label: 'GeoData模式', type: 'select', options: ['true', 'false'] },
      { key: 'tproxy-port', label: 'TProxy端口', type: 'number' },
      { key: 'find-process-mode', label: '进程查找模式', type: 'select', options: ['off', 'strict', 'always'] },
      { key: 'external-ui', label: '面板目录', type: 'text' },
    ];

    let html = '';
    for (const f of fields) {
      const val = state.parsed[f.key];
      const valStr = val === undefined ? '' : String(val);
      html += `<div style="display:flex;flex-direction:column;gap:3px;">
        <label style="font-size:.65rem;color:#aaa;">${f.label}</label>
        ${f.type === 'select'
          ? `<select data-basic-key="${f.key}" style="padding:5px 8px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.7rem;">
              ${f.options.map(o => `<option value="${o}" ${o === valStr ? 'selected' : ''}>${o}</option>`).join('')}
            </select>`
          : `<input type="${f.type}" data-basic-key="${f.key}" value="${escapeHtml(valStr)}" style="padding:5px 8px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.7rem;">`
        }
      </div>`;
    }
    container.innerHTML = html;

    container.querySelectorAll('[data-basic-key]').forEach(el => {
      el.addEventListener('change', () => {
        const key = el.dataset.basicKey;
        let val = el.value;
        if (el.type === 'number') val = Number(val);
        else if (val === 'true') val = true;
        else if (val === 'false') val = false;
        state.parsed[key] = val;
        markDirty();
      });
    });
  };

  const renderDNSSection = () => {
    const container = document.getElementById(`${PLUGIN_PREFIX}dns_content`);
    if (!container) return;
    const dns = state.parsed.dns || {};

    const simpleFields = [
      { key: 'enable', label: '启用DNS', type: 'select', options: ['true', 'false'] },
      { key: 'listen', label: '监听地址', type: 'text' },
      { key: 'enhanced-mode', label: '增强模式', type: 'select', options: ['redir-host', 'fake-ip'] },
      { key: 'ipv6', label: 'IPv6', type: 'select', options: ['true', 'false'] },
      { key: 'respect-rules', label: '遵守规则', type: 'select', options: ['true', 'false'] },
      { key: 'perfer-h3', label: '偏好HTTP/3', type: 'select', options: ['true', 'false'] },
    ];

    let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">';
    for (const f of simpleFields) {
      const val = dns[f.key];
      const valStr = val === undefined ? '' : String(val);
      html += `<div style="display:flex;flex-direction:column;gap:3px;">
        <label style="font-size:.65rem;color:#aaa;">${f.label}</label>
        ${f.type === 'select'
          ? `<select data-dns-key="${f.key}" style="padding:5px 8px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.7rem;">
              ${f.options.map(o => `<option value="${o}" ${o === valStr ? 'selected' : ''}>${o}</option>`).join('')}
            </select>`
          : `<input type="text" data-dns-key="${f.key}" value="${escapeHtml(valStr)}" style="padding:5px 8px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.7rem;">`
        }
      </div>`;
    }
    html += '</div>';

    const listFields = [
      { key: 'default-nameserver', label: '默认 DNS（必须是IP）' },
      { key: 'nameserver', label: '主要 DNS' },
      { key: 'proxy-server-nameserver', label: '代理节点 DNS' },
      { key: 'direct-nameserver', label: '直连 DNS' },
    ];

    for (const lf of listFields) {
      const rawList = dns[lf.key];
      const list = Array.isArray(rawList) ? rawList : (rawList ? [String(rawList)] : []);
      html += `<div style="margin-bottom:10px;">
        <div style="color:#aaa;font-size:.65rem;margin-bottom:4px;">${lf.label}</div>
        <div id="${PLUGIN_PREFIX}dns_list_${lf.key}" style="display:flex;flex-direction:column;gap:4px;">
          ${list.map((item, idx) => `
            <div style="display:flex;gap:4px;align-items:center;">
              <input type="text" data-dns-list="${lf.key}" data-idx="${idx}" value="${escapeHtml(item)}" style="flex:1;padding:4px 8px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.7rem;font-family:monospace;">
              <button class="${PLUGIN_PREFIX}dns_list_del" data-list="${lf.key}" data-idx="${idx}" style="padding:3px 8px;font-size:.65rem;background:rgba(255,107,107,.2);color:#ff6b6b;border:none;border-radius:4px;cursor:pointer;">删除</button>
            </div>
          `).join('')}
        </div>
        <button class="${PLUGIN_PREFIX}dns_list_add" data-list="${lf.key}" style="margin-top:4px;font-size:.65rem;padding:3px 10px;">+ 添加</button>
      </div>`;
    }

    container.innerHTML = html;

    container.querySelectorAll('[data-dns-key]').forEach(el => {
      el.addEventListener('change', () => {
        if (!state.parsed.dns) state.parsed.dns = {};
        let val = el.value;
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        state.parsed.dns[el.dataset.dnsKey] = val;
        markDirty();
      });
    });

    container.querySelectorAll('[data-dns-list]').forEach(el => {
      el.addEventListener('change', () => {
        const key = el.dataset.dnsList;
        const idx = Number(el.dataset.idx);
        if (!state.parsed.dns) state.parsed.dns = {};
        if (!Array.isArray(state.parsed.dns[key])) state.parsed.dns[key] = [];
        state.parsed.dns[key][idx] = el.value;
        markDirty();
      });
    });

    container.querySelectorAll(`.${PLUGIN_PREFIX}dns_list_del`).forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.list;
        const idx = Number(btn.dataset.idx);
        if (Array.isArray(state.parsed.dns?.[key])) {
          state.parsed.dns[key].splice(idx, 1);
          renderDNSSection();
          markDirty();
        }
      });
    });

    container.querySelectorAll(`.${PLUGIN_PREFIX}dns_list_add`).forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.list;
        if (!state.parsed.dns) state.parsed.dns = {};
        if (!Array.isArray(state.parsed.dns[key])) state.parsed.dns[key] = [];
        state.parsed.dns[key].push('');
        renderDNSSection();
        markDirty();
      });
    });
  };

  const renderProvidersSection = () => {
    const container = document.getElementById(`${PLUGIN_PREFIX}providers_list`);
    if (!container) return;
    const providers = state.parsed['proxy-providers'] || {};
    const names = Object.keys(providers);

    if (names.length === 0) {
      container.innerHTML = '<div style="color:#888;text-align:center;padding:12px;">暂无订阅链接</div>';
      return;
    }

    let html = '';
    for (const name of names) {
      const p = providers[name];
      html += `<div style="padding:10px;margin-bottom:8px;border-radius:8px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.05);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-weight:bold;color:#eee;">🔗 ${escapeHtml(name)}</span>
          <button class="${PLUGIN_PREFIX}provider_del" data-name="${name}" style="font-size:.65rem;padding:3px 10px;background:rgba(255,107,107,.2);color:#ff6b6b;border:none;border-radius:4px;cursor:pointer;">删除</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="display:flex;flex-direction:column;gap:2px;">
            <label style="font-size:.6rem;color:#888;">类型</label>
            <select data-provider="${name}" data-field="type" style="padding:4px 6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.65rem;">
              <option value="http" ${p.type === 'http' ? 'selected' : ''}>http</option>
              <option value="file" ${p.type === 'file' ? 'selected' : ''}>file</option>
            </select>
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;">
            <label style="font-size:.6rem;color:#888;">更新间隔(秒)</label>
            <input type="number" data-provider="${name}" data-field="interval" value="${escapeHtml(p.interval || '')}" style="padding:4px 6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.65rem;">
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;margin-top:6px;">
          <label style="font-size:.6rem;color:#888;">URL</label>
          <input type="text" data-provider="${name}" data-field="url" value="${escapeHtml(p.url || '')}" style="padding:4px 6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.65rem;font-family:monospace;">
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;margin-top:6px;">
          <label style="font-size:.6rem;color:#888;">路径</label>
          <input type="text" data-provider="${name}" data-field="path" value="${escapeHtml(p.path || '')}" style="padding:4px 6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.65rem;font-family:monospace;">
        </div>
      </div>`;
    }
    container.innerHTML = html;

    container.querySelectorAll('[data-provider]').forEach(el => {
      el.addEventListener('change', () => {
        const name = el.dataset.provider;
        const field = el.dataset.field;
        if (!state.parsed['proxy-providers']) state.parsed['proxy-providers'] = {};
        if (!state.parsed['proxy-providers'][name]) state.parsed['proxy-providers'][name] = {};
        let val = el.value;
        if (el.type === 'number') val = Number(val);
        state.parsed['proxy-providers'][name][field] = val;
        markDirty();
      });
    });

    container.querySelectorAll(`.${PLUGIN_PREFIX}provider_del`).forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.name;
        if (!(await askConfirm('删除订阅', `确定要删除订阅「${name}」吗？`))) return;
        delete state.parsed['proxy-providers']?.[name];
        renderProvidersSection();
        markDirty();
      });
    });
  };

  const renderRuleProvidersSection = () => {
    const container = document.getElementById(`${PLUGIN_PREFIX}rule_providers_list`);
    if (!container) return;
    const rps = state.parsed['rule-providers'] || {};
    const names = Object.keys(rps);

    if (names.length === 0) {
      container.innerHTML = '<div style="color:#888;text-align:center;padding:12px;">暂无规则集</div>';
      return;
    }

    let html = '';
    for (const name of names) {
      const rp = rps[name];
      html += `<div style="padding:10px;margin-bottom:8px;border-radius:8px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.05);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-weight:bold;color:#eee;">📚 ${escapeHtml(name)}</span>
          <button class="${PLUGIN_PREFIX}rp_del" data-name="${name}" style="font-size:.65rem;padding:3px 10px;background:rgba(255,107,107,.2);color:#ff6b6b;border:none;border-radius:4px;cursor:pointer;">删除</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
          <div style="display:flex;flex-direction:column;gap:2px;">
            <label style="font-size:.6rem;color:#888;">行为</label>
            <select data-rp="${name}" data-field="behavior" style="padding:4px 6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.65rem;">
              <option value="domain" ${rp.behavior === 'domain' ? 'selected' : ''}>domain</option>
              <option value="ipcidr" ${rp.behavior === 'ipcidr' ? 'selected' : ''}>ipcidr</option>
              <option value="classical" ${rp.behavior === 'classical' ? 'selected' : ''}>classical</option>
            </select>
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;">
            <label style="font-size:.6rem;color:#888;">格式</label>
            <select data-rp="${name}" data-field="format" style="padding:4px 6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.65rem;">
              <option value="yaml" ${rp.format === 'yaml' ? 'selected' : ''}>yaml</option>
              <option value="mrs" ${rp.format === 'mrs' ? 'selected' : ''}>mrs</option>
              <option value="text" ${rp.format === 'text' ? 'selected' : ''}>text</option>
            </select>
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;">
            <label style="font-size:.6rem;color:#888;">类型</label>
            <select data-rp="${name}" data-field="type" style="padding:4px 6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.65rem;">
              <option value="http" ${rp.type === 'http' ? 'selected' : ''}>http</option>
              <option value="file" ${rp.type === 'file' ? 'selected' : ''}>file</option>
            </select>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;margin-top:6px;">
          <label style="font-size:.6rem;color:#888;">URL</label>
          <input type="text" data-rp="${name}" data-field="url" value="${escapeHtml(rp.url || '')}" style="padding:4px 6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.65rem;font-family:monospace;">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
          <div style="display:flex;flex-direction:column;gap:2px;">
            <label style="font-size:.6rem;color:#888;">路径</label>
            <input type="text" data-rp="${name}" data-field="path" value="${escapeHtml(rp.path || '')}" style="padding:4px 6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.65rem;font-family:monospace;">
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;">
            <label style="font-size:.6rem;color:#888;">更新间隔(秒)</label>
            <input type="number" data-rp="${name}" data-field="interval" value="${escapeHtml(rp.interval || '')}" style="padding:4px 6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.65rem;">
          </div>
        </div>
      </div>`;
    }
    container.innerHTML = html;

    container.querySelectorAll('[data-rp]').forEach(el => {
      el.addEventListener('change', () => {
        const name = el.dataset.rp;
        const field = el.dataset.field;
        if (!state.parsed['rule-providers']) state.parsed['rule-providers'] = {};
        if (!state.parsed['rule-providers'][name]) state.parsed['rule-providers'][name] = {};
        let val = el.value;
        if (el.type === 'number') val = Number(val);
        state.parsed['rule-providers'][name][field] = val;
        markDirty();
      });
    });

    container.querySelectorAll(`.${PLUGIN_PREFIX}rp_del`).forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.name;
        if (!(await askConfirm('删除规则集', `确定要删除规则集「${name}」吗？`))) return;
        delete state.parsed['rule-providers']?.[name];
        renderRuleProvidersSection();
        markDirty();
      });
    });
  };

  const renderRulesSection = () => {
    const container = document.getElementById(`${PLUGIN_PREFIX}rules_list`);
    const countEl = document.getElementById(`${PLUGIN_PREFIX}rules_count`);
    if (!container) return;

    const rules = state.parsed['rules'] || [];
    if (countEl) countEl.textContent = rules.length + state.customRules.length;

    let html = '';
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      html += `<div style="display:flex;gap:4px;align-items:center;padding:4px 6px;margin-bottom:3px;border-radius:4px;${i % 2 === 0 ? 'background:rgba(255,255,255,.02);' : ''}">
        <span style="color:#666;font-size:.65rem;min-width:28px;">#${i + 1}</span>
        <input type="text" data-rule-idx="${i}" value="${escapeHtml(r)}" style="flex:1;padding:4px 8px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.68rem;font-family:monospace;">
        <button class="${PLUGIN_PREFIX}rule_up" data-idx="${i}" style="padding:3px 6px;font-size:.6rem;background:rgba(255,255,255,.08);color:#ccc;border:none;border-radius:4px;cursor:pointer;" title="上移">↑</button>
        <button class="${PLUGIN_PREFIX}rule_down" data-idx="${i}" style="padding:3px 6px;font-size:.6rem;background:rgba(255,255,255,.08);color:#ccc;border:none;border-radius:4px;cursor:pointer;" title="下移">↓</button>
        <button class="${PLUGIN_PREFIX}rule_del" data-idx="${i}" style="padding:3px 8px;font-size:.65rem;background:rgba(255,107,107,.2);color:#ff6b6b;border:none;border-radius:4px;cursor:pointer;">删除</button>
      </div>`;
    }

    if (state.customRules.length > 0) {
      html += `<div style="margin:10px 0 4px;padding:4px 8px;background:rgba(81,207,102,.1);border-radius:4px;color:#51cf66;font-size:.65rem;">✨ 以下为自定义规则（在自定义规则标签页管理）</div>`;
      for (let i = 0; i < state.customRules.length; i++) {
        html += `<div style="display:flex;gap:4px;align-items:center;padding:4px 6px;margin-bottom:3px;border-radius:4px;background:rgba(81,207,102,.05);">
          <span style="color:#51cf66;font-size:.65rem;min-width:28px;">C${i + 1}</span>
          <span style="flex:1;padding:4px 8px;font-family:monospace;font-size:.68rem;color:#a9e34b;word-break:break-all;">${escapeHtml(state.customRules[i])}</span>
        </div>`;
      }
    }

    container.innerHTML = html;

    container.querySelectorAll('[data-rule-idx]').forEach(el => {
      el.addEventListener('change', () => {
        const idx = Number(el.dataset.ruleIdx);
        if (!Array.isArray(state.parsed['rules'])) state.parsed['rules'] = [];
        state.parsed['rules'][idx] = el.value;
        markDirty();
      });
    });

    container.querySelectorAll(`.${PLUGIN_PREFIX}rule_del`).forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        if (Array.isArray(state.parsed['rules'])) {
          state.parsed['rules'].splice(idx, 1);
          renderRulesSection();
          markDirty();
        }
      });
    });

    container.querySelectorAll(`.${PLUGIN_PREFIX}rule_up`).forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        if (idx > 0 && Array.isArray(state.parsed['rules'])) {
          [state.parsed['rules'][idx - 1], state.parsed['rules'][idx]] =
            [state.parsed['rules'][idx], state.parsed['rules'][idx - 1]];
          renderRulesSection();
          markDirty();
        }
      });
    });

    container.querySelectorAll(`.${PLUGIN_PREFIX}rule_down`).forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        const rules = state.parsed['rules'];
        if (Array.isArray(rules) && idx < rules.length - 1) {
          [rules[idx], rules[idx + 1]] = [rules[idx + 1], rules[idx]];
          renderRulesSection();
          markDirty();
        }
      });
    });
  };

  const renderCustomSection = () => {
    const container = document.getElementById(`${PLUGIN_PREFIX}custom_list`);
    const emptyEl = document.getElementById(`${PLUGIN_PREFIX}custom_empty`);
    if (!container) return;

    const policySelect = document.getElementById(`${PLUGIN_PREFIX}custom_policy`);
    if (policySelect) {
      const groupNames = getProxyGroupNames();
      const currentVal = policySelect.value;
      policySelect.innerHTML = ['选择节点', '国内网站', 'DIRECT', 'REJECT', ...groupNames.filter(g => !['选择节点', '国内网站'].includes(g))]
        .map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
      policySelect.value = groupNames.includes(currentVal) ? currentVal : '选择节点';
    }

    if (state.customRules.length === 0) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    let html = '';
    for (let i = 0; i < state.customRules.length; i++) {
      const r = state.customRules[i];
      html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;margin-bottom:4px;border-radius:6px;background:rgba(81,207,102,.06);border:1px solid rgba(81,207,102,.15);">
        <span style="color:#51cf66;font-size:.65rem;min-width:24px;">#${i + 1}</span>
        <span style="flex:1;font-family:monospace;font-size:.68rem;color:#ccc;word-break:break-all;">${escapeHtml(r)}</span>
        <button class="${PLUGIN_PREFIX}custom_del" data-idx="${i}" style="font-size:.65rem;padding:2px 8px;background:rgba(255,107,107,.2);color:#ff6b6b;border:none;border-radius:4px;cursor:pointer;">删除</button>
      </div>`;
    }
    container.innerHTML = html;

    container.querySelectorAll(`.${PLUGIN_PREFIX}custom_del`).forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        state.customRules.splice(idx, 1);
        renderCustomSection();
        renderRulesSection();
        markDirty();
      });
    });
  };

  const renderProxyGroupsSection = () => {
    const container = document.getElementById(`${PLUGIN_PREFIX}groups_list`);
    if (!container) return;
    const groups = state.parsed['proxy-groups'];
    const groupList = Array.isArray(groups) ? groups : [];

    if (groupList.length === 0) {
      container.innerHTML = '<div style="color:#888;text-align:center;padding:12px;">暂无代理组</div>';
      return;
    }

    let html = '';
    for (let i = 0; i < groupList.length; i++) {
      const g = groupList[i];
      const rawProxies = g.proxies;
      const proxies = Array.isArray(rawProxies) ? rawProxies : (rawProxies ? [rawProxies] : []);
      html += `<div style="padding:10px;margin-bottom:8px;border-radius:8px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.05);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-weight:bold;color:#eee;"><span style="color:#888;font-size:.65rem;margin-right:6px;">#${i + 1}</span>👥 ${escapeHtml(g.name || '未命名')}</span>
          <div style="display:flex;gap:4px;align-items:center;">
            <button class="${PLUGIN_PREFIX}group_up" data-idx="${i}" style="padding:3px 8px;font-size:.65rem;background:rgba(255,255,255,.08);color:#ccc;border:none;border-radius:4px;cursor:pointer;" title="上移">↑</button>
            <button class="${PLUGIN_PREFIX}group_down" data-idx="${i}" style="padding:3px 8px;font-size:.65rem;background:rgba(255,255,255,.08);color:#ccc;border:none;border-radius:4px;cursor:pointer;" title="下移">↓</button>
            <button class="${PLUGIN_PREFIX}group_del" data-idx="${i}" style="font-size:.65rem;padding:3px 10px;background:rgba(255,107,107,.2);color:#ff6b6b;border:none;border-radius:4px;cursor:pointer;">删除</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <div style="display:flex;flex-direction:column;gap:2px;">
            <label style="font-size:.6rem;color:#888;">名称</label>
            <input type="text" data-group="${i}" data-field="name" value="${escapeHtml(g.name || '')}" style="padding:4px 6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.65rem;">
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;">
            <label style="font-size:.6rem;color:#888;">类型</label>
            <select data-group="${i}" data-field="type" style="padding:4px 6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.65rem;">
              <option value="select" ${g.type === 'select' ? 'selected' : ''}>select</option>
              <option value="url-test" ${g.type === 'url-test' ? 'selected' : ''}>url-test</option>
              <option value="fallback" ${g.type === 'fallback' ? 'selected' : ''}>fallback</option>
              <option value="load-balance" ${g.type === 'load-balance' ? 'selected' : ''}>load-balance</option>
              <option value="relay" ${g.type === 'relay' ? 'selected' : ''}>relay</option>
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
          <div style="display:flex;flex-direction:column;gap:2px;">
            <label style="font-size:.6rem;color:#888;">包含所有节点</label>
            <select data-group="${i}" data-field="include-all" style="padding:4px 6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.65rem;">
              <option value="false" ${!g['include-all'] ? 'selected' : ''}>false</option>
              <option value="true" ${g['include-all'] ? 'selected' : ''}>true</option>
            </select>
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;">
            <label style="font-size:.6rem;color:#888;">过滤关键词</label>
            <input type="text" data-group="${i}" data-field="filter" value="${escapeHtml(g.filter || '')}" placeholder="如 港|台|日" style="padding:4px 6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.65rem;">
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;margin-top:6px;">
          <label style="font-size:.6rem;color:#888;">图标URL</label>
          <input type="text" data-group="${i}" data-field="icon" value="${escapeHtml(g.icon || '')}" style="padding:4px 6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.65rem;font-family:monospace;">
        </div>
        <div style="margin-top:6px;">
          <div style="font-size:.6rem;color:#888;margin-bottom:3px;">成员节点（每行一个，可填节点名或其他代理组名）</div>
          <textarea data-group="${i}" data-field="proxies" rows="${Math.max(2, proxies.length)}" style="width:100%;padding:4px 6px;border-radius:4px;background:rgba(0,0,0,.3);color:#eee;border:1px solid #555;font-size:.65rem;font-family:monospace;box-sizing:border-box;resize:vertical;">${proxies.map(p => escapeHtml(typeof p === 'string' ? p : p.name)).join('\n')}</textarea>
        </div>
      </div>`;
    }
    container.innerHTML = html;

    container.querySelectorAll('[data-group]').forEach(el => {
      el.addEventListener('change', () => {
        const idx = Number(el.dataset.group);
        const field = el.dataset.field;
        if (!Array.isArray(state.parsed['proxy-groups'])) state.parsed['proxy-groups'] = [];
        if (!state.parsed['proxy-groups'][idx]) state.parsed['proxy-groups'][idx] = {};
        if (field === 'proxies') {
          state.parsed['proxy-groups'][idx].proxies = el.value.split('\n').map(s => s.trim()).filter(Boolean);
        } else if (field === 'include-all') {
          state.parsed['proxy-groups'][idx]['include-all'] = el.value === 'true';
        } else {
          state.parsed['proxy-groups'][idx][field] = el.value;
        }
        markDirty();
      });
    });

    container.querySelectorAll(`.${PLUGIN_PREFIX}group_del`).forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.dataset.idx);
        const g = state.parsed['proxy-groups']?.[idx];
        if (!(await askConfirm('删除代理组', `确定要删除代理组「${g?.name || '未命名'}」吗？`))) return;
        if (Array.isArray(state.parsed['proxy-groups'])) {
          state.parsed['proxy-groups'].splice(idx, 1);
          renderProxyGroupsSection();
          markDirty();
        }
      });
    });
    container.querySelectorAll(`.${PLUGIN_PREFIX}group_up`).forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        const groups = state.parsed['proxy-groups'];
        if (idx > 0 && Array.isArray(groups)) {
          [groups[idx - 1], groups[idx]] = [groups[idx], groups[idx - 1]];
          renderProxyGroupsSection();
          markDirty();
        }
      });
    });
    container.querySelectorAll(`.${PLUGIN_PREFIX}group_down`).forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        const groups = state.parsed['proxy-groups'];
        if (Array.isArray(groups) && idx < groups.length - 1) {
          [groups[idx], groups[idx + 1]] = [groups[idx + 1], groups[idx]];
          renderProxyGroupsSection();
          markDirty();
        }
      });
    });
  };

  const renderRawEditSection = () => {
    const editor = document.getElementById(`${PLUGIN_PREFIX}raw_editor`);
    const errorEl = document.getElementById(`${PLUGIN_PREFIX}raw_error_msg`);
    if (!editor) return;
    // 仅在未手动编辑过时填充内容，避免覆盖用户输入
    if (!editor.dataset.touched) {
      editor.value = state.rawText || '';
    }
    if (errorEl) {
      if (state.parseError) {
        errorEl.style.display = 'block';
        errorEl.textContent = '解析错误：' + state.parseError;
      } else {
        errorEl.style.display = 'none';
      }
    }
  };

  const renderAllSections = () => {
    renderBasicSection();
    renderDNSSection();
    renderProvidersSection();
    renderRuleProvidersSection();
    renderRulesSection();
    renderCustomSection();
    renderProxyGroupsSection();
    renderRawEditSection();
  };

  // ═══════════════════════════════════════════════════════════════
  // 配置验证
  // ═══════════════════════════════════════════════════════════════
  const validateConfig = (text) => {
    try {
      const parsed = parseYAML(text);
      // 基本结构检查：必须是对象
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { valid: false, error: '配置根节点必须是键值对结构（YAML mapping），不能是列表或空值' };
      }
      // 检查常见必填字段是否类型正确
      if (parsed['mixed-port'] !== undefined && typeof parsed['mixed-port'] !== 'number') {
        return { valid: false, error: 'mixed-port 必须是数字' };
      }
      if (parsed['allow-lan'] !== undefined && typeof parsed['allow-lan'] !== 'boolean') {
        return { valid: false, error: 'allow-lan 必须是 true/false' };
      }
      if (parsed['proxy-groups'] !== undefined && !Array.isArray(parsed['proxy-groups'])) {
        return { valid: false, error: 'proxy-groups 必须是列表' };
      }
      if (parsed['rules'] !== undefined && !Array.isArray(parsed['rules'])) {
        return { valid: false, error: 'rules 必须是列表' };
      }
      if (parsed['dns'] !== undefined && (typeof parsed['dns'] !== 'object' || Array.isArray(parsed['dns']))) {
        return { valid: false, error: 'dns 必须是键值对结构' };
      }
      return { valid: true, error: null };
    } catch (e) {
      return { valid: false, error: e.message || String(e) };
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 状态管理
  // ═══════════════════════════════════════════════════════════════
  const markDirty = () => {
    state.isDirty = true;
    const indicator = document.getElementById(`${PLUGIN_PREFIX}dirty_indicator`);
    if (indicator) indicator.style.display = 'inline';
    updateStatus();
  };

  const updateStatus = () => {
    const statusEl = document.getElementById(`${PLUGIN_PREFIX}status_text`);
    if (!statusEl) return;
    if (!state.loaded) {
      statusEl.textContent = '未加载配置';
      statusEl.style.color = '#ff9f43';
    } else if (state.parseError) {
      statusEl.textContent = '⚠ 解析失败（原始编辑模式）';
      statusEl.style.color = '#ff6b6b';
    } else if (state.rawEditMode) {
      statusEl.textContent = '原始编辑模式';
      statusEl.style.color = '#ff9f43';
    } else if (state.isDirty) {
      statusEl.textContent = '已修改（未保存）';
      statusEl.style.color = '#ff6b6b';
    } else {
      statusEl.textContent = '已加载，配置完整';
      statusEl.style.color = '#51cf66';
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 导出配置
  // ═══════════════════════════════════════════════════════════════
  const exportConfig = () => {
    const text = state.rawEditMode
      ? (document.getElementById(`${PLUGIN_PREFIX}raw_editor`)?.value || state.rawText)
      : rebuildConfigText();
    const blob = new Blob([text], { type: 'application/x-yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `config_${new Date().toISOString().slice(0, 10)}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    createToast('配置已导出', 'green');
  };

  // ═══════════════════════════════════════════════════════════════
  // 事件绑定
  // ═══════════════════════════════════════════════════════════════
  const bindEvents = () => {
    document.querySelectorAll(`.${PLUGIN_PREFIX}nav_btn`).forEach(btn => {
      btn.addEventListener('click', () => showSection(btn.dataset.section));
    });

    document.getElementById(`${PLUGIN_PREFIX}btn_load`).addEventListener('click', async () => {
      if (!(await checkAdvancedFunc())) return createToast('请先启用高级功能', 'red');
      if (state.isDirty && !(await askConfirm('未保存的修改', '当前有未保存的修改，重新加载会丢失，确定继续吗？'))) return;
      createToast('正在读取配置...', 'yellow');
      try {
        const text = await loadConfigFromDevice();
        parseConfig(text);
        renderAllSections();
        updateStatus();
        if (state.parseError) {
          showSection('raw');
          createToast('配置解析失败，已进入原始编辑模式，可手动修复', 'red', 6000);
        } else {
          showSection('basic');
          createToast('配置加载成功', 'green');
        }
      } catch (e) {
        createToast('加载失败: ' + e.message, 'red');
      }
    });

    document.getElementById(`${PLUGIN_PREFIX}btn_import`).addEventListener('click', () => {
      document.getElementById(`${PLUGIN_PREFIX}file_input`).click();
    });

    document.getElementById(`${PLUGIN_PREFIX}file_input`).addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (state.isDirty && !(await askConfirm('未保存的修改', '当前有未保存的修改，导入新配置会覆盖，确定继续吗？'))) {
        e.target.value = '';
        return;
      }
      try {
        const text = await file.text();
        parseConfig(text);
        renderAllSections();
        updateStatus();
        if (state.parseError) {
          showSection('raw');
          createToast('配置解析失败，已进入原始编辑模式，可手动修复', 'red', 6000);
        } else {
          showSection('basic');
          createToast('配置导入成功', 'green');
        }
      } catch (err) {
        createToast('导入失败: ' + err.message, 'red');
      }
      e.target.value = '';
    });

    document.getElementById(`${PLUGIN_PREFIX}btn_export`).addEventListener('click', () => {
      if (!state.loaded) return createToast('请先加载或导入配置', 'red');
      exportConfig();
    });

    document.getElementById(`${PLUGIN_PREFIX}btn_save`).addEventListener('click', async () => {
      if (!state.loaded) return createToast('请先加载或导入配置', 'red');
      if (!(await checkAdvancedFunc())) return createToast('请先启用高级功能', 'red');
      // 保存前验证
      let configText;
      if (state.rawEditMode) {
        configText = document.getElementById(`${PLUGIN_PREFIX}raw_editor`)?.value || state.rawText;
      } else {
        configText = rebuildConfigText();
      }
      const check = validateConfig(configText);
      if (!check.valid) {
        if (!(await askConfirm('配置验证未通过', `验证失败：${check.error}\n\n是否仍要强制保存？（可能导致猫猫内核启动失败）`))) return;
      } else {
        createToast('配置验证通过', 'green', 2000);
      }
      if (!(await askConfirm('保存并重启', '确定要保存当前配置并重启猫猫内核吗？保存前会自动备份原配置到 uploads 目录。'))) return;
      try {
        createToast('正在保存配置...', 'yellow');
        // 原始编辑模式下，直接保存编辑器内容
        if (state.rawEditMode) {
          state.rawText = configText;
          const ts = Date.now();
          const backupFile = `${UPLOAD_DIR}/mm_config_backup_${ts}.yaml`;
          await runShellWithRoot(`cp ${CONFIG_PATH} ${backupFile}`);
          const tempFile = `${UPLOAD_DIR}/mm_config_temp_${ts}.yaml`;
          await runShellWithRoot(`cat > ${tempFile} << 'YAMLEOF'\n${configText}\nYAMLEOF`);
          await runShellWithRoot(`mv ${tempFile} ${CONFIG_PATH}`);
        } else {
          await saveConfigToDevice();
        }
        createToast('配置已保存，正在重启内核...', 'green', 5000);
        await restartClash();
        state.isDirty = false;
        // 保存后重新解析，确保状态同步
        try {
          parseConfig(configText);
          renderAllSections();
        } catch (_) {}
        updateStatus();
      } catch (e) {
        createToast('保存失败: ' + e.message, 'red');
      }
    });

    document.getElementById(`${PLUGIN_PREFIX}btn_backup`).addEventListener('click', async () => {
      if (!(await checkAdvancedFunc())) return createToast('请先启用高级功能', 'red');
      await backupConfig();
    });

    document.getElementById(`${PLUGIN_PREFIX}btn_raw`).addEventListener('click', () => {
      if (!state.loaded) return createToast('请先加载配置', 'red');
      const text = state.rawEditMode
        ? (document.getElementById(`${PLUGIN_PREFIX}raw_editor`)?.value || state.rawText)
        : rebuildConfigText();
      const { el, close } = createFixedToast(
        PLUGIN_PREFIX + 'raw_view',
        `<div style="pointer-events:all;width:90vw;max-width:800px;">
          <div class="title" style="margin:0">原始配置预览（YAML）${state.rawEditMode ? ' - 原始编辑模式' : ''}</div>
          <textarea readonly style="width:100%;height:60vh;margin-top:10px;background:#000;color:#0f0;font-family:monospace;font-size:.7rem;border:1px solid #333;border-radius:6px;padding:8px;box-sizing:border-box;">${escapeHtml(text)}</textarea>
          <div style="text-align:right;margin-top:8px;">
            <button class="cancel" style="font-size:.7rem">关闭</button>
          </div>
        </div>`,
      );
      el.querySelector('.cancel')?.addEventListener('click', close);
    });

    // 验证配置按钮（可视化模式下验证重建后的配置）
    document.getElementById(`${PLUGIN_PREFIX}btn_validate`).addEventListener('click', () => {
      if (!state.loaded) return createToast('请先加载或导入配置', 'red');
      const text = state.rawEditMode
        ? (document.getElementById(`${PLUGIN_PREFIX}raw_editor`)?.value || state.rawText)
        : rebuildConfigText();
      const check = validateConfig(text);
      if (check.valid) {
        createToast('✅ 配置验证通过，YAML 结构合法', 'green', 4000);
      } else {
        createToast('❌ 验证失败：' + check.error, 'red', 6000);
      }
    });

    // 原始编辑器：标记已手动编辑
    const rawEditor = document.getElementById(`${PLUGIN_PREFIX}raw_editor`);
    if (rawEditor) {
      rawEditor.addEventListener('input', () => {
        rawEditor.dataset.touched = '1';
        state.isDirty = true;
        state.rawEditMode = true;
        updateStatus();
      });
    }

    // 重新解析按钮：用编辑器中的文本重新解析，恢复可视化模式
    document.getElementById(`${PLUGIN_PREFIX}btn_reparse`).addEventListener('click', () => {
      const text = document.getElementById(`${PLUGIN_PREFIX}raw_editor`)?.value;
      if (!text) return createToast('编辑器内容为空', 'red');
      const check = validateConfig(text);
      if (!check.valid) {
        createToast('解析失败：' + check.error + '，请检查 YAML 格式', 'red', 6000);
        state.parseError = check.error;
        state.rawText = text;
        updateStatus();
        return;
      }
      parseConfig(text);
      // 清除 touched 标记，下次进入原始编辑时重新填充
      const editor = document.getElementById(`${PLUGIN_PREFIX}raw_editor`);
      if (editor) delete editor.dataset.touched;
      renderAllSections();
      updateStatus();
      showSection('basic');
      createToast('✅ 解析成功，已恢复可视化编辑模式', 'green', 4000);
    });

    // 原始编辑器内的验证按钮
    document.getElementById(`${PLUGIN_PREFIX}btn_validate_raw`).addEventListener('click', () => {
      const text = document.getElementById(`${PLUGIN_PREFIX}raw_editor`)?.value || '';
      const check = validateConfig(text);
      if (check.valid) {
        createToast('✅ YAML 格式正确', 'green', 3000);
      } else {
        createToast('❌ ' + check.error, 'red', 5000);
      }
    });

    document.getElementById(`${PLUGIN_PREFIX}btn_add_provider`).addEventListener('click', async () => {
      const name = prompt('请输入订阅名称（如 provider3）：');
      if (!name) return;
      if (state.parsed['proxy-providers']?.[name]) {
        return createToast('该名称已存在', 'red');
      }
      const url = prompt('请输入订阅链接：');
      if (!url) return;
      if (!state.parsed['proxy-providers']) state.parsed['proxy-providers'] = {};
      state.parsed['proxy-providers'][name] = {
        type: 'http',
        url: url,
        path: `./proxies/${name}.yaml`,
        interval: 3600,
        'health-check': { enable: true, interval: 900, url: 'https://www.gstatic.com/generate_204' },
      };
      renderProvidersSection();
      markDirty();
      createToast('订阅已添加', 'green');
    });

    document.getElementById(`${PLUGIN_PREFIX}btn_add_rule_provider`).addEventListener('click', async () => {
      const name = prompt('请输入规则集名称（如 myRules）：');
      if (!name) return;
      if (state.parsed['rule-providers']?.[name]) {
        return createToast('该名称已存在', 'red');
      }
      const behavior = prompt('请输入行为类型（domain / ipcidr / classical）：', 'domain');
      if (!behavior) return;
      const url = prompt('请输入规则集URL（可选，本地文件可留空）：') || '';
      if (!state.parsed['rule-providers']) state.parsed['rule-providers'] = {};
      const rp = {
        behavior: behavior,
        format: behavior === 'classical' ? 'yaml' : 'mrs',
        type: url ? 'http' : 'file',
        path: `./rules/${name}.${behavior === 'classical' ? 'yaml' : 'mrs'}`,
        interval: 86400,
      };
      if (url) rp.url = url;
      state.parsed['rule-providers'][name] = rp;
      renderRuleProvidersSection();
      markDirty();
      createToast('规则集已添加', 'green');
    });

    document.getElementById(`${PLUGIN_PREFIX}btn_add_rule`).addEventListener('click', async () => {
      const rule = prompt('请输入规则（如 DOMAIN-SUFFIX,google.com,选择节点）：');
      if (!rule) return;
      if (!Array.isArray(state.parsed['rules'])) state.parsed['rules'] = [];
      state.parsed['rules'].push(rule);
      renderRulesSection();
      markDirty();
      createToast('规则已添加', 'green');
    });

    document.getElementById(`${PLUGIN_PREFIX}btn_add_group`).addEventListener('click', async () => {
      const name = prompt('请输入代理组名称：');
      if (!name) return;
      if (!Array.isArray(state.parsed['proxy-groups'])) state.parsed['proxy-groups'] = [];
      state.parsed['proxy-groups'].push({
        name: name,
        type: 'select',
        proxies: ['DIRECT'],
      });
      renderProxyGroupsSection();
      markDirty();
      createToast('代理组已添加', 'green');
    });

    document.getElementById(`${PLUGIN_PREFIX}btn_add_custom`).addEventListener('click', () => {
      const type = document.getElementById(`${PLUGIN_PREFIX}custom_type`).value;
      const value = document.getElementById(`${PLUGIN_PREFIX}custom_value`).value.trim();
      const policy = document.getElementById(`${PLUGIN_PREFIX}custom_policy`).value;

      if (!value) return createToast('请输入内容', 'red');

      let rule;
      if (type === 'domain') {
        rule = `DOMAIN-SUFFIX,${value},${policy}`;
      } else if (type === 'ip') {
        rule = `IP-CIDR,${value},${policy},no-resolve`;
      } else if (type === 'keyword') {
        rule = `DOMAIN-KEYWORD,${value},${policy}`;
      }

      state.customRules.push(rule);
      document.getElementById(`${PLUGIN_PREFIX}custom_value`).value = '';
      renderCustomSection();
      renderRulesSection();
      markDirty();
      createToast('自定义规则已添加', 'green');
    });
  };

  const showSection = (name) => {
    document.querySelectorAll('[id^="' + PLUGIN_PREFIX + 'section_"]').forEach(el => {
      el.style.display = 'none';
    });
    const target = document.getElementById(`${PLUGIN_PREFIX}section_${name}`);
    if (target) target.style.display = 'block';

    document.querySelectorAll(`.${PLUGIN_PREFIX}nav_btn`).forEach(btn => {
      btn.classList.remove('active');
      btn.style.background = '';
    });
    const activeBtn = document.querySelector(`.${PLUGIN_PREFIX}nav_btn[data-section="${name}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.style.background = 'var(--dark-btn-color-active)';
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 初始化
  // ═══════════════════════════════════════════════════════════════
  const init = async () => {
    const waitForUFI = () => new Promise(resolve => {
      if (typeof UFI_DATA !== 'undefined' && UFI_DATA.lan_ipaddr) return resolve();
      const timer = setInterval(() => {
        if (typeof UFI_DATA !== 'undefined' && UFI_DATA.lan_ipaddr) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
      setTimeout(() => { clearInterval(timer); resolve(); }, 5000);
    });
    await waitForUFI();

    const mmContainer = document.querySelector('.functions-container');
    if (!mmContainer) {
      console.error(PLUGIN_PREFIX + ': .functions-container not found');
      return;
    }

    mmContainer.insertAdjacentHTML('afterend', `
      <div id="${PLUGIN_PREFIX}wrapper" style="width:100%;margin-top:10px;">
        <div class="title" style="margin:6px 0;">
          <strong>🎛️ 猫猫配置可视化编辑器 v2.0</strong>
          <div style="display:inline-block;" id="${PLUGIN_PREFIX}collapse_btn"></div>
        </div>
        <div class="collapse" id="${PLUGIN_PREFIX}collapse" data-name="close" style="height:0;overflow:hidden;">
          <div class="collapse_box">
            ${buildStatusBar()}
            ${buildActionBar()}
            ${buildSectionNav()}
            ${buildBasicSection()}
            ${buildDNSSection()}
            ${buildProviderSection()}
            ${buildRuleProviderSection()}
            ${buildRulesSection()}
            ${buildCustomSection()}
            ${buildProxyGroupSection()}
            ${buildRawEditSection()}
            <div style="margin-top:16px;padding:10px;border-radius:8px;background:rgba(255,159,67,.06);border:1px solid rgba(255,159,67,.15);font-size:.68rem;color:#ff9f43;line-height:1.7;">
              <b>💡 使用提示</b><br>
              1. 首次使用请点击「读取当前配置」加载设备上的猫猫配置<br>
              2. 所有区域均可直接编辑，修改后状态会显示「已修改（未保存）」<br>
              3. 规则集、代理规则、代理组均支持添加、删除、修改操作，代理组支持上下排序<br>
              4. 自定义规则支持域名/IP/关键词三种方式，自动插入到规则列表<br>
              5. 点击「验证配置」可提前检查 YAML 格式是否正确<br>
              6. 若配置解析失败，会自动进入「原始编辑」模式，可手动修复后点击「重新解析」恢复可视化<br>
              7. 点击「导出配置」可下载当前 YAML 配置文件<br>
              8. 点击「保存并重启」生效，保存前自动验证并备份原配置到 uploads 目录<br>
              9. 插件使用过程可能会出现BUG，编辑前先在猫猫那里备份配置<br>
              10. 如配置异常，可在 uploads 目录找到备份文件恢复
            </div>
          </div>
        </div>
      </div>
    `);

    collapseGen(`#${PLUGIN_PREFIX}collapse_btn`, `#${PLUGIN_PREFIX}collapse`, `#${PLUGIN_PREFIX}collapse`, () => {});

    bindEvents();
    showSection('basic');
    updateStatus();
  };

  await init();
})();