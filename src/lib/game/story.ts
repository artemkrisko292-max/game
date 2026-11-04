// Сюжет «ЭнергоГероя»: маленькая хроника одной ночной смены.
// Пять катсцен: пролог, три главы между актами дома и эпилог.
// Каждая панель — кадр-комикс: иллюстрация (art) + подпись или реплика.

export type ArtId =
  | 'house_night'
  | 'telegram'
  | 'vzhik_salute'
  | 'wax_trail'
  | 'eyes_dark'
  | 'baron_balcony'
  | 'baron_rage'
  | 'act_paper'
  | 'baron_shield'
  | 'dispatch_warn'
  | 'vzhik_light'
  | 'baron_cool'
  | 'cafe_lamp'
  | 'dawn_house'

export interface StoryPanel {
  art: ArtId
  /** Подпись хроники под кадром (если нет говорящего). */
  caption?: string
  /** Кто говорит: ВЖИК, ДИСПЕТЧЕР, БАРОН НАКАЛ. */
  speaker?: string
  /** Реплика говорящего. */
  text?: string
}

export interface StoryScene {
  id: string
  /** «ПРОЛОГ», «ГЛАВА II»… */
  chapter: string
  title: string
  /** Номер бланка хроники. */
  docNo: string
  tone: 'tape' | 'tape-red'
  /** Диапазон нарядов, к которому относится глава. */
  span: string
  panels: StoryPanel[]
  /** Надпись на финальной кнопке сцены. */
  finishLabel: string
}

export const STORY: Record<string, StoryScene> = {
  prologue: {
    id: 'prologue',
    chapter: 'ПРОЛОГ',
    title: 'ТЕЛЕГРАММА НА СМЕНУ',
    docNo: 'ХР-00',
    tone: 'tape',
    span: 'наряды 1–5',
    finishLabel: 'НА СМЕНУ',
    panels: [
      {
        art: 'house_night',
        caption:
          'Улица Светлая, дом 7. Полночь. Счётчик в подвале крутится так, что соседи стыдятся смотреть друг другу в глаза.',
      },
      {
        art: 'telegram',
        speaker: 'ДИСПЕТЧЕР',
        text: 'Вжик! За ночь дом теряет киловатты. В стенах завелись ЭнергоВампиры, за ними — кто-то покрупнее. Найди виновника. Наряд прилагается.',
      },
      {
        art: 'vzhik_salute',
        speaker: 'ВЖИК',
        text: 'Есть! Спуститься в темноту, выгнать дармоедов и вернуть каждый ватт домой. Смена началась!',
      },
    ],
  },

  ch2: {
    id: 'ch2',
    chapter: 'ГЛАВА II',
    title: 'СЛЕД',
    docNo: 'ХР-05',
    tone: 'tape',
    span: 'наряды 6–10',
    finishLabel: 'ДАЛЬШЕ',
    panels: [
      {
        art: 'wax_trail',
        caption:
          'Пять нарядов позади. В прихожей тянется след: капли воска — будто здесь прошлась очень старая лампа накаливания.',
      },
      {
        art: 'eyes_dark',
        speaker: 'ВЖИК',
        text: 'Воск… Гонцы и вампиры — мелкие прислужники. Но кому-то они приносят свет. Кому-то очень голодному.',
      },
      {
        art: 'act_paper',
        speaker: 'ДИСПЕТЧЕР',
        text: 'Вижу тебя с крыши диспетчерской, Вжик. Проверь кабинет. И не сворачивай: за тобой уже наблюдают два красных глаза.',
      },
    ],
  },

  ch3: {
    id: 'ch3',
    chapter: 'ГЛАВА III',
    title: 'БАРОН',
    docNo: 'ХР-10',
    tone: 'tape-red',
    span: 'наряды 11–15',
    finishLabel: 'ДАЛЬШЕ',
    panels: [
      {
        art: 'baron_balcony',
        speaker: 'БАРОН НАКАЛ',
        text: 'Стоять, светодиодная мелюзга! Барон Накал, лампа накаливания в двенадцатом колене, изволит иметь к тебе счёт!',
      },
      {
        art: 'baron_rage',
        speaker: 'БАРОН НАКАЛ',
        text: 'Вас развесили по всей стране, а мне остался чулан! Раз свет больше не мой — пусть горит зря! Все сто ватт!',
      },
      {
        art: 'act_paper',
        speaker: 'ВЖИК',
        text: 'Записываю в акт: виновник установлен — старая нить, обида и сто ватт впустую. Диспетчер, дело стало жарким.',
      },
    ],
  },

  ch4: {
    id: 'ch4',
    chapter: 'ГЛАВА IV',
    title: 'МАРШ БРОШЕН',
    docNo: 'ХР-15',
    tone: 'tape-red',
    span: 'наряды 16–20',
    finishLabel: 'ДАЛЬШЕ',
    panels: [
      {
        art: 'baron_shield',
        speaker: 'БАРОН НАКАЛ',
        text: 'Дальше — щитовая! Один рывок — и я сожгу предохранители всей улицы. Тьма, Вжик! Вечная и уютная тьма!',
      },
      {
        art: 'dispatch_warn',
        speaker: 'ДИСПЕТЧЕР',
        text: 'Вжик, у тебя пара нарядов в запасе. Успей: если барон дёрнет рубильник, темнота станет не уютной, а коммунальной.',
      },
      {
        art: 'vzhik_light',
        speaker: 'ВЖИК',
        text: 'У меня есть то, чего нет у него: холодная нить и лёгкий плащ. И я знаю цену каждому ватту. Свет включу я.',
      },
    ],
  },

  epilogue: {
    id: 'epilogue',
    chapter: 'ЭПИЛОГ',
    title: 'ПОСЛЕДНИЙ ВАТТ',
    docNo: 'ХР-20',
    tone: 'tape',
    span: 'наряд закрыт',
    finishLabel: 'СДАТЬ СМЕНУ',
    panels: [
      {
        art: 'baron_cool',
        caption:
          'Щиток заглушен. Барон Накал остыл впервые за сто лет — и вдруг услышал, как тихо бывает в доме, где свет берегут.',
      },
      {
        art: 'cafe_lamp',
        speaker: 'ВЖИК',
        text: 'Слушай, барон. В кофейне внизу ищут ретро-лампу над столиком. Тёплый свет, восторженные гости, кофе вприкуску… Это же твой жанр.',
      },
      {
        art: 'dawn_house',
        speaker: 'БАРОН НАКАЛ',
        text: 'Пятьдесят ватт… и только по вечерам. По рукам, светодиодная мелюзга.',
        caption:
          'С тех пор счётчик в доме 7 крутится лениво, как кот на подоконнике. Берегите свет — и своих старых ламп.',
      },
    ],
  },
}

/** Главы срабатывают при входе на уровень с этим индексом (0-based). */
export const CHAPTER_AT: Record<number, string> = {
  5: 'ch2',
  10: 'ch3',
  15: 'ch4',
}

export const STORY_ORDER = ['prologue', 'ch2', 'ch3', 'ch4', 'epilogue'] as const

export const STORY_PREF = 'energohero-story-v1'

export function loadSeenScenes(): Set<string> {
  try {
    const raw = localStorage.getItem(STORY_PREF)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    return Array.isArray(arr) ? new Set(arr.filter((v): v is string => typeof v === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

export function saveSeenScenes(seen: Set<string>) {
  try {
    localStorage.setItem(STORY_PREF, JSON.stringify([...seen]))
  } catch {
    /* localStorage недоступен */
  }
}
