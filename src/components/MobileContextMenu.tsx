import { useEffect, useRef } from 'react';

type MenuItem = {
    label: string;
    icon?: React.ReactNode;
    action: () => void;
    danger?: boolean;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    items: MenuItem[];
};

export default function MobileContextMenu({ isOpen, onClose, title, items }: Props) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 animate-fade-in"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={menuRef}
                className="w-full max-w-sm bg-[rgba(30,30,35,0.85)] backdrop-blur-xl border border-white/10 
                           rounded-2xl overflow-hidden shadow-2xl transform transition-all duration-300 animate-slide-up-spring"
            >
                {title && (
                    <div className="px-4 py-3 border-b border-white/10 text-center">
                        <h3 className="text-sm font-semibold text-white/90 truncate">{title}</h3>
                    </div>
                )}

                <div className="flex flex-col p-2 space-y-1">
                    {items.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                item.action();
                                onClose();
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium rounded-xl
                                      transition-colors active:scale-[0.98] active:bg-white/10
                                      ${item.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-white hover:bg-white/10'}`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="p-2 pt-0">
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 text-[15px] font-semibold text-white bg-white/5 
                                   rounded-xl hover:bg-white/10 active:scale-[0.98] transition-transform"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
}
