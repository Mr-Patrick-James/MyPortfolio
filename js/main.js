// ── SNAKE MODAL ──
        function openSnakeModal() {
            const modal = document.getElementById('snakeModal');
            modal.style.display = 'flex';
            modal.classList.remove('closing');
            document.body.style.overflow = 'hidden';
            if ('ontouchstart' in window) document.getElementById('snakeDpad').style.display = 'block';
            snakeReset();
            requestAnimationFrame(() => { snakeDraw(); });
        }
        function closeSnakeModal() {
            const modal = document.getElementById('snakeModal');
            modal.classList.add('closing');
            setTimeout(function() {
                clearInterval(loopTimer);
                modal.style.display = 'none';
                modal.classList.remove('closing');
                document.body.style.overflow = '';
            }, 350);
        }
        // Close on backdrop click
        document.getElementById('snakeModal').addEventListener('click', function(e) {
            if (e.target === this) closeSnakeModal();
        });

        // ── SNAKE ENGINE ──
        const CELL = 20, COLS = 20, ROWS = 20;
        const INITIAL_SPEED = 150, SPEED_INC = 8;
        let snake, dir, nextDir, food, score, highScore, level, speed;
        let gameStarted, gameOver, isPaused, loopTimer;
        let soundEnabled = true;
        const canvas = document.getElementById('snakeCanvas');
        const ctx = canvas.getContext('2d');

        let audioCtx = null;
        function getAudio() {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            return audioCtx;
        }
        function playTone(freq, dur, type, vol) {
            if (!soundEnabled) return;
            try {
                const ac = getAudio();
                const osc = ac.createOscillator();
                const gain = ac.createGain();
                osc.connect(gain); gain.connect(ac.destination);
                osc.frequency.value = freq; osc.type = type || 'sine';
                gain.gain.setValueAtTime(vol || 0.08, ac.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
                osc.start(ac.currentTime); osc.stop(ac.currentTime + dur);
            } catch(e) {}
        }
        const sfx = {
            eat:   function() { playTone(440, 0.15, 'sine', 0.12); },
            die:   function() { playTone(140, 0.5, 'sawtooth', 0.18); },
            start: function() { playTone(520, 0.25, 'triangle', 0.1); },
            pause: function() { playTone(300, 0.15, 'triangle', 0.08); },
            reset: function() { playTone(260, 0.2, 'sine', 0.08); }
        };

        function randPos() {
            return { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
        }
        function spawnFood() {
            var f;
            do { f = randPos(); } while (snake.some(function(s) { return s.x === f.x && s.y === f.y; }));
            return f;
        }
        function snakeUpdateUI() {
            document.getElementById('snakeScore').textContent = score;
            document.getElementById('snakeLevel').textContent = level;
            document.getElementById('snakeBest').textContent = highScore;
            var el = document.getElementById('snakeStatus');
            if (!gameStarted)      { el.textContent = 'Ready';     el.style.color = '#4ade80'; }
            else if (gameOver)     { el.textContent = 'Game Over'; el.style.color = '#f87171'; }
            else if (isPaused)     { el.textContent = 'Paused';    el.style.color = '#fbbf24'; }
            else                   { el.textContent = 'Lvl ' + level; el.style.color = '#64ffda'; }
        }
        function snakeShowOverlay(emoji, title, msg, best) {
            var o = document.getElementById('snakeOverlay');
            o.style.display = 'flex';
            document.getElementById('snakeOverlayEmoji').textContent = emoji;
            document.getElementById('snakeOverlayTitle').textContent = title;
            document.getElementById('snakeOverlayMsg').innerHTML = msg;
            document.getElementById('snakeNewBest').style.display = best ? 'block' : 'none';
        }
        function snakeHideOverlay() {
            document.getElementById('snakeOverlay').style.display = 'none';
        }
        function snakeDraw() {
            var W = canvas.width, H = canvas.height;
            ctx.fillStyle = '#080e1a';
            ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = 'rgba(99,179,237,0.04)';
            ctx.lineWidth = 1;
            for (var i = 0; i <= COLS; i++) {
                ctx.beginPath(); ctx.moveTo(i*CELL,0); ctx.lineTo(i*CELL,H); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0,i*CELL); ctx.lineTo(W,i*CELL); ctx.stroke();
            }
            var fx = food.x*CELL, fy = food.y*CELL;
            ctx.shadowColor = '#f87171'; ctx.shadowBlur = 10;
            ctx.fillStyle = '#f87171';
            ctx.fillRect(fx+3, fy+3, CELL-6, CELL-6);
            ctx.shadowBlur = 0;
            snake.forEach(function(seg, i) {
                var x = seg.x*CELL, y = seg.y*CELL;
                var alpha = Math.max(0.35, 1 - i*0.04);
                if (i === 0) {
                    ctx.shadowColor = '#64ffda'; ctx.shadowBlur = 8;
                    ctx.fillStyle = '#64ffda';
                    ctx.fillRect(x+1, y+1, CELL-2, CELL-2);
                    ctx.shadowBlur = 0;
                } else {
                    var hex = Math.floor(alpha*255).toString(16).padStart(2,'0');
                    ctx.fillStyle = '#64ffda' + hex;
                    ctx.fillRect(x+2, y+2, CELL-4, CELL-4);
                }
            });
        }
        function snakeTick() {
            if (!gameStarted || gameOver || isPaused) return;
            dir = { x: nextDir.x, y: nextDir.y };
            var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
            if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS ||
                snake.some(function(s) { return s.x === head.x && s.y === head.y; })) {
                gameOver = true;
                clearInterval(loopTimer);
                var newBest = score > highScore;
                if (newBest) { highScore = score; localStorage.setItem('snakeHS', highScore); }
                sfx.die();
                snakeUpdateUI();
                snakeShowOverlay('💀', 'Game Over!',
                    'Final Score: <strong style="color:#64ffda">' + score + '</strong><br>Press <kbd style="background:rgba(255,255,255,0.08);border:1px solid rgba(99,179,237,0.15);border-radius:4px;padding:.1rem .4rem;font-size:.78rem;">Space</kbd> or Reset',
                    newBest);
                document.getElementById('snakePauseBtn').style.display = 'none';
                document.getElementById('snakeResetBtn').style.display = 'inline-flex';
                document.getElementById('snakeStartBtn').style.display = 'inline-flex';
                document.getElementById('snakeStartBtn').innerHTML = '<i class="fas fa-play"></i> Play Again';
                return;
            }
            snake.unshift(head);
            if (head.x === food.x && head.y === food.y) {
                score += 10;
                level = Math.floor(score / 100) + 1;
                speed = Math.max(60, INITIAL_SPEED - (level-1)*SPEED_INC);
                food = spawnFood();
                sfx.eat();
                clearInterval(loopTimer);
                loopTimer = setInterval(snakeTick, speed);
            } else {
                snake.pop();
            }
            snakeUpdateUI();
            snakeDraw();
        }
        function snakeStart() {
            snake = [{ x:10, y:10 }];
            dir = { x:1, y:0 }; nextDir = { x:1, y:0 };
            food = spawnFood();
            score = 0; level = 1; speed = INITIAL_SPEED;
            gameStarted = true; gameOver = false; isPaused = false;
            snakeHideOverlay();
            sfx.start();
            clearInterval(loopTimer);
            loopTimer = setInterval(snakeTick, speed);
            document.getElementById('snakeStartBtn').style.display = 'none';
            document.getElementById('snakePauseBtn').style.display = 'inline-flex';
            document.getElementById('snakeResetBtn').style.display = 'inline-flex';
            snakeUpdateUI(); snakeDraw();
        }
        function snakeTogglePause() {
            if (!gameStarted || gameOver) return;
            isPaused = !isPaused;
            sfx.pause();
            if (isPaused) {
                clearInterval(loopTimer);
                snakeShowOverlay('⏸️', 'Paused', 'Press <kbd style="background:rgba(255,255,255,0.08);border:1px solid rgba(99,179,237,0.15);border-radius:4px;padding:.1rem .4rem;font-size:.78rem;">Space</kbd> to continue');
                document.getElementById('snakePauseIcon').className = 'fas fa-play';
                document.getElementById('snakePauseLabel').textContent = 'Resume';
            } else {
                snakeHideOverlay();
                loopTimer = setInterval(snakeTick, speed);
                document.getElementById('snakePauseIcon').className = 'fas fa-pause';
                document.getElementById('snakePauseLabel').textContent = 'Pause';
            }
            snakeUpdateUI();
        }
        function snakeReset() {
            clearInterval(loopTimer);
            sfx.reset();
            snake = [{ x:10, y:10 }];
            dir = { x:1, y:0 }; nextDir = { x:1, y:0 };
            food = spawnFood();
            score = 0; level = 1; speed = INITIAL_SPEED;
            gameStarted = false; gameOver = false; isPaused = false;
            highScore = parseInt(localStorage.getItem('snakeHS') || '0');
            snakeUpdateUI();
            snakeDraw();
            snakeShowOverlay('🎮', 'Ready to Play?', 'Press <kbd style="background:rgba(255,255,255,0.08);border:1px solid rgba(99,179,237,0.15);border-radius:4px;padding:.1rem .4rem;font-size:.78rem;">Space</kbd> or tap Start');
            document.getElementById('snakeStartBtn').style.display = 'inline-flex';
            document.getElementById('snakeStartBtn').innerHTML = '<i class="fas fa-play"></i> Start Game';
            document.getElementById('snakePauseBtn').style.display = 'none';
            document.getElementById('snakeResetBtn').style.display = 'none';
            document.getElementById('snakePauseIcon').className = 'fas fa-pause';
            document.getElementById('snakePauseLabel').textContent = 'Pause';
        }
        function snakeDir(dx, dy) {
            if (!gameStarted || gameOver || isPaused) return;
            if (dx === -dir.x && dy === dir.y) return;
            if (dy === -dir.y && dx === dir.x) return;
            nextDir = { x: dx, y: dy };
        }
        function snakeToggleSound() {
            soundEnabled = !soundEnabled;
            document.getElementById('snakeSoundIcon').className = soundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
        }
        document.addEventListener('keydown', function(e) {
            if (document.getElementById('snakeModal').style.display !== 'flex') return;
            var gameKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D',' '];
            if (!gameKeys.includes(e.key)) return;
            e.preventDefault();
            if (e.key === ' ') {
                if (!gameStarted && !gameOver) snakeStart();
                else snakeTogglePause();
                return;
            }
            var map = { ArrowUp:{x:0,y:-1}, w:{x:0,y:-1}, W:{x:0,y:-1},
                        ArrowDown:{x:0,y:1}, s:{x:0,y:1}, S:{x:0,y:1},
                        ArrowLeft:{x:-1,y:0}, a:{x:-1,y:0}, A:{x:-1,y:0},
                        ArrowRight:{x:1,y:0}, d:{x:1,y:0}, D:{x:1,y:0} };
            if (map[e.key]) snakeDir(map[e.key].x, map[e.key].y);
        });
        // Init snake state silently (modal not open yet)
        snake = [{x:10,y:10}]; dir={x:1,y:0}; nextDir={x:1,y:0};
        food={x:15,y:15}; score=0; level=1; speed=INITIAL_SPEED;
        gameStarted=false; gameOver=false; isPaused=false;
        highScore=parseInt(localStorage.getItem('snakeHS')||'0');

        // ── NAV / PAGE JS ──
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const navLinks = document.getElementById('navLinks');
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            mobileMenuBtn.innerHTML = navLinks.classList.contains('active')
                ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        });
        navLinks.querySelectorAll('a').forEach(function(a) {
            a.addEventListener('click', function() {
                navLinks.classList.remove('active');
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            });
        });
        const navbar = document.getElementById('navbar');
        window.addEventListener('scroll', function() {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        });
        const sections = document.querySelectorAll('section[id]');
        const navItems = document.querySelectorAll('.nav-center a');
        window.addEventListener('scroll', function() {
            var current = '';
            sections.forEach(function(s) {
                if (pageYOffset >= s.offsetTop - 200) current = s.id;
            });
            navItems.forEach(function(a) {
                a.classList.toggle('active', a.getAttribute('href') === '#' + current);
            });
        });
        const scrollTopBtn = document.getElementById('scrollTop');
        window.addEventListener('scroll', function() {
            scrollTopBtn.classList.toggle('active', window.pageYOffset > 400);
        });
        scrollTopBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });