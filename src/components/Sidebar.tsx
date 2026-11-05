import { BookOpen, ClipboardList, FolderKanban, LayoutDashboard, Settings } from 'lucide-react';

const logoUrl = `${import.meta.env.BASE_URL}logo.svg`;
const items = [
  ['workspace', 'Рабочее пространство', LayoutDashboard],
  ['projects', 'Мои проекты', FolderKanban],
  ['knowledge', 'Документы', BookOpen],
  ['settings', 'Настройки', Settings],
] as const;

export function Sidebar({ active, onChange, showAdmin = false }: { active: string; onChange: (value: string) => void; showAdmin?: boolean }) {
  const visibleItems = showAdmin ? [...items, ['admin', 'Аудит и Roadmap', ClipboardList] as const] : items;
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark logo-mark">
          <img src={logoUrl} alt="Cherkashin AI" />
        </div>
        <div><b>Personal Expert</b><small>AI WORKSPACE</small></div>
      </div>
      <nav>
        {visibleItems.map(([id, label, Icon]) => (
          <button key={id} className={active === id ? 'nav-item active' : 'nav-item'} onClick={() => onChange(id)}>
            <Icon size={17} /><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">● Локальный профиль<small>WEB CLIENT 0.4.0</small></div>
    </aside>
  );
}
