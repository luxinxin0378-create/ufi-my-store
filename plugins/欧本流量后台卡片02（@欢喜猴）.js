<script>
(() => {
  // 从localStorage获取保存的充值号
  let cardNumber = localStorage.getItem('obn_card_number') || '欧本充值号';
  let isBound = cardNumber && cardNumber !== '欧本充值号';
  
  const netCard = document.querySelector('.net-card');
  if (!netCard) return;
  
  const container = document.createElement('div');
  container.id = 'OBN_TRAFFIC_MONITOR';
  
  Object.assign(container.style, {
    width: '100%',
    marginTop: '8px',
    marginBottom: '15px',
    position: 'relative'
  });
  
  container.innerHTML = `
<div style="width: 100%;">
    <div class="title" style="margin: 4px 0; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="color:#ffffff; font-size: 14px; font-weight: 600;">📊 欧本流量后台</strong>
            <div style="display: inline-block;" id="collapse_obn_btn"></div>
        </div>
    </div>

    <div class="collapse" id="collapse_obn" data-name="close" style="height: 0px; overflow: hidden;">
        <div class="collapse_box" style="background: var(--dark-card-bg); backdrop-filter: blur(20px); border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <div id="cardStatus" style="font-size: .75rem; padding: 3px 8px; border-radius: 4px; background: rgba(82, 239, 88, 0.2); color: #52ef58; font-weight: 600;">查询中...</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button id="bind_obn_btn" class="btn" style="padding: 3px 10px; font-size: .75rem; background: rgba(255, 0, 0, 0.2); border: 1px solid rgba(255, 0, 0, 0.3); color: #FF0000; font-weight: 600; border-radius: 6px;">未绑定</button>
                    <button id="refresh_obn_btn" class="btn" style="padding: 3px 10px; font-size: .75rem; background: rgba(82, 239, 88, 0.2); border: 1px solid rgba(82, 239, 88, 0.3); color: #52ef58; font-weight: 600; border-radius: 6px;">刷新</button>
                </div>
            </div>

            <div class="obn_traffic_grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px;">
                <div style="text-align: center; padding: 12px; background: rgba(0, 229, 255, 0.1); border-radius: 8px; border: 1px solid rgba(0, 229, 255, 0.2);">
                    <div style="font-size: .75rem; color: #ffffff; margin-bottom: 6px; font-weight: 600;">总流量</div>
                    <div id="totalValue" style="font-size: 20px; font-weight: bold; color: #00e5ff;">0.00 <span style="font-size: 12px; color: rgba(255, 255, 255, 0.8);">G</span></div>
                </div>
                
                <div id="remainingContainer" style="text-align: center; padding: 12px; background: rgba(82, 239, 88, 0.1); border-radius: 8px; border: 1px solid rgba(82, 239, 88, 0.2);">
                    <div style="font-size: .75rem; color: #ffffff; margin-bottom: 6px; font-weight: 600;">剩余流量</div>
                    <div id="remainingValue" style="font-size: 20px; font-weight: bold; color: #52ef58;">0.00 <span style="font-size: 12px; color: rgba(255, 255, 255, 0.8);">G</span></div>
                </div>
                
                <div id="usedContainer" style="text-align: center; padding: 12px; background: rgba(255, 105, 180, 0.15); border-radius: 8px; border: 1px solid rgba(255, 105, 180, 0.3);">
                    <div style="font-size: .75rem; color: #ffffff; margin-bottom: 6px; font-weight: 600;">已用流量</div>
                    <div id="usedValue" style="font-size: 20px; font-weight: bold; color: #FF69B4;">0.00 <span style="font-size: 12px; color: rgba(255, 255, 255, 0.8);">G</span></div>
                </div>
            </div>

            <div style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="font-size: .8rem; color: #ffffff; font-weight: 600;">流量已使用</div>
                    <div style="display: flex; gap: 12px; font-size: .7rem; color: #ffffff;">
                        <div id="refreshTime" style="display: flex; align-items: center; gap: 2px;">
                            <span style="opacity: 0.8;">更新:</span>
                            <span id="refreshText" style="font-weight: 600;">--:--</span>
                        </div>
                        <div id="expireDate" style="display: flex; align-items: center; gap: 2px;">
                            <span style="opacity: 0.8;">到期:</span>
                            <span id="expireText" style="font-weight: 600;">--</span>
                        </div>
                    </div>
                </div>
                
                <div style="position: relative; width: 100%; height: 18px; background: rgba(0, 0, 0, 0.2); border-radius: 9px; overflow: hidden; margin-bottom: 8px;">
                    <div id="progressBar" style="height: 100%; width: 0%; border-radius: 9px; background: linear-gradient(90deg, #52ef58 0%, #FF69B4 50%, #f44336 100%); transition: width 0.5s ease;"></div>
                    <div id="progressText" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: #ffffff;">0%</div>
                </div>
            </div>
        </div>
    </div>
</div>
`;
  
  const functionsContainer = document.querySelector('.functions-container');
  if (functionsContainer) {
    functionsContainer.insertAdjacentElement("afterend", container);
  } else {
    netCard.parentNode.insertBefore(container, netCard.nextSibling);
  }
  
  const style = document.createElement('style');
  style.textContent = `
#OBN_TRAFFIC_MONITOR { 
    font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial; 
    border-radius: 6px;
    width: 100%;
    box-sizing: border-box;
}

#OBN_TRAFFIC_MONITOR .collapse_box{ 
    padding: 6px; 
    backdrop-filter: blur(20px);
    background: var(--dark-card-bg);
    border-radius: 10px;
}

#OBN_TRAFFIC_MONITOR .btn{ 
    background: transparent; 
    border: 1px solid rgba(255,255,255,0.2);
    padding: 3px 10px; 
    border-radius: 6px; 
    cursor: pointer; 
    color: var(--dark-text-color); 
    font-weight: 600; 
    font-size: .75rem; 
    transition: all 0.2s ease;
}
#OBN_TRAFFIC_MONITOR .btn:hover{ 
    background: rgba(255,255,255,0.1);
    transform: translateY(-1px);
}

#OBN_TRAFFIC_MONITOR .btn:active { 
    transform: scale(0.98); 
}

/* 绑定按钮样式 */
#bind_obn_btn.bound {
    background: rgba(82, 239, 88, 0.2) !important;
    border: 1px solid rgba(82, 239, 88, 0.3) !important;
    color: #52ef58 !important;
}

/* 针对亮黄色在手机上显示问题的修复 */
#OBN_TRAFFIC_MONITOR .remaining-yellow {
    background: rgba(255, 214, 0, 0.2) !important;
    border: 1px solid rgba(255, 214, 0, 0.4) !important;
}

#OBN_TRAFFIC_MONITOR .remaining-yellow div:last-child {
    color: #FFD600 !important;
}

@media (max-width: 768px) {
    #OBN_TRAFFIC_MONITOR {
        padding: 0 4px;
    }
    
    #OBN_TRAFFIC_MONITOR .title {
        flex-wrap: wrap;
        gap: 8px;
    }
    
    .obn_traffic_grid {
        grid-template-columns: 1fr 1fr 1fr !important;
        gap: 8px !important;
    }
}

@media (max-width: 480px) {
    .obn_traffic_grid {
        grid-template-columns: 1fr 1fr 1fr !important;
        gap: 6px !important;
    }
    
    .obn_traffic_grid > div {
        padding: 8px !important;
    }
    
    .obn_traffic_grid > div div:first-child {
        font-size: .7rem !important;
    }
    
    .obn_traffic_grid > div div:last-child {
        font-size: 16px !important;
    }
}

@media (max-width: 340px) {
    .obn_traffic_grid {
        grid-template-columns: 1fr 1fr 1fr !important;
        gap: 4px !important;
    }
    
    .obn_traffic_grid > div {
        padding: 6px !important;
    }
    
    .obn_traffic_grid > div div:last-child {
        font-size: 14px !important;
    }
}
`;
  document.head.appendChild(style);
  
  // 绑定功能相关函数
  function updateBindButton() {
    const bindButton = document.getElementById('bind_obn_btn');
    if (!bindButton) return;
    
    if (isBound && cardNumber && cardNumber !== '欧本充值号') {
      bindButton.textContent = '已绑定';
      bindButton.style.background = 'rgba(82, 239, 88, 0.2)';
      bindButton.style.border = '1px solid rgba(82, 239, 88, 0.3)';
      bindButton.style.color = '#52ef58';
      bindButton.classList.add('bound');
    } else {
      bindButton.textContent = '未绑定';
      bindButton.style.background = 'rgba(255, 0, 0, 0.2)';
      bindButton.style.border = '1px solid rgba(255, 0, 0, 0.3)';
      bindButton.style.color = '#FF0000';
      bindButton.classList.remove('bound');
    }
  }
  
  function showBindDialog() {
    const currentValue = isBound && cardNumber !== '欧本充值号' ? cardNumber : '';
    const userInput = prompt('请输入欧本充值号：', currentValue);
    
    if (userInput === null) {
      // 用户点击了取消
      return;
    }
    
    if (userInput.trim() === '') {
      // 用户没有输入内容
      alert('请输入有效的欧本充值号！');
      return;
    }
    
    // 保存到localStorage
    cardNumber = userInput.trim();
    localStorage.setItem('obn_card_number', cardNumber);
    isBound = true;
    
    // 更新绑定按钮
    updateBindButton();
    
    // 重新获取数据
    fetchTrafficData(true);
  }
  
  let lastRefreshTime = '--:--';
  
  function updateRefreshTime() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    lastRefreshTime = `${year}-${month}-${day} ${hours}:${minutes}`;
    
    const refreshTextElement = document.getElementById('refreshText');
    if (refreshTextElement) {
      refreshTextElement.textContent = lastRefreshTime;
    }
  }
  
  function updateRemainingContainerStyle(remainingGB, totalGB) {
    const remainingContainer = document.getElementById('remainingContainer');
    const remainingValue = document.getElementById('remainingValue');
    
    if (!remainingContainer || !remainingValue || totalGB <= 0) return;
    
    const remaining = parseFloat(remainingGB);
    const percentage = (remaining / totalGB) * 100;
    
    // 移除所有可能的特殊类
    remainingContainer.classList.remove('remaining-yellow');
    
    if (percentage >= 60) {
      // 剩余60%以上：绿色
      remainingContainer.style.background = 'rgba(82, 239, 88, 0.1)';
      remainingContainer.style.border = '1px solid rgba(82, 239, 88, 0.2)';
      remainingValue.style.color = '#52ef58';
    } else if (percentage >= 40) {
      // 剩余40%-60%：亮黄色
      remainingContainer.style.background = 'rgba(255, 214, 0, 0.2)';
      remainingContainer.style.border = '1px solid rgba(255, 214, 0, 0.4)';
      remainingValue.style.color = '#FFD600';
      remainingContainer.classList.add('remaining-yellow');
    } else if (percentage >= 20) {
      // 剩余20%-40%：橙色
      remainingContainer.style.background = 'rgba(255, 165, 0, 0.1)';
      remainingContainer.style.border = '1px solid rgba(255, 165, 0, 0.2)';
      remainingValue.style.color = '#FFA500';
    } else if (percentage >= 0) {
      // 剩余0%-20%：红色
      remainingContainer.style.background = 'rgba(255, 0, 0, 0.1)';
      remainingContainer.style.border = '1px solid rgba(255, 0, 0, 0.2)';
      remainingValue.style.color = '#FF0000';
    } else {
      // 负数或其他异常情况：默认绿色
      remainingContainer.style.background = 'rgba(82, 239, 88, 0.1)';
      remainingContainer.style.border = '1px solid rgba(82, 239, 88, 0.2)';
      remainingValue.style.color = '#52ef58';
    }
  }
  
  function fetchTrafficData(forceRefresh = true) {
    // 更新状态为查询中
    const statusElement = document.getElementById('cardStatus');
    if (statusElement) {
      statusElement.textContent = '查询中...';
      statusElement.style.background = 'rgba(82, 239, 88, 0.2)';
      statusElement.style.color = '#52ef58';
    }
    
    // 添加时间戳参数强制刷新，避免浏览器缓存
    const timestamp = new Date().getTime();
    const url = `http://wifi.zhongtianiot.com/api/card/intelligentDetection?dev_no=${cardNumber}&callback=handleTrafficData&_=${timestamp}`;
    
    // 移除之前可能存在的相同回调函数
    if (window.handleTrafficData) {
      delete window.handleTrafficData;
    }
    
    // 重新定义回调函数
    window.handleTrafficData = function(response) {
      const statusElement = document.getElementById('cardStatus');
      const expireTextElement = document.getElementById('expireText');
      const progressBar = document.getElementById('progressBar');
      const progressText = document.getElementById('progressText');
      
      if (response.code === 1 && response.data) {
        const data = response.data;
        const totalGB = (data.totalAmount / 1024).toFixed(1);
        const remainingGB = (data.surplus / 1024).toFixed(1);
        const usedGB = ((data.totalAmount - data.surplus) / 1024).toFixed(1);
        const usedPercentage = ((data.totalAmount - data.surplus) / data.totalAmount * 100).toFixed(1);
        const remainingPercentage = (data.surplus / data.totalAmount * 100).toFixed(1);
        
        const totalValue = document.getElementById('totalValue');
        const remainingValue = document.getElementById('remainingValue');
        const usedValue = document.getElementById('usedValue');
        
        if (totalValue) totalValue.innerHTML = `${totalGB} <span style="font-size: 12px; color: rgba(255, 255, 255, 0.8);">G</span>`;
        if (remainingValue) remainingValue.innerHTML = `${remainingGB} <span style="font-size: 12px; color: rgba(255, 255, 255, 0.8);">G</span>`;
        if (usedValue) usedValue.innerHTML = `${usedGB} <span style="font-size: 12px; color: rgba(255, 255, 255, 0.8);">G</span>`;
        
        if (progressBar) progressBar.style.width = `${usedPercentage}%`;
        if (progressText) progressText.innerHTML = `${usedPercentage}%`;
        
        // 使用新的百分比逻辑更新剩余流量颜色
        updateRemainingContainerStyle(parseFloat(remainingGB), parseFloat(totalGB));
        
        if (expireTextElement && data.expiretime) {
          const expireDate = data.expiretime.split(' ')[0];
          expireTextElement.textContent = `${expireDate}`;
        }
        
        if (statusElement) {
          if (data.description === '该卡状态正常') {
            statusElement.textContent = '状态正常';
            statusElement.style.background = 'rgba(82, 239, 88, 0.2)';
            statusElement.style.color = '#52ef58';
          } else {
            statusElement.textContent = '状态异常';
            statusElement.style.background = 'rgba(245, 67, 54, 0.2)';
            statusElement.style.color = '#f44336';
          }
        }
        
        // 只有在成功获取数据时才更新时间
        updateRefreshTime();
        
      } else {
        // 查询失败时，所有流量值都显示为0.00
        const totalValue = document.getElementById('totalValue');
        const remainingValue = document.getElementById('remainingValue');
        const usedValue = document.getElementById('usedValue');
        
        if (totalValue) totalValue.innerHTML = `0.00 <span style="font-size: 12px; color: rgba(255, 255, 255, 0.8);">G</span>`;
        if (remainingValue) remainingValue.innerHTML = `0.00 <span style="font-size: 12px; color: rgba(255, 255, 255, 0.8);">G</span>`;
        if (usedValue) usedValue.innerHTML = `0.00 <span style="font-size: 12px; color: rgba(255, 255, 255, 0.8);">G</span>`;
        
        if (statusElement) {
          statusElement.textContent = '查询失败';
          statusElement.style.background = 'rgba(250, 84, 28, 0.2)';
          statusElement.style.color = '#fa541c';
        }
        
        if (expireTextElement) {
          expireTextElement.textContent = '--';
        }
        if (progressBar) {
          progressBar.style.width = '0%';
        }
        if (progressText) {
          progressText.innerHTML = '0%';
        }
        
        const remainingContainer = document.getElementById('remainingContainer');
        if (remainingContainer && remainingValue) {
          remainingContainer.style.background = 'rgba(82, 239, 88, 0.1)';
          remainingContainer.style.border = '1px solid rgba(82, 239, 88, 0.2)';
          remainingValue.style.color = '#52ef58';
        }
        
        // 已绑定但没有查询到数据时提示
        if (isBound) {
          alert('请绑定正确的充值号');
        }
        
        // 查询失败时不更新时间
      }
    };
    
    const script = document.createElement('script');
    script.src = url;
    
    // 移除之前可能存在的相同脚本
    const existingScript = document.querySelector(`script[src*="intelligentDetection"]`);
    if (existingScript) {
      document.head.removeChild(existingScript);
    }
    
    script.onload = function() {
      // 请求成功后移除脚本
      setTimeout(() => {
        if (script.parentNode) {
          document.head.removeChild(script);
        }
      }, 100);
    };
    
    script.onerror = function() {
      // 请求失败时也移除脚本
      if (script.parentNode) {
        document.head.removeChild(script);
      }
      
      const statusElement = document.getElementById('cardStatus');
      if (statusElement) {
        statusElement.textContent = '查询失败';
        statusElement.style.background = 'rgba(250, 84, 28, 0.2)';
        statusElement.style.color = '#fa541c';
      }
      
      // 已绑定但没有查询到数据时提示
      if (isBound) {
        alert('请绑定正确的充值号');
      }
      
      // 网络错误时不更新时间
    };
    
    document.head.appendChild(script);
  }

  // 初始化绑定按钮
  updateBindButton();
  
  const refreshButton = document.getElementById('refresh_obn_btn');
  if (refreshButton) {
    refreshButton.onclick = function() {
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = 'scale(1)';
      }, 150);
      // 强制重新获取最新数据
      fetchTrafficData(true);
    };
  }
  
  const bindButton = document.getElementById('bind_obn_btn');
  if (bindButton) {
    bindButton.onclick = function() {
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = 'scale(1)';
      }, 150);
      showBindDialog();
    };
  }

  if (typeof collapseGen === 'function') {
    collapseGen("#collapse_obn_btn", "#collapse_obn", "#collapse_obn", () => { });
  } else {
    const collapseBtn = document.getElementById('collapse_obn_btn');
    const collapseElement = document.getElementById('collapse_obn');
    
    if (collapseBtn && collapseElement) {
      collapseBtn.innerHTML = '<button class="btn" style="padding: 2px 6px; font-size: .8rem;">展开</button>';
      collapseBtn.onclick = () => {
        const isClosed = collapseElement.getAttribute('data-name') === 'close';
        if (isClosed) {
          collapseElement.style.height = 'auto';
          collapseElement.setAttribute('data-name', 'open');
          collapseBtn.innerHTML = '<button class="btn" style="padding: 2px 6px; font-size: .8rem;">收起</button>';
        } else {
          collapseElement.style.height = '0px';
          collapseElement.setAttribute('data-name', 'close');
          collapseBtn.innerHTML = '<button class="btn" style="padding: 2px 6px; font-size: .8rem;">展开</button>';
        }
      };
    }
  }

  // 初始加载数据
  fetchTrafficData();
  
  // 30分钟自动刷新
  setTimeout(fetchTrafficData, 30 * 60 * 1000);
})();
</script>