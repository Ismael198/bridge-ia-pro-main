export const marketplaces = [
  { id: "mercadolivre", name: "Mercado Livre", color: "#FFE600", status: "connected", account: "loja.tech.br", lastSync: "há 2 min", listings: 124, orders: 38 },
  { id: "shopee", name: "Shopee", color: "#EE4D2D", status: "connected", account: "tech_store_oficial", lastSync: "há 12 min", listings: 87, orders: 21 },
  { id: "amazon", name: "Amazon", color: "#FF9900", status: "soon", account: null, lastSync: null, listings: 0, orders: 0 },
  { id: "shein", name: "Shein", color: "#000000", status: "soon", account: null, lastSync: null, listings: 0, orders: 0 },
];

export const agents = [
  { id: "ag_1", name: "Atendimento Pro", type: "Claude", marketplace: "Mercado Livre", key: "gpc_live_••••••••a93f", scopes: ["read:orders", "write:messages"], created: "12/05/2026", active: true },
  { id: "ag_2", name: "Anúncios IA", type: "ChatGPT", marketplace: "Shopee", key: "gpc_live_••••••••c12d", scopes: ["read:listings", "write:listings"], created: "08/05/2026", active: true },
  { id: "ag_3", name: "Insights Bot", type: "OpenAI Codex", marketplace: "Mercado Livre", key: "gpc_live_••••••••77ee", scopes: ["read:orders", "read:listings"], created: "01/05/2026", active: false },
];

export const listings = Array.from({ length: 15 }).map((_, i) => ({
  id: `MLB${1000 + i}`,
  sku: `SKU-${2000 + i}`,
  title: [
    "Fone Bluetooth Premium TWS",
    "Carregador Turbo USB-C 65W",
    "Smartwatch Fit Pro 2026",
    "Mouse Gamer RGB 12000 DPI",
    "Cabo HDMI 4K 2m Reforçado",
    "Caixa de Som Bluetooth 30W",
    "Tripé Profissional Smartphone",
    "Webcam Full HD com Microfone",
    "Hub USB 7 Portas com Energia",
    "Teclado Mecânico RGB Compacto",
    "Suporte Notebook Ajustável",
    "SSD NVMe 1TB Leitura 3500MB/s",
    "Microfone Condensador USB",
    "Iluminador Ring Light 26cm",
    "Câmera de Segurança Wi-Fi 2K",
  ][i],
  channel: i % 2 === 0 ? "Mercado Livre" : "Shopee",
  price: (49 + i * 17.3).toFixed(2),
  stock: 5 + ((i * 7) % 40),
  status: i % 5 === 0 ? "paused" : "active",
  performance: ["high", "medium", "low"][i % 3],
}));

export const orders = Array.from({ length: 12 }).map((_, i) => ({
  id: `#${20126 + i}`,
  customer: ["Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Rocha", "Eduarda Pires"][i % 5],
  marketplace: i % 2 === 0 ? "Mercado Livre" : "Shopee",
  amount: (89 + i * 23.5).toFixed(2),
  status: ["paid", "shipped", "delivered", "pending"][i % 4],
  date: `${20 - (i % 10)}/05/2026`,
}));

export const salesChart = [
  { day: "Seg", ml: 1240, shopee: 820 },
  { day: "Ter", ml: 1580, shopee: 940 },
  { day: "Qua", ml: 1320, shopee: 1100 },
  { day: "Qui", ml: 1890, shopee: 1240 },
  { day: "Sex", ml: 2150, shopee: 1480 },
  { day: "Sab", ml: 2480, shopee: 1620 },
  { day: "Dom", ml: 1980, shopee: 1390 },
];

export const questions = [
  { id: 1, customer: "João P.", product: "Fone Bluetooth Premium TWS", question: "Tem garantia? Qual o prazo de entrega para SP?", time: "há 8 min" },
  { id: 2, customer: "Marina F.", product: "Smartwatch Fit Pro 2026", question: "Funciona com iPhone?", time: "há 22 min" },
  { id: 3, customer: "Rafael T.", product: "Mouse Gamer RGB", question: "É sem fio?", time: "há 1 h" },
];

export const auditLogs = Array.from({ length: 10 }).map((_, i) => ({
  id: i,
  time: `${10 + i}:${String((i * 7) % 60).padStart(2, "0")} · 20/05`,
  agent: ["Atendimento Pro", "Anúncios IA", "Insights Bot"][i % 3],
  marketplace: i % 2 === 0 ? "Mercado Livre" : "Shopee",
  action: ["read:orders", "write:messages", "read:listings", "write:listings", "read:orders"][i % 5],
  result: i % 7 === 0 ? "error" : "success",
  ip: `200.158.${10 + i}.${100 + i}`,
}));

export const recentEvents = [
  { type: "sale", text: "Nova venda · Fone Bluetooth · R$ 189,90", time: "há 3 min" },
  { type: "agent", text: "Agente \"Atendimento Pro\" respondeu pergunta de cliente", time: "há 8 min" },
  { type: "sync", text: "Sincronização Mercado Livre concluída", time: "há 12 min" },
  { type: "key", text: "Nova chave gerada para \"Anúncios IA\"", time: "há 1 h" },
  { type: "sale", text: "Nova venda · Smartwatch Fit · R$ 349,00", time: "há 2 h" },
];
