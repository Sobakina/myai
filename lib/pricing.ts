// Актуальные цены OpenAI (декабрь 2024)
// Цены указаны в долларах за 1M токенов

const MODEL_PRICING = {
  'gpt-4o-mini': {
    input: 0.15,    // $0.15 за 1M input токенов
    output: 0.60    // $0.60 за 1M output токенов
  },
  'gpt-4o': {
    input: 2.50,    // $2.50 за 1M input токенов  
    output: 10.00   // $10.00 за 1M output токенов
  },
  'gpt-4': {
    input: 30.00,   // $30.00 за 1M input токенов
    output: 60.00   // $60.00 за 1M output токенов
  }
};

// Курс доллара к рублю (можно сделать динамическим)
const USD_TO_RUB = 100; // Примерный курс

export function calculateCost(
  tokens: number, 
  type: 'input' | 'output' = 'output', 
  model: string = 'gpt-4o-mini'
): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
  if (!pricing) {
    console.warn(`Unknown model: ${model}, using gpt-4o-mini pricing`);
    return calculateCost(tokens, type, 'gpt-4o-mini');
  }
  
  const pricePerToken = pricing[type] / 1_000_000; // Цена за 1 токен в USD
  const costUSD = tokens * pricePerToken;
  const costRUB = costUSD * USD_TO_RUB;
  
  return costRUB;
}

export function formatCost(cost: number): string {
  if (cost < 1) {
    // Показываем в копейках для сумм меньше 1 рубля
    const kopecks = cost * 100;
    return `${kopecks.toFixed(2)} коп.`;
  }
  return `${cost.toFixed(2)} ₽`;
}

export function getModelDisplayName(model: string): string {
  const displayNames = {
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4o': 'GPT-4o',
    'gpt-4': 'GPT-4'
  };
  return displayNames[model as keyof typeof displayNames] || model;
}