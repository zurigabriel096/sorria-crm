// Papel (enum do backend) <-> rótulo em português, usado na tela de Colaboradores e no Topbar.
export const PAPEL_LABEL = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  MARKETING: "Marketing",
  RECEPCAO: "Recepção",
  TELEMARKETING: "Telemarketing",
};

export const PAPEIS = Object.keys(PAPEL_LABEL);

export function iniciais(nome) {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
