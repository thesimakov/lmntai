/** Темы боковой панели библиотеки (подписи на русском, запрос — латиница для Unsplash API). */

export type BoxImageTopic = {
  id: string;
  label: string;
  /** Поисковая строка для API */
  query: string;
};

export const BOX_IMAGE_TOPICS: BoxImageTopic[] = [
  { id: "optimism", label: "Бодрая атмосфера", query: "optimism joyful light" },
  { id: "spring", label: "Весна", query: "spring flowers nature" },
  { id: "backgrounds", label: "Фоновые изображения", query: "abstract background minimal" },
  { id: "3d", label: "3D-визуализации", query: "3d render abstract" },
  { id: "nature", label: "Природа", query: "nature landscape" },
  { id: "textures", label: "Текстуры и узоры", query: "texture pattern" },
  { id: "film", label: "Плёнка", query: "film grain analog photography" },
  { id: "architecture", label: "Архитектура и интерьеры", query: "architecture interior" },
  { id: "street", label: "Уличная фотография", query: "street photography urban" },
  { id: "experimental", label: "Эксперимент", query: "experimental abstract art" },
];
