// 언어 순서: ko, en, ja, zh, es, pt. 새 언어는 LANGS와 각 행 끝에 추가하면 된다.
export const LANGS = [
  { code: 'ko', name: '한국어' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'zh', name: '简体中文' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
];

const D: Record<string, string[]> = {
  title: ['왕국 수호대', 'Realm Guard', '王国守護隊', '王国守卫', 'Guardianes del Reino', 'Guardiões do Reino'],
  start: ['게임 시작', 'Play', 'ゲームスタート', '开始游戏', 'Jugar', 'Jogar'],
  back: ['< 메인', '< Menu', '< メニュー', '< 主菜单', '< Menú', '< Menu'],
  stageSelect: ['스테이지 선택', 'Select Stage', 'ステージ選択', '选择关卡', 'Elegir nivel', 'Escolher fase'],
  soon: ['준비 중', 'Coming soon', '準備中', '敬请期待', 'Próximamente', 'Em breve'],
  lives: ['생명 {n}', 'Lives {n}', 'ライフ {n}', '生命 {n}', 'Vidas {n}', 'Vidas {n}'],
  gold: ['골드 {n}', 'Gold {n}', 'ゴールド {n}', '金币 {n}', 'Oro {n}', 'Ouro {n}'],
  wave: ['웨이브 {n} / {m}', 'Wave {n} / {m}', 'ウェーブ {n} / {m}', '波次 {n} / {m}', 'Oleada {n} / {m}', 'Onda {n} / {m}'],
  waveBanner: ['웨이브 {n}', 'Wave {n}', 'ウェーブ {n}', '第 {n} 波', 'Oleada {n}', 'Onda {n}'],
  lastWave: ['마지막 웨이브!', 'Final wave!', '最終ウェーブ！', '最后一波！', '¡Última oleada!', 'Última onda!'],
  startHint: ['타워를 지을 자리를 눌러 시작하세요', 'Tap a build spot to start', '建設場所をタップして開始', '点击空地建造防御塔', 'Toca un hueco para construir', 'Toque num local para construir'],
  paused: ['일시정지', 'Paused', '一時停止', '已暂停', 'Pausa', 'Pausado'],
  pausedSub: ['스페이스바 또는 ▶ 버튼으로 계속', 'Press Space or ▶ to resume', 'スペースキーまたは▶で再開', '按空格或 ▶ 继续', 'Pulsa Espacio o ▶ para seguir', 'Espaço ou ▶ para continuar'],
  fire: ['화염비', 'Fire Rain', '火炎の雨', '烈焰雨', 'Lluvia de fuego', 'Chuva de fogo'],
  reinf: ['지원군', 'Reinforce', '援軍', '援军', 'Refuerzos', 'Reforços'],
  selected: ['(선택됨)', '(selected)', '(選択中)', '(已选)', '(elegido)', '(selecionado)'],
  castHint: ['전장을 눌러 발동', 'Tap the field to cast', '戦場をタップして発動', '点击战场释放', 'Toca el campo para lanzar', 'Toque no campo para usar'],
  adGold: ['광고 보고\n+{n}골드', 'Watch ad\n+{n} gold', '広告を見て\n+{n}ゴールド', '看广告\n+{n}金币', 'Ver anuncio\n+{n} oro', 'Ver anúncio\n+{n} ouro'],
  adWait: ['광고 보너스\n{s}s', 'Ad bonus\n{s}s', '広告ボーナス\n{s}s', '广告奖励\n{s}s', 'Bonus\n{s}s', 'Bônus\n{s}s'],
  nextWave: ['다음 웨이브 ▶', 'Next wave ▶', '次のウェーブ ▶', '下一波 ▶', 'Siguiente ▶', 'Próxima ▶'],
  early: ['+{n} 조기 호출', '+{n} early call', '+{n} 早期呼び出し', '+{n} 提前呼叫', '+{n} llamada temprana', '+{n} chamada antecipada'],
  levelUp: ['레벨 업!', 'Level up!', 'レベルアップ！', '升级！', '¡Nivel!', 'Nível!'],
  victory: ['승리!', 'Victory!', '勝利！', '胜利！', '¡Victoria!', 'Vitória!'],
  defeat: ['패배...', 'Defeat...', '敗北…', '失败…', 'Derrota...', 'Derrota...'],
  nextStage: ['다음 스테이지', 'Next stage', '次のステージ', '下一关', 'Siguiente nivel', 'Próxima fase'],
  retry: ['다시 하기', 'Retry', 'リトライ', '重试', 'Reintentar', 'Tentar de novo'],
  revive: ['광고 보고 이어하기 (생명 +10)', 'Watch ad to continue (+10 lives)', '広告を見て続ける（ライフ+10）', '看广告继续（生命+10）', 'Ver anuncio y continuar (+10 vidas)', 'Ver anúncio e continuar (+10 vidas)'],
  reasonGold: ['+{n} 골드', '+{n} gold', '+{n}ゴールド', '+{n} 金币', '+{n} de oro', '+{n} de ouro'],
  reasonRevive: ['이어서 하기 (생명 +10)', 'Continue (+10 lives)', '続ける（ライフ+10）', '继续（生命+10）', 'Continuar (+10 vidas)', 'Continuar (+10 vidas)'],
  reasonUnlock: ['{name} 잠금 해제', 'Unlock {name}', '{name}を解放', '解锁 {name}', 'Desbloquear {name}', 'Desbloquear {name}'],
  adUnlockTitle: ['광고를 보고 {name} 잠금 해제', 'Watch an ad to unlock {name}', '広告を見て{name}を解放', '观看广告解锁 {name}', 'Ver un anuncio para desbloquear {name}', 'Veja um anúncio para desbloquear {name}'],
  adUnlockSub: ['이번 스테이지 동안 사용할 수 있어요', 'Available for this stage', 'このステージの間使えます', '本关内可用', 'Disponible en este nivel', 'Disponível nesta fase'],
  watch: ['광고 보기', 'Watch ad', '広告を見る', '观看广告', 'Ver anuncio', 'Ver anúncio'],
  cancel: ['취소', 'Cancel', 'キャンセル', '取消', 'Cancelar', 'Cancelar'],
  adTest: ['[테스트 광고] {reason}', '[Test ad] {reason}', '[テスト広告] {reason}', '[测试广告] {reason}', '[Anuncio de prueba] {reason}', '[Anúncio de teste] {reason}'],
  adSkip: ['건너뛰기 (보상 없음)', 'Skip (no reward)', 'スキップ（報酬なし）', '跳过（无奖励）', 'Saltar (sin recompensa)', 'Pular (sem recompensa)'],
  adClaim: ['보상 받기', 'Claim reward', '報酬を受け取る', '领取奖励', 'Recibir recompensa', 'Receber recompensa'],
  adDone: ['완료', 'Done', '完了', '完成', 'Listo', 'Pronto'],
  adTag: ['광고', 'AD', '広告', '广告', 'AD', 'AD'],
  heroMove: ['{name}: 이동할 곳을 누르세요', '{name}: tap where to move', '{name}：移動先をタップ', '{name}：点击移动位置', '{name}: toca dónde ir', '{name}: toque onde mover'],
  graphics: ['그래픽', 'Graphics', 'グラフィック', '画面', 'Gráficos', 'Gráficos'],
  'skin.svg': ['벡터', 'Vector', 'ベクター', '矢量', 'Vectorial', 'Vetorial'],
  'skin.image': ['이미지', 'Image', 'イラスト', '图片', 'Imagen', 'Imagem'],
  'tower.archer': ['궁수탑', 'Archer Tower', '弓兵の塔', '箭塔', 'Torre de arqueros', 'Torre de arqueiros'],
  'tower.mage': ['마법탑', 'Mage Tower', '魔法の塔', '法师塔', 'Torre de magos', 'Torre de magos'],
  'tower.cannon': ['대포탑', 'Cannon', '大砲の塔', '炮塔', 'Cañón', 'Canhão'],
  'tower.barracks': ['병영', 'Barracks', '兵舎', '兵营', 'Cuartel', 'Quartel'],
  'tower.frost': ['냉기탑', 'Frost Tower', '氷の塔', '寒冰塔', 'Torre de hielo', 'Torre de gelo'],
  'tower.thunder': ['번개탑', 'Thunder Tower', '雷の塔', '雷电塔', 'Torre del trueno', 'Torre do trovão'],
  'desc.archer': ['빠른 단일 물리 공격\n공중 가능', 'Fast single-target\nHits air', '高速単体物理\n対空可', '快速单体物理\n可打空中', 'Rápida, un objetivo\nAtaca aire', 'Rápida, um alvo\nAtinge ar'],
  'desc.mage': ['강력한 마법 피해\n방어구 무시', 'Strong magic damage\nIgnores armor', '強力な魔法\n防具無視', '高额魔法伤害\n无视护甲', 'Daño mágico fuerte\nIgnora armadura', 'Dano mágico forte\nIgnora armadura'],
  'desc.cannon': ['지상 범위 공격\n공중 불가', 'Ground splash\nNo air', '地上範囲攻撃\n対空不可', '地面范围攻击\n不能打空中', 'Área en tierra\nNo ataca aire', 'Área no solo\nNão atinge ar'],
  'desc.barracks': ['병사 3명이 적을 막음\n죽으면 자동 보충', '3 soldiers block foes\nAuto-respawn', '兵士3人が敵を阻止\n自動補充', '3名士兵拦截敌人\n自动补充', '3 soldados bloquean\nSe reponen solos', '3 soldados bloqueiam\nReposição automática'],
  'desc.frost': ['적을 느리게 만듦\n공중 가능', 'Slows enemies\nHits air', '敵を減速\n対空可', '减速敌人\n可打空中', 'Ralentiza enemigos\nAtaca aire', 'Retarda inimigos\nAtinge ar'],
  'desc.thunder': ['연쇄 번개\n여러 적 공격', 'Chain lightning\nHits several foes', '連鎖する雷\n複数攻撃', '连锁闪电\n攻击多个敌人', 'Rayo en cadena\nVarios enemigos', 'Raio em cadeia\nVários inimigos'],
  'hero.knight': ['기사 알드릭', 'Sir Aldric', '騎士アルドリック', '骑士奥德里克', 'Sir Aldric', 'Sir Aldric'],
  'hero.sorc': ['마법사 리라', 'Lyra the Sorceress', '魔導士リラ', '法师莉拉', 'Lyra la hechicera', 'Lyra, a feiticeira'],
  'skill.knight': ['강타', 'Slam', '強打', '重击', 'Golpe', 'Golpe'],
  'skill.sorc': ['빙결', 'Nova', '凍結', '冰冻', 'Nova', 'Nova'],
  difficulty: ['난이도', 'Difficulty', '難易度', '难度', 'Dificultad', 'Dificuldade'],
  'diff.0': ['쉬움', 'Easy', '簡単', '简单', 'Fácil', 'Fácil'],
  'diff.1': ['보통', 'Normal', '普通', '普通', 'Normal', 'Normal'],
  'diff.2': ['어려움', 'Hard', '難しい', '困难', 'Difícil', 'Difícil'],
  ok: ['확인', 'OK', 'OK', '确定', 'Aceptar', 'OK'],
  'tut.build.title': ['타워 짓기', 'Building Towers', 'タワーの建設', '建造防御塔', 'Construir torres', 'Construir torres'],
  'tut.build.body': ['빈 터를 눌러 타워를 지을 수 있어요.\n타워는 골드로 짓고, 적을 처치하면 골드를 얻어요.\n적이 길 끝까지 가면 생명이 줄고, 생명이 0이 되면 패배해요.\n궁수탑은 빠른 단일 공격, 병영은 병사로 적을 막고, 마법탑은 방어구를 무시하고, 대포탑은 범위 피해를 줘요.', 'Tap an empty plot to build a tower.\nTowers cost gold, and you earn gold by defeating enemies.\nIf an enemy reaches the end of the road you lose lives. At 0 lives you lose.\nArchers shoot fast, barracks soldiers block enemies, mages ignore armor and cannons deal area damage.', '空き地をタップしてタワーを建てられます。\nタワーはゴールドで建て、敵を倒すとゴールドを得られます。\n敵が道の終点に着くとライフが減り、0になると負けです。\n弓兵の塔は高速攻撃、兵舎は兵士で敵を足止め、魔法の塔は防具無視、大砲の塔は範囲ダメージです。', '点击空地即可建造防御塔。\n建塔需要金币，击败敌人可以获得金币。\n敌人到达道路尽头会扣除生命，生命降为 0 即失败。\n箭塔攻击快速，兵营的士兵会拦住敌人，法师塔无视护甲，炮塔造成范围伤害。', 'Toca un hueco vacío para construir una torre.\nLas torres cuestan oro y ganas oro al derrotar enemigos.\nSi un enemigo llega al final del camino pierdes vidas; con 0 vidas pierdes.\nLos arqueros disparan rápido, los soldados del cuartel bloquean, los magos ignoran la armadura y los cañones dañan en área.', 'Toque num local vazio para construir uma torre.\nTorres custam ouro, e você ganha ouro ao derrotar inimigos.\nSe um inimigo chegar ao fim do caminho você perde vidas; com 0 vidas você perde.\nArqueiros atiram rápido, soldados do quartel bloqueiam, magos ignoram armadura e canhões causam dano em área.'],
  'tut.upgrade.title': ['타워 강화', 'Upgrading Towers', 'タワーの強化', '升级防御塔', 'Mejorar torres', 'Melhorar torres'],
  'tut.upgrade.body': ['건설한 타워를 누르면 강화(▲)하거나 판매($)할 수 있어요.\n강화하면 공격력과 사거리가 늘어나요. 판매하면 투자한 골드의 60%를 돌려받아요.\n지금은 2단계까지 강화할 수 있고, 3단계는 5스테이지부터 열려요.', 'Tap a built tower to upgrade it (▲) or sell it ($).\nUpgrades raise damage and range. Selling returns 60% of the gold you spent.\nFor now you can upgrade up to level 2; level 3 unlocks from stage 5.', '建てたタワーをタップすると、強化(▲)または売却($)できます。\n強化すると攻撃力と射程が上がります。売却すると投資したゴールドの60%が戻ります。\n今はレベル2まで強化でき、レベル3はステージ5から解放されます。', '点击已建好的防御塔，可以升级(▲)或出售($)。\n升级会提高攻击力和射程；出售可返还已投入金币的 60%。\n目前最高升到 2 级，3 级从第 5 关开始开放。', 'Toca una torre construida para mejorarla (▲) o venderla ($).\nMejorar aumenta el daño y el alcance. Vender devuelve el 60 % del oro invertido.\nPor ahora puedes llegar al nivel 2; el nivel 3 se desbloquea desde el nivel 5.', 'Toque numa torre construída para melhorá-la (▲) ou vendê-la ($).\nMelhorar aumenta o dano e o alcance. Vender devolve 60% do ouro investido.\nPor enquanto você pode chegar ao nível 2; o nível 3 desbloqueia a partir da fase 5.'],
  'tut.reinf.title': ['지원군', 'Reinforcements', '援軍', '援军', 'Refuerzos', 'Reforços'],
  'tut.reinf.body': ['지원군 버튼을 누른 뒤 전장을 누르면 그 자리에 병사 2명이 나타나 20초 동안 적을 막아요.\n재사용 대기시간은 22초예요. 적이 몰려올 때 급하게 길을 막는 데 좋아요.', 'Press the Reinforce button, then tap the field: 2 soldiers appear there and block enemies for 20 seconds.\nCooldown is 22 seconds. Great for plugging a gap when enemies rush in.', '援軍ボタンを押してから戦場をタップすると、その場所に兵士が2人現れ、20秒間敵を足止めします。\nクールダウンは22秒です。敵が押し寄せたときの応急処置に便利です。', '按下援军按钮后点击战场，那里会出现 2 名士兵，拦截敌人 20 秒。\n冷却时间为 22 秒。敌人蜂拥而来时用来紧急堵路很有效。', 'Pulsa Refuerzos y toca el campo: aparecen 2 soldados que bloquean enemigos durante 20 segundos.\nEnfriamiento de 22 segundos. Ideal para tapar un hueco cuando llega una oleada.', 'Aperte Reforços e toque no campo: 2 soldados aparecem e bloqueiam inimigos por 20 segundos.\nRecarga de 22 segundos. Ótimo para tapar uma brecha quando os inimigos chegam em massa.'],
  'tut.fire.title': ['화염비', 'Fire Rain', '火炎の雨', '烈焰雨', 'Lluvia de fuego', 'Chuva de fogo'],
  'tut.fire.body': ['화염비 버튼을 누른 뒤 전장을 누르면 그 자리에 불덩이 9개가 떨어져 적에게 마법 피해를 줘요.\n재사용 대기시간은 40초예요. 적이 한곳에 뭉쳐 있을 때 쓰면 효과가 커요.', 'Press the Fire Rain button, then tap the field: 9 fireballs fall there and deal magic damage.\nCooldown is 40 seconds. Best used when enemies are bunched together.', '火炎の雨ボタンを押してから戦場をタップすると、その場所に火の玉が9個降り注ぎ、魔法ダメージを与えます。\nクールダウンは40秒です。敵が固まっているときに使うと効果的です。', '按下烈焰雨按钮后点击战场，那里会落下 9 颗火球，造成魔法伤害。\n冷却时间为 40 秒。敌人聚集在一起时使用效果最好。', 'Pulsa Lluvia de fuego y toca el campo: caen 9 bolas de fuego que causan daño mágico.\nEnfriamiento de 40 segundos. Funciona mejor cuando los enemigos van juntos.', 'Aperte Chuva de fogo e toque no campo: 9 bolas de fogo caem e causam dano mágico.\nRecarga de 40 segundos. Funciona melhor quando os inimigos estão agrupados.'],
  'tut.nextwave.title': ['웨이브 호출', 'Calling Waves Early', 'ウェーブ呼び出し', '提前呼叫', 'Llamar oleadas', 'Chamar ondas'],
  'tut.nextwave.body': ['다음 웨이브 버튼을 누르면 기다리지 않고 바로 다음 웨이브가 시작돼요.\n일찍 부를수록 보너스 골드를 받지만, 적이 한꺼번에 몰려올 수 있어요.', 'Press Next wave to start the next wave right away without waiting.\nThe earlier you call it the more bonus gold you get, but enemies may overlap.', '次のウェーブボタンを押すと、待たずにすぐ次のウェーブが始まります。\n早く呼ぶほどボーナスゴールドがもらえますが、敵が重なって押し寄せることがあります。', '按下"下一波"按钮，无需等待，立即开始下一波。\n呼叫得越早奖励金币越多，但敌人可能会同时涌来。', 'Pulsa Siguiente para empezar la siguiente oleada sin esperar.\nCuanto antes la llames, más oro de bonificación recibes, pero los enemigos pueden solaparse.', 'Aperte Próxima para iniciar a próxima onda sem esperar.\nQuanto antes chamar, mais ouro de bônus ganha, mas os inimigos podem se acumular.'],
  'level.1': ['초원의 입구', 'Meadow Gate', '草原の入口', '草原入口', 'Puerta del prado', 'Portão do prado'],
  'level.2': ['굽이치는 들판', 'Winding Fields', 'うねる野原', '蜿蜒田野', 'Campos sinuosos', 'Campos sinuosos'],
  'level.3': ['양면 협공', 'Pincer Attack', '挟み撃ち', '两面夹击', 'Ataque en pinza', 'Ataque em pinça'],
  'level.4': ['달팽이 언덕', 'Snail Hill', 'カタツムリの丘', '蜗牛山丘', 'Colina caracol', 'Colina caracol'],
  'level.5': ['사막의 갈림길', 'Desert Crossroads', '砂漠の分かれ道', '沙漠岔路', 'Cruce del desierto', 'Encruzilhada do deserto'],
  'level.6': ['쌍둥이 오아시스', 'Twin Oasis', '双子のオアシス', '双子绿洲', 'Oasis gemelos', 'Oásis gêmeos'],
  'level.7': ['붉은 협곡', 'Red Canyon', '赤い渓谷', '赤红峡谷', 'Cañón rojo', 'Desfiladeiro vermelho'],
  'level.8': ['모래폭풍 갈림길', 'Sandstorm Fork', '砂嵐の分岐', '沙暴岔路', 'Bifurcación de arena', 'Bifurcação de areia'],
  'level.9': ['안개 늪', 'Misty Marsh', '霧の沼', '迷雾沼泽', 'Pantano brumoso', 'Pântano nebuloso'],
  'level.10': ['늪지의 거인', 'Swamp Titan', '沼の巨人', '沼泽巨人', 'Titán del pantano', 'Titã do pântano'],
  'level.11': ['독버섯 숲', 'Toadstool Woods', '毒キノコの森', '毒蘑菇森林', 'Bosque de setas', 'Floresta de cogumelos'],
  'level.12': ['썩은 호수', 'Rotten Lake', '腐った湖', '腐烂之湖', 'Lago podrido', 'Lago podre'],
  'level.13': ['얼어붙은 고개', 'Frozen Pass', '凍てつく峠', '冰封山口', 'Paso helado', 'Passo congelado'],
  'level.14': ['얼음 교차로', 'Ice Crossing', '氷の交差点', '冰封十字路', 'Cruce helado', 'Cruzamento gelado'],
  'level.15': ['서리 강의 군주', 'Frost River Lord', '霜の川の君主', '霜河领主', 'Señor del río helado', 'Senhor do rio gelado'],
  'level.16': ['눈보라 능선', 'Blizzard Ridge', '吹雪の尾根', '暴风雪山脊', 'Cresta de ventisca', 'Cume da nevasca'],
  'level.17': ['용암 삼거리', 'Magma Fork', '溶岩の三叉路', '熔岩三岔口', 'Bifurcación de magma', 'Bifurcação de magma'],
  'level.18': ['불꽃 계곡', 'Ember Valley', '火の谷', '余烬山谷', 'Valle de brasas', 'Vale das brasas'],
  'level.19': ['재의 회랑', 'Ashen Gauntlet', '灰の回廊', '灰烬回廊', 'Pasaje de cenizas', 'Corredor de cinzas'],
  'level.20': ['용의 아가리', 'Dragon\'s Maw', '竜の顎', '龙之颚', 'Las fauces del dragón', 'A mandíbula do dragão'],
};

const STORE = 'realmguard.lang';

function detect(): number {
  try {
    const saved = localStorage.getItem(STORE);
    const i = LANGS.findIndex((l) => l.code === saved);
    if (i >= 0) return i;
  } catch { /* storage unavailable */ }
  const nav = (navigator.language || 'en').toLowerCase();
  const j = LANGS.findIndex((l) => nav.startsWith(l.code));
  return j >= 0 ? j : 1;
}

let cur = detect();
document.documentElement.lang = LANGS[cur].code;

export function langIndex() { return cur; }

export function nextLang() {
  cur = (cur + 1) % LANGS.length;
  try { localStorage.setItem(STORE, LANGS[cur].code); } catch { /* ignore */ }
  document.documentElement.lang = LANGS[cur].code;
}

export function t(key: string, p: Record<string, string | number> = {}): string {
  const row = D[key];
  const s = row ? (row[cur] ?? row[1]) : key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));
}
