
    const timerInput = document.getElementById('timer-input');
    const timerControls = document.querySelector('.timer-controls');
    
    let countdownInterval;
    let totalSeconds = 0;
    // 开始倒计时
    function startCountdown() {
        // 清除之前的倒计时
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        
        // 获取输入的时间值
        const timeValue = timerInput.value;
        if (!timeValue) {
            // 如果没有输入时间，默认使用1分钟
            console.log("无时间输入");
            return 0;
        } else {
            // 解析HH:MM:SS格式
            const parts = timeValue.split(':').map(Number);
            totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        
        // 如果时间为0，不启动倒计时
        if (totalSeconds <= 0) {
            countdownDisplay.textContent = '请设置有效时间';
            return;
        }
        
        // 启动倒计时
        countdownInterval = setInterval(() => {
            totalSeconds--;
           // 获取当前时间
            var timeString = formatTime1(totalSeconds);
        // 设置时间输入框的值
              console.log("totalSeconds",totalSeconds);
            console.log("totalSeconds",timeString);
             timerInput.value = timeString;
        //  timerInput.value =  totalSeconds ;
            // 倒计时结束
            if (totalSeconds <= 0) {
                clearInterval(countdownInterval);
                
                showMessage('设定时间结束','warning');
                
            }
        }, 1000);
    }
    function clearTime()
    {
     
       timerInput.value = '00:00:00';
       clearInterval(countdownInterval);

       
    }
    // 显示通知
    function showNotification(message) {
        const notification = document.getElementById('message-notification');
        const messageText = document.getElementById('message-text');
        
        if (notification && messageText) {
            messageText.textContent = message;
            notification.classList.remove('message-hidden');
            
            // 3秒后自动隐藏
            setTimeout(() => {
                notification.classList.add('message-hidden');
            }, 3000);
        }
    }
        
    // 格式化秒数为HH:MM:SS
    function formatTime1(seconds) {
       // console.log("ssss",seconds)
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
      //  console.log("minutes",minutes,minutes);
        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    }
    