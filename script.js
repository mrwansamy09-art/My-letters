// ========== تهيئة التطبيق ==========
document.addEventListener('DOMContentLoaded', function() {
    // العناصر الرئيسية
    const canvas = document.getElementById('tracingCanvas');
    const ctx = canvas.getContext('2d');
    const feedbackMessage = document.getElementById('feedbackMessage');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const resetButton = document.getElementById('resetButton');
    const nextButton = document.getElementById('nextButton');
    const instructionOverlay = document.getElementById('instructionOverlay');

    // ========== إعدادات الحرف ==========
    const letterConfig = {
        name: 'الألف',
        character: 'أ',
        path: [
            { x: 250, y: 400 },  // نقطة البداية (أسفل)
            { x: 250, y: 350 },
            { x: 250, y: 300 },
            { x: 250, y: 250 },
            { x: 250, y: 200 },
            { x: 250, y: 150 },
            { x: 250, y: 100 }   // نقطة النهاية (أعلى)
        ],
        guideColor: '#e2e8f0',    // رمادي فاتح للمسار
        traceColor: '#2b6cb0',    // أزرق للرسم
        successColor: '#38a169',  // أخضر للإكمال
        dotRadius: 15,            // حجم النقاط الإرشادية
        lineWidth: 12,            // عرض خط الرسم
        tolerance: 25             // مسافة السماح عن المسار (بكسل)
    };

    // ========== حالة التطبيق ==========
    let appState = {
        isDrawing: false,
        userPath: [],
        progress: 0,
        isCompleted: false,
        currentPointIndex: 0
    };

    // ========== 1. رسم المسار الإرشادي ==========
    function drawGuidePath() {
        // مسح الكانفس
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // رسم المسار الرئيسي (خط منقط)
        ctx.setLineDash([20, 15]);
        ctx.strokeStyle = letterConfig.guideColor;
        ctx.lineWidth = letterConfig.lineWidth;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(letterConfig.path[0].x, letterConfig.path[0].y);
        
        for (let i = 1; i < letterConfig.path.length; i++) {
            ctx.lineTo(letterConfig.path[i].x, letterConfig.path[i].y);
        }
        
        ctx.stroke();
        ctx.setLineDash([]); // إعادة الخط العادي
        
        // رسم النقاط الإرشادية
        letterConfig.path.forEach((point, index) => {
            // دائرة كبيرة زرقاء
            ctx.fillStyle = index === 0 ? '#e53e3e' : letterConfig.traceColor; // نقطة البداية حمراء
            ctx.beginPath();
            ctx.arc(point.x, point.y, letterConfig.dotRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // دائرة بيضاء صغيرة داخل الكبيرة
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(point.x, point.y, letterConfig.dotRadius / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // رقم النقطة (للتوجيه)
            ctx.fillStyle = '#2d3748';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(index + 1, point.x, point.y);
        });
        
        // رسم سهم البداية
        drawArrow(
            letterConfig.path[0].x, 
            letterConfig.path[0].y + 35,
            letterConfig.path[0].x,
            letterConfig.path[0].y,
            '#e53e3e'
        );
    }

    // ========== 2. دالة رسم السهم ==========
    function drawArrow(fromX, fromY, toX, toY, color) {
        const headlen = 20;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);
        
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 5;
        
        // جسم السهم
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        
        // رأس السهم
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - headlen * Math.cos(angle - Math.PI / 6),
            toY - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            toX - headlen * Math.cos(angle + Math.PI / 6),
            toY - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    }

    // ========== 3. الحصول على إحداثيات اللمس/النقر ==========
    function getCanvasPosition(event) {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        // حساب الموقع مع مراعاة نسبة القياس
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    // ========== 4. التحقق من القرب من المسار ==========
    function checkIfOnPath(userPoint) {
        let minDistance = Infinity;
        let nearestPointIndex = -1;
        
        // البحث عن أقرب نقطة في المسار
        for (let i = appState.currentPointIndex; i < letterConfig.path.length; i++) {
            const targetPoint = letterConfig.path[i];
            const distance = Math.sqrt(
                Math.pow(userPoint.x - targetPoint.x, 2) +
                Math.pow(userPoint.y - targetPoint.y, 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestPointIndex = i;
            }
        }
        
        // إذا كان المستخدم قريباً من المسار
        if (minDistance < letterConfig.tolerance) {
            appState.currentPointIndex = Math.max(appState.currentPointIndex, nearestPointIndex);
            return true;
        }
        
        return false;
    }

    // ========== 5. تحديث التقدم ==========
    function updateProgress() {
        // حساب النسبة بناءً على أبعد نقطة وصل إليها المستخدم
        const newProgress = Math.min(
            100,
            Math.round((appState.currentPointIndex / (letterConfig.path.length - 1)) * 100)
        );
        
        appState.progress = newProgress;
        
        // تحديث واجهة المستخدم
        progressFill.style.width = `${newProgress}%`;
        progressText.textContent = `${newProgress}%`;
        
        // تغيير لون شريط التقدم بناءً على النسبة
        if (newProgress < 50) {
            progressFill.style.background = '#e53e3e'; // أحمر
        } else if (newProgress < 80) {
            progressFill.style.background = '#d69e2e'; // برتقالي
        } else {
            progressFill.style.background = 'linear-gradient(90deg, #68d391, #4299e1)'; // أخضر/أزرق
        }
        
        // التحقق من إكمال النشاط
        if (newProgress >= 85 && !appState.isCompleted) {
            completeActivity();
        }
        
        return newProgress;
    }

    // ========== 6. بدء الرسم ==========
    function startDrawing(event) {
        event.preventDefault();
        if (appState.isCompleted) return;
        
        appState.isDrawing = true;
        appState.userPath = [];
        
        const pos = getCanvasPosition(event);
        appState.userPath.push(pos);
        
        // إخفاء التعليمات عند البدء
        instructionOverlay.style.opacity = '0';
        
        // إعداد فرشاة الرسم
        ctx.strokeStyle = letterConfig.traceColor;
        ctx.lineWidth = letterConfig.lineWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        
        // تحديث الرسالة
        feedbackMessage.textContent = '🎨 ممتاز! استمر في الرسم لأعلى...';
        feedbackMessage.style.background = '#ebf8ff';
        feedbackMessage.style.color = '#2b6cb0';
        feedbackMessage.style.borderColor = '#bee3f8';
    }

    // ========== 7. الرسم أثناء الحركة ==========
    function draw(event) {
        if (!appState.isDrawing || appState.isCompleted) return;
        event.preventDefault();
        
        const pos = getCanvasPosition(event);
        appState.userPath.push(pos);
        
        // التحقق من أن المستخدم على المسار الصحيح
        const isOnPath = checkIfOnPath(pos);
        
        if (isOnPath) {
            // الرسم على المسار (أزرق)
            ctx.strokeStyle = letterConfig.traceColor;
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            
            // رسالة تشجيعية
            const messages = ['👌 جيد جداً!', '👍 أحسنت!', '🚀 استمر!', '🔥 رائع!'];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            
            if (Math.random() < 0.1) { // عرض رسالة عشوائية أحياناً
                feedbackMessage.textContent = randomMessage;
            }
        } else {
            // خارج المسار (برتقالي)
            ctx.strokeStyle = '#d69e2e';
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            
            feedbackMessage.textContent = '↪️ عد إلى المسار المنقط';
            feedbackMessage.style.background = '#fffaf0';
            feedbackMessage.style.color = '#744210';
            feedbackMessage.style.borderColor = '#fbd38d';
        }
        
        // تحديث التقدم
        updateProgress();
    }

    // ========== 8. إنهاء الرسم ==========
    function stopDrawing() {
        if (!appState.isDrawing) return;
        appState.isDrawing = false;
        ctx.closePath();
        
        if (!appState.isCompleted) {
            feedbackMessage.textContent = '✏️ يمكنك الاستمرار من حيث توقفت';
        }
    }

    // ========== 9. إكمال النشاط ==========
    function completeActivity() {
        appState.isCompleted = true;
        
        // رسالة النجاح
        feedbackMessage.textContent = '🎉 مبروك! أتقنت كتابة حرف الألف!';
        feedbackMessage.style.background = '#f0fff4';
        feedbackMessage.style.color = '#276749';
        feedbackMessage.style.borderColor = '#9ae6b4';
        feedbackMessage.style.fontSize = '1.5rem';
        
        // تفعيل زر التالي
        nextButton.disabled = false;
        
        // إضافة تأثير النجاح (رسم المسار باللون الأخضر)
        ctx.strokeStyle = letterConfig.successColor;
        ctx.lineWidth = letterConfig.lineWidth + 2;
        ctx.beginPath();
        ctx.moveTo(letterConfig.path[0].x, letterConfig.path[0].y);
        
        for (let i = 1; i < letterConfig.path.length; i++) {
            ctx.lineTo(letterConfig.path[i].x, letterConfig.path[i].y);
        }
        
        ctx.stroke();
        
        // إرسال إشارة إلى FlutterFlow (إذا كان مضمنًا)
        if (window.parent) {
            window.parent.postMessage({
                type: 'ARABIC_LETTER_COMPLETED',
                letter: 'أ',
                progress: appState.progress,
                timestamp: new Date().toISOString()
            }, '*');
        }
        
        // تشغيل صوت النجاح (إن أمكن)
        playSuccessSound();
    }

    // ========== 10. تشغيل صوت النجاح ==========
    function playSuccessSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('تعذر تشغيل الصوت:', error);
        }
    }

    // ========== 11. إعادة التعيين ==========
    function resetActivity() {
        appState = {
            isDrawing: false,
            userPath: [],
            progress: 0,
            isCompleted: false,
            currentPointIndex: 0
        };
        
        // إعادة تعيين واجهة المستخدم
        progressFill.style.width = '0%';
        progressText.textContent = '0%';
        nextButton.disabled = true;
        instructionOverlay.style.opacity = '1';
        
        feedbackMessage.textContent = 'جاهز للبدء! المس النقطة الحمراء.';
        feedbackMessage.style.background = '#f0fff4';
        feedbackMessage.style.color = '#276749';
        feedbackMessage.style.borderColor = '#c6f6d5';
        feedbackMessage.style.fontSize = '1.3rem';
        
        // إعادة رسم المسار الإرشادي
        drawGuidePath();
    }

    // ========== 12. إعداد الأحداث ==========
    function setupEventListeners() {
        // أحداث الماوس
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        document.addEventListener('mouseup', stopDrawing);
        
        // أحداث اللمس
        canvas.addEventListener('touchstart', function(event) {
            event.preventDefault();
            startDrawing(event);
        }, { passive: false });
        
        canvas.addEventListener('touchmove', function(event) {
            event.preventDefault();
            draw(event);
        }, { passive: false });
        
        canvas.addEventListener('touchend', stopDrawing);
        
        // أحداث الأزرار
        resetButton.addEventListener('click', resetActivity);
        nextButton.addEventListener('click', function() {
            alert('ستضيف الحروف الأخرى قريباً! 🔜');
        });
        
        // منع التمرير على الهاتف عند لمس الكانفس
        document.body.addEventListener('touchmove', function(event) {
            if (event.target === canvas) {
                event.preventDefault();
            }
        }, { passive: false });
    }

    // ========== 13. بدء التطبيق ==========
    function init() {
        drawGuidePath();
        setupEventListeners();
        resetActivity(); // تعيين الحالة الابتدائية
        
        console.log('🚀 تطبيق تعلم كتابة الحروف العربية جاهز!');
        console.log('✍️ الحرف الحالي:', letterConfig.name);
    }

    // تشغيل التطبيق
    init();
});
