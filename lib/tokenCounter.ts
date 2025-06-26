// Простой подсчет токенов без внешних зависимостей
export function countTokens(text: string): number {
  if (!text) return 0;
  
  // Более точная оценка для русского и английского текста
  // Базируется на средней длине токенов в GPT моделях
  
  // Разделяем на слова и знаки препинания
  const words = text.trim().split(/\s+/);
  let tokenCount = 0;
  
  for (const word of words) {
    // Обычные слова: 1 токен = 3-4 символа
    // Знаки препинания: обычно отдельные токены
    // Числа: часто отдельные токены
    
    if (word.length <= 4) {
      tokenCount += 1;
    } else if (word.length <= 8) {
      tokenCount += 2;
    } else {
      tokenCount += Math.ceil(word.length / 4);
    }
    
    // Дополнительные токены для знаков препинания
    const punctuation = word.match(/[.,!?;:()[\]{}'"]/g);
    if (punctuation) {
      tokenCount += punctuation.length;
    }
  }
  
  // Минимум 1 токен для любого непустого текста
  return Math.max(1, tokenCount);
}