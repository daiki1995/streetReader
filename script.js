// Canvas設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// BGM設定
const titleBGM = new Audio('titleBGM.mp3');
const playBGM = new Audio('playBGM.mp3');
titleBGM.loop = true;
playBGM.loop = true;
titleBGM.volume = 0.5;
playBGM.volume = 0.5;

// 効果音設定
const missSE1 = new Audio('miss1.mp3');
const missSE2 = new Audio('miss2.mp3');
const successSE = new Audio('success.mp3');
missSE1.volume = 0.7;
missSE2.volume = 0.7;
successSE.volume = 0.7;

// ゲーム状態
let gameState = {
    isReading: false,
    progress: 0,
    isGameOver: false,
    isGameClear: false,
    isStageClear: false,
    heartbeatVolume: 0,
    currentStage: 1,
    maxStage: 5,
    isGameStarted: false,
    timeLimit: 300, // 秒単位（5分）
    elapsedTime: 0,
    frameCount: 0,
    easyModeActivated: false
};

// プレイヤー
const player = {
    x: 400,
    y: 450,
    width: 60,
    height: 80,
    state: 'HIDING', // 'READING' or 'HIDING'
    blushLevel: 0,
    sweatLevel: 0,
    speed: 4
};

// 通行人の配列
let npcs = [];
let npcSpawnTimer = 0;
let NPC_SPAWN_INTERVAL = 120; // フレーム数（ステージごとに変更）

// NPC種類の定義
const NPC_TYPES = {
    NORMAL: {
        speed: 2,
        visionRange: 150,
        color: '#666',
        name: '通行人'
    },
    POLICE: {
        speed: 1,
        visionRange: 250,
        color: '#0066CC',
        name: 'お巡りさん'
    },
    CHILD: {
        speed: 3,
        visionRange: 120,
        color: '#FF6B9D',
        name: '子供',
        erratic: true
    },
    RUNNER: {
        speed: 5,
        visionRange: 180,
        color: '#FF6600',
        name: 'ランナー'
    },
    GUARD: {
        speed: 1.5,
        visionRange: 300,
        color: '#8B0000',
        name: '警備員'
    },
    DRUNK: {
        speed: 2,
        visionRange: 140,
        color: '#9932CC',
        name: '酔っぱらい',
        drunk: true
    },
    MANAGER: {
        speed: 5,
        visionRange: 200,
        color: '#000000',
        name: '管理人'
    },
    PARTICIPANT: {
        speed: 5,
        visionRange: 200,
        color: '#FF0000',
        name: '参加者'
    },
    PRISON_GUARD: {
        speed: 2,
        visionRange: 320,
        color: '#4B0082',
        name: '看守',
        patrol: true
    }
};

// ステージごとの設定
const STAGE_CONFIG = {
    1: {
        npcTypes: ['NORMAL', 'POLICE', 'CHILD'],
        spawnInterval: 150,
        requiredProgress: 100,
        name: '公園の道',
        timeLimit: 300, // 5分
        introMessage: '道端でエ⚪︎本を見つけた。<br>いますぐ読まねば！！'
    },
    2: {
        npcTypes: ['NORMAL', 'POLICE', 'CHILD', 'RUNNER'],
        spawnInterval: 120,
        requiredProgress: 100,
        name: '繁華街',
        timeLimit: 300, // 5分
        introMessage: '繁華街でエ⚪︎本を見つけた。<br>いますぐ読まねば！！'
    },
    3: {
        npcTypes: ['NORMAL', 'POLICE', 'RUNNER', 'GUARD', 'DRUNK'],
        spawnInterval: 90,
        requiredProgress: 100,
        name: '夜の繁華街',
        timeLimit: 300, // 5分
        introMessage: '夜の繁華街でエロ本を見つけた！<br>すぐに読まねば！'
    },
    4: {
        npcTypes: ['MANAGER', 'PARTICIPANT'],
        spawnInterval: 90,
        requiredProgress: 100,
        name: 'デスゲーム会場',
        timeLimit: 300, // 5分
        introMessage: 'デスゲームの途中、分厚いエ⚪︎本を見つけた！<br>すぐに読まなきゃ'
    },
    5: {
        npcTypes: ['PRISON_GUARD'],
        spawnInterval: 120,
        requiredProgress: 100,
        name: '牢獄',
        timeLimit: 300, // 5分
        introMessage: '投獄中に分厚いエ⚪︎本を見つけた！<br>すぐに読まねば！'
    }
};

// 入力管理
let input = {
    isPressed: false,
    leftPressed: false,
    rightPressed: false,
    upPressed: false,
    downPressed: false
};

// イベントリスナー
canvas.addEventListener('mousedown', () => input.isPressed = true);
canvas.addEventListener('mouseup', () => input.isPressed = false);
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        input.isPressed = true;
    }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        input.leftPressed = true;
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        input.rightPressed = true;
    }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        input.upPressed = true;
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        input.downPressed = true;
    }
});
document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        input.isPressed = false;
    }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        input.leftPressed = false;
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        input.rightPressed = false;
    }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        input.upPressed = false;
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        input.downPressed = false;
    }
});

// NPCを生成
function spawnNPC() {
    const stageConfig = STAGE_CONFIG[gameState.currentStage];
    const availableTypes = stageConfig.npcTypes.map(typeName => NPC_TYPES[typeName]);
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    npcs.push({
        x: direction > 0 ? -50 : canvas.width + 50,
        y: 350 + Math.random() * 150,
        speed: type.speed * direction,
        visionRange: type.visionRange,
        color: type.color,
        name: type.name,
        type: type,
        erraticTimer: 0,
        stopped: false
    });
}

// NPCが視界内にプレイヤーがいるか
function isPlayerInVision(npc) {
    const dx = npc.x - player.x;
    const dy = npc.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < npc.visionRange;
}

// 警戒レベルの計算
function getAlertLevel() {
    if (npcs.length === 0) return 'safe';
    
    let closestDistance = Infinity;
    npcs.forEach(npc => {
        const dx = npc.x - player.x;
        const dy = npc.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < closestDistance) {
            closestDistance = distance;
        }
    });

    if (closestDistance < 100) return 'danger';
    if (closestDistance < 200) return 'warning';
    return 'safe';
}

// UIの更新
function updateUI() {
    // ステージ表示
    const stageConfig = STAGE_CONFIG[gameState.currentStage];
    document.getElementById('stageIndicator').textContent = `ステージ ${gameState.currentStage}: ${stageConfig.name}`;
    
    // プログレスバー
    document.getElementById('progressBar').style.width = gameState.progress + '%';
    document.getElementById('progressText').textContent = '読破率: ' + Math.floor(gameState.progress) + '%';
    
    // 警戒アラート
    const alertContainer = document.getElementById('alertContainer');
    const alertLevel = getAlertLevel();
    
    alertContainer.className = '';
    if (alertLevel === 'safe') {
        alertContainer.className = 'alert-safe';
        alertContainer.textContent = '安全';
        gameState.heartbeatVolume = 0;
    } else if (alertLevel === 'warning') {
        alertContainer.className = 'alert-warning';
        alertContainer.textContent = '⚠️ 警戒！';
        gameState.heartbeatVolume = 0.3;
    } else {
        alertContainer.className = 'alert-danger';
        alertContainer.textContent = '🚨 危険！';
        gameState.heartbeatVolume = 0.7;
    }
}

// 描画
function draw() {
    // 背景
    if (gameState.currentStage === 5) {
        // 牢獄（暗い石壁）
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 石壁のテクスチャ
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 60) {
            for (let j = 0; j < 300; j += 40) {
                ctx.strokeRect(i, j, 60, 40);
            }
        }
        
        // 鉄格子（複数配置）
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 3;
        for (let x = 100; x < canvas.width; x += 200) {
            for (let i = 0; i < 8; i++) {
                ctx.beginPath();
                ctx.moveTo(x + i * 15, 0);
                ctx.lineTo(x + i * 15, 300);
                ctx.stroke();
            }
            // 横棒
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(x, i * 75);
                ctx.lineTo(x + 105, i * 75);
                ctx.stroke();
            }
        }
        
        // 薄暗い照明
        ctx.fillStyle = 'rgba(255, 200, 100, 0.1)';
        ctx.beginPath();
        ctx.arc(400, 100, 150, 0, Math.PI * 2);
        ctx.fill();
    } else if (gameState.currentStage === 4) {
        // デスゲーム会場（不気味な雰囲気）
        ctx.fillStyle = '#1a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 赤い照明効果
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 壁のパターン（格子）
        ctx.strokeStyle = '#330000';
        ctx.lineWidth = 2;
        for (let i = 0; i < canvas.width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 300);
            ctx.stroke();
        }
        for (let i = 0; i < 300; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
        
        // 監視カメラの赤いランプ
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(750, 50, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // 点滅効果
        if (Math.floor(gameState.elapsedTime * 2) % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(750, 50, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (gameState.currentStage === 3) {
        // 夜の暗い背景
        ctx.fillStyle = '#2a2a3e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 街灯の光（複数配置）
        const streetLights = [150, 400, 650];
        streetLights.forEach(x => {
            // 街灯の光（グラデーション風に複数の円で表現）
            ctx.fillStyle = 'rgba(255, 220, 150, 0.15)';
            ctx.beginPath();
            ctx.arc(x, 280, 120, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'rgba(255, 220, 150, 0.1)';
            ctx.beginPath();
            ctx.arc(x, 280, 180, 0, Math.PI * 2);
            ctx.fill();
            
            // 街灯のポール
            ctx.fillStyle = '#666';
            ctx.fillRect(x - 5, 200, 10, 100);
            
            // 街灯本体
            ctx.fillStyle = '#FFE4B5';
            ctx.beginPath();
            ctx.arc(x, 200, 8, 0, Math.PI * 2);
            ctx.fill();
        });
    } else {
        // 昼間の青空
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, 300);
        
        // 雲
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(100, 80, 30, 0, Math.PI * 2);
        ctx.arc(130, 75, 35, 0, Math.PI * 2);
        ctx.arc(160, 80, 30, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(600, 120, 25, 0, Math.PI * 2);
        ctx.arc(625, 115, 30, 0, Math.PI * 2);
        ctx.arc(650, 120, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // ビル群を描画
        const buildings = [
            { x: 50, width: 80, height: 150, color: '#8B8B8B' },
            { x: 150, width: 60, height: 120, color: '#A9A9A9' },
            { x: 230, width: 90, height: 180, color: '#7A7A7A' },
            { x: 340, width: 70, height: 140, color: '#999' },
            { x: 430, width: 85, height: 160, color: '#8B8B8B' },
            { x: 535, width: 75, height: 130, color: '#A0A0A0' },
            { x: 630, width: 95, height: 170, color: '#7A7A7A' }
        ];
        
        buildings.forEach(building => {
            // ビル本体
            ctx.fillStyle = building.color;
            ctx.fillRect(building.x, 300 - building.height, building.width, building.height);
            
            // 窓を描画
            ctx.fillStyle = '#E0E0E0';
            for (let row = 0; row < Math.floor(building.height / 20); row++) {
                for (let col = 0; col < Math.floor(building.width / 15); col++) {
                    const windowX = building.x + 5 + col * 15;
                    const windowY = 300 - building.height + 5 + row * 20;
                    ctx.fillRect(windowX, windowY, 8, 12);
                }
            }
        });
    }
    
    // 残り時間を道路に表示
    if (gameState.isGameStarted && !gameState.isGameOver && !gameState.isGameClear && !gameState.isStageClear) {
        const remainingTime = Math.max(0, gameState.timeLimit - gameState.elapsedTime);
        const minutes = Math.floor(remainingTime / 60);
        const seconds = Math.floor(remainingTime % 60);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // 時間表示の背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(canvas.width / 2 - 80, 20, 160, 50);
        
        // 時間テキスト
        ctx.fillStyle = remainingTime <= 60 ? '#FF6B6B' : '#FFFFFF';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(timeString, canvas.width / 2, 55);
        
        // 残り1分以下で点滅効果
        if (remainingTime <= 60 && Math.floor(gameState.elapsedTime * 2) % 2 === 0) {
            ctx.fillStyle = '#FF0000';
            ctx.fillText(timeString, canvas.width / 2, 55);
        }
    }
    
    // 歩道
    if (gameState.currentStage === 4) {
        // デスゲーム会場の床（冷たいコンクリート）
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 300, canvas.width, 300);
        
        // 床のライン
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        for (let i = 300; i < canvas.height; i += 30) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
    } else if (gameState.currentStage === 3) {
        // 夜の歩道（暗い色）
        ctx.fillStyle = '#555';
    } else {
        // 昼の歩道
        ctx.fillStyle = '#AAA';
    }
    
    if (gameState.currentStage !== 4) {
        ctx.fillRect(0, 300, canvas.width, 300);
    }
    
    // 白線
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 10]);
    ctx.beginPath();
    ctx.moveTo(0, 300);
    ctx.lineTo(canvas.width, 300);
    ctx.stroke();
    ctx.setLineDash([]);

    // 通行人を描画
    npcs.forEach(npc => {
        // 視界範囲（デバッグ用、半透明の円）
        if (player.state === 'READING') {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
            ctx.beginPath();
            ctx.arc(npc.x, npc.y, npc.visionRange, 0, Math.PI * 2);
            ctx.fill();
        }

        // NPC本体
        ctx.fillStyle = npc.color;
        ctx.fillRect(npc.x - 15, npc.y - 40, 30, 70);
        
        // 頭
        ctx.beginPath();
        ctx.arc(npc.x, npc.y - 50, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // 名前表示
        ctx.fillStyle = '#FFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(npc.name, npc.x, npc.y + 40);
    });

    // プレイヤーを描画
    drawPlayer();
}

function drawPlayer() {
    const x = player.x;
    const y = player.y;

    // 体
    ctx.fillStyle = '#FF8C00';
    ctx.fillRect(x - 30, y - 40, 60, 70);
    
    // 頭
    ctx.fillStyle = '#FFD700';
    // 赤面レベルに応じて色を変える
    if (player.blushLevel > 0) {
        const redAmount = Math.floor(player.blushLevel * 100);
        ctx.fillStyle = `rgb(255, ${215 - redAmount}, ${0})`;
    }
    ctx.beginPath();
    ctx.arc(x, y - 50, 25, 0, Math.PI * 2);
    ctx.fill();

    // 汗
    if (player.sweatLevel > 0) {
        ctx.fillStyle = '#00BFFF';
        for (let i = 0; i < player.sweatLevel * 3; i++) {
            const angle = (Math.PI * 2 / (player.sweatLevel * 3)) * i;
            const sweatX = x + Math.cos(angle) * 30;
            const sweatY = y - 50 + Math.sin(angle) * 30;
            ctx.beginPath();
            ctx.arc(sweatX, sweatY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 本
    if (player.state === 'READING') {
        // 開いた本
        // 表紙（ピンク色）
        ctx.fillStyle = '#FF69B4';
        ctx.fillRect(x - 35, y - 20, 70, 50);
        
        // ページ（白）
        ctx.fillStyle = '#FFF';
        ctx.fillRect(x - 33, y - 18, 30, 46);
        ctx.fillRect(x + 3, y - 18, 30, 46);
        
        // 左ページ: 肌色の挿絵
        ctx.fillStyle = '#FFDAB9';
        ctx.fillRect(x - 30, y - 15, 10, 15);
        ctx.fillRect(x - 18, y - 15, 10, 15);
        // 挿絵のディテール（影）
        ctx.fillStyle = '#FFB6A3';
        ctx.fillRect(x - 28, y - 12, 3, 8);
        ctx.fillRect(x - 16, y - 12, 3, 8);
        
        // 右ページ: 肌色の挿絵
        ctx.fillStyle = '#FFDAB9';
        ctx.fillRect(x + 8, y - 12, 18, 20);
        // 挿絵のディテール
        ctx.fillStyle = '#FFB6A3';
        ctx.fillRect(x + 10, y - 8, 5, 12);
        ctx.fillRect(x + 18, y - 8, 5, 12);
        
        // ページの文字っぽい線
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x - 30, y + 5 + i * 5);
            ctx.lineTo(x - 5, y + 5 + i * 5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 5, y + 12 + i * 5);
            ctx.lineTo(x + 30, y + 12 + i * 5);
            ctx.stroke();
        }
    } else {
        // 閉じた本（地面）- ピンク色の表紙
        ctx.fillStyle = '#FF69B4';
        ctx.fillRect(x - 25, y + 35, 50, 10);
        // 本の縁取り
        ctx.strokeStyle = '#FF1493';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 25, y + 35, 50, 10);
    }

    // 目
    ctx.fillStyle = '#000';
    if (player.state === 'READING') {
        // 下を向いている（本を見ている）
        ctx.fillRect(x - 15, y - 45, 8, 8);
        ctx.fillRect(x + 7, y - 45, 8, 8);
    } else {
        // 前を向いている
        ctx.fillRect(x - 15, y - 50, 8, 8);
        ctx.fillRect(x + 7, y - 50, 8, 8);
    }
}

// ゲームオーバー
function gameOver(message) {
    gameState.isGameOver = true;
    
    // BGMを停止
    playBGM.pause();
    playBGM.currentTime = 0;
    
    // 失敗効果音をランダムで再生
    const missSE = Math.random() < 0.5 ? missSE1 : missSE2;
    missSE.currentTime = 0;
    missSE.play().catch(e => console.log('効果音再生エラー:', e));
    
    const gameOverScreen = document.getElementById('gameOverScreen');
    const gameOverTitle = gameOverScreen.querySelector('h2');
    const gameOverMessage = document.getElementById('gameOverMessage');
    
    if (message === '時間切れ！') {
        // 時間切れ専用表示
        gameOverTitle.textContent = '時間ぎれ！！';
        gameOverTitle.style.fontSize = '48px';
        gameOverTitle.style.color = '#FF0000';
        gameOverMessage.textContent = '不審者として逮捕されました';
        gameOverMessage.style.fontSize = '18px';
        gameOverMessage.style.color = '#FFFFFF';
    } else {
        // 通常のゲームオーバー表示
        gameOverTitle.textContent = '逮捕されました！';
        gameOverTitle.style.fontSize = '36px';
        gameOverTitle.style.color = '#F44336';
        gameOverMessage.textContent = message;
        gameOverMessage.style.fontSize = '16px';
        gameOverMessage.style.color = '#FFFFFF';
    }
    
    gameOverScreen.style.display = 'block';
}

// 同じステージをリトライ
function retryStage() {
    // 効果音を停止
    missSE1.pause();
    missSE1.currentTime = 0;
    missSE2.pause();
    missSE2.currentTime = 0;
    
    initializeStage(gameState.currentStage);
    document.getElementById('gameOverScreen').style.display = 'none';
    
    // playBGMを再開
    playBGM.play().catch(e => console.log('BGM再生エラー:', e));
}

// ゲーム開始
function startGame() {
    // タイトルBGMを再生（ユーザーのクリックイベント内なので再生可能）
    titleBGM.play().catch(e => console.log('BGM再生エラー:', e));
    
    gameState.currentStage = 1;
    showStageIntro(1);
    document.getElementById('startScreen').style.display = 'none';
}

// ステージセレクト画面を表示
function showStageSelect() {
    // タイトルBGMを再生（ユーザーのクリックイベント内なので再生可能）
    titleBGM.play().catch(e => console.log('BGM再生エラー:', e));
    
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('stageSelectScreen').style.display = 'block';
}

// ステージセレクト画面を隠す
function hideStageSelect() {
    document.getElementById('stageSelectScreen').style.display = 'none';
    document.getElementById('startScreen').style.display = 'block';
}

// ステージを選択
function selectStage(stageNum) {
    gameState.currentStage = stageNum;
    showStageIntro(stageNum);
    document.getElementById('stageSelectScreen').style.display = 'none';
}

// ステージイントロを表示
function showStageIntro(stageNum) {
    const stageConfig = STAGE_CONFIG[stageNum];
    document.getElementById('stageIntroMessage').innerHTML = stageConfig.introMessage;
    document.getElementById('stageIntroScreen').style.display = 'block';
}

// イントロ後にステージを開始
function startStageAfterIntro() {
    gameState.isGameStarted = true;
    initializeStage(gameState.currentStage);
    document.getElementById('stageIntroScreen').style.display = 'none';
    
    // BGMを切り替え
    titleBGM.pause();
    titleBGM.currentTime = 0;
    playBGM.play().catch(e => console.log('BGM再生エラー:', e));
}

// ステージを初期化
function initializeStage(stageNum) {
    gameState.progress = 0;
    gameState.isGameOver = false;
    gameState.isGameClear = false;
    gameState.isStageClear = false;
    gameState.elapsedTime = 0;
    gameState.frameCount = 0;
    gameState.easyModeActivated = false;
    player.x = 400;
    player.y = 450;
    player.state = 'HIDING';
    player.blushLevel = 0;
    player.sweatLevel = 0;
    npcs = [];
    npcSpawnTimer = 0;
    input.isPressed = false;
    input.leftPressed = false;
    input.rightPressed = false;
    input.upPressed = false;
    input.downPressed = false;
    
    // ステージ設定を適用
    const stageConfig = STAGE_CONFIG[stageNum];
    NPC_SPAWN_INTERVAL = stageConfig.spawnInterval;
    gameState.timeLimit = stageConfig.timeLimit;
}

// ゲームクリア
function gameClear() {
    const stageConfig = STAGE_CONFIG[gameState.currentStage];
    
    // playBGMを一時停止
    playBGM.pause();
    
    // 成功効果音を再生
    successSE.currentTime = 0;
    successSE.play().catch(e => console.log('効果音再生エラー:', e));
    
    if (gameState.currentStage < gameState.maxStage) {
        // ステージクリア
        gameState.isStageClear = true;
        document.getElementById('stageClearMessage').textContent = `${stageConfig.name}をクリア！`;
        document.getElementById('stageClearScreen').style.display = 'block';
    } else {
        // 全ステージクリア
        gameState.isGameClear = true;
        playBGM.currentTime = 0;
        document.getElementById('gameClearScreen').style.display = 'block';
    }
}

// 次のステージへ
function nextStage() {
    gameState.currentStage++;
    gameState.isStageClear = false;
    gameState.isGameStarted = false;
    showStageIntro(gameState.currentStage);
    document.getElementById('stageClearScreen').style.display = 'none';
    
    // playBGMを再開
    playBGM.play().catch(e => console.log('BGM再生エラー:', e));
}

// ゲーム再起動
function restartGame() {
    // 効果音を停止
    missSE1.pause();
    missSE1.currentTime = 0;
    missSE2.pause();
    missSE2.currentTime = 0;
    
    gameState = {
        isReading: false,
        progress: 0,
        isGameOver: false,
        isGameClear: false,
        isStageClear: false,
        heartbeatVolume: 0,
        currentStage: 1,
        maxStage: 5,
        isGameStarted: false
    };
    player.x = 400;
    player.y = 450;
    player.state = 'HIDING';
    player.blushLevel = 0;
    player.sweatLevel = 0;
    npcs = [];
    npcSpawnTimer = 0;
    input.isPressed = false;
    input.leftPressed = false;
    input.rightPressed = false;
    input.upPressed = false;
    input.downPressed = false;
    
    // ステージ1の設定を適用
    NPC_SPAWN_INTERVAL = STAGE_CONFIG[1].spawnInterval;
    
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('gameClearScreen').style.display = 'none';
    document.getElementById('stageClearScreen').style.display = 'none';
    document.getElementById('startScreen').style.display = 'block';
    
    // BGMをタイトルに戻す
    playBGM.pause();
    playBGM.currentTime = 0;
    titleBGM.play().catch(e => console.log('BGM再生エラー:', e));
}

// メインの更新ループ
function update() {
    if (!gameState.isGameStarted) return;
    if (gameState.isGameOver || gameState.isGameClear || gameState.isStageClear) return;

    // 時間管理（60FPSと仮定）
    gameState.frameCount++;
    if (gameState.frameCount >= 60) {
        gameState.elapsedTime++;
        gameState.frameCount = 0;
    }

    // 残り時間チェック
    const remainingTime = gameState.timeLimit - gameState.elapsedTime;
    
    // 残り1分以下でイージーモードに切り替え
    if (remainingTime <= 60 && !gameState.easyModeActivated) {
        gameState.easyModeActivated = true;
        NPC_SPAWN_INTERVAL = 170;
    }
    
    // 時間切れ判定
    if (remainingTime <= 0) {
        gameOver('時間切れ！');
        return;
    }

    // プレイヤーの移動
    if (input.leftPressed) {
        player.x -= player.speed;
    }
    if (input.rightPressed) {
        player.x += player.speed;
    }
    if (input.upPressed) {
        player.y -= player.speed;
    }
    if (input.downPressed) {
        player.y += player.speed;
    }
    
    // 画面外に出ないように制限（歩道内に収める）
    player.x = Math.max(50, Math.min(canvas.width - 50, player.x));
    player.y = Math.max(350, Math.min(canvas.height - 80, player.y));

    // 入力チェック
    if (input.isPressed) {
        player.state = 'READING';
        // ステージ4は読破速度が遅い
        const progressSpeed = gameState.currentStage === 4 ? 0.08 : 0.15;
        gameState.progress += progressSpeed;
        
        // 読書中の演出
        player.blushLevel = Math.min(player.blushLevel + 0.01, 1);
        player.sweatLevel = Math.min(player.sweatLevel + 0.02, 2);
    } else {
        player.state = 'HIDING';
        player.blushLevel = Math.max(player.blushLevel - 0.02, 0);
        player.sweatLevel = Math.max(player.sweatLevel - 0.05, 0);
    }

    // NPCのスポーン
    npcSpawnTimer++;
    if (npcSpawnTimer >= NPC_SPAWN_INTERVAL) {
        spawnNPC();
        npcSpawnTimer = 0;
    }

    // NPCの移動と衝突判定
    npcs = npcs.filter(npc => {
        // 子供の予測不能な動き
        if (npc.type.erratic) {
            npc.erraticTimer++;
            if (npc.erraticTimer > 60 && Math.random() < 0.02) {
                npc.stopped = !npc.stopped;
                npc.erraticTimer = 0;
            }
        }
        
        // 酔っぱらいの予測不能なスピード変化
        if (npc.type.drunk) {
            npc.drunkTimer = (npc.drunkTimer || 0) + 1;
            if (npc.drunkTimer > 40 && Math.random() < 0.03) {
                // 急にスピードが変わる（1倍〜3倍）
                const direction = npc.speed > 0 ? 1 : -1;
                const baseSpeed = npc.type.speed;
                npc.speed = (baseSpeed * (1 + Math.random() * 2)) * direction;
                npc.drunkTimer = 0;
            }
        }
        
        // 看守の巡回（プレイヤーの近くで停滞）
        if (npc.type.patrol) {
            const dx = npc.x - player.x;
            const dy = npc.y - player.y;
            const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            // プレイヤーの近く（250px以内）で停滞
            if (distanceToPlayer < 250) {
                npc.patrolTimer = (npc.patrolTimer || 0) + 1;
                // 80%の確率で停止
                if (npc.patrolTimer > 10 && Math.random() < 0.8) {
                    npc.stopped = true;
                }
            } else {
                npc.stopped = false;
                npc.patrolTimer = 0;
            }
        }

        if (!npc.stopped) {
            npc.x += npc.speed;
        }
        
        // 視界内の判定
        if (isPlayerInVision(npc) && player.state === 'READING') {
            gameOver(`${npc.name}に見つかりました！`);
        }

        // 画面外に出たら削除
        return npc.x > -100 && npc.x < canvas.width + 100;
    });

    // クリア判定
    if (gameState.progress >= 100) {
        gameClear();
    }

    // UI更新
    updateUI();
}

// ゲームループ
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ゲーム開始
gameLoop();
