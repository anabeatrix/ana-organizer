export const C = {
  bg: "#0e0c0a",
  surface: "#161310",
  border: "#2a2318",
  text: "#f0e6d4",
  muted: "#6a5a48",
  accent: "#d4874a",
  green: "#6db87a",
  red: "#d46a6a",
  blue: "#6a9bd4",
  gold: "#c8a84a",
  orange: "#d4a44a",
  purple: "#a07ab8",
  pink: "#b87ab8",
};

export const CATEGORIES = [
  { id: "moradia",      label: "Moradia",       color: C.blue,   block: "fixas",     subs: ["Aluguel", "Luz", "Água", "Outros"] },
  { id: "pessoal",      label: "Pessoal Fixo",  color: C.gold,   block: "fixas",     subs: ["Celular", "Internet", "Academia", "Pilates", "Outros"] },
  { id: "educacao",     label: "Educação",      color: C.accent, block: "fixas",     subs: ["Faculdade", "Escola Irmã", "Inglês", "Italiano", "Cursos/Livros", "Outros"] },
  { id: "outras_fixas", label: "Outras Fixas",  color: C.purple, block: "fixas",     subs: ["Assinaturas", "Donativos", "Terapia", "Outros"] },
  { id: "variaveis",    label: "Variáveis",     color: C.green,  block: "variaveis", subs: ["Dia a dia", "Mercado", "Feira", "Padaria/Lanche", "Combustível/Uber", "Farmácia", "Consultas", "Beleza", "Roupas/Compras", "Lazer/Passeio", "Pets", "Papelaria", "Presentes", "Extra", "Outros"] },
  { id: "viagem",       label: "Viagem",        color: C.orange, block: "variaveis", subs: ["Passagem", "Hospedagem", "Passeio", "Alimentação", "Outros"] },
  { id: "edp",          label: "EDP",           color: C.red,    block: "edp",       subs: ["Empréstimo", "Cartão Parcelado", "Outros"] },
  { id: "sonhos",       label: "Sonhos",        color: C.pink,   block: "sonhos",    subs: ["Reserva de Emergência", "Previdência", "Viagem dos Sonhos", "Outros"] },
];

export const BOX_BLOCKS = [
  { id: "fixas",     label: "Fixas Pessoais",     color: C.accent, cats: ["moradia", "pessoal", "educacao", "outras_fixas"] },
  { id: "variaveis", label: "Variáveis Pessoais",  color: C.green,  cats: ["variaveis", "viagem"] },
  { id: "edp",       label: "EDP",                color: C.red,    cats: ["edp"] },
  { id: "sonhos",    label: "Sonhos",             color: C.pink,   cats: ["sonhos"] },
];

export const INCOME_CATS = ["Salário", "Vale", "PLR", "Freelance", "Resgates", "Outros"];

export const INV_CATS = ["Stocks", "FII", "Renda Fixa", "Crypto", "Internacional", "Caixa"];

// Sanitize subcategory name to a Firestore-safe key
export const toKey = s => s.replace(/[^a-zA-Z0-9]/g, "_");

// Build default teto structure: { catId: { subKey: 0 } }
const buildDefaultTetos = () => {
  const defaults = {
    moradia:      { Aluguel: 2700, Luz: 200 },
    pessoal:      { Celular: 38, Internet: 85 },
    educacao:     { Faculdade: 500, Outros: 70 },
    outras_fixas: { Assinaturas: 170, Donativos: 200 },
    variaveis:    { Mercado: 680, Extra: 600 },
  };

  return CATEGORIES.reduce((result, cat) => {
    result[cat.id] = cat.subs.reduce((subs, s) => {
      subs[toKey(s)] = defaults[cat.id]?.[toKey(s)] ?? defaults[cat.id]?.[s] ?? 0;
      return subs;
    }, {});
    return result;
  }, {});
};

export const DEFAULT_TETOS = buildDefaultTetos();

export const DEFAULT_PLAN = { renda: 0, tetos: DEFAULT_TETOS };
