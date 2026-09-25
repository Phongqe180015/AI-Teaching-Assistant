import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { MoreVertical } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

export interface DropdownMenuItem {
    id: string
    label: string
    icon?: ReactNode
    onClick: (e: React.MouseEvent) => void
    isDanger?: boolean
}

interface DropdownMenuProps {
    items: DropdownMenuItem[]
    triggerClassName?: string
    menuClassName?: string
}

export function DropdownMenu({ items, triggerClassName = '', menuClassName = '' }: DropdownMenuProps) {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const [coords, setCoords] = useState({ top: 0, right: 0 })
    const triggerRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // Close menu when clicking outside or scrolling
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                triggerRef.current &&
                menuRef.current &&
                !triggerRef.current.contains(event.target as Node) &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
            }
        }

        function handleScroll() {
            setIsOpen(false)
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            window.addEventListener('scroll', handleScroll, true) // Capture scroll on any container
            return () => {
                document.removeEventListener('mousedown', handleClickOutside)
                window.removeEventListener('scroll', handleScroll, true)
            }
        }
    }, [isOpen])

    const handleItemClick = (e: React.MouseEvent, callback: (e: React.MouseEvent) => void) => {
        e.stopPropagation()
        callback(e)
        setIsOpen(false)
    }

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            setCoords({
                top: rect.bottom + 4,
                right: window.innerWidth - rect.right
            })
        }
        setIsOpen(!isOpen)
    }

    return (
        <div className="relative inline-block">
            <button
                ref={triggerRef}
                onClick={toggleMenu}
                className={`p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 rounded-md transition-colors ${triggerClassName}`}
                title={t('ui.actions')}
            >
                <MoreVertical size={16} />
            </button>

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    className={`fixed mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
                    style={{ top: coords.top, right: coords.right }}
                >
                    <div className="py-1">
                        {items.map((item, idx) => (
                            <button
                                key={item.id}
                                onClick={(e) => handleItemClick(e, item.onClick)}
                                className={`w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors ${item.isDanger
                                    ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    } ${idx < items.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''}`}
                            >
                                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
