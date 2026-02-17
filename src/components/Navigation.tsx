import { NavLink } from 'react-router-dom';
import { ClipboardList, BarChart3, Calendar, Settings } from 'lucide-react';

const navItems = [
    { to: '/list', icon: ClipboardList, label: '記録' },
    { to: '/analytics', icon: BarChart3, label: '分析' },
    { to: '/calendar', icon: Calendar, label: 'カレンダー' },
    { to: '/settings', icon: Settings, label: '設定' },
];

export default function Navigation() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50">
            <div
                className="mx-auto max-w-lg"
                style={{
                    background: 'rgba(15, 15, 20, 0.75)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <div className="flex justify-around items-center h-16 px-2">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all duration-300 btn-press ${isActive
                                    ? 'text-primary'
                                    : 'text-text-muted hover:text-text-secondary'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <div className="relative">
                                        <Icon size={22} strokeWidth={isActive ? 2.2 : 1.5} />
                                        {isActive && (
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                                        )}
                                    </div>
                                    <span className={`text-[10px] mt-0.5 ${isActive ? 'font-semibold' : 'font-normal'}`}>
                                        {label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </div>
        </nav>
    );
}
